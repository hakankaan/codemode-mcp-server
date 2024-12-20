// src/analyzer.ts
import * as fs from "fs/promises";
import * as path from "path";
import { Project, SyntaxKind, VariableDeclarationKind, } from "ts-morph";
export class CodeAnalyzer {
    basePath;
    project;
    constructor(basePath) {
        this.basePath = basePath;
        this.project = new Project({
            tsConfigFilePath: path.join(basePath, "tsconfig.json"),
            skipAddingFilesFromTsConfig: true,
        });
    }
    async getCodeElements(filePath) {
        const sourceFile = this.project.addSourceFileAtPath(filePath);
        const elements = [];
        // Get functions
        sourceFile.getFunctions().forEach((func) => {
            elements.push({
                name: func.getName() || "<anonymous>",
                type: "function",
                path: filePath,
                location: {
                    startLine: func.getStartLineNumber(),
                    endLine: func.getEndLineNumber(),
                },
                isExported: func.isExported(),
            });
        });
        // Get classes
        sourceFile.getClasses().forEach((cls) => {
            elements.push({
                name: cls.getName() || "<anonymous>",
                type: "class",
                path: filePath,
                location: {
                    startLine: cls.getStartLineNumber(),
                    endLine: cls.getEndLineNumber(),
                },
                isExported: cls.isExported(),
            });
        });
        // Get interfaces
        sourceFile.getInterfaces().forEach((intf) => {
            elements.push({
                name: intf.getName(),
                type: "interface",
                path: filePath,
                location: {
                    startLine: intf.getStartLineNumber(),
                    endLine: intf.getEndLineNumber(),
                },
                isExported: intf.isExported(),
            });
        });
        // Get variables and constants
        sourceFile.getVariableDeclarations().forEach((variable) => {
            const variableStatement = variable.getFirstAncestorByKind(SyntaxKind.VariableStatement);
            const declarationList = variable.getFirstAncestorByKind(SyntaxKind.VariableDeclarationList);
            const isConst = declarationList?.getDeclarationKind() === VariableDeclarationKind.Const;
            elements.push({
                name: variable.getName(),
                type: isConst ? "constant" : "variable",
                path: filePath,
                location: {
                    startLine: variable.getStartLineNumber(),
                    endLine: variable.getEndLineNumber(),
                },
                isExported: variableStatement ? variableStatement.isExported() : false,
            });
        });
        // Clean up resources
        this.project.removeSourceFile(sourceFile);
        return elements;
    }
    async getElementContent(filePath, elementName) {
        try {
            // Add source file
            const sourceFile = this.project.addSourceFileAtPath(filePath);
            // Get imports and dependencies first before any other operations
            const imports = this.getImports(sourceFile);
            const dependencies = this.getDependencies(sourceFile);
            // Get file content and prepare lines array
            const fileContent = await fs.readFile(filePath, "utf-8");
            const lines = fileContent.split("\n");
            // Get code elements
            const elements = await this.getCodeElements(filePath);
            const element = elements.find((e) => e.name === elementName);
            if (!element) {
                this.project.removeSourceFile(sourceFile);
                return null;
            }
            // Extract the content and surrounding code
            const elementContent = lines
                .slice(element.location.startLine - 1, element.location.endLine)
                .join("\n");
            const beforeLines = lines.slice(Math.max(0, element.location.startLine - 4), element.location.startLine - 1);
            const afterLines = lines.slice(element.location.endLine, Math.min(lines.length, element.location.endLine + 3));
            // Clean up resources
            this.project.removeSourceFile(sourceFile);
            return {
                element,
                content: elementContent,
                context: {
                    imports,
                    dependencies,
                    surroundingCode: {
                        before: beforeLines,
                        after: afterLines,
                    },
                },
            };
        }
        catch (error) {
            console.error("Error getting element content:", error);
            throw error;
        }
    }
    getImports(sourceFile) {
        return sourceFile
            .getImportDeclarations()
            .map((imp) => imp.getModuleSpecifierValue());
    }
    getDependencies(sourceFile) {
        const imports = this.getImports(sourceFile);
        return imports.filter((imp) => !imp.startsWith("."));
    }
    async batchGetCodeElements(files, maxConcurrent = 5) {
        const results = new Map();
        const errors = new Map();
        // Process files in chunks to control concurrency
        for (let i = 0; i < files.length; i += maxConcurrent) {
            const chunk = files.slice(i, i + maxConcurrent);
            await Promise.all(chunk.map(async ({ filePath }) => {
                try {
                    const elements = await this.getCodeElements(filePath);
                    results.set(filePath, elements);
                }
                catch (error) {
                    errors.set(filePath, error instanceof Error ? error.message : "Unknown error");
                }
            }));
        }
        return {
            results: Object.fromEntries(results),
            errors: Object.fromEntries(errors),
        };
    }
    async batchGetElementContent(elements, maxConcurrent = 5) {
        const results = new Map();
        const errors = new Map();
        // Process elements in chunks to control concurrency
        for (let i = 0; i < elements.length; i += maxConcurrent) {
            const chunk = elements.slice(i, i + maxConcurrent);
            await Promise.all(chunk.map(async ({ filePath, elementName }) => {
                const key = `${filePath}:${elementName}`;
                try {
                    const content = await this.getElementContent(filePath, elementName);
                    results.set(key, content);
                }
                catch (error) {
                    errors.set(key, error instanceof Error ? error.message : "Unknown error");
                }
            }));
        }
        return {
            results: Object.fromEntries(results),
            errors: Object.fromEntries(errors),
        };
    }
}
