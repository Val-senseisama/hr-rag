"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function generateResetCode() {
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    let code = "";
    for (let i = 0; i < 6; i++) {
        code += alphabet[Math.floor(Math.random() * alphabet.length)];
    }
    return code;
}
exports.default = generateResetCode;
