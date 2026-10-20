"use client"

import { useState } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Menu, Phone, ShoppingBag, Store, Users, X } from "lucide-react"

const NAV_ITEMS = [
  { label: "Sobre Nós", id: "sobre" },
  { label: "Fundadora", id: "fundadoras" },
  { label: "Assinatura", id: "assinatura" },
  { label: "Seja Parceiro", id: "revendedor" },
  { label: "Onde Encontrar", id: "onde-encontrar" },
]

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false)

  const scrollToSection = (sectionId: string) => {
    setMenuOpen(false)
    const element = document.getElementById(sectionId)
    if (element) {
      element.scrollIntoView({ behavior: "smooth" })
    }
  }

  return (
    <header className="bg-gradient-to-r from-white to-yellow-50/50 border-b-2 border-yellow-200 sticky top-0 z-50 backdrop-blur-sm">
      <div className="container mx-auto py-2.5 px-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4 flex-shrink-0">
            <Image
              src="/images/logo-caipirovos.png"
              alt="Caipirovos Logo"
              width={180}
              height={40}
              className="h-8 md:h-10 w-auto object-contain"
            />
          </div>

          <nav className="hidden lg:flex items-center space-x-6">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                onClick={() => scrollToSection(item.id)}
                className="text-black font-medium hover:text-yellow-600 transition-colors"
              >
                {item.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center space-x-1.5 md:space-x-3">
            <div className="hidden xl:flex items-center space-x-2 text-sm text-black/70">
              <Phone className="h-4 w-4" />
              <span>(75) 98340-9912</span>
            </div>
            <Button
              onClick={() => scrollToSection("assinatura")}
              className="bg-black text-white hover:bg-black/90 font-semibold rounded-xl shadow-lg text-xs md:text-sm px-2 md:px-4"
            >
              <ShoppingBag className="hidden sm:block w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
              Assinar
            </Button>
            <Button
              onClick={() => scrollToSection("revendedor")}
              className="bg-yellow-400 text-black hover:bg-yellow-500 font-semibold rounded-xl shadow-lg text-xs md:text-sm px-2 md:px-4"
            >
              <Store className="hidden sm:block w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
              Revender
            </Button>
            <Button
              onClick={() => scrollToSection("produtor")}
              variant="outline"
              className="border-2 border-black text-black hover:bg-black hover:text-white font-semibold rounded-xl bg-transparent text-xs md:text-sm px-2 md:px-4"
            >
              <Users className="hidden sm:block w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
              Produzir
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
              onClick={() => setMenuOpen((o) => !o)}
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {menuOpen && (
          <nav className="lg:hidden mt-2 pb-2 flex flex-col border-t border-yellow-200">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                onClick={() => scrollToSection(item.id)}
                className="text-left text-black font-medium py-2.5 px-1 hover:text-yellow-600 transition-colors"
              >
                {item.label}
              </button>
            ))}
          </nav>
        )}
      </div>
    </header>
  )
}
