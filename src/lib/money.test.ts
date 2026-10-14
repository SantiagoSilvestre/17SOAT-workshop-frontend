import { formatMoney, toMoney } from './money';

describe('dinheiro', () => {
  it('formata em reais', () => {
    expect(formatMoney({ value: 1234.5, currency: 'BRL' })).toMatch(/R\$\s1\.234,50/);
  });

  it('arredonda para centavos ao montar o valor da API', () => {
    expect(toMoney(10.006)).toEqual({ value: 10.01, currency: 'BRL' });
    expect(toMoney(99.9)).toEqual({ value: 99.9, currency: 'BRL' });
  });
});
