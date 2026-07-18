import 'dart:convert';

import 'package:cookie_jar/cookie_jar.dart';
import 'package:dio/dio.dart';
import 'package:dio_cookie_manager/dio_cookie_manager.dart';
import 'package:path_provider/path_provider.dart';

/// Thin tRPC-over-HTTP client for the Nutriwow API.
///
/// The server uses tRPC v11 with the superjson transformer:
///  - query  → GET  /api/trpc/<proc>?input={"json":<input>}
///  - mutation → POST /api/trpc/<proc> with body {"json":<input>}
///  - response envelope: {"result":{"data":{"json":<payload>}}}
///  - errors: {"error":{"json":{"message":...,"data":{"httpStatus":...}}}}
///
/// Auth is a httpOnly session cookie (nw_customer_session) set by otp.verify —
/// a persistent cookie jar keeps customers logged in across app restarts.
class TrpcException implements Exception {
  final String message;
  final String? code;
  final int? httpStatus;
  TrpcException(this.message, {this.code, this.httpStatus});
  bool get isUnauthorized => httpStatus == 401 || code == 'UNAUTHORIZED';
  @override
  String toString() => message;
}

class TrpcClient {
  static const baseUrl = 'https://www.nutriwow.in/api/trpc';

  late final Dio _dio;
  Future<void>? _initFuture;

  static final TrpcClient instance = TrpcClient._();
  TrpcClient._();

  /// Idempotent + concurrency-safe: all callers await the SAME init future,
  /// so parallel first-launch requests can't race on Dio/cookie-jar setup
  /// (which previously made the first homepage load fail intermittently).
  Future<void> init() => _initFuture ??= _doInit();

  Future<void> _doInit() async {
    final dio = Dio(BaseOptions(
      connectTimeout: const Duration(seconds: 20),
      receiveTimeout: const Duration(seconds: 30),
      headers: {'Content-Type': 'application/json'},
      // We surface tRPC errors ourselves; don't throw on non-2xx.
      validateStatus: (_) => true,
    ));
    final dir = await getApplicationSupportDirectory();
    final jar = PersistCookieJar(storage: FileStorage('${dir.path}/.cookies'));
    dio.interceptors.add(CookieManager(jar));
    _dio = dio; // assign only once fully configured
  }

  /// tRPC query (HTTP GET). [input] may be null for no-input procedures.
  Future<dynamic> query(String procedure, [Map<String, dynamic>? input]) async {
    await init();
    var url = '$baseUrl/$procedure';
    if (input != null) {
      final encoded = Uri.encodeComponent(jsonEncode({'json': input}));
      url = '$url?input=$encoded';
    }
    final res = await _withRetry(() => _dio.get(url));
    return _unwrap(res, procedure);
  }

  /// tRPC mutation (HTTP POST). Not retried by default — mutations may not be
  /// idempotent — but connection errors before the request lands are safe to
  /// retry, which is what [_withRetry] limits itself to.
  Future<dynamic> mutate(String procedure, [Map<String, dynamic>? input]) async {
    await init();
    final res = await _withRetry(() => _dio.post(
          '$baseUrl/$procedure',
          data: jsonEncode({'json': input ?? {}}),
        ));
    return _unwrap(res, procedure);
  }

  /// Retries once on a transient CONNECTION-level failure (DNS/TLS/socket
  /// warm-up on cold app start), which is why the first launch used to show
  /// "Something went wrong" until a manual reload. Real HTTP responses
  /// (any status) are returned as-is and never retried.
  Future<Response> _withRetry(Future<Response> Function() send) async {
    try {
      return await send();
    } on DioException catch (e) {
      const transient = {
        DioExceptionType.connectionError,
        DioExceptionType.connectionTimeout,
        DioExceptionType.sendTimeout,
        DioExceptionType.receiveTimeout,
      };
      if (!transient.contains(e.type)) rethrow;
      await Future.delayed(const Duration(milliseconds: 600));
      return await send();
    }
  }

  dynamic _unwrap(Response res, String procedure) {
    final data = res.data is String ? jsonDecode(res.data as String) : res.data;
    if (data is Map && data['error'] != null) {
      final err = data['error']['json'] ?? data['error'];
      throw TrpcException(
        (err['message'] ?? 'Something went wrong') as String,
        code: err['data']?['code'] as String?,
        httpStatus: (err['data']?['httpStatus'] as num?)?.toInt() ??
            res.statusCode,
      );
    }
    if (res.statusCode != null && res.statusCode! >= 400) {
      throw TrpcException('Request failed ($procedure)',
          httpStatus: res.statusCode);
    }
    return data?['result']?['data']?['json'];
  }
}
