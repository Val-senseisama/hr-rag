import { useState, useEffect } from "react";
import { Button } from "../components/ui/button";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { DocumentCard } from "../components/DocumentCard";
import { DocumentListSkeleton } from "../components/DocumentSkeleton";
import { CreateDocumentModal } from "../components/CreateDocumentModal";
import Session from "../helpers/Session";

interface Document {
  _id: string;
  title: string;
  content?: string;
  fileId?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: {
    _id: string;
    name: string;
  };
}

interface Company {
  _id: string;
  name: string;
}

export default function Documents() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (user?.id) {
      // Prefer company from URL, then Session, then fallback after fetching companies
      const params = new URLSearchParams(window.location.search);
      const urlCompany = params.get('company');
      if (urlCompany && urlCompany.trim().length > 0) {
        setSelectedCompany(urlCompany);
      } else {
        const cc = Session.get('current_company');
        if (cc?.id) setSelectedCompany(cc.id);
      }
      fetchCompanies();
    }
  }, [user?.id]);

  useEffect(() => {
    if (selectedCompany) {
      fetchDocuments();
    }
  }, [selectedCompany, page]);

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      const data = await api.listCompanies(user?.id || "", 1, 100);
      setCompanies(data.companies || []);
      // Only set a default if none is selected from URL/Session
      if (!selectedCompany && data.companies && data.companies.length > 0) {
        setSelectedCompany(data.companies[0]._id);
      }
    } catch (error) {
      console.error("Error fetching companies:", error);
      Session.showAlert({ str: "Failed to fetch companies", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const fetchDocuments = async () => {
    if (!selectedCompany) return;
    
    try {
      setLoading(true);
      const data = await api.listDocuments(selectedCompany, page, 12);
      setDocuments(data.documents || []);
      setTotalPages(data.meta?.totalPages || 1);
    } catch (error) {
      console.error("Error fetching documents:", error);
      Session.showAlert({ str: "Failed to fetch documents", type: "error" });
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

  if (loading && companies.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-zinc-200">Documents</h1>
        </div>
        <DocumentListSkeleton count={6} />
      </div>
    );
  }

  if (companies.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <h1 className="text-3xl font-bold text-zinc-200 mb-4">No Companies Found</h1>
          <p className="text-zinc-400 mb-6">You need to be part of a company to view documents.</p>
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
          {/* {companies.length > 1 && (
            <select
              value={selectedCompany}
              onChange={(e) => setSelectedCompany(e.target.value)}
              className="px-3 py-2 rounded-md border border-neutral-800 bg-neutral-800 text-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-300"
            >
              {companies.map((company) => (
                <option key={company._id} value={company._id}>
                  {company.name}
                </option>
              ))}
            </select>
          )} */}
          
          {selectedCompany && (
            <Button variant="outline" onClick={() => (window.location.href = `/chat?company=${selectedCompany}`)}>
              <i className="fa-solid fa-comments mr-2" aria-hidden="true"></i>
              Open Chat
            </Button>
          )}

          <Button onClick={() => setCreateModalOpen(true)}>
            + Create Document
          </Button>
        </div>
      </div>

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

      <CreateDocumentModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        companyId={selectedCompany}
        onDocumentCreated={handleDocumentCreated}
      />
    </div>
  );
}