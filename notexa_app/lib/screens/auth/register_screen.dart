import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../services/auth_service.dart';
import '../../services/error_handler.dart';
import '../dashboard/dashboard_screen.dart';

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});
  @override State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _name = TextEditingController();
  final _username = TextEditingController();
  final _email = TextEditingController();
  final _pass = TextEditingController();
  final _confirm = TextEditingController();
  final _code = TextEditingController();
  bool _loading = false;
  bool _verifying = false;
  bool _resending = false;

  Future<void> _handleRegister() async {
    if (_pass.text != _confirm.text) { ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Passwords mismatch'))); return; }
    setState(() => _loading = true);
    try {
      final response = await context.read<AuthService>().register(
        name: _name.text, username: _username.text.toLowerCase(),
        email: _email.text, password: _pass.text, passwordConfirmation: _confirm.text,
      );
      if (!mounted) return;
      if (response['email_verification_required'] == true) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(response['message'] ?? 'Enter the verification code sent to your email.'), backgroundColor: Colors.green));
        _showVerificationDialog(_email.text);
      } else {
        Navigator.pushReplacement(context, MaterialPageRoute(builder: (_) => const DashboardScreen()));
      }
    } catch (error, stackTrace) {
      if (mounted) AppErrorHandler.show(error, context: context, stackTrace: stackTrace);
    } finally { if (mounted) setState(() => _loading = false); }
  }

  Future<bool> _handleVerifyCode(String email) async {
    if (_code.text.length != 6) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Enter the 6-digit code')));
      return false;
    }

    setState(() => _verifying = true);
    try {
      await context.read<AuthService>().verifyEmailCode(email: email, code: _code.text);
      if (!mounted) return false;
      Navigator.pop(context);
      Navigator.pushReplacement(context, MaterialPageRoute(builder: (_) => const DashboardScreen()));
      return true;
    } catch (error, stackTrace) {
      if (mounted) AppErrorHandler.show(error, context: context, stackTrace: stackTrace);
      return false;
    } finally {
      if (mounted) setState(() => _verifying = false);
    }
  }

  Future<void> _handleResendCode(String email) async {
    setState(() => _resending = true);
    try {
      final response = await context.read<AuthService>().resendVerification(email);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(response['message'] ?? 'Verification code sent.'), backgroundColor: Colors.green));
    } catch (error, stackTrace) {
      if (mounted) AppErrorHandler.show(error, context: context, stackTrace: stackTrace);
    } finally {
      if (mounted) setState(() => _resending = false);
    }
  }

  void _showVerificationDialog(String email) {
    _code.clear();
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (dialogContext) {
        return StatefulBuilder(
          builder: (context, setDialogState) {
            return AlertDialog(
              title: const Text('Verify Email'),
              content: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Enter the 6-digit code sent to $email.'),
                  const SizedBox(height: 16),
                  TextField(
                    controller: _code,
                    keyboardType: TextInputType.number,
                    maxLength: 6,
                    textAlign: TextAlign.center,
                    style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w800, letterSpacing: 6),
                    decoration: const InputDecoration(counterText: '', hintText: '000000'),
                    onChanged: (value) {
                      final digitsOnly = value.replaceAll(RegExp(r'\D'), '');
                      if (digitsOnly != value) {
                        _code.value = _code.value.copyWith(
                          text: digitsOnly,
                          selection: TextSelection.collapsed(offset: digitsOnly.length),
                        );
                      }
                    },
                  ),
                ],
              ),
              actions: [
                TextButton(
                  onPressed: _resending ? null : () async {
                    setDialogState(() => _resending = true);
                    await _handleResendCode(email);
                    if (mounted) setDialogState(() => _resending = false);
                  },
                  child: Text(_resending ? 'Sending...' : 'Resend'),
                ),
                TextButton(
                  onPressed: _verifying ? null : () => Navigator.pop(dialogContext),
                  child: const Text('Edit'),
                ),
                ElevatedButton(
                  onPressed: _verifying ? null : () async {
                    setDialogState(() => _verifying = true);
                    final verified = await _handleVerifyCode(email);
                    if (!verified && mounted) setDialogState(() => _verifying = false);
                  },
                  child: Text(_verifying ? 'Verifying...' : 'Verify'),
                ),
              ],
            );
          },
        );
      },
    );
  }

  @override
  void dispose() {
    _name.dispose();
    _username.dispose();
    _email.dispose();
    _pass.dispose();
    _confirm.dispose();
    _code.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Create Account')),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(children: [
            TextField(controller: _name, decoration: const InputDecoration(labelText: 'Full Name', prefixIcon: Icon(Icons.person_outline))),
            const SizedBox(height: 14),
            TextField(controller: _username, decoration: const InputDecoration(labelText: 'Username', prefixIcon: Icon(Icons.alternate_email), hintText: 'e.g. johndoe'),
              onChanged: (v) => _username.value = _username.value.copyWith(text: v.toLowerCase().replaceAll(RegExp(r'[^a-z0-9_]'), ''))),
            const SizedBox(height: 4),
            Align(alignment: Alignment.centerLeft, child: Text('Friends will add you as @${_username.text.isEmpty ? "username" : _username.text}', style: TextStyle(fontSize: 12, color: Colors.grey.shade500))),
            const SizedBox(height: 14),
            TextField(controller: _email, decoration: const InputDecoration(labelText: 'Email', prefixIcon: Icon(Icons.email_outlined)), keyboardType: TextInputType.emailAddress),
            const SizedBox(height: 14),
            TextField(controller: _pass, obscureText: true, decoration: const InputDecoration(labelText: 'Password (min 8)', prefixIcon: Icon(Icons.lock_outline))),
            const SizedBox(height: 14),
            TextField(controller: _confirm, obscureText: true, decoration: const InputDecoration(labelText: 'Confirm Password', prefixIcon: Icon(Icons.lock_outline))),
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _loading ? null : _handleRegister,
                child: _loading ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : const Text('Create Account'),
              ),
            ),
          ]),
        ),
      ),
    );
  }
}
