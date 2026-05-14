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

export const getDashboardData = async () => {
  const [productsResponse, inventoryResponse, movementsResponse, ordersResponse, returnsResponse] =
    await Promise.all([
      API.get("/products"),
      API.get("/inventory"),
      API.get("/stock-movements"),
      API.get("/orders/my-orders"),
      API.get("/returns").catch(() => ({ data: { data: [] } })),
    ]);

  return {
    products: getProductsFromResponse(productsResponse.data),
    inventory: inventoryResponse.data?.data ?? [],
    stockMovements: movementsResponse.data?.data ?? [],
    orders: ordersResponse.data?.data ?? [],
    returns: returnsResponse.data?.data ?? [],
  };
};
