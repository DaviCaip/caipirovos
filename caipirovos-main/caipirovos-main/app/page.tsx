import { Header } from "@/components/header"
import { HeroSection } from "@/components/hero-section"
import { AboutSection } from "@/components/about-section"
import { FoundersSection } from "@/components/founders-section"
import { ResellerFormSection } from "@/components/reseller-form-section"
import { ProducerFormSection } from "@/components/producer-form-section"
import { LocationsSection } from "@/components/locations-section"
import { SubscriptionSection } from "@/components/subscription-section"
import { Footer } from "@/components/footer"

export default function HomePage() {
  return (
    <main className="min-h-screen">
      <Header />
      <HeroSection />
      <div id="sobre">
        <AboutSection />
      </div>
      <div id="fundadoras">
        <FoundersSection />
      </div>
      <div id="revendedor">
        <ResellerFormSection />
      </div>
      <div id="produtor">
        <ProducerFormSection />
      </div>
      <div id="onde-encontrar">
        (deixa em branco)
      </div>
      <div id="contato">
        <SubscriptionSection />
      </div>
      <Footer />
    </main>
  )
}
