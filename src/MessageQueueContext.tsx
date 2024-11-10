import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import ShortUniqueId from "short-unique-id";

const MessageQueueContext = createContext(null);

export const useMessageQueue = () => useContext(MessageQueueContext);

const uid = new ShortUniqueId({ length: 8 });
let messageQueue = []; // Global message queue

export const MessageQueueProvider = ({ children }) => {
  const [queueChats, setQueueChats] = useState({}); // Stores chats and status for display
  const isProcessingRef = useRef(false); // To track if the queue is being processed
  const maxRetries = 3;
  const clearStatesMessageQueueProvider = useCallback(() => {
    setQueueChats({});
    messageQueue = [];
    isProcessingRef.current = false;
  }, []);

  // Function to add a message to the queue
  const addToQueue = useCallback((sendMessageFunc, messageObj, type, groupDirectId) => {
    const tempId = uid.rnd();
    const chatData = {
      ...messageObj,
      type,
      groupDirectId,
      identifier: tempId,
      retries: 0, // Retry count for display purposes
      status: 'pending' // Initial status is 'pending'
    };

    // Add chat data to queueChats for status tracking
    setQueueChats((prev) => ({
      ...prev,
      [groupDirectId]: [...(prev[groupDirectId] || []), chatData]
    }));

    // Add the message to the global messageQueue
    messageQueue = [
      ...messageQueue,
      { func: sendMessageFunc, identifier: tempId, groupDirectId, specialId: messageObj?.message?.specialId }
    ];

    // Start processing the queue if not already processing
    processQueue([], groupDirectId);
  }, []);

  // Method to process with new messages and groupDirectId
  const processWithNewMessages = (newMessages, groupDirectId) => {
    processQueue(newMessages, groupDirectId);
  };

  // Function to process the messageQueue and handle new messages
  const processQueue = useCallback(async (newMessages = [], groupDirectId) => {
    // Filter out any message in the queue that matches the specialId from newMessages
    messageQueue = messageQueue.filter((msg) => {
      return !newMessages.some(newMsg => newMsg?.specialId === msg?.specialId);
    });

    // Remove any corresponding entries in queueChats for the provided groupDirectId
    setQueueChats((prev) => {
      const updatedChats = { ...prev };
      if (updatedChats[groupDirectId]) {
        // Remove any message in queueChats that has a matching specialId
        updatedChats[groupDirectId] = updatedChats[groupDirectId].filter((chat) => {
      
          return !newMessages.some(newMsg => newMsg?.specialId === chat?.message?.specialId);
        });


        updatedChats[groupDirectId] = updatedChats[groupDirectId].filter((chat) => {
          return chat?.status !== 'failed-permanent'
        });

        // If no more chats for this group, delete the groupDirectId entry
        if (updatedChats[groupDirectId].length === 0) {
          delete updatedChats[groupDirectId];
        }
      }
      return updatedChats;
    });

    // If currently processing or the queue is empty, return
    if (isProcessingRef.current || messageQueue.length === 0) return;
  
    isProcessingRef.current = true; // Lock the queue for processing
  
    while (messageQueue.length > 0) {
      const currentMessage = messageQueue[0]; // Get the first message in the queue
      const { groupDirectId, identifier } = currentMessage;
  
      // Update the chat status to 'sending'
      setQueueChats((prev) => {
        const updatedChats = { ...prev };
        if (updatedChats[groupDirectId]) {
          const chatIndex = updatedChats[groupDirectId].findIndex(
            (item) => item.identifier === identifier
          );
          if (chatIndex !== -1) {
            updatedChats[groupDirectId][chatIndex].status = 'sending';
          }
        }
        return updatedChats;
      });
  
      try {
        // Execute the function stored in the messageQueue
        await currentMessage.func();
     
        // Remove the message from the messageQueue after successful sending
        messageQueue = messageQueue.slice(1); // Slice here remains for successful messages
  
        // Remove the message from queueChats after success
        // setQueueChats((prev) => {
        //   const updatedChats = { ...prev };
        //   updatedChats[groupDirectId] = updatedChats[groupDirectId].filter(
        //     (item) => item.identifier !== identifier
        //   );
        //   return updatedChats;
        // });
      } catch (error) {
        console.error('Message sending failed', error);
  
        // Retry logic
        setQueueChats((prev) => {
          const updatedChats = { ...prev };
          const chatIndex = updatedChats[groupDirectId]?.findIndex(
            (item) => item.identifier === identifier
          );
          if (chatIndex !== -1) {
            const retries = updatedChats[groupDirectId][chatIndex].retries;
            if (retries < maxRetries) {
              // Increment retry count and set status to 'failed'
              updatedChats[groupDirectId][chatIndex].retries += 1;
              updatedChats[groupDirectId][chatIndex].status = 'failed';
            } else {
              // Max retries reached, set status to 'failed-permanent'
              updatedChats[groupDirectId][chatIndex].status = 'failed-permanent';
  
              // Remove the message from the messageQueue after max retries
              messageQueue = messageQueue.slice(1); // Slice for failed messages after max retries
  
              // Remove the message from queueChats after failure
              // updatedChats[groupDirectId] = updatedChats[groupDirectId].filter(
              //   (item) => item.identifier !== identifier
              // );
            }
          }
          return updatedChats;
        });
      }
  
      // Delay between processing each message to avoid overlap
      await new Promise((res) => setTimeout(res, 5000));
    }
  
    // Reset the processing lock once all messages are processed
    isProcessingRef.current = false;
  }, []);
  
  return (
    <MessageQueueContext.Provider value={{ addToQueue, queueChats, clearStatesMessageQueueProvider, processWithNewMessages }}>
      {children}
    </MessageQueueContext.Provider>
  );
};
