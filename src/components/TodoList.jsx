import React, { useEffect, useState } from "react";
import { db, auth } from "../firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import TodoItem from "./TodoItem";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  const [open, setOpen] = useState(false);

  const [priorityFilter, setPriorityFilter] = useState("all");

  useEffect(() => {
    const targetUserId = userId || auth.currentUser?.uid;
    if (!targetUserId) return;

    let q = query(
      collection(db, "todos"),
      where("userId", "==", targetUserId),
      where("status", "==", activeTab)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      let todosData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setTodos(todosData);
    });

    return () => unsubscribe();
  }, [activeTab, userId]);

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
  const filteredTodos =
    priorityFilter === "all"
      ? filteredTodosByDate
      : filteredTodosByDate.filter(
        (todo) => todo.priority?.toLowerCase() === priorityFilter
      );

  return (
    <div>
      <div className="flex flex-col md:flex-row items-start gap-2 justify-between mb-2">
        <h2 className="text-xl font-bold px-2">
          {activeTab === "todos"
            ? "TO-DO List"
            : `${activeTab.toUpperCase()} List`}
        </h2>
        {/* 👇 Date & Quick Filters */}
        <div className="flex gap-4 flex-wrap items-center">
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
                <div className="flex items-center justify-between w-full">
                  Today
                  {todayCount > 0 && (
                    <Badge className="bg-blue-600 text-white text-xs">{todayCount}</Badge>
                  )}
                </div>
              </SelectItem>
              <SelectItem value="tomorrow">
                <div className="flex items-center justify-between w-full">
                  Tomorrow
                  {tomorrowCount > 0 && (
                    <Badge className="bg-yellow-500 text-white text-xs">
                      {tomorrowCount}
                    </Badge>
                  )}
                </div>
              </SelectItem>
              <SelectItem value="overdue">
                <div className="flex items-center justify-between w-full">
                  Overdue
                  {overdueCount > 0 && (
                    <Badge className="bg-red-600 text-white text-xs">{overdueCount}</Badge>
                  )}
                </div>
              </SelectItem>
              <SelectItem value="choose">📅 Choose Date</SelectItem>
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
      <div className="columns-1 md:columns-2 lg:columns-3">
        {filteredTodos.length > 0 ? (
          filteredTodos.map((todo) => (
            <TodoItem key={todo.id} todo={todo} role={role} refreshTodos={() => { }} />
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
