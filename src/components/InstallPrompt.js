import { useState, useEffect } from 'react';

function InstallPrompt() {
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if the device is an iOS device.
    setIsIOS(
      /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream
    );

    // Check if the app is already running in standalone mode.
    setIsStandalone(window.matchMedia('(display-mode: standalone)').matches);
  }, []);

  if (isStandalone) {
    return null; // If already installed, don't show the prompt.
  }

  return (
    <div>
      <h3>Install App</h3>
      <button>Add to Home Screen</button>
      {isIOS && (
        <p>
          To install this app on your iOS device, tap the share button
          <span role="img" aria-label="share icon"> ⎋ </span>
          and then "Add to Home Screen"
          <span role="img" aria-label="plus icon"> ➕ </span>.
        </p>
      )}
    </div>
  );
}

export default InstallPrompt;
