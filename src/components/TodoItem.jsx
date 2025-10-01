import React, { useEffect, useState } from "react";
import { db, auth } from "../firebase";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";
import {
  doc,
  collection,
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

  // ✅ Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // ✅ Edit state
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
    const snapshot = await getDocs(commentsRef);
    setComments(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
  };

  useEffect(() => {
    fetchComments();
  }, []);

  // ✅ Toggle Status (todos → in-process → done)
  const toggleStatus = async () => {
    const todoRef = doc(db, "todos", todo.id);
    let newStatus = "todos";

    if (todo.status === "todos") newStatus = "in-process";
    else if (todo.status === "in-process") newStatus = "done";
    else newStatus = "todos";

    await updateDoc(todoRef, { status: newStatus });
    refreshTodos();
  };

  const handleDelete = async () => {
    await deleteDoc(doc(db, "todos", todo.id));
    refreshTodos();
  };

  const handleAddComment = async () => {
    if (!newComment) return;
    try {
      const commentsRef = collection(db, "todos", todo.id, "comments");
      await addDoc(commentsRef, {
        text: newComment,
        by: role,
        userId: auth.currentUser.uid,
        date: new Date().toLocaleString(),
      });

      toast.success("Comment added successfully!");
      setNewComment("");
      fetchComments();
    } catch (error) {
      console.error("Error adding comment:", error);
      toast.error("Failed to add comment.");
    }
  };

  const saveEdit = async () => {
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

  const formatDate = (dateValue) => {
    if (!dateValue) return "No date";
    let dateObj;
    if (dateValue.seconds) {
      dateObj = new Date(dateValue.seconds * 1000);
    } else {
      dateObj = new Date(dateValue);
    }
    return dateObj.toLocaleString("en-IN", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      timeZone: "Asia/Kolkata",
    });
  };

  return (
    <>
      {/* 🔹 Card (Short View) */}
      <Card className="relative overflow-hidden rounded-xl shadow-md hover:scale-[1.01] transition-all duration-200">
        {/* Zigzag Background */}
        <div
          className="absolute inset-0 z-0 pointer-events-none opacity-40"
          style={{
            backgroundImage: `
            repeating-linear-gradient(
              0deg, transparent, transparent 20px, rgba(75, 85, 99, 0.05) 20px, rgba(75, 85, 99, 0.05) 21px
            ),
            repeating-linear-gradient(
              90deg, transparent, transparent 30px, rgba(107, 114, 128, 0.05) 30px, rgba(107, 114, 128, 0.05) 31px
            ),
            repeating-linear-gradient(
              60deg, transparent, transparent 40px, rgba(55, 65, 81, 0.04) 40px, rgba(55, 65, 81, 0.04) 41px
            ),
            repeating-linear-gradient(
              150deg, transparent, transparent 35px, rgba(31, 41, 55, 0.04) 35px, rgba(31, 41, 55, 0.04) 36px
            )
          `,
          }}
        />

        <CardContent className="relative z-10">
          {/* Title + Description */}
          <h3 className="text-2xl font-semibold text-neutral-800">{todo.title}</h3>
          <p className="text-gray-600 text-md mt-1">{todo.description}</p>

          {/* Badge + Date */}
          <div className="flex items-center justify-between mt-3">
            <Badge
              className={`px-3 py-1 rounded-full text-xs font-medium shadow-sm ${
                todo.status === "done"
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

            <div className="flex items-center gap-2 px-3 py-1 text-xs bg-white/70 border rounded-md backdrop-blur-sm shadow-sm">
              <CalendarIcon size={16} className="text-gray-500" />
              <span className="font-medium text-sm text-neutral-700">
                {formatDate(todo.date)}
              </span>
            </div>
          </div>

          {/* Stats Row */}
          <div className="flex items-center gap-3 border-t mt-2 pt-1 text-sm text-gray-500">
            <div className="flex items-center gap-1 px-2 py-1 bg-white/70 rounded-md">
              <MessageSquare size={18} className="text-gray-500" /> {comments.length}
            </div>
            <div className="flex items-center gap-1 px-2 py-1 bg-white/70 rounded-md">
              <Phone size={18} className="text-gray-500" /> {todo.phone || 0}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2 mt-2">
            <Button onClick={toggleStatus} variant="outline" size="sm">
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
              <SelectTrigger className="w-[160px]">
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
          </div>
        </CardContent>
      </Card>

      {/* 🔹 Full Dialog with Comments */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder="Title" />
            <Input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} placeholder="Phone" />

            {/* Date + Time Picker */}
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
                    {editDate ? format(new Date(editDate), "PPP") : "Pick a date"}
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
                value={editDate ? new Date(editDate).toISOString().slice(11, 16) : ""}
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

            <Input value={editDescription} onChange={(e) => setEditDescription(e.target.value)} placeholder="Description" />
          </div>

          {/* ✅ Comments inside Dialog */}
          <div className="mt-4">
            <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <MessageSquare size={16} /> Comments ({comments.length})
            </h4>
            <div className="space-y-2 mt-3 max-h-40 overflow-y-auto">
              {comments.length === 0 && <p className="text-sm text-gray-400 italic">No comments yet.</p>}
              {comments.map((c) => (
                <div key={c.id} className="p-2 bg-white/70 border rounded-md text-sm shadow-sm">
                  <div>
                    <span className="font-medium text-blue-600">{c.by}</span>: {c.text}
                    <div className="text-xs text-gray-400">{c.date}</div>
                  </div>
                </div>
              ))}
            </div>

            {role !== "guest" && (
              <div className="mt-3 flex gap-2">
                <Input
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder={role === "admin" ? "Admin: Add a comment..." : "Write a comment..."}
                />
                <Button onClick={handleAddComment} variant="secondary" size="sm" disabled={!newComment.trim()}>
                  Add
                </Button>
              </div>
            )}
          </div>

          <DialogFooter className="flex gap-2 mt-4">
            <Button className="cursor-pointer" onClick={saveEdit} variant="default">
              <Save /> Save
            </Button>
            <Button className="cursor-pointer hover:bg-neutral-200" onClick={() => setIsDialogOpen(false)} variant="secondary">
              <X /> Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default TodoItem;
