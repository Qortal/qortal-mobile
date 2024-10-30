export async function handleGetFileFromIndexedDB(event) {
    try {
      const { fileId, requestId } = event.data;
      const db = await openIndexedDB();
      const transaction = db.transaction(["files"], "readonly");
      const objectStore = transaction.objectStore("files");
  
      const getRequest = objectStore.get(fileId);
  
      getRequest.onsuccess = async function (event) {
        if (getRequest.result) {
          const file = getRequest.result.data;
  
          try {
            const base64String = await fileToBase64(file);
  
            // Create a new transaction to delete the file
            const deleteTransaction = db.transaction(["files"], "readwrite");
            const deleteObjectStore = deleteTransaction.objectStore("files");
            const deleteRequest = deleteObjectStore.delete(fileId);
  
            deleteRequest.onsuccess = function () {
              try {
               
                window.postMessage(
                  { action: "getFileFromIndexedDBResponse", requestId, result: base64String },
                  "*"
                );
              } catch (error) {
                console.log('error', error)
              }
            };
  
            deleteRequest.onerror = function () {
              console.error(`Error deleting file with ID ${fileId} from IndexedDB`);
            
            };
          } catch (error) {
            console.error("Error converting file to Base64:", error);
            event.ports[0].postMessage({
              result: null,
              error: "Failed to convert file to Base64",
            });
            window.postMessage(
              { action: "getFileFromIndexedDBResponse", requestId, result: null,
              error: "Failed to convert file to Base64"
             },
              "*"
            );
          }
        } else {
          console.error(`File with ID ${fileId} not found in IndexedDB`);
      
          window.postMessage(
            { action: "getFileFromIndexedDBResponse", requestId, result: null,
            error: 'File not found in IndexedDB'
           },
            "*"
          );
        }
      };
  
      getRequest.onerror = function () {
        console.error(`Error retrieving file with ID ${fileId} from IndexedDB`);
  
        event.source.postMessage(
          { action: "getFileFromIndexedDBResponse", requestId, result: null,
          error: 'Error retrieving file from IndexedDB'
         },
          event.origin
        );
      };
    } catch (error) {
      const {  requestId } = event.data;
      console.error("Error opening IndexedDB:", error);
      event.source.postMessage(
        { action: "getFileFromIndexedDBResponse", requestId, result: null,
        error: 'Error opening IndexedDB'
       },
        event.origin
      );
    } 
  }