import React from "react";
import { useAuth } from "../../../hooks/useAuth";
import { UserDropdown } from "../../auth/UserDropdown";
import NotificationCenter from "./NotificationCenter";

export const HeaderUserActions: React.FC = () => {
  const { isAuthenticated, authConfig } = useAuth();
  const showNotifications = isAuthenticated && !authConfig?.disableAccounts;

  return (
    <div className="flex shrink-0 items-center gap-2">
      {showNotifications && <NotificationCenter />}
      <UserDropdown />
    </div>
  );
};

export default HeaderUserActions;
