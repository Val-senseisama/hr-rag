"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { isLoggedIn } from "@/lib/auth-helpers";
import Session from "@/lib/session";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const router = useRouter();

  // Check if user is already authenticated
  useEffect(() => {
    if (isLoggedIn()) {
      // User is authenticated, redirect to companies
      router.push("/companies");
      return;
    }
    
    // User is not authenticated, stay on register page
    setCheckingAuth(false);
  }, [router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Registration failed");
      
      // Set tokens in cookies
      const accessToken = res.headers.get('x-access-token');
      const refreshToken = res.headers.get('x-refresh-token');
      if (accessToken) Session.setCookie('x-access-token', accessToken);
      if (refreshToken) Session.setCookie('x-refresh-token', refreshToken);
      
      Session.showAlert({ str: "Registration successful!", type: "success" });
      window.location.href = "/companies";
    } catch (err: any) {
      setError(err.message || "Registration failed");
      Session.showAlert({ str: err.message || "Registration failed", type: "error" });
    } finally {
      setLoading(false);
    }
  }

  // Show loading while checking authentication
  if (checkingAuth) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-300 mx-auto"></div>
          <p className="mt-2 text-zinc-400">Checking authentication...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[70vh]">
      <div className="w-full max-w-md bg-neutral-900 rounded-lg p-6 shadow-2xl" style={{boxShadow: '0 20px 60px rgba(192, 192, 192, 0.12)'}}>
        <h1 className="text-2xl font-semibold text-zinc-200 mb-1">Create Account</h1>
        <p className="text-sm text-zinc-400 mb-6">Join ValTech HRBot workspace</p>

        <form onSubmit={onSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <label className="text-sm text-zinc-400">Full Name</label>
            <input
              className="h-10 rounded-md border border-neutral-800 bg-neutral-800 px-3 text-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-300"
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
              className="h-10 rounded-md border border-neutral-800 bg-neutral-800 px-3 text-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-300"
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
                className="h-10 w-full rounded-md border border-neutral-800 bg-neutral-800 pl-3 pr-10 text-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-300"
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
          <Link href="/login" className="text-zinc-200 hover:text-zinc-300 text-sm">Sign in</Link>
        </div>
      </div>
    </div>
  );
}


