export class Project {
    metadata;
    sourceFiles;
    constructor(metadata, sourceFiles) {
        this.metadata = metadata;
        this.sourceFiles = sourceFiles;
    }
    get name() {
        return this.metadata.name;
    }
    get rootPath() {
        return this.metadata.rootPath;
    }
    hasFile(path) {
        return this.sourceFiles.has(path);
    }
    getFile(path) {
        return this.sourceFiles.get(path);
    }
    get files() {
        return Array.from(this.sourceFiles.keys());
    }
}
