import React, { useState } from "react";
import Navbar from "../components/Navbar";
import AddTodoForm from "../components/AddTodoForm";
import TodoList from "../components/TodoList";
import { useAuth } from "../context/AuthContext";
import { Plus } from 'lucide-react';
// ✅ shadcn ui imports
import { Button } from "@/components/ui/button";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function Home() {
  const { currentUser, role } = useAuth();
  const [activeTab, setActiveTab] = useState("todos");
  const [isDialogOpen, setIsDialogOpen] = useState(false); // ✅ dialog state

  const tabs = [
    { key: "todos", label: "Todo" },
    { key: "in-process", label: "In Process" },
    { key: "done", label: "Done" },
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />
      <div className="max-w-7xl mx-auto p-4">
        {!currentUser ? (
          <p className="text-center text-gray-600 text-lg">
            Please login to see your todos.
          </p>
        ) : (
          <>
            <h2 className="text-xl font-semibold mb-4">
              Welcome ' {currentUser.name ? currentUser.name : currentUser.email}
            </h2>

            {role === "user" && (
              <>
                {/* ✅ Add Todo Form inside Dialog */}
                <div className="mb-6">
                  <div className="flex items-center justify-start">
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                      <DialogTrigger asChild>
                        <Button variant="default" className="flex items-center gap-2">
                          <Plus size={16} /> Add Task
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-lg">
                        <DialogHeader>
                          <DialogTitle>Add a new Task</DialogTitle>
                        </DialogHeader>
                        <AddTodoForm className="cursor-pointer"
                          defaultCategory="todos"
                          onTaskAdded={() => setIsDialogOpen(false)}
                        />
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>

                {/* ✅ Shadcn Tabs */}
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="grid grid-cols-3 w-full mb-5">
                    {tabs.map((tab) => (
                      <TabsTrigger
                        className="p-4 text-md"
                        key={tab.key}
                        value={tab.key}
                      >
                        {tab.label}
                      </TabsTrigger>
                    ))}
                  </TabsList>

                  {tabs.map((tab) => (
                    <TabsContent key={tab.key} value={tab.key}>
                      <Card>
                        <CardHeader>
                          <CardTitle>{tab.label}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <TodoList activeTab={tab.key} />
                        </CardContent>
                      </Card>
                    </TabsContent>
                  ))}
                </Tabs>
              </>
            )}

            {role === "admin" && (
              <Card className="p-4 bg-green-50 border-green-200">
                <p className="text-green-700 font-medium">
                  You are logged in as Admin. Use Admin Panel to manage all
                  tasks.
                </p>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default Home;
