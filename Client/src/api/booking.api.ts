
import axios from "axios";

const API_BASE_URL = "http://localhost:9005";

export type BookingInput = {
  providerId: string;
  service: "plumber" | "electrician" | "cleaner" | "painter";
  bookingDate: string;
  bookingTime: string;
  address: string;
  description: string;
};

export const createBooking = async (
  data: BookingInput
) => {
  const token = localStorage.getItem("access_token");

  const response = await axios.post(
    `${API_BASE_URL}/booking`,
    data,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return response.data;
};

export const getProviderBookings = async () => {
    const token = localStorage.getItem("access_token");
  
    const response = await axios.get(
      `${API_BASE_URL}/booking/provider`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
  
    return response.data;
  };
  
  export const updateBookingStatus = async (
    bookingId: string,
   status: "Accepted" | "Rejected" | "Completed"
  ) => {
    const token = localStorage.getItem("access_token");
  
    const response = await axios.patch(
      `${API_BASE_URL}/booking/${bookingId}/status`,
      { status },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
  
    return response.data;
  };
  export const getCustomerBookings = async () => {
    const token = localStorage.getItem("access_token");
  
    const response = await axios.get(
      `${API_BASE_URL}/booking/customer`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
  
    return response.data;
  };