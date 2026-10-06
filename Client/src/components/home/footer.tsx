
import { Link } from "react-router-dom";
import { MapPin, Phone, Mail } from "lucide-react";
import {
  FaFacebookF,
  FaInstagram,
  FaTwitter,
} from "react-icons/fa";

export default function Footer() {
  return (
    <footer className="bg-[#16233B] text-white mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">

          {/* Brand */}
          <div>
            <Link to="/" className="text-2xl font-bold">
              Ghar<span className="text-[#E3A73A]">Sewa</span>
            </Link>

            <p className="text-gray-300 text-sm leading-6 mt-4">
              Find trusted local service professionals near you.
            </p>

            <div className="flex gap-4 mt-5">
              <a href="#" className="hover:text-[#F26B5E]">
                <FaFacebookF />
              </a>

              <a href="#" className="hover:text-[#F26B5E]">
                <FaInstagram />
              </a>

              <a href="#" className="hover:text-[#F26B5E]">
                <FaTwitter />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold mb-4">Quick Links</h3>

            <div className="space-y-3 text-sm text-gray-300">
              <Link to="/" className="block hover:text-white">
                Home
              </Link>

              <a href="#categories" className="block hover:text-white">
                Categories
              </a>

              <a href="#how-it-works" className="block hover:text-white">
                How It Works
              </a>

              <Link to="/register" className="block hover:text-white">
                Become a Pro
              </Link>
            </div>
          </div>

          {/* Services */}
          <div>
            <h3 className="font-semibold mb-4">Services</h3>

            <div className="space-y-3 text-sm text-gray-300">
              <p>Plumbing</p>
              <p>Electrical</p>
              <p>Cleaning</p>
              <p>Painting</p>
            </div>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-semibold mb-4">Contact Us</h3>

            <div className="space-y-3 text-sm text-gray-300">
              <p className="flex items-center gap-2">
                <MapPin size={16} />
                Kathmandu, Nepal
              </p>

              <p className="flex items-center gap-2">
                <Phone size={16} />
                +977 98XXXXXXXX
              </p>

              <p className="flex items-center gap-2">
                <Mail size={16} />
                support@gharsewa.com
              </p>
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="border-t border-white/10 mt-10 pt-6 flex flex-col sm:flex-row justify-between gap-3 text-sm text-gray-400">
          <p>© 2026 GharSewa. All rights reserved.</p>

          <div className="flex gap-5">
            <a href="#" className="hover:text-white">
              Privacy Policy
            </a>

            <a href="#" className="hover:text-white">
              Terms & Conditions
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
