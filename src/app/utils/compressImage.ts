/**
 * Compress images client-side before chat upload (JPEG, max dimension, quality).
 */
export async function compressImageFile(
  file: File,
  maxWidth = 1280,
  maxHeight = 1280,
  quality = 0.72,
  maxBytes = 900_000,
): Promise<{ dataUrl: string; name: string }> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Not an image file');
  }

  const bitmap = await createImageBitmap(file);
  let { width, height } = bitmap;
  const ratio = Math.min(1, maxWidth / width, maxHeight / height);
  width = Math.round(width * ratio);
  height = Math.round(height * ratio);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not compress image');
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  let q = quality;
  let dataUrl = canvas.toDataURL('image/jpeg', q);
  while (dataUrl.length > maxBytes * 1.37 && q > 0.35) {
    q -= 0.08;
    dataUrl = canvas.toDataURL('image/jpeg', q);
  }

  const baseName = file.name.replace(/\.[^.]+$/, '') || 'photo';
  return { dataUrl, name: `${baseName}.jpg` };
}

export function estimateDataUrlBytes(dataUrl: string): number {
  const base64 = dataUrl.split(',')[1] || '';
  return Math.ceil((base64.length * 3) / 4);
}
