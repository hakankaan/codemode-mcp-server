import * as path from "path";
export class PathUtils {
    static normalizePath(filePath) {
        return filePath.split(path.sep).join("/");
    }
    static getParentPath(filePath) {
        return PathUtils.normalizePath(path.dirname(filePath));
    }
    static isTypeScriptFile(filePath) {
        return /\.(ts|tsx)$/.test(filePath);
    }
    static isConfigFile(filePath) {
        const configPatterns = [
            /\.(json|yaml|yml|env|config\.(js|ts))$/,
            /^\.env/,
            /^tsconfig/,
            /^package\.json$/,
        ];
        return configPatterns.some((pattern) => pattern.test(path.basename(filePath)));
    }
    static isDocumentation(filePath) {
        const docPatterns = [
            /\.(md|mdx|txt)$/,
            /^README/,
            /^CHANGELOG/,
            /^LICENSE/,
            /^docs\//,
        ];
        return docPatterns.some((pattern) => pattern.test(filePath));
    }
    static categorizeFile(filePath) {
        const categories = [];
        if (PathUtils.isTypeScriptFile(filePath))
            categories.push("typescript");
        if (PathUtils.isConfigFile(filePath))
            categories.push("config");
        if (PathUtils.isDocumentation(filePath))
            categories.push("documentation");
        return categories;
    }
}
