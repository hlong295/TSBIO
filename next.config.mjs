/** @type {import('next').NextConfig} */
const nextConfig = {
  // Next.js 16 removed `eslint` option from next.config.
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
