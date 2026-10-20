"use client"

import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Menu, Phone, Store, Users } from "lucide-react"

export function Header() {
  const scrollToSection = (sectionId: string) => {
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

          <nav className="hidden md:flex items-center space-x-8">
            <button
              onClick={() => scrollToSection("sobre")}
              className="text-black font-medium hover:text-yellow-600 transition-colors"
            >
              Sobre Nós
            </button>
            <button
              onClick={() => scrollToSection("fundadoras")}
              className="text-black font-medium hover:text-yellow-600 transition-colors"
            >
              Fundadora
            </button>
            <button
              onClick={() => scrollToSection("revendedor")}
              className="text-black font-medium hover:text-yellow-600 transition-colors"
            >
              Seja Parceiro
            </button>
            <button
              onClick={() => scrollToSection("onde-encontrar")}
              className="text-black font-medium hover:text-yellow-600 transition-colors"
            >
              Onde Encontrar
            </button>
          </nav>

          <div className="flex items-center space-x-2 md:space-x-4">
            <div className="hidden lg:flex items-center space-x-2 text-sm text-black/70">
              <Phone className="h-4 w-4" />
              <span>(75) 98340-9912</span>
            </div>
            <Button
              onClick={() => scrollToSection("revendedor")}
              className="bg-yellow-400 text-black hover:bg-yellow-500 font-semibold rounded-xl shadow-lg text-xs md:text-sm px-2 md:px-4"
            >
              <Store className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
              Revender
            </Button>
            <Button
              onClick={() => scrollToSection("produtor")}
              variant="outline"
              className="border-2 border-black text-black hover:bg-black hover:text-white font-semibold rounded-xl bg-transparent text-xs md:text-sm px-2 md:px-4"
            >
              <Users className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
              Produzir
            </Button>
            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
}
