/** @type {import('next').NextConfig} */
const nextConfig = {
  // pdf-parse and mammoth are Node-only libs — keep them out of the client bundle
  serverExternalPackages: ["pdf-parse", "mammoth"],
};

export default nextConfig;
