import { PathUtils } from "../../infrastructure/filesystem/path-utils.js";
import * as path from "path";
export class StructureAnalyzer {
    repository;
    constructor(repository) {
        this.repository = repository;
    }
    async analyze(rootPath) {
        const paths = {};
        const types = {
            typescript: [],
            config: [],
            documentation: [],
        };
        await this.processDirectory(rootPath, "", paths, types);
        // Generate mainPatterns based on discovered TypeScript files
        const mainPatterns = {};
        if (types.typescript.length > 0) {
            mainPatterns.source = "src/**/*.ts";
            mainPatterns.tests = "tests/**/*.spec.ts";
        }
        return {
            paths,
            types,
            metadata: {
                rootDir: path.basename(rootPath),
                mainPatterns,
                scannedAt: Date.now(),
            },
        };
    }
    async processDirectory(absolutePath, relativePath, paths, types) {
        const entries = await this.repository.getFolderContent(absolutePath);
        if (entries.length > 0) {
            paths[relativePath] = entries;
        }
        // Check for TypeScript files
        if (await this.repository.hasTypeScriptFiles(absolutePath)) {
            types.typescript.push(relativePath === "" ? "/*" : `${relativePath}/*`);
        }
        // Process subdirectories
        const subFolders = await this.repository.getSubFolders(absolutePath);
        for (const folder of subFolders) {
            const newAbsolutePath = path.join(absolutePath, folder);
            const newRelativePath = relativePath
                ? `${relativePath}/${folder}`
                : folder;
            await this.processDirectory(newAbsolutePath, newRelativePath, paths, types);
        }
        // Check for config files
        const configFiles = entries.filter((entry) => PathUtils.isConfigFile(entry));
        if (configFiles.length > 0) {
            types.config.push(`${relativePath}/*`);
        }
        // Check for documentation
        const docFiles = entries.filter((entry) => /\.(md|txt)$/.test(entry) || entry === "docs");
        if (docFiles.length > 0) {
            types.documentation.push(`${relativePath}/*`);
        }
    }
}
