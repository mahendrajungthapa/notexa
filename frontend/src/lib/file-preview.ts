export async function createPreviewObjectUrl(previewUrl: string, fallbackMimeType = 'application/octet-stream') {
  const response = await fetch(previewUrl, {
    cache: 'no-store',
    credentials: 'omit',
  });

  if (!response.ok) {
    throw new Error('Failed to load preview content.');
  }

  const contentType = response.headers.get('content-type') || fallbackMimeType;
  const blob = await response.blob();
  const previewBlob = blob.type ? blob : new Blob([blob], { type: contentType });

  return URL.createObjectURL(previewBlob);
}
