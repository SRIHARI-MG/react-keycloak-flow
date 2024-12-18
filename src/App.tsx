import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  Link,
} from "react-router-dom";
import { ConfigProvider, Spin, Layout, Menu } from "antd";
import {
  DashboardOutlined,
  HomeOutlined,
  UserOutlined,
  SettingOutlined,
  LogoutOutlined,
} from "@ant-design/icons";

import { useAuth } from "./hooks/useAuth";
import Dashboard from "./Dashboard";
import Home from "./Home";
import Profile from "./Profile";
import Settings from "./Settings";
import { LogOutIcon, UserCircle2 } from "lucide-react";

const { Header, Content, Sider } = Layout;

function App() {
  const {
    isLogin,
    accessToken,
    refreshToken,
    loading,
    isTokenExpired,
    logout,
  } = useAuth();

  if (loading) {
    return (
      <div
        style={{
          height: "100vh",
          width: "100vw",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Spin size="large" />
      </div>
    );
  }

  if (isLogin && !accessToken) {
    logout();
    return (
      <div
        style={{
          height: "100vh",
          width: "100vw",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Spin size="large" />
      </div>
    );
  }

  const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
    if (!isLogin) {
      return <Navigate to="/" replace />;
    }
    return <>{children}</>;
  };

  const AuthenticatedLayout = ({ children }: { children: React.ReactNode }) => {
    return (
      <Layout style={{ minHeight: "100vh" }}>
        <Sider width={200} theme="light">
          <div
            style={{
              margin: "16px",
              textAlign: "center",
            }}
          >
            <UserCircle2 height={50} width={50} />
          </div>
          <Menu mode="inline" theme="light" defaultSelectedKeys={["1"]}>
            <Menu.Item key="1" icon={<DashboardOutlined />}>
              <Link to="/dashboard">Dashboard</Link>
            </Menu.Item>
            <Menu.Item key="2" icon={<UserOutlined />}>
              <Link to="/profile">Profile</Link>
            </Menu.Item>
            <Menu.Item key="3" icon={<SettingOutlined />}>
              <Link to="/settings">Settings</Link>
            </Menu.Item>
            <Menu.Item
              key="4"
              onClick={logout}
              icon={<LogoutOutlined />}
              style={{ backgroundColor: "#ff4d4f", color: "white" }}
            >
              Logout
            </Menu.Item>
          </Menu>
        </Sider>
        <Layout>
          <Content
            style={{ margin: "24px 16px", padding: 24, background: "#fff" }}
          >
            {children}
          </Content>
        </Layout>
      </Layout>
    );
  };

  return (
    <ConfigProvider>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route
            path="/"
            element={!isLogin ? <Home /> : <Navigate to="/dashboard" replace />}
          />

          {/* Protected Routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <AuthenticatedLayout>
                  <Dashboard
                    accessToken={accessToken}
                    refreshToken={refreshToken}
                  />
                </AuthenticatedLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <AuthenticatedLayout>
                  <Profile
                    accessToken={accessToken}
                    refreshToken={refreshToken}
                  />
                </AuthenticatedLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <AuthenticatedLayout>
                  <Settings
                    accessToken={accessToken}
                    refreshToken={refreshToken}
                  />
                </AuthenticatedLayout>
              </ProtectedRoute>
            }
          />

          {/* 404 Not Found Route */}
          <Route
            path="*"
            element={<Navigate to={isLogin ? "/dashboard" : "/"} replace />}
          />
        </Routes>
      </Router>
    </ConfigProvider>
  );
}

export default App;
