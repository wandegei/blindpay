import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  ShieldCheck,
  User,
} from "lucide-react";
import { useAuth } from "../lib/AuthContext";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();

  const {
    login,
    signup,
    isLoadingAuth,
    authError,
  } = useAuth();

  /* ---------------- MODE ---------------- */

  const [mode, setMode] = useState("login");

  /* ---------------- FORM STATE ---------------- */

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  /* ---------------- UI STATE ---------------- */

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  /*
   * If the user was redirected to login from a protected page,
   * send them back there after successful authentication.
   */
  const from = location.state?.from?.pathname || "/";

  /* ---------------- SWITCH MODE ---------------- */

  const switchMode = (newMode) => {
    setMode(newMode);

    setError("");
    setSuccessMessage("");

    setFullName("");
    setEmail("");
    setPassword("");
    setConfirmPassword("");

    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  /* ---------------- LOGIN ---------------- */

  /** @param {import("react").FormEvent<HTMLFormElement>} event */
  const handleLogin = async (event) => {
    event.preventDefault();

    setError("");
    setSuccessMessage("");

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      setError("Please enter your email address.");
      return;
    }

    if (!password) {
      setError("Please enter your password.");
      return;
    }

    try {
      await login(cleanEmail, password);

      navigate(from, { replace: true });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : authError ||
              "Unable to sign in. Please check your credentials and try again."
      );
    }
  };

  /* ---------------- SIGN UP ---------------- */

  /** @param {import("react").FormEvent<HTMLFormElement>} event */
  const handleSignup = async (event) => {
    event.preventDefault();

    setError("");
    setSuccessMessage("");

    const cleanName = fullName.trim();
    const cleanEmail = email.trim().toLowerCase();

    /* Validate full name */

    if (!cleanName) {
      setError("Please enter your full name.");
      return;
    }

    if (cleanName.length < 2) {
      setError("Please enter your full name.");
      return;
    }

    /* Validate email */

    if (!cleanEmail) {
      setError("Please enter your email address.");
      return;
    }

    /* Validate password */

    if (!password) {
      setError("Please create a password.");
      return;
    }

    if (password.length < 8) {
      setError(
        "Your password must be at least 8 characters long."
      );
      return;
    }

    /* Validate password confirmation */

    if (!confirmPassword) {
      setError("Please confirm your password.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      const result = await signup(
        cleanName,
        cleanEmail,
        password
      );

      /*
       * Supabase may require the user to confirm their email
       * before a session is created.
       */
      if (result.needsEmailConfirmation) {
        setSuccessMessage(
          "Account created successfully. Please check your email and confirm your account before signing in."
        );

        setPassword("");
        setConfirmPassword("");

        return;
      }

      /*
       * If email confirmation is disabled, Supabase can
       * authenticate the user immediately.
       */
      navigate(from, { replace: true });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : authError ||
              "Unable to create your account. Please try again."
      );
    }
  };

  const isLogin = mode === "login";

  /* ---------------- UI ---------------- */

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">

        {/* ---------------- BRAND ---------------- */}

        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#960048] text-white">
            <ShieldCheck size={30} />
          </div>

          <h1 className="text-2xl font-bold text-slate-900">
            Welcome to BlindPay
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Secure payment and escrow management.
          </p>
        </div>

        {/* ---------------- CARD ---------------- */}

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">

          {/* ---------------- MODE TABS ---------------- */}

          <div className="mb-6 grid grid-cols-2 rounded-lg bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => switchMode("login")}
              disabled={isLoadingAuth}
              className={`rounded-md px-3 py-2 text-sm font-medium transition ${
                isLogin
                  ? "bg-white text-[#960048] shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Sign in
            </button>

            <button
              type="button"
              onClick={() => switchMode("signup")}
              disabled={isLoadingAuth}
              className={`rounded-md px-3 py-2 text-sm font-medium transition ${
                !isLogin
                  ? "bg-white text-[#960048] shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Create account
            </button>
          </div>

          {/* ---------------- HEADING ---------------- */}

          <div className="mb-6">
            <h2 className="text-lg font-semibold text-slate-900">
              {isLogin
                ? "Sign in"
                : "Create your BlindPay account"}
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {isLogin
                ? "Enter your BlindPay account credentials."
                : "Create an account to manage your secure payments and escrow transactions."}
            </p>
          </div>

          {/* ---------------- ERROR ---------------- */}

          {(error || authError) && (
            <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm leading-5 text-red-700">
              {error || authError}
            </div>
          )}

          {/* ---------------- SUCCESS ---------------- */}

          {successMessage && (
            <div className="mb-5 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm leading-5 text-green-700">
              {successMessage}
            </div>
          )}

          {/* ---------------- LOGIN FORM ---------------- */}

          {isLogin ? (
            <form
              onSubmit={handleLogin}
              className="space-y-5"
            >

              {/* Email */}

              <div>
                <label
                  htmlFor="login-email"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Email address
                </label>

                <div className="relative">
                  <Mail
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    id="login-email"
                    type="email"
                    value={email}
                    onChange={(event) =>
                      setEmail(event.target.value)
                    }
                    placeholder="you@example.com"
                    autoComplete="email"
                    disabled={isLoadingAuth}
                    className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 outline-none transition focus:border-[#960048] focus:ring-2 focus:ring-[#960048]/10"
                  />
                </div>
              </div>

              {/* Password */}

              <div>
                <label
                  htmlFor="login-password"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Password
                </label>

                <div className="relative">
                  <LockKeyhole
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    id="login-password"
                    type={
                      showPassword
                        ? "text"
                        : "password"
                    }
                    value={password}
                    onChange={(event) =>
                      setPassword(event.target.value)
                    }
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    disabled={isLoadingAuth}
                    className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-11 text-sm text-slate-900 outline-none transition focus:border-[#960048] focus:ring-2 focus:ring-[#960048]/10"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword(
                        (value) => !value
                      )
                    }
                    disabled={isLoadingAuth}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    aria-label={
                      showPassword
                        ? "Hide password"
                        : "Show password"
                    }
                  >
                    {showPassword ? (
                      <EyeOff size={18} />
                    ) : (
                      <Eye size={18} />
                    )}
                  </button>
                </div>
              </div>

              {/* Submit */}

              <button
                type="submit"
                disabled={isLoadingAuth}
                className="flex w-full items-center justify-center rounded-lg bg-[#960048] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#750038] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoadingAuth
                  ? "Signing in..."
                  : "Sign in"}
              </button>
            </form>
          ) : (
            /* ---------------- SIGNUP FORM ---------------- */

            <form
              onSubmit={handleSignup}
              className="space-y-5"
            >

              {/* Full Name */}

              <div>
                <label
                  htmlFor="signup-name"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Full name
                </label>

                <div className="relative">
                  <User
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    id="signup-name"
                    type="text"
                    value={fullName}
                    onChange={(event) =>
                      setFullName(event.target.value)
                    }
                    placeholder="Your full name"
                    autoComplete="name"
                    disabled={isLoadingAuth}
                    className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 outline-none transition focus:border-[#960048] focus:ring-2 focus:ring-[#960048]/10"
                  />
                </div>
              </div>

              {/* Email */}

              <div>
                <label
                  htmlFor="signup-email"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Email address
                </label>

                <div className="relative">
                  <Mail
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    id="signup-email"
                    type="email"
                    value={email}
                    onChange={(event) =>
                      setEmail(event.target.value)
                    }
                    placeholder="you@example.com"
                    autoComplete="email"
                    disabled={isLoadingAuth}
                    className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 outline-none transition focus:border-[#960048] focus:ring-2 focus:ring-[#960048]/10"
                  />
                </div>
              </div>

              {/* Password */}

              <div>
                <label
                  htmlFor="signup-password"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Password
                </label>

                <div className="relative">
                  <LockKeyhole
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    id="signup-password"
                    type={
                      showPassword
                        ? "text"
                        : "password"
                    }
                    value={password}
                    onChange={(event) =>
                      setPassword(event.target.value)
                    }
                    placeholder="At least 8 characters"
                    autoComplete="new-password"
                    disabled={isLoadingAuth}
                    className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-11 text-sm text-slate-900 outline-none transition focus:border-[#960048] focus:ring-2 focus:ring-[#960048]/10"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword(
                        (value) => !value
                      )
                    }
                    disabled={isLoadingAuth}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    aria-label={
                      showPassword
                        ? "Hide password"
                        : "Show password"
                    }
                  >
                    {showPassword ? (
                      <EyeOff size={18} />
                    ) : (
                      <Eye size={18} />
                    )}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}

              <div>
                <label
                  htmlFor="signup-confirm-password"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Confirm password
                </label>

                <div className="relative">
                  <LockKeyhole
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    id="signup-confirm-password"
                    type={
                      showConfirmPassword
                        ? "text"
                        : "password"
                    }
                    value={confirmPassword}
                    onChange={(event) =>
                      setConfirmPassword(
                        event.target.value
                      )
                    }
                    placeholder="Confirm your password"
                    autoComplete="new-password"
                    disabled={isLoadingAuth}
                    className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-11 text-sm text-slate-900 outline-none transition focus:border-[#960048] focus:ring-2 focus:ring-[#960048]/10"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowConfirmPassword(
                        (value) => !value
                      )
                    }
                    disabled={isLoadingAuth}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    aria-label={
                      showConfirmPassword
                        ? "Hide password"
                        : "Show password"
                    }
                  >
                    {showConfirmPassword ? (
                      <EyeOff size={18} />
                    ) : (
                      <Eye size={18} />
                    )}
                  </button>
                </div>
              </div>

              {/* Submit */}

              <button
                type="submit"
                disabled={isLoadingAuth}
                className="flex w-full items-center justify-center rounded-lg bg-[#960048] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#750038] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoadingAuth
                  ? "Creating account..."
                  : "Create account"}
              </button>
            </form>
          )}

          {/* ---------------- FOOTER MESSAGE ---------------- */}

          <div className="mt-6 border-t border-slate-100 pt-5 text-center">
            <p className="text-xs leading-5 text-slate-500">
              BlindPay provides secure payment and escrow
              management. Access is restricted to
              authorized users.
            </p>
          </div>
        </div>

        {/* ---------------- BACK ---------------- */}

        <div className="mt-5 text-center">
          <Link
            to="/"
            className="text-sm font-medium text-[#960048] hover:underline"
          >
            Back to BlindPay
          </Link>
        </div>
      </div>
    </div>
  );
}

