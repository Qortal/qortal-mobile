import React, { useCallback, useEffect, useState } from "react";
import { saveToLocalStorage } from "../Apps/AppsNavBar";
import { getData, storeData } from "../../utils/chromeStorage";

import creationImg from './img/creation.webp'
import dashboardImg from './img/dashboard.webp'
import groupsImg from './img/groups.webp'
import importantImg from './img/important.webp'
import navigationImg from './img/navigation.webp'
import overviewImg from './img/overview.webp'
import startedImg from './img/started.webp'

const checkIfGatewayIsOnline = async () => {
    try {
      const url = `https://ext-node.qortal.link/admin/status`;
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });
      const data = await response.json();
      if (data?.height) {
        return true
      }
      return false
      
    } catch (error) {
      return false
      
    } 
  }
export const useHandleTutorials = () => {
  const [openTutorialModal, setOpenTutorialModal] = useState<any>(null);
const [shownTutorials, setShowTutorials] = useState(null)


useEffect(()=> {
    const getSavedData = async()=> {
      try {
        const storedData = await getData<any>("shown-tutorials").catch(() => {});


    if (storedData) {
      setShowTutorials(storedData);
    } else {
        setShowTutorials({})
    }
    } catch (error) {
        //error
    }
    }
    getSavedData()
}, [])

  const saveShowTutorial = useCallback(async (type)=> {
    try {

        setShowTutorials((prev)=> {
            return {
                ...(prev || {}),
                [type]: true
            }
        })
        const storedData = await getData<any>("shown-tutorials").catch(() => {});
        const newData = {
          ...storedData,
          [type]: true
        }
        await storeData("shown-tutorials", newData)
    } catch (error) {
        //error
    }
  }, [])
  const showTutorial = useCallback(async (type, isForce) => {
    try {
        const isOnline = await checkIfGatewayIsOnline()
        if(!isOnline) return
        switch (type) {
            case "create-account":
              {
                  if((shownTutorials || {})['create-account'] && !isForce) return
                  saveShowTutorial('create-account')
                setOpenTutorialModal({
                  title: "Account Creation",
                  resource: {
                    name: "a-test",
                    service: "VIDEO",
                    identifier: "account-creation-go",
                    poster: creationImg
                  },
                });
              }
              break;
            case "important-information":
              {
                  if((shownTutorials || {})['important-information'] && !isForce) return
                  saveShowTutorial('important-information')

                setOpenTutorialModal({
                  title: "Important Information!",
                  resource: {
                    name: "a-test",
                    service: "VIDEO",
                    identifier: "important-information-go",
                    poster: importantImg
                  },
                });
              }
              break;
            case "getting-started":
              {

                  if((shownTutorials || {})['getting-started'] && !isForce) return
                  saveShowTutorial('getting-started')

                setOpenTutorialModal({
                  multi: [
                   
                    {
                      title: "1. Getting Started",
                      resource: {
                        name: "a-test",
                        service: "VIDEO",
                        identifier: "getting-started-go",
                        poster: startedImg
                      },
                    },
                    {
                        title: "2. Overview",
                        resource: {
                          name: "a-test",
                          service: "VIDEO",
                          identifier: "overview-go",
                          poster: overviewImg
                        },
                      },
                    {
                      title: "3. Qortal Groups",
                      resource: {
                        name: "a-test",
                        service: "VIDEO",
                        identifier: "groups-go",
                        poster: groupsImg
                      },
                    },
                  ],
                });
              }
              break;
              case "qapps":
                  {
                      if((shownTutorials || {})['qapps'] && !isForce) return
                      saveShowTutorial('qapps')

                    setOpenTutorialModal({
                      multi: [
                        {
                          title: "1. Apps Dashboard",
                          resource: {
                            name: "a-test",
                            service: "VIDEO",
                            identifier: "apps-dashboard-go",
                            poster: dashboardImg
                          },
                        },
                        {
                          title: "2. Apps Navigation",
                          resource: {
                            name: "a-test",
                            service: "VIDEO",
                            identifier: "apps-navigation-go",
                            poster: navigationImg
                          },
                        }
                       
                      ],
                    });
                  }
                  break;
            default:
              break;
          }
    } catch (error) {
        //error
    }
  }, [shownTutorials]);
  return {
    showTutorial,
    openTutorialModal,
    setOpenTutorialModal,
    shownTutorialsInitiated: !!shownTutorials
  };
};
