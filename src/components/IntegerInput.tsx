import { NumberInput, type NumberInputProps } from '@mantine/core';

type IntegerInputProps = Omit<NumberInputProps, 'value' | 'onChange'> & {
  value: number | null | undefined;
  onChange: (value: number | null) => void;
};

/**
 * Campo de número inteiro não negativo (ano, quilometragem). Vazio vira null, e não undefined:
 * com undefined o Controller do React Hook Form volta a mostrar o valor padrão do formulário.
 */
export function IntegerInput({ value, onChange, ...props }: IntegerInputProps) {
  return (
    <NumberInput
      allowDecimal={false}
      // Separador decimal fica diferente do de milhar ("."), exigência do react-number-format.
      decimalSeparator=","
      allowNegative={false}
      hideControls
      inputMode="numeric"
      {...props}
      value={value ?? ''}
      onChange={(next) => onChange(typeof next === 'number' ? next : null)}
    />
  );
}
