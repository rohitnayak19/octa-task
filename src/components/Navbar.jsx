import React from "react";
import { auth } from "../firebase";
import { signOut } from "firebase/auth";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { LogOut } from 'lucide-react';
// ✅ shadcn imports
import { Button } from "@/components/ui/button";
import Logo from '../assets/OctaTech_Logo.webp'

function Navbar() {
  const { currentUser, role } = useAuth();

  const handleLogout = () => {
    signOut(auth);
  };

  return (
    <nav className="w-full bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link
          to="/"
          className="text-lg font-bold text-neutral-700 hover:text-neutral-800 transition-colors"
        >
         <img src={Logo} alt="Octa_Tech_Logo" width={120} />
        </Link>

        {currentUser ? (
          <div className="flex items-center gap-6">
            {/* 👋 User Name */}
            {/* <span className="text-gray-700 font-medium hidden sm:inline">
              Welcome' {currentUser.name || currentUser.email}
            </span> */}

            <Link
              to="/"
              className="text-gray-600 hover:text-gray-800 transition-colors"
            >
              Home
            </Link>

            {role === "admin" && (
              <Link
                to="/admin"
                className="text-blue-600 hover:text-blue-800 transition-colors"
              >
                Admin Panel
              </Link>
            )}

            <Button
              onClick={handleLogout}
              variant="outline"
              size="sm"
              className="ml-2 cursor-pointer active:scale-105"
            >
              <LogOut className="ml-2 " />
              Logout
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
