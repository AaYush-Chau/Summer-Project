
import axios from "axios";

const API_BASE_URL = "http://localhost:9005";

export type ServiceType =
  | "plumber"
  | "electrician"
  | "cleaner"
  | "painter";

export const getProvidersByService = async (
  service: ServiceType
) => {
  const response = await axios.get(
    `${API_BASE_URL}/provider/service/${service}`
  );

  return response.data;
};

