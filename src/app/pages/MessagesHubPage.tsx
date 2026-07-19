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

type Conv = Record<string, unknown>;
type Msg = Record<string, unknown>;

export function MessagesHubPage() {
  const { user } = useAuth();
  const location = useLocation();
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
    let type: 'image' | 'video' | 'file' = 'file';
    if (file.type.startsWith('image/')) type = 'image';
    else if (file.type.startsWith('video/')) type = 'video';
    const reader = new FileReader();
    reader.onload = () => setPendingFile({ name: file.name, data: String(reader.result), type });
    reader.readAsDataURL(file);
  };

  const openProfile = async (userId: number) => {
    const r = await api.getUserProfile(userId);
    setProfileUser({ profile: r.profile, projects: r.currentProjects });
  };

  const activeConv = conversations.find(c => c.ConversationId === activeId);
  const convLabel = (c: Conv) => {
    const t = String(c.ConversationType);
    if (t === 'teacher_student') return `Teacher chat · ${c.ProjectTitle || 'Project'}`;
    if (t === 'project_group') return `Group · ${c.Title || c.ProjectTitle || 'Team'}`;
    return String(c.Title || 'Direct message');
  };

  return (
    <div className="p-4 sm:p-6 max-w-screen-2xl mx-auto pb-mobile-nav space-y-4">
      <PageHero
        title="Messages"
        subtitle={undefined}
        image={APP_IMAGES.collaboration}
        gradient="linear-gradient(135deg, #2563EB 0%, #168055 100%)"
      />

      <div className="flex items-center gap-2 text-xs font-semibold" style={{ color: connected ? '#16A34A' : '#94a3b8' }}>
        {connected ? <Wifi size={14} /> : <WifiOff size={14} />}
        {connected ? 'Live' : 'Connecting…'}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-[520px]">
        <div className="bg-white rounded-xl border shadow-sm flex flex-col overflow-hidden">
          <div className="p-4 border-b">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={searchQ} onChange={e => setSearchQ(e.target.value)}
                placeholder="Search by name, email, or HU ID..."
                className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm" />
            </div>
            {searchResults.length > 0 && (
              <div className="mt-2 border rounded-lg max-h-40 overflow-y-auto">
                {searchResults.filter(u => u.UserId !== user?.UserId).map(u => (
                  <button key={u.UserId} type="button" onClick={() => startDirectChat(u)}
                    className="w-full flex items-center gap-2 p-2 hover:bg-gray-50 text-left text-sm border-b last:border-0">
                    <UserAvatar firstName={u.FirstName} lastName={u.LastName} role={u.Role} size="sm" />
                    <div className="min-w-0 flex-1">
                      <span className="block font-medium">{u.FirstName} {u.LastName}</span>
                      <span className="block text-[10px] text-gray-400 truncate capitalize">{u.Role} · {u.Email || u.UniversityId}</span>
                    </div>
                    <UserPlus size={12} className="ml-auto text-blue-600 shrink-0" title="Start direct chat" />
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-6 text-center text-sm text-gray-400"><Loader2 className="animate-spin inline mr-2" size={14} />Loading…</div>
            ) : conversations.length === 0 ? (
              <div className="p-6 text-center text-sm text-gray-400"><Users size={20} className="mx-auto mb-2 opacity-40" />No conversations yet</div>
            ) : conversations.map(c => (
              <button key={String(c.ConversationId)} type="button"
                onClick={() => setActiveId(Number(c.ConversationId))}
                className={`w-full text-left px-4 py-3 border-b hover:bg-green-50 transition-colors ${activeId === c.ConversationId ? 'bg-green-50' : ''}`}>
                <div className="flex items-center gap-2">
                  <MessageSquare size={14} className="text-green-600 shrink-0" />
                  <span className="text-sm font-semibold truncate">{convLabel(c)}</span>
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
            <div className="flex-1 grid place-items-center text-sm text-gray-400 p-8">Select a conversation</div>
          ) : (
            <>
              <div className="px-4 py-3 border-b font-semibold text-sm flex items-center gap-2">
                <MessageSquare size={16} className="text-green-600" />
                {activeConv ? convLabel(activeConv) : 'Chat'}
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
              <div className="p-3 border-t flex items-center gap-2">
                <input ref={fileRef} type="file" className="hidden" onChange={e => pickFile(e.target.files?.[0])} />
                <button type="button" onClick={() => fileRef.current?.click()} className="p-2 rounded-lg border hover:bg-gray-50">
                  <Paperclip size={16} />
                </button>
                <input
                  value={text}
                  onChange={e => { setText(e.target.value); emitTyping(true); }}
                  onBlur={() => emitTyping(false)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                  placeholder="Type a message…"
                  className="flex-1 border rounded-xl px-3 py-2 text-sm"
                />
                <motion.button whileTap={{ scale: 0.96 }} type="button" disabled={sending} onClick={send}
                  className="px-4 py-2 rounded-xl text-white font-semibold text-sm disabled:opacity-50"
                  style={{ background: '#16A34A' }}>
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
