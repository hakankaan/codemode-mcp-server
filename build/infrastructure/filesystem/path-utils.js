import * as path from "path";
export class PathUtils {
    static normalizePath(filePath) {
        return filePath.split(path.sep).join("/");
    }
    static getParentPath(filePath) {
        return PathUtils.normalizePath(path.dirname(filePath));
    }
    static isSourceFile(fileName) {
        return /\.(ts|tsx|js|jsx)$/.test(fileName);
    }
    static isTypeScriptFile(fileName) {
        return /\.(ts|tsx)$/.test(fileName);
    }
    static isTestFile(fileName) {
        return /\.(spec|test)\.(ts|tsx|js|jsx)$/.test(fileName);
    }
    static isConfigFile(fileName) {
        const configPatterns = [
            /\.(json|yaml|yml|env|config\.(js|ts))$/,
            /^\.env/,
            /^tsconfig/,
            /^package\.json$/,
        ];
        return configPatterns.some((pattern) => pattern.test(fileName));
    }
}
