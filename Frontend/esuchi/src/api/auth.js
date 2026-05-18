import axios from "axios";

// 🔗 Change this to your backend URL
const API = axios.create({
  baseURL: "http://localhost:5000/api", // <-- update if needed
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

export const ADMIN_EMAIL = "esuchiinfo@gmail.com";

export const isAdminEmail = (email) =>
  email?.trim().toLowerCase() === ADMIN_EMAIL;

const getAuthConfig = () => {
  const token = localStorage.getItem("token");

  return token
    ? {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    : {};
};

const persistAuthToken = (data) => {
  if (data?.user) {
    localStorage.setItem("currentUser", JSON.stringify(data.user));
  }
};

export const getStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem("currentUser")) || null;
  } catch {
    return null;
  }
};

export const getUserInitials = (user = getStoredUser()) => {
  const displayValue = user?.name?.trim() || user?.email?.split("@")[0] || "A";
  const parts = displayValue.split(/\s+/).filter(Boolean);

  if (parts.length > 1) {
    return parts
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }

  return displayValue.slice(0, 2).toUpperCase();
};

const persistUser = (user) => {
  if (user) {
    localStorage.setItem("currentUser", JSON.stringify(user));
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
    persistAuthToken(response.data);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "Login failed" };
  }
};

export const updateCurrentUser = async (data) => {
  try {
    const response = await API.put("/auth/me", data);
    persistUser(response.data?.user);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "Profile update failed" };
  }
};

export const getCurrentUser = async () => {
  try {
    const response = await API.get("/auth/me", getAuthConfig());
    persistUser(response.data?.user);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "Failed to load profile" };
  }
};

export const getAdminUsers = async () => {
  try {
    const response = await API.get("/auth/users", getAuthConfig());
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "Failed to load users" };
  }
};

export const updateAdminUserRole = async (id, role) => {
  try {
    const response = await API.patch(
      `/auth/users/${id}/role`,
      { role },
      getAuthConfig(),
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "Failed to update user role" };
  }
};

export const requestEmailChangeOtp = async (data) => {
  try {
    const response = await API.post("/auth/me/email-otp", data);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "Failed to send email OTP" };
  }
};

export const changeCurrentPassword = async (data) => {
  try {
    const response = await API.put("/auth/password", data);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "Password change failed" };
  }
};

export const logoutUser = async () => {
  try {
    await API.post("/auth/logout");
  } catch {
    // Local cleanup should still happen even if the server session is already gone.
  }

  localStorage.removeItem("currentUser");
  localStorage.removeItem("esuchiProfile");
};
