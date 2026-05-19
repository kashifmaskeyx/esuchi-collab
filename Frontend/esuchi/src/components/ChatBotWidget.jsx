import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Bot,
  ChevronDown,
  MessageCircle,
  SendHorizontal,
  Sparkles,
  X,
} from "lucide-react";
import "../css/ChatBotWidget.css";

const createId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

const readStoredJson = (key, fallback) => {
  if (typeof window === "undefined") return fallback;

  try {
    return JSON.parse(localStorage.getItem(key)) || fallback;
  } catch {
    return fallback;
  }
};

const writeStoredJson = (key, value) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
};

const getSessionId = (key) => {
  if (typeof window === "undefined") return "";

  const current = localStorage.getItem(key);
  if (current) return current;

  const next = `esuchi-chat-${createId()}`;
  localStorage.setItem(key, next);
  return next;
};

export default function ChatBotWidget({
  variant = "landing",
  title,
  subtitle,
  introBubble,
  initialMessage,
  placeholder,
  storageKey,
  sessionStorageKey,
  sendMessage,
  proactiveMessage,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [hasLoadedProactiveMessage, setHasLoadedProactiveMessage] =
    useState(false);
  const [sessionId, setSessionId] = useState("");
  const [messages, setMessages] = useState(() =>
    readStoredJson(storageKey, [
      {
        id: "welcome",
        role: "assistant",
        text: initialMessage,
      },
    ]),
  );
  const messagesEndRef = useRef(null);

  const activeSuggestions = useMemo(
    () => (pendingAction ? ["Confirm", "Cancel"] : []),
    [pendingAction],
  );

  useEffect(() => {
    writeStoredJson(storageKey, messages);
  }, [messages, storageKey]);

  useEffect(() => {
    if (sessionStorageKey) {
      setSessionId(getSessionId(sessionStorageKey));
    }
  }, [sessionStorageKey]);

  useEffect(() => {
    if (!isOpen) return;
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [isOpen, messages, isSending]);

  useEffect(() => {
    if (
      !isOpen ||
      !proactiveMessage ||
      hasLoadedProactiveMessage ||
      isSending
    ) {
      return;
    }

    const loadProactiveMessage = async () => {
      setHasLoadedProactiveMessage(true);
      setIsSending(true);

      try {
        const response = await sendMessage({
          message: proactiveMessage,
          sessionId,
        });
        const botText =
          response?.message ||
          "Inventory Copilot is ready. Ask me about stock, summaries, or navigation.";
        setMessages((current) => [
          ...current,
          {
            id: createId(),
            role: "assistant",
            text: botText,
          },
        ]);
      } catch {
        setMessages((current) => [
          ...current,
          {
            id: createId(),
            role: "assistant",
            text: "Inventory Copilot is ready, but I could not load live alerts yet.",
            isError: true,
          },
        ]);
      } finally {
        setIsSending(false);
      }
    };

    loadProactiveMessage();
  }, [
    hasLoadedProactiveMessage,
    isOpen,
    isSending,
    proactiveMessage,
    sendMessage,
    sessionId,
  ]);

  const submitMessage = async (text) => {
    const trimmedText = text.trim();
    if (!trimmedText || isSending) return;
    const normalizedText = trimmedText.toLowerCase();

    if (pendingAction && ["cancel", "stop", "no"].includes(normalizedText)) {
      setMessages((current) => [
        ...current,
        {
          id: createId(),
          role: "user",
          text: trimmedText,
        },
        {
          id: createId(),
          role: "assistant",
          text: "Cancelled. I did not make any stock changes.",
        },
      ]);
      setPendingAction(null);
      setInputValue("");
      return;
    }

    const userMessage = {
      id: createId(),
      role: "user",
      text: trimmedText,
    };

    setMessages((current) => [...current, userMessage]);
    setInputValue("");
    setIsSending(true);

    try {
      const actionToSend =
        pendingAction && ["confirm", "yes", "proceed"].includes(normalizedText)
          ? { ...pendingAction, confirmed: true, confirmLowStock: true }
          : undefined;
      const response = await sendMessage({
        message: actionToSend ? "" : trimmedText,
        sessionId,
        action: actionToSend,
      });
      const botText =
        response?.message ||
        "I am here, but I could not format that response clearly.";
      const nextPendingAction = response?.data?.pendingAction || null;

      if (response?.sessionId && response.sessionId !== sessionId) {
        setSessionId(response.sessionId);
        if (sessionStorageKey) {
          localStorage.setItem(sessionStorageKey, response.sessionId);
        }
      }

      setMessages((current) => [
        ...current,
        {
          id: createId(),
          role: "assistant",
          text: botText,
        },
      ]);
      setPendingAction(nextPendingAction);
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          id: createId(),
          role: "assistant",
          text:
            error?.message ||
            "I could not reach the eSuchi AI service right now. Please try again in a moment.",
          isError: true,
        },
      ]);
      setPendingAction(null);
    } finally {
      setIsSending(false);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    submitMessage(inputValue);
  };

  return (
    <div className={`chatbot-widget ${variant}`}>
      {!isOpen && introBubble ? (
        <button
          className="chatbot-peek"
          type="button"
          onClick={() => setIsOpen(true)}
        >
          {introBubble}
        </button>
      ) : null}

      {isOpen ? (
        <section className="chatbot-panel" aria-label={title}>
          <header className="chatbot-panel-head">
            <div className="chatbot-avatar-wrap">
              <span className="chatbot-avatar">
                <Bot size={22} />
              </span>
              <span className="chatbot-status-dot" />
            </div>
            <div>
              <h2>{title}</h2>
              <p>{subtitle}</p>
            </div>
            <button
              className="chatbot-icon-btn"
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Close chat"
              title="Close chat"
            >
              <X size={24} />
            </button>
          </header>

          <div className="chatbot-messages" aria-live="polite">
            {messages.map((message) => (
              <div
                className={`chatbot-message-row ${message.role}`}
                key={message.id}
              >
                <div
                  className={`chatbot-message ${message.role} ${
                    message.isError ? "error" : ""
                  }`}
                >
                  {message.text.split("\n").map((line) => (
                    <p key={`${message.id}-${line}`}>{line}</p>
                  ))}
                </div>
              </div>
            ))}

            {isSending ? (
              <div className="chatbot-message-row assistant">
                <div className="chatbot-message assistant typing">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            ) : null}

            {!isSending && activeSuggestions.length ? (
              <div className="chatbot-suggestions">
                {activeSuggestions.map((suggestion) => (
                  <button
                    type="button"
                    key={suggestion}
                    onClick={() => submitMessage(suggestion)}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            ) : null}

            <div ref={messagesEndRef} />
          </div>

          <form className="chatbot-composer" onSubmit={handleSubmit}>
            <input
              type="text"
              value={inputValue}
              onChange={(event) => setInputValue(event.target.value)}
              placeholder={placeholder}
              disabled={isSending}
              aria-label="Type your message"
            />
            <button
              type="submit"
              disabled={isSending || !inputValue.trim()}
              aria-label="Send message"
              title="Send message"
            >
              <SendHorizontal size={23} />
            </button>
          </form>
        </section>
      ) : null}

      <button
        className="chatbot-launcher"
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        aria-label={isOpen ? "Minimize chat" : "Open chat"}
        title={isOpen ? "Minimize chat" : "Open chat"}
      >
        {isOpen ? <ChevronDown size={28} /> : <MessageCircle size={26} />}
        {!isOpen ? <Sparkles className="chatbot-launcher-spark" size={14} /> : null}
      </button>
    </div>
  );
}
