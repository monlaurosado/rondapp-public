export const motion = {
  pressScale: 0.965,
  cardStaggerMs: 55,
  microMs: 120,
  standardMs: 220,
  emphasisMs: 360,
  heroMs: 560,
  fastMs: 120,
  mediumMs: 220,
  burstMs: 360,
  springs: {
    press: { damping: 18, stiffness: 320, mass: 0.55 },
    soft: { damping: 20, stiffness: 180, mass: 0.75 },
    celebrate: { damping: 14, stiffness: 240, mass: 0.65 },
  },
} as const;
