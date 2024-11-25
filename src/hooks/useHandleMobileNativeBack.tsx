import React, { useCallback, useEffect } from 'react'
import { subscribeToEvent, unsubscribeFromEvent } from '../utils/events';
import { useRecoilState } from 'recoil';
import { isFocusedParentDirectAtom, isFocusedParentGroupAtom } from '../atoms/global';

export const useHandleMobileNativeBack = ({mobileViewMode, goToHome, setMobileViewMode, mobileViewModeKeepOpen, selectedDirect, newChat, setMobileViewModeKeepOpen, setSelectedDirect, setNewChat}) => {
  const [isFocusedParent, setIsFocusedParent] =  useRecoilState(
    isFocusedParentGroupAtom
  );
  const [isFocusedParentDirect, setIsFocusedParentDirect] =  useRecoilState(
    isFocusedParentDirectAtom
  );

    const handleMobileNativeBackFunc = useCallback((e) => {
      if(mobileViewModeKeepOpen === 'messaging'){
        if(!selectedDirect && !newChat){
          setMobileViewModeKeepOpen("")
        }
        else if(selectedDirect || newChat){
          if(isFocusedParentDirect){
            setIsFocusedParentDirect(false)
            return
          }
          setSelectedDirect(null)
          setNewChat(false)
        }
        return
      }
       if(mobileViewMode === 'groups'){
        goToHome()
       } else if(mobileViewMode === "group"){
        if(isFocusedParent){
          setIsFocusedParent(false)
          return
        }
        setMobileViewMode('groups')
       }
      }, [mobileViewMode, isFocusedParent, mobileViewModeKeepOpen, newChat, selectedDirect, isFocusedParentDirect]);
    
      useEffect(() => {
        subscribeToEvent("handleMobileNativeBack", handleMobileNativeBackFunc);
    
        return () => {
          unsubscribeFromEvent("handleMobileNativeBack", handleMobileNativeBackFunc);
        };
      }, [handleMobileNativeBackFunc]);
  return null
}
