import { useState } from "react";
import { Button } from "../components/ui/button";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import Session from "../helpers/Session";

export default function ResetPassword() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setError(null);
    setLoading(true);
    try {
      await api.resetPassword(email, code, newPassword);
      Session.showAlert({ str: "Password reset successfully! You can now sign in.", type: "success" });
      setSuccess(true);
    } catch (e) {
      setError("Invalid or expired reset code. Please try again.");
      Session.showAlert({ str: "Invalid or expired reset code. Please try again.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <div className="w-full max-w-md bg-neutral-900 rounded-lg p-6 text-center shadow-2xl shadow-zinc-400/30">
          <h1 className="text-2xl font-semibold text-zinc-200 mb-4">Password Reset</h1>
          <p className="text-zinc-400 mb-6">Your password has been successfully reset.</p>
          <Link to="/login" className="text-zinc-200 hover:text-zinc-300 text-sm">
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[70vh]">
      <div className="w-full max-w-md bg-neutral-900 rounded-lg p-6 shadow-2xl shadow-zinc-400/30">
        <h1 className="text-2xl font-semibold text-zinc-200 mb-1">Enter Reset Code</h1>
        <p className="text-sm text-zinc-400 mb-6">Enter the 6-character code from your email</p>

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
          <div className="grid gap-2">
            <label className="text-sm text-zinc-400">Reset Code</label>
            <input
              className="h-10 rounded-md border border-neutral-800 bg-neutral-800 px-3 text-zinc-300 focus:outline-none focus:ring-2 focus:ring-zinc-300 text-center tracking-widest"
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="ABC123"
              maxLength={6}
              required
            />
          </div>
          <div className="grid gap-2">
            <label className="text-sm text-zinc-400">New Password</label>
            <input
              className="h-10 rounded-md border border-neutral-800 bg-neutral-800 px-3 text-zinc-300 focus:outline-none focus:ring-2 focus:ring-zinc-300"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
          <div className="grid gap-2">
            <label className="text-sm text-zinc-400">Confirm New Password</label>
            <input
              className="h-10 rounded-md border border-neutral-800 bg-neutral-800 px-3 text-zinc-300 focus:outline-none focus:ring-2 focus:ring-zinc-300"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
          {error && <div className="text-red-400 text-sm">{error}</div>}
          <Button
            type="submit"
            className="w-full"
            disabled={loading}
          >
            {loading ? 'Resetting...' : 'Reset Password'}
          </Button>
        </form>

        <div className="mt-4 text-center">
          <span className="text-zinc-400 text-sm">Need a new code? </span>
          <Link to="/forgot-password" className="text-zinc-200 hover:text-zinc-300 text-sm">Request Again</Link>
        </div>
      </div>
    </div>
  );
}
