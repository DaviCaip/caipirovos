import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tractor, MapPin, Egg, Camera, FileText, ArrowRight } from "lucide-react"

export function ProducerSection() {
  return (
    <section id="produtores" className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold text-balance mb-6">
            Seja um <span className="text-primary">Produtor Parceiro</span>
          </h2>
          <p className="text-xl text-muted-foreground text-pretty max-w-3xl mx-auto leading-relaxed">
            Junte-se à nossa rede de produtores e tenha acesso a um canal sólido de comercialização. Valorizamos quem
            produz com qualidade, tradição e sustentabilidade.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-start">
          <div className="space-y-8">
            <div className="space-y-6">
              <div className="flex items-start space-x-4">
                <div className="flex items-center justify-center w-10 h-10 bg-primary/20 rounded-full flex-shrink-0">
                  <Tractor className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-2">Pequenos e Médios Produtores</h3>
                  <p className="text-muted-foreground text-pretty">
                    Priorizamos produtores familiares que trabalham com amor e dedicação, mantendo tradições e práticas
                    sustentáveis.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="flex items-center justify-center w-10 h-10 bg-secondary/20 rounded-full flex-shrink-0">
                  <Egg className="h-5 w-5 text-secondary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-2">Criação Livre de Gaiolas</h3>
                  <p className="text-muted-foreground text-pretty">
                    Buscamos produtores comprometidos com o bem-estar animal e práticas de criação que respeitam o
                    comportamento natural das aves.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="flex items-center justify-center w-10 h-10 bg-primary/20 rounded-full flex-shrink-0">
                  <MapPin className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-2">Cobertura Nacional</h3>
                  <p className="text-muted-foreground text-pretty">
                    Estamos expandindo por todo o Brasil, conectando produtores locais aos consumidores de suas regiões.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-xl p-6">
              <h4 className="text-lg font-semibold mb-3">Benefícios para Produtores</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  <span>Canal de venda garantido e estável</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-secondary rounded-full"></div>
                  <span>Preços justos e pagamento em dia</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  <span>Suporte técnico veterinário</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-secondary rounded-full"></div>
                  <span>Marketing e divulgação da sua produção</span>
                </li>
              </ul>
            </div>
          </div>

          <Card className="border-0 shadow-xl">
            <CardContent className="p-8">
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold mb-2">Cadastre-se como Produtor</h3>
                <p className="text-muted-foreground">Preencha o formulário e nossa equipe entrará em contato</p>
              </div>

              <form className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome Completo</Label>
                    <Input id="name" placeholder="Seu nome completo" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefone</Label>
                    <Input id="phone" placeholder="(00) 00000-0000" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input id="email" type="email" placeholder="seu@email.com" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">Localização da Propriedade</Label>
                  <Input id="location" placeholder="Cidade, Estado" />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="production">Produção Mensal (bandejas)</Label>
                    <Input id="production" placeholder="Ex: 500" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="type">Tipo de Criação</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="livre">Criação Livre</SelectItem>
                        <SelectItem value="semi-intensivo">Semi-intensivo</SelectItem>
                        <SelectItem value="organico">Orgânico</SelectItem>
                        <SelectItem value="caipira">Caipira Tradicional</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Conte sobre sua produção</Label>
                  <Textarea
                    id="description"
                    placeholder="Descreva sua propriedade, métodos de criação, experiência..."
                    rows={4}
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <Camera className="h-4 w-4" />
                    <span>Fotos da produção (envie por email após o cadastro)</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <FileText className="h-4 w-4" />
                    <span>Documentos necessários serão solicitados posteriormente</span>
                  </div>
                </div>

                <Button className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90" size="lg">
                  Enviar Cadastro
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  )
}
