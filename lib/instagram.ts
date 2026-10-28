const spacing = /[\s\u200B-\u200D\u2060\uFEFF]/gu;
const profileHost = /^(?:https?:\/\/)?(?:www\.|m\.)?instagram\.com(?:\/|$)/i;
const reservedPaths = new Set(['p', 'reel', 'reels', 'tv', 'stories', 'explore', 'accounts', 'direct']);

/** Metrics stores the username without @; punctuation belongs to the identity.
 * Never remove dots/underscores or turn an arbitrary URL/email into a username.
 */
export function normalizeInstagram(value: unknown): string {
  if (typeof value !== 'string' || value.length > 2048) return '';
  let username = value.normalize('NFKC').replace(spacing, '');
  if (profileHost.test(username)) {
    try {
      const url = new URL(/^https?:\/\//i.test(username) ? username : `https://${username}`);
      if (!['instagram.com', 'www.instagram.com', 'm.instagram.com'].includes(url.hostname) || url.username || url.password || url.port) return '';
      const path = /^\/([^/]+)\/?$/.exec(url.pathname);
      if (!path) return '';
      username = decodeURIComponent(path[1]);
      if (reservedPaths.has(username.toLowerCase())) return '';
    } catch { return ''; }
  }
  username = username.replace(spacing, '').replace(/^@+/, '').toLowerCase();
  // Match the username format accepted by Metrics' crm_instagram_identity_key.
  return /^[a-z0-9._]{2,30}$/.test(username) ? username : '';
}
