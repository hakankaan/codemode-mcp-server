// src/domain/code/type-relationships.ts

import { CodeLocation } from "./code-element.js";

export interface TypePropertyReference {
  name: string;
  type: string;
  usages: CodeLocation[];
  isOptional: boolean;
}

export interface TypeRelationship {
  // Core type information
  name: string;
  kind: "interface" | "class" | "type" | "enum";
  definition: CodeLocation;

  // References and usages
  usages: CodeLocation[];
  properties: TypePropertyReference[];

  // Type hierarchy relationships
  implementedBy?: CodeLocation[]; // For interfaces
  extendedBy?: CodeLocation[]; // For classes and interfaces
  implements?: CodeLocation[]; // For classes
  extends?: CodeLocation[]; // For classes and interfaces

  // Type composition
  unionTypes?: string[]; // For union types
  intersectionTypes?: string[]; // For intersection types

  // Module information
  modulePath: string;
  isExported: boolean;
}

export interface TypeHierarchy {
  type: TypeRelationship;
  children: TypeHierarchy[];
}

export interface TypeAnalyzer {
  getTypeRelationship(
    typeName: string,
    filePath: string
  ): Promise<TypeRelationship | null>;
  getTypeHierarchy(
    typeName: string,
    filePath: string
  ): Promise<TypeHierarchy | null>;
  findTypeUsages(typeName: string, filePath: string): Promise<CodeLocation[]>;
}
