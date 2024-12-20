import * as path from "path";

export class PathUtils {
  static normalizePath(filePath: string): string {
    return filePath.split(path.sep).join("/");
  }

  static getParentPath(filePath: string): string {
    return PathUtils.normalizePath(path.dirname(filePath));
  }

  static isSourceFile(fileName: string): boolean {
    return /\.(ts|tsx|js|jsx)$/.test(fileName);
  }

  static isTypeScriptFile(fileName: string): boolean {
    return /\.(ts|tsx)$/.test(fileName);
  }

  static isTestFile(fileName: string): boolean {
    return /\.(spec|test)\.(ts|tsx|js|jsx)$/.test(fileName);
  }

  static isConfigFile(fileName: string): boolean {
    const configPatterns = [
      /\.(json|yaml|yml|env|config\.(js|ts))$/,
      /^\.env/,
      /^tsconfig/,
      /^package\.json$/,
    ];
    return configPatterns.some((pattern) => pattern.test(fileName));
  }
}
