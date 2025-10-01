import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";

// ✅ shadcn/ui imports
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";

// ✅ Gemini
import { GoogleGenerativeAI } from "@google/generative-ai";
const genAI = new GoogleGenerativeAI("AIzaSyBv4ROjB0SWATqn4xuTP2FGT1wewGCERXw");

function AddTodoForm({ defaultCategory, onTaskAdded, overrideUserId }) {
  const [mode, setMode] = useState("manual");

  // Manual state
  const [title, setTitle] = useState("");
  const [phone, setPhone] = useState("");
  const [description, setDescription] = useState("");
  const [datePart, setDatePart] = useState(null);
  const [timePart, setTimePart] = useState("");
  const [category, setCategory] = useState(defaultCategory || "todos");

  // AI state
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);

  const { currentUser, userData } = useAuth();

  // ✅ set default time when component mounts
  useEffect(() => {
    if (!timePart) {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, "0");
      const minutes = String(now.getMinutes()).padStart(2, "0");
      setTimePart(`${hours}:${minutes}`);
    }
  }, []);

  // ✅ Determine target userId (client → developer, otherwise self)
  const targetUserId = overrideUserId
    ? overrideUserId // ✅ agar admin ne diya hai
    : userData?.role === "client" && userData?.linkedDeveloperId
    ? userData.linkedDeveloperId
    : currentUser.uid;

  // ✅ Manual add
  const handleAddManual = async () => {
    if (!title || !phone) {
      toast.error("Title and phone are required!");
      return;
    }

    let finalDate = null;
    if (datePart) {
      finalDate = new Date(datePart);
      if (timePart) {
        const [hours, minutes] = timePart.split(":").map(Number);
        finalDate.setHours(hours);
        finalDate.setMinutes(minutes);
      }
    } else {
      // Agar user ne date choose nahi kiya, current date+time use karenge
      finalDate = new Date();
    }

    try {
      await addDoc(collection(db, "todos"), {
        title,
        phone,
        description,
        date: finalDate,
        status: category || "todos",
        userId: targetUserId, // 👈 Important
        createdAt: serverTimestamp(),
        createdBy: currentUser.uid, // 👈 who added (client or self)
      });

      setTitle("");
      setPhone("");
      setDescription("");
      setDatePart(null);
      setTimePart("");
      setCategory(defaultCategory || "todos");

      if (onTaskAdded) onTaskAdded();
      toast.success("Task added successfully!");
    } catch (error) {
      console.error("Error adding task:", error);
      toast.error("Failed to add task. Try again!");
    }
  };

  // ✅ AI add
  const handleAddAi = async () => {
    if (!prompt.trim()) {
      toast.error("⚠️ Please type something!");
      return;
    }
    setLoading(true);

    try {
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
      const today = new Date().toISOString();

      const result = await model.generateContent(`
      Extract task info from this text and return ONLY raw JSON with fields:
      title, phone, description, date (ISO string), status (todos|in-process|done).

      Rules:
      - If user specifies a date/time → use that.
      - If no date mentioned → use today's date-time: "${today}".
      - Always return ISO string (YYYY-MM-DDTHH:mm:ss) without timezone suffix.

      Example output:
      {"title":"Call Rohit","phone":"9876543210","description":"Follow up","date":"2025-09-29T10:00:00","status":"todos"}

      User text: "${prompt}"
    `);

      let text = result.response.text();
      text = text.replace(/```json/g, "").replace(/```/g, "").trim();

      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch (e) {
        console.error("JSON parse error:", e, text);
        toast.error("AI response was not valid JSON.");
        return;
      }

      let finalDate = null;
      if (parsed.date) {
        const d = new Date(parsed.date);
        finalDate = isNaN(d) ? new Date() : d;
      }

      await addDoc(collection(db, "todos"), {
        title: parsed.title,
        phone: parsed.phone,
        description: parsed.description,
        status: parsed.status || "todos",
        date: finalDate,
        userId: targetUserId, // 👈 Important
        createdAt: serverTimestamp(),
        createdBy: currentUser.uid, // 👈 who added (client or self)
      });

      setPrompt("");
      if (onTaskAdded) onTaskAdded();
      toast.success("Task added successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to add task");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Mode Switch */}
      <div className="flex gap-2">
        <Button
          variant={mode === "manual" ? "default" : "outline"}
          onClick={() => setMode("manual")}
        >
          Manual
        </Button>
        <Button
          variant={mode === "ai" ? "default" : "outline"}
          onClick={() => setMode("ai")}
        >
          AI
        </Button>
      </div>

      {/* Manual Mode */}
      {mode === "manual" && (
        <div className="space-y-3">
          <Input
            placeholder="Task title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <Input
            placeholder="Phone number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <Input
            placeholder="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          {/* Date + Time */}
          <div className="flex space-x-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-[200px] justify-start text-left font-normal",
                    !datePart && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {datePart ? format(datePart, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={datePart}
                  onSelect={setDatePart}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <Input
              type="time"
              value={timePart}
              onChange={(e) => setTimePart(e.target.value)}
              className="w-[120px]"
            />
          </div>

          {/* Category */}
          <Select value={category} onValueChange={(val) => setCategory(val)}>
            <SelectTrigger>
              <SelectValue placeholder="Choose category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todo</SelectItem>
              <SelectItem value="in-process">In Process</SelectItem>
              <SelectItem value="done">Done</SelectItem>
            </SelectContent>
          </Select>

          <Button onClick={handleAddManual} className="w-full">
            Add Task
          </Button>
        </div>
      )}

      {/* AI Mode */}
      {mode === "ai" && (
        <div className="space-y-3">
          <span className="text-neutral-400 text-sm font-light">
            E.g : Call Sarthak today 10:00, Phone 7888986633 explain Social Media Marketing Campaign → In-Process
          </span>
          <Textarea
            className={"mt-3"}
            placeholder="Type your task in natural language..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
          <Button onClick={handleAddAi} className="w-full" disabled={loading}>
            {loading ? "Adding..." : "Add Task with AI"}
          </Button>
        </div>
      )}
    </div>
  );
}

export default AddTodoForm;
