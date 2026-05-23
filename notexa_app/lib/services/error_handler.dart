import 'dart:async';
import 'dart:ui';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'api_service.dart';

class AppErrorHandler {
  static final scaffoldMessengerKey = GlobalKey<ScaffoldMessengerState>();
  static final navigatorKey = GlobalKey<NavigatorState>();

  static void install() {
    FlutterError.onError = (details) {
      FlutterError.presentError(details);
      report(details.exception, details.stack, source: 'Flutter');
      show(details.exception);
    };

    PlatformDispatcher.instance.onError = (error, stack) {
      report(error, stack, source: 'Platform');
      show(error);
      return true;
    };
  }

  static void report(Object error, StackTrace? stackTrace, {String? source}) {
    debugPrint('[Notexa${source == null ? '' : ' $source'} Error] ${messageFor(error)}');
    if (kDebugMode && stackTrace != null) {
      debugPrint(stackTrace.toString());
    }
  }

  static void show(
    Object error, {
    BuildContext? context,
    StackTrace? stackTrace,
    String? fallback,
  }) {
    report(error, stackTrace);
    final message = fallback ?? messageFor(error);
    final messenger = context == null
        ? scaffoldMessengerKey.currentState
        : (ScaffoldMessenger.maybeOf(context) ?? scaffoldMessengerKey.currentState);

    if (messenger == null) return;
    messenger.hideCurrentSnackBar();
    messenger.showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: const Color(0xFFB91C1C),
        behavior: SnackBarBehavior.floating,
        duration: const Duration(seconds: 4),
      ),
    );
  }

  static Future<void> dialog(
    Object error, {
    BuildContext? context,
    StackTrace? stackTrace,
    String? title,
  }) async {
    report(error, stackTrace);
    final ctx = context ?? navigatorKey.currentContext;
    if (ctx == null) {
      show(error);
      return;
    }

    await showDialog<void>(
      context: ctx,
      builder: (dialogContext) => AlertDialog(
        title: Text(title ?? 'Something went wrong'),
        content: Text(messageFor(error)),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext),
            child: const Text('OK'),
          ),
        ],
      ),
    );
  }

  static String messageFor(Object error) {
    if (error is ApiException) return error.userMessage;
    if (error is TimeoutException) return 'The request timed out. Please check your connection and try again.';
    if (error is FormatException) return 'The app received invalid data. Please try again.';
    if (error is PlatformException) return error.message ?? 'Device error: ${error.code}';

    final text = error.toString();
    final lower = text.toLowerCase();
    if (lower.contains('socketexception') ||
        lower.contains('failed host lookup') ||
        lower.contains('connection refused') ||
        lower.contains('xmlhttprequest') ||
        lower.contains('clientexception')) {
      return 'Cannot reach the Notexa server. Check your internet connection and backend URL.';
    }
    if (lower.contains('permission')) return 'Permission denied. Please allow access and try again.';
    if (lower.contains('no such file') || lower.contains('path not found')) return 'The selected file could not be found.';
    if (text.startsWith('Exception: ')) return text.replaceFirst('Exception: ', '');

    return 'Unexpected error: $text';
  }
}
