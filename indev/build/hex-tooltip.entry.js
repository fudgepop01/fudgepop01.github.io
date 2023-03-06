import { r as registerInstance, h } from './index-fca4abca.js';

const tooltipCss = "hex-tooltip{position:fixed;display:none;box-sizing:border-box;font-size:14px;max-width:400px;padding:5px;border-radius:2px;background-color:#000;color:white;z-index:1000;pointer-events:none;font-family:'Courier New', Courier, monospace;font-size:14px}hex-tooltip:not([active=false]){display:block;left:calc(var(--mouse-x) * 1px);top:calc(var(--mouse-y) * 1px);transition:.2s left ease, .2s top ease}hex-tooltip[active=frozen]{pointer-events:all;user-select:text;transition:none}";

const Tooltip = class {
  constructor(hostRef) {
    registerInstance(this, hostRef);
    this.active = "false";
    this.data = undefined;
    this.simpleText = undefined;
  }
  render() {
    // if (this.active !== "false") return;
    const out = [];
    if (this.data) {
      let data = (typeof this.data === 'string') ? JSON.parse(this.data) : this.data;
      if (data.name)
        out.push(h("span", null, `name: ${data.name}`), h("br", null));
      out.push(h("span", null, `size: ${data.end - data.start} [0x${data.start.toString(16)} - 0x${data.end.toString(16)}]`), h("br", null));
      for (const [key, value] of Object.entries(data)) {
        if (['name', 'subRegions', 'start', 'end'].includes(key))
          continue;
        if (value !== null) {
          out.push(h("span", null, key, ": ", value), h("br", null));
        }
      }
    }
    else if (this.simpleText) {
      out.push(h("span", null, this.simpleText));
    }
    else {
      out.push(h("span", null, "placeholder"));
    }
    return out;
  }
};
Tooltip.style = tooltipCss;

export { Tooltip as hex_tooltip };

//# sourceMappingURL=hex-tooltip.entry.js.map