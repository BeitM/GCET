export const UI_LANGUAGES = ["en", "es", "fr", "zh"] as const;

export type UiLanguage = (typeof UI_LANGUAGES)[number];

const EN_STOPWORDS = [
  "the", "and", "is", "are", "please", "help", "with", "for", "to", "my", "this", "that", "robot", "arm",
];

const ES_STOPWORDS = [
  "el", "la", "de", "que", "por", "para", "con", "hola", "gracias", "puedes", "ayudar", "brazo", "robotico", "control",
];

const FR_STOPWORDS = [
  "le", "la", "les", "de", "des", "pour", "avec", "bonjour", "merci", "pouvez", "aider", "bras", "robotique", "controle",
];

function countMatches(tokens: string[], words: string[]): number {
  const tokenSet = new Set(tokens);
  return words.reduce((count, word) => count + (tokenSet.has(word) ? 1 : 0), 0);
}

function detectLanguagesInText(text: string): { detected: Set<UiLanguage>; mixed: boolean } {
  const detected = new Set<UiLanguage>();

  if ((text.match(/[\u4e00-\u9fff]/g) ?? []).length >= 2) detected.add("zh");

  const tokens = (text.toLowerCase().match(/[a-z\u00c0-\u017f]+/g) ?? [])
    .filter((token) => token.length >= 2);
  const enScore = countMatches(tokens, EN_STOPWORDS);
  const esScore = countMatches(tokens, ES_STOPWORDS);
  const frScore = countMatches(tokens, FR_STOPWORDS);

  if (esScore >= 2 || /[ñáéíóúü]/i.test(text)) detected.add("es");
  if (frScore >= 2 || /[àâçéèêëîïôûùüÿœæ]/i.test(text)) detected.add("fr");
  if (!detected.has("es") && !detected.has("fr") && !detected.has("zh") && enScore >= 2) {
    detected.add("en");
  }

  return { detected, mixed: detected.size > 1 };
}

export function resolveResponseLanguage(uiLanguage: UiLanguage, userText?: string): UiLanguage {
  if (!userText || userText.trim().length === 0) return uiLanguage;
  const { detected, mixed } = detectLanguagesInText(userText);
  if (mixed || detected.size === 0) return uiLanguage;
  return Array.from(detected)[0] ?? uiLanguage;
}

export function shouldMirrorMixedStyle(userText?: string): boolean {
  if (!userText || userText.trim().length === 0) return false;
  return detectLanguagesInText(userText).mixed;
}

function languageName(language: UiLanguage): string {
  switch (language) {
    case "en": return "English";
    case "es": return "Spanish";
    case "fr": return "French";
    case "zh": return "Chinese";
  }
}

export function buildLanguagePolicyInstruction(
  uiLanguage: UiLanguage,
  responseLanguage: UiLanguage,
  userText?: string,
): string {
  const mirrorMixed = shouldMirrorMixedStyle(userText);

  return [
    "Language policy (must follow):",
    `- UI-selected default language: ${languageName(uiLanguage)}.`,
    `- For this turn, respond in: ${languageName(responseLanguage)} unless the user is writing in a clearly mixed-language style.`,
    mirrorMixed
      ? "- The user's latest message is mixed-language: mirror that mixed style (e.g., Chinese+English) and keep the same tone/register."
      : "- If the user's latest message is single-language, match that language and tone.",
    "- If language is ambiguous, fall back to the UI-selected default language.",
    "- Keep FTC, DECODE, telemetry, code identifiers, units, and protocol names in their original form when natural.",
    "- Translate all human-readable JSON values, but keep the required JSON key names and status enum values exactly as specified.",
  ].join("\n");
}
