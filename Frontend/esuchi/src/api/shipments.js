import axios from "axios";

const API = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

const getProductsFromResponse = (data) => {
  if (Array.isArray(data)) {
    return data;
  }

  return Array.isArray(data?.products) ? data.products : [];
};

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
  return getProductsFromResponse(response.data);
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
