
import axios from "axios";

const API_BASE_URL = "http://localhost:9005";

// Get logged-in provider profile
export const getProviderProfile = async () => {
  const token = localStorage.getItem("access_token");

  const response = await axios.get(
    `${API_BASE_URL}/provider/details`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return response.data;
};

// Create provider profile
export const createProviderProfile = async (
  formData: FormData
) => {
  const token = localStorage.getItem("access_token");

  const response = await axios.post(
    `${API_BASE_URL}/provider/details`,
    formData,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return response.data;
};

export const getProviderProfileById = async ( providerId: string ) => 
    { const response = await axios.get( `${API_BASE_URL}/provider/${providerId}` );
 return response.data; };