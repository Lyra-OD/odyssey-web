/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "picsum.photos",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
  async redirects() {
    return [
      {
        source: '/',
        destination: '/fr',
        permanent: true,
      },
      {
        source: '/:lang(fr|en)/dashboard',
        destination: '/:lang/studio',
        permanent: true,
      },
      {
        source: '/:lang(fr|en)/dashboard/:path*',
        destination: '/:lang/studio/:path*',
        permanent: true,
      },
      {
        source: '/:lang(fr|en)/partner',
        destination: '/:lang/salon',
        permanent: true,
      },
      {
        source: '/:lang(fr|en)/partner/:path*',
        destination: '/:lang/salon/:path*',
        permanent: true,
      },
      {
        source: '/login',
        destination: '/fr/studio/connexion',
        permanent: true,
      },
      {
        source: '/:lang(fr|en)/login',
        destination: '/:lang/studio/connexion',
        permanent: true,
      },
    ]
  },
};

export default nextConfig;

