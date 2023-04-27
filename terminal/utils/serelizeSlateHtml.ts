import escapeHTML from 'escape-html';
import {Text} from 'slate';

const serializeSlateHtml = (children) => children.map((node, i) => {
  if(Text.isText(node)) {
    return escapeHTML(node.text);
  }
  if(!node) {
    return null;
  }
  switch(node.type) {
    case 'h1':
      return `<h1>${serializeSlateHtml(node.children)}</h1>`;
    case 'h6':
      return `<h6>${serializeSlateHtml(node.children)}</h6>`;
    case 'quote':
      return `<blockquote>${serializeSlateHtml(node.children)}</blockquote>`;
    case 'ul':
      return `<ul>${serializeSlateHtml(node.children)}</ul>`;
    case'ol':
      return `<ol>${serializeSlateHtml(node.children)}</ol>`;
    case'li':
      return `<li>${serializeSlateHtml(node.children)}</li>`;
    case'link':
      return `<a href="${escapeHTML(node.url)}" target="${node.newTab ? '_blank' : '_self'}">${serializeSlateHtml(node.children)}</a>`;
    default:
      return `<p>${serializeSlateHtml(node.children)}</p>`;
  }
}).join('');
export default serializeSlateHtml;