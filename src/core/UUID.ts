/** Generates RFC 4122 version 4 UUIDs without external dependencies. */
export function createUUID(): string {
  const cryptoProvider = globalThis.crypto;
  if (cryptoProvider?.randomUUID) return cryptoProvider.randomUUID();
  const bytes = new Uint8Array(16);
  if (cryptoProvider) cryptoProvider.getRandomValues(bytes);
  else
    for (let index = 0; index < bytes.length; index += 1)
      bytes[index] = Math.floor(Math.random() * 256);
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = Array.from(bytes, (value) => value.toString(16).padStart(2, "0"));
  return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex.slice(6, 8).join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10).join("")}`;
}
