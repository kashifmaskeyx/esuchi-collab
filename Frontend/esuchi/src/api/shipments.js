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

export const getShipments = async () => {
  const response = await API.get("/shipments");
  return response.data;
};

export const getSuppliers = async () => {
  const response = await API.get("/suppliers");
  return response.data;
};

export const getProducts = async () => {
  const response = await API.get("/products");
  return response.data;
};

export const createShipment = async (payload) => {
  const response = await API.post("/shipments", payload);
  return response.data;
};

export const updateShipmentStatus = async (id, status) => {
  const response = await API.patch(`/shipments/${id}/status`, { status });
  return response.data;
};

export const deleteShipment = async (id) => {
  const response = await API.delete(`/shipments/${id}`);
  return response.data;
};
