"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Companies;
const button_1 = require("../components/ui/button");
const react_1 = require("react");
const api_1 = require("../lib/api");
const AuthContext_1 = require("../context/AuthContext");
function Companies() {
    const { user } = (0, AuthContext_1.useAuth)();
    const [companies, setCompanies] = (0, react_1.useState)([]);
    const [meta, setMeta] = (0, react_1.useState)(null);
    const [page, setPage] = (0, react_1.useState)(1);
    const [loading, setLoading] = (0, react_1.useState)(false);
    const [error, setError] = (0, react_1.useState)(null);
    (0, react_1.useEffect)(() => {
        async function load() {
            if (!user)
                return;
            setLoading(true);
            setError(null);
            try {
                const data = await api_1.api.listCompanies(user.id, page, 9);
                setCompanies(data.companies || []);
                setMeta(data.meta || null);
            }
            catch (e) {
                setError("Failed to load companies");
            }
            finally {
                setLoading(false);
            }
        }
        load();
    }, [user, page]);
    return (<div className="grid gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl text-accent font-semibold">Companies</h1>
        <button_1.Button>Create Company</button_1.Button>
      </div>
      {loading && <div className="text-muted">Loading...</div>}
      {error && <div className="text-red-400">{error}</div>}
      {!loading && !error && (<div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {companies.map((c) => (<div key={c._id} className="bg-panel border border-border rounded-lg p-4">
              <div className="text-accent font-medium">{c.name}</div>
              <div className="text-muted text-sm">{new Date(c.updatedAt).toLocaleString()}</div>
            </div>))}
        </div>)}
      {meta && meta.totalPages > 1 && (<div className="flex items-center justify-center gap-3">
          <button_1.Button disabled={meta.page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Previous</button_1.Button>
          <div className="text-muted">Page {meta.page} of {meta.totalPages}</div>
          <button_1.Button disabled={meta.page >= meta.totalPages} onClick={() => setPage((p) => (meta ? Math.min(meta.totalPages, p + 1) : p + 1))}>Next</button_1.Button>
        </div>)}
    </div>);
}
