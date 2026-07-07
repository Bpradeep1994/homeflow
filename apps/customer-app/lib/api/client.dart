import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart' as http_parser;
import 'package:shared_preferences/shared_preferences.dart';

/// Thrown for non-2xx API responses with the server's message.
class ApiException implements Exception {
  ApiException(this.statusCode, this.message);

  final int statusCode;
  final String message;

  @override
  String toString() => message;
}

/// Thin HTTP client for the HomeFlow API with persistent JWT auth.
class ApiClient extends ChangeNotifier {
  ApiClient._();

  static final ApiClient instance = ApiClient._();

  /// Override with --dart-define=API_URL=http://192.168.x.x:4000 for a phone
  /// on the same Wi-Fi. Android emulators reach the host via 10.0.2.2.
  static const _envUrl = String.fromEnvironment('API_URL');

  static String get baseUrl {
    if (_envUrl.isNotEmpty) return _envUrl;
    if (kIsWeb) return 'http://localhost:4000';
    if (defaultTargetPlatform == TargetPlatform.android) return 'http://10.0.2.2:4000';
    return 'http://localhost:4000';
  }

  String? _token;
  Map<String, dynamic>? currentUser;

  bool get isLoggedIn => _token != null;

  Future<void> init() async {
    final prefs = await SharedPreferences.getInstance();
    _token = prefs.getString('token');
    if (_token != null) {
      try {
        currentUser = await _request('GET', '/auth/me') as Map<String, dynamic>;
      } on ApiException {
        await logout(); // expired/invalid token
      }
    }
  }

  Future<void> _saveToken(String? token) async {
    _token = token;
    final prefs = await SharedPreferences.getInstance();
    if (token == null) {
      await prefs.remove('token');
    } else {
      await prefs.setString('token', token);
    }
    notifyListeners();
  }

  Future<dynamic> _request(String method, String path, {Object? body}) async {
    final uri = Uri.parse('$baseUrl$path');
    final headers = {
      'content-type': 'application/json',
      if (_token != null) 'authorization': 'Bearer $_token',
    };
    late http.Response res;
    try {
      res = switch (method) {
        'GET' => await http.get(uri, headers: headers),
        'POST' => await http.post(uri, headers: headers, body: jsonEncode(body ?? {})),
        'PATCH' => await http.patch(uri, headers: headers, body: jsonEncode(body ?? {})),
        _ => throw ArgumentError(method),
      };
    } catch (_) {
      throw ApiException(0, 'Cannot reach HomeFlow servers. Check your connection.');
    }
    final decoded = res.body.isEmpty ? null : jsonDecode(res.body);
    if (res.statusCode >= 400) {
      final msg = decoded is Map ? decoded['message'] : null;
      throw ApiException(
        res.statusCode,
        (msg is List ? msg.join(', ') : msg?.toString()) ?? 'Something went wrong (${res.statusCode})',
      );
    }
    return decoded;
  }

  // --- Auth ---

  Future<String> requestOtp(String phone) async {
    final res = await _request('POST', '/auth/otp/request', body: {'phone': phone});
    return (res as Map)['otp'] as String; // dev mode echoes the OTP
  }

  Future<void> verifyOtp(String phone, String otp, {String? name}) async {
    final res = await _request('POST', '/auth/otp/verify', body: {
      'phone': phone,
      'otp': otp,
      if (name != null && name.isNotEmpty) 'name': name,
    }) as Map<String, dynamic>;
    currentUser = res['user'] as Map<String, dynamic>;
    await _saveToken(res['accessToken'] as String);
  }

  Future<void> logout() async {
    currentUser = null;
    await _saveToken(null);
  }

  // --- Catalog ---

  Future<List<dynamic>> catalog() async => await _request('GET', '/catalog') as List<dynamic>;

  // --- Bookings ---

  Future<Map<String, dynamic>> createBooking({
    required List<String> serviceIds,
    required String address,
    required String date,
    required String timeSlot,
    String? couponCode,
  }) async =>
      await _request('POST', '/bookings', body: {
        'serviceIds': serviceIds,
        'address': address,
        'date': date,
        'timeSlot': timeSlot,
        'couponCode': ?couponCode,
      }) as Map<String, dynamic>;

