// @ts-nocheck

import "./qortalRequests";
import { isArray } from "lodash";
import {
  decryptGroupEncryption,
  encryptAndPublishSymmetricKeyGroupChat,
  publishGroupEncryptedResource,
  publishOnQDN,
  uint8ArrayToObject,
} from "./backgroundFunctions/encryption";
import { PUBLIC_NOTIFICATION_CODE_FIRST_SECRET_KEY } from "./constants/codes";
import ShortUniqueId from "short-unique-id";
import { App as CapacitorApp } from '@capacitor/app';
import Base58 from "./deps/Base58";
import {
  base64ToUint8Array,
  decryptSingle,
  encryptSingle,
  objectToBase64,
} from "./qdn/encryption/group-encryption";
import { FilePicker } from '@capawesome/capacitor-file-picker';
import { reusableGet } from "./qdn/publish/pubish";
import { signChat } from "./transactions/signChat";
import { createTransaction } from "./transactions/transactions";
import { decryptChatMessage } from "./utils/decryptChatMessage";
import { decryptStoredWallet } from "./utils/decryptWallet";
import PhraseWallet from "./utils/generateWallet/phrase-wallet";
import { RequestQueueWithPromise } from "./utils/queue/queue";
import { validateAddress } from "./utils/validateAddress";
import { Sha256 } from "asmcrypto.js";
import NativePOW from './utils/nativepow'

import { TradeBotRespondMultipleRequest } from "./transactions/TradeBotRespondMultipleRequest";
import { RESOURCE_TYPE_NUMBER_GROUP_CHAT_REACTIONS } from "./constants/resourceTypes";
import {
  addDataPublishesCase,
  addEnteredQmailTimestampCase,
  addGroupNotificationTimestampCase,
  addTimestampEnterChatCase,
  addUserSettingsCase,
  balanceCase,
  banFromGroupCase,
  cancelBanCase,
  cancelInvitationToGroupCase,
  checkLocalCase,
  clearAllNotificationsCase,
  createGroupCase,
  decryptDirectCase,
  decryptGroupEncryptionCase,
  decryptSingleCase,
  decryptSingleForPublishesCase,
  decryptWalletCase,
  encryptAndPublishSymmetricKeyGroupChatCase,
  encryptSingleCase,
  getApiKeyCase,
  getCustomNodesFromStorageCase,
  getDataPublishesCase,
  getEnteredQmailTimestampCase,
  getGroupDataSingleCase,
  getGroupNotificationTimestampCase,
  getTempPublishCase,
  getThreadActivityCase,
  getTimestampEnterChatCase,
  getUserSettingsCase,
  getWalletInfoCase,
  handleActiveGroupDataFromSocketCase,
  inviteToGroupCase,
  joinGroupCase,
  kickFromGroupCase,
  addTimestampMentionCase,
  getTimestampMentionCase,

  leaveGroupCase,
  ltcBalanceCase,
  makeAdminCase,
  nameCase,
  notificationCase,
  notifyAdminRegenerateSecretKeyCase,
  pauseAllQueuesCase,
  publishGroupEncryptedResourceCase,
  publishOnQDNCase,
  registerNameCase,
  removeAdminCase,
  resumeAllQueuesCase,
  saveTempPublishCase,
  sendChatDirectCase,
  sendChatGroupCase,
  sendCoinCase,
  setApiKeyCase,
  setChatHeadsCase,
  setCustomNodesCase,
  setGroupDataCase,
  setupGroupWebsocketCase,
  updateThreadActivityCase,
  userInfoCase,
  validApiCase,
  versionCase,
  createPollCase,
  voteOnPollCase,
  encryptAndPublishSymmetricKeyGroupChatForAdminsCase,
} from "./background-cases";
import { getData, removeKeysAndLogout, storeData } from "./utils/chromeStorage";
import {BackgroundFetch} from '@transistorsoft/capacitor-background-fetch';
import { LocalNotifications } from '@capacitor/local-notifications';
import { executeEvent } from "./utils/events";
import TradeBotRespondRequest from "./transactions/TradeBotRespondRequest";

const uid = new ShortUniqueId({ length: 9, dictionary: 'number'  });

const generateId = ()=> {
  return parseInt(uid.rnd())
}
LocalNotifications.requestPermissions().then(permission => {
  if (permission.display === 'granted') {
    console.log("Notifications enabled");
  }
}).catch((error)=> console.error(error));

FilePicker.requestPermissions().then(permission => {
  if (permission?.publicStorage === 'granted') {
    console.log("File access permission granted");
  }
}).catch((error)=> console.error(error));;


export let groupSecretkeys = {}



export function cleanUrl(url) {
  return url?.replace(/^(https?:\/\/)?(www\.)?/, "");
}
export function getProtocol(url) {
  if (url?.startsWith("https://")) {
    return "https";
  } else if (url?.startsWith("http://")) {
    return "http";
  } else {
    return "unknown"; // If neither protocol is present
  }
}

export const gateways = ['ext-node.qortal.link']


let lastGroupNotification;
export const groupApi = "https://ext-node.qortal.link";
export const groupApiSocket = "wss://ext-node.qortal.link";
export const groupApiLocal = "http://127.0.0.1:12391";
export const groupApiSocketLocal = "ws://127.0.0.1:12391";
const timeDifferenceForNotificationChatsBackground = 86400000; // one day
const requestQueueAnnouncements = new RequestQueueWithPromise(1);
let isMobile = true;

const isMobileDevice = () => {
  const userAgent = navigator.userAgent || navigator.vendor || window.opera;

  if (/android/i.test(userAgent)) {
    return true; // Android device
  }

  if (/iPad|iPhone|iPod/.test(userAgent) && !window.MSStream) {
    return true; // iOS device
  }

  return false;
};

if (isMobileDevice()) {
  isMobile = true;
  console.log("Running on a mobile device");
} else {
  console.log("Running on a desktop");
}
const allQueues = {
  requestQueueAnnouncements: requestQueueAnnouncements,
};

const controlAllQueues = (action) => {
  Object.keys(allQueues).forEach((key) => {
    const val = allQueues[key];
    try {
      if (typeof val[action] === "function") {
        val[action]();
      }
    } catch (error) {
      console.error(error);
    }
  });
};

export const clearAllQueues = () => {
  Object.keys(allQueues).forEach((key) => {
    const val = allQueues[key];
    try {
      val.clear();
    } catch (error) {
      console.error(error);
    }
  });
};

export const getForeignKey = async (foreignBlockchain)=> {
  const resKeyPair = await getKeyPair();
  const parsedData = resKeyPair;

  switch (foreignBlockchain) {
    case "LITECOIN":
      return parsedData.ltcPrivateKey
      case "DOGECOIN":
        return parsedData.dogePrivateKey
      case "BITCOIN":
        return parsedData.btcPrivateKey
      case "DIGIBYTE":
        return parsedData.dgbPrivateKey
      case "RAVENCOIN":
        return parsedData.rvnPrivateKey
      case "PIRATECHAIN":
        return parsedData.arrrSeed58
      default:
        return null
  }
}

export const pauseAllQueues = () => controlAllQueues("pause");
export const resumeAllQueues = () => controlAllQueues("resume");
const checkDifference = (createdTimestamp) => {
  return (
    Date.now() - createdTimestamp < timeDifferenceForNotificationChatsBackground
  );
};
export const getApiKeyFromStorage = async (): Promise<string | null> => {
  return getData<string>("apiKey").catch(() => null);
};


export const getCustomNodesFromStorage = async (): Promise<any | null> => {
  return getData<any>("customNodes").catch(() => null);
};


const getArbitraryEndpoint = async () => {
  const apiKey = await getApiKeyFromStorage(); // Retrieve apiKey asynchronously
  if (apiKey) {
    return `/arbitrary/resources/searchsimple`;
  } else {
    return `/arbitrary/resources/searchsimple`;
  }
};

export const getBaseApi = async (customApi?: string) => {
  if (customApi) {
    return customApi;
  }

  const apiKey = await getApiKeyFromStorage(); // Retrieve apiKey asynchronously
  if (apiKey) {
    return apiKey?.url;
  } else {
    return groupApi;
  }
};
export const isUsingLocal = async () => {
  const apiKey = await getApiKeyFromStorage(); // Retrieve apiKey asynchronously
  if (apiKey) {
    return true;
  } else {
    return false;
  }
};

export const createEndpoint = async (endpoint, customApi?: string) => {
  if (customApi) {
    return `${customApi}${endpoint}`;
  }

  const apiKey = await getApiKeyFromStorage(); // Retrieve apiKey asynchronously

  if (apiKey) {
    // Check if the endpoint already contains a query string
    const separator = endpoint.includes("?") ? "&" : "?";
    return `${apiKey?.url}${endpoint}${separator}apiKey=${apiKey?.apikey}`;
  } else {
    return `${groupApi}${endpoint}`;
  }
};

export const walletVersion = 2;
// List of your API endpoints
const apiEndpoints = [
  "https://api.qortal.org",
  "https://api2.qortal.org",
  "https://appnode.qortal.org",
  "https://apinode.qortalnodes.live",
  "https://apinode1.qortalnodes.live",
  "https://apinode2.qortalnodes.live",
  "https://apinode3.qortalnodes.live",
  "https://apinode4.qortalnodes.live",
];

const buyTradeNodeBaseUrl = "https://appnode.qortal.org";
const proxyAccountAddress = "QXPejUe5Za1KD3zCMViWCX35AreMQ9H7ku";
const proxyAccountPublicKey = "5hP6stDWybojoDw5t8z9D51nV945oMPX7qBd29rhX1G7";
const pendingResponses = new Map();
let groups = null;

let socket;
let timeoutId;
let groupSocketTimeout;
let socketTimeout: any;
let interval;
let intervalThreads;
// Function to check each API endpoint
export async function findUsableApi() {
  for (const endpoint of apiEndpoints) {
    try {
      const response = await fetch(`${endpoint}/admin/status`);
      if (!response.ok) throw new Error("Failed to fetch");

      const data = await response.json();
      if (data.isSynchronizing === false && data.syncPercent === 100) {
        console.log(`Usable API found: ${endpoint}`);
        return endpoint;
      } else {
        console.log(`API not ready: ${endpoint}`);
      }
    } catch (error) {
      console.error(`Error checking API ${endpoint}:`, error);
    }
  }

  throw new Error("No usable API found");
}

export function isExtMsg(data) {
  let isMsgFromExtensionGroup = true;
  try {
    const decode1 = atob(data);
    const decode2 = atob(decode1);
    const keyStr = decode2.slice(0, 10);

    // Convert the key string back to a number
    const highestKey = parseInt(keyStr, 10);
    if (isNaN(highestKey)) {
      isMsgFromExtensionGroup = false;
    }
  } catch (error) {
    isMsgFromExtensionGroup = false;
  }

  return isMsgFromExtensionGroup;
}

export function isUpdateMsg(data) {
  let isUpdateMessage = true;
  try {
    const decode1 = atob(data);
    const decode2 = atob(decode1);
    const keyStr = decode2.slice(10, 13);

    // Convert the key string back to a number
    const numberKey = parseInt(keyStr, 10);
    if (isNaN(numberKey)) {
      isUpdateMessage = false;
    } else if (numberKey !== RESOURCE_TYPE_NUMBER_GROUP_CHAT_REACTIONS) {
      isUpdateMessage = false;
    }
  } catch (error) {
    isUpdateMessage = false;
  }

  return isUpdateMessage;
}

