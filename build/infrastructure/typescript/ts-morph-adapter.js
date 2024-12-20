// infrastructure/typescript/ts-morph-adapter.ts
import { Project, ClassDeclaration, VariableDeclaration, ts, SyntaxKind, } from "ts-morph";
import * as fs from "fs/promises";
import * as path from "path";
import { TSTypeAnalyzer } from "../../application/analysis/type-analyzer.js";
export class TSMorphAdapter {
    basePath;
    project;
    typeAnalyzer;
    constructor(basePath) {
        this.basePath = basePath;
        this.project = new Project({
            tsConfigFilePath: path.join(basePath, "tsconfig.json"),
            skipAddingFilesFromTsConfig: true,
        });
        this.typeAnalyzer = new TSTypeAnalyzer(this.project);
    }
    async getTypeRelationship(typeName, filePath) {
        return this.typeAnalyzer.getTypeRelationship(typeName, filePath);
    }
    async getTypeHierarchy(typeName, filePath) {
        return this.typeAnalyzer.getTypeHierarchy(typeName, filePath);
    }
    async findTypeUsages(typeName, filePath) {
        return this.typeAnalyzer.findTypeUsages(typeName, filePath);
    }
    analyzeConstructor(ctor) {
        return {
            name: "constructor",
            visibility: this.getConstructorVisibility(ctor),
            isStatic: false,
            isAsync: false,
            isAbstract: false,
            parameters: ctor
                .getParameters()
                .map((param) => this.analyzeParameter(param)),
            returnType: "",
            decorators: [], // Constructors in TypeScript don't support decorators
            location: {
                startLine: ctor.getStartLineNumber(),
                endLine: ctor.getEndLineNumber(),
            },
            content: ctor.getText(),
        };
    }
    getConstructorVisibility(ctor) {
        const modifiers = ctor.getModifiers();
        if (modifiers.some((mod) => mod.getText() === "private"))
            return "private";
        if (modifiers.some((mod) => mod.getText() === "protected"))
            return "protected";
        return "public";
    }
    getVisibility(node) {
        if (node.hasModifier(SyntaxKind.PrivateKeyword))
            return "private";
        if (node.hasModifier(SyntaxKind.ProtectedKeyword))
            return "protected";
        return "public";
    }
    analyzeMethod(method) {
        return {
            name: method.getName(),
            visibility: this.getVisibility(method),
            isStatic: method.isStatic(),
            isAsync: method.isAsync(),
            isAbstract: method.isAbstract(),
            parameters: method
                .getParameters()
                .map((param) => this.analyzeParameter(param)),
            returnType: method.getReturnType().getText(),
            decorators: method.getDecorators().map((d) => d.getText()),
            location: {
                startLine: method.getStartLineNumber(),
                endLine: method.getEndLineNumber(),
            },
            content: method.getText(),
        };
    }
    analyzeParameter(param) {
        return {
            name: param.getName(),
            type: param.getType().getText(),
            optional: param.isOptional(),
            defaultValue: param.getInitializer()?.getText(),
        };
    }
    analyzeProperty(prop) {
        return {
            name: prop.getName(),
            type: prop.getType().getText(),
            visibility: this.getVisibility(prop),
            isStatic: prop.isStatic(),
            decorators: prop.getDecorators().map((d) => d.getText()),
            location: {
                startLine: prop.getStartLineNumber(),
                endLine: prop.getEndLineNumber(),
            },
        };
    }
    async analyzeFile(filePath) {
        const sourceFile = this.project.addSourceFileAtPath(filePath);
        const fileContent = await fs.readFile(filePath, "utf-8");
        const lines = fileContent.split("\n");
        const elements = [];
        try {
            const context = {
                imports: this.getImports(sourceFile),
                dependencies: this.getDependencies(sourceFile),
                surroundingCode: { before: [], after: [] },
            };
            // Handle each type separately with proper typing
            sourceFile.getFunctions().forEach((func) => {
                elements.push(this.createElementAnalysisFromNode(func, lines, context, "function"));
            });
            sourceFile.getClasses().forEach((cls) => {
                elements.push(this.createElementAnalysisFromNode(cls, lines, context, "class"));
            });
            sourceFile.getInterfaces().forEach((intf) => {
                elements.push(this.createElementAnalysisFromNode(intf, lines, context, "interface"));
            });
            sourceFile.getVariableDeclarations().forEach((variable) => {
                elements.push(this.createElementAnalysisFromNode(variable, lines, context, "variable"));
            });
            sourceFile.getTypeAliases().forEach((type) => {
                elements.push(this.createElementAnalysisFromNode(type, lines, context, "type"));
            });
            return elements;
        }
        finally {
            this.project.removeSourceFile(sourceFile);
        }
    }
    createElementAnalysisFromNode(node, lines, baseContext, type) {
        // These methods are available on all these declaration types
        const startLine = node.getStartLineNumber();
        const endLine = node.getEndLineNumber();
        let name;
        let isExported;
        // Handle different node types
        if (node instanceof VariableDeclaration) {
            name = node.getName();
            const statement = node.getFirstAncestorByKind(ts.SyntaxKind.VariableStatement);
            isExported = statement?.isExported() ?? false;
        }
        else {
            name = node.getName() || "<anonymous>";
            isExported = node.isExported();
        }
        const element = {
            name,
            type,
            path: node.getSourceFile().getFilePath(),
            location: {
                startLine,
                endLine,
            },
            isExported,
        };
        if (node instanceof ClassDeclaration) {
            // Add class member analysis
            element.methods = node
                .getMethods()
                .map((method) => this.analyzeMethod(method));
            // Use the dedicated constructor analyzer
            element.constructors = node
                .getConstructors()
                .map((ctor) => this.analyzeConstructor(ctor));
            element.properties = node
                .getProperties()
                .map((prop) => this.analyzeProperty(prop));
        }
        const content = lines.slice(startLine - 1, endLine).join("\n");
        const context = {
            ...baseContext,
            surroundingCode: {
                before: lines.slice(Math.max(0, startLine - 4), startLine - 1),
                after: lines.slice(endLine, Math.min(lines.length, endLine + 3)),
            },
        };
        return { element, content, context };
    }
    getImports(sourceFile) {
        return sourceFile
            .getImportDeclarations()
            .map((imp) => imp.getModuleSpecifierValue());
    }
    getDependencies(sourceFile) {
        return this.getImports(sourceFile).filter((imp) => !imp.startsWith("."));
    }
}
