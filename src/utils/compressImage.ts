// Client-side image compression for document uploads.
//
// The production API runs as a Vercel serverless function, which rejects any
// request body over ~4.5 MB (HTTP 413) — a limit that cannot be raised. Phone
// photos are routinely 2–6 MB each, so we downscale and re-encode images in
// the browser before attaching them. PDFs pass through untouched.

const MAX_DIMENSION = 1600;
const SKIP_BELOW_BYTES = 700 * 1024; // already small enough — don't touch

export async function compressImageFile(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) return file;
  if (file.size <= SKIP_BELOW_BYTES) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', 0.8)
    );
    if (!blob || blob.size >= file.size) return file;
    const name = file.name.replace(/\.(png|jpe?g|webp)$/i, '') + '.jpg';
    return new File([blob], name, { type: 'image/jpeg' });
  } catch {
    // Compression is best-effort — fall back to the original file.
    return file;
  }
}
