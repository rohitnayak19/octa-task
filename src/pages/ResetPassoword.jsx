// src/pages/ResetPassword.jsx
import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  verifyPasswordResetCode,
  confirmPasswordReset,
} from "firebase/auth";
import { auth } from "../firebase";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const oobCode = searchParams.get("oobCode");
  const [password, setPassword] = useState("");
  const [validCode, setValidCode] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const checkCode = async () => {
      try {
        await verifyPasswordResetCode(auth, oobCode);
        setValidCode(true);
      } catch {
        toast.error("Invalid or expired reset link.");
      } finally {
        setLoading(false);
      }
    };
    checkCode();
  }, [oobCode]);

  const handleResetPassword = async (e) => {
    e.preventDefault();
    try {
      await confirmPasswordReset(auth, oobCode, password);
      toast.success("Password reset successful! Redirecting to login...");
      setTimeout(() => navigate("/login"), 2500);
    } catch (error) {
      console.error(error);
      toast.error("Failed to reset password. Try again.");
    }
  };

  if (loading)
    return (
      <div className="flex justify-center items-center h-screen text-muted-foreground">
        Verifying reset link...
      </div>
    );

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader>
          <CardTitle>Reset Password</CardTitle>
          <CardDescription>
            {validCode
              ? "Enter a new password for your account."
              : "This reset link is invalid or expired."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {validCode && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <Input
                type="password"
                placeholder="Enter new password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <Button type="submit" className="w-full">
                Reset Password
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPassword;
