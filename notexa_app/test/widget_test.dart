import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:notexa/main.dart';
import 'package:notexa/services/auth_service.dart';

void main() {
  testWidgets('renders the login screen for signed-out users', (tester) async {
    SharedPreferences.setMockInitialValues({});

    await tester.pumpWidget(
      ChangeNotifierProvider(
        create: (_) => AuthService(),
        child: const NotexaApp(),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Welcome back'), findsOneWidget);
    expect(find.text('Sign in to Notexa'), findsOneWidget);
  });
}
