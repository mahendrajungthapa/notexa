import 'package:flutter/material.dart';
import '../../services/api_service.dart';
import '../../services/error_handler.dart';

class FriendsScreen extends StatefulWidget {
  const FriendsScreen({super.key});
  @override
  State<FriendsScreen> createState() => _FriendsScreenState();
}

class _FriendsScreenState extends State<FriendsScreen> with SingleTickerProviderStateMixin {
  late TabController _tab;
  List<dynamic> _friends = [];
  List<dynamic> _received = [];
  List<dynamic> _sent = [];
  List<dynamic> _searchResults = [];
  List<dynamic> _shareNotes = [];
  List<dynamic> _shareFiles = [];
  bool _loading = true;
  bool _actionBusy = false;
  bool _sending = false;
  bool _searching = false;
  bool _sharing = false;
  final _uCtrl = TextEditingController();
  final _searchCtrl = TextEditingController();
  String _shareTab = 'note';
  int? _selectedNoteId;
  int? _selectedFileId;

  @override
  void initState() {
    super.initState();
    _tab = TabController(length: 3, vsync: this);
    _fetch();
  }

  @override
  void dispose() {
    _tab.dispose();
    _uCtrl.dispose();
    _searchCtrl.dispose();
    super.dispose();
  }

  Map<String, dynamic> _map(dynamic value) {
    if (value is Map<String, dynamic>) return value;
    if (value is Map) return value.map((key, val) => MapEntry(key.toString(), val));
    return <String, dynamic>{};
  }

  List<dynamic> _list(dynamic value) => value is List ? List<dynamic>.from(value) : <dynamic>[];

  List<dynamic> _paginatedItems(dynamic value) {
    if (value is Map && value['data'] is List) return List<dynamic>.from(value['data']);
    if (value is List) return List<dynamic>.from(value);
    return <dynamic>[];
  }

  String _text(dynamic value, {String fallback = ''}) {
    final text = value?.toString().trim() ?? '';
    return text.isEmpty ? fallback : text;
  }

  String _fmtSize(dynamic value) {
    final bytes = int.tryParse(value?.toString() ?? '') ?? 0;
    if (bytes >= 1048576) return '${(bytes / 1048576).toStringAsFixed(1)} MB';
    if (bytes >= 1024) return '${(bytes / 1024).toStringAsFixed(0)} KB';
    return '$bytes B';
  }

  String _initial(dynamic value) {
    final text = _text(value, fallback: '?');
    return text == '?' ? text : text[0].toUpperCase();
  }

  Future<Map<String, dynamic>?> _safeGet(String path, String label) async {
    try {
      return await ApiService.get(path);
    } catch (error, stackTrace) {
      if (mounted) {
        AppErrorHandler.show(
          error,
          context: context,
          stackTrace: stackTrace,
          fallback: 'Could not load $label. ${AppErrorHandler.messageFor(error)}',
        );
      }
      return null;
    }
  }

  Future<void> _fetch({bool showSpinner = true}) async {
    if (showSpinner && mounted) setState(() => _loading = true);

    final results = await Future.wait([
      _safeGet('/friends', 'friends'),
      _safeGet('/friends/requests', 'friend requests'),
    ]);

    if (!mounted) return;

    final friendsResponse = results[0];
    final requestsResponse = results[1];
    final requestsData = _map(requestsResponse?['data']);

    setState(() {
      if (friendsResponse != null) _friends = _list(friendsResponse['data']);
      if (requestsResponse != null) {
        _received = _list(requestsData['received']);
        _sent = _list(requestsData['sent']);
      }
      _loading = false;
    });
  }

