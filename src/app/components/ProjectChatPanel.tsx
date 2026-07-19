import { useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Send, Paperclip, Image, Film, FileText, Video, MessageSquare, Loader2 } from 'lucide-react';
import { MessageContent, getAttachmentKind, MAX_ATTACHMENT_BYTES, type ChatMessage } from './ChatMessage';
import { UserAvatar } from './UserAvatar';
import { DocumentAnalysisPanel } from './DocumentAnalysisPanel';
import { compressImageFile, estimateDataUrlBytes } from '../utils/compressImage';
import type { Role } from '../types';

interface ChatPartner {
  name: string;
  role: Role;
  universityId?: string;
  profileImageUrl?: string | null;
}

interface ProjectChatPanelProps {
  projectId: number;
  projectTitle: string;
  messages: ChatMessage[];
  userId?: number;
  userRole?: Role;
  partner: ChatPartner;
  newMessage: string;
  pendingFile: { name: string; type: 'image' | 'video' | 'file'; data: string } | null;
  sending: boolean;
  onMessageChange: (v: string) => void;
  onSend: () => void;
  onFilePick: (file: { name: string; type: 'image' | 'video' | 'file'; data: string } | null) => void;
  onError: (msg: string) => void;
  chatEndRef: React.RefObject<HTMLDivElement | null>;
}

