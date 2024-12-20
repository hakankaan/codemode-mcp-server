// application/analyzers/code-element-analyzer.ts
import { TSMorphAdapter } from "../../infrastructure/typescript/ts-morph-adapter.js";
import {
  CodeElementSummary,
  ElementAnalysis,
  MethodSignature,
} from "../types/analysis-results.js";

export class CodeElementAnalyzer {
  constructor(private readonly tsAnalyzer: TSMorphAdapter) {}

  async getElements(filePath: string): Promise<CodeElementSummary[]> {
    // Now the analysis includes content from TSMorphAdapter
    const elements = await this.tsAnalyzer.analyzeFile(filePath);
    return elements.map((element) => ({
      name: element.element.name,
      type: element.element.type,
      path: element.element.path,
      isExported: element.element.isExported,
      methodCount: element.element.methods?.length ?? 0,
      constructorCount: element.element.constructors?.length ?? 0,
      propertyCount: element.element.properties?.length ?? 0,
      methods: element.element.methods,
    }));
  }

  async getElementDetails(
    filePath: string,
    elementName: string
  ): Promise<ElementAnalysis | null> {
    const elements = await this.tsAnalyzer.analyzeFile(filePath);
    return (
      elements.find(
        (element) =>
          element.element.name === elementName ||
          element.element.methods?.find((method) => method.name)
      ) || null
    );
  }

  async getMethodDetails(
    filePath: string,
    className: string,
    methodName: string
  ): Promise<MethodSignature | null> {
    const elements = await this.tsAnalyzer.analyzeFile(filePath);
    return (
      elements
        .find((element) => element.element.name === className)
        ?.element.methods?.find((method) => method.name === methodName) || null
    );
  }
}
