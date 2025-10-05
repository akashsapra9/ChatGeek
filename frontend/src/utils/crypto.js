// Base64url helpers
function bufToBase64Url(buf) {
  let binary = "";
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64UrlToBuf(base64url) {
  let base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) {
    base64 += "=";
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

// Key generation
export async function generateKeyPair() {
  const keyPair = await window.crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 4096,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["encrypt", "decrypt"]
  );

  const publicKey = await window.crypto.subtle.exportKey(
    "spki",
    keyPair.publicKey
  );
  const privateKey = await window.crypto.subtle.exportKey(
    "pkcs8",
    keyPair.privateKey
  );

  return {
    publicKey: bufToBase64Url(publicKey),
    privateKey: bufToBase64Url(privateKey),
  };
}

// Import/export helpers
async function importPublicKey(pubkeyB64Url) {
  return await window.crypto.subtle.importKey(
    "spki",
    base64UrlToBuf(pubkeyB64Url),
    { name: "RSA-OAEP", hash: "SHA-256" },
    true,
    ["encrypt"]
  );
}

async function importPrivateKey(privkeyB64Url) {
  return await window.crypto.subtle.importKey(
    "pkcs8",
    base64UrlToBuf(privkeyB64Url),
    { name: "RSA-OAEP", hash: "SHA-256" },
    true,
    ["decrypt"]
  );
}

async function importSignKey(privkeyB64Url) {
  return await window.crypto.subtle.importKey(
    "pkcs8",
    base64UrlToBuf(privkeyB64Url),
    { name: "RSASSA-PSS", hash: "SHA-256" },
    true,
    ["sign"]
  );
}

async function importVerifyKey(pubkeyB64Url) {
  return await window.crypto.subtle.importKey(
    "spki",
    base64UrlToBuf(pubkeyB64Url),
    { name: "RSASSA-PSS", hash: "SHA-256" },
    true,
    ["verify"]
  );
}

// EncryptionDecryption
export async function encryptMessage(plaintext, recipientPubB64Url) {
  const pubKey = await importPublicKey(recipientPubB64Url);
  const enc = new TextEncoder();
  const ciphertext = await window.crypto.subtle.encrypt(
    { name: "RSA-OAEP" },
    pubKey,
    enc.encode(plaintext)
  );
  return bufToBase64Url(ciphertext);
}

export async function decryptMessage(cipherB64Url, myPrivB64Url) {
  const privKey = await importPrivateKey(myPrivB64Url);
  const decrypted = await window.crypto.subtle.decrypt(
    { name: "RSA-OAEP" },
    privKey,
    base64UrlToBuf(cipherB64Url)
  );
  const dec = new TextDecoder();
  return dec.decode(decrypted);
}

// Signing/verifying
export async function signMessage(data, myPrivB64Url) {
  const privKey = await importSignKey(myPrivB64Url);
  const enc = new TextEncoder();
  const sig = await window.crypto.subtle.sign(
    { name: "RSASSA-PSS", saltLength: 32 },
    privKey,
    enc.encode(data)
  );
  return bufToBase64Url(sig);
}

export async function verifyMessage(data, sigB64Url, senderPubB64Url) {
  const pubKey = await importVerifyKey(senderPubB64Url);
  const enc = new TextEncoder();
  const ok = await window.crypto.subtle.verify(
    { name: "RSASSA-PSS", saltLength: 32 },
    pubKey,
    base64UrlToBuf(sigB64Url),
    enc.encode(data)
  );
  return ok;
}
