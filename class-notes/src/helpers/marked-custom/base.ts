import type Handsontable from "handsontable";
import type marked from "marked";
import { Slugger } from "marked";
import { hotLanguageHandler } from "./languages/hotable";
import { structHandler, structTableData } from "./languages/struct";
import { jsReplHandler } from "./languages/js-interactive";

export type codeBlockArgs = {code: string, language: string};

// @ts-ignore
export const rendererFactory = (
  tables: {
    hotLang: Handsontable.GridSettings[];
    struct: {
      getCurrentData: () => string;
      tableData: structTableData;
    },
    jsRepl: string[]
  },
  TOC,
  pages: string[],
  pageScripts: string[]
): marked.Renderer => {
  return {
    // @ts-ignore
    code(code: string, language: string, isEscaped: false): string | boolean {
      switch(language) {
        case 'handsontable': return hotLanguageHandler(tables.hotLang, {code, language});
        case 'struct': return structHandler(tables.struct.tableData, tables.struct.getCurrentData, {code, language});
        case 'js-interactive': return jsReplHandler(tables.jsRepl, {code, language});
        default: 
          const hljs = window['hljs'];
          return `<pre><code>${hljs.highlight(language, code).value}</code></pre>`;
      }
    },
    // @ts-ignore
    heading(text: string, level: 1 | 2 | 3 | 4 | 5 | 6, raw: string, slugger: marked.Slugger): string | boolean {
      // @ts-ignore
      TOC.push({text: raw, level, id: slugger.slug(raw, { dryrun: true })});
      return false;
    },
    // @ts-ignore
    link(href: string, title: string, text: string): string | boolean {
      if (href.startsWith("/")) {
        const anchorPos = (href.indexOf("#") == -1) ? undefined : href.indexOf("#");
        if (pages.includes(href.substring(1, anchorPos)))
          // @ts-ignore
          return `<a href="${window.location.origin}${window.location.pathname}?page=${href.substring(1, anchorPos)}&location=${anchorPos ? new Slugger().slug(href.substr(anchorPos), {dryrun: true}) : ''}">${text}</a>`
        else
          return `<span class="invalid-link" data-targetpage="${href.substring(1, anchorPos)}">${text}</span>`;
      } else if (href.startsWith("#")) {
        // @ts-ignore
        return `<a href="${window.location.origin}${window.location.pathname}?page=${localStorage.getItem("lastPage")}&location=${new Slugger().slug(href.substr(1), {dryrun: true})}">${text}</a>`
      } else if (href.includes("localhost") || href.includes("fudgepop01.github.io")) {
        const targetPage = (new URLSearchParams(href.substring(href.indexOf("?")))).get("page");
        if (pages.includes(targetPage))
          return `<a href="${window.location.origin}${window.location.pathname}${href.replace(/https?:\/\/(?:localhost:\d{4}|fudgepop01\.github\.io)/g, "")}">${text}</a>`;
        else
          return `<span class="invalid-link" data-targetpage="${targetPage}">${text}</span>`;
      }

      return false;
    },
    // @ts-ignore
    image(href: string, title: string, text: string): string | boolean {
      console.log(href, title, text);
      if (text === "SCRIPT") {
        if (window.location.hostname === "localhost") {
          pageScripts = [...pageScripts, `${window.location.origin}${window.location.pathname}pages/${href.substring(1)}.js`];
        } else if (window.location.origin === "https://fudgepop01.github.io") {
          pageScripts = [...pageScripts, `https://raw.githubusercontent.com/fudgepop01/fudgepop01.github.io/class-notes/public/pages/${href.substring(1)}.js`];
        }
        return '';
      }
      return false;
    }
  }
}