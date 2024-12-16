// @ts-nocheck

import Base58 from "../../deps/Base58"
import ed2curve from "../../deps/ed2curve"
import nacl from "../../deps/nacl-fast"


export function base64ToUint8Array(base64: string) {
	const binaryString = atob(base64)
	const len = binaryString.length
	const bytes = new Uint8Array(len)
	for (let i = 0; i < len; i++) {
		bytes[i] = binaryString.charCodeAt(i)
	}
	return bytes
}

export function uint8ArrayToBase64(uint8Array: any) {
	const length = uint8Array.length
	let binaryString = ''
	const chunkSize = 1024 * 1024; // Process 1MB at a time
	for (let i = 0; i < length; i += chunkSize) {
		const chunkEnd = Math.min(i + chunkSize, length)
		const chunk = uint8Array.subarray(i, chunkEnd)
		binaryString += Array.from(chunk, byte => String.fromCharCode(byte)).join('')
	}
	return btoa(binaryString)
}

export function objectToBase64(obj: Object) {
	// Step 1: Convert the object to a JSON string
	const jsonString = JSON.stringify(obj)
	// Step 2: Create a Blob from the JSON string
	const blob = new Blob([jsonString], { type: 'application/json' })
	// Step 3: Create a FileReader to read the Blob as a base64-encoded string
	return new Promise((resolve, reject) => {
		const reader = new FileReader()
		reader.onloadend = () => {
			if (typeof reader.result === 'string') {
				// Remove 'data:application/json;base64,' prefix
				const base64 = reader.result.replace(
					'data:application/json;base64,',
					''
				)
				resolve(base64)
			} else {
				reject(new Error('Failed to read the Blob as a base64-encoded string'))
			}
		}
		reader.onerror = () => {
			reject(reader.error)
		}
		reader.readAsDataURL(blob)
	})
}

// Function to create a symmetric key and nonce
export const createSymmetricKeyAndNonce = () => {
    const messageKey = new Uint8Array(32); // 32 bytes for the symmetric key
    crypto.getRandomValues(messageKey);

 

    return { messageKey: uint8ArrayToBase64(messageKey)};
};


