import React, { useEffect, useState } from "react";
import { db, auth } from "../firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import TodoItem from "./TodoItem";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function TodoList({ activeTab, role, userId }) {
  const [todos, setTodos] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [open, setOpen] = useState(false);
  // const [isDialogOpen, setIsDialogOpen] = useState(false);
  // const [selectedTodo, setSelectedTodo] = useState(null);

  const [priorityFilter, setPriorityFilter] = useState("all");

  useEffect(() => {
    const targetUserId = userId || auth.currentUser?.uid;
    if (!targetUserId) return;

    let q;

    if (role === "client") {
      q = query(
        collection(db, "todos"),
        where("assignedClients", "array-contains", auth.currentUser.uid),
        where("status", "==", activeTab)
      );
    } else {
      // ✅ Manager/Admin/User sees their own tasks
      q = query(
        collection(db, "todos"),
        where("userId", "==", targetUserId),
        where("status", "==", activeTab)
      );
    }


    const unsubscribe = onSnapshot(q, (snapshot) => {
      let todosData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setTodos(todosData);
    });

    return () => unsubscribe();
  }, [activeTab, userId]);

  const formatStatusLabel = (status) => {
    switch (status) {
      case "todos":
        return "To-Do";
      case "in-process":
        return "In Progress";
      case "done":
        return "Done";
      default:
        return status;
    }
  };

  // ✅ Today, Tomorrow, Overdue counts
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);

  const todayCount = todos.filter((todo) => {
    if (!todo.date) return false;
    const todoDate = new Date(todo.date.seconds * 1000);
    return todoDate.toDateString() === today.toDateString();
  }).length;

  const tomorrowCount = todos.filter((todo) => {
    if (!todo.date) return false;
    const todoDate = new Date(todo.date.seconds * 1000);
    return todoDate.toDateString() === tomorrow.toDateString();
  }).length;

  const overdueCount = todos.filter((todo) => {
    if (!todo.date) return false;
    const todoDate = new Date(todo.date.seconds * 1000);
    return todoDate < today && todoDate.toDateString() !== today.toDateString();
  }).length;


  // ✅ Date filter logic
  const filteredTodosByDate =
    selectedDate === "overdue"
      ? todos.filter((todo) => {
        if (!todo.date) return false;
        const todoDate = new Date(todo.date.seconds * 1000);
        return todoDate < today && todoDate.toDateString() !== today.toDateString();
      })
      : selectedDate
        ? todos.filter((todo) => {
          if (!todo.date) return false;
          const todoDate = new Date(todo.date.seconds * 1000);
          return todoDate.toDateString() === selectedDate.toDateString();
        })
        : todos;

  // ✅ Combine with priority filter
  const filteredTodos = filteredTodosByDate
    // 🔹 Priority filter
    .filter((todo) =>
      priorityFilter === "all"
        ? true
        : todo.priority?.toLowerCase() === priorityFilter
    )
    // 🔹 Search filter
    .filter((todo) => {
      if (!searchTerm.trim()) return true; // if empty, show all
      const term = searchTerm.toLowerCase();
      return (
        todo.title?.toLowerCase().includes(term) ||
        todo.description?.toLowerCase().includes(term)
      );
    });


  return (
    <div>
      <div className="flex flex-col md:flex-row items-start gap-2 justify-between mb-2">
        <h2 className="text-xl font-bold px-2">
          {formatStatusLabel(activeTab)} List
        </h2>

        {/* 👇 Date & Quick Filters Search term */}
        <div className="flex gap-4 flex-wrap items-center">
          <div className="relative w-full md:w-[350px]">
            <Input
              type="text"
              placeholder="Search tasks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className=""
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={16} />
              </button>
            )}
          </div>

          <Select
            onValueChange={(value) => {
              if (value === "all") setSelectedDate(null);
              else if (value === "today") setSelectedDate(today);
              else if (value === "tomorrow") setSelectedDate(tomorrow);
              else if (value === "overdue") setSelectedDate("overdue");
              else if (value === "choose") setOpen(true);
            }}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by Date" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tasks</SelectItem>
              <SelectItem value="today">
                <div className="flex items-center gap-px justify-between w-full">
                  Today
                  {todayCount > 0 && (
                    <Badge className="bg-blue-500 text-white px-1 py-px">{todayCount}</Badge>
                  )}
                </div>
              </SelectItem>
              <SelectItem value="tomorrow">
                <div className="flex items-center gap-px justify-between w-full">
                  Tomorrow
                  {tomorrowCount > 0 && (
                    <Badge className="bg-yellow-500 text-white px-1 py-px">
                      {tomorrowCount}
                    </Badge>
                  )}
                </div>
              </SelectItem>
              <SelectItem value="overdue">
                <div className="flex items-center gap-px justify-between w-full">
                  Overdue
                  {overdueCount > 0 && (
                    <Badge className="bg-red-600 text-white px-1 py-px">{overdueCount}</Badge>
                  )}
                </div>
              </SelectItem>
              <SelectItem value="choose">Choose Date</SelectItem>
            </SelectContent>
          </Select>

          {/*Priority Filter */}
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Filter Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ✅ Dialog with Calendar */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Select a Date</DialogTitle>
          </DialogHeader>
          <Calendar
            mode="single"
            selected={selectedDate instanceof Date ? selectedDate : undefined}
            onSelect={(date) => {
              setSelectedDate(date);
              setOpen(false);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* ✅ Show tasks */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
        {filteredTodos.length > 0 ? (
          [...filteredTodos]
            .sort((a, b) => {
              // handle missing timestamps safely
              const timeA = a.createdAt?.seconds || 0
              const timeB = b.createdAt?.seconds || 0
              return timeA - timeB // ascending (old first)
            })
            .map((todo) => (
              <TodoItem
                key={todo.id}
                todo={todo}
                role={role}
                userId={userId}
                currentUser={auth.currentUser}
                refreshTodos={() => { }}
              />
            ))
        ) : (
          <div className="col-span-full text-center py-10 bg-gray-50 border rounded-lg">
            <p className="text-gray-500 text-lg">
              {selectedDate
                ? selectedDate === "overdue"
                  ? "No overdue tasks!"
                  : "No tasks found for selected date."
                : "No tasks found."}
            </p>
          </div>
        )}
      </div>

    </div>
  );
}

export default TodoList;
