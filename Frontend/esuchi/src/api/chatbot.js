import axios from "axios";

const API = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export const sendLandingChatMessage = async ({ message, sessionId }) => {
  try {
    const response = await API.post("/chatbot/landing/message", {
      message,
      sessionId,
    });
    return response.data;
  } catch (error) {
    throw (
      error.response?.data || {
        message: "Landing chatbot could not respond right now.",
      }
    );
  }
};

export const sendAppChatMessage = async ({ message, action }) => {
  try {
    const response = await API.post("/chatbot/message", { message, action });
    return response.data;
  } catch (error) {
    throw (
      error.response?.data || {
        message: "App chatbot could not respond right now.",
      }
    );
  }
};
