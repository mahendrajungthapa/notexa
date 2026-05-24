import 'package:flutter/material.dart';
import 'package:file_picker/file_picker.dart';
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

  @override
  void initState() {
    super.initState();
    _fetch();
  }

  Future<void> _fetch() async {
    try {
      final r = await ApiService.get('/files');
      if (mounted) setState(() => _files = r['data']?['data'] ?? []);
    } catch (error, stackTrace) {
      if (mounted)
        AppErrorHandler.show(error, context: context, stackTrace: stackTrace);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _upload() async {
    final result = await FilePicker.platform.pickFiles();
    if (result == null || result.files.single.path == null) return;
    setState(() => _uploading = true);
    try {
      await ApiService.uploadFile('/files/upload', result.files.single.path!);
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
          content: Text('Uploaded!'), backgroundColor: Colors.green));
      _fetch();
    } catch (error, stackTrace) {
      if (mounted)
        AppErrorHandler.show(error, context: context, stackTrace: stackTrace);
    } finally {
      if (mounted) setState(() => _uploading = false);
    }
  }

  void _openFile(Map<String, dynamic> f) async {
    final mime = f['mime_type'] ?? '';
    final name = (f['original_name'] ?? '') as String;
    final ext = name.split('.').last.toLowerCase();

    try {
      final r = await ApiService.get('/files/${f['id']}/download');
      final url = r['download_url'] as String;

      if (!mounted) return;

      final isPdf = mime.contains('pdf') || ext == 'pdf';
      final isImage = mime.startsWith('image/') ||
          ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].contains(ext);

      if (isPdf) {
        Navigator.push(
            context,
            MaterialPageRoute(
              builder: (_) => PdfViewerScreen(title: name, url: url),
            ));
      } else if (isImage) {
        Navigator.push(
            context,
            MaterialPageRoute(
              builder: (_) => _ImageViewerScreen(title: name, url: url),
            ));
      } else {
        await launchUrl(Uri.parse(url));
      }
    } catch (error, stackTrace) {
      if (mounted)
        AppErrorHandler.show(error, context: context, stackTrace: stackTrace);
    }
  }

  String _fmtSize(int b) {
    if (b >= 1048576) return '${(b / 1048576).toStringAsFixed(1)} MB';
    if (b >= 1024) return '${(b / 1024).toStringAsFixed(0)} KB';
    return '$b B';
  }

  IconData _fileIcon(String mime) {
    if (mime.startsWith('image/')) return Icons.image;
    if (mime.contains('pdf')) return Icons.picture_as_pdf;
    return Icons.insert_drive_file;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
          title: const Text('My Files',
              style: TextStyle(fontWeight: FontWeight.w700)),
          actions: [
            IconButton(
                icon: _uploading
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(strokeWidth: 2))
                    : const Icon(Icons.upload),
                onPressed: _uploading ? null : _upload)
          ]),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _files.isEmpty
              ? const Center(
                  child: Column(mainAxisSize: MainAxisSize.min, children: [
                  Icon(Icons.folder_outlined, size: 64, color: Colors.grey),
                  SizedBox(height: 12),
                  Text('No files')
                ]))
              : RefreshIndicator(
                  onRefresh: _fetch,
                  child: ListView.builder(
                      padding: const EdgeInsets.all(16),
                      itemCount: _files.length,
                      itemBuilder: (_, i) {
                        final f = _files[i];
                        return Card(
                            margin: const EdgeInsets.only(bottom: 8),
                            child: ListTile(
                              onTap: () => _openFile(
                                  Map<String, dynamic>.from(f)), // ← added
                              leading: Icon(_fileIcon(f['mime_type'] ?? ''),
                                  color: Colors.indigo),
                              title: Text(f['original_name'] ?? '',
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(
                                      fontWeight: FontWeight.w600,
                                      fontSize: 14)),
                              subtitle: Text(
                                  '${_fmtSize(f['size'] ?? 0)} · ${f['created_at']?.toString().substring(0, 10) ?? ''}',
                                  style: TextStyle(
                                      fontSize: 12,
                                      color: Colors.grey.shade500)),
                              trailing: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    IconButton(
                                        icon: const Icon(Icons.download,
                                            size: 20),
                                        onPressed: () async {
                                          try {
                                            final r = await ApiService.get(
                                                '/files/${f['id']}/download');
                                            final opened = await launchUrl(
                                                Uri.parse(r['download_url']));
                                            if (!opened)
                                              throw Exception(
                                                  'Could not open the download link.');
                                          } catch (error, stackTrace) {
                                            if (mounted)
                                              AppErrorHandler.show(error,
                                                  context: context,
                                                  stackTrace: stackTrace);
                                          }
                                        }),
                                    IconButton(
                                        icon: const Icon(Icons.delete_outline,
                                            size: 20, color: Colors.red),
                                        onPressed: () async {
                                          try {
                                            await ApiService.delete(
                                                '/files/${f['id']}');
                                            _fetch();
                                          } catch (error, stackTrace) {
                                            if (mounted)
                                              AppErrorHandler.show(error,
                                                  context: context,
                                                  stackTrace: stackTrace);
                                          }
                                        }),
                                  ]),
                            ));
                      })),
    );
  }
}

class _ImageViewerScreen extends StatelessWidget {
  final String title;
  final String url;

  const _ImageViewerScreen({required this.title, required this.url});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black,
        iconTheme: const IconThemeData(color: Colors.white),
        title: Text(title,
            style: const TextStyle(color: Colors.white),
            maxLines: 1,
            overflow: TextOverflow.ellipsis),
      ),
      body: InteractiveViewer(
        child: Center(
          child: Image.network(
            url,
            fit: BoxFit.contain,
            loadingBuilder: (_, child, progress) => progress == null
                ? child
                : const Center(
                    child: CircularProgressIndicator(color: Colors.white)),
            errorBuilder: (_, __, ___) => const Center(
              child: Icon(Icons.broken_image, color: Colors.white, size: 64),
            ),
          ),
        ),
      ),
    );
  }
}
