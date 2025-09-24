"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Login;
const react_1 = require("react");
const button_1 = require("../components/ui/button");
const AuthContext_1 = require("../context/AuthContext");
const react_router_dom_1 = require("react-router-dom");
function Login() {
    const [email, setEmail] = (0, react_1.useState)("");
    const [password, setPassword] = (0, react_1.useState)("");
    const [loading, setLoading] = (0, react_1.useState)(false);
    const [error, setError] = (0, react_1.useState)(null);
    const { login } = (0, AuthContext_1.useAuth)();
    const navigate = (0, react_router_dom_1.useNavigate)();
    return (<div className="flex items-center justify-center min-h-[70vh]">
      <div className="w-full max-w-md bg-panel border border-border rounded-lg p-6">
        <h1 className="text-2xl font-semibold text-accent mb-1">Sign in</h1>
        <p className="text-sm text-muted mb-6">Access your ValTech HrBot workspace</p>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <label className="text-sm text-muted">Email</label>
            <input className="h-10 rounded-md border border-border bg-panel2 px-3 text-text focus:outline-none focus:ring-2 focus:ring-[--accent]" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com"/>
          </div>
          <div className="grid gap-2">
            <label className="text-sm text-muted">Password</label>
            <input className="h-10 rounded-md border border-border bg-panel2 px-3 text-text focus:outline-none focus:ring-2 focus:ring-[--accent]" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••"/>
          </div>
          {error && <div className="text-red-400 text-sm">{error}</div>}
          <button_1.Button className="w-full" disabled={loading} onClick={async () => {
            setError(null);
            setLoading(true);
            try {
                await login(email, password);
                navigate("/documents");
            }
            catch (e) {
                setError("Invalid credentials");
            }
            finally {
                setLoading(false);
            }
        }}>{loading ? 'Signing in...' : 'Sign in'}</button_1.Button>
        </div>
      </div>
    </div>);
}
