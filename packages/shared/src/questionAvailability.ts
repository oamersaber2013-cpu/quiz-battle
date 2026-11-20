import { Difficulty } from "./enums";

const all = [Difficulty.Novice, Difficulty.Scholar, Difficulty.Sage, Difficulty.Master, Difficulty.Legend];
// Guaranteed local content. Keep this aligned with the category/grade regression
// over the real offline banks; a paid question provider is never required.
export const OFFLINE_CATEGORY_DIFFICULTIES: Record<string, readonly Difficulty[]> = {
  general: all, science: all, geography: all,
  history: [Difficulty.Scholar, Difficulty.Sage, Difficulty.Master, Difficulty.Legend],
  technology: [Difficulty.Sage], sports: [Difficulty.Novice],
  islamic: [Difficulty.Novice, Difficulty.Scholar, Difficulty.Sage],
  anime: [Difficulty.Novice, Difficulty.Scholar], movies: [Difficulty.Novice, Difficulty.Scholar],
  games: [Difficulty.Novice, Difficulty.Scholar], literature: [Difficulty.Scholar], art: [Difficulty.Scholar],
  math: all, music: [Difficulty.Sage],
};

export function normalizeQuestionCategory(category: string): string {
  const canonical = category.trim().toLowerCase();
  return canonical === "gaming" ? "games" : canonical;
}

export function getPlayableDifficulties(categories: readonly string[] = []): Difficulty[] {
  const requested = categories.length ? categories : ["general"];
  return all.filter(difficulty => requested.every(category =>
    OFFLINE_CATEGORY_DIFFICULTIES[normalizeQuestionCategory(category)]?.includes(difficulty)));
}
