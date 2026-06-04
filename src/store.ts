export type MessageType = "text" | "image" | "voice" | "file" | "video";

export interface Message {
  id: string;
  text?: string;
  type: MessageType;
  from: "me" | "them";
  time: string;
  mediaUrl?: string;
  fileName?: string;
  fileSize?: string;
  duration?: number;
  replyTo?: string;
  reactions?: { emoji: string; count: number }[];
}

export interface User {
  id: string;
  name: string;
  username: string;
  avatar: string;
  color: string;
  bio: string;
  online: boolean;
  lastSeen?: string;
}

export interface Chat {
  id: string;
  userId: string;
  messages: Message[];
  draft?: string;
}

export const USERS: User[] = [
  { id: "u1", name: "Алексей Петров", username: "alex_petrov", avatar: "АП", color: "from-blue-500 to-indigo-600", bio: "Разработчик, люблю горы ⛰️", online: true },
  { id: "u2", name: "Мария Соколова", username: "masha_s", avatar: "МС", color: "from-rose-400 to-pink-600", bio: "Дизайнер UX/UI", online: true, lastSeen: "5 мин назад" },
  { id: "u3", name: "Дмитрий Козлов", username: "dima_kz", avatar: "ДК", color: "from-emerald-400 to-teal-600", bio: "Продакт-менеджер", online: false, lastSeen: "1 час назад" },
  { id: "u4", name: "Анна Белова", username: "anna_b", avatar: "АБ", color: "from-amber-400 to-orange-500", bio: "Маркетолог | @anna_b", online: false, lastSeen: "вчера" },
  { id: "u5", name: "Никита Волков", username: "nikita_v", avatar: "НВ", color: "from-violet-500 to-purple-600", bio: "Инвестиции и финансы 📈", online: true },
];

export const ALL_USERS: User[] = [
  ...USERS,
  { id: "u6", name: "Сергей Морозов", username: "sergey_m", avatar: "СМ", color: "from-cyan-400 to-blue-500", bio: "Backend разработчик", online: false },
  { id: "u7", name: "Елена Новикова", username: "elena_n", avatar: "ЕН", color: "from-fuchsia-400 to-pink-500", bio: "Фотограф | Instagram", online: true },
  { id: "u8", name: "Павел Орлов", username: "pavel_o", avatar: "ПО", color: "from-lime-400 to-green-600", bio: "Стартапер 🚀", online: false },
  { id: "u9", name: "Ксения Зайцева", username: "xenia_z", avatar: "КЗ", color: "from-red-400 to-rose-600", bio: "HR специалист", online: true },
  { id: "u10", name: "Иван Смирнов", username: "ivan_sm", avatar: "ИС", color: "from-teal-400 to-cyan-600", bio: "ML инженер", online: false },
];

export const INITIAL_CHATS: Record<string, Chat> = {
  u1: {
    id: "u1", userId: "u1",
    messages: [
      { id: "m1", type: "text", text: "Привет! Как дела с проектом?", from: "them", time: "14:10" },
      { id: "m2", type: "text", text: "Всё идёт по плану, заканчиваем дизайн", from: "me", time: "14:15" },
      { id: "m3", type: "image", mediaUrl: "https://images.unsplash.com/photo-1551650975-87deedd944c3?w=400", from: "them", time: "14:18" },
      { id: "m4", type: "text", text: "Крутой скрин! Когда сдаёте?", from: "me", time: "14:20" },
      { id: "m5", type: "voice", duration: 12, from: "them", time: "14:25" },
      { id: "m6", type: "text", text: "Понял! Отлично 🔥", from: "me", time: "14:32" },
    ],
  },
  u2: {
    id: "u2", userId: "u2",
    messages: [
      { id: "m1", type: "text", text: "Добрый день! Посмотри на новые макеты", from: "them", time: "12:00" },
      { id: "m2", type: "image", mediaUrl: "https://images.unsplash.com/photo-1558655146-364adaf1fcc9?w=400", from: "them", time: "12:01" },
      { id: "m3", type: "text", text: "Огонь, мне нравится направление!", from: "me", time: "12:15" },
      { id: "m4", type: "file", fileName: "design_v2.fig", fileSize: "4.2 MB", from: "them", time: "13:55" },
    ],
  },
  u3: {
    id: "u3", userId: "u3",
    messages: [
      { id: "m1", type: "text", text: "Встреча в 16:00 не отменилась?", from: "them", time: "вчера" },
      { id: "m2", type: "text", text: "Нет, буду", from: "me", time: "вчера" },
    ],
  },
};

export const MY_PROFILE: User = {
  id: "me",
  name: "Вы",
  username: "my_username",
  avatar: "ВЫ",
  color: "from-blue-600 to-violet-600",
  bio: "Мой статус",
  online: true,
};
