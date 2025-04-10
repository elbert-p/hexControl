import { useState, memo } from "react";
import { FiUser } from "react-icons/fi";

const Avatar = memo(function Avatar({ src, size = 32 }) {
  const [errored, setErrored] = useState(false);

  // If there's no src or the image already errored, show the icon
  if (!src || errored) {
    return <FiUser size={size} style={{display: "flex",}} />;
  }

  return (
    <img
      src={src}
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

export default Avatar;
