import { useState } from 'react';
import toast from 'react-hot-toast';
import { api, extractApiError, fileUrl } from '../api/client';
import { UploadedFile } from '../types';

/**
 * Opens an uploaded document. Files in the private Blob store are fetched
 * through the authenticated /api/files proxy; legacy uploads that live on a
 * public store still open directly.
 */
export function FileLink({ label, file }: { label: string; file: UploadedFile }) {
  const [busy, setBusy] = useState(false);

  const open = async () => {
    if (/\.public\.blob\.vercel-storage\.com/.test(file.path || '')) {
      window.open(fileUrl(file.path), '_blank', 'noopener');
      return;
    }
    // Open the tab synchronously (inside the click gesture) so popup
    // blockers don't eat it, then point it at the fetched blob.
    const popup = window.open('about:blank', '_blank');
    setBusy(true);
    try {
      const res = await api.get('/files', {
        params: { path: file.filename || file.path },
        responseType: 'blob',
      });
      const url = URL.createObjectURL(res.data as Blob);
      if (popup) {
        popup.location.href = url;
      } else {
        const a = document.createElement('a');
        a.href = url;
        a.download = file.originalName || label;
        a.click();
      }
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err) {
      popup?.close();
      toast.error(extractApiError(err, `Could not open ${label}`));
    } finally {
      setBusy(false);
    }
  };

  return (
    <button type="button" className="btn btn-secondary" onClick={open} disabled={busy}>
      {busy ? 'Opening…' : label}
    </button>
  );
}
