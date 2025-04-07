// GoogleSignInButton.js
import React from "react";
import { supabase } from "../supabaseClient"; // Adjust the import path if needed

const GoogleSignInButton = () => {
  const handleGoogleSignIn = async () => {
    // Initiate the OAuth flow with Google
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
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
        src="/g-logo.png"
        alt="Google logo"
        style={{ width: "20px", height: "20px", marginRight: "8px" }}
      />
      <span>Sign in with Google</span>
    </button>
  );
};

export default GoogleSignInButton;