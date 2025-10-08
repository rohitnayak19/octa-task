import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { db, auth } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import TodoList from "../components/TodoList";
import AddTodoForm from "../components/AddTodoForm";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Loader2, LogOut, MoveRight, Plus, Clock } from "lucide-react";
import { signOut } from "firebase/auth";
import { Button } from "../components/ui/button";
import { useNavigate } from "react-router-dom";
import Logo from "../assets/OctaTech_Logo.webp";
import { Link } from "react-router-dom";
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
      console.error("Logout error:", err);
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
    return <p className="text-center mt-10 text-red-600">Client record not found.</p>;
  }

  if (clientInfo.status === "pending") {
    return (
      <>
        <nav className="shadow-sm p-2">
          <div className="flex justify-between items-center max-w-8xl mx-auto px-6 py-2">
            <Link
              to="/"
              className="text-lg font-bold text-neutral-700 hover:text-neutral-800 transition-colors flex items-center gap-2"
            >
              <img src={Logo} alt="Octa_Tech_Logo" width={120} />
            </Link>
            <Button
              onClick={handleLogout}
              variant="outline"
              size="sm"
              className="mt-2 cursor-pointer flex items-center gap-2 active:scale-105"
            >
              <LogOut size={16} />
              <span>Logout</span>
            </Button>
          </div>
        </nav>
        <div className="flex flex-col items-center justify-center min-h-96 px-4">
          <div className="bg-white p-8 rounded-2xl shadow-sm w-full max-w-4xl text-center">
            <div className="flex flex-col items-center space-y-4">
              <div className="bg-blue-100 text-blue-600 p-3 rounded-full">
                <Clock className="w-6 h-6" />
              </div>

              <h2 className="text-2xl font-semibold text-gray-800">Waiting for Approval</h2>
              <p className="text-gray-600">
                Your manager has not approved your access yet. You’ll be notified once it’s approved.
              </p>

              <Button
                onClick={handleLogout}
                variant="outline"
                className="mt-2 text-gray-600 hover:text-red-600 border-gray-300"
              >
                <LogOut className="mr-2" /> Logout
              </Button>
            </div>
          </div>
        </div>

      </>
    );
  }

  if (clientInfo.status === "rejected") {
    return (
      <>
        <nav className="shadow-sm p-2">
          <div className="flex justify-between items-center max-w-8xl mx-auto px-6 py-2">
            <Link
              to="/"
              className="text-lg font-bold text-neutral-700 hover:text-neutral-800 transition-colors flex items-center gap-2"
            >
              <img src={Logo} alt="Octa_Tech_Logo" width={120} />
            </Link>
            <Button
              onClick={handleLogout}
              variant="outline"
              size="sm"
              className="mt-2 cursor-pointer flex items-center gap-2 active:scale-105"
            >
              <LogOut size={16} />
              <span>Logout</span>
            </Button>
          </div>
        </nav>
        <div className="flex flex-col items-center justify-center min-h-96 px-4">
          <div className="bg-white p-8 rounded-2xl shadow-sm w-full max-w-4xl text-center">
            <div className="flex flex-col items-center space-y-4">
              <div className="bg-red-100 text-red-600 p-3 rounded-full">
                <MoveRight className="w-6 h-6" />
              </div>

              <h2 className="text-2xl font-semibold text-gray-800">Access Request Denied</h2>
              <p className="text-gray-600">
                Your manager has not approved your access request. You can try again or contact them for assistance.
              </p>

              <div className="flex gap-2 justify-center mt-4">
                <Button
                variant={'outline'}
                  onClick={() => navigate("/link-developer")}
                  className="group transition-all"
                >
                  Request Again
                  <MoveRight className="ml-2 transition-transform group-hover:translate-x-1" />
                </Button>
                <Button
                  onClick={handleLogout}
                  variant="outline"
                  className="text-gray-600 hover:text-red-600 border-gray-300"
                >
                  <LogOut className="mr-2" /> Logout
                </Button>
              </div>
            </div>
          </div>
        </div>

      </>
    );
  }

  if (clientInfo.status === "removed") {
    return (
      <>
        <nav className="shadow-sm p-2">
          <div className="flex justify-between items-center max-w-8xl mx-auto px-6 py-2">
            <Link
              to="/"
              className="text-lg font-bold text-neutral-700 hover:text-neutral-800 transition-colors flex items-center gap-2"
            >
              <img src={Logo} alt="Octa_Tech_Logo" width={120} />
            </Link>
            <Button
              onClick={handleLogout}
              variant="outline"
              size="sm"
              className="mt-2 cursor-pointer flex items-center gap-2 active:scale-105"
            >
              <LogOut size={16} />
              <span>Logout</span>
            </Button>
          </div>
        </nav>
        <div className="flex flex-col items-center justify-center min-h-96 px-4">
          <div className="bg-white p-8 rounded-2xl shadow-sm w-full max-w-4xl text-center">
            <div className="flex flex-col items-center space-y-4">
              <div className="bg-red-100 text-red-500 p-3 rounded-full">
                <LogOut className="w-6 h-6" />
              </div>

              <h2 className="text-2xl font-semibold text-gray-800">Access Removed</h2>
              <p className="text-gray-600">
                Your manager has temporarily removed your access. You can request access again using a manager code.
              </p>

              <div className="flex gap-2 justify-center mt-4">
                <Button
                  variant={'ghost'}
                  onClick={() => navigate("/link-developer")}
                  className="transition-all border border-red-200"
                >
                  Request Access
                  <MoveRight className="ml-2 transition-transform group-hover:translate-x-1" />
                </Button>
                <Button
                  onClick={handleLogout}
                  variant="outline"
                  className="text-gray-600 hover:text-red-400 border-gray-300"
                >
                  <LogOut className="mr-2" /> Logout
                </Button>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }
  return (
    <>
      <nav className="shadow-sm p-1">
        <div className="flex justify-between items-center max-w-8xl mx-auto px-6 py-2">
          <Link
            to="/"
            className="text-lg font-bold text-neutral-700 hover:text-neutral-800 transition-colors flex items-center gap-2"
          >
            <img src={Logo} alt="Octa_Tech_Logo" width={120} />
          </Link>
          <h2 className="text-2xl font-semibold text-neutral-700">
            Client Dashboard – {clientInfo.name || currentUser.email}
          </h2>
          <Button
            onClick={handleLogout}
            variant="outline"
            size="sm"
            className="mt-2 cursor-pointer flex items-center gap-2 active:scale-105"
          >
            <LogOut size={16} />
            <span>Logout</span>
          </Button>
        </div>
      </nav>
      <div className="p-6 max-w-8xl mx-auto">
        {developerData && (
          <p className="text-gray-600 mb-4">
            Linked Manager: <strong>{developerData.name}</strong>
          </p>
        )}

        {/* ✅ Add Task (Client → Developer) */}
        {developerData && (
          <div className="mb-6">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2">
                  <Plus size={16} /> Add Task for Manager
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
                    <p className="text-gray-500">No Manager data found.</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </>
  );
}

export default ClientDashboard;
