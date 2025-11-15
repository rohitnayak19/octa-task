import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { auth, db } from "../firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import toast from "react-hot-toast";
import { Spinner} from "../components/ui/spinner"
import { Button } from "../components/ui/button";
// 🧩 Exported flag to control auth listener during registration
// --- Auth listener control flag ---
let skipAuthListener = false;

export const setSkipAuthListener = (value) => {
  skipAuthListener = value;
};

export const getSkipAuthListener = () => skipAuthListener;


const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  const mounted = useRef(true);
  const unsubUserRef = useRef(null);

  // ✅ Helper: Ignore harmless abort errors
  const isAbort = (err) =>
    err?.name === "AbortError" ||
    err?.code === "cancelled" ||
    err?.message?.includes("aborted");

  useEffect(() => {
    mounted.current = true;

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      // 🚫 Skip listener during registration
      if (getSkipAuthListener()) return;

      // cleanup old Firestore snapshot listener
      if (unsubUserRef.current) {
        unsubUserRef.current();
        unsubUserRef.current = null;
      }

      // 🔸 No user logged in
      if (!user) {
        if (mounted.current) {
          setCurrentUser(null);
          setRole(null);
          setLoading(false);
        }
        return;
      }

      try {
        // Fetch user document
        const userRef = doc(db, "users", user.uid);
        const snap = await getDoc(userRef);

        // If user doc doesn’t exist, sign them out
        if (!snap.exists()) {
          await signOut(auth).catch(() => { });
          if (mounted.current) {
            setCurrentUser(null);
            setRole(null);
            setLoading(false);
          }
          return;
        }

        const data = snap.data();

        // ⛔ Prevent unapproved users from staying signed in
        if (data.adminStatus && data.adminStatus !== "approved") {
          setTimeout(async () => {
            try {
              await signOut(auth);
            } catch (err) {
              if (!isAbort(err)) console.error("Signout error:", err);
            }
            if (mounted.current) {
              setCurrentUser(null);
              setRole(null);
              setLoading(false);
            }
          }, 800);
          return;
        }

        // ✅ Set user info in context
        if (mounted.current) {
          setCurrentUser({
            uid: user.uid,
            email: user.email,
            name: data.name || "",
            devCode: data.devCode || null,
            linkedUserId: data.linkedUserId || null,
            status: data.status || null,
            clients: data.clients || [],
          });
          setRole(data.role || "user");
          setLoading(false);
        }

        // ✅ Real-time updates (watch user doc)
        unsubUserRef.current = onSnapshot(
          userRef,
          (liveSnap) => {
            if (!mounted.current || !liveSnap.exists()) return;
            const liveData = liveSnap.data();

            // If admin sets back to pending → sign out user
            if (liveData.adminStatus && liveData.adminStatus !== "approved") {
              signOut(auth).catch(() => { });
              if (mounted.current) {
                toast.error("Your account has been set to pending by admin.");
                setCurrentUser(null);
                setRole(null);
              }
            }
          },
          (error) => {
            if (!isAbort(error)) console.error("Snapshot error:", error);
          }
        );
      } catch (err) {
        if (!isAbort(err)) console.error("Auth error:", err);
        if (mounted.current) {
          setCurrentUser(null);
          setRole(null);
          setLoading(false);
        }
      }
    });

    return () => {
      mounted.current = false;
      if (unsubUserRef.current) unsubUserRef.current();
      unsubscribeAuth();
    };
  }, []);

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      if (!isAbort(err)) console.error("Logout error:", err);
    }
  };

  const value = { currentUser, role, loading, logout };

  return (
    <AuthContext.Provider value={value}>
      {loading ? (
        <div className="flex items-center justify-center h-screen">
          <Button variant={'secondary'} disabled size={'sm'}>
            <Spinner/>
            Loading...
          </Button>
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
}
