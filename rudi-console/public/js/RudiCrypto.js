"use strict";
/**
 * Cryptography module for Rudi
 * 
 * Contains function to encrypt and decrypt files and manage CryptoKeys in browser
 * 
 * @author Florian Desmortreux
 * Sources :
 *  - https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto
 * 
 */

/** Size of AES-GCM keys */
const AES_GCM_KEY_SIZE = 32;

/**
 * Convert str to ArrayBuffer
 * @param {string} str 
 */
 export function str2ab(str) {
    const buf = new ArrayBuffer(str.length);
    const bufView = new Uint8Array(buf);
    for (let i = 0, strLen = str.length; i < strLen; i++) {
      bufView[i] = str.charCodeAt(i);
    }
    return buf;
}

/**
 * Convert ArrayBuffer to string
 * @param {ArrayBuffer} arrayBuffer
 * @returns {string} the converted string
 */
export function ab2str(arrayBuffer) {
    return String.fromCharCode.apply(null, new Uint8Array(arrayBuffer));
}


/**
 * Encrypt a file
 * 
 * Step 1 : generate a 256 bit AES-GCM key and a 96 bit IV 
 * 
 * Step 2: encrypt the file with AES-GCM key and IV (File)[crypt]
 * 
 * Step 3: Concatenate AesKey and IV (AesKey+IV)
 * 
 * Step 4: Encrypt AesKey+IV with the RSA-OAEP public key (AesKey+Iv)[crypt]
 * 
 * Step 5: Build a new file as follow
 * ```
 *          ┌─── Encrypted with RSA-OAEP publicKey
 * +--------------------+----+
 * | (AesKey+Iv)[crypt] |    |       
 * +--------------------+    +
 * |                         | <── Encrypted with
 * |     (File)[crypt]       |     AES-GCM and IV
 * |                         | 
 * +-------------------------+
 * ```
 * @param {File} file the file to encrypt 
 * @param {CryptoKey} publicKey the RSA-OAEP public key
 * @returns {Promise<File>} a new file containing the
 * concatenation of the encrypted (AesKey+IV) and the
 * AES-GCM encrypted original file
 * @see {@link decryptRsaOaepAesGcm} for corresponding decryption
 */
export async function encryptRsaOaepAesGcm(file, publicKey) {
    // Get file ArrayBuffer and generate an AES-GCM key
    let [fileArrayBuffer, aesKey] = await Promise.all([
        file.arrayBuffer(),
        await window.crypto.subtle.generateKey(
            { name: "AES-GCM", length: 256 },
            true,
            ["encrypt", "decrypt"]
        )
    ]);

    let encryptedFileBuff;
    let iv = window.crypto.getRandomValues(new Uint8Array(12));
    try {
        encryptedFileBuff = await window.crypto.subtle.encrypt(
            { name: "AES-GCM", iv: iv },
            aesKey,
            fileArrayBuffer
        );
    } catch (e) {
        throw new Error(`Could not encrypt '${file.name}'. Fail to encrypt file with AES-GCM auto-generated key and IV`, { cause: e });
    }

    let exportedAesKey = await window.crypto.subtle.exportKey("raw", aesKey);
    let aesKeyAndIv = concatArrayBuffers(new Uint8Array(exportedAesKey), iv);

    let encryptedAesKeyAndIv;
    try {
        encryptedAesKeyAndIv = await window.crypto.subtle.encrypt(
            { name: "RSA-OAEP" },
            publicKey,
            aesKeyAndIv
        );
    } catch (e) {
        throw new Error(`Could not encrypt '${file.name}'. Fail to encrypt AES-GCM and IV with RSA-OAEP key`, { cause: e });
    }

    return new File([encryptedAesKeyAndIv, encryptedFileBuff], file.name+"crypt", { type: file.type+"+crypt", lastModified: file.lastModified})
}


