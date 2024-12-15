import Keycloak from "keycloak-js";
import React, { useEffect, useRef, useState } from "react";

const client = new Keycloak({
  url: import.meta.env.VITE_KEYCLOAK_URL,
  realm: import.meta.env.VITE_KEYCLOAK_REALM,
  clientId: import.meta.env.VITE_KEYCLOAK_CLIENT,
});

export const useAuth = () => {
  const [isLogin, setIsLogin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [accessToken, setAccessToken] = useState("");
  const isLoaded = useRef(false);

  useEffect(() => {
    if (isLoaded.current) {
      return;
    }
    isLoaded.current = true;

    client
      .init({ onLoad: "login-required" })
      .then((authenticated) => {
        if (authenticated) {
          console.log("Authenticated successfully.");
          setIsLogin(true);
          setAccessToken(client.token!);
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

    return () => {};
  }, []);

  return { isLogin, accessToken, loading };
};