async function checkWebviewFocus() {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      resolve(false); // No response within 1 second, assume not focused
    }, 1000);
    const targetOrigin = window.location.origin;

    // Send a message to check focus
    window.postMessage({ action: "CHECK_FOCUS" }, targetOrigin);

    // Listen for the response
    const handleMessage = (event) => {
      if (event.data?.action === "CHECK_FOCUS_RESPONSE") {
        clearTimeout(timeout);
        window.removeEventListener("message", handleMessage); // Clean up listener
        resolve(event.data.isFocused); // Resolve with the response
      }
    };

    window.addEventListener("message", handleMessage);
  });
}


function playNotificationSound() {
  // chrome.runtime.sendMessage({ action: "PLAY_NOTIFICATION_SOUND" });
}

// const worker = new ChatComputePowWorker()

export async function performPowTask(chatBytes, difficulty) {
  const chatBytesArray = Uint8Array.from(Object.values(chatBytes));
  const result = await NativePOW.computeProofOfWork({ chatBytes, difficulty });
  return  {nonce: result.nonce, chatBytesArray}
  
}

const handleNotificationDirect = async (directs) => {
  let isFocused;
  const wallet = await getSaveWallet();
  const address = wallet.address0;
  let isDisableNotifications =
    (await getUserSettings({ key: "disable-push-notifications" })) || false;
  const dataDirects = directs.filter((direct) => direct?.sender !== address);
  try {
    if (isDisableNotifications) return;
    if (!dataDirects || dataDirects?.length === 0) return;
    isFocused = await checkWebviewFocus();

    if (isFocused) {
      throw new Error("isFocused");
    }
    const newActiveChats = dataDirects;
    const oldActiveChats = await getChatHeadsDirect();

    if (newActiveChats?.length === 0) return;

    let newestLatestTimestamp;
    let oldestLatestTimestamp;
    // Find the latest timestamp from newActiveChats
    newActiveChats?.forEach((newChat) => {
      if (
        !newestLatestTimestamp ||
        newChat?.timestamp > newestLatestTimestamp?.timestamp
      ) {
        newestLatestTimestamp = newChat;
      }
    });

    // Find the latest timestamp from oldActiveChats
    oldActiveChats?.forEach((oldChat) => {
      if (
        !oldestLatestTimestamp ||
        oldChat?.timestamp > oldestLatestTimestamp?.timestamp
      ) {
        oldestLatestTimestamp = oldChat;
      }
    });

    if (
      (checkDifference(newestLatestTimestamp.timestamp) &&
        !oldestLatestTimestamp) ||
      (newestLatestTimestamp &&
        newestLatestTimestamp?.timestamp > oldestLatestTimestamp?.timestamp)
    ) {
      const notificationId = generateId()
      LocalNotifications.schedule({
        notifications: [
          {
            title: `New Direct message! ${
              newestLatestTimestamp?.name && `from ${newestLatestTimestamp.name}`
            }`,
            body: "You have received a new direct message",
            id: notificationId,
            schedule: { at: new Date(Date.now() + 1000) }, // 1 second from now
            extra: {
              type: 'direct',
              from: newestLatestTimestamp.address
            }
          }
        ]
      });
 
    }
  } catch (error) {
    if (!isFocused) {
      window
        .sendMessage("notification", {})
        .then((response) => {
          if (!response?.error) {
            // Handle success if needed
          }
        })
        .catch((error) => {
          console.error(
            "Failed to send notification:",
            error.message || "An error occurred"
          );
        });

        const notificationId = generateId()

      LocalNotifications.schedule({
        notifications: [
          {
            title: `New Direct message!`,
            body: "You have received a new direct message",
            id: notificationId,
            schedule: { at: new Date(Date.now() + 1000) }, // 1 second from now
            extra: {
              type: 'direct',
              from: ""
            }
          }
        ]
      });
    }
  } finally {
    setChatHeadsDirect(dataDirects);
    
  }
};
async function getThreadActivity(): Promise<any | null> {
  const wallet = await getSaveWallet();
  const address = wallet.address0;
  const key = `threadactivity-${address}`;

  return getData<any>(key).catch(() => null);
}


export function updateThreadActivity({
  threadId,
  qortalName,
  groupId,
  thread,
}: {
  threadId: string;
  qortalName: string;
  groupId: string;
  thread: any;
}) {
  getSaveWallet().then((wallet) => {
    const address = wallet.address0;
    const ONE_WEEK_IN_MS = 7 * 24 * 60 * 60 * 1000; // One week in milliseconds
    const key = `threadactivity-${address}`;
    const currentTime = Date.now();

    // Retrieve the existing thread activity data
    const storedData = localStorage.getItem(key);
    let threads;

    if (!storedData) {
      // Initialize structure if no data found
      threads = {
        createdThreads: [],
        mostVisitedThreads: [],
        recentThreads: [],
        lastResetTime: 0,
      };
    } else {
      threads = JSON.parse(storedData);
    }

    let lastResetTime = threads.lastResetTime || 0;

    // Check if a week has passed since the last reset
    if (currentTime - lastResetTime > ONE_WEEK_IN_MS) {
      // Reset visit counts and update the last reset time
      threads.mostVisitedThreads.forEach((thread) => (thread.visitCount = 0));
      threads.lastResetTime = currentTime;
    }

    // Update recent threads
    threads.recentThreads = threads.recentThreads.filter(
      (t) => t.threadId !== threadId
    );
    threads.recentThreads.unshift({
      threadId,
      qortalName,
      groupId,
      thread,
      visitCount: 1,
      lastVisited: currentTime,
    });
    threads.recentThreads = threads.recentThreads.slice(0, 2);

    // Update most visited threads
    const existingThread = threads.mostVisitedThreads.find(
      (t) => t.threadId === threadId
    );
    if (existingThread) {
      existingThread.visitCount += 1;
      existingThread.lastVisited = currentTime;
    } else {
      threads.mostVisitedThreads.push({
        threadId,
        qortalName,
        groupId,
        thread,
        visitCount: 1,
        lastVisited: currentTime,
      });
    }
    threads.mostVisitedThreads = threads.mostVisitedThreads.slice(0, 2);

    // Save the updated data to localStorage without blocking
    localStorage.setItem(key, JSON.stringify(threads));
  });
}


const handleNotification = async (groups) => {
  const wallet = await getSaveWallet();
  const address = wallet.address0;
  let isDisableNotifications =
    (await getUserSettings({ key: "disable-push-notifications" })) || false;

  let mutedGroups = (await getUserSettings({ key: "mutedGroups" })) || [];
  if (!isArray(mutedGroups)) mutedGroups = [];

  let isFocused;
  const data = groups.filter(
    (group) =>
      group?.sender !== address &&
      !mutedGroups.includes(group.groupId)
  );
  const dataWithUpdates = groups.filter(
    (group) => group?.sender !== address && !mutedGroups.includes(group.groupId)
  );
  try {
    if (isDisableNotifications) return;
    if (!data || data?.length === 0) return;
    isFocused = await checkWebviewFocus();
    if (isFocused) {
      throw new Error("isFocused");
    }
    const newActiveChats = data;
    const oldActiveChats = await getChatHeads();
    let results = [];
    let newestLatestTimestamp;
    let oldestLatestTimestamp;
    // Find the latest timestamp from newActiveChats
    newActiveChats?.forEach((newChat) => {
      if (
        !newestLatestTimestamp ||
        newChat?.timestamp > newestLatestTimestamp?.timestamp
      ) {
        newestLatestTimestamp = newChat;
      }
    });

    // Find the latest timestamp from oldActiveChats
    oldActiveChats?.forEach((oldChat) => {
      if (
        !oldestLatestTimestamp ||
        oldChat?.timestamp > oldestLatestTimestamp?.timestamp
      ) {
        oldestLatestTimestamp = oldChat;
      }
    });

    if (
      (checkDifference(newestLatestTimestamp.timestamp) &&
        !oldestLatestTimestamp) ||
      (newestLatestTimestamp &&
        newestLatestTimestamp?.timestamp > oldestLatestTimestamp?.timestamp)
    ) {
      if (
        !lastGroupNotification ||
        Date.now() - lastGroupNotification >= 120000
      ) {
        if (
          !newestLatestTimestamp?.data
        ) return;

          const notificationId = generateId()


        LocalNotifications.schedule({
          notifications: [
            {
              title: "New Group Message!",
              body: `You have received a new message from ${newestLatestTimestamp?.groupName}`,
              id: notificationId,
              schedule: { at: new Date(Date.now() + 1000) }, // 1 second from now
              extra: {
                type: 'group',
                from: newestLatestTimestamp?.groupId
              }
            }
          ]
        });
       
        lastGroupNotification = Date.now();
      }
    }
  } catch (error) {
    if (!isFocused) {
      window
        .sendMessage("notification", {})
        .then((response) => {
          if (!response?.error) {
            // Handle success if needed
          }
        })
        .catch((error) => {
          console.error(
            "Failed to send notification:",
            error.message || "An error occurred"
          );
        });

        const notificationId = generateId()
     
      LocalNotifications.schedule({
        notifications: [
          {
            title: "New Group Message!",
            body: "You have received a new message from one of your groups",
            id: notificationId,
            schedule: { at: new Date(Date.now() + 1000) }, // 1 second from now
            extra: {
              type: 'group',
              from: ""
            }
          }
        ]
      });
     
 
      lastGroupNotification = Date.now();

    }
  } finally {
    if (!data || data?.length === 0) return;
    setChatHeads(dataWithUpdates);
    
  }
};






const forceCloseWebSocket = () => {
  if (socket) {
    clearTimeout(timeoutId);
    clearTimeout(groupSocketTimeout);
    clearTimeout(socketTimeout);
    timeoutId = null;
    groupSocketTimeout = null;
    socket.close(1000, "forced");
    socket = null;
  }
};

export async function getNameInfo() {
  const wallet = await getSaveWallet();
  const address = wallet.address0;
  const validApi = await getBaseApi();
  const response = await fetch(validApi + "/names/address/" + address);
  const nameData = await response.json();
  if (nameData?.length > 0) {
    return nameData[0].name;
  } else {
    return "";
  }
}
async function getAddressInfo(address) {
  const validApi = await getBaseApi();
  const response = await fetch(validApi + "/addresses/" + address);
  const data = await response.json();

  if (!response?.ok && data?.error !== 124)
    throw new Error("Cannot fetch address info");
  if (data?.error === 124) {
    return {
      address,
    };
  }
  return data;
}

export async function getKeyPair() {
  const res = await getData<any>("keyPair").catch(() => null);
  if (res) {
    return res;
  } else {
    throw new Error("Wallet not authenticated");
  }
}

export async function getSaveWallet() {
  const res = await getData<any>("walletInfo").catch(() => null);
  if (res) {
    return res;
  } else {
    throw new Error("No wallet saved");
  }
}

export async function getWallets() {
  const res = await getData<any>("wallets").catch(() => null);
  if (res) {
    return res;
  } else {
    return null
  }
}

export async function storeWallets(wallets) {
  storeData("wallets", wallets)
        .catch((error) => {
         console.error(error)
        });
}



export async function clearAllNotifications() {
  try {
    // Get all pending notifications
    const pending = await LocalNotifications.getPending();
    const notificationIds = pending.notifications.map((notification) => ({ id: notification.id }));
    
    // Cancel all pending notifications if any are found
    if (notificationIds.length > 0) {
      await LocalNotifications.cancel({ notifications: notificationIds });
    }

    // Call this to clear any displayed notifications from the system tray
    await LocalNotifications.removeAllListeners();

  } catch (error) {
    console.error("Error clearing notifications:", error);
  }
}
export async function getUserInfo() {
  const wallet = await getSaveWallet();
  const address = wallet.address0;
  const addressInfo = await getAddressInfo(address);
  const name = await getNameInfo();
  return {
    name,
    publicKey: wallet.publicKey,
    ...addressInfo,
  };
}

