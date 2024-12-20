export type ProjectLanguage = "typescript" | "javascript";

export interface ProjectMetadata {
  name: string;
  rootPath: string;
  language: ProjectLanguage;
  hasTests: boolean;
  hasTypeScript: boolean;
}

export class Project {
  constructor(
    private readonly metadata: ProjectMetadata,
    private readonly sourceFiles: Map<string, string>
  ) {}

  get name(): string {
    return this.metadata.name;
  }

  get rootPath(): string {
    return this.metadata.rootPath;
  }

  hasFile(path: string): boolean {
    return this.sourceFiles.has(path);
  }

  getFile(path: string): string | undefined {
    return this.sourceFiles.get(path);
  }

  get files(): string[] {
    return Array.from(this.sourceFiles.keys());
  }
}
