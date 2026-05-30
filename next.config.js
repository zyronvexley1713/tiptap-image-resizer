/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'export',
    basePath: '/tiptap-image-resizer',
    images: {
        unoptimized: true,
    },
}

module.exports = nextConfig