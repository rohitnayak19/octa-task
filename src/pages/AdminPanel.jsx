import React, { useEffect, useState, Suspense, lazy } from "react";
import {
  doc,
  deleteDoc,
  collection,
  getDoc,
  getDocs,
  updateDoc,
  onSnapshot,
  query,
  where,
  arrayUnion,
  deleteField,
} from "firebase/firestore";
import { db, auth } from "../firebase";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  LogOut,
  Search,
  UsersRound,
  Trash2,
  Check,
  Copy,
  CheckCircle,
  RefreshCcw,
  LayoutDashboard,
  Eye,
} from "lucide-react";
import { signOut } from "firebase/auth";
import Logo from "../assets/OctaTech_Logo.webp";
import { useAuth } from "../context/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
// import toast from "react-hot-toast";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetClose,
} from "@/components/ui/sheet";
import toast from "react-hot-toast";

// ⚡ Lightweight loader for first render (no logic change)
const SkeletonRow = () => (
  <div className="flex justify-between items-center p-4 bg-gray-100 rounded-lg mb-2 animate-pulse">
    <div className="space-y-2">
      <div className="h-4 w-32 bg-gray-300 rounded" />
      <div className="h-3 w-20 bg-gray-200 rounded" />
    </div>
    <div className="flex gap-2">
      <div className="h-8 w-8 bg-gray-300 rounded" />
      <div className="h-8 w-8 bg-gray-300 rounded" />
      <div className="h-8 w-8 bg-gray-300 rounded" />
    </div>
  </div>
);

