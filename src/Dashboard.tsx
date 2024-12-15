import React, { useEffect, useState } from "react";
import { useAuth } from "./hooks/useAuth";

const Dashboard = ({ accessToken }: { accessToken: string }) => {
  const [data, setData] = useState(null);

  return (
    <div>
      <h1>Dashboard</h1>
      <p style={{ width: 500, wordBreak: "break-all" }}>{accessToken}</p>
    </div>
  );
};

export default Dashboard;
