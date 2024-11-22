import React, { useCallback, useState, useEffect, useRef, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { MessageItem } from './MessageItem';
import { subscribeToEvent, unsubscribeFromEvent } from '../../utils/events';
import { useInView } from 'react-intersection-observer'

export const ChatList = ({ initialMessages, myAddress, tempMessages, chatId, onReply, handleReaction, chatReferences, tempChatReferences }) => {
  const parentRef = useRef();
  const [messages, setMessages] = useState(initialMessages);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const hasLoadedInitialRef = useRef(false);
  const [showScrollDownButton, setShowScrollDownButton] = useState(false);

  const scrollingIntervalRef = useRef(null);

  // Initialize the virtualizer
  const rowVirtualizer = useVirtualizer({
    count: messages.length,
    getItemKey: (index) => messages[index].signature,
    getScrollElement: () => parentRef?.current,
    estimateSize: () => 80, // Provide an estimated height of items, adjust this as needed
    overscan: 10, // Number of items to render outside the visible area to improve smoothness
  });

  const isAtBottom = useMemo(()=> {
    if (parentRef.current && rowVirtualizer?.isScrolling !== undefined) {
      const { scrollTop, scrollHeight, clientHeight } = parentRef.current;
    const atBottom = scrollTop + clientHeight >= scrollHeight - 10; // Adjust threshold as needed
   return atBottom
  }

  return false

  }, [rowVirtualizer?.isScrolling])

  useEffect(() => {
    if (!parentRef.current || rowVirtualizer?.isScrolling === undefined) return;
    if(isAtBottom){
      if (scrollingIntervalRef.current) {
        clearTimeout(scrollingIntervalRef.current);
      }
      setShowScrollDownButton(false);
      return;
    } else
    if (rowVirtualizer?.isScrolling) {
      if (scrollingIntervalRef.current) {
        clearTimeout(scrollingIntervalRef.current);
      }
      setShowScrollDownButton(false);
      return;
    }
    const { scrollTop, scrollHeight, clientHeight } = parentRef.current;
    const atBottom = scrollHeight - scrollTop - clientHeight <= 300;
    if (!atBottom) {
      scrollingIntervalRef.current = setTimeout(() => {
        setShowScrollDownButton(true);
      }, 250);
    } else {
      setShowScrollDownButton(false);
    }
  }, [rowVirtualizer?.isScrolling, isAtBottom]);
  
  // Update message list with unique signatures and tempMessages
  useEffect(() => {
    let uniqueInitialMessagesMap = new Map();

    // Only add a message if it doesn't already exist in the Map
    initialMessages.forEach((message) => {
      if (!uniqueInitialMessagesMap.has(message.signature)) {
        uniqueInitialMessagesMap.set(message.signature, message);
      }
    });

    const uniqueInitialMessages = Array.from(uniqueInitialMessagesMap.values()).sort(
      (a, b) => a.timestamp - b.timestamp
    );
    const totalMessages = [...uniqueInitialMessages, ...(tempMessages || [])];

    if (totalMessages.length === 0) return;

    setMessages(totalMessages);

    setTimeout(() => {
      const hasUnreadMessages = totalMessages.some((msg) => msg.unread && !msg?.chatReference && !msg?.isTemp);
      if (parentRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = parentRef.current;
      const atBottom = scrollTop + clientHeight >= scrollHeight - 10; // Adjust threshold as needed
        if (!atBottom && hasUnreadMessages) {
          setShowScrollButton(hasUnreadMessages);
          setShowScrollDownButton(false)

        } else {
          handleMessageSeen();
        }
      }
      if (!hasLoadedInitialRef.current) {
        const findDivideIndex = totalMessages.findIndex((item)=> !!item?.divide)
        const divideIndex = findDivideIndex !== -1 ? findDivideIndex : undefined
        scrollToBottom(totalMessages, divideIndex);
        hasLoadedInitialRef.current = true;
      }
    }, 500);
  }, [initialMessages, tempMessages]);

  const scrollToBottom = (initialMsgs, divideIndex) => {
    const index = initialMsgs ? initialMsgs.length - 1 : messages.length - 1;
    if (rowVirtualizer) {
      if(divideIndex){
        rowVirtualizer.scrollToIndex(divideIndex, { align: 'start' })
      } else {
        rowVirtualizer.scrollToIndex(index, { align: 'end' })

      }
    }
    handleMessageSeen()
  };


  const handleMessageSeen = useCallback(() => {
    setMessages((prevMessages) =>
      prevMessages.map((msg) => ({
        ...msg,
        unread: false,
      }))
    );
    setShowScrollButton(false)
  }, []);

  // const scrollToBottom = (initialMsgs) => {
  //   const index = initialMsgs ? initialMsgs.length - 1 : messages.length - 1;
  //   if (parentRef.current) {
  //     parentRef.current.scrollToIndex(index);
  //   }
  // };



  const sentNewMessageGroupFunc = useCallback(() => {
    const { scrollHeight, scrollTop, clientHeight } = parentRef.current;
  
    // Check if the user is within 200px from the bottom
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    if (distanceFromBottom <= 700) {
      scrollToBottom();
    }
  }, [messages]);
  

  useEffect(() => {
    subscribeToEvent('sent-new-message-group', sentNewMessageGroupFunc);
    return () => {
      unsubscribeFromEvent('sent-new-message-group', sentNewMessageGroupFunc);
    };
  }, [sentNewMessageGroupFunc]);

  const lastSignature = useMemo(()=> {
    if(!messages || messages?.length === 0) return null
    const lastIndex = messages.length - 1
    return messages[lastIndex]?.signature
  }, [messages])







  const goToMessageFunc = useCallback((e)=> {
    if(e.detail?.index){
      rowVirtualizer.scrollToIndex(e.detail?.index)

    }
   }, [])

 

  useEffect(() => {
    subscribeToEvent('goToMessage', goToMessageFunc);
    return () => {
      unsubscribeFromEvent('goToMessage', goToMessageFunc);
    };
  }, [goToMessageFunc]);

  return (
<div style={{
  height: '100%',
  position: 'relative',
  display: 'flex',
  flexDirection: 'column'
}}>
     <div
        ref={parentRef}
        className="List"
        style={{ flexGrow: 1, overflow: 'auto', position: 'relative', display: 'flex', height: '0px' }}
      >
        <div
          style={{
            height: rowVirtualizer.getTotalSize(),
            width: '100%',
         
          }}
        >
       <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              // transform: `translateY(${rowVirtualizer.getVirtualItems()[0]?.start ?? 0}px)`,
            }}
          >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const index = virtualRow.index;
          let message = messages[index];
          let replyIndex = messages.findIndex((msg) => msg?.signature === message?.repliedTo);
          let reply;
          let reactions = null;

          if (message?.repliedTo && replyIndex !== -1) {
            reply = messages[replyIndex];
          }

          if (message?.message && message?.groupDirectId) {
            replyIndex = messages.findIndex((msg) => msg?.signature === message?.message?.repliedTo);
            if (message?.message?.repliedTo && replyIndex !== -1) {
              reply = messages[replyIndex];
            }
            message = {
              ...(message?.message || {}),
              isTemp: true,
              unread: false,
              status: message?.status
            };
          }

          if (chatReferences && chatReferences[message?.signature]) {
            if (chatReferences[message.signature]?.reactions) {
              reactions = chatReferences[message.signature]?.reactions;
            }
          }

          let isUpdating = false;
          if (tempChatReferences && tempChatReferences?.find((item) => item?.chatReference === message?.signature)) {
            isUpdating = true;
          }

          return (
            <div
            data-index={virtualRow.index} //needed for dynamic row height measurement
            ref={node => rowVirtualizer.measureElement(node)} //measure dynamic row height
              key={message.signature}
              style={{
                position: 'absolute',
                top: 0,
                left: '50%', // Move to the center horizontally
                transform: `translateY(${virtualRow.start}px) translateX(-50%)`, // Adjust for centering
                width: '100%', // Control width (90% of the parent)
                padding: '10px 0',
                display: 'flex',
                alignItems: 'center',
                overscrollBehavior: 'none',
                flexDirection: 'column',
                gap: '5px'
              }}
            >
              <MessageItem
                isLast={index === messages.length - 1}
                lastSignature={lastSignature}
                message={message}
                onSeen={handleMessageSeen}
                isTemp={!!message?.isTemp}
                myAddress={myAddress}
                onReply={onReply}
                reply={reply}
                replyIndex={replyIndex}
                scrollToItem={(idx) => rowVirtualizer.scrollToIndex(idx)}
                handleReaction={handleReaction}
                reactions={reactions}
                isUpdating={isUpdating}
              />
            </div>
          );
        })}
      </div>
      </div>
      
    </div>
    {showScrollButton && (
      <button
        onClick={() => scrollToBottom()}
        style={{
          position: 'absolute',
          bottom: 20,
          right: 20,
          backgroundColor: 'var(--unread)',
          color: 'white',
          padding: '10px 20px',
          borderRadius: '20px',
          cursor: 'pointer',
          zIndex: 10,
          border: 'none',
          outline: 'none'
        }}
      >
        Scroll to Unread Messages
      </button>
    )}
       {showScrollDownButton &&  (
      <button
        onClick={() => scrollToBottom()}
        style={{
          bottom:  20,
          position: 'absolute',
          right: 20,
          backgroundColor: 'var(--Mail-Background)',
          color: 'white',
          padding: '10px 20px',
          borderRadius: '20px',
          cursor: 'pointer',
          zIndex: 10,
          border: 'none',
          outline: 'none',
          fontSize: '16px'
        }}
      >
        Scroll to bottom
      </button>
    )}
   </div>
 
  );
};
