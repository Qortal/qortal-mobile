import {
    addDataPublishes,
    addTimestampEnterChat,
    addTimestampGroupAnnouncement,
    addUserSettings,
    banFromGroup,
    cancelBan,
    cancelInvitationToGroup,
    clearAllNotifications,
    createGroup,
  decryptWallet,
  findUsableApi,
  getApiKeyFromStorage,
  getBalanceInfo,
  getCustomNodesFromStorage,
  getDataPublishes,
  getGroupDataSingle,
  getKeyPair,
  getLTCBalance,
  getNameInfo,
  getTempPublish,
  getTimestampEnterChat,
  getTimestampGroupAnnouncement,
  getUserInfo,
  getUserSettings,
  inviteToGroup,
  joinGroup,
  kickFromGroup,
  leaveGroup,
  makeAdmin,
  notifyAdminRegenerateSecretKey,
  registerName,
  removeAdmin,
  saveTempPublish,
  sendCoin,
  setChatHeads,
  setGroupData,
  walletVersion,
} from "./background";

export function versionCase(request, event) {
  event.source.postMessage(
    {
      requestId: request.requestId,
      action: "version",
      payload: { version: "1.0" },
      type: "backgroundMessageResponse",
    },
    event.origin
  );
}

export async function getWalletInfoCase(request, event) {
  try {
    const response = await getKeyPair();

    event.source.postMessage(
      {
        requestId: request.requestId,
        action: "getWalletInfo",
        payload: { walletInfo: response },
        type: "backgroundMessageResponse",
      },
      event.origin
    );
  } catch (error) {
    event.source.postMessage(
      {
        requestId: request.requestId,
        action: "getWalletInfo",
        error: error?.message,
        type: "backgroundMessageResponse",
      },
      event.origin
    );
  }
}

export async function validApiCase(request, event) {
  try {
    const usableApi = await findUsableApi();

    event.source.postMessage(
      {
        requestId: request.requestId,
        action: "validApi",
        payload: usableApi,
        type: "backgroundMessageResponse",
      },
      event.origin
    );
  } catch (error) {
    event.source.postMessage(
      {
        requestId: request.requestId,
        action: "validApi",
        error: error?.message,
        type: "backgroundMessageResponse",
      },
      event.origin
    );
  }
}

export async function nameCase(request, event) {
  try {
    const response = await getNameInfo();

    event.source.postMessage(
      {
        requestId: request.requestId,
        action: "name",
        payload: response,
        type: "backgroundMessageResponse",
      },
      event.origin
    );
  } catch (error) {
    event.source.postMessage(
      {
        requestId: request.requestId,
        action: "name",
        error: error?.message,
        type: "backgroundMessageResponse",
      },
      event.origin
    );
  }
}

export async function userInfoCase(request, event) {
  try {
    const response = await getUserInfo();

    event.source.postMessage(
      {
        requestId: request.requestId,
        action: "userInfo",
        payload: response,
        type: "backgroundMessageResponse",
      },
      event.origin
    );
  } catch (error) {
    event.source.postMessage(
      {
        requestId: request.requestId,
        action: "userInfo",
        error: "User not authenticated",
        type: "backgroundMessageResponse",
      },
      event.origin
    );
  }
}

export async function decryptWalletCase(request, event) {
  try {
    const { password, wallet } = request.payload;
    const response = await decryptWallet(password, wallet, walletVersion);

    event.source.postMessage(
      {
        requestId: request.requestId,
        action: "decryptWallet",
        payload: response,
        type: "backgroundMessageResponse",
      },
      event.origin
    );
  } catch (error) {
    event.source.postMessage(
      {
        requestId: request.requestId,
        action: "decryptWallet",
        error: error?.message,
        type: "backgroundMessageResponse",
      },
      event.origin
    );
  }
}

