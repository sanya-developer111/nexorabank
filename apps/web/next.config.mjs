import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@nexora/shared'],
  reactStrictMode: true,
  webpack: (config) => {
    // prop-types тянет вложенный react-is@16 без cjs-файлов — используем корневой пакет
    config.resolve.alias = {
      ...config.resolve.alias,
      'react-is': path.resolve(__dirname, '../../node_modules/react-is'),
    };
    return config;
  },
};

export default nextConfig;
