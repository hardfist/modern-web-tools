export interface HtmlTagDescriptor {
  tag: string;
  attrs?: Record<string, string | boolean | undefined>;
  children?: string | HtmlTagDescriptor[];
  /**
   * default: 'head-prepend'
   */
  injectTo?: 'head' | 'body' | 'head-prepend' | 'body-prepend';
}
export function serializeTags(tags: HtmlTagDescriptor['children']): string {
  if (typeof tags === 'string') {
    return tags;
  } else if (tags) {
    return `  ${tags.map(serializeTag).join('\n    ')}`;
  }
  return '';
}
function serializeTag({ tag, attrs, children }: HtmlTagDescriptor): string {
  if (unaryTags.has(tag)) {
    return `<${tag}${serializeAttrs(attrs)}>`;
  } else {
    return `<${tag}${serializeAttrs(attrs)}>${serializeTags(children)}</${tag}>`;
  }
}
function serializeAttrs(attrs: HtmlTagDescriptor['attrs']): string {
  let res = '';
  for (const key in attrs) {
    if (typeof attrs[key] === 'boolean') {
      res += attrs[key] ? ` ${key}` : ``;
    } else {
      res += ` ${key}=${JSON.stringify(attrs[key])}`;
    }
  }
  return res;
}
export const headInjectRE = /<\/head>/;
export const headPrependInjectRE = [/<head>/, /<!doctype html>/i];
const unaryTags = new Set(['link', 'meta', 'base']);

export function injectToHead(html: string, tags: HtmlTagDescriptor[], prepend = false) {
  const tagsHtml = serializeTags(tags);
  if (prepend) {
    // inject after head or doctype
    for (const re of headPrependInjectRE) {
      if (re.test(html)) {
        return html.replace(re, `$&\n${tagsHtml}`);
      }
    }
  } else {
    // inject before head close
    if (headInjectRE.test(html)) {
      return html.replace(headInjectRE, `${tagsHtml}\n  $&`);
    }
  }
  // if no <head> tag is present, just prepend
  return tagsHtml + `\n` + html;
}
