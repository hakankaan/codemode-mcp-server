import { Project } from "./project-entity.js";

export interface ProjectRepository {
  load(path: string): Promise<Project>;
  getFolderContent(path: string): Promise<string[]>;
  getFileContent(path: string): Promise<string>;
  hasTypeScriptFiles(path: string): Promise<boolean>;
  getSubFolders(path: string): Promise<string[]>;
}