/**
 * Decrypt a file. Take an encrypted file as described below.
 * 
 * ```
 *          ┌─── Encrypted with RSA-OAEP publicKey
 * +--------------------+----+
 * | (AesKey+Iv)[crypt] |    |       
 * +--------------------+    +
 * |                         | <── Encrypted with
 * |     (File)[crypt]       |     AES-GCM and IV
 * |                         | 
 * +-------------------------+
 * ```
 * 
 * Step 1 : Decrypt the first bytes of the file using the RSA-OAEP private key to get the AesKey and the IV 
 * 
 * Step 2: Decrypt the file with AES-GCM key and IV
 * 
 * Step 5: Build a new file containing the decrypted file
 * 
 * @param {File} encryptedFile the file to encrypt 
 * @param {CryptoKey} publicKey the RSA-OAEP public key
 * @param {Number} keySize the size of the key in bytes
 * @returns {Promise<File>} a new file containing the
 * concatenation of the encrypted (AesKey+IV) and the
 * AES-GCM encrypted original file
 * @see {@link encryptRsaOaepAesGcm} for corresponding encryption
 */
export async function decryptRsaOaepAesGcm(encryptedFile, privateKey, keySize) {
    let encryptedBuff = await encryptedFile.arrayBuffer();

    let encryptedAesKeyAndIv = encryptedBuff.slice(0 ,keySize);
    let encryptedFileBuff = encryptedBuff.slice(keySize);

    let aesKeyAndIv;
    try {
        aesKeyAndIv = await window.crypto.subtle.decrypt(
            { name: "RSA-OAEP" },
            privateKey,
            encryptedAesKeyAndIv
        )
    } catch (e) {
        throw new Error(`Could not decrypt '${encryptedFile.name}. Fail to decrypt AES-GCM key and IV with RSA-OAEP key'`, { cause: e });
    }

    let exportedAesKey = aesKeyAndIv.slice(0,AES_GCM_KEY_SIZE);
    let iv = aesKeyAndIv.slice(AES_GCM_KEY_SIZE);

    let aesKey = await importAesGcmSecretKey(exportedAesKey);

    let fileArrayBuffer;
    try {
        fileArrayBuffer = await window.crypto.subtle.decrypt(
            { name: "AES-GCM", iv: iv },
            aesKey,
            encryptedFileBuff
        );
    } catch (e) {
        throw new Error(`Could not decrypt '${encryptedFile.name}'. Fail to decrypt file with decrypted AES-GCM key and IV`, { cause: e });
    }

    return new File([fileArrayBuffer], encryptedFile.name.replace(/\+crypt$/, ""), { type: encryptedFile.type.replace(/\+crypt$/, '')})
}

export async function generateRsaOaepKeyPair(modulusLength, hash) {
    let keyPair;
    try {
        keyPair = window.crypto.subtle.generateKey(
            {
              name: "RSA-OAEP",
              modulusLength: modulusLength,
              publicExponent: new Uint8Array([1, 0, 1]),
              hash: hash
            },
            true,
            ["encrypt", "decrypt"]
        );  
    } catch (e) {
        throw new Error("Could not generate RSA-OAEP key pair", { cause : e });
    }
    return keyPair;
}


/**
 * Import a PEM encoded RSA public key (SubjectPublicKeyInfo format), to use for RSA-OEAP encryption.
 * @param {String} pem of the public RSA key 
 * @param {string} hash a string representing the name of the digest function to use. This can be one of SHA-256, SHA-384, or SHA-512.
 * @returns {Promise<CryptoKey>} a Promise that will resolve to a CryptoKey representing the public key.
 */
export async function importPublicRsaKey(pem, hash) {
    let pemContents;
    try {
        pemContents = pem.match(/^.*-[\n\s]*(([a-zA-Z0-9+/]+[\n\s]*)+)=*[\n\s]*-.*[\s\n]*$/)[1];
    } catch (e) {
        throw new Error("Could not get PEM content", { cause: e })
    }

    // base64 decode the string to get the binary data
    const binaryDerString = window.atob(pemContents);
    // convert from a binary string to an ArrayBuffer
    const binaryDer = str2ab(binaryDerString);

    let publicRsaKey;
    try {
        publicRsaKey = await window.crypto.subtle.importKey(
          "spki",
          binaryDer,
          {
            name: "RSA-OAEP",
            hash: hash
          },
          true,
          ["encrypt"]
        );
    } catch (e) {
        throw new Error("Could not import RSA-OAEP key", { cause: e });
    }

    return publicRsaKey;
}

