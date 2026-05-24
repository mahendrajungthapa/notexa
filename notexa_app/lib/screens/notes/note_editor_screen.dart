import 'dart:async';
import 'dart:convert';
import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../services/api_service.dart';
import '../../services/error_handler.dart';
import '../../services/local_storage.dart';
import '../files/pdf_viewer_screen.dart';

class NoteEditorScreen extends StatefulWidget {
  final int noteId;
  const NoteEditorScreen({super.key, required this.noteId});

  @override
  State<NoteEditorScreen> createState() => _NoteEditorScreenState();
}

class _NoteEditorScreenState extends State<NoteEditorScreen> {
  static const _palette = [
  '#fff7d6', // yellow
  '#ffffff', // white
  '#dbeafe', // blue
  '#dcfce7', // green
  '#fde2e2', // red
  '#f3e8ff', // purple
  '#ffedd5', // orange
  '#fce7f3', // pink
  '#e0f2fe', // sky
  '#f0fdf4', // mint
  '#fef9c3', // light yellow
  '#f1f5f9', // slate
  '#ffd700', // gold
  '#ffe4b5', // moccasin
  '#e6e6fa', // lavender
  '#f0fff0', // honeydew
  '#fff0f5', // lavender blush
  '#f5fffa', // mint cream
  '#fffacd', // lemon chiffon
  '#e0ffff', // light cyan
  '#ffe4e1', // misty rose
  '#f5f5dc', // beige
  '#faebd7', // antique white
  '#e8f5e9', // light green
  '#e3f2fd', // light blue
  '#fce4ec', // light pink
  '#ede7f6', // light purple
  '#fff3e0', // light orange
  '#e0f7fa', // light teal
  '#f3e5f5', // light violet
];

  final _titleC = TextEditingController();
  final _contentC = TextEditingController();
  final _contentFocus = FocusNode();
  Timer? _draftTimer;

  dynamic _activeNoteId;
  Map<String, dynamic>? _note;
  String _perm = 'owner';
  String _color = '#fff7d6';
  bool _loading = true;
  bool _saving = false;
  bool _offline = false;
  bool _localDirty = false;
  bool _aiLoading = false;
  String? _aiSummary;
  String? _shareCode;
  List<dynamic> _files = [];
  List<dynamic> _collabs = [];

  @override
  void initState() {
    super.initState();
    _activeNoteId = widget.noteId;
    _fetch();
  }

  @override
  void dispose() {
    _draftTimer?.cancel();
    _titleC.dispose();
    _contentC.dispose();
    _contentFocus.dispose();
    super.dispose();
  }

  int? get _serverNoteId {
    final id = _activeNoteId is int
        ? _activeNoteId
        : int.tryParse(_activeNoteId?.toString() ?? '');
    return id != null && id > 0 ? id : null;
  }

  bool get _canEdit => _perm == 'owner' || _perm == 'edit';
  bool get _isOwner => _perm == 'owner';

  Future<void> _fetch() async {
    setState(() => _loading = true);

    if (_serverNoteId == null) {
      await _loadLocalNote(showOffline: true);
      return;
    }

    try {
      final response = await ApiService.get('/notes/$_serverNoteId');
      _applyNote(Map<String, dynamic>.from(response['data']),
          response['permission'] ?? 'owner');
      await LocalNoteStorage.saveNote(_activeNoteId, _note!);
      await _fetchCollaborators();
    } catch (error, stackTrace) {
      await _loadLocalNote(showOffline: true);
      if (mounted) {
        AppErrorHandler.show(
          error,
          context: context,
          stackTrace: stackTrace,
          fallback:
              'Could not load cloud note. Showing local copy. ${AppErrorHandler.messageFor(error)}',
        );
      }
      return;
    }

    if (mounted) {
      setState(() {
        _loading = false;
        _offline = false;
        _localDirty = false;
      });
    }
  }

