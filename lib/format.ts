export function percentage(used: number, limit: number) {
  if (limit <= 0) return 0;
  return Math.min(100, Math.round((used / limit) * 100));
}

export function plural(count: number, singular: string, pluralText: string) {
  return count === 1 ? singular : pluralText;
}
