/** Browser/Node SHA-256 helper; absence of Web Crypto is a hard error. */

/** @returns {Promise<string>} lowercase SHA-256 hex for exact UTF-8 text. */
export async function sha256Text(value, cryptoRef) {
  if (!cryptoRef?.subtle?.digest) throw new Error('Web Crypto SHA-256 is unavailable; revision loading is blocked.');
  const bytes = new TextEncoder().encode(String(value));
  const digest = await cryptoRef.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((part) => part.toString(16).padStart(2, '0')).join('');
}

