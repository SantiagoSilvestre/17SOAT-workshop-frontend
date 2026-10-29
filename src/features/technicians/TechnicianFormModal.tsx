import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Checkbox, Group, Modal, SimpleGrid, Stack, TextInput } from '@mantine/core';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import {
  SPECIALTIES,
  SPECIALTY_LABELS,
  useCreateTechnician,
  useRenameTechnician,
  type Specialty,
  type Technician,
} from '@/api/technicians';
import { notifyError, notifySuccess } from '@/lib/notify';

const nameSchema = z.string().trim().min(1, 'Informe o nome').max(255, 'Use no máximo 255 caracteres');

// CreateTechnicianRequest: nome obrigatório e ao menos uma especialidade.
const createSchema = z.object({
  name: nameSchema,
  specialties: z.array(z.enum(SPECIALTIES)).min(1, 'Escolha ao menos uma especialidade'),
});
const renameSchema = z.object({ name: nameSchema, specialties: z.array(z.enum(SPECIALTIES)) });

type FormValues = { name: string; specialties: Specialty[] };

interface TechnicianFormModalProps {
  opened: boolean;
  /** Sem técnico, cadastra um novo. Com técnico, só renomeia: a API não altera especialidades. */
  technician?: Technician | null;
  onClose: () => void;
}

export function TechnicianFormModal({ opened, technician, onClose }: TechnicianFormModalProps) {
  const create = useCreateTechnician();
  const rename = useRenameTechnician();
  const editing = Boolean(technician);

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(editing ? renameSchema : createSchema) });

  useEffect(() => {
    if (opened) reset({ name: technician?.name ?? '', specialties: technician?.specialties ?? [] });
  }, [opened, technician, reset]);

  const onSubmit = handleSubmit(async ({ name, specialties }) => {
    try {
      if (technician) {
        if (name !== technician.name) await rename.mutateAsync({ id: technician.id, name });
        notifySuccess('Nome atualizado.');
      } else {
        await create.mutateAsync({ name, specialties });
        notifySuccess(`${name} foi cadastrado.`);
      }
      onClose();
    } catch (error) {
      notifyError(error);
    }
  });

  return (
    <Modal opened={opened} onClose={onClose} title={editing ? 'Renomear técnico' : 'Novo técnico'} centered>
      <form onSubmit={onSubmit} noValidate>
        <Stack>
          <TextInput label="Nome" data-autofocus error={errors.name?.message} {...register('name')} />
          {!editing && (
            <Controller
              control={control}
              name="specialties"
              render={({ field }) => (
                <Checkbox.Group
                  label="Especialidades"
                  value={field.value}
                  onChange={(value) => field.onChange(value as Specialty[])}
                  error={errors.specialties?.message}
                >
                  <SimpleGrid cols={2} mt="xs" spacing="xs">
                    {SPECIALTIES.map((specialty) => (
                      <Checkbox key={specialty} value={specialty} label={SPECIALTY_LABELS[specialty]} />
                    ))}
                  </SimpleGrid>
                </Checkbox.Group>
              )}
            />
          )}
          <Group justify="flex-end">
            <Button variant="default" onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" loading={isSubmitting}>
              {editing ? 'Salvar' : 'Cadastrar'}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
