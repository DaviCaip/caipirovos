import { Card, CardContent } from "@/components/ui/card"
import { Heart, Leaf, Shield, Award } from "lucide-react"
import Image from "next/image"

export function AboutSection() {
  const values = [
    {
      icon: Heart,
      title: "Bem-estar Animal",
      description: "Sistema inovador de criação 100% livre de gaiolas, garantindo qualidade de vida para nossas aves.",
    },
    {
      icon: Leaf,
      title: "Sustentabilidade",
      description: "Práticas sustentáveis que respeitam o meio ambiente e promovem a economia circular.",
    },
    {
      icon: Shield,
      title: "Qualidade Garantida",
      description: "Produtos frescos, rastreados e com controle veterinário rigoroso em todas as etapas.",
    },
    {
      icon: Award,
      title: "Protagonismo Rural",
      description: "Valorizamos pequenos e médios produtores, gerando renda e dignidade no campo.",
    },
  ]

  return (
    <section className="py-20 bg-muted/30">
      <div className="container mx-auto px-4 mb-20">
        <div className="relative rounded-3xl overflow-hidden shadow-2xl">
          <Image
            src="/images/family-breakfast.png"
            alt="Família feliz tomando café da manhã com ovos Caipirovos"
            width={1200}
            height={400}
            className="w-full h-[400px] object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/40 to-transparent flex items-center">
            <div className="text-white p-8 max-w-2xl">
              <h2 className="text-4xl md:text-5xl font-bold mb-4">Momentos especiais começam com qualidade</h2>
              <p className="text-xl opacity-90">Ovos Caipirovos: tradição, sabor e nutrição para toda a família</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold text-balance mb-6">
            Nosso Compromisso com a <span className="text-primary">Agricultura Familiar</span>
          </h2>
          <p className="text-xl text-muted-foreground text-pretty max-w-3xl mx-auto leading-relaxed">
            A Caipirovos nasceu para conectar pequenos e médios produtores a um canal sólido de comercialização,
            valorizando quem cultiva com amor, tradição e respeito à terra.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {values.map((value, index) => (
            <Card key={index} className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
              <CardContent className="p-6 text-center">
                <div className="flex items-center justify-center w-16 h-16 bg-primary/20 rounded-full mb-4 mx-auto">
                  <value.icon className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-3">{value.title}</h3>
                <p className="text-muted-foreground text-pretty leading-relaxed">{value.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        
      </div>
    </section>
  )
}
