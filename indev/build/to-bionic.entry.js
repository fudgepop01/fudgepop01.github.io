import { r as registerInstance, g as getElement } from './index-fca4abca.js';

const bionicTextCss = "to-bionic:not([disabled]) span[bold]{font-weight:bold !important}to-bionic:not([disabled]) span[normal]{font-weight:normal !important}";

// From http://stackoverflow.com/a/4399718/843621
const getTextNodesIn = (node, includeWhitespaceNodes = false) => {
  const textNodes = [], nonWhitespaceMatcher = /\S/;
  const getTextNodes = (node) => {
    if (node.nodeType === 3) {
      if (includeWhitespaceNodes || nonWhitespaceMatcher.test(node.nodeValue)) {
        textNodes.push(node);
      }
    }
    else if (!(node.tagName == "SCRIPT" || node.hasAttribute("no-bionic"))) {
      for (let i = 0, end = node.childNodes.length; i < end; i++) {
        getTextNodes(node.childNodes[i]);
      }
    }
  };
  getTextNodes(node);
  return textNodes;
};
const BionicText = class {
  constructor(hostRef) {
    registerInstance(this, hostRef);
  }
  formatContent() {
    const textNodes = getTextNodesIn(this.element);
    for (const textNode of textNodes) {
      const content = textNode.data;
      const splitted = content.split(/(\s+)/g);
      const whitespaceIdx = ((/\s+/).test(splitted[0])) ? 0 : 1;
      const replacement = [];
      for (const [idx, split] of splitted.entries()) {
        if (idx % 2 == whitespaceIdx) {
          replacement.push(document.createTextNode(split));
          continue;
        }
        const start = split.substring(0, Math.ceil(split.length / 2));
        const end = split.substring(start.length);
        const embold = document.createElement("span");
        embold.setAttribute("bold", "");
        embold.innerText = start;
        replacement.push(embold);
        if (end.length) {
          const regular = document.createElement("span");
          regular.setAttribute("normal", "");
          regular.innerText = end;
          replacement.push(regular);
        }
      }
      textNode.replaceWith(...replacement);
    }
  }
  render() {
    this.formatContent();
  }
  get element() { return getElement(this); }
};
BionicText.style = bionicTextCss;

export { BionicText as to_bionic };

//# sourceMappingURL=to-bionic.entry.js.map