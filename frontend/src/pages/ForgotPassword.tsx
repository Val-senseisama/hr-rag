import { useState } from "react";
import { Button } from "../components/ui/button";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import Session from "../helpers/Session";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.forgotPassword(email);
      Session.showAlert({ str: "Reset code sent! Check your email.", type: "success" });
      setSuccess(true);
    } catch (e) {
      setError("Failed to send reset code. Please try again.");
      Session.showAlert({ str: "Failed to send reset code. Please try again.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <div className="w-full max-w-md bg-neutral-900 rounded-lg p-6 text-center shadow-2xl shadow-zinc-400/30">
          <h1 className="text-2xl font-semibold text-zinc-200 mb-4">Check Your Email</h1>
          <p className="text-zinc-400 mb-6">
            If an account with that email exists, we've sent a 6-character reset code.
          </p>
          <Link to="/reset-password" className="text-zinc-200 hover:text-zinc-300 text-sm">
            Enter Reset Code
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[70vh]">
      <div className="w-full max-w-md bg-neutral-900 rounded-lg p-6 shadow-2xl shadow-zinc-400/30">
        <h1 className="text-2xl font-semibold text-zinc-200 mb-1">Reset Password</h1>
        <p className="text-sm text-zinc-400 mb-6">Enter your email to receive a reset code</p>

        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <label className="text-sm text-zinc-400">Email</label>
            <input
              className="h-10 rounded-md border border-neutral-800 bg-neutral-800 px-3 text-zinc-300 focus:outline-none focus:ring-2 focus:ring-zinc-300"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              required
            />
          </div>
          {error && <div className="text-red-400 text-sm">{error}</div>}
          <Button
            type="submit"
            className="w-full"
            disabled={loading}
          >
            {loading ? 'Sending...' : 'Send Reset Code'}
          </Button>
        </form>

        <div className="mt-4 text-center">
          <span className="text-zinc-400 text-sm">Remember your password? </span>
          <Link to="/login" className="text-zinc-200 hover:text-zinc-300 text-sm">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
