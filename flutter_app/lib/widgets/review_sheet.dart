import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../api/api.dart';
import '../api/trpc_client.dart';
import '../state/auth.dart';
import '../theme.dart';
import '../screens/login.dart';

/// Opens the write-a-review sheet. Requires login — if not logged in, shows the
/// login sheet first, then re-opens this. Returns true if a review was posted.
Future<bool> showReviewSheet(BuildContext context, int productId) async {
  final auth = context.read<AuthState>();
  if (!auth.isLoggedIn) {
    await showLoginSheet(context);
    if (!context.mounted || !context.read<AuthState>().isLoggedIn) return false;
  }
  if (!context.mounted) return false;
  final result = await showModalBottomSheet<bool>(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.white,
    shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
    builder: (sheetContext) => AnimatedPadding(
      duration: const Duration(milliseconds: 150),
      padding: EdgeInsets.only(
          bottom: MediaQuery.of(sheetContext).viewInsets.bottom),
      child: SingleChildScrollView(
        child: _ReviewSheet(productId: productId),
      ),
    ),
  );
  return result ?? false;
}

class _ReviewSheet extends StatefulWidget {
  final int productId;
  const _ReviewSheet({required this.productId});

  @override
  State<_ReviewSheet> createState() => _ReviewSheetState();
}

class _ReviewSheetState extends State<_ReviewSheet> {
  int _rating = 5;
  final _title = TextEditingController();
  final _body = TextEditingController();
  bool _submitting = false;
  String? _error;

  @override
  void dispose() {
    _title.dispose();
    _body.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_body.text.trim().isEmpty) {
      setState(() => _error = 'Please write your review');
      return;
    }
    final auth = context.read<AuthState>();
    setState(() {
      _submitting = true;
      _error = null;
    });
    try {
      await NutriwowApi.addReview(
        productId: widget.productId,
        customerName: auth.profile?.name.isNotEmpty == true
            ? auth.profile!.name
            : 'Nutriwow Customer',
        rating: _rating,
        title: _title.text.trim(),
        body: _body.text.trim(),
      );
      if (mounted) Navigator.of(context).pop(true);
    } on TrpcException catch (e) {
      if (mounted) {
        setState(() => _error = e.isUnauthorized
            ? 'Session expire ho gaya — please login again'
            : e.message);
      }
    } catch (e) {
      if (mounted) setState(() => _error = 'Could not submit review');
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 20, 20, 28),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Center(
            child: Text('Write a Review',
                style: Theme.of(context).textTheme.headlineSmall),
          ),
          const SizedBox(height: 16),
          const Text('Your Rating',
              style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
          const SizedBox(height: 6),
          Row(
            children: List.generate(
              5,
              (i) => GestureDetector(
                onTap: () => setState(() => _rating = i + 1),
                child: Padding(
                  padding: const EdgeInsets.only(right: 6),
                  child: Icon(
                    i < _rating
                        ? Icons.star_rounded
                        : Icons.star_outline_rounded,
                    size: 36,
                    color: Colors.amber.shade600,
                  ),
                ),
              ),
            ),
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _title,
            textCapitalization: TextCapitalization.sentences,
            decoration: const InputDecoration(
                labelText: 'Title (optional)',
                hintText: 'e.g. Great quality!'),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _body,
            textCapitalization: TextCapitalization.sentences,
            maxLines: 4,
            decoration: const InputDecoration(
                labelText: 'Your review',
                hintText: 'Share your experience with this product…',
                alignLabelWithHint: true),
          ),
          if (_error != null)
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Text(_error!,
                  style: const TextStyle(color: Colors.red, fontSize: 12)),
            ),
          const SizedBox(height: 16),
          ElevatedButton(
            onPressed: _submitting ? null : _submit,
            child: Text(_submitting ? 'Submitting…' : 'Submit Review'),
          ),
          const SizedBox(height: 6),
          const Text(
            'Reviews admin approval ke baad dikhte hain.',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 10.5, color: NwColors.muted),
          ),
        ],
      ),
    );
  }
}
