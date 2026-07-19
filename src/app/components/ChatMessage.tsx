import { Shield } from 'lucide-react';
import { ADMIN_BADGE_SUBTITLE, ADMIN_BADGE_TITLE } from '../utils/exportReport';

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

export function MessageContent({ message, isMine }: { message: ChatMessage; isMine: boolean }) {
  const { AttachmentType, AttachmentName, AttachmentData, Content } = message;

  return (
    <div className="space-y-2">
      {message.SenderRole === 'admin' && !isMine && (
        <AdminBadge compact />
      )}
      {AttachmentData && AttachmentType === 'image' && (
        <a href={AttachmentData} target="_blank" rel="noreferrer" className="block">
          <img src={AttachmentData} alt={AttachmentName || 'Image'} className="max-w-full max-h-48 rounded-lg border" />
        </a>
      )}
      {AttachmentData && AttachmentType === 'video' && (
        <video controls className="max-w-full max-h-48 rounded-lg border" src={AttachmentData}>
          <track kind="captions" />
        </video>
      )}
      {AttachmentData && AttachmentType === 'file' && (
        <a href={AttachmentData} download={AttachmentName || 'file'}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold ${
            isMine ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-800'
          }`}>
          📎 {AttachmentName || 'Download file'}
        </a>
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

export const MAX_ATTACHMENT_BYTES = 4_000_000;
