import { NumberInput, type NumberInputProps } from '@mantine/core';

type MoneyInputProps = Omit<NumberInputProps, 'value' | 'onChange'> & {
  value: number | undefined;
  onChange: (value: number | undefined) => void;
};

// Com casas decimais fixas o NumberInput devolve texto ("1234.50") para não perder os zeros.
function toNumber(value: number | string): number | undefined {
  if (typeof value === 'number') return value;
  if (value.trim() === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

/** Campo de valor em reais: vírgula decimal, ponto de milhar e sempre duas casas. */
export function MoneyInput({ value, onChange, ...props }: MoneyInputProps) {
  return (
    <NumberInput
      prefix="R$ "
      decimalSeparator=","
      thousandSeparator="."
      decimalScale={2}
      fixedDecimalScale
      allowNegative={false}
      hideControls
      inputMode="decimal"
      {...props}
      value={value ?? ''}
      onChange={(next) => onChange(toNumber(next))}
    />
  );
}
