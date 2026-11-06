import { withSentryConfig } from "@sentry/nextjs/config";

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

// Tolerates missing env at build time: no SENTRY_AUTH_TOKEN in CI, so source
// map upload stays disabled; runtime error capture works via the DSN alone.
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: !process.env.CI,
  sourcemaps: {
    disable: true,
  },
});
