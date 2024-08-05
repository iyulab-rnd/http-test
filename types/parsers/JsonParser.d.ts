import { ContentTypeParser, ParserContext } from './ContentTypeParser';
export declare class JsonParser implements ContentTypeParser {
    private context;
    constructor(context: ParserContext);
    parseBody(body: string): string;
    isBodyStart(line: string): boolean;
    isBodyEnd(line: string): boolean;
}
