import axios from "axios";

const API = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api",
  headers: {
    "Content-Type": "application/json",
  },
});

export const getDashboardData = async () => {
  const [productsResponse, inventoryResponse, movementsResponse] =
    await Promise.all([
      API.get("/products"),
      API.get("/inventory"),
      API.get("/stock-movements"),
    ]);

  return {
    products: Array.isArray(productsResponse.data) ? productsResponse.data : [],
    inventory: inventoryResponse.data?.data ?? [],
    stockMovements: movementsResponse.data?.data ?? [],
  };
};
