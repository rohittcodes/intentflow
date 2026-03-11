/**
 * Encryption Utilities using Web Crypto API
 * Implements AES-256-GCM for authenticated encryption
 */

const ALGORITHM = "AES-GCM";
const IV_LENGTH = 12; // 96 bits is recommended for GCM

/**
 * Encrypt a string using AES-256-GCM
 * Returns a base64 string containing: iv + ":" + ciphertext
 */
export async function encrypt(text: string, salt: string): Promise<string> {
  const secretKey = process.env.SECRET_ENCRYPTION_KEY;
  if (!secretKey) {
    throw new Error("SECRET_ENCRYPTION_KEY environment variable is not set");
  }

  const crypto = globalThis.crypto;
  const encoder = new TextEncoder();

  // 1. Derive key
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secretKey),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );

  const key = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: encoder.encode(salt), // Dynamic salt per resource/user
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: ALGORITHM, length: 256 },
    false,
    ["encrypt"]
  );

  // 2. Encrypt
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encrypted = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv },
    key,
    encoder.encode(text)
  );

  // 3. Package result
  const ivBase64 = btoa(String.fromCharCode(...iv));
  const ciphertextBase64 = btoa(String.fromCharCode(...new Uint8Array(encrypted)));

  return `${ivBase64}:${ciphertextBase64}`;
}

/**
 * Decrypt a string using AES-256-GCM
 */
export async function decrypt(encryptedData: string, salt: string): Promise<string> {
  const secretKey = process.env.SECRET_ENCRYPTION_KEY;
  if (!secretKey) {
    throw new Error("SECRET_ENCRYPTION_KEY environment variable is not set");
  }

  const [ivBase64, ciphertextBase64] = encryptedData.split(":");
  if (!ivBase64 || !ciphertextBase64) {
    throw new Error("Invalid encrypted data format");
  }

  const crypto = globalThis.crypto;
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  // 1. Derive key
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secretKey),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );

  const key = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: encoder.encode(salt),
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: ALGORITHM, length: 256 },
    false,
    ["decrypt"]
  );

  // 2. Decrypt
  const iv = new Uint8Array(
    atob(ivBase64)
      .split("")
      .map((c) => c.charCodeAt(0))
  );
  const ciphertext = new Uint8Array(
    atob(ciphertextBase64)
      .split("")
      .map((c) => c.charCodeAt(0))
  );

  try {
    const decrypted = await crypto.subtle.decrypt(
      { name: ALGORITHM, iv },
      key,
      ciphertext
    );
    return decoder.decode(decrypted);
  } catch (error) {
    console.error("Decryption failed:", error);
    throw new Error("Failed to decrypt data. The encryption key or salt might be incorrect.");
  }
}
