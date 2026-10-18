/** Languages people can choose for their account. Dates, times and numbers follow it in every app. */
export const LANGUAGES: { code: string; name: string }[] = [
  { code: 'en-US', name: 'English (United States)' },
  { code: 'en-GB', name: 'English (United Kingdom)' },
  { code: 'es-ES', name: 'Español (España)' },
  { code: 'es-MX', name: 'Español (México)' },
  { code: 'fr-FR', name: 'Français' },
  { code: 'de-DE', name: 'Deutsch' },
  { code: 'it-IT', name: 'Italiano' },
  { code: 'pt-BR', name: 'Português (Brasil)' },
  { code: 'nl-NL', name: 'Nederlands' },
  { code: 'sv-SE', name: 'Svenska' },
  { code: 'pl-PL', name: 'Polski' },
  { code: 'tr-TR', name: 'Türkçe' },
  { code: 'uk-UA', name: 'Українська' },
  { code: 'ar', name: 'العربية' },
  { code: 'hi-IN', name: 'हिन्दी' },
  { code: 'ja-JP', name: '日本語' },
  { code: 'ko-KR', name: '한국어' },
  { code: 'zh-CN', name: '中文（简体）' },
];

export function timeZones(): string[] {
  try {
    return (Intl as unknown as { supportedValuesOf(key: string): string[] }).supportedValuesOf('timeZone');
  } catch {
    return ['UTC', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'Europe/London', 'Europe/Paris', 'Asia/Tokyo'];
  }
}

export function deviceTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}

export function deviceLanguage(): string {
  const lang = navigator.language || 'en-US';
  return LANGUAGES.find((l) => l.code === lang)?.code ?? LANGUAGES.find((l) => l.code.startsWith(lang.split('-')[0]))?.code ?? 'en-US';
}
