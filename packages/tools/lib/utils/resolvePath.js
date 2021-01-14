"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolvePath = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
/**
 * By default this resolves a module into a real path on disk, optionally normalizing to unix format (replacing \ with /)
 *
 * @param name - name of the module or module/filename to resolve
 * @param options - optional confinguration bits for resolution
 */
function resolvePath(name, options) {
    const { resolveFile, normalize, leaveSymlinks } = options || {};
    const requireOptions = { paths: [process.cwd()] };
    // get a path to either the module root or a file within the module
    let resolved = resolveFile
        ? path_1.default.resolve(require.resolve(name, requireOptions))
        : path_1.default.resolve(require.resolve((name = "/package.json"), requireOptions), "..");
    // resolve the symlink unless they are explicitly asked for
    if (!leaveSymlinks) {
        resolved = fs_1.default.realpathSync(resolved);
    }
    // finally return the result, normalizing if requested
    return normalize ? resolved.replace(/[/\\]/g, "/") : resolved;
}
exports.resolvePath = resolvePath;
//# sourceMappingURL=resolvePath.js.map