export const encryptDataGroup = ({ data64, publicKeys, privateKey, userPublicKey, customSymmetricKey }: any) => {

	let combinedPublicKeys = [...publicKeys, userPublicKey]
	const decodedPrivateKey = Base58.decode(privateKey)
	const publicKeysDuplicateFree = [...new Set(combinedPublicKeys)]

	const Uint8ArrayData = base64ToUint8Array(data64)
	if (!(Uint8ArrayData instanceof Uint8Array)) {
		throw new Error("The Uint8ArrayData you've submitted is invalid")
	}
	try {
		let messageKey
		if(customSymmetricKey){
			messageKey = base64ToUint8Array(customSymmetricKey)
		} else {
		 messageKey = new Uint8Array(32)
		crypto.getRandomValues(messageKey)
		}

		if(!messageKey) throw new Error('Cannot create symmetric key')
		const nonce = new Uint8Array(24)
		crypto.getRandomValues(nonce)
		// Encrypt the data with the symmetric key.
		const encryptedData = nacl.secretbox(Uint8ArrayData, nonce, messageKey)
		// Generate a keyNonce outside of the loop.
		const keyNonce = new Uint8Array(24)
		crypto.getRandomValues(keyNonce)
		// Encrypt the symmetric key for each recipient.
		let encryptedKeys = []
		publicKeysDuplicateFree.forEach((recipientPublicKey) => {
			const publicKeyUnit8Array = Base58.decode(recipientPublicKey)
			const convertedPrivateKey = ed2curve.convertSecretKey(decodedPrivateKey)
			const convertedPublicKey = ed2curve.convertPublicKey(publicKeyUnit8Array)
			const sharedSecret = new Uint8Array(32)

			// the length of the sharedSecret will be 32 + 16
			// When you're encrypting data using nacl.secretbox, it's adding an authentication tag to the result, which is 16 bytes long. This tag is used for verifying the integrity and authenticity of the data when it is decrypted
			nacl.lowlevel.crypto_scalarmult(sharedSecret, convertedPrivateKey, convertedPublicKey)

			// Encrypt the symmetric key with the shared secret.
			const encryptedKey = nacl.secretbox(messageKey, keyNonce, sharedSecret)

			encryptedKeys.push(encryptedKey)
		})
		const str = "qortalGroupEncryptedData"
		const strEncoder = new TextEncoder()
		const strUint8Array = strEncoder.encode(str)
		// Convert sender's public key to Uint8Array and add to the message
		const senderPublicKeyUint8Array = Base58.decode(userPublicKey)
		// Combine all data into a single Uint8Array.
		// Calculate size of combinedData
		let combinedDataSize = strUint8Array.length + nonce.length + keyNonce.length + senderPublicKeyUint8Array.length + encryptedData.length + 4
		let encryptedKeysSize = 0
		encryptedKeys.forEach((key) => {
			encryptedKeysSize += key.length
		})
		combinedDataSize += encryptedKeysSize
		let combinedData = new Uint8Array(combinedDataSize)
		combinedData.set(strUint8Array)
		combinedData.set(nonce, strUint8Array.length)
		combinedData.set(keyNonce, strUint8Array.length + nonce.length)
		combinedData.set(senderPublicKeyUint8Array, strUint8Array.length + nonce.length + keyNonce.length)
		combinedData.set(encryptedData, strUint8Array.length + nonce.length + keyNonce.length + senderPublicKeyUint8Array.length)
		// Initialize offset for encryptedKeys
		let encryptedKeysOffset = strUint8Array.length + nonce.length + keyNonce.length + senderPublicKeyUint8Array.length + encryptedData.length
		encryptedKeys.forEach((key) => {
			combinedData.set(key, encryptedKeysOffset)
			encryptedKeysOffset += key.length
		})
		const countArray = new Uint8Array(new Uint32Array([publicKeysDuplicateFree.length]).buffer)
		combinedData.set(countArray, combinedData.length - 4)
		return uint8ArrayToBase64(combinedData)
	} catch (error) {

		throw new Error("Error in encrypting data")
	}
}

export const encryptSingle = async ({ data64, secretKeyObject, typeNumber = 2 }: any) => {
	// Find the highest key in the secretKeyObject
	const highestKey = Math.max(...Object.keys(secretKeyObject).filter(item => !isNaN(+item)).map(Number));
	const highestKeyObject = secretKeyObject[highestKey];
  
	// Convert data and keys from base64
	const Uint8ArrayData = base64ToUint8Array(data64);
	const messageKey = base64ToUint8Array(highestKeyObject.messageKey);
  
	if (!(Uint8ArrayData instanceof Uint8Array)) {
	  throw new Error("The Uint8ArrayData you've submitted is invalid");
	}
  
	let nonce, encryptedData, encryptedDataBase64, finalEncryptedData;
  
	// Convert type number to a fixed length of 3 digits
	const typeNumberStr = typeNumber.toString().padStart(3, '0');
  
	if (highestKeyObject.nonce) {
	  // Old format: Use the nonce from secretKeyObject
	  nonce = base64ToUint8Array(highestKeyObject.nonce);
  
	  // Encrypt the data with the existing nonce and message key
	  encryptedData = nacl.secretbox(Uint8ArrayData, nonce, messageKey);
	  encryptedDataBase64 = uint8ArrayToBase64(encryptedData);
  
	  // Concatenate the highest key, type number, and encrypted data (old format)
	  const highestKeyStr = highestKey.toString().padStart(10, '0');  // Fixed length of 10 digits
	  finalEncryptedData = btoa(highestKeyStr + encryptedDataBase64);
	} else {
	  // New format: Generate a random nonce and embed it in the message
	  nonce = new Uint8Array(24); // 24 bytes for the nonce
	  crypto.getRandomValues(nonce);
  
	  // Encrypt the data with the new nonce and message key
	  encryptedData = nacl.secretbox(Uint8ArrayData, nonce, messageKey);
	  encryptedDataBase64 = uint8ArrayToBase64(encryptedData);
  
	  // Convert the nonce to base64
	  const nonceBase64 = uint8ArrayToBase64(nonce);
  
	  // Concatenate the highest key, type number, nonce, and encrypted data (new format)
	  const highestKeyStr = highestKey.toString().padStart(10, '0');  // Fixed length of 10 digits

	  const highestKeyBytes = new TextEncoder().encode(highestKeyStr.padStart(10, '0'));
const typeNumberBytes = new TextEncoder().encode(typeNumberStr.padStart(3, '0'));

// Step 3: Concatenate all binary
const combinedBinary = new Uint8Array(
  highestKeyBytes.length + typeNumberBytes.length + nonce.length + encryptedData.length
);
	//   finalEncryptedData = btoa(highestKeyStr) + btoa(typeNumberStr) + nonceBase64 + encryptedDataBase64;
	  combinedBinary.set(highestKeyBytes, 0);
combinedBinary.set(typeNumberBytes, highestKeyBytes.length);
combinedBinary.set(nonce, highestKeyBytes.length + typeNumberBytes.length);
combinedBinary.set(encryptedData, highestKeyBytes.length + typeNumberBytes.length + nonce.length);

// Step 4: Base64 encode once
 finalEncryptedData = uint8ArrayToBase64(combinedBinary);
	}
  
	return finalEncryptedData;
  };



