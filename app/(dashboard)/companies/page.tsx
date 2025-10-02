"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface Company {
  _id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: {
    _id: string;
    name: string;
  };
  members: Array<{
    _id: string;
    name: string;
    email: string;
    role: Array<{
      company: string;
      read: number;
      create: number;
      update: number;
      delete: number;
    }>;
  }>;
}

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState("");
  const [newCompanyDescription, setNewCompanyDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [inviteFor, setInviteFor] = useState<Company | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [managingMembers, setManagingMembers] = useState<Company | null>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [joinToken, setJoinToken] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCompanies();
  }, [page]);

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/companies");
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Failed to load companies");
      setCompanies(data?.companies || []);
      setTotalPages(data?.meta?.totalPages || 1);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompanyName.trim()) {
      setError("Company name is required");
      return;
    }

    setCreating(true);
    setError(null);
    try {
      const response = await fetch("/api/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newCompanyName,
          description: newCompanyDescription,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create company");
      }

      // Handle forced refresh if needed
      const forceHeader = response.headers.get('x-force-refresh');
      if (forceHeader && forceHeader.trim().length > 0) {
        try {
          const refreshResp = await fetch("/api/users/me", {
            method: 'GET',
            headers: {
              'x-force-refresh': forceHeader
            },
          });
          // Persist new tokens if provided
          const newAccess = refreshResp.headers.get('x-access-token') || '';
          const newRefresh = refreshResp.headers.get('x-refresh-token') || '';
          if (newAccess) document.cookie = `x-access-token=${newAccess}; path=/;`;
          if (newRefresh) document.cookie = `x-refresh-token=${newRefresh}; path=/;`;
        } catch (e) {
          console.warn('Forced refresh failed', e);
        }
      }

      setNewCompanyName("");
      setNewCompanyDescription("");
      setCreateModalOpen(false);
      await fetchCompanies();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setCreating(false);
    }
  };

  const handleEditCompany = (company: Company) => {
    setEditingCompany(company);
    setEditName(company.name);
    setEditDescription(company.description || "");
  };

  const handleSelectCompany = (company: Company) => {
    // Store in localStorage for session management
    localStorage.setItem('current_company', JSON.stringify({ id: company._id, name: company.name }));
    window.location.href = `/chat?company=${company._id}`;
  };

  const handleOpenDocuments = (company: Company) => {
    localStorage.setItem('current_company', JSON.stringify({ id: company._id, name: company.name }));
    window.location.href = `/documents?company=${company._id}`;
  };

  const handleUpdateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCompany || !editName.trim()) {
      setError("Company name is required");
      return;
    }

    setUpdating(true);
    setError(null);
    try {
      const response = await fetch(`/api/companies/${editingCompany._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName,
          description: editDescription,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update company");
      }

      setEditingCompany(null);
      setEditName("");
      setEditDescription("");
      await fetchCompanies();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteCompany = async (companyId: string) => {
    setDeleting(companyId);
    setError(null);
    try {
      const response = await fetch(`/api/companies/${companyId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete company");
      }

      await fetchCompanies();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setDeleting(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getRoleText = (roles: Array<{ company: string; read: number; create: number; update: number; delete: number }>) => {
    if (roles.length === 0) return "No permissions";
    
    const role = roles[0];
    if (role.delete > 0) return "Owner";
    if (role.create > 0) return "Editor";
    if (role.update > 0) return "Contributor";
    if (role.read > 0) return "Viewer";
    return "No permissions";
  };

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteFor || !inviteEmail.trim()) return;

    setInviting(true);
    setError(null);
    try {
      const response = await fetch(`/api/companies/${inviteFor._id}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail }),
      });

      if (!response.ok) {
        throw new Error("Failed to send invitation");
      }

      setInviteFor(null);
      setInviteEmail("");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setInviting(false);
    }
  };

  const handleJoinByToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinToken || !joinToken.trim()) {
      setError("Please enter a token");
      return;
    }

    setJoining(true);
    setError(null);
    try {
      const response = await fetch("/api/companies/join-by-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: joinToken.trim() }),
      });

      if (!response.ok) {
        throw new Error("Failed to join company. Invalid or expired token.");
      }

      setJoinToken(null);
      await fetchCompanies();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-zinc-200">Companies</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-neutral-800 rounded w-3/4"></div>
                <div className="h-4 bg-neutral-800 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-4 bg-neutral-800 rounded"></div>
                  <div className="h-4 bg-neutral-800 rounded w-2/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-zinc-200">Companies</h1>
          <p className="text-zinc-400 mt-1">
            Manage your company workspaces and teams
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setJoinToken("")}> 
            <i className="fa-solid fa-key mr-2"></i> Join by Token
          </Button>
          <Button onClick={() => setCreateModalOpen(true)}>
            <i className="fa-solid fa-plus mr-2"></i> Create Company
          </Button>
        </div>
      </div>

        {error && (
          <div className="mb-6 text-red-400 text-sm bg-red-900 bg-opacity-20 border border-red-700 border-opacity-30 p-3 rounded-md">
            {error}
          </div>
        )}

        {companies.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-zinc-400 text-lg mb-4">No companies found</div>
            <p className="text-zinc-500 mb-6">Create your first company to get started</p>
            <Button onClick={() => setCreateModalOpen(true)}>
              Create Company
            </Button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
              {companies.map((company) => (
                <Card key={company._id} className="hover:shadow-lg transition-shadow h-full flex flex-col">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <CardTitle className="text-zinc-200 text-xl">{company.name}</CardTitle>
                        <p className="text-zinc-400 text-sm">
                          Created by {company.createdBy?.name || 'Unknown'} • {formatDate(company.createdAt)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditCompany(company)}
                          className="h-8 w-8 p-0"
                          aria-label="Edit company"
                          title="Edit"
                        >
                          <i className="fa-solid fa-pen" aria-hidden="true"></i>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteCompany(company._id)}
                          disabled={deleting === company._id}
                          className="h-8 w-8 p-0 text-red-400 hover:text-red-300"
                          aria-label="Delete company"
                          title="Delete"
                        >
                          {deleting === company._id ? <i className="fa-solid fa-spinner fa-spin" aria-hidden="true"></i> : <i className="fa-solid fa-trash" aria-hidden="true"></i>}
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="flex flex-col h-full">
                    <div className="space-y-3">
                      {company.description && (
                        <p className="text-zinc-300 text-sm leading-relaxed">
                          {company.description}
                        </p>
                      )}
                      
                      <div className="flex items-center justify-between text-sm gap-2">
                        <span className="text-zinc-400">
                          {company.members.length} member{company.members.length !== 1 ? 's' : ''}
                        </span>
                        <span className="px-2 py-1 bg-neutral-800 rounded text-zinc-300 text-xs whitespace-nowrap">
                          {getRoleText(company.members[0]?.role || [])}
                        </span>
                      </div>

                      <div className="flex-1" />

                      <div className="flex items-center justify-between pt-2 mt-auto">
                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSelectCompany(company)}
                          >
                            <i className="fa-solid fa-comments mr-2" aria-hidden="true"></i>
                            Open Chat
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenDocuments(company)}
                          >
                            <i className="fa-solid fa-file-lines mr-2" aria-hidden="true"></i>
                            Documents
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => { setInviteFor(company); setInviteEmail(""); }}
                          >
                            <i className="fa-solid fa-user-plus mr-2" aria-hidden="true"></i>
                            Invite
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex justify-center space-x-2 mt-12">
                <Button
                  variant="outline"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1 || loading}
                >
                  Previous
                </Button>
                <span className="px-4 py-2 text-zinc-400 flex items-center">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages || loading}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}

        {/* Create Company Modal */}
        {createModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div 
              className="fixed inset-0 bg-black bg-opacity-50" 
              onClick={() => setCreateModalOpen(false)}
            />
            <div className="relative z-50 w-full max-w-md rounded-lg border border-neutral-800 bg-neutral-900 p-6 shadow-2xl" style={{boxShadow: '0 20px 60px rgba(192, 192, 192, 0.12)'}}>
              <h2 className="text-xl font-semibold text-zinc-200 mb-4">Create New Company</h2>
              
              <form onSubmit={handleCreateCompany} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-200">Company Name *</label>
                  <input
                    type="text"
                    value={newCompanyName}
                    onChange={(e) => setNewCompanyName(e.target.value)}
                    placeholder="Enter company name"
                    className="w-full px-3 py-2 rounded-md border border-neutral-800 bg-neutral-800 text-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-300"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-200">Description</label>
                  <textarea
                    value={newCompanyDescription}
                    onChange={(e) => setNewCompanyDescription(e.target.value)}
                    placeholder="Enter company description (optional)"
                    rows={3}
                    className="w-full px-3 py-2 rounded-md border border-neutral-800 bg-neutral-800 text-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-300"
                  />
                </div>

                <div className="flex justify-end space-x-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCreateModalOpen(false)}
                    disabled={creating}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={creating || !newCompanyName.trim()}>
                    {creating ? "Creating..." : "Create Company"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Company Modal */}
        {editingCompany && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div 
              className="fixed inset-0 bg-black bg-opacity-50" 
              onClick={() => setEditingCompany(null)}
            />
            <div className="relative z-50 w-full max-w-md rounded-lg border border-neutral-800 bg-neutral-900 p-6 shadow-2xl" style={{boxShadow: '0 20px 60px rgba(192, 192, 192, 0.12)'}}>
              <h2 className="text-xl font-semibold text-zinc-200 mb-4">Edit Company</h2>
              
              <form onSubmit={handleUpdateCompany} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-200">Company Name *</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Enter company name"
                    className="w-full px-3 py-2 rounded-md border border-neutral-800 bg-neutral-800 text-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-300"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-200">Description</label>
                  <textarea
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    placeholder="Enter company description (optional)"
                    rows={3}
                    className="w-full px-3 py-2 rounded-md border border-neutral-800 bg-neutral-800 text-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-300"
                  />
                </div>

                <div className="flex justify-end space-x-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEditingCompany(null)}
                    disabled={updating}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={updating || !editName.trim()}>
                    {updating ? "Updating..." : "Update Company"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Invite User Modal */}
        {inviteFor && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div 
              className="fixed inset-0 bg-black bg-opacity-50" 
              onClick={() => setInviteFor(null)}
            />
            <div className="relative z-50 w-full max-w-md rounded-lg border border-neutral-800 bg-neutral-900 p-6 shadow-2xl" style={{boxShadow: '0 20px 60px rgba(192, 192, 192, 0.12)'}}>
              <h2 className="text-xl font-semibold text-zinc-200 mb-4">Invite to {inviteFor.name}</h2>
              <form
                onSubmit={handleInviteUser}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-200">User Email *</label>
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="user@example.com"
                    className="w-full px-3 py-2 rounded-md border border-neutral-800 bg-neutral-800 text-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-300"
                    required
                  />
                  <p className="text-xs text-zinc-500">If the user exists, they'll be added and notified. Otherwise, they'll get a signup invite.</p>
                </div>
                <div className="flex justify-end space-x-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setInviteFor(null)} disabled={inviting}>Cancel</Button>
                  <Button type="submit" disabled={inviting || !inviteEmail.trim()}>
                    {inviting ? 'Sending…' : 'Send Invite'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Join by Token Modal */}
        {joinToken !== null && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div 
              className="fixed inset-0 bg-black bg-opacity-50" 
              onClick={() => setJoinToken(null)}
            />
            <div className="relative z-50 w-full max-w-md rounded-lg border border-neutral-800 bg-neutral-900 p-6 shadow-2xl" style={{boxShadow: '0 20px 60px rgba(192, 192, 192, 0.12)'}}>
              <h2 className="text-xl font-semibold text-zinc-200 mb-4">Join Company by Token</h2>
              
              <form onSubmit={handleJoinByToken} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-200">Token *</label>
                  <input
                    type="text"
                    value={joinToken ?? ""}
                    onChange={(e) => setJoinToken(e.target.value.toUpperCase())}
                    placeholder="Enter 6-character token"
                    maxLength={6}
                    className="w-full px-3 py-2 rounded-md border border-neutral-800 bg-neutral-800 text-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-300 text-center text-lg tracking-widest"
                    required
                  />
                  <p className="text-xs text-zinc-500">Enter the 6-character token you received via email</p>
                </div>

                <div className="flex justify-end space-x-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setJoinToken(null)}
                    disabled={joining}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={joining || !joinToken?.trim()}>
                    {joining ? "Joining..." : "Join Company"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
  );
}