/**
 * Import a PEM encoded RSA private key (PKCS#8 Format), to use for RSA-OEAP decrypting.
 * @param {String} pem a string containing the PEM encoded key
 * @param {string} hash a string representing the name of the digest function to use. This can be one of SHA-256, SHA-384, or SHA-512.
 * @returns {Promise<CryptoKey>} a Promise that will resolve to a CryptoKey representing the private key.
*/
export async function importPrivateRsaKey(pem, hash) {
    let pemContents;
    try {
        pemContents = pem.match(/^.*-[\n\s]*(([a-zA-Z0-9+/]+[\n\s]*)+)=*[\n\s]*-.*[\s\n]*$/)[1];
    } catch (e) {
        throw new Error("Could not get PEM content", { cause: e })
    }

    // base64 decode the string to get the binary data
    const binaryDerString = window.atob(pemContents);
    // convert from a binary string to an ArrayBuffer
    const binaryDer = str2ab(binaryDerString);
  
    let privateRsaKey;
    try {
        privateRsaKey = await window.crypto.subtle.importKey(
          "pkcs8",
          binaryDer,
          {
            name: "RSA-OAEP",
            hash: hash,
          },
          true,
          ["decrypt"]
        );
    } catch (e) {
        throw new Error("Could not import RSA-OAEP private key", { cause: e });
    }

    return privateRsaKey;
}

/**
 * Import an AES-GCM secret key from an ArrayBuffer containing the raw bytes.
 * @param {ArrayBuffer} rawKey the bytes of the key
 * @return {Promise<CryptoKey>}, a Promise that will resolve to a CryptoKey representing the secret key.
*/
export async function importAesGcmSecretKey(rawKey) {
    let aesSecretKey;
    try {
        aesSecretKey = await window.crypto.subtle.importKey(
          "raw",
          rawKey,
          "AES-GCM",
          true,
          ["encrypt", "decrypt"]
        );
    } catch (e) {
        throw new Error("Could not import AES-GCM secret key", { cause: e });
    }
    return aesSecretKey;
}
 
/**
 * PEM-encode a private key exported as a PKCS#8 object 
 * @param {CryptoKey} privateKey to PEM-encode
 * @returns {String} the PEM-encoded string of the private key
 */
export async function privateCryptoKeyToPem(privateKey) {
    const exported = await window.crypto.subtle.exportKey(
        "pkcs8",
        privateKey
    );
    const exportedAsString = ab2str(exported);
    const exportedAsBase64 = window.btoa(exportedAsString);
    const pemExported = `-----BEGIN PRIVATE KEY-----\n${exportedAsBase64}\n-----END PRIVATE KEY-----`;
  
    return pemExported;
}

/**
 * PEM-encode a public key exported as a SubjectPublicKeyInfo object 
 * @param {CryptoKey} privateKey to PEM-encode 
 * @returns {String} the PEM-encoded string of the public key
 */
export async function publicCryptoKeyToPem(key) {
    const exported = await window.crypto.subtle.exportKey(
      "spki",
      key
    );
    const exportedAsString = ab2str(exported);
    const exportedAsBase64 = window.btoa(exportedAsString);
    const pemExported = `-----BEGIN PUBLIC KEY-----\n${exportedAsBase64}\n-----END PUBLIC KEY-----`;
  
    return pemExported;
}

 /**
  * Concatenate all ArrayBuffers given as arguments
  * From https://gist.github.com/72lions/4528834?permalink_comment_id=3729304#gistcomment-3729304
  * @param  {...ArrayBuffer} bufs the ArrayBuffers to concatenate
  * @returns {ArrayBufferLike} the concatenation of the arguments
  */
function concatArrayBuffers(...bufs){
	const result = new Uint8Array(bufs.reduce((totalSize, buf)=>totalSize+buf.byteLength,0));
	bufs.reduce((offset, buf)=>{
		result.set(buf,offset)
		return offset+buf.byteLength
	},0)
	return result.buffer
}
