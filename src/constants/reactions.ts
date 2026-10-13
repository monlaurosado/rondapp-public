export const REACTIONS = [
  { id: "cheers", label: "Brindis", symbol: "B", icon: "wineglass.fill" },
  { id: "laugh", label: "Risa", symbol: "R", icon: "face.smiling.fill" },
  { id: "fire", label: "Fuego", symbol: "F", icon: "flame.fill" },
  { id: "wow", label: "Brutal", symbol: "!", icon: "sparkles" },
] as const;

export type ReactionType = (typeof REACTIONS)[number]["id"];
