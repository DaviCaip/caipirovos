"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { CreditCard, QrCode } from "lucide-react"

interface ChoosePaymentProps {
  isOpen: boolean
  onClose: () => void
  onSelectCard: () => void
  onSelectPix: () => void
}

export function ChoosePayment({ isOpen, onClose, onSelectCard, onSelectPix }: ChoosePaymentProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Como você quer pagar?</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Button className="w-full justify-start" variant="outline" size="lg" onClick={onSelectCard}>
            <CreditCard className="mr-2 h-5 w-5" />
            Cartão de Crédito
          </Button>
          <Button className="w-full justify-start" variant="outline" size="lg" onClick={onSelectPix}>
            <QrCode className="mr-2 h-5 w-5" />
            Pix
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