export const decodeBase64ForUIChatMessages = (messages)=> {
	
	let msgs = []
	for(const msg of messages){
		try {
			const decoded = atob(msg?.data);
			const parseDecoded =JSON.parse(decodeURIComponent(escape(decoded)))
			
				msgs.push({
					...msg,
					...parseDecoded
				})
			
		} catch (error) {
			
		}
	}
	return msgs
}
  
  

export const decryptSingle = async ({ data64, secretKeyObject, skipDecodeBase64 }: any) => {
	// First, decode the base64-encoded input (if skipDecodeBase64 is not set)
	const decodedData = skipDecodeBase64 ? data64 : atob(data64);
	
	// Then, decode it again for the specific format (if double encoding is used)
	const decodeForNumber = atob(decodedData);
  
	// Extract the key (assuming it's always the first 10 characters)
	const keyStr = decodeForNumber.slice(0, 10);
  
	// Convert the key string back to a number
	const highestKey = parseInt(keyStr, 10);
  
	// Check if we have a valid secret key for the extracted highestKey
	if (!secretKeyObject[highestKey]) {
	  throw new Error('Cannot find correct secretKey');
	}
  
	const secretKeyEntry = secretKeyObject[highestKey];
  
	let typeNumberStr, nonceBase64, encryptedDataBase64;
  
	// Determine if typeNumber exists by checking if the next 3 characters after keyStr are digits
	const possibleTypeNumberStr = decodeForNumber.slice(10, 13);
	const hasTypeNumber = /^\d{3}$/.test(possibleTypeNumberStr); // Check if next 3 characters are digits
	
	if (secretKeyEntry.nonce) {
	  // Old format: nonce is present in the secretKeyObject, so no type number exists
	  nonceBase64 = secretKeyEntry.nonce;
	  encryptedDataBase64 = decodeForNumber.slice(10); // The remaining part is the encrypted data
	} else {
	  if (hasTypeNumber) {
		// const typeNumberStr = new TextDecoder().decode(typeNumberBytes);
		if(decodeForNumber.slice(10, 13) !== '001'){
			const decodedBinary = base64ToUint8Array(decodedData);
			const highestKeyBytes = decodedBinary.slice(0, 10); // if ASCII digits only
			const highestKeyStr = new TextDecoder().decode(highestKeyBytes);

const nonce = decodedBinary.slice(13, 13 + 24);
const encryptedData = decodedBinary.slice(13 + 24);
const highestKey = parseInt(highestKeyStr, 10);

const messageKey = base64ToUint8Array(secretKeyObject[+highestKey].messageKey);
const decryptedBytes = nacl.secretbox.open(encryptedData, nonce, messageKey);
  
	// Check if decryption was successful
	if (!decryptedBytes) {
	  throw new Error("Decryption failed");
	}
  
	// Convert the decrypted Uint8Array back to a Base64 string
	return uint8ArrayToBase64(decryptedBytes);
		
		}
		// New format: Extract type number and nonce
		typeNumberStr = possibleTypeNumberStr;  // Extract type number
		nonceBase64 = decodeForNumber.slice(13, 45);   // Extract nonce (next 32 characters after type number)
		encryptedDataBase64 = decodeForNumber.slice(45); // The remaining part is the encrypted data
	  } else {
		// Old format without type number (nonce is embedded in the message, first 32 characters after keyStr)
		nonceBase64 = decodeForNumber.slice(10, 42);  // First 32 characters for the nonce
		encryptedDataBase64 = decodeForNumber.slice(42); // The remaining part is the encrypted data
	  }
	}
  
	// Convert Base64 strings to Uint8Array
	const Uint8ArrayData = base64ToUint8Array(encryptedDataBase64);
	const nonce = base64ToUint8Array(nonceBase64);
	const messageKey = base64ToUint8Array(secretKeyEntry.messageKey);
  
	if (!(Uint8ArrayData instanceof Uint8Array)) {
	  throw new Error("The Uint8ArrayData you've submitted is invalid");
	}
  
	// Decrypt the data using the nonce and messageKey
	const decryptedData = nacl.secretbox.open(Uint8ArrayData, nonce, messageKey);
  
	// Check if decryption was successful
	if (!decryptedData) {
	  throw new Error("Decryption failed");
	}
  
	// Convert the decrypted Uint8Array back to a Base64 string
	return uint8ArrayToBase64(decryptedData);
  };
  
  
  
  export function decryptGroupDataQortalRequest(data64EncryptedData, privateKey) {
	const allCombined = base64ToUint8Array(data64EncryptedData)
	const str = "qortalGroupEncryptedData"
	const strEncoder = new TextEncoder()
	const strUint8Array = strEncoder.encode(str)
	// Extract the nonce
	const nonceStartPosition = strUint8Array.length
	const nonceEndPosition = nonceStartPosition + 24 // Nonce is 24 bytes
	const nonce = allCombined.slice(nonceStartPosition, nonceEndPosition)
	// Extract the shared keyNonce
	const keyNonceStartPosition = nonceEndPosition
	const keyNonceEndPosition = keyNonceStartPosition + 24 // Nonce is 24 bytes
	const keyNonce = allCombined.slice(keyNonceStartPosition, keyNonceEndPosition)
	// Extract the sender's public key
	const senderPublicKeyStartPosition = keyNonceEndPosition
	const senderPublicKeyEndPosition = senderPublicKeyStartPosition + 32 // Public keys are 32 bytes
	const senderPublicKey = allCombined.slice(senderPublicKeyStartPosition, senderPublicKeyEndPosition)
	// Calculate count first
	const countStartPosition = allCombined.length - 4 // 4 bytes before the end, since count is stored in Uint32 (4 bytes)
	const countArray = allCombined.slice(countStartPosition, countStartPosition + 4)
	const count = new Uint32Array(countArray.buffer)[0]
	// Then use count to calculate encryptedData
	const encryptedDataStartPosition = senderPublicKeyEndPosition // start position of encryptedData
	const encryptedDataEndPosition = allCombined.length - ((count * (32 + 16)) + 4)
	const encryptedData = allCombined.slice(encryptedDataStartPosition, encryptedDataEndPosition)
	// Extract the encrypted keys
	// 32+16 = 48
	const combinedKeys = allCombined.slice(encryptedDataEndPosition, encryptedDataEndPosition + (count * 48))
	if (!privateKey) {
		throw new Error("Unable to retrieve keys")
	}
	const decodedPrivateKey = Base58.decode(privateKey)
	const convertedPrivateKey = ed2curve.convertSecretKey(decodedPrivateKey)
	const convertedSenderPublicKey = ed2curve.convertPublicKey(senderPublicKey)
	const sharedSecret = new Uint8Array(32)
	nacl.lowlevel.crypto_scalarmult(sharedSecret, convertedPrivateKey, convertedSenderPublicKey)
	for (let i = 0; i < count; i++) {
		const encryptedKey = combinedKeys.slice(i * 48, (i + 1) * 48)
		// Decrypt the symmetric key.
		const decryptedKey = nacl.secretbox.open(encryptedKey, keyNonce, sharedSecret)
		// If decryption was successful, decryptedKey will not be null.
		if (decryptedKey) {
			// Decrypt the data using the symmetric key.
			const decryptedData = nacl.secretbox.open(encryptedData, nonce, decryptedKey)
			// If decryption was successful, decryptedData will not be null.
			if (decryptedData) {
				return decryptedData
			}
		}
	}
	throw new Error("Unable to decrypt data")
}


