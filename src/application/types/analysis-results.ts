import { CodeLocation } from "../../domain/code/code-element.js";

export interface ElementLocation {
  startLine: number;
  endLine: number;
}

// New interfaces for method analysis
export interface MethodParameter {
  name: string;
  type: string;
  optional: boolean;
  defaultValue?: string;
}

export interface MethodSignature {
  name: string;
  visibility: "public" | "private" | "protected";
  isStatic: boolean;
  isAsync: boolean;
  isAbstract: boolean;
  parameters: MethodParameter[];
  returnType: string;
  decorators: string[];
  location: {
    startLine: number;
    endLine: number;
  };
  content: string;
}

// Update the existing CodeElement interface
export interface CodeElement {
  name: string;
  type: string;
  path: string;
  location: {
    startLine: number;
    endLine: number;
  };
  isExported: boolean;
  // Add new fields for class members
  methods?: MethodSignature[];
  constructors?: MethodSignature[];
  properties?: {
    name: string;
    type: string;
    visibility: "public" | "private" | "protected";
    isStatic: boolean;
    decorators: string[];
    location: {
      startLine: number;
      endLine: number;
    };
  }[];
}

export interface ElementContext {
  imports: string[];
  dependencies: string[];
  surroundingCode: {
    before: string[];
    after: string[];
  };
}

export interface CodeElementSummary {
  name: string;
  type: string;
  path: string;
  isExported: boolean;
  methods?: MethodSignature[];
}

export interface ElementAnalysis {
  element: CodeElement;
  content: string;
  context: ElementContext;
}

export interface BatchAnalysisResult<T> {
  results: Record<string, T>;
  errors: Record<string, string>;
}

export interface PathBasedStructure {
  paths: Record<string, string[]>;
  types: {
    typescript?: string[];
    config?: string[];
    documentation?: string[];
    [key: string]: string[] | undefined;
  };
  metadata: {
    rootDir: string;
    mainPatterns?: Record<string, string>;
    scannedAt: number;
  };
}

export interface TypeRelationshipResult {
  name: string;
  kind: "interface" | "class" | "type" | "enum";
  definition: CodeLocation;
  usages: CodeLocation[];
  properties: {
    name: string;
    type: string;
    usages: CodeLocation[];
    isOptional: boolean;
  }[];
  implementedBy?: CodeLocation[];
  extendedBy?: CodeLocation[];
  implements?: CodeLocation[];
  extends?: CodeLocation[];
  modulePath: string;
  isExported: boolean;
}

export interface TypeHierarchyResult {
  type: TypeRelationshipResult;
  children: TypeHierarchyResult[];
}
