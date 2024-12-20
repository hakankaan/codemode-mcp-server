import { ProjectAnalysisService } from "./project-analysis-service.js";
import { FSProjectRepository } from "../../infrastructure/filesystem/fs-project-repository.js";
import { TSMorphAdapter } from "../../infrastructure/typescript/ts-morph-adapter.js";
import { AnalysisService } from "./analysis-service.js";

export class AnalysisFactory {
  static createService(rootPath: string): AnalysisService {
    const repository = new FSProjectRepository();
    const tsAnalyzer = new TSMorphAdapter(rootPath);

    return new ProjectAnalysisService(repository, tsAnalyzer);
  }
}
