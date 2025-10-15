import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, updateDoc, writeBatch, arrayRemove, arrayUnion } from "firebase/firestore";
import { db } from "../firebase";
import TodoList from "../components/TodoList";
import AddTodoForm from "../components/AddTodoForm";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ArrowLeft, Trash2, Plus, UsersRound, X, Check } from "lucide-react";
import { Button } from "../components/ui/button";
import toast from "react-hot-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import Navbar from "../components/Navbar";

function UserDashboard() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState("todos");
  const [developer, setDeveloper] = useState(null)

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const userRef = doc(db, "users", userId);
        const snapshot = await getDoc(userRef);
        if (snapshot.exists()) {
          const data = { id: userId, ...snapshot.data() };
          setUser(data);

          // Agar client hai aur linkedUserId hai → dev ka naam fetch karo
          if (data.role === "client" && data.linkedUserId) {
            const devRef = doc(db, "users", data.linkedUserId);
            const devSnap = await getDoc(devRef);
            if (devSnap.exists()) {
              setDeveloper({ id: devSnap.id, ...devSnap.data() });
            }
          }
        }
      } catch (error) {
        console.error("Failed to fetch user:", error);
      }
    };

    fetchUser();
  }, [userId]);

  // ✅ Helper to update developer's client array safely
  const updateDeveloperClientStatus = async (developerId, clientId, status) => {
    const devRef = doc(db, "users", developerId);
    const devSnap = await getDoc(devRef);

    if (!devSnap.exists()) return;

    const devData = devSnap.data();
    const updatedClients = (devData.clients || []).map((c) =>
      c.id === clientId ? { ...c, status } : c
    );

    await updateDoc(devRef, { clients: updatedClients });
  };
  // ✅ Approve
  const handleApprove = async (client) => {
    try {
      const clientRef = doc(db, "users", client.id);
      const clientSnap = await getDoc(clientRef);

      if (!clientSnap.exists()) {
        toast.error("Client not found");
        return;
      }

      // Get developer linked to this client
      const clientData = clientSnap.data();
      const developerId = clientData.linkedUserId || client.linkedUserId;

      if (!developerId) {
        toast.error("No linked developer found for this client");
        return;
      }

      // Get developer’s data
      const devRef = doc(db, "users", developerId);
      const devSnap = await getDoc(devRef);
      if (!devSnap.exists()) return;

      const devData = devSnap.data();
      const updatedClients = (devData.clients || []).map((c) =>
        c.id === client.id ? { ...c, status: "approved" } : c
      );

      // Use Firestore batch to update both docs atomically
      const batch = writeBatch(db);
      batch.update(clientRef, { status: "approved", linkedUserId: developerId });
      batch.update(devRef, { clients: updatedClients });
      await batch.commit();

      toast.success("Client approved!");
    } catch (err) {
      console.error("Approval error:", err);
      toast.error("Approval failed");
    }
  };


  // ✅ Reject
  const handleReject = async (client) => {
    try {
      const clientRef = doc(db, "users", client.id);
      const clientSnap = await getDoc(clientRef);
      if (!clientSnap.exists()) return;

      const clientData = clientSnap.data();
      const developerId = clientData.linkedUserId || client.linkedUserId;
      if (!developerId) return;

      const devRef = doc(db, "users", developerId);
      const devSnap = await getDoc(devRef);
      if (!devSnap.exists()) return;

      const devData = devSnap.data();
      const updatedClients = (devData.clients || []).map((c) =>
        c.id === client.id ? { ...c, status: "rejected" } : c
      );

      const batch = writeBatch(db);
      batch.update(clientRef, { status: "rejected" });
      batch.update(devRef, { clients: updatedClients });
      await batch.commit();

      toast.error("Client rejected!");
    } catch (err) {
      console.error("Rejection error:", err);
      toast.error("Rejection failed");
    }
  };

  // ✅ Remove
  const handleDelete = async (client) => {
    try {
      const clientRef = doc(db, "users", client.id);
      const clientSnap = await getDoc(clientRef);
      if (!clientSnap.exists()) return;

      const clientData = clientSnap.data();
      const developerId = clientData.linkedUserId || client.linkedUserId;
      if (!developerId) return;

      const devRef = doc(db, "users", developerId);
      const devSnap = await getDoc(devRef);
      if (!devSnap.exists()) return;

      const devData = devSnap.data();
      const updatedClients = (devData.clients || []).filter(
        (c) => c.id !== client.id
      );

      const batch = writeBatch(db);
      batch.update(clientRef, { status: "removed", linkedUserId: null });
      batch.update(devRef, { clients: updatedClients });
      await batch.commit();

      toast.success("Client removed!");
    } catch (err) {
      console.error("Removal error:", err);
      toast.error("Removal failed");
    }
  };


  const tabs = [
    { key: "todos", label: "Todo" },
    { key: "in-process", label: "In Progress" },
    { key: "done", label: "Done" },
    { key: "clients", label: "Clients" },
  ];

  // ✅ If role is client → show only client details
  if (user?.role === "client") {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <Button
            onClick={() => navigate(-1)}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <ArrowLeft size={16} /> Back
          </Button>
          <h2 className="text-2xl font-bold">Client Details</h2>
        </div>

        <Card className="p-6">
          <h3 className="text-xl font-semibold">{user.name}</h3>
          <p className="text-gray-600">{user.email}</p>

          <p className="mt-2">
            Status:{" "}
            <span
              className={
                user.status === "approved"
                  ? "text-green-600"
                  : user.status === "pending"
                    ? "text-yellow-600"
                    : "text-red-600"
              }
            >
              {user.status}
            </span>
          </p>

          {developer ? (
            <p className="mt-2">
              Linked Developer: <strong>{developer.name || "Unnamed"}</strong>
              <span className="text-gray-500 text-sm"> ({developer.id})</span>
            </p>
          ) : (
            <p className="mt-2 text-gray-500">Not linked to any developer</p>
          )}


          {/* ✅ Admin Actions */}
          <div className="flex gap-2 mt-4">
            {user.status === "pending" && (
              <>
                <Button onClick={() => handleApprove(user)}>Approve</Button>
                <Button
                  variant="destructive"
                  onClick={() => handleReject(user)}
                >
                  Reject
                </Button>
              </>
            )}
            {user.status === "approved" && (
              <Button
                variant="outline"
                onClick={() => handleDelete(user)}
              >
                Remove
              </Button>
            )}
          </div>
        </Card>
      </div>
    );
  }

  // ✅ If role is user → show full developer dashboard
  return (
    <>
      <Navbar />
      <div className="p-6 max-w-8xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <Button
            onClick={() => navigate(-1)}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <ArrowLeft size={16} /> Back
          </Button>
          <h2 className="text-2xl font-bold flex gap-1 items-center">
            <UsersRound /> User Dashboard {user ? `(${user.name || "Unnamed"})` : `(${userId})`}
          </h2>

          {user?.devCode && (
            <div className="mt-2 flex items-center pl-2 py-px rounded-sm bg-gray-100 gap-2">
              <span className="text-sm font-mono rounded">
                Manager Code: {user.devCode}
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
            <Button className="my-2 cursor-pointer">
              <Plus size={20} /> Add Task
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Task</DialogTitle>
            </DialogHeader>
            <AddTodoForm
              defaultCategory={activeTab}
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
                  {/* <CardHeader>
                    <CardTitle>{tab.label}</CardTitle>
                  </CardHeader> */}
                  <CardContent>
                    <TodoList activeTab={tab.key} userId={userId} isAdmin />
                  </CardContent>
                </Card>
              </TabsContent>
            ))}

          {/* ✅ Clients Tab */}
          <TabsContent value="clients">
            <Card className="gap-2">
              <CardHeader>
                <CardTitle className="text-xl">Client Requests</CardTitle>
              </CardHeader>
              <CardContent className="m-0">
                {user?.clients?.length ? (
                  <ul className="space-y-4">
                    {user.clients.map((client, idx) => (
                      <li
                        key={idx}
                        className="flex justify-between items-center shadow-sm px-2 py-3 rounded-lg"
                      >
                        <div>
                          <p className="font-semibold text-neutral-700">{client.name}</p>
                          <p className="text-sm text-gray-600 mb-1">{client.email}</p>
                          <p className="text-xs">
                            {/* Status:{" "} */}
                            <span
                              className={
                                client.status === "approved"
                                  ? "text-green-700 bg-green-100 px-2 py-1 rounded-2xl font-semibold"
                                  : client.status === "rejected"
                                    ? "text-red-600 bg-red-100 px-2 rounded-2xl font-semibold py-1"
                                    : "text-yellow-600 bg-yellow-100 px-2 rounded-2xl font-semibold py-1"
                              }
                            >
                              {client.status}
                            </span>
                          </p>
                        </div>

                        <div className="flex gap-2">
                          {client.status === "pending" && (
                            <>
                              <Button className={'cursor-pointer text-green-700'} variant={'outline'} size="sm" onClick={() => handleApprove(client)}>
                                <Check stroke="green"/> Approve
                              </Button>
                              <Button
                                className={'cursor-pointer'}
                                size="sm"
                                variant="outline"
                                onClick={() => handleReject(client)}
                              >
                               <X stroke="orange"/> Reject
                              </Button>
                            </>
                          )}
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button

                                size="sm"
                                className="flex cursor-pointer items-center gap-1 text-red-700"
                                variant="outline"
                              >
                                <Trash2 size={10} /> Remove
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
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(client)}
                                >
                                  Yes, Reject
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
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
    </>
  );
}

export default UserDashboard;
