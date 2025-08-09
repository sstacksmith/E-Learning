/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['images.unsplash.com'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
    console.log('API URL:', apiUrl);
    
    return [
      {
        source: '/api/:path*',
        destination: `${apiUrl}/api/:path*`,
      }
    ]
  }
}

module.exports = nextConfig