  Future<void> _send() async {
    final username = _uCtrl.text.trim().replaceAll('@', '');
    if (username.isEmpty) {
      _msg('Enter a username', Colors.red);
      return;
    }

    setState(() => _sending = true);
    try {
      final response = await ApiService.post('/friends/request', body: {'username': username});
      _msg(_text(response['message'], fallback: 'Friend request sent.'), Colors.green);
      _uCtrl.clear();
      await _fetch(showSpinner: false);
    } catch (error, stackTrace) {
      if (mounted) AppErrorHandler.show(error, context: context, stackTrace: stackTrace);
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  Future<void> _searchUsers() async {
    final query = _searchCtrl.text.trim();
    if (query.length < 2) {
      setState(() => _searchResults = []);
      return;
    }

    setState(() => _searching = true);
    try {
      final response = await ApiService.get('/friends/search?query=${Uri.encodeQueryComponent(query)}');
      if (mounted) setState(() => _searchResults = _list(response['data']));
    } catch (error, stackTrace) {
      if (mounted) AppErrorHandler.show(error, context: context, stackTrace: stackTrace, fallback: 'Search failed. ${AppErrorHandler.messageFor(error)}');
    } finally {
      if (mounted) setState(() => _searching = false);
    }
  }

  Future<void> _openShareSheet(Map<String, dynamic> friend) async {
    setState(() {
      _sharing = true;
      _selectedNoteId = null;
      _selectedFileId = null;
      _shareTab = 'note';
    });

    try {
      final results = await Future.wait([
        ApiService.get('/notes'),
        ApiService.get('/files'),
      ]);
      _shareNotes = _paginatedItems(results[0]['data']);
      _shareFiles = _paginatedItems(results[1]['data']);
    } catch (error, stackTrace) {
      if (mounted) AppErrorHandler.show(error, context: context, stackTrace: stackTrace, fallback: 'Could not load shareable notes and files. ${AppErrorHandler.messageFor(error)}');
      return;
    } finally {
      if (mounted) setState(() => _sharing = false);
    }

    if (!mounted) return;
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(18))),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setSheet) => Padding(
          padding: EdgeInsets.fromLTRB(20, 18, 20, MediaQuery.of(ctx).viewInsets.bottom + 20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  CircleAvatar(child: Text(_initial(friend['name']))),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text('Share with ${_text(friend['name'], fallback: 'friend')}', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w900)),
                        Text('@${_text(friend['username'])}', style: TextStyle(fontSize: 12, color: Colors.grey.shade500)),
                      ],
                    ),
                  ),
                  IconButton(onPressed: () => Navigator.pop(ctx), icon: const Icon(Icons.close)),
                ],
              ),
              const SizedBox(height: 14),
              SegmentedButton<String>(
                segments: const [
                  ButtonSegment(value: 'note', icon: Icon(Icons.description_outlined), label: Text('Note')),
                  ButtonSegment(value: 'file', icon: Icon(Icons.folder_outlined), label: Text('File')),
                ],
                selected: {_shareTab},
                onSelectionChanged: (value) => setSheet(() {
                  _shareTab = value.first;
                  _selectedNoteId = null;
                  _selectedFileId = null;
                }),
              ),
              const SizedBox(height: 12),
              ConstrainedBox(
                constraints: const BoxConstraints(maxHeight: 320),
                child: _shareTab == 'note'
                    ? _shareNotesList(setSheet)
                    : _shareFilesList(setSheet),
              ),
              const SizedBox(height: 14),
              Row(
                children: [
                  Expanded(child: OutlinedButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel'))),
                  const SizedBox(width: 10),
                  Expanded(
                    child: ElevatedButton.icon(
                      icon: _sharing
                          ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                          : const Icon(Icons.ios_share),
                      label: Text(_sharing ? 'Sharing...' : 'Share'),
                      onPressed: _sharing || (_shareTab == 'note' ? _selectedNoteId == null : _selectedFileId == null)
                          ? null
                          : () async {
                              setSheet(() => _sharing = true);
                              final success = await _shareSelected(friend['id']);
                              if (!ctx.mounted) return;
                              setSheet(() => _sharing = false);
                              if (success) Navigator.pop(ctx);
                            },
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _shareNotesList(StateSetter setSheet) {
    if (_shareNotes.isEmpty) {
      return Center(child: Text('No notes available to share.', style: TextStyle(color: Colors.grey.shade500)));
    }

    return ListView.builder(
      shrinkWrap: true,
      itemCount: _shareNotes.length,
      itemBuilder: (_, index) {
        final note = _map(_shareNotes[index]);
        final id = int.tryParse(note['id']?.toString() ?? '');
        final active = id != null && id == _selectedNoteId;
        return _sharePickTile(
          active: active,
          icon: Icons.description_outlined,
          title: _text(note['title'], fallback: 'Untitled Note'),
          subtitle: _text(note['updated_at']?.toString().split('T').first),
          onTap: () => setSheet(() => _selectedNoteId = id),
        );
      },
    );
  }

  Widget _shareFilesList(StateSetter setSheet) {
    if (_shareFiles.isEmpty) {
      return Center(child: Text('No files available to share.', style: TextStyle(color: Colors.grey.shade500)));
    }

    return ListView.builder(
      shrinkWrap: true,
      itemCount: _shareFiles.length,
      itemBuilder: (_, index) {
        final file = _map(_shareFiles[index]);
        final id = int.tryParse(file['id']?.toString() ?? '');
        final active = id != null && id == _selectedFileId;
        return _sharePickTile(
          active: active,
          icon: Icons.insert_drive_file_outlined,
          title: _text(file['original_name'], fallback: 'Untitled file'),
          subtitle: _fmtSize(file['size']),
          onTap: () => setSheet(() => _selectedFileId = id),
        );
      },
    );
  }

  Widget _sharePickTile({
    required bool active,
    required IconData icon,
    required String title,
    required String subtitle,
    required VoidCallback onTap,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      decoration: BoxDecoration(
        color: active ? const Color(0xFFEFF6FF) : Colors.white,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: active ? const Color(0xFF4F46E5) : const Color(0xFFE5E7EB), width: active ? 2 : 1),
      ),
      child: ListTile(
        dense: true,
        leading: Icon(icon, color: active ? const Color(0xFF4F46E5) : Colors.grey.shade500),
        title: Text(title, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w700)),
        subtitle: subtitle.isEmpty ? null : Text(subtitle, maxLines: 1, overflow: TextOverflow.ellipsis),
        trailing: active ? const Icon(Icons.check_circle, color: Color(0xFF4F46E5)) : null,
        onTap: onTap,
      ),
    );
  }

  Future<bool> _shareSelected(dynamic friendId) async {
    try {
      if (_shareTab == 'note') {
        await ApiService.post('/notes/$_selectedNoteId/share', body: {
          'user_id': friendId,
          'permission': 'view',
        });
        _msg('Note shared.', Colors.green);
      } else {
        await ApiService.post('/files/$_selectedFileId/share', body: {'user_id': friendId});
        _msg('File shared.', Colors.green);
      }
      return true;
    } catch (error, stackTrace) {
      if (mounted) AppErrorHandler.show(error, context: context, stackTrace: stackTrace);
      return false;
    }
  }

  Future<void> _runAction(Future<void> Function() action, String successMessage, Color color) async {
    if (_actionBusy) return;
    setState(() => _actionBusy = true);
    try {
      await action();
      _msg(successMessage, color);
      await _fetch(showSpinner: false);
    } catch (error, stackTrace) {
      if (mounted) AppErrorHandler.show(error, context: context, stackTrace: stackTrace);
    } finally {
      if (mounted) setState(() => _actionBusy = false);
    }
  }

  void _msg(String text, Color color) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(text), backgroundColor: color));
  }

  Widget _emptyState(IconData icon, String message) {
    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      children: [
        const SizedBox(height: 120),
        Icon(icon, size: 64, color: Colors.grey.shade300),
        const SizedBox(height: 12),
        Center(child: Text(message)),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Friends', style: TextStyle(fontWeight: FontWeight.w700)),
        bottom: TabBar(
          controller: _tab,
          tabs: [
            Tab(text: 'Friends (${_friends.length})'),
            Tab(text: 'Requests (${_received.length})'),
            const Tab(text: 'Add'),
          ],
        ),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : TabBarView(
              controller: _tab,
              children: [
                RefreshIndicator(
                  onRefresh: () => _fetch(showSpinner: false),
                  child: _friends.isEmpty
                      ? _emptyState(Icons.people_outline, 'No friends yet')
                      : ListView.builder(
                          padding: const EdgeInsets.all(12),
                          itemCount: _friends.length,
                          itemBuilder: (_, i) {
                            final friend = _map(_friends[i]);
                            final name = _text(friend['name'], fallback: 'Unknown user');
                            final username = _text(friend['username']);

                            return Card(
                              margin: const EdgeInsets.only(bottom: 8),
                              child: ListTile(
                                leading: CircleAvatar(
                                  backgroundColor: Colors.indigo.shade100,
                                  child: Text(
                                    _initial(name),
                                    style: TextStyle(
                                      color: Colors.indigo.shade700,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ),
                                title: Text(name, style: const TextStyle(fontWeight: FontWeight.w600)),
                                subtitle: Text('@$username', style: TextStyle(color: Colors.grey.shade500, fontSize: 13)),
                                trailing: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    IconButton(
                                      tooltip: 'Share',
                                      icon: const Icon(Icons.ios_share_outlined),
                                      onPressed: _sharing ? null : () => _openShareSheet(friend),
                                    ),
                                    PopupMenuButton<String>(
                                      onSelected: (value) async {
                                        if (value != 'remove') return;
                                        final confirm = await showDialog<bool>(
                                          context: context,
                                          builder: (c) => AlertDialog(
                                            title: const Text('Remove friend?'),
                                            content: Text('Remove @$username?'),
                                            actions: [
                                              TextButton(onPressed: () => Navigator.pop(c, false), child: const Text('Cancel')),
                                              TextButton(
                                                onPressed: () => Navigator.pop(c, true),
                                                child: const Text('Remove', style: TextStyle(color: Colors.red)),
                                              ),
                                            ],
                                          ),
                                        );
                                        if (confirm == true) {
                                          await _runAction(
                                            () => ApiService.delete('/friends/${friend['id']}'),
                                            'Removed',
                                            Colors.orange,
                                          );
                                        }
                                      },
                                      itemBuilder: (_) => const [
                                        PopupMenuItem(value: 'remove', child: Text('Remove friend')),
                                      ],
                                    ),
                                  ],
                                ),
                              ),
                            );
                          },
                        ),
                ),
                RefreshIndicator(
                  onRefresh: () => _fetch(showSpinner: false),
                  child: ListView(
                    physics: const AlwaysScrollableScrollPhysics(),
                    padding: const EdgeInsets.all(12),
                    children: [
                      if (_received.isNotEmpty) ...[
                        Padding(
                          padding: const EdgeInsets.only(bottom: 8),
                          child: Text('Received (${_received.length})', style: const TextStyle(fontWeight: FontWeight.w700)),
                        ),
                        ..._received.map((request) {
                          final item = _map(request);
                          final sender = _map(item['sender']);
                          final name = _text(sender['name'], fallback: 'Unknown user');
                          final username = _text(sender['username']);

                          return Card(
                            margin: const EdgeInsets.only(bottom: 8),
                            child: ListTile(
                              leading: CircleAvatar(
                                backgroundColor: Colors.blue.shade100,
                                child: Text(
                                  _initial(name),
                                  style: TextStyle(color: Colors.blue.shade700, fontWeight: FontWeight.bold),
                                ),
                              ),
                              title: Text(name, style: const TextStyle(fontWeight: FontWeight.w600)),
                              subtitle: Text('@$username', style: TextStyle(fontSize: 13, color: Colors.grey.shade500)),
                              trailing: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  IconButton(
                                    icon: const Icon(Icons.check_circle, color: Colors.green),
                                    onPressed: _actionBusy
                                        ? null
                                        : () => _runAction(
                                              () => ApiService.put('/friends/accept/${item['id']}'),
                                              'Accepted!',
                                              Colors.green,
                                            ),
                                  ),
                                  IconButton(
                                    icon: const Icon(Icons.cancel, color: Colors.red),
                                    onPressed: _actionBusy
                                        ? null
                                        : () => _runAction(
                                              () => ApiService.put('/friends/reject/${item['id']}'),
                                              'Rejected',
                                              Colors.orange,
                                            ),
                                  ),
                                ],
                              ),
                            ),
                          );
                        }),
                      ],
                      if (_sent.isNotEmpty) ...[
                        Padding(
                          padding: const EdgeInsets.symmetric(vertical: 8),
                          child: Text('Sent (${_sent.length})', style: const TextStyle(fontWeight: FontWeight.w700)),
                        ),
                        ..._sent.map((request) {
                          final item = _map(request);
                          final receiver = _map(item['receiver']);
                          final name = _text(receiver['name'], fallback: 'Unknown user');
                          final username = _text(receiver['username']);

                          return Card(
                            margin: const EdgeInsets.only(bottom: 8),
                            child: ListTile(
                              leading: CircleAvatar(
                                backgroundColor: Colors.grey.shade200,
                                child: Text(_initial(name)),
                              ),
                              title: Text(name),
                              subtitle: Text('@$username - Pending', style: TextStyle(fontSize: 13, color: Colors.grey.shade500)),
                              trailing: IconButton(
                                tooltip: 'Cancel request',
                                icon: const Icon(Icons.close, color: Colors.red),
                                onPressed: _actionBusy
                                    ? null
                                    : () => _runAction(
                                          () => ApiService.delete('/friends/request/${item['id']}'),
                                          'Request cancelled',
                                          Colors.orange,
                                        ),
                              ),
                            ),
                          );
                        }),
                      ],
                      if (_received.isEmpty && _sent.isEmpty)
                        const Padding(
                          padding: EdgeInsets.all(48),
                          child: Center(child: Text('No requests')),
                        ),
                    ],
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.all(24),
                  child: SingleChildScrollView(
                    child: Column(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(20),
                          decoration: BoxDecoration(color: Colors.indigo.shade50, borderRadius: BorderRadius.circular(20)),
                          child: const Icon(Icons.person_add, size: 48, color: Color(0xFF4F46E5)),
                        ),
                        const SizedBox(height: 20),
                        const Text('Add Friend', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 20)),
                        const SizedBox(height: 8),
                        Text('Enter a username or search by name.', style: TextStyle(color: Colors.grey.shade500, fontSize: 14)),
                        const SizedBox(height: 24),
                        TextField(
                          controller: _uCtrl,
                          decoration: const InputDecoration(
                            labelText: 'Username',
                            prefixIcon: Icon(Icons.alternate_email),
                            hintText: 'e.g. johndoe',
                          ),
                          onChanged: (value) {
                            final cleaned = value.toLowerCase().replaceAll(RegExp(r'[^a-z0-9_-]'), '');
                            if (cleaned == value) return;
                            _uCtrl.value = TextEditingValue(
                              text: cleaned,
                              selection: TextSelection.collapsed(offset: cleaned.length),
                            );
                          },
                          onSubmitted: (_) => _send(),
                        ),
                        const SizedBox(height: 16),
                        SizedBox(
                          width: double.infinity,
                          child: ElevatedButton(
                            onPressed: _sending ? null : _send,
                            child: _sending
                                ? const SizedBox(
                                    width: 20,
                                    height: 20,
                                    child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                                  )
                                : const Text('Send Friend Request'),
                          ),
                        ),
                        const SizedBox(height: 24),
                        const Divider(),
                        const SizedBox(height: 18),
                        TextField(
                          controller: _searchCtrl,
                          decoration: InputDecoration(
                            labelText: 'Search users',
                            prefixIcon: const Icon(Icons.search),
                            suffixIcon: _searching
                                ? const Padding(
                                    padding: EdgeInsets.all(14),
                                    child: SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2)),
                                  )
                                : IconButton(icon: const Icon(Icons.arrow_forward), onPressed: _searchUsers),
                          ),
                          onSubmitted: (_) => _searchUsers(),
                        ),
                        const SizedBox(height: 12),
                        ..._searchResults.map((result) {
                          final user = _map(result);
                          final relationship = _text(user['relationship'], fallback: 'none');
                          final username = _text(user['username']);
                          return Card(
                            margin: const EdgeInsets.only(bottom: 8),
                            child: ListTile(
                              leading: CircleAvatar(
                                backgroundColor: Colors.indigo.shade100,
                                child: Text(_initial(user['name']), style: TextStyle(color: Colors.indigo.shade700, fontWeight: FontWeight.bold)),
                              ),
                              title: Text(_text(user['name'], fallback: 'Unknown user'), style: const TextStyle(fontWeight: FontWeight.w700)),
                              subtitle: Text('@$username · $relationship', style: TextStyle(color: Colors.grey.shade500, fontSize: 13)),
                              trailing: relationship == 'none'
                                  ? TextButton(
                                      onPressed: _sending
                                          ? null
                                          : () async {
                                              _uCtrl.text = username;
                                              await _send();
                                              await _searchUsers();
                                            },
                                      child: const Text('Add'),
                                    )
                                  : null,
                            ),
                          );
                        }),
                      ],
                    ),
                  ),
                ),
              ],
            ),
    );
  }
}
