"use client"

import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Instagram, Mail, Phone, MapPin } from "lucide-react"

export function Footer() {
  const handleEmailClick = () => {
    window.location.href = "mailto:contato@caipirovos.com.br"
  }

  const handleInstagramClick = () => {
    window.open("https://www.instagram.com/caipirovosbrasil/", "_blank")
  }

  return (
    <footer className="bg-foreground text-background">
      <div className="container mx-auto px-4 py-16">
        <div className="grid lg:grid-cols-4 gap-8 mb-12">
          <div className="lg:col-span-2">
            <Image
              src="/images/logo-caipirovos-negativa.png"
              alt="Caipirovos Logo"
              width={200}
              height={45}
              className="h-12 w-auto mb-6"
            />
            <p className="text-background/80 text-pretty leading-relaxed mb-6 max-w-md">
              O maior marketplace de agricultura familiar do Brasil. Conectamos pequenos e médios produtores a um canal
              sólido de comercialização, valorizando quem cultiva com amor e tradição.
            </p>
            <div className="flex space-x-4">
              <Button
                size="icon"
                variant="ghost"
                className="text-background hover:bg-background/10"
                onClick={handleInstagramClick}
              >
                <Instagram className="h-5 w-5" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="text-background hover:bg-background/10"
                onClick={handleEmailClick}
              >
                <Mail className="h-5 w-5" />
              </Button>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4">Links Rápidos</h3>
            <ul className="space-y-3">
              <li>
                <a href="#sobre" className="text-background/80 hover:text-background transition-colors">
                  Sobre Nós
                </a>
              </li>
              <li>
                <a href="#produtor" className="text-background/80 hover:text-background transition-colors">
                  Seja um Produtor
                </a>
              </li>
              <li>
                <a href="#onde-encontrar" className="text-background/80 hover:text-background transition-colors">
                  Onde Encontrar
                </a>
              </li>
              <li>
                <a href="#assinatura" className="text-background/80 hover:text-background transition-colors">
                  Assinatura
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4">Contato</h3>
            <ul className="space-y-3">
              <li className="flex items-center space-x-2 text-background/80">
                <Phone className="h-4 w-4 flex-shrink-0" />
                <span>(75) 98340-9912</span>
              </li>
              <li className="flex items-center space-x-2 text-background/80">
                <Mail className="h-4 w-4 flex-shrink-0" />
                <span>contato@caipirovos.com.br</span>
              </li>
              <li className="flex items-start space-x-2 text-background/80">
                <MapPin className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <span className="text-pretty">Feira de Santana, Bahia, Brasil</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-background/20 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="text-background/60 text-sm">© 2024 Caipirovos. Todos os direitos reservados.</div>
            <div className="flex space-x-6 text-sm">
              <a href="#" className="text-background/60 hover:text-background transition-colors">
                Política de Privacidade
              </a>
              <a href="#" className="text-background/60 hover:text-background transition-colors">
                Termos de Uso
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
