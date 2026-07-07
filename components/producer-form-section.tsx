"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CheckCircle, Users, Loader2, Check, X } from "lucide-react"
import Image from "next/image"
import { createClient } from "@/lib/supabase/client"

interface ProducerForm {
  name: string
  email: string
  phone: string
  farmName: string
  location: string
  productionCapacity: string
  experienceYears: string
  message: string
}

export function ProducerFormSection() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error">("idle")
  const [submitMessage, setSubmitMessage] = useState<string>("")

  const [producerForm, setProducerForm] = useState<ProducerForm>({
    name: "", email: "", phone: "", farmName: "", location: "", productionCapacity: "", experienceYears: "", message: "",
  })

  const validateEmail = (email: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setSubmitStatus("idle")

    if (!producerForm.name || !producerForm.email || !producerForm.phone || !producerForm.farmName) {
      setSubmitStatus("error")
      setSubmitMessage("Por favor, preencha todos os campos obrigatórios.")
      setIsSubmitting(false)
      return
    }

    if (!validateEmail(producerForm.email)) {
      setSubmitStatus("error")
      setSubmitMessage("Por favor, insira um email válido.")
      setIsSubmitting(false)
      return
    }

    try {
      const supabase = createClient()

      const { data: existingProducer } = await supabase.from("producers").select("email").eq("email", producerForm.email).single()

      if (existingProducer) {
        setSubmitStatus("error")
        setSubmitMessage("Este email já está cadastrado. Nossa equipe entrará em contato em breve.")
        setIsSubmitting(false)
        return
      }

      const { error } = await supabase.from("producers").insert([{
        name: producerForm.name,
        email: producerForm.email,
        phone: producerForm.phone,
        farm_name: producerForm.farmName,
        location: producerForm.location,
        production_capacity: Number.parseInt(producerForm.productionCapacity.split("-")[0]) || 0,
        experience_years: Number.parseInt(producerForm.experienceYears) || 0,
        message: producerForm.message,
      }])

      if (error) throw error

      await fetch("/api/notify-producer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(producerForm),
      })

      setSubmitStatus("success")
      setSubmitMessage("Excelente! Seu cadastro foi enviado com sucesso. Nossa equipe entrará em contato em até 24 horas.")
      setProducerForm({ name: "", email: "", phone: "", farmName: "", location: "", productionCapacity: "", experienceYears: "", message: "" })
    } catch (error) {
      console.error("Error submitting producer form:", error)
      setSubmitStatus("error")
      setSubmitMessage("Ops! Ocorreu um erro ao enviar seu cadastro. Tente novamente ou entre em contato conosco.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section id="produtor" className="py-20 bg-black relative overflow-hidden">
      <div className="absolute inset-0 opacity-10">
        <svg className="w-full h-full" viewBox="0 0 100 100" fill="none">
          <pattern id="farm-pattern" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
            <circle cx="10" cy="10" r="1" fill="currentColor" />
            <path d="M5 15 L15 5" stroke="currentColor" strokeWidth="0.5" />
          </pattern>
          <rect width="100" height="100" fill="url(#farm-pattern)" />
        </svg>
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">Quer produzir para a Caipirovos? 🐔</h2>
          <p className="text-xl text-white/80 max-w-3xl mx-auto">
            <span className="bg-yellow-400 text-black px-2 py-1 rounded">Você produz, nós vendemos!</span>
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="relative">
            <Image src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/design-mode-images/image%281%29-DVBND2tiXjOUDd57MiebbWLNXYJVW4.png" alt="Por que vender seus ovos na Caipirovos" width={600} height={600} className="rounded-3xl shadow-2xl animate-bounce-gentle" />
          </div>

          <div className="space-y-8">
            <div className="bg-white/95 backdrop-blur-sm rounded-3xl p-8 shadow-xl">
              <h3 className="text-3xl font-bold text-black mb-6">Por que vender seus ovos na <span className="bg-black text-white px-3 py-1 rounded-lg">Caipirovos?</span></h3>
              <p className="text-xl text-black/80 mb-8">3 motivos para se cadastrar hoje:</p>
              <div className="space-y-6">
                <div className="flex items-start gap-4"><CheckCircle className="w-6 h-6 text-green-600 mt-1 flex-shrink-0" /><div><h4 className="font-semibold text-black">Mais vendas</h4><p className="text-black/70">Acesso a mercados que valorizam seu produto</p></div></div>
                <div className="flex items-start gap-4"><CheckCircle className="w-6 h-6 text-green-600 mt-1 flex-shrink-0" /><div><h4 className="font-semibold text-black">Sem burocracia</h4><p className="text-black/70">Cadastro simples e rápido</p></div></div>
                <div className="flex items-start gap-4"><CheckCircle className="w-6 h-6 text-green-600 mt-1 flex-shrink-0" /><div><h4 className="font-semibold text-black">Marketing especializado</h4><p className="text-black/70">Impulsionamos sua marca para você focar na produção</p></div></div>
              </div>
            </div>

            <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-xl rounded-3xl">
              <CardHeader className="pb-4">
                <CardTitle className="text-2xl text-black">Cadastro de Produtor</CardTitle>
                <CardDescription className="text-black/70">Para produtores rurais que querem expandir suas vendas</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2"><Label htmlFor="producer-name" className="text-black font-medium">Nome Completo *</Label><Input id="producer-name" placeholder="Seu nome completo" className="rounded-xl" value={producerForm.name} onChange={(e) => setProducerForm({ ...producerForm, name: e.target.value })} required /></div>
                    <div className="space-y-2"><Label htmlFor="farm-name" className="text-black font-medium">Nome da Propriedade *</Label><Input id="farm-name" placeholder="Ex: Granja São João" className="rounded-xl" value={producerForm.farmName} onChange={(e) => setProducerForm({ ...producerForm, farmName: e.target.value })} required /></div>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2"><Label htmlFor="producer-phone" className="text-black font-medium">Telefone/WhatsApp *</Label><Input id="producer-phone" placeholder="(75) 99999-9999" className="rounded-xl" value={producerForm.phone} onChange={(e) => setProducerForm({ ...producerForm, phone: e.target.value })} required /></div>
                    <div className="space-y-2"><Label htmlFor="producer-email" className="text-black font-medium">E-mail *</Label><Input id="producer-email" type="email" placeholder="seu@email.com" className="rounded-xl" value={producerForm.email} onChange={(e) => setProducerForm({ ...producerForm, email: e.target.value })} required /></div>
                  </div>
                  <div className="space-y-2"><Label htmlFor="farm-location" className="text-black font-medium">Localização da Propriedade</Label><Textarea id="farm-location" placeholder="Cidade, região, pontos de referência..." className="rounded-xl" value={producerForm.location} onChange={(e) => setProducerForm({ ...producerForm, location: e.target.value })} /></div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="production-capacity" className="text-black font-medium">Produção Diária</Label>
                      <Select value={producerForm.productionCapacity} onValueChange={(value) => setProducerForm({ ...producerForm, productionCapacity: value })}>
                        <SelectTrigger className="rounded-xl"><SelectValue placeholder="Ovos por dia" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1-50">1 a 50 ovos</SelectItem>
                          <SelectItem value="51-100">51 a 100 ovos</SelectItem>
                          <SelectItem value="101-300">101 a 300 ovos</SelectItem>
                          <SelectItem value="300+">Mais de 300 ovos</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2"><Label htmlFor="experience" className="text-black font-medium">Anos de Experiência</Label><Input id="experience" type="number" placeholder="Ex: 5" className="rounded-xl" value={producerForm.experienceYears} onChange={(e) => setProducerForm({ ...producerForm, experienceYears: e.target.value })} /></div>
                  </div>
                  <div className="space-y-2"><Label htmlFor="producer-message" className="text-black font-medium">Mensagem (Opcional)</Label><Textarea id="producer-message" placeholder="Conte-nos mais sobre sua produção..." className="rounded-xl" value={producerForm.message} onChange={(e) => setProducerForm({ ...producerForm, message: e.target.value })} /></div>

                  {submitStatus !== "idle" && (
                    <div className={`p-4 rounded-xl flex items-center gap-3 ${submitStatus === "success" ? "bg-green-50 border border-green-200 text-green-800" : "bg-red-50 border border-red-200 text-red-800"}`}>
                      {submitStatus === "success" ? <Check className="w-5 h-5 text-green-600 flex-shrink-0" /> : <X className="w-5 h-5 text-red-600 flex-shrink-0" />}
                      <p className="font-medium">{submitMessage}</p>
                    </div>
                  )}

                  <Button type="submit" disabled={isSubmitting} className="w-full py-6 text-lg font-semibold rounded-xl bg-yellow-400 hover:bg-yellow-500 text-black disabled:opacity-50">
                    {isSubmitting ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Enviando cadastro...</> : <><Users className="w-5 h-5 mr-2" />Quero ser Produtor Caipirovos</>}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  )
}
