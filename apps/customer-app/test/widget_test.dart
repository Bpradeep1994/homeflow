import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:customer/main.dart';

void main() {
  testWidgets('logged-out user lands on the OTP login screen', (tester) async {
    SharedPreferences.setMockInitialValues({});
    await tester.pumpWidget(const HomeFlowApp());
    await tester.pumpAndSettle();

    expect(find.text('HomeFlow'), findsOneWidget);
    expect(find.text('Phone number'), findsOneWidget);
    expect(find.text('Send OTP'), findsOneWidget);
  });
}
