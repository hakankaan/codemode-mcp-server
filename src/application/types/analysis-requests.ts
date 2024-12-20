export interface GetTypeRelationshipRequest {
  filePath: string;
  typeName: string;
}

export interface GetTypeHierarchyRequest {
  filePath: string;
  typeName: string;
}

export interface FindTypeUsagesRequest {
  filePath: string;
  typeName: string;
}