  /// Active coupon campaigns (public) — powers the offers carousel.
  Future<List<dynamic>> coupons() async => await _request('GET', '/coupons') as List<dynamic>;

  Future<List<dynamic>> myBookings() async => await _request('GET', '/bookings') as List<dynamic>;

  Future<void> cancelBooking(String id) => _request('POST', '/bookings/$id/cancel');

  Future<void> payBooking(String id, String method) =>
      _request('POST', '/bookings/$id/pay', body: {'method': method});

  Future<void> reviewBooking(String id, int rating, String? comment) =>
      _request('POST', '/bookings/$id/review', body: {
        'rating': rating,
        if (comment != null && comment.isNotEmpty) 'comment': comment,
      });

  Future<void> rescheduleBooking(String id, String date, String timeSlot) =>
      _request('POST', '/bookings/$id/reschedule', body: {'date': date, 'timeSlot': timeSlot});

  // --- Profile ---

  Future<void> updateMe({String? name, String? email}) async {
    currentUser = await _request('PATCH', '/auth/me', body: {
      if (name != null && name.isNotEmpty) 'name': name,
      if (email != null && email.isNotEmpty) 'email': email,
    }) as Map<String, dynamic>;
    notifyListeners();
  }

  // --- Saved addresses ---

  Future<List<dynamic>> addresses() async => await _request('GET', '/addresses') as List<dynamic>;

  Future<Map<String, dynamic>> addAddress(String label, String line) async =>
      await _request('POST', '/addresses', body: {'label': label, 'line': line})
          as Map<String, dynamic>;

  Future<void> deleteAddress(String id) => _request('DELETE', '/addresses/$id');

  // --- Favorites ---

  Future<List<dynamic>> favorites() async => await _request('GET', '/favorites') as List<dynamic>;

  Future<void> addFavorite(String providerUserId) => _request('POST', '/favorites/$providerUserId');

  Future<void> removeFavorite(String providerUserId) =>
      _request('DELETE', '/favorites/$providerUserId');

  // --- Payments ---

  Future<List<dynamic>> payments() async => await _request('GET', '/payments') as List<dynamic>;

  String invoiceUrl(String paymentId) => '$baseUrl/payments/$paymentId/invoice?token=$_token';

  // --- Uploads ---

  Future<String> uploadBytes(List<int> bytes, String filename, String mimeType) async {
    final req = http.MultipartRequest('POST', Uri.parse('$baseUrl/uploads'))
      ..headers['authorization'] = 'Bearer $_token'
      ..files.add(http.MultipartFile.fromBytes('file', bytes,
          filename: filename, contentType: http_parser.MediaType.parse(mimeType)));
    final res = await http.Response.fromStream(await req.send());
    final decoded = jsonDecode(res.body);
    if (res.statusCode >= 400) {
      throw ApiException(res.statusCode, decoded['message']?.toString() ?? 'Upload failed');
    }
    return decoded['url'] as String;
  }

  Future<void> reviewBookingWithPhotos(String id, int rating, String? comment, List<String> photos) =>
      _request('POST', '/bookings/$id/review', body: {
        'rating': rating,
        if (comment != null && comment.isNotEmpty) 'comment': comment,
        if (photos.isNotEmpty) 'photos': photos,
      });

  // --- Support tickets ---

  Future<Map<String, dynamic>> createTicket(String subject, String message,
          {String? bookingId, String priority = 'MEDIUM'}) async =>
      await _request('POST', '/support/tickets', body: {
        'subject': subject,
        'message': message,
        'bookingId': ?bookingId,
        'priority': priority,
      }) as Map<String, dynamic>;

  Future<List<dynamic>> myTickets() async =>
      await _request('GET', '/support/tickets') as List<dynamic>;

  // --- Notifications ---

  Future<List<dynamic>> notifications() async =>
      await _request('GET', '/notifications') as List<dynamic>;

  Future<void> markNotificationsRead() => _request('POST', '/notifications/read');
}
