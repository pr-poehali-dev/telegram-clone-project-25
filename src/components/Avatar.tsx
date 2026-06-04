interface AvatarProps {
  initials: string;
  color: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  online?: boolean;
  imageUrl?: string;
}

export default function Avatar({ initials, color, size = "md", online, imageUrl }: AvatarProps) {
  const sizes = {
    xs: "w-7 h-7 text-[10px]",
    sm: "w-9 h-9 text-xs",
    md: "w-11 h-11 text-sm",
    lg: "w-14 h-14 text-base",
    xl: "w-20 h-20 text-xl",
  };
  const dotSizes = {
    xs: "w-2 h-2 border",
    sm: "w-2.5 h-2.5 border",
    md: "w-3 h-3 border-2",
    lg: "w-3.5 h-3.5 border-2",
    xl: "w-4 h-4 border-2",
  };
  return (
    <div className="relative flex-shrink-0">
      <div className={`${sizes[size]} rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center font-bold text-white shadow-md overflow-hidden`}>
        {imageUrl ? (
          <img src={imageUrl} alt={initials} className="w-full h-full object-cover" />
        ) : (
          initials
        )}
      </div>
      {online && (
        <div className={`${dotSizes[size]} absolute -bottom-0.5 -right-0.5 bg-emerald-400 rounded-full border-white dark:border-transparent`} />
      )}
    </div>
  );
}
