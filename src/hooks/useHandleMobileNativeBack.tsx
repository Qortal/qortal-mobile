import React, { useCallback, useEffect } from 'react'
import { subscribeToEvent, unsubscribeFromEvent } from '../utils/events';

export const useHandleMobileNativeBack = ({mobileViewMode, goToHome, setMobileViewMode}) => {


    const handleMobileNativeBackFunc = useCallback((e) => {
       if(mobileViewMode === 'groups'){
        goToHome()
       } else if(mobileViewMode === "group"){
        setMobileViewMode('groups')
       }
      }, [mobileViewMode]);
    
      useEffect(() => {
        subscribeToEvent("handleMobileNativeBack", handleMobileNativeBackFunc);
    
        return () => {
          unsubscribeFromEvent("handleMobileNativeBack", handleMobileNativeBackFunc);
        };
      }, [handleMobileNativeBackFunc]);
  return null
}
