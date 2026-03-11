/** @type {import('next').NextConfig} */
const nextConfig = {
    experimental: {
        serverComponentsExternalPackages: ['@provablehq/sdk'],
    },
}

module.exports = nextConfig
