import 'dart:async';
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

class ApiService {
  static const String baseUrl = 'https://app.notexa.cloud/api';
  static const Duration _timeout = Duration(seconds: 30);

  static Future<String?> getToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('notexa_token');
  }

  static Future<bool> hasToken() async => (await getToken()) != null;

  static Future<void> setToken(String token) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('notexa_token', token);
  }

  static Future<void> removeToken() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('notexa_token');
    await prefs.remove('notexa_user');
  }

  static Future<Map<String, String>> _headers({bool auth = true}) async {
    final headers = <String, String>{
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    if (auth) {
      final token = await getToken();
      if (token != null) headers['Authorization'] = 'Bearer $token';
    }
    return headers;
  }

  static Future<Map<String, dynamic>> get(String path, {bool auth = true}) async {
    return _send(() async {
      return http.get(Uri.parse('$baseUrl$path'), headers: await _headers(auth: auth));
    });
  }

  static Future<Map<String, dynamic>> post(String path, {Map<String, dynamic>? body, bool auth = true}) async {
    return _send(() async {
      return http.post(
        Uri.parse('$baseUrl$path'),
        headers: await _headers(auth: auth),
        body: body == null ? null : jsonEncode(body),
      );
    });
  }

  static Future<Map<String, dynamic>> put(String path, {Map<String, dynamic>? body}) async {
    return _send(() async {
      return http.put(
        Uri.parse('$baseUrl$path'),
        headers: await _headers(),
        body: body == null ? null : jsonEncode(body),
      );
    });
  }

  static Future<Map<String, dynamic>> delete(String path) async {
    return _send(() async {
      return http.delete(Uri.parse('$baseUrl$path'), headers: await _headers());
    });
  }

  static Future<Map<String, dynamic>> patch(String path) async {
    return _send(() async {
      return http.patch(Uri.parse('$baseUrl$path'), headers: await _headers());
    });
  }

  static Future<Map<String, dynamic>> uploadFile(String path, String filePath, {String? noteId}) async {
    try {
      final token = await getToken();
      final request = http.MultipartRequest('POST', Uri.parse('$baseUrl$path'));
      if (token != null) request.headers['Authorization'] = 'Bearer $token';
      request.headers['Accept'] = 'application/json';
      request.files.add(await http.MultipartFile.fromPath('file', filePath));
      if (noteId != null) request.fields['note_id'] = noteId;
      final streamResponse = await request.send().timeout(_timeout);
      final response = await http.Response.fromStream(streamResponse);
      return _handleResponse(response);
    } on TimeoutException {
      throw ApiException(statusCode: 0, message: 'File upload timed out. Please try again.');
    } on http.ClientException catch (error) {
      throw ApiException(statusCode: 0, message: 'Network error while uploading file: ${error.message}');
    } on ApiException {
      rethrow;
    } catch (error) {
      throw ApiException(statusCode: 0, message: 'Could not upload file. $error');
    }
  }

  static Future<Map<String, dynamic>> _send(Future<http.Response> Function() request) async {
    try {
      final response = await request().timeout(_timeout);
      return _handleResponse(response);
    } on TimeoutException {
      throw ApiException(statusCode: 0, message: 'Request timed out. Please check your connection.');
    } on FormatException catch (error) {
      throw ApiException(statusCode: 0, message: 'Invalid request URL or response format: ${error.message}');
    } on http.ClientException catch (error) {
      throw ApiException(statusCode: 0, message: 'Network error: ${error.message}');
    } on ApiException {
      rethrow;
    } catch (error) {
      throw ApiException(statusCode: 0, message: 'Unexpected API error: $error');
    }
  }

  static Map<String, dynamic> _handleResponse(http.Response response) {
    final body = _decodeBody(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return body;
    }

    throw ApiException(
      statusCode: response.statusCode,
      message: body['message'] ?? body['error'] ?? _defaultMessage(response.statusCode),
      errors: body['errors'],
    );
  }

  static Map<String, dynamic> _decodeBody(String rawBody) {
    if (rawBody.trim().isEmpty) return <String, dynamic>{};
    try {
      final decoded = jsonDecode(rawBody);
      if (decoded is Map<String, dynamic>) return decoded;
      return {'data': decoded};
    } on FormatException {
      return {'message': 'Server returned an invalid response.'};
    }
  }

  static String _defaultMessage(int statusCode) {
    if (statusCode == 0) return 'Cannot connect to server.';
    if (statusCode == 401) return 'Please sign in again.';
    if (statusCode == 403) return 'You do not have permission for this action.';
    if (statusCode == 404) return 'The requested item was not found.';
    if (statusCode == 422) return 'Please check the form and try again.';
    if (statusCode >= 500) return 'Server error. Please try again later.';
    return 'Request failed with status $statusCode.';
  }
}

class ApiException implements Exception {
  final int statusCode;
  final dynamic message;
  final dynamic errors;

  ApiException({required this.statusCode, this.message, this.errors});

  String get userMessage {
    final validation = _validationErrors();
    if (validation.isNotEmpty) return validation;

    final text = _messageText();
    if (text.isNotEmpty) return text;

    if (statusCode == 0) return 'Cannot reach the server. Check your internet connection.';
    return 'Error $statusCode';
  }

  String _messageText() {
    if (message == null) return '';
    if (message is List) return (message as List).map((item) => item.toString()).join('\n');
    if (message is Map) return (message as Map).values.map((item) => item.toString()).join('\n');
    return message.toString();
  }

  String _validationErrors() {
    if (errors == null) return '';
    if (errors is Map) {
      return (errors as Map)
          .values
          .expand((value) => value is List ? value : [value])
          .map((value) => value.toString())
          .where((value) => value.trim().isNotEmpty)
          .join('\n');
    }
    if (errors is List) return (errors as List).map((item) => item.toString()).join('\n');
    return errors.toString();
  }

  @override
  String toString() => userMessage;
}