  Future<void> _loadLocalNote({bool showOffline = false}) async {
    final local = await LocalNoteStorage.getNote(_activeNoteId);
    if (local == null) {
      if (mounted) Navigator.pop(context);
      return;
    }

    _applyNote(local, 'owner');
    if (mounted) {
      setState(() {
        _loading = false;
        _offline = showOffline;
        _localDirty =
            local['_dirty'] == true || LocalNoteStorage.isLocalId(local['id']);
      });
    }
  }

  void _applyNote(Map<String, dynamic> note, String permission) {
    _note = note;
    _activeNoteId = note['id'] ?? _activeNoteId;
    _perm = permission;
    _titleC.text = note['title'] ?? '';
    _contentC.text = LocalNoteStorage.htmlToPlain(note['content']);
    _color = note['color'] ?? '#fff7d6';
    _aiSummary = note['ai_summary'];
    _shareCode = note['share_code'];
    _files = List<dynamic>.from(note['files'] ?? []);
  }

  Future<void> _fetchCollaborators() async {
    if (_serverNoteId == null) return;
    try {
      final response =
          await ApiService.get('/notes/$_serverNoteId/collaborators');
      _collabs = response['data'] ?? [];
    } catch (error, stackTrace) {
      AppErrorHandler.report(error, stackTrace, source: 'Fetch collaborators');
    }
  }

  String _toHtml(String text) {
    final escape = const HtmlEscape().convert;
    final buffer = StringBuffer();
    var inUl = false;
    var inOl = false;

    void closeLists() {
      if (inUl) {
        buffer.write('</ul>');
        inUl = false;
      }
      if (inOl) {
        buffer.write('</ol>');
        inOl = false;
      }
    }

    for (final rawLine in text.split('\n')) {
      final line = rawLine.trimRight();
      final trimmed = line.trimLeft();
      if (trimmed.isEmpty) {
        closeLists();
        buffer.write('<p></p>');
      } else if (trimmed.startsWith('### ')) {
        closeLists();
        buffer.write('<h3>${escape(trimmed.substring(4))}</h3>');
      } else if (trimmed.startsWith('## ')) {
        closeLists();
        buffer.write('<h2>${escape(trimmed.substring(3))}</h2>');
      } else if (trimmed.startsWith('# ')) {
        closeLists();
        buffer.write('<h1>${escape(trimmed.substring(2))}</h1>');
      } else if (trimmed.startsWith('- ')) {
        if (!inUl) {
          closeLists();
          buffer.write('<ul>');
          inUl = true;
        }
        buffer.write('<li>${escape(trimmed.substring(2))}</li>');
      } else if (RegExp(r'^\d+[\.)]\s+').hasMatch(trimmed)) {
        if (!inOl) {
          closeLists();
          buffer.write('<ol>');
          inOl = true;
        }
        buffer.write(
            '<li>${escape(trimmed.replaceFirst(RegExp(r'^\d+[\.)]\s+'), ''))}</li>');
      } else if (trimmed.startsWith('> ')) {
        closeLists();
        buffer
            .write('<blockquote>${escape(trimmed.substring(2))}</blockquote>');
      } else {
        closeLists();
        buffer.write('<p>${escape(line)}</p>');
      }
    }

