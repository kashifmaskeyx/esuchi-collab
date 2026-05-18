import axios from "axios";

const API = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

export const getStaff = async () => {
  const response = await API.get("/staff");
  return response.data;
};

export const createStaff = async (payload) => {
  const response = await API.post("/staff", payload);
  return response.data;
};

export const updateStaff = async (id, payload) => {
  const response = await API.put(`/staff/${id}`, payload);
  return response.data;
};

export const approveStaff = async (id) => {
  const response = await API.patch(`/staff/${id}/approve`);
  return response.data;
};

export const rejectStaff = async (id) => {
  const response = await API.patch(`/staff/${id}/reject`);
  return response.data;
};

export const suspendStaff = async (id) => {
  const response = await API.patch(`/staff/${id}/suspend`);
  return response.data;
};

export const deleteStaff = async (id) => {
  const response = await API.delete(`/staff/${id}`);
  return response.data;
};
