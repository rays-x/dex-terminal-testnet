import {NodeHtmlMarkdown} from 'node-html-markdown';


const serializeHtmlMarkdown = (html: string) => {
  return NodeHtmlMarkdown.translate(html);
};
export default serializeHtmlMarkdown;