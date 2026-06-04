import { useState, useRef, useEffect, useCallback } from "react";
import Icon from "@/components/ui/icon";
import Avatar from "@/components/Avatar";
import {
  type Message, type User, type Chat,
  USERS, ALL_USERS, INITIAL_CHATS, MY_PROFILE,
} from "@/store";

// ─── helpers ────────────────────────────────────────────────────────────────
function now() {
  return new Date().toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit" });
}
function uid() {
  return Math.random().toString(36).slice(2);
}
function fmtDuration(s: number) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

// ─── VoiceRecorder hook ──────────────────────────────────────────────────────
function useVoiceRecorder(onDone: (url: string, duration: number) => void) {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const secRef = useRef(0);

  const start = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => chunksRef.current.push(e.data);
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const url = URL.createObjectURL(blob);
        onDone(url, secRef.current);
        stream.getTracks().forEach((t) => t.stop());
        secRef.current = 0;
        setSeconds(0);
      };
      mr.start();
      mediaRef.current = mr;
      setRecording(true);
      timerRef.current = setInterval(() => {
        secRef.current += 1;
        setSeconds(secRef.current);
      }, 1000);
    } catch {
      alert("Нет доступа к микрофону");
    }
  }, [onDone]);

  const stop = useCallback(() => {
    mediaRef.current?.stop();
    if (timerRef.current) clearInterval(timerRef.current);
    setRecording(false);
  }, []);

  return { recording, seconds, start, stop };
}

// ─── AudioPlayer ─────────────────────────────────────────────────────────────
function AudioPlayer({ src, duration, outgoing }: { src?: string; duration?: number; outgoing: boolean }) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const toggle = () => {
    if (!audioRef.current) return;
    if (playing) { audioRef.current.pause(); setPlaying(false); }
    else { audioRef.current.play(); setPlaying(true); }
  };

  return (
    <div className="flex items-center gap-2.5 min-w-[160px]">
      {src && (
        <audio
          ref={audioRef}
          src={src}
          onTimeUpdate={() => {
            if (!audioRef.current) return;
            setProgress(audioRef.current.currentTime / (audioRef.current.duration || 1));
          }}
          onEnded={() => { setPlaying(false); setProgress(0); }}
        />
      )}
      <button
        onClick={toggle}
        className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-all active:scale-95 ${outgoing ? "bg-white/20" : "bg-primary/15"}`}
      >
        <Icon name={playing ? "Pause" : "Play"} size={16} className={outgoing ? "text-white" : "text-primary"} />
      </button>
      <div className="flex-1">
        <div className={`h-1 rounded-full overflow-hidden ${outgoing ? "bg-white/25" : "bg-primary/20"}`}>
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${progress * 100}%`, background: outgoing ? "white" : "hsl(var(--primary))" }}
          />
        </div>
        <span className={`text-[10px] mt-0.5 block ${outgoing ? "text-white/70" : "text-muted-foreground"}`}>
          {fmtDuration(duration ?? 0)}
        </span>
      </div>
    </div>
  );
}

