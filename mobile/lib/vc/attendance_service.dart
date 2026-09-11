import 'dart:async';
import 'dart:convert';
import 'dart:math';

import 'package:flutter/foundation.dart';

import '../auth/auth_provider.dart';
import '../auth/offline_queue.dart';

enum LivenessChallenge { blink, smile }

class LivenessResult {
  const LivenessResult({required this.passed, required this.challenge, required this.faceHash});
  final bool passed;
  final LivenessChallenge challenge;
  final String faceHash;
}

class AttendanceService extends ChangeNotifier {
  AttendanceService({required AuthProvider auth, required OfflineQueue queue})
      : _auth = auth,
        _queue = queue;

  final AuthProvider _auth;
  final OfflineQueue _queue;
  final Random _rand = Random();

  bool _busy = false;
  bool get busy => _busy;

  /// Liveness stub: prompts blink/smile, derives face_hash locally.
  /// Real impl swaps body for ML-kit face mesh; contract (liveness flag +
  /// face_hash) stays identical.
  Future<LivenessResult> runLiveness(List<int> frameBytes) async {
    final challenge = _rand.nextBool() ? LivenessChallenge.blink : LivenessChallenge.smile;
    final passed = frameBytes.isNotEmpty;
    final faceHash = _faceHash(frameBytes, challenge);
    return LivenessResult(passed: passed, challenge: challenge, faceHash: faceHash);
  }

  /// Capture attendance; uploads live, enqueues offline on failure.
  Future<bool> capture({
    required String inspectionId,
    required List<int> frameBytes,
    required double lat,
    required double lon,
    String gpsSource = 'os',
  }) async {
    final LivenessResult liveness = await runLiveness(frameBytes);
    if (!liveness.passed) return false;
    _busy = true;
    notifyListeners();
    try {
      final payload = <String, dynamic>{
        'inspection_id': inspectionId,
        'kind': 'attendance',
        'lat': lat,
        'lon': lon,
        'gps_source': gpsSource,
        'device_ts': DateTime.now().toUtc().toIso8601String(),
        'live_capture': true,
        'liveness': true,
        'liveness_challenge': liveness.challenge.name,
        'face_hash': liveness.faceHash,
      };
      try {
        final res = await _auth
            .authedPost(
              Uri.parse('${_base()}/inspections/$inspectionId/evidence'),
              payload,
            )
            .timeout(const Duration(seconds: 15));
        if (res.statusCode >= 200 && res.statusCode < 300) return true;
      } catch (_) {}
      await _queue.enqueue('attendance', payload);
      return true;
    } finally {
      _busy = false;
      notifyListeners();
    }
  }

  String _faceHash(List<int> bytes, LivenessChallenge c) {
    var h = 0x811c9dc5;
    for (final b in bytes) {
      h ^= b;
      h = (h * 0x01000193) & 0xffffffff;
    }
    h ^= c.index + 1;
    return base64Url.encode(utf8.encode(h.toRadixString(16)));
  }

  String _base() {
    const fromEnv = String.fromEnvironment('PRAMAN_API', defaultValue: '');
    return fromEnv.isNotEmpty ? fromEnv : 'http://localhost:3001/api';
  }
}
