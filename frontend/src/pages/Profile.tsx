import { useState, useEffect } from "react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import Session from "../helpers/Session";

interface User {
  _id: string;
  name: string;
  email: string;
  createdAt?: string;
  updatedAt?: string;
}

export default function Profile() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    password: "",
    confirmPassword: "",
  });
  const { user: authUser, logout } = useAuth();

  useEffect(() => {
    fetchUser();
  }, []);

  const fetchUser = async () => {
    try {
      setLoading(true);
      const data = await api.me();
      setUser(data.user);
      setFormData({
        name: data.user.name,
        password: "",
        confirmPassword: "",
      });
    } catch (error) {
      console.error("Error fetching user:", error);
      Session.showAlert({ str: "Failed to fetch profile", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password && formData.password !== formData.confirmPassword) {
      Session.showAlert({ str: "Passwords do not match", type: "error" });
      return;
    }

    if (formData.password && formData.password.length < 6) {
      Session.showAlert({ str: "Password must be at least 6 characters", type: "error" });
      return;
    }

    setUpdating(true);
    try {
      const updateData: any = { name: formData.name };
      if (formData.password) {
        updateData.password = formData.password;
      }

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/users/me`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-access-token": Session.getCookie("x-access-token"),
          "x-refresh-token": Session.getCookie("x-refresh-token"),
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        throw new Error("Failed to update profile");
      }

      Session.showAlert({ str: "Profile updated successfully!", type: "success" });
      setEditMode(false);
      setFormData({
        name: formData.name,
        password: "",
        confirmPassword: "",
      });
      fetchUser(); // Refresh user data
    } catch (error) {
      console.error("Error updating profile:", error);
      Session.showAlert({ str: "Failed to update profile", type: "error" });
    } finally {
      setUpdating(false);
    }
  };

  const handleLogout = () => {
    logout();
    Session.showAlert({ str: "Logged out successfully", type: "success" });
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
        <div className="max-w-2xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-neutral-800 rounded w-1/3"></div>
            <div className="h-64 bg-neutral-800 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <h1 className="text-3xl font-bold text-zinc-200 mb-4">Profile Not Found</h1>
          <p className="text-zinc-400 mb-6">Unable to load your profile information.</p>
          <Button onClick={fetchUser}>Try Again</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
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

        <Card>
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
                    className="bg-neutral-800 text-zinc-500"
                  />
                  <p className="text-xs text-zinc-500">Email cannot be changed</p>
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
                <Button variant="outline" onClick={() => (window.location.href = '/companies')}>
                  <i className="fa-solid fa-building mr-2" /> Companies
                </Button>
                <Button variant="outline" onClick={() => (window.location.href = '/chat')}>
                  <i className="fa-solid fa-comments mr-2" /> Chat
                </Button>
              </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="mt-6">
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

              <div className="flex items-center justify-between p-4 border border-red-800 rounded-lg bg-red-900/10">
                <div>
                  <h3 className="font-medium text-red-200">Danger Zone</h3>
                  <p className="text-sm text-red-400">Permanently delete your account and all data</p>
                </div>
                <Button 
                  variant="outline" 
                  className="text-red-400 hover:text-red-300 border-red-800 hover:border-red-700"
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
