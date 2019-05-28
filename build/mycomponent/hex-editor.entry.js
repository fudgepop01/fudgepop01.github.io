const h = window.mycomponent.h;

function isInprogress(piece) {
    if (piece && piece.content)
        return true;
    else
        return false;
}
class editController {
    constructor(parent) {
        this.parent = parent;
        this.added = new Uint8Array();
        this.pieces = [];
        this.chunk = '';
        this.original = parent.file;
        this.pieces = [{ offset: 0, length: this.original.length, source: "origin" }];
    }
    initEdit(offset, type) {
        this.inProgress = { offset, type, content: [], index: -1, get length() { return this.content.length; } };
        if (type === 'insert') {
            let tracker = 0;
            let targetSlicePoint;
            let targetIndex;
            let target;
            for (const [i, piece] of this.pieces.entries()) {
                tracker += piece.length;
                if (tracker >= offset) {
                    targetSlicePoint = piece.length - tracker + offset;
                    targetIndex = i;
                    target = piece;
                    break;
                }
            }
            this.inProgress.index = targetIndex + 1;
            const toInsert = [
                { offset: target.offset, length: targetSlicePoint, source: target.source },
                this.inProgress,
                { offset: target.offset + targetSlicePoint, length: target.length - targetSlicePoint, source: target.source },
            ];
            this.pieces.splice(targetIndex, 1, ...toInsert);
        }
        else {
            let tracker = 0;
            let targetSlicePoint;
            let targetIndex;
            let target;
            for (const [i, piece] of this.pieces.entries()) {
                tracker += piece.length;
                if (tracker >= offset) {
                    targetSlicePoint = piece.length - tracker + offset;
                    targetIndex = i;
                    target = piece;
                    break;
                }
            }
            this.inProgress.index = targetIndex + 1;
            const toInsert = [
                { offset: target.offset, length: targetSlicePoint, source: target.source },
                this.inProgress,
                { offset: target.offset + targetSlicePoint, length: target.length - targetSlicePoint, source: target.source },
            ];
            this.pieces.splice(targetIndex, 1, ...toInsert);
        }
    }
    buildEdit(keyStroke) {
        if (/^[a-fA-F0-9]$/.test(keyStroke.key)) {
            this.chunk += keyStroke.key;
            if (this.chunk.length === 2) {
                this.inProgress.content.push(parseInt(this.chunk, 16));
                this.chunk = '';
                this.parent.cursor += 1;
                let index = this.pieces.indexOf(this.inProgress);
                if (this.inProgress.type === 'overwrite' && index !== this.pieces.length - 1) {
                    const nextPiece = this.pieces[index + 1];
                    nextPiece.offset += 1;
                    nextPiece.length -= 1;
                    if (nextPiece.length === 0) {
                        this.pieces.splice(index + 1, 1);
                    }
                }
            }
        }
    }
    commit() {
        let newArr = new Uint8Array(this.added.length + this.inProgress.content.length);
        newArr.set(this.added, 0);
        newArr.set(this.inProgress.content, this.added.length);
        this.pieces[this.inProgress.index] = { offset: this.added.length, length: this.inProgress.length, source: 'added' };
        console.log(this.pieces);
        this.added = newArr;
        this.inProgress = null;
        this.chunk = '';
    }
    render(start, length) {
        let out = new Uint8Array(length);
        let meta = { added: [] };
        let tracker = 0;
        let startPlace;
        let startIndex = 0;
        for (const [i, piece] of this.pieces.entries()) {
            tracker += piece.length;
            if (tracker >= start) {
                startPlace = piece.length - tracker + start;
                startIndex = i;
                break;
            }
        }
        if (isInprogress(this.pieces[startIndex]) || this.pieces[startIndex].source === 'added') {
            meta.added.push([start - startPlace, start - startPlace + this.pieces[startIndex].length]);
        }
        let firstChunk = this.getPieceBuffer(this.pieces[startIndex]).subarray(startPlace, startPlace + length);
        tracker = firstChunk.length;
        out.set(firstChunk, 0);
        for (let i = startIndex + 1; i < this.pieces.length; i++) {
            let piece = this.pieces[i];
            tracker += piece.length;
            if (isInprogress(piece) || piece.source === 'added') {
                meta.added.push([start + tracker - piece.length, start + tracker]);
            }
            if (tracker >= length) {
                out.set(this.getPieceBuffer(piece).subarray(0, piece.length - tracker + length), tracker - piece.length);
                break;
            }
            out.set(this.getPieceBuffer(piece), tracker - piece.length);
        }
        if (tracker !== length) {
            return {
                out: out.subarray(0, tracker),
                meta
            };
        }
        return {
            out,
            meta
        };
    }
    get length() {
        let lengthCheck = 0;
        for (const piece of this.pieces) {
            lengthCheck += piece.length;
        }
        return lengthCheck;
    }
    rollback() {
    }
    save() {
    }
    getPieceBuffer(piece) {
        if (isInprogress(piece)) {
            return new Uint8Array(piece.content);
        }
        // implied else
        if (piece.source === 'origin') {
            return this.original.subarray(piece.offset, piece.offset + piece.length);
        }
        else {
            return this.added.subarray(piece.offset, piece.offset + piece.length);
        }
    }
}

