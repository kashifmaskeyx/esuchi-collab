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

const getProductsFromResponse = (data) => {
  if (Array.isArray(data)) {
    return data;
  }

  return Array.isArray(data?.products) ? data.products : [];
};

const getDataRowsFromResponse = (data) => (Array.isArray(data?.data) ? data.data : []);

const getAllPaginatedRows = async (endpoint, getRows) => {
  const firstResponse = await API.get(endpoint);
  const firstData = firstResponse.data;
  const totalPages = Number(firstData?.totalPages) || 1;
  const rows = [...getRows(firstData)];

  if (totalPages <= 1) {
    return rows;
  }

  const remainingResponses = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, index) =>
      API.get(endpoint, { params: { page: index + 2 } }),
    ),
  );

  remainingResponses.forEach((response) => {
    rows.push(...getRows(response.data));
  });

  return rows;
};

export const getDashboardData = async () => {
  const [products, inventory, stockMovements] = await Promise.all([
    getAllPaginatedRows("/products", getProductsFromResponse),
    getAllPaginatedRows("/inventory", getDataRowsFromResponse),
    getAllPaginatedRows("/stock-movements", getDataRowsFromResponse),
  ]);

  return {
    products,
    inventory,
    stockMovements,
  };
};
