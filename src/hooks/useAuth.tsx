import React, { useEffect, useRef, useState, useCallback } from "react";
import Keycloak from "keycloak-js";
import { Modal } from "antd";

interface AuthHookReturn {
  isLogin: boolean;
  accessToken: string;
  refreshToken: string;
  loading: boolean;
  isTokenExpired: boolean;
  regenerateToken: () => Promise<string | null>;
  logout: () => void;
}

export const useAuth = (): AuthHookReturn => {
  const [isLogin, setIsLogin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [accessToken, setAccessToken] = useState("");
  const [refreshToken, setRefreshToken] = useState("");
  const [isTokenExpired, setIsTokenExpired] = useState(false);

  const isLoaded = useRef(false);
  const clientRef = useRef<Keycloak | null>(null);
  const tokenCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const initKeycloak = useCallback(() => {
    const keycloakInstance = new Keycloak({
      url: import.meta.env.VITE_KEYCLOAK_URL,
      realm: import.meta.env.VITE_KEYCLOAK_REALM,
      clientId: import.meta.env.VITE_KEYCLOAK_CLIENT,
    });

    clientRef.current = keycloakInstance;
    return keycloakInstance;
  }, []);

  const checkTokenExpiration = useCallback(() => {
    if (!clientRef.current) return;

    const tokenParsed = clientRef.current.tokenParsed;
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
            clearTimeout(timeoutId);
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
            clearTimeout(timeoutId);
            handleLogout();
          },
        });

        timeoutId = setTimeout(() => {
          modal.destroy();
          handleLogout();
        }, 5000);
      }
    }
  }, []);

  const regenerateToken = async (): Promise<string | null> => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_KEYCLOAK_URL}/realms/${
          import.meta.env.VITE_KEYCLOAK_REALM
        }/protocol/openid-connect/token`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            grant_type: "refresh_token",
            client_id: import.meta.env.VITE_KEYCLOAK_CLIENT,
            ...(import.meta.env.VITE_KEYCLOAK_CLIENT_SECRET
              ? { client_secret: import.meta.env.VITE_KEYCLOAK_CLIENT_SECRET }
              : {}),
            refresh_token: localStorage.getItem("refreshToken") || "",
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to refresh token: ${response.statusText}`);
      }

      const data = await response.json();
      setAccessToken(data.access_token);
      setIsTokenExpired(false);
      return data.access_token;
    } catch (error) {
      console.error("Token regeneration failed:", error);
      return null;
    }
  };

  const handleLogout = useCallback(() => {
    if (tokenCheckIntervalRef.current) {
      clearInterval(tokenCheckIntervalRef.current);
    }

    if (clientRef.current) {
      try {
        clientRef.current.logout({
          redirectUri: window.location.origin,
        });
      } catch (error) {
        console.error("Logout failed:", error);
        localStorage.clear();
        window.location.href = window.location.origin;
      }
    } else {
      localStorage.clear();
      window.location.href = window.location.origin;
    }
  }, []);

  useEffect(() => {
    if (isLoaded.current) return;
    isLoaded.current = true;

    const storedRefreshToken = localStorage.getItem("refreshToken");

    if (storedRefreshToken) {
      setRefreshToken(storedRefreshToken);
      setIsLogin(true);
      setLoading(false);

      tokenCheckIntervalRef.current = setInterval(() => {
        checkTokenExpiration();
      }, 30000);
    } else {
      const keycloakClient = initKeycloak();
      keycloakClient
        .init({
          onLoad: "login-required",
          checkLoginIframe: false,
          pkceMethod: "S256",
        })
        .then((authenticated) => {
          if (authenticated) {
            console.log("Authenticated successfully.");
            setIsLogin(true);
            setAccessToken(keycloakClient.token!);
            if (localStorage.getItem("refreshToken") === null) {
              localStorage.setItem(
                "refreshToken",
                keycloakClient.refreshToken!
              );
            }

            setRefreshToken(keycloakClient.refreshToken!);

            checkTokenExpiration();

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
    }

    return () => {
      if (tokenCheckIntervalRef.current) {
        clearInterval(tokenCheckIntervalRef.current);
      }
    };
  }, [checkTokenExpiration, initKeycloak]);

  return {
    isLogin,
    accessToken,
    refreshToken: localStorage.getItem("refreshToken") || "",
    loading,
    isTokenExpired,
    regenerateToken,
    logout: handleLogout,
  };
};
