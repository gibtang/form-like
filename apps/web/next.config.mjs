/** @type {import('next').NextConfig} */
const nextConfig = {
  // Standalone output for the Docker image (Coolify + self-hosting).
  output: "standalone",
  webpack: (config) => {
    // mongodb's aws4 is an optional dependency used only for AWS-style auth;
    // silence its dev-mode resolution warning.
    config.resolve.fallback = { ...config.resolve.fallback, aws4: false };
    return config;
  },
};

export default nextConfig;
