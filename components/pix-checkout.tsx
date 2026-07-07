"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface PixCheckoutProps {
  isOpen: boolean
  onClose: () => void
  planName: string
  price: number
}

export function PixCheckout({ isOpen, onClose, planName, price }: PixCheckoutProps) {
  const [step, setStep] = useState<"form" | "qrcode">("form")
  const [loading, setLoading] = useState(false)
  const [qrCode, setQrCode] = useState("")
  const [qrCodeBase64, setQrCodeBase64] = useState("")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [document, setDocument] = useState("")

  async function handleGeneratePix() {
    setLoading(true)
    try {
      const res = await fetch("/api/pix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planName,
          price,
          customerName: name,
          customerEmail: email,
          customerDocument: document.replace(/\D/g, ""),
        }),
      })
      const data = await res.json()
      if (data.qrCode) {
        setQrCode(data.qrCode)
        setQrCodeBase64(data.qrCodeBase64 || "")
        setStep("qrcode")
      } else {
        alert("Erro ao gerar o Pix. Verifique os dados e tente novamente.")
      }
    } catch (error) {
      alert("Erro ao gerar o Pix. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  function handleClose() {
    setStep("form"); setName(""); setEmail(""); setDocument(""); setQrCode(""); setQrCodeBase64("")
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Pagar com Pix - {planName}</DialogTitle>
        </DialogHeader>

        {step === "form" && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Nome completo</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome" />
            </div>
            <div>
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" />
            </div>
            <div>
              <Label htmlFor="document">CPF</Label>
              <Input id="document" value={document} onChange={(e) => setDocument(e.target.value)} placeholder="000.000.000-00" />
            </div>
            <Button
              className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90"
              onClick={handleGeneratePix}
              disabled={loading || !name || !email || !document}
            >
              {loading ? "Gerando Pix..." : "Gerar QR Code Pix"}
            </Button>
          </div>
        )}

        {step === "qrcode" && (
          <div className="space-y-4 text-center">
            <p className="text-sm text-muted-foreground">Escaneie o QR Code abaixo com o app do seu banco:</p>
            {qrCodeBase64 && (
              <img src={`data:image/png;base64,${qrCodeBase64}`} alt="QR Code Pix" className="mx-auto w-48 h-48" />
            )}
            <div className="bg-muted p-3 rounded-lg">
              <p className="text-xs break-all select-all">{qrCode}</p>
            </div>
            <Button
              variant="outline"
              className="w-full bg-transparent"
              onClick={() => { navigator.clipboard.writeText(qrCode); alert("Código Pix copiado!") }}
            >
              Copiar código Pix
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
