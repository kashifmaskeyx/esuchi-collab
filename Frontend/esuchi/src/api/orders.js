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

export const getAdminOrders = async () => {
  const firstResponse = await API.get("/orders");
  const firstData = firstResponse.data;
  const totalPages = Number(firstData?.totalPages) || 1;
  const orders = Array.isArray(firstData?.data) ? [...firstData.data] : [];

  if (totalPages > 1) {
    const remainingResponses = await Promise.all(
      Array.from({ length: totalPages - 1 }, (_, index) =>
        API.get("/orders", { params: { page: index + 2 } }),
      ),
    );

    remainingResponses.forEach((response) => {
      if (Array.isArray(response.data?.data)) {
        orders.push(...response.data.data);
      }
    });
  }

  return {
    ...firstData,
    count: orders.length,
    data: orders,
  };
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
