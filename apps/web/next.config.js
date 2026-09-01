/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,
  transpilePackages: ['@estrategos/shared-types'],
  // Imagen de producción liviana (ver Dockerfile): standalone empaqueta solo
  // los node_modules realmente usados en runtime, no todo el árbol de deps.
  output: 'standalone',
  // Polling en vez de watch nativo: evita el crash de libuv (Assertion failed en fs-event.c)
  // que ocurre en Windows al vigilar el symlink de workspace de @estrategos/shared-types.
  webpack: (config) => {
    config.watchOptions = { poll: 1000, aggregateTimeout: 300 };
    return config;
  },
};
