import { useState } from 'react';
import { Download, Eye, FileText, Loader2 } from 'lucide-react';
import { downloadAttachment, isPdfAttachment, openAttachmentReview } from '../utils/pdfReview';

interface PdfReviewActionsProps {
  name: string;
  data?: string | null;
  label?: string;
  loadFile?: () => Promise<{ name: string; data: string }>;
}

export function PdfReviewActions({ name, data, label, loadFile }: PdfReviewActionsProps) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<'review' | 'download' | null>(null);
  const fileName = name || 'Student assignment.pdf';
  const pdf = isPdfAttachment(fileName, data || '');
  const kind = pdf ? 'PDF' : (fileName.split('.').pop() || 'FILE').toUpperCase();

  const resolveFile = async () => {
    if (data) return { name: fileName, data };
    if (!loadFile) throw new Error('This file is not available yet.');
    return loadFile();
  };

  const review = async () => {
    setError('');
    setBusy('review');
    try {
      const file = await resolveFile();
      openAttachmentReview(file.name || fileName, file.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not open this file.');
    } finally {
      setBusy(null);
    }
  };

  const download = async () => {
    setError('');
    setBusy('download');
    try {
      const file = await resolveFile();
      downloadAttachment(file.name || fileName, file.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not download this file.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="pdf-review-actions">
      <div className="pdf-review-actions__file">
        <span className="pdf-review-actions__badge" aria-hidden>
          <FileText size={16} />
          <em>{kind}</em>
        </span>
        <div>
          <strong>{fileName}</strong>
          <p>{label || (pdf ? 'Student assignment · PDF' : 'Student assignment')}</p>
        </div>
      </div>
      <div className="pdf-review-actions__btns">
        <button
          type="button"
          className="pdf-review-actions__btn pdf-review-actions__btn--review"
          onClick={() => void review()}
          disabled={Boolean(busy)}
        >
          {busy === 'review' ? <Loader2 size={16} className="animate-spin" /> : <Eye size={16} />}
          <span>{busy === 'review' ? 'Opening…' : `Review ${kind}`}</span>
        </button>
        <button
          type="button"
          className="pdf-review-actions__btn"
          onClick={() => void download()}
          disabled={Boolean(busy)}
          title="Download only if you need a copy"
        >
          {busy === 'download' ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
          <span>Download</span>
        </button>
      </div>
      {error && <p className="pdf-review-actions__error">{error}</p>}
    </div>
  );
}
