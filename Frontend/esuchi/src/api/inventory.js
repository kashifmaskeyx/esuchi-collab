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

export const getInventoryPageData = async () => {
  const [productsResponse, inventoryResponse, movementsResponse] = await Promise.all([
    API.get("/products"),
    API.get("/inventory"),
    API.get("/stock-movements"),
  ]);

  return {
    products: getProductsFromResponse(productsResponse.data),
    inventory: inventoryResponse.data?.data ?? [],
    movements: movementsResponse.data?.data ?? [],
  };
};

export const createStockMovement = async (payload) => {
  const response = await API.post("/stock-movements", payload);
  return response.data;
};
