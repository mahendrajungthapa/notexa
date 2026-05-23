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
  bool _loading = true;
  bool _actionBusy = false;
  bool _sending = false;
  final _uCtrl = TextEditingController();

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
    super.dispose();
  }

  Map<String, dynamic> _map(dynamic value) {
    if (value is Map<String, dynamic>) return value;
    if (value is Map) return value.map((key, val) => MapEntry(key.toString(), val));
    return <String, dynamic>{};
  }

  List<dynamic> _list(dynamic value) => value is List ? List<dynamic>.from(value) : <dynamic>[];

  String _text(dynamic value, {String fallback = ''}) {
    final text = value?.toString().trim() ?? '';
    return text.isEmpty ? fallback : text;
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
                                onLongPress: () async {
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
                      Text('Enter their @username to send a request', style: TextStyle(color: Colors.grey.shade500, fontSize: 14)),
                      const SizedBox(height: 24),
                      TextField(
                        controller: _uCtrl,
                        decoration: const InputDecoration(
                          labelText: 'Username',
                          prefixIcon: Icon(Icons.alternate_email),
                          hintText: 'e.g. johndoe',
                        ),
                        onChanged: (value) {
                          final cleaned = value.toLowerCase().replaceAll(RegExp(r'[^a-z0-9_]'), '');
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
                    ],
                  ),
                ),
              ],
            ),
    );
  }
}
