import { ContentTypeParser, ParserContext } from './ContentTypeParser';
export declare class PlainTextParser implements ContentTypeParser {
    private context;
    constructor(context: ParserContext);
    parseBody(body: string): string;
    isBodyStart(): boolean;
    isBodyEnd(): boolean;
}