export function decryptGroupData(data64EncryptedData: string, privateKey: string) {
	const allCombined = base64ToUint8Array(data64EncryptedData)
	const str = "qortalGroupEncryptedData"
	const strEncoder = new TextEncoder()
	const strUint8Array = strEncoder.encode(str)
	// Extract the nonce
	const nonceStartPosition = strUint8Array.length
	const nonceEndPosition = nonceStartPosition + 24 // Nonce is 24 bytes
	const nonce = allCombined.slice(nonceStartPosition, nonceEndPosition)
	// Extract the shared keyNonce
	const keyNonceStartPosition = nonceEndPosition
	const keyNonceEndPosition = keyNonceStartPosition + 24 // Nonce is 24 bytes
	const keyNonce = allCombined.slice(keyNonceStartPosition, keyNonceEndPosition)
	// Extract the sender's public key
	const senderPublicKeyStartPosition = keyNonceEndPosition
	const senderPublicKeyEndPosition = senderPublicKeyStartPosition + 32 // Public keys are 32 bytes
	const senderPublicKey = allCombined.slice(senderPublicKeyStartPosition, senderPublicKeyEndPosition)
	// Calculate count first
	const countStartPosition = allCombined.length - 4 // 4 bytes before the end, since count is stored in Uint32 (4 bytes)
	const countArray = allCombined.slice(countStartPosition, countStartPosition + 4)
	const count = new Uint32Array(countArray.buffer)[0]
	// Then use count to calculate encryptedData
	const encryptedDataStartPosition = senderPublicKeyEndPosition // start position of encryptedData
	const encryptedDataEndPosition = allCombined.length - ((count * (32 + 16)) + 4)
	const encryptedData = allCombined.slice(encryptedDataStartPosition, encryptedDataEndPosition)
	// Extract the encrypted keys
	// 32+16 = 48
	const combinedKeys = allCombined.slice(encryptedDataEndPosition, encryptedDataEndPosition + (count * 48))
	if (!privateKey) {
		throw new Error("Unable to retrieve keys")
	}
	const decodedPrivateKey = Base58.decode(privateKey)
	const convertedPrivateKey = ed2curve.convertSecretKey(decodedPrivateKey)
	const convertedSenderPublicKey = ed2curve.convertPublicKey(senderPublicKey)
	const sharedSecret = new Uint8Array(32)
	nacl.lowlevel.crypto_scalarmult(sharedSecret, convertedPrivateKey, convertedSenderPublicKey)
	for (let i = 0; i < count; i++) {
		const encryptedKey = combinedKeys.slice(i * 48, (i + 1) * 48)
		// Decrypt the symmetric key.
		const decryptedKey = nacl.secretbox.open(encryptedKey, keyNonce, sharedSecret)
	
		// If decryption was successful, decryptedKey will not be null.
		if (decryptedKey) {
			// Decrypt the data using the symmetric key.
			const decryptedData = nacl.secretbox.open(encryptedData, nonce, decryptedKey)
			// If decryption was successful, decryptedData will not be null.
			if (decryptedData) {
				return {decryptedData, count}
			}
		}
	}
	throw new Error("Unable to decrypt data")
}

