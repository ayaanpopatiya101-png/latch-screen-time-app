import { motion } from "framer-motion";

export type LumiMood = "happy" | "coach" | "celebrate" | "thinking" | "wave";
export type LumiSize = "sm" | "md" | "lg";

const sizes: Record<LumiSize, string> = {
  sm: "h-12 w-12",
  md: "h-20 w-20",
  lg: "h-28 w-28",
};

export function LumiAvatar({ mood = "happy", size = "md" }: { mood?: LumiMood; size?: LumiSize }) {
  const eyeY = mood === "celebrate" ? 17 : 18;
  const eyeShape =
    mood === "thinking" ? (
      <>
        <circle cx="37" cy={eyeY} r="3" fill="#102F2D" />
        <path d="M55 18h8" stroke="#102F2D" strokeWidth="3" strokeLinecap="round" />
      </>
    ) : (
      <>
        <circle cx="37" cy={eyeY} r="4" fill="#102F2D" />
        <circle cx="59" cy={eyeY} r="4" fill="#102F2D" />
      </>
    );
  const mouth =
    mood === "coach"
      ? "M38 63h20"
      : mood === "celebrate"
        ? "M34 58c8 12 22 12 28 0"
        : mood === "thinking"
          ? "M40 64q8 -4 16 0"
          : "M36 61c6 7 18 7 24 0";

  const animate = (() => {
    switch (mood) {
      case "celebrate":
        return { y: [0, -10, 0, -6, 0], rotate: [0, -6, 6, -3, 0] };
      case "wave":
        return { y: [0, -3, 0], rotate: [0, 4, -4, 0] };
      case "thinking":
        return { y: [0, -2, 0], rotate: [0, 1.5, -1.5, 0] };
      case "coach":
        return { y: [0, -4, 0] };
      default:
        return { y: [0, -5, 0] };
    }
  })();

  const duration = mood === "celebrate" ? 1.6 : mood === "wave" ? 1.4 : 2.8;

  return (
    <motion.div
      animate={animate}
      transition={{ duration, repeat: Infinity, ease: "easeInOut" }}
      className="relative shrink-0"
    >
      <svg viewBox="0 0 96 96" className={sizes[size]} aria-label="Lumi mascot">
        <defs>
          <linearGradient id="lumiBodyShared" x1="15" x2="84" y1="12" y2="82">
            <stop stopColor="#D8F16A" />
            <stop offset="1" stopColor="#7DE2C2" />
          </linearGradient>
        </defs>
        <path
          d="M25 45V30c0-12 9-21 23-21s23 9 23 21v15"
          fill="none"
          stroke="#102F2D"
          strokeWidth="8"
          strokeLinecap="round"
        />
        <rect x="16" y="35" width="64" height="48" rx="20" fill="url(#lumiBodyShared)" stroke="#102F2D" strokeWidth="5" />
        {eyeShape}
        <path d={mouth} stroke="#102F2D" strokeWidth="5" strokeLinecap="round" fill="none" />
        <path d="M17 51c-8 1-13 5-13 11 0 7 6 11 13 11" stroke="#102F2D" strokeWidth="5" strokeLinecap="round" fill="none" />
        <path d="M79 51c8 1 13 5 13 11 0 7-6 11-13 11" stroke="#102F2D" strokeWidth="5" strokeLinecap="round" fill="none" />
        {mood === "celebrate" && (
          <>
            <circle cx="12" cy="14" r="2.4" fill="#F2E14A" />
            <circle cx="84" cy="10" r="2" fill="#B388FF" />
            <circle cx="88" cy="42" r="1.8" fill="#F2E14A" />
            <circle cx="6" cy="40" r="1.8" fill="#7DE2C2" />
          </>
        )}
      </svg>
      <span className="absolute -right-1 top-1 rounded-full bg-background px-2 py-1 text-[10px] font-black shadow-sm">
        Lumi
      </span>
    </motion.div>
  );
}
