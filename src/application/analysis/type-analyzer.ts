// src/infrastructure/typescript/type-analyzer.ts

import { Project, Node, Type } from "ts-morph";
import {
  TypeAnalyzer,
  TypeRelationship,
  TypeHierarchy,
  TypePropertyReference,
} from "../../domain/code/type-relationships.js";
import { CodeLocation } from "../../domain/code/code-element.js";

export class TSTypeAnalyzer implements TypeAnalyzer {
  private project: Project;

  constructor(project: Project) {
    this.project = project;
  }

  async getTypeRelationship(
    typeName: string,
    filePath: string
  ): Promise<TypeRelationship | null> {
    const sourceFile = this.project.getSourceFile(filePath);
    if (!sourceFile) return null;

    const declaration =
      sourceFile.getClass(typeName) ||
      sourceFile.getInterface(typeName) ||
      sourceFile.getTypeAlias(typeName) ||
      sourceFile.getEnum(typeName);

    if (!declaration) return null;

    // Get type checker for deep analysis
    const typeChecker = this.project.getTypeChecker();
    const type = declaration.getType();

    const relationship: TypeRelationship = {
      name: typeName,
      kind: this.getTypeKind(declaration),
      definition: this.getCodeLocation(declaration),
      usages: await this.findTypeUsages(typeName, filePath), // Updated to use the interface method
      properties: await this.getTypeProperties(type),
      modulePath: filePath,
      isExported: declaration.isExported(),
    };

    // Add inheritance relationships if applicable
    if (Node.isInterfaceDeclaration(declaration)) {
      relationship.implementedBy = await this.findImplementations(declaration);
    }

    if (
      Node.isClassDeclaration(declaration) ||
      Node.isInterfaceDeclaration(declaration)
    ) {
      relationship.extendedBy = await this.findExtensions(declaration);
    }

    if (Node.isClassDeclaration(declaration)) {
      relationship.implements =
        await this.getImplementedInterfaces(declaration);
      relationship.extends = await this.getBaseClasses(declaration);
    }

    // Add union/intersection type information if applicable
    if (Node.isTypeAliasDeclaration(declaration)) {
      const typeNode = declaration.getTypeNode();
      if (typeNode) {
        if (Node.isUnionTypeNode(typeNode)) {
          relationship.unionTypes = typeNode
            .getTypeNodes()
            .map((n) => n.getText());
        } else if (Node.isIntersectionTypeNode(typeNode)) {
          relationship.intersectionTypes = typeNode
            .getTypeNodes()
            .map((n) => n.getText());
        }
      }
    }

    return relationship;
  }

  async getTypeHierarchy(
    typeName: string,
    filePath: string
  ): Promise<TypeHierarchy | null> {
    const relationship = await this.getTypeRelationship(typeName, filePath);
    if (!relationship) return null;

    const children: TypeHierarchy[] = [];

    // Add derived types to hierarchy
    if (relationship.extendedBy) {
      for (const derived of relationship.extendedBy) {
        const childHierarchy = await this.getTypeHierarchy(
          this.getTypeNameFromLocation(derived),
          derived.filePath
        );
        if (childHierarchy) {
          children.push(childHierarchy);
        }
      }
    }

    // Add implementing classes to hierarchy for interfaces
    if (relationship.implementedBy) {
      for (const impl of relationship.implementedBy) {
        const childHierarchy = await this.getTypeHierarchy(
          this.getTypeNameFromLocation(impl),
          impl.filePath
        );
        if (childHierarchy) {
          children.push(childHierarchy);
        }
      }
    }

    return {
      type: relationship,
      children,
    };
  }

  async findTypeUsages(
    typeName: string,
    filePath: string
  ): Promise<CodeLocation[]> {
    const sourceFile = this.project.getSourceFile(filePath);
    if (!sourceFile) return [];

    const declaration =
      sourceFile.getClass(typeName) ||
      sourceFile.getInterface(typeName) ||
      sourceFile.getTypeAlias(typeName) ||
      sourceFile.getEnum(typeName);

    if (!declaration) return [];

    const references = declaration.findReferencesAsNodes();
    return references.map((ref) => this.getCodeLocation(ref));
  }

  private getTypeKind(node: Node): TypeRelationship["kind"] {
    if (Node.isClassDeclaration(node)) return "class";
    if (Node.isInterfaceDeclaration(node)) return "interface";
    if (Node.isTypeAliasDeclaration(node)) return "type";
    if (Node.isEnumDeclaration(node)) return "enum";
    throw new Error(`Unsupported type kind for node: ${node.getKindName()}`);
  }

