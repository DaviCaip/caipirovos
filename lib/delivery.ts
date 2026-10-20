import { isValidCpf, isValidEmail, isValidPhone, onlyDigits } from "@/lib/br"

export const DELIVERY_CITY = "Feira de Santana"
export const DELIVERY_STATE = "BA"

export const NO_PREFERENCE = "Sem preferência"

export const DELIVERY_DAYS = [
  NO_PREFERENCE,
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
]

export const DELIVERY_PERIODS = [NO_PREFERENCE, "Manhã", "Tarde", "Noite"]

export interface DeliveryData {
  name: string
  phone: string
  email: string
  cpf: string
  cep: string
  street: string
  number: string
  neighborhood: string
  complement: string
  reference: string
  deliveryDay: string
  deliveryPeriod: string
  instructions: string
}

export const EMPTY_DELIVERY: DeliveryData = {
  name: "",
  phone: "",
  email: "",
  cpf: "",
  cep: "",
  street: "",
  number: "",
  neighborhood: "",
  complement: "",
  reference: "",
  deliveryDay: NO_PREFERENCE,
  deliveryPeriod: NO_PREFERENCE,
  instructions: "",
}

const MAX_LEN: Record<keyof DeliveryData, number> = {
  name: 120,
  phone: 20,
  email: 120,
  cpf: 14,
  cep: 9,
  street: 150,
  number: 15,
  neighborhood: 80,
  complement: 80,
  reference: 150,
  deliveryDay: 30,
  deliveryPeriod: 30,
  instructions: 300,
}

/** Garante que só chegam strings, aparadas e limitadas (a Stripe aceita no máx. 500 caracteres por metadado). */
export function sanitizeDelivery(raw: any): DeliveryData {
  const out = { ...EMPTY_DELIVERY }
  for (const key of Object.keys(EMPTY_DELIVERY) as (keyof DeliveryData)[]) {
    const v = raw?.[key]
    out[key] = typeof v === "string" ? v.trim().slice(0, MAX_LEN[key]) : EMPTY_DELIVERY[key]
  }
  return out
}

export function validateDelivery(d: DeliveryData): Partial<Record<keyof DeliveryData, string>> {
  const e: Partial<Record<keyof DeliveryData, string>> = {}
  if (d.name.split(/\s+/).filter(Boolean).length < 2) e.name = "Informe nome e sobrenome"
  if (!isValidPhone(d.phone)) e.phone = "WhatsApp inválido (com DDD)"
  if (!isValidEmail(d.email)) e.email = "E-mail inválido"
  if (!isValidCpf(d.cpf)) e.cpf = "CPF inválido"
  if (onlyDigits(d.cep).length !== 8) e.cep = "CEP inválido"
  if (!d.street) e.street = "Rua obrigatória"
  if (!d.number) e.number = "Número obrigatório"
  if (!d.neighborhood) e.neighborhood = "Bairro obrigatório"
  return e
}