export function uint8ArrayStartsWith(uint8Array, string) {
	const stringEncoder = new TextEncoder()
	const stringUint8Array = stringEncoder.encode(string)
	if (uint8Array.length < stringUint8Array.length) {
		return false
	}
	for (let i = 0; i < stringUint8Array.length; i++) {
		if (uint8Array[i] !== stringUint8Array[i]) {
			return false
		}
	}
	return true
}

export function decryptDeprecatedSingle(uint8Array, publicKey, privateKey) {
	const combinedData = uint8Array
	const str = "qortalEncryptedData"
	const strEncoder = new TextEncoder()
	const strUint8Array = strEncoder.encode(str)
	const strData = combinedData.slice(0, strUint8Array.length)
	const nonce = combinedData.slice(strUint8Array.length, strUint8Array.length + 24)
	const _encryptedData = combinedData.slice(strUint8Array.length + 24)
	
	const _publicKey = window.parent.Base58.decode(publicKey)
	if (!privateKey || !_publicKey) {
		throw new Error("Unable to retrieve keys")
	}
	const convertedPrivateKey = ed2curve.convertSecretKey(privateKey)
	const convertedPublicKey = ed2curve.convertPublicKey(_publicKey)
	const sharedSecret = new Uint8Array(32)
	nacl.lowlevel.crypto_scalarmult(sharedSecret, convertedPrivateKey, convertedPublicKey)
	const _chatEncryptionSeed = new window.parent.Sha256().process(sharedSecret).finish().result
	const _decryptedData = nacl.secretbox.open(_encryptedData, nonce, _chatEncryptionSeed)
	if (!_decryptedData) {
		throw new Error("Unable to decrypt")
	}
	return uint8ArrayToBase64(_decryptedData)
}