async function connection(hostname: string) {
  const isConnected = await getData<any>(hostname).catch(() => null);
  return isConnected;
}


async function getTradeInfo(qortalAtAddress) {
  const response = await fetch(
    buyTradeNodeBaseUrl + "/crosschain/trade/" + qortalAtAddress
  );
  if (!response?.ok) throw new Error("Cannot crosschain trade information");
  const data = await response.json();
  return data;
}
async function getTradesInfo(qortalAtAddresses) {
  // Use Promise.all to fetch data for all addresses concurrently
  const trades = await Promise.all(
    qortalAtAddresses.map((address) => getTradeInfo(address))
  );
  return trades; // Return the array of trade info objects
}

export async function getBalanceInfo() {
  const wallet = await getSaveWallet();
  const address = wallet.address0;
  const validApi = await getBaseApi();
  const response = await fetch(validApi + "/addresses/balance/" + address);

  if (!response?.ok) throw new Error("Cannot fetch balance");
  const data = await response.json();
  return data;
}
export async function getLTCBalance() {
  const wallet = await getSaveWallet();
  let _url = `${buyTradeNodeBaseUrl}/crosschain/ltc/walletbalance`;
  const keyPair = await getKeyPair();
  const parsedKeyPair = keyPair
  let _body = parsedKeyPair.ltcPublicKey;
  const response = await fetch(_url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: _body,
  });
  if (response?.ok) {
    const data = await response.text();
    const dataLTCBalance = (Number(data) / 1e8).toFixed(8);
    return +dataLTCBalance;
  } else throw new Error("Onable to get LTC balance");
}

const processTransactionVersion2Chat = async (body: any, customApi) => {
  // const validApi = await findUsableApi();
  const url = await createEndpoint(
    "/transactions/process?apiVersion=2",
    customApi
  );
  return fetch(url, {
    method: "POST",
    headers: {},
    body: Base58.encode(body),
  }).then(async (response) => {
    try {
      const json = await response.clone().json();
      return json;
    } catch (e) {
      return await response.text();
    }
  });
};

export const processTransactionVersion2 = async (body: any) => {
  const url = await createEndpoint(`/transactions/process?apiVersion=2`);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json", // Ensure the body is correctly parsed
      },
      body, // Convert body to JSON string
    });

    // if (!response.ok) {
    //   // If the response is not successful (status code is not 2xx)
    //   throw new Error(`HTTP error! Status: ${response.status}`);
    // }

    try {
      const json = await response.clone().json();
      return json;
    } catch (jsonError) {
      try {
        const text = await response.text();
        return text;
      } catch (textError) {
        throw new Error(`Failed to parse response as both JSON and text.`);
      }
    }
  } catch (error) {
    console.error("Error processing transaction:", error);
    throw error; // Re-throw the error after logging it
  }
};

const transaction = async (
  { type, params, apiVersion, keyPair }: any,
  validApi
) => {
  const tx = createTransaction(type, keyPair, params);
  let res;

  if (apiVersion && apiVersion === 2) {
    const signedBytes = Base58.encode(tx.signedBytes);
    res = await processTransactionVersion2(signedBytes, validApi);
  }
  let success = true;
  if (res?.error) {
    success = false;
  }

  return {
    success,
    data: res,
  };
};
const makeTransactionRequest = async (
  receiver,
  lastRef,
  amount,
  fee,
  keyPair,
  validApi
) => {
  const myTxnrequest = await transaction(
    {
      nonce: 0,
      type: 2,
      params: {
        recipient: receiver,
        // recipientName: recipientName,
        amount: amount,
        lastReference: lastRef,
        fee: fee,
      },
      apiVersion: 2,
      keyPair,
    },
    validApi
  );
  return myTxnrequest;
};

export const getLastRef = async () => {
  const wallet = await getSaveWallet();
  const address = wallet.address0;
  const validApi = await getBaseApi();
  const response = await fetch(
    validApi + "/addresses/lastreference/" + address
  );
  if (!response?.ok) throw new Error("Cannot fetch balance");
  const data = await response.text();
  return data;
};
export const sendQortFee = async (): Promise<number> => {
  const validApi = await getBaseApi();
  const response = await fetch(
    validApi + "/transactions/unitfee?txType=PAYMENT"
  );

  if (!response.ok) {
    throw new Error("Error when fetching join fee");
  }

  const data = await response.json();
  const qortFee = (Number(data) / 1e8).toFixed(8);
  return qortFee;
};

async function getNameOrAddress(receiver) {
  try {
    const isAddress = validateAddress(receiver);
    if (isAddress) {
      return receiver;
    }
    const validApi = await getBaseApi();

    const response = await fetch(validApi + "/names/" + receiver);
    const data = await response.json();
    if (data?.owner) return data.owner;
    if (data?.error) {
      throw new Error("Name does not exist");
    }
    if (!response?.ok) throw new Error("Cannot fetch name");
    return { error: "cannot validate address or name" };
  } catch (error) {
    throw new Error(error?.message || "cannot validate address or name");
  }
}

export async function getPublicKey(receiver) {
  try {
    const validApi = await getBaseApi();

    const response = await fetch(validApi + "/addresses/publickey/" + receiver);
    if (!response?.ok) throw new Error("Cannot fetch recipient's public key");

    const data = await response.text();
    if (!data?.error && data !== "false") return data;
    if (data?.error) {
      throw new Error("Cannot fetch recipient's public key");
    }
    throw new Error("Cannot fetch recipient's public key");
  } catch (error) {
    throw new Error(error?.message || "cannot validate address or name");
  }
}

const MAX_STORAGE_SIZE = 3 * 1024 * 1024; // 3MB in bytes

export async function getDataPublishes(groupId, type) {
  const wallet = await getSaveWallet();
  const address = wallet.address0;

  return new Promise((resolve) => {
    getData<any>(`${address}-publishData`)
  .then((storedData) => {
    storedData = storedData || {}; // Initialize an empty object if no data
    const groupData = storedData[groupId] || {}; // Get data by groupId
    const typeData = groupData[type] || {}; // Get data by type

    resolve(typeData); // Resolve with the data inside the specific type
  })
  .catch((error) => {
    console.error("Error retrieving data:", error);
    resolve(null); // Return null in case of an error
  });

  });
}

export async function addDataPublishes(newData, groupId, type) {
  const wallet = await getSaveWallet();
  const address = wallet.address0;
  const nameIdentifier = `${newData.name}-${newData.identifier}`;

  // Prevent adding data larger than 50KB
  if (newData?.size > 50000) return false;

  return new Promise((res) => {
    getData<any>(`${address}-publishData`)
    .then((storedData) => {
      storedData = storedData || {}; // Initialize if no data found
      let groupData = storedData[groupId] || {}; // Initialize group data if not found
      let typeData = groupData[type] || {}; // Initialize type data if not found
  
      let totalSize = 0;
  
      // Calculate total size of all stored data
      Object.values(storedData).forEach((group) => {
        Object.values(group).forEach((type) => {
          Object.values(type).forEach((data) => {
            totalSize += data.size; // Accumulate data sizes
          });
        });
      });
  
      // Check if adding new data exceeds 3MB limit
      if (totalSize + newData.size > MAX_STORAGE_SIZE) {
        let dataEntries = Object.entries(typeData);
        dataEntries.sort((a, b) => a[1].timestampSaved - b[1].timestampSaved);
  
        // Remove oldest entries until there's enough space
        while (totalSize + newData.size > MAX_STORAGE_SIZE && dataEntries.length > 0) {
          const removedEntry = dataEntries.shift();
          totalSize -= removedEntry[1].size;
          delete typeData[removedEntry[0]]; // Remove from typeData
        }
      }
  
      // Add or update the new data if there's space
      if (totalSize + newData.size <= MAX_STORAGE_SIZE) {
        typeData[`${nameIdentifier}`] = newData;
        groupData[type] = typeData;
        storedData[groupId] = groupData;
  
        // Save updated structure back to localStorage
        storeData(`${address}-publishData`, storedData)
          .then(() => res(true)) // Successfully added
          .catch((error) => {
            console.error("Error saving data:", error);
            res(false); // Save failed
          });
      } else {
        console.error("Failed to add data, still exceeds storage limit.");
        res(false); // Failure due to storage limit
      }
    })
    .catch((error) => {
      console.error("Error retrieving data:", error);
      res(false); // Failure due to retrieval error
    });
  
  });
}

// Fetch user settings based on the key
export async function getUserSettings({ key }) {
  const wallet = await getSaveWallet();
  const address = wallet.address0;

  return new Promise((resolve) => {
    getData<any>(`${address}-userSettings`)
  .then((storedData) => {
    storedData = storedData || {}; // Initialize empty object if no data
    const value = storedData[key] || null; // Get data by key

    resolve(value); // Resolve with the data for the specific key
  })
  .catch((error) => {
    resolve(null); // Return null in case of an error
  });

  });
}

// Add or update user settings
export async function addUserSettings({ keyValue }) {
  const wallet = await getSaveWallet();
  const address = wallet.address0;
  const { key, value } = keyValue;

  // No need to check size here, unless value is a large object. For simple settings, size checks aren't necessary.

  return new Promise((res) => {
    getData<any>(`${address}-userSettings`)
    .then((storedData) => {
      storedData = storedData || {}; // Initialize if no data found
  
      storedData[key] = value; // Update the key-value pair within stored data
  
      // Save updated structure back to localStorage
      storeData(`${address}-userSettings`, storedData)
        .then(() => res(true)) // Data successfully added
        .catch((error) => {
          console.error("Error saving data:", error);
          res(false); // Save failed
        });
    })
    .catch((error) => {
      console.error("Error retrieving data:", error);
      res(false); // Failure due to retrieval error
    });
  
  });
}

export async function decryptWallet({ password, wallet, walletVersion }) {
  try {
    const response = await decryptStoredWallet(password, wallet);
    const wallet2 = new PhraseWallet(response, walletVersion);
    const keyPair = wallet2._addresses[0].keyPair;
    const ltcPrivateKey =
      wallet2._addresses[0].ltcWallet.derivedMasterPrivateKey;
    const ltcPublicKey = wallet2._addresses[0].ltcWallet.derivedMasterPublicKey;
    const ltcAddress = wallet2._addresses[0].ltcWallet.address;
    const toSave = {
      privateKey: Base58.encode(keyPair.privateKey),
      publicKey: Base58.encode(keyPair.publicKey),
      ltcPrivateKey: ltcPrivateKey,
      ltcPublicKey: ltcPublicKey,
      arrrSeed58: wallet2._addresses[0].arrrWallet.seed58,
      btcAddress: wallet2._addresses[0].btcWallet.address,
      btcPublicKey: wallet2._addresses[0].btcWallet.derivedMasterPublicKey,
      btcPrivateKey: wallet2._addresses[0].btcWallet.derivedMasterPrivateKey,

      ltcAddress: wallet2._addresses[0].ltcWallet.address,

      dogeAddress: wallet2._addresses[0].dogeWallet.address,
      dogePublicKey: wallet2._addresses[0].dogeWallet.derivedMasterPublicKey,
      dogePrivateKey: wallet2._addresses[0].dogeWallet.derivedMasterPrivateKey,

      dgbAddress: wallet2._addresses[0].dgbWallet.address,
      dgbPublicKey: wallet2._addresses[0].dgbWallet.derivedMasterPublicKey,
      dgbPrivateKey: wallet2._addresses[0].dgbWallet.derivedMasterPrivateKey,

      rvnAddress: wallet2._addresses[0].rvnWallet.address,
      rvnPublicKey: wallet2._addresses[0].rvnWallet.derivedMasterPublicKey,
      rvnPrivateKey: wallet2._addresses[0].rvnWallet.derivedMasterPrivateKey,
    };
    await new Promise((resolve, reject) => {
      storeData("keyPair", toSave)
      .then(() => resolve(true))
      .catch((error) => {
        reject(new Error(error.message || "Error saving data"));
      });
    
    });
    const newWallet = {
      ...wallet,
      publicKey: Base58.encode(keyPair.publicKey),
      ltcAddress: ltcAddress,
    };
    await new Promise((resolve, reject) => {
      storeData("walletInfo", newWallet)
  .then(() => resolve(true))
  .catch((error) => {
    reject(new Error(error.message || "Error saving data"));
  });

    });

    return true;
  } catch (error) {
    throw new Error(error.message);
  }
}

