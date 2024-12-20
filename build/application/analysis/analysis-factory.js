import { ProjectAnalysisService } from "./project-analysis-service.js";
import { FSProjectRepository } from "../../infrastructure/filesystem/fs-project-repository.js";
import { TSMorphAdapter } from "../../infrastructure/typescript/ts-morph-adapter.js";
export class AnalysisFactory {
    static createService(rootPath) {
        const repository = new FSProjectRepository();
        const tsAnalyzer = new TSMorphAdapter(rootPath);
        return new ProjectAnalysisService(repository, tsAnalyzer);
    }
}
