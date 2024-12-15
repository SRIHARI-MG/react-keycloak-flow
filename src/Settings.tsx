import React from "react";

interface SettingsProps {
  accessToken: string;
  refreshToken: string;
}

const Settings: React.FC<SettingsProps> = ({ accessToken, refreshToken }) => {
  return (
    <div>
      <h1>Application Settings</h1>
      <p>Configure your app preferences</p>
    </div>
  );
};

export default Settings;
