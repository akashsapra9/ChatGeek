import forge from 'node-forge';

export class CryptoUtils {
  // Generate RSA-4096 key pair
  static generateKeyPair() {
    return new Promise((resolve, reject) => {
      try {
        forge.pki.rsa.generateKeyPair({ bits: 4096, workers: 2 }, (err, keypair) => {
          if (err) {
            reject(err);
            return;
          }
          
          // Convert to PEM format
          const publicKey = forge.pki.publicKeyToPem(keypair.publicKey);
          const privateKey = forge.pki.privateKeyToPem(keypair.privateKey);
          
          resolve({
            publicKey,
            privateKey
          });
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  // Encrypt private key with password for storage
  static encryptPrivateKey(privateKeyPem, password) {
    try {
      // Generate a random salt
      const salt = forge.random.getBytesSync(16);
      
      // Derive key from password
      const key = forge.pkcs5.pbkdf2(password, salt, 100000, 32);
      
      // Generate random IV
      const iv = forge.random.getBytesSync(16);
      
      // Create cipher
      const cipher = forge.cipher.createCipher('AES-CBC', key);
      cipher.start({ iv: iv });
      cipher.update(forge.util.createBuffer(privateKeyPem));
      cipher.finish();
      
      // Combine salt + iv + encrypted data
      const encrypted = forge.util.encode64(
        salt + iv + cipher.output.getBytes()
      );
      
      return encrypted;
    } catch (error) {
      throw new Error(`Private key encryption failed: ${error.message}`);
    }
  }

  // Decrypt private key (for login)
  static decryptPrivateKey(encryptedPrivateKey, password) {
    try {
      // Decode from base64
      const encryptedBytes = forge.util.decode64(encryptedPrivateKey);
      
      // Extract salt (first 16 bytes), IV (next 16 bytes), and encrypted data
      const salt = encryptedBytes.substring(0, 16);
      const iv = encryptedBytes.substring(16, 32);
      const encryptedData = encryptedBytes.substring(32);
      
      // Derive key from password
      const key = forge.pkcs5.pbkdf2(password, salt, 100000, 32);
      
      // Create decipher
      const decipher = forge.cipher.createDecipher('AES-CBC', key);
      decipher.start({ iv: iv });
      decipher.update(forge.util.createBuffer(encryptedData));
      decipher.finish();
      
      return decipher.output.toString();
    } catch (error) {
      throw new Error(`Private key decryption failed: ${error.message}`);
    }
  }

  // // Generate PAKE verifier (simplified - in real implementation use proper PAKE)
  // static generatePakeVerifier(password) {
  //   // For now, we'll use a simple hash-based approach
  //   // In production, implement proper PAKE like SRP or OPAQUE
  //   const md = forge.md.sha256.create();
  //   md.update(password + 'socp_salt_' + Date.now());
  //   return forge.util.encode64(md.digest().getBytes());
  // }

  // Encrypt message with recipient's public key (RSA-OAEP)
  static encryptMessage(message, publicKeyPem) {
    try {
      const publicKey = forge.pki.publicKeyFromPem(publicKeyPem);
      const encrypted = publicKey.encrypt(message, 'RSA-OAEP', {
        md: forge.md.sha256.create(),
        mgf1: {
          md: forge.md.sha256.create()
        }
      });
      return forge.util.encode64(encrypted);
    } catch (error) {
      throw new Error(`Message encryption failed: ${error.message}`);
    }
  }

  // Decrypt message with private key
  static decryptMessage(encryptedMessage, privateKeyPem) {
    try {
      const privateKey = forge.pki.privateKeyFromPem(privateKeyPem);
      const decoded = forge.util.decode64(encryptedMessage);
      const decrypted = privateKey.decrypt(decoded, 'RSA-OAEP', {
        md: forge.md.sha256.create(),
        mgf1: {
          md: forge.md.sha256.create()
        }
      });
      return decrypted;
    } catch (error) {
      throw new Error(`Message decryption failed: ${error.message}`);
    }
  }

  // Sign message (RSASSA-PSS)
  static signMessage(message, privateKeyPem) {
    try {
      const privateKey = forge.pki.privateKeyFromPem(privateKeyPem);
      const md = forge.md.sha256.create();
      md.update(message, 'utf8');
      const signature = privateKey.sign(md, 'PSS', {
        md: forge.md.sha256.create(),
        mgf1: {
          md: forge.md.sha256.create()
        },
        saltLength: 32
      });
      return forge.util.encode64(signature);
    } catch (error) {
      throw new Error(`Message signing failed: ${error.message}`);
    }
  }

  // Verify signature
  static verifySignature(message, signature, publicKeyPem) {
    try {
      const publicKey = forge.pki.publicKeyFromPem(publicKeyPem);
      const md = forge.md.sha256.create();
      md.update(message, 'utf8');
      const sigBytes = forge.util.decode64(signature);
      return publicKey.verify(md.digest().getBytes(), sigBytes, 'PSS', {
        md: forge.md.sha256.create(),
        mgf1: {
          md: forge.md.sha256.create()
        },
        saltLength: 32
      });
    } catch (error) {
      throw new Error(`Signature verification failed: ${error.message}`);
    }
  }
}