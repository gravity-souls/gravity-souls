'use client'

// Phase 4: UPLOAD and DOWNLOAD behavior removed.
// Upload: no longer needed — all pages load from DB directly.
// Download: pages now load directly from API; localStorage fallbacks removed.
// Hook kept as a no-op; layout mount site preserved for future use.
export function useAuthSync() {}
