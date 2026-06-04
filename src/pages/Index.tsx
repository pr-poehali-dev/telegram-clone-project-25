import { useState, useRef, useEffect } from "react";
import Icon from "@/components/ui/icon";

const CHATS = [
  {
    id: 1,
    name: "Алексей Петров",
    avatar: "АП",
    color: "from-blue-500 to-indigo-600",
    lastMsg: "Отлично, созвонимся в пятницу!",
    time: "14:32",
    unread: 3,
    online: true,
    isGroup: false,
    isChannel: false,
    members: 0,
    messages: [
      { id: 1, text: "Привет! Как дела с проектом?", from: "in", time: "14:10", sender: "" },
      { id: 2, text: "Всё идёт по плану, заканчиваем дизайн", from: "out", time: "14:15", sender: "" },
      { id: 3, text: "Круто! Когда планируете сдать?", from: "in", time: "14:20", sender: "" },
      { id: 4, text: "Пятница — крайний срок, успеваем", from: "out", time: "14:25", sender: "" },
      { id: 5, text: "Отлично, созвонимся в пятницу!", from: "in", time: "14:32", sender: "" },
    ],
  },
  {
    id: 2,
    name: "Команда Дизайна",
    avatar: "КД",
    color: "from-purple-500 to-pink-500",
    lastMsg: "Макеты загружены в Figma 🎨",
    time: "13:55",
    unread: 0,
    online: false,
    isGroup: true,
    isChannel: false,
    members: 8,
    messages: [
      { id: 1, text: "Ребята, всем привет!", from: "in", time: "12:00", sender: "Мария" },
      { id: 2, text: "Загрузила новые компоненты в библиотеку", from: "in", time: "12:05", sender: "Мария" },
      { id: 3, text: "Вижу, отличная работа!", from: "out", time: "12:10", sender: "" },
      { id: 4, text: "Макеты загружены в Figma 🎨", from: "in", time: "13:55", sender: "Дмитрий" },
    ],
  },
  {
    id: 3,
    name: "Мария Соколова",
    avatar: "МС",
    color: "from-rose-400 to-pink-600",
    lastMsg: "Документ отправила на почту",
    time: "12:20",
    unread: 1,
    online: true,
    isGroup: false,
    isChannel: false,
    members: 0,
    messages: [
      { id: 1, text: "Добрый день! Отправила договор на рассмотрение", from: "in", time: "11:30", sender: "" },
      { id: 2, text: "Получил, просмотрю сегодня", from: "out", time: "11:45", sender: "" },
      { id: 3, text: "Спасибо! Документ отправила на почту", from: "in", time: "12:20", sender: "" },
    ],
  },
  {
    id: 4,
    name: "Иван Козлов",
    avatar: "ИК",
    color: "from-emerald-400 to-teal-600",
    lastMsg: "Ты видел последний релиз?",
    time: "вчера",
    unread: 0,
    online: false,
    isGroup: false,
    isChannel: false,
    members: 0,
    messages: [
      { id: 1, text: "Привет! Ты видел последний релиз?", from: "in", time: "вчера", sender: "" },
      { id: 2, text: "Да, очень крутые улучшения!", from: "out", time: "вчера", sender: "" },
    ],
  },
  {
    id: 5,
    name: "Новости Tech",
    avatar: "НТ",
    color: "from-amber-400 to-orange-500",
    lastMsg: "Apple выпустила iOS 19 с новым ИИ",
    time: "вчера",
    unread: 12,
    online: false,
    isGroup: false,
    isChannel: true,
    members: 0,
    messages: [
      { id: 1, text: "Apple выпустила iOS 19 с новым ИИ-ассистентом, который работает полностью на устройстве.", from: "in", time: "вчера", sender: "" },
      { id: 2, text: "Новая версия включает расширенные функции конфиденциальности и поддержку сторонних ИИ-моделей.", from: "in", time: "вчера", sender: "" },
    ],
  },
  {
    id: 6,
    name: "Анна Белова",
    avatar: "АБ",
    color: "from-sky-400 to-blue-600",
    lastMsg: "Встреча перенесена на 16:00",
    time: "пн",
    unread: 0,
    online: false,
    isGroup: false,
    isChannel: false,
    members: 0,
    messages: [
      { id: 1, text: "Встреча перенесена на 16:00", from: "in", time: "пн", sender: "" },
    ],
  },
];

