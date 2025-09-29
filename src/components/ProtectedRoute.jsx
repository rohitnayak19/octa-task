import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Loader2 } from "lucide-react";

const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { currentUser, role,loading } = useAuth();

  console.log("🔒 ProtectedRoute - loading:", loading, "currentUser:", currentUser);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!currentUser) {
    console.log("🚫 No user, redirecting to /login");
    return <Navigate to="/login" replace />;
  }

  // ✅ Admin only pages
  if (adminOnly && role !== "admin") {
    return <Navigate to="/" replace />;
  }

    // ✅ Agar admin hai aur already `/` visit kare → `/admin` redirect karo
  if (role === "admin" && location.pathname === "/") {
    return <Navigate to="/admin" replace />;
  }

  console.log("✅ User authenticated, rendering children");
  return children;
};

export default ProtectedRoute;