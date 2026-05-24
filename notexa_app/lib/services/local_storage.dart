import 'dart:convert';
import 'api_service.dart';
import 'error_handler.dart';
import 'package:shared_preferences/shared_preferences.dart';

class LocalNoteStorage {
  static const String _key = 'notexa_local_notes';

  static bool isLocalId(dynamic id) {
    final value = id is int ? id : int.tryParse(id?.toString() ?? '');
    return value != null && value < 0;
  }

  static Future<int> createDraft({
    String title = 'Untitled Note',
    String content = '',
    String color = '#fff7d6',
  }) async {
    final now = DateTime.now().toIso8601String();
    final id = -DateTime.now().microsecondsSinceEpoch;
    await saveNote(
        id,
        {
          'id': id,
          'title': title.trim().isEmpty ? 'Untitled Note' : title.trim(),
          'content': content,
          'plain_text': htmlToPlain(content),
          'color': color,
          'is_pinned': false,
          'is_trashed': false,
          'share_code': null,
          'created_at': now,
          'updated_at': now,
          '_local_origin': true,
        },
        dirty: true,
        syncAction: 'create');
    return id;
  }

  static Future<void> saveNote(
    dynamic noteId,
    Map<String, dynamic> noteData, {
    bool dirty = false,
    String? syncAction,
  }) async {
    final prefs = await SharedPreferences.getInstance();
    final notes = await _read();
    final key = noteId.toString();
    final now = DateTime.now().toIso8601String();
    final note = Map<String, dynamic>.from(noteData);
    note['id'] ??= noteId;
    note['updated_at'] ??= now;
    note['local_updated_at'] = now;

    if (dirty) {
      note['_dirty'] = true;
      note['_sync_action'] =
          syncAction ?? (isLocalId(note['id']) ? 'create' : 'update');
    } else {
      note['_dirty'] = false;
      note.remove('_sync_action');
    }

    notes[key] = note;
    await prefs.setString(_key, jsonEncode(notes));
  }

  static Future<Map<String, dynamic>?> getNote(dynamic noteId) async {
    final notes = await _read();
    final value = notes[noteId.toString()];
    return value == null ? null : Map<String, dynamic>.from(value);
  }

  static Future<List<Map<String, dynamic>>> getAllNotes(
      {String search = ''}) async {
    final notes = await _read();
    final query = search.trim().toLowerCase();
    final values = notes.values
        .map((v) => Map<String, dynamic>.from(v))
        .where((n) => n['is_trashed'] != true)
        .where((n) {
      if (query.isEmpty) return true;
      final title = (n['title'] ?? '').toString().toLowerCase();
      final body = (n['plain_text'] ?? htmlToPlain(n['content']))
          .toString()
          .toLowerCase();
      return title.contains(query) || body.contains(query);
    }).toList();

    values.sort((a, b) {
      final pinned =
          (b['is_pinned'] == true ? 1 : 0) - (a['is_pinned'] == true ? 1 : 0);
      if (pinned != 0) return pinned;
      return (b['updated_at'] ?? '')
          .toString()
          .compareTo((a['updated_at'] ?? '').toString());
    });
    return values;
  }

  static Future<void> deleteNote(dynamic noteId) async {
    final prefs = await SharedPreferences.getInstance();
    final notes = await _read();
    notes.remove(noteId.toString());
    await prefs.setString(_key, jsonEncode(notes));
  }

  static Future<void> replaceNoteId(
      dynamic oldId, Map<String, dynamic> cloudNote) async {
    final prefs = await SharedPreferences.getInstance();
    final notes = await _read();
    final old = notes[oldId.toString()];
    notes.remove(oldId.toString());
    notes[cloudNote['id'].toString()] = {
      ...cloudNote,
      '_dirty': false,
      '_local_origin': old?['_local_origin'] == true,
      'local_updated_at': DateTime.now().toIso8601String(),
    };
    await prefs.setString(_key, jsonEncode(notes));
  }

  static Future<void> syncFromCloud(List<dynamic> cloudNotes) async {
    final prefs = await SharedPreferences.getInstance();
    final current = await _read();
    final merged = <String, dynamic>{};

    current.forEach((key, value) {
      final note = Map<String, dynamic>.from(value);
      if (note['_dirty'] == true || isLocalId(note['id'])) {
        merged[key] = note;
      }
    });

    for (final n in cloudNotes) {
      final note = Map<String, dynamic>.from(n);
      // Check if this cloud note was originally created locally
      final existingKey = current.entries
          .where((e) => e.value['id'].toString() == n['id'].toString())
          .firstOrNull;
      final wasLocalOrigin = existingKey?.value['_local_origin'] == true;

      merged[n['id'].toString()] = {
        ...note,
        '_dirty': false,
        '_local_origin': wasLocalOrigin, // ← preserve the flag
        'local_updated_at': DateTime.now().toIso8601String(),
      };
    }
    await prefs.setString(_key, jsonEncode(merged));
  }

