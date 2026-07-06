import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:provider_app/main.dart';

void main() {
  testWidgets('logged-out provider lands on the OTP login screen', (tester) async {
    SharedPreferences.setMockInitialValues({});
    await tester.pumpWidget(const HomeFlowProviderApp());
    await tester.pumpAndSettle();

    expect(find.text('HomeFlow Pro'), findsOneWidget);
    expect(find.text('Send OTP'), findsOneWidget);
  });
}
