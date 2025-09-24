"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.Button = void 0;
const React = __importStar(require("react"));
const class_variance_authority_1 = require("class-variance-authority");
const tailwind_merge_1 = require("tailwind-merge");
const buttonVariants = (0, class_variance_authority_1.cva)("inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none h-10 px-4 ring-offset-bg", {
    variants: {
        variant: {
            default: "bg-gradient-to-b from-[#1a1a20] to-[#0f0f14] text-accent border border-border hover:border-accent",
            outline: "border border-border bg-panel text-accent hover:border-accent",
            ghost: "text-muted hover:text-accent hover:bg-panel2",
        },
        size: {
            default: "h-10 px-4",
            sm: "h-8 px-3 text-sm",
            lg: "h-11 px-5 text-base",
        },
    },
    defaultVariants: {
        variant: "default",
        size: "default",
    },
});
exports.Button = React.forwardRef(({ className, variant, size, ...props }, ref) => {
    return (<button ref={ref} className={(0, tailwind_merge_1.twMerge)(buttonVariants({ variant, size }), className)} {...props}/>);
});
exports.Button.displayName = "Button";
