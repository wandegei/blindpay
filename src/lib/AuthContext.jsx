import React, {
  createContext,
  useState,
  useContext,
  useEffect,
} from "react";

import { supabase } from "@/lib/supabaseClient";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  /* ---------------- STATE ---------------- */

  const [user, setUser] = useState(null);

  const [isAuthenticated, setIsAuthenticated] =
    useState(false);

  const [isLoadingAuth, setIsLoadingAuth] =
    useState(true);

  const [authError, setAuthError] = useState(null);

  /* ---------------- INITIALIZE AUTH ---------------- */

  useEffect(() => {
    let mounted = true;

    async function initializeAuth() {
      try {
        setIsLoadingAuth(true);

        /*
          USE getSession() INSTEAD OF getUser()
        */

        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          console.error(
            "Supabase Session Error:",
            error
          );

          if (mounted) {
            setAuthError(error.message);
          }

          return;
        }

        /*
          NO SESSION IS NORMAL
          DO NOT TREAT AS ERROR
        */

        if (mounted) {
          setUser(session?.user || null);

          setIsAuthenticated(!!session?.user);

          setAuthError(null);
        }
      } catch (err) {
        console.error(
          "Auth Initialization Error:",
          err
        );

        if (mounted) {
          setAuthError(
            err.message || "Authentication failed"
          );
        }
      } finally {
        if (mounted) {
          setIsLoadingAuth(false);
        }
      }
    }

    initializeAuth();

    /* ---------------- AUTH LISTENER ---------------- */

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        console.log(
          "Auth State Changed:",
          _event
        );

        setUser(session?.user || null);

        setIsAuthenticated(!!session?.user);

        /*
          CLEAR ERRORS ON SUCCESS
        */

        setAuthError(null);

        setIsLoadingAuth(false);
      }
    );

    return () => {
      mounted = false;

      subscription.unsubscribe();
    };
  }, []);

  /* ---------------- LOGIN ---------------- */

  const login = async (email, password) => {
    try {
      setIsLoadingAuth(true);

      setAuthError(null);

      const { error } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        });

      if (error) {
        console.error("Login Error:", error);

        setAuthError(error.message);

        return {
          success: false,
          error: error.message,
        };
      }

      return {
        success: true,
      };
    } catch (err) {
      console.error("Unexpected Login Error:", err);

      setAuthError(
        err.message || "Login failed"
      );

      return {
        success: false,
        error: err.message,
      };
    } finally {
      setIsLoadingAuth(false);
    }
  };

  /* ---------------- LOGOUT ---------------- */

  const logout = async () => {
    try {
      setIsLoadingAuth(true);

      const { error } =
        await supabase.auth.signOut();

      if (error) {
        console.error("Logout Error:", error);

        setAuthError(error.message);

        return;
      }

      setUser(null);

      setIsAuthenticated(false);

      setAuthError(null);
    } catch (err) {
      console.error("Logout Exception:", err);

      setAuthError(
        err.message || "Logout failed"
      );
    } finally {
      setIsLoadingAuth(false);
    }
  };

  /* ---------------- CONTEXT ---------------- */

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoadingAuth,
        authError,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

/* ---------------- HOOK ---------------- */

export const useAuth = () => {
  return useContext(AuthContext);
};