"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { X, CheckCircle, AlertCircle } from "lucide-react"
import { createBrowserClient } from "@supabase/ssr"

interface PopupFormProps {
  isOpen: boolean
  onClose: () => void
  type: "waitlist" | "region-request"
  title: string
  description: string
}

export function PopupForm({ isOpen, onClose, type, title, description }: PopupFormProps) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    region: "",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error">("idle")
  const [errorMessage, setErrorMessage] = useState("")

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setSubmitStatus("idle")
    setErrorMessage("")

    try {

      // Check if email already exists
      const { data: existingData, error: checkError } = await supabase
        .from(type === "waitlist" ? "waitlist" : "region_requests")
        .select("email")
        .eq("email", formData.email)
        .single()

      if (checkError && checkError.code !== "PGRST116") {
        throw checkError
      }

      if (existingData) {
        setErrorMessage("Este email já está cadastrado!")
        setSubmitStatus("error")
        return
      }

      // Insert new record
      const tableName = type === "waitlist" ? "waitlist" : "region_requests"
      const insertData =
        type === "waitlist"
          ? { name: formData.name, email: formData.email }
          : { name: formData.name, email: formData.email, region: formData.region }

      const { error: insertError } = await supabase.from(tableName).insert([insertData])

      if (insertError) {
        if (insertError.code === "23505") {
          setErrorMessage("Este email já está cadastrado!")
        } else {
          throw insertError
        }
        setSubmitStatus("error")
        return
      }

      setSubmitStatus("success")
      setFormData({ name: "", email: "", region: "" })

      // Close popup after 2 seconds
      setTimeout(() => {
        onClose()
        setSubmitStatus("idle")
      }, 2000)
    } catch (error) {
      console.error("[v0] Form submission error:", error)
      setErrorMessage("Erro ao enviar formulário. Tente novamente.")
      setSubmitStatus("error")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setFormData({ name: "", email: "", region: "" })
    setSubmitStatus("idle")
    setErrorMessage("")
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-center">{title}</DialogTitle>
          <Button variant="ghost" size="icon" className="absolute right-4 top-4" onClick={handleClose}>
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>

        <div className="px-6 pb-6">
          <p className="text-muted-foreground text-center mb-6 text-pretty">{description}</p>

          {submitStatus === "success" ? (
            <div className="text-center py-8">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-green-700 mb-2">Cadastro realizado com sucesso!</h3>
              <p className="text-muted-foreground">
                {type === "waitlist"
                  ? "Você receberá um email quando a assinatura estiver disponível."
                  : "Entraremos em contato em breve para levar os ovos Caipirovos até sua região!"}
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Nome completo</Label>
                <Input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  disabled={isSubmitting}
                />
              </div>

              {type === "region-request" && (
                <div>
                  <Label htmlFor="region">Região</Label>
                  <Select
                    value={formData.region}
                    onValueChange={(value) => setFormData({ ...formData, region: value })}
                    required
                    disabled={isSubmitting}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione sua região" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="feira-de-santana">Feira de Santana</SelectItem>
                      <SelectItem value="salvador">Salvador</SelectItem>
                      <SelectItem value="alagoinhas">Alagoinhas</SelectItem>
                      <SelectItem value="santo-antonio-de-jesus">Santo Antônio de Jesus</SelectItem>
                      <SelectItem value="cruz-das-almas">Cruz das Almas</SelectItem>
                      <SelectItem value="cachoeira">Cachoeira</SelectItem>
                      <SelectItem value="outra">Outra região</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {submitStatus === "error" && (
                <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded-lg">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span className="text-sm">{errorMessage}</span>
                </div>
              )}

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "Enviando..." : "Cadastrar"}
              </Button>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
