"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Documents;
const react_1 = require("react");
const button_1 = require("../components/ui/button");
const api_1 = require("../lib/api");
const AuthContext_1 = require("../context/AuthContext");
function Documents() {
    const { user } = (0, AuthContext_1.useAuth)();
    const [docs, setDocs] = (0, react_1.useState)([]);
    const [meta, setMeta] = (0, react_1.useState)(null);
    const [page, setPage] = (0, react_1.useState)(1);
    const [companyId, setCompanyId] = (0, react_1.useState)(null);
    const [loading, setLoading] = (0, react_1.useState)(false);
    const [error, setError] = (0, react_1.useState)(null);
    (0, react_1.useEffect)(() => {
        // On first load, resolve a company and then fetch docs for that company
        async function ensureCompanyAndLoad() {
            if (!user)
                return;
            setLoading(true);
            setError(null);
            try {
                let id = companyId;
                if (!id) {
                    const companies = await api_1.api.listCompanies(user.id, 1, 1);
                    id = companies.companies?.[0]?._id || null;
                    setCompanyId(id);
                }
                if (id) {
                    const data = await api_1.api.listDocuments(id, page, 9);
                    setDocs(data.documents || []);
                    setMeta(data.meta || null);
                }
            }
            catch (e) {
                setError("Failed to load documents");
            }
            finally {
                setLoading(false);
            }
        }
        ensureCompanyAndLoad();
    }, [user, page, companyId]);
    return (<div className="grid gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl text-accent font-semibold">Documents</h1>
        <button_1.Button>New Document</button_1.Button>
      </div>
      {loading && <div className="text-muted">Loading...</div>}
      {error && <div className="text-red-400">{error}</div>}
      {!loading && !error && (<div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {docs.map((d) => (<div key={d._id} className="bg-panel border border-border rounded-lg p-4">
              <div className="text-accent font-medium">{d.title}</div>
              <div className="text-muted text-sm">{new Date(d.updatedAt).toLocaleString()}</div>
            </div>))}
        </div>)}
      {meta && meta.totalPages > 1 && (<div className="flex items-center justify-center gap-3">
          <button_1.Button disabled={meta.page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Previous</button_1.Button>
          <div className="text-muted">Page {meta.page} of {meta.totalPages}</div>
          <button_1.Button disabled={meta.page >= meta.totalPages} onClick={() => setPage((p) => (meta ? Math.min(meta.totalPages, p + 1) : p + 1))}>Next</button_1.Button>
        </div>)}
    </div>);
}
