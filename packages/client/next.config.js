/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    config.module.rules.push({
      test: /\.(glsl|frag|vert)$/,
      exclude: /node_modules/,
      use: "raw-loader",
    });

    // Allow importing TS from outside root directory
    {
      const oneOfRule = config.module.rules.find((rule) => rule.oneOf);

      // Next 12 has multiple TS loaders, and we need to update all of them.
      const tsRules = oneOfRule.oneOf.filter((rule) => rule.test && rule.test.toString().includes("tsx|ts"));

      tsRules.forEach((rule) => {
        // eslint-disable-next-line no-param-reassign
        rule.include = undefined;
      });
    }

    return config;
  },
};

module.exports = nextConfig;
