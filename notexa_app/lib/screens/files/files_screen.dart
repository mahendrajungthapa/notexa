import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../services/api_service.dart';
import '../../services/error_handler.dart';
import 'pdf_viewer_screen.dart';

class FilesScreen extends StatefulWidget {
  const FilesScreen({super.key});

  @override
  State<FilesScreen> createState() => _FilesScreenState();
}

class _FilesScreenState extends State<FilesScreen> {
  List<dynamic> _files = [];
  bool _loading = true;
  bool _uploading = false;
  int? _deletingId;

  @override
  void initState() {
    super.initState();
    _fetch();
  }

  Map<String, dynamic> _map(dynamic value) {
    if (value is Map<String, dynamic>) return value;
    if (value is Map) return value.map((key, val) => MapEntry(key.toString(), val));
    return <String, dynamic>{};
  }

  List<dynamic> _filesFromResponse(Map<String, dynamic> response) {
    final data = response['data'];
    if (data is Map && data['data'] is List) return List<dynamic>.from(data['data']);
    if (data is List) return List<dynamic>.from(data);
    return <dynamic>[];
  }

  Future<void> _fetch({bool showSpinner = true}) async {
    if (showSpinner && mounted) setState(() => _loading = true);
    try {
      final response = await ApiService.get('/files');
      if (mounted) setState(() => _files = _filesFromResponse(response));
    } catch (error, stackTrace) {
      if (mounted) AppErrorHandler.show(error, context: context, stackTrace: stackTrace);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _upload() async {
    final result = await FilePicker.platform.pickFiles(
      type: FileType.custom,
      allowedExtensions: ['pdf', 'doc', 'docx', 'png', 'jpg', 'jpeg', 'txt'],
    );
    if (result == null || result.files.single.path == null) return;

    setState(() => _uploading = true);
    try {
      await ApiService.uploadFile('/files/upload', result.files.single.path!);
      _message('File uploaded.', const Color(0xFF047857));
      await _fetch(showSpinner: false);
    } catch (error, stackTrace) {
      if (mounted) AppErrorHandler.show(error, context: context, stackTrace: stackTrace);
    } finally {
      if (mounted) setState(() => _uploading = false);
    }
  }

  Future<void> _openFile(Map<String, dynamic> file) async {
    try {
      final response = await ApiService.get('/files/${file['id']}/download');
      final url = response['download_url']?.toString();
      if (url == null || url.trim().isEmpty) {
        throw ApiException(statusCode: 0, message: 'The server did not return a download URL.');
      }

      final uri = ApiService.resolveUrl(url);
      if (_isPdf(file) && mounted) {
        await Navigator.push(
          context,
          MaterialPageRoute(
            builder: (_) => PdfViewerScreen(title: file['original_name'] ?? 'PDF', url: uri.toString()),
          ),
        );
        return;
      }

      final opened = await launchUrl(uri, mode: LaunchMode.externalApplication);
      if (!opened) throw ApiException(statusCode: 0, message: 'Could not open the download link.');
    } catch (error, stackTrace) {
      if (mounted) AppErrorHandler.show(error, context: context, stackTrace: stackTrace);
    }
  }

  Future<void> _deleteFile(Map<String, dynamic> file) async {
    final id = int.tryParse(file['id']?.toString() ?? '');
    if (id == null) return;

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete file?'),
        content: Text('Delete "${file['original_name'] ?? 'this file'}"?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Delete', style: TextStyle(color: Color(0xFFB91C1C))),
          ),
        ],
      ),
    );
    if (confirmed != true) return;

    setState(() => _deletingId = id);
    try {
      await ApiService.delete('/files/$id');
      _message('File deleted.', const Color(0xFFB45309));
      await _fetch(showSpinner: false);
    } catch (error, stackTrace) {
      if (mounted) AppErrorHandler.show(error, context: context, stackTrace: stackTrace);
    } finally {
      if (mounted) setState(() => _deletingId = null);
    }
  }

  void _message(String text, Color color) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(text), backgroundColor: color));
  }

  String _fmtSize(dynamic value) {
    final bytes = int.tryParse(value?.toString() ?? '') ?? 0;
    if (bytes >= 1048576) return '${(bytes / 1048576).toStringAsFixed(1)} MB';
    if (bytes >= 1024) return '${(bytes / 1024).toStringAsFixed(0)} KB';
    return '$bytes B';
  }

  IconData _fileIcon(Map<String, dynamic> file) {
    final mime = (file['mime_type'] ?? '').toString().toLowerCase();
    final name = (file['original_name'] ?? '').toString().toLowerCase();
    if (mime.startsWith('image/') || name.endsWith('.png') || name.endsWith('.jpg') || name.endsWith('.jpeg')) return Icons.image_outlined;
    if (_isPdf(file)) return Icons.picture_as_pdf_outlined;
    if (name.endsWith('.doc') || name.endsWith('.docx')) return Icons.description_outlined;
    return Icons.insert_drive_file_outlined;
  }

  bool _isPdf(Map<String, dynamic> file) {
    final mime = (file['mime_type'] ?? '').toString().toLowerCase();
    final name = (file['original_name'] ?? '').toString().toLowerCase();
    return mime.contains('pdf') || name.endsWith('.pdf');
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('My Files', style: TextStyle(fontWeight: FontWeight.w800)),
        actions: [
          IconButton(
            tooltip: 'Refresh',
            icon: const Icon(Icons.sync),
            onPressed: _loading ? null : () => _fetch(showSpinner: false),
          ),
          IconButton(
            tooltip: 'Upload',
            icon: _uploading
                ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2))
                : const Icon(Icons.upload_file_outlined),
            onPressed: _uploading ? null : _upload,
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _files.isEmpty
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(28),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.folder_outlined, size: 68, color: Colors.grey.shade300),
                        const SizedBox(height: 12),
                        const Text('No files yet', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
                        const SizedBox(height: 6),
                        Text('Upload PDFs, documents, images, and text files for your notes.', textAlign: TextAlign.center, style: TextStyle(color: Colors.grey.shade500)),
                        const SizedBox(height: 18),
                        ElevatedButton.icon(onPressed: _upload, icon: const Icon(Icons.upload_file), label: const Text('Upload file')),
                      ],
                    ),
                  ),
                )
              : RefreshIndicator(
                  onRefresh: () => _fetch(showSpinner: false),
                  child: ListView.builder(
                    physics: const AlwaysScrollableScrollPhysics(),
                    padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
                    itemCount: _files.length,
                    itemBuilder: (_, i) {
                      final file = _map(_files[i]);
                      final id = int.tryParse(file['id']?.toString() ?? '');
                      return Card(
                        margin: const EdgeInsets.only(bottom: 10),
                        child: ListTile(
                          contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                          leading: Container(
                            width: 42,
                            height: 42,
                            decoration: BoxDecoration(color: const Color(0xFFE0E7FF), borderRadius: BorderRadius.circular(8)),
                            child: Icon(_fileIcon(file), color: const Color(0xFF4F46E5)),
                          ),
                          title: Text(file['original_name'] ?? 'Untitled file', maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w700)),
                          subtitle: Text('${_fmtSize(file['size'])} · ${file['created_at']?.toString().split('T').first ?? ''}', style: TextStyle(fontSize: 12, color: Colors.grey.shade500)),
                          onTap: () => _openFile(file),
                          trailing: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              IconButton(
                                tooltip: _isPdf(file) ? 'View' : 'Open',
                                icon: Icon(_isPdf(file) ? Icons.visibility_outlined : Icons.open_in_new, size: 20),
                                onPressed: () => _openFile(file),
                              ),
                              IconButton(
                                tooltip: 'Delete',
                                icon: _deletingId == id
                                    ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2))
                                    : const Icon(Icons.delete_outline, size: 20, color: Color(0xFFB91C1C)),
                                onPressed: _deletingId == id ? null : () => _deleteFile(file),
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
                ),
    );
  }
}
