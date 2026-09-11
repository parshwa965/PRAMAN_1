import 'package:flutter_test/flutter_test.dart';

import 'package:praman/main.dart';

void main() {
  testWidgets('Praman shows inspector login', (WidgetTester tester) async {
    await tester.pumpWidget(const PramanApp());
    await tester.pumpAndSettle();

    expect(find.text('Praman — Inspector Login'), findsOneWidget);
    expect(find.text('Login'), findsOneWidget);
  });
}
