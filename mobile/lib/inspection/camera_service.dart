import 'dart:async';
import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;

// live-only capture; gps from OS + network, server time authoritative.
class GpsFix {
  const GpsFix({required this.lat, required this.lon, required this.source});

  final double lat;
  final double lon;
  final String source; // 'os' | 'network'

  Map<String, dynamic> toJson() =>
      {'lat': lat, 'lon': lon, 'source': source};
}

class LiveCapture {
  const LiveCapture({
    required this.bytes,
    required this.source,
    required this.osGps,
    required this.networkGps,
    required this.deviceTs,
    required this.serverTs,
  });

  final List<int> bytes;
  final String source; // always 'live'
  final GpsFix osGps;
  final GpsFix? networkGps;
  final DateTime deviceTs;
  final DateTime serverTs;

  bool get live => source == 'live';

  Map<String, dynamic> toJson() => {
        'source': source,
        'live_capture': live,
        'lat': osGps.lat,
        'lon': osGps.lon,
        'networkLat': networkGps?.lat,
        'networkLon': networkGps?.lon,
        'deviceTs': deviceTs.toUtc().toIso8601String(),
        'serverTs': serverTs.toUtc().toIso8601String(),
      };
}

typedef GpsProvider = Future<GpsFix> Function();
typedef PayloadSigner = String Function(String canonical);

class LiveCameraService extends ChangeNotifier {
  LiveCameraService({
    http.Client? client,
    String? baseUrl,
    GpsProvider? osGpsProvider,
    GpsProvider? networkGpsProvider,
    PayloadSigner? signer,
  })  : _client = client ?? http.Client(),
        _baseUrl = baseUrl ?? defaultBaseUrl,
        _osGpsProvider = osGpsProvider,
        _networkGpsProvider = networkGpsProvider,
        _signer = signer;

  static const String defaultBaseUrl = 'http://localhost:3001/api';

  static String baseUrlOf([String? override]) {
    if (override != null && override.isNotEmpty) return override;
    const fromEnv =
        String.fromEnvironment('PRAMAN_API', defaultValue: '');
    return fromEnv.isNotEmpty ? fromEnv : defaultBaseUrl;
  }

  final http.Client _client;
  final String _baseUrl;
  final GpsProvider? _osGpsProvider;
  final GpsProvider? _networkGpsProvider;
  final PayloadSigner? _signer;

  bool _busy = false;
  bool get busy => _busy;

  Future<GpsFix> getOSGPS() async {
    final provider = _osGpsProvider;
    if (provider == null) {
      throw StateError('OS gps provider not wired');
    }
    final fix = await provider();
    if (fix.source != 'os') {
      throw StateError('expected OS gps fix, got ${fix.source}');
    }
    return fix;
  }

  Future<GpsFix?> getNetworkGPS() async {
    final provider = _networkGpsProvider;
    if (provider == null) return null;
    final fix = await provider();
    if (fix.source != 'network') {
      throw StateError('expected network gps fix, got ${fix.source}');
    }
    return fix;
  }

  Future<DateTime> getServerTime() async {
    try {
      final res = await _client
          .get(Uri.parse('$_baseUrl/evidence/server-time'))
          .timeout(const Duration(seconds: 10));
      if (res.statusCode == 200) {
        final body = jsonDecode(res.body);
        if (body is Map) {
          final raw = body['serverTs'] ?? body['server_ts'];
          final ms = raw is num
              ? (raw < 1e12 ? (raw * 1000).toInt() : raw.toInt())
              : DateTime.tryParse(raw?.toString() ?? '')
                  ?.toUtc()
                  .millisecondsSinceEpoch;
          if (ms != null) {
            return DateTime.fromMillisecondsSinceEpoch(ms, isUtc: true);
          }
        }
      }
    } catch (_) {
      // fall through to device clock; server re-checks drift (15min)
    }
    return DateTime.now().toUtc();
  }

  // Live-only: bytes must come from the camera plugin live path.
  // Any gallery/upload source is rejected like api/evidence assertLive.
  Future<LiveCapture> captureLive({
    required List<int> bytes,
    required GpsFix osGps,
    GpsFix? networkGps,
    String source = 'live',
    DateTime? serverTs,
  }) async {
    assert(source == 'live', 'camera plugin live only');
    if (source.toLowerCase() != 'live') {
      throw StateError('gallery upload rejected: live capture only');
    }
    if (bytes.isEmpty) {
      throw ArgumentError.value(bytes, 'bytes', 'empty capture');
    }
    _busy = true;
    notifyListeners();
    try {
      final server = serverTs ?? await getServerTime();
      return LiveCapture(
        bytes: bytes,
        source: 'live',
        osGps: osGps,
        networkGps: networkGps,
        deviceTs: DateTime.now().toUtc(),
        serverTs: server,
      );
    } finally {
      _busy = false;
      notifyListeners();
    }
  }

  // Canonical resign string is sha256+phash+serverTs (api/evidence
  // stripExifAndResign is authoritative; client signature is best-effort
  // unless a signer is injected).
  Map<String, dynamic> signPayload(
    LiveCapture capture, {
    String? sha256,
    String? phash,
  }) {
    final serverIso = capture.serverTs.toUtc().toIso8601String();
    final canonical = '${sha256 ?? ''}${phash ?? ''}$serverIso';
    final signature = _signer == null ? '' : _signer!(canonical);
    return {
      ...capture.toJson(),
      'sha256': sha256 ?? '',
      'phash': phash ?? '',
      'server_ts': serverIso,
      'signature': signature,
      'signed': _signer != null,
    };
  }

  @override
  void dispose() {
    _client.close();
    super.dispose();
  }
}
