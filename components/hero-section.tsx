"use client"

import Image from "next/image"
import { Button } from "@/components/ui/button"
import { ArrowRight, ShoppingBag, Star, Store, Users } from "lucide-react"

export function HeroSection() {
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId)
    if (element) {
      element.scrollIntoView({ behavior: "smooth" })
    }
  }

  return (
    <section className="relative bg-gradient-to-br from-yellow-100 via-white to-yellow-50 py-20 lg:py-32 overflow-hidden">
      <div className="absolute top-20 right-10 w-24 h-24 bg-yellow-300/30 rounded-full animate-float"></div>
      <div className="absolute bottom-32 left-20 w-16 h-16 bg-orange-300/40 rounded-full animate-bounce-gentle"></div>
      <div
        className="absolute top-1/3 right-1/4 w-8 h-8 bg-red-300/30 rounded-full animate-float"
        style={{ animationDelay: "2s" }}
      ></div>

      <div className="container mx-auto px-4 relative">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <div className="space-y-4">
              <div className="inline-flex items-center space-x-2 bg-yellow-400 text-black px-6 py-3 rounded-full text-sm font-bold shadow-lg">
                <Star className="h-4 w-4 fill-current" />
                <span>O Maior Marketplace de Agricultura Familiar do Brasil</span>
              </div>

              <h1 className="text-4xl lg:text-6xl font-bold text-balance leading-tight text-black">
                Conectando você aos{" "}
                <span className="bg-yellow-400 text-black px-2 py-1 rounded-lg">melhores ovos caipiras</span> do Brasil
              </h1>

              <p className="text-xl text-black/70 text-pretty leading-relaxed">
                Valorizamos quem cultiva, cria e planta com amor, tradição e respeito à terra. Produtos frescos,
                rastreados e provenientes de quem vive a agricultura de verdade.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row flex-wrap gap-4">
              <Button
                onClick={() => scrollToSection("assinatura")}
                size="lg"
                className="bg-yellow-400 text-black hover:bg-yellow-500 rounded-xl shadow-lg font-semibold"
              >
                <ShoppingBag className="mr-2 h-5 w-5" />
                Quero Assinar
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button
                onClick={() => scrollToSection("revendedor")}
                size="lg"
                className="bg-black text-white hover:bg-black/90 rounded-xl shadow-lg font-semibold"
              >
                <Store className="mr-2 h-5 w-5" />
                Quero Revender
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button
                onClick={() => scrollToSection("produtor")}
                size="lg"
                variant="outline"
                className="border-2 border-black text-black hover:bg-yellow-400 hover:border-yellow-400 rounded-xl font-semibold bg-transparent"
              >
                <Users className="mr-2 h-5 w-5" />
                Quero Produzir
              </Button>
            </div>
          </div>

          <div className="relative">
            <div className="relative rounded-3xl overflow-hidden shadow-2xl animate-float mb-8">
              <Image
                src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/design-mode-images/image%282%29-y5cmTiaGBb8X9mc1EKdxDmdS28P7Zl.png"
                alt="Família feliz tomando café da manhã com ovos Caipirovos"
                width={600}
                height={300}
                className="w-full h-auto"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
            </div>

            <div className="relative rounded-3xl overflow-hidden shadow-2xl animate-bounce-gentle"></div>

            <div className="absolute -bottom-6 -right-6 bg-yellow-400 text-black p-6 rounded-3xl shadow-2xl border-4 border-white">
              <div className="text-2xl font-bold">Entrega Grátis</div>
              <div className="text-sm font-medium opacity-80">A partir de 20 bandejas</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
