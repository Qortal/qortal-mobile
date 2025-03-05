import { Button } from '@mui/material';
import { useEffect, useState } from 'react';

export const InstallPWA = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallButton, setShowInstallButton] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if app is already installed
    if (window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone) {
      setIsStandalone(true);
      return;
    }

    // Restore install prompt if previously stored
    const wasPromptAvailable = localStorage.getItem("pwaPromptAvailable");
    if (wasPromptAvailable === "true") {
      setShowInstallButton(true);
    }

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault(); // Prevent automatic prompt
      setDeferredPrompt(e);
      setShowInstallButton(true);
      localStorage.setItem("pwaPromptAvailable", "true"); // Remember install prompt was available
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);
  const handleInstallClick = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === "accepted") {
          console.log("User accepted the install prompt");
          localStorage.removeItem("pwaPromptAvailable"); // Remove stored prompt
          setShowInstallButton(false);
        } else {
          console.log("User dismissed the install prompt");
          setShowInstallButton(true); // Keep showing button
        }
        setDeferredPrompt(null);
      });
    }
  };

  return (
    <div>
      {!isStandalone && showInstallButton && (
        <Button size="small" sx={{
          position: 'fixed',
          top: '10px',
          left: '10px'
        }} variant="contained" onClick={handleInstallClick}>Install App</Button>
      )}
    </div>
  );
};