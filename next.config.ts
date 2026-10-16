import type { NextConfig } from 'next'

const config: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // This folder is a project of its own even when it sits inside a bigger
  // repository: keep Next from looking for a workspace root above it.
  turbopack: { root: import.meta.dirname },
  outputFileTracingRoot: import.meta.dirname,
}

export default config