export async function signChatFunc(
  chatBytesArray,
  chatNonce,
  customApi,
  keyPair
) {
  let response;
  try {
    const signedChatBytes = signChat(chatBytesArray, chatNonce, keyPair);

    const res = await processTransactionVersion2Chat(
      signedChatBytes,
      customApi
    );
    response = res;
  } catch (e) {
    console.error(e);
    console.error(e.message);
    response = false;
  }
  return response;
}
function sbrk(size, heap) {
  let brk = 512 * 1024; // stack top
  let old = brk;
  brk += size;
  if (brk > heap.length) throw new Error("heap exhausted");
  return old;
}

export const computePow = async ({ chatBytes, path, difficulty }) => {
  let response = null;
  await new Promise((resolve, reject) => {
    const _chatBytesArray = Object.keys(chatBytes).map(function (key) {
      return chatBytes[key];
    });
    const chatBytesArray = new Uint8Array(_chatBytesArray);
    const chatBytesHash = new Sha256().process(chatBytesArray).finish().result;
    const memory = new WebAssembly.Memory({ initial: 256, maximum: 256 });
    const heap = new Uint8Array(memory.buffer);

    const hashPtr = sbrk(32, heap);
    const hashAry = new Uint8Array(memory.buffer, hashPtr, 32);
    hashAry.set(chatBytesHash);
    const workBufferLength = 8 * 1024 * 1024;
    const workBufferPtr = sbrk(workBufferLength, heap);
    const importObject = {
      env: {
        memory: memory,
      },
    };
    function loadWebAssembly(filename, imports) {
      // Fetch the file and compile it
      return fetch(filename)
        .then((response) => response.arrayBuffer())
        .then((buffer) => WebAssembly.compile(buffer))
        .then((module) => {
          // Create the instance.
          return new WebAssembly.Instance(module, importObject);
        });
    }
    loadWebAssembly(path).then((wasmModule) => {
      response = {
        nonce: wasmModule.exports.compute2(
          hashPtr,
          workBufferPtr,
          workBufferLength,
          difficulty
        ),
        chatBytesArray,
      };
      resolve();
    });
  });
  return response;
};

const getStoredData = async (key) => {
  return new Promise((resolve, reject) => {
    getData<any>(key)
  .then((data) => resolve(data))
  .catch((error) => reject(error));

  });
};

export async function handleActiveGroupDataFromSocket({ groups, directs }) {
  try {
    const targetOrigin = window.location.origin;

    window.postMessage({
      action: "SET_GROUPS",
      payload: groups,
    }, targetOrigin); 
    window.postMessage({
      action: "SET_DIRECTS",
      payload: directs,
    }, targetOrigin); 

    groups = groups;
    directs = directs;
    const activeData = {
      groups: groups || [], // Your groups data here
      directs: directs || [], // Your directs data here
    };

    // Save the active data to localStorage
    storeData("active-groups-directs", activeData)
    .catch((error) => {
      console.error("Error saving data:", error);
    });
  
    try {
      handleNotification(groups);
      handleNotificationDirect(directs);
    } catch (error) {}
  } catch (error) {}
}

async function sendChatForBuyOrder({ qortAddress, recipientPublicKey, message }) {
  let _reference = new Uint8Array(64);
  self.crypto.getRandomValues(_reference);

  let sendTimestamp = Date.now();

  let reference = Base58.encode(_reference);
  const resKeyPair = await getKeyPair();
  const parsedData = resKeyPair;
  const uint8PrivateKey = Base58.decode(parsedData.privateKey);
  const uint8PublicKey = Base58.decode(parsedData.publicKey);
  const keyPair = {
    privateKey: uint8PrivateKey,
    publicKey: uint8PublicKey,
  };
  const balance = await getBalanceInfo();
  const hasEnoughBalance = +balance < 4 ? false : true;
  const jsonData = {
    addresses: message.addresses,
    foreignKey: message.foreignKey,
    receivingAddress: message.receivingAddress,
  };
  const finalJson = {
    callRequest: jsonData,
    extra: "whatever additional data goes here",
  };
  const messageStringified = JSON.stringify(finalJson);

  const tx = await createTransaction(18, keyPair, {
    timestamp: sendTimestamp,
    recipient: qortAddress,
    recipientPublicKey: recipientPublicKey,
    hasChatReference: 0,
    message: messageStringified,
    lastReference: reference,
    proofOfWorkNonce: 0,
    isEncrypted: 1,
    isText: 1,
  });
  if (!hasEnoughBalance) {
    throw new Error('You must have at least 4 QORT to trade using the gateway.')
  }
  const chatBytes = tx.chatBytes;
  const difficulty = 8;
  const { nonce, chatBytesArray  } = await performPowTask(chatBytes, difficulty);
  let _response = await signChatFunc(
    chatBytesArray,
    nonce,
    "https://appnode.qortal.org",
    keyPair
  );
  if (_response?.error) {
    throw new Error(_response?.message);
  }
  return _response;
}

export async function sendChatGroup({
  groupId,
  typeMessage,
  chatReference,
  messageText,
}) {
  let _reference = new Uint8Array(64);
  self.crypto.getRandomValues(_reference);

  let reference = Base58.encode(_reference);
  const resKeyPair = await getKeyPair();
  const parsedData = resKeyPair;
  const uint8PrivateKey = Base58.decode(parsedData.privateKey);
  const uint8PublicKey = Base58.decode(parsedData.publicKey);
  const keyPair = {
    privateKey: uint8PrivateKey,
    publicKey: uint8PublicKey,
  };
  // const balance = await getBalanceInfo();
  // const hasEnoughBalance = +balance < 4 ? false : true;

  const txBody = {
    timestamp: Date.now(),
    groupID: Number(groupId),
    hasReceipient: 0,
    hasChatReference: chatReference ? 1 : 0,
    message: messageText,
    lastReference: reference,
    proofOfWorkNonce: 0,
    isEncrypted: 0, // Set default to not encrypted for groups
    isText: 1,
  };

  if (chatReference) {
    txBody["chatReference"] = chatReference;
  }

  const tx = await createTransaction(181, keyPair, txBody);

  // if (!hasEnoughBalance) {
  //   throw new Error("Must have at least 4 QORT to send a chat message");
  // }
  const chatBytes = tx.chatBytes;
  const difficulty = 8;
  const { nonce, chatBytesArray  } = await performPowTask(chatBytes, difficulty);
  let _response = await signChatFunc(chatBytesArray, nonce, null, keyPair);
  if (_response?.error) {
    throw new Error(_response?.message);
  }
  return _response;
}

export async function sendChatDirect({
  address,
  directTo,
  typeMessage,
  chatReference,
  messageText,
  publicKeyOfRecipient,
  otherData,
}) {
  let recipientPublicKey;
  let recipientAddress = address;
  if (publicKeyOfRecipient) {
    recipientPublicKey = publicKeyOfRecipient;
  } else {
    recipientAddress = await getNameOrAddress(directTo);
    recipientPublicKey = await getPublicKey(recipientAddress);
  }
  if (!recipientAddress) {
    recipientAddress = await getNameOrAddress(directTo);
  }

  if (!recipientPublicKey) throw new Error("Cannot retrieve publickey");

  let _reference = new Uint8Array(64);
  self.crypto.getRandomValues(_reference);

  let reference = Base58.encode(_reference);
  const resKeyPair = await getKeyPair();
  const parsedData = resKeyPair;
  const uint8PrivateKey = Base58.decode(parsedData.privateKey);
  const uint8PublicKey = Base58.decode(parsedData.publicKey);
  const keyPair = {
    privateKey: uint8PrivateKey,
    publicKey: uint8PublicKey,
  };
  // const balance = await getBalanceInfo();
  // const hasEnoughBalance = +balance < 4 ? false : true;


  const finalJson = {
    message: messageText,
    version: 2,
    ...(otherData || {}),
  };
  const messageStringified = JSON.stringify(finalJson);

  const txBody = {
    timestamp: Date.now(),
    recipient: recipientAddress,
    recipientPublicKey: recipientPublicKey,
    hasChatReference: chatReference ? 1 : 0,
    message: messageStringified,
    lastReference: reference,
    proofOfWorkNonce: 0,
    isEncrypted: 1,
    isText: 1,
  };
  if (chatReference) {
    txBody["chatReference"] = chatReference;
  }
  const tx = await createTransaction(18, keyPair, txBody);

  // if (!hasEnoughBalance) {
  //   throw new Error("Must have at least 4 QORT to send a chat message");
  // }
  const chatBytes = tx.chatBytes;
  const difficulty = 8;
  const { nonce, chatBytesArray  } = await performPowTask(chatBytes, difficulty);

  let _response = await signChatFunc(chatBytesArray, nonce, null, keyPair);
  if (_response?.error) {
    throw new Error(_response?.message);
  }
  return _response;
}

export async function decryptSingleFunc({
  messages,
  secretKeyObject,
  skipDecodeBase64,
}) {
  let holdMessages = [];

  for (const message of messages) {
    try {
      const res = await decryptSingle({
        data64: message.data,
        secretKeyObject,
        skipDecodeBase64,
      });

      const decryptToUnit8Array = base64ToUint8Array(res);
      const responseData = uint8ArrayToObject(decryptToUnit8Array);
      holdMessages.push({ ...message, decryptedData: responseData });
    } catch (error) {}
  }
  return holdMessages;
}
export async function decryptSingleForPublishes({
  messages,
  secretKeyObject,
  skipDecodeBase64,
}) {
  let holdMessages = [];

  for (const message of messages) {
    try {
      const res = await decryptSingle({
        data64: message.data,
        secretKeyObject,
        skipDecodeBase64,
      });

      const decryptToUnit8Array = base64ToUint8Array(res);
      const responseData = uint8ArrayToObject(decryptToUnit8Array);
      holdMessages.push({ ...message, decryptedData: responseData });
    } catch (error) {}
  }
  return holdMessages;
}

export async function decryptDirectFunc({ messages, involvingAddress }) {
  const senderPublicKey = await getPublicKey(involvingAddress);
  let holdMessages = [];

  const resKeyPair = await getKeyPair();
  const parsedData = resKeyPair;
  const uint8PrivateKey = Base58.decode(parsedData.privateKey);
  const uint8PublicKey = Base58.decode(parsedData.publicKey);
  const keyPair = {
    privateKey: uint8PrivateKey,
    publicKey: uint8PublicKey,
  };
  for (const message of messages) {
    try {
      const decodedMessage = decryptChatMessage(
        message.data,
        keyPair.privateKey,
        senderPublicKey,
        message.reference
      );
      const parsedMessage = JSON.parse(decodedMessage);
      holdMessages.push({ ...message, ...parsedMessage });
    } catch (error) {}
  }
  return holdMessages;
}

