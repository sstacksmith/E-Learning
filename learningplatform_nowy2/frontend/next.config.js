/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable ESLint during build for better code quality
  eslint: {
    ignoreDuringBuilds: false,
  },
  // Enable image optimization for better performance
  images: {
    unoptimized: false,
    domains: [
      'images.unsplash.com',
      'firebasestorage.googleapis.com'
    ],
  },
  // Enable static generation
  trailingSlash: false,
  
  // 🚀 SPEED OPTIMIZATIONS FOR DEVELOPMENT
  // Turbopack configuration (now stable)
  experimental: {
    // Enable Turbopack for faster development
    turbo: {
      rules: {
        '*.svg': {
          loaders: ['@svgr/webpack'],
          as: '*.js',
        },
      },
    },
    // Optimize package imports
    optimizePackageImports: ['react-icons', 'lucide-react'],
  },
  
  // Webpack optimizations
  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer) {
      // Faster source maps in development
      config.devtool = 'eval-cheap-module-source-map';
      
      // Optimize development builds
      config.optimization = {
        ...config.optimization,
        removeAvailableModules: false,
        removeEmptyChunks: false,
        splitChunks: false,
      };
    }
    
    return config;
  },
  
  // Compiler optimizations
  compiler: {
    // Remove console.logs in production
    removeConsole: process.env.NODE_ENV === 'production',
  },
  
  // 🔥 CACHE BUSTING FOR DEVELOPMENT
  generateBuildId: async () => {
    // Generate unique build ID to bust cache
    return `build-${Date.now()}`;
  },
  
  // Headers to prevent caching in development
  async headers() {
    if (process.env.NODE_ENV === 'development') {
      return [
        {
          source: '/(.*)',
          headers: [
            {
              key: 'Cache-Control',
              value: 'no-cache, no-store, must-revalidate',
            },
            {
              key: 'Pragma',
              value: 'no-cache',
            },
            {
              key: 'Expires',
              value: '0',
            },
          ],
        },
      ];
    }
    return [];
  },
}

module.exports = nextConfig
