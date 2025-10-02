"use client";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function ChatPage() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [company, setCompany] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const currentCompany = localStorage.getItem('current_company');
  const currentCompanyDetails = currentCompany ? JSON.parse(currentCompany) : null;
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const companyId = params.get("company");
      setCompany(companyId);
    }
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  async function ask() {
    if (!company || !message.trim()) return;
    
    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: message.trim(),
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setMessage("");
    setLoading(true);
    
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company, message: userMessage.content })
      });
      const data = await res.json();
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: data?.message || "Sorry, I couldn't process your request.",
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, assistantMessage]);
    } catch (e) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: "Error getting response. Please try again.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  }

  if (!company) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <h1 className="text-3xl font-bold text-zinc-200 mb-4">No Company Selected</h1>
          <p className="text-zinc-400 mb-6">Please select a company to start chatting</p>
          <Button onClick={() => window.location.href = "/companies"}>
            <i className="fa-solid fa-building mr-2"></i>
            Go to Companies
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap max-w-5xl mx-auto">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-200">Chat</h1>
          <p className="text-zinc-400 text-sm">Company: {currentCompanyDetails?.name || company}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={() => (window.location.href = `/documents?company=${company}`)}>
            <i className="fa-solid fa-file-text mr-2"></i> Documents
          </Button>
          <Button variant="outline" onClick={() => (window.location.href = '/companies')}>
            <i className="fa-solid fa-building mr-2"></i> Companies
          </Button>
        </div>
      </div>

      <div className="border border-neutral-800 rounded-lg h-[70vh] p-4 overflow-y-auto bg-neutral-900 max-w-5xl mx-auto">
        {messages.length === 0 ? (
          <div className="text-zinc-500 text-sm">Ask a question about your company documents…</div>
        ) : (
          <div className="space-y-3">
            {messages.map((msg) => (
              <div key={msg.id} className={(msg.type === 'user' ? 'text-right' : 'text-left') + ' '}>
                <div className={
                  'inline-block rounded-lg px-3 py-2 whitespace-pre-wrap break-words ' +
                  (msg.type === 'user'
                    ? 'max-w-[85%] md:max-w-[70%] bg-zinc-200 text-neutral-900'
                    : 'max-w-[100%] md:max-w-[85%] bg-neutral-800 text-zinc-200')
                }>
                  {msg.content}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4 flex gap-2">
        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && ask()}
          placeholder="Type your message…"
          className="flex-1 px-3 py-2 rounded-md border border-neutral-800 bg-neutral-800 text-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-300"
        />
        <Button onClick={ask} disabled={loading || !message.trim()}>
          {loading ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-paper-plane"></i>}
        </Button>
      </div>
    </div>
  );
}