export async function createBuyOrderTx({ crosschainAtInfo, isGateway, foreignBlockchain }) {
  try {

    if (!isGateway) {
      const wallet = await getSaveWallet();

      const address = wallet.address0;
      let message
      if(foreignBlockchain === 'PIRATECHAIN'){
         message = {
          atAddress: crosschainAtInfo[0].qortalAtAddress,
          foreignKey: await getForeignKey(foreignBlockchain),
          receivingAddress: address,
        };
      } else {
         message = {
          addresses: crosschainAtInfo.map((order)=> order.qortalAtAddress),
          foreignKey: await getForeignKey(foreignBlockchain),
          receivingAddress: address,
        };
      }
     
      let responseVar;
      let txn
      let url
      if(foreignBlockchain === 'PIRATECHAIN'){
         txn = new TradeBotRespondRequest().createTransaction(
          message
        );
       
     
          url =  await createEndpoint('/crosschain/tradebot/respond')
      } else {
         txn = new TradeBotRespondMultipleRequest().createTransaction(
          message
        );
       
     
          url =  await createEndpoint('/crosschain/tradebot/respondmultiple')
      }
    
      const responseFetch = await fetch(
        url,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(txn),
        }
      );


      const res = await responseFetch.json();

      if (res === false) {
        responseVar = {
          response: "Unable to execute buy order",
          success: false,
        };
      } else {
        responseVar = { response: res, success: true };
      }
      const { response, success } = responseVar;
      let responseMessage;
      if (success) {
        responseMessage = {
          callResponse: response,
          extra: {
            message: "Transaction processed successfully!",
            atAddresses: crosschainAtInfo.map((order)=> order.qortalAtAddress),
            senderAddress: address,
            node: url
          },
        };
      } else {
        responseMessage = {
          callResponse: "ERROR",
          extra: {
            message: response,
            atAddresses: crosschainAtInfo.map((order)=> order.qortalAtAddress),
            senderAddress: address,
            node: url
          },
        };
      }

      return responseMessage
    }
    const wallet = await getSaveWallet();
    const address = wallet.address0;

 
    const message = {
      addresses: crosschainAtInfo.map((order)=> order.qortalAtAddress),
      foreignKey: await getForeignKey(foreignBlockchain),
      receivingAddress: address,
    };
    const res = await sendChatForBuyOrder({
      qortAddress: proxyAccountAddress,
      recipientPublicKey: proxyAccountPublicKey,
      message,
      atAddresses: crosschainAtInfo.map((order)=> order.qortalAtAddress),
    });

    
    if (res?.signature) {
    
        const message = await listenForChatMessageForBuyOrder({
          nodeBaseUrl: buyTradeNodeBaseUrl,
          senderAddress: proxyAccountAddress,
          senderPublicKey: proxyAccountPublicKey,
          signature: res?.signature,
        });

      const responseMessage = {
          callResponse: message.callResponse,
            extra: {
              message: message?.extra?.message,
              senderAddress: address,
              node: buyTradeNodeBaseUrl,
              atAddresses: crosschainAtInfo.map((order)=> order.qortalAtAddress),
            }
          }
    
      return responseMessage
    } else {
      throw new Error("Unable to send buy order message");
    }
  } catch (error) {
    throw new Error(error.message);
  }
}

export async function sendChatNotification(
  res,
  groupId,
  secretKeyObject,
  numberOfMembers
) {
  try {
    const data = await objectToBase64({
      type: "notification",
      subType: "new-group-encryption",
      data: {
        timestamp: res.timestamp,
        name: res.name,
        message: `${res.name} has updated the encryption key`,
        numberOfMembers,
      },
    });

    encryptSingle({
      data64: data,
      secretKeyObject: secretKeyObject,
    })
      .then((res2) => {
        pauseAllQueues();
        sendChatGroup({
          groupId,
          typeMessage: undefined,
          chatReference: undefined,
          messageText: res2,
        })
          .then(() => {})
          .catch((error) => {
            console.error("1", error.message);
          })
          .finally(() => {
            resumeAllQueues();
          });
      })
      .catch((error) => {
        console.error("2", error.message);
      });
  } catch (error) {}
}

export const getFee = async (txType) => {
  const timestamp = Date.now();
  const data = await reusableGet(
    `/transactions/unitfee?txType=${txType}&timestamp=${timestamp}`
  );
  const arbitraryFee = (Number(data) / 1e8).toFixed(8);

  return {
    timestamp,
    fee: arbitraryFee,
  };
};

export async function leaveGroup({ groupId }) {
  const wallet = await getSaveWallet();
  const address = wallet.address0;
  const lastReference = await getLastRef();
  const resKeyPair = await getKeyPair();
  const parsedData = resKeyPair;
  const uint8PrivateKey = Base58.decode(parsedData.privateKey);
  const uint8PublicKey = Base58.decode(parsedData.publicKey);
  const keyPair = {
    privateKey: uint8PrivateKey,
    publicKey: uint8PublicKey,
  };
  const feeres = await getFee("LEAVE_GROUP");

  const tx = await createTransaction(32, keyPair, {
    fee: feeres.fee,
    registrantAddress: address,
    rGroupId: groupId,
    lastReference: lastReference,
  });

  const signedBytes = Base58.encode(tx.signedBytes);

  const res = await processTransactionVersion2(signedBytes);
  if (!res?.signature)
    throw new Error("Transaction was not able to be processed");
  return res;
}

export async function joinGroup({ groupId }) {
  const wallet = await getSaveWallet();
  const address = wallet.address0;
  const lastReference = await getLastRef();
  const resKeyPair = await getKeyPair();
  const parsedData = resKeyPair;
  const uint8PrivateKey = Base58.decode(parsedData.privateKey);
  const uint8PublicKey = Base58.decode(parsedData.publicKey);
  const keyPair = {
    privateKey: uint8PrivateKey,
    publicKey: uint8PublicKey,
  };
  const feeres = await getFee("JOIN_GROUP");

  const tx = await createTransaction(31, keyPair, {
    fee: feeres.fee,
    registrantAddress: address,
    rGroupId: groupId,
    lastReference: lastReference,
  });

  const signedBytes = Base58.encode(tx.signedBytes);

  const res = await processTransactionVersion2(signedBytes);
  if (!res?.signature)
    throw new Error(res?.message || "Transaction was not able to be processed");
  return res;
}

export async function cancelInvitationToGroup({ groupId, qortalAddress }) {
  const lastReference = await getLastRef();
  const resKeyPair = await getKeyPair();
  const parsedData = resKeyPair;
  const uint8PrivateKey = Base58.decode(parsedData.privateKey);
  const uint8PublicKey = Base58.decode(parsedData.publicKey);
  const keyPair = {
    privateKey: uint8PrivateKey,
    publicKey: uint8PublicKey,
  };
  const feeres = await getFee("CANCEL_GROUP_INVITE");

  const tx = await createTransaction(30, keyPair, {
    fee: feeres.fee,
    recipient: qortalAddress,
    rGroupId: groupId,
    lastReference: lastReference,
  });

  const signedBytes = Base58.encode(tx.signedBytes);

  const res = await processTransactionVersion2(signedBytes);
  if (!res?.signature)
    throw new Error("Transaction was not able to be processed");
  return res;
}

export async function cancelBan({ groupId, qortalAddress }) {
  const lastReference = await getLastRef();
  const resKeyPair = await getKeyPair();
  const parsedData = resKeyPair;
  const uint8PrivateKey = Base58.decode(parsedData.privateKey);
  const uint8PublicKey = Base58.decode(parsedData.publicKey);
  const keyPair = {
    privateKey: uint8PrivateKey,
    publicKey: uint8PublicKey,
  };
  const feeres = await getFee("CANCEL_GROUP_BAN");

  const tx = await createTransaction(27, keyPair, {
    fee: feeres.fee,
    recipient: qortalAddress,
    rGroupId: groupId,
    lastReference: lastReference,
  });

  const signedBytes = Base58.encode(tx.signedBytes);

  const res = await processTransactionVersion2(signedBytes);
  if (!res?.signature)
    throw new Error("Transaction was not able to be processed");
  return res;
}
export async function registerName({ name }) {
  const lastReference = await getLastRef();
  const resKeyPair = await getKeyPair();
  const parsedData = resKeyPair;
  const uint8PrivateKey = Base58.decode(parsedData.privateKey);
  const uint8PublicKey = Base58.decode(parsedData.publicKey);
  const keyPair = {
    privateKey: uint8PrivateKey,
    publicKey: uint8PublicKey,
  };
  const feeres = await getFee("REGISTER_NAME");

  const tx = await createTransaction(3, keyPair, {
    fee: feeres.fee,
    name,
    value: "",
    lastReference: lastReference,
  });

  const signedBytes = Base58.encode(tx.signedBytes);

  const res = await processTransactionVersion2(signedBytes);
  if (!res?.signature)
    throw new Error("Transaction was not able to be processed");
  return res;
}
export async function makeAdmin({ groupId, qortalAddress }) {
  const lastReference = await getLastRef();
  const resKeyPair = await getKeyPair();
  const parsedData = resKeyPair;
  const uint8PrivateKey = Base58.decode(parsedData.privateKey);
  const uint8PublicKey = Base58.decode(parsedData.publicKey);
  const keyPair = {
    privateKey: uint8PrivateKey,
    publicKey: uint8PublicKey,
  };
  const feeres = await getFee("ADD_GROUP_ADMIN");

  const tx = await createTransaction(24, keyPair, {
    fee: feeres.fee,
    recipient: qortalAddress,
    rGroupId: groupId,
    lastReference: lastReference,
  });

  const signedBytes = Base58.encode(tx.signedBytes);

  const res = await processTransactionVersion2(signedBytes);
  if (!res?.signature)
    throw new Error("Transaction was not able to be processed");
  return res;
}

export async function removeAdmin({ groupId, qortalAddress }) {
  const lastReference = await getLastRef();
  const resKeyPair = await getKeyPair();
  const parsedData = resKeyPair;
  const uint8PrivateKey = Base58.decode(parsedData.privateKey);
  const uint8PublicKey = Base58.decode(parsedData.publicKey);
  const keyPair = {
    privateKey: uint8PrivateKey,
    publicKey: uint8PublicKey,
  };
  const feeres = await getFee("REMOVE_GROUP_ADMIN");

  const tx = await createTransaction(25, keyPair, {
    fee: feeres.fee,
    recipient: qortalAddress,
    rGroupId: groupId,
    lastReference: lastReference,
  });

  const signedBytes = Base58.encode(tx.signedBytes);

  const res = await processTransactionVersion2(signedBytes);
  if (!res?.signature)
    throw new Error("Transaction was not able to be processed");
  return res;
}

export async function banFromGroup({
  groupId,
  qortalAddress,
  rBanReason = "",
  rBanTime,
}) {
  const lastReference = await getLastRef();
  const resKeyPair = await getKeyPair();
  const parsedData = resKeyPair;
  const uint8PrivateKey = Base58.decode(parsedData.privateKey);
  const uint8PublicKey = Base58.decode(parsedData.publicKey);
  const keyPair = {
    privateKey: uint8PrivateKey,
    publicKey: uint8PublicKey,
  };
  const feeres = await getFee("GROUP_BAN");

  const tx = await createTransaction(26, keyPair, {
    fee: feeres.fee,
    recipient: qortalAddress,
    rGroupId: groupId,
    rBanReason: rBanReason,
    rBanTime,
    lastReference: lastReference,
  });

  const signedBytes = Base58.encode(tx.signedBytes);

  const res = await processTransactionVersion2(signedBytes);
  if (!res?.signature)
    throw new Error("Transaction was not able to be processed");
  return res;
}

