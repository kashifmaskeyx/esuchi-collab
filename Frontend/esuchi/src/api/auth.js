import axios from "axios";

// 🔗 Change this to your backend URL
const API = axios.create({
  baseURL: "http://localhost:5000/api", // <-- update if needed
  headers: {
    "Content-Type": "application/json",
  },
});

const persistAuthToken = (data) => {
  if (data?.token) {
    localStorage.setItem("token", data.token);
  }
};

export const requestSignupOtp = async (userData) => {
  try {
    const response = await API.post("/auth/signup-otp", userData);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "Failed to send signup OTP" };
  }
};

export const verifySignupOtp = async (data) => {
  try {
    const response = await API.post("/auth/verify-signup-otp", data);
    persistAuthToken(response.data);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "Signup verification failed" };
  }
};

export const requestPasswordResetOtp = async (data) => {
  try {
    const response = await API.post("/auth/forgot-password", data);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "Failed to send OTP" };
  }
};

export const verifyOtp = async (data) => {
  try {
    const response = await API.post("/auth/verify-reset-otp", data);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "OTP verification failed" };
  }
};

export const resetPassword = async (data) => {
  try {
    const response = await API.post("/auth/reset-password", data);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "Password reset failed" };
  }
};

export const loginUser = async (data) => {
  try {
    const response = await API.post("/auth/login", data);

    // Save token (if backend returns it)
    if (response.data.token) {
      localStorage.setItem("token", response.data.token);
    }

    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "Login failed" };
  }
};

export const logoutUser = () => {
  localStorage.removeItem("token");
};
