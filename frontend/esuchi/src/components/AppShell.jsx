import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import { PanelLeftOpen } from "lucide-react";
import Sidebar from "./Sidebar";
import ChatBotWidget from "./ChatBotWidget";
import { sendAppChatMessage } from "../api/chatbot";

export default function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(() =>
    typeof window === "undefined" ? true : window.innerWidth > 980,
  );

  return (
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
      <Outlet context={{ sidebarOpen }} />
      <ChatBotWidget
        variant="app"
        title="eSuchi Ops Assistant"
        subtitle="Connected to your workspace"
        introBubble="Need a quick operations check? Ask me about today's summary, low stock, or inventory actions."
        initialMessage="Welcome back! I can check your low-stock items, summarize today's orders and stock movements, or guide safe inventory updates."
        placeholder="Ask about your operations..."
        suggestions={[
          "Show low stock items",
          "Give me today's summary",
          "How can I update stock safely?",
        ]}
        storageKey="esuchi_app_chat_history"
        sendMessage={sendAppChatMessage}
      />
    </>
  );
}
