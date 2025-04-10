import { useState, useEffect, memo } from "react";
import { FiUser } from "react-icons/fi";

const ProfileImage = memo(function ProfileImage({ src, size = 32 }) {
  // Try to hydrate from sessionStorage on first render
  const [dataUrl, setDataUrl] = useState(() => {
    if (typeof window === "undefined") return null;
    const lastUrl  = sessionStorage.getItem("avatar:lastUrl");
    const lastData = sessionStorage.getItem("avatar:lastData");
    return lastUrl === src && lastData ? lastData : null;
  });
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    if (!src) {
      // no src → clear cache
      setDataUrl(null);
      sessionStorage.removeItem("avatar:lastUrl");
      sessionStorage.removeItem("avatar:lastData");
      return;
    }

    // if we already have it cached, don’t re‑fetch
    const lastUrl  = sessionStorage.getItem("avatar:lastUrl");
    const lastData = sessionStorage.getItem("avatar:lastData");
    if (lastUrl === src && lastData) {
      setDataUrl(lastData);
      return;
    }

    let cancelled = false;
    fetch(src)
      .then(res => {
        if (!res.ok) throw new Error("network error");
        return res.blob();
      })
      .then(blob => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror   = reject;
        reader.readAsDataURL(blob);
      }))
      .then(data => {
        if (cancelled) return;
        // cache in state + sessionStorage
        setDataUrl(data);
        sessionStorage.setItem("avatar:lastUrl", src);
        sessionStorage.setItem("avatar:lastData", data);
      })
      .catch(() => {
        if (!cancelled) setErrored(true);
      });

    return () => { cancelled = true; };
  }, [src]);

  // if no src or we hit an error, render the icon
  if (!src || errored) {
    return <FiUser size={size} style={{display: "flex",}}/>;
  }

  // while we’re still fetching, you can show a placeholder icon
  if (!dataUrl) {
    return <FiUser size={size} style={{display: "flex",}}/>;
  }

  // finally, render the cached data‑URL
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
},
// only re‑render when src or size actually change
(prev, next) => prev.src === next.src && prev.size === next.size
);

export default ProfileImage;
