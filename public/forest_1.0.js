var app=function(){"use strict";function t(){}const e=t=>t;function o(t){return t()}function n(){return Object.create(null)}function s(t){t.forEach(o)}function i(t){return"function"==typeof t}function a(t,e){return t!=t?e==e:t!==e||t&&"object"==typeof t||"function"==typeof t}const r="undefined"!=typeof window;let c=r?()=>window.performance.now():()=>Date.now(),l=r?t=>requestAnimationFrame(t):t;const d=new Set;let u,p=!1;function m(){d.forEach(t=>{t[0](c())||(d.delete(t),t[1]())}),(p=d.size>0)&&l(m)}function f(t){let e;return p||(p=!0,l(m)),{promise:new Promise(o=>{d.add(e=[t,o])}),abort(){d.delete(e)}}}function v(t,e){t.appendChild(e)}function b(t,e,o){t.insertBefore(e,o||null)}function h(t){t.parentNode.removeChild(t)}function g(t){return document.createElement(t)}function y(){return t=" ",document.createTextNode(t);var t}function x(t,e,o,n){return t.addEventListener(e,o,n),()=>t.removeEventListener(e,o,n)}function k(t,e,o){null==o?t.removeAttribute(e):t.setAttribute(e,o)}let $,_=0,w={};function Z(t,e,o,n,s,i,a,r=0){const c=16.666/n;let l="{\n";for(let t=0;t<=1;t+=c){const n=e+(o-e)*i(t);l+=100*t+`%{${a(n,1-n)}}\n`}const d=l+`100% {${a(o,1-o)}}\n}`,p=`__svelte_${function(t){let e=5381,o=t.length;for(;o--;)e=(e<<5)-e^t.charCodeAt(o);return e>>>0}(d)}_${r}`;if(!w[p]){if(!u){const t=g("style");document.head.appendChild(t),u=t.sheet}w[p]=!0,u.insertRule(`@keyframes ${p} ${d}`,u.cssRules.length)}const m=t.style.animation||"";return t.style.animation=`${m?`${m}, `:""}${p} ${n}ms linear ${s}ms 1 both`,_+=1,p}function z(t,e){t.style.animation=(t.style.animation||"").split(", ").filter(e?t=>t.indexOf(e)<0:t=>-1===t.indexOf("__svelte")).join(", "),e&&!--_&&l(()=>{if(_)return;let t=u.cssRules.length;for(;t--;)u.deleteRule(t);w={}})}function N(t){$=t}function M(){if(!$)throw new Error("Function called outside component initialization");return $}const C=[],U=[],B=[],I=[],W=Promise.resolve();let G,T=!1;function S(t){B.push(t)}function O(){const t=new Set;do{for(;C.length;){const t=C.shift();N(t),R(t.$$)}for(;U.length;)U.pop()();for(let e=0;e<B.length;e+=1){const o=B[e];t.has(o)||(o(),t.add(o))}B.length=0}while(C.length);for(;I.length;)I.pop()();T=!1}function R(t){t.fragment&&(t.update(t.dirty),s(t.before_update),t.fragment.p(t.dirty,t.ctx),t.dirty=null,t.after_update.forEach(S))}function j(){return G||(G=Promise.resolve()).then(()=>{G=null}),G}function Y(t,e,o){t.dispatchEvent(function(t,e){const o=document.createEvent("CustomEvent");return o.initCustomEvent(t,!1,!1,e),o}(`${e?"intro":"outro"}${o}`))}const E=new Set;let H;function X(t,e){t&&t.i&&(E.delete(t),t.i(e))}function F(t,e,o,n){if(t&&t.o){if(E.has(t))return;E.add(t),H.c.push(()=>{E.delete(t),n&&(o&&t.d(1),n())}),t.o(e)}}const A={duration:0};function q(t,e,n){const{fragment:a,on_mount:r,on_destroy:c,after_update:l}=t.$$;a.m(e,n),S(()=>{const e=r.map(o).filter(i);c?c.push(...e):s(e),t.$$.on_mount=[]}),l.forEach(S)}function V(t,e){t.$$.fragment&&(s(t.$$.on_destroy),t.$$.fragment.d(e),t.$$.on_destroy=t.$$.fragment=null,t.$$.ctx={})}function D(t,e){t.$$.dirty||(C.push(t),T||(T=!0,W.then(O)),t.$$.dirty=n()),t.$$.dirty[e]=!0}function P(e,o,i,a,r,c){const l=$;N(e);const d=o.props||{},u=e.$$={fragment:null,ctx:null,props:c,update:t,not_equal:r,bound:n(),on_mount:[],on_destroy:[],before_update:[],after_update:[],context:new Map(l?l.$$.context:[]),callbacks:n(),dirty:null};let p=!1;var m;u.ctx=i?i(e,d,(t,o)=>{u.ctx&&r(u.ctx[t],u.ctx[t]=o)&&(u.bound[t]&&u.bound[t](o),p&&D(e,t))}):d,u.update(),p=!0,s(u.before_update),u.fragment=a(u.ctx),o.target&&(o.hydrate?u.fragment.l((m=o.target,Array.from(m.childNodes))):u.fragment.c(),o.intro&&X(e.$$.fragment),q(e,o.target,o.anchor),O()),N(l)}class J{$destroy(){V(this,1),this.$destroy=t}$on(t,e){const o=this.$$.callbacks[t]||(this.$$.callbacks[t]=[]);return o.push(e),()=>{const t=o.indexOf(e);-1!==t&&o.splice(t,1)}}$set(){}}const K=[];function Q(e,o=t){let n;const s=[];function i(t){if(a(e,t)&&(e=t,n)){const t=!K.length;for(let t=0;t<s.length;t+=1){const o=s[t];o[1](),K.push(o,e)}if(t){for(let t=0;t<K.length;t+=2)K[t][0](K[t+1]);K.length=0}}}return{set:i,update:function(t){i(t(e))},subscribe:function(a,r=t){const c=[a,r];return s.push(c),1===s.length&&(n=o(i)||t),a(e),()=>{const t=s.indexOf(c);-1!==t&&s.splice(t,1),0===s.length&&(n(),n=null)}}}}const tt=Q(0),et=Q(0),ot=(self.serverBase,"[object process]"===Object.prototype.toString.call("undefined"!=typeof process?process:0)),nt=ot?module.require:null;const st=function(t,e=null){const o=ot?Buffer.from(t,"base64").toString("ascii"):atob(t),n=o.indexOf("\n",10)+1,s=o.substring(n)+(e?`//# sourceMappingURL=${e}`:"");if(ot){const t=nt("worker_threads").Worker;return function(e){return new t(s,Object.assign({},e,{eval:!0}))}}const i=new Blob([s],{type:"application/javascript"}),a=URL.createObjectURL(i);return function(t){return new Worker(a,t)}}("Lyogcm9sbHVwLXBsdWdpbi13ZWItd29ya2VyLWxvYWRlciAqLwpjb25zdCBlPXNlbGYuc2VydmVyQmFzZXx8Imh0dHA6Ly9tYXBzLmtvc21vc25pbWtpLnJ1LyI7dmFyIHM9cz0+e2xldCBhPWAke2V9TWFwL0dldE1hcFByb3BlcnRpZXNgO3JldHVybiBhKz0iP01hcE5hbWU9Qzg2MTJCM0E3N0Q4NEYzRjg3OTUzQkVGMTcwMjZBNUYiLChzPXN8fHt9KS5XcmFwU3R5bGV8fChzLldyYXBTdHlsZT0iZnVuYyIscy5DYWxsYmFja05hbWU9Il90ZXN0Iikscy5za2lwVGlsZXN8fChzLnNraXBUaWxlcz0iQWxsIikscy5zcnN8fChzLnNycz0iMzg1NyIpLHMuZnRjfHwocy5mdGM9Im9zbSIpLHMuTW9kZUtleXx8KHMuTW9kZUtleT0ibWFwIikscy5NYXBOYW1lfHwocy5NYXBOYW1lPSJDODYxMkIzQTc3RDg0RjNGODc5NTNCRUYxNzAyNkE1RiIpLGZldGNoKGEse21ldGhvZDoiZ2V0Iixtb2RlOiJjb3JzIixjcmVkZW50aWFsczoiaW5jbHVkZSJ9KS50aGVuKGU9PmUuanNvbigpKS5jYXRjaChlPT5jb25zb2xlLndhcm4oZSkpfSxhPXNlbGY7KGEub258fGEuYWRkRXZlbnRMaXN0ZW5lcikuY2FsbChhLCJtZXNzYWdlIixlPT57Y29uc3QgYT1lLmRhdGF8fGU7Y29uc29sZS5sb2coInNzZmRmIHNzcyIsYSkscygpLnRoZW4oZT0+e2NvbnNvbGUubG9nKCJqc29uMTExIixlKX0pfSk7Cgo=",null);function it(e){var o;return{c(){k(o=g("div"),"id","map")},m(t,n){b(t,o,n),e.div_binding(o)},p:t,i:t,o:t,d(t){t&&h(o),e.div_binding(null)}}}function at(t,e,o){let n,s,i=null,{center:a=[55.72711,37.441406],id:r="",layers:c=[],maxZoom:l=21,minZoom:d=1,zoom:u=4,ftc:p="osm",srs:m=3857,distanceUnit:f="auto",squareUnit:v="auto",baseLayers:b=[]}=e;var h;return h=(()=>{const{DefaultLong:t,DefaultLat:e,MinZoom:r,MaxZoom:c,DefaultZoom:p,DistanceUnit:m,SquareUnit:b}={};o("center",a=[e||60.5,t||95.09]),o("minZoom",d=r||d),o("maxZoom",l=c||l),o("zoom",u=p||u),o("distanceUnit",f=m||f),o("squareUnit",v=b||v),(i=L.map(s,{center:a,minZoom:d,zoom:u,maxZoom:l,zoomControl:!1,attributionControl:!1,trackResize:!0,fadeAnimation:!0,zoomAnimation:!0,distanceUnit:"auto",squareUnit:"auto"})).invalidateSize(),tt.set(i),n||setTimeout(function(){n=new st},250)}),M().$$.on_mount.push(h),t.$set=(t=>{"center"in t&&o("center",a=t.center),"id"in t&&o("id",r=t.id),"layers"in t&&o("layers",c=t.layers),"maxZoom"in t&&o("maxZoom",l=t.maxZoom),"minZoom"in t&&o("minZoom",d=t.minZoom),"zoom"in t&&o("zoom",u=t.zoom),"ftc"in t&&o("ftc",p=t.ftc),"srs"in t&&o("srs",m=t.srs),"distanceUnit"in t&&o("distanceUnit",f=t.distanceUnit),"squareUnit"in t&&o("squareUnit",v=t.squareUnit),"baseLayers"in t&&o("baseLayers",b=t.baseLayers)}),{mapContainer:s,center:a,id:r,layers:c,maxZoom:l,minZoom:d,zoom:u,ftc:p,srs:m,distanceUnit:f,squareUnit:v,baseLayers:b,div_binding:function(t){U[t?"unshift":"push"](()=>{o("mapContainer",s=t)})}}}class rt extends J{constructor(t){super(),P(this,t,at,it,a,["center","id","layers","maxZoom","minZoom","zoom","ftc","srs","distanceUnit","squareUnit","baseLayers"])}}function ct(e){var o;return{c(){(o=g("div")).innerHTML='<div class="sidebar-opened-row1"><div class="sidebar-opened-row1-left">Название проекта/компании</div> <div class="sidebar-opened-row1-right"></div></div> <div class="sidebar-opened-row2"><input type="text" name="input1" class="header-input1"></div> <div class="sidebar-opened-row3"><div class="sidebar-opened-row3-left"><label class="control control-checkbox">\n\t\t\t               Выделить все\n\t\t\t               <input type="checkbox"> <div class="control_indicator"></div></label></div> <div class="sidebar-opened-row3-right"><div class="sidebar-opened-row3-right-el1"></div> <div class="sidebar-opened-row3-right-el2"></div> <div class="sidebar-opened-row3-right-el3"></div> <div class="sidebar-opened-row3-right-el4"></div></div></div> <div class="sidebar-opened-row-el"><div class="sidebar-opened-el-left"><label class="control control-checkbox control-black control-group">\n\t\t\t               Делянки\n\t\t\t               <input type="checkbox" checked="checked"> <div class="control_indicator"></div></label></div> <div class="sidebar-opened-el-right"></div></div> <div class="sidebar-opened-row-el"><div class="sidebar-opened-el-left"><label class="control control-checkbox control-black control-empty">\n\t\t\t               Пустой слой\n\t\t\t               <input type="checkbox"> <div class="control_indicator"></div></label></div> <div class="sidebar-opened-el-right"></div></div> <div class="sidebar-opened-row-el"><div class="sidebar-opened-el-left"><label class="control control-checkbox control-black control-group">\n\t\t\t               Квартальные сети\n\t\t\t               <input type="checkbox" checked="checked"> <div class="control_indicator"></div></label></div> <div class="sidebar-opened-el-right"></div></div> <div class="sidebar-opened-row-el"><div class="sidebar-opened-el-left"><label class="control control-checkbox control-black control-empty">\n\t\t\t               Пустой слой\n\t\t\t               <input type="checkbox" checked="checked"> <div class="control_indicator"></div></label></div> <div class="sidebar-opened-el-right"></div></div>',k(o,"class","sidebar-opened")},m(t,e){b(t,o,e)},p:t,i:t,o:t,d(t){t&&h(o)}}}function lt(t,e,o){et.subscribe(t=>{});return{}}class dt extends J{constructor(t){super(),P(this,t,lt,ct,a,[])}}function ut(e){var o,n,i,a,r,c,l;return{c(){o=g("div"),n=g("div"),i=y(),(a=g("div")).textContent="5",r=y(),c=g("div"),k(n,"class","right-controls-3-1"),k(a,"class","right-controls-3-2"),k(c,"class","right-controls-3-3"),k(o,"class","right-controls-3"),l=[x(n,"click",e.zoomIn),x(c,"click",e.zoomOut)]},m(t,s){b(t,o,s),v(o,n),v(o,i),v(o,a),e.div1_binding(a),v(o,r),v(o,c)},p:t,i:t,o:t,d(t){t&&h(o),e.div1_binding(null),s(l)}}}function pt(t,e,o){let n,s,i=t=>{let e=n.getZoom();s.textContent=e,o("zoom",s),console.log("setZoom",n.getZoom(),t)};var a;return L.Map.addInitHook(function(){(n=this).on("zoomend",i)}),a=(()=>{console.log("the component is about to update",n)}),M().$$.before_update.push(a),{zoom:s,zoomIn:()=>{let t=parseInt(s.textContent);console.log("zoomIn",n.getZoom(),s),n.setZoom(t+1)},zoomOut:()=>{let t=parseInt(s.textContent);console.log("zoomOut",n.getZoom()),n.setZoom(t-1)},div1_binding:function(t){U[t?"unshift":"push"](()=>{o("zoom",s=t)})}}}class mt extends J{constructor(t){super(),P(this,t,pt,ut,a,[])}}function ft(t){const e=t-1;return e*e*e+1}function vt(t,{delay:e=0,duration:o=400}){const n=+getComputedStyle(t).opacity;return{delay:e,duration:o,css:t=>`opacity: ${t*n}`}}function bt(t,{delay:e=0,duration:o=400,easing:n=ft,x:s=0,y:i=0,opacity:a=0}){const r=getComputedStyle(t),c=+r.opacity,l="none"===r.transform?"":r.transform,d=c*(1-a);return{delay:e,duration:o,easing:n,css:(t,e)=>`\n\t\t\ttransform: ${l} translate(${(1-t)*s}px, ${(1-t)*i}px);\n\t\t\topacity: ${c-d*e}`}}function ht(o){var n,a,r,l,d,u,p,m,$,_,w,L,N,M,C,U,B,I,W,G,T,O,R,E,X,F,q,V,D,P,J,K,Q,tt,et,ot,nt,st,it;return{c(){n=g("div"),a=g("div"),r=g("div"),(l=g("div")).textContent="Подложка",d=y(),u=g("div"),p=y(),m=g("div"),$=g("div"),_=g("span"),w=g("input"),(L=g("label")).textContent="Карта",N=y(),M=g("div"),C=g("span"),U=g("input"),(B=g("label")).textContent="Спутник ру",I=y(),W=g("div"),G=g("span"),T=g("input"),(O=g("label")).textContent="MapTiler Topo",R=y(),E=g("div"),X=g("span"),F=g("input"),(q=g("label")).textContent="MapBox",V=y(),D=g("div"),P=g("span"),J=g("input"),(K=g("label")).textContent="Рельеф RuMap",Q=y(),(tt=g("div")).innerHTML='<label class="control control-checkbox">\n\t\t\t               Координатная сетка\n\t\t\t               <input type="checkbox" checked="checked"> <div class="control_indicator"></div></label>',k(l,"class","right-controls-pop-r1-text"),k(u,"class","right-controls-pop-r1-сlose"),k(u,"id","close-pop"),k(r,"class","right-controls-pop-r1"),k(w,"type","radio"),k(w,"name","radiog_dark"),k(w,"id","radio1"),k(w,"class","radio1 css-checkbox"),k(L,"for","radio1"),k(L,"class","css-label radGroup1 radGroup2"),k(_,"class","spacer"),k($,"class","radio-arr"),k(U,"type","radio"),k(U,"name","radiog_dark"),k(U,"id","radio2"),k(U,"class","radio2 css-checkbox"),U.checked="checked",k(B,"for","radio2"),k(B,"class","css-label radGroup1 radGroup2"),k(C,"class","spacer"),k(M,"class","radio-arr"),k(T,"type","radio"),k(T,"name","radiog_dark"),k(T,"id","radio3"),k(T,"class","radio3 css-checkbox"),k(O,"for","radio3"),k(O,"class","css-label radGroup1 radGroup2"),k(G,"class","spacer"),k(W,"class","radio-arr"),k(F,"type","radio"),k(F,"name","radiog_dark"),k(F,"id","radio4"),k(F,"class","radio4 css-checkbox"),k(q,"for","radio4"),k(q,"class","css-label radGroup1 radGroup2"),k(X,"class","spacer"),k(E,"class","radio-arr"),k(J,"type","radio"),k(J,"name","radiog_dark"),k(J,"id","radio5"),k(J,"class","radio5 css-checkbox"),k(K,"for","radio5"),k(K,"class","css-label radGroup1 radGroup2"),k(P,"class","spacer"),k(D,"class","radio-arr"),k(m,"class","right-controls-pop-r2"),k(tt,"class","right-controls-pop-r3"),k(a,"class","right-controls-pop"),k(a,"id","control-pop"),k(n,"class",et="flexWrapper "+(o.base_visible?"":"hidden")),it=[x(u,"click",o.toggleBase),x(w,"click",o.setBase),x(U,"click",o.setBase),x(T,"click",o.setBase),x(F,"click",o.setBase),x(J,"click",o.setBase)]},m(t,e){b(t,n,e),v(n,a),v(a,r),v(r,l),v(r,d),v(r,u),v(a,p),v(a,m),v(m,$),v($,_),v(_,w),v(_,L),v(m,N),v(m,M),v(M,C),v(C,U),v(C,B),v(m,I),v(m,W),v(W,G),v(G,T),v(G,O),v(m,R),v(m,E),v(E,X),v(X,F),v(X,q),v(m,V),v(m,D),v(D,P),v(P,J),v(P,K),v(a,Q),v(a,tt),st=!0},p(t,e){st&&!t.base_visible||et===(et="flexWrapper "+(e.base_visible?"":"hidden"))||k(n,"class",et)},i(o){st||(S(()=>{nt&&nt.end(1),ot||(ot=function(o,n,s){let a,r,l=n(o,s),d=!1,u=0;function p(){a&&z(o,a)}function m(){const{delay:n=0,duration:s=300,easing:i=e,tick:m=t,css:v}=l||A;v&&(a=Z(o,0,1,s,n,i,v,u++)),m(0,1);const b=c()+n,h=b+s;r&&r.abort(),d=!0,S(()=>Y(o,!0,"start")),r=f(t=>{if(d){if(t>=h)return m(1,0),Y(o,!0,"end"),p(),d=!1;if(t>=b){const e=i((t-b)/s);m(e,1-e)}}return d})}let v=!1;return{start(){v||(z(o),i(l)?(l=l(),j().then(m)):m())},invalidate(){v=!1},end(){d&&(p(),d=!1)}}}(n,bt,{y:200,duration:2e3})),ot.start()}),st=!0)},o(o){ot&&ot.invalidate(),nt=function(o,n,a){let r,l=n(o,a),d=!0;const u=H;function p(){const{delay:n=0,duration:i=300,easing:a=e,tick:p=t,css:m}=l||A;m&&(r=Z(o,1,0,i,n,a,m));const v=c()+n,b=v+i;S(()=>Y(o,!1,"start")),f(t=>{if(d){if(t>=b)return p(0,1),Y(o,!1,"end"),--u.r||s(u.c),!1;if(t>=v){const e=a((t-v)/i);p(1-e,e)}}return d})}return u.r+=1,i(l)?j().then(()=>{l=l(),p()}):p(),{end(t){t&&l.tick&&l.tick(1,0),d&&(r&&z(o,r),d=!1)}}}(n,vt,{}),st=!1},d(t){t&&(h(n),nt&&nt.end()),s(it)}}}function gt(t,e,o){let n=!1;et.subscribe(t=>{o("base_visible",n=t)});let s,i={1:L.tileLayer("//{s}tilecart.kosmosnimki.ru/kosmo/{z}/{x}/{y}.png",{maxZoom:21,maxNativeZoom:18,attribution:'<a target="_blank" href="http://maps.sputnik.ru" class="">Спутник</a> - © Ростелеком | © <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'}),2:L.tileLayer("//tilessputnik.ru/{z}/{x}/{y}.png",{maxZoom:21,maxNativeZoom:18,attribution:'<a target="_blank" href="http://maps.sputnik.ru" class="">Спутник</a> - © Ростелеком | © <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'}),3:L.tileLayer("//api.maptiler.com/maps/topo/256/{z}/{x}/{y}.png?key=FrA3SZOPvBcowh6thoTf",{maxZoom:22,attribution:'<a href="https://www.maptiler.com/copyright/" target="_blank">© MapTiler</a> <a href="https://www.openstreetmap.org/copyright" target="_blank">© OpenStreetMap contributors</a>'}),4:L.tileLayer("//api.mapbox.com/v4/mapbox.streets/{z}/{x}/{y}.png?access_token=pk.eyJ1Ijoia29zbW9zbmlta2lydSIsImEiOiJjaWhxMHNlZDgwNGFldHBtMjdyejQ3YTJ3In0.3UAAWcIBabrbUhHwmp1WjA",{maxZoom:22,maxNativeZoom:22,attribution:'<a href="https://www.mapbox.com/about/maps/" target="_blank">© Mapbox</a> <a href="http://www.openstreetmap.org/about/" target="_blank">© OpenStreetMap</a>'}),5:L.tileLayer.Mercator("//{s}tilecart.kosmosnimki.ru/r/{z}/{x}/{y}.png",{maxZoom:21,maxNativeZoom:18,attribution:'<a target="_blank" href="http://maps.sputnik.ru" class="">Спутник</a> - © Ростелеком | © <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'})};tt.subscribe(t=>{(s=t)&&(console.log("map",s),s.addLayer(i[2]))});return{base_visible:n,toggleBase:()=>{et.update(t=>!t)},setBase:t=>{console.log("setBase",t);let e=t.target;for(let t=0,o=e.parentNode.parentNode.parentNode.getElementsByTagName("input").length;t<o;t++){let o=t+1,n=i[o],a="radio"+o;e.classList.contains(a)?n._map||s.addLayer(n):n._map&&s.removeLayer(n)}}}}class yt extends J{constructor(t){super(),P(this,t,gt,ht,a,[])}}function xt(e){var o,n,s,i,a,r,c,l,d,u,p,m,f,$,_,w,Z=new dt({}),z=new rt({}),L=new mt({}),N=new yt({});return{c(){(o=g("div")).innerHTML='<div class="block_left"><span class="logo"><div class="logo_left">\n\t\t\t\t\t\t   \n\t\t\t\t\t   </div> <div class="logo_left_text">\n\t\t\t\t\t\t  Logo\n\t\t\t\t\t   </div></span> <div class="left-icons"><div class="left-icons-left"><div class="icons-header-left1"></div> <div class="icons-header-left2"></div></div> <div class="left-icons-right"><div class="icons-header-right1"></div> <div class="icons-header-right2"></div></div></div> <div class="left-icons-1-act"></div> <div class="slider-container"><div class="range-slider"><input class="range-slider__range" type="range" value="30" min="0" max="100"> <span class="range-slider__value">30</span> <span class="percent">%</span></div></div></div> <div class="block_right"><input type="text" name="input" placeholder="Поиск по адресам и координатам" class="header-input"> <div class="account">Имя Фамилия</div> <div class="account-star"></div></div>',n=y(),(s=g("div")).innerHTML='<div class="icons-vert-top"><div class="icons-vert-top-1"></div> <div class="icons-vert-top-2"></div> <div class="icons-vert-top-3"></div></div> <div class="icons-vert-bottom"><div class="icons-vert-bottom-1"></div></div>',i=y(),Z.$$.fragment.c(),a=y(),z.$$.fragment.c(),r=y(),c=g("div"),l=g("div"),d=y(),L.$$.fragment.c(),u=y(),N.$$.fragment.c(),p=y(),m=g("div"),f=y(),$=g("div"),k(o,"class","header"),k(s,"class","sidebar"),k(l,"class","right-controls-2"),k(c,"class","right-controls"),k(m,"class","copyright"),k($,"class","copyright-bottom"),w=x(l,"click",e.toggleBase)},m(t,e){b(t,o,e),b(t,n,e),b(t,s,e),b(t,i,e),q(Z,t,e),b(t,a,e),q(z,t,e),b(t,r,e),b(t,c,e),v(c,l),v(c,d),q(L,c,null),b(t,u,e),q(N,t,e),b(t,p,e),b(t,m,e),b(t,f,e),b(t,$,e),_=!0},p:t,i(t){_||(X(Z.$$.fragment,t),X(z.$$.fragment,t),X(L.$$.fragment,t),X(N.$$.fragment,t),_=!0)},o(t){F(Z.$$.fragment,t),F(z.$$.fragment,t),F(L.$$.fragment,t),F(N.$$.fragment,t),_=!1},d(t){t&&(h(o),h(n),h(s),h(i)),V(Z,t),t&&h(a),V(z,t),t&&(h(r),h(c)),V(L),t&&h(u),V(N,t),t&&(h(p),h(m),h(f),h($)),w()}}}function kt(t,e,o){et.subscribe(t=>{console.log("sssssssss",t)}),tt.subscribe(t=>{console.log("leafletMap",t)});return{toggleBase:()=>{et.update(t=>!t),console.log("leafletMap1",tt)}}}return new class extends J{constructor(t){super(),P(this,t,kt,xt,a,[])}}({target:document.body,props:{name:"C8612B3A77D84F3F87953BEF17026A5F"}})}();
//# sourceMappingURL=forest_1.0.js.map