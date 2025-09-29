import React, { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db, auth } from "../firebase";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LogOut, Search , UsersRound } from "lucide-react";
import { signOut } from "firebase/auth";

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
    (user.name || "Unnamed")
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header with Logout */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Admin Panel</h2>
        <Button
          onClick={handleLogout}
          variant="destructive"
          size="sm"
          className="flex items-center gap-1 transition-all hover:translate-x-1"
        >
          <LogOut size={18} /> Logout
        </Button>
      </div>

      <Card className="shadow-sm border rounded-xl">
        <CardHeader className="flex flex-col gap-3">
          <CardTitle className="text-lg flex gap-1 font-semibold text-gray-800">
            <UsersRound size={20}/> All Users
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
        <CardContent className="space-y-3">
          {filteredUsers.length > 0 ? (
            filteredUsers.map((user) => (
              <div
                key={user.id}
                className="flex justify-between items-center p-4 bg-gray-50 rounded-lg border hover:shadow-md transition-all"
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
        </CardContent>
      </Card>
    </div>
  );
}

export default AdminPanel;
