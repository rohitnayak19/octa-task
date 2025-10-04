import React, { useState } from "react";
import { auth, db } from "../firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, query, collection, where, getDocs, updateDoc, arrayUnion } from "firebase/firestore";
import { useNavigate, Link } from "react-router-dom";

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
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "../components/ui/select";

function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("user"); // default = developer
  const [devCodeInput, setDevCodeInput] = useState(""); // 👈 client ke liye input
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const generateDevCode = () => {
    return "DEV-" + Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const handleRegister = async () => {
    setError("");
    try {
      const res = await createUserWithEmailAndPassword(auth, email, password);
      const user = res.user;

      let userData = {
        uid: user.uid,
        name,
        email,
        role,
        createdAt: new Date(),
      };

      if (role === "user") {
        // ✅ Developer ke liye devCode generate karo
        userData.devCode = generateDevCode();
        userData.clients = [];
      }

      if (role === "client") {
        if (!devCodeInput) {
          setError("❌ Please enter a Developer Code.");
          return;
        }

        // ✅ Developer find karo
        const q = query(collection(db, "users"), where("devCode", "==", devCodeInput));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
          setError("❌ Invalid Developer Code!");
          return;
        }

        const devDoc = snapshot.docs[0];
        const devId = devDoc.id;

        // Client ka data
        userData.linkedUserId = devId;
        userData.status = "pending";

        // Developer ke clients list me add karo
        await updateDoc(doc(db, "users", devId), {
          clients: arrayUnion({
            id: user.uid,
            name,
            email,
            status: "pending",
          }),
        });
      }

      // ✅ Save user
      await setDoc(doc(db, "users", user.uid), userData);

      navigate("/login");
    } catch (err) {
      console.error(err);
      if (err.code === "auth/email-already-in-use") {
        setError("❌ Email already in use.");
      } else if (err.code === "auth/weak-password") {
        setError("❌ Password should be at least 6 characters.");
      } else {
        setError("❌ Registration failed.");
      }
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100">
      <Card className="w-[400px] shadow-lg">
        <CardHeader>
          <CardTitle className="text-center text-2xl font-bold">Register</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <div>
            <Label className={'my-1'}>Name</Label>
            <Input type="text" placeholder="Enter your name" onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label className={'my-1'}>Email</Label>
            <Input type="email" placeholder="Enter your email" onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <Label className={'my-1'}>Password</Label>
            <Input type="password" placeholder="Enter your password" onChange={(e) => setPassword(e.target.value)} />
          </div>

          <div>
            <Label className={'my-1'}>Role</Label>
            <Select onValueChange={setRole} defaultValue="user">
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">Employee</SelectItem>
                <SelectItem value="client">Client</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* ✅ Client ke liye devCode input */}
          {role === "client" && (
            <div>
              <Label className={'mb-2'}>Employee Code</Label>
              <Input
                type="text"
                placeholder="Enter Employee Code"
                value={devCodeInput}
                onChange={(e) => setDevCodeInput(e.target.value)}
              />
            </div>
          )}
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          <Button onClick={handleRegister} className="w-full">
            Register
          </Button>
          <p className="text-sm text-gray-600">
            Already have an account?{" "}
            <Link to="/login" className="text-blue-600 hover:underline">
              Login here
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}

export default Register;
