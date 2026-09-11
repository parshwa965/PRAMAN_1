import 'dart:async';
import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

enum UserRole { dept, pmu, ngo }

UserRole? roleFromString(String? raw) {
  switch (raw?.toLowerCase()) {
    case 'dept':
      return UserRole.dept;
    case 'pmu':
      return UserRole.pmu;
    case 'ngo':
      return UserRole.ngo;
    default:
      return null;
  }
}

String _baseUrl() {
  const fromEnv = String.fromEnvironment('PRAMAN_API', defaultValue: '');
  if (fromEnv.isNotEmpty) return fromEnv;
  return 'http://localhost:3001/api';
}

class AuthProvider extends ChangeNotifier {
  AuthProvider({http.Client? client, SharedPreferences? prefs})
      : _client = client ?? http.Client();

  static const _kAccess = 'praman.access_token';
  static const _kRefresh = 'praman.refresh_token';
  static const _kDevice = 'praman.device_id';
  static const _kRole = 'praman.role';
  static const _kUserId = 'praman.user_id';

  final http.Client _client;
  SharedPreferences? _prefs;

  final TextEditingController loginIdController = TextEditingController();
  final TextEditingController passwordController = TextEditingController();

  String? _accessToken;
  String? _refreshToken;
  String? _deviceId;
  String? _userId;
  UserRole? _role;
  bool _busy = false;
  String? _error;

  String? get accessToken => _accessToken;
  String? get userId => _userId;
  UserRole? get role => _role;
  bool get isAuthenticated => _accessToken != null;
  bool get busy => _busy;
  String? get error => _error;

  Map<String, String> authHeaders() {
    final headers = <String, String>{'Content-Type': 'application/json'};
    if (_accessToken != null) headers['Authorization'] = 'Bearer $_accessToken';
    if (_deviceId != null) headers['x-device-id'] = _deviceId!;
    return headers;
  }

  Future<void> init() async {
    _prefs ??= await SharedPreferences.getInstance();
    _accessToken = _prefs!.getString(_kAccess);
    _refreshToken = _prefs!.getString(_kRefresh);
    _deviceId = _prefs!.getString(_kDevice);
    _userId = _prefs!.getString(_kUserId);
    _role = roleFromString(_prefs!.getString(_kRole));
    if (_accessToken == null && _refreshToken != null && _deviceId != null) {
      await refresh();
    } else {
      notifyListeners();
    }
  }

  Future<bool> login(String loginId, String password) async {
    _busy = true;
    _error = null;
    notifyListeners();
    try {
      _prefs ??= await SharedPreferences.getInstance();
      _deviceId ??= _prefs!.getString(_kDevice);
      _deviceId ??= 'dev-${DateTime.now().millisecondsSinceEpoch}';
      final res = await _client
          .post(
            Uri.parse('${_baseUrl()}/auth/login'),
            headers: {
              'Content-Type': 'application/json',
              'x-device-id': _deviceId!,
            },
            body: jsonEncode({'loginId': loginId, 'password': password}),
          )
          .timeout(const Duration(seconds: 15));
      if (res.statusCode != 200) {
        _error = _messageOf(res.body, 'Login failed');
        return false;
      }
      final body = jsonDecode(res.body) as Map<String, dynamic>;
      _accessToken = body['accessToken'] as String?;
      _refreshToken = body['refreshToken'] as String?;
      _userId = body['userId']?.toString();
      _role = roleFromString(body['role']?.toString());
      if (_accessToken == null || _refreshToken == null) {
        _error = 'Malformed auth response';
        return false;
      }
      await _persist();
      return true;
    } on TimeoutException {
      _error = 'Login timed out. Saved offline; retry when online.';
      return false;
    } catch (e) {
      _error = e.toString();
      return false;
    } finally {
      _busy = false;
      notifyListeners();
    }
  }

  Future<bool> refresh() async {
    if (_refreshToken == null || _deviceId == null) return false;
    try {
      final res = await _client
          .post(
            Uri.parse('${_baseUrl()}/auth/refresh'),
            headers: {
              'Content-Type': 'application/json',
              'x-device-id': _deviceId!,
            },
            body: jsonEncode({'refreshToken': _refreshToken}),
          )
          .timeout(const Duration(seconds: 15));
      if (res.statusCode != 200) {
        await logout();
        return false;
      }
      final body = jsonDecode(res.body) as Map<String, dynamic>;
      _accessToken = body['accessToken'] as String?;
      final next = body['refreshToken'] as String?;
      if (next != null) _refreshToken = next;
      if (_accessToken == null) {
        await logout();
        return false;
      }
      await _persist();
      notifyListeners();
      return true;
    } catch (_) {
      return false;
    }
  }

  Future<http.Response> authedGet(Uri url) async {
    var res = await _client.get(url, headers: authHeaders());
    if (res.statusCode == 401 && await refresh()) {
      res = await _client.get(url, headers: authHeaders());
    }
    return res;
  }

  Future<http.Response> authedPost(Uri url, Object payload) async {
    var res = await _client.post(url,
        headers: authHeaders(), body: jsonEncode(payload));
    if (res.statusCode == 401 && await refresh()) {
      res = await _client.post(url,
          headers: authHeaders(), body: jsonEncode(payload));
    }
    return res;
  }

  Future<void> logout() async {
    _prefs ??= await SharedPreferences.getInstance();
    _accessToken = null;
    _refreshToken = null;
    _userId = null;
    _role = null;
    await _prefs!.remove(_kAccess);
    await _prefs!.remove(_kRefresh);
    await _prefs!.remove(_kRole);
    await _prefs!.remove(_kUserId);
    notifyListeners();
  }

  Future<void> _persist() async {
    _prefs ??= await SharedPreferences.getInstance();
    final p = _prefs!;
    await p.setString(_kDevice, _deviceId!);
    await p.setString(_kAccess, _accessToken!);
    await p.setString(_kRefresh, _refreshToken!);
    if (_userId != null) await p.setString(_kUserId, _userId!);
    if (_role != null) await p.setString(_kRole, _role!.name);
  }

  String _messageOf(String body, String fallback) {
    try {
      final decoded = jsonDecode(body);
      if (decoded is Map) {
        final err = decoded['error'];
        if (err is Map && err['message'] is String) {
          return err['message'] as String;
        }
      }
    } catch (_) {}
    return fallback;
  }

  @override
  void dispose() {
    loginIdController.dispose();
    passwordController.dispose();
    _client.close();
    super.dispose();
  }
}
