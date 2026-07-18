import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../api/api.dart';
import '../state/auth.dart';
import '../theme.dart';

/// WhatsApp-OTP login bottom sheet — same flow as the website.
Future<void> showLoginSheet(BuildContext context,
    {VoidCallback? onSuccess}) {
  return showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.white,
    shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
    // Keyboard padding is applied INSIDE the sheet (sheetContext rebuilds on
    // keyboard open) — outer context padding stays 0 and hides the inputs.
    builder: (sheetContext) => AnimatedPadding(
      duration: const Duration(milliseconds: 150),
      padding: EdgeInsets.only(
          bottom: MediaQuery.of(sheetContext).viewInsets.bottom),
      child: SingleChildScrollView(
        child: _LoginSheet(onSuccess: onSuccess),
      ),
    ),
  );
}

class _LoginSheet extends StatefulWidget {
  final VoidCallback? onSuccess;
  const _LoginSheet({this.onSuccess});

  @override
  State<_LoginSheet> createState() => _LoginSheetState();
}

class _LoginSheetState extends State<_LoginSheet> {
  final _mobileController = TextEditingController();
  final _otpController = TextEditingController();
  final _nameController = TextEditingController();
  final _emailController = TextEditingController();

  String _step = 'mobile'; // mobile | otp | name
  bool _loading = false;
  String? _error;

  @override
  void dispose() {
    _mobileController.dispose();
    _otpController.dispose();
    _nameController.dispose();
    _emailController.dispose();
    super.dispose();
  }

  Future<void> _sendOtp() async {
    final mobile = _mobileController.text.trim();
    if (!RegExp(r'^\d{10}$').hasMatch(mobile)) {
      setState(() => _error = 'Please enter a valid 10-digit mobile number');
      return;
    }
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      await NutriwowApi.sendOtp(mobile);
      if (mounted) setState(() => _step = 'otp');
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _verify() async {
    final otp = _otpController.text.trim();
    if (otp.length != 4) {
      setState(() => _error = 'Please enter the 4-digit OTP');
      return;
    }
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final result =
          await NutriwowApi.verifyOtp(_mobileController.text.trim(), otp);
      if (!mounted) return;
      await context.read<AuthState>().onLoggedIn(result.profile, result.addresses);
      if (!mounted) return;
      if (result.profile.name.isEmpty) {
        setState(() => _step = 'name');
      } else {
        Navigator.of(context).pop();
        widget.onSuccess?.call();
      }
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _saveName() async {
    final name = _nameController.text.trim();
    final email = _emailController.text.trim();
    if (email.isNotEmpty &&
        !RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$').hasMatch(email)) {
      setState(() => _error = 'Please enter a valid email (or leave it blank)');
      return;
    }
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      if (name.isNotEmpty || email.isNotEmpty) {
        await NutriwowApi.updateProfile(
          name: name.isNotEmpty ? name : null,
          email: email.isNotEmpty ? email : null,
        );
        if (!mounted) return;
        final auth = context.read<AuthState>();
        if (auth.profile != null) {
          await auth.onLoggedIn(
            auth.profile!.copyWith(
              name: name.isNotEmpty ? name : null,
              email: email.isNotEmpty ? email : null,
            ),
            auth.addresses,
          );
        }
      }
    } catch (_) {
      // Detail save failure shouldn't block login
    } finally {
      if (mounted) {
        Navigator.of(context).pop();
        widget.onSuccess?.call();
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(24, 24, 24, 32),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Center(
            child: Container(
              width: 48,
              height: 48,
              decoration: const BoxDecoration(
                color: NwColors.greenLight,
                shape: BoxShape.circle,
              ),
              child: Icon(
                _step == 'mobile'
                    ? Icons.phone
                    : _step == 'otp'
                        ? Icons.sms
                        : Icons.person,
                color: NwColors.green,
              ),
            ),
          ),
          const SizedBox(height: 12),
          Text(
            _step == 'mobile'
                ? 'Login / Register'
                : _step == 'otp'
                    ? 'Enter OTP'
                    : 'Your Details',
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.headlineSmall,
          ),
          const SizedBox(height: 4),
          Text(
            _step == 'mobile'
                ? 'Welcome to Nutriwow'
                : _step == 'otp'
                    ? 'OTP sent to WhatsApp +91 ${_mobileController.text}'
                    : 'Add your name & email to finish signing up',
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 12.5, color: NwColors.muted),
          ),
          const SizedBox(height: 20),

          if (_step == 'mobile')
            TextField(
              controller: _mobileController,
              keyboardType: TextInputType.phone,
              maxLength: 10,
              autofocus: true,
              decoration: const InputDecoration(
                prefixText: '+91 ',
                hintText: '10-digit mobile number',
                counterText: '',
              ),
            )
          else if (_step == 'otp')
            TextField(
              controller: _otpController,
              keyboardType: TextInputType.number,
              maxLength: 4,
              autofocus: true,
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 24, letterSpacing: 12),
              decoration: const InputDecoration(counterText: ''),
            )
          else ...[
            TextField(
              controller: _nameController,
              textCapitalization: TextCapitalization.words,
              autofocus: true,
              textInputAction: TextInputAction.next,
              decoration: const InputDecoration(
                labelText: 'Full name',
                hintText: 'Your name',
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _emailController,
              keyboardType: TextInputType.emailAddress,
              textInputAction: TextInputAction.done,
              onSubmitted: (_) => _loading ? null : _saveName(),
              decoration: const InputDecoration(
                labelText: 'Email',
                hintText: 'you@email.com (for invoices & offers)',
              ),
            ),
          ],

          if (_error != null)
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Text(_error!,
                  style: const TextStyle(color: Colors.red, fontSize: 12)),
            ),
          const SizedBox(height: 16),

          ElevatedButton(
            onPressed: _loading
                ? null
                : _step == 'mobile'
                    ? _sendOtp
                    : _step == 'otp'
                        ? _verify
                        : _saveName,
            child: Text(_loading
                ? 'Please wait...'
                : _step == 'mobile'
                    ? 'Send OTP on WhatsApp'
                    : _step == 'otp'
                        ? 'Verify & Login'
                        : 'Continue'),
          ),
          if (_step == 'otp')
            TextButton(
              onPressed: _loading
                  ? null
                  : () => setState(() {
                        _step = 'mobile';
                        _otpController.clear();
                        _error = null;
                      }),
              child: const Text('Change number'),
            ),
        ],
      ),
    );
  }
}