function AdminPanel() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [managers, setManagers] = useState([]);
  const [clients, setClients] = useState([]);
  const [open, setOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedClient, setSelectedClient] = useState(null);
  const [copied, setCopied] = useState(false);
  const [managerInfo, setManagerInfo] = useState(null);
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  // ✅ Fetch all users
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

  useEffect(() => {
    const unsubManagers = onSnapshot(
      query(collection(db, "users"), where("role", "==", "user")),
      (snap) => setManagers(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );

    const unsubClients = onSnapshot(
      query(collection(db, "users"), where("role", "==", "client")),
      (snap) => setClients(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );

    return () => {
      unsubManagers();
      unsubClients();
    };
  }, []);

  // 🧠 Fetch linked manager info when client selected
  useEffect(() => {
    const fetchManagerDetails = async () => {
      if (selectedClient?.linkedUserId) {
        try {
          const managerRef = doc(db, "users", selectedClient.linkedUserId);
          const snap = await getDoc(managerRef);
          if (snap.exists()) {
            const data = snap.data();
            setManagerInfo({
              name: data.name,
              email: data.email,
              uid: snap.id,
            });
          } else {
            setManagerInfo(null);
          }
        } catch (error) {
          console.error("Error fetching manager info:", error);
        }
      }
    };

    fetchManagerDetails();
  }, [selectedClient?.linkedUserId]);

  // ✅ Change User Role Function
  const handleChangeRole = async (userId, currentRole) => {
    try {
      const userRef = doc(db, "users", userId);
      const newRole = currentRole === "user" ? "client" : "user";

      const confirmChange = window.confirm(
        `Change role from "${currentRole}" to "${newRole}"?`
      );
      if (!confirmChange) return;

      if (newRole === "client") {
        // 🔹 Convert Manager → Client
        // Find a manager to link with (optional: choose manually later)
        const managerSnap = await getDocs(
          query(collection(db, "users"), where("role", "==", "user"))
        );

        let linkedManagerId = null;
        if (!managerSnap.empty) {
          linkedManagerId = managerSnap.docs[0].id; // Pick first manager by default
        }

        await updateDoc(userRef, {
          role: "client",
          linkedUserId: linkedManagerId || "",
          status: "removed",
          adminStatus: "pending",
          devCode: deleteField(),
          clients: deleteField(),
        });

        // 🔹 If linked to a manager, add to their clients array
        if (linkedManagerId) {
          await updateDoc(doc(db, "users", linkedManagerId), {
            clients: arrayUnion({
              id: userId,
              name: users.find((u) => u.id === userId)?.name || "Unnamed",
              email: users.find((u) => u.id === userId)?.email || "",
              status: "pending",
            }),
          });
        }

        toast.success("Converted to Client successfully!");
      } else {
        // 🔹 Convert Client → Manager
        const newDevCode =
          "MAN-" + Math.random().toString(36).substring(2, 8).toUpperCase();

        await updateDoc(userRef, {
          role: "user",
          devCode: newDevCode,
          clients: [],
          status: "approved",
          adminStatus: "pending",
          linkedUserId: deleteField(),
        });

        toast.success("Converted to Manager successfully!");
      }

      // Update local state instantly
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId ? { ...u, role: newRole } : u
        )
      );
    } catch (error) {
      console.error("Error changing role:", error);
      toast.error("Failed to change role.");
    }
  };

  const handleCopyDevCode = () => {
    if (selectedUser?.devCode) {
      navigator.clipboard.writeText(selectedUser.devCode);
      toast.success("Manager Code copied!");
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  // ✅ Logout Function
  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/login");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  // ✅ Delete User Function
  const handleDeleteUser = async (userId, userName) => {
    const confirmDelete = window.confirm(
      `Are you sure you want to delete ${userName || "this user"}?`
    );
    if (!confirmDelete) return;

    try {
      await deleteDoc(doc(db, "users", userId));
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      toast.success("User deleted successfully!");
    } catch (error) {
      console.error("Error deleting user:", error);
      toast.error("Failed to delete user.");
    }
  };

  // ✅ Toggle Admin Approval
  const handleToggleApproval = async (userId, currentStatus) => {
    const newStatus = currentStatus === "approved" ? "pending" : "approved";
    try {
      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, { adminStatus: newStatus });
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, adminStatus: newStatus } : u))
      );
      toast.success(
        newStatus === "approved"
          ? "User approved successfully!"
          : "User set to pending!"
      );
    } catch (error) {
      console.error("Error updating adminStatus:", error);
      toast.error("Failed to update admin status.");
    }
  };

  //Status badge color logic
  const getStatusBadgeColor = (status) => {
    switch (status) {
      case "approved":
        return "bg-green-100 text-green-700 border-green-300";
      case "pending":
        return "bg-yellow-100 text-yellow-700 border-yellow-300";
      case "removed":
        return "bg-red-100 text-red-700 border-red-300";
      default:
        return "bg-gray-100 text-gray-700 border-gray-300";
    }
  };

  // ✅ Filtered Users
  const filteredUsers = users.filter((user) =>
    (user.name || "Unnamed").toLowerCase().includes(search.toLowerCase())
  );

  // ✅ Separate Managers & Clients
  const onlyUsers = filteredUsers.filter((u) => u.role === "user");
  const onlyClients = filteredUsers.filter((u) => u.role === "client");

  return (
    <>
      {/* 🔹 Navbar */}
      <nav className="shadow-sm">
        <div className="flex justify-between items-center max-w-8xl mx-auto px-6 py-3">
          <Link to="/" className="flex items-center gap-2">
            <img src={Logo} alt="Octa_Tech_Logo" width={120} />
          </Link>
          <h2 className="text-2xl font-bold text-neutral-700">Admin - panel</h2>
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

      {/* 🔹 Main Content */}
      <div className="p-6 max-w-8xl mx-auto">
        <Card className="shadow-sm border rounded-xl">
          <CardHeader className="flex flex-col gap-3">
            <CardTitle className="text-lg flex items-center gap-1 font-semibold text-gray-800">
              <UsersRound size={18} /> Manage - Managers & Clients
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
                <TabsTrigger
                  value="users"
                  className="flex items-center justify-center gap-2 cursor-pointer"
                >
                  Managers
                  {managers?.length > 0 && (
                    <span className="text-xs font-medium px-2 py-[1px] rounded-full ">
                      {managers.length}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger
                  value="clients"
                  className="flex items-center justify-center gap-2 cursor-pointer"
                >
                  Clients
                  {clients?.length > 0 && (
                    <span className="text-xs font-medium px-2 py-[1px] rounded-full">
                      {clients.length}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>
              {/* 🔹 Managers Tab */}
              <TabsContent value="users">
                {onlyUsers.length > 0 ? (
                  onlyUsers.map((user) => (
                    <div
                      key={user.id}
                      className="flex justify-between items-center p-4 bg-gray-50 rounded-lg border hover:shadow-md transition-all mb-2"
                    >
                      <div>
                        <p className="font-medium text-gray-800">{user.name || "Unnamed"}</p>
                        <p className="text-sm text-gray-500">{user.email}</p>
                        <p
                          className={`text-xs mt-1 font-medium ${user.adminStatus === "approved"
                            ? "text-green-700"
                            : "text-yellow-700"
                            }`}
                        >
                          Admin Status: {user.adminStatus || "pending"}
                        </p>
                      </div>
                      <TooltipProvider>
                        <div className="flex items-center gap-3">
                          {/* ✅ Approve */}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="icon"
                                aria-label="Approve User"
                                variant="outline"
                                className={`border-gray-300 cursor-pointer hover:scale-105 transition-all ${user.adminStatus === "approved"
                                  ? "text-yellow-700 border-yellow-400"
                                  : "text-green-700 border-green-400"
                                  }`}
                                onClick={() => handleToggleApproval(user.id, user.adminStatus)}
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              {user.adminStatus === "approved" ? "Set Pending" : "Approve User"}
                            </TooltipContent>
                          </Tooltip>

                          {/* 🔁 Change Role */}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="icon"
                                variant="outline"
                                aria-label="Change Role"
                                className="text-blue-700 border-blue-400 hover:scale-105 transition-all cursor-pointer"
                                onClick={() => handleChangeRole(user.id, user.role)}
                              >
                                <RefreshCcw className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Change Role</TooltipContent>
                          </Tooltip>

                          {/* 📊 View Dashboard */}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Link
                                to={`/admin/user/${user.id}`}
                                className="flex items-center justify-center rounded-md border border-blue-300 text-blue-700 p-2 hover:bg-blue-50 hover:scale-105 transition-all"
                              >
                                <LayoutDashboard className="h-4 w-4" />
                              </Link>
                            </TooltipTrigger>
                            <TooltipContent>View Dashboard</TooltipContent>
                          </Tooltip>

                          {/* 👁️ View Details (with Sheet) */}
                          <Sheet>
                            {/* 👁️ View Details Button */}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <SheetTrigger asChild>
                                  <Button
                                    size="icon"
                                    variant="outline"
                                    aria-label="View Details"
                                    className="text-indigo-700 border-indigo-400 hover:scale-105 transition-all active:scale-95 cursor-pointer"
                                    onClick={() => setSelectedUser(user)}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </SheetTrigger>
                              </TooltipTrigger>
                              <TooltipContent>View Details</TooltipContent>
                            </Tooltip>

                            {/* 🪟 Sheet Content */}
                            <AnimatePresence>
                              {selectedUser && (
                                <SheetContent
                                  side={selectedUser.role === "client" ? "left" : "right"}
                                  className="w-[420px] sm:w-[480px] overflow-y-auto bg-white/95 backdrop-blur-md border-l shadow-2xl p-6 rounded-l-xl transition-transform duration-300 ease-in-out"
                                >
                                  <motion.div
                                    initial={{
                                      x: selectedUser.role === "client" ? -100 : 100,
                                      opacity: 0,
                                    }}
                                    animate={{ x: 0, opacity: 1 }}
                                    exit={{
                                      x: selectedUser.role === "client" ? -100 : 100,
                                      opacity: 0,
                                    }}
                                    transition={{ duration: 0.35, ease: "easeInOut" }}
                                  >
                                    {/* Header */}
                                    <SheetHeader>
                                      <SheetTitle className="text-lg font-semibold text-gray-800">
                                        {selectedUser.name || "User Details"}
                                      </SheetTitle>
                                      <SheetDescription className="text-gray-500 text-sm">
                                        {selectedUser.email}
                                      </SheetDescription>
                                    </SheetHeader>

                                    {/* Divider */}
                                    <div className="my-4 border-b border-gray-200" />

                                    {/* Info Section */}
                                    <div className="space-y-3 text-sm text-gray-700">
                                      <div className="flex justify-between items-center">
                                        <span className="font-medium">Role:</span>
                                        <span className="capitalize">{selectedUser.role === "user" && "Manager"}</span>
                                      </div>

                                      <div className="flex justify-between items-center">
                                        <span className="font-medium">Status:</span>
                                        <Badge
                                          variant="outline"
                                          className={`${getStatusBadgeColor(selectedUser.adminStatus)} capitalize`}
                                        >
                                          {selectedUser.adminStatus || "pending"}
                                        </Badge>
                                      </div>

                                      <div className="flex justify-between items-center">
                                        <span className="font-medium">Created At:</span>
                                        <span>
                                          {selectedUser.createdAt?.toDate
                                            ? selectedUser.createdAt.toDate().toLocaleDateString()
                                            : "N/A"}
                                        </span>
                                      </div>
                                    </div>

                                    {/* 👨‍💼 Manager Section */}
                                    {selectedUser.role === "user" && (
                                      <div className="mt-6 space-y-3">
                                        <p className="font-medium text-gray-800">Manager Details</p>

                                        {/* ✅ Copyable Manager Code */}
                                        <div className="flex items-center gap-3 border bg-yellow-50/70 px-3 py-2 rounded-lg hover:shadow-sm transition-all duration-200">
                                          <span className="text-sm font-semibold text-gray-700">
                                            Manager Code:
                                          </span>
                                          <span className="font-mono text-gray-800">
                                            {selectedUser.devCode}
                                          </span>
                                          <Button
                                            size="icon"
                                            variant="outline"
                                            aria-label="Copy Manager Code"
                                            onClick={handleCopyDevCode}
                                            className={`border-yellow-300 cursor-pointer hover:bg-yellow-100 hover:-translate-y-[1px] active:scale-90 ease-in transition-all duration-200 ${copied
                                              ? "bg-green-100 border-green-400 text-green-700"
                                              : "text-gray-700"
                                              }`}
                                          >
                                            {copied ? (
                                              <Check className="h-4 w-4 text-green-700" />
                                            ) : (
                                              <Copy className="h-4 w-4" />
                                            )}
                                          </Button>
                                        </div>

                                        {/* 👥 Clients */}
                                        <div className="bg-gray-50 p-3 rounded-lg border">
                                          <p>
                                            <strong>Total Clients:</strong>{" "}
                                            {selectedUser.clients?.length || 0}
                                          </p>
                                          {selectedUser.clients?.length > 0 && (
                                            <div className="mt-3 space-y-2">
                                              {selectedUser.clients.map((c, i) => (
                                                <div
                                                  key={i}
                                                  className="flex items-center justify-between p-2 rounded-lg bg-gray-50 border hover:bg-gray-100 transition-all duration-200"
                                                >
                                                  <div className="flex flex-col text-sm">
                                                    <span className="font-medium text-gray-800">{c.name || "Unnamed Client"}</span>
                                                    <span className="text-gray-500 text-xs">{c.email}</span>
                                                  </div>

                                                  <Badge
                                                    variant="outline"
                                                    className={`text-xs ${c.status === "approved"
                                                        ? "bg-green-100 text-green-700 border-green-300"
                                                        : c.status === "pending"
                                                          ? "bg-yellow-100 text-yellow-700 border-yellow-300"
                                                          : "bg-gray-100 text-gray-700 border-gray-300"
                                                      }`}
                                                  >
                                                    {c.status || "pending"}
                                                  </Badge>
                                                </div>
                                              ))}
                                            </div>
                                          )}

                                        </div>
                                      </div>
                                    )}

                                    {/* 👤 Client Section */}
                                    {selectedUser.role === "client" && (
                                      <div className="bg-gray-50 rounded-lg p-3 border mt-6">
                                        <p>
                                          <strong>Linked Manager:</strong>{" "}
                                          {selectedUser.linkedUserId || "N/A"}
                                        </p>
                                        <p>
                                          <strong>Client Status:</strong>{" "}
                                          {selectedUser.status || "N/A"}
                                        </p>
                                      </div>
                                    )}

                                    {/* 🔘 Close Button */}
                                    <SheetClose asChild>
                                      <Button
                                        aria-label="Close Details"
                                        variant="outline"
                                        className="w-full mt-6 hover:bg-gray-100 transition-all"
                                      >
                                        Close
                                      </Button>
                                    </SheetClose>
                                  </motion.div>
                                </SheetContent>
                              )}
                            </AnimatePresence>
                          </Sheet>
                          {/* 🗑️ Delete */}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="icon"
                                aria-label="Delete User"
                                variant="outline"
                                className="text-red-500 hover:text-red-700 cursor-pointer hover:scale-105 transition-all"
                                onClick={() => handleDeleteUser(user.id, user.name)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Delete User</TooltipContent>
                          </Tooltip>
                        </div>
                      </TooltipProvider>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-sm">No managers found.</p>
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
                        <p className="font-medium text-gray-800">{client.name || "Unnamed"}</p>
                        <p className="text-sm text-gray-500">{client.email}</p>
                        <p className="text-xs text-gray-400">Manager Status: {client.status || "N/A"}</p>
                        <p
                          className={`text-xs mt-1 font-medium ${client.adminStatus === "approved"
                            ? "text-green-700"
                            : "text-yellow-700"
                            }`}
                        >
                          Admin Status: {client.adminStatus || "pending"}
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <TooltipProvider>
                          <div className="flex items-center gap-3">
                            {/* ✅ Approve */}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="icon"
                                  variant="outline"
                                  aria-label="Approve Client"
                                  className={`border-gray-300 cursor-pointer hover:scale-105 transition-all ${client.adminStatus === "approved"
                                    ? "text-yellow-700 border-yellow-400"
                                    : "text-green-700 border-green-400"
                                    }`}
                                  onClick={() =>
                                    handleToggleApproval(client.id, client.adminStatus)
                                  }
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                {client.adminStatus === "approved"
                                  ? "Set Pending"
                                  : "Approve Client"}
                              </TooltipContent>
                            </Tooltip>

                            {/* 🔁 Change Role */}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="icon"
                                  aria-label="Change Role"
                                  variant="outline"
                                  className="text-blue-700 border-blue-400 hover:scale-105 transition-all cursor-pointer"
                                  onClick={() => handleChangeRole(client.id, client.role)}
                                >
                                  <RefreshCcw className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Change Role</TooltipContent>
                            </Tooltip>
                            {/* 👁️ View Details (Sheet Drawer) */}
                            <Sheet>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <SheetTrigger asChild>
                                    <Button
                                      size="icon"
                                      variant="outline"
                                      aria-label="View Details"
                                      className="text-indigo-700 border-indigo-400 hover:scale-105 transition-all active:scale-95 cursor-pointer"
                                      onClick={() => setSelectedClient(client)}
                                    >
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                  </SheetTrigger>
                                </TooltipTrigger>
                                <TooltipContent>View Details</TooltipContent>
                              </Tooltip>

                              {/* 🪟 Sheet Content */}
                              <AnimatePresence>
                                {selectedClient && (
                                  <SheetContent
                                    side="right"
                                    className="w-[420px] sm:w-[480px] overflow-y-auto bg-white/95 backdrop-blur-md border-l shadow-2xl p-6 rounded-r-xl transition-transform duration-300 ease-in-out"
                                  >
                                    <motion.div
                                      initial={{ x: -100, opacity: 0 }}
                                      animate={{ x: 0, opacity: 1 }}
                                      exit={{ x: -100, opacity: 0 }}
                                      transition={{ duration: 0.35, ease: "easeInOut" }}
                                    >
                                      {/* Header */}
                                      <SheetHeader className="p-0 mb-3">
                                        <SheetTitle className="text-lg font-semibold text-gray-800">
                                          {selectedClient.name || "Client Details"}
                                        </SheetTitle>
                                        <SheetDescription className="text-gray-500 text-sm">
                                          {selectedClient.email}
                                        </SheetDescription>
                                      </SheetHeader>

                                      {/* Divider */}
                                      <div className="my-4 border-b border-gray-200" />

                                      {/* Info Section */}
                                      <div className="space-y-3 text-sm text-gray-700">
                                        <div className="flex justify-between items-center">
                                          <span className="font-medium">Role:</span>
                                          <span className="capitalize">Client</span>
                                        </div>

                                        <div className="flex justify-between items-center">
                                          <span className="font-medium">Admin Status:</span>
                                          <Badge
                                            variant="outline"
                                            className={`${getStatusBadgeColor(
                                              selectedClient.adminStatus
                                            )} capitalize`}
                                          >
                                            {selectedClient.adminStatus || "pending"}
                                          </Badge>
                                        </div>

                                        <div className="flex justify-between items-center">
                                          <span className="font-medium">Created At:</span>
                                          <span>
                                            {selectedClient.createdAt?.toDate
                                              ? selectedClient.createdAt
                                                .toDate()
                                                .toLocaleDateString()
                                              : "N/A"}
                                          </span>
                                        </div>
                                      </div>

                                      {/* 👨‍💼 Linked Manager Section */}
                                      <div className="bg-gray-50 rounded-lg p-3 border mt-6">
                                        <p className="font-semibold text-gray-800 mb-2">Linked Manager Details</p>

                                        {managerInfo ? (
                                          <div className="text-sm space-y-1">
                                            <p>
                                              <strong>Manager Name:</strong>{" "}
                                              <span className="text-gray-700">{managerInfo.name}</span>
                                            </p>
                                            <p>
                                              <strong>Manager Email:</strong>{" "}
                                              <span className="text-gray-700">{managerInfo.email}</span>
                                            </p>
                                            <p>
                                              <strong>Manager UID:</strong>{" "}
                                              <span className="text-gray-700 font-mono">{managerInfo.uid}</span>
                                            </p>
                                          </div>
                                        ) : (
                                          <p className="text-gray-500 text-sm">No linked manager found.</p>
                                        )}

                                        <div className="mt-3 border-t pt-2">
                                          <p>
                                            <strong>Client Status:</strong>{" "}
                                            <span className={`capitalize text-sm text-gray-700 ${selectedClient.status === "approved" ?
                                              "text-green-700 bg-green-100 p-1 rounded-md px-2 py-px" : selectedClient.status === "pending" ? "text-yellow-300 bg-yellow-100 px-2 py-px rounded-md" : selectedClient.status === "removed" ? "text-red-300 bg-red-100 px-1 py-px rounded-md" : "text-gray-500"
                                              }`}>
                                              {selectedClient.status || "N/A"}
                                            </span>
                                          </p>
                                        </div>
                                      </div>


                                      {/* 🔘 Close Button */}
                                      <SheetClose asChild>
                                        <Button
                                          variant="outline"
                                          aria-label="Close Details"
                                          className="w-full mt-6 hover:bg-gray-100 transition-all"
                                        >
                                          Close
                                        </Button>
                                      </SheetClose>
                                    </motion.div>
                                  </SheetContent>
                                )}
                              </AnimatePresence>
                            </Sheet>

                            {/* 🗑️ Delete */}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="icon"
                                  variant="outline"
                                  aria-label="Delete Client"
                                  className="text-red-500 hover:text-red-700 cursor-pointer hover:scale-105 transition-all"
                                  onClick={() => handleDeleteUser(client.id, client.name)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Delete Client</TooltipContent>
                            </Tooltip>
                          </div>
                        </TooltipProvider>

                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-sm">No clients found.</p>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div >
    </>
  );
}

export default AdminPanel;