class HexEditor {
    constructor() {
        this.maxLines = 30;
        this.bytesPerLine = 16;
        this.bytesUntilForcedLine = 0;
        this.asciiInline = false;
        this.bytesPerGroup = 4;
        this.mode = "region";
        this.editType = "overwrite";
        this.regionDepth = 2;
        this.regions = [{
                start: 0x0,
                end: 0x40,
                name: 'start',
                description: 'the start of the file. Hopefully this works',
                subRegions: [{
                        start: 0x0,
                        end: 0x20,
                        subRegions: [{
                                start: 0x0,
                                end: 0x8
                            }, {
                                start: 0x10,
                                end: 0x16
                            }]
                    }, {
                        start: 0x20,
                        end: 0x40
                    }]
            },
            {
                start: 0x40,
                end: 0x69
            },
            {
                start: 0x269,
                end: 0x369
            },
            {
                start: 0x369,
                end: 0x400
            }];
        // keeps track of which line is displayed
        this.lineNumber = 0;
        /**
         * This must be an arrow function so it retains the reference to
         * "this" while also not being anonymous. This allows it to be
         * added as an eventlistener directly while retaining the ability
         * to remove it.
         *
         * @memberof MyComponent
         */
        this.scroll = (evt) => {
            evt.preventDefault();
            let scaledVelocity = Math.ceil(evt.deltaY / 2);
            if (scaledVelocity === -0)
                scaledVelocity -= 1;
            if (this.lineNumber + scaledVelocity < 0)
                this.lineNumber = 0;
            else if (this.lineNumber + scaledVelocity > Math.floor(this.editController.length / this.bytesPerLine) - 1)
                this.lineNumber = Math.floor(this.editController.length / this.bytesPerLine) - 1;
            else
                this.lineNumber += scaledVelocity;
        };
    }
    /**
     * accepts and reads the file, storing the result in
     * the file variable
     * @param event the event
     */
    acceptFile(event) {
        const target = event.target;
        this.fileMetadata = target.files[0];
        const reader = new FileReader();
        reader.readAsArrayBuffer(target.files[0]);
        reader.onload = (event) => {
            this.file = new Uint8Array(event.target.result);
            this.editController = new editController(this);
        };
    }
    /**
     * TODO: make this prettier
     * displays the file upload button
     */
    showSelector() {
        return (h("div", { class: "select" },
            h("label", { htmlFor: "file-uploader" }, "select a file to upload: "),
            h("input", { type: "file", id: "file-uploader", onChange: (evt) => this.acceptFile(evt) })));
    }
    /**
     * displays the progress of the file upload
     */
    showLoading() {
        return (h("div", { class: "loading" },
            h("div", { id: "MEASURE", class: "hex", style: { position: 'absolute', visibility: 'hidden', padding: '0 5px' } }, "AB"),
            h("p", null, "loading...")));
    }
    /**
     * builds the elements responsible for the hex view
     */
    buildHexView() {
        const { lineNumber, maxLines, bytesPerLine, bytesPerGroup, /* bytesUntilForcedLine, */ asciiInline } = this;
        const start = lineNumber * bytesPerLine;
        const chunkData = this.editController.render(start, maxLines * bytesPerLine);
        const chunk = chunkData.out;
        const addedRanges = chunkData.meta.added;
        const lines = [];
        for (let i = 0; i < maxLines; i++) {
            lines.push(chunk.subarray(i * bytesPerLine, (i + 1) * bytesPerLine));
        }
        const lineViews = [];
        const charViews = [];
        for (const [lineNum, line] of lines.entries()) {
            // setup variables
            const base = start + lineNum * bytesPerLine;
            const charLines = [];
            const hexLines = [];
            let ascii = '•';
            let selected = false;
            if (line.length === 0)
                break;
            // sets up everything else.
            for (const [position, val] of [...line.values()].entries()) {
                let out;
                if (/\w|[!@#$%^&*()_+=\]\\:;"'>.<,/?]/.test(String.fromCharCode(val))) {
                    ascii = String.fromCharCode(val);
                }
                else {
                    ascii = '•';
                }
                if (asciiInline && /\w/.test(ascii)) {
                    out = "." + ascii;
                }
                else {
                    out = val.toString(16).toUpperCase().padStart(2, '0');
                }
                // classes
                const classList = [];
                if (position % bytesPerGroup === bytesPerGroup - 1)
                    classList.push('padByte');
                if (this.cursor === base + position) {
                    classList.push('cursor');
                    selected = true;
                }
                if (this.selection && this.selection.start <= base + position && base + position <= this.selection.end)
                    classList.push('selected');
                for (const [start, end] of addedRanges) {
                    if (start <= base + position && base + position < end) {
                        classList.push('added');
                        break;
                    }
                }
                charLines.push(h("span", { class: classList.join(' ') }, ascii));
                hexLines.push(h("span", { class: classList.join(' ') }, out));
            }
            lineViews.push((h("div", { class: 'hexLine' + (selected ? ' selected' : '') }, hexLines)));
            charViews.push((h("div", { class: 'charLine' + (selected ? ' selected' : '') }, charLines)));
        }
        // fill extra space
        while (lineViews.length < maxLines) {
            lineViews.push(h("div", { class: "hexLine" },
                h("span", null, "-")));
            charViews.push(h("div", { class: "charLine" },
                h("span", null, "-")));
        }
        // line number builder
        const lineLabels = [];
        for (let i = 0; i < maxLines; i++) {
            lineLabels.push(h("div", { class: "lineLabel" }, '0x' + (start + i * bytesPerLine).toString(16).padStart(8, ' ')));
        }
        // regions
        const scaleWidth = document.getElementById('MEASURE').clientWidth;
        const scaleHeight = document.getElementById('MEASURE').clientHeight;
        const regionMarkers = [];
        const buildRegion = (region, depth = 0, index) => {
            if (depth === 0) {
                if (region.end < start || region.start > start + this.maxLines * this.bytesPerLine)
                    return;
            }
            if (depth === this.regionDepth)
                return;
            // if regions don't work right in the future then the if condition below is the reason why
            else if (region.subRegions && depth + 1 !== this.regionDepth) {
                for (const [i, r] of region.subRegions.entries())
                    buildRegion(r, depth + 1, i);
            }
            else {
                // start / end offsets
                const s = region.start % this.bytesPerLine;
                const e = region.end % this.bytesPerLine;
                // l is the "height" of the region. It was a bit confusing, so allow me to explain:
                // instead of only taking into account the start and end of the region's offsets,
                // what we ACTUALLY want is the start and end while taking into account the offset
                // provided by 's'
                const l = Math.floor((region.end - region.start + s) / this.bytesPerLine);
                if (region.end < start || region.start > start + this.maxLines * this.bytesPerLine)
                    return;
                const offset = Math.floor(region.start / this.bytesPerLine) - lineNumber;
                const getColor = {
                    0: ['#77F', '#BBF'],
                    1: ['#F77', '#FBB'],
                    2: ['#7D7', '#BDB']
                };
                regionMarkers.push((h("polygon", { onmousemove: `
            if (window.canUpdateMousemove === undefined) {
              window.canUpdateMousemove = true;
            }
            if (window.canUpdateMousemove) {
              window.canUpdateMousemove = false;
              document.documentElement.style.setProperty('--mouse-x', event.clientX);
              document.documentElement.style.setProperty('--mouse-y', event.clientY);
              document.getElementById('tooltip').setAttribute('active', true)
              document.getElementById('tooltip').setAttribute('complex', '${JSON.stringify(Object.assign({}, region, { subRegions: region.subRegions ? region.subRegions.map(sr => sr.name) : null }))}');

              setTimeout(() => {window.canUpdateMousemove = true}, 50);
            }
          `, onmouseleave: `document.getElementById('tooltip').setAttribute('active', false)`, class: "region", points: `
            0,${(1 + offset) * scaleHeight}
            ${s * scaleWidth},${(1 + offset) * scaleHeight}
            ${s * scaleWidth},${offset * scaleHeight}
            ${this.bytesPerLine * scaleWidth},${offset * scaleHeight}
            ${this.bytesPerLine * scaleWidth},${(l + offset) * scaleHeight}
            ${e * scaleWidth},${(l + offset) * scaleHeight}
            ${e * scaleWidth},${(l + offset + 1) * scaleHeight}
            0,${(l + 1 + offset) * scaleHeight}
            `, fill: region.color || getColor[depth % 3][index % 2], stroke: "none" })));
            }
        };
        for (const [i, region] of this.regions.entries()) {
            buildRegion(region, 0, i);
        }
        return {
            lineViews,
            charViews,
            lineLabels,
            regionMarkers: h("svg", { viewbox: `0 0 ${this.bytesPerLine * scaleWidth} ${this.maxLines * scaleHeight}`, style: { width: this.bytesPerLine * scaleWidth, height: this.maxLines * scaleHeight } }, regionMarkers)
        };
    }
    edit(evt) {
        if (this.editType === 'readonly')
            return;
        const editController$$1 = this.editController;
        if (!editController$$1.inProgress)
            editController$$1.initEdit(this.cursor, this.editType);
        editController$$1.buildEdit(evt);
    }
    /**
     * displays the full hexidecimal view
     */
    showHex() {
        const { lineViews, charViews, lineLabels, regionMarkers } = this.buildHexView();
        return (h("div", { class: "hex", onMouseEnter: (evt) => this._toggleScrollListener(evt), onMouseLeave: (evt) => this._toggleScrollListener(evt), onMouseDown: (evt) => this.beginSelection(evt), onMouseUp: (evt) => this.endSelection(evt), tabindex: "0", onKeyDown: (evt) => this.edit(evt) },
            h("div", { id: "MEASURE", style: { position: 'absolute', visibility: 'hidden', padding: '0 5px' } }, "AB"),
            h("div", { class: "lineLabels" }, lineLabels),
            h("div", { class: "hexView" },
                h("div", { class: "highlight", style: { position: 'absolute', top: '0', display: this.mode === 'noregion' ? 'none' : 'block', zIndex: this.mode === 'region' ? '3' : '0' } }, regionMarkers),
                h("div", { class: "main" }, lineViews)),
            h("div", { class: "asciiView" }, charViews)));
    }
    /**
     * gets the exact position of
     * @param evt the mousedown event
     */
    beginSelection(evt) {
        this.tempSelection =
            this.lineNumber * this.bytesPerLine +
                [...evt.path[2].children].indexOf(evt.path[1]) * this.bytesPerLine +
                [...evt.path[1].children].indexOf(evt.path[0]);
    }
    endSelection(evt) {
        const chosen = this.lineNumber * this.bytesPerLine +
            [...evt.path[2].children].indexOf(evt.path[1]) * this.bytesPerLine +
            [...evt.path[1].children].indexOf(evt.path[0]);
        if (this.tempSelection > chosen) {
            this.selection = {
                start: chosen,
                end: this.tempSelection,
            };
        }
        else {
            this.selection = {
                start: this.tempSelection,
                end: chosen,
            };
        }
        this.tempSelection = null;
        this.cursor = chosen;
        if (this.editController.inProgress)
            this.editController.commit();
    }
    render() {
        return (h("div", { class: "container" }, !this.fileMetadata
            ? this.showSelector()
            : !this.file
                ? this.showLoading()
                : this.showHex()));
    }
    _toggleScrollListener(evt) {
        if (evt.type === "mouseenter")
            evt.target.addEventListener("wheel", this.scroll, { passive: false });
        else
            evt.target.removeEventListener("wheel", this.scroll, false);
    }
    static get is() { return "hex-editor"; }
    static get properties() { return {
        "asciiInline": {
            "type": Boolean,
            "attr": "asciiinline"
        },
        "bytesPerGroup": {
            "type": Number,
            "attr": "bytespergroup"
        },
        "bytesPerLine": {
            "type": Number,
            "attr": "bytesperline"
        },
        "bytesUntilForcedLine": {
            "type": Number,
            "attr": "bytes-until-forced-line"
        },
        "cursor": {
            "state": true
        },
        "editType": {
            "type": String,
            "attr": "edittype"
        },
        "file": {
            "state": true
        },
        "fileMetadata": {
            "state": true
        },
        "lineNumber": {
            "state": true
        },
        "maxLines": {
            "type": Number,
            "attr": "maxlines"
        },
        "mode": {
            "type": String,
            "attr": "mode"
        },
        "regionDepth": {
            "type": Number,
            "attr": "regiondepth"
        },
        "regions": {
            "type": "Any",
            "attr": "regions"
        },
        "selection": {
            "state": true
        }
    }; }
    static get style() { return ".container {\n  overflow: scroll;\n  position: relative;\n  width: 100vw;\n  min-height: 100%;\n}\n\n.hex {\n  font-family: 'Sourcecode Pro', Courier, monospace;\n  font-size: 15px;\n}\n\n.hexView,\n.asciiView,\n.lineLabels {\n  display: inline-block;\n  padding: 0 10px;\n  white-space: pre;\n  position: relative;\n}\n\n.hexLine span,\n.charLine span {\n  position: relative;\n}\n\n.hexLine span {\n  position: relative;\n  padding: 0 5px;\n}\n.hexLine span:not(:last-child).padByte::after {\n  /* padding-right: 15px; */\n  background-color: #0006;\n  position: absolute;\n  width: 2px;\n  height: 100%;\n  left: calc(100% - 1px);\n  content: '';\n}\n\n.hexLine span {\n  cursor: default;\n  -webkit-user-select: none;\n  -moz-user-select: none;\n  -ms-user-select: none;\n  user-select: none;\n}\n\n.charLine span.selected,\n.hexLine span.selected {\n  background-color: #8888FF80;\n}\n\n.charLine span.cursor,\n.hexLine span.cursor {\n  background-color: #008;\n  color: #FFF;\n}\n\n.charLine span.added,\n.hexLine span.added {\n  color: red;\n}\n\n.hexLine span:hover {\n  background-color: #000;\n  color: #FFF;\n}\n\n.hexLine:nth-child(2n-1),\n.charLine:nth-child(2n-1),\n.lineLabel:nth-child(2n-1) {\n  background-color: #EEFFFF;\n}\n\n.charLine.selected,\n.hexLine.selected {\n  background-color: #FFA;\n}\n\n.region { opacity: 0.8; }\n\n.region:hover { opacity: 0.3; position: relative; }"; }
}

export { HexEditor };
