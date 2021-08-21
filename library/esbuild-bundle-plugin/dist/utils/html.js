"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.injectToHead = exports.headPrependInjectRE = exports.headInjectRE = exports.serializeTags = void 0;
function serializeTags(tags) {
    if (typeof tags === 'string') {
        return tags;
    }
    else if (tags) {
        return `  ${tags.map(serializeTag).join('\n    ')}`;
    }
    return '';
}
exports.serializeTags = serializeTags;
function serializeTag({ tag, attrs, children }) {
    if (unaryTags.has(tag)) {
        return `<${tag}${serializeAttrs(attrs)}>`;
    }
    else {
        return `<${tag}${serializeAttrs(attrs)}>${serializeTags(children)}</${tag}>`;
    }
}
function serializeAttrs(attrs) {
    let res = '';
    for (const key in attrs) {
        if (typeof attrs[key] === 'boolean') {
            res += attrs[key] ? ` ${key}` : ``;
        }
        else {
            res += ` ${key}=${JSON.stringify(attrs[key])}`;
        }
    }
    return res;
}
exports.headInjectRE = /<\/head>/;
exports.headPrependInjectRE = [/<head>/, /<!doctype html>/i];
const unaryTags = new Set(['link', 'meta', 'base']);
function injectToHead(html, tags, prepend = false) {
    const tagsHtml = serializeTags(tags);
    if (prepend) {
        // inject after head or doctype
        for (const re of exports.headPrependInjectRE) {
            if (re.test(html)) {
                return html.replace(re, `$&\n${tagsHtml}`);
            }
        }
    }
    else {
        // inject before head close
        if (exports.headInjectRE.test(html)) {
            return html.replace(exports.headInjectRE, `${tagsHtml}\n  $&`);
        }
    }
    // if no <head> tag is present, just prepend
    return tagsHtml + `\n` + html;
}
exports.injectToHead = injectToHead;
