import { promises as fs } from "fs";
import * as path from "path";
import { glob } from "glob";
import { Project, } from "../../domain/project/project-entity.js";
import { PathUtils } from "./path-utils.js";
export class FSProjectRepository {
    ignoredPaths;
    constructor(ignoredPaths = ["node_modules", "dist", "build", ".git"]) {
        this.ignoredPaths = ignoredPaths;
    }
    async load(rootPath) {
        const files = new Map();
        const metadata = {
            name: path.basename(rootPath),
            rootPath,
            language: "typescript",
            hasTests: await this.hasTestFiles(rootPath),
            hasTypeScript: await this.hasTypeScriptFiles(rootPath),
        };
        // Load all files recursively
        await this.loadFiles(rootPath, files);
        return new Project(metadata, files);
    }
    async getFolderContent(folderPath) {
        try {
            const entries = await fs.readdir(folderPath, { withFileTypes: true });
            return entries
                .filter((entry) => !this.isIgnored(entry.name))
                .map((entry) => entry.name);
        }
        catch {
            return [];
        }
    }
    async getFileContent(filePath) {
        return fs.readFile(filePath, "utf-8");
    }
    async hasTypeScriptFiles(folderPath) {
        try {
            const files = await glob("**/*.{ts,tsx}", {
                cwd: folderPath,
                ignore: this.ignoredPaths.map((p) => `${p}/**`),
            });
            return files.length > 0;
        }
        catch {
            return false;
        }
    }
    async getSubFolders(folderPath) {
        try {
            const entries = await fs.readdir(folderPath, { withFileTypes: true });
            return entries
                .filter((entry) => entry.isDirectory() && !this.isIgnored(entry.name))
                .map((entry) => entry.name);
        }
        catch {
            return [];
        }
    }
    isIgnored(name) {
        return this.ignoredPaths.includes(name) || name.startsWith(".");
    }
    async loadFiles(dirPath, files) {
        const entries = await fs.readdir(dirPath, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(dirPath, entry.name);
            if (this.isIgnored(entry.name))
                continue;
            if (entry.isDirectory()) {
                await this.loadFiles(fullPath, files);
            }
            else if (entry.isFile() && PathUtils.isSourceFile(entry.name)) {
                const content = await this.getFileContent(fullPath);
                files.set(PathUtils.normalizePath(fullPath), content);
            }
        }
    }
    async hasTestFiles(rootPath) {
        try {
            const files = await glob("**/*.{spec,test}.{ts,tsx,js,jsx}", {
                cwd: rootPath,
                ignore: this.ignoredPaths.map((p) => `${p}/**`),
            });
            return files.length > 0;
        }
        catch {
            return false;
        }
    }
}
