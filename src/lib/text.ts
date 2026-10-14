/** Normaliza para busca: minúsculas e sem acentos ("Revisão" casa com "revisao"). */
export function normalizeText(value: string): string {
  return value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();
}
