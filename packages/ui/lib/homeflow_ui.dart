/// Shared HomeFlow design system: one theme builder + money/date formatters,
/// used by both the customer and provider apps.
library;

import 'package:flutter/material.dart';

/// Brand seeds: teal for the customer app, indigo for the provider app.
const customerSeed = Color(0xFF0D9488);
const providerSeed = Color(0xFF4F46E5);

ThemeData buildHomeFlowTheme(Color seedColor) {
  final scheme = ColorScheme.fromSeed(seedColor: seedColor);
  return ThemeData(
    useMaterial3: true,
    colorScheme: scheme,
    scaffoldBackgroundColor: const Color(0xFFF8FAFC),
    appBarTheme: AppBarTheme(
      backgroundColor: const Color(0xFFF8FAFC),
      foregroundColor: scheme.onSurface,
      elevation: 0,
      centerTitle: false,
    ),
    cardTheme: const CardThemeData(
      elevation: 0,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.all(Radius.circular(16))),
      color: Colors.white,
      margin: EdgeInsets.zero,
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        minimumSize: const Size.fromHeight(52),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
        textStyle: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
      ),
    ),
    navigationBarTheme: NavigationBarThemeData(
      backgroundColor: Colors.white,
      indicatorColor: scheme.primaryContainer,
      labelTextStyle: WidgetStatePropertyAll(
        TextStyle(fontSize: 12, fontWeight: FontWeight.w500, color: scheme.onSurface),
      ),
    ),
  );
}

String formatRupees(int amount) {
  final s = amount.toString();
  if (s.length <= 3) return '₹$s';
  // Indian grouping: last 3 digits, then groups of 2 (e.g. ₹1,23,456).
  final head = s.substring(0, s.length - 3);
  final tail = s.substring(s.length - 3);
  final buf = StringBuffer();
  for (var i = 0; i < head.length; i++) {
    buf.write(head[i]);
    final remaining = head.length - 1 - i;
    if (remaining > 0 && remaining % 2 == 0) buf.write(',');
  }
  return '₹$buf,$tail';
}

const _weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const _months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

String formatDate(DateTime d) => '${_weekdays[d.weekday - 1]}, ${d.day} ${_months[d.month - 1]}';

bool isToday(DateTime d) {
  final now = DateTime.now();
  return d.year == now.year && d.month == now.month && d.day == now.day;
}
