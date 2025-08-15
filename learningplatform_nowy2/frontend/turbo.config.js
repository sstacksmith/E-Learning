/** @type {import('turbo').Config} */
module.exports = {
  $schema: "https://turbo.build/schema.json",
  
  // 🚀 SPEED OPTIMIZATIONS
  globalDependencies: ["**/.env.*local"],
  
  pipeline: {
    dev: {
      cache: false,
      persistent: true,
    },
    build: {
      dependsOn: ["^build"],
      outputs: [".next/**", "!.next/cache/**"],
    },
    start: {
      dependsOn: ["build"],
      cache: false,
    },
  },
  
  // Development optimizations
  experimental: {
    turbo: {
      rules: {
        "*.svg": {
          loaders: ["@svgr/webpack"],
          as: "*.js",
        },
      },
    },
  },
}
