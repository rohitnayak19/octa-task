import React, { useState } from "react";
import { auth } from "../firebase";
import { signOut } from "firebase/auth";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { LogOut, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import InstallPrompt from "./InstallPrompt";
import Logo from "../assets/OctaTech_Logo.webp";

function Navbar() {
  const { currentUser, role } = useAuth();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  const handleLogout = () => {
    signOut(auth);
  };

  // ✅ Extract userId from URL if admin is viewing user dashboard
  const matchUserDashboard = location.pathname.match(/\/admin\/user\/([^/]+)/);
  const viewedUserId = matchUserDashboard ? matchUserDashboard[1] : null;

  // ✅ Active link helper
  const linkClasses = (path) =>
    `px-3 py-2 rounded-md text-sm font-medium transition-colors ${location.pathname === path
      ? "bg-yellow-50 text-yellow-600"
      : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-800"
    }`;

  return (
    <nav className="w-full bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-8xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Logo */}
        <Link
          to="/"
          className="text-lg font-bold text-neutral-700 hover:text-neutral-800 transition-colors flex items-center gap-2"
        >
          <img src={Logo} alt="Octa_Tech_Logo" width={120} />
        </Link>

        {/* Hamburger (Mobile) */}
        <button
          className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? <X size={22} /> : <Menu size={22} />}
        </button>

        {/* Desktop Menu */}
        <div className="hidden md:flex items-center gap-4">
          {currentUser ? (
            <>
              <Link to="/" className={linkClasses("/")}>
                Home
              </Link>

              {(role === "user" || role === "admin") && (
                <Link
                  to={
                    role === "admin"
                      ? location.pathname.includes("/admin/user/") &&
                        !location.pathname.includes("/call-schedule")
                        ? `${location.pathname}/call-schedule`
                        : location.pathname
                      : "/call-schedule"
                  }
                  className={linkClasses("/call-schedule")}
                >
                  Schedule Call 
                </Link>
              )}
              
              <Button
                onClick={handleLogout}
                variant="outline"
                size="sm"
                className="ml-2 cursor-pointer flex items-center gap-2 active:scale-105"
              >
                <LogOut size={16} />
                <span>Logout</span>
              </Button>
              
              <InstallPrompt/>
            </>
          ) : (
            <>
              <Link to="/login" className="text-blue-600 hover:underline">
                Login
              </Link>
              <Link to="/register" className="text-blue-600 hover:underline">
                Register
              </Link>
            </>
          )}
        </div>
      </div>

      {/* ✅ Mobile Menu */}
      {isOpen && (
        <div className="md:hidden px-4 pb-4 flex flex-col gap-3 border-t border-gray-200 bg-white">
          {currentUser ? (
            <>
              <Link to="/" className={`${linkClasses("/")} w-fit mt-1`}>
                Home
              </Link>
              
              {(role === "user" || role === "admin") && (
                <Link
                  to={
                    role === "admin"
                      ? location.pathname.includes("/admin/user/") &&
                        !location.pathname.includes("/call-schedule")
                        ? `${location.pathname}/call-schedule`
                        : location.pathname
                      : "/call-schedule"
                  }
                  className={linkClasses("/call-schedule")}
                >
                  Call Schedule
                </Link>
              )}

              <InstallPrompt className="mt-2" />

              <Button
                onClick={handleLogout}
                variant="outline"
                size="sm"
                className="mt-2 cursor-pointer flex items-center gap-2 active:scale-105"
              >
                <LogOut size={16} />
                <span>Logout</span>
              </Button>
            </>
          ) : (
            <>
              <Link to="/login" className="text-blue-600 hover:underline">
                Login
              </Link>
              <Link to="/register" className="text-blue-600 hover:underline">
                Register
              </Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
}
export default Navbar;
