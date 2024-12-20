// src/server.ts
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ListToolsRequestSchema, CallToolRequestSchema, } from "@modelcontextprotocol/sdk/types.js";
import { AnalysisFactory } from "./application/analysis/analysis-factory.js";
import { formatTypeAnalysis, formatTypeHierarchy, formatTypeUsages, } from "./utils.js";
import { TypeAnalysisFactory } from "./application/analysis/type-analysis-factory.js";
export class CodemodeServer {
    server;
    analysisService;
    typeAnalysisService;
    constructor(basePath) {
        // Initialize the analysis service using the factory
        this.analysisService = AnalysisFactory.createService(basePath);
        this.typeAnalysisService = TypeAnalysisFactory.createService(basePath);
        // Initialize MCP server
        this.server = new Server({
            name: "codemode",
            version: "1.0.0",
        }, {
            capabilities: {
                tools: {},
            },
        });
        this.initializeTools();
    }
    initializeTools() {
        this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
            tools: [
                {
                    name: "get-folder-structure",
                    description: "Get a hierarchical view of files and subfolders in a directory...",
                    inputSchema: {
                        type: "object",
                        properties: {
                            folderPath: {
                                type: "string",
                                description: "Absolute path to the target folder...",
                            },
                        },
                        required: ["folderPath"],
                    },
                },
                {
                    name: "get-code-elements",
                    description: "Get functions, classes, interfaces, and variables in a file",
                    inputSchema: {
                        type: "object",
                        properties: {
                            filePath: {
                                type: "string",
                                description: "Path to the file",
                            },
                        },
                        required: ["filePath"],
                    },
                },
                {
                    name: "get-element-content",
                    description: "Get content and context of a specific code element",
                    inputSchema: {
                        type: "object",
                        properties: {
                            filePath: {
                                type: "string",
                                description: "Path to the file containing the element",
                            },
                            elementName: {
                                type: "string",
                                description: "Name of the element (function, class, etc.)",
                            },
                        },
                        required: ["filePath", "elementName"],
                    },
                },
                {
                    name: "get-method-details",
                    description: "Get details of a method in a class",
                    inputSchema: {
                        type: "object",
                        properties: {
                            filePath: {
                                type: "string",
                                description: "Path to the file containing the class",
                            },
                            className: {
                                type: "string",
                                description: "Name of the class containing the method",
                            },
                            methodName: {
                                type: "string",
                                description: "Name of the method to retrieve",
                            },
                        },
                        required: ["filePath", "className", "methodName"],
                    },
                },
                {
                    name: "batch-get-code-elements",
                    description: "Get code elements (functions, classes, etc.) from multiple files in a single request. More efficient than making multiple single-file requests.",
                    inputSchema: {
                        type: "object",
                        properties: {
                            files: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        filePath: {
                                            type: "string",
                                            description: "Path to the file",
                                        },
                                    },
                                    required: ["filePath"],
                                },
                                description: "Array of file paths to analyze",
                            },
                            maxConcurrent: {
                                type: "number",
                                description: "Maximum number of files to process concurrently. Defaults to 5.",
                                minimum: 1,
                                maximum: 20,
                            },
                        },
                        required: ["files"],
                    },
                },
                {
                    name: "batch-get-element-content",
                    description: "Get content of multiple code elements from multiple files in a single request. Optimizes performance for bulk operations.",
                    inputSchema: {
                        type: "object",
                        properties: {
                            elements: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        filePath: {
                                            type: "string",
                                            description: "Path to the file containing the element",
                                        },
                                        elementName: {
                                            type: "string",
                                            description: "Name of the element (function, class, etc.)",
                                        },
                                    },
                                    required: ["filePath", "elementName"],
                                },
                                description: "Array of elements to retrieve",
                            },
                            maxConcurrent: {
                                type: "number",
                                description: "Maximum number of elements to process concurrently. Defaults to 5.",
                                minimum: 1,
                                maximum: 20,
                            },
                        },
                        required: ["elements"],
                    },
                },
                {
                    name: "analyze-type",
                    description: "Analyze type relationships and usage",
                    inputSchema: {
                        type: "object",
                        properties: {
                            filePath: {
                                type: "string",
                                description: "Path to the file containing the type",
                            },
                            typeName: {
                                type: "string",
                                description: "Name of the type to analyze",
                            },
                        },
                        required: ["filePath", "typeName"],
                    },
                },
                {
                    name: "get-type-hierarchy",
                    description: "Get type inheritance hierarchy",
                    inputSchema: {
                        type: "object",
                        properties: {
                            filePath: {
                                type: "string",
                                description: "Path to the file containing the type",
                            },
                            typeName: {
                                type: "string",
                                description: "Name of the type to analyze",
                            },
                        },
                        required: ["filePath", "typeName"],
                    },
                },
                {
                    name: "find-type-usages",
                    description: "Find all usages of a type",
                    inputSchema: {
                        type: "object",
                        properties: {
                            filePath: {
                                type: "string",
                                description: "Path to the file containing the type",
                            },
                            typeName: {
                                type: "string",
                                description: "Name of the type to find usages for",
                            },
                        },
                        required: ["filePath", "typeName"],
                    },
                },
            ],
        }));
        this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
            const { name, arguments: args } = request.params;
            if (!args) {
                return {
                    isError: true,
                    content: [
                        {
                            type: "text",
                            text: "Error: No arguments provided",
                        },
                    ],
                };
            }
            try {
                switch (name) {
                    case "get-folder-structure": {
                        const folderPath = args.folderPath;
                        if (!folderPath) {
                            throw new Error("folderPath is required");
                        }
                        const structure = await this.analysisService.getProjectStructure(folderPath);
                        return {
                            content: [
                                {
                                    type: "text",
                                    text: JSON.stringify(structure, null, 2),
                                },
                            ],
                        };
                    }
                    case "get-code-elements": {
                        const filePath = args.filePath;
                        if (!filePath) {
                            throw new Error("filePath is required");
                        }
                        const elements = await this.analysisService.getCodeElements(filePath);
                        return {
                            content: [
                                {
                                    type: "text",
                                    text: JSON.stringify(elements, null, 2),
                                },
                            ],
                        };
                    }
                    case "get-element-content": {
                        const filePath = args.filePath;
                        const elementName = args.elementName;
                        if (!filePath || !elementName) {
                            throw new Error("filePath and elementName are required");
                        }
                        const content = await this.analysisService.getElementDetails(filePath, elementName);
                        if (!content) {
                            throw new Error(`Element ${elementName} not found in ${filePath}`);
                        }
                        return {
                            content: [
                                {
                                    type: "text",
                                    text: JSON.stringify(content, null, 2),
                                },
                            ],
                        };
                    }
                    case "get-method-details": {
                        const filePath = args.filePath;
                        const className = args.className;
                        const methodName = args.methodName;
                        if (!filePath || !className || !methodName) {
                            throw new Error("filePath, className, and methodName are required");
                        }
                        const method = await this.analysisService.getMethodDetails(filePath, className, methodName);
                        if (!method) {
                            throw new Error(`Method ${methodName} not found in ${className} in ${filePath}`);
                        }
                        return {
                            content: [
                                {
                                    type: "text",
                                    text: JSON.stringify(method, null, 2),
                                },
                            ],
                        };
                    }
                    case "batch-get-code-elements": {
                        const files = args.files;
                        const maxConcurrent = args.maxConcurrent || 5;
                        if (!Array.isArray(files) || files.length === 0) {
                            throw new Error("files must be a non-empty array");
                        }
                        const result = await this.analysisService.batchGetCodeElements(files, maxConcurrent);
                        return {
                            content: [
                                {
                                    type: "text",
                                    text: JSON.stringify(result, null, 2),
                                    format: "json",
                                    metadata: {
                                        totalFiles: files.length,
                                        successCount: Object.keys(result.results).length,
                                        errorCount: Object.keys(result.errors).length,
                                    },
                                },
                            ],
                        };
                    }
                    case "analyze-type": {
                        const filePath = args.filePath;
                        const typeName = args.typeName;
                        if (!filePath || !typeName) {
                            throw new Error("filePath and elementName are required");
                        }
                        const result = await this.typeAnalysisService.getTypeRelationship({
                            filePath,
                            typeName,
                        });
                        if (!result) {
                            return {
                                content: [
                                    {
                                        type: "text",
                                        text: `Type '${args.typeName}' not found in ${args.filePath}`,
                                    },
                                ],
                            };
                        }
                        // Format the analysis result in a readable way
                        const formattedResult = formatTypeAnalysis(result);
                        return {
                            content: [
                                {
                                    type: "text",
                                    text: formattedResult,
                                },
                            ],
                        };
                    }
                    case "get-type-hierarchy": {
                        const filePath = args.filePath;
                        const typeName = args.typeName;
                        if (!filePath || !typeName) {
                            throw new Error("filePath and elementName are required");
                        }
                        const result = await this.typeAnalysisService.getTypeHierarchy({
                            filePath,
                            typeName,
                        });
                        if (!result) {
                            return {
                                content: [
                                    {
                                        type: "text",
                                        text: `Type '${args.typeName}' not found in ${args.filePath}`,
                                    },
                                ],
                            };
                        }
                        // Format the hierarchy in a tree-like structure
                        const formattedHierarchy = formatTypeHierarchy(result);
                        return {
                            content: [
                                {
                                    type: "text",
                                    text: formattedHierarchy,
                                },
                            ],
                        };
                    }
                    case "find-type-usages": {
                        const filePath = args.filePath;
                        const typeName = args.typeName;
                        if (!filePath || !typeName) {
                            throw new Error("filePath and elementName are required");
                        }
                        const usages = await this.typeAnalysisService.findTypeUsages({
                            filePath,
                            typeName,
                        });
                        if (usages.length === 0) {
                            return {
                                content: [
                                    {
                                        type: "text",
                                        text: `No usages found for type '${args.typeName}'`,
                                    },
                                ],
                            };
                        }
                        // Format the usages list
                        const formattedUsages = formatTypeUsages(usages);
                        return {
                            content: [
                                {
                                    type: "text",
                                    text: formattedUsages,
                                },
                            ],
                        };
                    }
                    default:
                        throw new Error(`Unknown tool: ${name}`);
                }
            }
            catch (error) {
                return {
                    isError: true,
                    content: [
                        {
                            type: "text",
                            text: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
                        },
                    ],
                };
            }
        });
    }
    async start() {
        const transport = new StdioServerTransport();
        await this.server.connect(transport);
        console.error("Codemode MCP Server running on stdio");
    }
}
