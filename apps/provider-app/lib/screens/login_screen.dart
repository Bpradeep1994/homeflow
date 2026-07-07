import 'package:flutter/material.dart';

import '../api/client.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _phone = TextEditingController(text: '+91');
  final _otp = TextEditingController();
  final _name = TextEditingController();

  bool _otpSent = false;
  bool _busy = false;
  String? _devOtpHint;

  Future<void> _run(Future<void> Function() action) async {
    setState(() => _busy = true);
    try {
      await action();
    } on ApiException catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _sendOtp() => _run(() async {
        final otp = await ApiClient.instance.requestOtp(_phone.text.trim());
        setState(() {
          _otpSent = true;
          _devOtpHint = otp;
        });
      });

  Future<void> _verify() => _run(() =>
      ApiClient.instance.verifyOtp(_phone.text.trim(), _otp.text.trim(), name: _name.text.trim()));

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 420),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const Text('👷', style: TextStyle(fontSize: 56), textAlign: TextAlign.center),
                  const SizedBox(height: 8),
                  Text('HomeFlow Pro',
                      textAlign: TextAlign.center,
                      style: Theme.of(context)
                          .textTheme
                          .headlineMedium
                          ?.copyWith(fontWeight: FontWeight.w800, color: scheme.primary)),
                  const SizedBox(height: 4),
                  Text('Earn with your skills',
                      textAlign: TextAlign.center, style: TextStyle(color: Colors.grey.shade600)),
                  const SizedBox(height: 4),
                  // Build diagnosis: shows which API this build talks to.
                  Text(
                    'v0.1.1 · ${Uri.parse(ApiClient.baseUrl).host}',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: Colors.grey.shade400, fontSize: 11),
                  ),
                  const SizedBox(height: 28),
                  TextField(
                    controller: _phone,
                    enabled: !_otpSent,
                    keyboardType: TextInputType.phone,
                    decoration: const InputDecoration(
                      labelText: 'Phone number',
                      prefixIcon: Icon(Icons.phone_outlined),
                      border: OutlineInputBorder(),
                    ),
                  ),
                  if (_otpSent) ...[
                    const SizedBox(height: 12),
                    TextField(
                      controller: _otp,
                      keyboardType: TextInputType.number,
                      autofocus: true,
                      decoration: InputDecoration(
                        labelText: 'OTP',
                        prefixIcon: const Icon(Icons.lock_outline),
                        border: const OutlineInputBorder(),
                        helperText: _devOtpHint == null ? null : 'Dev build: OTP is $_devOtpHint',
                      ),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: _name,
                      decoration: const InputDecoration(
                        labelText: 'Your name (first time only)',
                        prefixIcon: Icon(Icons.person_outline),
                        border: OutlineInputBorder(),
                      ),
                    ),
                  ],
                  const SizedBox(height: 20),
                  FilledButton(
                    onPressed: _busy ? null : (_otpSent ? _verify : _sendOtp),
                    child: _busy
                        ? const SizedBox(
                            width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2))
                        : Text(_otpSent ? 'Verify & Continue' : 'Send OTP'),
                  ),
                  if (_otpSent)
                    TextButton(
                      onPressed: _busy ? null : () => setState(() => _otpSent = false),
                      child: const Text('Change phone number'),
                    ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
