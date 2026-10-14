import {
  formatDocument,
  formatPhone,
  formatPhoneInput,
  formatPostalCode,
  isValidDocument,
  isValidPhone,
  toLocalPhone,
} from './br';

describe('formatos brasileiros', () => {
  it('formata CPF e CNPJ conforme a quantidade de dígitos', () => {
    expect(formatDocument('5294')).toBe('529.4');
    expect(formatDocument('52998224725')).toBe('529.982.247-25');
    expect(formatDocument('11222333000181')).toBe('11.222.333/0001-81');
    expect(formatDocument('11.222.333/0001-81999')).toBe('11.222.333/0001-81');
  });

  it('valida os dígitos verificadores como o backend', () => {
    expect(isValidDocument('529.982.247-25')).toBe(true);
    expect(isValidDocument('529.982.247-24')).toBe(false);
    expect(isValidDocument('111.111.111-11')).toBe(false);
    expect(isValidDocument('11.222.333/0001-81')).toBe(true);
    expect(isValidDocument('11.222.333/0001-80')).toBe(false);
    expect(isValidDocument('123')).toBe(false);
  });

  it('formata telefone fixo e celular', () => {
    expect(formatPhoneInput('1132654321')).toBe('(11) 3265-4321');
    expect(formatPhoneInput('11912345678')).toBe('(11) 91234-5678');
    expect(isValidPhone('(11) 91234-5678')).toBe(true);
    expect(isValidPhone('912345678')).toBe(false);
  });

  it('mostra no formato local o telefone salvo em E.164', () => {
    expect(toLocalPhone('+5511912345678')).toBe('11912345678');
    expect(formatPhone('+5511912345678')).toBe('(11) 91234-5678');
    expect(formatPhone('+14155552671')).toBe('+14155552671');
  });

  it('formata CEP', () => {
    expect(formatPostalCode('01310100')).toBe('01310-100');
  });
});
