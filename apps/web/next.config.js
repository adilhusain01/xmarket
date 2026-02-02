/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@xmarket/db', '@xmarket/shared'],
};

module.exports = nextConfig;
