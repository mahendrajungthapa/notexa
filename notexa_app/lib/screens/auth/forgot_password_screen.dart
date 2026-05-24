import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../services/auth_service.dart';
import '../../services/error_handler.dart';

class ForgotPasswordScreen extends StatefulWidget {
  const ForgotPasswordScreen({super.key});

  @override
  State<ForgotPasswordScreen> createState() => _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends State<ForgotPasswordScreen> {
  final _email = TextEditingController();
  final _code = TextEditingController();
  final _password = TextEditingController();
  final _confirm = TextEditingController();
  bool _codeSent = false;
  bool _loading = false;

  @override
  void dispose() {
    _email.dispose();
    _code.dispose();
    _password.dispose();
    _confirm.dispose();
    super.dispose();
  }

  Future<void> _sendCode() async {
    if (_email.text.trim().isEmpty) {
      _message('Enter your email.', Colors.orange);
      return;
    }

    setState(() => _loading = true);
    try {
      final response = await context.read<AuthService>().forgotPassword(_email.text.trim());
      if (!mounted) return;
      setState(() => _codeSent = true);
      _message(response['message'] ?? 'Reset code sent.', const Color(0xFF047857));
    } catch (error, stackTrace) {
      if (mounted) AppErrorHandler.show(error, context: context, stackTrace: stackTrace);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _resetPassword() async {
    if (_code.text.length != 6) {
      _message('Enter the 6-digit code.', Colors.orange);
      return;
    }
    if (_password.text.length < 8) {
      _message('Password must be at least 8 characters.', Colors.orange);
      return;
    }
    if (_password.text != _confirm.text) {
      _message('Passwords do not match.', Colors.orange);
      return;
    }

    setState(() => _loading = true);
    try {
      final response = await context.read<AuthService>().resetPassword(
            email: _email.text.trim(),
            code: _code.text,
            password: _password.text,
            passwordConfirmation: _confirm.text,
          );
      if (!mounted) return;
      _message(response['message'] ?? 'Password reset successfully.', const Color(0xFF047857));
      Navigator.pop(context);
    } catch (error, stackTrace) {
      if (mounted) AppErrorHandler.show(error, context: context, stackTrace: stackTrace);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _message(String text, Color color) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(text), backgroundColor: color));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Reset password')),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(24),
          children: [
            Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: const Color(0xFFEFF6FF),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: const Color(0xFFBFDBFE)),
              ),
              child: const Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(Icons.mark_email_unread_outlined, color: Color(0xFF2563EB)),
                  SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      'Notexa sends a 6-digit password reset code by SMTP. The code expires in 15 minutes.',
                      style: TextStyle(height: 1.45, color: Color(0xFF1E3A8A)),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),
            TextField(
              controller: _email,
              enabled: !_codeSent,
              keyboardType: TextInputType.emailAddress,
              decoration: const InputDecoration(labelText: 'Account email', prefixIcon: Icon(Icons.alternate_email)),
            ),
            if (!_codeSent) ...[
              const SizedBox(height: 18),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: _loading ? null : _sendCode,
                  icon: const Icon(Icons.send_outlined),
                  label: Text(_loading ? 'Sending...' : 'Send reset code'),
                ),
              ),
            ] else ...[
              const SizedBox(height: 18),
              TextField(
                controller: _code,
                keyboardType: TextInputType.number,
                maxLength: 6,
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w900, letterSpacing: 6),
                decoration: const InputDecoration(counterText: '', labelText: '6-digit code'),
                onChanged: (value) {
                  final digits = value.replaceAll(RegExp(r'\D'), '');
                  if (digits != value) {
                    _code.value = TextEditingValue(text: digits, selection: TextSelection.collapsed(offset: digits.length));
                  }
                },
              ),
              const SizedBox(height: 14),
              TextField(
                controller: _password,
                obscureText: true,
                decoration: const InputDecoration(labelText: 'New password', prefixIcon: Icon(Icons.lock_outline)),
              ),
              const SizedBox(height: 14),
              TextField(
                controller: _confirm,
                obscureText: true,
                decoration: const InputDecoration(labelText: 'Confirm password', prefixIcon: Icon(Icons.lock_outline)),
              ),
              const SizedBox(height: 18),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: _loading ? null : _resetPassword,
                  icon: const Icon(Icons.check),
                  label: Text(_loading ? 'Resetting...' : 'Reset password'),
                ),
              ),
              TextButton(onPressed: _loading ? null : _sendCode, child: const Text('Resend code')),
            ],
          ],
        ),
      ),
    );
  }
}
