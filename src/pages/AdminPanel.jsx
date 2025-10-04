import React, { useEffect, useState } from "react";
import { doc, deleteDoc, collection, getDocs } from "firebase/firestore";
import { db, auth } from "../firebase";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LogOut, Search, UsersRound } from "lucide-react";
import { signOut } from "firebase/auth";
import Logo from "../assets/OctaTech_Logo.webp";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";

function AdminPanel() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUsers = async () => {
      const snapshot = await getDocs(collection(db, "users"));
      const usersData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setUsers(usersData);
    };
    fetchUsers();
  }, []);

  // ✅ Logout Function
  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/login");
    } catch (error) {
      console.error("❌ Logout failed:", error);
    }
  };

  // ✅ Filtered Users
  const filteredUsers = users.filter((user) =>
    (user.name || "Unnamed").toLowerCase().includes(search.toLowerCase())
  );

  // ✅ Separate Users and Clients
  const onlyUsers = filteredUsers.filter((u) => u.role === "user");
  const onlyClients = filteredUsers.filter((u) => u.role === "client");

  // 🔥 Client ko Firestore se delete karne ka function
  // const handleDeleteClient = async (clientId) => {
  //   try {
  //     await deleteDoc(doc(db, "users", clientId));
  //     setUsers((prev) => prev.filter((u) => u.id !== clientId)); // frontend update
  //     alert("✅ Client deleted successfully!");
  //   } catch (error) {
  //     console.error("❌ Error deleting client:", error);
  //     alert("Failed to delete client.");
  //   }
  // };

  return (
    <>
      <nav>
        <div className="flex justify-between items-center max-w-7xl mx-auto px-6 py-2">
          <Link
            to="/"
            className="text-lg font-bold text-neutral-700 hover:text-neutral-800 transition-colors flex items-center gap-2"
          >
            <img src={Logo} alt="Octa_Tech_Logo" width={120} />
          </Link>
          <h2 className="text-2xl font-bold text-neutral-600">Admin Panel</h2>
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
      <div className="p-6 max-w-7xl mx-auto">
        <Card className="shadow-sm border rounded-xl">
          <CardHeader className="flex flex-col gap-3">
            <CardTitle className="text-lg flex gap-1 font-semibold text-gray-800">
              <UsersRound size={20} /> Manage Users & Clients
            </CardTitle>

            {/* 🔍 Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
              <Input
                type="text"
                placeholder="Search by name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </CardHeader>

          <CardContent>
            <Tabs defaultValue="users">
              <TabsList className="grid grid-cols-2 w-full mb-4">
                <TabsTrigger value="users">Users</TabsTrigger>
                <TabsTrigger value="clients">Clients</TabsTrigger>
              </TabsList>

              {/* 🔹 Users Tab */}
              <TabsContent value="users">
                {onlyUsers.length > 0 ? (
                  onlyUsers.map((user) => (
                    <div
                      key={user.id}
                      className="flex justify-between items-center p-4 bg-gray-50 rounded-lg border hover:shadow-md transition-all mb-2"
                    >
                      <div>
                        <p className="font-medium text-gray-800">
                          {user.name || "Unnamed"}
                        </p>
                        <p className="text-sm text-gray-500">{user.email}</p>
                      </div>
                      <Link
                        to={`/admin/user/${user.id}`}
                        className="text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
                      >
                        View Dashboard →
                      </Link>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-sm">No users found.</p>
                )}
              </TabsContent>

              {/* 🔹 Clients Tab */}
              <TabsContent value="clients">
                {onlyClients.length > 0 ? (
                  onlyClients.map((client) => (
                    <div
                      key={client.id}
                      className="flex justify-between items-center p-4 bg-gray-50 rounded-lg border hover:shadow-md transition-all mb-2"
                    >
                      <div>
                        <p className="font-medium text-gray-800">
                          {client.name || "Unnamed"}
                        </p>
                        <p className="text-sm text-gray-500">{client.email}</p>
                        <p className="text-xs text-gray-400">
                          Status: {client.status || "N/A"}
                        </p>
                      </div>
                      <Link
                        to={`/admin/user/${client.id}`}
                        className="text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
                      >
                        View Dashboard →
                      </Link>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-sm">No clients found.</p>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

export default AdminPanel;
