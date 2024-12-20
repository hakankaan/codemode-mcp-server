import {
  PathBasedStructure,
  ElementAnalysis,
  BatchAnalysisResult,
  CodeElementSummary,
  MethodSignature,
} from "../types/analysis-results.js";

export interface AnalysisService {
  getProjectStructure(folderPath: string): Promise<PathBasedStructure>;
  getCodeElements(filePath: string): Promise<CodeElementSummary[]>;
  getElementDetails(
    filePath: string,
    elementName: string
  ): Promise<ElementAnalysis | null>;
  batchGetCodeElements(
    files: Array<{ filePath: string }>,
    maxConcurrent?: number
  ): Promise<BatchAnalysisResult<CodeElementSummary[]>>;
  getMethodDetails(
    filePath: string,
    className: string,
    methodName: string
  ): Promise<MethodSignature | null>;
}
