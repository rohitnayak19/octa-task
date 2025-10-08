// Login.jsx
import React, { useState, useEffect } from "react";
import { auth } from "../firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

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
    <div className="flex justify-center items-center min-h-screen bg-gray-100">
      <Card className="w-[400px] shadow-lg">
        <CardHeader>
          <CardTitle className="text-center text-2xl font-bold">Login</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <div>
            <Label className={'my-1'}>Email</Label>
            <Input
              type="email"
              placeholder="Enter your email"
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <Label className={'my-1'}>Password</Label>
            <Input
              type="password"
              placeholder="Enter your password"
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col items-start gap-2">
          <Button onClick={handleLogin} disabled={Loading} className="w-full cursor-pointer">
            {Loading ? (
              <div className="flex items-center justify-center gap-2">
                <Spinner className="h-4 w-4 text-white" />
                Logging in...
              </div>
            ) : (
              "Login"
            )}
          </Button>
          <p className="text-sm text-gray-600">
            Don’t have an account?{" "}
            <Link to="/register" className="text-blue-600 hover:underline">
              Register here
            </Link>
          </p>
          <p className="text-[12px] text-gray-600 text-right">
            <Link to="/forgot-password" className="hover:underline">
              Forgot Password?
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}

export default Login;
