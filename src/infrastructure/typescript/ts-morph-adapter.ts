// infrastructure/typescript/ts-morph-adapter.ts
import {
  Project,
  SourceFile,
  FunctionDeclaration,
  ClassDeclaration,
  InterfaceDeclaration,
  TypeAliasDeclaration,
  VariableDeclaration,
  ts,
  ParameterDeclaration,
  PropertyDeclaration,
  MethodDeclaration,
  ConstructorDeclaration,
  SyntaxKind,
} from "ts-morph";
import * as fs from "fs/promises";

import * as path from "path";
import {
  CodeElement,
  ElementAnalysis,
  ElementContext,
  MethodParameter,
  MethodSignature,
} from "../../application/types/analysis-results.js";

import { TSTypeAnalyzer } from "../../application/analysis/type-analyzer.js";

export class TSMorphAdapter {
  private project: Project;
  private typeAnalyzer: TSTypeAnalyzer;

  constructor(private readonly basePath: string) {
    this.project = new Project({
      tsConfigFilePath: path.join(basePath, "tsconfig.json"),
      skipAddingFilesFromTsConfig: true,
    });
    this.typeAnalyzer = new TSTypeAnalyzer(this.project);
  }

  async getTypeRelationship(typeName: string, filePath: string) {
    return this.typeAnalyzer.getTypeRelationship(typeName, filePath);
  }

  async getTypeHierarchy(typeName: string, filePath: string) {
    return this.typeAnalyzer.getTypeHierarchy(typeName, filePath);
  }

  async findTypeUsages(typeName: string, filePath: string) {
    return this.typeAnalyzer.findTypeUsages(typeName, filePath);
  }

  private analyzeConstructor(ctor: ConstructorDeclaration): MethodSignature {
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

  private getConstructorVisibility(
    ctor: ConstructorDeclaration
  ): "public" | "private" | "protected" {
    const modifiers = ctor.getModifiers();

    if (modifiers.some((mod) => mod.getText() === "private")) return "private";
    if (modifiers.some((mod) => mod.getText() === "protected"))
      return "protected";
    return "public";
  }

  private getVisibility(
    node: MethodDeclaration | PropertyDeclaration
  ): "public" | "private" | "protected" {
    if (node.hasModifier(SyntaxKind.PrivateKeyword)) return "private";
    if (node.hasModifier(SyntaxKind.ProtectedKeyword)) return "protected";
    return "public";
  }

  private analyzeMethod(method: MethodDeclaration): MethodSignature {
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

  private analyzeParameter(param: ParameterDeclaration): MethodParameter {
    return {
      name: param.getName(),
      type: param.getType().getText(),
      optional: param.isOptional(),
      defaultValue: param.getInitializer()?.getText(),
    };
  }

  private analyzeProperty(prop: PropertyDeclaration) {
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

  async analyzeFile(filePath: string): Promise<ElementAnalysis[]> {
    const sourceFile = this.project.addSourceFileAtPath(filePath);
    const fileContent = await fs.readFile(filePath, "utf-8");
    const lines = fileContent.split("\n");
    const elements: ElementAnalysis[] = [];

    try {
      const context: ElementContext = {
        imports: this.getImports(sourceFile),
        dependencies: this.getDependencies(sourceFile),
        surroundingCode: { before: [], after: [] },
      };

      // Handle each type separately with proper typing
      sourceFile.getFunctions().forEach((func) => {
        elements.push(
          this.createElementAnalysisFromNode(func, lines, context, "function")
        );
      });

      sourceFile.getClasses().forEach((cls) => {
        elements.push(
          this.createElementAnalysisFromNode(cls, lines, context, "class")
        );
      });

      sourceFile.getInterfaces().forEach((intf) => {
        elements.push(
          this.createElementAnalysisFromNode(intf, lines, context, "interface")
        );
      });

      sourceFile.getVariableDeclarations().forEach((variable) => {
        elements.push(
          this.createElementAnalysisFromNode(
            variable,
            lines,
            context,
            "variable"
          )
        );
      });

      sourceFile.getTypeAliases().forEach((type) => {
        elements.push(
          this.createElementAnalysisFromNode(type, lines, context, "type")
        );
      });

      return elements;
    } finally {
      this.project.removeSourceFile(sourceFile);
    }
  }

  private createElementAnalysisFromNode(
    node:
      | FunctionDeclaration
      | ClassDeclaration
      | InterfaceDeclaration
      | VariableDeclaration
      | TypeAliasDeclaration,
    lines: string[],
    baseContext: ElementContext,
    type: string
  ): ElementAnalysis {
    // These methods are available on all these declaration types
    const startLine = node.getStartLineNumber();
    const endLine = node.getEndLineNumber();

    let name: string;
    let isExported: boolean;

    // Handle different node types
    if (node instanceof VariableDeclaration) {
      name = node.getName();
      const statement = node.getFirstAncestorByKind(
        ts.SyntaxKind.VariableStatement
      );
      isExported = statement?.isExported() ?? false;
    } else {
      name = node.getName() || "<anonymous>";
      isExported = node.isExported();
    }

    const element: CodeElement = {
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

    const context: ElementContext = {
      ...baseContext,
      surroundingCode: {
        before: lines.slice(Math.max(0, startLine - 4), startLine - 1),
        after: lines.slice(endLine, Math.min(lines.length, endLine + 3)),
      },
    };

    return { element, content, context };
  }

  private getImports(sourceFile: SourceFile): string[] {
    return sourceFile
      .getImportDeclarations()
      .map((imp) => imp.getModuleSpecifierValue());
  }

  private getDependencies(sourceFile: SourceFile): string[] {
    return this.getImports(sourceFile).filter((imp) => !imp.startsWith("."));
  }
}
