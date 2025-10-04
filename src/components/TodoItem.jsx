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
} from "firebase/firestore";

// shadcn components
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import {
  MessageSquare,
  Trash2,
  Calendar as CalendarIcon,
  Phone,
  SquarePen,
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

function TodoItem({ todo, refreshTodos }) {
  const { role } = useAuth();
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");

  // ✅ Edit state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCommentDialogOpen, setIsCommentDialogOpen] = useState(false); // for client comment
  const [editTitle, setEditTitle] = useState(todo.title);
  const [editPhone, setEditPhone] = useState(todo.phone);
  const [editDate, setEditDate] = useState(
    todo.date?.seconds
      ? new Date(todo.date.seconds * 1000).toISOString()
      : todo.date || ""
  );
  const [editDescription, setEditDescription] = useState(todo.description || "");

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

  // ✅ Toggle Status (Developer only)
  const toggleStatus = async () => {
    if (role === "client") return;
    const todoRef = doc(db, "todos", todo.id);
    let newStatus = "todos";

    if (todo.status === "todos") newStatus = "in-process";
    else if (todo.status === "in-process") newStatus = "done";
    else newStatus = "todos";

    await updateDoc(todoRef, { status: newStatus });
    refreshTodos();
  };

  const handleDelete = async () => {
    if (role === "client") return;
    await deleteDoc(doc(db, "todos", todo.id));
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

  // ✅ Save edits with Timestamp for Firestore (Developer only)
  const saveEdit = async () => {
    if (role === "client") return;
    const todoRef = doc(db, "todos", todo.id);
    await updateDoc(todoRef, {
      title: editTitle,
      phone: editPhone,
      date: editDate ? Timestamp.fromDate(new Date(editDate)) : null,
      description: editDescription,
    });
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
      <Card className="relative overflow-hidden rounded-xl shadow-md hover:shadow-lg hover:scale-[1.01] transition-all duration-200">
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

        <CardContent className="relative z-10 px-3">
          {/* Title + Description */}
          <h3 className="text-2xl md:text-2xl font-semibold text-neutral-800">
            {todo.title}
          </h3>
          <p className="text-gray-600 text-md mt-1">{todo.description}</p>

          {/* Status + Deadline + Priority */}
          <div className="flex flex-wrap items-center gap-2 mt-3">
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
            <div className="flex items-center gap-2 px-3 py-1 text-xs bg-white/70 border rounded-md backdrop-blur-sm shadow-sm">
              <CalendarIcon size={16} className="text-gray-500" />
              <span className="font-medium text-sm text-neutral-700">
                {formatDate(todo.date)?.toLocaleString("en-IN", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: true,
                  timeZone: "Asia/Kolkata",
                })}
              </span>
            </div>
          </div>

          {/* Stats Row */}
          <div className="flex items-center gap-3 border-t mt-3 pt-2 text-sm text-gray-500">
            <div className="flex items-center gap-1 px-2 py-1 bg-white/70 rounded-md">
              <MessageSquare size={18} className="text-gray-500" />{" "}
              {comments.length}
            </div>
            <div className="flex items-center gap-1 px-2 py-1 bg-white/70 rounded-md">
              <Phone size={18} className="text-gray-500" />{" "}
              {todo.phone || "No Phone Number"}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2 mt-2">
            {/* Developer Buttons */}
            {role !== "client" && (
              <>
                <Button
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
                </Button>

                {/* 🔽 Status Change Dropdown */}
                <Select
                  value={todo.status}
                  onValueChange={async (value) => {
                    const todoRef = doc(db, "todos", todo.id);
                    await updateDoc(todoRef, { status: value });
                    refreshTodos();
                  }}
                >
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Change Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todo</SelectItem>
                    <SelectItem value="in-process">In Progress</SelectItem>
                    <SelectItem value="done">Done</SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  onClick={handleDelete}
                  variant="outline"
                  size="sm"
                  className="hover:bg-red-50 hover:text-red-600 transition"
                >
                  <Trash2 size={16} stroke="red" />
                </Button>
                <Button
                  onClick={() => setIsDialogOpen(true)}
                  variant="secondary"
                  size="sm"
                  className="hover:bg-gray-200 transition"
                >
                  <SquarePen size={16} /> Edit
                </Button>
              </>
            )}

            {/* Client Button -> Add Comment */}
            {role === "client" && (
              <Button
                onClick={() => setIsCommentDialogOpen(true)}
                variant="secondary"
                size="sm"
                className="hover:bg-neutral-200 text-neutral-700 transition"
              >
                <MessageSquare size={16} /> Add Comment
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ✅ Edit Dialog for Developer */}
      {role !== "client" && (
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Task + Comments</DialogTitle>
            </DialogHeader>

            <div className="space-y-3">
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="Title"
              />
              <Input
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                placeholder="Phone"
              />

              {/* ✅ Shadcn Date + Time Picker */}
              <div className="flex space-x-2">
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
                          const newDate = new Date(d);
                          if (editDate) {
                            const old = new Date(editDate);
                            newDate.setHours(old.getHours());
                            newDate.setMinutes(old.getMinutes());
                          }
                          setEditDate(newDate.toISOString());
                        }
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>

                <Input
                  type="time"
                  value={
                    editDate ? new Date(editDate).toISOString().slice(11, 16) : ""
                  }
                  onChange={(e) => {
                    if (!editDate) {
                      const today = new Date();
                      const [h, m] = e.target.value.split(":");
                      today.setHours(+h, +m);
                      setEditDate(today.toISOString());
                    } else {
                      const d = new Date(editDate);
                      const [h, m] = e.target.value.split(":");
                      d.setHours(+h, +m);
                      setEditDate(d.toISOString());
                    }
                  }}
                  className="w-[120px]"
                />
              </div>

              <Input
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Description"
              />
            </div>

            {/* Comments inside Edit Dialog */}
            <div className="mt-4">
              <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <MessageSquare size={16} /> Comments ({comments.length})
              </h4>
              <div
                className="space-y-3 mt-3 h-36 overflow-y-auto pr-2 
             scrollbar-thin scrollbar-thumb-gray-300 
             scrollbar-track-transparent hover:scrollbar-thumb-gray-400 
             rounded-md"
              >
                {comments.map((c) => (
                  <div
                    key={c.id}
                    className={`max-w-[75%] p-3 rounded-lg shadow text-sm mb-2 
        ${c.userId === auth.currentUser.uid
                        ? "ml-auto bg-blue-100 text-blue-800 text-right"
                        : "mr-auto bg-gray-100 text-gray-800 text-left"
                      }`}
                  >
                    <p className="font-medium">{c.userName}</p>
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
                  onClick={handleAddComment}
                  variant="secondary"
                  size="sm"
                  disabled={!newComment.trim()}
                >
                  Add
                </Button>
              </div>
            </div>

            <DialogFooter className="flex gap-2 mt-4">
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
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ✅ Comment Dialog for Client */}
      {role === "client" && (
        <Dialog open={isCommentDialogOpen} onOpenChange={setIsCommentDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Task Comments</DialogTitle>
            </DialogHeader>

            <div className="space-y-3 mt-3 h-36 overflow-y-auto pr-2 
             scrollbar-thin scrollbar-thumb-gray-300 
             scrollbar-track-transparent hover:scrollbar-thumb-gray-400 
             rounded-md">
              {comments.map((c) => (
                <div
                  key={c.id}
                  className={`max-w-[75%] p-3 rounded-lg shadow text-sm mb-2 ${c.userId === auth.currentUser.uid
                    ? "ml-auto bg-blue-100 text-blue-800 text-right"
                    : "mr-auto bg-gray-100 text-gray-800 text-left"
                    }`}
                >
                  <p className="font-medium">{c.userName} :</p>
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
                onClick={handleAddComment}
                variant="secondary"
                size="sm"
                disabled={!newComment.trim()}
              >
                Add
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

export default TodoItem;
