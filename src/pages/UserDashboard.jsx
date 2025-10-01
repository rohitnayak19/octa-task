import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, updateDoc, arrayRemove, arrayUnion } from "firebase/firestore";
import { db } from "../firebase";
import TodoList from "../components/TodoList";
import AddTodoForm from "../components/AddTodoForm"; 
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ArrowLeft, Trash2, Plus } from "lucide-react";
import { Button } from "../components/ui/button";
import toast from "react-hot-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

function UserDashboard() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState("todos"); // ✅ track active tab

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const userRef = doc(db, "users", userId);
        const snapshot = await getDoc(userRef);
        if (snapshot.exists()) {
          setUser({ id: userId, ...snapshot.data() });
        }
      } catch (error) {
        console.error("❌ Failed to fetch user:", error);
      }
    };

    fetchUser();
  }, [userId]);

  // ✅ Approve client
  const handleApprove = async (client) => {
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, {
      clients: arrayUnion({ ...client, status: "approved" }),
    });
    await updateDoc(userRef, {
      clients: arrayRemove(client),
    });

    const clientRef = doc(db, "users", client.id);
    await updateDoc(clientRef, { status: "approved" });

    window.location.reload();
  };

  // ✅ Reject client
  const handleReject = async (client) => {
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, {
      clients: arrayUnion({ ...client, status: "rejected" }),
    });
    await updateDoc(userRef, {
      clients: arrayRemove(client),
    });

    const clientRef = doc(db, "users", client.id);
    await updateDoc(clientRef, { status: "rejected" });

    window.location.reload();
  };

  // ✅ Delete client
  const handleDelete = async (client) => {
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, {
      clients: arrayRemove(client),
    });

    const clientRef = doc(db, "users", client.id);
    await updateDoc(clientRef, {
      linkedUserId: null,
      status: "removed",
    });

    window.location.reload();
  };

  const tabs = [
    { key: "todos", label: "Todos" },
    { key: "in-process", label: "In Process" },
    { key: "done", label: "Done" },
    { key: "clients", label: "Clients" },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <Button
          onClick={() => navigate(-1)}
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
        >
          <ArrowLeft size={16} /> Back
        </Button>
        <h2 className="text-2xl font-bold">
          📋 User Dashboard {user ? `(${user.name || "Unnamed"})` : `(${userId})`}
        </h2>

        {user?.devCode && (
          <div className="mt-2 flex items-center gap-2">
            <span className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
              Dev Code: {user.devCode}
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                navigator.clipboard.writeText(user.devCode);
                toast.success("Developer Code copied!");
              }}
            >
              Copy
            </Button>
          </div>
        )}
      </div>

      {/* ✅ Add Task Button + Dialog */}
      <Dialog>
        <DialogTrigger asChild>
          <Button className="my-2">
            <Plus size={20} /> Add Task
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Task</DialogTitle>
          </DialogHeader>
          <AddTodoForm
            defaultCategory={activeTab} // 👈 active tab ke hisaab se
            overrideUserId={userId}
          />
        </DialogContent>
      </Dialog>

      <Tabs defaultValue="todos" onValueChange={(val) => setActiveTab(val)}>
        <TabsList className="grid grid-cols-4 w-full mb-4">
          {tabs.map((tab) => (
            <TabsTrigger key={tab.key} value={tab.key}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* ✅ Task Tabs */}
        {tabs
          .filter((t) => t.key !== "clients")
          .map((tab) => (
            <TabsContent key={tab.key} value={tab.key}>
              <Card>
                <CardHeader>
                  <CardTitle>{tab.label}</CardTitle>
                </CardHeader>
                <CardContent>
                  <TodoList activeTab={tab.key} userId={userId} isAdmin />
                </CardContent>
              </Card>
            </TabsContent>
          ))}

        {/* ✅ Clients Tab */}
        <TabsContent value="clients">
          <Card>
            <CardHeader>
              <CardTitle>Clients</CardTitle>
            </CardHeader>
            <CardContent>
              {user?.clients?.length ? (
                <ul className="space-y-4">
                  {user.clients.map((client, idx) => (
                    <li
                      key={idx}
                      className="flex justify-between items-center border p-3 rounded-lg"
                    >
                      <div>
                        <p className="font-bold">{client.name}</p>
                        <p className="text-sm text-gray-600">{client.email}</p>
                        <p className="text-xs">
                          Status:{" "}
                          <span
                            className={
                              client.status === "approved"
                                ? "text-green-600"
                                : client.status === "rejected"
                                ? "text-red-600"
                                : "text-yellow-600"
                            }
                          >
                            {client.status}
                          </span>
                        </p>
                      </div>

                      <div className="flex gap-2">
                        {client.status === "pending" && (
                          <>
                            <Button size="sm" onClick={() => handleApprove(client)}>
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleReject(client)}
                            >
                              Reject
                            </Button>
                          </>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(client)}
                        >
                          <Trash2 stroke="red" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500">No clients yet.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default UserDashboard;
