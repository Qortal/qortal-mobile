import {
    cancelInvitationToGroup,
    createGroup,
  decryptWallet,
  findUsableApi,
  getBalanceInfo,
  getKeyPair,
  getLTCBalance,
  getNameInfo,
  getTempPublish,
  getUserInfo,
  inviteToGroup,
  leaveGroup,
  saveTempPublish,
  sendCoin,
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