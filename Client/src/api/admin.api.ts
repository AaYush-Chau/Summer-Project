import axios from "axios";

const API_BASE_URL = "http://localhost:9005";

const getConfig = () => {
  const token = localStorage.getItem("access_token");

  return {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
};

export const getAdminDashboard = async () => {
  const response = await axios.get(
    `${API_BASE_URL}/admin/dashboard`,
    getConfig()
  );

  return response.data;
};

export const getAdminUsers = async () => {
  const response = await axios.get(
    `${API_BASE_URL}/admin/users`,
    getConfig()
  );

  return response.data;
};

export const getAdminProviders = async () => {
  const response = await axios.get(
    `${API_BASE_URL}/admin/providers`,
    getConfig()
  );

  return response.data;
};

export const getAdminBookings = async () => {
  const response = await axios.get(
    `${API_BASE_URL}/admin/bookings`,
    getConfig()
  );

  return response.data;
};

export const getAdminReviews = async () => {
  const response = await axios.get(
    `${API_BASE_URL}/admin/reviews`,
    getConfig()
  );

  return response.data;
};