  private async getTypeProperties(
    type: Type
  ): Promise<TypePropertyReference[]> {
    const properties = type.getProperties();
    return Promise.all(
      properties.map(async (prop) => {
        const declarations = prop.getDeclarations();
        const firstDecl = declarations[0];
        let usages: CodeLocation[] = [];

        if (firstDecl) {
          // Handle different types of declarations
          if (
            Node.isPropertyDeclaration(firstDecl) ||
            Node.isPropertySignature(firstDecl) ||
            Node.isParameterDeclaration(firstDecl)
          ) {
            // Use ts-morph's findReferencesAsNodes for property declarations
            const references = firstDecl.findReferencesAsNodes();
            usages = references.map((ref) => this.getCodeLocation(ref));

            return {
              name: prop.getName(),
              type: prop.getTypeAtLocation(firstDecl).getText(),
              usages,
              isOptional: firstDecl.hasQuestionToken?.() || false,
            };
          }
        }

        // Fallback for other types of declarations
        return {
          name: prop.getName(),
          type: firstDecl
            ? prop.getTypeAtLocation(firstDecl).getText()
            : "unknown",
          usages: [],
          isOptional: false,
        };
      })
    );
  }

  private async findImplementations(
    node: Node
  ): Promise<CodeLocation[] | undefined> {
    if (!Node.isInterfaceDeclaration(node)) return undefined;

    const implementations = node.getImplementations();

    return implementations.map((impl) => ({
      startLine: impl.getNode().getStartLineNumber(),
      endLine: impl.getNode().getEndLineNumber(),
      filePath: impl.getSourceFile().getFilePath(),
    }));
  }

  private async findExtensions(
    node: Node
  ): Promise<CodeLocation[] | undefined> {
    if (!Node.isClassDeclaration(node) && !Node.isInterfaceDeclaration(node)) {
      return undefined;
    }

    // Get the Type object from the declaration
    const type = node.getType();

    // Find all references
    const references = await node.findReferences();

    const derivedTypes: Node[] = [];

    // Check each reference to find inheritances
    for (const referenceGroup of references) {
      for (const reference of referenceGroup.getReferences()) {
        const refNode = reference.getNode();
        const parent = refNode.getParent();

        // Check if this is an extends or implements clause
        if (Node.isHeritageClause(parent)) {
          const containingClass = parent.getParent();
          if (
            Node.isClassDeclaration(containingClass) ||
            Node.isInterfaceDeclaration(containingClass)
          ) {
            derivedTypes.push(containingClass);
          }
        }
      }
    }

    return derivedTypes.map((node) => this.getCodeLocation(node));
  }

  private async getImplementedInterfaces(
    node: Node
  ): Promise<CodeLocation[] | undefined> {
    if (!Node.isClassDeclaration(node)) return undefined;

    return node
      .getImplements()
      .map((impl) => impl.getType().getSymbol()?.getDeclarations()?.[0])
      .filter((decl): decl is Node => Boolean(decl))
      .map((decl) => this.getCodeLocation(decl));
  }

  private async getBaseClasses(
    node: Node
  ): Promise<CodeLocation[] | undefined> {
    if (!Node.isClassDeclaration(node)) return undefined;

    const baseClass = node.getBaseClass();
    if (!baseClass) return [];

    const baseDeclaration = baseClass.getSymbol()?.getDeclarations()?.[0];
    return baseDeclaration ? [this.getCodeLocation(baseDeclaration)] : [];
  }

  private getCodeLocation(node: Node): CodeLocation {
    const sourceFile = node.getSourceFile();
    return {
      startLine: node.getStartLineNumber(),
      endLine: node.getEndLineNumber(),
      filePath: sourceFile.getFilePath(),
    };
  }

  private getTypeNameFromLocation(location: CodeLocation): string {
    const sourceFile = this.project.getSourceFile(location.filePath);
    if (!sourceFile) {
      throw new Error(`Could not find source file: ${location.filePath}`);
    }

    // Get all lines of the file
    const lines = sourceFile.getFullText().split("\n");
    // Calculate position by summing length of lines before the target line
    const pos = lines
      .slice(0, location.startLine - 1)
      .reduce((sum, line) => sum + line.length + 1, 0);

    const node = sourceFile.getDescendantAtPos(pos);
    if (!node) {
      throw new Error(`Could not find node at line ${location.startLine}`);
    }

    // Find the nearest parent that's a type declaration
    let current: Node | undefined = node;
    while (current) {
      if (
        Node.isClassDeclaration(current) ||
        Node.isInterfaceDeclaration(current) ||
        Node.isTypeAliasDeclaration(current) ||
        Node.isEnumDeclaration(current)
      ) {
        return current.getName() || "";
      }
      current = current.getParent();
    }

    throw new Error(
      `Node at line ${location.startLine} is not a type declaration`
    );
  }
}