export async function balanceCase(request, event) {
    try {
      const response = await getBalanceInfo();
  
      event.source.postMessage(
        { requestId: request.requestId, action: "balance", payload: response,  type: "backgroundMessageResponse" },
        event.origin
      );
    } catch (error) {
      event.source.postMessage(
        {
          requestId: request.requestId,
          action: "balance",
          error: error?.message,
          type: "backgroundMessageResponse"
        },
        event.origin
      );
    }
  }
  export async function ltcBalanceCase(request, event) {
    try {
      const response = await getLTCBalance();
  
      event.source.postMessage(
        { requestId: request.requestId, action: "ltcBalance", payload: response,  type: "backgroundMessageResponse" },
        event.origin
      );
    } catch (error) {
      event.source.postMessage(
        {
          requestId: request.requestId,
          action: "ltcBalance",
          error: error?.message,
          type: "backgroundMessageResponse"
        },
        event.origin
      );
    }
  }
  
  export async function sendCoinCase(request, event) {
    try {
      const { receiver, password, amount } = request.payload;
      const { res } = await sendCoin({receiver, password, amount});
      if (!res?.success) {
        event.source.postMessage(
            {
              requestId: request.requestId,
              action: "sendCoin",
              error: res?.data?.message,
              type: "backgroundMessageResponse",
            },
            event.origin
          );
        return;
      }
      event.source.postMessage(
        {
          requestId: request.requestId,
          action: "sendCoin",
          payload: true,
          type: "backgroundMessageResponse",
        },
        event.origin
      );
    } catch (error) {
      event.source.postMessage(
        {
          requestId: request.requestId,
          action: "sendCoin",
          error: error?.message,
          type: "backgroundMessageResponse",
        },
        event.origin
      );
    }
  }

  export async function inviteToGroupCase(request, event) {
    try {
      const { groupId, qortalAddress, inviteTime } = request.payload;
      const response = await inviteToGroup({groupId, qortalAddress, inviteTime});
  
      event.source.postMessage(
        {
          requestId: request.requestId,
          action: "inviteToGroup",
          payload: response,
          type: "backgroundMessageResponse",
        },
        event.origin
      );
    } catch (error) {
      event.source.postMessage(
        {
          requestId: request.requestId,
          action: "inviteToGroup",
          error: error?.message,
          type: "backgroundMessageResponse",
        },
        event.origin
      );
    }
  }

  export async function saveTempPublishCase(request, event) {
    try {
      const { data, key } = request.payload;
      const response = await saveTempPublish({data, key});
  
      event.source.postMessage(
        {
          requestId: request.requestId,
          action: "saveTempPublish",
          payload: response,
          type: "backgroundMessageResponse",
        },
        event.origin
      );
    } catch (error) {
      event.source.postMessage(
        {
          requestId: request.requestId,
          action: "saveTempPublish",
          error: error?.message,
          type: "backgroundMessageResponse",
        },
        event.origin
      );
    }
  }

  export async function getTempPublishCase(request, event) {
    try {
      const response = await getTempPublish();
  
      event.source.postMessage(
        {
          requestId: request.requestId,
          action: "getTempPublish",
          payload: response,
          type: "backgroundMessageResponse",
        },
        event.origin
      );
    } catch (error) {
      event.source.postMessage(
        {
          requestId: request.requestId,
          action: "getTempPublish",
          error: error?.message,
          type: "backgroundMessageResponse",
        },
        event.origin
      );
    }
  }

  export async function createGroupCase(request, event) {
    try {
      const { groupName,
            groupDescription,
            groupType,
            groupApprovalThreshold,
            minBlock,
            maxBlock } = request.payload;
      const response = await createGroup({groupName,
            groupDescription,
            groupType,
            groupApprovalThreshold,
            minBlock,
            maxBlock});
  
      event.source.postMessage(
        {
          requestId: request.requestId,
          action: "createGroup",
          payload: response,
          type: "backgroundMessageResponse",
        },
        event.origin
      );
    } catch (error) {
      event.source.postMessage(
        {
          requestId: request.requestId,
          action: "createGroup",
          error: error?.message,
          type: "backgroundMessageResponse",
        },
        event.origin
      );
    }
  }

  export async function cancelInvitationToGroupCase(request, event) {
    try {
      const { groupId, qortalAddress } = request.payload;
      const response = await cancelInvitationToGroup({groupId, qortalAddress});
  
      event.source.postMessage(
        {
          requestId: request.requestId,
          action: "cancelInvitationToGroup",
          payload: response,
          type: "backgroundMessageResponse",
        },
        event.origin
      );
    } catch (error) {
      event.source.postMessage(
        {
          requestId: request.requestId,
          action: "cancelInvitationToGroup",
          error: error?.message,
          type: "backgroundMessageResponse",
        },
        event.origin
      );
    }
  }

  export async function leaveGroupCase(request, event) {
    try {
      const { groupId, qortalAddress } = request.payload;
      const response = await leaveGroup({groupId, qortalAddress});
  
      event.source.postMessage(
        {
          requestId: request.requestId,
          action: "leaveGroup",
          payload: response,
          type: "backgroundMessageResponse",
        },
        event.origin
      );
    } catch (error) {
      event.source.postMessage(
        {
          requestId: request.requestId,
          action: "leaveGroup",
          error: error?.message,
          type: "backgroundMessageResponse",
        },
        event.origin
      );
    }
  }

  export async function joinGroupCase(request, event) {
    try {
      const { groupId } = request.payload;
      const response = await joinGroup({groupId});
  
      event.source.postMessage(
        {
          requestId: request.requestId,
          action: "joinGroup",
          payload: response,
          type: "backgroundMessageResponse",
        },
        event.origin
      );
    } catch (error) {
      event.source.postMessage(
        {
          requestId: request.requestId,
          action: "joinGroup",
          error: error?.message,
          type: "backgroundMessageResponse",
        },
        event.origin
      );
    }
  }

  export async function kickFromGroupCase(request, event) {
    try {
      const { groupId, qortalAddress, rBanReason } = request.payload;
      const response = await kickFromGroup({groupId, qortalAddress, rBanReason});
  
      event.source.postMessage(
        {
          requestId: request.requestId,
          action: "kickFromGroup",
          payload: response,
          type: "backgroundMessageResponse",
        },
        event.origin
      );
    } catch (error) {
      event.source.postMessage(
        {
          requestId: request.requestId,
          action: "kickFromGroup",
          error: error?.message,
          type: "backgroundMessageResponse",
        },
        event.origin
      );
    }
  }

  export async function banFromGroupCase(request, event) {
    try {
      const { groupId, qortalAddress, rBanReason, rBanTime } = request.payload;
      const response = await banFromGroup({groupId, qortalAddress, rBanReason, rBanTime});
  
      event.source.postMessage(
        {
          requestId: request.requestId,
          action: "banFromGroup",
          payload: response,
          type: "backgroundMessageResponse",
        },
        event.origin
      );
    } catch (error) {
      event.source.postMessage(
        {
          requestId: request.requestId,
          action: "banFromGroup",
          error: error?.message,
          type: "backgroundMessageResponse",
        },
        event.origin
      );
    }
  }

  export async function addDataPublishesCase(request, event) {
    try {
      const { data, groupId, type } = request.payload;
      const response = await addDataPublishes({data, groupId, type});
  
      event.source.postMessage(
        {
          requestId: request.requestId,
          action: "addDataPublishes",
          payload: response,
          type: "backgroundMessageResponse",
        },
        event.origin
      );
    } catch (error) {
      event.source.postMessage(
        {
          requestId: request.requestId,
          action: "addDataPublishes",
          error: error?.message,
          type: "backgroundMessageResponse",
        },
        event.origin
      );
    }
  }


  export async function getDataPublishesCase(request, event) {
    try {
      const { groupId, type } = request.payload;
      const response = await getDataPublishes({groupId, type});
  
      event.source.postMessage(
        {
          requestId: request.requestId,
          action: "getDataPublishes",
          payload: response,
          type: "backgroundMessageResponse",
        },
        event.origin
      );
    } catch (error) {
      event.source.postMessage(
        {
          requestId: request.requestId,
          action: "getDataPublishes",
          error: error?.message,
          type: "backgroundMessageResponse",
        },
        event.origin
      );
    }
  }
  export async function addUserSettingsCase(request, event) {
    try {
      const { keyValue } = request.payload;
      const response = await addUserSettings({keyValue});
  
      event.source.postMessage(
        {
          requestId: request.requestId,
          action: "addUserSettings",
          payload: response,
          type: "backgroundMessageResponse",
        },
        event.origin
      );
    } catch (error) {
      event.source.postMessage(
        {
          requestId: request.requestId,
          action: "addUserSettings",
          error: error?.message,
          type: "backgroundMessageResponse",
        },
        event.origin
      );
    }
  }

  export async function getUserSettingsCase(request, event) {
    try {
      const { key } = request.payload;
      const response = await getUserSettings({key});
  
      event.source.postMessage(
        {
          requestId: request.requestId,
          action: "getUserSettings",
          payload: response,
          type: "backgroundMessageResponse",
        },
        event.origin
      );
    } catch (error) {
      event.source.postMessage(
        {
          requestId: request.requestId,
          action: "getUserSettings",
          error: error?.message,
          type: "backgroundMessageResponse",
        },
        event.origin
      );
    }
  }

  export async function cancelBanCase(request, event) {
    try {
      const { groupId, qortalAddress } = request.payload;
      const response = await cancelBan({groupId, qortalAddress});
  
      event.source.postMessage(
        {
          requestId: request.requestId,
          action: "cancelBan",
          payload: response,
          type: "backgroundMessageResponse",
        },
        event.origin
      );
    } catch (error) {
      event.source.postMessage(
        {
          requestId: request.requestId,
          action: "cancelBan",
          error: error?.message,
          type: "backgroundMessageResponse",
        },
        event.origin
      );
    }
  }

  export async function registerNameCase(request, event) {
    try {
      const { name } = request.payload;
      const response = await registerName({name});
  
      event.source.postMessage(
        {
          requestId: request.requestId,
          action: "registerName",
          payload: response,
          type: "backgroundMessageResponse",
        },
        event.origin
      );
    } catch (error) {
      event.source.postMessage(
        {
          requestId: request.requestId,
          action: "registerName",
          error: error?.message,
          type: "backgroundMessageResponse",
        },
        event.origin
      );
    }
  }

  export async function makeAdminCase(request, event) {
    try {
      const { groupId, qortalAddress } = request.payload;
      const response = await makeAdmin({groupId, qortalAddress});
  
      event.source.postMessage(
        {
          requestId: request.requestId,
          action: "makeAdmin",
          payload: response,
          type: "backgroundMessageResponse",
        },
        event.origin
      );
    } catch (error) {
      event.source.postMessage(
        {
          requestId: request.requestId,
          action: "makeAdmin",
          error: error?.message,
          type: "backgroundMessageResponse",
        },
        event.origin
      );
    }
  }

  export async function removeAdminCase(request, event) {
    try {
      const { groupId, qortalAddress } = request.payload;
      const response = await removeAdmin({groupId, qortalAddress});
  
      event.source.postMessage(
        {
          requestId: request.requestId,
          action: "removeAdmin",
          payload: response,
          type: "backgroundMessageResponse",
        },
        event.origin
      );
    } catch (error) {
      event.source.postMessage(
        {
          requestId: request.requestId,
          action: "removeAdmin",
          error: error?.message,
          type: "backgroundMessageResponse",
        },
        event.origin
      );
    }
  }

  export async function notificationCase(request, event) {
    try {
        const notificationId = "chat_notification_" + Date.now(); // Create a unique ID

        chrome.notifications.create(notificationId, {
          type: "basic",
          iconUrl: "qort.png", // Add an appropriate icon for chat notifications
          title: "New Group Message!",
          message: "You have received a new message from one of your groups",
          priority: 2, // Use the maximum priority to ensure it's noticeable
          // buttons: [
          //   { title: 'Go to group' }
          // ]
        });
        // Set a timeout to clear the notification after 'timeout' milliseconds
        setTimeout(() => {
          chrome.notifications.clear(notificationId);
        }, 3000);
  
      event.source.postMessage(
        {
          requestId: request.requestId,
          action: "notification",
          payload: true,
          type: "backgroundMessageResponse",
        },
        event.origin
      );
    } catch (error) {
      event.source.postMessage(
        {
          requestId: request.requestId,
          action: "notification",
          error: "Error displaying notifaction",
          type: "backgroundMessageResponse",
        },
        event.origin
      );
    }
  }

  export async function addTimestampEnterChatCase(request, event) {
    try {
      const { groupId, timestamp } = request.payload;
      const response = await addTimestampEnterChat({groupId, timestamp});
  
      event.source.postMessage(
        {
          requestId: request.requestId,
          action: "addTimestampEnterChat",
          payload: response,
          type: "backgroundMessageResponse",
        },
        event.origin
      );
    } catch (error) {
      event.source.postMessage(
        {
          requestId: request.requestId,
          action: "addTimestampEnterChat",
          error: error?.message,
          type: "backgroundMessageResponse",
        },
        event.origin
      );
    }
  }

  export async function setApiKeyCase(request, event) {
    try {
      const payload = request.payload;
      chrome.storage.local.set({ apiKey: payload }, () => {
        // sendResponse(true);
      });
  
      event.source.postMessage(
        {
          requestId: request.requestId,
          action: "setApiKey",
          payload: true,
          type: "backgroundMessageResponse",
        },
        event.origin
      );
    } catch (error) {
      event.source.postMessage(
        {
          requestId: request.requestId,
          action: "setApiKey",
          error: error?.message,
          type: "backgroundMessageResponse",
        },
        event.origin
      );
    }
  }
  export async function setCustomNodesCase(request, event) {
    try {
      const nodes = request.payload;
      chrome.storage.local.set({ customNodes: nodes }, () => {
        // sendResponse(true);
      });
  
      event.source.postMessage(
        {
          requestId: request.requestId,
          action: "setCustomNodes",
          payload: true,
          type: "backgroundMessageResponse",
        },
        event.origin
      );
    } catch (error) {
      event.source.postMessage(
        {
          requestId: request.requestId,
          action: "setCustomNodes",
          error: error?.message,
          type: "backgroundMessageResponse",
        },
        event.origin
      );
    }
  }

  export async function getApiKeyCase(request, event) {
    try {
        const response = await getApiKeyFromStorage();

  
      event.source.postMessage(
        {
          requestId: request.requestId,
          action: "getApiKey",
          payload: response,
          type: "backgroundMessageResponse",
        },
        event.origin
      );
    } catch (error) {
      event.source.postMessage(
        {
          requestId: request.requestId,
          action: "getApiKey",
          error: error?.message,
          type: "backgroundMessageResponse",
        },
        event.origin
      );
    }
  }

  export async function getCustomNodesFromStorageCase(request, event) {
    try {
        const response = await getCustomNodesFromStorage();

  
      event.source.postMessage(
        {
          requestId: request.requestId,
          action: "getCustomNodesFromStorage",
          payload: response,
          type: "backgroundMessageResponse",
        },
        event.origin
      );
    } catch (error) {
      event.source.postMessage(
        {
          requestId: request.requestId,
          action: "getCustomNodesFromStorage",
          error: error?.message,
          type: "backgroundMessageResponse",
        },
        event.origin
      );
    }
  }

  export async function notifyAdminRegenerateSecretKeyCase(request, event) {
    try {
        const { groupName, adminAddress } = request.payload;
        const response = await notifyAdminRegenerateSecretKey({groupName, adminAddress});
  
      event.source.postMessage(
        {
          requestId: request.requestId,
          action: "notifyAdminRegenerateSecretKey",
          payload: response,
          type: "backgroundMessageResponse",
        },
        event.origin
      );
    } catch (error) {
      event.source.postMessage(
        {
          requestId: request.requestId,
          action: "notifyAdminRegenerateSecretKey",
          error: error?.message,
          type: "backgroundMessageResponse",
        },
        event.origin
      );
    }
  }

  export async function addGroupNotificationTimestampCase(request, event) {
    try {
        const { groupId, timestamp } = request.payload;
        const response = await addTimestampGroupAnnouncement({groupId, timestamp});
  
      event.source.postMessage(
        {
          requestId: request.requestId,
          action: "addGroupNotificationTimestamp",
          payload: response,
          type: "backgroundMessageResponse",
        },
        event.origin
      );
    } catch (error) {
      event.source.postMessage(
        {
          requestId: request.requestId,
          action: "addGroupNotificationTimestamp",
          error: error?.message,
          type: "backgroundMessageResponse",
        },
        event.origin
      );
    }
  }

  export async function clearAllNotificationsCase(request, event) {
    try {
        await clearAllNotifications();
  
      event.source.postMessage(
        {
          requestId: request.requestId,
          action: "clearAllNotifications",
          payload: true,
          type: "backgroundMessageResponse",
        },
        event.origin
      );
    } catch (error) {
      event.source.postMessage(
        {
          requestId: request.requestId,
          action: "clearAllNotifications",
          error: error?.message,
          type: "backgroundMessageResponse",
        },
        event.origin
      );
    }
  }

  export async function setGroupDataCase(request, event) {
    try {
        const { groupId, secretKeyData, secretKeyResource, admins } = request.payload;
        const response = await setGroupData({groupId, secretKeyData, secretKeyResource, admins});
  
      event.source.postMessage(
        {
          requestId: request.requestId,
          action: "setGroupData",
          payload: response,
          type: "backgroundMessageResponse",
        },
        event.origin
      );
    } catch (error) {
      event.source.postMessage(
        {
          requestId: request.requestId,
          action: "setGroupData",
          error: error?.message,
          type: "backgroundMessageResponse",
        },
        event.origin
      );
    }
  }

  export async function getGroupDataSingleCase(request, event) {
    try {
        const { groupId } = request.payload;
        const response = await getGroupDataSingle({groupId});
  
      event.source.postMessage(
        {
          requestId: request.requestId,
          action: "getGroupDataSingle",
          payload: response,
          type: "backgroundMessageResponse",
        },
        event.origin
      );
    } catch (error) {
      event.source.postMessage(
        {
          requestId: request.requestId,
          action: "getGroupDataSingle",
          error: error?.message,
          type: "backgroundMessageResponse",
        },
        event.origin
      );
    }
  }

  export async function getTimestampEnterChatCase(request, event) {
    try {
       const response = await getTimestampEnterChat();
  
      event.source.postMessage(
        {
          requestId: request.requestId,
          action: "getTimestampEnterChat",
          payload: response,
          type: "backgroundMessageResponse",
        },
        event.origin
      );
    } catch (error) {
      event.source.postMessage(
        {
          requestId: request.requestId,
          action: "getTimestampEnterChat",
          error: error?.message,
          type: "backgroundMessageResponse",
        },
        event.origin
      );
    }
  }


  export async function getGroupNotificationTimestampCase(request, event) {
    try {
       const response = await getTimestampGroupAnnouncement();
  
      event.source.postMessage(
        {
          requestId: request.requestId,
          action: "getGroupNotificationTimestamp",
          payload: response,
          type: "backgroundMessageResponse",
        },
        event.origin
      );
    } catch (error) {
      event.source.postMessage(
        {
          requestId: request.requestId,
          action: "getGroupNotificationTimestamp",
          error: error?.message,
          type: "backgroundMessageResponse",
        },
        event.origin
      );
    }
  }