export function ProjectChatPanel({
  projectId, projectTitle, messages, userId, userRole, partner,
  newMessage, pendingFile, sending, onMessageChange, onSend, onFilePick, onError, chatEndRef,
}: ProjectChatPanelProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const [compressing, setCompressing] = useState(false);
  const videoRoom = `https://meet.jit.si/ProjectHub-${projectId}`;

  const isStudent = userRole === 'student';
  const headerLabel = userRole === 'admin'
    ? 'Official Communication (University Admin · Remote Admin)'
    : `Direct conversation — ${isStudent ? 'Your Teacher' : 'Your Student'}: ${partner.name}`;

  const pickFile = async (file: File | undefined, forcedType?: 'image' | 'video' | 'file') => {
    if (!file) return;
    const kind = forcedType || getAttachmentKind(file);
    if (!kind) {
      onError('Unsupported file type');
      return;
    }

    onError('');
    if (kind === 'image') {
      setCompressing(true);
      try {
        const { dataUrl, name } = await compressImageFile(file);
        if (estimateDataUrlBytes(dataUrl) > MAX_ATTACHMENT_BYTES) {
          onError('Image still too large after compression — try a smaller photo');
          return;
        }
        onFilePick({ name, type: 'image', data: dataUrl });
      } catch {
        onError('Could not process image — try JPG or PNG');
      } finally {
        setCompressing(false);
      }
      return;
    }

    if (file.size > MAX_ATTACHMENT_BYTES) {
      onError('File too large — maximum 4MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => onFilePick({ name: file.name, type: kind, data: String(reader.result) });
    reader.readAsDataURL(file);
  };

  return (
    <div id="chat" className="bg-white rounded-xl border overflow-hidden shadow-sm scroll-mt-4">
      <div className="px-4 sm:px-5 py-3 border-b bg-gradient-to-r from-blue-50 to-green-50">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <UserAvatar
              firstName={partner.name.split(' ')[0]}
              lastName={partner.name.split(' ').slice(1).join(' ')}
              profileImageUrl={partner.profileImageUrl}
              role={partner.role}
              size="sm"
            />
            <div>
              <div className="flex items-center gap-2">
                <MessageSquare size={16} className="text-blue-600" />
                <h3 className="font-bold text-sm">{headerLabel}</h3>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                {projectTitle}
                {partner.universityId && ` · ${partner.universityId}`}
              </p>
            </div>
          </div>
          <a href={videoRoom} target="_blank" rel="noreferrer"
            className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-purple-600 text-white text-xs font-semibold hover:bg-purple-700">
            <Video size={14} /> Start Video Call
          </a>
        </div>
        <p className="text-[11px] text-gray-400 mt-2">
          Send text, project images, videos, and files. Photos are compressed automatically before upload.
        </p>
      </div>

      <div className="h-72 sm:h-96 overflow-y-auto p-4 space-y-3 bg-gray-50/50">
        {messages.length === 0 && (
          <p className="text-center text-sm text-gray-400 py-8">
            No messages yet. Say hello, share a project image, video, or file.
          </p>
        )}
        {messages.map(m => {
          const isMine = m.SenderId === userId;
          const showAi = !isMine && (userRole === 'teacher' || userRole === 'admin') && m.documentAnalysis;
          return (
            <div key={m.MessageId} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] sm:max-w-[75%] space-y-2 ${isMine ? '' : ''}`}>
                <div className={`px-3 py-2 rounded-2xl text-sm ${
                  isMine ? 'bg-green-600 text-white rounded-br-md' : 'bg-white border rounded-bl-md shadow-sm'
                }`}>
                  {!isMine && (
                    <p className="text-[10px] font-bold opacity-70 mb-1">
                      {m.SenderName}
                      {m.SenderRole !== 'admin' && ` (${m.SenderRole})`}
                    </p>
                  )}
                  <MessageContent message={m} isMine={isMine} />
                  <p className={`text-[10px] mt-1.5 ${isMine ? 'text-green-100' : 'text-gray-400'}`}>
                    {new Date(m.SentAt).toLocaleString()}
                  </p>
                </div>
                {showAi && (
                  <DocumentAnalysisPanel analysis={m.documentAnalysis as never} compact teacherOnly />
                )}
              </div>
            </div>
          );
        })}
        <div ref={chatEndRef} />
      </div>

      {pendingFile && (
        <div className="px-3 py-2 border-t bg-blue-50 flex items-center justify-between text-xs">
          <span className="flex items-center gap-2 text-blue-800 font-medium">
            {pendingFile.type === 'image' && <Image size={14} />}
            {pendingFile.type === 'video' && <Film size={14} />}
            {pendingFile.type === 'file' && <FileText size={14} />}
            {pendingFile.name}
          </span>
          <button type="button" onClick={() => onFilePick(null)} className="text-red-600 font-semibold">Remove</button>
        </div>
      )}

      <div className="p-3 border-t space-y-2">
        <div className="flex gap-1.5 flex-wrap">
          <input ref={imageRef} type="file" accept="image/*" className="hidden"
            onChange={e => { pickFile(e.target.files?.[0], 'image'); e.target.value = ''; }} />
          <input ref={videoRef} type="file" accept="video/*" className="hidden"
            onChange={e => { pickFile(e.target.files?.[0], 'video'); e.target.value = ''; }} />
          <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.zip,application/*" className="hidden"
            onChange={e => { pickFile(e.target.files?.[0], 'file'); e.target.value = ''; }} />
          <button type="button" onClick={() => imageRef.current?.click()} disabled={compressing}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50">
            {compressing ? <Loader2 size={14} className="animate-spin" /> : <Image size={14} />}
            {compressing ? 'Compressing…' : 'Image'}
          </button>
          <button type="button" onClick={() => videoRef.current?.click()}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-semibold text-gray-600 hover:bg-gray-50">
            <Film size={14} /> Video
          </button>
          <button type="button" onClick={() => fileRef.current?.click()}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-semibold text-gray-600 hover:bg-gray-50">
            <FileText size={14} /> File
          </button>
          <button type="button" onClick={() => fileRef.current?.click()}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-semibold text-gray-600 hover:bg-gray-50">
            <Paperclip size={14} /> Attach
          </button>
        </div>
        <div className="flex gap-2">
          <input value={newMessage} onChange={e => onMessageChange(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && onSend()}
            placeholder="Write a message about your project..."
            className="flex-1 px-3 py-2 rounded-xl border text-sm min-w-0" />
          <motion.button whileTap={{ scale: 0.95 }} onClick={onSend} disabled={sending}
            className="px-4 py-2 rounded-xl bg-blue-600 text-white disabled:opacity-50">
            <Send size={16} />
          </motion.button>
        </div>
      </div>
    </div>
  );
}
