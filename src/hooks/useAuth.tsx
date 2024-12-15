import React, { useEffect, useRef, useState, useCallback } from "react";
import Keycloak from "keycloak-js";
import { Modal } from "antd";

interface AuthHookReturn {
  isLogin: boolean;
  accessToken: string;
  loading: boolean;
  isTokenExpired: boolean;
  regenerateToken: () => Promise<string | null>;
  logout: () => void;
}

export const useAuth = (): AuthHookReturn => {
  const [isLogin, setIsLogin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [accessToken, setAccessToken] = useState("");
  const [isTokenExpired, setIsTokenExpired] = useState(false);

  const isLoaded = useRef(false);
  const client = useRef(
    new Keycloak({
      url: import.meta.env.VITE_KEYCLOAK_URL,
      realm: import.meta.env.VITE_KEYCLOAK_REALM,
      clientId: import.meta.env.VITE_KEYCLOAK_CLIENT,
    })
  );
  const tokenCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const checkTokenExpiration = useCallback(() => {
    const tokenParsed = client.current.tokenParsed;
    if (tokenParsed && tokenParsed.exp) {
      const currentTime = Math.floor(Date.now() / 1000);
      const isExpired = currentTime >= tokenParsed.exp;

      setIsTokenExpired(isExpired);

      if (isExpired) {
        let timeoutId: NodeJS.Timeout;

        const modal = Modal.confirm({
          title: "Token Expired",
          content: "Your session has expired. Please choose an action.",
          okText: "Stay signed in",
          cancelText: "Logout",
          onOk: async () => {
            clearTimeout(timeoutId); // Clear timeout if the user chooses to stay signed in
            try {
              const newToken = await regenerateToken();
              if (newToken) {
                setAccessToken(newToken);
              } else {
                handleLogout();
              }
            } catch (error) {
              console.error("Token refresh failed", error);
            }
          },
          onCancel: () => {
            clearTimeout(timeoutId); // Clear timeout if the user explicitly logs out
            handleLogout();
          },
        });

        // Auto logout after 5 seconds if no action is taken
        timeoutId = setTimeout(() => {
          modal.destroy();
          handleLogout();
        }, 5000);
      }
    }
  }, []);

  const regenerateToken = async (): Promise<string | null> => {
    try {
      await client.current.updateToken(-1);

      const newToken = client.current.token;
      if (newToken) {
        setAccessToken(newToken);
        setIsTokenExpired(false);
        return newToken;
      }

      return null;
    } catch (error) {
      console.error("Token regeneration failed", error);

      Modal.error({
        title: "Token Regeneration Failed",
        content: "Unable to regenerate token. Please login again.",
      });

      setIsTokenExpired(true);
      return null;
    }
  };

  const handleLogout = () => {
    // Clear the token check interval before logout
    if (tokenCheckIntervalRef.current) {
      clearInterval(tokenCheckIntervalRef.current);
    }

    client.current.logout({
      redirectUri: window.location.origin,
    });
  };

  useEffect(() => {
    if (isLoaded.current) return;
    isLoaded.current = true;

    client.current
      .init({
        onLoad: "login-required",
        checkLoginIframe: false,
        pkceMethod: "S256",
      })
      .then((authenticated) => {
        if (authenticated) {
          console.log("Authenticated successfully.");
          setIsLogin(true);
          setAccessToken(client.current.token!);

          // Initial token expiration check
          checkTokenExpiration();

          // Set up periodic token expiration check every 30 seconds
          tokenCheckIntervalRef.current = setInterval(() => {
            checkTokenExpiration();
          }, 30000);
        } else {
          console.log("User not authenticated.");
          setIsLogin(false);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Keycloak initialization failed:", err);
        setLoading(false);
      });

    // Cleanup interval on component unmount
    return () => {
      if (tokenCheckIntervalRef.current) {
        clearInterval(tokenCheckIntervalRef.current);
      }
    };
  }, [checkTokenExpiration]);

  return {
    isLogin,
    accessToken,
    loading,
    isTokenExpired,
    regenerateToken,
    logout: handleLogout,
  };
};
