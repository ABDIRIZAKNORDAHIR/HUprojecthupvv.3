import { useEffect, useState, useRef, useCallback } from 'react';
import { useLocation } from 'react-router';
import { motion } from 'motion/react';
import { MessageSquare, Search, Users, UserPlus, Send, Paperclip, Loader2, Wifi, WifiOff } from 'lucide-react';
import { api, type User } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { UserProfileModal } from '../components/UserProfileModal';
import { UserAvatar } from '../components/UserAvatar';
import { PageHero } from '../components/PageHero';
import { APP_IMAGES } from '../config/appImages';
import { useRealtimeSocket } from '../hooks/useRealtimeSocket';
import { MAX_ATTACHMENT_BYTES, MAX_ATTACHMENT_LABEL } from '../components/ChatMessage';
import { estimateDataUrlBytes } from '../utils/compressImage';

type Conv = Record<string, unknown>;
type Msg = Record<string, unknown>;

export function MessagesHubPage() {
  const { user } = useAuth();
  const location = useLocation();
  const [inboxTab, setInboxTab] = useState<'all' | 'student_direct' | 'teacher_student' | 'project_group'>('all');
  const [conversations, setConversations] = useState<Conv[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState('');
  const [searchQ, setSearchQ] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [profileUser, setProfileUser] = useState<{ profile: User; projects: Array<Record<string, unknown>> } | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [pendingFile, setPendingFile] = useState<{ name: string; data: string; type: 'image' | 'video' | 'file' } | null>(null);
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const [attachmentError, setAttachmentError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const activeIdRef = useRef<number | null>(null);
  const { socket, connected, joinConversation, leaveConversation } = useRealtimeSocket(Boolean(user));

  activeIdRef.current = activeId;

  const loadConversations = useCallback(async () => {
    try {
      const r = await api.getConversations();
      setConversations(r.conversations);
      api.syncProjectConversations().catch(() => {}).then(() =>
        api.getConversations().then(r2 => setConversations(r2.conversations)).catch(() => {})
      );
    } catch { /* empty */ }
    finally { setLoading(false); }
  }, []);

  const loadMessages = useCallback(async (id: number) => {
    const r = await api.getConversationMessages(id);
    setMessages(r.messages);
  }, []);

  useEffect(() => { loadConversations(); }, [loadConversations]);
  useEffect(() => {
    const openId = (location.state as { openConversationId?: number } | null)?.openConversationId;
    if (openId) setActiveId(openId);
  }, [location.state]);

  useEffect(() => {
    if (!activeId) return;
    loadMessages(activeId);
    joinConversation(activeId);
    return () => leaveConversation(activeId);
  }, [activeId, loadMessages, joinConversation, leaveConversation]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  useEffect(() => {
    if (!socket) return;

    const onMessage = (payload: { conversationId: number; message: Msg }) => {
      if (payload.conversationId === activeIdRef.current) {
        setMessages((prev) => {
          const id = payload.message.ConversationMessageId;
          if (id && prev.some((m) => m.ConversationMessageId === id)) return prev;
          return [...prev, payload.message];
        });
      }
      loadConversations();
    };

    const onTypingStart = (p: { conversationId: number; userId: number; name?: string }) => {
      if (p.conversationId === activeIdRef.current && p.userId !== user?.UserId) {
        setTypingUser(p.name || 'Someone');
      }
    };
    const onTypingStop = (p: { conversationId: number; userId: number }) => {
      if (p.conversationId === activeIdRef.current) setTypingUser(null);
    };

    socket.on('message:new', onMessage);
    socket.on('typing:start', onTypingStart);
    socket.on('typing:stop', onTypingStop);
    return () => {
      socket.off('message:new', onMessage);
      socket.off('typing:start', onTypingStart);
      socket.off('typing:stop', onTypingStop);
    };
  }, [socket, connected, user?.UserId, loadConversations]);

  useEffect(() => {
    if (searchQ.length < 2) { setSearchResults([]); return; }
    const t = setTimeout(() => {
      api.searchUsers(searchQ).then(r => setSearchResults(r.users)).catch(() => setSearchResults([]));
    }, 300);
    return () => clearTimeout(t);
  }, [searchQ]);

  const directChatType = (other: User): 'teacher_student' | 'student_direct' => {
    if (user?.Role === 'admin') return 'student_direct';
    const me = user?.Role;
    if ((me === 'student' && other.Role === 'teacher') || (me === 'teacher' && other.Role === 'student')) {
      return 'teacher_student';
    }
    return 'student_direct';
  };

  const startDirectChat = async (other: User) => {
    const r = await api.createConversation({
      type: directChatType(other),
      participantIds: [other.UserId],
      title: `${other.FirstName} ${other.LastName}`,
    });
    setActiveId(r.conversationId);
    setSearchQ('');
    setSearchResults([]);
    loadConversations();
  };

  const emitTyping = (start: boolean) => {
    if (!activeId || !socket) return;
    socket.emit(start ? 'typing:start' : 'typing:stop', { conversationId: activeId });
  };

  const send = async () => {
    if (!activeId || (!text.trim() && !pendingFile)) return;
    setSending(true);
    emitTyping(false);
    try {
      const r = await api.sendConversationMessage(activeId, {
        content: text.trim(),
        ...(pendingFile ? {
          attachmentType: pendingFile.type,
          attachmentName: pendingFile.name,
          attachmentData: pendingFile.data,
        } : {}),
      });
      setText('');
      setPendingFile(null);
      // Optimistic merge if socket didn't arrive yet
      if (r.message) {
        setMessages((prev) => {
          const id = (r.message as Msg).ConversationMessageId;
          if (id && prev.some((m) => m.ConversationMessageId === id)) return prev;
          return [...prev, r.message as Msg];
        });
      }
      loadConversations();
    } finally { setSending(false); }
  };

  const pickFile = (file: File | undefined) => {
    if (!file) return;
    setAttachmentError('');
    if (file.size > MAX_ATTACHMENT_BYTES) {
      setPendingFile(null);
      setAttachmentError(`Attachment is too large. Choose a file under ${MAX_ATTACHMENT_LABEL}.`);
      return;
    }
    let type: 'image' | 'video' | 'file' = 'file';
    if (file.type.startsWith('image/')) type = 'image';
    else if (file.type.startsWith('video/')) type = 'video';
    const reader = new FileReader();
    reader.onload = () => {
      const data = String(reader.result);
      if (estimateDataUrlBytes(data) > MAX_ATTACHMENT_BYTES) {
        setPendingFile(null);
        setAttachmentError(`Attachment is too large. Choose a file under ${MAX_ATTACHMENT_LABEL}.`);
        return;
      }
      setPendingFile({ name: file.name, data, type });
    };
    reader.onerror = () => setAttachmentError('Could not read that attachment. Please try another file.');
    reader.readAsDataURL(file);
  };

  const openProfile = async (userId: number) => {
    const r = await api.getUserProfile(userId);
    setProfileUser({ profile: r.profile, projects: r.currentProjects });
  };

  const activeConv = conversations.find(c => c.ConversationId === activeId);
  const convLabel = (c: Conv) => {
    const t = String(c.ConversationType);
    if (t === 'teacher_student') return `Teacher · ${c.ProjectTitle || 'Academic chat'}`;
    if (t === 'project_group') return `Team · ${c.Title || c.ProjectTitle || 'Project group'}`;
    if (t === 'student_direct') return `Classmate · ${c.Title || 'Direct message'}`;
    return String(c.Title || 'Conversation');
  };

  const convHint = (c: Conv) => {
    const t = String(c.ConversationType);
    if (t === 'teacher_student') return 'Official academic channel';
    if (t === 'project_group') return 'Project team discussion';
    if (t === 'student_direct') return 'Peer-to-peer message';
    return 'Direct conversation';
  };

  const filteredConversations = conversations.filter((c) => {
    if (inboxTab === 'all') return true;
    return String(c.ConversationType) === inboxTab;
  });

  const inboxTabs: Array<{ id: typeof inboxTab; label: string }> = [
    { id: 'all', label: 'All' },
    { id: 'student_direct', label: 'Classmates' },
    { id: 'teacher_student', label: 'Teachers' },
    { id: 'project_group', label: 'Teams' },
  ];

  return (
    <div className="p-4 sm:p-6 max-w-screen-2xl mx-auto pb-mobile-nav space-y-4">
      <PageHero
        dense
        icon={MessageSquare}
        eyebrow="Campus communication"
        title="Messages"
        subtitle="Professional academic conversations with teachers, teammates, and classmates."
        image={APP_IMAGES.collaboration}
      />

      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
        Keep messages clear and respectful. Use teacher chats for academic questions, team chats for project work, and classmate chats for coordination.
      </div>

      <div className="flex items-center gap-2 text-xs font-semibold" style={{ color: connected ? '#16A34A' : '#94a3b8' }}>
        {connected ? <Wifi size={14} /> : <WifiOff size={14} />}
        {connected ? 'Live connection' : 'Connecting…'}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-[520px]">
        <div className="bg-white rounded-xl border shadow-sm flex flex-col overflow-hidden">
          <div className="p-4 border-b space-y-2">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Start a conversation</p>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={searchQ} onChange={e => setSearchQ(e.target.value)}
                placeholder="Search by name, email, or HU ID…"
                className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm" />
            </div>
            {searchResults.length > 0 && (
              <div className="mt-2 border rounded-lg max-h-40 overflow-y-auto">
                {searchResults.filter(u => u.UserId !== user?.UserId).map(u => (
                  <button key={u.UserId} type="button" onClick={() => startDirectChat(u)}
                    aria-label={`Start direct chat with ${u.FirstName} ${u.LastName}`}
                    className="w-full flex items-center gap-2 p-2 hover:bg-gray-50 text-left text-sm border-b last:border-0">
                    <UserAvatar firstName={u.FirstName} lastName={u.LastName} role={u.Role} size="sm" profileImageUrl={u.ProfileImageUrl} />
                    <div className="min-w-0 flex-1">
                      <span className="block font-medium">{u.FirstName} {u.LastName}</span>
                      <span className="block text-[10px] text-gray-400 truncate capitalize">{u.Role} · {u.Email || u.UniversityId}</span>
                    </div>
                    <UserPlus size={12} className="ml-auto text-blue-600 shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="px-3 pt-3 flex flex-wrap gap-1.5 border-b pb-3">
            {inboxTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setInboxTab(tab.id)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-colors ${
                  inboxTab === tab.id
                    ? 'bg-green-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-6 text-center text-sm text-gray-400"><Loader2 className="animate-spin inline mr-2" size={14} />Loading…</div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-6 text-center text-sm text-gray-400">
                <Users size={20} className="mx-auto mb-2 opacity-40" />
                {conversations.length === 0
                  ? 'No conversations yet. Search for a classmate or teacher above.'
                  : 'No conversations in this category.'}
              </div>
            ) : filteredConversations.map(c => (
              <button key={String(c.ConversationId)} type="button"
                onClick={() => setActiveId(Number(c.ConversationId))}
                className={`w-full text-left px-4 py-3 border-b hover:bg-green-50 transition-colors ${activeId === c.ConversationId ? 'bg-green-50' : ''}`}>
                <div className="flex items-center gap-2">
                  <MessageSquare size={14} className="text-green-600 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold truncate">{convLabel(c)}</span>
                    <span className="block text-[10px] text-slate-400 truncate">{convHint(c)}</span>
                  </div>
                  {Number(c.UnreadCount) > 0 && (
                    <span className="ml-auto text-[10px] font-bold bg-green-600 text-white rounded-full px-1.5">{String(c.UnreadCount)}</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 bg-white rounded-xl border shadow-sm flex flex-col overflow-hidden min-h-[420px]">
          {!activeId ? (
            <div className="flex-1 grid place-items-center text-sm text-gray-400 p-8 text-center">
              Select a conversation, or search for a classmate / teacher to begin.
            </div>
          ) : (
            <>
              <div className="px-4 py-3 border-b">
                <div className="font-semibold text-sm flex items-center gap-2">
                  <MessageSquare size={16} className="text-green-600" />
                  {activeConv ? convLabel(activeConv) : 'Chat'}
                </div>
                {activeConv && (
                  <p className="text-[11px] text-slate-400 mt-1">{convHint(activeConv)} · Keep communication professional</p>
                )}
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map((m) => {
                  const mine = Number(m.SenderId) === user?.UserId;
                  return (
                    <div key={String(m.ConversationMessageId)} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm ${mine ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-900'}`}>
                        {!mine && (
                          <button type="button" className="text-[10px] font-bold opacity-70 mb-0.5 block" onClick={() => openProfile(Number(m.SenderId))}>
                            {String(m.SenderName || 'User')}
                          </button>
                        )}
                        {m.Content ? <p className="whitespace-pre-wrap">{String(m.Content)}</p> : null}
                        {m.AttachmentName ? <p className="text-xs mt-1 opacity-80">📎 {String(m.AttachmentName)}</p> : null}
                      </div>
                    </div>
                  );
                })}
                {typingUser && <p className="text-xs text-gray-400 italic">{typingUser} is typing…</p>}
                <div ref={endRef} />
              </div>
              {pendingFile && (
                <div className="px-4 py-2 border-t text-xs flex items-center gap-2 bg-green-50">
                  <Paperclip size={12} /> {pendingFile.name}
                  <button type="button" className="ml-auto text-red-500" onClick={() => setPendingFile(null)}>Remove</button>
                </div>
              )}
              {attachmentError && (
                <p className="px-4 py-2 border-t text-xs text-red-700 bg-red-50" role="alert">
                  {attachmentError}
                </p>
              )}
              <div className="p-3 border-t flex items-center gap-2">
                <input ref={fileRef} type="file" className="hidden"
                  onChange={e => { pickFile(e.target.files?.[0]); e.target.value = ''; }} />
                <button type="button" onClick={() => fileRef.current?.click()} className="p-2 rounded-lg border hover:bg-gray-50"
                  aria-label={`Attach file, maximum ${MAX_ATTACHMENT_LABEL}`}>
                  <Paperclip size={16} />
                </button>
                <input
                  value={text}
                  onChange={e => { setText(e.target.value); emitTyping(true); }}
                  onBlur={() => emitTyping(false)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                  placeholder="Write a clear, professional message…"
                  className="flex-1 border rounded-xl px-3 py-2 text-sm"
                />
                <motion.button whileTap={{ scale: 0.96 }} type="button" disabled={sending} onClick={send}
                  className="px-4 py-2 rounded-xl text-white font-semibold text-sm disabled:opacity-50"
                  style={{ background: '#16A34A' }} aria-label="Send message">
                  {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                </motion.button>
              </div>
            </>
          )}
        </div>
      </div>

      {profileUser && (
        <UserProfileModal
          onClose={() => setProfileUser(null)}
          profile={profileUser.profile}
          currentProjects={profileUser.projects}
        />
      )}
    </div>
  );
}
