import { useState } from "react";
import { Button } from "../components/ui/button";
import { useAuth } from "../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { api } from "../lib/api";
import Session from "../helpers/Session";

export default function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setError(null);
    setLoading(true);
    try {
      await api.register(name, email, password);
      Session.showAlert({ str: "Account created successfully! Welcome to ValTech HRBot!", type: "success" });
      navigate("/documents");
    } catch (e) {
      setError("Registration failed. Email may already be in use.");
      Session.showAlert({ str: "Registration failed. Email may already be in use.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[70vh]">
      <div className="w-full max-w-md bg-neutral-900 rounded-lg p-6 shadow-2xl shadow-zinc-400/30">
        <h1 className="text-2xl font-semibold text-zinc-200 mb-1">Create Account</h1>
        <p className="text-sm text-zinc-400 mb-6">Join ValTech HRBot workspace</p>

        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <label className="text-sm text-zinc-400">Full Name</label>
            <input
              className="h-10 rounded-md border border-neutral-800 bg-neutral-800 px-3 text-zinc-300 focus:outline-none focus:ring-2 focus:ring-zinc-300"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Doe"
              required
            />
          </div>
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
            <label className="text-sm text-zinc-400">Password</label>
            <input
              className="h-10 rounded-md border border-neutral-800 bg-neutral-800 px-3 text-zinc-300 focus:outline-none focus:ring-2 focus:ring-zinc-300"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
          <div className="grid gap-2">
            <label className="text-sm text-zinc-400">Confirm Password</label>
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
            {loading ? 'Creating Account...' : 'Create Account'}
          </Button>
        </form>

        <div className="mt-4 text-center">
          <span className="text-zinc-400 text-sm">Already have an account? </span>
          <Link to="/login" className="text-zinc-200 hover:text-zinc-300 text-sm">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
