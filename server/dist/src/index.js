"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const users_js_1 = __importDefault(require("./routes/users.js"));
const companies_js_1 = __importDefault(require("./routes/companies.js"));
const documents_js_1 = __importDefault(require("./routes/documents.js"));
const CONFIG_js_1 = require("./config/CONFIG.js");
dotenv_1.default.config();
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.use("/api", users_js_1.default);
app.use("/api", companies_js_1.default);
app.use("/api", documents_js_1.default);
app.get("/", (req, res) => {
    res.send("ValTech HrBot API");
});
async function start() {
    const mongo = CONFIG_js_1.CONFIG.MONGO_URI;
    const port = Number(CONFIG_js_1.CONFIG.PORT) || 3000;
    if (!mongo) {
        console.error("MONGO_URI not set");
        process.exit(1);
    }
    await mongoose_1.default.connect(mongo);
    app.listen(port, () => {
        console.log(`Server is running on port ${port}`);
    });
}
start().catch((err) => {
    console.error(err);
    process.exit(1);
});
