/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    // Imagens externas do site são otimizadas (menores) pelo Next/Vercel.
    remotePatterns: [{ protocol: "https", hostname: "hebbkx1anhila5yf.public.blob.vercel-storage.com" }],
  },
}

export default nextConfig
