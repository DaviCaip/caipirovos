"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { formatBRL } from "@/lib/plans"

export interface PixData {
  qrCode: string
  qrCodeBase64: string
  amountCents: number
}

interface PixCheckoutProps {
  isOpen: boolean
  onClose: () => void
  planName: string
  pix: PixData | null
}

// O Pix já é gerado em /api/pix com os dados do formulário de entrega; aqui só mostramos o QR Code.
export function PixCheckout({ isOpen, onClose, planName, pix }: PixCheckoutProps) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    if (!pix) return
    try {
      await navigator.clipboard.writeText(pix.qrCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      setCopied(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Pagar com Pix - {planName}</DialogTitle>
          <DialogDescription>
            {pix ? `Valor: ${formatBRL(pix.amountCents)}` : "Gerando seu Pix..."}
          </DialogDescription>
        </DialogHeader>

        {pix && (
          <div className="space-y-4 text-center">
            <p className="text-sm text-muted-foreground">Escaneie o QR Code com o app do seu banco:</p>
            {pix.qrCodeBase64 && (
              <img src={`data:image/png;base64,${pix.qrCodeBase64}`} alt="QR Code Pix" className="mx-auto w-48 h-48" />
            )}
            <div className="bg-muted p-3 rounded-lg">
              <p className="text-xs break-all select-all">{pix.qrCode}</p>
            </div>
            <Button variant="outline" className="w-full bg-transparent" onClick={copy}>
              {copied ? "Código copiado!" : "Copiar código Pix"}
            </Button>
            <p className="text-xs text-muted-foreground">
              Assim que o pagamento for confirmado, entramos em contato pelo WhatsApp para combinar a entrega.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
