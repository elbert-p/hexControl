// GoogleSignInButton.js
import React from "react";
import { supabase } from "../supabaseClient"; // Adjust the import path if needed
const gLogo64 = "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";
const GoogleSignInButton = () => {
  const handleGoogleSignIn = async () => {
    // Initiate the OAuth flow with Google
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      // options: {
      //   redirectTo: `${window.location.origin}/`
      // }
    });
    if (error) {
      console.error("Error signing in with Google:", error);
      // Optionally, display an error message to the user here.
    }
  };

  return (
    <button
      onClick={handleGoogleSignIn}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "10px 20px",
        fontSize: "16px",
        cursor: "pointer",
        backgroundColor: "white",
        color: "#5f6368",
        border: "1px solid #dadce0",
        borderRadius: "20px",
        boxShadow: "0px 1px 2px rgba(0,0,0,0.1)",
        marginTop: "17px",
        marginBottom: "5px",
      }}
    >
      <img
        src={`data:image/png;base64,${gLogo64}`}
        alt="Google logo"
        style={{ width: "20px", height: "20px", marginRight: "10px" }}
      />
      <span>Sign in with Google</span>
    </button>
  );
};

export default GoogleSignInButton;