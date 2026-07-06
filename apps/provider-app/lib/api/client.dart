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

/// HomeFlow API client for the provider app (JWT auth, provider endpoints).
class ApiClient extends ChangeNotifier {
  ApiClient._();

  static final ApiClient instance = ApiClient._();

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
    _token = prefs.getString('provider_token');
    if (_token != null) {
      try {
        currentUser = await _request('GET', '/auth/me') as Map<String, dynamic>;
      } on ApiException {
        await logout();
      }
    }
  }

  Future<void> _saveToken(String? token) async {
    _token = token;
    final prefs = await SharedPreferences.getInstance();
    if (token == null) {
      await prefs.remove('provider_token');
    } else {
      await prefs.setString('provider_token', token);
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
    return (res as Map)['otp'] as String;
  }

  Future<void> verifyOtp(String phone, String otp, {String? name}) async {
    final res = await _request('POST', '/auth/otp/verify', body: {
      'phone': phone,
      'otp': otp,
      'role': 'provider',
      if (name != null && name.isNotEmpty) 'name': name,
    }) as Map<String, dynamic>;
    currentUser = res['user'] as Map<String, dynamic>;
    await _saveToken(res['accessToken'] as String);
  }

  Future<void> logout() async {
    currentUser = null;
    await _saveToken(null);
  }

  // --- Profile & verification ---

  Future<Map<String, dynamic>?> profile() async =>
      await _request('GET', '/provider/profile') as Map<String, dynamic>?;

  Future<Map<String, dynamic>> submitVerification({
    required String idDocumentUrl,
    required List<String> services,
    required String city,
    required List<String> serviceAreas,
    required int experienceYears,
    String? photoUrl,
    List<String>? certificates,
  }) async =>
      await _request('POST', '/provider/verification', body: {
        'idDocumentUrl': idDocumentUrl,
        'services': services,
        'city': city,
        'serviceAreas': serviceAreas,
        'experienceYears': experienceYears,
        'photoUrl': ?photoUrl,
        'certificates': ?certificates,
      }) as Map<String, dynamic>;

  Future<Map<String, dynamic>> updateProfile(Map<String, dynamic> patch) async =>
      await _request('PATCH', '/provider/profile', body: patch) as Map<String, dynamic>;

  Future<bool> setOnline(bool online) async {
    final res = await _request('PATCH', '/provider/availability', body: {'online': online});
    return (res as Map)['online'] as bool;
  }

  // --- Offers & jobs ---

  Future<List<dynamic>> offers() async => await _request('GET', '/provider/offers') as List<dynamic>;

  Future<void> acceptOffer(String id) => _request('POST', '/provider/offers/$id/accept');

  Future<void> declineOffer(String id) => _request('POST', '/provider/offers/$id/decline');

  Future<List<dynamic>> jobs() async => await _request('GET', '/provider/jobs') as List<dynamic>;

  Future<void> updateJobStatus(String id, String status) =>
      _request('POST', '/provider/jobs/$id/status', body: {'status': status});

  Future<void> cancelJob(String id) => _request('POST', '/provider/jobs/$id/cancel');

  // --- Earnings ---

  Future<Map<String, dynamic>> payouts() async =>
      await _request('GET', '/provider/payouts') as Map<String, dynamic>;

  // --- Misc ---

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

  Future<List<dynamic>> catalogCategoryNames() async {
    final raw = await _request('GET', '/catalog') as List<dynamic>;
    return [for (final c in raw) (c as Map<String, dynamic>)['name']];
  }

  Future<List<dynamic>> notifications() async =>
      await _request('GET', '/notifications') as List<dynamic>;
}
