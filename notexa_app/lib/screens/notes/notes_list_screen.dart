import 'dart:async';
import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../services/api_service.dart';
import '../../services/auth_service.dart';
import '../../services/error_handler.dart';
import '../../services/local_storage.dart';
import '../auth/login_screen.dart';
import 'note_editor_screen.dart';

class NotesListScreen extends StatefulWidget {
  const NotesListScreen({super.key});
  @override
  State<NotesListScreen> createState() => _NotesListScreenState();
}

class _NotesListScreenState extends State<NotesListScreen> {
  static const _palette = ['#fff7d6', '#ffffff', '#dbeafe', '#dcfce7', '#fde2e2', '#f3e8ff'];

  final _searchCtrl = TextEditingController();
  List<Map<String, dynamic>> _notes = [];
  bool _loading = true;
  bool _offline = false;
  bool _syncing = false;
  String _search = '';
  Timer? _searchTimer;

  @override
  void initState() {
    super.initState();
    _fetch();
  }

  @override
  void dispose() {
    _searchTimer?.cancel();
    _searchCtrl.dispose();
    super.dispose();
  }

  Future<void> _fetch() async {
    if (!mounted) return;
    setState(() => _loading = true);
    final authenticated = context.read<AuthService>().isAuthenticated;

    if (!authenticated) {
      final local = await LocalNoteStorage.getAllNotes(search: _search);
      if (!mounted) return;
      setState(() {
        _notes = local;
        _offline = true;
        _loading = false;
        _syncing = false;
      });
      return;
    }

    try {
      setState(() => _syncing = true);
      final sync = await LocalNoteStorage.syncDirtyNotes();
      final query = _search.isNotEmpty ? '?search=${Uri.encodeQueryComponent(_search)}' : '';
      final response = await ApiService.get('/notes$query');
      final cloudNotes = List<dynamic>.from(response['data']?['data'] ?? []);
      await LocalNoteStorage.syncFromCloud(cloudNotes);

      if (!mounted) return;
      setState(() {
        _notes = cloudNotes.map((n) => Map<String, dynamic>.from(n)).toList();
        _offline = false;
      });

      if ((sync['synced'] ?? 0) > 0 && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text('${sync['synced']} offline change${sync['synced'] == 1 ? '' : 's'} synced'),
          backgroundColor: const Color(0xFF047857),
          duration: const Duration(seconds: 2),
        ));
      }
      if ((sync['failed'] ?? 0) > 0 && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text('${sync['failed']} offline change${sync['failed'] == 1 ? '' : 's'} could not be synced. Try again.'),
          backgroundColor: const Color(0xFFB45309),
          duration: const Duration(seconds: 3),
        ));
      }
      if ((sync['file_failed'] ?? 0) > 0 && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text('Note synced. ${sync['file_failed']} local attachment${sync['file_failed'] == 1 ? '' : 's'} could not upload.'),
          backgroundColor: const Color(0xFFB45309),
          duration: const Duration(seconds: 3),
        ));
      }
    } catch (error, stackTrace) {
      final local = await LocalNoteStorage.getAllNotes(search: _search);
      if (!mounted) return;
      setState(() {
        _notes = local;
        _offline = true;
      });
      AppErrorHandler.show(
        error,
        context: context,
        stackTrace: stackTrace,
        fallback: 'Cloud sync failed. Showing local notes. ${AppErrorHandler.messageFor(error)}',
      );
    } finally {
      if (mounted) {
        setState(() {
          _loading = false;
          _syncing = false;
        });
      }
    }
  }

  void _onSearch(String value) {
    _search = value.trim();
    _searchTimer?.cancel();
    _searchTimer = Timer(const Duration(milliseconds: 350), _fetch);
  }

  Future<void> _createNote(String title, String color) async {
    final cleanTitle = title.trim().isEmpty ? 'Untitled Note' : title.trim();
    final authenticated = context.read<AuthService>().isAuthenticated;

    if (!authenticated) {
      final localId = await LocalNoteStorage.createDraft(title: cleanTitle, color: color);
      if (!mounted) return;
      await _fetch();
      await Navigator.push(
        context,
        MaterialPageRoute(builder: (_) => NoteEditorScreen(noteId: localId)),
      );
      _fetch();
      return;
    }

    try {
      final response = await ApiService.post('/notes', body: {'title': cleanTitle, 'color': color});
      if (!mounted) return;
      await _fetch();
      await Navigator.push(
        context,
        MaterialPageRoute(builder: (_) => NoteEditorScreen(noteId: response['data']['id'])),
      );
    } catch (error, stackTrace) {
      AppErrorHandler.report(error, stackTrace, source: 'Create cloud note');
      final localId = await LocalNoteStorage.createDraft(title: cleanTitle, color: color);
      if (!mounted) return;
      await _fetch();
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
        content: Text('Created offline. It will sync when you are online.'),
        backgroundColor: Color(0xFFB45309),
      ));
      await Navigator.push(
        context,
        MaterialPageRoute(builder: (_) => NoteEditorScreen(noteId: localId)),
      );
    }
    _fetch();
  }

  void _showCreate() {
    final titleCtrl = TextEditingController();
    var selectedColor = _palette.first;

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialog) => AlertDialog(
          title: const Text('New note', style: TextStyle(fontWeight: FontWeight.w800)),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              TextField(
                controller: titleCtrl,
                decoration: const InputDecoration(hintText: 'Title'),
                autofocus: true,
                textCapitalization: TextCapitalization.sentences,
                onSubmitted: (_) {
                  Navigator.pop(ctx);
                  _createNote(titleCtrl.text, selectedColor);
                },
              ),
              const SizedBox(height: 16),
              Wrap(
                spacing: 10,
                children: _palette.map((color) {
                  final active = selectedColor == color;
                  return InkWell(
                    borderRadius: BorderRadius.circular(18),
                    onTap: () => setDialog(() => selectedColor = color),
                    child: Container(
                      width: 34,
                      height: 34,
                      decoration: BoxDecoration(
                        color: _color(color),
                        shape: BoxShape.circle,
                        border: Border.all(
                          color: active ? const Color(0xFF111827) : const Color(0xFFE5E7EB),
                          width: active ? 2 : 1,
                        ),
                      ),
                    ),
                  );
                }).toList(),
              ),
            ],
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
            ElevatedButton(
              onPressed: () {
                Navigator.pop(ctx);
                _createNote(titleCtrl.text, selectedColor);
              },
              child: const Text('Create'),
            ),
          ],
        ),
      ),
    );
  }

  void _showRedeem() {
    if (!context.read<AuthService>().isAuthenticated) {
      _showCloudPrompt('Sign in to redeem share codes and open notes from friends.');
      return;
    }

    final ctrl = TextEditingController();
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Redeem share code', style: TextStyle(fontWeight: FontWeight.w800)),
        content: TextField(
          controller: ctrl,
          textCapitalization: TextCapitalization.characters,
          maxLength: 8,
          style: const TextStyle(letterSpacing: 4, fontWeight: FontWeight.w800, fontSize: 22),
          textAlign: TextAlign.center,
          decoration: const InputDecoration(hintText: 'ABCD1234', counterText: ''),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () async {
              try {
                final response = await ApiService.post('/notes/redeem-code', body: {'code': ctrl.text.toUpperCase()});
                if (!mounted) return;
                Navigator.pop(ctx);
                ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                  content: Text(response['message'] ?? 'Shared note added'),
                  backgroundColor: const Color(0xFF047857),
                ));
                _fetch();
              } catch (error, stackTrace) {
                if (!mounted) return;
                AppErrorHandler.show(error, context: context, stackTrace: stackTrace);
              }
            },
            child: const Text('Redeem'),
          ),
        ],
      ),
    );
  }

  Future<void> _uploadFile() async {
    if (!context.read<AuthService>().isAuthenticated) {
      _showCloudPrompt('Sign in to upload files to cloud storage. Local PDFs can be attached inside a note.');
      return;
    }

    if (_offline) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Cloud file uploads need an internet connection.')));
      return;
    }

    final result = await FilePicker.platform.pickFiles(
      type: FileType.custom,
      allowedExtensions: ['pdf', 'doc', 'docx', 'png', 'jpg', 'jpeg', 'txt'],
    );
    if (result == null || result.files.single.path == null) return;

    try {
      await ApiService.uploadFile('/files/upload', result.files.single.path!);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('File uploaded'), backgroundColor: Color(0xFF047857)));
    } catch (error, stackTrace) {
      if (!mounted) return;
      AppErrorHandler.show(error, context: context, stackTrace: stackTrace);
    }
  }

  static Color _color(String? hex) {
    if (hex == null || hex.length != 7) return Colors.white;
    try {
      return Color(int.parse(hex.replaceFirst('#', '0xFF')));
    } catch (error, stackTrace) {
      AppErrorHandler.report(error, stackTrace, source: 'Parse note color');
      return Colors.white;
    }
  }

  String _preview(Map<String, dynamic> note) {
    final text = (note['plain_text'] ?? LocalNoteStorage.htmlToPlain(note['content'])).toString().trim();
    return text.isEmpty ? 'No additional text' : text;
  }

  void _showCloudPrompt(String message) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(18))),
      builder: (ctx) => Padding(
        padding: const EdgeInsets.fromLTRB(20, 18, 20, 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Cloud account needed', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w900)),
            const SizedBox(height: 8),
            Text(message, style: TextStyle(color: Colors.grey.shade600, height: 1.45)),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                icon: const Icon(Icons.login),
                label: const Text('Sign in or register'),
                onPressed: () {
                  Navigator.pop(ctx);
                  Navigator.push(context, MaterialPageRoute(builder: (_) => const LoginScreen()));
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        titleSpacing: 20,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Notes', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 22)),
            Text(
              _offline && !context.watch<AuthService>().isAuthenticated ? 'Local mode' : _offline ? 'Offline mode' : '${_notes.length} note${_notes.length == 1 ? '' : 's'}',
              style: TextStyle(fontSize: 12, color: _offline ? const Color(0xFFB45309) : Colors.grey.shade500),
            ),
          ],
        ),
        actions: [
          IconButton(icon: const Icon(Icons.sync), onPressed: _syncing ? null : _fetch, tooltip: 'Sync'),
          IconButton(icon: const Icon(Icons.attach_file), onPressed: _uploadFile, tooltip: 'Upload file'),
          IconButton(icon: const Icon(Icons.key_outlined), onPressed: _showRedeem, tooltip: 'Redeem share code'),
          const SizedBox(width: 8),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _showCreate,
        icon: const Icon(Icons.edit_note),
        label: const Text('New note'),
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 10, 20, 8),
            child: TextField(
              controller: _searchCtrl,
              decoration: InputDecoration(
                hintText: 'Search notes',
                prefixIcon: const Icon(Icons.search),
                suffixIcon: _search.isEmpty
                    ? null
                    : IconButton(
                        onPressed: () {
                          _searchCtrl.clear();
                          _onSearch('');
                        },
                        icon: const Icon(Icons.close),
                      ),
              ),
              onChanged: _onSearch,
            ),
          ),
          if (_offline || _syncing)
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 0, 20, 8),
              child: Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
                decoration: BoxDecoration(
                  color: _offline ? const Color(0xFFFFFBEB) : const Color(0xFFEFF6FF),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: _offline ? const Color(0xFFFDE68A) : const Color(0xFFBFDBFE)),
                ),
                child: Row(
                  children: [
                    Icon(_offline ? Icons.cloud_off : Icons.sync, size: 16, color: _offline ? const Color(0xFFB45309) : const Color(0xFF2563EB)),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        _offline && !context.read<AuthService>().isAuthenticated
                            ? 'No account needed. Notes and local PDFs stay on this device.'
                            : _offline
                                ? 'You can keep writing. Changes are saved on this device.'
                                : 'Checking for offline changes...',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: _offline ? const Color(0xFF92400E) : const Color(0xFF1D4ED8),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator())
                : _notes.isEmpty
                    ? Center(
                        child: Padding(
                          padding: const EdgeInsets.all(32),
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(Icons.sticky_note_2_outlined, size: 64, color: Colors.grey.shade300),
                              const SizedBox(height: 14),
                              Text('No notes yet', style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800)),
                              const SizedBox(height: 6),
                              Text('Create lecture notes, tasks, ideas, and shared study material in one place.',
                                  textAlign: TextAlign.center, style: TextStyle(color: Colors.grey.shade500)),
                              const SizedBox(height: 18),
                              ElevatedButton.icon(onPressed: _showCreate, icon: const Icon(Icons.add), label: const Text('Create note')),
                            ],
                          ),
                        ),
                      )
                    : RefreshIndicator(
                        onRefresh: _fetch,
                        child: LayoutBuilder(
                          builder: (context, constraints) {
                            final columns = constraints.maxWidth > 760 ? 3 : constraints.maxWidth > 520 ? 2 : 1;
                            return GridView.builder(
                              physics: const AlwaysScrollableScrollPhysics(),
                              padding: const EdgeInsets.fromLTRB(20, 8, 20, 96),
                              gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                                crossAxisCount: columns,
                                crossAxisSpacing: 12,
                                mainAxisSpacing: 12,
                                childAspectRatio: columns == 1 ? 2.55 : 1.05,
                              ),
                              itemCount: _notes.length,
                              itemBuilder: (_, index) {
                                final note = _notes[index];
                                final dirty = note['_dirty'] == true;
                                final local = LocalNoteStorage.isLocalId(note['id']);
                                return InkWell(
                                  borderRadius: BorderRadius.circular(8),
                                  onTap: () async {
                                    await Navigator.push(
                                      context,
                                      MaterialPageRoute(builder: (_) => NoteEditorScreen(noteId: note['id'])),
                                    );
                                    _fetch();
                                  },
                                  child: Container(
                                    padding: const EdgeInsets.all(16),
                                    decoration: BoxDecoration(
                                      color: _color(note['color']),
                                      borderRadius: BorderRadius.circular(8),
                                      border: Border.all(color: const Color(0xFFE5E7EB)),
                                      boxShadow: [
                                        BoxShadow(
                                          color: Colors.black.withOpacity(0.035),
                                          blurRadius: 18,
                                          offset: const Offset(0, 8),
                                        ),
                                      ],
                                    ),
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Row(
                                          children: [
                                            Expanded(
                                              child: Text(
                                                note['title'] ?? 'Untitled Note',
                                                maxLines: 1,
                                                overflow: TextOverflow.ellipsis,
                                                style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16),
                                              ),
                                            ),
                                            if (note['is_pinned'] == true) const Icon(Icons.push_pin, size: 15, color: Color(0xFFD97706)),
                                            if (dirty || local)
                                              const Padding(
                                                padding: EdgeInsets.only(left: 6),
                                                child: Icon(Icons.cloud_upload_outlined, size: 16, color: Color(0xFFB45309)),
                                              ),
                                          ],
                                        ),
                                        const SizedBox(height: 8),
                                        Expanded(
                                          child: Text(
                                            _preview(note),
                                            maxLines: columns == 1 ? 2 : 6,
                                            overflow: TextOverflow.ellipsis,
                                            style: TextStyle(fontSize: 13.5, color: Colors.grey.shade700, height: 1.45),
                                          ),
                                        ),
                                        const SizedBox(height: 10),
                                        Row(
                                          children: [
                                            Text(
                                              (note['updated_at'] ?? '').toString().split('T').first,
                                              style: TextStyle(fontSize: 11.5, color: Colors.grey.shade500),
                                            ),
                                            const Spacer(),
                                            if (note['share_code'] != null && !local)
                                              Icon(Icons.link, size: 14, color: Colors.indigo.shade400),
                                          ],
                                        ),
                                      ],
                                    ),
                                  ),
                                );
                              },
                            );
                          },
                        ),
                      ),
          ),
        ],
      ),
    );
  }
}
