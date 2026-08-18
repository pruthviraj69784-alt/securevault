/**
 * useCrypto — Web Crypto API helpers for Zero-Knowledge client-side encryption.
 * Uses AES-GCM-256 with PBKDF2 key derivation.
 */

const DEFAULT_SALT = 'SecureVault-ZK-Salt-2024'
const ITERATIONS = 250_000

async function deriveKey(passphrase, customSaltHex = null) {
  const enc = new TextEncoder()
  let saltUint8;

  if (customSaltHex) {
    saltUint8 = new Uint8Array(customSaltHex.match(/.{2}/g).map(b => parseInt(b, 16)))
  } else {
    saltUint8 = enc.encode(DEFAULT_SALT)
  }

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey']
  )

  return crypto.subtle.deriveKey(
    {
      name:       'PBKDF2',
      salt:       saltUint8,
      iterations: ITERATIONS,
      hash:       'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

/**
 * Encrypts a File object with AES-GCM-256 using PBKDF2 derived keys (250k iterations).
 * Returns { encryptedBlob, ivHex, saltHex }
 */
export async function encryptFile(file, passphrase) {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('')

  const key = await deriveKey(passphrase, saltHex)
  const iv  = crypto.getRandomValues(new Uint8Array(12))
  const buffer = await file.arrayBuffer()

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    buffer
  )

  const ivHex = Array.from(iv).map(b => b.toString(16).padStart(2, '0')).join('')
  const encryptedBlob = new Blob([ciphertext], { type: 'application/octet-stream' })
  return { encryptedBlob, ivHex, saltHex }
}

/**
 * Decrypts an ArrayBuffer downloaded from the server back into a Blob.
 */
export async function decryptBuffer(arrayBuffer, ivHex, passphrase, mimeType = 'application/octet-stream', saltHex = null) {
  const key = await deriveKey(passphrase, saltHex)
  const iv  = new Uint8Array(ivHex.match(/.{2}/g).map(b => parseInt(b, 16)))

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    arrayBuffer
  )

  return new Blob([decrypted], { type: mimeType })
}

/**
 * Computes a SHA-256 hex digest of an ArrayBuffer.
 */
export async function sha256Hex(arrayBuffer) {
  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer)
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

export default { encryptFile, decryptBuffer, sha256Hex }