type Chat = typeof CHATS[0];
type Message = { id: number; text: string; from: string; time: string; sender: string };

function Avatar({ initials, color, size = "md", online }: { initials: string; color: string; size?: "sm" | "md" | "lg"; online?: boolean }) {
  const sizes = { sm: "w-9 h-9 text-xs", md: "w-11 h-11 text-sm", lg: "w-14 h-14 text-base" };
  return (
    <div className="relative flex-shrink-0">
      <div className={`${sizes[size]} rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center font-bold text-white shadow-md`}>
        {initials}
      </div>
      {online && <div className="online-dot absolute -bottom-0.5 -right-0.5" />}
    </div>
  );
}

export default function Index() {
  const [dark, setDark] = useState(false);
  const [selectedChat, setSelectedChat] = useState<Chat>(CHATS[0]);
  const [messages, setMessages] = useState<Record<number, Message[]>>(() =>
    Object.fromEntries(CHATS.map((c) => [c.id, c.messages]))
  );
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const [typing, setTyping] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, selectedChat]);

  const filtered = CHATS.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.lastMsg.toLowerCase().includes(search.toLowerCase())
  );

  const sendMessage = () => {
    const text = input.trim();
    if (!text) return;
    const newMsg: Message = {
      id: Date.now(),
      text,
      from: "out",
      time: new Date().toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit" }),
      sender: "",
    };
    setMessages((prev) => ({ ...prev, [selectedChat.id]: [...(prev[selectedChat.id] || []), newMsg] }));
    setInput("");
    setTyping(true);
    setTimeout(() => {
      const replies = [
        "Понял, спасибо! 👍",
        "Отличная идея, давай обсудим детали",
        "Хорошо, займусь этим",
        "Ок, скоро отвечу подробнее",
        "Согласен, так и сделаем ✓",
      ];
      const reply: Message = {
        id: Date.now() + 1,
        text: replies[Math.floor(Math.random() * replies.length)],
        from: "in",
        time: new Date().toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit" }),
        sender: "",
      };
      setMessages((prev) => ({ ...prev, [selectedChat.id]: [...(prev[selectedChat.id] || []), reply] }));
      setTyping(false);
    }, 1500 + Math.random() * 800);
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const currentMsgs = messages[selectedChat.id] || [];

  return (
    <div className="h-screen w-screen overflow-hidden gradient-bg flex items-center justify-center">
      {/* Background orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-blue-400/20 rounded-full blur-[100px]" />
        <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] bg-purple-400/20 rounded-full blur-[100px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-indigo-300/10 rounded-full blur-[80px]" />
      </div>

      {/* App Shell */}
      <div className="relative w-full h-full max-w-[1440px] flex shadow-2xl overflow-hidden rounded-none md:rounded-2xl md:h-[calc(100vh-32px)] md:m-4">

        {/* Sidebar */}
        <div className="glass-sidebar w-80 flex-shrink-0 flex-col hidden md:flex">
          {/* Header */}
          <div className="px-4 py-4 flex items-center gap-3 border-b border-white/10">
            <div className="flex-1 flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                <Icon name="MessageCircle" size={14} className="text-white" />
              </div>
              <span className="font-bold text-foreground text-base tracking-tight">Облако</span>
            </div>
            <button
              onClick={() => setDark(!dark)}
              className="w-9 h-9 rounded-xl glass flex items-center justify-center transition-all hover:scale-105 active:scale-95"
            >
              <Icon name={dark ? "Sun" : "Moon"} size={17} className="text-foreground/70" />
            </button>
            <button className="w-9 h-9 rounded-xl glass flex items-center justify-center transition-all hover:scale-105 active:scale-95">
              <Icon name="SquarePen" size={17} className="text-foreground/70" />
            </button>
          </div>

          {/* Search */}
          <div className="px-4 py-3">
            <div className="relative">
              <Icon name="Search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Поиск..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl glass text-sm placeholder:text-muted-foreground bg-transparent outline-none focus:ring-1 focus:ring-primary/30 transition-all"
              />
            </div>
          </div>

          {/* Tabs */}
          <div className="px-4 pb-3 flex gap-1.5">
            {["Все", "Личные", "Группы"].map((tab, i) => (
              <button
                key={tab}
                className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  i === 0
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "text-muted-foreground hover:bg-primary/10"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Chat list */}
          <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-0.5">
            {filtered.map((chat, idx) => (
              <div
                key={chat.id}
                onClick={() => { setSelectedChat(chat); setShowInfo(false); }}
                className={`chat-item px-3 py-2.5 cursor-pointer flex items-center gap-3 animate-chat-item ${
                  selectedChat.id === chat.id ? "active" : ""
                }`}
                style={{ animationDelay: `${idx * 40}ms` }}
              >
                <Avatar initials={chat.avatar} color={chat.color} size="md" online={chat.online} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="font-semibold text-sm text-foreground truncate flex items-center gap-1.5">
                      {chat.name}
                      {chat.isChannel && <Icon name="Megaphone" size={11} className="text-muted-foreground flex-shrink-0" />}
                      {chat.isGroup && <Icon name="Users" size={11} className="text-muted-foreground flex-shrink-0" />}
                    </span>
                    <span className="text-[10px] text-muted-foreground flex-shrink-0 ml-1">{chat.time}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground truncate pr-2">{chat.lastMsg}</p>
                    {chat.unread > 0 && (
                      <span className="flex-shrink-0 min-w-[18px] h-[18px] px-1 bg-primary rounded-full text-[10px] text-primary-foreground font-bold flex items-center justify-center">
                        {chat.unread}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Profile bar */}
          <div className="px-4 py-3 border-t border-white/10 flex items-center gap-2">
            <Avatar initials="ВЫ" color="from-blue-500 to-indigo-600" size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate text-foreground">Мой аккаунт</p>
              <p className="text-xs text-muted-foreground">@username</p>
            </div>
            <button className="w-8 h-8 rounded-lg hover:bg-primary/10 flex items-center justify-center transition-colors">
              <Icon name="Settings" size={15} className="text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Chat window */}
        <div className="flex-1 flex flex-col glass-chat min-w-0">
          {/* Chat header */}
          <div className="glass px-5 py-3.5 flex items-center gap-3 border-b border-white/10 flex-shrink-0">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <Avatar initials={selectedChat.avatar} color={selectedChat.color} size="md" online={selectedChat.online} />
              <div className="min-w-0">
                <h2 className="font-bold text-foreground text-base truncate">{selectedChat.name}</h2>
                <p className="text-xs text-muted-foreground">
                  {selectedChat.online
                    ? "в сети"
                    : selectedChat.isGroup
                    ? `${selectedChat.members} участников`
                    : selectedChat.isChannel
                    ? "канал"
                    : "был(а) недавно"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button className="w-9 h-9 rounded-xl glass flex items-center justify-center hover:scale-105 transition-all">
                <Icon name="Phone" size={16} className="text-foreground/70" />
              </button>
              <button className="w-9 h-9 rounded-xl glass flex items-center justify-center hover:scale-105 transition-all">
                <Icon name="Video" size={16} className="text-foreground/70" />
              </button>
              <button
                onClick={() => setShowInfo(!showInfo)}
                className={`w-9 h-9 rounded-xl glass flex items-center justify-center hover:scale-105 transition-all ${showInfo ? "bg-primary/15" : ""}`}
              >
                <Icon name="MoreVertical" size={16} className="text-foreground/70" />
              </button>
            </div>
          </div>

          {/* Messages area */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-2">
            <div className="flex items-center gap-3 my-3">
              <div className="flex-1 h-px bg-border/40" />
              <span className="text-[11px] text-muted-foreground font-medium px-3 py-1 glass rounded-full">Сегодня</span>
              <div className="flex-1 h-px bg-border/40" />
            </div>

            {currentMsgs.map((msg, idx) => (
              <div
                key={msg.id}
                className={`flex ${msg.from === "out" ? "justify-end" : "justify-start"} animate-message`}
                style={{ animationDelay: `${Math.min(idx * 25, 250)}ms` }}
              >
                <div className="max-w-[68%]">
                  {msg.sender && msg.from === "in" && (
                    <p className="text-[11px] font-semibold text-primary mb-1 ml-1">{msg.sender}</p>
                  )}
                  <div className={`px-4 py-2.5 shadow-sm ${msg.from === "out" ? "msg-bubble-out" : "msg-bubble-in text-foreground"}`}>
                    <p className="text-sm leading-relaxed">{msg.text}</p>
                    <div className={`flex items-center gap-1 mt-1 ${msg.from === "out" ? "justify-end" : "justify-start"}`}>
                      <span className={`text-[10px] ${msg.from === "out" ? "text-white/70" : "text-muted-foreground"}`}>
                        {msg.time}
                      </span>
                      {msg.from === "out" && <Icon name="CheckCheck" size={12} className="text-white/80" />}
                    </div>
                  </div>
                </div>
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

          {/* Input */}
          <div className="glass px-4 py-3 border-t border-white/10 flex-shrink-0">
            <div className="flex items-end gap-3">
              <button className="w-9 h-9 rounded-xl glass flex items-center justify-center flex-shrink-0 hover:scale-105 transition-all mb-0.5">
                <Icon name="Paperclip" size={16} className="text-muted-foreground" />
              </button>
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
              <button
                onClick={sendMessage}
                disabled={!input.trim()}
                className="w-10 h-10 rounded-2xl btn-send flex items-center justify-center flex-shrink-0 mb-0.5 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:transform-none shadow-lg"
              >
                <Icon name="Send" size={16} className="text-white" />
              </button>
            </div>
          </div>
        </div>

        {/* Info panel */}
        {showInfo && (
          <div className="w-72 glass-sidebar flex-shrink-0 hidden lg:flex flex-col border-l border-white/10">
            <div className="p-5 flex items-center justify-between border-b border-white/10">
              <span className="font-bold text-foreground">Информация</span>
              <button
                onClick={() => setShowInfo(false)}
                className="w-8 h-8 rounded-lg hover:bg-primary/10 flex items-center justify-center transition-colors"
              >
                <Icon name="X" size={16} className="text-muted-foreground" />
              </button>
            </div>
            <div className="p-5 flex flex-col items-center gap-3 border-b border-white/10">
              <Avatar initials={selectedChat.avatar} color={selectedChat.color} size="lg" online={selectedChat.online} />
              <div className="text-center">
                <h3 className="font-bold text-foreground text-lg">{selectedChat.name}</h3>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {selectedChat.online ? "В сети" : "Не в сети"}
                </p>
              </div>
            </div>
            <div className="p-4 space-y-1">
              {[
                { icon: "Bell", label: "Уведомления" },
                { icon: "Image", label: "Медиафайлы" },
                { icon: "Star", label: "Избранное" },
                { icon: "Ban", label: "Заблокировать" },
              ].map(({ icon, label }) => (
                <button
                  key={label}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-primary/8 transition-colors text-left"
                >
                  <Icon name={icon as "Bell"} size={16} className="text-muted-foreground" />
                  <span className="text-sm text-foreground">{label}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
