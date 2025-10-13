// Login.jsx
import React, { useState, useEffect } from "react";
import { auth } from "../firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Logo from "../assets/OctaTech_Logo.webp";

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Spinner } from "@/components/ui/spinner";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [Loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { currentUser, role } = useAuth();

  const handleLogin = async () => {
    setError("");
    setLoading(true)
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // 🔑 navigate ko yahan nahi karna
    } catch (err) {
      console.error(err);
      if (err.code === "auth/user-not-found") {
        setError("❌ Account does not exist. Please register first.");
      } else if (err.code === "auth/wrong-password") {
        setError("❌ Wrong password. Try again.");
      } else if (err.code === "auth/invalid-email") {
        setError("❌ Invalid email format.");
      } else {
        setError("❌ Login failed. Please try again.");
      }
    } finally {
      setLoading(false)
    }
  };

  // ✅ Redirect after login based on role
  useEffect(() => {
    if (currentUser && role) {
      if (role === "admin") {
        navigate("/admin", { replace: true });
      } else if (role === "client") {
        navigate("/client", { replace: true });
      } else if (role === "user") {
        navigate("/", { replace: true }); // 👈 ab user ka Home page
      } else {
        navigate("/", { replace: true }); // fallback
      }
    }
  }, [currentUser, role, navigate]);

  return (
    <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200">
      <Card className="w-full max-w-md shadow-xl rounded-2xl border border-gray-200 bg-white/90 backdrop-blur-sm transition-all duration-300 gap-3">
        {/* 🔹 Logo */}
        <div className="flex justify-center">
          <img
            src={Logo}
            alt="OctaTech Logo"
            className="h-6 select-none"
          />
        </div>

        <CardHeader className="px-6 pt-0">
          <CardTitle className="text-center text-2xl font-bold text-neutral-700 tracking-tight">
            Welcome Back
          </CardTitle>
          <p className="text-center text-gray-500 text-sm">
            Login to your OctaTech account
          </p>
        </CardHeader>

        <CardContent className="px-6 pb-2 space-y-4">
          {error && (
            <p className="text-red-600 text-sm bg-red-50 border border-red-200 px-3 py-2 rounded-md">
              {error}
            </p>
          )}

          <div className="space-y-1">
            <Label className="text-sm text-gray-700">Email</Label>
            <Input
              type="email"
              placeholder="you@example.com"
              onChange={(e) => setEmail(e.target.value)}
              className="focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-sm text-gray-700">Password</Label>
            <Input
              type="password"
              placeholder="Enter your password"
              onChange={(e) => setPassword(e.target.value)}
              className="focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>
        </CardContent>

        <CardFooter className="flex flex-col items-center px-6 pb-6 space-y-2">
          <Button
            onClick={handleLogin}
            disabled={Loading}
            className="w-full h-10 bg-[#f7e347] hover:bg-[#edda4c] text-white font-semibold rounded-lg transition-all cursor-pointer"
          >
            {Loading ? (
              <div className="flex items-center justify-center gap-2">
                <Spinner className="h-4 w-4 text-white" />
                Logging in...
              </div>
            ) : (
              "Login"
            )}
          </Button>

          <div className="text-center text-sm text-gray-600">
            Don’t have an account?{" "}
            <Link
              to="/register"
              className="text-[#FCE951] font-medium hover:underline"
            >
              Register here
            </Link>
          </div>

          <div className="text-center">
            <Link
              to="/forgot-password"
              className="text-[13px] text-gray-500 hover:underline"
            >
              Forgot Password?
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>

  );
}

export default Login;
