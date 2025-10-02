import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Server external packages (moved from experimental)
  serverExternalPackages: ['mongoose'],
  
  // Enable experimental features for better performance
  experimental: {
    // Optimize bundle size
    optimizePackageImports: ['@radix-ui/react-icons', 'lucide-react'],
  },

  // Image optimization
  images: {
    // Allow external image domains if needed
    domains: ['localhost', 'your-domain.com'],
    // Enable image optimization
    formats: ['image/webp', 'image/avif'],
  },

  // Environment variables
  env: {
    // Make sure these are available on both client and server
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },

  // Webpack configuration for better bundling
  webpack: (config, { isServer }) => {
    // Handle file uploads and large files
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };

    // Optimize for server-side rendering
    if (isServer) {
      config.externals.push('mongoose');
    }

    return config;
  },

  // Headers for security and CORS
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: process.env.NODE_ENV === 'production' 
              ? 'https://your-domain.com' 
              : 'http://localhost:3000',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization, x-access-token, x-refresh-token, x-force-refresh',
          },
          {
            key: 'Access-Control-Allow-Credentials',
            value: 'true',
          },
        ],
      },
    ];
  },

  // Redirects for better UX
  async redirects() {
    return [
      {
        source: '/dashboard',
        destination: '/companies',
        permanent: false,
      },
      {
        source: '/admin',
        destination: '/companies',
        permanent: false,
      },
    ];
  },

  // Rewrites for API routes
  async rewrites() {
    return [
      {
        source: '/api/health',
        destination: '/api/health/check',
      },
    ];
  },

  // Output configuration
  // output: 'standalone', // For Docker deployment - disabled for now
  outputFileTracingRoot: '/home/val/Projects/next-app',
  
  // Compression
  compress: true,
  
  // Power by header
  poweredByHeader: false,
  
  // React strict mode
  reactStrictMode: true,
  
  // SWC minification (enabled by default in Next.js 15+)
  
  // TypeScript configuration
  typescript: {
    // Don't fail build on type errors in production
    ignoreBuildErrors: process.env.NODE_ENV === 'production',
  },
  
  // ESLint configuration
  eslint: {
    // Don't fail build on ESLint errors in production
    ignoreDuringBuilds: process.env.NODE_ENV === 'production',
  },
};

export default nextConfig;