
import {
  BrowserRouter,
  Routes,
  Route,
} from "react-router-dom";

import {
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";

import HomePage from "./pages/Home";

import { LoginPage } from "./pages/auth/Login";
import { RegisterPage } from "./pages/auth/Register";

import {
  ProfessionalProfilePage,
} from "./pages/professional/ProfessionalProfile";

import {
  ProfessionalDashboardPage,
} from "./pages/professional/ProfessionalDashboard";

import {
  CustomerDashboardPage,
} from "./pages/customer/CustomerDashboard";

import ServiceProviders from "./pages/services/ServiceProviders";

import Booking from "./pages/booking/Booking";

// Admin
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminProviders from "./pages/admin/AdminProviders";
import AdminBookings from "./pages/admin/AdminBookings";
import AdminReviews from "./pages/admin/AdminReviews";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>

          {/* ==================== HOME ==================== */}

          <Route
            path="/"
            element={<HomePage />}
          />

          {/* ==================== AUTHENTICATION ==================== */}

          <Route
            path="/login"
            element={<LoginPage />}
          />

          <Route
            path="/register"
            element={<RegisterPage />}
          />

          {/* ==================== CUSTOMER ==================== */}

          <Route
            path="/customer/dashboard"
            element={<CustomerDashboardPage />}
          />

          {/* ==================== PROFESSIONAL ==================== */}

          <Route
            path="/professional/profile"
            element={<ProfessionalProfilePage />}
          />

          <Route
            path="/professional/dashboard"
            element={<ProfessionalDashboardPage />}
          />

          {/* ==================== ADMIN ==================== */}

          <Route
            path="/admin/dashboard"
            element={<AdminDashboard />}
          />

          <Route
            path="/admin/users"
            element={<AdminUsers />}
          />

          <Route
            path="/admin/providers"
            element={<AdminProviders />}
          />

          <Route
            path="/admin/bookings"
            element={<AdminBookings />}
          />

          <Route
            path="/admin/reviews"
            element={<AdminReviews />}
          />

          {/* ==================== SERVICE PROVIDERS ==================== */}

          <Route
            path="/services/:service"
            element={<ServiceProviders />}
          />

          {/* ==================== BOOKING ==================== */}

          <Route
            path="/booking/:providerId"
            element={<Booking />}
          />

        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
