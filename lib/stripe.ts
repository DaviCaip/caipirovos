import Stripe from "stripe"

// Cliente do Stripe. A variável STRIPE_TEST_HOST existe só para os testes automáticos e é ignorada na Vercel.
export function getStripe(): Stripe {
  const testHost = process.env.STRIPE_TEST_HOST
  if (testHost && !process.env.VERCEL_ENV) {
    return new Stripe(process.env.STRIPE_SECRET_KEY!, {
      host: testHost,
      port: process.env.STRIPE_TEST_PORT || "80",
      protocol: "http",
    })
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY!)
}
