import axios from "axios";

const API = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api",
  headers: {
    "Content-Type": "application/json",
  },
});

export const getProductListing = async () => {
  const [productsResponse, inventoryResponse] = await Promise.all([
    API.get("/products"),
    API.get("/inventory"),
  ]);

  return {
    products: Array.isArray(productsResponse.data) ? productsResponse.data : [],
    inventory: inventoryResponse.data?.data ?? [],
  };
};
