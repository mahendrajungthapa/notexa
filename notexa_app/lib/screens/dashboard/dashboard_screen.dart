import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../notes/notes_list_screen.dart';
import '../friends/friends_screen.dart';
import '../shared/shared_screen.dart';
import '../files/files_screen.dart';
import '../settings/settings_screen.dart';
import '../../services/auth_service.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});
  @override State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  int _i = 0;

  @override
  Widget build(BuildContext context) {
    final authenticated = context.watch<AuthService>().isAuthenticated;
    final pages = authenticated
        ? const [NotesListScreen(), SharedScreen(), FriendsScreen(), FilesScreen(), SettingsScreen()]
        : const [NotesListScreen(), SettingsScreen()];
    final destinations = authenticated
        ? const [
            NavigationDestination(icon: Icon(Icons.description_outlined), selectedIcon: Icon(Icons.description), label: 'Notes'),
            NavigationDestination(icon: Icon(Icons.share_outlined), selectedIcon: Icon(Icons.share), label: 'Shared'),
            NavigationDestination(icon: Icon(Icons.people_outline), selectedIcon: Icon(Icons.people), label: 'Friends'),
            NavigationDestination(icon: Icon(Icons.folder_outlined), selectedIcon: Icon(Icons.folder), label: 'Files'),
            NavigationDestination(icon: Icon(Icons.settings_outlined), selectedIcon: Icon(Icons.settings), label: 'Settings'),
          ]
        : const [
            NavigationDestination(icon: Icon(Icons.description_outlined), selectedIcon: Icon(Icons.description), label: 'Notes'),
            NavigationDestination(icon: Icon(Icons.cloud_upload_outlined), selectedIcon: Icon(Icons.cloud_upload), label: 'Cloud'),
          ];

    if (_i >= pages.length) _i = 0;

    return Scaffold(
      body: pages[_i],
      bottomNavigationBar: NavigationBar(
        selectedIndex: _i,
        onDestinationSelected: (i) => setState(() => _i = i),
        height: 65,
        destinations: destinations,
      ),
    );
  }
}
