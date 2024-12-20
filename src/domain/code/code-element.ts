export type ElementType =
  | "function"
  | "class"
  | "interface"
  | "variable"
  | "constant"
  | "type";

export interface TypeSpecificDetails {
  properties?: {
    name: string;
    type: string;
    isOptional: boolean;
  }[];
  typeKind?: "interface" | "class" | "type" | "enum";
  isGeneric?: boolean;
  typeParameters?: string[];
}

export interface CodeLocation {
  startLine: number;
  endLine: number;
  filePath: string; // Add this
}

export interface CodeContext {
  imports: string[];
  dependencies: string[];
  surroundingCode: {
    before: string[];
    after: string[];
  };
}

export class CodeElement {
  constructor(
    public readonly name: string,
    public readonly type: ElementType,
    public readonly location: CodeLocation,
    public readonly isExported: boolean,
    public readonly context?: CodeContext,
    public readonly typeDetails?: TypeSpecificDetails
  ) {}

  hasContext(): boolean {
    return !!this.context;
  }

  get lineCount(): number {
    return this.location.endLine - this.location.startLine + 1;
  }
}
