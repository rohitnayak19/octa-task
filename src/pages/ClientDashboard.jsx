import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { db, auth } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import TodoList from "../components/TodoList";
import AddTodoForm from "../components/AddTodoForm";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Loader2, LogOut, MoveRight, Plus } from "lucide-react";
import { signOut } from "firebase/auth";
import { Button } from "../components/ui/button";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

function ClientDashboard() {
  const { currentUser } = useAuth();
  const [clientInfo, setClientInfo] = useState(null);
  const [developerData, setDeveloperData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error("❌ Logout error:", err);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!currentUser) return;
      try {
        // ✅ Fetch client info from Firestore
        const clientRef = doc(db, "users", currentUser.uid);
        const clientSnap = await getDoc(clientRef);

        if (!clientSnap.exists()) {
          setLoading(false);
          return;
        }

        const data = clientSnap.data();
        setClientInfo(data);

        if (data.status === "approved" && data.linkedUserId) {
          // ✅ Fetch developer data
          const devRef = doc(db, "users", data.linkedUserId);
          const devSnap = await getDoc(devRef);
          if (devSnap.exists()) {
            setDeveloperData({ id: devSnap.id, ...devSnap.data() });
          }
        }
      } catch (err) {
        console.error("❌ Error fetching data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentUser]);

  const tabs = [
    { key: "todos", label: "Todos" },
    { key: "in-process", label: "In Process" },
    { key: "done", label: "Done" },
  ];

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="animate-spin w-8 h-8 text-gray-500" />
      </div>
    );
  }

  if (!clientInfo) {
    return <p className="text-center mt-10 text-red-600">❌ Client record not found.</p>;
  }

  if (clientInfo.status === "pending") {
    return (
      <div className="flex flex-col items-center mt-20">
        <h2 className="text-xl font-bold">⏳ Waiting for approval</h2>
        <p className="text-gray-600 mt-2">
          Your developer has not approved your access yet.
        </p>
        <Button onClick={handleLogout} variant="outline" className="mt-2 text-red-600">
          <LogOut /> Logout
        </Button>
      </div>
    );
  }

  if (clientInfo.status === "rejected") {
    return (
      <div className="flex flex-col items-center mt-20">
        <h2 className="text-xl font-bold text-red-600">Access Rejected </h2>
        <p className="text-gray-600 mt-2">
          Your developer has rejected your request. Please contact them.
        </p>
        <div className="flex gap-1">
          <Button
            onClick={() => navigate("/link-developer")}
            variant="outline"
            className="group"
          >
            Request Again
            <MoveRight className="ml-2 transition-transform group-hover:translate-x-1" />
          </Button>
          <Button onClick={handleLogout} variant="outline" className="text-red-500 hover:text-red-600">
            <LogOut /> Logout
          </Button>
        </div>
      </div>
    );
  }

  if (clientInfo.status === "removed") {
    return (
      <div className="flex flex-col items-center mt-20">
        <h2 className="text-xl font-bold text-red-600">Removed by Developer</h2>
        <p className="text-gray-600 mt-2 mb-4">
          Your developer has removed your access. You can request again using a Developer Code.
        </p>
        <div className="flex gap-1">
          <Button
            onClick={() => navigate("/link-developer")}
            variant="outline"
            className="group"
          >
            Request Again
            <MoveRight className="ml-2 transition-transform group-hover:translate-x-1" />
          </Button>
          <Button onClick={handleLogout} variant="outline" className="text-red-500 hover:text-red-600">
            <LogOut /> Logout
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">
          👤 Client Dashboard – {clientInfo.name || currentUser.email}
        </h2>
        <Button onClick={handleLogout} variant="outline">
          <LogOut /> Logout
        </Button>
      </div>

      {developerData && (
        <p className="text-gray-600 mb-4">
          Linked Developer: <strong>{developerData.name}</strong>
        </p>
      )}

      {/* ✅ Add Task (Client → Developer) */}
      {developerData && (
        <div className="mb-6">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus size={16} /> Add Task for Developer
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add a new Task</DialogTitle>
              </DialogHeader>
              <AddTodoForm
                defaultCategory="todos"
                overrideUserId={developerData.id}
                onTaskAdded={() => setIsDialogOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
      )}

      <Tabs defaultValue="todos">
        <TabsList className="grid grid-cols-3 w-full mb-4">
          {tabs.map((tab) => (
            <TabsTrigger key={tab.key} value={tab.key}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {tabs.map((tab) => (
          <TabsContent key={tab.key} value={tab.key}>
            <Card>
              <CardHeader>
                <CardTitle>{tab.label}</CardTitle>
              </CardHeader>
              <CardContent>
                {developerData ? (
                  <TodoList activeTab={tab.key} userId={developerData.id} />
                ) : (
                  <p className="text-gray-500">No developer data found.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

export default ClientDashboard;
