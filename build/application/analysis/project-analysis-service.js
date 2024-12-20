import { StructureAnalyzer } from "./structure-analyzer.js";
import { CodeElementAnalyzer } from "./code-element-analyzer.js";
export class ProjectAnalysisService {
    repository;
    tsAnalyzer;
    structureAnalyzer;
    codeElementAnalyzer;
    constructor(repository, tsAnalyzer) {
        this.repository = repository;
        this.tsAnalyzer = tsAnalyzer;
        this.structureAnalyzer = new StructureAnalyzer(repository);
        this.codeElementAnalyzer = new CodeElementAnalyzer(tsAnalyzer);
    }
    async getProjectStructure(folderPath) {
        return this.structureAnalyzer.analyze(folderPath);
    }
    async getCodeElements(filePath) {
        return this.codeElementAnalyzer.getElements(filePath);
    }
    async getElementDetails(filePath, elementName) {
        return this.codeElementAnalyzer.getElementDetails(filePath, elementName);
    }
    async getMethodDetails(filePath, className, methodName) {
        return this.codeElementAnalyzer.getMethodDetails(filePath, className, methodName);
    }
    async batchGetCodeElements(files, maxConcurrent = 5) {
        const results = new Map();
        const errors = new Map();
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
}
