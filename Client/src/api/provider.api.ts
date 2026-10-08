import axios from "axios";

const API_BASE_URL = "http://localhost:9005";

// JWT auth header, read from localStorage at call time
const authHeaders = () => {
  const token = localStorage.getItem("access_token");
  return {
    Authorization: `Bearer ${token}`,
  };
};

// Get logged-in provider profile
export const getProviderProfile = async (): Promise<unknown> => {
  const response = await axios.get<unknown>(
    `${API_BASE_URL}/provider/details`,
    {
      headers: authHeaders(),
    }
  );

  return response.data;
};

// Create provider profile
export const createProviderProfile = async (
  formData: FormData
): Promise<unknown> => {
  const response = await axios.post<unknown>(
    `${API_BASE_URL}/provider/details`,
    formData,
    {
      headers: authHeaders(),
    }
  );

  return response.data;
};

// Get a provider by id (public)
export const getProviderProfileById = async (
  providerId: string
): Promise<unknown> => {
  const response = await axios.get<unknown>(
    `${API_BASE_URL}/provider/${providerId}`
  );

  return response.data;
};