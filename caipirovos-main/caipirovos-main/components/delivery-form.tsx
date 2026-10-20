"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { User, Phone, CreditCard, MapPin, Home, Hash, FileText, ArrowRight, Package } from "lucide-react"

interface DeliveryFormProps {
  isOpen: boolean
  onClose: () => void
  onContinue: (data: DeliveryData) => void
  planName: string
}

export interface DeliveryData {
  name: string
  phone: string
  cpf: string
  cep: string
  street: string
  number: string
  observation: string
}

export function DeliveryForm({ isOpen, onClose, onContinue, planName }: DeliveryFormProps) {
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [cpf, setCpf] = useState("")
  const [cep, setCep] = useState("")
  const [street, setStreet] = useState("")
  const [number, setNumber] = useState("")
  const [observation, setObservation] = useState("")
  const [loadingCep, setLoadingCep] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  async function handleCepBlur() {
    const cleanCep = cep.replace(/\D/g, "")
    if (cleanCep.length !== 8) return
    setLoadingCep(true)
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`)
      const data = await res.json()
      if (!data.erro) setStreet(data.logradouro)
      else setErrors(prev => ({ ...prev, cep: "CEP não encontrado" }))
    } catch {}
    setLoadingCep(false)
  }

  function validate() {
    const newErrors: Record<string, string> = {}
    if (!name) newErrors.name = "Nome obrigatório"
    if (!phone) newErrors.phone = "Telefone obrigatório"
    if (!cpf) newErrors.cpf = "CPF obrigatório"
    if (!cep) newErrors.cep = "CEP obrigatório"
    if (!street) newErrors.street = "Rua obrigatória"
    if (!number) newErrors.number = "Número obrigatório"
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  function handleContinue() {
    if (!validate()) return
    onContinue({ name, phone, cpf, cep, street, number, observation })
  }

  function handleClose() {
    setName(""); setPhone(""); setCpf(""); setCep(""); setStreet(""); setNumber(""); setObservation(""); setErrors({})
    onClose()
  }

  const filled = [name, phone, cpf, cep, street, number].filter(Boolean).length
  const progress = Math.round((filled / 6) * 100)

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto p-0">
        
        <div className="bg-primary p-6 rounded-t-lg">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-white/20 p-2 rounded-full">
              <Package className="h-5 w-5 text-white" />
            </div>
            <div>
              <DialogTitle className="text-white text-lg font-bold">Dados de Entrega</DialogTitle>
              <p className="text-white/80 text-sm">Plano {planName}</p>
            </div>
          </div>
          <div className="w-full bg-white/20 rounded-full h-2">
            <div className="bg-white h-2 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
          <p className="text-white/70 text-xs mt-1">{filled} de 6 campos preenchidos</p>
        </div>

        <div className="p-6 space-y-5">
          
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Dados Pessoais</p>
            <div className="space-y-3">
              <div>
                <Label htmlFor="name" className="text-sm font-medium flex items-center gap-1 mb-1">
                  <User className="h-3 w-3" /> Nome completo *
                </Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => { setName(e.target.value); setErrors(p => ({ ...p, name: "" })) }}
                  placeholder="Seu nome completo"
                  className={errors.name ? "border-red-400" : ""}
                />
                {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="phone" className="text-sm font-medium flex items-center gap-1 mb-1">
                    <Phone className="h-3 w-3" /> WhatsApp *
                  </Label>
                  <Input
                    id="phone"
                    value={phone}
                    onChange={(e) => { setPhone(e.target.value); setErrors(p => ({ ...p, phone: "" })) }}
                    placeholder="(75) 99999-9999"
                    className={errors.phone ? "border-red-400" : ""}
                  />
                  {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
                </div>
                <div>
                  <Label htmlFor="cpf" className="text-sm font-medium flex items-center gap-1 mb-1">
                    <CreditCard className="h-3 w-3" /> CPF *
                  </Label>
                  <Input
                    id="cpf"
                    value={cpf}
                    onChange={(e) => { setCpf(e.target.value); setErrors(p => ({ ...p, cpf: "" })) }}
                    placeholder="000.000.000-00"
                    className={errors.cpf ? "border-red-400" : ""}
                  />
                  {errors.cpf && <p className="text-xs text-red-500 mt-1">{errors.cpf}</p>}
                </div>
              </div>
            </div>
          </div>

          <div className="border-t pt-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Endereço de Entrega</p>
            <div className="space-y-3">
              <div>
                <Label htmlFor="cep" className="text-sm font-medium flex items-center gap-1 mb-1">
                  <MapPin className="h-3 w-3" /> CEP *
                </Label>
                <Input
                  id="cep"
                  value={cep}
                  onChange={(e) => { setCep(e.target.value); setErrors(p => ({ ...p, cep: "" })) }}
                  onBlur={handleCepBlur}
                  placeholder="44000-000"
                  className={errors.cep ? "border-red-400" : ""}
                />
                {loadingCep && <p className="text-xs text-primary mt-1 animate-pulse">🔍 Buscando endereço...</p>}
                {errors.cep && <p className="text-xs text-red-500 mt-1">{errors.cep}</p>}
              </div>

              <div>
                <Label htmlFor="street" className="text-sm font-medium flex items-center gap-1 mb-1">
                  <Home className="h-3 w-3" /> Rua *
                </Label>
                <Input
                  id="street"
                  value={street}
                  onChange={(e) => { setStreet(e.target.value); setErrors(p => ({ ...p, street: "" })) }}
                  placeholder="Nome da rua"
                  className={errors.street ? "border-red-400" : ""}
                />
                {errors.street && <p className="text-xs text-red-500 mt-1">{errors.street}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="number" className="text-sm font-medium flex items-center gap-1 mb-1">
                    <Hash className="h-3 w-3" /> Número *
                  </Label>
                  <Input
                    id="number"
                    value={number}
                    onChange={(e) => { setNumber(e.target.value); setErrors(p => ({ ...p, number: "" })) }}
                    placeholder="123"
                    className={errors.number ? "border-red-400" : ""}
                  />
                  {errors.number && <p className="text-xs text-red-500 mt-1">{errors.number}</p>}
                </div>
                <div>
                  <Label htmlFor="observation" className="text-sm font-medium flex items-center gap-1 mb-1">
                    <FileText className="h-3 w-3" /> Complemento
                  </Label>
                  <Input
                    id="observation"
                    value={observation}
                    onChange={(e) => setObservation(e.target.value)}
                    placeholder="Apto, bloco..."
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
            <span className="text-lg">📍</span>
            <div>
              <p className="text-sm font-semibold text-amber-800">Área de entrega</p>
              <p className="text-xs text-amber-700">Entregamos apenas em Feira de Santana, Bahia.</p>
            </div>
          </div>

          <Button
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-12 text-base font-semibold"
            onClick={handleContinue}
          >
            Continuar para pagamento
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
