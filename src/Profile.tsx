// Profile.tsx
import React from "react";

interface ProfileProps {
  accessToken: string;
  refreshToken: string;
}

const Profile: React.FC<ProfileProps> = ({ accessToken, refreshToken }) => {
  return (
    <div>
      <h1>User Profile</h1>
      <p>Manage your profile settings here</p>
    </div>
  );
};

export default Profile;
