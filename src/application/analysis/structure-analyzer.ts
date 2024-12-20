import { ProjectRepository } from "../../domain/project/project-repository.js";
import { PathBasedStructure } from "../types/analysis-results.js";
import { PathUtils } from "../../infrastructure/filesystem/path-utils.js";
import * as path from "path";

export class StructureAnalyzer {
  constructor(private readonly repository: ProjectRepository) {}

  async analyze(rootPath: string): Promise<PathBasedStructure> {
    const paths: Record<string, string[]> = {};
    const types = {
      typescript: [] as string[],
      config: [] as string[],
      documentation: [] as string[],
    };

    await this.processDirectory(rootPath, "", paths, types);

    // Generate mainPatterns based on discovered TypeScript files
    const mainPatterns: Record<string, string> = {};
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

  private async processDirectory(
    absolutePath: string,
    relativePath: string,
    paths: Record<string, string[]>,
    types: Record<string, string[]>
  ): Promise<void> {
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
      await this.processDirectory(
        newAbsolutePath,
        newRelativePath,
        paths,
        types
      );
    }

    // Check for config files
    const configFiles = entries.filter((entry) =>
      PathUtils.isConfigFile(entry)
    );
    if (configFiles.length > 0) {
      types.config.push(`${relativePath}/*`);
    }

    // Check for documentation
    const docFiles = entries.filter(
      (entry) => /\.(md|txt)$/.test(entry) || entry === "docs"
    );
    if (docFiles.length > 0) {
      types.documentation.push(`${relativePath}/*`);
    }
  }
}
