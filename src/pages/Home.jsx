import React, { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import AddTodoForm from "../components/AddTodoForm";
import TodoList from "../components/TodoList";
import { useAuth } from "../context/AuthContext";
import { Plus, Check, X, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { db } from "../firebase";
import { doc, updateDoc, onSnapshot } from "firebase/firestore";

// ✅ shadcn ui imports
import { Button } from "@/components/ui/button";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

function Home() {
  const { currentUser, role } = useAuth();
  const [activeTab, setActiveTab] = useState("todos");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // 🔹 Realtime clients state
  const [clients, setClients] = useState([]);

  // 🔹 Listen for realtime updates from Firestore
  useEffect(() => {
    if (!currentUser) return;

    const devRef = doc(db, "users", currentUser.uid);
    const unsubscribe = onSnapshot(devRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setClients(data.clients || []); // realtime update clients
      }
    });

    return () => unsubscribe();
  }, [currentUser]);

  const tabs = [
    { key: "todos", label: "Todo" },
    { key: "in-process", label: "In Process" },
    { key: "done", label: "Done" },
  ];

  if (role === "user" && currentUser?.devCode) {
    tabs.push({ key: "clients", label: "Clients" });
  }

  const handleCopyDevCode = () => {
    if (currentUser?.devCode) {
      navigator.clipboard.writeText(currentUser.devCode);
      toast.success("Developer Code copied!");
    }
  };

  // 🔹 handle action approved/reject/delete
  const handleClientAction = async (clientId, action) => {
    try {
      const devRef = doc(db, "users", currentUser.uid);
      const clientRef = doc(db, "users", clientId);

      // 1️⃣ Update developer's clients array locally
      let updatedClients = clients
        .map((c) =>
          c.id === clientId
            ? action === "delete"
              ? null
              : { ...c, status: action }
            : c
        )
        .filter(Boolean);

      await updateDoc(devRef, { clients: updatedClients });

      // 2️⃣ Update client's own document
      if (action === "approved") {
        await updateDoc(clientRef, {
          status: "approved",
          linkedUserId: currentUser.uid, // link developer
        });
      } else if (action === "rejected") {
        await updateDoc(clientRef, { status: "rejected" });
      } else if (action === "delete") {
        await updateDoc(clientRef, {
          status: "removed",
          linkedUserId: null,
        });
      }

      toast.success(`Client ${action === "delete" ? "deleted" : action}`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to update client");
    }
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="max-w-7xl mx-auto p-4">
        {!currentUser ? (
          <p className="text-center text-gray-600 text-lg">
            Please login to see your todos.
          </p>
        ) : (
          <>
            {/* ✅ Welcome Section */}
            <div className="flex flex-col md:flex-row items-start md:items-center gap-2 md:gap-0 justify-between bg-white shadow-sm p-4 rounded-md mb-2">
              <h2 className="text-xl font-bold">
                Welcome,{" "}
                <span className="text-yellow-400">
                  {currentUser.name || currentUser.email}
                </span>
              </h2>

              {/* ✅ Show Dev Code for user */}
              {role === "user" && currentUser.devCode && (
                <div className="flex items-center gap-2 bg-neutral-100 px-3 py-1 rounded-md">
                  <span className="text-sm font-medium">
                    Employee Code: <span className="font-mono">{currentUser.devCode}</span>
                  </span>
                  <Button
                    className="active:scale-105"
                    size="sm"
                    variant="outline"
                    onClick={handleCopyDevCode}
                  >
                    Copy
                  </Button>
                </div>
              )}
            </div>

            {role === "user" && (
              <>
                {/* ✅ Add Todo Form inside Dialog */}
                <div className="mb-3">
                  <div className="flex items-center justify-start">
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                      <DialogTrigger asChild>
                        <Button
                          variant="default"
                          className="flex items-center gap-2 shadow-md active:scale-105"
                        >
                          <Plus size={16} /> Add Task
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-lg">
                        <DialogHeader>
                          <DialogTitle className="text-lg font-bold">
                            Add a new Task
                          </DialogTitle>
                        </DialogHeader>
                        <div className="mt-2 border-t pt-4">
                          <AddTodoForm
                            defaultCategory="todos"
                            onTaskAdded={() => setIsDialogOpen(false)}
                          />
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>

                {/* ✅ Shadcn Tabs with Icons */}
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="grid grid-cols-4 w-full mb-2 rounded-lg">
                    {tabs.map((tab) => (
                      <TabsTrigger
                        className="p-0 text-sm font-medium bg-gray-100"
                        key={tab.key}
                        value={tab.key}
                      >
                        {tab.label}
                      </TabsTrigger>
                    ))}
                  </TabsList>

                  {/* 🔹 Todos Tabs */}
                  {tabs
                    .filter((t) => t.key !== "clients")
                    .map((tab) => (
                      <TabsContent key={tab.key} value={tab.key}>
                        <Card>
                          <CardHeader>
                            <CardTitle>{tab.label}</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <TodoList activeTab={tab.key} />
                          </CardContent>
                        </Card>
                      </TabsContent>
                    ))}

                  {/* 🔹 Clients Tab */}
                  <TabsContent value="clients">
                    <Card>
                      <CardHeader>
                        <CardTitle>Client Requests</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {clients.length === 0 ? (
                          <p className="text-gray-500">No clients linked.</p>
                        ) : (
                          <ul className="space-y-3">
                            {clients.map((client) => (
                              <li
                                key={client.id}
                                className="flex items-center justify-between bg-white p-4 rounded-md shadow hover:shadow-md transition"
                              >
                                <div>
                                  <p className="font-medium">{client.name}</p>
                                  <p className="text-sm text-gray-500">{client.email}</p>
                                  <Badge
                                    className={`mt-1 ${
                                      client.status === "approved"
                                        ? "bg-green-100 text-green-700"
                                        : client.status === "rejected"
                                        ? "bg-red-100 text-red-700"
                                        : "bg-yellow-100 text-yellow-700"
                                    }`}
                                  >
                                    {client.status}
                                  </Badge>
                                </div>
                                <div className="flex gap-2">
                                  {client.status === "pending" && (
                                    <>
                                      <Button
                                        size="sm"
                                        className="flex items-center gap-1 text-green-700"
                                        variant="outline"
                                        onClick={() =>
                                          handleClientAction(client.id, "approved")
                                        }
                                      >
                                        <Check size={14} /> Approve
                                      </Button>
                                      <Button
                                        size="sm"
                                        className="flex items-center gap-1 text-red-700"
                                        variant="outline"
                                        onClick={() =>
                                          handleClientAction(client.id, "rejected")
                                        }
                                      >
                                        <X size={14} /> Reject
                                      </Button>
                                    </>
                                  )}
                                  <Button
                                    size="sm"
                                    className="flex items-center gap-1 text-red-600"
                                    variant="outline"
                                    onClick={() => handleClientAction(client.id, "delete")}
                                  >
                                    <Trash2 size={14} /> Remove
                                  </Button>
                                </div>
                              </li>
                            ))}
                          </ul>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </>
            )}

            {role === "admin" && (
              <Card className="p-4 bg-green-50 border-green-200">
                <p className="text-green-700 font-medium">
                  You are logged in as Admin. Use Admin Panel to manage all tasks.
                </p>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default Home;
