import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'api_service.dart';
import 'error_handler.dart';

class AuthService extends ChangeNotifier {
  Map<String, dynamic>? _user;
  Map<String, dynamic>? _stats;
  bool _isLoading = true;
  bool _isAuthenticated = false;

  Map<String, dynamic>? get user => _user;
  Map<String, dynamic>? get stats => _stats;
  bool get isLoading => _isLoading;
  bool get isAuthenticated => _isAuthenticated;
  bool get isAdmin => _user?['role'] == 'admin';

  AuthService() {
    _initialize();
  }

  Future<void> _initialize() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('notexa_token');
    final userStr = prefs.getString('notexa_user');

    if (token != null && userStr != null) {
      try {
        _user = jsonDecode(userStr);
        _isAuthenticated = true;
        fetchMe(); // refresh in background
      } catch (error, stackTrace) {
        AppErrorHandler.report(error, stackTrace, source: 'Auth init');
        await ApiService.removeToken();
      }
    }
    _isLoading = false;
    notifyListeners();
  }

  Future<Map<String, dynamic>> register({
    required String name, required String username,
    required String email, required String password,
    required String passwordConfirmation,
  }) async {
    final res = await ApiService.post('/register', body: {
      'name': name, 'username': username, 'email': email,
      'password': password, 'password_confirmation': passwordConfirmation,
    }, auth: false);

    if (res['token'] != null && res['user'] != null) {
      await _setAuth(Map<String, dynamic>.from(res['user']), res['token'].toString());
    }
    return res;
  }

  Future<Map<String, dynamic>> login({required String login, required String password}) async {
    final res = await ApiService.post('/login', body: {
      'login': login, 'password': password,
    }, auth: false);

    if (res['token'] == null || res['user'] == null) {
      throw ApiException(statusCode: 0, message: 'Invalid login response from server.');
    }

    await _setAuth(Map<String, dynamic>.from(res['user']), res['token'].toString());
    return res;
  }

  Future<Map<String, dynamic>> forgotPassword(String email) async {
    return ApiService.post('/forgot-password', body: {'email': email}, auth: false);
  }

  Future<Map<String, dynamic>> resetPassword({
    required String email,
    required String code,
    required String password,
    required String passwordConfirmation,
  }) async {
    return ApiService.post('/reset-password', body: {
      'email': email,
      'code': code,
      'password': password,
      'password_confirmation': passwordConfirmation,
    }, auth: false);
  }

  Future<void> logout() async {
    try {
      await ApiService.post('/logout');
    } catch (error, stackTrace) {
      AppErrorHandler.report(error, stackTrace, source: 'Logout');
    }
    await ApiService.removeToken();
    _user = null;
    _stats = null;
    _isAuthenticated = false;
    notifyListeners();
  }

  Future<Map<String, dynamic>> resendVerification(String email) async {
    return ApiService.post('/email/verification-notification', body: {'email': email}, auth: false);
  }

  Future<Map<String, dynamic>> verifyEmailCode({required String email, required String code}) async {
    final res = await ApiService.post('/email/verify-code', body: {
      'email': email,
      'code': code,
    }, auth: false);

    if (res['token'] != null && res['user'] != null) {
      await _setAuth(Map<String, dynamic>.from(res['user']), res['token'].toString());
    }

    return res;
  }

  Future<void> fetchMe() async {
    try {
      final res = await ApiService.get('/me');
      _user = Map<String, dynamic>.from(res['user'] ?? {});
      _stats = res['stats'] == null ? null : Map<String, dynamic>.from(res['stats']);
      _isAuthenticated = true;
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('notexa_user', jsonEncode(_user));
    } catch (error, stackTrace) {
      AppErrorHandler.report(error, stackTrace, source: 'Fetch profile');
      _isAuthenticated = false;
    }
    notifyListeners();
  }

  Future<void> updateProfile({String? name, String? username, String? institution}) async {
    final body = <String, dynamic>{};
    if (name != null) body['name'] = name;
    if (username != null) body['username'] = username;
    if (institution != null) body['institution'] = institution;
    final res = await ApiService.put('/profile', body: body);
    _user = Map<String, dynamic>.from(res['user'] ?? {});
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('notexa_user', jsonEncode(_user));
    notifyListeners();
  }

  Future<void> _setAuth(Map<String, dynamic> user, String token) async {
    _user = user;
    _isAuthenticated = true;
    await ApiService.setToken(token);
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('notexa_user', jsonEncode(user));
    notifyListeners();
  }
}
