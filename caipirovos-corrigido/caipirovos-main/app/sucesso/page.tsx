import Link from "next/link"

export const metadata = { title: "Assinatura recebida | Caipirovos" }

export default function SucessoPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-muted/30">
      <div className="max-w-md text-center space-y-4">
        <div className="text-6xl">🥚</div>
        <h1 className="text-3xl font-bold">Obrigado por assinar!</h1>
        <p className="text-muted-foreground leading-relaxed">
          Recebemos a sua assinatura da Caipirovos. Em breve seus ovos caipiras frescos estarão a caminho.
        </p>
        <Link href="/" className="inline-block rounded-lg bg-primary text-primary-foreground px-6 py-3 font-medium">
          Voltar ao site
        </Link>
      </div>
    </main>
  )
}
