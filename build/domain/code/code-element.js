export class CodeElement {
    name;
    type;
    location;
    isExported;
    context;
    typeDetails;
    constructor(name, type, location, isExported, context, typeDetails) {
        this.name = name;
        this.type = type;
        this.location = location;
        this.isExported = isExported;
        this.context = context;
        this.typeDetails = typeDetails;
    }
    hasContext() {
        return !!this.context;
    }
    get lineCount() {
        return this.location.endLine - this.location.startLine + 1;
    }
}
