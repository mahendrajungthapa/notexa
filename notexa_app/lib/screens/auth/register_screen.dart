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
  bool _loading = false;

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
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(response['message'] ?? 'Check your email to verify your account.'), backgroundColor: Colors.green));
        Navigator.pop(context);
      } else {
        Navigator.pushReplacement(context, MaterialPageRoute(builder: (_) => const DashboardScreen()));
      }
    } catch (error, stackTrace) {
      if (mounted) AppErrorHandler.show(error, context: context, stackTrace: stackTrace);
    } finally { if (mounted) setState(() => _loading = false); }
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
