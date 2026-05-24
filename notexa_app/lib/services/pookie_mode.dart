import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

class PookieMode extends ChangeNotifier {
  bool _enabled = false;
  bool get enabled => _enabled;

  PookieMode() {
    _load();
  }

  Future<void> _load() async {
    final prefs = await SharedPreferences.getInstance();
    _enabled = prefs.getBool('notexa_pookie_mode') ?? false;
    notifyListeners();
  }

  Future<void> toggle() async {
    _enabled = !_enabled;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('notexa_pookie_mode', _enabled);
    notifyListeners();
  }

  // Colors
  Color get primary => _enabled ? const Color(0xFFFF69B4) : const Color(0xFF4F46E5);
  Color get primaryLight => _enabled ? const Color.fromARGB(255, 248, 193, 206) : const Color(0xFFEEF2FF);
  Color get background => _enabled ? const Color.fromARGB(255, 245, 153, 181) : const Color(0xFFF9FAFB);
  Color get cardColor => _enabled ? const Color(0xFFFFF0F5) : Colors.white;
  Color get textPrimary => _enabled ? const Color(0xFF9D174D) : const Color(0xFF111827);
  Color get textSecondary => _enabled ? const Color(0xFFBE185D) : const Color(0xFF6B7280);
}