  static Future<Map<String, int>> syncDirtyNotes() async {
    final notes = await _read();
    var synced = 0;
    var failed = 0;

    for (final entry in notes.entries.toList()) {
      final note = Map<String, dynamic>.from(entry.value);
      if (note['_dirty'] != true) continue;

      final body = {
        'title': (note['title'] ?? 'Untitled Note').toString().trim().isEmpty
            ? 'Untitled Note'
            : (note['title'] ?? 'Untitled Note').toString().trim(),
        'content': note['content'] ?? '',
        'color': note['color'] ?? '#ffffff',
        'is_pinned': note['is_pinned'] == true,
      };

      try {
        final id = note['id'];
        final action = note['_sync_action'];
        if (action == 'create' || isLocalId(id)) {
          final response = await ApiService.post('/notes', body: body);
          final cloudNote = Map<String, dynamic>.from(response['data']);
          await _syncLocalFiles(cloudNote['id'], note);
          await replaceNoteId(entry.key, cloudNote);
        } else {
          final response = await ApiService.put('/notes/$id', body: body);
          final cloudNote = Map<String, dynamic>.from(response['data']);
          await _syncLocalFiles(id, note);
          await saveNote(id, cloudNote);
        }
        synced++;
      } catch (error, stackTrace) {
        AppErrorHandler.report(error, stackTrace, source: 'Local note sync');
        failed++;
      }
    }

    return {'synced': synced, 'failed': failed};
  }

  static String htmlToPlain(dynamic html) {
    final value = (html ?? '').toString();
    return value
        .replaceAll(RegExp(r'<br\s*/?>', caseSensitive: false), '\n')
        .replaceAll(RegExp(r'</p>|</h[1-3]>|</li>', caseSensitive: false), '\n')
        .replaceAll(RegExp(r'<[^>]+>'), '')
        .replaceAll('&nbsp;', ' ')
        .replaceAll('&amp;', '&')
        .replaceAll('&lt;', '<')
        .replaceAll('&gt;', '>')
        .replaceAll('&quot;', '"')
        .trim();
  }

  static Future<void> _syncLocalFiles(
      dynamic noteId, Map<String, dynamic> note) async {
    final files = (note['files'] as List?) ?? const [];
    for (final item in files) {
      if (item is! Map || item['_local'] != true) continue;
      final path = item['path']?.toString();
      if (path == null || path.isEmpty) continue;
      await ApiService.uploadFile('/files/upload', path,
          noteId: noteId.toString());
    }
  }

  static Future<bool> hasLocalChanges(
      dynamic noteId, String? cloudUpdatedAt) async {
    final local = await getNote(noteId);
    if (local == null || local['_dirty'] != true) return false;
    if (cloudUpdatedAt == null) return true;
    final localTime = DateTime.tryParse(local['local_updated_at'] ?? '');
    final cloudTime = DateTime.tryParse(cloudUpdatedAt);
    if (localTime == null || cloudTime == null) return false;
    return localTime.isAfter(cloudTime);
  }

  static Future<Map<String, dynamic>> _read() async {
    final prefs = await SharedPreferences.getInstance();
    final notesJson = prefs.getString(_key) ?? '{}';
    try {
      return Map<String, dynamic>.from(jsonDecode(notesJson));
    } catch (error, stackTrace) {
      AppErrorHandler.report(error, stackTrace, source: 'Local note storage');
      return <String, dynamic>{};
    }
  }
  // ... hasLocalChanges, _read ...

  static Future<void> clearCloudNotes() async {
    final prefs = await SharedPreferences.getInstance();
    final notes = await _read();

    notes.removeWhere((key, value) {
      final note = Map<String, dynamic>.from(value);
      // Keep if flagged as local origin
      if (note['_local_origin'] == true) return false;
      // Keep if still has a local (negative) ID
      if (isLocalId(note['id'])) return false;
      // Keep if dirty (unsynced changes)
      if (note['_dirty'] == true) return false;
      // Remove everything else (cloud notes)
      return true;
    });

    await prefs.setString(_key, jsonEncode(notes));
  }
} // ← class closes here