// ─── MessageBubble ────────────────────────────────────────────────────────────
function MessageBubble({ msg, onReact }: { msg: Message; onReact: (id: string, emoji: string) => void }) {
  const out = msg.from === "me";
  const EMOJIS = ["❤️", "👍", "😂", "😮", "😢", "🔥"];
  const [showEmoji, setShowEmoji] = useState(false);

  return (
    <div className={`flex ${out ? "justify-end" : "justify-start"} group animate-message`}>
      <div className="max-w-[78%] sm:max-w-[70%] relative">
        <div
          className={`px-3.5 py-2.5 shadow-sm ${out ? "msg-bubble-out" : "msg-bubble-in text-foreground"}`}
          onDoubleClick={() => setShowEmoji((v) => !v)}
        >
          {msg.type === "text" && (
            <p className="text-sm leading-relaxed">{msg.text}</p>
          )}

          {msg.type === "image" && msg.mediaUrl && (
            <div className="rounded-xl overflow-hidden -mx-0.5 -mt-0.5 mb-1 cursor-pointer">
              <img
                src={msg.mediaUrl}
                alt="фото"
                className="max-w-[240px] w-full object-cover"
                style={{ maxHeight: 240 }}
              />
            </div>
          )}

          {msg.type === "voice" && (
            <AudioPlayer src={msg.mediaUrl} duration={msg.duration} outgoing={out} />
          )}

          {msg.type === "file" && (
            <div className="flex items-center gap-2.5 min-w-[160px] py-0.5">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${out ? "bg-white/20" : "bg-primary/15"}`}>
                <Icon name="FileText" size={18} className={out ? "text-white" : "text-primary"} />
              </div>
              <div className="min-w-0">
                <p className={`text-sm font-medium truncate ${out ? "text-white" : "text-foreground"}`}>{msg.fileName}</p>
                <p className={`text-[11px] ${out ? "text-white/65" : "text-muted-foreground"}`}>{msg.fileSize}</p>
              </div>
            </div>
          )}

          <div className={`flex items-center gap-1 mt-1 ${out ? "justify-end" : "justify-start"}`}>
            <span className={`text-[10px] ${out ? "text-white/65" : "text-muted-foreground"}`}>{msg.time}</span>
            {out && <Icon name="CheckCheck" size={11} className="text-white/75" />}
          </div>
        </div>

        {msg.reactions && msg.reactions.length > 0 && (
          <div className={`flex gap-1 mt-1 flex-wrap ${out ? "justify-end" : "justify-start"}`}>
            {msg.reactions.map((r) => (
              <span key={r.emoji} className="text-xs glass px-1.5 py-0.5 rounded-full cursor-pointer">
                {r.emoji} {r.count > 1 && r.count}
              </span>
            ))}
          </div>
        )}

        {/* Emoji picker — hover on desktop, double-tap on mobile */}
        {showEmoji && (
          <div className={`absolute ${out ? "right-0" : "left-0"} -top-10 flex glass rounded-2xl p-1.5 gap-1 z-20 shadow-lg animate-message`}>
            {EMOJIS.map((e) => (
              <button
                key={e}
                onClick={() => { onReact(msg.id, e); setShowEmoji(false); }}
                className="text-base hover:scale-125 transition-transform leading-none"
              >
                {e}
              </button>
            ))}
          </div>
        )}

        {/* Hover emoji — desktop only */}
        <div className={`absolute ${out ? "right-full mr-2" : "left-full ml-2"} top-1/2 -translate-y-1/2 hidden sm:group-hover:flex glass rounded-2xl p-1.5 gap-1 z-10 shadow-lg`}>
          {EMOJIS.map((e) => (
            <button key={e} onClick={() => onReact(msg.id, e)} className="text-base hover:scale-125 transition-transform leading-none">
              {e}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── AddFriend modal ──────────────────────────────────────────────────────────
function AddFriendModal({ friends, onAdd, onClose }: { friends: User[]; onAdd: (u: User) => void; onClose: () => void }) {
  const [q, setQ] = useState("");
  const results = ALL_USERS.filter(
    (u) =>
      !friends.find((f) => f.id === u.id) &&
      (u.name.toLowerCase().includes(q.toLowerCase()) || u.username.toLowerCase().includes(q.toLowerCase()))
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative glass rounded-t-3xl sm:rounded-3xl p-6 w-full sm:max-w-sm shadow-2xl animate-message pb-safe">
        <div className="w-10 h-1 bg-border rounded-full mx-auto mb-4 sm:hidden" />
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-foreground">Добавить контакт</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-xl glass flex items-center justify-center active:scale-95 transition-all">
            <Icon name="X" size={16} className="text-muted-foreground" />
          </button>
        </div>
        <div className="relative mb-4">
          <Icon name="Search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            autoFocus
            type="text"
            placeholder="Имя или @username"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-full pl-9 pr-4 py-3 glass rounded-xl text-sm bg-transparent outline-none focus:ring-1 focus:ring-primary/30 placeholder:text-muted-foreground text-foreground"
          />
        </div>
        <div className="space-y-1 max-h-64 overflow-y-auto">
          {q.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">Введи имя или @username</p>
          )}
          {q.length > 0 && results.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">Никого не найдено</p>
          )}
          {results.map((u) => (
            <div
              key={u.id}
              className="flex items-center gap-3 px-3 py-3 rounded-xl active:bg-primary/10 transition-colors cursor-pointer group"
              onClick={() => { onAdd(u); onClose(); }}
            >
              <Avatar initials={u.avatar} color={u.color} size="md" online={u.online} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">{u.name}</p>
                <p className="text-xs text-muted-foreground">@{u.username}</p>
              </div>
              <div className="w-9 h-9 rounded-xl bg-primary/10 group-hover:bg-primary flex items-center justify-center transition-all flex-shrink-0">
                <Icon name="UserPlus" size={15} className="text-primary group-hover:text-white transition-colors" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Profile modal ────────────────────────────────────────────────────────────
type ExtUser = User & { imageUrl?: string };

function ProfileModal({ profile, onSave, onClose }: { profile: ExtUser; onSave: (p: ExtUser) => void; onClose: () => void }) {
  const [form, setForm] = useState<ExtUser>(profile);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleAvatar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setForm((f) => ({ ...f, imageUrl: URL.createObjectURL(file) }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative glass rounded-t-3xl sm:rounded-3xl p-6 w-full sm:max-w-sm shadow-2xl animate-message pb-safe">
        <div className="w-10 h-1 bg-border rounded-full mx-auto mb-4 sm:hidden" />
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-foreground">Мой профиль</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-xl glass flex items-center justify-center active:scale-95 transition-all">
            <Icon name="X" size={16} className="text-muted-foreground" />
          </button>
        </div>

        <div className="flex flex-col items-center mb-5">
          <div className="relative cursor-pointer group" onClick={() => fileRef.current?.click()}>
            <Avatar initials={form.avatar} color={form.color} size="xl" imageUrl={form.imageUrl} online />
            <div className="absolute inset-0 rounded-2xl bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Icon name="Camera" size={22} className="text-white" />
            </div>
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatar} />
          <p className="text-xs text-muted-foreground mt-2">Нажми для смены фото</p>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Имя</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full px-3.5 py-3 glass rounded-xl text-sm bg-transparent outline-none focus:ring-1 focus:ring-primary/30 text-foreground"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Username</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">@</span>
              <input
                type="text"
                value={form.username}
                onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                className="w-full pl-8 pr-3.5 py-3 glass rounded-xl text-sm bg-transparent outline-none focus:ring-1 focus:ring-primary/30 text-foreground"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">О себе</label>
            <textarea
              value={form.bio}
              onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
              rows={2}
              className="w-full px-3.5 py-3 glass rounded-xl text-sm bg-transparent outline-none focus:ring-1 focus:ring-primary/30 text-foreground resize-none"
            />
          </div>
        </div>

        <div className="flex gap-2.5 mt-5">
          <button onClick={onClose} className="flex-1 py-3 glass rounded-xl text-sm font-medium text-muted-foreground active:bg-white/10 transition-colors">
            Отмена
          </button>
          <button
            onClick={() => { onSave(form); onClose(); }}
            className="flex-1 py-3 rounded-xl text-sm font-semibold text-white btn-send"
          >
            Сохранить
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── ImageViewer ──────────────────────────────────────────────────────────────
function ImageViewer({ src, onClose }: { src: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md" onClick={onClose}>
      <img src={src} alt="preview" className="max-w-[95vw] max-h-[90vh] object-contain rounded-2xl" />
      <button onClick={onClose} className="absolute top-5 right-5 w-10 h-10 glass rounded-full flex items-center justify-center">
        <Icon name="X" size={18} className="text-white" />
      </button>
    </div>
  );
}

// ─── ContactsList (mobile view) ───────────────────────────────────────────────
function ContactsList({
  friends, chats, selectedId, search, setSearch, setSelectedId, setShowAddFriend, lastMsg, lastTime, unreadCount, activeTab, setActiveTab, myProfile, setShowProfile,
}: {
  friends: User[]; chats: Record<string, Chat>; selectedId: string; search: string;
  setSearch: (v: string) => void; setSelectedId: (id: string) => void;
  setShowAddFriend: (v: boolean) => void; lastMsg: (id: string) => string; lastTime: (id: string) => string;
  unreadCount: (id: string) => number; activeTab: "chats" | "contacts"; setActiveTab: (t: "chats" | "contacts") => void;
  myProfile: ExtUser; setShowProfile: (v: boolean) => void;
}) {
  const filtered = friends.filter(
    (u) => u.name.toLowerCase().includes(search.toLowerCase()) || u.username.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="px-4 py-3">
        <div className="relative">
          <Icon name="Search" size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Поиск..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 glass rounded-2xl text-sm bg-transparent outline-none focus:ring-1 focus:ring-primary/30 placeholder:text-muted-foreground text-foreground"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 pb-3 flex gap-1.5">
        {(["chats", "contacts"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${activeTab === t ? "bg-primary text-primary-foreground shadow-md" : "text-muted-foreground hover:bg-primary/10"}`}
          >
            {t === "chats" ? "Чаты" : "Контакты"}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-3 pb-2 space-y-0.5">
        {filtered.map((user, idx) => (
          <div
            key={user.id}
            onClick={() => setSelectedId(user.id)}
            className={`chat-item px-3 py-3 cursor-pointer flex items-center gap-3 animate-chat-item active:scale-[0.98] ${selectedId === user.id ? "active" : ""}`}
            style={{ animationDelay: `${idx * 30}ms` }}
          >
            <Avatar initials={user.avatar} color={user.color} size="md" online={user.online} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-0.5">
                <span className="font-semibold text-sm text-foreground truncate">{user.name}</span>
                <span className="text-[11px] text-muted-foreground flex-shrink-0 ml-1">{lastTime(user.id)}</span>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground truncate pr-2">{lastMsg(user.id)}</p>
                {unreadCount(user.id) > 0 && (
                  <span className="flex-shrink-0 min-w-[20px] h-5 px-1.5 bg-primary rounded-full text-[11px] text-primary-foreground font-bold flex items-center justify-center">
                    {unreadCount(user.id)}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="text-center py-16">
            <Icon name="Users" size={36} className="text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground mb-3">Никого нет</p>
            <button onClick={() => setShowAddFriend(true)} className="text-sm text-primary font-medium">
              + Добавить контакт
            </button>
          </div>
        )}
      </div>

      {/* Profile bar */}
      <button
        onClick={() => setShowProfile(true)}
        className="mx-3 mb-3 px-4 py-3 glass rounded-2xl flex items-center gap-3 active:scale-[0.98] transition-transform"
      >
        <Avatar initials={myProfile.avatar} color={myProfile.color} size="sm" imageUrl={myProfile.imageUrl} online />
        <div className="flex-1 min-w-0 text-left">
          <p className="text-sm font-semibold truncate text-foreground">{myProfile.name}</p>
          <p className="text-xs text-muted-foreground">@{myProfile.username}</p>
        </div>
        <Icon name="ChevronRight" size={16} className="text-muted-foreground" />
      </button>
    </div>
  );
}

// ─── ChatWindow ───────────────────────────────────────────────────────────────
function ChatWindow({
  selectedUser, currentChat, typing, onBack, onReact, onSendText, onSendFile, previewImages, setPreviewImages, voice, setImageViewer, input, setInput,
}: {
  selectedUser: User; currentChat: Chat; typing: boolean; onBack: () => void;
  onReact: (id: string, emoji: string) => void; onSendText: () => void;
  onSendFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
  previewImages: string[]; setPreviewImages: (fn: (p: string[]) => string[]) => void;
  voice: { recording: boolean; seconds: number; start: () => void; stop: () => void };
  setImageViewer: (src: string) => void;
  input: string; setInput: (v: string) => void;
}) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentChat.messages, typing]);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSendText(); }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="glass px-3 sm:px-5 py-3 flex items-center gap-2 sm:gap-3 border-b border-white/10 flex-shrink-0">
        <button
          onClick={onBack}
          className="sm:hidden w-9 h-9 rounded-xl flex items-center justify-center active:scale-90 transition-all -ml-1 mr-0.5"
        >
          <Icon name="ChevronLeft" size={22} className="text-foreground/80" />
        </button>
        <Avatar
          initials={selectedUser.avatar}
          color={selectedUser.color}
          size="md"
          online={selectedUser.online}
        />
        <div className="flex-1 min-w-0">
          <h2 className="font-bold text-foreground text-base truncate leading-tight">{selectedUser.name}</h2>
          <p className="text-xs text-muted-foreground leading-tight">
            {selectedUser.online ? "в сети" : selectedUser.lastSeen ? `был(а) ${selectedUser.lastSeen}` : "не в сети"}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button className="w-9 h-9 rounded-xl glass flex items-center justify-center active:scale-90 transition-all">
            <Icon name="Phone" size={16} className="text-foreground/70" />
          </button>
          <button className="hidden sm:flex w-9 h-9 rounded-xl glass items-center justify-center active:scale-90 transition-all">
            <Icon name="Video" size={16} className="text-foreground/70" />
          </button>
          <button className="w-9 h-9 rounded-xl glass flex items-center justify-center active:scale-90 transition-all">
            <Icon name="MoreVertical" size={16} className="text-foreground/70" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 sm:py-5 space-y-2">
        <div className="flex items-center gap-3 my-2">
          <div className="flex-1 h-px bg-border/40" />
          <span className="text-[11px] text-muted-foreground px-3 py-1 glass rounded-full">Сегодня</span>
          <div className="flex-1 h-px bg-border/40" />
        </div>

        {currentChat.messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-primary/20 to-violet-400/20 flex items-center justify-center">
              <Icon name="MessageCircle" size={28} className="text-primary/50" />
            </div>
            <p className="text-muted-foreground text-sm">Напиши первое сообщение!</p>
          </div>
        )}

        {currentChat.messages.map((msg) => (
          <div
            key={msg.id}
            onClick={msg.type === "image" && msg.mediaUrl ? () => setImageViewer(msg.mediaUrl!) : undefined}
            className={msg.type === "image" ? "cursor-pointer" : ""}
          >
            <MessageBubble msg={msg} onReact={onReact} />
          </div>
        ))}

        {typing && (
          <div className="flex justify-start animate-message">
            <div className="msg-bubble-in px-4 py-3 flex items-center gap-1.5">
              <div className="typing-dot" /><div className="typing-dot" /><div className="typing-dot" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Image previews */}
      {previewImages.length > 0 && (
        <div className="px-4 py-2.5 flex gap-2 flex-wrap border-t border-white/10 glass">
          {previewImages.map((url, i) => (
            <div key={i} className="relative group">
              <img src={url} alt="" className="w-14 h-14 sm:w-16 sm:h-16 object-cover rounded-xl" />
              <button
                onClick={() => setPreviewImages((p) => p.filter((_, j) => j !== i))}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center"
              >
                <Icon name="X" size={10} className="text-white" />
              </button>
            </div>
          ))}
          <div className="flex items-end pb-1">
            <span className="text-xs text-muted-foreground">{previewImages.length} фото</span>
          </div>
        </div>
      )}

      {/* Input bar */}
      <div className="glass px-3 sm:px-4 py-2.5 sm:py-3 border-t border-white/10 flex-shrink-0">
        <div className="flex items-end gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-10 h-10 rounded-2xl glass flex items-center justify-center flex-shrink-0 active:scale-90 transition-all mb-0.5"
          >
            <Icon name="Paperclip" size={18} className="text-muted-foreground" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,video/*,.pdf,.doc,.docx,.zip,.rar"
            className="hidden"
            onChange={onSendFile}
          />

          <div className="flex-1 glass rounded-2xl px-3.5 py-2.5 flex items-end gap-2 min-h-[44px]">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Сообщение..."
              rows={1}
              className="flex-1 bg-transparent text-sm placeholder:text-muted-foreground outline-none resize-none max-h-[100px] text-foreground leading-relaxed"
              style={{ minHeight: "22px" }}
            />
            <button className="flex-shrink-0 mb-0.5">
              <Icon name="Smile" size={18} className="text-muted-foreground" />
            </button>
          </div>

          {input.trim() || previewImages.length > 0 ? (
            <button
              onClick={onSendText}
              className="w-10 h-10 rounded-2xl btn-send flex items-center justify-center flex-shrink-0 mb-0.5 shadow-lg active:scale-90 transition-all"
            >
              <Icon name="Send" size={16} className="text-white" />
            </button>
          ) : voice.recording ? (
            <button
              onClick={voice.stop}
              className="w-10 h-10 rounded-2xl bg-red-500 flex items-center justify-center flex-shrink-0 mb-0.5 shadow-lg"
            >
              <Icon name="Square" size={14} className="text-white" />
            </button>
          ) : (
            <button
              onClick={voice.start}
              className="w-10 h-10 rounded-2xl glass flex items-center justify-center flex-shrink-0 mb-0.5 active:scale-90 transition-all active:bg-red-500/15"
            >
              <Icon name="Mic" size={18} className="text-muted-foreground" />
            </button>
          )}
        </div>

        {voice.recording && (
          <div className="mt-2 flex items-center gap-2 px-1">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-xs text-red-500 font-medium">Запись {fmtDuration(voice.seconds)}</span>
            <span className="text-xs text-muted-foreground ml-auto">■ остановить</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function Index() {
  const [dark, setDark] = useState(false);
  const [friends, setFriends] = useState<User[]>(USERS);
  const [chats, setChats] = useState<Record<string, Chat>>(INITIAL_CHATS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const [typing, setTyping] = useState(false);
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [myProfile, setMyProfile] = useState<ExtUser>(MY_PROFILE);
  const [imageViewer, setImageViewer] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"chats" | "contacts">("chats");
  const [previewImages, setPreviewImages] = useState<string[]>([]);
  const [mobileView, setMobileView] = useState<"list" | "chat">("list");

  // On desktop, default select first friend
  useEffect(() => {
    if (window.innerWidth >= 768 && !selectedId) {
      setSelectedId(USERS[0].id);
    }
  }, []);

  const selectedUser = friends.find((f) => f.id === selectedId) ?? friends[0];
  const currentChat: Chat = selectedId ? (chats[selectedId] ?? { id: selectedId, userId: selectedId, messages: [] }) : { id: "", userId: "", messages: [] };

  const pushMsg = useCallback((msg: Message) => {
    if (!selectedId) return;
    setChats((prev) => ({
      ...prev,
      [selectedId]: {
        ...(prev[selectedId] ?? { id: selectedId, userId: selectedId, messages: [] }),
        messages: [...(prev[selectedId]?.messages ?? []), msg],
      },
    }));
  }, [selectedId]);

  const simulateReply = useCallback(() => {
    const id = selectedId;
    if (!id) return;
    setTyping(true);
    const replies = ["Понял! 👍", "Отлично!", "Хорошо", "Ок!", "Согласен ✓", "Скоро отвечу", "Супер! 🔥", "Принято 👌", "Классно!", "Понял, спасибо!"];
    setTimeout(() => {
      setChats((prev) => {
        const chat = prev[id] ?? { id, userId: id, messages: [] };
        return {
          ...prev,
          [id]: {
            ...chat,
            messages: [
              ...chat.messages,
              { id: uid(), type: "text" as const, text: replies[Math.floor(Math.random() * replies.length)], from: "them" as const, time: now() },
            ],
          },
        };
      });
      setTyping(false);
    }, 800 + Math.random() * 900);
  }, [selectedId]);

  const voice = useVoiceRecorder((url, duration) => {
    pushMsg({ id: uid(), type: "voice", mediaUrl: url, duration, from: "me", time: now() });
    simulateReply();
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  const sendText = useCallback(() => {
    const text = input.trim();
    if (!text && previewImages.length === 0) return;
    previewImages.forEach((url) => pushMsg({ id: uid(), type: "image", mediaUrl: url, from: "me", time: now() }));
    setPreviewImages([]);
    if (text) pushMsg({ id: uid(), type: "text", text, from: "me", time: now() });
    setInput("");
    simulateReply();
  }, [input, previewImages, pushMsg, simulateReply]);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    files.forEach((file) => {
      if (file.type.startsWith("image/")) {
        setPreviewImages((p) => [...p, URL.createObjectURL(file)]);
      } else {
        pushMsg({ id: uid(), type: "file", fileName: file.name, fileSize: `${(file.size / 1024 / 1024).toFixed(1)} MB`, from: "me", time: now() });
        simulateReply();
      }
    });
    e.target.value = "";
  };

  const handleReact = useCallback((msgId: string, emoji: string) => {
    if (!selectedId) return;
    setChats((prev) => {
      const chat = prev[selectedId];
      if (!chat) return prev;
      return {
        ...prev,
        [selectedId]: {
          ...chat,
          messages: chat.messages.map((m) => {
            if (m.id !== msgId) return m;
            const existing = m.reactions?.find((r) => r.emoji === emoji);
            return {
              ...m,
              reactions: existing
                ? m.reactions!.map((r) => r.emoji === emoji ? { ...r, count: r.count + 1 } : r)
                : [...(m.reactions ?? []), { emoji, count: 1 }],
            };
          }),
        },
      };
    });
  }, [selectedId]);

  const addFriend = (u: User) => {
    setFriends((f) => [...f, u]);
    setChats((prev) => ({ ...prev, [u.id]: { id: u.id, userId: u.id, messages: [] } }));
    handleSelectChat(u.id);
  };

  const handleSelectChat = (id: string) => {
    setSelectedId(id);
    setMobileView("chat");
  };

  const lastMsg = (userId: string): string => {
    const msgs = chats[userId]?.messages;
    if (!msgs?.length) return "Начни диалог";
    const last = msgs[msgs.length - 1];
    if (last.type === "image") return "📷 Фото";
    if (last.type === "voice") return "🎤 Голосовое";
    if (last.type === "file") return `📄 ${last.fileName}`;
    return last.text ?? "";
  };
  const lastTime = (userId: string) => chats[userId]?.messages?.slice(-1)[0]?.time ?? "";
  const unreadCount = (userId: string) => (chats[userId]?.messages ?? []).filter((m) => m.from === "them").length;

  const sidebarProps = {
    friends, chats, selectedId: selectedId ?? "", search, setSearch,
    setSelectedId: handleSelectChat, setShowAddFriend,
    lastMsg, lastTime, unreadCount, activeTab, setActiveTab,
    myProfile, setShowProfile,
  };

  const chatProps = selectedUser ? {
    selectedUser, currentChat, typing,
    onBack: () => setMobileView("list"),
    onReact: handleReact,
    onSendText: sendText,
    onSendFile: handleFile,
    previewImages,
    setPreviewImages: setPreviewImages as (fn: (p: string[]) => string[]) => void,
    voice,
    setImageViewer: (src: string) => setImageViewer(src),
    input, setInput,
  } : null;

  return (
    <div className="h-screen w-screen overflow-hidden gradient-bg flex items-center justify-center">
      {/* BG orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-blue-400/20 rounded-full blur-[100px]" />
        <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] bg-purple-400/20 rounded-full blur-[100px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-indigo-300/10 rounded-full blur-[80px]" />
      </div>

      {/* ── DESKTOP layout ── */}
      <div className="relative w-full h-full max-w-[1440px] hidden md:flex shadow-2xl overflow-hidden rounded-none md:rounded-2xl md:h-[calc(100vh-32px)] md:m-4">
        {/* Sidebar */}
        <div className="glass-sidebar w-80 flex-shrink-0 flex flex-col">
          {/* Header */}
          <div className="px-4 py-4 flex items-center gap-2 border-b border-white/10">
            <div className="flex-1 flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                <Icon name="MessageCircle" size={14} className="text-white" />
              </div>
              <span className="font-bold text-foreground tracking-tight">Облако</span>
            </div>
            <button onClick={() => setDark(!dark)} className="w-8 h-8 rounded-xl glass flex items-center justify-center hover:scale-105 transition-all">
              <Icon name={dark ? "Sun" : "Moon"} size={15} className="text-foreground/70" />
            </button>
            <button onClick={() => setShowAddFriend(true)} className="w-8 h-8 rounded-xl glass flex items-center justify-center hover:scale-105 transition-all">
              <Icon name="UserPlus" size={15} className="text-foreground/70" />
            </button>
          </div>
          <div className="flex-1 overflow-hidden flex flex-col">
            <ContactsList {...sidebarProps} />
          </div>
        </div>

        {/* Chat */}
        <div className="flex-1 flex flex-col glass-chat min-w-0">
          {chatProps ? (
            <ChatWindow {...chatProps} />
          ) : (
            <div className="flex-1 flex items-center justify-center flex-col gap-3">
              <Icon name="MessageCircle" size={48} className="text-muted-foreground/30" />
              <p className="text-muted-foreground">Выбери чат</p>
            </div>
          )}
        </div>
      </div>

      {/* ── MOBILE layout ── */}
      <div className="relative w-full h-full flex flex-col md:hidden overflow-hidden">
        {/* Mobile header */}
        <div className="glass-sidebar flex-shrink-0 px-4 pt-safe-top">
          <div className="flex items-center gap-2 py-3.5 border-b border-white/10">
            {mobileView === "chat" ? (
              <button onClick={() => setMobileView("list")} className="w-9 h-9 rounded-xl flex items-center justify-center -ml-1">
                <Icon name="ChevronLeft" size={22} className="text-foreground" />
              </button>
            ) : (
              <div className="flex items-center gap-2 flex-1">
                <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                  <Icon name="MessageCircle" size={14} className="text-white" />
                </div>
                <span className="font-bold text-foreground tracking-tight">Облако</span>
              </div>
            )}
            {mobileView === "list" && (
              <div className="ml-auto flex gap-1.5">
                <button onClick={() => setDark(!dark)} className="w-8 h-8 rounded-xl glass flex items-center justify-center">
                  <Icon name={dark ? "Sun" : "Moon"} size={15} className="text-foreground/70" />
                </button>
                <button onClick={() => setShowAddFriend(true)} className="w-8 h-8 rounded-xl glass flex items-center justify-center">
                  <Icon name="UserPlus" size={15} className="text-foreground/70" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile content with slide animation */}
        <div className="flex-1 overflow-hidden relative">
          {/* List pane */}
          <div
            className="absolute inset-0 glass-chat transition-transform duration-300 ease-in-out"
            style={{ transform: mobileView === "chat" ? "translateX(-100%)" : "translateX(0)" }}
          >
            <ContactsList {...sidebarProps} />
          </div>

          {/* Chat pane */}
          <div
            className="absolute inset-0 glass-chat transition-transform duration-300 ease-in-out"
            style={{ transform: mobileView === "chat" ? "translateX(0)" : "translateX(100%)" }}
          >
            {chatProps ? (
              <ChatWindow {...chatProps} />
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-muted-foreground text-sm">Выбери чат</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {showAddFriend && <AddFriendModal friends={friends} onAdd={addFriend} onClose={() => setShowAddFriend(false)} />}
      {showProfile && <ProfileModal profile={myProfile} onSave={(p) => setMyProfile(p)} onClose={() => setShowProfile(false)} />}
      {imageViewer && <ImageViewer src={imageViewer} onClose={() => setImageViewer(null)} />}
    </div>
  );
}
