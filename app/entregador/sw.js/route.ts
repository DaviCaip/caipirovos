export const dynamic = "force-static"

// Service worker mínimo: só existe para o celular oferecer "instalar o app". Não guarda nada em cache,
// então o entregador sempre vê os dados atualizados.
const SW = `self.addEventListener("install", () => self.skipWaiting())
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()))
self.addEventListener("fetch", () => {})
`

export function GET() {
  return new Response(SW, {
    headers: {
      "Content-Type": "text/javascript; charset=utf-8",
      "Cache-Control": "no-cache",
      "Service-Worker-Allowed": "/entregador",
    },
  })
}
