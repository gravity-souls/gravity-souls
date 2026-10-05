export const MAX_CHAT_IMAGE_BYTES = 3 * 1024 * 1024
export const CHAT_IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp'] as const
export type ChatImageCard = { id: string; width: number; height: number; bytes: number; url: string }