export async function kickFromGroup({
  groupId,
  qortalAddress,
  rBanReason = "",
}) {
  const lastReference = await getLastRef();
  const resKeyPair = await getKeyPair();
  const parsedData = resKeyPair;
  const uint8PrivateKey = Base58.decode(parsedData.privateKey);
  const uint8PublicKey = Base58.decode(parsedData.publicKey);
  const keyPair = {
    privateKey: uint8PrivateKey,
    publicKey: uint8PublicKey,
  };
  const feeres = await getFee("GROUP_KICK");

  const tx = await createTransaction(28, keyPair, {
    fee: feeres.fee,
    recipient: qortalAddress,
    rGroupId: groupId,
    rBanReason: rBanReason,
    lastReference: lastReference,
  });

  const signedBytes = Base58.encode(tx.signedBytes);

  const res = await processTransactionVersion2(signedBytes);
  if (!res?.signature)
    throw new Error("Transaction was not able to be processed");
  return res;
}

export async function createGroup({
  groupName,
  groupDescription,
  groupType,
  groupApprovalThreshold,
  minBlock,
  maxBlock,
}) {
  const wallet = await getSaveWallet();
  const address = wallet.address0;
  if (!address) throw new Error("Cannot find user");
  const lastReference = await getLastRef();
  const feeres = await getFee("CREATE_GROUP");
  const resKeyPair = await getKeyPair();
  const parsedData = resKeyPair;
  const uint8PrivateKey = Base58.decode(parsedData.privateKey);
  const uint8PublicKey = Base58.decode(parsedData.publicKey);
  const keyPair = {
    privateKey: uint8PrivateKey,
    publicKey: uint8PublicKey,
  };

  const tx = await createTransaction(22, keyPair, {
    fee: feeres.fee,
    registrantAddress: address,
    rGroupName: groupName,
    rGroupDesc: groupDescription,
    rGroupType: groupType,
    rGroupApprovalThreshold: groupApprovalThreshold,
    rGroupMinimumBlockDelay: minBlock,
    rGroupMaximumBlockDelay: maxBlock,
    lastReference: lastReference,
  });

  const signedBytes = Base58.encode(tx.signedBytes);

  const res = await processTransactionVersion2(signedBytes);
  if (!res?.signature) throw new Error(res?.message || "Transaction was not able to be processed");
  return res;
}
export async function inviteToGroup({ groupId, qortalAddress, inviteTime }) {
  const address = await getNameOrAddress(qortalAddress);
  if (!address) throw new Error("Cannot find user");
  const lastReference = await getLastRef();
  const feeres = await getFee("GROUP_INVITE");
  const resKeyPair = await getKeyPair();
  const parsedData = resKeyPair;
  const uint8PrivateKey = Base58.decode(parsedData.privateKey);
  const uint8PublicKey = Base58.decode(parsedData.publicKey);
  const keyPair = {
    privateKey: uint8PrivateKey,
    publicKey: uint8PublicKey,
  };

  const tx = await createTransaction(29, keyPair, {
    fee: feeres.fee,
    recipient: address,
    rGroupId: groupId,
    rInviteTime: inviteTime,
    lastReference: lastReference,
  });

  const signedBytes = Base58.encode(tx.signedBytes);

  const res = await processTransactionVersion2(signedBytes);
  if (!res?.signature)
    throw new Error("Transaction was not able to be processed");
  return res;
}

export async function sendCoin(
  { password, amount, receiver },
  skipConfirmPassword
) {
  try {
    const confirmReceiver = await getNameOrAddress(receiver);
    if (confirmReceiver.error)
      throw new Error("Invalid receiver address or name");
    const wallet = await getSaveWallet();
    let keyPair = "";
    if (skipConfirmPassword) {
      const resKeyPair = await getKeyPair();
      const parsedData = resKeyPair;
      const uint8PrivateKey = Base58.decode(parsedData.privateKey);
      const uint8PublicKey = Base58.decode(parsedData.publicKey);
      keyPair = {
        privateKey: uint8PrivateKey,
        publicKey: uint8PublicKey,
      };
    } else {
      const response = await decryptStoredWallet(password, wallet);
      const wallet2 = new PhraseWallet(response, wallet?.version || walletVersion);

      keyPair = wallet2._addresses[0].keyPair;
    }

    const lastRef = await getLastRef();
    const fee = await sendQortFee();
    const validApi = null;

    const res = await makeTransactionRequest(
      confirmReceiver,
      lastRef,
      amount,
      fee,
      keyPair,
      validApi
    );

    return { res, validApi };
  } catch (error) {
    throw new Error(error.message);
  }
}

function fetchMessages(apiCall) {
  let retryDelay = 2000; // Start with a 2-second delay
  const maxDuration = 360000 * 2; // Maximum duration set to 12 minutes
  const startTime = Date.now(); // Record the start time

  // Promise to handle polling logic
  return new Promise((resolve, reject) => {
    const attemptFetch = async () => {
      if (Date.now() - startTime > maxDuration) {
        return reject(new Error("Maximum polling time exceeded"));
      }

      try {
        const response = await fetch(apiCall);
        const data = await response.json();
        if (data && data.length > 0) {
          resolve(data[0]); // Resolve the promise when data is found
        } else {
          setTimeout(attemptFetch, retryDelay);
          retryDelay = Math.min(retryDelay * 2, 360000); // Ensure delay does not exceed 6 minutes
        }
      } catch (error) {
        reject(error); // Reject the promise on error
      }
    };

    attemptFetch(); // Initial call to start the polling
  });
}

async function fetchMessagesForBuyOrders(apiCall, signature, senderPublicKey) {
  let retryDelay = 2000; // Start with a 2-second delay
  const maxDuration = 360000 * 2; // Maximum duration set to 12 minutes
  const startTime = Date.now(); // Record the start time
  let triedChatMessage = [];
  // Promise to handle polling logic
  await new Promise((res) => {
    setTimeout(() => {
      res();
    }, 40000);
  });
  return new Promise((resolve, reject) => {
    const attemptFetch = async () => {
      if (Date.now() - startTime > maxDuration) {
        return reject(new Error("Maximum polling time exceeded"));
      }

      try {
        const response = await fetch(apiCall);
        let data = await response.json();

        data = data.filter(
          (item) => !triedChatMessage.includes(item.signature)
        );
        if (data && data.length > 0) {
          const encodedMessageObj = data[0];
          const resKeyPair = await getKeyPair();
          const parsedData = resKeyPair;
          const uint8PrivateKey = Base58.decode(parsedData.privateKey);
          const uint8PublicKey = Base58.decode(parsedData.publicKey);
          const keyPair = {
            privateKey: uint8PrivateKey,
            publicKey: uint8PublicKey,
          };

          const decodedMessage = decryptChatMessage(
            encodedMessageObj.data,
            keyPair.privateKey,
            senderPublicKey,
            encodedMessageObj.reference
          );
          const parsedMessage = JSON.parse(decodedMessage);
          if (parsedMessage?.extra?.chatRequestSignature === signature) {
            resolve(parsedMessage);
          } else {
            triedChatMessage.push(encodedMessageObj.signature);
            setTimeout(attemptFetch, retryDelay);
            retryDelay = Math.min(retryDelay * 2, 360000); // Ensure delay does not exceed 6 minutes
          }
          // Resolve the promise when data is found
        } else {
          setTimeout(attemptFetch, retryDelay);
          retryDelay = Math.min(retryDelay * 2, 360000); // Ensure delay does not exceed 6 minutes
        }
      } catch (error) {
        reject(error); // Reject the promise on error
      }
    };

    attemptFetch(); // Initial call to start the polling
  });
}

async function listenForChatMessage({
  nodeBaseUrl,
  senderAddress,
  senderPublicKey,
  timestamp,
}) {
  try {
    let validApi = "";
    const checkIfNodeBaseUrlIsAcceptable = apiEndpoints.find(
      (item) => item === nodeBaseUrl
    );
    if (checkIfNodeBaseUrlIsAcceptable) {
      validApi = checkIfNodeBaseUrlIsAcceptable;
    } else {
      validApi = await findUsableApi();
    }
    const wallet = await getSaveWallet();
    const address = wallet.address0;
    const before = timestamp + 5000;
    const after = timestamp - 5000;
    const apiCall = `${validApi}/chat/messages?involving=${senderAddress}&involving=${address}&reverse=true&limit=1&before=${before}&after=${after}&encoding=BASE64`;
    const encodedMessageObj = await fetchMessages(apiCall);

    const resKeyPair = await getKeyPair();
    const parsedData = resKeyPair;
    const uint8PrivateKey = Base58.decode(parsedData.privateKey);
    const uint8PublicKey = Base58.decode(parsedData.publicKey);
    const keyPair = {
      privateKey: uint8PrivateKey,
      publicKey: uint8PublicKey,
    };

    const decodedMessage = decryptChatMessage(
      encodedMessageObj.data,
      keyPair.privateKey,
      senderPublicKey,
      encodedMessageObj.reference
    );
    return { secretCode: decodedMessage };
  } catch (error) {
    console.error(error);
    throw new Error(error.message);
  }
}

async function listenForChatMessageForBuyOrder({
  nodeBaseUrl,
  senderAddress,
  senderPublicKey,
  signature,
}) {
  try {
    let validApi = "";
    const checkIfNodeBaseUrlIsAcceptable = apiEndpoints.find(
      (item) => item === nodeBaseUrl
    );
    if (checkIfNodeBaseUrlIsAcceptable) {
      validApi = checkIfNodeBaseUrlIsAcceptable;
    } else {
      validApi = await findUsableApi();
    }
    const wallet = await getSaveWallet();
    const address = wallet.address0;
    const before = Date.now() + 1200000;
    const after = Date.now();
    const apiCall = `${validApi}/chat/messages?involving=${senderAddress}&involving=${address}&reverse=true&limit=1&before=${before}&after=${after}&encoding=BASE64`;
    const parsedMessageObj = await fetchMessagesForBuyOrders(
      apiCall,
      signature,
      senderPublicKey
    );

    return parsedMessageObj
  } catch (error) {
    console.error(error);
    throw new Error(error.message);
  }
}

export function removeDuplicateWindow(popupUrl) {
  // chrome.windows.getAll(
  //   { populate: true, windowTypes: ["popup"] },
  //   (windows) => {
  //     // Filter to find popups matching the specific URL
  //     const existingPopupsPending = windows.filter(
  //       (w) =>
  //         w.tabs &&
  //         w.tabs.some(
  //           (tab) => tab.pendingUrl && tab.pendingUrl.startsWith(popupUrl)
  //         )
  //     );
  //     const existingPopups = windows.filter(
  //       (w) =>
  //         w.tabs &&
  //         w.tabs.some((tab) => tab.url && tab.url.startsWith(popupUrl))
  //     );

  //     if (existingPopupsPending.length > 1) {
  //       chrome.windows.remove(
  //         existingPopupsPending?.[0]?.tabs?.[0]?.windowId,
  //         () => {}
  //       );
  //     } else if (
  //       existingPopupsPending.length > 0 &&
  //       existingPopups.length > 0
  //     ) {
  //       chrome.windows.remove(
  //         existingPopupsPending?.[0]?.tabs?.[0]?.windowId,
  //         () => {}
  //       );
  //     }
  //   }
  // );
}

export async function setChatHeads(data) {
  const wallet = await getSaveWallet();
  const address = wallet.address0;
  return await new Promise((resolve, reject) => {
    storeData(`chatheads-${address}`, data)
    .then(() => resolve(true))
    .catch((error) => {
      reject(new Error(error.message || "Error saving data"));
    });
  
  });
}

export async function checkLocalFunc() {
  const apiKey = await getApiKeyFromStorage();
  return !!apiKey;
}

