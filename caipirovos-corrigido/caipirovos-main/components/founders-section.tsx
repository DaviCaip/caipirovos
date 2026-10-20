import Image from "next/image"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Award, GraduationCap } from "lucide-react"

export function FoundersSection() {
  return (
    <section className="py-20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold text-balance mb-6">
            Quem está por trás da <span className="text-primary">Caipirovos</span>
          </h2>
          <p className="text-xl text-muted-foreground text-pretty max-w-2xl mx-auto leading-relaxed">
            Uma mulher visionária transformou o sonho de uma granja sustentável em realidade, criando o maior
            marketplace de agricultura familiar do Brasil.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-center mb-16">
          <div className="relative">
            <Image
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/design-mode-images/image%282%29-KUdijQaAgTYvDBLpKOacRGzQeIH4WP.png"
              alt="Daniela Lacerda - Fundadora da Caipirovos"
              width={600}
              height={400}
              className="shadow-2xl w-full h-auto rounded-4xl"
            />
            <div className="absolute -bottom-6 -left-6 bg-primary text-primary-foreground p-4 rounded-xl shadow-lg">
              <div className="text-sm font-medium">Fundadora desde</div>
              <div className="text-2xl font-bold">2021</div>
            </div>
          </div>

          <div className="space-y-8">
            <Card className="border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-start space-x-4">
                  <div className="flex items-center justify-center w-12 h-12 bg-primary/20 rounded-full flex-shrink-0">
                    <Award className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">Daniela Lacerda</h3>
                    <div className="flex flex-wrap gap-2 mb-3">
                      <Badge variant="secondary">Forbes Under 30</Badge>
                      <Badge variant="outline">Oxford</Badge>
                      <Badge variant="outline">ESG</Badge>
                    </div>
                    <p className="text-muted-foreground text-pretty leading-relaxed">
                      Força visionária por trás da Caipirovos. Com 32 anos, tem sólida experiência em Gestão de Pessoas,
                      ESG e Marketing de Relacionamento. Reconhecida por sua atuação humana no varejo e listada pela
                      Forbes Under 30.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="bg-gradient-to-r from-secondary/10 to-primary/10 rounded-2xl p-8 lg:p-12 text-center">
          <div className="max-w-3xl mx-auto">
            <GraduationCap className="h-12 w-12 text-primary mx-auto mb-4" />
            <h3 className="text-2xl lg:text-3xl font-bold mb-4 text-balance">Uma Visão para o Futuro</h3>
            <p className="text-lg text-muted-foreground text-pretty leading-relaxed">
              O projeto da Caipirovos reflete o comprometimento de uma mulher com sustentabilidade, qualidade e
              bem-estar animal. Está preparando a marca para expandir pela Bahia, levando ovos caipiras genuínos e
              diferenciados a um público ainda maior.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
