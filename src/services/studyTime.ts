// Caps each question's time so a quiz left open/idle can't leak hours into study time.
export const PER_QUESTION_CAP_SECONDS = 180;

export function computeCappedQuizSeconds(
  perQuestionResults: { timeSeconds?: number }[],
  capSeconds: number = PER_QUESTION_CAP_SECONDS
): number {
  return perQuestionResults.reduce(
    (sum, r) => sum + Math.min(r.timeSeconds || 0, capSeconds),
    0
  );
}