export async function getTempPublish() {
  const wallet = await getSaveWallet();
  const address = wallet.address0;
  const key = `tempPublish-${address}`;
  const res = await getData<any>(key).catch(() => null);

  const SIX_MINUTES = 6 * 60 * 1000; // 6 minutes in milliseconds

  if (res) {
    const parsedData = res
    const currentTime = Date.now();

    // Filter through each top-level key (e.g., "announcement") and then through its nested entries
    const filteredData = Object.fromEntries(
      Object.entries(parsedData).map(([category, entries]) => {
        // Filter out entries inside each category that are older than 6 minutes
        const filteredEntries = Object.fromEntries(
          Object.entries(entries).filter(([entryKey, entryValue]) => {
            return currentTime - entryValue.timestampSaved < SIX_MINUTES;
          })
        );
        return [category, filteredEntries];
      })
    );

    if (JSON.stringify(filteredData) !== JSON.stringify(parsedData)) {
      await storeData(key, filteredData);
    }
    return filteredData;
  } else {
    return {};
  }
}

export async function saveTempPublish({ data, key }) {
  const existingTemp = await getTempPublish();
  const wallet = await getSaveWallet();
  const address = wallet.address0;
  const newTemp = {
    ...existingTemp,
    [key]: {
      ...(existingTemp[key] || {}),
      [data.identifier]: {
        data,
        timestampSaved: Date.now(),
      },
    },
  };


  return await new Promise((resolve, reject) => {
    storeData(`tempPublish-${address}`, newTemp)
  .then(() => resolve(newTemp[key]))
  .catch((error) => {
    reject(new Error(error.message || "Error saving data"));
  });

  });
}

async function setChatHeadsDirect(data) {
  const wallet = await getSaveWallet();
  const address = wallet.address0;
  return await new Promise((resolve, reject) => {
    storeData(`chatheads-direct-${address}`, data)
  .then(() => resolve(true))
  .catch((error) => {
    reject(new Error(error.message || "Error saving data"));
  });

  });
}
export async function getTimestampMention() {
  const wallet = await getSaveWallet();
  const address = wallet.address0;
  const key = `enter-mention-timestamp-${address}`;
  const res = await getData<any>(key).catch(() => null);
  if (res) {
    const parsedData = res;
    return parsedData;
  } else {
    return {};
  }
}
export async function addTimestampMention({ groupId, timestamp }) {
  const wallet = await getSaveWallet();
  const address = wallet.address0;
  const data = await getTimestampMention();
  data[groupId] = timestamp;
  return await new Promise((resolve, reject) => {
    storeData(`enter-mention-timestamp-${address}`, data)
      .then(() => resolve(true))
      .catch((error) => {
        reject(new Error(error.message || "Error saving data"));
      });
  });
}

export async function getTimestampEnterChat() {
  const wallet = await getSaveWallet();
  const address = wallet.address0;
  const key = `enter-chat-timestamp-${address}`;
  const res = await getData<any>(key).catch(() => null);
  if (res) {
    const parsedData = res
    return parsedData;
  } else {
    return {};
  }
}
export async function getTimestampGroupAnnouncement() {
  const wallet = await getSaveWallet();
  const address = wallet.address0;
  const key = `group-announcement-${address}`;
  const res = await getData<any>(key).catch(() => null);
  if (res) {
    const parsedData = res
    return parsedData;
  } else {
    return {};
  }
}

export async function addTimestampGroupAnnouncement({
  groupId,
  timestamp,
  seenTimestamp,
}) {
  const wallet = await getSaveWallet();
  const address = wallet.address0;
  const data = (await getTimestampGroupAnnouncement()) || {};
  data[groupId] = {
    notification: timestamp,
    seentimestamp: seenTimestamp ? true : false,
  };
  return await new Promise((resolve, reject) => {
    storeData(`group-announcement-${address}`, data)
    .then(() => resolve(true))
    .catch((error) => {
      reject(new Error(error.message || "Error saving data"));
    });
  
  });
}

export async function addEnteredQmailTimestamp() {
  const wallet = await getSaveWallet();
  const address = wallet.address0;
  
  return await new Promise((resolve, reject) => {
    storeData(`qmail-entered-timestamp-${address}`, Date.now())
      .then(() => resolve(true))
      .catch((error) => {
        reject(new Error(error.message || "Error saving data"));
      });
  });
}

export async function getEnteredQmailTimestamp() {
  const wallet = await getSaveWallet();
  const address = wallet.address0;
  const key = `qmail-entered-timestamp-${address}`;
  const res = await getData<any>(key).catch(() => null);
  if (res) {
    const parsedData = res;
    return parsedData;
  } else {
    return null
  }
}

async function getGroupData() {
  const wallet = await getSaveWallet();
  const address = wallet.address0;
  const key = `group-data-${address}`;
  const res = await getData<any>(key).catch(() => null);
  if (res) {
    const parsedData = res
    return parsedData;
  } else {
    return {};
  }
}
export async function getGroupDataSingle(groupId) {
  const wallet = await getSaveWallet();
  const address = wallet.address0;
  const key = `group-data-${address}`;
  const res = await getData<any>(key).catch(() => null);
  if (res) {
    const parsedData = res
    return parsedData[groupId] || null;
  } else {
    return null;
  }
}

export async function setGroupData({
  groupId,
  secretKeyData,
  secretKeyResource,
  admins,
}) {
  const wallet = await getSaveWallet();
  const address = wallet.address0;
  const data = (await getGroupData()) || {};
  data[groupId] = {
    timestampLastSet: Date.now(),
    admins,
    secretKeyData,
    secretKeyResource,
  };
  return await new Promise((resolve, reject) => {
    storeData(`group-data-${address}`, data)
  .then(() => resolve(true))
  .catch((error) => {
    reject(new Error(error.message || "Error saving data"));
  });

  });
}

export async function addTimestampEnterChat({ groupId, timestamp }) {
  const wallet = await getSaveWallet();
  const address = wallet.address0;
  const data = await getTimestampEnterChat();
  data[groupId] = timestamp;
  return await new Promise((resolve, reject) => {
    storeData(`enter-chat-timestamp-${address}`, data)
    .then(() => resolve(true))
    .catch((error) => {
      reject(new Error(error.message || "Error saving data"));
    });
  
  });
}

export async function notifyAdminRegenerateSecretKey({
  groupName,
  adminAddress,
}) {
  const wallet = await getSaveWallet();
  const address = wallet.address0;
  const name = await getNameInfo(address);
  const nameOrAddress = name || address;
  await sendChatDirect({
    directTo: adminAddress,
    typeMessage: undefined,
    chatReference: undefined,
    messageText: `<p>Member ${nameOrAddress} has requested that you regenerate the group's secret key. Group: ${groupName}</p>`,
  });
  return true;
}

async function getChatHeads() {
  const wallet = await getSaveWallet();
  const address = wallet.address0;
  const key = `chatheads-${address}`;
  const res = await getData<any>(key).catch(() => null);
  if (res) {
    const parsedData = res
    return parsedData;
  } else {
    throw new Error("No Chatheads saved");
  }
}

async function getChatHeadsDirect() {
  const wallet = await getSaveWallet();
  const address = wallet.address0;
  const key = `chatheads-direct-${address}`;
  const res = await getData<any>(key).catch(() => null);
  if (res) {
    const parsedData = res
    return parsedData;
  } else {
    throw new Error("No Chatheads saved");
  }
}

function setupMessageListener() {
  window.addEventListener("message", async (event) => {
    if (event.origin !== window.location.origin) {
      return;  
    }
    const request = event.data;

    // Check if the message is intended for this listener
    if (request?.type !== "backgroundMessage") return; // Only process messages of type 'backgroundMessage'


    switch (request.action) {
      case "version":
        versionCase(request, event);
        break;

      // case "storeWalletInfo":
      //   storeWalletInfoCase(request, event);
      //   break;

      case "getWalletInfo":
        getWalletInfoCase(request, event);
        break;

      case "validApi":
        validApiCase(request, event);
        break;

      case "name":
        nameCase(request, event);
        break;
      case "userInfo":
        userInfoCase(request, event);
        break;
      case "decryptWallet":
        decryptWalletCase(request, event);
        break;
      case "balance":
        balanceCase(request, event);
        break;
      case "ltcBalance":
        ltcBalanceCase(request, event);
        break;
      case "sendCoin":
        sendCoinCase(request, event);
        break;
      case "inviteToGroup":
        inviteToGroupCase(request, event);
        break;
      case "saveTempPublish":
        saveTempPublishCase(request, event);
        break;
      case "getTempPublish":
        getTempPublishCase(request, event);
        break;
      case "createGroup":
        createGroupCase(request, event);
        break;
      case "cancelInvitationToGroup":
        cancelInvitationToGroupCase(request, event);
        break;
      case "leaveGroup":
        leaveGroupCase(request, event);
        break;
      case "joinGroup":
        joinGroupCase(request, event);
        break;
      case "kickFromGroup":
        kickFromGroupCase(request, event);
        break;
      case "banFromGroup":
        banFromGroupCase(request, event);
        break;

      case "addDataPublishes":
        addDataPublishesCase(request, event);
        break;

      case "getDataPublishes":
        getDataPublishesCase(request, event);
        break;
      case "addUserSettings":
        addUserSettingsCase(request, event);
        break;
      case "cancelBan":
        cancelBanCase(request, event);
        break;
      case "registerName":
        registerNameCase(request, event);
        break;
      case "addTimestampMention":
        addTimestampMentionCase(request, event);
        break;
      case "getTimestampMention":
        getTimestampMentionCase(request, event);
        break;
      case "makeAdmin":
        makeAdminCase(request, event);
        break;
      case "removeAdmin":
        removeAdminCase(request, event);
        break;
      case "notification":
        notificationCase(request, event);
        break;

      case "addTimestampEnterChat":
        addTimestampEnterChatCase(request, event);
        break;
      case "setApiKey":
        setApiKeyCase(request, event);
        break;
      case "setCustomNodes":
        setCustomNodesCase(request, event);
      case "getApiKey":
        getApiKeyCase(request, event);
        break;
      case "getCustomNodesFromStorage":
        getCustomNodesFromStorageCase(request, event);
        break;
      case "notifyAdminRegenerateSecretKey":
        notifyAdminRegenerateSecretKeyCase(request, event);
        break;
      case "addGroupNotificationTimestamp":
        addGroupNotificationTimestampCase(request, event);
        break;
      case "clearAllNotifications":
        clearAllNotificationsCase(request, event);
        break;
      case "setGroupData":
        setGroupDataCase(request, event);
        break;
      case "getGroupDataSingle":
        getGroupDataSingleCase(request, event);
        break;
      case "getTimestampEnterChat":
        getTimestampEnterChatCase(request, event);
        break;
      case "getGroupNotificationTimestamp":
        getGroupNotificationTimestampCase(request, event);
        break;
      case "encryptAndPublishSymmetricKeyGroupChat":
        encryptAndPublishSymmetricKeyGroupChatCase(request, event);
        break;
        case "encryptAndPublishSymmetricKeyGroupChatForAdmins":
        encryptAndPublishSymmetricKeyGroupChatForAdminsCase(request, event);
        break;
      case "publishGroupEncryptedResource":
        publishGroupEncryptedResourceCase(request, event);
        break;
      case "publishOnQDN":
        publishOnQDNCase(request, event);
        break;
      case "handleActiveGroupDataFromSocket":
        handleActiveGroupDataFromSocketCase(request, event);
        break;
      case "getThreadActivity":
        getThreadActivityCase(request, event);
        break;
      case "updateThreadActivity":
        updateThreadActivityCase(request, event);
      case "decryptGroupEncryption":
        decryptGroupEncryptionCase(request, event);
        break;
      case "encryptSingle":
        encryptSingleCase(request, event);
        break;
      case "decryptSingle":
        decryptSingleCase(request, event);
        break;
      case "pauseAllQueues":
        pauseAllQueuesCase(request, event);
        break;
      case "resumeAllQueues":
        resumeAllQueuesCase(request, event);
        break;
      case "checkLocal":
        checkLocalCase(request, event);
        break;
      case "decryptSingleForPublishes":
        decryptSingleForPublishesCase(request, event);
        break;
      case "decryptDirect":
        decryptDirectCase(request, event);
        break;
      case "sendChatGroup":
        sendChatGroupCase(request, event);
        break;
        case "createPoll":
          createPollCase(request, event);
          break;
        case "voteOnPoll":
          voteOnPollCase(request, event);
            break;
      case "sendChatDirect":
        sendChatDirectCase(request, event);
        break;
      case "getUserSettings":
        getUserSettingsCase(request, event);
        break;
      case "setupGroupWebsocket":
        setupGroupWebsocketCase(request, event);
        break;
      case "addEnteredQmailTimestamp":
        addEnteredQmailTimestampCase(request, event);
        break;
      case "getEnteredQmailTimestamp":
        getEnteredQmailTimestampCase(request, event);
        break;
      case "logout":
        {
          try {
            const logoutFunc = async () => {
              forceCloseWebSocket();
              clearAllQueues();
              if (interval) {
                // for announcement notification
                clearInterval(interval);
              }
              groupSecretkeys = {}
              const wallet = await getSaveWallet();
              const address = wallet.address0;
              const key1 = `tempPublish-${address}`;
              const key2 = `group-data-${address}`;
              const key3 = `${address}-publishData`;
              const keysToRemove = [
                "keyPair",
                "walletInfo",
                "active-groups-directs",
                key1,
                key2,
                key3,
              ];
              
              removeKeysAndLogout(keysToRemove, event, request);
              
            };
            logoutFunc();
          } catch (error) {}
        }

        break;
      default:
        break;
    }
  });
}

