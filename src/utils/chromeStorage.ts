import { SecureStoragePlugin } from '@evva/capacitor-secure-storage-plugin';
import { Preferences } from '@capacitor/preferences';

let inMemoryKey: CryptoKey | null = null;

const keysToEncrypt = ['keyPair'];
const keysToUseEvva = ['wallets'];

async function initializeKeyAndIV() {
  if (!inMemoryKey) {
    inMemoryKey = await generateKey(); // Generates the key in memory
  }
}

async function generateKey(): Promise<CryptoKey> {
  return await crypto.subtle.generateKey(
    {
      name: "AES-GCM",
      length: 256,
    },
    true,
    ["encrypt", "decrypt"]
  );
}

async function encryptData(data: string, key: CryptoKey): Promise<{ iv: Uint8Array; encryptedData: ArrayBuffer }> {
  const encoder = new TextEncoder();
  const encodedData = encoder.encode(data);

  // Generate a random IV each time you encrypt
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const encryptedData = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    key,
    encodedData
  );

  return { iv, encryptedData };
}

async function decryptData(encryptedData: ArrayBuffer, key: CryptoKey, iv: Uint8Array): Promise<string> {
  const decryptedData = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    key,
    encryptedData
  );

  const decoder = new TextDecoder();
  return decoder.decode(decryptedData);
}

// Encode a JSON payload as Base64
function jsonToBase64(payload: any): string {
  const utf8Array = new TextEncoder().encode(JSON.stringify(payload));
  let binary = '';
  utf8Array.forEach((byte) => (binary += String.fromCharCode(byte)));
  return btoa(binary);
}

// Decode a Base64 string back to JSON
function base64ToJson(base64: string): any {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return JSON.parse(new TextDecoder().decode(bytes));
}

export const storeData = async (key: string, payload: any): Promise<string> => {
  await initializeKeyAndIV();

  const base64Data = jsonToBase64(payload);

  if (keysToEncrypt.includes(key) && inMemoryKey) {
    // Encrypt the Base64-encoded payload
    const { iv, encryptedData } = await encryptData(base64Data, inMemoryKey);

    // Combine IV and encrypted data into a single Uint8Array
    const combinedData = new Uint8Array([...iv, ...new Uint8Array(encryptedData)]);
    const encryptedBase64Data = btoa(String.fromCharCode(...combinedData));
    await SecureStoragePlugin.set({ key, value: encryptedBase64Data });
  } else if (keysToUseEvva?.includes(key)){
    await SecureStoragePlugin.set({ key, value: base64Data });
  } else {
    // Store Base64-encoded data in Capacitor Preferences for non-encrypted keys
    await Preferences.set({ key, value: base64Data });
  }

  return "Data saved successfully";
};

export const getData = async <T = any>(key: string): Promise<T | null> => {
  await initializeKeyAndIV();

  try {
    if (keysToEncrypt.includes(key) && inMemoryKey) {
      // Fetch encrypted data for sensitive keys
      const storedDataBase64 = await SecureStoragePlugin.get({ key });

      if (storedDataBase64.value) {
        const combinedData = atob(storedDataBase64.value)
          .split("")
          .map((c) => c.charCodeAt(0));

        const iv = new Uint8Array(combinedData.slice(0, 12)); // First 12 bytes are the IV
        const encryptedData = new Uint8Array(combinedData.slice(12)).buffer;

        const decryptedBase64Data = await decryptData(encryptedData, inMemoryKey, iv);
        return base64ToJson(decryptedBase64Data);
      }
    } else if (keysToUseEvva?.includes(key)){
      const storedDataBase64 = await SecureStoragePlugin.get({ key });
      if(storedDataBase64?.value){
        return base64ToJson(storedDataBase64.value);

      } else return null
    } else {
      // Fetch plain data for non-encrypted keys
      const { value } = await Preferences.get({ key });
      if (value) {
        return base64ToJson(value);
      }
    }

    return null;
  } catch (error) {
    console.error("Error fetching data:", error);
    return null;
  }
};

export async function removeKeysAndLogout(keys: string[], event: MessageEvent, request: any) {
  try {
    for (const key of keys) {
      try {
        if (keysToEncrypt.includes(key)) {
          // Remove from Secure Storage for sensitive keys
          await SecureStoragePlugin.remove({ key });
        } else {
          // Remove from Capacitor Preferences for non-sensitive keys
          await Preferences.remove({ key });
        }
      } catch (error) {
        console.warn(`Key not found: ${key}`);
      }
    }

    event.source.postMessage(
      {
        requestId: request.requestId,
        action: "logout",
        payload: true,
        type: "backgroundMessageResponse",
      },
      event.origin
    );
  } catch (error) {
    console.error("Error removing keys:", error);
  }
}
