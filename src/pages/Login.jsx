import React, { useState, useEffect } from "react";
import { auth, db } from "../firebase";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import {
  doc,
  getDoc,
  getDocs,
  query,
  where,
  collection,
  updateDoc,
  arrayUnion,
} from "firebase/firestore";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";
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
import { Spinner } from "../components/ui/spinner";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [devCode, setDevCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [askDevCode, setAskDevCode] = useState(false);
  const navigate = useNavigate();
  const { currentUser, role } = useAuth();

  // 🧠 Main login logic
  const handleLogin = async () => {
    setError("");
    setLoading(true);
    try {
      const res = await signInWithEmailAndPassword(auth, email, password);
      const user = res.user;

      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        toast.error("User record not found!");
        await signOut(auth);
        setLoading(false);
        return;
      }

      const userData = userSnap.data();

      // 🧩 Admin route
      if (userData.role === "admin") {
        navigate("/admin", { replace: true });
        return;
      }

      // 🧩 Manager route
      if (userData.role === "user") {
        if (userData.adminStatus !== "approved") {
          // toast.error("Your account is pending admin approval.");
          await signOut(auth);
          return;
        }
        navigate("/", { replace: true });
        return;
      }

      // 🧩 Client route
      if (userData.role === "client") {
        if (userData.adminStatus !== "approved") {
          toast.error("Your account is pending admin approval.");
          await signOut(auth);
          return;
        }

        // 🧠 Not linked yet
        if (!userData.linkedUserId) {
          setAskDevCode(true);
          toast("Enter your Manager Code to link your account.");
          return;
        }

        // 🧩 If linked properly
        navigate("/client", { replace: true });
      }
    } catch (err) {
      console.error("Login error:", err);
      if (err.code === "auth/user-not-found") setError("No account found.");
      else if (err.code === "auth/wrong-password") setError("Wrong password.");
      else setError("Login failed.");
      await signOut(auth);
    } finally {
      setLoading(false);
    }
  };

  // 🧩 Client linking logic
  const handleLinkManager = async () => {
    if (!devCode.trim()) {
      toast.error("Please enter manager code.");
      return;
    }

    try {
      const user = auth.currentUser;
      if (!user) {
        toast.error("Please login again.");
        navigate("/login");
        return;
      }

      const q = query(collection(db, "users"), where("devCode", "==", devCode));
      const snap = await getDocs(q);

      if (snap.empty) {
        toast.error("Invalid manager code!");
        return;
      }

      const devDoc = snap.docs[0];
      const devId = devDoc.id;
      const devData = devDoc.data();

      // ✅ Link client to manager
      await updateDoc(doc(db, "users", user.uid), {
        linkedUserId: devId,
        status: "pending",
      });

      // ✅ Add client into manager’s array
      await updateDoc(doc(db, "users", devId), {
        clients: arrayUnion({
          id: user.uid,
          name: user.displayName || "",
          email: user.email,
          status: "pending",
        }),
      });

      toast.success("Request sent to manager!");
      navigate("/client", { replace: true });
    } catch (err) {
      console.error("Error linking manager:", err);
      toast.error("Failed to send request.");
    }
  };

  // 🧩 Auto redirect if already logged in
  useEffect(() => {
    if (currentUser && role) {
      if (role === "admin") navigate("/admin", { replace: true });
      else if (role === "user") navigate("/", { replace: true });
      else if (role === "client") navigate("/client", { replace: true });
    }
  }, [currentUser, role, navigate]);

  return (
    <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200">
      <Card className="w-full max-w-md shadow-xl rounded-2xl border border-gray-200 bg-white/90 backdrop-blur-sm transition-all duration-300 gap-3">
        <div className="flex justify-center">
          <img src={Logo} alt="OctaTech Logo" className="h-6 select-none" />
        </div>

        <CardHeader className="px-6 pt-0">
          <CardTitle className="text-center text-2xl font-bold text-neutral-700 tracking-tight">
            {askDevCode ? "Link Manager" : "Welcome Back"}
          </CardTitle>
          <p className="text-center text-gray-500 text-sm">
            {askDevCode
              ? "Enter your manager’s code to continue"
              : "Hey there, welcome back to OctaTech!"}
          </p>
        </CardHeader>

        <CardContent className="px-6 pb-2 space-y-4">
          {error && (
            <p className="text-red-600 text-sm bg-red-50 border border-red-200 px-3 py-2 rounded-md">
              {error}
            </p>
          )}

          {!askDevCode ? (
            <>
              <div className="space-y-1">
                <Label>Email</Label>
                <Input
                  type="email"
                  placeholder="you@example.com"
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <Label>Password</Label>
                <Input
                  type="password"
                  placeholder="Enter your password"
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </>
          ) : (
            <div className="space-y-1">
              <Label>Manager Code</Label>
              <Input
                type="text"
                placeholder="Enter Manager Code"
                value={devCode}
                onChange={(e) => setDevCode(e.target.value)}
              />
            </div>
          )}
        </CardContent>

        <CardFooter className="flex flex-col items-center px-6 pb-6 space-y-2">
          {!askDevCode ? (
            <Button
              onClick={handleLogin}
              disabled={loading}
              className="w-full h-10 bg-[#f7e347] hover:bg-[#edda4c] text-white font-semibold rounded-lg transition-all cursor-pointer"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <Spinner className="h-4 w-4 text-white" />
                  Logging in...
                </div>
              ) : (
                "Login"
              )}
            </Button>
          ) : (
            <Button
              onClick={handleLinkManager}
              className="w-full h-10 bg-[#f7e347] hover:bg-[#edda4c] text-white font-semibold rounded-lg transition-all"
            >
              Send Request
            </Button>
          )}

          {!askDevCode && (
            <>
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
            </>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}

export default Login;
