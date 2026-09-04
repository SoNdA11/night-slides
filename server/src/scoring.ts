/**
 * Calculate score based on speed.
 * Faster answer = more points. Multiplied by round multiplier.
 *
 * Tiers (seconds from round start):
 *   < 3s  → 500 base
 *   < 6s  → 350 base
 *   < 10s → 200 base
 *   else  → 100 base
 *
 * Streak bonus: +50 per consecutive correct answer (max +200)
 *
 * Final = (base + streakBonus) × multiplier
 */
export function calculateSpeedScore(
  correct: boolean,
  answerTimeMs: number | null,
  roundStartTimeMs: number,
  multiplier: number = 1,
  streak: number = 0,
): number {
  if (!correct) return 0;
  if (!answerTimeMs) return 0;

  const elapsed = (answerTimeMs - roundStartTimeMs) / 1000;
  let base: number;

  if (elapsed < 3) base = 500;
  else if (elapsed < 6) base = 350;
  else if (elapsed < 10) base = 200;
  else base = 100;

  const streakBonus = Math.min(streak * 50, 200);

  return (base + streakBonus) * multiplier;
}
