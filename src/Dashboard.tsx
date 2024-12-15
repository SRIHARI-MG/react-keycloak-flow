import React, { useEffect, useState } from "react";
import { useAuth } from "./hooks/useAuth";

const Dashboard = ({
  accessToken,
  refreshToken,
}: {
  accessToken: string;
  refreshToken: string;
}) => {
  const [data, setData] = useState(null);

  return (
    <div>
      <h1>Dashboard</h1>
      <div style={{ width: 700, display: "flex", gap: 20 }}>
        <p style={{ width: "50%", wordBreak: "break-all" }}>
          <span style={{ fontWeight: "bold", fontSize: 20 }}>Access Token</span>
          <br />
          {accessToken}
        </p>
        <p style={{ width: "50%", wordBreak: "break-all" }}>
          <span style={{ fontWeight: "bold", fontSize: 20 }}>
            Refresh Token
          </span>
          <br />
          {refreshToken}
        </p>
      </div>
    </div>
  );
};

export default Dashboard;
