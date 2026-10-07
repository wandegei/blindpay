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

/**
 * @typedef {"login" | "signup"} AuthMode
 */

/**
 * @typedef {{
 *   from?: {
 *     pathname?: string
 *   }
 * }} LocationState
 */

/* -------------------------------------------------------------------------- */
/* HELPERS                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * @param {unknown} error
 * @param {string} fallback
 * @param {string | null} authError
 * @returns {string}
 */
function getErrorMessage(error, fallback, authError) {
  if (error instanceof Error) {
    return error.message;
  }

  return authError || fallback;
}

/**
 * @param {string} fullName
 * @param {string} email
 * @param {string} password
 * @param {string} confirmPassword
 * @returns {string}
 */
function validateSignup(
  fullName,
  email,
  password,
  confirmPassword
) {
  if (!fullName) {
    return "Please enter your full name.";
  }

  if (fullName.length < 2) {
    return "Please enter your full name.";
  }

  if (!email) {
    return "Please enter your email address.";
  }

  if (!password) {
    return "Please create a password.";
  }

  if (password.length < 8) {
    return "Your password must be at least 8 characters long.";
  }

  if (!confirmPassword) {
    return "Please confirm your password.";
  }

  if (password !== confirmPassword) {
    return "Passwords do not match.";
  }

  return "";
}

/**
 * @param {string} email
 * @param {string} password
 * @returns {string}
 */
function validateLogin(email, password) {
  if (!email) {
    return "Please enter your email address.";
  }

  if (!password) {
    return "Please enter your password.";
  }

  return "";
}

/* -------------------------------------------------------------------------- */
/* MODE TABS                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * @param {{
 *   mode: AuthMode,
 *   onChange: (mode: AuthMode) => void,
 *   disabled: boolean
 * }} props
 */
