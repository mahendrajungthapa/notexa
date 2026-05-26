export async function recognizeImageText(image: File | string, onProgress?: (progress: number) => void) {
  if (typeof window === 'undefined') {
    throw new Error('Browser OCR can only run in the browser.');
  }

  const { createWorker } = await import('tesseract.js');
  const worker = await createWorker('eng', 1, {
    logger: (message: any) => {
      if (message?.status === 'recognizing text' && typeof message.progress === 'number') {
        onProgress?.(message.progress);
      }
    },
  });

  try {
    const result = await worker.recognize(image as any);
    const text = String(result.data?.text || '').trim();

    if (!text) {
      throw new Error('No readable text was found in this image.');
    }

    return text;
  } finally {
    await worker.terminate();
  }
}
