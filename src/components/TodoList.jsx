import React, { useEffect, useState } from "react";
import { db, auth } from "../firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import TodoItem from "./TodoItem";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
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
  }, [activeTab, userId]); // ❌ removed selectedDate from deps

  // ✅ Date-based filtering (frontend only)
  const filteredTodos = selectedDate
    ? todos.filter((todo) => {
        if (!todo.date) return false;
        const todoDate = new Date(todo.date.seconds * 1000);
        return todoDate.toDateString() === selectedDate.toDateString();
      })
    : todos;

  // ✅ Count tasks for Today & Tomorrow
  const todayCount = todos.filter((todo) => {
    if (!todo.date) return false;
    const todoDate = new Date(todo.date.seconds * 1000);
    return todoDate.toDateString() === new Date().toDateString();
  }).length;

  const tomorrowCount = todos.filter((todo) => {
    if (!todo.date) return false;
    const todoDate = new Date(todo.date.seconds * 1000);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return todoDate.toDateString() === tomorrow.toDateString();
  }).length;

  return (
    <div>
      <div className="flex flex-col md:flex-row items-start gap-2 justify-between mb-4">
        <h2 className="text-2xl font-bold">{activeTab.toUpperCase()} List</h2>

        {/* 👇 Date Picker Filter */}
        <div className="flex gap-4 flex-wrap items-center">
          <Button variant="outline" onClick={() => setSelectedDate(null)}>
            All
          </Button>

          {/* Today button with badge */}
          <div className="relative">
            <Button variant="outline" onClick={() => setSelectedDate(new Date())}>
              Today
            </Button>
            {todayCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {todayCount}
              </span>
            )}
          </div>

          {/* Tomorrow button with badge */}
          <div className="relative">
            <Button
              variant="outline"
              onClick={() => {
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                setSelectedDate(tomorrow);
              }}
            >
              Tomorrow
            </Button>
            {tomorrowCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {tomorrowCount}
              </span>
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
            selected={selectedDate}
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
            <TodoItem
              key={todo.id}
              todo={todo}
              role={role}
              refreshTodos={() => {}}
            />
          ))
        ) : (
          <p className="text-gray-500">
            {selectedDate ? "No tasks found for selected date." : "No tasks found."}
          </p>
        )}
      </div>
    </div>
  );
}

export default TodoList;
