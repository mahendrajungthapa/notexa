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
  static const _palette = ['#fff7d6', '#ffffff', '#dbeafe', '#dcfce7', '#fde2e2', '#f3e8ff'];

  final _titleC = TextEditingController();
  final _contentC = TextEditingController();
  final _aiPromptC = TextEditingController();
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
  String? _aiResultTitle;
  String? _aiResult;
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
    _aiPromptC.dispose();
    _contentFocus.dispose();
    super.dispose();
  }

  int? get _serverNoteId {
    final id = _activeNoteId is int ? _activeNoteId : int.tryParse(_activeNoteId?.toString() ?? '');
    return id != null && id > 0 ? id : null;
  }

  bool get _canEdit => _perm == 'owner' || _perm == 'edit';
  bool get _isOwner => _perm == 'owner';
  int get _wordCount => RegExp(r'\b[\w-]+\b').allMatches(_contentC.text.trim()).length;
  int get _readingMinutes {
    final minutes = (_wordCount / 220).ceil();
    return minutes < 1 ? 1 : minutes;
  }

  Future<void> _fetch() async {
    setState(() => _loading = true);

    if (_serverNoteId == null) {
      await _loadLocalNote(showOffline: true);
      return;
    }

    try {
      final response = await ApiService.get('/notes/$_serverNoteId');
      _applyNote(Map<String, dynamic>.from(response['data']), response['permission'] ?? 'owner');
      await LocalNoteStorage.saveNote(_activeNoteId, _note!);
      await _fetchCollaborators();
    } catch (error, stackTrace) {
      await _loadLocalNote(showOffline: true);
      if (mounted) {
        AppErrorHandler.show(
          error,
          context: context,
          stackTrace: stackTrace,
          fallback: 'Could not load cloud note. Showing local copy. ${AppErrorHandler.messageFor(error)}',
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
        _localDirty = local['_dirty'] == true || LocalNoteStorage.isLocalId(local['id']);
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
      final response = await ApiService.get('/notes/$_serverNoteId/collaborators');
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
        buffer.write('<li>${escape(trimmed.replaceFirst(RegExp(r'^\d+[\.)]\s+'), ''))}</li>');
      } else if (trimmed.startsWith('> ')) {
        closeLists();
        buffer.write('<blockquote>${escape(trimmed.substring(2))}</blockquote>');
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
      'title': _titleC.text.trim().isEmpty ? 'Untitled Note' : _titleC.text.trim(),
      'content': content,
      'plain_text': _contentC.text.trim(),
      'color': _color,
      'is_pinned': _note?['is_pinned'] == true,
      'is_archived': _note?['is_archived'] == true,
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
        syncAction: LocalNoteStorage.isLocalId(_activeNoteId) ? 'create' : 'update',
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
      'is_archived': data['is_archived'] == true,
    };

    try {
      if (!await ApiService.hasToken()) {
        await LocalNoteStorage.saveNote(
          _activeNoteId,
          data,
          dirty: true,
          syncAction: LocalNoteStorage.isLocalId(_activeNoteId) ? 'create' : 'update',
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
        final response = await ApiService.put('/notes/$_serverNoteId', body: body);
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
        syncAction: LocalNoteStorage.isLocalId(_activeNoteId) ? 'create' : 'update',
      );
      if (mounted) {
        setState(() {
          _offline = true;
          _localDirty = true;
        });
        if (!silent) {
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(
            content: Text('Saved locally. ${AppErrorHandler.messageFor(error)}'),
            backgroundColor: Color(0xFFB45309),
          ));
        }
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _setColor(String color) async {
    setState(() => _color = color);
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

  void _insertInline(String left, String right) {
    final text = _contentC.text;
    final selection = _contentC.selection;
    final start = selection.start < 0 ? text.length : selection.start;
    final end = selection.end < 0 ? start : selection.end;
    final selected = text.substring(start, end);
    final updated = text.replaceRange(start, end, '$left$selected$right');
    _contentC.value = TextEditingValue(
      text: updated,
      selection: TextSelection.collapsed(offset: end + left.length + right.length),
    );
    _contentFocus.requestFocus();
    _markDirty();
  }

  void _insertDivider() {
    final text = _contentC.text;
    final selection = _contentC.selection;
    final cursor = selection.start < 0 ? text.length : selection.start;
    final divider = text.isEmpty || text.endsWith('\n') ? '---\n' : '\n---\n';
    _contentC.value = TextEditingValue(
      text: text.replaceRange(cursor, cursor, divider),
      selection: TextSelection.collapsed(offset: cursor + divider.length),
    );
    _contentFocus.requestFocus();
    _markDirty();
  }

  String _noteContextForAi() {
    final title = _titleC.text.trim().isEmpty ? 'Untitled Note' : _titleC.text.trim();
    final body = _contentC.text.trim().isEmpty ? 'No body text yet.' : _contentC.text.trim();
    return 'NOTE TITLE:\n$title\n\nNOTE BODY:\n$body';
  }

  Future<bool> _ensureCloudNoteForAi() async {
    if (!await ApiService.hasToken()) {
      _message('Sign in to use the AI workspace.', Colors.orange);
      return false;
    }

    if (_serverNoteId == null || _localDirty) {
      await _save(silent: true);
    }

    if (_serverNoteId == null || _offline) {
      _message('AI needs this note synced to the local backend first.', Colors.orange);
      return false;
    }

    return true;
  }

  String _extractAiText(Map<String, dynamic> response) {
    final data = response['data'];
    if (data is Map) {
      final result = data['result'] ?? data['text'] ?? data['summary'] ?? data['content'];
      if (result != null) return result.toString();
    }
    if (data is String) return data;
    final result = response['result'] ?? response['text'] ?? response['summary'] ?? response['content'];
    return result?.toString() ?? '';
  }

  Future<String?> _runAiQuery({
    required String title,
    required String systemPrompt,
    required String userPrompt,
    bool showResult = true,
  }) async {
    if (!await _ensureCloudNoteForAi()) return null;

    setState(() => _aiLoading = true);
    try {
      final response = await ApiService.post('/notes/$_serverNoteId/ai-query', body: {
        'systemPrompt': systemPrompt,
        'userPrompt': userPrompt,
      });
      final result = _extractAiText(response).trim();
      if (result.isEmpty) throw ApiException(statusCode: 0, message: 'AI returned an empty response.');

      if (!mounted) return result;
      setState(() {
        _aiResultTitle = title;
        _aiResult = result;
      });
      if (showResult) _showAiResultSheet(title, result);
      return result;
    } catch (error, stackTrace) {
      if (mounted) AppErrorHandler.show(error, context: context, stackTrace: stackTrace, fallback: 'AI service unavailable. ${AppErrorHandler.messageFor(error)}');
      return null;
    } finally {
      if (mounted) setState(() => _aiLoading = false);
    }
  }

  Future<void> _aiSummarize() async {
    if (!await _ensureCloudNoteForAi()) return;

    setState(() => _aiLoading = true);
    try {
      final response = await ApiService.post('/notes/$_serverNoteId/ai-summary');
      final summary = _extractAiText(response).trim();
      if (summary.isEmpty) throw ApiException(statusCode: 0, message: 'AI returned an empty summary.');
      setState(() {
        _aiSummary = summary;
        _aiResultTitle = 'AI Summary';
        _aiResult = summary;
      });
      _showAiResultSheet('AI Summary', summary);
    } catch (error, stackTrace) {
      if (mounted) AppErrorHandler.show(error, context: context, stackTrace: stackTrace, fallback: 'AI summary service unavailable. ${AppErrorHandler.messageFor(error)}');
    } finally {
      if (mounted) setState(() => _aiLoading = false);
    }
  }

  Future<void> _showAskAiSheet() async {
    _aiPromptC.clear();
    final prompt = await showModalBottomSheet<String>(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(18))),
      builder: (ctx) => Padding(
        padding: EdgeInsets.fromLTRB(20, 18, 20, MediaQuery.of(ctx).viewInsets.bottom + 20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  width: 36,
                  height: 36,
                  decoration: BoxDecoration(color: const Color(0xFFE0E7FF), borderRadius: BorderRadius.circular(8)),
                  child: const Icon(Icons.auto_awesome, color: Color(0xFF4F46E5), size: 20),
                ),
                const SizedBox(width: 10),
                const Expanded(child: Text('Ask AI', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w900))),
                IconButton(onPressed: () => Navigator.pop(ctx), icon: const Icon(Icons.close)),
              ],
            ),
            const SizedBox(height: 14),
            TextField(
              controller: _aiPromptC,
              autofocus: true,
              minLines: 3,
              maxLines: 6,
              textCapitalization: TextCapitalization.sentences,
              decoration: const InputDecoration(
                hintText: 'Ask about this note, request a rewrite, or generate study material...',
                alignLabelWithHint: true,
              ),
              onSubmitted: (_) {
                final text = _aiPromptC.text.trim();
                if (text.isNotEmpty) Navigator.pop(ctx, text);
              },
            ),
            const SizedBox(height: 14),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                icon: const Icon(Icons.send),
                label: const Text('Run AI'),
                onPressed: () {
                  final text = _aiPromptC.text.trim();
                  if (text.isNotEmpty) Navigator.pop(ctx, text);
                },
              ),
            ),
          ],
        ),
      ),
    );

    if (prompt == null || prompt.trim().isEmpty) return;
    await _runAiQuery(
      title: 'Ask AI',
      systemPrompt: 'You are Notexa AI, a precise study assistant. Answer clearly and use the provided note only when it is relevant. Use concise Markdown.',
      userPrompt: 'USER REQUEST:\n$prompt\n\n${_noteContextForAi()}',
    );
  }

  Future<void> _runStudyTool(String tool) async {
    final noteContext = _noteContextForAi();
    switch (tool) {
      case 'flashcards':
        await _runAiQuery(
          title: 'AI Flashcards',
          systemPrompt: 'Generate exactly 5 high-value study flashcards from the note. Use Markdown. Format each card as "Q:" and "A:".',
          userPrompt: noteContext,
        );
        return;
      case 'quiz':
        await _runAiQuery(
          title: 'AI Quiz',
          systemPrompt: 'Create a 5-question multiple-choice quiz from the note. Include four options per question and an answer key with one-sentence explanations. Use Markdown.',
          userPrompt: noteContext,
        );
        return;
      case 'clean':
        await _runAiQuery(
          title: 'AI Study Notes',
          systemPrompt: 'Rewrite the note as clean study notes with headings, bullets, definitions, and a short review checklist. Keep all important facts. Use Markdown.',
          userPrompt: noteContext,
        );
        return;
      default:
        await _aiSummarize();
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
      _message('Attached locally. Sign in to sync and share files.', const Color(0xFF047857));
      return;
    }

    if (_serverNoteId == null || _localDirty) await _save(silent: true);
    if (_serverNoteId == null) {
      await _addLocalAttachment(file);
      _message('Attached locally. It will upload after cloud sync.', Colors.orange);
      return;
    }

    try {
      await ApiService.uploadFile('/files/upload', file.path!, noteId: _serverNoteId.toString());
      _message('File attached', const Color(0xFF047857));
      await _fetch();
    } catch (error, stackTrace) {
      AppErrorHandler.report(error, stackTrace, source: 'Attach file');
      await _addLocalAttachment(file);
      _message('Saved locally. Cloud upload failed: ${AppErrorHandler.messageFor(error)}', Colors.orange);
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
            builder: (_) => PdfViewerScreen(title: item['original_name'] ?? 'PDF', filePath: path),
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
      final uri = ApiService.resolveUrl(url);
      if (isPdf && mounted) {
        await Navigator.push(
          context,
          MaterialPageRoute(
            builder: (_) => PdfViewerScreen(title: item['original_name'] ?? 'PDF', url: uri.toString()),
          ),
        );
        return;
      }
      if (await canLaunchUrl(uri)) {
        await launchUrl(uri, mode: LaunchMode.externalApplication);
      }
    } catch (error, stackTrace) {
      if (mounted) AppErrorHandler.show(error, context: context, stackTrace: stackTrace, fallback: 'Unable to open file. ${AppErrorHandler.messageFor(error)}');
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
      syncAction: LocalNoteStorage.isLocalId(_activeNoteId) ? 'create' : 'update',
    );
  }

  List<Map<String, dynamic>> _localAttachments() {
    return _files
        .where((file) => file is Map && file['_local'] == true && file['path'] != null)
        .map((file) => Map<String, dynamic>.from(file))
        .toList();
  }

  Future<void> _uploadLocalAttachments(dynamic noteId, List<Map<String, dynamic>> files) async {
    for (final file in files) {
      final path = file['path']?.toString();
      if (path != null && path.isNotEmpty) {
        await ApiService.uploadFile('/files/upload', path, noteId: noteId.toString());
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
    if (lower.endsWith('.docx')) return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
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
      if (mounted) AppErrorHandler.show(error, context: context, stackTrace: stackTrace, fallback: 'Sharing needs an internet connection. ${AppErrorHandler.messageFor(error)}');
      return;
    }

    if (!mounted) return;
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(18))),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setSheet) {
          final availableFriends = friends.where((friend) => !_collabs.any((c) => c['shared_with'] == friend['id'])).toList();
          return Padding(
            padding: EdgeInsets.fromLTRB(20, 18, 20, MediaQuery.of(ctx).viewInsets.bottom + 20),
            child: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const Expanded(child: Text('Share note', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800))),
                      IconButton(onPressed: () => Navigator.pop(ctx), icon: const Icon(Icons.close)),
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
                            const Text('Share code', style: TextStyle(fontWeight: FontWeight.w800)),
                            const Spacer(),
                            TextButton.icon(
                              onPressed: () async {
                                try {
                                  final response = await ApiService.post('/notes/$_serverNoteId/regenerate-code');
                                  setSheet(() => _shareCode = response['share_code']);
                                } catch (error, stackTrace) {
                                  if (mounted) AppErrorHandler.show(error, context: context, stackTrace: stackTrace);
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
                                padding: const EdgeInsets.symmetric(vertical: 12),
                                decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(8)),
                                child: Text(
                                  _shareCode ?? '--------',
                                  textAlign: TextAlign.center,
                                  style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w900, letterSpacing: 5, fontFamily: 'monospace'),
                                ),
                              ),
                            ),
                            const SizedBox(width: 10),
                            IconButton.filled(
                              onPressed: () {
                                Clipboard.setData(ClipboardData(text: _shareCode ?? ''));
                                _message('Code copied', const Color(0xFF047857));
                              },
                              icon: const Icon(Icons.copy),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Text('Codes add the note as view-only. Give edit access from the friends list below.',
                            style: TextStyle(fontSize: 12, color: Colors.grey.shade600)),
                      ],
                    ),
                  ),
                  const SizedBox(height: 18),
                  const Text('Friends', style: TextStyle(fontWeight: FontWeight.w800)),
                  const SizedBox(height: 8),
                  if (availableFriends.isEmpty)
                    Padding(
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      child: Text('No available friends to share with.', style: TextStyle(color: Colors.grey.shade500)),
                    )
                  else
                    ...availableFriends.map((friend) => ListTile(
                          contentPadding: EdgeInsets.zero,
                          leading: CircleAvatar(child: Text(_initial(friend['name']))),
                          title: Text(friend['name'] ?? '', style: const TextStyle(fontWeight: FontWeight.w700)),
                          subtitle: Text('@${friend['username']}'),
                          trailing: Wrap(
                            spacing: 4,
                            children: [
                              TextButton(
                                onPressed: () async {
                                  await _shareWithFriend(friend, 'view', setSheet);
                                },
                                child: const Text('View'),
                              ),
                              TextButton(
                                onPressed: () async {
                                  await _shareWithFriend(friend, 'edit', setSheet);
                                },
                                child: const Text('Edit'),
                              ),
                            ],
                          ),
                        )),
                  const SizedBox(height: 14),
                  if (_collabs.isNotEmpty) ...[
                    Text('Collaborators (${_collabs.length})', style: const TextStyle(fontWeight: FontWeight.w800)),
                    const SizedBox(height: 8),
                    ..._collabs.map((c) => ListTile(
                          contentPadding: EdgeInsets.zero,
                          leading: CircleAvatar(child: Text(_initial(c['recipient']?['name']))),
                          title: Text(c['recipient']?['name'] ?? '', style: const TextStyle(fontWeight: FontWeight.w700)),
                          subtitle: Text('@${c['recipient']?['username'] ?? ''}'),
                          trailing: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              DropdownButton<String>(
                                value: c['permission'] == 'edit' ? 'edit' : 'view',
                                underline: const SizedBox(),
                                items: const [
                                  DropdownMenuItem(value: 'view', child: Text('View')),
                                  DropdownMenuItem(value: 'edit', child: Text('Edit')),
                                ],
                                onChanged: (value) async {
                                  if (value == null) return;
                                  try {
                                    await ApiService.put('/notes/$_serverNoteId/share/${c['shared_with']}', body: {'permission': value});
                                    setSheet(() => c['permission'] = value);
                                  } catch (error, stackTrace) {
                                    if (mounted) AppErrorHandler.show(error, context: context, stackTrace: stackTrace);
                                  }
                                },
                              ),
                              IconButton(
                                onPressed: () async {
                                  try {
                                    await ApiService.delete('/notes/$_serverNoteId/share/${c['shared_with']}');
                                    setSheet(() => _collabs.removeWhere((x) => x['shared_with'] == c['shared_with']));
                                  } catch (error, stackTrace) {
                                    if (mounted) AppErrorHandler.show(error, context: context, stackTrace: stackTrace);
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

  Future<void> _shareWithFriend(dynamic friend, String permission, StateSetter setSheet) async {
    try {
      final response = await ApiService.post('/notes/$_serverNoteId/share', body: {
        'user_id': friend['id'],
        'permission': permission,
      });
      setSheet(() => _collabs.add(response['data']));
      _message('Shared with @${friend['username']}', const Color(0xFF047857));
    } catch (error, stackTrace) {
      if (mounted) AppErrorHandler.show(error, context: context, stackTrace: stackTrace);
    }
  }

  void _appendAiResult(String title, String result) {
    if (!_canEdit) {
      _message('You only have view access to this note.', Colors.orange);
      return;
    }

    final clean = result.trim();
    if (clean.isEmpty) return;
    final addition = '## $title\n$clean';
    final prefix = _contentC.text.trim().isEmpty ? '' : '\n\n';
    final updated = '${_contentC.text.trimRight()}$prefix$addition\n';
    _contentC.value = TextEditingValue(
      text: updated,
      selection: TextSelection.collapsed(offset: updated.length),
    );
    _markDirty();
    _message('AI output inserted into note.', const Color(0xFF047857));
  }

  void _showAiResultSheet(String title, String result) {
    if (!mounted) return;
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(18))),
      builder: (ctx) => DraggableScrollableSheet(
        expand: false,
        minChildSize: 0.38,
        initialChildSize: 0.68,
        maxChildSize: 0.92,
        builder: (_, controller) => Padding(
          padding: const EdgeInsets.fromLTRB(20, 18, 20, 18),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    width: 36,
                    height: 36,
                    decoration: BoxDecoration(color: const Color(0xFFFFFBEB), borderRadius: BorderRadius.circular(8)),
                    child: const Icon(Icons.auto_awesome, color: Color(0xFFB45309), size: 20),
                  ),
                  const SizedBox(width: 10),
                  Expanded(child: Text(title, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w900))),
                  IconButton(
                    tooltip: 'Copy',
                    onPressed: () {
                      Clipboard.setData(ClipboardData(text: result));
                      _message('AI output copied.', const Color(0xFF047857));
                    },
                    icon: const Icon(Icons.copy),
                  ),
                  IconButton(onPressed: () => Navigator.pop(ctx), icon: const Icon(Icons.close)),
                ],
              ),
              const SizedBox(height: 12),
              Expanded(
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF8FAFC),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: const Color(0xFFE2E8F0)),
                  ),
                  child: SingleChildScrollView(
                    controller: controller,
                    child: SelectableText(result, style: const TextStyle(height: 1.55, color: Color(0xFF111827))),
                  ),
                ),
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      icon: const Icon(Icons.close),
                      label: const Text('Close'),
                      onPressed: () => Navigator.pop(ctx),
                    ),
                  ),
                  if (_canEdit) ...[
                    const SizedBox(width: 10),
                    Expanded(
                      child: ElevatedButton.icon(
                        icon: const Icon(Icons.add),
                        label: const Text('Insert'),
                        onPressed: () {
                          Navigator.pop(ctx);
                          _appendAiResult(title, result);
                        },
                      ),
                    ),
                  ],
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _message(String text, Color color) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(text), backgroundColor: color));
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
            IconButton(icon: const Icon(Icons.push_pin_outlined), onPressed: _togglePin, tooltip: 'Pin'),
          if (_canEdit)
            IconButton(icon: const Icon(Icons.attach_file), onPressed: _attachFile, tooltip: 'Attach file'),
          IconButton(
            icon: _aiLoading
                ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2))
                : const Icon(Icons.auto_awesome_outlined),
            onPressed: _aiLoading ? null : _aiSummarize,
            tooltip: 'AI summary',
          ),
          if (_isOwner) IconButton(icon: const Icon(Icons.ios_share), onPressed: _showShareSheet, tooltip: 'Share'),
          if (_canEdit)
            IconButton(
              icon: _saving ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2)) : const Icon(Icons.check),
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
                _statusChip(_perm == 'owner' ? 'Owner' : _perm == 'edit' ? 'Can edit' : 'View only', Icons.lock_open),
                if (_offline) _statusChip('Offline', Icons.cloud_off, warning: true),
                if (_localDirty) _statusChip('Saved locally', Icons.cloud_upload_outlined, warning: true),
              ],
            ),
            const SizedBox(height: 14),
            if (_canEdit)
              Row(
                children: [
                  ..._palette.map((color) => Padding(
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
                              border: Border.all(color: _color == color ? const Color(0xFF111827) : const Color(0xFFE5E7EB), width: _color == color ? 2 : 1),
                            ),
                          ),
                        ),
                      )),
                  const Spacer(),
                  Icon(_note?['is_pinned'] == true ? Icons.push_pin : Icons.push_pin_outlined, size: 18, color: const Color(0xFF92400E)),
                ],
              ),
            const SizedBox(height: 12),
            _editorSurface(),
            const SizedBox(height: 12),
            _aiToolsCard(),
            if (_aiResult != null && _aiResult!.trim().isNotEmpty && _aiResultTitle != 'AI Summary') _aiResultPreviewCard(),
            if (_aiSummary != null && _aiSummary!.trim().isNotEmpty) _summaryCard(),
            if (_files.isNotEmpty) _filesCard(),
          ],
        ),
      ),
    );
  }

  Widget _editorSurface() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 18),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.86),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Colors.black.withOpacity(0.06)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.04),
            blurRadius: 18,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          TextField(
            controller: _titleC,
            readOnly: !_canEdit,
            textCapitalization: TextCapitalization.sentences,
            style: const TextStyle(fontSize: 30, fontWeight: FontWeight.w900, height: 1.1, color: Color(0xFF111827)),
            decoration: const InputDecoration(
              hintText: 'Untitled note',
              border: InputBorder.none,
              enabledBorder: InputBorder.none,
              focusedBorder: InputBorder.none,
              fillColor: Colors.transparent,
              contentPadding: EdgeInsets.zero,
            ),
            maxLines: null,
            onChanged: (_) => _markDirty(),
          ),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              _metaChip('$_wordCount words', Icons.notes_outlined),
              _metaChip('$_readingMinutes min read', Icons.timer_outlined),
              _metaChip(_note?['updated_at'] == null ? 'Draft' : 'Auto-saved locally', Icons.cloud_done_outlined),
            ],
          ),
          if (_canEdit) _writingToolbar(),
          TextField(
            controller: _contentC,
            focusNode: _contentFocus,
            readOnly: !_canEdit,
            keyboardType: TextInputType.multiline,
            textCapitalization: TextCapitalization.sentences,
            style: const TextStyle(fontSize: 16, height: 1.75, color: Color(0xFF111827)),
            decoration: const InputDecoration(
              hintText: 'Start writing, paste research, or draft lecture notes...',
              border: InputBorder.none,
              enabledBorder: InputBorder.none,
              focusedBorder: InputBorder.none,
              fillColor: Colors.transparent,
              contentPadding: EdgeInsets.only(top: 14),
            ),
            minLines: 18,
            maxLines: null,
            onChanged: (_) => _markDirty(),
          ),
        ],
      ),
    );
  }

  Widget _writingToolbar() {
    return Container(
      margin: const EdgeInsets.only(top: 14, bottom: 8),
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 4),
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Colors.black.withOpacity(0.06)),
      ),
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: Row(
          children: [
            _toolButton(Icons.title, 'H1', () => _insertPrefix('# ')),
            _toolButton(Icons.text_fields, 'H2', () => _insertPrefix('## ')),
            _toolButton(Icons.format_bold, 'Bold', () => _insertInline('**', '**')),
            _toolButton(Icons.format_italic, 'Italic', () => _insertInline('_', '_')),
            _toolButton(Icons.code, 'Code', () => _insertInline('`', '`')),
            _toolButton(Icons.format_list_bulleted, 'Bullets', () => _insertPrefix('- ')),
            _toolButton(Icons.format_list_numbered, 'Numbers', () => _insertPrefix('1. ')),
            _toolButton(Icons.check_box_outlined, 'Task', () => _insertPrefix('- [ ] ')),
            _toolButton(Icons.format_quote, 'Quote', () => _insertPrefix('> ')),
            _toolButton(Icons.remove, 'Divider', _insertDivider),
          ],
        ),
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
        color: warning ? const Color(0xFFFFFBEB) : Colors.white.withOpacity(0.7),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: warning ? const Color(0xFFFDE68A) : const Color(0xFFE5E7EB)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: warning ? const Color(0xFFB45309) : const Color(0xFF374151)),
          const SizedBox(width: 6),
          Text(label, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: warning ? const Color(0xFF92400E) : const Color(0xFF374151))),
        ],
      ),
    );
  }

  Widget _metaChip(String label, IconData icon) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 5),
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 13, color: const Color(0xFF64748B)),
          const SizedBox(width: 5),
          Text(label, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Color(0xFF475569))),
        ],
      ),
    );
  }

  Widget _aiToolsCard() {
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.76),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: const Color(0xFFE5E7EB)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 30,
                height: 30,
                decoration: BoxDecoration(color: const Color(0xFFE0E7FF), borderRadius: BorderRadius.circular(8)),
                child: const Icon(Icons.auto_awesome, size: 17, color: Color(0xFF4F46E5)),
              ),
              const SizedBox(width: 8),
              const Expanded(child: Text('AI Workspace', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w900, color: Color(0xFF111827)))),
              if (_aiLoading)
                const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2)),
            ],
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              _aiActionButton('Ask', Icons.chat_bubble_outline, const Color(0xFF4F46E5), _showAskAiSheet),
              _aiActionButton('Summary', Icons.auto_awesome_outlined, const Color(0xFFB45309), _aiSummarize),
              _aiActionButton('Cards', Icons.style_outlined, const Color(0xFF047857), () => _runStudyTool('flashcards')),
              _aiActionButton('Quiz', Icons.quiz_outlined, const Color(0xFFBE123C), () => _runStudyTool('quiz')),
              _aiActionButton('Clean', Icons.format_align_left, const Color(0xFF6D28D9), () => _runStudyTool('clean')),
            ],
          ),
        ],
      ),
    );
  }

  Widget _aiActionButton(String label, IconData icon, Color color, Future<void> Function() onTap) {
    return OutlinedButton.icon(
      onPressed: _aiLoading ? null : onTap,
      icon: Icon(icon, size: 16, color: _aiLoading ? null : color),
      label: Text(label),
      style: OutlinedButton.styleFrom(
        foregroundColor: const Color(0xFF111827),
        backgroundColor: Colors.white,
        side: BorderSide(color: color.withOpacity(0.24)),
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 9),
        visualDensity: VisualDensity.compact,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
        textStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.w800),
      ),
    );
  }

  Widget _aiResultPreviewCard() {
    final title = _aiResultTitle ?? 'AI Output';
    final result = _aiResult ?? '';
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(bottom: 12),
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
              const Icon(Icons.bolt_outlined, size: 16, color: Color(0xFF4F46E5)),
              const SizedBox(width: 6),
              Expanded(child: Text(title, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w900, color: Color(0xFF111827)))),
              TextButton(
                onPressed: () => _showAiResultSheet(title, result),
                child: const Text('Open'),
              ),
            ],
          ),
          Text(
            result,
            maxLines: 4,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(fontSize: 13, color: Colors.grey.shade700, height: 1.45),
          ),
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
            Text('AI summary', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: Color(0xFF92400E))),
          ]),
          const SizedBox(height: 6),
          Text(_aiSummary!, style: const TextStyle(fontSize: 13, color: Color(0xFF78350F), height: 1.45)),
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
          Text('Files (${_files.length})', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w800)),
          const SizedBox(height: 8),
          ..._files.map((file) => ListTile(
                dense: true,
                contentPadding: EdgeInsets.zero,
                leading: Icon(file['mime_type']?.toString().contains('pdf') == true ? Icons.picture_as_pdf : Icons.insert_drive_file),
                title: Text(file['original_name'] ?? '', maxLines: 1, overflow: TextOverflow.ellipsis),
                trailing: IconButton(
                  icon: Icon(_isPdf(Map<String, dynamic>.from(file)) ? Icons.visibility_outlined : Icons.open_in_new),
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
