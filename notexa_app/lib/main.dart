import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';
import 'services/auth_service.dart';
import 'services/error_handler.dart';
import 'screens/dashboard/dashboard_screen.dart';
import 'services/pookie_mode.dart';

void main() {
  runZonedGuarded(() {
    WidgetsFlutterBinding.ensureInitialized();
    AppErrorHandler.install();
    ErrorWidget.builder = (details) => Material(
          color: const Color(0xFFF8F9FC),
          child: Center(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.error_outline,
                      color: Color(0xFFB91C1C), size: 42),
                  const SizedBox(height: 12),
                  const Text('Something went wrong',
                      style:
                          TextStyle(fontWeight: FontWeight.w800, fontSize: 18)),
                  const SizedBox(height: 6),
                  Text(
                    AppErrorHandler.messageFor(details.exception),
                    textAlign: TextAlign.center,
                    style: const TextStyle(color: Color(0xFF6B7280)),
                  ),
                ],
              ),
            ),
          ),
        );

    runApp(
      MultiProvider(
        providers: [
          ChangeNotifierProvider(create: (_) => AuthService()),
          ChangeNotifierProvider(create: (_) => PookieMode()),
        ],
        child: const NotexaApp(),
      ),
    );
  }, (error, stack) {
    AppErrorHandler.report(error, stack, source: 'Zone');
    AppErrorHandler.show(error, stackTrace: stack);
  });
}

class NotexaApp extends StatelessWidget {
  const NotexaApp({super.key});

  @override
  Widget build(BuildContext context) {
    return Consumer<PookieMode>(
      builder: (context, pookie, _) {
        final primaryColor =
            pookie.enabled ? const Color(0xFFFF69B4) : const Color(0xFF4F46E5);
        final bgColor =
            pookie.enabled ? const Color(0xFFFFF5F8) : const Color(0xFFF8F9FC);
        final cardColor =
            pookie.enabled ? const Color(0xFFFFF0F5) : Colors.white;
        final textTheme = pookie.enabled
            ? GoogleFonts.quicksandTextTheme()
            : GoogleFonts.outfitTextTheme();

        return MaterialApp(
          title: 'Notexa',
          debugShowCheckedModeBanner: false,
          navigatorKey: AppErrorHandler.navigatorKey,
          scaffoldMessengerKey: AppErrorHandler.scaffoldMessengerKey,
          theme: ThemeData(
            colorScheme: ColorScheme.fromSeed(
              seedColor: primaryColor,
              brightness: Brightness.light,
            ),
            textTheme: textTheme,
            useMaterial3: true,
            scaffoldBackgroundColor: bgColor,
            appBarTheme: AppBarTheme(
              backgroundColor: cardColor,
              foregroundColor: pookie.enabled
                  ? const Color(0xFF9D174D)
                  : const Color(0xFF1A1A2E),
              elevation: 0,
              scrolledUnderElevation: 1,
            ),
            cardTheme: CardThemeData(
              elevation: 0,
              color: cardColor,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(pookie.enabled ? 20 : 8),
                side: BorderSide(
                    color: pookie.enabled
                        ? const Color(0xFFFFD1DC)
                        : const Color(0xFFE5E7EB)),
              ),
            ),
            inputDecorationTheme: InputDecorationTheme(
              filled: true,
              fillColor: cardColor,
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(pookie.enabled ? 20 : 10),
                borderSide: BorderSide(
                    color: pookie.enabled
                        ? const Color(0xFFFFD1DC)
                        : const Color(0xFFE5E7EB)),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(pookie.enabled ? 20 : 10),
                borderSide: BorderSide(
                    color: pookie.enabled
                        ? const Color(0xFFFFD1DC)
                        : const Color(0xFFE5E7EB)),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(pookie.enabled ? 20 : 10),
                borderSide: BorderSide(color: primaryColor, width: 2),
              ),
              contentPadding:
                  const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            ),
            elevatedButtonTheme: ElevatedButtonThemeData(
              style: ElevatedButton.styleFrom(
                backgroundColor: primaryColor,
                foregroundColor: Colors.white,
                padding:
                    const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(pookie.enabled ? 20 : 10),
                ),
                textStyle:
                    const TextStyle(fontWeight: FontWeight.w600, fontSize: 15),
              ),
            ),
            floatingActionButtonTheme: FloatingActionButtonThemeData(
              backgroundColor: primaryColor,
              foregroundColor: Colors.white,
            ),
          ),
          home: Consumer<AuthService>(
            builder: (context, auth, _) {
              if (auth.isLoading) {
                return const Scaffold(
                    body: Center(child: CircularProgressIndicator()));
              }
              return const DashboardScreen();
            },
          ),
        );
      },
    );
  }
}
