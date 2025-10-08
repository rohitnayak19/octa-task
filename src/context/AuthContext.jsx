import React, { createContext, useContext, useEffect, useState } from "react";
import { auth, db } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const docRef = doc(db, "users", user.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const userData = docSnap.data();

            setCurrentUser({
              uid: user.uid,
              email: user.email,
              name: userData.name || "",
              devCode: userData.devCode || null,          // ✅ Developer ke liye
              linkedUserId: userData.linkedUserId || null, // ✅ Client ke liye
              status: userData.status || null,             // ✅ Client approval
              clients: userData.clients || [],             // ✅ Developer ke clients
            });

            setRole(userData.role || "user");
          } else {
            // agar firestore me doc nahi mila
            setCurrentUser({
              uid: user.uid,
              email: user.email,
              name: "",
              devCode: null,
              linkedUserId: null,
              status: null,
              clients: [],
            });
            setRole("user");
          }
        } catch (error) {
          setCurrentUser(null);
          setRole(null);
        }
      } else {
        setCurrentUser(null);
        setRole(null);
      }
      setLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const value = {
    currentUser,
    role,
    loading,
  };

  return (
    <AuthContext.Provider value={value}>
      {loading ? (
        <div className="flex items-center justify-center h-screen">
          <p className="text-gray-700 font-medium">Loading...</p>
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
}
