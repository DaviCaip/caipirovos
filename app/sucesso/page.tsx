import Link from "next/link"
import { Button } from "@/components/ui/button"
import { CashbackNote } from "@/components/cashback-note"

export const metadata = { title: "Assinatura confirmada - Caipirovos" }

export default function SucessoPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-yellow-100 via-white to-yellow-50 flex items-center justify-center p-6">
      <div className="max-w-md text-center space-y-6">
        <div className="text-6xl">🥚</div>
        <h1 className="text-3xl font-bold">Pagamento recebido!</h1>
        <p className="text-muted-foreground leading-relaxed">
          Obrigado por assinar o Caipirovos. Vamos entrar em contato pelo WhatsApp para combinar a sua primeira entrega.
        </p>
        <CashbackNote variant="success" />
        <Button asChild size="lg">
          <Link href="/">Voltar ao site</Link>
        </Button>
      </div>
    </main>
  )
}
