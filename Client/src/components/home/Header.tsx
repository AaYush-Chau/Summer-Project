
import { Link, useNavigate } from "react-router-dom";

import {
  MapPin,
  Phone,
  Menu,
  X,
  UserRound,
  LogOut,
} from "lucide-react";

import { useState } from "react";

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  const navigate = useNavigate();

  const token = localStorage.getItem("access_token");

  // Get saved user information if available
  const storedUser = localStorage.getItem("user");

  let user = null;

  try {
    user = storedUser
      ? JSON.parse(storedUser)
      : null;
  } catch {
    user = null;
  }

  // Logout
  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user");

    setMenuOpen(false);

    navigate("/login");
  };

  // Dashboard based on account type
  const dashboardPath =
    user?.role === "provider"
      ? "/professional/dashboard"
      : "/customer/dashboard";

  return (
    <header className="sticky top-0 z-50 bg-white shadow-sm">

      {/* Top Bar */}
      <div className="bg-[#16233B] text-white text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2 flex justify-between items-center">

          <div className="flex items-center gap-4">

            <span className="flex items-center gap-1">
              <MapPin size={13} />
              Kathmandu, Nepal
            </span>

            <span className="hidden sm:flex items-center gap-1">
              <Phone size={13} />
              +977 98XXXXXXXX
            </span>

          </div>

          <span className="hidden sm:block">
            Find trusted local professionals
          </span>

        </div>
      </div>

      {/* Navbar */}
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">

        {/* Logo */}
        <Link
          to="/"
          className="text-2xl font-bold text-[#16233B]"
        >
          Near
          <span className="text-[#E3A73A]">
            Pro
          </span>
        </Link>

        {/* Desktop Menu */}
        <div className="hidden md:flex items-center gap-7 text-sm font-medium text-[#16233B]">

          <Link
            to="/"
            className="hover:text-[#F26B5E]"
          >
            Home
          </Link>

          <a
            href="#categories"
            className="hover:text-[#F26B5E]"
          >
            Categories
          </a>

          <a
            href="#how-it-works"
            className="hover:text-[#F26B5E]"
          >
            How It Works
          </a>

          <a
            href="#professionals"
            className="hover:text-[#F26B5E]"
          >
            Professionals
          </a>

        </div>

        {/* Right Side */}
        <div className="hidden md:flex items-center gap-3">

          {!token ? (

            <>
              {/* Not logged in */}

              <Link
                to="/login"
                className="px-4 py-2 text-sm font-medium text-[#16233B] hover:text-[#F26B5E]"
              >
                Sign In
              </Link>

              <Link
                to="/register"
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#16233B] text-white text-sm font-medium hover:bg-[#F26B5E] transition"
              >
                <UserRound size={16} />
                Join NearPro
              </Link>
            </>

          ) : (

            <>
              {/* Logged in */}

              <Link
                to={dashboardPath}
                className="px-4 py-2 text-sm font-medium text-[#16233B] hover:text-[#F26B5E]"
              >
                Dashboard
              </Link>

              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#16233B] text-white text-sm font-medium hover:bg-[#F26B5E] transition"
              >
                <LogOut size={16} />
                Logout
              </button>
            </>

          )}

        </div>

        {/* Mobile Button */}
        <button
          onClick={() =>
            setMenuOpen(!menuOpen)
          }
          className="md:hidden text-[#16233B]"
          aria-label="Toggle menu"
        >
          {menuOpen ? (
            <X size={24} />
          ) : (
            <Menu size={24} />
          )}
        </button>

      </nav>

      {/* Mobile Menu */}
      {menuOpen && (

        <div className="md:hidden border-t bg-white px-4 py-4 space-y-3">

          <Link
            to="/"
            onClick={() =>
              setMenuOpen(false)
            }
            className="block py-2 text-[#16233B]"
          >
            Home
          </Link>

          <a
            href="#categories"
            onClick={() =>
              setMenuOpen(false)
            }
            className="block py-2 text-[#16233B]"
          >
            Categories
          </a>

          <a
            href="#how-it-works"
            onClick={() =>
              setMenuOpen(false)
            }
            className="block py-2 text-[#16233B]"
          >
            How It Works
          </a>

          <a
            href="#professionals"
            onClick={() =>
              setMenuOpen(false)
            }
            className="block py-2 text-[#16233B]"
          >
            Professionals
          </a>

          <div className="pt-2 border-t flex gap-2">

            {!token ? (

              <>
                <Link
                  to="/login"
                  onClick={() =>
                    setMenuOpen(false)
                  }
                  className="flex-1 text-center py-2 rounded-lg border border-gray-300"
                >
                  Sign In
                </Link>

                <Link
                  to="/register"
                  onClick={() =>
                    setMenuOpen(false)
                  }
                  className="flex-1 text-center py-2 rounded-lg bg-[#16233B] text-white"
                >
                  Join NearPro
                </Link>
              </>

            ) : (

              <>
                <Link
                  to={dashboardPath}
                  onClick={() =>
                    setMenuOpen(false)
                  }
                  className="flex-1 text-center py-2 rounded-lg border border-gray-300"
                >
                  Dashboard
                </Link>

                <button
                  onClick={handleLogout}
                  className="flex-1 py-2 rounded-lg bg-[#16233B] text-white"
                >
                  Logout
                </button>
              </>

            )}

          </div>

        </div>

      )}

    </header>
  );
}
