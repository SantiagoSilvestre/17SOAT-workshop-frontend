import { Checkbox, Grid, Select, Stack, Text, TextInput } from '@mantine/core';
import { Controller, useFormContext, type FieldErrors } from 'react-hook-form';
import { formatPhoneInput, formatPostalCode, UFS } from '@/lib/br';
import type { AddressFormValues, ContactFormValues } from './customerForm';

type AddressErrors = FieldErrors<AddressFormValues> | undefined;

/**
 * E-mail, telefone e endereço, compartilhados pelo cadastro e pela edição de contato.
 * `addressLocked` mantém o endereço ligado: a API não permite remover um endereço já salvo.
 */
export function ContactFields({ addressLocked = false }: { addressLocked?: boolean }) {
  const {
    register,
    control,
    watch,
    formState: { errors },
  } = useFormContext<ContactFormValues>();
  const hasAddress = watch('hasAddress');
  const addressErrors = errors.address as AddressErrors;

  return (
    <Stack>
      <Grid>
        <Grid.Col span={{ base: 12, sm: 7 }}>
          <TextInput label="E-mail" type="email" autoComplete="email" error={errors.email?.message} {...register('email')} />
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 5 }}>
          <Controller
            control={control}
            name="phone"
            render={({ field }) => (
              <TextInput
                label="Telefone"
                placeholder="(11) 91234-5678"
                inputMode="tel"
                autoComplete="tel"
                value={formatPhoneInput(field.value)}
                onChange={(event) => field.onChange(formatPhoneInput(event.currentTarget.value))}
                onBlur={field.onBlur}
                error={errors.phone?.message}
              />
            )}
          />
        </Grid.Col>
      </Grid>

      {addressLocked ? (
        <Text size="sm" fw={500}>
          Endereço
        </Text>
      ) : (
        <Checkbox label="Informar endereço" {...register('hasAddress')} />
      )}

      {hasAddress && (
        <Grid>
          <Grid.Col span={{ base: 12, sm: 4 }}>
            <Controller
              control={control}
              name="address.postalCode"
              render={({ field }) => (
                <TextInput
                  label="CEP"
                  placeholder="00000-000"
                  inputMode="numeric"
                  autoComplete="postal-code"
                  value={formatPostalCode(field.value ?? '')}
                  onChange={(event) => field.onChange(formatPostalCode(event.currentTarget.value))}
                  onBlur={field.onBlur}
                  error={addressErrors?.postalCode?.message}
                />
              )}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 8 }}>
            <TextInput label="Logradouro" error={addressErrors?.street?.message} {...register('address.street')} />
          </Grid.Col>
          <Grid.Col span={{ base: 6, sm: 3 }}>
            <TextInput label="Número" error={addressErrors?.number?.message} {...register('address.number')} />
          </Grid.Col>
          <Grid.Col span={{ base: 6, sm: 4 }}>
            <TextInput label="Complemento" error={addressErrors?.complement?.message} {...register('address.complement')} />
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 5 }}>
            <TextInput label="Bairro" error={addressErrors?.neighborhood?.message} {...register('address.neighborhood')} />
          </Grid.Col>
          <Grid.Col span={{ base: 8, sm: 9 }}>
            <TextInput label="Cidade" error={addressErrors?.city?.message} {...register('address.city')} />
          </Grid.Col>
          <Grid.Col span={{ base: 4, sm: 3 }}>
            <Controller
              control={control}
              name="address.state"
              render={({ field }) => (
                <Select
                  label="UF"
                  data={UFS}
                  searchable
                  value={field.value || null}
                  onChange={(value) => field.onChange(value ?? '')}
                  onBlur={field.onBlur}
                  error={addressErrors?.state?.message}
                />
              )}
            />
          </Grid.Col>
        </Grid>
      )}
    </Stack>
  );
}
