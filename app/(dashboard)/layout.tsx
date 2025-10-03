"use client";
import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<any>(null);
  const [currentCompany, setCurrentCompany] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();

  useEffect(() => {
    // Fetch user data
    const fetchUser = async () => {
      try {
        const res = await fetch("/api/users/me");
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
        }
      } catch (error) {
        console.error("Failed to fetch user:", error);
      } finally {
        setLoading(false);
      }
    };

    // Get current company from localStorage
    const storedCompany = localStorage.getItem('current_company');
    if (storedCompany) {
      try {
        setCurrentCompany(JSON.parse(storedCompany));
      } catch (e) {
        console.warn('Invalid current_company in localStorage');
      }
    }

    fetchUser();
  }, []);

  const avatar = useMemo(() => {
    if (!user?.name) return { initial: '?', bg: '#6b7280', fg: '#ffffff', label: 'Profile' };
    
    try {
      const fullName = (user.name || '').trim();
      const firstName = fullName.split(' ')[0] || '';
      const initial = firstName.charAt(0).toUpperCase() || '?';
      const basis = (user.id || fullName || 'user') as string;
      let hash = 0;
      
      // Safety check for basis string
      if (basis && typeof basis === 'string' && basis.length > 0) {
        console.log('basis', basis);
        for (let i = 0; i < basis.length; i++) {
          hash = (hash * 31 + basis.charCodeAt(i)) >>> 0;
        }
      }
      const hue = hash % 360;
      const bg = `hsl(${hue}, 70%, 35%)`;
      const fg = `hsl(${hue}, 85%, 90%)`;
      return { initial, bg, fg, label: fullName || 'Profile' };
    } catch (error) {
      console.error('Error generating avatar:', error);
      return { initial: '?', bg: '#6b7280', fg: '#ffffff', label: 'Profile' };
    }
  }, [user]);

 // const avatar = { initial: '?', bg: '#6b7280', fg: '#ffffff', label: 'Profile' };
  const logout = () => {
    // Clear tokens and redirect
    document.cookie = "x-access-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    document.cookie = "x-refresh-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    localStorage.removeItem('current_company');
    window.location.href = "/login";
  };

  // Check if user can read documents for current company
  const canReadDocuments = useMemo(() => {
    if (!user || !currentCompany) return false;
    const role = user.role?.find((r: any) => String(r.company) === String(currentCompany.id));
    return !!role && Number(role.read) > 0;
  }, [user, currentCompany]);

  if (loading) {
    return (
      <div className="app-shell">
        <header className="header">
          <div className="brand">ValTech HRBot</div>
        </header>
        <main className="content">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-300"></div>
          </div>
        </main>
        <footer className="footer">
          © ValTech • <a href="https://david-val.vercel.app/" target="_blank" rel="noopener noreferrer">Website</a>
        </footer>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <header className="header">
        <div className="brand">ValTech HRBot</div>
        <nav className="nav">
          {canReadDocuments && pathname !== '/companies' && (
            <Link href="/documents" className="nav-link">Documents</Link>
          )}
          {pathname !== '/companies' && (
            <Link href="/companies" className="nav-link">Companies</Link>
          )}
        </nav>
        <div className="flex items-center gap-3">
          <button
            className="inline-flex items-center justify-center rounded-full w-9 h-9 border border-neutral-800"
            onClick={() => (window.location.href = '/profile')}
            title={avatar.label}
            style={{ backgroundColor: avatar.bg, color: avatar.fg }}
          >
            {avatar.initial}
          </button>
          <button className="button" onClick={logout}>Logout</button>
        </div>
      </header>

      <main className="content">
        {children}
      </main>

      <footer className="footer">
        © ValTech • <a href="https://david-val.vercel.app/" target="_blank" rel="noopener noreferrer">Website</a>
      </footer>
    </div>
  );
}
