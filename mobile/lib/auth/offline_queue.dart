import 'dart:async';
import 'dart:convert';
import 'dart:math';

import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:path/path.dart' as p;
import 'package:sqflite/sqflite.dart';

typedef QueueSender = Future<http.Response> Function(
    String action, Map<String, dynamic> payload);

class QueuedAction {
  const QueuedAction({
    required this.id,
    required this.action,
    required this.payload,
    required this.attempts,
    required this.createdAt,
  });

  final int id;
  final String action;
  final Map<String, dynamic> payload;
  final int attempts;
  final DateTime createdAt;
}

class OfflineQueue extends ChangeNotifier {
  OfflineQueue({http.Client? client, QueueSender? sender, String? dbPath})
      : _client = client ?? http.Client(),
        _sender = sender,
        _dbPathOverride = dbPath;

  static const String table = 'offline_queue';
  static const int maxAttempts = 8;

  final http.Client _client;
  final QueueSender? _sender;
  final String? _dbPathOverride;

  Database? _db;
  bool _syncing = false;

  bool get syncing => _syncing;

  Future<Database> _open() async {
    if (_db != null && _db!.isOpen) return _db!;
    final String path;
    if (_dbPathOverride != null) {
      path = _dbPathOverride!;
    } else {
      final dir = await getDatabasesPath();
      path = p.join(dir, 'praman_offline.db');
    }
    _db = await openDatabase(
      path,
      version: 1,
      onCreate: (db, version) async {
        await db.execute(
          'CREATE TABLE $table('
          'id INTEGER PRIMARY KEY AUTOINCREMENT, '
          'action TEXT NOT NULL, '
          'payload TEXT NOT NULL, '
          'attempts INTEGER NOT NULL DEFAULT 0, '
          'created_at TEXT NOT NULL)',
        );
      },
    );
    return _db!;
  }

  Future<int> enqueue(String action, Map<String, dynamic> payload) async {
    final db = await _open();
    return db.insert(table, {
      'action': action,
      'payload': jsonEncode(payload),
      'attempts': 0,
      'created_at': DateTime.now().toUtc().toIso8601String(),
    });
  }

  Future<List<QueuedAction>> pending() async {
    final db = await _open();
    final rows = await db.query(table, orderBy: 'id ASC');
    return rows.map((r) {
      Map<String, dynamic> payload = const {};
      try {
        payload = jsonDecode(r['payload'] as String) as Map<String, dynamic>;
      } catch (_) {}
      return QueuedAction(
        id: r['id'] as int,
        action: r['action'] as String,
        payload: payload,
        attempts: (r['attempts'] as int?) ?? 0,
        createdAt:
            DateTime.tryParse(r['created_at'] as String? ?? '') ?? DateTime.now().toUtc(),
      );
    }).toList();
  }

  Future<int> pendingCount() async {
    final db = await _open();
    final rows = await db.rawQuery('SELECT COUNT(*) AS n FROM $table');
    return (rows.first['n'] as int?) ?? 0;
  }

  Future<void> sync() async {
    if (_syncing) return;
    _syncing = true;
    notifyListeners();
    try {
      final items = await pending();
      for (final item in items) {
        if (item.attempts >= maxAttempts) {
          await _remove(item.id);
          continue;
        }
        final ok = await _sendOnce(item);
        if (ok) {
          await _remove(item.id);
        } else {
          await _bump(item);
          await Future.delayed(_backoff(item.attempts));
        }
      }
    } finally {
      _syncing = false;
      notifyListeners();
    }
  }

  Future<bool> _sendOnce(QueuedAction item) async {
    try {
      final res = _sender != null
          ? await _sender!(item.action, item.payload)
          : await _client
              .post(
                Uri.parse(_endpointFor(item.action)),
                headers: const {'Content-Type': 'application/json'},
                body: jsonEncode(item.payload),
              )
              .timeout(const Duration(seconds: 15));
      return res.statusCode >= 200 && res.statusCode < 300;
    } catch (_) {
      return false;
    }
  }

  String _endpointFor(String action) {
    const base = String.fromEnvironment('PRAMAN_API',
        defaultValue: 'http://localhost:3001/api');
    if (action.startsWith('http')) return action;
    return '$base/queue/$action';
  }

  Duration _backoff(int attempts) {
    final secs = min(1 << min(attempts, 5), 32);
    return Duration(seconds: secs);
  }

  Future<void> _remove(int id) async {
    final db = await _open();
    await db.delete(table, where: 'id = ?', whereArgs: [id]);
  }

  Future<void> _bump(QueuedAction item) async {
    final db = await _open();
    await db.update(table, {'attempts': item.attempts + 1},
        where: 'id = ?', whereArgs: [item.id]);
  }

  @override
  void dispose() {
    _client.close();
    final db = _db;
    if (db != null && db.isOpen) {
      unawaited(db.close());
    }
    super.dispose();
  }
}
