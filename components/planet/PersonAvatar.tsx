'use client'
/* eslint-disable @next/next/no-img-element -- User-selected remote portraits use their original URL, as in PlanetAvatar. */
import { useState } from 'react'
export default function PersonAvatar({ name, src, size = 32 }: { name: string; src?: string | null; size?: number }) {
  const [failed, setFailed] = useState(false)
  return <span className="inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/20 bg-violet-400/15 text-sm text-violet-100" style={{ width: size, height: size }}>
    {src && !failed ? <img src={src} alt="" width={size} height={size} className="h-full w-full object-cover" onError={() => setFailed(true)} /> : name.trim().slice(0,1).toLocaleUpperCase() || '·'}
  </span>
}
