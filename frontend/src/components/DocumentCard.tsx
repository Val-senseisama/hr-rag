import { useState } from "react";
import { Card, CardContent, CardHeader } from "./ui/card";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
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

interface DocumentCardProps {
  document: Document;
  onUpdate: () => void;
  onDelete: () => void;
}

export function DocumentCard({ document, onUpdate, onDelete }: DocumentCardProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editTitle, setEditTitle] = useState(document.title);
  const [editContent, setEditContent] = useState(document.content || "");
  const [loading, setLoading] = useState(false);

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTitle.trim()) {
      Session.showAlert({ str: "Title is required", type: "error" });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/documents/${document._id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-access-token": Session.getCookie("x-access-token"),
          "x-refresh-token": Session.getCookie("x-refresh-token"),
        },
        body: JSON.stringify({
          title: editTitle,
          content: editContent,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update document");
      }

      Session.showAlert({ str: "Document updated successfully!", type: "success" });
      setEditOpen(false);
      await onUpdate();
    } catch (error) {
      console.error("Error updating document:", error);
      Session.showAlert({ str: "Failed to update document", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/documents/${document._id}`, {
        method: "DELETE",
        headers: {
          "x-access-token": Session.getCookie("x-access-token"),
          "x-refresh-token": Session.getCookie("x-refresh-token"),
        },
      });

      if (!response.ok) {
        throw new Error("Failed to delete document");
      }

      Session.showAlert({ str: "Document deleted successfully!", type: "success" });
      setDeleteOpen(false);
      await onDelete();
    } catch (error) {
      console.error("Error deleting document:", error);
      Session.showAlert({ str: "Failed to delete document", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (document.fileId) {
      const downloadUrl = `${import.meta.env.VITE_API_URL}/api/documents/${document._id}/file`;
      window.open(downloadUrl, '_blank');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const truncateContent = (content: string, maxLength: number = 150) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + "...";
  };

  return (
    <>
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="space-y-1 flex-1">
              <h3 className="font-semibold text-zinc-200 text-lg">{document.title}</h3>
              <p className="text-sm text-zinc-400">
                by {document.createdBy.name} • {formatDate(document.createdAt)}
              </p>
            </div>
            <div className="flex space-x-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditOpen(true)}
                className="h-8 w-8 p-0"
              >
                <i className="fa-solid fa-pen" aria-hidden="true"></i>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteOpen(true)}
                className="h-8 w-8 p-0 text-red-400 hover:text-red-300"
              >
                <i className="fa-solid fa-trash" aria-hidden="true"></i>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-3">
            {document.content && (
              <p className="text-sm text-zinc-300 leading-relaxed">
                {truncateContent(document.content)}
              </p>
            )}
            
            {document.fileId && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-zinc-400"><i className="fa-solid fa-paperclip mr-1" aria-hidden="true"></i> File attached</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownload}
                  className="h-6 px-2 text-xs"
                >
                  Download
                </Button>
              </div>
            )}

            <div className="flex items-center justify-between text-xs text-zinc-500">
              <span>Updated {formatDate(document.updatedAt)}</span>
              <span className="px-2 py-1 bg-neutral-800 rounded">
                {document.fileId ? "File" : "Text"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Document</DialogTitle>
            <DialogDescription>
              Update the document title and content.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEdit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-200">Title *</label>
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="Enter document title"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-200">Content</label>
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                placeholder="Enter document content..."
                rows={8}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditOpen(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading || !editTitle.trim()}>
                {loading ? "Updating..." : "Update Document"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Document</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{document.title}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleDelete}
              disabled={loading}
              className="text-red-400 hover:text-red-300"
            >
              {loading ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
