import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Loader2 } from "lucide-react";

const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { currentUser, role, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  // ✅ Admin-only pages
  if (adminOnly && role !== "admin") {
    if (role === "client") {
      return <Navigate to="/client" replace />;
    }
    if (role === "user") {
      return <Navigate to="/" replace />;
    }
  }

  // ✅ Redirect rules by role
  if (role === "admin" && location.pathname === "/") {
    return <Navigate to="/admin" replace />;
  }

  if (role === "client" && location.pathname === "/") {
    return <Navigate to="/client" replace />; 
  }

  // ✅ User ke liye `/` normal Home hi chalega
  return children;
};

export default ProtectedRoute;