setupMessageListener();





const checkGroupList = async () => {
  try {
    const wallet = await getSaveWallet();
    const address = wallet.address0;
    const url = await createEndpoint(`/chat/active/${address}?encoding=BASE64&haschatreference=false`);
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });
    const data = await response.json();

    const filteredGroups =
      data.groups?.filter((item) => item?.groupId !== 0) || [];
    const sortedGroups = filteredGroups.sort(
      (a, b) => (b.timestamp || 0) - (a.timestamp || 0)
    );
    const sortedDirects = (data?.direct || [])
      .filter(
        (item) =>
          item?.name !== "extension-proxy" &&
          item?.address !== "QSMMGSgysEuqDCuLw3S4cHrQkBrh3vP3VH"
      )
      .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

    handleActiveGroupDataFromSocket({
      groups: sortedGroups,
      directs: sortedDirects,
    });
  } catch (error) {
    console.error(error);
  } finally {
  }
};


export const checkNewMessages = async () => {
  try {
    let mutedGroups = await getUserSettings({key: 'mutedGroups'}) || []
    if(!isArray(mutedGroups)) mutedGroups = []
    let myName = "";
    const userData = await getUserInfo();
    if (userData?.name) {
      myName = userData.name;
    }

    let newAnnouncements = [];
    const activeData = (await getStoredData("active-groups-directs")) || {
      groups: [],
      directs: [],
    };
    const groups = activeData?.groups;
    if (!groups || groups?.length === 0) return;
    const savedtimestamp = await getTimestampGroupAnnouncement();

    await Promise.all(
      groups.map(async (group) => {
        try {
          const identifier = `grp-${group.groupId}-anc-`;
          const endpoint = await getArbitraryEndpoint();
          const url = await createEndpoint(
            `${endpoint}?mode=ALL&service=DOCUMENT&identifier=${identifier}&limit=1&includemetadata=false&offset=0&reverse=true&prefix=true`
          );
          const response = await requestQueueAnnouncements.enqueue(() => {
            return fetch(url, {
              method: "GET",
              headers: {
                "Content-Type": "application/json",
              },
            });
          });
          const responseData = await response.json();

          const latestMessage = responseData.filter(
            (pub) => pub?.name !== myName
          )[0];
          if (!latestMessage) {
            return; // continue to the next group
          }

          if (
            checkDifference(latestMessage.created) &&
            (!savedtimestamp[group.groupId] ||
              latestMessage.created >
                savedtimestamp?.[group.groupId]?.notification)
          ) {
            newAnnouncements.push(group);
            await addTimestampGroupAnnouncement({
              groupId: group.groupId,
              timestamp: Date.now(),
            });
            // save new timestamp
          }
        } catch (error) {
          console.error(error); // Handle error if needed
        }
      })
    );
    let isDisableNotifications = await getUserSettings({key: 'disable-push-notifications'}) || false
    if (newAnnouncements.length > 0 && !mutedGroups.includes(newAnnouncements[0]?.groupId) && !isDisableNotifications) {
      const notificationId = generateId()


    
      LocalNotifications.schedule({
        notifications: [
          {
            title: "New group announcement!",
            body: `You have received a new announcement from ${newAnnouncements[0]?.groupName}`,
            id: notificationId,
            schedule: { at: new Date(Date.now() + 1000) }, // 1 second from now
            extra: {
              type: 'group',
              from: newAnnouncements[0]?.groupId
            }
          }
        ]
      });
    }
    const targetOrigin = window.location.origin;

    const savedtimestampAfter = await getTimestampGroupAnnouncement();
    window.postMessage({
      action: "SET_GROUP_ANNOUNCEMENTS",
      payload: savedtimestampAfter,
    }, targetOrigin); 
  } catch (error) {
  } finally {
  }
};

const checkActiveChatsForNotifications = async () => {
  try {
   
     checkGroupList();
        
      
    
  } catch (error) {}
};

export const checkThreads = async (bringBack) => {
  try {
    let myName = "";
    const userData = await getUserInfo();
    if (userData?.name) {
      myName = userData.name;
    }
    let newAnnouncements = [];
    let dataToBringBack = [];
    const threadActivity = await getThreadActivity();
    if (!threadActivity) return null;

    const selectedThreads = [
      ...threadActivity.createdThreads.slice(0, 2),
      ...threadActivity.mostVisitedThreads.slice(0, 2),
      ...threadActivity.recentThreads.slice(0, 2),
    ];

    if (selectedThreads?.length === 0) return null;
    const tempData = {};
    for (const thread of selectedThreads) {
      try {
        const identifier = `thmsg-${thread?.threadId}`;
        const name = thread?.qortalName;
        const endpoint = await getArbitraryEndpoint();
        const url = await createEndpoint(
          `${endpoint}?mode=ALL&service=DOCUMENT&identifier=${identifier}&limit=1&includemetadata=false&offset=${0}&reverse=true&prefix=true`
        );
        const response = await fetch(url, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });
        const responseData = await response.json();

        const latestMessage = responseData.filter(
          (pub) => pub?.name !== myName
        )[0];
        // const latestMessage = responseData[0]

        if (!latestMessage) {
          continue;
        }

        if (
          checkDifference(latestMessage.created) &&
          latestMessage.created > thread?.lastVisited &&
          (!thread?.lastNotified || thread?.lastNotified < thread?.created)
        ) {
          tempData[thread.threadId] = latestMessage.created;
          newAnnouncements.push(thread);
        }
        if (latestMessage.created > thread?.lastVisited) {
          dataToBringBack.push(thread);
        }
      } catch (error) {
        conosle.log({ error });
      }
    }

    if (bringBack) {
      return dataToBringBack;
    }

    const updateThreadWithLastNotified = {
      ...threadActivity,
      createdThreads: (threadActivity?.createdThreads || [])?.map((item) => {
        if (tempData[item.threadId]) {
          return {
            ...item,
            lastNotified: tempData[item.threadId],
          };
        } else {
          return item;
        }
      }),
      mostVisitedThreads: (threadActivity?.mostVisitedThreads || [])?.map(
        (item) => {
          if (tempData[item.threadId]) {
            return {
              ...item,
              lastNotified: tempData[item.threadId],
            };
          } else {
            return item;
          }
        }
      ),
      recentThreads: (threadActivity?.recentThreads || [])?.map((item) => {
        if (tempData[item.threadId]) {
          return {
            ...item,
            lastNotified: tempData[item.threadId],
          };
        } else {
          return item;
        }
      }),
    };

    const wallet = await getSaveWallet();
    const address = wallet.address0;
    const dataString = JSON.stringify(updateThreadWithLastNotified);
    chrome.storage.local.set({ [`threadactivity-${address}`]: dataString });

    if (newAnnouncements.length > 0) {

      const notificationId = generateId()
      let isDisableNotifications = await getUserSettings({key: 'disable-push-notifications'}) || false
      if(!isDisableNotifications){
        LocalNotifications.schedule({
          notifications: [
            {
              title: `New thread post!`,
              body: `New post in ${newAnnouncements[0]?.thread?.threadData?.title}`,
              id: notificationId,
              schedule: { at: new Date(Date.now() + 1000) }, // 1 second from now
              extra: {
                type: 'thread-post',
                from: ""
              }
            }
          ]
        });
      }
    }
    
    const savedtimestampAfter = await getTimestampGroupAnnouncement();
    const targetOrigin = window.location.origin;

    window.postMessage({
      action: "SET_GROUP_ANNOUNCEMENTS",
      payload: savedtimestampAfter,
    }, targetOrigin); 
  } catch (error) {
  } finally {
  }
};

// Configure Background Fetch
BackgroundFetch.configure({
  minimumFetchInterval: 15,    // Minimum 15-minute interval
  enableHeadless: true,        // Enable headless mode for Android
}, async (taskId) => {
  // This is where your background task logic goes
  const wallet = await getSaveWallet();
  const address = wallet.address0;
  if (!address) return;
   checkActiveChatsForNotifications();
   checkNewMessages();
  checkThreads();

  await new Promise((res)=> {
    setTimeout(() => {
      res()
    }, 55000);
  })
  // Always finish the task when complete
  BackgroundFetch.finish(taskId);
}, (taskId) => {
  // Optional timeout callback
  BackgroundFetch.finish(taskId);
});



LocalNotifications.addListener('localNotificationActionPerformed', async (event) => {

  // Access nested properties based on your screenshot
  const extraData = event.notification?.extra;
  const type = extraData?.type;
  const from = extraData?.from;

  const targetOrigin = window.location.origin;

  // Determine notification type based on `type` field
  if (type === 'direct') {
    window.postMessage({ action: "NOTIFICATION_OPEN_DIRECT", payload: { from } }, targetOrigin);
  } else if (type === 'group') {
    window.postMessage({ action: "NOTIFICATION_OPEN_GROUP", payload: { from } }, targetOrigin);
  } else if (type === 'group-announcement') {
    window.postMessage({ action: "NOTIFICATION_OPEN_ANNOUNCEMENT_GROUP", payload: { from } }, targetOrigin);
  } else if (type === 'thread-post') {
    window.postMessage({ action: "NOTIFICATION_OPEN_THREAD_NEW_POST", payload: { data: extraData?.data } }, targetOrigin);
  }

  // Clear all notifications
  try {
    await clearAllNotifications();
  } catch (error) {
    console.error("Error clearing notifications:", error);
  }
});


const initializeBackButton = () => {

    CapacitorApp.addListener('backButton', (event) => {
      // Prevent the app from closing on back button press
      executeEvent("handleMobileNativeBack", {
      });
      event.preventDefault();
      
    });
  
};

// Call this function on app startup
initializeBackButton();