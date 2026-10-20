"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CheckCircle, Store, Loader2, Check, X } from "lucide-react"
import Image from "next/image"
import { createClient } from "@/lib/supabase/client"

interface ResellerForm {
  businessName: string
  contactName: string
  email: string
  phone: string
  businessType: string
  address: string
  city: string
  state: string
  estimatedMonthlyDemand: string
  message: string
}

export function ResellerFormSection() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error">("idle")
  const [submitMessage, setSubmitMessage] = useState<string>("")

  const [resellerForm, setResellerForm] = useState<ResellerForm>({
    businessName: "",
    contactName: "",
    email: "",
    phone: "",
    businessType: "",
    address: "",
    city: "",
    state: "",
    estimatedMonthlyDemand: "",
    message: "",
  })

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setSubmitStatus("idle")

    if (!resellerForm.businessName || !resellerForm.contactName || !resellerForm.email || !resellerForm.phone) {
      setSubmitStatus("error")
      setSubmitMessage("Por favor, preencha todos os campos obrigatórios.")
      setIsSubmitting(false)
      return
    }

    if (!validateEmail(resellerForm.email)) {
      setSubmitStatus("error")
      setSubmitMessage("Por favor, insira um email válido.")
      setIsSubmitting(false)
      return
    }

    try {
      const supabase = createClient()

      const { data: existingReseller } = await supabase
        .from("resellers")
        .select("email")
        .eq("email", resellerForm.email)
        .single()

      if (existingReseller) {
        setSubmitStatus("error")
        setSubmitMessage("Este email já está cadastrado. Nossa equipe entrará em contato em breve.")
        setIsSubmitting(false)
        return
      }

      const { error } = await supabase.from("resellers").insert([{
        business_name: resellerForm.businessName,
        contact_name: resellerForm.contactName,
        email: resellerForm.email,
        phone: resellerForm.phone,
        business_type: resellerForm.businessType,
        address: resellerForm.address,
        city: resellerForm.city,
        state: resellerForm.state,
        estimated_monthly_demand: Number.parseInt(resellerForm.estimatedMonthlyDemand.split("-")[0]) || 0,
        message: resellerForm.message,
      }])

      if (error) throw error

      await fetch("/api/notify-reseller", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(resellerForm),
      })

      setSubmitStatus("success")
      setSubmitMessage("Parabéns! Seu cadastro foi enviado com sucesso. Nossa equipe entrará em contato em até 24 horas.")
      setResellerForm({ businessName: "", contactName: "", email: "", phone: "", businessType: "", address: "", city: "", state: "", estimatedMonthlyDemand: "", message: "" })
    } catch (error) {
      console.error("Error submitting reseller form:", error)
      setSubmitStatus("error")
      setSubmitMessage("Ops! Ocorreu um erro ao enviar seu cadastro. Tente novamente ou entre em contato conosco.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section id="revendedor" className="py-20 bg-gradient-playful relative overflow-hidden">
      <div className="absolute top-10 left-10 w-20 h-20 bg-yellow-300/20 rounded-full animate-float"></div>
      <div className="absolute bottom-20 right-20 w-16 h-16 bg-orange-300/20 rounded-full animate-bounce-gentle"></div>

      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-black mb-6">Quer ser um revendedor? 🏪</h2>
          <p className="text-xl text-black/80 max-w-3xl mx-auto">
            Mostre que <span className="bg-black text-white px-2 py-1 rounded">ovo não é tudo igual!</span>
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <div className="bg-white/95 backdrop-blur-sm rounded-3xl p-8 shadow-xl">
              <h3 className="text-3xl font-bold text-black mb-8">Por que ser um revendedor Caipirovos?</h3>
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <CheckCircle className="w-6 h-6 text-green-600 mt-1 flex-shrink-0" />
                  <div><h4 className="font-semibold text-black">Mais vendas</h4><p className="text-black/70">Acesso a mercados que valorizam produtos de qualidade</p></div>
                </div>
                <div className="flex items-start gap-4">
                  <CheckCircle className="w-6 h-6 text-green-600 mt-1 flex-shrink-0" />
                  <div><h4 className="font-semibold text-black">Sem burocracia</h4><p className="text-black/70">Cadastro simples e rápido</p></div>
                </div>
                <div className="flex items-start gap-4">
                  <CheckCircle className="w-6 h-6 text-green-600 mt-1 flex-shrink-0" />
                  <div><h4 className="font-semibold text-black">Suporte completo</h4><p className="text-black/70">Material de marketing e treinamento inclusos</p></div>
                </div>
              </div>
            </div>

            <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-xl rounded-3xl">
              <CardHeader className="pb-4">
                <CardTitle className="text-2xl text-black">Cadastro de Revendedor</CardTitle>
                <CardDescription className="text-black/70">Para mercadinhos, padarias, supermercados e outros estabelecimentos</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="business-name" className="text-black font-medium">Nome do Estabelecimento *</Label>
                      <Input id="business-name" placeholder="Ex: Mercadinho do João" className="rounded-xl" value={resellerForm.businessName} onChange={(e) => setResellerForm({ ...resellerForm, businessName: e.target.value })} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="business-type" className="text-black font-medium">Tipo de Estabelecimento</Label>
                      <Select value={resellerForm.businessType} onValueChange={(value) => setResellerForm({ ...resellerForm, businessType: value })}>
                        <SelectTrigger className="rounded-xl"><SelectValue placeholder="Selecione o tipo" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="mercadinho">Mercadinho</SelectItem>
                          <SelectItem value="padaria">Padaria</SelectItem>
                          <SelectItem value="supermercado">Supermercado</SelectItem>
                          <SelectItem value="restaurante">Restaurante</SelectItem>
                          <SelectItem value="outro">Outro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="owner-name" className="text-black font-medium">Nome do Responsável *</Label>
                      <Input id="owner-name" placeholder="Seu nome completo" className="rounded-xl" value={resellerForm.contactName} onChange={(e) => setResellerForm({ ...resellerForm, contactName: e.target.value })} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone" className="text-black font-medium">Telefone/WhatsApp *</Label>
                      <Input id="phone" placeholder="(75) 99999-9999" className="rounded-xl" value={resellerForm.phone} onChange={(e) => setResellerForm({ ...resellerForm, phone: e.target.value })} required />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-black font-medium">E-mail *</Label>
                    <Input id="email" type="email" placeholder="seu@email.com" className="rounded-xl" value={resellerForm.email} onChange={(e) => setResellerForm({ ...resellerForm, email: e.target.value })} required />
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="city" className="text-black font-medium">Cidade</Label>
                      <Input id="city" placeholder="Sua cidade" className="rounded-xl" value={resellerForm.city} onChange={(e) => setResellerForm({ ...resellerForm, city: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="state" className="text-black font-medium">Estado</Label>
                      <Input id="state" placeholder="Ex: BA" className="rounded-xl" value={resellerForm.state} onChange={(e) => setResellerForm({ ...resellerForm, state: e.target.value })} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="monthly-volume" className="text-black font-medium">Volume Mensal Estimado</Label>
                    <Select value={resellerForm.estimatedMonthlyDemand} onValueChange={(value) => setResellerForm({ ...resellerForm, estimatedMonthlyDemand: value })}>
                      <SelectTrigger className="rounded-xl"><SelectValue placeholder="Quantas bandejas por mês?" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1-50">1 a 50 bandejas</SelectItem>
                        <SelectItem value="51-100">51 a 100 bandejas</SelectItem>
                        <SelectItem value="101-200">101 a 200 bandejas</SelectItem>
                        <SelectItem value="200+">Mais de 200 bandejas</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {submitStatus !== "idle" && (
                    <div className={`p-4 rounded-xl flex items-center gap-3 ${submitStatus === "success" ? "bg-green-50 border border-green-200 text-green-800" : "bg-red-50 border border-red-200 text-red-800"}`}>
                      {submitStatus === "success" ? <Check className="w-5 h-5 text-green-600 flex-shrink-0" /> : <X className="w-5 h-5 text-red-600 flex-shrink-0" />}
                      <p className="font-medium">{submitMessage}</p>
                    </div>
                  )}

                  <Button type="submit" disabled={isSubmitting} className="w-full py-6 text-lg font-semibold rounded-xl bg-black hover:bg-black/90 text-white disabled:opacity-50">
                    {isSubmitting ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Enviando cadastro...</> : <><Store className="w-5 h-5 mr-2" />Quero ser Revendedor Caipirovos</>}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          <div className="relative">
            <Image src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/design-mode-images/image%282%29-r1dIDb213gRNVDOumFqqm427TNMYCK.png" alt="Ovos de qualidade Caipirovos" width={600} height={600} className="rounded-3xl shadow-2xl animate-float" />
          </div>
        </div>
      </div>
    </section>
  )
}
