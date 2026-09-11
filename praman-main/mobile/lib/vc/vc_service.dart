import 'dart:async';

import 'package:flutter/foundation.dart';

import '../auth/auth_provider.dart';

enum VcState { idle, ringing, inCall, ended }
enum VcOutcome { completed, missed, rejected }

/// WebRTC engine seam. Swap [NoopRtcEngine] for flutter_webrtc impl when the
/// dependency is added; service treats unavailable engine as missed, never crash.
/// ponytail: stub engine, wire flutter_webrtc RTCPeerConnection when needed.
abstract class RtcEngine {
  bool get available;
  Future<bool> join(String joinUrl);
  Future<void> leave();
}

class NoopRtcEngine implements RtcEngine {
  @override
  bool get available => false;
  @override
  Future<bool> join(String joinUrl) async => false;
  @override
  Future<void> leave() async {}
}

class IncomingCall {
  const IncomingCall({
    required this.vcId,
    required this.facilityId,
    required this.joinUrl,
    this.random = false,
  });
  final String vcId;
  final String facilityId;
  final String joinUrl;
  final bool random;
}

class VCService extends ChangeNotifier {
  VCService({required AuthProvider auth, RtcEngine? rtc})
      : _auth = auth,
        _rtc = rtc ?? NoopRtcEngine();

  final AuthProvider _auth;
  final RtcEngine _rtc;

  static const autoAnswerDeadline = Duration(seconds: 60);

  VcState _state = VcState.idle;
  IncomingCall? _call;
  VcOutcome? _lastOutcome;
  Timer? _deadline;

  VcState get state => _state;
  IncomingCall? get call => _call;
  VcOutcome? get lastOutcome => _lastOutcome;
  bool get webrtcAvailable => _rtc.available;

  /// Push handler: rings, and auto-answers random VC within 60s deadline.
  void onIncomingCall(IncomingCall call) {
    _call = call;
    _state = VcState.ringing;
    _lastOutcome = null;
    _deadline?.cancel();
    if (call.random) {
      _deadline = Timer(autoAnswerDeadline, () async {
        if (_state == VcState.ringing) await answer(auto: true);
      });
    }
    notifyListeners();
  }

  Future<bool> answer({bool auto = false}) async {
    final call = _call;
    if (call == null || _state != VcState.ringing) return false;
    _deadline?.cancel();
    if (!_rtc.available) {
      await logOutcome(VcOutcome.missed, notes: auto ? 'auto: webrtc missing' : 'webrtc missing');
      return false;
    }
    final ok = await _rtc.join(call.joinUrl);
    if (!ok) {
      await logOutcome(VcOutcome.missed, notes: 'join failed');
      return false;
    }
    _state = VcState.inCall;
    notifyListeners();
    return true;
  }

  Future<void> hangUp({VcOutcome outcome = VcOutcome.completed, String notes = ''}) async {
    _deadline?.cancel();
    try {
      await _rtc.leave();
    } catch (_) {}
    await logOutcome(outcome, notes: notes);
  }

  Future<void> reject() => hangUp(outcome: VcOutcome.rejected, notes: 'rejected');

  Future<void> logOutcome(VcOutcome outcome, {String notes = ''}) async {
    final call = _call;
    _state = VcState.ended;
    _lastOutcome = outcome;
    notifyListeners();
    if (call == null) return;
    try {
      await _auth
          .authedPost(
            Uri.parse('${_base()}/vc/${call.vcId}/complete'),
            {'outcome': outcome.name, 'notes': notes},
          )
          .timeout(const Duration(seconds: 15));
    } catch (_) {}
    _call = null;
    _state = VcState.idle;
    notifyListeners();
  }

  String _base() {
    const fromEnv = String.fromEnvironment('PRAMAN_API', defaultValue: '');
    return fromEnv.isNotEmpty ? fromEnv : 'http://localhost:3001/api';
  }

  @override
  void dispose() {
    _deadline?.cancel();
    super.dispose();
  }
}
