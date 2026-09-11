import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';

import '../auth/offline_queue.dart';
import 'camera_service.dart';

class InspectionItem {
  InspectionItem({
    required this.id,
    required this.label,
    this.numericValue,
    this.textValue,
    this.boqPercent,
    this.photoRef,
  });

  final String id;
  final String label;
  double? numericValue;
  String? textValue;
  double? boqPercent; // buildingStage only, 0..100
  String? photoRef; // live capture reference; required per item

  bool get hasPhoto => photoRef != null && photoRef!.isNotEmpty;
}

class InspectionChecklistModel extends ChangeNotifier {
  InspectionChecklistModel({String facilityId = ''})
      : _facilityId = facilityId,
        _items = {
          'headcount': InspectionItem(id: 'headcount', label: 'Headcount'),
          'foodQuality':
              InspectionItem(id: 'foodQuality', label: 'Food quality'),
          'medicalKits':
              InspectionItem(id: 'medicalKits', label: 'Medical kits'),
          'computers': InspectionItem(id: 'computers', label: 'Computers'),
          'buildingStage':
              InspectionItem(id: 'buildingStage', label: 'Building stage'),
        };

  static const List<String> ids = [
    'headcount',
    'foodQuality',
    'medicalKits',
    'computers',
    'buildingStage',
  ];

  String _facilityId;
  final Map<String, InspectionItem> _items;

  String get facilityId => _facilityId;
  List<InspectionItem> get items => ids.map((id) => _items[id]!).toList();

  InspectionItem item(String id) => _items[id]!;

  set facilityId(String value) {
    _facilityId = value;
    notifyListeners();
  }

  void setNumeric(String id, double? value) {
    _items[id]!.numericValue = value;
    notifyListeners();
  }

  void setText(String id, String value) {
    _items[id]!.textValue = value;
    notifyListeners();
  }

  void setBoqPercent(double value) {
    assert(value >= 0 && value <= 100, 'BOQ % out of range');
    if (value < 0 || value > 100) {
      throw ArgumentError.value(value, 'value', 'BOQ % must be 0..100');
    }
    _items['buildingStage']!.boqPercent = value;
    notifyListeners();
  }

  void attachPhoto(String id, String liveRef) {
    if (liveRef.isEmpty) {
      throw ArgumentError.value(liveRef, 'liveRef', 'photo proof required');
    }
    _items[id]!.photoRef = liveRef;
    notifyListeners();
  }

  void attachCapture(String id, LiveCapture capture) {
    if (!capture.live) {
      throw StateError('gallery upload rejected: live capture only');
    }
    attachPhoto(id, '${capture.osGps.lat},${capture.osGps.lon}'
        '@${capture.serverTs.toUtc().toIso8601String()}');
  }

  List<String> get missingPhotos =>
      items.where((i) => !i.hasPhoto).map((i) => i.id).toList();

  bool get photosComplete => missingPhotos.isEmpty;

  bool get canSubmit =>
      photosComplete &&
      _items['buildingStage']!.boqPercent != null &&
      _facilityId.isNotEmpty;

  Map<String, dynamic> toJson() => {
        'facilityId': _facilityId,
        'deviceTs': DateTime.now().toUtc().toIso8601String(),
        'items': {
          for (final i in items)
            i.id: {
              'value': i.numericValue ?? i.textValue,
              if (i.id == 'buildingStage') 'boqPercent': i.boqPercent,
              'photoRef': i.photoRef,
            },
        },
      };

  Future<int> saveOffline(OfflineQueue queue) {
    if (!photosComplete) {
      throw StateError(
          'photo proof required per item: ${missingPhotos.join(',')}');
    }
    return queue.enqueue('evidence.submit', toJson());
  }
}

class InspectionChecklist extends StatelessWidget {
  const InspectionChecklist({
    super.key,
    required this.model,
    required this.queue,
  });

  final InspectionChecklistModel model;
  final OfflineQueue queue;

  Future<void> _save(BuildContext context) async {
    try {
      await model.saveOffline(queue);
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Saved offline')),
      );
    } on StateError catch (e) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.message)),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: model,
      builder: (context, _) {
        final m = model;
        return ListView(
          padding: const EdgeInsets.all(16),
          children: [
            const Text('Inspection checklist',
                style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            TextField(
              key: const Key('facilityId'),
              decoration:
                  const InputDecoration(labelText: 'Facility ID'),
              onChanged: (v) => m.facilityId = v,
            ),
            const SizedBox(height: 12),
            for (final item in m.items) ...[
              _ItemCard(
                item: item,
                onNumeric: (v) =>
                    m.setNumeric(item.id, double.tryParse(v)),
                onText: (v) => m.setText(item.id, v),
                onBoq: m.setBoqPercent,
                onPhoto: () =>
                    m.attachPhoto(item.id, 'live:${item.id}:${DateTime.now().toUtc().toIso8601String()}'),
              ),
              const SizedBox(height: 8),
            ],
            const SizedBox(height: 8),
            if (!m.photosComplete)
              Text('Photo proof required: ${m.missingPhotos.join(', ')}',
                  style: const TextStyle(color: Colors.red)),
            const SizedBox(height: 8),
            FilledButton(
              onPressed: m.canSubmit ? () => _save(context) : null,
              child: const Text('Save offline'),
            ),
          ],
        );
      },
    );
  }
}

class _ItemCard extends StatelessWidget {
  const _ItemCard({
    required this.item,
    required this.onNumeric,
    required this.onText,
    required this.onBoq,
    required this.onPhoto,
  });

  final InspectionItem item;
  final ValueChanged<String> onNumeric;
  final ValueChanged<String> onText;
  final ValueChanged<double> onBoq;
  final VoidCallback onPhoto;

  @override
  Widget build(BuildContext context) {
    final isBuilding = item.id == 'buildingStage';
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(item.label,
                      style: const TextStyle(
                          fontSize: 16, fontWeight: FontWeight.w600)),
                ),
                Icon(
                  item.hasPhoto ? Icons.verified : Icons.photo_camera,
                  color: item.hasPhoto ? Colors.green : Colors.grey,
                ),
              ],
            ),
            const SizedBox(height: 8),
            if (isBuilding) ...[
              Slider(
                value: item.boqPercent ?? 0,
                max: 100,
                divisions: 100,
                label: 'BOQ ${(item.boqPercent ?? 0).toStringAsFixed(0)}%',
                onChanged: onBoq,
              ),
              Text('BOQ ${(item.boqPercent ?? 0).toStringAsFixed(0)}%'),
            ] else ...[
              TextField(
                key: Key('${item.id}-value'),
                decoration:
                    const InputDecoration(labelText: 'Value / notes'),
                keyboardType: item.id == 'headcount' ||
                        item.id == 'medicalKits' ||
                        item.id == 'computers'
                    ? TextInputType.number
                    : TextInputType.text,
                onChanged: (v) {
                  final n = double.tryParse(v);
                  if (n != null) {
                    onNumeric(v);
                  } else {
                    onText(v);
                  }
                },
              ),
            ],
            const SizedBox(height: 8),
            OutlinedButton.icon(
              onPressed: onPhoto,
              icon: const Icon(Icons.camera_alt),
              label: Text(item.hasPhoto ? 'Retake photo' : 'Add photo proof'),
            ),
          ],
        ),
      ),
    );
  }
}
