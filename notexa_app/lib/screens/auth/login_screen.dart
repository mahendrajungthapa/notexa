import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../services/auth_service.dart';
import '../../services/error_handler.dart';
import '../dashboard/dashboard_screen.dart';
import 'register_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});
  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _loginCtrl = TextEditingController();
  final _passCtrl = TextEditingController();
  bool _loading = false;
  bool _showPass = false;
  // Add focus node
  final _passFocus = FocusNode();

// Dispose it
  @override
  void dispose() {
    _loginCtrl.dispose();
    _passCtrl.dispose();
    _passFocus.dispose();
    super.dispose();
  }

  Future<void> _handleLogin() async {
    if (_loginCtrl.text.isEmpty || _passCtrl.text.isEmpty) {
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('Fill all fields')));
      return;
    }
    setState(() => _loading = true);
    try {
      await context
          .read<AuthService>()
          .login(login: _loginCtrl.text, password: _passCtrl.text);
      if (mounted)
        Navigator.pushReplacement(context,
            MaterialPageRoute(builder: (_) => const DashboardScreen()));
    } catch (error, stackTrace) {
      if (mounted)
        AppErrorHandler.show(error, context: context, stackTrace: stackTrace);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
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
                  width: 56,
                  height: 56,
                  decoration: BoxDecoration(
                      color: const Color(0xFF4F46E5),
                      borderRadius: BorderRadius.circular(16)),
                  child: const Icon(Icons.description_outlined,
                      color: Colors.white, size: 28),
                ),
                const SizedBox(height: 16),
                Text('Welcome back',
                    style: Theme.of(context)
                        .textTheme
                        .headlineSmall
                        ?.copyWith(fontWeight: FontWeight.w800)),
                const SizedBox(height: 4),
                Text('Sign in to Notexa',
                    style: TextStyle(color: Colors.grey.shade500)),
                const SizedBox(height: 32),
                TextField(
                    controller: _loginCtrl,
                    textInputAction:
                        TextInputAction.next, // ← shows "Next" on keyboard
                    onSubmitted: (_) => FocusScope.of(context)
                        .requestFocus(_passFocus), // ← jumps to password
                    decoration: const InputDecoration(
                        labelText: 'Username or Email',
                        prefixIcon: Icon(Icons.person_outline))),
                const SizedBox(height: 16),
                TextField(
                  controller: _passCtrl,
                  focusNode: _passFocus, // ← receives focus
                  obscureText: !_showPass,
                  textInputAction:
                      TextInputAction.done, // ← shows "Done" on keyboard
                  onSubmitted: (_) => _handleLogin(), // ← submits the form
                  decoration: InputDecoration(
                    labelText: 'Password',
                    prefixIcon: const Icon(Icons.lock_outline),
                    suffixIcon: IconButton(
                        icon: Icon(_showPass
                            ? Icons.visibility_off
                            : Icons.visibility),
                        onPressed: () =>
                            setState(() => _showPass = !_showPass)),
                  ),
                ),
                const SizedBox(height: 24),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: _loading ? null : _handleLogin,
                    child: _loading
                        ? const SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(
                                strokeWidth: 2, color: Colors.white))
                        : const Text('Sign In'),
                  ),
                ),
                const SizedBox(height: 16),
                Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                  const Text("Don't have an account? "),
                  GestureDetector(
                    onTap: () => Navigator.push(
                        context,
                        MaterialPageRoute(
                            builder: (_) => const RegisterScreen())),
                    child: Text('Create one',
                        style: TextStyle(
                            color: Theme.of(context).colorScheme.primary,
                            fontWeight: FontWeight.w600)),
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
