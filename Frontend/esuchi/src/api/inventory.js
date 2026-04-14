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

export const getInventoryPageData = async () => {
  const [productsResponse, inventoryResponse, movementsResponse] = await Promise.all([
    API.get("/products"),
    API.get("/inventory"),
    API.get("/stock-movements"),
  ]);

  return {
    products: Array.isArray(productsResponse.data) ? productsResponse.data : [],
    inventory: inventoryResponse.data?.data ?? [],
    movements: movementsResponse.data?.data ?? [],
  };
};

export const createStockMovement = async (payload) => {
  const response = await API.post("/stock-movements", payload);
  return response.data;
};
