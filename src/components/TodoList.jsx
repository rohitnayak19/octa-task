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

function TodoList({ activeTab, role, userId }) {
  const [todos, setTodos] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [open, setOpen] = useState(false);

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

  // ✅ Filtering logic
  const filteredTodos =
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

  return (
    <div>
      <div className="flex flex-col md:flex-row items-start gap-2 justify-between mb-4">
        <h2 className="text-2xl font-bold">
          {activeTab === "todos"
            ? "TODO List"
            : `${activeTab.toUpperCase()} List`}
        </h2>


        {/* 👇 Date & Quick Filters */}
        <div className="flex gap-4 flex-wrap items-center">
          <Button className="cursor-pointer" variant="outline" onClick={() => setSelectedDate(null)}>
            All
          </Button>

          {/* Today button with badge */}
          <div className="relative">
            <Button className="cursor-pointer" variant="outline" onClick={() => setSelectedDate(today)}>
              Today
            </Button>
            {todayCount > 0 && (
              <Badge className="absolute -top-2 -right-2 bg-blue-600 text-white text-xs">
                {todayCount}
              </Badge>
            )}
          </div>

          {/* Tomorrow button with badge */}
          <div className="relative">
            <Button
              className="cursor-pointer"
              variant="outline"
              onClick={() => {
                setSelectedDate(tomorrow);
              }}
            >
              Tomorrow
            </Button>
            {tomorrowCount > 0 && (
              <Badge className="absolute -top-2 -right-2 bg-yellow-500 text-white text-xs">
                {tomorrowCount}
              </Badge>
            )}
          </div>

          {/* Overdue button with badge */}
          <div className="relative">
            <Button className="cursor-pointer" variant="outline" onClick={() => setSelectedDate("overdue")}>
              Overdue
            </Button>
            {overdueCount > 0 && (
              <Badge className="absolute -top-2 -right-2 bg-red-600 text-white text-xs">
                {overdueCount}
              </Badge>
            )}
          </div>

          {/* Choose Date Button */}
          <Button variant="outline" onClick={() => setOpen(true)}>
            Choose date
          </Button>
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
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
