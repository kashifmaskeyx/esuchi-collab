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

export const createProduct = async (payload) => {
  const response = await API.post("/products", payload);
  return response.data;
};

export const updateProduct = async (id, payload) => {
  const response = await API.put(`/products/${id}`, payload);
  return response.data;
};

export const deleteProduct = async (id) => {
  const response = await API.delete(`/products/${id}`);
  return response.data;
};

export const createInventory = async (payload) => {
  const response = await API.post("/inventory", payload);
  return response.data;
};

export const updateInventoryStock = async (id, currentStock) => {
  const response = await API.patch(`/inventory/${id}/stock`, { currentStock });
  return response.data;
};

export const updateInventoryMinimum = async (id, minimumStock) => {
  const response = await API.patch(`/inventory/${id}/minimum`, { minimumStock });
  return response.data;
};

export const deleteInventory = async (id) => {
  const response = await API.delete(`/inventory/${id}`);
  return response.data;
};
