"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DocumentCard } from "@/components/document/DocumentCard";
import { DocumentListSkeleton } from "@/components/document/DocumentSkeleton";

interface Document {
  _id: string;
  title: string;
  content?: string;
  fileId?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string | {
    _id: string;
    name: string;
  };
}


export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    // Prefer company from URL, then localStorage
    const params = new URLSearchParams(window.location.search);
    const urlCompany = params.get('company');
    if (urlCompany && urlCompany.trim().length > 0) {
      setSelectedCompany(urlCompany);
    } else {
      const cc = localStorage.getItem('current_company');
      if (cc) {
        try {
          const company = JSON.parse(cc);
          if (company?.id) {
            setSelectedCompany(company.id);
          }
        } catch (e) {
          console.warn('Invalid current_company in localStorage');
        }
      }
    }
  }, []);

  useEffect(() => {
    if (selectedCompany) {
      fetchDocuments();
    }
  }, [selectedCompany, page]);


  const fetchDocuments = async () => {
    if (!selectedCompany) return;
    
    try {
      setLoading(true);
      const res = await fetch(`/api/companies/${selectedCompany}/documents?page=${page}&limit=12`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Failed to load documents");
      setDocuments(data?.documents || []);
      setTotalPages(data?.meta?.totalPages || 1);
    } catch (e: any) {
      console.error('Error fetching documents:', e);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDocumentCreated = async () => {
    await fetchDocuments();
  };

  const handleDocumentUpdated = async () => {
    await fetchDocuments();
  };

  const handleDocumentDeleted = async () => {
    await fetchDocuments();
  };


  if (!selectedCompany) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <h1 className="text-3xl font-bold text-zinc-200 mb-4">No Company Selected</h1>
          <p className="text-zinc-400 mb-6">Please select a company to view documents.</p>
          <Button onClick={() => window.location.href = "/companies"}>
            Go to Companies
          </Button>
        </div>
      </div>
    );
  }


  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-zinc-200">Documents</h1>
          <p className="text-zinc-400 mt-1">
            Manage your company documents and files
          </p>
        </div>
        
        <div className="flex items-center gap-3 flex-wrap">
          {selectedCompany && (
            <Button variant="outline" onClick={() => (window.location.href = `/chat?company=${selectedCompany}`)}>
              <i className="fa-solid fa-comments mr-2" aria-hidden="true"></i>
              Open Chat
            </Button>
          )}

          <Button onClick={() => setCreateModalOpen(true)}>
            <i className="fa-solid fa-plus mr-2"></i>
            Create Document
          </Button>
        </div>
      </div>

        {error && (
          <div className="mb-6 text-red-400 text-sm bg-red-900 bg-opacity-20 border border-red-700 border-opacity-30 p-3 rounded-md">
            {error}
          </div>
        )}

        {loading ? (
          <DocumentListSkeleton count={6} />
        ) : documents.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-zinc-400 text-lg mb-4">No documents found</div>
            <p className="text-zinc-500 mb-6">Get started by creating your first document</p>
            <Button onClick={() => setCreateModalOpen(true)}>
              Create Document
            </Button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {documents.map((document) => (
                <DocumentCard
                  key={document._id}
                  document={document}
                  onUpdate={handleDocumentUpdated}
                  onDelete={handleDocumentDeleted}
                />
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

        {/* Create Document Modal */}
        {createModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div 
              className="fixed inset-0 bg-black bg-opacity-50" 
              onClick={() => setCreateModalOpen(false)}
            />
            <div className="relative z-50 w-full max-w-2xl rounded-lg border border-neutral-800 bg-neutral-900 p-6 shadow-2xl" style={{boxShadow: '0 20px 60px rgba(192, 192, 192, 0.12)'}}>
              <h2 className="text-xl font-semibold text-zinc-200 mb-4">Create New Document</h2>
              <p className="text-zinc-400 mb-6">Add a new document to your company knowledge base</p>
              
              <CreateDocumentForm
                companyId={selectedCompany}
                onDocumentCreated={handleDocumentCreated}
                onClose={() => setCreateModalOpen(false)}
              />
            </div>
          </div>
        )}
      </div>
  );
}

// Create Document Form Component
function CreateDocumentForm({ companyId, onDocumentCreated, onClose }: {
  companyId: string;
  onDocumentCreated: () => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Title is required");
      return;
    }

    setCreating(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("title", title);
      formData.append("content", content);
      formData.append("company", companyId);
      
      if (file) {
        formData.append("file", file);
      }

      const response = await fetch("/api/documents", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to create document");
      }

      setTitle("");
      setContent("");
      setFile(null);
      onDocumentCreated();
      onClose();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium text-zinc-200">Title *</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter document title"
          className="w-full px-3 py-2 rounded-md border border-neutral-800 bg-neutral-800 text-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-300"
          required
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-zinc-200">Content</label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Enter document content (optional if uploading a file)"
          rows={6}
          className="w-full px-3 py-2 rounded-md border border-neutral-800 bg-neutral-800 text-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-300"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-zinc-200">Upload File</label>
        <input
          type="file"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          accept=".pdf,.docx,.txt"
          className="w-full px-3 py-2 rounded-md border border-neutral-800 bg-neutral-800 text-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-300"
        />
        <p className="text-xs text-zinc-500">Supported formats: PDF, DOCX, TXT</p>
      </div>

      {error && (
        <div className="text-red-400 text-sm bg-red-900 bg-opacity-20 border border-red-700 border-opacity-30 p-3 rounded-md">
          {error}
        </div>
      )}

      <div className="flex justify-end space-x-2 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={creating}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={creating || !title.trim()}
        >
          {creating ? "Creating..." : "Create Document"}
        </Button>
      </div>
    </form>
  );
}