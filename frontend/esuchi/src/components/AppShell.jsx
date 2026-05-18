import React, { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { PanelLeftOpen } from "lucide-react";
import Sidebar from "./Sidebar";

export default function AppShell() {
  const location = useLocation();
  const showAppSidebar = location.pathname !== "/settings";
  const [sidebarOpen, setSidebarOpen] = useState(() =>
    typeof window === "undefined" ? true : window.innerWidth > 980,
  );

  return (
    <>
      {showAppSidebar ? (
        <>
          <button
            className={`mobile-sidebar-trigger ${sidebarOpen ? "hidden" : ""}`}
            type="button"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open sidebar"
          >
            <PanelLeftOpen size={18} />
          </button>
          <Sidebar
            isOpen={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
            onToggle={() => setSidebarOpen((current) => !current)}
          />
          <button
            className={`sidebar-backdrop ${sidebarOpen ? "show" : ""}`}
            type="button"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar"
          />
        </>
      ) : null}
      <Outlet context={{ sidebarOpen: showAppSidebar && sidebarOpen }} />
    </>
  );
}
