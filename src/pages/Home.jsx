import React, { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import AddTodoForm from "../components/AddTodoForm";
import TodoList from "../components/TodoList";
import { useAuth } from "../context/AuthContext";
import { Plus, Check, X, Trash2, Copy } from "lucide-react";
import toast from "react-hot-toast";
import { db } from "../firebase";
import { doc, updateDoc, onSnapshot, getDoc, query, collection, where } from "firebase/firestore";

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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge";

function Home() {
  const { currentUser, role } = useAuth();
  const [activeTab, setActiveTab] = useState("todos");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  // 🔹 Realtime clients state
  const [clients, setClients] = useState([]);
  const [taskCounts, setTaskCounts] = useState({
    todos: 0,
    "in-process": 0,
    done: 0,
    clients: 0,
  });

  // 🔹 Listen for realtime updates from Firestore
  useEffect(() => {
    if (!currentUser) return;
    const devRef = doc(db, "users", currentUser.uid);
    const unsubscribe = onSnapshot(devRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setClients(data.clients || []);
      }
    });
    return () => unsubscribe();
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return;

    let qBase;
    if (role === "client") {
      // Client ke liye apne assigned tasks hi count honge
      qBase = query(
        collection(db, "todos"),
        where("assignedClients", "array-contains", currentUser.uid)
      );
    } else {
      // Manager/Admin ke liye unke sabhi tasks
      qBase = query(collection(db, "todos"), where("userId", "==", currentUser.uid));
    }

    const unsubscribe = onSnapshot(qBase, (snapshot) => {
      const data = snapshot.docs.map((doc) => doc.data());
      const todos = data.filter((t) => t.status === "todos").length;
      const inProcess = data.filter((t) => t.status === "in-process").length;
      const done = data.filter((t) => t.status === "done").length;

      setTaskCounts({
        todos,
        "in-process": inProcess,
        done,
        clients: (data.clients?.length || clients?.length || 0),
      });
    });

    return () => unsubscribe();
  }, [currentUser, role, clients]);

  const managerQuotes = [
    "Leadership is not about being in charge. It’s about taking care of those in your charge.",
    "Great managers bring out the greatness in others.",
    "A great manager turns challenges into opportunities.",
    "Lead with vision. Execute with passion.",
    "Small progress each day leads to big results — keep pushing!",
    "Your team looks up to you — show them what’s possible today."
  ];

  const randomQuote = managerQuotes[Math.floor(Math.random() * managerQuotes.length)];

  const tabs = [
    { key: "todos", label: "To-do" },
    { key: "in-process", label: "In Progress" },
    { key: "done", label: "Done" },
  ];

  if (role === "user" && currentUser?.devCode) {
    tabs.push({ key: "clients", label: "Clients" });
  }

  const handleCopyDevCode = () => {
    if (currentUser?.devCode) {
      navigator.clipboard.writeText(currentUser.devCode);
      toast.success("Manager Code copied!");
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  const handleClientAction = async (clientId, action) => {
    try {
      const devRef = doc(db, "users", currentUser.uid);
      const clientRef = doc(db, "users", clientId);

      // ✅ Fetch fresh developer document (to avoid stale state)
      const devSnap = await getDoc(devRef);
      if (!devSnap.exists()) return;
      const devData = devSnap.data();

      let updatedClients = [...(devData.clients || [])];

      if (action === "delete") {
        updatedClients = updatedClients.filter((c) => c.id !== clientId);
      } else {
        updatedClients = updatedClients.map((c) =>
          c.id === clientId ? { ...c, status: action } : c
        );
      }

      await updateDoc(devRef, { clients: updatedClients });

      // ✅ Update client’s own document
      if (action === "approved") {
        await updateDoc(clientRef, {
          status: "approved",
          linkedUserId: currentUser.uid,
        });
      } else if (action === "rejected") {
        await updateDoc(clientRef, { status: "rejected" });
      } else if (action === "delete") {
        await updateDoc(clientRef, {
          status: "removed",
          linkedUserId: null,
        });
      }

      toast.success(
        `Client ${action === "delete" ? "removed" : action} successfully!`
      );
    } catch (err) {
      toast.error("Failed to update client");
    }
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="max-w-8xl mx-auto px-2 md:p-4">
        {!currentUser ? (
          <p className="text-center text-gray-600 text-lg">
            Please login to see your todos.
          </p>
        ) : (
          <>
            {/* ✅ Welcome Section */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 bg-gradient-to-r from-white to-yellow-50/10 border-gray-100 mb-2 transition-all duration-300">

              {/* 👋 Welcome Text */}
              <div>
                <h2 className="text-2xl font-semibold text-gray-800 flex items-center gap-2">
                  Welcome,
                  <span className="text-yellow-300  text-2xl font-semibold tracking-tight">
                    {currentUser.name || currentUser.email}
                  </span>
                </h2>
                <p className="text-sm text-gray-500 mt-1 italic">
                  “{randomQuote}”
                </p>
              </div>

              {/* 💼 Manager Code */}
              {role === "user" && currentUser.devCode && (
                <div className="flex items-center gap-3 border bg-white/80 px-2 py-1 rounded-lg hover:shadow-sm transition-all duration-200">
                  <span className="text-sm font-medium text-gray-700">
                    <span className="text-gray-500">Manager Code:</span>{" "}
                    <span className="font-mono text-gray-800">{currentUser.devCode}</span>
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCopyDevCode}
                    className={`border-yellow-300 cursor-pointer hover:bg-yellow-100 hover:-translate-y-[1px] active:scale-75 ease-in transition-all duration-200 
    ${copied ? "bg-green-100 border-green-400 text-green-700" : "text-gray-600"}`}
                  >
                    {copied ? <Check className="text-green-600" /> : <Copy />}
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
                          className="flex items-center cursor-pointer hover:shadow-xl"
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
                        className="p-0 text-sm cursor-pointer font-medium bg-gray-100 flex justify-center items-center gap-1"
                        key={tab.key}
                        value={tab.key}
                      >
                        {tab.label}
                        {tab.key !== "clients" && (
                          <Badge
                            className=" bg-gray-100 text-neutral-500 rounded-full text-xs"
                          >
                            {taskCounts[tab.key] || 0}
                          </Badge>
                        )}
                        {tab.key === "clients" && (
                          <Badge
                            className="bg-gray-100 text-neutral-500 rounded-full text-xs"
                          >
                            {clients.length || 0}
                          </Badge>
                        )}
                      </TabsTrigger>
                    ))}
                  </TabsList>


                  {/* 🔹 Todos Tabs */}
                  {tabs
                    .filter((t) => t.key !== "clients")
                    .map((tab) => (
                      <TabsContent key={tab.key} value={tab.key}>
                        <Card>
                          {/* Tab headers todo in-process done */}
                          {/* <CardHeader>
                            <CardTitle>{tab.label}</CardTitle>
                          </CardHeader> */}
                          <CardContent className="px-1 md:px-4">
                            <TodoList activeTab={tab.key} />
                          </CardContent>
                        </Card>
                      </TabsContent>
                    ))}

                  {/* 🔹 Clients Tab */}
                  <TabsContent value="clients">
                    <Card className="gap-0">
                      <CardHeader>
                        <CardTitle className="text-[22px]">Client Requests</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {clients.length === 0 ? (
                          <p className="text-gray-500">No clients linked.</p>
                        ) : (
                          <ul className="space-y-1">
                            {clients.map((client) => (
                              <li
                                key={client.id}
                                className="flex items-center justify-between p-4 rounded-md shadow hover:shadow-md transition"
                              >
                                <div>
                                  <p className="font-medium">{client.name}</p>
                                  <p className="text-sm text-gray-500">{client.email}</p>
                                  <Badge
                                    className={`mt-1 ${client.status === "approved"
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
                                        className="flex items-center cursor-pointer gap-1 text-green-700"
                                        variant="outline"
                                        onClick={() =>
                                          handleClientAction(client.id, "approved")
                                        }
                                      >
                                        <Check size={14} /> Approve
                                      </Button>
                                      {/* <Button
                                        size="sm"
                                        className="flex cursor-pointer items-center gap-1"
                                        variant="outline"
                                        onClick={() =>
                                          handleClientAction(client.id, "rejected")
                                        }
                                      >
                                        <X size={14} stroke="orange" /> Reject
                                      </Button> */}
                                    </>
                                  )}
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button
                                        size="sm"
                                        className="flex items-center cursor-pointer gap-1 text-red-700"
                                        variant="outline"
                                      >
                                        <Trash2 size={14} /> Remove
                                      </Button>
                                    </AlertDialogTrigger>

                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          This action cannot be undone. This will permanently reject the client request.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>

                                      <AlertDialogFooter>
                                        <AlertDialogCancel className="cursor-pointer">Cancel</AlertDialogCancel>
                                        <AlertDialogAction
                                          className="cursor-pointer"
                                          onClick={() => handleClientAction(client.id, "delete")}
                                        >
                                          Yes, Remove
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
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
