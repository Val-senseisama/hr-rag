import { useState, useEffect } from "react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import Session from "../helpers/Session";

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

export default function Companies() {
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
  const { user } = useAuth();

  useEffect(() => {
    if (user?.id) {
      fetchCompanies();
    }
  }, [user?.id, page]);

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      const data = await api.listCompanies(user?.id || "", page, 12);
      setCompanies(data.companies || []);
      
      setTotalPages(data.meta?.totalPages || 1);
    } catch (error) {
      console.error("Error fetching companies:", error);
      Session.showAlert({ str: "Failed to fetch companies", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompanyName.trim()) {
      Session.showAlert({ str: "Company name is required", type: "error" });
      return;
    }

    setCreating(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/companies`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-access-token": Session.getCookie("x-access-token"),
          "x-refresh-token": Session.getCookie("x-refresh-token"),
        },
        body: JSON.stringify({
          name: newCompanyName,
          description: newCompanyDescription,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create company");
      }

      // If backend requests a forced refresh, trigger it to get new tokens
      const forceHeader = response.headers.get('x-force-refresh');
      if (forceHeader && forceHeader.trim().length > 0) {
        try {
          const refreshResp = await fetch(`${import.meta.env.VITE_API_URL}/api/users/me`, {
            method: 'GET',
            headers: {
              'x-access-token': Session.getCookie('x-access-token'),
              'x-refresh-token': Session.getCookie('x-refresh-token'),
              'x-force-refresh': forceHeader
            },
            credentials: 'include'
          });
          // Persist new tokens if provided
          const newAccess = refreshResp.headers.get('x-access-token') || '';
          const newRefresh = refreshResp.headers.get('x-refresh-token') || '';
          if (newAccess) Session.setCookie('x-access-token', newAccess);
          if (newRefresh) Session.setCookie('x-refresh-token', newRefresh);
          // Optionally save user data if returned
          try {
            const me = await refreshResp.json().catch(() => null);
            if (me && me.user) {
              Session.set('user', me.user);
            }
          } catch {}
        } catch (e) {
          console.warn('Forced refresh failed', e);
        }
      }

      Session.showAlert({ str: "Company created successfully!", type: "success" });
      setNewCompanyName("");
      setNewCompanyDescription("");
      setCreateModalOpen(false);
      // Refetch companies immediately
      await fetchCompanies();
    } catch (error) {
      console.error("Error creating company:", error);
      Session.showAlert({ str: "Failed to create company", type: "error" });
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
    try { Session.set('current_company', { id: company._id, name: company.name }) } catch {}
    window.location.href = `/chat?company=${company._id}`
  }

  const handleOpenDocuments = (company: Company) => {
    try { Session.set('current_company', { id: company._id, name: company.name }) } catch {}
    window.location.href = `/documents?company=${company._id}`
  }

  const handleUpdateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCompany || !editName.trim()) {
      Session.showAlert({ str: "Company name is required", type: "error" });
      return;
    }

    setUpdating(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/companies/${editingCompany._id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-access-token": Session.getCookie("x-access-token"),
          "x-refresh-token": Session.getCookie("x-refresh-token"),
        },
        body: JSON.stringify({
          name: editName,
          description: editDescription,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update company");
      }

      Session.showAlert({ str: "Company updated successfully!", type: "success" });
      setEditingCompany(null);
      setEditName("");
      setEditDescription("");
      // Refetch companies immediately
      await fetchCompanies();
    } catch (error) {
      console.error("Error updating company:", error);
      Session.showAlert({ str: "Failed to update company", type: "error" });
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteCompany = async (companyId: string) => {
    setDeleting(companyId);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/companies/${companyId}`, {
        method: "DELETE",
        headers: {
          "x-access-token": Session.getCookie("x-access-token"),
          "x-refresh-token": Session.getCookie("x-refresh-token"),
        },
      });

      if (!response.ok) {
        throw new Error("Failed to delete company");
      }

      Session.showAlert({ str: "Company deleted successfully!", type: "success" });
      // Refetch companies immediately
      await fetchCompanies();
    } catch (error) {
      console.error("Error deleting company:", error);
      Session.showAlert({ str: "Failed to delete company", type: "error" });
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
    
    const role = roles[0]; // Assuming user has one role per company
    if (role.delete > 0) return "Owner";
    if (role.create > 0) return "Editor";
    if (role.update > 0) return "Contributor";
    if (role.read > 0) return "Viewer";
    return "No permissions";
  };

  const handleManageMembers = async (company: Company) => {
    setManagingMembers(company);
    setLoadingMembers(true);
    try {
      const data = await api.getCompanyMembers(company._id);
      setMembers(data.members || []);
    } catch (error) {
      console.error("Error fetching members:", error);
      Session.showAlert({ str: "Failed to fetch members", type: "error" });
    } finally {
      setLoadingMembers(false);
    }
  };

  const handleRemoveMember = async (companyId: string, userId: string) => {
    try {
      await api.removeMemberFromCompany(companyId, userId);
      Session.showAlert({ str: "Member removed successfully!", type: "success" });
      // Refresh members list
      const data = await api.getCompanyMembers(companyId);
      setMembers(data.members || []);
      // Refresh companies list
      await fetchCompanies();
    } catch (error) {
      console.error("Error removing member:", error);
      Session.showAlert({ str: "Failed to remove member", type: "error" });
    }
  };

  const handleUpdatePermissions = async (companyId: string, userId: string, permissions: any) => {
    try {
      await api.updateMemberPermissions(companyId, userId, permissions);
      Session.showAlert({ str: "Permissions updated successfully!", type: "success" });
      // Refresh members list
      const data = await api.getCompanyMembers(companyId);
      setMembers(data.members || []);
      // Refresh companies list
      await fetchCompanies();
    } catch (error) {
      console.error("Error updating permissions:", error);
      Session.showAlert({ str: "Failed to update permissions", type: "error" });
    }
  };

  const handleJoinByToken = async () => {
    if (!joinToken || !joinToken.trim()) {
      Session.showAlert({ str: "Please enter a token", type: "error" });
      return;
    }

    setJoining(true);
    try {
      await api.joinCompanyByToken(joinToken.trim());
      Session.showAlert({ str: "Successfully joined company!", type: "success" });
      setJoinToken(null);
      await fetchCompanies();
    } catch (error) {
      console.error("Error joining company:", error);
      Session.showAlert({ str: "Failed to join company. Invalid or expired token.", type: "error" });
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
                        Created by {company.createdBy?._id === (user?.id || '') ? 'You' : (company.createdBy?.name || 'Unknown')} • {formatDate(company.createdAt)}
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
                        {getRoleText(company.members.find(m => m._id === user?.id)?.role || [])}
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
                        {(() => {
                          const me = company.members.find(m => m._id === (user?.id || ''));
                          const canRead = !!me && (me.role?.[0]?.read || 0) > 0;
                          return canRead ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenDocuments(company)}
                            >
                              <i className="fa-solid fa-file-lines mr-2" aria-hidden="true"></i>
                              Documents
                            </Button>
                          ) : null;
                        })()}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => { setInviteFor(company); setInviteEmail(""); }}
                        >
                          <i className="fa-solid fa-user-plus mr-2" aria-hidden="true"></i>
                          Invite
                        </Button>
                        {(() => {
                          const me = company.members.find(m => m._id === (user?.id || ''));
                          const isOwner = !!me && (me.role?.[0]?.delete || 0) > 0;
                          return isOwner ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleManageMembers(company)}
                            >
                              <i className="fa-solid fa-users mr-2" aria-hidden="true"></i>
                              Members
                            </Button>
                          ) : null;
                        })()}
                      </div>
                      {/* <span className="text-xs text-zinc-500">
                        Updated {formatDate(company.updatedAt)}
                      </span> */}
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
            className="fixed inset-0 bg-black/50" 
            onClick={() => setCreateModalOpen(false)}
          />
          <div className="relative z-50 w-full max-w-md rounded-lg border border-neutral-800 bg-neutral-900 p-6 shadow-2xl shadow-zinc-400/30">
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
            className="fixed inset-0 bg-black/50" 
            onClick={() => setEditingCompany(null)}
          />
          <div className="relative z-50 w-full max-w-md rounded-lg border border-neutral-800 bg-neutral-900 p-6 shadow-2xl shadow-zinc-400/30">
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
            className="fixed inset-0 bg-black/50" 
            onClick={() => setInviteFor(null)}
          />
          <div className="relative z-50 w-full max-w-md rounded-lg border border-neutral-800 bg-neutral-900 p-6 shadow-2xl shadow-zinc-400/30">
            <h2 className="text-xl font-semibold text-zinc-200 mb-4">Invite to {inviteFor.name}</h2>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!inviteEmail.trim()) {
                  Session.showAlert({ str: "Email is required", type: "error" });
                  return;
                }
                setInviting(true);
                try {
                  const resp = await fetch(`${import.meta.env.VITE_API_URL}/api/companies/${inviteFor._id}/invite`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'x-access-token': Session.getCookie('x-access-token'),
                      'x-refresh-token': Session.getCookie('x-refresh-token'),
                    },
                    body: JSON.stringify({ email: inviteEmail.trim() })
                  });
                  if (!resp.ok) throw new Error('Invite failed');
                  Session.showAlert({ str: 'Invitation sent', type: 'success' });
                  setInviteFor(null);
                  setInviteEmail('');
                  fetchCompanies();
                } catch (err) {
                  console.error('Invite error', err);
                  Session.showAlert({ str: 'Failed to send invite', type: 'error' });
                } finally {
                  setInviting(false);
                }
              }}
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
            className="fixed inset-0 bg-black/50" 
            onClick={() => setJoinToken(null)}
          />
          <div className="relative z-50 w-full max-w-md rounded-lg border border-neutral-800 bg-neutral-900 p-6 shadow-2xl shadow-zinc-400/30">
            <h2 className="text-xl font-semibold text-zinc-200 mb-4">Join Company by Token</h2>
            
            <form onSubmit={(e) => { e.preventDefault(); handleJoinByToken(); }} className="space-y-4">
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

      {/* Manage Members Modal */}
      {managingMembers && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div 
            className="fixed inset-0 bg-black/50" 
            onClick={() => setManagingMembers(null)}
          />
          <div className="relative z-50 w-full max-w-4xl rounded-lg border border-neutral-800 bg-neutral-900 p-6 shadow-2xl shadow-zinc-400/30 max-h-[80vh] overflow-hidden">
            <h2 className="text-xl font-semibold text-zinc-200 mb-4">
              Manage Members - {managingMembers.name}
            </h2>
            
            <div className="overflow-y-auto max-h-[60vh]">
              {loadingMembers ? (
                <div className="text-center py-8">
                  <i className="fa-solid fa-spinner fa-spin text-2xl text-zinc-400"></i>
                  <p className="text-zinc-400 mt-2">Loading members...</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {members.map((member) => (
                    <div key={member._id} className="flex items-center justify-between p-4 bg-neutral-800 rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-zinc-600 flex items-center justify-center text-white font-semibold">
                            {member.name?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                          <div>
                            <h3 className="font-medium text-zinc-200">{member.name}</h3>
                            <p className="text-sm text-zinc-400">{member.email}</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <label className="text-sm text-zinc-400">Read:</label>
                          <input
                            type="checkbox"
                            checked={member.role?.read === 1}
                            onChange={(e) => handleUpdatePermissions(managingMembers._id, member._id, { read: e.target.checked })}
                            className="rounded"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="text-sm text-zinc-400">Create:</label>
                          <input
                            type="checkbox"
                            checked={member.role?.create === 1}
                            onChange={(e) => handleUpdatePermissions(managingMembers._id, member._id, { create: e.target.checked })}
                            className="rounded"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="text-sm text-zinc-400">Update:</label>
                          <input
                            type="checkbox"
                            checked={member.role?.update === 1}
                            onChange={(e) => handleUpdatePermissions(managingMembers._id, member._id, { update: e.target.checked })}
                            className="rounded"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="text-sm text-zinc-400">Delete:</label>
                          <input
                            type="checkbox"
                            checked={member.role?.delete === 1}
                            onChange={(e) => handleUpdatePermissions(managingMembers._id, member._id, { delete: e.target.checked })}
                            className="rounded"
                          />
                        </div>
                        
                        {member._id !== user?.id && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRemoveMember(managingMembers._id, member._id)}
                            className="text-red-400 hover:text-red-300"
                            title="Remove member"
                            aria-label="Remove member"
                          >
                            <i className="fa-solid fa-user-minus mr-2"></i>
                            Remove
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-2 pt-4 border-t border-neutral-800">
              <Button
                type="button"
                variant="outline"
                onClick={() => setManagingMembers(null)}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}