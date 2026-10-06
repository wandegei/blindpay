import {
  createContext,
  useState,
  useContext,
  useEffect,
} from "react";

import { supabase } from "@/lib/supabaseClient";

/**
 * Supabase types.
 *
 * @typedef {import("@supabase/supabase-js").User} SupabaseUser
 * @typedef {import("@supabase/supabase-js").Session} SupabaseSession
 */

/**
 * Authentication context value.
 *
 * @typedef {Object} AuthContextValue
 * @property {SupabaseUser | null} user
 * @property {boolean} isAuthenticated
 * @property {boolean} isLoadingAuth
 * @property {string | null} authError
 * @property {(email: string, password: string) => Promise<{
 *   success: true,
 *   user: SupabaseUser,
 *   session: SupabaseSession | null
 * }>} login
 * @property {(fullName: string, email: string, password: string) => Promise<{
 *   success: true,
 *   user: SupabaseUser,
 *   session: SupabaseSession | null,
 *   needsEmailConfirmation: boolean
 * }>} signup
 * @property {() => Promise<void>} logout
 */

/**
 * Auth context.
 *
 * The context starts as null because the actual value is provided
 * by AuthProvider below.
 *
 * @type {import("react").Context<AuthContextValue | null>}
 */
const AuthContext = createContext(
  /** @type {AuthContextValue | null} */ (null)
);

/**
 * Authentication provider.
 *
 * @param {{ children: import("react").ReactNode }} props
 */
export const AuthProvider = ({ children }) => {
  /* ---------------- STATE ---------------- */

  const [user, setUser] = useState(
    /** @type {SupabaseUser | null} */ (null)
  );

  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  const [authError, setAuthError] = useState(
    /** @type {string | null} */ (null)
  );

  /* ---------------- INITIALIZE AUTH ---------------- */

  useEffect(() => {
    let mounted = true;

    /**
     * Initialize the current Supabase authentication session.
     *
     * @returns {Promise<void>}
     */
    const initializeAuth = async () => {
      try {
        setIsLoadingAuth(true);

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
         * No session is completely normal.
         *
         * This happens when:
         * - The user is visiting for the first time.
         * - The user has logged out.
         * - The session has expired.
         */

        if (mounted) {
          setUser(session?.user ?? null);
          setIsAuthenticated(Boolean(session?.user));
          setAuthError(null);
        }
      } catch (err) {
        console.error(
          "Auth Initialization Error:",
          err
        );

        if (mounted) {
          setAuthError(
            err instanceof Error
              ? err.message
              : "Authentication failed"
          );
        }
      } finally {
        if (mounted) {
          setIsLoadingAuth(false);
        }
      }
    };

    initializeAuth();

    /* ---------------- AUTH STATE LISTENER ---------------- */

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log(
          "Auth State Changed:",
          event
        );

        if (!mounted) {
          return;
        }

        setUser(session?.user ?? null);

        setIsAuthenticated(
          Boolean(session?.user)
        );

        /*
         * Clear previous errors whenever the
         * authentication state changes successfully.
         */

        setAuthError(null);

        setIsLoadingAuth(false);
      }
    );

    /* ---------------- CLEANUP ---------------- */

    return () => {
      mounted = false;

      subscription.unsubscribe();
    };
  }, []);

  /* ---------------- LOGIN ---------------- */

  /**
   * Sign in an existing BlindPay user.
   *
   * @param {string} email
   * @param {string} password
   * @returns {Promise<{
   *   success: true,
   *   user: SupabaseUser,
   *   session: SupabaseSession | null
   * }>}
   */
  const login = async (email, password) => {
    try {
      setIsLoadingAuth(true);
      setAuthError(null);

      const cleanEmail = email
        .trim()
        .toLowerCase();

      const {
        data,
        error,
      } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error) {
        console.error(
          "Login Error:",
          error
        );

        setAuthError(error.message);

        /*
         * Throw the error so Login.jsx can catch it.
         */
        throw new Error(error.message);
      }

      if (!data?.user) {
        const message =
          "Unable to sign in. Please try again.";

        setAuthError(message);

        throw new Error(message);
      }

      return {
        success: true,
        user: data.user,
        session: data.session,
      };
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Login failed";

      setAuthError(message);

      throw new Error(message);
    } finally {
      setIsLoadingAuth(false);
    }
  };

  /* ---------------- SIGN UP ---------------- */

  /**
   * Create a new BlindPay account.
   *
   * @param {string} fullName
   * @param {string} email
   * @param {string} password
   * @returns {Promise<{
   *   success: true,
   *   user: SupabaseUser,
   *   session: SupabaseSession | null,
   *   needsEmailConfirmation: boolean
   * }>}
   */
  const signup = async (
    fullName,
    email,
    password
  ) => {
    try {
      setIsLoadingAuth(true);
      setAuthError(null);

      const cleanName = fullName.trim();

      const cleanEmail = email
        .trim()
        .toLowerCase();

      /*
       * Create the Supabase authentication user.
       *
       * full_name is stored in Supabase Auth user_metadata.
       */

      const {
        data,
        error,
      } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            full_name: cleanName,
          },
        },
      });

      if (error) {
        console.error(
          "Signup Error:",
          error
        );

        setAuthError(error.message);

        throw new Error(error.message);
      }

      if (!data?.user) {
        const message =
          "Unable to create your account. Please try again.";

        setAuthError(message);

        throw new Error(message);
      }

      /*
       * If email confirmation is enabled in Supabase,
       * the session will normally be null until the
       * user confirms their email.
       *
       * If email confirmation is disabled,
       * Supabase can return a session immediately.
       */

      const needsEmailConfirmation =
        !data.session;

      return {
        success: true,
        user: data.user,
        session: data.session,
        needsEmailConfirmation,
      };
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Unable to create your account.";

      setAuthError(message);

      throw new Error(message);
    } finally {
      setIsLoadingAuth(false);
    }
  };

  /* ---------------- LOGOUT ---------------- */

  /**
   * Sign out the current BlindPay user.
   *
   * @returns {Promise<void>}
   */
  const logout = async () => {
    try {
      setIsLoadingAuth(true);
      setAuthError(null);

      const {
        error,
      } = await supabase.auth.signOut();

      if (error) {
        console.error(
          "Logout Error:",
          error
        );

        setAuthError(error.message);

        throw new Error(error.message);
      }

      /*
       * Clear local authentication state.
       */

      setUser(null);

      setIsAuthenticated(false);

      setAuthError(null);
    } catch (err) {
      console.error(
        "Logout Exception:",
        err
      );

      const message =
        err instanceof Error
          ? err.message
          : "Logout failed";

      setAuthError(message);

      throw new Error(message);
    } finally {
      setIsLoadingAuth(false);
    }
  };

  /* ---------------- CONTEXT ---------------- */

  /**
   * Explicitly type the context value.
   *
   * @type {AuthContextValue}
   */
  const contextValue = {
    user,
    isAuthenticated,
    isLoadingAuth,
    authError,
    login,
    signup,
    logout,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

/* ---------------- HOOK ---------------- */

/**
 * Access the BlindPay authentication context.
 *
 * @returns {AuthContextValue}
 */
export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used inside an AuthProvider"
    );
  }

  return context;
};

