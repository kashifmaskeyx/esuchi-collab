import axios from "axios";

const API = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

export const getReturns = async () => {
  const response = await API.get("/returns");
  return response.data;
};

export const createReturn = async (payload) => {
  const response = await API.post("/returns", payload);
  return response.data;
};
