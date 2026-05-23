import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../services/auth_service.dart';
import '../../services/api_service.dart';
import '../../services/error_handler.dart';
import '../auth/login_screen.dart';
import '../auth/register_screen.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});
  @override State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  late TextEditingController _name;
  late TextEditingController _username;
  final _curPw = TextEditingController();
  final _newPw = TextEditingController();
  final _confirmPw = TextEditingController();

  @override void initState() {
    super.initState();
    final u = context.read<AuthService>().user;
    _name = TextEditingController(text: u?['name'] ?? '');
    _username = TextEditingController(text: u?['username'] ?? '');
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthService>();

    if (!auth.isAuthenticated) {
      return Scaffold(
        appBar: AppBar(title: const Text('Cloud sync', style: TextStyle(fontWeight: FontWeight.w800))),
        body: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: const Color(0xFFE5E7EB)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    width: 52,
                    height: 52,
                    decoration: BoxDecoration(color: Colors.indigo.shade50, borderRadius: BorderRadius.circular(8)),
                    child: const Icon(Icons.cloud_upload_outlined, color: Color(0xFF4F46E5), size: 28),
                  ),
                  const SizedBox(height: 18),
                  const Text('Use Notexa locally', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w900)),
                  const SizedBox(height: 8),
                  Text(
                    'You can create notes and attach local PDFs without an account. Register or sign in when you want cloud backup, sharing codes, friends, and shared PDF files.',
                    style: TextStyle(color: Colors.grey.shade600, height: 1.5),
                  ),
                  const SizedBox(height: 20),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton.icon(
                      icon: const Icon(Icons.person_add_alt_1),
                      label: const Text('Create account'),
                      onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const RegisterScreen())),
                    ),
                  ),
                  const SizedBox(height: 10),
                  SizedBox(
                    width: double.infinity,
                    child: OutlinedButton.icon(
                      icon: const Icon(Icons.login),
                      label: const Text('Sign in'),
                      style: OutlinedButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 14)),
                      onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const LoginScreen())),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            _InfoRow(icon: Icons.offline_pin_outlined, title: 'Local notes', subtitle: 'Saved on this device and available without internet.'),
            _InfoRow(icon: Icons.picture_as_pdf_outlined, title: 'PDF attachments', subtitle: 'Attach and open PDFs directly from local notes.'),
            _InfoRow(icon: Icons.ios_share_outlined, title: 'Cloud sharing', subtitle: 'Requires an account so notes and files can be shared safely.'),
          ],
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(title: const Text('Settings', style: TextStyle(fontWeight: FontWeight.w700))),
      body: ListView(padding: const EdgeInsets.all(16), children: [
        // User info card
        Card(child: Padding(padding: const EdgeInsets.all(16), child: Row(children: [
          CircleAvatar(radius: 28, backgroundColor: Colors.indigo.shade100, child: Text(auth.user?['name']?[0] ?? '?', style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Colors.indigo.shade700))),
          const SizedBox(width: 16),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [
              Text(auth.user?['name'] ?? '', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
            ]),
            Text('@${auth.user?['username'] ?? ''}', style: TextStyle(color: Colors.grey.shade500, fontSize: 13)),
            Text(auth.user?['email'] ?? '', style: TextStyle(color: Colors.grey.shade400, fontSize: 12)),
          ])),
        ]))),
        const SizedBox(height: 16),

        // Edit Profile
        Card(child: Padding(padding: const EdgeInsets.all(16), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Text('Edit Profile', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
          const SizedBox(height: 12),
          TextField(controller: _name, decoration: const InputDecoration(labelText: 'Name')),
          const SizedBox(height: 12),
          TextField(controller: _username, decoration: const InputDecoration(labelText: 'Username', prefixIcon: Icon(Icons.alternate_email))),
          const SizedBox(height: 16),
          SizedBox(width: double.infinity, child: ElevatedButton(onPressed: () async {
            try {
              await auth.updateProfile(name: _name.text, username: _username.text);
              ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Updated!'), backgroundColor: Colors.green));
            } catch (error, stackTrace) {
              if (mounted) AppErrorHandler.show(error, context: context, stackTrace: stackTrace);
            }
          }, child: const Text('Save Profile'))),
        ]))),
        const SizedBox(height: 16),

        // Change Password
        Card(child: Padding(padding: const EdgeInsets.all(16), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Text('Change Password', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
          const SizedBox(height: 12),
          TextField(controller: _curPw, obscureText: true, decoration: const InputDecoration(labelText: 'Current Password')),
          const SizedBox(height: 12),
          TextField(controller: _newPw, obscureText: true, decoration: const InputDecoration(labelText: 'New Password')),
          const SizedBox(height: 12),
          TextField(controller: _confirmPw, obscureText: true, decoration: const InputDecoration(labelText: 'Confirm Password')),
          const SizedBox(height: 16),
          SizedBox(width: double.infinity, child: ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: Colors.grey.shade900),
            onPressed: () async {
              try {
                await ApiService.put('/change-password', body: {'current_password': _curPw.text, 'password': _newPw.text, 'password_confirmation': _confirmPw.text});
                _curPw.clear(); _newPw.clear(); _confirmPw.clear();
                ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Password changed!'), backgroundColor: Colors.green));
              } catch (error, stackTrace) {
                if (mounted) AppErrorHandler.show(error, context: context, stackTrace: stackTrace);
              }
            }, child: const Text('Change Password'))),
        ]))),
        const SizedBox(height: 24),

        // Logout
        SizedBox(width: double.infinity, child: OutlinedButton.icon(
          style: OutlinedButton.styleFrom(foregroundColor: Colors.red, side: const BorderSide(color: Colors.red), padding: const EdgeInsets.symmetric(vertical: 14)),
          onPressed: () async { await auth.logout(); },
          icon: const Icon(Icons.logout), label: const Text('Sign Out'),
        )),
        const SizedBox(height: 24),
      ]),
    );
  }
}

class _InfoRow extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;

  const _InfoRow({required this.icon, required this.title, required this.subtitle});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: ListTile(
        leading: Icon(icon, color: const Color(0xFF4F46E5)),
        title: Text(title, style: const TextStyle(fontWeight: FontWeight.w800)),
        subtitle: Text(subtitle),
      ),
    );
  }
}
