import { ContentTypeParser, ParserContext } from './ContentTypeParser';
export declare class ParserFactory {
    static createParser(contentType: string, context: ParserContext): ContentTypeParser;
}
