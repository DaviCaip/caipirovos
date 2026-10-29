import Link from "next/link"

export const metadata = { title: "Entrar - Caipirovos" }

export default function EnterPage() {
  const card = "block bg-white rounded-2xl shadow p-5 hover:shadow-md transition-shadow border-2 border-transparent hover:border-black"
  return (
    <main className="min-h-screen bg-amber-50 flex items-center justify-center p-5">
      <div className="w-full max-w-sm space-y-4">
        <div className="text-center">
          <div className="text-5xl">🥚</div>
          <h1 className="text-2xl font-bold mt-1">Caipirovos</h1>
          <p className="text-sm text-muted-foreground">Como você quer entrar?</p>
        </div>

        <Link href="/conta" className={card}>
          <p className="font-bold text-lg">👤 Sou cliente</p>
          <p className="text-sm text-muted-foreground">Acompanhar minha entrega, trocar de plano, cancelar ou atualizar meus dados</p>
        </Link>

        <div className="bg-white/60 rounded-2xl p-4 space-y-2">
          <p className="font-bold">🧑‍🌾 Sou da equipe</p>
          <div className="grid grid-cols-2 gap-2">
            <Link href="/entregador" className="h-12 rounded-xl bg-black text-white font-semibold flex items-center justify-center text-sm">
              🚚 Entregador
            </Link>
            <Link href="/admin" className="h-12 rounded-xl border-2 border-black font-semibold flex items-center justify-center text-sm">
              ⚙️ Administração
            </Link>
          </div>
        </div>

        <p className="text-center text-sm">
          <Link href="/" className="underline text-muted-foreground">
            ← Voltar ao site
          </Link>
        </p>
      </div>
    </main>
  )
}
