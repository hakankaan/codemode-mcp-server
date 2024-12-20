// src/application/analysis/type-analysis-service.ts

import { CodeLocation } from "../../domain/code/code-element.js";
import {
  TypeAnalyzer,
  TypeHierarchy,
} from "../../domain/code/type-relationships.js";
import {
  GetTypeRelationshipRequest,
  GetTypeHierarchyRequest,
  FindTypeUsagesRequest,
} from "../types/analysis-requests.js";
import {
  TypeRelationshipResult,
  TypeHierarchyResult,
} from "../types/analysis-results.js";

export interface TypeAnalysisService {
  getTypeRelationship(
    request: GetTypeRelationshipRequest
  ): Promise<TypeRelationshipResult | null>;

  getTypeHierarchy(
    request: GetTypeHierarchyRequest
  ): Promise<TypeHierarchyResult | null>;

  findTypeUsages(request: FindTypeUsagesRequest): Promise<CodeLocation[]>;
}

export class TypeAnalysisService implements TypeAnalysisService {
  constructor(private typeAnalyzer: TypeAnalyzer) {}

  async getTypeRelationship(
    request: GetTypeRelationshipRequest
  ): Promise<TypeRelationshipResult | null> {
    const relationship = await this.typeAnalyzer.getTypeRelationship(
      request.typeName,
      request.filePath
    );

    if (!relationship) return null;

    // Transform domain model to DTO
    return {
      name: relationship.name,
      kind: relationship.kind,
      definition: relationship.definition,
      usages: relationship.usages,
      properties: relationship.properties,
      implementedBy: relationship.implementedBy,
      extendedBy: relationship.extendedBy,
      implements: relationship.implements,
      extends: relationship.extends,
      modulePath: relationship.modulePath,
      isExported: relationship.isExported,
    };
  }

  async getTypeHierarchy(
    request: GetTypeHierarchyRequest
  ): Promise<TypeHierarchyResult | null> {
    const hierarchy = await this.typeAnalyzer.getTypeHierarchy(
      request.typeName,
      request.filePath
    );

    if (!hierarchy) return null;

    // Transform domain hierarchy to DTO
    return this.transformHierarchy(hierarchy);
  }

  async findTypeUsages(
    request: FindTypeUsagesRequest
  ): Promise<CodeLocation[]> {
    return this.typeAnalyzer.findTypeUsages(request.typeName, request.filePath);
  }

  private transformHierarchy(hierarchy: TypeHierarchy): TypeHierarchyResult {
    return {
      type: {
        name: hierarchy.type.name,
        kind: hierarchy.type.kind,
        definition: hierarchy.type.definition,
        usages: hierarchy.type.usages,
        properties: hierarchy.type.properties,
        implementedBy: hierarchy.type.implementedBy,
        extendedBy: hierarchy.type.extendedBy,
        implements: hierarchy.type.implements,
        extends: hierarchy.type.extends,
        modulePath: hierarchy.type.modulePath,
        isExported: hierarchy.type.isExported,
      },
      children: hierarchy.children.map((child) =>
        this.transformHierarchy(child)
      ),
    };
  }
}
