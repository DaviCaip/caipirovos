"use client"

import { useRef, useState, type ReactNode } from "react"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowRight, Package } from "lucide-react"
import { formatCep, formatCpf, formatPhone, onlyDigits } from "@/lib/br"
import {
  DELIVERY_CITY,
  DELIVERY_DAYS,
  DELIVERY_PERIODS,
  DELIVERY_STATE,
  EMPTY_DELIVERY,
  validateDelivery,
  type DeliveryData,
} from "@/lib/delivery"

export type { DeliveryData }

interface DeliveryFormProps {
  isOpen: boolean
  onClose: () => void
  onContinue: (data: DeliveryData, password: string) => void
  planName: string
}

function normalize(s: string) {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim()
}

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <div>
      <Label className="text-sm font-medium mb-1 block">{label}</Label>
      {children}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  )
}

export function DeliveryForm({ isOpen, onClose, onContinue, planName }: DeliveryFormProps) {
  const [data, setData] = useState<DeliveryData>(EMPTY_DELIVERY)
  const [errors, setErrors] = useState<Partial<Record<keyof DeliveryData, string>>>({})
  const [loadingCep, setLoadingCep] = useState(false)
  const [password, setPassword] = useState("")
  const [password2, setPassword2] = useState("")
  const [pwError, setPwError] = useState<string | null>(null)
  const [cepBlocked, setCepBlocked] = useState<string | null>(null)
  const [cepWarning, setCepWarning] = useState<string | null>(null)
  const lastCepLookup = useRef("")

  function set<K extends keyof DeliveryData>(key: K, value: DeliveryData[K]) {
    setData((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  async function lookupCep(cepValue: string) {
    const digits = onlyDigits(cepValue)
    if (digits.length !== 8 || lastCepLookup.current === digits) return
    lastCepLookup.current = digits
    setLoadingCep(true)
    setCepBlocked(null)
    setCepWarning(null)
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`)
      const json = await res.json()
      if (json.erro) {
        setErrors((prev) => ({ ...prev, cep: "CEP não encontrado" }))
      } else if (normalize(json.localidade || "") !== normalize(DELIVERY_CITY)) {
        setCepBlocked(
          `Esse CEP é de ${json.localidade}/${json.uf}. Entregamos apenas em ${DELIVERY_CITY}/${DELIVERY_STATE}.`
        )
      } else {
        setData((prev) => ({
          ...prev,
          street: json.logradouro || prev.street,
          neighborhood: json.bairro || prev.neighborhood,
        }))
        setErrors((prev) => ({ ...prev, cep: undefined, street: undefined, neighborhood: undefined }))
      }
    } catch {
      setCepWarning("Não conseguimos buscar o endereço automaticamente. Preencha rua e bairro.")
    }
    setLoadingCep(false)
  }

  function handleContinue() {
    const found = validateDelivery(data)
    setErrors(found)
    let pwProblem: string | null = null
    if (password.length < 6) pwProblem = "A senha precisa ter pelo menos 6 caracteres."
    else if (password !== password2) pwProblem = "As duas senhas não são iguais."
    setPwError(pwProblem)
    if (Object.keys(found).length > 0 || cepBlocked || pwProblem) return
    onContinue(data, password)
  }

  function handleClose() {
    setData(EMPTY_DELIVERY)
    setPassword("")
    setPassword2("")
    setPwError(null)
    setErrors({})
    setCepBlocked(null)
    setCepWarning(null)
    lastCepLookup.current = ""
    onClose()
  }

  const required: (keyof DeliveryData)[] = ["name", "phone", "email", "cpf", "cep", "street", "number", "neighborhood"]
  const filled = required.filter((k) => data[k].trim()).length
  const progress = Math.round((filled / required.length) * 100)
  const err = (k: keyof DeliveryData) => (errors[k] ? "border-red-400" : "")

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto p-0">
        <div className="bg-primary p-6 rounded-t-lg">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-black/10 p-2 rounded-full">
              <Package className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <DialogTitle className="text-primary-foreground text-lg font-bold">Dados de Entrega</DialogTitle>
              <DialogDescription className="text-primary-foreground/80 text-sm">Plano {planName}</DialogDescription>
            </div>
          </div>
          <div className="w-full bg-black/10 rounded-full h-2">
            <div className="bg-black h-2 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
          <p className="text-primary-foreground/70 text-xs mt-1">
            {filled} de {required.length} campos obrigatórios preenchidos
          </p>
        </div>

        <div className="p-6 space-y-5">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Dados Pessoais</p>
            <div className="space-y-3">
              <Field label="Nome completo *" error={errors.name}>
                <Input
                  value={data.name}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder="Seu nome e sobrenome"
                  autoComplete="name"
                  className={err("name")}
                />
              </Field>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="WhatsApp *" error={errors.phone}>
                  <Input
                    value={data.phone}
                    onChange={(e) => set("phone", formatPhone(e.target.value))}
                    placeholder="(75) 99999-9999"
                    inputMode="tel"
                    autoComplete="tel"
                    className={err("phone")}
                  />
                </Field>
                <Field label="CPF *" error={errors.cpf}>
                  <Input
                    value={data.cpf}
                    onChange={(e) => set("cpf", formatCpf(e.target.value))}
                    placeholder="000.000.000-00"
                    inputMode="numeric"
                    className={err("cpf")}
                  />
                </Field>
              </div>
              <Field label="E-mail *" error={errors.email}>
                <Input
                  type="email"
                  value={data.email}
                  onChange={(e) => set("email", e.target.value)}
                  placeholder="seu@email.com"
                  autoComplete="email"
                  className={err("email")}
                />
              </Field>
            </div>
          </div>

          <div className="border-t pt-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Endereço de Entrega
            </p>
            <div className="space-y-3">
              <Field label="CEP *" error={errors.cep}>
                <Input
                  value={data.cep}
                  onChange={(e) => {
                    const v = formatCep(e.target.value)
                    set("cep", v)
                    setCepBlocked(null)
                    if (onlyDigits(v).length === 8) lookupCep(v)
                    else lastCepLookup.current = ""
                  }}
                  onBlur={() => lookupCep(data.cep)}
                  placeholder="44000-000"
                  inputMode="numeric"
                  autoComplete="postal-code"
                  className={errors.cep || cepBlocked ? "border-red-400" : ""}
                />
                {loadingCep && <p className="text-xs text-primary mt-1 animate-pulse">Buscando endereço...</p>}
                {cepBlocked && <p className="text-xs text-red-500 mt-1">{cepBlocked}</p>}
                {cepWarning && <p className="text-xs text-amber-700 mt-1">{cepWarning}</p>}
              </Field>

              <Field label="Rua *" error={errors.street}>
                <Input
                  value={data.street}
                  onChange={(e) => set("street", e.target.value)}
                  placeholder="Nome da rua"
                  className={err("street")}
                />
              </Field>

              <div className="grid grid-cols-3 gap-3">
                <Field label="Número *" error={errors.number}>
                  <Input
                    value={data.number}
                    onChange={(e) => set("number", e.target.value)}
                    placeholder="123"
                    className={err("number")}
                  />
                </Field>
                <div className="col-span-2">
                  <Field label="Bairro *" error={errors.neighborhood}>
                    <Input
                      value={data.neighborhood}
                      onChange={(e) => set("neighborhood", e.target.value)}
                      placeholder="Seu bairro"
                      className={err("neighborhood")}
                    />
                  </Field>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Complemento">
                  <Input
                    value={data.complement}
                    onChange={(e) => set("complement", e.target.value)}
                    placeholder="Apto, bloco, casa..."
                  />
                </Field>
                <Field label="Ponto de referência">
                  <Input
                    value={data.reference}
                    onChange={(e) => set("reference", e.target.value)}
                    placeholder="Perto de..."
                  />
                </Field>
              </div>

              <p className="text-xs text-muted-foreground">
                Cidade: <strong>{DELIVERY_CITY}/{DELIVERY_STATE}</strong>
              </p>
            </div>
          </div>

          <div className="border-t pt-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Preferências de Entrega
            </p>
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Melhor dia">
                  <Select value={data.deliveryDay} onValueChange={(v) => set("deliveryDay", v)}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DELIVERY_DAYS.map((d) => (
                        <SelectItem key={d} value={d}>
                          {d}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Melhor período">
                  <Select value={data.deliveryPeriod} onValueChange={(v) => set("deliveryPeriod", v)}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DELIVERY_PERIODS.map((p) => (
                        <SelectItem key={p} value={p}>
                          {p}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
              <Field label="Instruções para o entregador">
                <Textarea
                  value={data.instructions}
                  onChange={(e) => set("instructions", e.target.value.slice(0, 300))}
                  placeholder="Ex.: deixar na portaria, tocar o interfone, portão azul..."
                  rows={2}
                />
              </Field>
            </div>
          </div>

          <div className="border-t pt-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Sua conta no site</p>
            <p className="text-xs text-muted-foreground mb-3">
              Com o seu CPF e esta senha você acompanha a entrega, troca de plano e cancela quando quiser. Se você já tem conta, a senha que você já usa
              continua valendo.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Crie uma senha *">
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    setPwError(null)
                  }}
                  placeholder="mínimo 6 caracteres"
                  autoComplete="new-password"
                  className={pwError ? "border-red-400" : ""}
                />
              </Field>
              <Field label="Repita a senha *">
                <Input
                  type="password"
                  value={password2}
                  onChange={(e) => {
                    setPassword2(e.target.value)
                    setPwError(null)
                  }}
                  placeholder="repita a senha"
                  autoComplete="new-password"
                  className={pwError ? "border-red-400" : ""}
                />
              </Field>
            </div>
            {pwError && <p className="text-xs text-red-500 mt-1">{pwError}</p>}
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
            <span className="text-lg">📍</span>
            <div>
              <p className="text-sm font-semibold text-amber-800">Área de entrega</p>
              <p className="text-xs text-amber-700">
                Entregamos apenas em {DELIVERY_CITY}, Bahia. Dia e período são preferências: confirmamos com você pelo
                WhatsApp.
              </p>
            </div>
          </div>

          <Button
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-12 text-base font-semibold"
            onClick={handleContinue}
          >
            Continuar
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
