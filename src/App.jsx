import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Home from "./pages/Home";
import Register from './pages/Register';
import UserDashboard from './pages/UserDashboard';
import AdminPanel from './pages/AdminPanel';
import ClientDashboard from './pages/ClientDashboard';
import LinkDeveloper from "./pages/LinkDeveloper";
import CallSchedule from "./pages/CallSchedule";
import { Toaster } from "react-hot-toast";
import ForgotPassword from "./pages/ForgetPassword";
import ResetPassword from "./pages/ResetPassoword";

function App() {
  return (
    <AuthProvider>
      <Router>
        <Toaster position="bottom-right" reverseOrder={false} />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          {/* Admin route */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute adminOnly>
                <AdminPanel />
              </ProtectedRoute>
            }
          />

          {/* Admin → View specific user */}
          <Route
            path="/admin/user/:userId"
            element={
              <ProtectedRoute adminOnly>
                <UserDashboard />
              </ProtectedRoute>
            }
          />

          {/* Client route */}
          <Route
            path="/client"
            element={
              <ProtectedRoute>
                <ClientDashboard />
              </ProtectedRoute>
            }
          />

          {/* Default User (Developer) route */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            }
          />

          <Route path="/link-developer" element={
            <ProtectedRoute>
              <LinkDeveloper />
            </ProtectedRoute>
          } />

          <Route
            path="/call-schedule"
            element={
              <ProtectedRoute>
                <CallSchedule />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/user/:userId/call-schedule"
            element={
              <CallSchedule />
            }
          />

        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
