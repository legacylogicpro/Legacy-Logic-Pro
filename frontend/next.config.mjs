/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Section 3.6: Strict mode genuinely clean — do not suppress type errors
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
};

export default nextConfig;
