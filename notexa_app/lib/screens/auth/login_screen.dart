import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../services/auth_service.dart';
import '../../services/api_service.dart';
import '../../services/error_handler.dart';
import '../dashboard/dashboard_screen.dart';
import 'forgot_password_screen.dart';
import 'register_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});
  @override State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _loginCtrl = TextEditingController();
  final _passCtrl = TextEditingController();
  final _codeCtrl = TextEditingController();
  bool _loading = false;
  bool _showPass = false;
  bool _verifying = false;
  bool _resending = false;

  Future<void> _handleLogin() async {
    if (_loginCtrl.text.isEmpty || _passCtrl.text.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Fill all fields')));
      return;
    }
    setState(() => _loading = true);
    try {
      await context.read<AuthService>().login(login: _loginCtrl.text, password: _passCtrl.text);
      if (mounted) Navigator.pushReplacement(context, MaterialPageRoute(builder: (_) => const DashboardScreen()));
    } catch (error, stackTrace) {
      if (error is ApiException && error.body['code'] == 'email_not_verified') {
        final email = (error.body['email'] ?? _loginCtrl.text).toString();
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(error.userMessage), backgroundColor: Colors.orange));
          _showVerificationDialog(email);
        }
      } else {
        if (mounted) AppErrorHandler.show(error, context: context, stackTrace: stackTrace);
      }
    } finally { if (mounted) setState(() => _loading = false); }
  }

  Future<bool> _handleVerifyCode(String email) async {
    if (_codeCtrl.text.length != 6) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Enter the 6-digit code')));
      return false;
    }

    setState(() => _verifying = true);
    try {
      await context.read<AuthService>().verifyEmailCode(email: email, code: _codeCtrl.text);
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
    _codeCtrl.clear();
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (dialogContext) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: const Text('Verify Email'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Enter the 6-digit code sent to $email.'),
              const SizedBox(height: 16),
              TextField(
                controller: _codeCtrl,
                keyboardType: TextInputType.number,
                maxLength: 6,
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w800, letterSpacing: 6),
                decoration: const InputDecoration(counterText: '', hintText: '000000'),
                onChanged: (value) {
                  final digitsOnly = value.replaceAll(RegExp(r'\D'), '');
                  if (digitsOnly != value) {
                    _codeCtrl.value = _codeCtrl.value.copyWith(
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
              child: const Text('Cancel'),
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
        ),
      ),
    );
  }

  @override
  void dispose() {
    _loginCtrl.dispose();
    _passCtrl.dispose();
    _codeCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 56, height: 56,
                  decoration: BoxDecoration(color: const Color(0xFF4F46E5), borderRadius: BorderRadius.circular(16)),
                  child: const Icon(Icons.description_outlined, color: Colors.white, size: 28),
                ),
                const SizedBox(height: 16),
                Text('Welcome back', style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w800)),
                const SizedBox(height: 4),
                Text('Sign in to Notexa', style: TextStyle(color: Colors.grey.shade500)),
                const SizedBox(height: 32),
                TextField(controller: _loginCtrl, decoration: const InputDecoration(labelText: 'Username or Email', prefixIcon: Icon(Icons.person_outline))),
                const SizedBox(height: 16),
                TextField(
                  controller: _passCtrl,
                  obscureText: !_showPass,
                  decoration: InputDecoration(
                    labelText: 'Password',
                    prefixIcon: const Icon(Icons.lock_outline),
                    suffixIcon: IconButton(icon: Icon(_showPass ? Icons.visibility_off : Icons.visibility), onPressed: () => setState(() => _showPass = !_showPass)),
                  ),
                ),
                Align(
                  alignment: Alignment.centerRight,
                  child: TextButton(
                    onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const ForgotPasswordScreen())),
                    child: const Text('Forgot password?'),
                  ),
                ),
                const SizedBox(height: 24),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: _loading ? null : _handleLogin,
                    child: _loading ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : const Text('Sign In'),
                  ),
                ),
                const SizedBox(height: 16),
                Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                  const Text("Don't have an account? "),
                  GestureDetector(
                    onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const RegisterScreen())),
                    child: Text('Create one', style: TextStyle(color: Theme.of(context).colorScheme.primary, fontWeight: FontWeight.w600)),
                  ),
                ]),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
