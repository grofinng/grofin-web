import { useCallback, useEffect, useRef, useState } from 'react';
import { api, extractApiError, fileUrl } from '../api/client';
import { UploadedFile } from '../types';

export interface DocumentItem {
  /** Human label, e.g. "Valid ID". */
  label: string;
  file: UploadedFile;
}

function isPublicBlob(file: UploadedFile) {
  return /\.public\.blob\.vercel-storage\.com/.test(file.path || '');
}

export function isImageFile(file: UploadedFile) {
  return /^image\//i.test(file.mimetype || '') || /\.(png|jpe?g|gif|webp)$/i.test(file.originalName || '');
}

export function isPdfFile(file: UploadedFile) {
  return /pdf/i.test(file.mimetype || '') || /\.pdf$/i.test(file.originalName || '');
}

export function formatFileSize(bytes?: number) {
  if (!bytes || bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Resolves a URL the browser can render for an uploaded document. Files in
 * the private Blob store are fetched through the authenticated /api/files
 * proxy and exposed as an object URL; legacy public uploads are used as-is.
 */
async function resolveDocumentUrl(file: UploadedFile): Promise<{ url: string; objectUrl: boolean }> {
  if (isPublicBlob(file)) return { url: fileUrl(file.path), objectUrl: false };
  const res = await api.get('/files', {
    params: { path: file.filename || file.path },
    responseType: 'blob',
  });
  let blob = res.data as Blob;
  // The proxy may not always carry the content type through; the browser
  // needs it to render PDFs inline instead of downloading them.
  if (file.mimetype && blob.type !== file.mimetype) {
    blob = new Blob([blob], { type: file.mimetype });
  }
  return { url: URL.createObjectURL(blob), objectUrl: true };
}

interface LoadedDoc {
  url: string;
  objectUrl: boolean;
}

interface DocumentViewerProps {
  docs: DocumentItem[];
  index: number;
  onIndexChange: (next: number) => void;
  onClose: () => void;
}

/**
 * Full-screen modal that previews a document inline (images and PDFs) and
 * lets staff flip between every document attached to a request.
 */
export function DocumentViewer({ docs, index, onIndexChange, onClose }: DocumentViewerProps) {
  const [loaded, setLoaded] = useState<Record<number, LoadedDoc>>({});
  const [loadingIdx, setLoadingIdx] = useState<number | null>(null);
  const [errorIdx, setErrorIdx] = useState<Record<number, string>>({});
  const [zoomed, setZoomed] = useState(false);
  const loadedRef = useRef(loaded);
  loadedRef.current = loaded;

  const current = docs[index];
  const currentLoaded = loaded[index];

  // Lock background scroll + keyboard shortcuts while open.
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight' && index < docs.length - 1) onIndexChange(index + 1);
      if (e.key === 'ArrowLeft' && index > 0) onIndexChange(index - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose, onIndexChange, index, docs.length]);

  // Revoke any object URLs when the viewer unmounts.
  useEffect(() => {
    return () => {
      Object.values(loadedRef.current).forEach((d) => {
        if (d.objectUrl) URL.revokeObjectURL(d.url);
      });
    };
  }, []);

  const load = useCallback(
    async (i: number) => {
      const doc = docs[i];
      if (!doc || loadedRef.current[i]) return;
      setLoadingIdx(i);
      setErrorIdx((prev) => {
        const next = { ...prev };
        delete next[i];
        return next;
      });
      try {
        const result = await resolveDocumentUrl(doc.file);
        setLoaded((prev) => ({ ...prev, [i]: result }));
      } catch (err) {
        setErrorIdx((prev) => ({ ...prev, [i]: extractApiError(err, `Could not load ${doc.label}`) }));
      } finally {
        setLoadingIdx((cur) => (cur === i ? null : cur));
      }
    },
    [docs]
  );

  useEffect(() => {
    setZoomed(false);
    load(index);
  }, [index, load]);

  if (!current) return null;

  const file = current.file;
  const isImage = isImageFile(file);
  const isPdf = isPdfFile(file);
  const meta = [file.mimetype?.split('/').pop()?.toUpperCase(), formatFileSize(file.size)]
    .filter(Boolean)
    .join(' · ');

  return (
    <div
      className="doc-viewer-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={`${current.label} preview`}
      onClick={onClose}
    >
      <div className="doc-viewer" onClick={(e) => e.stopPropagation()}>
        <div className="doc-viewer-head">
          <div className="doc-viewer-title">
            <strong>{current.label}</strong>
            <span className="doc-viewer-meta">
              {file.originalName}
              {meta && ` · ${meta}`}
            </span>
          </div>
          <div className="doc-viewer-actions">
            {currentLoaded && (
              <>
                <a
                  className="btn btn-ghost btn-sm"
                  href={currentLoaded.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open in new tab
                </a>
                <a
                  className="btn btn-secondary btn-sm"
                  href={currentLoaded.url}
                  download={file.originalName || current.label}
                >
                  Download
                </a>
              </>
            )}
            <button type="button" className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Close preview">
              Close ✕
            </button>
          </div>
        </div>

        {docs.length > 1 && (
          <div className="doc-viewer-tabs" role="tablist">
            {docs.map((d, i) => (
              <button
                key={`${d.label}-${i}`}
                type="button"
                role="tab"
                aria-selected={i === index}
                className={`doc-viewer-tab ${i === index ? 'active' : ''}`}
                onClick={() => onIndexChange(i)}
              >
                {d.label}
              </button>
            ))}
          </div>
        )}

        <div className="doc-viewer-body">
          {loadingIdx === index && !currentLoaded ? (
            <div className="doc-viewer-state">
              <span className="spinner" />
              <span>Loading {current.label}…</span>
            </div>
          ) : errorIdx[index] ? (
            <div className="doc-viewer-state">
              <span>{errorIdx[index]}</span>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => load(index)}>
                Try again
              </button>
            </div>
          ) : currentLoaded ? (
            isImage ? (
              <img
                src={currentLoaded.url}
                alt={`${current.label} – ${file.originalName}`}
                className={zoomed ? 'zoomed' : ''}
                onClick={() => setZoomed((z) => !z)}
                title={zoomed ? 'Click to fit' : 'Click to zoom'}
              />
            ) : isPdf ? (
              <iframe src={currentLoaded.url} title={`${current.label} – ${file.originalName}`} />
            ) : (
              <div className="doc-viewer-state">
                <span>This file type can't be previewed here.</span>
                <a className="btn btn-secondary btn-sm" href={currentLoaded.url} download={file.originalName}>
                  Download {file.originalName}
                </a>
              </div>
            )
          ) : null}
        </div>

        {docs.length > 1 && (
          <div className="doc-viewer-foot">
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              disabled={index === 0}
              onClick={() => onIndexChange(index - 1)}
            >
              ← Previous
            </button>
            <span className="doc-viewer-meta">
              {index + 1} of {docs.length}
            </span>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              disabled={index === docs.length - 1}
              onClick={() => onIndexChange(index + 1)}
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Grid of document cards. Clicking a card opens the inline viewer at that
 * document, with the other documents reachable from inside the viewer.
 */
export function DocumentList({ docs, emptyText = 'No documents uploaded.' }: { docs: DocumentItem[]; emptyText?: string }) {
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const close = useCallback(() => setOpenIdx(null), []);

  if (docs.length === 0) {
    return <p className="review-empty">{emptyText}</p>;
  }

  return (
    <>
      <div className="doc-grid">
        {docs.map((d, i) => {
          const kind = isPdfFile(d.file) ? 'pdf' : isImageFile(d.file) ? 'image' : 'file';
          const size = formatFileSize(d.file.size);
          return (
            <button
              key={`${d.label}-${i}`}
              type="button"
              className="doc-card"
              onClick={() => setOpenIdx(i)}
              title={`View ${d.label}`}
            >
              <span className={`doc-card-icon ${kind}`} aria-hidden="true">
                {kind === 'pdf' ? 'PDF' : kind === 'image' ? 'IMG' : 'FILE'}
              </span>
              <span className="doc-card-body">
                <span className="doc-card-title">{d.label}</span>
                <span className="doc-card-meta">
                  {d.file.originalName || 'Untitled'}
                  {size && ` · ${size}`}
                </span>
              </span>
              <span className="doc-card-cta">View</span>
            </button>
          );
        })}
      </div>
      {openIdx !== null && (
        <DocumentViewer docs={docs} index={openIdx} onIndexChange={setOpenIdx} onClose={close} />
      )}
    </>
  );
}
