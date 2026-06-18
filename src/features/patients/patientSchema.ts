import { z } from 'zod'

/** Validação de CPF (formato + dígitos verificadores), espelhando o backend. */
export function isValidCpf(raw: string): boolean {
  const cpf = raw.replace(/\D/g, '')
  if (cpf.length !== 11) return false
  if (/^(\d)\1{10}$/.test(cpf)) return false // dígitos repetidos

  const digits = cpf.split('').map(Number)

  const check = (length: number): number => {
    let sum = 0
    for (let i = 0; i < length; i++) {
      sum += digits[i] * (length + 1 - i)
    }
    const result = (sum * 10) % 11
    return result === 10 ? 0 : result
  }

  return check(9) === digits[9] && check(10) === digits[10]
}

export const patientSchema = z.object({
  fullName: z.string().trim().min(1, 'Nome completo é obrigatório'),
  cpf: z
    .string()
    .trim()
    .optional()
    .refine((value) => !value || isValidCpf(value), 'CPF inválido'),
  birthDate: z.string().min(1, 'Data de nascimento é obrigatória'),
  phone: z.string().trim().min(1, 'Telefone é obrigatório'),
  email: z.email('E-mail inválido'),
  status: z.enum(['ACTIVE', 'INACTIVE']),
  profession: z.string().trim().optional(),
  address: z.string().trim().optional(),
  notes: z.string().trim().optional(),
})

export type PatientFormValues = z.infer<typeof patientSchema>
