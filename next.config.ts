import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // ⚠️ Laisse le build passer même s'il y a des erreurs ESLint
    ignoreDuringBuilds: true,
  },
  // Optionnel : décommente si tu veux aussi ignorer les erreurs TypeScript en build
  // typescript: {
  //   ignoreBuildErrors: true,
  // },
};

export default nextConfig;
