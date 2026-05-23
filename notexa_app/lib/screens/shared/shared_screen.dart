import 'package:flutter/material.dart';
import '../../services/api_service.dart';
import '../../services/error_handler.dart';
import '../notes/note_editor_screen.dart';

class SharedScreen extends StatefulWidget {
  const SharedScreen({super.key});
  @override State<SharedScreen> createState() => _SharedScreenState();
}

class _SharedScreenState extends State<SharedScreen> {
  List<dynamic> _notes = [];
  bool _loading = true;

  @override void initState() { super.initState(); _fetch(); }

  Future<void> _fetch() async {
    try {
      final r = await ApiService.get('/shared-with-me');
      if (mounted) setState(() => _notes = r['data']?['data'] ?? []);
    } catch (error, stackTrace) {
      if (mounted) AppErrorHandler.show(error, context: context, stackTrace: stackTrace);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Shared with Me', style: TextStyle(fontWeight: FontWeight.w700))),
      body: _loading ? const Center(child: CircularProgressIndicator())
        : _notes.isEmpty ? const Center(child: Column(mainAxisSize: MainAxisSize.min, children: [Icon(Icons.share_outlined, size: 64, color: Colors.grey), SizedBox(height: 12), Text('No shared notes yet')]))
        : RefreshIndicator(onRefresh: _fetch, child: ListView.builder(
          padding: const EdgeInsets.all(16), itemCount: _notes.length,
          itemBuilder: (_, i) {
            final n = _notes[i];
            final perm = n['pivot']?['permission'] ?? 'view';
            return Card(
              margin: const EdgeInsets.only(bottom: 12),
              child: ListTile(
                contentPadding: const EdgeInsets.all(16),
                title: Text(n['title'] ?? '', style: const TextStyle(fontWeight: FontWeight.w700)),
                subtitle: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  const SizedBox(height: 4),
                  Text(n['plain_text'] ?? 'Empty', maxLines: 2, overflow: TextOverflow.ellipsis, style: TextStyle(color: Colors.grey.shade600, fontSize: 13)),
                  const SizedBox(height: 8),
                  Row(children: [
                    Text('By @${n['user']?['username'] ?? ''}', style: TextStyle(fontSize: 12, color: Colors.grey.shade400)),
                    const Spacer(),
                    Container(padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2), decoration: BoxDecoration(color: perm == 'edit' ? Colors.green.shade50 : Colors.grey.shade100, borderRadius: BorderRadius.circular(6)),
                      child: Text(perm, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: perm == 'edit' ? Colors.green : Colors.grey))),
                  ]),
                ]),
                onTap: () async { await Navigator.push(context, MaterialPageRoute(builder: (_) => NoteEditorScreen(noteId: n['id']))); _fetch(); },
              ),
            );
          },
        )),
    );
  }
}
