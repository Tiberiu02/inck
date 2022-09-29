/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    config.module.rules.push({
      test: /\.(glsl|frag|vert)$/,
      exclude: /node_modules/,
      use: "raw-loader",
    });
    config.module.rules.push({
      test: /common-types.*\.ts$/,
      exclude: /node_modules/,
      use: "ts-loader",
    });
    return config;
  },
};

module.exports = nextConfig;