function ModeTabs({ mode, onChange, disabled }) {
  const isLogin = mode === "login";

  return (
    <div className="mb-6 grid grid-cols-2 rounded-lg bg-slate-100 p-1">
      <button
        type="button"
        onClick={() => onChange("login")}
        disabled={disabled}
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
        onClick={() => onChange("signup")}
        disabled={disabled}
        className={`rounded-md px-3 py-2 text-sm font-medium transition ${
          !isLogin
            ? "bg-white text-[#960048] shadow-sm"
            : "text-slate-500 hover:text-slate-700"
        }`}
      >
        Create account
      </button>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* PASSWORD INPUT                                                             */
/* -------------------------------------------------------------------------- */

/**
 * @param {{
 *   id: string,
 *   value: string,
 *   onChange: (event: import("react").ChangeEvent<HTMLInputElement>) => void,
 *   placeholder: string,
 *   autoComplete: string,
 *   disabled: boolean,
 *   visible: boolean,
 *   onToggle: () => void
 * }} props
 */
function PasswordInput({
  id,
  value,
  onChange,
  placeholder,
  autoComplete,
  disabled,
  visible,
  onToggle,
}) {
  return (
    <div className="relative">
      <LockKeyhole
        size={18}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
      />

      <input
        id={id}
        type={visible ? "text" : "password"}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
        disabled={disabled}
        className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-11 text-sm text-slate-900 outline-none transition focus:border-[#960048] focus:ring-2 focus:ring-[#960048]/10"
      />

      <button
        type="button"
        onClick={onToggle}
        disabled={disabled}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
        aria-label={visible ? "Hide password" : "Show password"}
      >
        {visible ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* LOGIN FORM                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * @param {{
 *   email: string,
 *   password: string,
 *   setEmail: import("react").Dispatch<import("react").SetStateAction<string>>,
 *   setPassword: import("react").Dispatch<import("react").SetStateAction<string>>,
 *   showPassword: boolean,
 *   setShowPassword: import("react").Dispatch<import("react").SetStateAction<boolean>>,
 *   isLoadingAuth: boolean,
 *   onSubmit: (event: import("react").FormEvent<HTMLFormElement>) => Promise<void>
 * }} props
 */
function LoginForm({
  email,
  password,
  setEmail,
  setPassword,
  showPassword,
  setShowPassword,
  isLoadingAuth,
  onSubmit,
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-5">
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
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            disabled={isLoadingAuth}
            className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 outline-none transition focus:border-[#960048] focus:ring-2 focus:ring-[#960048]/10"
          />
        </div>
      </div>

      <div>
        <label
          htmlFor="login-password"
          className="mb-2 block text-sm font-medium text-slate-700"
        >
          Password
        </label>

        <PasswordInput
          id="login-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Enter your password"
          autoComplete="current-password"
          disabled={isLoadingAuth}
          visible={showPassword}
          onToggle={() => setShowPassword((value) => !value)}
        />
      </div>

      <button
        type="submit"
        disabled={isLoadingAuth}
        className="flex w-full items-center justify-center rounded-lg bg-[#960048] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#750038] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isLoadingAuth ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}

/* -------------------------------------------------------------------------- */
/* SIGNUP FORM                                                                */
/* -------------------------------------------------------------------------- */

/**
 * @param {{
 *   fullName: string,
 *   email: string,
 *   password: string,
 *   confirmPassword: string,
 *   setFullName: import("react").Dispatch<import("react").SetStateAction<string>>,
 *   setEmail: import("react").Dispatch<import("react").SetStateAction<string>>,
 *   setPassword: import("react").Dispatch<import("react").SetStateAction<string>>,
 *   setConfirmPassword: import("react").Dispatch<import("react").SetStateAction<string>>,
 *   showPassword: boolean,
 *   showConfirmPassword: boolean,
 *   setShowPassword: import("react").Dispatch<import("react").SetStateAction<boolean>>,
 *   setShowConfirmPassword: import("react").Dispatch<import("react").SetStateAction<boolean>>,
 *   isLoadingAuth: boolean,
 *   onSubmit: (event: import("react").FormEvent<HTMLFormElement>) => Promise<void>
 * }} props
 */
function SignupForm({
  fullName,
  email,
  password,
  confirmPassword,
  setFullName,
  setEmail,
  setPassword,
  setConfirmPassword,
  showPassword,
  showConfirmPassword,
  setShowPassword,
  setShowConfirmPassword,
  isLoadingAuth,
  onSubmit,
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-5">
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
            onChange={(event) => setFullName(event.target.value)}
            placeholder="Your full name"
            autoComplete="name"
            disabled={isLoadingAuth}
            className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 outline-none transition focus:border-[#960048] focus:ring-2 focus:ring-[#960048]/10"
          />
        </div>
      </div>

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
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            disabled={isLoadingAuth}
            className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 outline-none transition focus:border-[#960048] focus:ring-2 focus:ring-[#960048]/10"
          />
        </div>
      </div>

      <div>
        <label
          htmlFor="signup-password"
          className="mb-2 block text-sm font-medium text-slate-700"
        >
          Password
        </label>

        <PasswordInput
          id="signup-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="At least 8 characters"
          autoComplete="new-password"
          disabled={isLoadingAuth}
          visible={showPassword}
          onToggle={() => setShowPassword((value) => !value)}
        />
      </div>

      <div>
        <label
          htmlFor="signup-confirm-password"
          className="mb-2 block text-sm font-medium text-slate-700"
        >
          Confirm password
        </label>

        <PasswordInput
          id="signup-confirm-password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          placeholder="Confirm your password"
          autoComplete="new-password"
          disabled={isLoadingAuth}
          visible={showConfirmPassword}
          onToggle={() =>
            setShowConfirmPassword((value) => !value)
          }
        />
      </div>

      <button
        type="submit"
        disabled={isLoadingAuth}
        className="flex w-full items-center justify-center rounded-lg bg-[#960048] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#750038] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isLoadingAuth ? "Creating account..." : "Create account"}
      </button>
    </form>
  );
}

/* -------------------------------------------------------------------------- */
/* PAGE                                                                       */
/* -------------------------------------------------------------------------- */

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();

  const {
    login,
    signup,
    isLoadingAuth,
    authError,
  } = useAuth();

  /**
   * Explicitly widen the initial value to AuthMode.
   *
   * Without this, checkJs can infer the state as only "login".
   *
   * @type {AuthMode}
   */
  const initialMode = "login";

  /**
   * @type {[AuthMode, import("react").Dispatch<import("react").SetStateAction<AuthMode>>]}
   */
  const modeState = useState(/** @type {AuthMode} */ (initialMode));

  const [mode, setMode] = modeState;

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  /**
   * @type {LocationState | null}
   */
  const locationState = location.state;

  const from = locationState?.from?.pathname || "/";

  const resetForm = () => {
    setError("");
    setSuccessMessage("");
    setFullName("");
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  /**
   * @param {AuthMode} newMode
   */
  const switchMode = (newMode) => {
    setMode(newMode);
    resetForm();
  };

  /**
   * @param {import("react").FormEvent<HTMLFormElement>} event
   * @returns {Promise<void>}
   */
  const handleLogin = async (event) => {
    event.preventDefault();

    setError("");
    setSuccessMessage("");

    const cleanEmail = email.trim().toLowerCase();
    const validationError = validateLogin(
      cleanEmail,
      password
    );

    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      await login(cleanEmail, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          "Unable to sign in. Please check your credentials and try again.",
          authError
        )
      );
    }
  };

  /**
   * @param {import("react").FormEvent<HTMLFormElement>} event
   * @returns {Promise<void>}
   */
  const handleSignup = async (event) => {
    event.preventDefault();

    setError("");
    setSuccessMessage("");

    const cleanName = fullName.trim();
    const cleanEmail = email.trim().toLowerCase();

    const validationError = validateSignup(
      cleanName,
      cleanEmail,
      password,
      confirmPassword
    );

    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      const result = await signup(
        cleanName,
        cleanEmail,
        password
      );

      if (result.needsEmailConfirmation) {
        setSuccessMessage(
          "Account created successfully. Please check your email and confirm your account before signing in."
        );

        setPassword("");
        setConfirmPassword("");
        return;
      }

      navigate(from, { replace: true });
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          "Unable to create your account. Please try again.",
          authError
        )
      );
    }
  };

  const isLogin = mode === "login";

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        {/* BRAND */}
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

        {/* CARD */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <ModeTabs
            mode={mode}
            onChange={switchMode}
            disabled={isLoadingAuth}
          />

          {/* HEADING */}
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

          {/* ERROR */}
          {(error || authError) && (
            <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm leading-5 text-red-700">
              {error || authError}
            </div>
          )}

          {/* SUCCESS */}
          {successMessage && (
            <div className="mb-5 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm leading-5 text-green-700">
              {successMessage}
            </div>
          )}

          {/* FORM */}
          {isLogin ? (
            <LoginForm
              email={email}
              password={password}
              setEmail={setEmail}
              setPassword={setPassword}
              showPassword={showPassword}
              setShowPassword={setShowPassword}
              isLoadingAuth={isLoadingAuth}
              onSubmit={handleLogin}
            />
          ) : (
            <SignupForm
              fullName={fullName}
              email={email}
              password={password}
              confirmPassword={confirmPassword}
              setFullName={setFullName}
              setEmail={setEmail}
              setPassword={setPassword}
              setConfirmPassword={setConfirmPassword}
              showPassword={showPassword}
              showConfirmPassword={showConfirmPassword}
              setShowPassword={setShowPassword}
              setShowConfirmPassword={setShowConfirmPassword}
              isLoadingAuth={isLoadingAuth}
              onSubmit={handleSignup}
            />
          )}

          {/* FOOTER */}
          <div className="mt-6 border-t border-slate-100 pt-5 text-center">
            <p className="text-xs leading-5 text-slate-500">
              BlindPay provides secure payment and escrow
              management. Access is restricted to
              authorized users.
            </p>
          </div>
        </div>

        {/* BACK */}
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

