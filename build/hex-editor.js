!function(e,t,r,i,n,o,s,c,a,u,d,l,h,p){for(d=e.HexEditor=e.HexEditor||{},(l=t.createElement("style")).innerHTML="hex-editor,my-tooltip{visibility:hidden}.hydrated{visibility:inherit}",l.setAttribute("data-styles",""),h=t.head.querySelector("meta[charset]"),t.head.insertBefore(l,h?h.nextSibling:t.head.firstChild),function(e,t,r){(e["s-apps"]=e["s-apps"]||[]).push("HexEditor"),r.componentOnReady||(r.componentOnReady=function(){var t=this;function r(r){if(t.nodeName.indexOf("-")>0){for(var i=e["s-apps"],n=0,o=0;o<i.length;o++)if(e[i[o]].componentOnReady){if(e[i[o]].componentOnReady(t,r))return;n++}if(n<i.length)return void(e["s-cr"]=e["s-cr"]||[]).push([t,r])}r(null)}return e.Promise?new e.Promise(r):{then:r}})}(e,0,u),n=n||d.resourcesUrl,l=(h=t.querySelectorAll("script")).length-1;l>=0&&!(p=h[l]).src&&!p.hasAttribute("data-resources-url");l--);h=p.getAttribute("data-resources-url"),!n&&h&&(n=h),!n&&p.src&&(n=(h=p.src.split("/").slice(0,-1)).join("/")+(h.length?"/":"")+"hex-editor/"),l=t.createElement("script"),function(e,t,r,i){return!(t.search.indexOf("core=esm")>0)&&(!(!(t.search.indexOf("core=es5")>0||"file:"===t.protocol)&&e.customElements&&e.customElements.define&&e.fetch&&e.CSS&&e.CSS.supports&&e.CSS.supports("color","var(--c)")&&"noModule"in r)||function(e){try{return new Function('import("")'),!1}catch(e){}return!0}())}(e,e.location,l)?l.src=n+"hex-editor.sktpqyto.js":(l.src=n+"hex-editor.acmibmh9.js",l.setAttribute("type","module"),l.setAttribute("crossorigin",!0)),l.setAttribute("data-resources-url",n),l.setAttribute("data-namespace","hex-editor"),t.head.appendChild(l)}(window,document,0,0,0,0,0,0,0,HTMLElement.prototype);