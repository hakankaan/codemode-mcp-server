import { ProjectRepository } from "../../domain/project/project-repository.js";
import { TSMorphAdapter } from "../../infrastructure/typescript/ts-morph-adapter.js";
import { StructureAnalyzer } from "./structure-analyzer.js";
import { CodeElementAnalyzer } from "./code-element-analyzer.js";
import {
  PathBasedStructure,
  ElementAnalysis,
  BatchAnalysisResult,
  CodeElementSummary,
  MethodSignature,
} from "../types/analysis-results.js";
import { AnalysisService } from "./analysis-service.js";

export class ProjectAnalysisService implements AnalysisService {
  private structureAnalyzer: StructureAnalyzer;
  private codeElementAnalyzer: CodeElementAnalyzer;

  constructor(
    private readonly repository: ProjectRepository,
    private readonly tsAnalyzer: TSMorphAdapter
  ) {
    this.structureAnalyzer = new StructureAnalyzer(repository);
    this.codeElementAnalyzer = new CodeElementAnalyzer(tsAnalyzer);
  }

  async getProjectStructure(folderPath: string): Promise<PathBasedStructure> {
    return this.structureAnalyzer.analyze(folderPath);
  }

  async getCodeElements(filePath: string): Promise<CodeElementSummary[]> {
    return this.codeElementAnalyzer.getElements(filePath);
  }

  async getElementDetails(
    filePath: string,
    elementName: string
  ): Promise<ElementAnalysis | null> {
    return this.codeElementAnalyzer.getElementDetails(filePath, elementName);
  }

  async getMethodDetails(
    filePath: string,
    className: string,
    methodName: string
  ): Promise<MethodSignature | null> {
    return this.codeElementAnalyzer.getMethodDetails(
      filePath,
      className,
      methodName
    );
  }

  async batchGetCodeElements(
    files: Array<{ filePath: string }>,
    maxConcurrent: number = 5
  ): Promise<BatchAnalysisResult<CodeElementSummary[]>> {
    const results = new Map<string, CodeElementSummary[]>();
    const errors = new Map<string, string>();

    for (let i = 0; i < files.length; i += maxConcurrent) {
      const chunk = files.slice(i, i + maxConcurrent);
      await Promise.all(
        chunk.map(async ({ filePath }) => {
          try {
            const elements = await this.getCodeElements(filePath);
            results.set(filePath, elements);
          } catch (error) {
            errors.set(
              filePath,
              error instanceof Error ? error.message : "Unknown error"
            );
          }
        })
      );
    }

    return {
      results: Object.fromEntries(results),
      errors: Object.fromEntries(errors),
    };
  }
}
