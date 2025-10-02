export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="app-shell">
      <header className="header">
        <div className="brand">ValTech HRBot</div>
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
