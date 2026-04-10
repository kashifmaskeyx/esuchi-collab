import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";

export default function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <>
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
      <Outlet context={{ sidebarOpen }} />
    </>
  );
}
