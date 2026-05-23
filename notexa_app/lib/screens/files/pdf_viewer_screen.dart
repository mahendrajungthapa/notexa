import 'dart:io';
import 'package:flutter/material.dart';
import 'package:syncfusion_flutter_pdfviewer/pdfviewer.dart';

class PdfViewerScreen extends StatelessWidget {
  final String title;
  final String? url;
  final String? filePath;

  const PdfViewerScreen({
    super.key,
    required this.title,
    this.url,
    this.filePath,
  });

  @override
  Widget build(BuildContext context) {
    final viewer = filePath != null
        ? SfPdfViewer.file(File(filePath!))
        : SfPdfViewer.network(url!);

    return Scaffold(
      appBar: AppBar(
        title: Text(title, maxLines: 1, overflow: TextOverflow.ellipsis),
      ),
      body: viewer,
    );
  }
}
