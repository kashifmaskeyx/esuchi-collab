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
        introBubble="Ask the eSuchi AI assistant about your workspace."
        initialMessage="Hi, I am the eSuchi AI assistant. Ask me anything about your dashboard, inventory, navigation, or stock work."
        placeholder="Ask about your operations..."
        storageKey="esuchi_app_ai_chat_history_v3"
        sendMessage={sendAppChatMessage}
      />
    </>
  );
}
