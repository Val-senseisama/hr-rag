import { useState } from "react";
import { Button } from "../components/ui/button";
import { useAuth } from "../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import Session from "../helpers/Session";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { login } = useAuth();
  const navigate = useNavigate();
  return (
    <div className="flex items-center justify-center min-h-[70vh]">
      <div className="w-full max-w-md bg-neutral-900 rounded-lg p-6 shadow-2xl shadow-zinc-400/30">
        <h1 className="text-2xl font-semibold text-accent mb-1">Sign in</h1>
        <p className="text-sm text-muted mb-6">Access your ValTech HRBot workspace</p>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <label className="text-sm text-muted">Email</label>
            <input
              className="h-10 rounded-md border border-border bg-panel2 px-3 text-text focus:outline-none focus:ring-2 focus:ring-[--accent]"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
            />
          </div>
          <div className="grid gap-2">
            <label className="text-sm text-muted">Password</label>
            <input
              className="h-10 rounded-md border border-border bg-panel2 px-3 text-text focus:outline-none focus:ring-2 focus:ring-[--accent]"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          {error && <div className="text-red-400 text-sm">{error}</div>}
          <Button
            className="w-full"
            disabled={loading}
            onClick={async () => {
              setError(null); setLoading(true);
              try {
                await login(email, password);
                Session.showAlert({ str: "Login successful!", type: "success" });
                navigate("/documents");
              } catch (e) {
                setError("Invalid credentials");
                Session.showAlert({ str: "Login failed. Please check your credentials.", type: "error" });
              } finally {
                setLoading(false);
              }
            }}
          >{loading ? 'Signing in...' : 'Sign in'}</Button>
        </div>

        <div className="mt-4 text-center">
          <span className="text-zinc-400 text-sm">Don't have an account? </span>
          <Link to="/register" className="text-zinc-200 hover:text-zinc-300 text-sm">Sign up</Link>
        </div>
        <div className="mt-2 text-center">
          <Link to="/forgot-password" className="text-zinc-400 hover:text-zinc-300 text-sm">Forgot password?</Link>
        </div>
      </div>
    </div>
  );
}


