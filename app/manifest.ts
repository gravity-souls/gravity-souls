import type { MetadataRoute } from 'next'
export default function manifest(): MetadataRoute.Manifest {
  return { id: '/', name: 'Gravity Souls', short_name: 'Gravity Souls', start_url: '/', scope: '/', display: 'standalone', background_color: '#03030f', theme_color: '#03030f', icons: [
    { src: '/gravity-souls-icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: '/gravity-souls-icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    { src: '/gravity-souls-icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
  ] }
}
