import { useState } from "react";
import { useAuth } from "../context/AuthContext";

const firebaseErrors = {
  "auth/email-already-in-use": "An account already exists for this email.",
  "auth/invalid-credential": "The email or password is incorrect.",
  "auth/invalid-email": "Enter a valid email address.",
  "auth/weak-password": "Use a password with at least six characters."
};

export default function Auth() {
  const { signUp, logIn } = useAuth();
  const [isSignUp, setIsSignUp] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      if (isSignUp) {
        await signUp(email.trim(), password);
      } else {
        await logIn(email.trim(), password);
      }
    } catch (authError) {
      setError(firebaseErrors[authError.code] || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex justify-center font-sans">
      <main className="w-full max-w-md min-h-screen bg-white px-6 py-12 flex flex-col justify-center">
        <div className="mb-8">
          <p className="text-sm font-bold uppercase tracking-widest text-orange-600">Meal Mix</p>
          <h1 className="mt-2 text-3xl font-bold text-gray-800">
            {isSignUp ? "Plan meals your way." : "Welcome back."}
          </h1>
          <p className="mt-2 text-gray-500">
            {isSignUp ? "Create an account and start with your seeded meal collection." : "Log in to access your meals and weekly plan."}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-1">Email</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-lg border border-gray-200 p-3 outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-1">Password</label>
            <input
              id="password"
              type="password"
              autoComplete={isSignUp ? "new-password" : "current-password"}
              required
              minLength="6"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-lg border border-gray-200 p-3 outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          {error && <p className="text-sm text-red-600" role="alert">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-orange-600 p-3 font-bold text-white transition hover:bg-orange-700 disabled:opacity-50"
          >
            {submitting ? "Please wait..." : isSignUp ? "Create account" : "Log in"}
          </button>
        </form>

        <button
          type="button"
          onClick={() => { setIsSignUp((current) => !current); setError(""); }}
          className="mt-6 text-sm font-semibold text-orange-600 hover:underline"
        >
          {isSignUp ? "Already have an account? Log in" : "Need an account? Sign up"}
        </button>
      </main>
    </div>
  );
}