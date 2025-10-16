import React, { useState } from "react";
import { auth, db } from "../firebase";
import {
  createUserWithEmailAndPassword,
  signOut
} from "firebase/auth";
import {
  doc,
  setDoc,
  query,
  collection,
  where,
  getDocs,
  updateDoc,
  arrayUnion
} from "firebase/firestore";
import { useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";

import Logo from "../assets/OctaTech_Logo.webp";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Spinner } from "../components/ui/spinner";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue
} from "../components/ui/select";

function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("user");
  const [devCodeInput, setDevCodeInput] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const generateDevCode = () =>
    "DEV-" + Math.random().toString(36).substring(2, 8).toUpperCase();

  const handleRegister = async () => {
    setError("");
    setLoading(true);

    try {
      const { user } = await createUserWithEmailAndPassword(auth, email, password);

      let userData = {
        uid: user.uid,
        name,
        email,
        role,
        createdAt: new Date(),
      };

      // Manager
      if (role === "user") {
        userData.devCode = generateDevCode();
        userData.clients = [];
        userData.status = "approved";
        userData.adminStatus = "pending";
      }

      // Client
      if (role === "client") {
        if (!devCodeInput.trim()) {
          setError("Please enter a Manager Code.");
          setLoading(false);
          return;
        }

        const q = query(collection(db, "users"), where("devCode", "==", devCodeInput));
        const snap = await getDocs(q);

        if (snap.empty) {
          setError("Invalid Manager Code!");
          setLoading(false);
          return;
        }

        const devDoc = snap.docs[0];
        const devId = devDoc.id;

        userData.linkedUserId = devId;
        userData.status = "pending";
        userData.adminStatus = "pending";

        await updateDoc(doc(db, "users", devId), {
          clients: arrayUnion({
            id: user.uid,
            name,
            email,
            status: "pending",
          }),
        });
      }

      await setDoc(doc(db, "users", user.uid), userData);

      // ✅ Signout first (prevents AuthContext loop)
      await signOut(auth);

      toast.success("Registration successful! Wait for admin approval before login.");

      // ✅ Now navigate
      navigate("/login", { replace: true });
    } catch (err) {
      console.error("Registration error:", err);
      if (err.code === "auth/email-already-in-use") {
        setError("Email already in use.");
      } else if (err.code === "auth/weak-password") {
        setError("Password should be at least 6 characters.");
      } else {
        setError("Registration failed. Try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100">
      <Card className="w-full max-w-md shadow-xl rounded-2xl border border-gray-200 bg-white/90 backdrop-blur-sm transition-all duration-300 gap-3">
        <div className="flex justify-center">
          <img src={Logo} alt="OctaTech Logo" className="h-6 select-none" />
        </div>

        <CardHeader>
          <CardTitle className="text-center text-2xl font-bold">Get Started</CardTitle>
          <p className="text-center text-gray-500 text-sm">
           Sign up for your OctaTech account
          </p>
        </CardHeader>

        <CardContent className="space-y-4">
          {error && <p className="text-red-600 text-sm">{error}</p>}

          <div className="space-y-1">
            <Label>Name</Label>
            <Input
              type="text"
              placeholder="Enter your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label>Email</Label>
            <Input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label>Password</Label>
            <Input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label>Role</Label>
            <Select onValueChange={setRole} defaultValue="user">
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">Manager</SelectItem>
                <SelectItem value="client">Client</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {role === "client" && (
            <div className="space-y-1">
              <Label>Manager Code</Label>
              <Input
                type="text"
                placeholder="Enter Manager Code"
                value={devCodeInput}
                onChange={(e) => setDevCodeInput(e.target.value)}
              />
            </div>
          )}
        </CardContent>

        <CardFooter className="flex flex-col gap-2">
          <Button
            onClick={handleRegister}
            disabled={loading}
            className="w-full h-10 bg-[#f7e347] hover:bg-[#edda4c] text-white font-semibold rounded-lg transition-all cursor-pointer text-lg"
          >
            {loading ? (
              <div className="flex justify-center items-center gap-2">
                <Spinner /> Registering...
              </div>
            ) : (
              "Register"
            )}
          </Button>

          <p className="text-sm text-gray-600">
            Already have an account?{" "}
            <Link to="/login" className="text-[#f7e347] hover:underline">
              Login here
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}

export default Register;
