import React, {useState, useEffect} from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import TodoList from "../components/TodoList";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { Button } from "../components/ui/button";
function UserDashboard() {
  const { userId } = useParams();
  const navigate = useNavigate()
  const [user, setUser] = useState(null)

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const userRef = doc(db, "users", userId);
        const snapshot = await getDoc(userRef);
        if (snapshot.exists()) {
          setUser(snapshot.data());
        }
      } catch (error) {
        console.error("❌ Failed to fetch user:", error);
      }
    };

    fetchUser();
  }, [userId]);

  const tabs = [
    { key: "todos", label: "Todos" },
    { key: "in-process", label: "In Process" },
    { key: "done", label: "Done" },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <Button
          onClick={() => navigate(-1)}
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
        >
          <ArrowLeft size={16} /> Back
        </Button>
        <h2 className="text-2xl font-bold">
          📋 User Dashboard {user ? `(${user.name || "Unnamed"})` : `(${userId})`}
        </h2>
      </div>
      <Tabs defaultValue="todos">
        <TabsList className="grid grid-cols-3 w-full mb-4">
          {tabs.map((tab) => (
            <TabsTrigger key={tab.key} value={tab.key}>
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
                <TodoList activeTab={tab.key} userId={userId} isAdmin />
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

export default UserDashboard;
