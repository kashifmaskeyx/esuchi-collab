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

export const getSalesOrders = async () => {
  const response = await API.get("/orders/my-orders");
  return response.data;
};

export const createSalesOrder = async (payload) => {
  const response = await API.post("/orders", payload);
  return response.data;
};

export const updateSalesOrderStatus = async (id, status) => {
  const response = await API.patch(`/orders/${id}/status`, { status });
  return response.data;
};

export const deleteSalesOrder = async (id) => {
  const response = await API.delete(`/orders/${id}`);
  return response.data;
};
