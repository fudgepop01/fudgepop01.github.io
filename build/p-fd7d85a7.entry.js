import{f as t,r as i,c as s,h as e}from"./p-ce235454.js";function n(t){return t instanceof l}function h(t){if(t.length>0)return t[t.length-1]}class o{constructor(t,i,s=0,e){this.offset=t,this.length=i,this.modified=s,this.myType=e,this.self=this}splitAt(t){const i=this.makeNew(this.mOffset,t),s=this.makeNew(this.offset+t,this.length-t,this.modified);return 0===i.length?(this.self=[s],[void 0,s]):0===s.mLength?(this.self=[i],[i,void 0]):this.self=[i,s]}isContinuedBy(t){return t instanceof this.myType&&this.mLength+this.mOffset===t.mOffset&&this.editNum===t.editNum}join(t){return this.self=this.makeNew(this.mOffset,this.mLength+t.mLength)}get isSelf(){return this===this.self}get mOffset(){return this.offset+this.modified}get mLength(){return this.length-this.modified}get pieces(){return Array.isArray(this.self)?1===this.self.length?[...this.self[0].pieces]:[...this.self[0].pieces,...this.self[1].pieces]:[this.self]}}class a extends o{constructor(t,i,s=0){super(t,i,s,a)}makeNew(t,i,s){return new a(t,i,s)}}class r extends o{constructor(t,i,s,e,n=[],h=0){super(t,i,h,r),this.type=s,this.editNum=e,this.consumption=n}makeNew(t,i,s){return new r(t,i,this.type,this.editNum,this.consumption,s)}}class l{constructor(t,i,s,e){this.offset=t,this.type=i,this.editNum=s,this.index=e,this.content=[],this.consumption=[]}get length(){return this.content.length}get modified(){return 0}get mLength(){return this.length}get mOffset(){return this.offset}get pieces(){return[this]}}class c{constructor(t){this.parent=t,this.added=new Uint8Array,this.pieces=[],this.undoStack=[],this.redoStack=[],this.chunk="",this.original=t.file,this.pieces=[new a(0,this.original.length)],window.rollback=()=>{this.rollback(),console.log(this.pieces)},window.ec=this}initEdit(t,i){this.redoStack.length>0&&this.rollback(),this.inProgress=new l(this.added.length,i,this.undoStack.length+1,-1);let{targetIndex:s,targetSlicePoint:e,target:n}=this.getPieceAtOffset(t);if(n instanceof o){const t=n.splitAt(e);let i;t[0]?t[1]?(this.inProgress.index=s+1,i=[t[0],this.inProgress,t[1]]):(this.inProgress.index=s+1,i=[t[0],this.inProgress]):(this.inProgress.index=s,i=[this.inProgress,t[1]]),this.pieces.splice(s,1,...i)}this.undoStack.push(this.inProgress)}getPieceAtOffset(t){let i,s,e,n=0;for(const[h,o]of this.pieces.entries())if(n+=o.mLength,n>=t){i=o.mLength-n+t,s=h,e=o;break}return{targetSlicePoint:i,targetIndex:s,target:e}}get isInProgress(){return!!this.inProgress}modifyNextPiece(t,i,s){const e=s||this.inProgress;if(i!==this.pieces.length-1){let s=h(e.consumption);if(void 0===s||s.consumed){const t=this.pieces[i+1];s={consumed:!1,piece:t,startMod:t.modified},e.consumption.push(s)}s.piece.modified-=t,0===s.piece.mLength&&(s.consumed=!0,this.pieces.splice(i+1,1))}}find(t,i,s){const e=[];let n=this.render(i,s||this.length-i).out,h=0;for(let o=t.length;o<n.length;o++){if(n[o]===t[t.length-1])for(let s=t.length-1;s>=0;s--){if(0===s){e.push(o+i-t.length+1);break}if(n[o-(t.length-s)]!==t[s-1]){o+=s-1;break}}else{const i=t.lastIndexOf(n[o]);o+=-1===i?t.length-1:t.length-i-2}if(h++,h>1e5)break}return e}redo(){if(this.redoStack.length>0){const[i,s,e]=this.redoStack.pop(),n=this.pieces.indexOf(i);if("insert"===e.type)this.pieces.splice(n,0,...e.pieces);else{let t=0,i=h(e.consumption);i.consumed||(t=1),isNaN(s)||(i.piece.isSelf?i.piece.modified=s:i.piece.pieces[0].modified=s),this.pieces.splice(n,e.consumption.length-t,...e.pieces)}this.undoStack.push(e),t(this.parent)}}undo(){if(this.isInProgress&&(this.commit(),this.chunk=""),this.undoStack.length>0){const i=this.undoStack.pop(),s=this.pieces.indexOf(i.pieces[0]);let e,n=NaN;if(i instanceof r&&"overwrite"===i.type){const t=[],h=[];for(const s of i.consumption)s.consumed?(s.piece.modified=s.startMod,t.push(s.piece)):h.push(s);if(this.pieces.splice(s,i.pieces.length,...t),e=this.pieces[s],h.length)if(h[0].piece.isSelf)n=h[0].piece.modified,h[0].piece.modified=h[0].startMod;else{const t=h[0].piece.pieces;n=t[0].modified,t[0].modified=h[0].startMod-h[0].piece.modified}}else this.pieces.splice(s,i.pieces.length),e=this.pieces[s];this.redoStack.push([e,n,i]),t(this.parent)}}backSpace(){this.inProgress&&(this.chunk="",this.inProgress.content.pop(),this.parent.setCursorPosition(this.parent.cursor-1),this.modifyNextPiece(1,this.inProgress.index))}buildEdit(i){this.parent.cursor&&-1!==this.parent.cursor&&("Z"!==i.key||!i.metaKey&&!i.ctrlKey?"z"!==i.key||!i.metaKey&&!i.ctrlKey?"Backspace"!==i.key?["ascii","byte"].includes(this.parent.editingMode)?(this.isInProgress||this.initEdit(this.parent.cursor,this.parent.editType),"ascii"===this.parent.editingMode&&1===i.key.length&&/[\u0000-\u00FF]/.test(i.key)?(this.inProgress.content.push(i.key.charCodeAt(0)),this.parent.setCursorPosition(this.parent.cursor+1),"overwrite"===this.inProgress.type&&this.modifyNextPiece(-1,this.inProgress.index)):"byte"===this.parent.editingMode&&/^[a-fA-F0-9]$/.test(i.key)&&(this.chunk+=i.key,2===this.chunk.length&&(this.inProgress.content.push(parseInt(this.chunk,16)),this.chunk="",this.parent.setCursorPosition(this.parent.cursor+1),"overwrite"===this.inProgress.type&&this.modifyNextPiece(-1,this.inProgress.index)))):"bit"===this.parent.editingMode&&["0","1","Enter"].includes(i.key)&&("Enter"===i.key?(this.initEdit(this.parent.cursor,"insert"),this.inProgress.content.push(0),this.commit(),t(this.parent)):(this.isInProgress||this.initEdit(this.parent.cursor,"overwrite"),this.parent.setCursorPosition(this.parent.cursor,this.parent.bit+1))):this.backSpace():this.undo():this.redo())}commit(){const t=new Uint8Array(this.added.length+this.inProgress.content.length);t.set(this.added,0),t.set(this.inProgress.content,this.added.length);const i=new r(t.length-this.inProgress.length,this.inProgress.length,this.inProgress.type,this.inProgress.editNum,this.inProgress.consumption);this.pieces[this.inProgress.index]=i,this.undoStack[this.undoStack.length-1]=i,this.added=t,this.inProgress=null,this.chunk=""}rollback(){let t=0;for(;this.redoStack.length>0;)t+=this.redoStack.pop()[2].length;let i=new Uint8Array(this.added.length-t);i.set(this.added.subarray(0,i.length),0),this.added=i;for(let s=0;s<this.pieces.length-1;s++){const t=this.pieces[s],i=this.pieces[s+1];t.isContinuedBy(i)&&(this.pieces.splice(s,2,t.join(i)),s--)}}render(t,i){let s,e=new Uint8Array(i),h={added:[]},o=0,a=0;for(const[n,r]of this.pieces.entries())if(o+=r.mLength,o>=t){s=r.mLength-o+t,a=n;break}(n(this.pieces[a])||this.pieces[a]instanceof r)&&h.added.push([t-s,t-s+this.pieces[a].length]);let l=this.getPieceBuffer(this.pieces[a]).subarray(s,s+i);o=l.length,e.set(l,0);for(let c=a+1;c<this.pieces.length;c++){let s=this.pieces[c];if(o+=s.mLength,(n(s)||s instanceof r)&&h.added.push([t+o-s.mLength,t+o]),o>=i){e.set(this.getPieceBuffer(s).subarray(0,s.mLength-o+i),o-s.mLength);break}e.set(this.getPieceBuffer(s),o-s.mLength)}return o!==i?{out:e.subarray(0,o),meta:h}:{out:e,meta:h}}get length(){let t=0;for(const i of this.pieces)t+=i.length;return t}save(){return this.render(0,this.length).out}getPieceBuffer(t){return n(t)?new Uint8Array(t.content):t instanceof a?this.original.subarray(t.mOffset,t.mOffset+t.mLength):this.added.subarray(t.mOffset,t.mOffset+t.mLength)}}const d=class{constructor(t){i(this,t),this.lineNumber=0,this.searchType="ascii",this.searchByteCount=1,this.searchEndian="big",this.searchInput="",this.searchResults=[],this.searchActive=!1,this.displayAscii=!0,this.displayHex=!0,this.displayBin=!1,this.maxLines=30,this.bytesPerLine=16,this.chunks=[],this.displayAsChunks=!1,this.asciiInline=!1,this.bytesPerGroup=4,this.bitsPerGroup=8,this.mode="select",this.editType="readonly",this.regionDepth=2,this.regions=[],this.scroll=t=>{t.preventDefault();let i=Number.isInteger(t.deltaY)?Math.ceil(t.deltaY/2):Math.ceil(t.deltaY/100);-0===i&&(i-=1),this.lineNumber+i<0?this.lineNumber=0:this.lineNumber+i>Math.floor(this.editController.length/this.bytesPerLine)-1?this.lineNumber=Math.floor(this.editController.length/this.bytesPerLine)-1:this.lineNumber+=i},this.hexLineChanged=s(this,"hexLineChanged",7),this.hexCursorChanged=s(this,"hexCursorChanged",7),this.hexSelectionChanged=s(this,"hexSelectionChanged",7),this.hexDataChanged=s(this,"hexDataChanged",7),this.hexLoaded=s(this,"hexLoaded",7)}componentWillLoad(){this.file=new Uint8Array(1024).map((t,i)=>i%256),this.editController=new c(this),this.regionScaleWidth=28,this.regionScaleHeight=17}componentDidLoad(){this.hexLoaded.emit(this.editController)}async acceptFile(t){console.log(t),this.fileMetadata=t;const i=new FileReader;i.readAsArrayBuffer(t),i.onload=t=>{this.file=new Uint8Array(t.target.result),this.editController=new c(this)}}async saveFile(){if(null!=this.file)return this.editController.save()}async setLineNumber(t){this.lineNumber=t<0?0:t,this.hexLineChanged.emit(this.lineNumber)}async setCursorPosition(t,i){if(i){let s=0;i>=8&&(s=Math.floor(i/8)),this.cursor=t+s,this.bit=i%8}else this.cursor=t;this.hexCursorChanged.emit({byte:this.cursor,bit:this.bit})}async setSelection(t){this.selection=Object.assign(Object.assign({},this.selection),t),this.hexSelectionChanged.emit(this.selection)}async getChunk(t,i){return this.editController.render(t,i)}async getFileMetadata(){return this.fileMetadata}async executeSearch(t,i,s,e,n){let h;try{h=this.formatSearch(t,i,e,n)}catch(o){console.log(o)}return this.searchResults=this.editController.find(h,s?s[0]:0,s?s[1]-s[0]:void 0),this.searchResults}buildHexView(){const{lineNumber:t,maxLines:i,bytesPerLine:s,bytesPerGroup:n,bitsPerGroup:h,asciiInline:o}=this,a=t*s,r=this.editController.render(a,i*s),l=r.out,c=r.meta.added,d=[];for(let e=0;e<i;e++)d.push(l.subarray(e*s,(e+1)*s));const u=[],p=[],b=[];let f=-1;for(const[L,$]of d.entries()){if(0===$.length)break;const t=a+L*s,i=[],r=[],l=[];let d="•";for(const[s,a]of[...$.values()].entries()){let u;d=/\w|[!@#$%^&*()_+=\]\\:;"'>.<,/?]/.test(String.fromCharCode(a))?String.fromCharCode(a):"•",u=o&&/\w/.test(d)?"."+d:a.toString(16).toUpperCase().padStart(2,"0");const p=[];u.startsWith(".")&&p.push("ASCII"),s%n==n-1&&p.push("padByte"),Math.floor(this.cursor)===t+s&&(p.push("cursor"),f=L),this.selection&&this.selection.start<=t+s&&t+s<=this.selection.end&&p.push("selected");for(const[i,e]of c)if(i<=t+s&&t+s<e){p.push("added");break}let b=a.toString(2).padStart(8,"0").split(""),g=[];if(this.displayBin)for(let i=0;i<b.length;i++){let n="";(8*s+i)%h==h-1&&(n+="padBit"),!p.includes("cursor")||this.bit!==i&&-1!==this.bit||(n+=" cursor"),p.includes("selected")&&(this.selection.start===this.selection.end?i>=this.selection.startBit&&i<=this.selection.endBit&&(n+=" selected"):this.selection.start===t+s?i>=this.selection.startBit&&(n+=" selected"):this.selection.end===t+s?(i<=this.selection.endBit||-1===this.selection.endBit)&&(n+=" selected"):n+=" selected"),g.push(e("span",{"data-cursor-idx":i,class:n},b[i]))}this.displayBin&&i.push(e("span",{"data-cursor-idx":t+s,class:"binGroup"+(p.includes("added")?" added":"")},g)),this.displayAscii&&r.push(e("span",{"data-cursor-idx":t+s,class:p.join(" ")},d)),this.displayHex&&l.push(e("span",{"data-cursor-idx":t+s,class:p.join(" ")},u))}this.displayBin&&u.push(e("div",{class:"binLine"+(f===L?" selected":"")},i)),p.push(this.displayHex?e("div",{class:"hexLine"+(f===L?" selected":"")},l):{}),this.displayAscii&&b.push(e("div",{class:"charLine"+(f===L?" selected":"")},r))}for(;p.length<i;)u.push(e("div",{class:"binLine",style:{pointerEvents:"none"}},e("span",null,"-"))),p.push(e("div",{class:"hexLine",style:{pointerEvents:"none"}},e("span",null,"-"))),b.push(e("div",{class:"charLine",style:{pointerEvents:"none"}},e("span",null,"-")));const g=[];for(let L=0;L<i;L++)g.push(e("div",{class:"lineLabel"+(f===L?" selected":""),style:{pointerEvents:"none"}},"0x"+(a+L*s).toString(16).padStart(8," ")));const x=[],v=[],w=[],y=(i,s=0,n)=>{if(i.end<a||i.start>a+this.maxLines*this.bytesPerLine){if(i.subRegions&&s+1!==this.regionDepth)for(const[t,e]of i.subRegions.entries())y(e,s+1,t);return}if(s===this.regionDepth)return;const h=i.start%this.bytesPerLine,o=i.end%this.bytesPerLine,r=Math.floor((i.end-i.start+h)/this.bytesPerLine),l=Math.floor(i.start/this.bytesPerLine)-t,c={0:["#88F","#BBF"],1:["#F88","#FBB"],2:["#8D8","#BDB"]},d=(t,a)=>e("polygon",{onMouseMove:t=>{void 0===this.canUpdateMouseMove&&(this.canUpdateMouseMove=!0),this.canUpdateMouseMove&&(this.canUpdateMouseMove=!1,document.documentElement.style.setProperty("--mouse-x",`${t.clientX}`),document.documentElement.style.setProperty("--mouse-y",`${t.clientY}`),document.getElementById("tooltip").setAttribute("active","true"),document.getElementById("tooltip").setAttribute("complex",`${JSON.stringify(Object.assign(Object.assign({},i),{subRegions:i.subRegions?i.subRegions.map(t=>t.name):null}))}`),setTimeout(()=>{this.canUpdateMouseMove=!0},50))},onMouseLeave:()=>document.getElementById("tooltip").setAttribute("active","false"),class:"region",points:`\n              0,${(1+l)*a}\n              ${h*t},${(1+l)*a}\n              ${h*t},${l*a}\n              ${this.bytesPerLine*t},${l*a}\n              ${this.bytesPerLine*t},${(r+l)*a}\n              ${o*t},${(r+l)*a}\n              ${o*t},${(r+l+1)*a}\n              0,${(r+1+l)*a}\n            `,fill:i.color||c[s%3][n%2],stroke:"none"});if(x.push(d(112,this.regionScaleHeight)),v.push(d(this.regionScaleWidth,this.regionScaleHeight)),w.push(d(10,this.regionScaleHeight)),i.subRegions&&s+1!==this.regionDepth)for(const[t,e]of i.subRegions.entries())y(e,s+1,t)};for(const[e,L]of this.regions.entries())y(L,0,e);return{lineViews:p,charViews:b,binViews:u,lineLabels:g,binRegions:e("svg",{viewBox:`0 0 ${14*this.bytesPerLine*8} ${this.maxLines*this.regionScaleHeight}`,width:`${14*this.bytesPerLine*8}`,height:`${this.maxLines*this.regionScaleHeight}`},x),hexRegions:e("svg",{viewBox:`0 0 ${this.bytesPerLine*this.regionScaleWidth} ${this.maxLines*this.regionScaleHeight}`,width:`${this.bytesPerLine*this.regionScaleWidth}`,height:`${this.maxLines*this.regionScaleHeight}`},v),asciiRegions:e("svg",{viewBox:`0 0 ${10*this.bytesPerLine} ${this.maxLines*this.regionScaleHeight}`,width:`${10*this.bytesPerLine}`,height:`${this.maxLines*this.regionScaleHeight}`},w)}}buildChunks(){const{lineNumber:t,maxLines:i,bytesPerLine:s,bytesPerGroup:n,chunks:h,bitsPerGroup:o,asciiInline:a}=this,r={chunk:0,chunkLineOffs:0};for(let e=t,x=0;e>0&&x<h.length;e--,x++){const t=Math.floor((h[x].end-h[x].start)/s)+1;e-=t,e>0?r.chunk+=1:r.chunkLineOffs=t- -1*e}const l=[];for(let e=r.chunk,x=0;x<i&&e<h.length;e++){const t=x,n=h[e];let o=n.start;if(e==r.chunk&&(o+=s*r.chunkLineOffs),n.end-o<=0)continue;x+=Math.ceil((n.end-o)/s);let a=n.end;x>i&&(a-=(x-i)*s);const c=this.editController.render(o,a-o).out;l.push({start:o,data:c,startLine:t,endLine:x});for(let i=0;i<1;i++)x+=1,l.push({data:new Uint8Array(0),start:-1,startLine:-1,endLine:-1})}l.pop();let c=[],d=[],u=[],p=[];const b=[],f=[],g=[];for(const{start:x,data:v,startLine:w}of l){if(-1===x){p.push(e("div",{class:"separator",style:{pointerEvents:"none"}},"NA")),c.push(e("div",{class:"separator",style:{pointerEvents:"none"}},"NA")),d.push(e("div",{class:"separator",style:{pointerEvents:"none"}},"NA")),u.push(e("div",{class:"separator",style:{pointerEvents:"none"}},"NA"));continue}for(let i=0;i<v.length;i+=s){const t=x+i,h=[],r=[],l=[];let b=-1;for(let c=i;c<i+s&&c<v.length;c++){const s=v[c],d=x+c;let u,p;p=/\w|[!@#$%^&*()_+=\]\\:;"'>.<,/?]/.test(String.fromCharCode(s))?String.fromCharCode(s):"•",u=a&&/\w/.test(p)?"."+p:s.toString(16).toUpperCase().padStart(2,"0");const f=[];u.startsWith(".")&&f.push("ASCII"),(c-i)%n==n-1&&f.push("padByte"),Math.floor(this.cursor)===d&&(f.push("cursor"),b=t),this.selection&&this.selection.start<=d&&d<=this.selection.end&&f.push("selected");let g=s.toString(2).padStart(8,"0").split(""),w=[];if(this.displayBin)for(let t=0;t<g.length;t++){let i="";(8*d+t)%o==o-1&&(i+="padBit"),!f.includes("cursor")||this.bit!==t&&-1!==this.bit||(i+=" cursor"),f.includes("selected")&&(this.selection.start===this.selection.end?t>=this.selection.startBit&&t<=this.selection.endBit&&(i+=" selected"):this.selection.start==d?t>=this.selection.startBit&&(i+=" selected"):this.selection.end==d?(t<=this.selection.endBit||-1===this.selection.endBit)&&(i+=" selected"):i+=" selected"),w.push(e("span",{"data-cursor-idx":t,class:i},g[t]))}this.displayBin&&l.push(e("span",{"data-cursor-idx":d,class:"binGroup"+(f.includes("added")?" added":"")},w)),this.displayAscii&&r.push(e("span",{"data-cursor-idx":d,class:f.join(" ")},p)),this.displayHex&&h.push(e("span",{"data-cursor-idx":d,class:f.join(" ")},u))}p.push(e("div",{class:"lineLabel"+(b===t?" selected":""),style:{pointerEvents:"none"}},"0x"+t.toString(16).padStart(8," "))),this.displayBin&&u.push(e("div",{class:"binLine"+(b===t?" selected":"")},l)),c.push(this.displayHex?e("div",{class:"hexLine"+(b===t?" selected":"")},h):{}),this.displayAscii&&d.push(e("div",{class:"charLine"+(b===t?" selected":"")},r))}const t=(i,n=0,h)=>{const o=Math.floor(v.length/s),a=x%s;if(i.end<x||i.start>x+o*s){if(i.subRegions&&n+1!==this.regionDepth)for(const[s,e]of i.subRegions.entries())t(e,n+1,s);return}if(n===this.regionDepth)return;const r=Math.max(i.start,x),l=Math.min(i.end,x+v.length),c=(r-a)%s,d=(l-a)%s,u=Math.floor((l-r+c)/s),p=Math.floor((r-x)/s)+w,y={0:["#88F","#BBF"],1:["#F88","#FBB"],2:["#8D8","#BDB"]},L=(t,s)=>e("polygon",{onMouseMove:t=>{void 0===this.canUpdateMouseMove&&(this.canUpdateMouseMove=!0),this.canUpdateMouseMove&&(this.canUpdateMouseMove=!1,document.documentElement.style.setProperty("--mouse-x",`${t.clientX}`),document.documentElement.style.setProperty("--mouse-y",`${t.clientY}`),document.getElementById("tooltip").setAttribute("active","true"),document.getElementById("tooltip").setAttribute("complex",`${JSON.stringify(Object.assign(Object.assign({},i),{subRegions:i.subRegions?i.subRegions.map(t=>t.name):null}))}`),setTimeout(()=>{this.canUpdateMouseMove=!0},50))},onMouseLeave:()=>document.getElementById("tooltip").setAttribute("active","false"),class:"region",points:`\n              0,${(1+p)*s}\n              ${c*t},${(1+p)*s}\n              ${c*t},${p*s}\n              ${this.bytesPerLine*t},${p*s}\n              ${this.bytesPerLine*t},${(u+p)*s}\n              ${d*t},${(u+p)*s}\n              ${d*t},${(u+p+1)*s}\n              0,${(u+1+p)*s}\n            `,fill:i.color||y[n%3][h%2],stroke:"none"});if(b.push(L(112,this.regionScaleHeight)),f.push(L(this.regionScaleWidth,this.regionScaleHeight)),g.push(L(10,this.regionScaleHeight)),i.subRegions&&n+1!==this.regionDepth)for(const[s,e]of i.subRegions.entries())t(e,n+1,s)};for(const[i,s]of this.regions.entries())t(s,0,i)}for(;c.length<i;)p.push(e("div",{class:"separator"},e("span",null,"-"))),u.push(e("div",{class:"separator"},e("span",null,"-"))),c.push(e("div",{class:"separator"},e("span",null,"-"))),d.push(e("div",{class:"separator"},e("span",null,"-")));return{lineViews:c,charViews:d,binViews:u,lineLabels:p,binRegions:e("svg",{viewBox:`0 0 ${14*this.bytesPerLine*8} ${this.maxLines*this.regionScaleHeight}`,width:`${14*this.bytesPerLine*8}`,height:`${this.maxLines*this.regionScaleHeight}`},b),hexRegions:e("svg",{viewBox:`0 0 ${this.bytesPerLine*this.regionScaleWidth} ${this.maxLines*this.regionScaleHeight}`,width:`${this.bytesPerLine*this.regionScaleWidth}`,height:`${this.maxLines*this.regionScaleHeight}`},f),asciiRegions:e("svg",{viewBox:`0 0 ${10*this.bytesPerLine} ${this.maxLines*this.regionScaleHeight}`,width:`${10*this.bytesPerLine}`,height:`${this.maxLines*this.regionScaleHeight}`},g)}}edit(i){if("hex"!==i.target.className)return;const s={ArrowDown:()=>{this.setCursorPosition(this.cursor+this.bytesPerLine>this.editController.length?this.editController.length:this.cursor+this.bytesPerLine)},ArrowUp:()=>{this.setCursorPosition(this.cursor-this.bytesPerLine<0?0:this.cursor-this.bytesPerLine)},ArrowRight:()=>{this.setCursorPosition(this.cursor+1>this.editController.length?this.editController.length:this.cursor+1)},ArrowLeft:()=>{this.setCursorPosition(this.cursor-1<0?0:this.cursor-1)}};if(s[i.key])i.preventDefault(),this.editController.inProgress&&this.editController.commit(),s[i.key](),this.cursor>(this.lineNumber+this.maxLines)*this.bytesPerLine-1?this.setLineNumber(Math.floor(this.cursor/this.bytesPerLine)-this.maxLines+1):this.cursor<this.lineNumber*this.bytesPerLine&&this.setLineNumber(Math.floor(this.cursor/this.bytesPerLine)),this.setSelection(i.shiftKey?this.selection.start>this.cursor?{start:this.cursor}:{end:this.cursor}:{start:this.cursor,end:this.cursor});else if((i.ctrlKey||i.metaKey)&&"f"===i.key)i.preventDefault(),this.searchActive=!this.searchActive,t(this);else{if("readonly"===this.editType)return;i.preventDefault(),this.editController.buildEdit(i)}}formatSearch(t,i,s,e){if(0===t.length)throw new Error("LEN0: there needs to be something to search for...");switch(i){case"integer":const i=parseInt("0x"+new Array(s+1).join("FF"),16);let n=parseInt(t);Math.abs(n)>i&&(n=i*Math.sign(n));const h=n.toString(16).padStart(2*s,"0").match(/.{2}/g).map(t=>parseInt(t,16));return"little"===e&&h.reverse(),h;case"float":return function(t,i,s){let e;switch(i){case 1:e=4;break;case 2:e=5;break;case 4:e=8;break;case 8:e=11;break;default:return}let n=t<0?1:0;t=Math.abs(t);let h=Math.floor(t),o=t-h,a=8*i-1-e-h.toString(2).length+3,r="";for(let b=0;b<a;b++)o*=2,r+=Math.floor(o),o>=1&&(o-=1);let l=r.substring(r.length-2);r=r.substring(0,r.length-2),console.log(r,l),"1"===l.charAt(0)&&(r=(parseInt(r,2)+1).toString(2),/^10+$/.test(r)&&(h+=1,r=""));let c=h.toString(2).length-1+(Math.pow(2,e)/2-1);0===h&&(c=""===r?0:Math.pow(2,e)/2-1-r.match(/^(0*)/)[0].length-1);let d=c.toString(2).padStart(e,"0"),u=n+d+(h.toString(2)+r).padEnd(8*i-1-e-h.toString(2).length,"0").substring(1);console.log(n,d,(h.toString(2)+r).padEnd(8*i-1-e-h.toString(2).length,"0").substring(1));let p=[];for(let b=0;b<8*i;b+=8)p.push(parseInt(u.substring(b,b+8),2));return"little"===s&&p.reverse(),0===t&&p.fill(0),p}(parseFloat(t),s,e);case"byte":if(/[^0-9a-f ,|;]/gi.test(t))throw new Error("UC: Unexpected Character (must be exclusively 0-9 and a-f)");return t.replace(/[ ,|;]/gi,"").match(/.{2}/g).map(t=>parseInt(t,16));case"ascii":default:return t.split("").map(t=>t.charCodeAt(0))}}async findInSelection(){const t=this.selection?this.selection.end-this.selection.start:0;this.searchResults=await this.executeSearch(this.searchInput,this.searchType,0===t?void 0:[this.selection.start,this.selection.end],this.searchByteCount,this.searchEndian)}showHex(){const{lineViews:t,binViews:i,charViews:s,lineLabels:n,binRegions:h,hexRegions:o,asciiRegions:a}=this.buildHexView();let r,l;try{r=this.formatSearch(this.searchInput,this.searchType,this.searchByteCount,this.searchEndian).map(t=>t.toString(16).padStart(2,"0")).join(", ")}catch(c){r=c.message.startsWith("LEN0")?"":c.message}if(this.searchActive){const t=t=>{let i=parseInt(t);this.setCursorPosition(i),this.setSelection({start:i,end:i+(["integer","float"].includes(this.searchType)?this.searchByteCount:this.searchInput.length)-1,startBit:-1,endBit:-1}),this.setLineNumber(Math.floor(i/this.bytesPerLine)-this.maxLines/2)};l=e("select",{onChange:i=>t(i.target.value)},this.searchResults.map(t=>e("option",{value:t},`0x${t.toString(16)}`)))}return e("div",{class:"hex",onMouseEnter:t=>this._toggleScrollListener(t),onMouseLeave:t=>this._toggleScrollListener(t),onMouseDown:t=>this.beginSelection(t),onMouseUp:t=>this.endSelection(t),tabindex:"0",onKeyDown:t=>this.edit(t)},e("div",{id:"MEASURE",class:"hex",style:{position:"absolute",visibility:"hidden",padding:"0 5px"}},"AB"),e("div",{class:"lineLabels"},n),this.displayBin?e("div",{class:"binView"},e("div",{class:"highlight",style:{position:"absolute",top:"0",display:"noregion"===this.mode?"none":"block",zIndex:"region"===this.mode?"3":"0"}},h),e("div",{class:"main"},i)):null,this.displayHex?e("div",{class:"hexView"},e("div",{class:"highlight",style:{position:"absolute",top:"0",display:"noregion"===this.mode?"none":"block",zIndex:"region"===this.mode?"3":"0"}},o),e("div",{class:"main"},t)):null,this.displayAscii?e("div",{class:"asciiView"},e("div",{class:"highlight",style:{position:"absolute",top:"0",display:"noregion"===this.mode?"none":"block",zIndex:"region"===this.mode?"3":"0"}},a),e("div",{class:"main"},s)):null,this.searchActive?e("div",{class:"find"},"search:",e("input",{type:"text",onChange:t=>this.searchInput=t.target.value}),e("select",{onChange:t=>this.searchType=t.target.value},e("option",{value:"ascii"},"ASCII string"),e("option",{value:"byte"},"bytes"),e("option",{value:"integer"},"integer"),e("option",{value:"float"},"float")),["integer","float"].includes(this.searchType)?[e("select",{onChange:t=>this.searchByteCount=parseInt(t.target.value)},e("option",{value:"1"},"1 byte"),e("option",{value:"2"},"2 bytes"),e("option",{value:"4"},"4 bytes"),e("option",{value:"8"},"8 bytes")),e("select",{onChange:t=>this.searchEndian=t.target.value},e("option",{value:"big"},"big endian"),e("option",{value:"little"},"little endian"))]:null,e("button",{onClick:()=>this.findInSelection()},"search"),e("br",null),"hex: ",r," | results: ",l):null)}showChunks(){const{lineViews:t,binViews:i,charViews:s,lineLabels:n,binRegions:h,hexRegions:o,asciiRegions:a}=this.buildChunks();return e("div",{class:"hex",onMouseEnter:t=>this._toggleScrollListener(t),onMouseLeave:t=>this._toggleScrollListener(t),onMouseDown:t=>this.beginSelection(t),onMouseUp:t=>this.endSelection(t),tabindex:"0",onKeyDown:t=>this.edit(t)},e("div",{id:"MEASURE",class:"hex",style:{position:"absolute",visibility:"hidden",padding:"0 5px"}},"AB"),e("div",{class:"lineLabels"},n),this.displayBin?e("div",{class:"binView"},e("div",{class:"highlight",style:{position:"absolute",top:"0",display:"noregion"===this.mode?"none":"block",zIndex:"region"===this.mode?"3":"0"}},h),e("div",{class:"main"},i)):null,this.displayHex?e("div",{class:"hexView"},e("div",{class:"highlight",style:{position:"absolute",top:"0",display:"noregion"===this.mode?"none":"block",zIndex:"region"===this.mode?"3":"0"}},o),e("div",{class:"main"},t)):null,this.displayAscii?e("div",{class:"asciiView"},e("div",{class:"highlight",style:{position:"absolute",top:"0",display:"noregion"===this.mode?"none":"block",zIndex:"region"===this.mode?"3":"0"}},a),e("div",{class:"main"},s)):null)}beginSelection(t){if("HEX-SCROLLBAR"===t.target.id)return;const i=t.target.parentElement.className;if(i.includes("charLine"))this.editingMode="ascii";else if(i.includes("hexLine"))this.editingMode="byte";else{if(!i.includes("binGroup"))return;this.editingMode="bit"}this.tempSelection="bit"===this.editingMode?{byte:parseInt(t.composedPath()[1].getAttribute("data-cursor-idx")),bit:parseInt(t.target.getAttribute("data-cursor-idx"))}:{byte:parseInt(t.target.getAttribute("data-cursor-idx")),bit:-1}}endSelection(t){if(null===this.tempSelection)return;const i=t.target.parentElement.className;if(i.includes("charLine"))this.editingMode="ascii";else if(i.includes("hexLine"))this.editingMode="byte";else{if(!i.includes("binGroup"))return;this.editingMode="bit"}let s;s="bit"===this.editingMode?{byte:parseInt(t.composedPath()[1].getAttribute("data-cursor-idx")),bit:parseInt(t.target.getAttribute("data-cursor-idx"))}:{byte:parseInt(t.target.getAttribute("data-cursor-idx")),bit:-1},this.setSelection(this.tempSelection.byte+this.tempSelection.bit/10>s.byte+s.bit/10?{start:s.byte,startBit:s.bit,end:this.tempSelection.byte,endBit:this.tempSelection.bit}:{start:this.tempSelection.byte,startBit:this.tempSelection.bit,end:s.byte,endBit:s.bit}),this.tempSelection=null,this.cursor=s.byte,this.bit=s.bit,this.hexCursorChanged.emit({byte:this.cursor,bit:this.bit}),this.hexSelectionChanged.emit(this.selection),this.editController.isInProgress&&(this.editController.commit(),this.hexDataChanged.emit())}render(){let t;return t=this.displayAsChunks?this.showChunks():this.showHex(),e("div",{class:"fudgedit-container"},t)}_toggleScrollListener(t){"mouseenter"===t.type?t.target.addEventListener("wheel",this.scroll,{passive:!1}):t.target.removeEventListener("wheel",this.scroll,!1)}};d.style=".fudgedit-container{overflow:hidden;position:relative;min-height:100%;color:black}.hex{font-family:'Sourcecode Pro', Courier, monospace;font-size:15px;height:100%;outline:none}.binView,.hexView,.asciiView,.lineLabels{display:inline-block;padding:0 10px;white-space:pre;position:relative}.binLine span,.hexLine span,.charLine span{position:relative;height:17px;display:inline-block}.lineLabel{height:17px}.binLine>span>span{position:relative;width:14px;padding:0 3px;-webkit-box-sizing:border-box;box-sizing:border-box}.binLine span{padding:0 0px}.binLine>span>span.padBit::after{background-color:#0006;position:absolute;width:1px;height:100%;left:calc(100% + 0.5px);content:''}.binLine>span>span:last-child.padBit::after{width:2px;left:100%}.binLine>span:last-child>span:last-child.padBit::after{display:none}.charLine span{width:10px}.hexLine span{position:relative;padding:0 5px;width:28px;-webkit-box-sizing:border-box;box-sizing:border-box}.hexLine span:not(:last-child).padByte::after{background-color:#0006;position:absolute;width:2px;height:100%;left:calc(100% - 1px);content:''}.binLine span,.hexLine span{cursor:default;-webkit-user-select:none;-moz-user-select:none;-ms-user-select:none;user-select:none}.binLine span.selected,.charLine span.selected,.hexLine span.selected{background-color:#8888FF80}.binLine span.cursor,.charLine span.cursor,.hexLine span.cursor{background-color:#008;color:#FFF}.binLine>span.added,.charLine span.added,.hexLine span.added{color:red}.binLine>span>span:hover,.charLine span:hover,.hexLine span:hover{background-color:#000;color:#FFF}.hexLine span.ASCII{font-weight:bold}.binLine:nth-child(2n-1),.hexLine:nth-child(2n-1),.charLine:nth-child(2n-1),.lineLabel:nth-child(2n-1){background-color:#EEFFFF}.binLine.selected,.charLine.selected,.hexLine.selected,.lineLabel.selected{background-color:#FFA}.separator{opacity:0;pointer-events:none}.region{opacity:1}.highlight{mix-blend-mode:multiply}.region{position:relative}.highlight:hover .region:not(:hover){fill:#0003}.find{width:calc(100% - 20px);height:50px;position:absolute;bottom:0;left:0;right:0;margin:auto;background-color:#fff;z-index:4}";const u=class{constructor(t){i(this,t),this.active=!1}render(){if(!this.active)return;const t=[];if(this.data){let i="string"==typeof this.data?JSON.parse(this.data):this.data;i.name&&t.push(e("span",null,`name: ${i.name}`),e("br",null)),t.push(e("span",null,`size: ${i.end-i.start} [0x${i.start.toString(16)} - 0x${i.end.toString(16)}]`),e("br",null));for(const[s,n]of Object.entries(i))["name","subRegions","start","end"].includes(s)||null!==n&&t.push(e("span",null,s,": ",n),e("br",null))}else t.push(e("span",null,this.simpleText?this.simpleText:"placeholder"));return t}};u.style="fudge-hex-tooltip{position:fixed;display:none;-webkit-box-sizing:border-box;box-sizing:border-box;font-size:14px;max-width:400px;padding:5px;border-radius:2px;background-color:#000;color:white;z-index:1000;pointer-events:none}fudge-hex-tooltip[active=true]{display:block;left:calc(var(--mouse-x) * 1px);top:calc(var(--mouse-y) * 1px);-webkit-transition:.2s left ease, .2s top ease;transition:.2s left ease, .2s top ease}";export{d as fudge_hex_editor,u as fudge_hex_tooltip}