import React from "react";
import { auth } from "../firebase";
import { signOut } from "firebase/auth";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import Logo from "../assets/OctaTech_Logo.webp";

function Navbar() {
  const { currentUser, role } = useAuth();
  const location = useLocation();

  const handleLogout = () => {
    signOut(auth);
  };

  // ✅ Helper for active link styling
  const linkClasses = (path) =>
    `px-3 py-2 rounded-md text-sm font-medium transition-colors ${
      location.pathname === path
        ? "bg-yellow-50 text-yellow-600"
        : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-800"
    }`;

  return (
    <nav className="w-full bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Logo */}
        <Link
          to="/"
          className="text-lg font-bold text-neutral-700 hover:text-neutral-800 transition-colors"
        >
          <img src={Logo} alt="Octa_Tech_Logo" width={120} />
        </Link>

        {/* Right Side */}
        {currentUser ? (
          <div className="flex items-center gap-4">
            <Link to="/" className={linkClasses("/")}>
              Home
            </Link>

            {role === "user" && (
              <Link to="/call-schedule" className={linkClasses("/call-schedule")}>
                Call Schedule
              </Link>
            )}

            {/* ✅ Logout */}
            <Button
              onClick={handleLogout}
              variant="outline"
              size="sm"
              className="ml-2 cursor-pointer flex items-center gap-2 active:scale-105"
            >
              <LogOut size={16} />
              <span>Logout</span>
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <Link to="/login" className="text-blue-600 hover:underline">
              Login
            </Link>
            <Link to="/register" className="text-blue-600 hover:underline">
              Register
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}

export default Navbar;
