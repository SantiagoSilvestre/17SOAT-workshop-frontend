/** Formato de dinheiro do backend: valor decimal com até duas casas e moeda (sempre BRL hoje). */
export interface Money {
  value: number;
  currency: 'BRL';
}

const formatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export function formatMoney(money: Money): string {
  return formatter.format(money.value);
}

/** Arredonda para centavos, como o backend exige (no máximo duas casas decimais). */
export function toMoney(value: number): Money {
  return { value: Math.round(value * 100) / 100, currency: 'BRL' };
}
