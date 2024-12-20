import { TSMorphAdapter } from "../../infrastructure/typescript/ts-morph-adapter.js";
import { TypeAnalysisService } from "./type-analysis-service.js";

export class TypeAnalysisFactory {
  static createService(rootPath: string): TypeAnalysisService {
    const tsAnalyzer = new TSMorphAdapter(rootPath);

    return new TypeAnalysisService(tsAnalyzer);
  }
}
