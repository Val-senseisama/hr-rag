import { useMemo, useState } from 'react'
import { Link, Route, Routes, useLocation } from 'react-router-dom'
import Login from './pages/Login'
import Register from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import Documents from './pages/Documents'
import Companies from './pages/Companies'
import Profile from './pages/Profile'

import Session from './helpers/Session'
import { isLoggedIn } from './helpers/isLoggedIn'
import Chat from './pages/Chat'

export default function App() {
  const [open, setOpen] = useState(false);
  const isLogged = isLoggedIn();
  const location = useLocation();
  const currentPath = location.pathname;

  const user = useMemo(() => Session.get('user'), []);
  const avatar = useMemo(() => {
    const fullName = (user?.name || '').trim();
    const firstName = fullName.split(' ')[0] || '';
    const initial = firstName.charAt(0).toUpperCase() || '?';
    const basis = (user?.id || fullName || 'user') as string;
    let hash = 0;
    for (let i = 0; i < basis.length; i++) {
      hash = (hash * 31 + basis.charCodeAt(i)) >>> 0;
    }
    const hue = hash % 360;
    const bg = `hsl(${hue} 70% 35%)`;
    const fg = `hsl(${hue} 85% 90%)`;
    return { initial, bg, fg, label: fullName || 'Profile' };
  }, [user]);

  const logout = () => {
    Session.clearAllCookies();
    window.location.href = "/login";
  }
  return (
    <div className="app-shell">
      <header className="header">
        <div className="brand">ValTech HRBot</div>
      { isLogged && <nav className="nav">
          {(() => {
            const current = Session.get('current_company');
            if (!current?.id) return null;
            const u = Session.get('user');
            const role = u?.role?.find((r: any) => String(r.company) === String(current.id));
            const canRead = !!role && Number(role.read) > 0;
            return canRead && currentPath !== '/companies' ? <Link to="/documents" className="nav-link">Documents</Link> : null;
          })()}
          {currentPath !== '/companies' && (
            <Link to="/companies" className="nav-link">Companies</Link>
          )}
          {/* <Link to="/profile" className="nav-link">Profile</Link> */}
        </nav>}
        { isLogged && (
          <div className="flex items-center gap-3">
            <button
              className="inline-flex items-center justify-center rounded-full w-9 h-9 border border-neutral-800"
              onClick={() => (window.location.href = '/profile')}
              title={avatar.label}
              style={{ backgroundColor: avatar.bg, color: avatar.fg }}
            >
              {avatar.initial}
            </button>
            <button className="button" onClick={() => logout()}>Logout</button>
          </div>
        )}
      </header>

      <main className="content">
        <Routes>
          {/* <Route path="/" element={
            <section className="card">
              <h1>Welcome</h1>
              <p>A sleek, modern HR assistant interface.</p>
              <div className="flex gap-4">
                <Link to="/login" className="button">Sign In</Link>
                <Link to="/register" className="button">Get Started</Link>
              </div>
            </section>
          } /> */}
          {!isLogged ?
           ( <><Route path="*" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} /></> 
          ): (
<>
  <Route path="*" element={<Companies />} />
          <Route path="/companies" element={<Companies />} />
          <Route path="/documents" element={<Documents />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/profile" element={<Profile />} />

</>
          )
          }
       
        
        </Routes>
      </main>
      <footer className="footer">© ValTech • <a href="https://david-val.vercel.app/" target="_blank" rel="noopener noreferrer">Website</a></footer>

      {open && (
        <div className="modal-backdrop" onClick={() => setOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Quick Start</h2>
            <p>Use the navigation to manage documents and companies.</p>
            <button className="button" onClick={() => setOpen(false)}>Close</button>
          </div>
        </div>
      )}
    </div>
  )
}


