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
        className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-all hover:scale-105 ${outgoing ? "bg-white/20 hover:bg-white/30" : "bg-primary/15 hover:bg-primary/25"}`}
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

  return (
    <div className={`flex ${out ? "justify-end" : "justify-start"} group animate-message`}>
      <div className="max-w-[70%] relative">
        <div className={`px-3.5 py-2.5 shadow-sm ${out ? "msg-bubble-out" : "msg-bubble-in text-foreground"}`}>

          {msg.type === "text" && (
            <p className="text-sm leading-relaxed">{msg.text}</p>
          )}

          {msg.type === "image" && msg.mediaUrl && (
            <div className="rounded-xl overflow-hidden -mx-0.5 -mt-0.5 mb-1 cursor-pointer">
              <img
                src={msg.mediaUrl}
                alt="фото"
                className="max-w-[260px] w-full object-cover hover:opacity-95 transition-opacity"
                style={{ maxHeight: 260 }}
              />
            </div>
          )}

          {msg.type === "voice" && (
            <AudioPlayer src={msg.mediaUrl} duration={msg.duration} outgoing={out} />
          )}

          {msg.type === "file" && (
            <div className="flex items-center gap-2.5 min-w-[180px] py-0.5">
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
              <span key={r.emoji} className="text-xs glass px-1.5 py-0.5 rounded-full cursor-pointer hover:scale-110 transition-transform">
                {r.emoji} {r.count > 1 && r.count}
              </span>
            ))}
          </div>
        )}

        {/* Emoji on hover */}
        <div className={`absolute ${out ? "right-full mr-2" : "left-full ml-2"} top-1/2 -translate-y-1/2 hidden group-hover:flex glass rounded-2xl p-1.5 gap-1 z-10 shadow-lg`}>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative glass rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-message">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-foreground">Добавить контакт</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-xl glass flex items-center justify-center hover:scale-105 transition-all">
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
            className="w-full pl-9 pr-4 py-2.5 glass rounded-xl text-sm bg-transparent outline-none focus:ring-1 focus:ring-primary/30 placeholder:text-muted-foreground text-foreground"
          />
        </div>
        <div className="space-y-1 max-h-72 overflow-y-auto">
          {q.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">Введи имя или @username</p>
          )}
          {q.length > 0 && results.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">Никого не найдено</p>
          )}
          {results.map((u) => (
            <div
              key={u.id}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-primary/8 transition-colors cursor-pointer group"
              onClick={() => { onAdd(u); onClose(); }}
            >
              <Avatar initials={u.avatar} color={u.color} size="md" online={u.online} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">{u.name}</p>
                <p className="text-xs text-muted-foreground">@{u.username} · {u.bio}</p>
              </div>
              <div className="w-8 h-8 rounded-xl bg-primary/10 group-hover:bg-primary flex items-center justify-center transition-all flex-shrink-0">
                <Icon name="UserPlus" size={14} className="text-primary group-hover:text-white transition-colors" />
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative glass rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-message">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-foreground">Мой профиль</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-xl glass flex items-center justify-center hover:scale-105 transition-all">
            <Icon name="X" size={16} className="text-muted-foreground" />
          </button>
        </div>

        <div className="flex flex-col items-center mb-6">
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
              className="w-full px-3.5 py-2.5 glass rounded-xl text-sm bg-transparent outline-none focus:ring-1 focus:ring-primary/30 text-foreground"
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
                className="w-full pl-8 pr-3.5 py-2.5 glass rounded-xl text-sm bg-transparent outline-none focus:ring-1 focus:ring-primary/30 text-foreground"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">О себе</label>
            <textarea
              value={form.bio}
              onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
              rows={2}
              className="w-full px-3.5 py-2.5 glass rounded-xl text-sm bg-transparent outline-none focus:ring-1 focus:ring-primary/30 text-foreground resize-none"
            />
          </div>
        </div>

        <div className="flex gap-2.5 mt-5">
          <button onClick={onClose} className="flex-1 py-2.5 glass rounded-xl text-sm font-medium text-muted-foreground hover:bg-white/10 transition-colors">
            Отмена
          </button>
          <button
            onClick={() => { onSave(form); onClose(); }}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white btn-send"
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md" onClick={onClose}>
      <img src={src} alt="preview" className="max-w-[90vw] max-h-[90vh] object-contain rounded-2xl shadow-2xl" />
      <button onClick={onClose} className="absolute top-5 right-5 w-10 h-10 glass rounded-full flex items-center justify-center">
        <Icon name="X" size={18} className="text-white" />
      </button>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function Index() {
  const [dark, setDark] = useState(false);
  const [friends, setFriends] = useState<User[]>(USERS);
  const [chats, setChats] = useState<Record<string, Chat>>(INITIAL_CHATS);
  const [selectedId, setSelectedId] = useState<string>(USERS[0].id);
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const [typing, setTyping] = useState(false);
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [myProfile, setMyProfile] = useState<ExtUser>(MY_PROFILE);
  const [imageViewer, setImageViewer] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"chats" | "contacts">("chats");
  const [previewImages, setPreviewImages] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedUser = friends.find((f) => f.id === selectedId) ?? friends[0];
  const currentChat: Chat = chats[selectedId] ?? { id: selectedId, userId: selectedId, messages: [] };

  const pushMsg = useCallback((msg: Message) => {
    setChats((prev) => ({
      ...prev,
      [selectedId]: {
        ...(prev[selectedId] ?? { id: selectedId, userId: selectedId, messages: [] }),
        messages: [...(prev[selectedId]?.messages ?? []), msg],
      },
    }));
  }, [selectedId]);

  const voice = useVoiceRecorder((url, duration) => {
    pushMsg({ id: uid(), type: "voice", mediaUrl: url, duration, from: "me", time: now() });
    simulateReply();
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chats, selectedId]);

  const simulateReply = useCallback(() => {
    const id = selectedId;
    setTyping(true);
    const replies = [
      "Понял, спасибо! 👍", "Отличная идея!", "Хорошо, займусь этим", "Ок, принято!", "Согласен ✓",
      "Скоро отвечу подробнее", "Интересно, расскажи больше", "Супер! 🔥", "Принято 👌", "Классно!",
    ];
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
    }, 800 + Math.random() * 1000);
  }, [selectedId]);

  const sendText = () => {
    const text = input.trim();
    if (!text && previewImages.length === 0) return;
    previewImages.forEach((url) => pushMsg({ id: uid(), type: "image", mediaUrl: url, from: "me", time: now() }));
    setPreviewImages([]);
    if (text) pushMsg({ id: uid(), type: "text", text, from: "me", time: now() });
    setInput("");
    simulateReply();
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendText(); }
  };

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
    setSelectedId(u.id);
  };

  const filteredFriends = friends.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.username.toLowerCase().includes(search.toLowerCase())
  );

  const lastMsg = (userId: string): string => {
    const msgs = chats[userId]?.messages;
    if (!msgs?.length) return "Начни диалог";
    const last = msgs[msgs.length - 1];
    if (last.type === "image") return "📷 Фото";
    if (last.type === "voice") return "🎤 Голосовое";
    if (last.type === "file") return `📄 ${last.fileName}`;
    return last.text ?? "";
  };

  const lastTime = (userId: string): string => {
    const msgs = chats[userId]?.messages;
    return msgs?.slice(-1)[0]?.time ?? "";
  };

  const unreadCount = (userId: string) =>
    (chats[userId]?.messages ?? []).filter((m) => m.from === "them").length;

  return (
    <div className="h-screen w-screen overflow-hidden gradient-bg flex items-center justify-center">
      {/* BG orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-blue-400/20 rounded-full blur-[100px]" />
        <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] bg-purple-400/20 rounded-full blur-[100px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-indigo-300/10 rounded-full blur-[80px]" />
      </div>

      {/* Shell */}
      <div className="relative w-full h-full max-w-[1440px] flex shadow-2xl overflow-hidden rounded-none md:rounded-2xl md:h-[calc(100vh-32px)] md:m-4">

        {/* ── Sidebar ── */}
        <div className="glass-sidebar w-80 flex-shrink-0 flex-col hidden md:flex">
          {/* Header */}
          <div className="px-4 py-4 flex items-center gap-2 border-b border-white/10">
            <div className="flex-1 flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                <Icon name="MessageCircle" size={14} className="text-white" />
              </div>
              <span className="font-bold text-foreground tracking-tight">Облако</span>
            </div>
            <button onClick={() => setDark(!dark)} className="w-8 h-8 rounded-xl glass flex items-center justify-center hover:scale-105 transition-all" title="Тема">
              <Icon name={dark ? "Sun" : "Moon"} size={15} className="text-foreground/70" />
            </button>
            <button onClick={() => setShowAddFriend(true)} className="w-8 h-8 rounded-xl glass flex items-center justify-center hover:scale-105 transition-all" title="Добавить контакт">
              <Icon name="UserPlus" size={15} className="text-foreground/70" />
            </button>
          </div>

          {/* Tabs */}
          <div className="px-4 pt-3 pb-2 flex gap-1.5">
            {(["chats", "contacts"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setActiveTab(t)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${activeTab === t ? "bg-primary text-primary-foreground shadow-md" : "text-muted-foreground hover:bg-primary/10"}`}
              >
                {t === "chats" ? "Чаты" : "Контакты"}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="px-4 pb-3">
            <div className="relative">
              <Icon name="Search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Поиск..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-2 glass rounded-xl text-sm bg-transparent outline-none focus:ring-1 focus:ring-primary/30 placeholder:text-muted-foreground text-foreground"
              />
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-0.5">
            {filteredFriends.map((user, idx) => (
              <div
                key={user.id}
                onClick={() => setSelectedId(user.id)}
                className={`chat-item px-3 py-2.5 cursor-pointer flex items-center gap-3 animate-chat-item ${selectedId === user.id ? "active" : ""}`}
                style={{ animationDelay: `${idx * 35}ms` }}
              >
                <Avatar initials={user.avatar} color={user.color} size="md" online={user.online} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="font-semibold text-sm text-foreground truncate">{user.name}</span>
                    <span className="text-[10px] text-muted-foreground flex-shrink-0 ml-1">{lastTime(user.id)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground truncate pr-2">{lastMsg(user.id)}</p>
                    {activeTab === "chats" && unreadCount(user.id) > 0 && (
                      <span className="flex-shrink-0 min-w-[18px] h-[18px] px-1 bg-primary rounded-full text-[10px] text-primary-foreground font-bold flex items-center justify-center">
                        {unreadCount(user.id)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {filteredFriends.length === 0 && (
              <div className="text-center py-12">
                <Icon name="Users" size={32} className="text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground mb-3">Никого нет</p>
                <button
                  onClick={() => setShowAddFriend(true)}
                  className="text-xs text-primary hover:underline font-medium"
                >
                  + Добавить контакт
                </button>
              </div>
            )}
          </div>

          {/* My profile */}
          <button
            onClick={() => setShowProfile(true)}
            className="px-4 py-3 border-t border-white/10 flex items-center gap-2 hover:bg-primary/5 transition-colors text-left w-full"
          >
            <Avatar initials={myProfile.avatar} color={myProfile.color} size="sm" imageUrl={myProfile.imageUrl} online />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate text-foreground">{myProfile.name}</p>
              <p className="text-xs text-muted-foreground">@{myProfile.username}</p>
            </div>
            <Icon name="Settings" size={15} className="text-muted-foreground" />
          </button>
        </div>

        {/* ── Chat window ── */}
        <div className="flex-1 flex flex-col glass-chat min-w-0">
          {/* Header */}
          <div className="glass px-5 py-3.5 flex items-center gap-3 border-b border-white/10 flex-shrink-0">
            <Avatar
              initials={selectedUser?.avatar ?? "?"}
              color={selectedUser?.color ?? "from-gray-400 to-gray-600"}
              size="md"
              online={selectedUser?.online}
            />
            <div className="flex-1 min-w-0">
              <h2 className="font-bold text-foreground text-base truncate">{selectedUser?.name}</h2>
              <p className="text-xs text-muted-foreground">
                {selectedUser?.online ? "в сети" : selectedUser?.lastSeen ? `был(а) ${selectedUser.lastSeen}` : "не в сети"}
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <button className="w-9 h-9 rounded-xl glass flex items-center justify-center hover:scale-105 transition-all">
                <Icon name="Phone" size={16} className="text-foreground/70" />
              </button>
              <button className="w-9 h-9 rounded-xl glass flex items-center justify-center hover:scale-105 transition-all">
                <Icon name="Video" size={16} className="text-foreground/70" />
              </button>
              <button className="w-9 h-9 rounded-xl glass flex items-center justify-center hover:scale-105 transition-all">
                <Icon name="Search" size={16} className="text-foreground/70" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-2">
            <div className="flex items-center gap-3 my-2">
              <div className="flex-1 h-px bg-border/40" />
              <span className="text-[11px] text-muted-foreground px-3 py-1 glass rounded-full">Сегодня</span>
              <div className="flex-1 h-px bg-border/40" />
            </div>

            {currentChat.messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full py-20 gap-3">
                <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-primary/20 to-violet-400/20 flex items-center justify-center">
                  <Icon name="MessageCircle" size={30} className="text-primary/50" />
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
                <MessageBubble msg={msg} onReact={handleReact} />
              </div>
            ))}

            {typing && (
              <div className="flex justify-start animate-message">
                <div className="msg-bubble-in px-4 py-3 flex items-center gap-1.5">
                  <div className="typing-dot" />
                  <div className="typing-dot" />
                  <div className="typing-dot" />
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
                  <img src={url} alt="" className="w-16 h-16 object-cover rounded-xl" />
                  <button
                    onClick={() => setPreviewImages((p) => p.filter((_, j) => j !== i))}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Icon name="X" size={10} className="text-white" />
                  </button>
                </div>
              ))}
              <div className="flex items-end pb-1">
                <span className="text-xs text-muted-foreground">{previewImages.length} фото готово к отправке</span>
              </div>
            </div>
          )}

          {/* Input bar */}
          <div className="glass px-4 py-3 border-t border-white/10 flex-shrink-0">
            <div className="flex items-end gap-2.5">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-9 h-9 rounded-xl glass flex items-center justify-center flex-shrink-0 hover:scale-105 transition-all mb-0.5"
                title="Прикрепить файл или фото"
              >
                <Icon name="Paperclip" size={16} className="text-muted-foreground" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,video/*,.pdf,.doc,.docx,.zip,.rar"
                className="hidden"
                onChange={handleFile}
              />

              <div className="flex-1 glass rounded-2xl px-4 py-2.5 flex items-end gap-2">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKey}
                  placeholder="Написать сообщение..."
                  rows={1}
                  className="flex-1 bg-transparent text-sm placeholder:text-muted-foreground outline-none resize-none max-h-[120px] text-foreground leading-relaxed"
                  style={{ minHeight: "24px" }}
                />
                <button className="flex-shrink-0 mb-0.5">
                  <Icon name="Smile" size={18} className="text-muted-foreground hover:text-primary transition-colors" />
                </button>
              </div>

              {input.trim() || previewImages.length > 0 ? (
                <button
                  onClick={sendText}
                  className="w-10 h-10 rounded-2xl btn-send flex items-center justify-center flex-shrink-0 mb-0.5 shadow-lg hover:scale-105 transition-all"
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
                  className="w-10 h-10 rounded-2xl glass flex items-center justify-center flex-shrink-0 mb-0.5 hover:scale-105 transition-all hover:bg-red-500/10"
                  title="Голосовое сообщение"
                >
                  <Icon name="Mic" size={17} className="text-muted-foreground hover:text-red-500 transition-colors" />
                </button>
              )}
            </div>

            {voice.recording && (
              <div className="mt-2 flex items-center gap-2 px-1">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-xs text-red-500 font-medium">Запись {fmtDuration(voice.seconds)}</span>
                <span className="text-xs text-muted-foreground ml-auto">■ стоп</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {showAddFriend && (
        <AddFriendModal friends={friends} onAdd={addFriend} onClose={() => setShowAddFriend(false)} />
      )}
      {showProfile && (
        <ProfileModal
          profile={myProfile}
          onSave={(p) => setMyProfile(p)}
          onClose={() => setShowProfile(false)}
        />
      )}
      {imageViewer && (
        <ImageViewer src={imageViewer} onClose={() => setImageViewer(null)} />
      )}
    </div>
  );
}
