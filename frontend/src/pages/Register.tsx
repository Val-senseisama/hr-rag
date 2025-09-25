import { useState, useEffect } from "react";
import { Button } from "../components/ui/button";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { api } from "../lib/api";
import Session from "../helpers/Session";

export default function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Handle URL parameters for company invitation
  useEffect(() => {
    const emailParam = searchParams.get('email');
    const companyParam = searchParams.get('company');
    const tokenParam = searchParams.get('token');
    
    if (emailParam) {
      setEmail(emailParam);
    }
    
    // Store company and token in session for after registration
    if (companyParam) {
      Session.set('pending_company', companyParam);
    }
    if (tokenParam) {
      Session.set('pending_token', tokenParam);
    }
  }, [searchParams]);

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
      
      // Check if there's a pending company token to join
      const pendingToken = Session.get('pending_token');
      if (pendingToken) {
        try {
          await api.joinCompanyByToken(pendingToken);
          Session.showAlert({ str: "Successfully joined the company!", type: "success" });
          Session.remove('pending_token');
          Session.remove('pending_company');
        } catch (joinError) {
          console.error("Failed to join company:", joinError);
          Session.showAlert({ str: "Account created but failed to join company. You can join manually later.", type: "warning" });
        }
      }
      
      navigate("/companies");
    } catch (e) {
      setError("Registration failed. Email may already be in use.");
      Session.showAlert({ str: "Registration failed. Email may already be in use.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const isInvited = searchParams.get('token') && searchParams.get('company');

  return (
    <div className="flex items-center justify-center min-h-[70vh]">
      <div className="w-full max-w-md bg-neutral-900 rounded-lg p-6 shadow-2xl shadow-zinc-400/30">
        <h1 className="text-2xl font-semibold text-zinc-200 mb-1">Create Account</h1>
        <p className="text-sm text-zinc-400 mb-6">
          {isInvited ? "You've been invited to join a company on ValTech HRBot" : "Join ValTech HRBot workspace"}
        </p>
        {isInvited && (
          <div className="mb-4 p-3 bg-blue-900/20 border border-blue-700/30 rounded-lg">
            <p className="text-sm text-blue-300">
              <i className="fa-solid fa-envelope mr-2"></i>
              You're joining via invitation. After registration, you'll automatically be added to the company.
            </p>
          </div>
        )}

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
            <div className="relative">
              <input
                className="h-10 w-full rounded-md border border-neutral-800 bg-neutral-800 pl-3 pr-10 text-zinc-300 focus:outline-none focus:ring-2 focus:ring-zinc-300"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute inset-y-0 right-2 my-auto h-7 w-7 rounded hover:text-zinc-200 text-zinc-400"
                aria-label="Toggle password visibility"
              >
                <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
              </button>
            </div>
          </div>
          <div className="grid gap-2">
            <label className="text-sm text-zinc-400">Confirm Password</label>
            <div className="relative">
              <input
                className="h-10 w-full rounded-md border border-neutral-800 bg-neutral-800 pl-3 pr-10 text-zinc-300 focus:outline-none focus:ring-2 focus:ring-zinc-300"
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                className="absolute inset-y-0 right-2 my-auto h-7 w-7 rounded hover:text-zinc-200 text-zinc-400"
                aria-label="Toggle confirm password visibility"
              >
                <i className={`fa-solid ${showConfirm ? 'fa-eye-slash' : 'fa-eye'}`}></i>
              </button>
            </div>
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
