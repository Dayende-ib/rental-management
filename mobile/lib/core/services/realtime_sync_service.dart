import 'dart:async';
import 'dart:convert';
import 'dart:io';

import '../constants.dart';
import '../storage.dart';

class RealtimeEvent {
  final String type;
  final String entity;
  final String action;
  final String path;
  final DateTime? ts;
  final Map<String, dynamic> raw;

  RealtimeEvent({
    required this.type,
    required this.entity,
    required this.action,
    required this.path,
    required this.raw,
    this.ts,
  });

  factory RealtimeEvent.fromJson(Map<String, dynamic> json) {
    return RealtimeEvent(
      type: (json['type'] ?? '').toString(),
      entity: (json['entity'] ?? '').toString(),
      action: (json['action'] ?? '').toString(),
      path: (json['path'] ?? '').toString(),
      ts: DateTime.tryParse((json['ts'] ?? '').toString()),
      raw: json,
    );
  }
}

class RealtimeSyncService {
  RealtimeSyncService._();
  static final RealtimeSyncService instance = RealtimeSyncService._();

  final StreamController<RealtimeEvent> _controller =
      StreamController<RealtimeEvent>.broadcast();
  Stream<RealtimeEvent> get stream => _controller.stream;

  HttpClient? _httpClient;
  StreamSubscription<String>? _lineSubscription;
  Timer? _reconnectTimer;
  bool _running = false;

  Future<void> start() async {
    if (_running) return;
    _running = true;
    await _connect();
  }

  Future<void> stop() async {
    _running = false;
    _reconnectTimer?.cancel();
    _reconnectTimer = null;
    await _lineSubscription?.cancel();
    _lineSubscription = null;
    _httpClient?.close(force: true);
    _httpClient = null;
  }

  Future<void> _connect() async {
    if (!_running) return;

    final token = StorageService.getToken();
    if (token == null || token.isEmpty) {
      _scheduleReconnect();
      return;
    }

    final base = AppConstants.baseUrl.replaceAll(RegExp(r'/+$'), '');
    final uri = Uri.parse(
      '$base/mobile/realtime/stream?token=${Uri.encodeQueryComponent(token)}',
    );

    try {
      _httpClient?.close(force: true);
      _httpClient = HttpClient();
      final request = await _httpClient!.getUrl(uri);
      request.headers.set(HttpHeaders.acceptHeader, 'text/event-stream');
      final response = await request.close();

      if (response.statusCode != 200) {
        _scheduleReconnect();
        return;
      }

      String dataBuffer = '';

      _lineSubscription = response
          .transform(utf8.decoder)
          .transform(const LineSplitter())
          .listen(
            (line) {
              if (!_running) return;
              if (line.startsWith(':')) return; // heartbeat comment
              if (line.startsWith('data:')) {
                dataBuffer += line.substring(5).trimLeft();
                return;
              }
              if (line.isEmpty && dataBuffer.isNotEmpty) {
                try {
                  final decoded = json.decode(dataBuffer);
                  if (decoded is Map<String, dynamic>) {
                    _controller.add(RealtimeEvent.fromJson(decoded));
                  }
                } catch (_) {
                  // ignore malformed event payload
                } finally {
                  dataBuffer = '';
                }
              }
            },
            onError: (_) => _scheduleReconnect(),
            onDone: _scheduleReconnect,
            cancelOnError: true,
          );
    } catch (_) {
      _scheduleReconnect();
    }
  }

  void _scheduleReconnect() {
    if (!_running) return;
    _reconnectTimer?.cancel();
    _reconnectTimer = Timer(const Duration(seconds: 3), () {
      _connect();
    });
  }
}

