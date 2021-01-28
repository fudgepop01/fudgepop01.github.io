import { currentPath } from "../../../stores/locationStore";
import { typeData, typeList, currStructPath } from "../../../stores/typeDataStore";
import type { codeBlockArgs } from "../base";

export const jsReplHandler = (codeEntries: string[], {code, language}: codeBlockArgs): boolean | string => {
  const outHTML = `<div id="JsInteractive-${codeEntries.length}"></div>`;
  codeEntries.push(code);
  return outHTML;
}