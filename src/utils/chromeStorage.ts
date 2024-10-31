import { SecureStoragePlugin } from '@evva/capacitor-secure-storage-plugin';

let inMemoryKey: CryptoKey | null = null;
let inMemoryIV: Uint8Array | null = null;

const keysToEncrypt = ['keyPair'];

async function initializeKeyAndIV() {
  if (!inMemoryKey) {
    inMemoryKey = await generateKey();  // Generates the key in memory
  }
}

async function generateKey(): Promise<CryptoKey> {
  return await crypto.subtle.generateKey(
    {
      name: "AES-GCM",
      length: 256
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
      iv: iv
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
      iv: iv
    },
    key,
    encryptedData
  );

  const decoder = new TextDecoder();
  return decoder.decode(decryptedData);
}

// Encrypt data, then concatenate the IV and encrypted data for storage
export const storeData = async (key: string, payload: any): Promise<string> => {
  await initializeKeyAndIV();

  if (keysToEncrypt.includes(key) && inMemoryKey) {
    // Encrypt the payload if the key is in keysToEncrypt
    const { iv, encryptedData } = await encryptData(JSON.stringify(payload), inMemoryKey);

    // Combine IV and encrypted data into a single string
    const combinedData = new Uint8Array([...iv, ...new Uint8Array(encryptedData)]);
    await SecureStoragePlugin.set({ key, value: btoa(String.fromCharCode(...combinedData)) });
  } else {
    // Store data in plain text if not in keysToEncrypt
    await SecureStoragePlugin.set({ key, value: JSON.stringify(payload) });
  }

  return "Data saved successfully";
};

// Retrieve data, split the IV and encrypted data, then decrypt
export const getData = async <T = any>(key: string): Promise<T> => {
  await initializeKeyAndIV();

  const storedDataBase64 = await SecureStoragePlugin.get({ key });
  if (storedDataBase64.value) {
    if (keysToEncrypt.includes(key) && inMemoryKey) {
      // If the key is in keysToEncrypt, decrypt the data
      const combinedData = atob(storedDataBase64.value).split("").map((c) => c.charCodeAt(0));
      const iv = new Uint8Array(combinedData.slice(0, 12)); // First 12 bytes are the IV
      const encryptedData = new Uint8Array(combinedData.slice(12)).buffer; // The rest is encrypted data

      const decryptedData = await decryptData(encryptedData, inMemoryKey, iv);
      return JSON.parse(decryptedData) as T;
    } else {
      // If the key is not in keysToEncrypt, parse data as plain text
      return JSON.parse(storedDataBase64.value) as T;
    }
  } else {
    throw new Error(`No data found for key: ${key}`);
  }
};

// Remove keys from storage and log out
export async function removeKeysAndLogout(keys: string[], event: MessageEvent, request: any) {
  try {
    for (const key of keys) {
      try {
        await SecureStoragePlugin.remove({ key });
        await SecureStoragePlugin.remove({ key: `${key}_iv` });  // Remove associated IV
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
