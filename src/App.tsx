import "./App.css";
import Dashboard from "./Dashboard";
import { useAuth } from "./hooks/useAuth";
import Home from "./Home";

function App() {
  const { isLogin, loading, accessToken } = useAuth();
  return isLogin ? <Dashboard accessToken={accessToken} /> : <Home />;
}

export default App;
