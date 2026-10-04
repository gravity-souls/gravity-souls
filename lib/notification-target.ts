/** Notifications may navigate only within the application, including old stored rows. */
export function safeNotificationTarget(url: string | null): string | null {
  return url &&
    url.startsWith('/') &&
    !url.startsWith('//') &&
    !/[\\\u0000-\u0020]/.test(url)
    ? url
    : null
}
