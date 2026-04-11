import axios from "axios";

// 🔗 Change this to your backend URL
const API = axios.create({
  baseURL: "http://localhost:5000/api", // <-- update if needed
  headers: {
    "Content-Type": "application/json",
  },
});

export const registerUser = async (userData) => {
  try {
    const response = await API.post("/auth/register", userData);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "Registration failed" };
  }
};

export const verifyOtp = async (data) => {
  try {
    const response = await API.post("/auth/verify-otp", data);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "OTP verification failed" };
  }
};

export const verifyResetOtp = async (data) => {
  try {
    const response = await API.post("/auth/verify-reset-otp", data);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "OTP verification failed" };
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
