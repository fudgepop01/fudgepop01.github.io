const h = window.mycomponent.h;

class Tooltip {
    constructor() {
        this.active = false;
    }
    render() {
        if (!this.active)
            return;
        const out = [];
        if (this.data) {
            let data = (typeof this.data === 'string') ? JSON.parse(this.data) : this.data;
            for (const [key, value] of Object.entries(data)) {
                if (value !== null) {
                    out.push(h("span", null,
                        key,
                        ": ",
                        value));
                    out.push(h("br", null));
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
    static get is() { return "my-tooltip"; }
    static get properties() { return {
        "active": {
            "type": Boolean,
            "attr": "active"
        },
        "data": {
            "type": String,
            "attr": "complex"
        },
        "simpleText": {
            "type": String,
            "attr": "simple"
        }
    }; }
    static get style() { return "my-tooltip {\n  position: fixed;\n  display: none;\n\n  -webkit-box-sizing: border-box;\n\n  box-sizing: border-box;\n  font-size: 14px;\n  max-width: 400px;\n  padding: 5px;\n  border-radius: 2px;\n\n  background-color: #000;\n  color: white;\n\n  z-index: 1000;\n  pointer-events: none;\n}\n\nmy-tooltip[active=true] {\n  display: block;\n  left: calc(var(--mouse-x) * 1px);\n  top: calc(var(--mouse-y) * 1px);\n  -webkit-transition: .2s left ease, .2s top ease;\n  transition: .2s left ease, .2s top ease;\n}"; }
}

export { Tooltip as MyTooltip };