export const decryptGroupEncryptionWithSharingKey = async ({ data64EncryptedData, key }: any) => {

	const allCombined = base64ToUint8Array(data64EncryptedData)
	const str = "qortalGroupEncryptedData"
	const strEncoder = new TextEncoder()
	const strUint8Array = strEncoder.encode(str)
	// Extract the nonce
	const nonceStartPosition = strUint8Array.length
	const nonceEndPosition = nonceStartPosition + 24 // Nonce is 24 bytes
	const nonce = allCombined.slice(nonceStartPosition, nonceEndPosition)
	// Extract the shared keyNonce
	const keyNonceStartPosition = nonceEndPosition
	const keyNonceEndPosition = keyNonceStartPosition + 24 // Nonce is 24 bytes
	const keyNonce = allCombined.slice(keyNonceStartPosition, keyNonceEndPosition)
	// Extract the sender's public key
	const senderPublicKeyStartPosition = keyNonceEndPosition
	const senderPublicKeyEndPosition = senderPublicKeyStartPosition + 32 // Public keys are 32 bytes

	// Calculate count first
	const countStartPosition = allCombined.length - 4 // 4 bytes before the end, since count is stored in Uint32 (4 bytes)
	const countArray = allCombined.slice(countStartPosition, countStartPosition + 4)
	const count = new Uint32Array(countArray.buffer)[0]
	// Then use count to calculate encryptedData
	const encryptedDataStartPosition = senderPublicKeyEndPosition // start position of encryptedData
	const encryptedDataEndPosition = allCombined.length - ((count * (32 + 16)) + 4)
	const encryptedData = allCombined.slice(encryptedDataStartPosition, encryptedDataEndPosition)
	const symmetricKey = base64ToUint8Array(key);
	
	// Decrypt the data using the nonce and messageKey
	const decryptedData = nacl.secretbox.open(encryptedData, nonce, symmetricKey)

  
	// Check if decryption was successful
	if (!decryptedData) {
	  throw new Error("Decryption failed");
	}
	// Convert the decrypted Uint8Array back to a Base64 string
	return uint8ArrayToBase64(decryptedData);
  };