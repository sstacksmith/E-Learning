/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable ESLint during build for better code quality
  eslint: {
    ignoreDuringBuilds: false,
  },
  // Enable image optimization for better performance
  images: {
    unoptimized: false,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        port: '',
        pathname: '/**',
      }
    ],
  },
  // Enable static generation
  trailingSlash: false,
  
  // 🚀 SPEED OPTIMIZATIONS FOR DEVELOPMENT
  // Turbopack configuration (now stable)
  turbopack: {
    rules: {
      '*.svg': {
        loaders: ['@svgr/webpack'],
        as: '*.js',
      },
    },
  },
  
  // Optimize package imports
  experimental: {
    optimizePackageImports: ['react-icons', 'lucide-react'],
  },
  
  // Server components external packages (for Turbopack compatibility)
  serverExternalPackages: ['pdfjs-dist', 'canvas'],
  
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
    
    // Configure module resolution
    config.resolve = config.resolve || {};
    config.resolve.alias = config.resolve.alias || {};
    
    // Ignore canvas module for browser builds (required by pdfjs-dist)
    if (!isServer) {
      config.resolve.alias['canvas'] = require('path').resolve(__dirname, 'src/lib/canvas-stub.js');
    }
    
    // Always set @ alias
    config.resolve.alias['@'] = require('path').resolve(__dirname, 'src');
    
    // Fallback for node modules in browser
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
    };
    
    return config;
  },
  
  // Compiler optimizations
  compiler: {
    // Remove console.logs in production
    removeConsole: process.env.NODE_ENV === 'production',
  },
  
  // Generate stable build ID for better caching
  generateBuildId: async () => {
    return 'stable-build-id';
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
  
  // Allow cross-origin requests in development
  allowedDevOrigins: ['192.168.1.112'],
  
  // Enable static optimization
  output: 'standalone',
  
  // Enable compression
  compress: true,
}

module.exports = nextConfig
