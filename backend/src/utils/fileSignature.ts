/**
 * Magic-byte sniffing so a declared MIME type (which the browser/client controls) can't
 * be spoofed by an extension or a forged Content-Type header alone. This is NOT malware
 * scanning — it only confirms the file is structurally what it claims to be. Real
 * scanning lives in services/malwareScan.ts.
 */
const SIGNATURES: { mimeType: string; matches: (buf: Buffer) => boolean }[] = [
  { mimeType: "application/pdf", matches: (b) => b.length >= 4 && b.subarray(0, 4).toString("latin1") === "%PDF" },
  { mimeType: "image/jpeg", matches: (b) => b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { mimeType: "image/png", matches: (b) => b.length >= 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
];

/** True if the buffer's actual magic bytes match the declared (allow-listed) MIME type. */
export function matchesDeclaredType(buffer: Buffer, declaredMimeType: string): boolean {
  const sig = SIGNATURES.find((s) => s.mimeType === declaredMimeType);
  return sig ? sig.matches(buffer) : false;
}

export const ALLOWED_DOCUMENT_MIME_TYPES = SIGNATURES.map((s) => s.mimeType);
