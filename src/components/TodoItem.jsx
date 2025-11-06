import React, { useEffect, useState } from "react";
import { db, auth } from "../firebase";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";
import {
  doc,
  query,
  orderBy,
  collection,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  Timestamp,
  where, arrayUnion, arrayRemove
} from "firebase/firestore";

// shadcn components
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent
}
  from "@/components/ui/tooltip";
import {
  MessageCircle,
  Trash2,
  Calendar as CalendarIcon,
  Expand,
  Clock,
  ListTodo,
  SquarePen,
  MessageSquare,
  Phone,
  Plus,
  Check,
  Square,
  CheckSquare,
  User,
  UserPlus,
  X,
  Save,
} from "lucide-react";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../components/ui/dialog";

import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

function TodoItem({ todo, refreshTodos, userId }) {
  const { currentUser, role } = useAuth();
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [clients, setClients] = useState([]);
  const [subtaskInput, setSubtaskInput] = useState("");
  const [isSubtaskOpen, setIsSubtaskOpen] = useState(false);

  const clientCount = (() => {
    if (!todo.assignedClients || !Array.isArray(todo.assignedClients)) return 0;

    // Base count: all assigned clients except manager & creator
    let count = todo.assignedClients.filter(
      (id) => id !== todo.userId && id !== todo.createdBy
    ).length;

    // If creator is a client AND still part of assignedClients → count them
    if (
      todo.createdByRole === "client" &&
      todo.assignedClients.includes(todo.createdBy)
    ) {
      count += 1;
    }

    return count;
  })();

  // ✅ Edit state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedTodo, setSelectedTodo] = useState(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [isCommentDialogOpen, setIsCommentDialogOpen] = useState(false); // for client comment
  const [editTitle, setEditTitle] = useState(todo.title);
  // const [editPhone, setEditPhone] = useState(todo.phone);
  const [editDate, setEditDate] = useState(
    todo.date?.seconds
      ? new Date(todo.date.seconds * 1000).toISOString()
      : todo.date || ""
  );
  const [editDescription, setEditDescription] = useState(todo.description || "");
  const [priority, setPriority] = useState(todo.priority || "medium");
  // const [statusNote, setStatusNote] = useState(todo.statusNote);

  const fetchComments = async () => {
    const commentsRef = collection(db, "todos", todo.id, "comments");

    // 👇 Comments ko timestamp ke order me fetch karo
    const q = query(commentsRef, orderBy("createdAt", "asc"));
    const snapshot = await getDocs(q);

    const commentsData = await Promise.all(
      snapshot.docs.map(async (docSnap) => {
        const data = docSnap.data();
        let userName = "Unknown";

        if (data.userId) {
          try {
            const userRef = doc(db, "users", data.userId);
            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) {
              userName = userSnap.data().name || "Unnamed";
            }
          } catch (err) {
            console.error("⚠️ Failed to fetch user name:", err);
          }
        }

        return { id: docSnap.id, ...data, userName };
      })
    );

    setComments(commentsData);
  };

  useEffect(() => {
    fetchComments();
  }, []);

  //Fetch Approved Clients (for manager only)
  useEffect(() => {
    if (role !== "client") {
      let targetUserId;

      // 🧠 Admin viewing a manager’s dashboard (use manager's UID)
      if (role === "admin" && userId) {
        targetUserId = userId;
      }
      // 🧠 Manager or Admin viewing own dashboard
      else {
        targetUserId = currentUser?.uid;
      }

      if (!targetUserId) return;

      const fetchClients = async () => {
        try {
          const q = query(
            collection(db, "users"),
            where("linkedUserId", "==", targetUserId),
            where("status", "==", "approved")
          );

          const snapshot = await getDocs(q);
          const clientsData = snapshot.docs.map((doc) => ({
            uid: doc.id,
            ...doc.data(),
          }));

          setClients(clientsData);
        } catch (error) {
          console.error("Error fetching clients:", error);
        }
      };

      fetchClients();
    }
  }, [role, currentUser, userId]);

  // // ✅ Toggle Status (Developer only)
  // const toggleStatus = async () => {
  //   if (role === "client") return;
  //   const todoRef = doc(db, "todos", todo.id);
  //   let newStatus = "todos";

  //   if (todo.status === "todos") newStatus = "in-process";
  //   else if (todo.status === "in-process") newStatus = "done";
  //   else newStatus = "todos";

  //   await updateDoc(todoRef, { status: newStatus });
  //   refreshTodos();
  // };

  // Handle subtasks
  const handleAddSubtask = async () => {
    if (!subtaskInput.trim()) return;
    const newSubtask = {
      id: Date.now().toString(),
      title: subtaskInput,
      completed: false,
    };
    const todoRef = doc(db, "todos", todo.id);
    await updateDoc(todoRef, { subtasks: arrayUnion(newSubtask) });
    setSubtaskInput("");
    refreshTodos();
    toast.success("Subtask added successfully");
  };

  const handleToggleSubtask = async (subtask) => {
    const updated = todo.subtasks.map((s) =>
      s.id === subtask.id ? { ...s, completed: !s.completed } : s
    );
    const todoRef = doc(db, "todos", todo.id);
    await updateDoc(todoRef, { subtasks: updated });
    refreshTodos();
    toast.success(`Subtask marked as ${subtask.completed ? "incomplete" : "complete"}`);
  };

  const handleDeleteSubtask = async (subId) => {
    const updated = todo.subtasks.filter((s) => s.id !== subId);
    const todoRef = doc(db, "todos", todo.id);
    await updateDoc(todoRef, { subtasks: updated });
    refreshTodos();
    toast.success("Subtask deleted");
  };
  const handleDelete = async (e) => {
    if (role === "client") return;
    await deleteDoc(doc(db, "todos", todo.id));
    toast.dismiss(); // remove loading toast
    toast.success("Task deleted!");
    refreshTodos();
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    try {
      const currentUser = auth.currentUser;

      // ✅ Get user details from Firestore
      let userName = "Anonymous";
      if (currentUser) {
        const userRef = doc(db, "users", currentUser.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          userName = userSnap.data().name || "Unnamed";
        }
      }

      const commentsRef = collection(db, "todos", todo.id, "comments");
      await addDoc(commentsRef, {
        text: newComment,
        by: role,                  // user / client
        userId: currentUser.uid,   // Firestore ke liye reference
        userName,                  // 👈 ab name bhi save hoga
        date: new Date().toLocaleString(),
        createdAt: Timestamp.now(),
      });

      toast.success("Comment added successfully!");
      setNewComment("");
      fetchComments();
    } catch (error) {
      console.error("Error adding comment:", error);
      toast.error("Failed to add comment.");
    }
  };
  // ✅ Toggle Assign / Unassign Client
  const handleToggleClient = async (clientId) => {
    try {
      const todoRef = doc(db, "todos", todo.id);
      const alreadyAssigned = todo.assignedClients?.includes(clientId);

      await updateDoc(todoRef, {
        assignedClients: alreadyAssigned
          ? arrayRemove(clientId)
          : arrayUnion(clientId),
      });

      toast.success(
        alreadyAssigned
          ? "Client removed from this task"
          : "Client assigned successfully"
      );

      refreshTodos(); // reload tasks after update
    } catch (error) {
      console.error("Error assigning client:", error);
      toast.error("Failed to update assignment.");
    }
  };

  // ✅ Save edits with Timestamp for Firestore (Developer only)
  const saveEdit = async () => {
    if (role === "client") return;
    if (!editTitle || editTitle.trim() === "") {
      toast.error("Title is required");
      return;
    }
    const todoRef = doc(db, "todos", todo.id);
    await updateDoc(todoRef, {
      title: editTitle,
      // phone: editPhone,
      date: editDate ? Timestamp.fromDate(new Date(editDate)) : null,
      priority: priority,
      // statusNote: statusNote,
      description: editDescription,
    });
    toast.success("Your changes are saved successfully")
    setIsDialogOpen(false);
    refreshTodos();
  };

  // ✅ Helper: format Firestore timestamp or string to readable date
  const formatDate = (dateValue) => {
    if (!dateValue) return null;

    let dateObj;
    if (dateValue.seconds) {
      dateObj = new Date(dateValue.seconds * 1000);
    } else {
      dateObj = new Date(dateValue);
    }

    return dateObj;
  };

  // ✅ Helper: Deadline Badge
  const renderDeadlineBadge = (dateValue) => {
    if (!dateValue) return null;
    const d = formatDate(dateValue);
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);

    let label = "";
    let color = "";

    if (d.toDateString() === today.toDateString()) {
      label = "Today";
      color = "bg-blue-100 text-blue-700";
    } else if (d.toDateString() === tomorrow.toDateString()) {
      label = "Tomorrow";
      color = "bg-yellow-100 text-yellow-700";
    } else if (d < today) {
      label = "Overdue";
      color = "bg-red-100 text-red-700";
    } else {
      label = "Upcoming";
      color = "bg-gray-100 text-gray-700";
    }

    return (
      <Badge className={`px-2 py-1 text-xs font-medium rounded-full ${color}`}>
        {label}
      </Badge>
    );
  };

  // ✅ Helper: Priority Badge
  const renderPriorityBadge = (priority) => {
    if (!priority) return null;
    let color = "bg-gray-100 text-gray-700";
    if (priority === "high") color = "bg-red-100 text-red-700";
    if (priority === "medium") color = "bg-yellow-100 text-yellow-700";
    if (priority === "low") color = "bg-green-100 text-green-700";

    return (
      <Badge className={`px-2 py-1 text-xs font-medium rounded-full ${color}`}>
        {priority.charAt(0).toUpperCase() + priority.slice(1)}
      </Badge>
    );
  };

  return (
    <>
      <Card onClick={() => {
        if (!isAlertOpen) setIsDialogOpen(true), setIsCommentDialogOpen(true)
      }} className={`relative px-1 ${role !== "client" ? "min-h-[160px]" : "h-[129px] md:h-[112px]"} py-2 overflow-hidden shadow-sm hover:shadow-md rounded-sm hover:scale-[1.01] transition-all duration-200 cursor-pointer`}>
        {/* Zigzag Background Pattern */}
        <div
          className="absolute inset-0 z-0 pointer-events-none opacity-40"
          style={{
            backgroundImage: `
              repeating-linear-gradient(0deg, transparent, transparent 20px, rgba(75, 85, 99, 0.05) 20px, rgba(75, 85, 99, 0.05) 21px),
              repeating-linear-gradient(90deg, transparent, transparent 30px, rgba(107, 114, 128, 0.05) 30px, rgba(107, 114, 128, 0.05) 31px),
              repeating-linear-gradient(60deg, transparent, transparent 40px, rgba(55, 65, 81, 0.04) 40px, rgba(55, 65, 81, 0.04) 41px),
              repeating-linear-gradient(150deg, transparent, transparent 35px, rgba(31, 41, 55, 0.04) 35px, rgba(31, 41, 55, 0.04) 36px)
            `,
          }}
        />
        <span
          className={`absolute top-0 left-0 h-[5px] w-full rounded-t-lg
    ${todo.priority === "high"
              ? "bg-gradient-to-r from-red-300 via-red-200 to-red-100"
              : todo.priority === "medium"
                ? "bg-gradient-to-r from-yellow-300 via-yellow-200 to-yellow-100"
                : todo.priority === "low"
                  ? "bg-gradient-to-r from-green-300 via-green-200 to-green-100"
                  : "bg-gray-200"
            }`}
        ></span>

        <CardContent className="relative z-10 px-2">
          {/* Title + Description */}
          <div className="flex justify-between">
            <h3 className="font-semibold text-lg text-neutral-800 line-clamp-1">
              {todo.title}
            </h3>
            <div className="flex gap-1">
              <div className="flex items-center gap-px bg-gray-50 px-1 rounded-sm text-xs text-neutral-600 cursor-pointer">
                <Tooltip>
                  <TooltipTrigger>
                    <MessageCircle className="cursor-pointer" size={14} />{" "}
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Comments</p>
                  </TooltipContent>
                </Tooltip>
                {comments.length}
              </div>

              {/* Tooltip for Expand Button */}
              <Tooltip>
                <TooltipTrigger asChild className="p-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedTodo(todo);
                      setIsDetailDialogOpen(true);
                    }}
                    className="text-gray-500 bg-gray-50 cursor-pointer font-medium"
                  >
                    <Expand />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>View more</p>
                </TooltipContent>
              </Tooltip>

              {/* Tooltip for Assigned Clients */}
              {/* {role !== "client" && (
                  <Tooltip>
                    <TooltipTrigger asChild className="">
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsAssignDialogOpen(true)
                        }}
                        className="text-gray-500 cursor-pointer font-medium"
                      >
                        <UserPlus />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Add Clients</p>
                    </TooltipContent>
                  </Tooltip>
                )} */}
            </div>
          </div>
          <p className="text-gray-600 text-sm leading-snug line-clamp-1 mt-1">{todo.description}</p>
          {/* 
          {todo.assignedClients?.length > 0 && (
            <p className="text-xs text-gray-500 mt-1">
              Assigned to {todo.assignedClients.length} client(s)
            </p>
          )} */}


          {/* Status + Deadline + Priority */}
          <div className="flex items-center flex-wrap gap-1 mt-2">
            <Badge
              className={`px-3 py-1 rounded-full text-xs font-medium shadow-sm ${todo.status === "done"
                ? "bg-green-100 text-green-700"
                : todo.status === "in-process"
                  ? "bg-orange-100 text-orange-700"
                  : "bg-gray-100 text-gray-700"
                }`}
            >
              {todo.status === "done"
                ? "Completed"
                : todo.status === "in-process"
                  ? "In Progress"
                  : "Todo"}
            </Badge>

            {renderDeadlineBadge(todo.date)}
            {renderPriorityBadge(todo.priority)}
            {/* Actual Date */}
            <div className="flex items-center gap-px shadow p-1 rounded-2xl text-xs">
              <Clock size={16} className="text-gray-500" />
              <span className="font-medium text-xs text-neutral-700">
                {formatDate(todo.date)?.toLocaleString("en-IN", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  hour12: true,
                  timeZone: "Asia/Kolkata",
                })}
              </span>
            </div>

            {/* Status + Deadline + Priority */}
            {/* {todo.statusNote && (
              <p className="text-xs underline text-gray-500 italic mt-1">
                {(() => {
                  const map = {
                    "idea-stage": "Idea stage / Planning",
                    "researching": "Researching",
                    "waiting-approval": "Waiting for approval",
                    "in-progress": "Working on it",
                    "designing": "Designing",
                    "editing": "Editing",
                    "reviewing": "Under review",
                    "waiting-client": "Waiting for client input",
                    "waiting-team": "Waiting for teammate update",
                    "waiting-assets": "Waiting for assets",
                    "completed": "Completed",
                    "published": "Published / Delivered",
                    "on-hold": "On hold",
                    "cancelled": "Cancelled",
                  };
                  return map[todo.statusNote] || todo.statusNote;
                })()}
              </p>
            )} */}

            {/*Add Comment */}
            {/* <Button
              onClick={() => setIsCommentDialogOpen(true)}
              variant="secondary"
              size="sm"
              className="hover:bg-neutral-200 cursor-pointer text-neutral-700 transition"
            >
              <MessageCircle size={16} /> Add Comment
            </Button> */}
          </div>

          {/* Stats Row */}
          <div className="flex items-center gap-3 border-t mt-2 pt-2 text-sm text-gray-500">
            {/* <div className="flex items-center gap-1 px-2 py-1 bg-white/70 rounded-md">
              <MessageSquare size={18} className="text-gray-500" />{" "}
              {comments.length}
            </div> */}
            {/* <div className="flex items-center gap-1 px-2 py-1 bg-white/70 rounded-md">
              <Phone size={18} className="text-gray-500" />{" "}
              {todo.phone || "No Phone Number"}
            </div> */}
          </div>

          {/* Actions */}
          <div className="flex flex-wrap justify-between gap-2">
            {/* Developer Buttons */}
            {role !== "client" && (
              <>
                {/* <Button
                  onClick={toggleStatus}
                  variant="outline"
                  size="sm"
                  className="cursor-pointer"
                >
                  {todo.status === "todos"
                    ? "▶ Start Progress"
                    : todo.status === "in-process"
                      ? "✔ Mark as Done"
                      : "↩ Move to Todos"}
                </Button> */}

                {/* 🔽 Status Change Dropdown and Add clients */}
                <div className="flex gap-1 items-center">
                  <Select
                    value={todo.status}
                    onValueChange={async (value) => {
                      const todoRef = doc(db, "todos", todo.id);
                      await updateDoc(todoRef, { status: value });
                      refreshTodos();
                    }}
                  >
                    <SelectTrigger className="w-[109px] text-xs pl-2">
                      <SelectValue placeholder="Change Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todo</SelectItem>
                      <SelectItem value="in-process">In Progress</SelectItem>
                      <SelectItem value="done">Done</SelectItem>
                    </SelectContent>
                  </Select>

                  <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
                    <AlertDialogTrigger asChild>
                      <button
                        onClick={(e) => e.stopPropagation()}
                        variant="outline"
                        size="xs"
                        className="rounded-sm hover:text-red-800 transition cursor-pointer bg-gray-50 px-3 py-2"
                      >
                        <Trash2 size={16} stroke="red" />
                      </button>
                    </AlertDialogTrigger>

                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure you want to delete this task?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. The task and its comments will be permanently removed.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="cursor-pointer">Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          className="cursor-pointer"
                          onClick={handleDelete}
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>

                <div className="flex items-center px-2 rounded-sm bg-gray-50">
                  {/* Add Clients button */}
                  {role !== "client" && (
                    <Tooltip>
                      <TooltipTrigger asChild className="">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsAssignDialogOpen(true)
                          }}
                          className="text-gray-500 rounded-sm cursor-pointer font-medium"
                        >
                          <UserPlus size={16} />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Add Clients</p>
                      </TooltipContent>
                    </Tooltip>
                  )}

                  {/* 👥 Client Count */}
                  {clientCount > 0 && (
                    <p className="text-xs text-gray-500 mb-1">
                      {clientCount}
                    </p>
                  )}
                </div>
                {/* <Button
                  onClick={() => setIsDialogOpen(true)}
                  variant="secondary"
                  size="sm"
                  className="hover:bg-gray-200 transition cursor-pointer"
                >
                  <SquarePen size={16} /> Edit
                </Button> */}
              </>
            )}

            {/* Client Button -> Add Comment */}
            {/* {role === "client" && (
              <Button
                onClick={() => setIsCommentDialogOpen(true)}
                variant="secondary"
                size="sm"
                className="hover:bg-neutral-200 cursor-pointer text-neutral-700 transition"
              >
                <MessageCircle size={16} /> Add Comment
              </Button>
            )} */}
          </div>
        </CardContent>
      </Card>
      {/* ✅ Assign Clients Dialog */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Task to Clients</DialogTitle>
          </DialogHeader>

          {clients.length > 0 ? (
            <div className="space-y-2">
              {clients.map((client) => {
                const alreadyAssigned = todo.assignedClients?.includes(client.uid);
                return (
                  <div
                    key={client.uid}
                    className="flex items-center justify-between border rounded-md px-3 py-2"
                  >
                    <div>
                      <p className="text-sm font-medium">{client.name}</p>
                      <p className="text-xs text-gray-500">{client.email}</p>
                    </div>
                    <Button
                      className={'cursor-pointer'}
                      size="sm"
                      variant={alreadyAssigned ? "outline" : "secondary"}
                      onClick={() => handleToggleClient(client.uid)}
                    >
                      {alreadyAssigned ? (
                        <>
                          <X /> Remove
                        </>
                      ) : (
                        <>
                          <Check /> Assign
                        </>
                      )}

                    </Button>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-500 text-sm text-center py-2">
              No approved clients found.
            </p>
          )}
        </DialogContent>
      </Dialog>

      {/* 🟢Expand (Details) Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-lg rounded-2xl shadow-2xl border border-gray-200 bg-white/90 backdrop-blur-sm p-4">
          <DialogHeader>
            <div className="flex justify-between items-start">
              <DialogTitle className="text-3xl font-bold text-neutral-700">
                {todo.title}
              </DialogTitle>

              {/* Optional: AI Badge
              {todo.createdMethod === "ai" && (
                <Badge className="bg-purple-100 text-purple-700 text-xs font-medium">
                  ✨ AI Created
                </Badge>
              )} */}
            </div>
            <p className="text-gray-500 text-sm">
              Task Overview and Details
            </p>
          </DialogHeader>

          {/* ✅ Description */}
          <div className="rounded-lg px-1 py-2 tracking-tight">
            <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-line">
              {todo.description || "No description provided."}
            </p>
          </div>

          {/* ✅ Status / Priority / Date Section */}
          <div className="flex flex-wrap gap-1">
            {/* Status */}
            <Badge
              className={`px-3 py-1 rounded-full text-xs font-medium shadow-xs ${todo.status === "done"
                ? "bg-green-100 text-green-700"
                : todo.status === "in-process"
                  ? "bg-orange-100 text-orange-700"
                  : "bg-gray-100 text-gray-700"
                }`}
            >
              {todo.status === "done"
                ? "Completed"
                : todo.status === "in-process"
                  ? "In Progress"
                  : "Todo"}
            </Badge>

            {/* Priority */}
            <Badge
              className={`px-3 py-1 rounded-full text-xs font-medium shadow-xs ${todo.priority === "high"
                ? "bg-red-100 text-red-700"
                : todo.priority === "medium"
                  ? "bg-yellow-100 text-yellow-700"
                  : "bg-green-100 text-green-700"
                }`}
            >
              {todo.priority.charAt(0).toUpperCase() + todo.priority.slice(1)}
            </Badge>

            {/* Due Date */}
            {todo.date && (
              <Badge
                variant="outline"
                className="text-neutral-700 border-gray-300 bg-white shadow-xs"
              >
                <CalendarIcon />{" "}
                {new Date(todo.date.seconds * 1000).toLocaleString("en-IN", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                })}
              </Badge>
            )}
          </div>

          {/* Deadline Progress */}
          {/* {todo.date && (
            <div className="mt-3">
              <div className="flex justify-between text-xs text-gray-600 mb-1">
                <span>Deadline</span>
                <span>
                  {(() => {
                    const diffDays = Math.ceil(
                      (new Date(todo.date.seconds * 1000) - new Date()) / (1000 * 60 * 60 * 24)
                    );
                    return diffDays > 0
                      ? `${diffDays} day${diffDays > 1 ? "s" : ""} left`
                      : diffDays === 0
                        ? "Due today!"
                        : `Overdue by ${Math.abs(diffDays)} day${Math.abs(diffDays) > 1 ? "s" : ""}`;
                  })()}
                </span>
              </div>

              <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
                <div
                  className={`h-full transition-all ${(() => {
                      const diff = new Date(todo.date.seconds * 1000) - new Date();
                      if (diff < 0) return "bg-red-400";     // overdue
                      if (diff < 2 * 86400000) return "bg-yellow-400"; // due soon
                      return "bg-green-400";                 // still time
                    })()
                    }`}
                  style={{
                    width: (() => {
                      const createdAt = todo.createdAt?.seconds
                        ? new Date(todo.createdAt.seconds * 1000)
                        : new Date();

                      const deadline = new Date(todo.date.seconds * 1000);
                      let total = deadline - createdAt;
                      const passed = new Date() - createdAt;

                      // 🧩 Prevent invalid or 0-duration tasks
                      if (total <= 0) total = 1000 * 60 * 60 * 24; // assume 1 day
                      if (passed < 0) return "0%"; // future-created tasks (edge case)

                      const pct = Math.min(100, Math.max(0, (passed / total) * 100));
                      return `${pct}%`;
                    })(),
                  }}
                ></div>
              </div>
            </div>
          )} */}

          {/* ✅ Creator / Created At Section */}
          <div className=" border-t pt-4 text-sm text-gray-600 space-y-1">
            <p className="flex items-center gap-1">
              <User size={15} className="text-neutral-700" />
              <span className="font-medium text-gray-800">Created by:</span>{" "}
              {todo.createdByName || "Unknown User"}
            </p>
            <p className="flex items-center gap-1">
              <CalendarIcon size={14} className="text-neutral-600" />
              <span className="font-medium text-gray-800">Created on:</span>{" "}
              {todo.createdAt
                ? new Date(todo.createdAt.seconds * 1000).toLocaleString("en-IN", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })
                : "Unknown"}
            </p>
          </div>

          {/* ✅ Optional Footer Buttons */}
          {/* <div className="flex justify-end gap-2 border-t pt-2">
            <Button
              variant="outline"
              onClick={() => setIsDetailDialogOpen(false)}
              className="cursor-pointer"
            >
              Close
            </Button>
          </div> */}
        </DialogContent>
      </Dialog>

      {/* ✅ Edit Dialog for Manager */}
      {role !== "client" && (
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl gap-1">
            <DialogHeader className={'mb-2'}>
              <DialogTitle>Edit Task + Comments</DialogTitle>
            </DialogHeader>

            <div className="space-y-3">
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="Title"
              />

              <Textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Description"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {  // prevent Shift+Enter new line
                    e.preventDefault();
                    saveEdit();
                  }
                }}
              />
              {/* <Input
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                placeholder="Phone"
              /> */}

              {/* ✅ Shadcn Date + Time Picker */}
              <div className="flex items-center space-x-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-[200px] justify-start text-left font-normal",
                        !editDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {editDate
                        ? format(new Date(editDate), "PPP")
                        : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={editDate ? new Date(editDate) : undefined}
                      onSelect={(d) => {
                        if (d) {
                          const old = new Date(editDate || new Date());
                          // keep local time (hours/minutes) from old date
                          const newDate = new Date(
                            d.getFullYear(),
                            d.getMonth(),
                            d.getDate(),
                            old.getHours(),
                            old.getMinutes()
                          );
                          setEditDate(newDate.toISOString());
                        }
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                {/* ✅ Priority Selection */}
                <div>
                  {/* <label className="text-sm font-medium text-gray-700">Priority</label> */}
                  <Select
                    value={priority}
                    onValueChange={(val) => setPriority(val)}
                  >
                    <SelectTrigger className="w-fit">
                      <SelectValue placeholder="Choose priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {/* <Input
                  type="time"
                  value={
                    editDate
                      ? (() => {
                        const d = new Date(editDate);
                        const hours = d.getHours().toString().padStart(2, "0");
                        const minutes = d.getMinutes().toString().padStart(2, "0");
                        return `${hours}:${minutes}`;
                      })()
                      : ""
                  }
                  onChange={(e) => {
                    if (editDate) {
                      const [hours, minutes] = e.target.value.split(":").map(Number);
                      const d = new Date(editDate);
                      d.setHours(hours);
                      d.setMinutes(minutes);
                      setEditDate(d.toISOString());
                    }
                  }}
                  className="w-[120px]"
                /> */}

              </div>
            </div>
            {/* StausNote */}
            {/* <div className="space-y-1">
              <Select onValueChange={(val) => setStatusNote(val)} value={statusNote}>
                <SelectTrigger className="w-fit">
                  <SelectValue placeholder="Select current progress..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="idea-stage">Idea stage / Planning</SelectItem>
                  <SelectItem value="researching">Researching / Gathering info</SelectItem>
                  <SelectItem value="waiting-approval">Waiting for approval</SelectItem>
                  <SelectItem value="in-progress">Working on it</SelectItem>
                  <SelectItem value="designing">Designing / Creating content</SelectItem>
                  <SelectItem value="editing">Editing / Refining</SelectItem>
                  <SelectItem value="reviewing">Under review / Feedback pending</SelectItem>
                  <SelectItem value="waiting-client">Waiting for client input</SelectItem>
                  <SelectItem value="waiting-team">Waiting for teammate update</SelectItem>
                  <SelectItem value="waiting-assets">Waiting for files / materials</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="on-hold">On hold / Paused</SelectItem>
                </SelectContent>
              </Select>
            </div> */}

            {/* Comments inside Edit Dialog */}
            <div className="mt-4">
              <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <MessageCircle size={16} /> Comments ({comments.length})
              </h4>

              {/* ✅ Scrollable Comment List */}
              <div
                className={`space-y-3 mt-2 px-2 ${comments.length > 0 ? "border" : "border-none"
                  } overflow-y-auto pr-2 
    scrollbar-thin scrollbar-thumb-gray-300 
    scrollbar-track-transparent hover:scrollbar-thumb-gray-400 
    rounded-md transition-all duration-200 ${comments.length > 0 ? "h-20" : "h-min"
                  }`}
              >
                {comments.map((c) => {
                  const isMyComment = c.userId === auth.currentUser?.uid;
                  return (
                    <div
                      key={c.id}
                      className={`flex flex-col ${isMyComment ? "items-end" : "items-start"
                        }`}
                    >
                      <div
                        className={`max-w-[80%] px-2 py-1 rounded-2xl shadow-sm text-sm ${isMyComment
                          ? "bg-blue-100 text-blue-800 text-right"
                          : "bg-gray-100 text-gray-800 text-left"
                          }`}
                      >
                        <p className="font-semibold">{c.userName}</p>
                        <p>{c.text}</p>
                      </div>
                      <p
                        className={`text-xs text-gray-500 mt-1 ${isMyComment ? "text-right" : "text-left"
                          }`}
                      >
                        {c.createdAt?.toDate().toLocaleString()}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* ✅ Comment Input Section (Admin + Everyone) */}
              <div className="flex gap-2 mt-2 items-center">
                <Input
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Write a comment..."
                  className="flex-1"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault(); // prevent new line
                      if (newComment.trim()) handleAddComment();
                    }
                  }}
                />
                <Button
                  onClick={handleAddComment}
                  variant="secondary"
                  size="sm"
                  disabled={!newComment.trim()}
                  className="cursor-pointer"
                >
                  Add
                </Button>
              </div>
            </div>
            {/* 🧩 Subtasks Section */}
            <div className="flex gap-2 mb-2 mt-2">
              <Input
                value={subtaskInput}
                onChange={(e) => setSubtaskInput(e.target.value)}
                placeholder="Add new subtask..."
                className="text-sm"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {  // prevent Shift+Enter new line
                    e.preventDefault();
                    handleAddSubtask();
                  }
                }}
              />
              <Button size="sm" onClick={handleAddSubtask}>
                Add
              </Button>
            </div>
            {/* Subtask List */}
            <div className="max-h-[150px] overflow-y-auto space-y-2 pr-2">
              {todo.subtasks?.length > 0 ? (
                todo.subtasks.map((sub) => (
                  <div
                    key={sub.id}
                    className="flex items-center justify-between bg-gray-50 hover:bg-gray-100 rounded px-2 py-1 border border-gray-200 transition-all"
                  >
                    <div
                      onClick={role !== "client" ? () => handleToggleSubtask(sub) : undefined}
                      className={`flex items-center gap-2 ${role !== "client" ? "cursor-pointer hover:opacity-80" : "cursor-default"
                        }`}
                    >
                      {sub.completed ? (
                        <CheckSquare size={16} className="text-green-500" />
                      ) : (
                        <Square size={16} className="text-gray-400" />
                      )}
                      <span
                        className={`text-sm ${sub.completed ? "line-through text-gray-400" : "text-gray-700"
                          }`}
                      >
                        {sub.title}
                      </span>
                    </div>

                    {role !== "client" && (
                      <button
                        onClick={() => handleDeleteSubtask(sub.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-xs text-gray-400 italic">No subtasks added yet</p>
              )}
            </div>

            {/* <Button
              variant="outline"
              onClick={() => setIsSubtaskOpen(true)}
              className="flex gap-2 mt-2 cursor-pointer"
            >
              <ListTodo size={14} />
              {`Subtasks (${todo.subtasks ? todo.subtasks.length : 0})`}
            </Button>
            <DialogFooter className="flex gap-2 mt-2">
              <Button
                className="cursor-pointer"
                onClick={saveEdit}
                variant="default"
              >
                <Save /> Save
              </Button>
              <Button
                className="cursor-pointer hover:bg-neutral-200"
                onClick={() => setIsDialogOpen(false)}
                variant="secondary"
              >
                <X /> Cancel
              </Button>
            </DialogFooter> */}
          </DialogContent>
        </Dialog>
      )}
      {/* ✅ Separate Subtask Dialog */}
      {/* <Dialog open={isSubtaskOpen} onOpenChange={setIsSubtaskOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Subtasks for: {todo.title}</DialogTitle>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSubtaskOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog> */}
      {/* ✅ Comment Dialog and subtask for Client */}
      {role === "client" && (
        <Dialog open={isCommentDialogOpen} onOpenChange={setIsCommentDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Task Comments</DialogTitle>
            </DialogHeader>

            <div className={`space-y-3 mt-3 overflow-y-auto pr-2 
             scrollbar-thin scrollbar-thumb-gray-300 
             scrollbar-track-transparent hover:scrollbar-thumb-gray-400 
             rounded-md ${comments.length > 0 ? "h-36" : "h-min"}`}>
              {comments.map((c) => (
                <div
                  key={c.id}
                  className={`max-w-[75%] px-3 py-1 rounded-lg shadow text-sm mb-2 ${c.userId === auth.currentUser.uid
                    ? "ml-auto bg-blue-100 text-blue-800 text-right"
                    : "mr-auto bg-gray-100 text-gray-800 text-left"
                    }`}
                >
                  <p className="font-medium">{c.userName}.</p>
                  <p>{c.text}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {c.createdAt?.toDate().toLocaleString()}
                  </p>
                </div>
              ))}

            </div>

            <div className="mt-3 flex gap-2">
              <Input
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Write a comment..."
              />
              <Button
                className={'cursor-pointer'}
                onClick={handleAddComment}
                variant="secondary"
                size="sm"
                disabled={!newComment.trim()}
              >
                Add
              </Button>
            </div>

            <Button onClick={() => setIsSubtaskOpen(true)} variant="outline" className="flex gap-2 mt-4 cursor-pointer">
              <ListTodo /> {`Subtasks (${todo.subtasks ? todo.subtasks.length : 0})`}
            </Button>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

export default TodoItem;
