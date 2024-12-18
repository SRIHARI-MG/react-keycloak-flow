import React, { useEffect, useRef, useState, useCallback } from "react";
import Keycloak from "keycloak-js";
import { Modal } from "antd";

const createTokenManager = () => {
  return {
    setTokens: (
      accessToken: string,
      refreshToken: string,
      expiresIn: number
    ) => {
      try {
        const expiresAt = Math.floor(Date.now() / 1000) + expiresIn;

        localStorage.setItem("accessToken", accessToken);
        if (!localStorage.getItem("refreshToken")) {
          localStorage.setItem("refreshToken", refreshToken);
        }
        localStorage.setItem("tokenExpiresAt", expiresAt.toString());
        localStorage.setItem("tokenInitialTime", Date.now().toString());
      } catch (error) {
        console.error("Failed to store tokens", error);
      }
    },

    getTokens: () => {
      return {
        accessToken: localStorage.getItem("accessToken") || "",
        refreshToken: localStorage.getItem("refreshToken") || "",
        expiresAt: parseInt(localStorage.getItem("tokenExpiresAt") || "0"),
        initialTime: parseInt(localStorage.getItem("tokenInitialTime") || "0"),
      };
    },

    calculateRemainingTime: () => {
      const { expiresAt } = tokenManager.getTokens();
      const currentTime = Math.floor(Date.now() / 1000);
      return Math.max(expiresAt - currentTime, 0);
    },

    clear: () => {
      try {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("tokenExpiresAt");
        localStorage.removeItem("tokenInitialTime");
      } catch (error) {
        console.error("Failed to clear tokens", error);
      }
    },
  };
};

const tokenManager = createTokenManager();

interface AuthHookReturn {
  isLogin: boolean;
  accessToken: string;
  refreshToken: string;
  loading: boolean;
  isTokenExpired: boolean;
  remainingTime: number;
  regenerateToken: () => Promise<string | null>;
  logout: () => void;
}

export const useAuth = (): AuthHookReturn => {
  const [isLogin, setIsLogin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [accessToken, setAccessToken] = useState("");
  const [refreshToken, setRefreshToken] = useState("");
  const [isTokenExpired, setIsTokenExpired] = useState(false);
  const [remainingTime, setRemainingTime] = useState(0);

  const isLoaded = useRef(false);
  const clientRef = useRef<Keycloak | null>(null);
  const tokenCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const modalRef = useRef<{ destroy: () => void } | null>(null);
  const isModalOpenRef = useRef(false);

  const initKeycloak = useCallback(() => {
    const keycloakInstance = new Keycloak({
      url: import.meta.env.VITE_KEYCLOAK_URL,
      realm: import.meta.env.VITE_KEYCLOAK_REALM,
      clientId: import.meta.env.VITE_KEYCLOAK_CLIENT,
    });

    clientRef.current = keycloakInstance;
    return keycloakInstance;
  }, []);

  const startTokenCountdown = useCallback(() => {
    if (tokenCheckIntervalRef.current) {
      clearInterval(tokenCheckIntervalRef.current);
    }

    tokenCheckIntervalRef.current = setInterval(() => {
      const { expiresAt } = tokenManager.getTokens();
      const currentTime = Math.floor(Date.now() / 1000);
      const timeLeft = Math.max(expiresAt - currentTime, 0);

      console.log("Token expiration check:", {
        currentTime,
        expiresAt,
        timeLeft,
      });

      setRemainingTime(timeLeft);

      if (timeLeft <= 5 && !isModalOpenRef.current) {
        isModalOpenRef.current = true;

        modalRef.current = Modal.confirm({
          title: "Session Expiring",
          content: `Your session is about to expire in ${timeLeft} seconds. Do you want to stay signed in?`,
          okText: "Stay signed in",
          cancelText: "Logout",
          onOk: async () => {
            try {
              const newToken = await regenerateToken();
              if (newToken) {
                isModalOpenRef.current = false;
                modalRef.current?.destroy();
              } else {
                handleLogout();
              }
            } catch (error) {
              console.error("Token refresh failed", error);
              handleLogout();
            }
          },
          onCancel: () => {
            handleLogout();
          },
          afterClose: () => {
            isModalOpenRef.current = false;
          },
        });

        setTimeout(() => {
          if (isModalOpenRef.current) {
            modalRef.current?.destroy();
            handleLogout();
          }
        }, 5000);
      }
    }, 1000);
  }, []);

  const regenerateToken = async (): Promise<string | null> => {
    try {
      const { refreshToken: currentRefreshToken } = tokenManager.getTokens();

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
            refresh_token: currentRefreshToken,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to refresh token: ${response.statusText}`);
      }

      const data = await response.json();

      const expiresIn = data.expires_in || 120;

      // Set new access token
      setAccessToken(data.access_token);

      localStorage.setItem("accessToken", data.access_token);
      localStorage.setItem(
        "tokenExpiresAt",
        (Math.floor(Date.now() / 1000) + expiresIn).toString()
      );

      startTokenCountdown();

      setIsTokenExpired(false);
      return data.access_token;
    } catch (error) {
      console.error("Token regeneration failed:", error);
      return null;
    }
  };

  const handleLogout = useCallback(async () => {
    if (modalRef.current) {
      modalRef.current.destroy();
    }

    if (tokenCheckIntervalRef.current) {
      clearInterval(tokenCheckIntervalRef.current);
    }

    const {
      accessToken: currentAccessToken,
      refreshToken: currentRefreshToken,
    } = tokenManager.getTokens();

    try {
      const response = await fetch(
        `${import.meta.env.VITE_KEYCLOAK_URL}/realms/${
          import.meta.env.VITE_KEYCLOAK_REALM
        }/protocol/openid-connect/logout`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${currentAccessToken}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            client_id: import.meta.env.VITE_KEYCLOAK_CLIENT,
            refresh_token: currentRefreshToken,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to log out: ${response.statusText}`);
      }

      console.log("Logout successful on the server.");
    } catch (error) {
      console.error("Server logout failed:", error);
    } finally {
      tokenManager.clear();
      setAccessToken("");
      setRefreshToken("");
      setIsLogin(false);

      window.location.href = window.location.origin;
    }
  }, []);

  useEffect(() => {
    if (isLoaded.current) return;
    isLoaded.current = true;

    const {
      accessToken: storedAccessToken,
      refreshToken: storedRefreshToken,
      expiresAt,
    } = tokenManager.getTokens();

    if (
      storedAccessToken &&
      storedRefreshToken &&
      expiresAt > Math.floor(Date.now() / 1000)
    ) {
      setRefreshToken(storedRefreshToken);
      setAccessToken(storedAccessToken);
      setIsLogin(true);
      setLoading(false);

      startTokenCountdown();
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

            const expiresIn = keycloakClient.tokenParsed?.exp
              ? keycloakClient.tokenParsed.exp - Math.floor(Date.now() / 1000)
              : 120; 

            tokenManager.setTokens(
              keycloakClient.token!,
              keycloakClient.refreshToken!,
              expiresIn
            );

            setAccessToken(keycloakClient.token!);
            setRefreshToken(keycloakClient.refreshToken!);

            startTokenCountdown();
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
  }, [startTokenCountdown, initKeycloak]);

  useEffect(() => {
    startTokenCountdown();
  }, []);

  return {
    isLogin,
    accessToken,
    refreshToken,
    loading,
    isTokenExpired,
    remainingTime,
    regenerateToken,
    logout: handleLogout,
  };
};
