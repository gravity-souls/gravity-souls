'use client'

import CosmicGlobe from '@/components/fx/CosmicGlobe'

export default function GlobeClient() {
  return (
    <div
      style={{
        width:      '100dvw',
        height:     '100dvh',
        background: '#040A18',
        position:   'relative',
        overflow:   'hidden',
      }}
    >
      <CosmicGlobe style={{ width: '100%', height: '100%' }} />

      <p
        style={{
          position:      'absolute',
          bottom:        28,
          left:          0,
          right:         0,
          textAlign:     'center',
          margin:        0,
          fontSize:      10,
          letterSpacing: '0.26em',
          textTransform: 'uppercase',
          color:         'rgba(140,180,240,0.22)',
          fontFamily:    'system-ui, -apple-system, sans-serif',
          pointerEvents: 'none',
          userSelect:    'none',
        }}
      >
        Cosmic Globe · Phase 1
      </p>
    </div>
  )
}
