"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface User {
  _id: string;
  name: string;
  email: string;
  createdAt?: string;
  updatedAt?: string;
}

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    password: "",
    confirmPassword: "",
  });

  useEffect(() => {
    fetchUser();
  }, []);

  const fetchUser = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/users/me");
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Failed to load profile");
      setUser(data.user);
      setFormData({
        name: data.user.name,
        password: "",
        confirmPassword: "",
      });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password && formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (formData.password && formData.password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setUpdating(true);
    setError(null);
    try {
      const updateData: any = { name: formData.name };
      if (formData.password) {
        updateData.password = formData.password;
      }

      const response = await fetch("/api/users/me", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        throw new Error("Failed to update profile");
      }

      setError(null);
      setEditMode(false);
      setFormData({
        name: formData.name,
        password: "",
        confirmPassword: "",
      });
      fetchUser(); // Refresh user data
    } catch (error: any) {
      setError(error.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleLogout = () => {
    // Clear tokens and redirect
    document.cookie = "x-access-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    document.cookie = "x-refresh-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    window.location.href = "/login";
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-300"></div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <Card className="max-w-md">
            <CardContent className="text-center py-12">
              <i className="fa-solid fa-exclamation-circle text-4xl text-red-400 mb-4"></i>
              <h3 className="text-lg font-medium text-zinc-200 mb-2">Profile Not Found</h3>
              <p className="text-zinc-400 mb-4">Unable to load your profile information.</p>
              <Button onClick={fetchUser}>Try Again</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8 gap-3 flex-wrap">
          <h1 className="text-3xl font-bold text-zinc-200">Profile</h1>
          <div className="flex space-x-2">
            {editMode ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditMode(false);
                    setFormData({
                      name: user.name,
                      password: "",
                      confirmPassword: "",
                    });
                    setError(null);
                  }}
                  disabled={updating}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleUpdate}
                  disabled={updating || !formData.name.trim()}
                >
                  {updating ? "Saving..." : "Save Changes"}
                </Button>
              </>
            ) : (
              <Button onClick={() => setEditMode(true)}>
                Edit Profile
              </Button>
            )}
          </div>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-zinc-200">Account Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {editMode ? (
              <form onSubmit={handleUpdate} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-200">Full Name *</label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter your full name"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-200">Email</label>
                  <Input
                    value={user.email}
                    disabled
                    className="bg-neutral-800 text-zinc-400"
                  />
                  <p className="text-xs text-zinc-400">Email cannot be changed</p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-200">New Password</label>
                  <Input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Enter new password (optional)"
                  />
                </div>

                {formData.password && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-200">Confirm New Password</label>
                    <Input
                      type="password"
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      placeholder="Confirm new password"
                    />
                  </div>
                )}

                {error && (
                  <div className="text-red-400 text-sm bg-red-900 bg-opacity-20 border border-red-700 border-opacity-30 p-3 rounded-md">
                    {error}
                  </div>
                )}
              </form>
            ) : (
              <>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-400">Full Name</label>
                    <p className="text-zinc-200 text-lg">{user.name}</p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-400">Email</label>
                    <p className="text-zinc-200 text-lg">{user.email}</p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-400">Member Since</label>
                    <p className="text-zinc-200">{formatDate(user.createdAt)}</p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-400">Last Updated</label>
                    <p className="text-zinc-200">{formatDate(user.updatedAt)}</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => window.location.href = '/companies'}>
                    <i className="fa-solid fa-building mr-2" /> Companies
                  </Button>
                  <Button variant="outline" onClick={() => window.location.href = '/chat'}>
                    <i className="fa-solid fa-comments mr-2" /> Chat
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-zinc-200">Account Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border border-neutral-800 rounded-lg">
                <div>
                  <h3 className="font-medium text-zinc-200">Sign Out</h3>
                  <p className="text-sm text-zinc-400">Sign out of your account on this device</p>
                </div>
                <Button variant="outline" onClick={handleLogout}>
                  Sign Out
                </Button>
              </div>

              <div className="flex items-center justify-between p-4 border border-red-200 rounded-lg bg-red-50">
                <div>
                  <h3 className="font-medium text-red-900">Danger Zone</h3>
                  <p className="text-sm text-red-600">Permanently delete your account and all data</p>
                </div>
                <Button 
                  variant="outline" 
                  className="text-red-600 hover:text-red-700 border-red-300 hover:border-red-400"
                  disabled
                >
                  Delete Account
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}