export function normalizeText(text: string | null | undefined): string {
  if (!text) return '';
  return text
    .toString()
    .trim()
    .replace(/\s+/g, ' ');
}

export function compareNormalized(text1: string | null | undefined, text2: string | null | undefined): boolean {
  const normalized1 = normalizeText(text1).toLowerCase();
  const normalized2 = normalizeText(text2).toLowerCase();
  return normalized1 === normalized2;
}

export function parseCsvList(csvString: string | null | undefined): string[] {
  if (!csvString) return [];

  return csvString
    .toString()
    .split(',')
    .map(item => normalizeText(item))
    .filter(item => item.length > 0);
}
