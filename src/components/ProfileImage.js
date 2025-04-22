import { useState, useEffect, memo } from "react";
import { FiUser } from "react-icons/fi";

const ProfileImage = memo(function ProfileImage({ src, size = 32 }) {
  const [dataUrl, setDataUrl] = useState(() => {
    if (typeof window === "undefined") return null;
    const lastUrl  = sessionStorage.getItem("avatar:lastUrl");
    const lastData = sessionStorage.getItem("avatar:lastData");
    return lastUrl === src && lastData ? lastData : null;
  });
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    if (!src) {
      setDataUrl(null);
      sessionStorage.removeItem("avatar:lastUrl");
      sessionStorage.removeItem("avatar:lastData");
      return;
    }
    
    // If already cached, don't re-fetch
    if (sessionStorage.getItem("avatar:lastUrl") === src && sessionStorage.getItem("avatar:lastData")) {
      // For debugging:
    //   console.log("Using cached avatar");
      setDataUrl(sessionStorage.getItem("avatar:lastData"));
      return;
    }

    let cancelled = false;
    fetch(src)
      .then(res => {
        if (!res.ok) throw new Error("Network response was not ok");
        return res.blob();
      })
      .then(blob =>
        new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        })
      )
      .then(data => {
        if (cancelled) return;
        // Save to state and to sessionStorage
        setDataUrl(data);
        try {
          sessionStorage.setItem("avatar:lastUrl", src);
          sessionStorage.setItem("avatar:lastData", data);
          console.log("Avatar cached successfully");
        } catch (err) {
          console.warn("Failed to write to sessionStorage", err);
        }
      })
      .catch(err => {
        if (!cancelled) {
          console.log("Failed to load avatar:", err);
        //   console.error("Failed to load avatar:", err);
          setErrored(true);
        }
      });

    return () => { cancelled = true; };
  }, [src]);

  // If there’s no src or an error occurred, show the FiUser icon
  if (!src || errored) {
    return <FiUser size={size} style={{ display: "flex" }} />;
  }
  
  // While fetching, show the icon as a placeholder
  if (!dataUrl) {
    return <FiUser size={size} style={{ display: "flex" }} />;
  }

  // Finally, show the image with your inline styles intact
  return (
    <img
      src={dataUrl}
      alt="avatar"
      width={size}
      height={size}
      style={{
        borderRadius: "50%",
        objectFit: "cover",
        display: "flex",
      }}
      onError={() => setErrored(true)}
    />
  );
}, (prev, next) => prev.src === next.src && prev.size === next.size);

export default ProfileImage;
