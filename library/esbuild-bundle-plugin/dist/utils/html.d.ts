export interface HtmlTagDescriptor {
    tag: string;
    attrs?: Record<string, string | boolean | undefined>;
    children?: string | HtmlTagDescriptor[];
    /**
     * default: 'head-prepend'
     */
    injectTo?: 'head' | 'body' | 'head-prepend' | 'body-prepend';
}
export declare function serializeTags(tags: HtmlTagDescriptor['children']): string;
export declare const headInjectRE: RegExp;
export declare const headPrependInjectRE: RegExp[];
export declare function injectToHead(html: string, tags: HtmlTagDescriptor[], prepend?: boolean): string;
