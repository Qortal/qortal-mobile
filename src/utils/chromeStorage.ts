

export const storeData = (key: string, payload: any): Promise<string> => {
    return new Promise((resolve, reject) => {
      try {
        localStorage.setItem(key, JSON.stringify(payload));
        resolve("Data saved successfully");
      } catch (error) {
        reject(new Error("Error saving data"));
      }
    });
  };
  
  export const getData = <T = any>(key: string): Promise<T> => {
    return new Promise((resolve, reject) => {
      try {
        const data = localStorage.getItem(key);
        if (data) {
          resolve(JSON.parse(data) as T);
        } else {
          reject(new Error(`No data found for key: ${key}`));
        }
      } catch (error) {
        reject(new Error("Error retrieving data"));
      }
    });
  };
  

  export async function removeKeysAndLogout(
    keys: string[],
    event: MessageEvent,
    request: any
  ) {
    try {
      // Remove each key from localStorage
      keys.forEach((key) => localStorage.removeItem(key));
  
   
      // Send a response back to indicate successful logout
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
  
