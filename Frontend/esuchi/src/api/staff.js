import axios from "axios";

const API = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api",
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

export const getStaff = async () => {
  const response = await API.get("/staff");
  return response.data;
};

export const createStaff = async (payload) => {
  const response = await API.post("/staff", payload);
  return response.data;
};

export const updateStaff = async (id, payload) => {
  const response = await API.put(`/staff/${id}`, payload);
  return response.data;
};

export const deleteStaff = async (id) => {
  const response = await API.delete(`/staff/${id}`);
  return response.data;
};
