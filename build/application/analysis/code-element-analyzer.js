export class CodeElementAnalyzer {
    tsAnalyzer;
    constructor(tsAnalyzer) {
        this.tsAnalyzer = tsAnalyzer;
    }
    async getElements(filePath) {
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
    async getElementDetails(filePath, elementName) {
        const elements = await this.tsAnalyzer.analyzeFile(filePath);
        return (elements.find((element) => element.element.name === elementName ||
            element.element.methods?.find((method) => method.name)) || null);
    }
    async getMethodDetails(filePath, className, methodName) {
        const elements = await this.tsAnalyzer.analyzeFile(filePath);
        return (elements
            .find((element) => element.element.name === className)
            ?.element.methods?.find((method) => method.name === methodName) || null);
    }
}
