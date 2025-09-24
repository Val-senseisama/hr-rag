"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthProvider = AuthProvider;
exports.useAuth = useAuth;
const react_1 = require("react");
const api_1 = require("../lib/api");
const AuthContext = (0, react_1.createContext)(undefined);
function AuthProvider({ children }) {
    const [user, setUser] = (0, react_1.useState)(null);
    const [tokens, setTokens] = (0, react_1.useState)(api_1.api.getTokens());
    (0, react_1.useEffect)(() => {
        if (tokens) {
            api_1.api.me().then((data) => setUser(data.user || data)).catch(() => setUser(null));
        }
    }, [tokens]);
    async function login(email, password) {
        const data = await api_1.api.login(email, password);
        setTokens(api_1.api.getTokens());
        setUser(data.user);
    }
    function logout() {
        api_1.api.clearTokens();
        setTokens(null);
        setUser(null);
    }
    return (<AuthContext.Provider value={{ user, tokens, login, logout }}>
      {children}
    </AuthContext.Provider>);
}
function useAuth() {
    const ctx = (0, react_1.useContext)(AuthContext);
    if (!ctx)
        throw new Error('useAuth must be used within AuthProvider');
    return ctx;
}
