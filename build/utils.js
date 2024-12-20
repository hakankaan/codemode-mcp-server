export function formatTypeAnalysis(result) {
    return `
  Type Analysis: ${result.name}
  ==================${result.name
        .split("")
        .map(() => "=")
        .join("")}
  
  Kind: ${result.kind}
  Module: ${result.modulePath}
  Exported: ${result.isExported}
  
  Definition:
    Lines ${result.definition.startLine}-${result.definition.endLine}
  
  Properties:
  ${result.properties
        .map((prop) => `
    ${prop.name}${prop.isOptional ? "?" : ""}: ${prop.type}
    Used in ${prop.usages.length} location(s)`)
        .join("\n")}
  
  Relationships:
  ${result.implements ? `  Implements: ${result.implements.length} interface(s)` : ""}
  ${result.extends ? `  Extends: ${result.extends.length} type(s)` : ""}
  ${result.implementedBy ? `  Implemented by: ${result.implementedBy.length} class(es)` : ""}
  ${result.extendedBy ? `  Extended by: ${result.extendedBy.length} type(s)` : ""}
  
  Total Usages: ${result.usages.length}
  `;
}
export function formatTypeHierarchy(hierarchy, level = 0) {
    const indent = "  ".repeat(level);
    const type = hierarchy.type;
    let result = `${indent}${type.name} (${type.kind})\n`;
    for (const child of hierarchy.children) {
        result += formatTypeHierarchy(child, level + 1);
    }
    return result;
}
export function formatTypeUsages(usages) {
    return `
  Found ${usages.length} usage(s):
  
  ${usages
        .map((usage, index) => `${index + 1}. Lines ${usage.startLine}-${usage.endLine}`)
        .join("\n")}
  `;
}
