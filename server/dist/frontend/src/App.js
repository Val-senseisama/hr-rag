"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = App;
const react_1 = require("react");
const react_router_dom_1 = require("react-router-dom");
const Login_1 = __importDefault(require("./pages/Login"));
const Documents_1 = __importDefault(require("./pages/Documents"));
const Companies_1 = __importDefault(require("./pages/Companies"));
function App() {
    const [open, setOpen] = (0, react_1.useState)(false);
    return (<div className="app-shell">
      <header className="header">
        <div className="brand">ValTech HrBot</div>
        <nav className="nav">
          <react_router_dom_1.Link to="/" className="nav-link">Dashboard</react_router_dom_1.Link>
          <react_router_dom_1.Link to="/documents" className="nav-link">Documents</react_router_dom_1.Link>
          <react_router_dom_1.Link to="/companies" className="nav-link">Companies</react_router_dom_1.Link>
        </nav>
      </header>
      <main className="content">
        <react_router_dom_1.Routes>
          <react_router_dom_1.Route path="/" element={<section className="card">
              <h1>Welcome</h1>
              <p>A sleek, modern HR assistant interface.</p>
              <button className="button" onClick={() => setOpen(true)}>Get Started</button>
            </section>}/>
          <react_router_dom_1.Route path="/login" element={<Login_1.default />}/>
          <react_router_dom_1.Route path="/documents" element={<Documents_1.default />}/>
          <react_router_dom_1.Route path="/companies" element={<Companies_1.default />}/>
        </react_router_dom_1.Routes>
      </main>
      <footer className="footer">© ValTech</footer>

      {open && (<div className="modal-backdrop" onClick={() => setOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Quick Start</h2>
            <p>Use the navigation to manage documents and companies.</p>
            <button className="button" onClick={() => setOpen(false)}>Close</button>
          </div>
        </div>)}
    </div>);
}
