import "./App.css";
import Dashboard from "./Dashboard";
import { useAuth } from "./hooks/useAuth";
import Home from "./Home";
import { ConfigProvider, Spin } from "antd";
import { useEffect } from "react";

function App() {
  const { isLogin, accessToken, loading, isTokenExpired, logout } = useAuth();

  if (loading) {
    return (
      <div className="loading-container">
        <Spin size="large" />
      </div>
    );
  }

  if (isLogin && !accessToken) {
    logout();
    return <div>Error: Missing token. Redirecting...</div>;
  }

  return (
    <ConfigProvider>
      {isLogin ? <Dashboard accessToken={accessToken} /> : <Home />}
    </ConfigProvider>
  );
}

export default App;
