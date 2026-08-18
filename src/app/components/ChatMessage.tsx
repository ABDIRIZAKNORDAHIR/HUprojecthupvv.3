import { Shield } from 'lucide-react';
import { ADMIN_BADGE_SUBTITLE, ADMIN_BADGE_TITLE } from '../utils/exportReport';
import { PdfReviewActions } from './PdfReviewActions';
import { isPdfAttachment } from '../utils/pdfReview';

export interface ChatMessage {
  MessageId: number;
  Content: string;
  SentAt: string;
  SenderId: number;
  SenderName: string;
  SenderRole: string;
  AttachmentType?: string | null;
  AttachmentName?: string | null;
  AttachmentData?: string | null;
  documentAnalysis?: Record<string, unknown> | null;
}

export function AdminBadge({ compact }: { compact?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full font-bold text-purple-700 bg-purple-100 border border-purple-200 ${
      compact ? 'px-1.5 py-0.5 text-[9px]' : 'px-2 py-0.5 text-[10px]'
    }`}>
      <Shield size={compact ? 10 : 11} />
      {ADMIN_BADGE_TITLE} · {ADMIN_BADGE_SUBTITLE}
    </span>
  );
}

const SAFE_IMAGE_PREFIXES = ['data:image/jpeg', 'data:image/png', 'data:image/gif', 'data:image/webp'];
const SAFE_VIDEO_PREFIXES = ['data:video/mp4', 'data:video/webm'];

function isSafeDataUrl(data: string | null | undefined, prefixes: string[]) {
  if (!data || typeof data !== 'string') return false;
  const lower = data.slice(0, 32).toLowerCase();
  return prefixes.some(prefix => lower.startsWith(prefix));
}

export function MessageContent({ message, isMine }: { message: ChatMessage; isMine: boolean }) {
  const { AttachmentType, AttachmentName, AttachmentData, Content } = message;
  const safeImage = AttachmentType === 'image' && isSafeDataUrl(AttachmentData, SAFE_IMAGE_PREFIXES);
  const safeVideo = AttachmentType === 'video' && isSafeDataUrl(AttachmentData, SAFE_VIDEO_PREFIXES);
  const safeFile = AttachmentType === 'file' && !!AttachmentData?.startsWith('data:') && !AttachmentData.toLowerCase().includes('svg');

  return (
    <div className="space-y-2">
      {message.SenderRole === 'admin' && !isMine && (
        <AdminBadge compact />
      )}
      {safeImage && (
        <a href={AttachmentData!} target="_blank" rel="noreferrer" className="block">
          <img src={AttachmentData!} alt={AttachmentName || 'Image'} className="max-w-full max-h-48 rounded-lg border" />
        </a>
      )}
      {safeVideo && (
        <video controls className="max-w-full max-h-48 rounded-lg border" src={AttachmentData!}>
          <track kind="captions" />
        </video>
      )}
      {safeFile && (
        isPdfAttachment(AttachmentName || '', AttachmentData) ? (
          <PdfReviewActions
            name={AttachmentName || 'Assignment.pdf'}
            data={AttachmentData!}
            label="PDF · open in a new tab to read"
          />
        ) : (
          <a href={AttachmentData!} download={AttachmentName || 'file'}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold ${
              isMine ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-800'
            }`}>
            📎 {AttachmentName || 'Download file'}
          </a>
        )
      )}
      {Content && <p className="whitespace-pre-wrap break-words">{Content}</p>}
    </div>
  );
}

export function getAttachmentKind(file: File): 'image' | 'video' | 'file' | null {
  if (file.type.startsWith('image/')) return 'image';
  if (file.type.startsWith('video/')) return 'video';
  return 'file';
}

// Base64 adds roughly 33% and messages are sent inside a JSON body capped at 2 MB.
export const MAX_ATTACHMENT_BYTES = 1_250_000;
export const MAX_ATTACHMENT_LABEL = '1.25 MB';
