import { useState, useRef } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { Card, CardContent } from "./ui/card";
import Session from "../helpers/Session";

interface CreateDocumentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  onDocumentCreated: () => void;
}

export function CreateDocumentModal({ open, onOpenChange, companyId, onDocumentCreated }: CreateDocumentModalProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setContent(""); // Clear text content when file is selected
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      setFile(droppedFile);
      setContent(""); // Clear text content when file is dropped
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      Session.showAlert({ str: "Title is required", type: "error" });
      return;
    }

    if (!content.trim() && !file) {
      Session.showAlert({ str: "Please provide either text content or upload a file", type: "error" });
      return;
    }

    setLoading(true);
    try {
      const payload: Record<string, any> = {
        title: title.trim(),
        company: companyId,
      };
      if (content.trim()) {
        payload.content = content.trim();
      }
      if (file) {
        payload.fileBase64 = await fileToBase64(file);
        payload.filename = file.name;
        payload.contentType = file.type;
      }

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/documents`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-access-token": Session.getCookie("x-access-token"),
          "x-refresh-token": Session.getCookie("x-refresh-token"),
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("Failed to create document");
      }

      Session.showAlert({ str: "Document created successfully!", type: "success" });
      setTitle("");
      setContent("");
      setFile(null);
      await onDocumentCreated();
      onOpenChange(false);
    } catch (error) {
      console.error("Error creating document:", error);
      Session.showAlert({ str: "Failed to create document", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(",")[1]); // Remove data:type;base64, prefix
      };
      reader.onerror = error => reject(error);
    });
  };

  const resetForm = () => {
    setTitle("");
    setContent("");
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <Dialog open={open} onOpenChange={(open) => {
      onOpenChange(open);
      if (!open) resetForm();
    }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create New Document</DialogTitle>
          <DialogDescription>
            Add a new document to your company workspace. You can either write text content or upload a file.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-200">Title *</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter document title"
              required
            />
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-200">Text Content</label>
              <Textarea
                value={content}
                onChange={(e) => {
                  setContent(e.target.value);
                  if (e.target.value) setFile(null); // Clear file when typing
                }}
                placeholder="Enter document content..."
                rows={6}
                disabled={!!file}
              />
            </div>

            <div className="relative">
              <div className="text-center text-sm text-zinc-400 mb-2">OR</div>
              
              <div
                className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                  dragActive 
                    ? "border-zinc-400 bg-neutral-800" 
                    : "border-neutral-700 hover:border-neutral-600"
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileChange}
                  className="hidden"
                  accept=".pdf,.doc,.docx,.txt,.md"
                />
                
                {file ? (
                  <div className="space-y-2">
                    <div className="text-zinc-200 font-medium">{file.name}</div>
                    <div className="text-sm text-zinc-400">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setFile(null);
                        if (fileInputRef.current) fileInputRef.current.value = "";
                      }}
                    >
                      Remove File
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="text-zinc-200">Drop a file here or click to browse</div>
                    <div className="text-sm text-zinc-400">
                      Supports PDF, DOC, DOCX, TXT, MD files
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={!!content}
                    >
                      Choose File
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || (!title.trim() || (!content.trim() && !file))}>
              {loading ? "Creating..." : "Create Document"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
