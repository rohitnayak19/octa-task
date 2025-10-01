import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebase";
import { doc, getDocs, query, where, collection, updateDoc } from "firebase/firestore";
import toast from "react-hot-toast";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { useNavigate } from "react-router-dom";

function LinkDeveloper() {
  const { currentUser } = useAuth();
  const [devCode, setDevCode] = useState("");
  const navigage = useNavigate()

  const handleLink = async () => {
    try {
      // Developer ko find karo by devCode
      const q = query(collection(db, "users"), where("devCode", "==", devCode));
      const snap = await getDocs(q);

      if (snap.empty) {
        toast.error("Developer not found!");
        return;
      }

      const devDoc = snap.docs[0];
      const devId = devDoc.id;

      // Client doc update
      await updateDoc(doc(db, "users", currentUser.uid), {
        status: "pending",
        linkedUserId: devId,
      });

      // Developer ke clients array me add
      const devData = devDoc.data();
      let updatedClients = [...(devData.clients || []), {
        id: currentUser.uid,
        name: currentUser.name || "",
        email: currentUser.email,
        status: "pending",
      }];

      await updateDoc(doc(db, "users", devId), { clients: updatedClients });

      toast.success("Request sent to developer!");
      navigage("/client")
    } catch (err) {
      console.error("Error linking developer:", err);
      toast.error("Something went wrong");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <div className="p-6 bg-white shadow rounded-md w-96">
        <h2 className="text-xl font-bold mb-4">Link to Developer</h2>
        <Input
          type="text"
          placeholder="Enter Developer Code"
          value={devCode}
          onChange={(e) => setDevCode(e.target.value)}
          className="w-full border px-3 py-2 rounded mb-4"
        />
        <Button
          onClick={handleLink}
          className={'w-full'}
        >
          Send Request
        </Button>
      </div>
    </div>
  );
}

export default LinkDeveloper;
