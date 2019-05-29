const e=window.HexEditor.h;function t(e){return!(!e||!e.content)}class s{constructor(e){this.parent=e,this.added=new Uint8Array,this.pieces=[],this.chunk="",this.original=e.file,this.pieces=[{offset:0,length:this.original.length,source:"origin"}]}initEdit(e,t){if(this.inProgress={offset:e,type:t,content:[],index:-1,get length(){return this.content.length}},"insert"===t){let t,s,i,n=0;for(const[o,r]of this.pieces.entries())if((n+=r.length)>=e){t=r.length-n+e,s=o,i=r;break}this.inProgress.index=s+1,this.pieces.splice(s,1,...[{offset:i.offset,length:t,source:i.source},this.inProgress,{offset:i.offset+t,length:i.length-t,source:i.source}])}else{let t,s,i,n=0;for(const[o,r]of this.pieces.entries())if((n+=r.length)>=e){t=r.length-n+e,s=o,i=r;break}this.inProgress.index=s+1,this.pieces.splice(s,1,...[{offset:i.offset,length:t,source:i.source},this.inProgress,{offset:i.offset+t,length:i.length-t,source:i.source}])}}buildEdit(e){if(/^[a-fA-F0-9]$/.test(e.key)&&(this.chunk+=e.key,2===this.chunk.length)){this.inProgress.content.push(parseInt(this.chunk,16)),this.chunk="",this.parent.setCursorPosition(this.parent.cursor+1);let e=this.pieces.indexOf(this.inProgress);if("overwrite"===this.inProgress.type&&e!==this.pieces.length-1){const t=this.pieces[e+1];t.offset+=1,t.length-=1,0===t.length&&this.pieces.splice(e+1,1)}}}commit(){let e=new Uint8Array(this.added.length+this.inProgress.content.length);e.set(this.added,0),e.set(this.inProgress.content,this.added.length),this.pieces[this.inProgress.index]={offset:this.added.length,length:this.inProgress.length,source:"added"},this.added=e,this.inProgress=null,this.chunk=""}render(e,s){let i,n=new Uint8Array(s),o={added:[]},r=0,h=0;for(const[t,s]of this.pieces.entries())if((r+=s.length)>=e){i=s.length-r+e,h=t;break}(t(this.pieces[h])||"added"===this.pieces[h].source)&&o.added.push([e-i,e-i+this.pieces[h].length]);let l=this.getPieceBuffer(this.pieces[h]).subarray(i,i+s);r=l.length,n.set(l,0);for(let i=h+1;i<this.pieces.length;i++){let h=this.pieces[i];if(r+=h.length,(t(h)||"added"===h.source)&&o.added.push([e+r-h.length,e+r]),r>=s){n.set(this.getPieceBuffer(h).subarray(0,h.length-r+s),r-h.length);break}n.set(this.getPieceBuffer(h),r-h.length)}return r!==s?{out:n.subarray(0,r),meta:o}:{out:n,meta:o}}get length(){let e=0;for(const t of this.pieces)e+=t.length;return e}rollback(){}save(){return this.render(0,this.length).out}getPieceBuffer(e){return t(e)?new Uint8Array(e.content):"origin"===e.source?this.original.subarray(e.offset,e.offset+e.length):this.added.subarray(e.offset,e.offset+e.length)}}class i{constructor(){this.file=new Uint8Array(32),this.lineNumber=0,this.maxLines=30,this.bytesPerLine=16,this.bytesUntilForcedLine=0,this.asciiInline=!1,this.bytesPerGroup=4,this.mode="edit",this.editType="overwrite",this.regionDepth=2,this.regions=[],this.scroll=(e=>{e.preventDefault();let t=Number.isInteger(e.deltaY)?Math.ceil(e.deltaY/2):Math.ceil(e.deltaY/100);-0===t&&(t-=1),this.lineNumber+t<0?this.lineNumber=0:this.lineNumber+t>Math.floor(this.editController.length/this.bytesPerLine)-1?this.lineNumber=Math.floor(this.editController.length/this.bytesPerLine)-1:this.lineNumber+=t})}componentWillLoad(){this.editController=new s(this)}async acceptFile(e){console.log(e),this.fileMetadata=e;const t=new FileReader;t.readAsArrayBuffer(e),t.onload=(e=>{this.file=new Uint8Array(e.target.result),this.editController=new s(this)})}async saveFile(){if(null!=this.file)return this.editController.save()}async setLineNumber(e){this.lineNumber=e,this.hexLineChanged.emit(e)}async setCursorPosition(e){this.cursor=e}async setSelection(e){this.selection=Object.assign({},this.selection,e)}buildHexView(){const{lineNumber:t,maxLines:s,bytesPerLine:i,bytesPerGroup:n,asciiInline:o}=this,r=t*i,h=this.editController.render(r,s*i),l=h.out,a=h.meta.added,c=[];for(let e=0;e<s;e++)c.push(l.subarray(e*i,(e+1)*i));const d=[],u=[];for(const[t,s]of c.entries()){const h=r+t*i,l=[],c=[];let g="•",p=!1;if(0===s.length)break;for(const[t,i]of[...s.values()].entries()){let s;g=/\w|[!@#$%^&*()_+=\]\\:;"'>.<,\/?]/.test(String.fromCharCode(i))?String.fromCharCode(i):"•",s=o&&/\w/.test(g)?"."+g:i.toString(16).toUpperCase().padStart(2,"0");const r=[];t%n==n-1&&r.push("padByte"),this.cursor===h+t&&(r.push("cursor"),p=!0),this.selection&&this.selection.start<=h+t&&h+t<=this.selection.end&&r.push("selected");for(const[e,s]of a)if(e<=h+t&&h+t<s){r.push("added");break}l.push(e("span",{class:r.join(" ")},g)),c.push(e("span",{class:r.join(" ")},s))}d.push(e("div",{class:"hexLine"+(p?" selected":"")},c)),u.push(e("div",{class:"charLine"+(p?" selected":"")},l))}for(;d.length<s;)d.push(e("div",{class:"hexLine",style:{pointerEvents:"none"}},e("span",null,"-"))),u.push(e("div",{class:"charLine",style:{pointerEvents:"none"}},e("span",null,"-")));const g=[];for(let t=0;t<s;t++)g.push(e("div",{class:"lineLabel",style:{pointerEvents:"none"}},"0x"+(r+t*i).toString(16).padStart(8," ")));const p=document.getElementById("MEASURE").clientWidth,m=document.getElementById("MEASURE").clientHeight,f=[],b=(s,i=0,n)=>{if((0!==i||!(s.end<r||s.start>r+this.maxLines*this.bytesPerLine))&&i!==this.regionDepth)if(s.subRegions&&i+1!==this.regionDepth)for(const[e,t]of s.subRegions.entries())b(t,i+1,e);else{const o=s.start%this.bytesPerLine,h=s.end%this.bytesPerLine,l=Math.floor((s.end-s.start+o)/this.bytesPerLine);if(s.end<r||s.start>r+this.maxLines*this.bytesPerLine)return;const a=Math.floor(s.start/this.bytesPerLine)-t,c={0:["#77F","#BBF"],1:["#F77","#FBB"],2:["#7D7","#BDB"]};f.push(e("polygon",{onmousemove:`\n            if (window.canUpdateMousemove === undefined) {\n              window.canUpdateMousemove = true;\n            }\n            if (window.canUpdateMousemove) {\n              window.canUpdateMousemove = false;\n              document.documentElement.style.setProperty('--mouse-x', event.clientX);\n              document.documentElement.style.setProperty('--mouse-y', event.clientY);\n              document.getElementById('tooltip').setAttribute('active', true)\n              document.getElementById('tooltip').setAttribute('complex', '${JSON.stringify(Object.assign({},s,{subRegions:s.subRegions?s.subRegions.map(e=>e.name):null}))}');\n\n              setTimeout(() => {window.canUpdateMousemove = true}, 50);\n            }\n          `,onmouseleave:"document.getElementById('tooltip').setAttribute('active', false)",class:"region",points:`\n            0,${(1+a)*m}\n            ${o*p},${(1+a)*m}\n            ${o*p},${a*m}\n            ${this.bytesPerLine*p},${a*m}\n            ${this.bytesPerLine*p},${(l+a)*m}\n            ${h*p},${(l+a)*m}\n            ${h*p},${(l+a+1)*m}\n            0,${(l+1+a)*m}\n            `,fill:s.color||c[i%3][n%2],stroke:"none"}))}};for(const[e,t]of this.regions.entries())b(t,0,e);return{lineViews:d,charViews:u,lineLabels:g,regionMarkers:e("svg",{viewbox:`0 0 ${this.bytesPerLine*p} ${this.maxLines*m}`,width:`${this.bytesPerLine*p}`,height:`${this.maxLines*m}`},f)}}edit(e){if("readonly"===this.editType)return;const t=this.editController;t.inProgress||t.initEdit(this.cursor,this.editType),t.buildEdit(e)}showHex(){const{lineViews:t,charViews:s,lineLabels:i,regionMarkers:n}=this.buildHexView();return e("div",{class:"hex",onMouseEnter:e=>this._toggleScrollListener(e),onMouseLeave:e=>this._toggleScrollListener(e),onMouseDown:e=>this.beginSelection(e),onMouseUp:e=>this.endSelection(e),tabindex:"0",onKeyDown:e=>this.edit(e)},e("div",{id:"MEASURE",style:{position:"absolute",visibility:"hidden",padding:"0 5px"}},"AB"),e("div",{class:"lineLabels"},i),e("div",{class:"hexView"},e("div",{class:"highlight",style:{position:"absolute",top:"0",display:"noregion"===this.mode?"none":"block",zIndex:"region"===this.mode?"3":"0"}},n),e("div",{class:"main"},t)),e("div",{class:"asciiView"},s))}beginSelection(e){this.tempSelection=this.lineNumber*this.bytesPerLine+[...e.composedPath()[2].children].indexOf(e.composedPath()[1])*this.bytesPerLine+[...e.composedPath()[1].children].indexOf(e.composedPath()[0])}endSelection(e){const t=this.lineNumber*this.bytesPerLine+[...e.composedPath()[2].children].indexOf(e.composedPath()[1])*this.bytesPerLine+[...e.composedPath()[1].children].indexOf(e.composedPath()[0]);this.selection=this.tempSelection>t?{start:t,end:this.tempSelection}:{start:this.tempSelection,end:t},this.tempSelection=null,this.cursor=t,this.hexCursorChanged.emit(this.cursor),this.hexSelectionChanged.emit(this.selection),this.editController.inProgress&&(this.editController.commit(),this.hexDataChanged.emit())}render(){return e("div",{class:"container"},this.showHex())}_toggleScrollListener(e){"mouseenter"===e.type?e.target.addEventListener("wheel",this.scroll,{passive:!1}):e.target.removeEventListener("wheel",this.scroll,!1)}static get is(){return"hex-editor"}static get properties(){return{acceptFile:{method:!0},asciiInline:{type:Boolean,attr:"ascii-inline"},bytesPerGroup:{type:Number,attr:"bytes-per-group"},bytesPerLine:{type:Number,attr:"bytes-per-line"},bytesUntilForcedLine:{type:Number,attr:"bytes-until-forced-line"},cursor:{state:!0},editType:{type:String,attr:"edit-type"},file:{state:!0},fileMetadata:{state:!0},lineNumber:{state:!0},maxLines:{type:Number,attr:"max-lines"},mode:{type:String,attr:"mode"},regionDepth:{type:Number,attr:"region-depth"},regions:{type:"Any",attr:"regions"},saveFile:{method:!0},selection:{state:!0},setCursorPosition:{method:!0},setLineNumber:{method:!0},setSelection:{method:!0}}}static get events(){return[{name:"hexLineChanged",method:"hexLineChanged",bubbles:!0,cancelable:!0,composed:!0},{name:"hexCursorChanged",method:"hexCursorChanged",bubbles:!0,cancelable:!0,composed:!0},{name:"hexSelectionChanged",method:"hexSelectionChanged",bubbles:!0,cancelable:!0,composed:!0},{name:"hexDataChanged",method:"hexDataChanged",bubbles:!0,cancelable:!0,composed:!0}]}static get style(){return".container{overflow:scroll;position:relative;width:100vw;min-height:100%}.hex{font-family:Sourcecode Pro,Courier,monospace;font-size:15px;height:100%;outline:none}.asciiView,.hexView,.lineLabels{display:inline-block;padding:0 10px;white-space:pre;position:relative}.charLine span,.hexLine span{position:relative;height:17px;display:inline-block}.lineLabel{height:17px}.hexLine span{position:relative;padding:0 5px}.hexLine span:not(:last-child).padByte:after{background-color:rgba(0,0,0,.4);position:absolute;width:2px;height:100%;left:calc(100% - 1px);content:\"\"}.hexLine span{cursor:default;-webkit-user-select:none;-moz-user-select:none;-ms-user-select:none;user-select:none}.charLine span.selected,.hexLine span.selected{background-color:rgba(136,136,255,.5)}.charLine span.cursor,.hexLine span.cursor{background-color:#008;color:#fff}.charLine span.added,.hexLine span.added{color:red}.hexLine span:hover{background-color:#000;color:#fff}.charLine:nth-child(2n-1),.hexLine:nth-child(2n-1),.lineLabel:nth-child(2n-1){background-color:#eff}.charLine.selected,.hexLine.selected{background-color:#ffa}.region{opacity:.8}.region:hover{opacity:.3;position:relative}"}}export{i as HexEditor};