    closeLists();
    return buffer.toString();
  }

  Map<String, dynamic> _currentNoteData() {
    final content = _toHtml(_contentC.text);
    return {
      ...?_note,
      'id': _activeNoteId,
      'title':
          _titleC.text.trim().isEmpty ? 'Untitled Note' : _titleC.text.trim(),
      'content': content,
      'plain_text': _contentC.text.trim(),
      'color': _color,
      'is_pinned': _note?['is_pinned'] == true,
      'files': _files,
      'updated_at': DateTime.now().toIso8601String(),
    };
  }

  void _markDirty() {
    if (!_canEdit) return;
    if (!_localDirty) setState(() => _localDirty = true);
    _draftTimer?.cancel();
    _draftTimer = Timer(const Duration(milliseconds: 700), () async {
      await LocalNoteStorage.saveNote(
        _activeNoteId,
        _currentNoteData(),
        dirty: true,
        syncAction:
            LocalNoteStorage.isLocalId(_activeNoteId) ? 'create' : 'update',
      );
    });
  }

  Future<void> _save({bool silent = false}) async {
    if (!_canEdit) return;
    _draftTimer?.cancel();
    setState(() => _saving = true);

    final data = _currentNoteData();
    final localFiles = _localAttachments();
    final body = {
      'title': data['title'],
      'content': data['content'],
      'color': data['color'],
      'is_pinned': data['is_pinned'] == true,
    };

    try {
      if (!await ApiService.hasToken()) {
        await LocalNoteStorage.saveNote(
          _activeNoteId,
          data,
          dirty: true,
          syncAction:
              LocalNoteStorage.isLocalId(_activeNoteId) ? 'create' : 'update',
        );
        if (mounted) {
          setState(() {
            _offline = true;
            _localDirty = true;
          });
          if (!silent) {
            _message('Saved locally on this device.', const Color(0xFF047857));
          }
        }
        return;
      }

      Map<String, dynamic> cloudNote;
      if (_serverNoteId == null) {
        final response = await ApiService.post('/notes', body: body);
        cloudNote = Map<String, dynamic>.from(response['data']);
        await LocalNoteStorage.replaceNoteId(_activeNoteId, cloudNote);
      } else {
        final response =
            await ApiService.put('/notes/$_serverNoteId', body: body);
        cloudNote = Map<String, dynamic>.from(response['data']);
        await LocalNoteStorage.saveNote(_serverNoteId, cloudNote);
      }

      if (localFiles.isNotEmpty) {
        await _uploadLocalAttachments(cloudNote['id'], localFiles);
        final refreshed = await ApiService.get('/notes/${cloudNote['id']}');
        cloudNote = Map<String, dynamic>.from(refreshed['data']);
        await LocalNoteStorage.saveNote(cloudNote['id'], cloudNote);
      }

      _applyNote(cloudNote, _perm);
      if (mounted) {
        setState(() {
          _offline = false;
          _localDirty = false;
        });
        if (!silent) {
          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
            content: Text('Saved'),
            backgroundColor: Color(0xFF047857),
            duration: Duration(seconds: 1),
          ));
        }
      }
    } catch (error, stackTrace) {
      AppErrorHandler.report(error, stackTrace, source: 'Save note');
      await LocalNoteStorage.saveNote(
        _activeNoteId,
        data,
        dirty: true,
        syncAction:
            LocalNoteStorage.isLocalId(_activeNoteId) ? 'create' : 'update',
      );
      if (mounted) {
        setState(() {
          _offline = true;
          _localDirty = true;
        });
        if (!silent) {
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(
            content:
                Text('Saved locally. ${AppErrorHandler.messageFor(error)}'),
            backgroundColor: const Color(0xFFB45309),
          ));
        }
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _setColor(String color) async {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) setState(() => _color = color);
    });
    _markDirty();
  }

  Future<void> _togglePin() async {
    _note = {
      ...?_note,
      'is_pinned': _note?['is_pinned'] != true,
    };
    setState(() {});
    _markDirty();
  }

  void _insertPrefix(String prefix) {
    final text = _contentC.text;
    final selection = _contentC.selection;
    final cursor = selection.start < 0 ? text.length : selection.start;
    final beforeCursor = text.substring(0, cursor);
    final lineStart = beforeCursor.lastIndexOf('\n') + 1;
    final updated = text.replaceRange(lineStart, lineStart, prefix);
    _contentC.value = TextEditingValue(
      text: updated,
      selection: TextSelection.collapsed(offset: cursor + prefix.length),
    );
    _contentFocus.requestFocus();
    _markDirty();
  }

  Future<void> _aiSummarize() async {
    if (_serverNoteId == null || _localDirty) await _save(silent: true);
    if (_serverNoteId == null) {
      _message('Sync the note before using AI summary.', Colors.orange);
      return;
    }

    setState(() => _aiLoading = true);
    try {
      final response =
          await ApiService.post('/notes/$_serverNoteId/ai-summary');
      setState(() => _aiSummary = response['summary']);
    } catch (error, stackTrace) {
      if (mounted)
        AppErrorHandler.show(error, context: context, stackTrace: stackTrace);
    } finally {
      if (mounted) setState(() => _aiLoading = false);
    }
  }

  Future<void> _attachFile() async {
    final result = await FilePicker.platform.pickFiles(
      type: FileType.custom,
      allowedExtensions: ['pdf', 'doc', 'docx', 'png', 'jpg', 'jpeg', 'txt'],
    );
    if (result == null || result.files.single.path == null) return;

    final file = result.files.single;
    if (!await ApiService.hasToken()) {
      await _addLocalAttachment(file);
      _message('Attached locally. Sign in to sync and share files.',
          const Color(0xFF047857));
      return;
    }

    if (_serverNoteId == null || _localDirty) await _save(silent: true);
    if (_serverNoteId == null) {
      await _addLocalAttachment(file);
      _message(
          'Attached locally. It will upload after cloud sync.', Colors.orange);
      return;
    }

    try {
      await ApiService.uploadFile('/files/upload', file.path!,
          noteId: _serverNoteId.toString());
      _message('File attached', const Color(0xFF047857));
      await _fetch();
    } catch (error, stackTrace) {
      AppErrorHandler.report(error, stackTrace, source: 'Attach file');
      await _addLocalAttachment(file);
      _message(
          'Saved locally. Cloud upload failed: ${AppErrorHandler.messageFor(error)}',
          Colors.orange);
    }
  }

  Future<void> _openAttachment(dynamic file) async {
    final item = Map<String, dynamic>.from(file);
    final isPdf = _isPdf(item);

    if (item['_local'] == true) {
      final path = item['path']?.toString();
      if (path == null) return;
      if (isPdf && mounted) {
        await Navigator.push(
          context,
          MaterialPageRoute(
            builder: (_) => PdfViewerScreen(
                title: item['original_name'] ?? 'PDF', filePath: path),
          ),
        );
        return;
      }
      await launchUrl(Uri.file(path), mode: LaunchMode.externalApplication);
      return;
    }

    try {
      final response = await ApiService.get('/files/${item['id']}/download');
      final url = response['download_url']?.toString();
      if (url == null) return;
      if (isPdf && mounted) {
        await Navigator.push(
          context,
          MaterialPageRoute(
            builder: (_) => PdfViewerScreen(
                title: item['original_name'] ?? 'PDF', url: url),
          ),
        );
        return;
      }
      final uri = Uri.parse(url);
      if (await canLaunchUrl(uri)) {
        await launchUrl(uri, mode: LaunchMode.externalApplication);
      }
    } catch (error, stackTrace) {
      if (mounted)
        AppErrorHandler.show(error,
            context: context,
            stackTrace: stackTrace,
            fallback:
                'Unable to open file. ${AppErrorHandler.messageFor(error)}');
    }
  }

  Future<void> _addLocalAttachment(PlatformFile file) async {
    final localFile = {
      'id': 'local-${DateTime.now().microsecondsSinceEpoch}',
      'original_name': file.name,
      'mime_type': _mimeFromName(file.name),
      'size': file.size,
      'path': file.path,
      '_local': true,
    };
    setState(() {
      _files = [..._files, localFile];
      _localDirty = true;
      _offline = true;
    });
    await LocalNoteStorage.saveNote(
      _activeNoteId,
      _currentNoteData(),
      dirty: true,
      syncAction:
          LocalNoteStorage.isLocalId(_activeNoteId) ? 'create' : 'update',
    );
  }

  List<Map<String, dynamic>> _localAttachments() {
    return _files
        .where((file) =>
            file is Map && file['_local'] == true && file['path'] != null)
        .map((file) => Map<String, dynamic>.from(file))
        .toList();
  }

  Future<void> _uploadLocalAttachments(
      dynamic noteId, List<Map<String, dynamic>> files) async {
    for (final file in files) {
      final path = file['path']?.toString();
      if (path != null && path.isNotEmpty) {
        await ApiService.uploadFile('/files/upload', path,
            noteId: noteId.toString());
      }
    }
  }

  bool _isPdf(Map<String, dynamic> file) {
    final name = (file['original_name'] ?? '').toString().toLowerCase();
    final mime = (file['mime_type'] ?? '').toString().toLowerCase();
    return mime.contains('pdf') || name.endsWith('.pdf');
  }

  String _mimeFromName(String name) {
    final lower = name.toLowerCase();
    if (lower.endsWith('.pdf')) return 'application/pdf';
    if (lower.endsWith('.png')) return 'image/png';
    if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
    if (lower.endsWith('.txt')) return 'text/plain';
    if (lower.endsWith('.doc')) return 'application/msword';
    if (lower.endsWith('.docx'))
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    return 'application/octet-stream';
  }

  Future<void> _showShareSheet() async {
    if (!_isOwner) return;
    if (_serverNoteId == null || _localDirty) await _save(silent: true);
    if (_serverNoteId == null) {
      _message('Sync the note before sharing.', Colors.orange);
      return;
    }

    List<dynamic> friends = [];
    try {
      final results = await Future.wait([
        ApiService.get('/notes/$_serverNoteId/share-code'),
        ApiService.get('/friends'),
        ApiService.get('/notes/$_serverNoteId/collaborators'),
      ]);
      _shareCode = results[0]['share_code'];
      friends = results[1]['data'] ?? [];
      _collabs = results[2]['data'] ?? [];
    } catch (error, stackTrace) {
      if (mounted)
        AppErrorHandler.show(error,
            context: context,
            stackTrace: stackTrace,
            fallback:
                'Sharing needs an internet connection. ${AppErrorHandler.messageFor(error)}');
      return;
    }

    if (!mounted) return;
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(18))),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setSheet) {
          final availableFriends = friends
              .where((friend) =>
                  !_collabs.any((c) => c['shared_with'] == friend['id']))
              .toList();
          return Padding(
            padding: EdgeInsets.fromLTRB(
                20, 18, 20, MediaQuery.of(ctx).viewInsets.bottom + 20),
            child: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const Expanded(
                          child: Text('Share note',
                              style: TextStyle(
                                  fontSize: 20, fontWeight: FontWeight.w800))),
                      IconButton(
                          onPressed: () => Navigator.pop(ctx),
                          icon: const Icon(Icons.close)),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF8FAFC),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: const Color(0xFFE2E8F0)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            const Text('Share code',
                                style: TextStyle(fontWeight: FontWeight.w800)),
                            const Spacer(),
                            TextButton.icon(
                              onPressed: () async {
                                try {
                                  final response = await ApiService.post(
                                      '/notes/$_serverNoteId/regenerate-code');
                                  setSheet(() =>
                                      _shareCode = response['share_code']);
                                } catch (error, stackTrace) {
                                  if (mounted)
                                    AppErrorHandler.show(error,
                                        context: context,
                                        stackTrace: stackTrace);
                                }
                              },
                              icon: const Icon(Icons.refresh, size: 16),
                              label: const Text('New'),
                            ),
                          ],
                        ),
                        Row(
                          children: [
                            Expanded(
                              child: Container(
                                padding:
                                    const EdgeInsets.symmetric(vertical: 12),
                                decoration: BoxDecoration(
                                    color: Colors.white,
                                    borderRadius: BorderRadius.circular(8)),
                                child: Text(
                                  _shareCode ?? '--------',
                                  textAlign: TextAlign.center,
                                  style: const TextStyle(
                                      fontSize: 24,
                                      fontWeight: FontWeight.w900,
                                      letterSpacing: 5,
                                      fontFamily: 'monospace'),
                                ),
                              ),
                            ),
                            const SizedBox(width: 10),
                            IconButton.filled(
                              onPressed: () {
                                Clipboard.setData(
                                    ClipboardData(text: _shareCode ?? ''));
                                _message(
                                    'Code copied', const Color(0xFF047857));
                              },
                              icon: const Icon(Icons.copy),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Text(
                            'Codes add the note as view-only. Give edit access from the friends list below.',
                            style: TextStyle(
                                fontSize: 12, color: Colors.grey.shade600)),
                      ],
                    ),
                  ),
                  const SizedBox(height: 18),
                  const Text('Friends',
                      style: TextStyle(fontWeight: FontWeight.w800)),
                  const SizedBox(height: 8),
                  if (availableFriends.isEmpty)
                    Padding(
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      child: Text('No available friends to share with.',
                          style: TextStyle(color: Colors.grey.shade500)),
                    )
                  else
                    ...availableFriends.map((friend) => ListTile(
                          contentPadding: EdgeInsets.zero,
                          leading: CircleAvatar(
                              child: Text(_initial(friend['name']))),
                          title: Text(friend['name'] ?? '',
                              style:
                                  const TextStyle(fontWeight: FontWeight.w700)),
                          subtitle: Text('@${friend['username']}'),
                          trailing: Wrap(
                            spacing: 4,
                            children: [
                              TextButton(
                                onPressed: () async {
                                  await _shareWithFriend(
                                      friend, 'view', setSheet);
                                },
                                child: const Text('View'),
                              ),
                              TextButton(
                                onPressed: () async {
                                  await _shareWithFriend(
                                      friend, 'edit', setSheet);
                                },
                                child: const Text('Edit'),
                              ),
                            ],
                          ),
                        )),
                  const SizedBox(height: 14),
                  if (_collabs.isNotEmpty) ...[
                    Text('Collaborators (${_collabs.length})',
                        style: const TextStyle(fontWeight: FontWeight.w800)),
                    const SizedBox(height: 8),
                    ..._collabs.map((c) => ListTile(
                          contentPadding: EdgeInsets.zero,
                          leading: CircleAvatar(
                              child: Text(_initial(c['recipient']?['name']))),
                          title: Text(c['recipient']?['name'] ?? '',
                              style:
                                  const TextStyle(fontWeight: FontWeight.w700)),
                          subtitle:
                              Text('@${c['recipient']?['username'] ?? ''}'),
                          trailing: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              DropdownButton<String>(
                                value:
                                    c['permission'] == 'edit' ? 'edit' : 'view',
                                underline: const SizedBox(),
                                items: const [
                                  DropdownMenuItem(
                                      value: 'view', child: Text('View')),
                                  DropdownMenuItem(
                                      value: 'edit', child: Text('Edit')),
                                ],
                                onChanged: (value) async {
                                  if (value == null) return;
                                  try {
                                    await ApiService.put(
                                        '/notes/$_serverNoteId/share/${c['shared_with']}',
                                        body: {'permission': value});
                                    setSheet(() => c['permission'] = value);
                                  } catch (error, stackTrace) {
                                    if (mounted)
                                      AppErrorHandler.show(error,
                                          context: context,
                                          stackTrace: stackTrace);
                                  }
                                },
                              ),
                              IconButton(
                                onPressed: () async {
                                  try {
                                    await ApiService.delete(
                                        '/notes/$_serverNoteId/share/${c['shared_with']}');
                                    setSheet(() => _collabs.removeWhere((x) =>
                                        x['shared_with'] == c['shared_with']));
                                  } catch (error, stackTrace) {
                                    if (mounted)
                                      AppErrorHandler.show(error,
                                          context: context,
                                          stackTrace: stackTrace);
                                  }
                                },
                                icon: const Icon(Icons.close, size: 18),
                              ),
                            ],
                          ),
                        )),
                  ],
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  Future<void> _shareWithFriend(
      dynamic friend, String permission, StateSetter setSheet) async {
    try {
      final response =
          await ApiService.post('/notes/$_serverNoteId/share', body: {
        'user_id': friend['id'],
        'permission': permission,
      });
      setSheet(() => _collabs.add(response['data']));
      _message('Shared with @${friend['username']}', const Color(0xFF047857));
    } catch (error, stackTrace) {
      if (mounted)
        AppErrorHandler.show(error, context: context, stackTrace: stackTrace);
    }
  }

  void _message(String text, Color color) {
    if (!mounted) return;
    ScaffoldMessenger.of(context)
        .showSnackBar(SnackBar(content: Text(text), backgroundColor: color));
  }

  String _initial(dynamic value) {
    final text = (value ?? '?').toString().trim();
    return text.isEmpty ? '?' : text.substring(0, 1).toUpperCase();
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    return Scaffold(
      backgroundColor: _colorValue(_color),
      appBar: AppBar(
        backgroundColor: _colorValue(_color),
        title: Text(_localDirty ? 'Unsynced changes' : 'Note'),
        actions: [
          if (_canEdit)
            IconButton(
                icon: const Icon(Icons.push_pin_outlined),
                onPressed: _togglePin,
                tooltip: 'Pin'),
          if (_canEdit)
            IconButton(
                icon: const Icon(Icons.attach_file),
                onPressed: _attachFile,
                tooltip: 'Attach file'),
          IconButton(
            icon: _aiLoading
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2))
                : const Icon(Icons.auto_awesome_outlined),
            onPressed: _aiLoading ? null : _aiSummarize,
            tooltip: 'AI summary',
          ),
          if (_isOwner)
            IconButton(
                icon: const Icon(Icons.ios_share),
                onPressed: _showShareSheet,
                tooltip: 'Share'),
          if (_canEdit)
            IconButton(
              icon: _saving
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(strokeWidth: 2))
                  : const Icon(Icons.check),
              onPressed: _saving ? null : () => _save(),
              tooltip: 'Save',
            ),
          const SizedBox(width: 6),
        ],
      ),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(18, 8, 18, 30),
          children: [
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                _statusChip(
                    _perm == 'owner'
                        ? 'Owner'
                        : _perm == 'edit'
                            ? 'Can edit'
                            : 'View only',
                    Icons.lock_open),
                if (_offline)
                  _statusChip('Offline', Icons.cloud_off, warning: true),
                if (_localDirty)
                  _statusChip('Saved locally', Icons.cloud_upload_outlined,
                      warning: true),
              ],
            ),
            const SizedBox(height: 14),
            if (_canEdit)
              Row(
                children: [
                  Expanded(
                    child: SingleChildScrollView(
                      scrollDirection: Axis.horizontal,
                      child: Row(
                        children: _palette
                            .map((color) => Padding(
                                  padding: const EdgeInsets.only(right: 8),
                                  child: InkWell(
                                    borderRadius: BorderRadius.circular(16),
                                    onTap: () => _setColor(color),
                                    child: Container(
                                      width: 28,
                                      height: 28,
                                      decoration: BoxDecoration(
                                        color: _colorValue(color),
                                        shape: BoxShape.circle,
                                        border: Border.all(
                                          color: _color == color
                                              ? const Color(0xFF111827)
                                              : const Color(0xFFE5E7EB),
                                          width: _color == color ? 2 : 1,
                                        ),
                                      ),
                                    ),
                                  ),
                                ))
                            .toList(),
                      ),
                    ),
                  ),
                  Icon(
                    _note?['is_pinned'] == true
                        ? Icons.push_pin
                        : Icons.push_pin_outlined,
                    size: 18,
                    color: const Color(0xFF92400E),
                  ),
                ],
              ),
            const SizedBox(height: 12),
            TextField(
              controller: _titleC,
              readOnly: !_canEdit,
              textCapitalization: TextCapitalization.sentences,
              style: const TextStyle(
                  fontSize: 30, fontWeight: FontWeight.w900, height: 1.1),
              decoration: const InputDecoration(
                hintText: 'Title',
                border: InputBorder.none,
                enabledBorder: InputBorder.none,
                focusedBorder: InputBorder.none,
                fillColor: Colors.transparent,
                contentPadding: EdgeInsets.zero,
              ),
              maxLines: null,
              onChanged: (_) => _markDirty(),
            ),
            const SizedBox(height: 10),
            if (_aiSummary != null && _aiSummary!.trim().isNotEmpty)
              _summaryCard(),
            if (_files.isNotEmpty) _filesCard(),
            if (_canEdit) _writingToolbar(),
            TextField(
              controller: _contentC,
              focusNode: _contentFocus,
              readOnly: !_canEdit,
              keyboardType: TextInputType.multiline,
              textCapitalization: TextCapitalization.sentences,
              style: const TextStyle(
                  fontSize: 16, height: 1.75, color: Color(0xFF111827)),
              decoration: const InputDecoration(
                hintText: 'Start writing',
                border: InputBorder.none,
                enabledBorder: InputBorder.none,
                focusedBorder: InputBorder.none,
                fillColor: Colors.transparent,
                contentPadding: EdgeInsets.only(top: 12),
              ),
              minLines: 18,
              maxLines: null,
              onChanged: (_) => _markDirty(),
            ),
          ],
        ),
      ),
    );
  }

  Widget _writingToolbar() {
    return Container(
      margin: const EdgeInsets.only(top: 6, bottom: 8),
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 4),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.68),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Colors.black.withOpacity(0.06)),
      ),
      child: Row(
        children: [
          _toolButton(Icons.title, 'Heading', () => _insertPrefix('# ')),
          _toolButton(
              Icons.format_list_bulleted, 'Bullets', () => _insertPrefix('- ')),
          _toolButton(Icons.format_list_numbered, 'Numbers',
              () => _insertPrefix('1. ')),
          _toolButton(
              Icons.check_box_outlined, 'Task', () => _insertPrefix('- [ ] ')),
          _toolButton(Icons.format_quote, 'Quote', () => _insertPrefix('> ')),
        ],
      ),
    );
  }

  Widget _toolButton(IconData icon, String tooltip, VoidCallback onTap) {
    return IconButton(
      tooltip: tooltip,
      visualDensity: VisualDensity.compact,
      onPressed: onTap,
      icon: Icon(icon, size: 20),
    );
  }

  Widget _statusChip(String label, IconData icon, {bool warning = false}) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color:
            warning ? const Color(0xFFFFFBEB) : Colors.white.withOpacity(0.7),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(
            color: warning ? const Color(0xFFFDE68A) : const Color(0xFFE5E7EB)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon,
              size: 14,
              color:
                  warning ? const Color(0xFFB45309) : const Color(0xFF374151)),
          const SizedBox(width: 6),
          Text(label,
              style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                  color: warning
                      ? const Color(0xFF92400E)
                      : const Color(0xFF374151))),
        ],
      ),
    );
  }

  Widget _summaryCard() {
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFFFFFBEB),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: const Color(0xFFFDE68A)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(children: [
            Icon(Icons.auto_awesome, size: 15, color: Color(0xFFB45309)),
            SizedBox(width: 6),
            Text('AI summary',
                style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w800,
                    color: Color(0xFF92400E))),
          ]),
          const SizedBox(height: 6),
          Text(_aiSummary!,
              style: const TextStyle(
                  fontSize: 13, color: Color(0xFF78350F), height: 1.45)),
        ],
      ),
    );
  }

  Widget _filesCard() {
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.72),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: const Color(0xFFE5E7EB)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Files (${_files.length})',
              style:
                  const TextStyle(fontSize: 12, fontWeight: FontWeight.w800)),
          const SizedBox(height: 8),
          ..._files.map((file) => ListTile(
                dense: true,
                contentPadding: EdgeInsets.zero,
                leading: Icon(
                    file['mime_type']?.toString().contains('pdf') == true
                        ? Icons.picture_as_pdf
                        : Icons.insert_drive_file),
                title: Text(file['original_name'] ?? '',
                    maxLines: 1, overflow: TextOverflow.ellipsis),
                trailing: IconButton(
                  icon: Icon(_isPdf(Map<String, dynamic>.from(file))
                      ? Icons.visibility_outlined
                      : Icons.open_in_new),
                  onPressed: () => _openAttachment(file),
                ),
              )),
        ],
      ),
    );
  }

  Color _colorValue(String? hex) {
    if (hex == null || hex.length != 7) return const Color(0xFFFFF7D6);
    try {
      return Color(int.parse(hex.replaceFirst('#', '0xFF')));
    } catch (error, stackTrace) {
      AppErrorHandler.report(error, stackTrace, source: 'Parse editor color');
      return const Color(0xFFFFF7D6);
    }
  }
}
