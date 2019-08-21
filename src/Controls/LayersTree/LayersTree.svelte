<script>
   import {onMount, beforeUpdate, setContext, getContext} from 'svelte';
   
   import { baseContVisible, leafletMap } from '../../stores.js';
   
   let base_visible = false;
   const unsubscribe = baseContVisible.subscribe(value => {
   base_visible = value;
   });
   let toggleBase = () => {
   baseContVisible.update(n => !n);
   };
   
   /*
   let map,
   baseLayers = {
   1: L.tileLayer('//{s}tilecart.kosmosnimki.ru/kosmo/{z}/{x}/{y}.png', {
   maxZoom: 21,
   maxNativeZoom: 18,
   attribution: '<a target="_blank" href="http://maps.sputnik.ru" class="">Спутник</a> - © Ростелеком | © <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
   }),
   2: L.tileLayer('//tilessputnik.ru/{z}/{x}/{y}.png', {
   maxZoom: 21,
   maxNativeZoom: 18,
   attribution: '<a target="_blank" href="http://maps.sputnik.ru" class="">Спутник</a> - © Ростелеком | © <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
   }),
   3: L.tileLayer('//api.maptiler.com/maps/topo/256/{z}/{x}/{y}.png?key=FrA3SZOPvBcowh6thoTf', {
   maxZoom: 22,
   // maxNativeZoom: 18,
   attribution: '<a href="https://www.maptiler.com/copyright/" target="_blank">© MapTiler</a> <a href="https://www.openstreetmap.org/copyright" target="_blank">© OpenStreetMap contributors</a>'
   }),
   4: L.tileLayer('//api.mapbox.com/v4/mapbox.streets/{z}/{x}/{y}.png?access_token=pk.eyJ1Ijoia29zbW9zbmlta2lydSIsImEiOiJjaWhxMHNlZDgwNGFldHBtMjdyejQ3YTJ3In0.3UAAWcIBabrbUhHwmp1WjA', {
   maxZoom: 22,
   maxNativeZoom: 22,
   attribution: '<a href="https://www.mapbox.com/about/maps/" target="_blank">© Mapbox</a> <a href="http://www.openstreetmap.org/about/" target="_blank">© OpenStreetMap</a>'
   }),
   5: L.tileLayer.Mercator('//{s}tilecart.kosmosnimki.ru/r/{z}/{x}/{y}.png', {
   maxZoom: 21,
   maxNativeZoom: 18,
   attribution: '<a target="_blank" href="http://maps.sputnik.ru" class="">Спутник</a> - © Ростелеком | © <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
   }),
   };
   const unsubscribe1 = leafletMap.subscribe(value => {
   map = value;
   if (map) {
   console.log('map', map);
   map.addLayer(baseLayers[2]);
   
   }
   });
   let setBase = (ev) => {
   console.log('setBase', ev);
   let target = ev.target,
   cont = target.parentNode.parentNode.parentNode,
   arr = cont.getElementsByTagName('input');
   for (let i = 0, len = arr.length; i < len; i++) {
   let nm = i + 1,
   it = baseLayers[nm],
   name ='radio' + nm,
   isVisible = target.classList.contains(name);
   if (isVisible) {
   if (!it._map) { map.addLayer(it); }
   } else {
   if (it._map) { map.removeLayer(it); }
   }
   }
   };
   */
</script>
<div class="sidebar-opened">
   <div class="sidebar-opened-row1">
      <div class="sidebar-opened-row1-left">Название проекта/компании</div>
      <div class="sidebar-opened-row1-right"></div>
   </div>
   <div class="sidebar-opened-row2">
      <input type="text" name="input1" class="header-input1">
   </div>
   <div class="sidebar-opened-row3">
      <div class="sidebar-opened-row3-left">
         <label class="control control-checkbox">
         Выделить все
         <input type="checkbox" />
         <div class="control_indicator"></div>
      </div>
      <div class="sidebar-opened-row3-right">
         <div class="sidebar-opened-row3-right-el1"></div>
         <div class="sidebar-opened-row3-right-el2"></div>
         <div class="sidebar-opened-row3-right-el3"></div>
         <div class="sidebar-opened-row3-right-el4"></div>
      </div>
   </div>
   <div class="sidebar-opened-el-container">
      <div class="sidebar-opened-el-container" id="style-4">
         <div class="sidebar-opened-row-el">
            <div class="sidebar-opened-el-left">
               <label class="control control-checkbox control-black control-empty-0">
               Корневой пустой слой
               <input type="checkbox" />
               <div class="control_indicator"></div>
            </div>
            <div class="sidebar-opened-el-right"></div>
         </div>
         <div class="sidebar-opened-row-el">
            <div class="sidebar-opened-el-left">
               <label class="control control-checkbox control-black control-1-default-0">
               Корневой слой 1
               <input type="checkbox" />
               <div class="control_indicator"></div>
            </div>
            <div class="sidebar-opened-el-right"></div>
         </div>
         <div class="sidebar-opened-row-el">
            <div class="sidebar-opened-el-left">
               <label class="control control-checkbox control-black control-2-default-0">
               Корневой слой 2
               <input type="checkbox" />
               <div class="control_indicator"></div>
            </div>
            <div class="sidebar-opened-el-right"></div>
         </div>
         <div class="sidebar-opened-row-el">
            <div class="sidebar-opened-el-left">
               <label class="control control-checkbox control-black control-3-default-0">
               Корневой слой 3
               <input type="checkbox" />
               <div class="control_indicator"></div>
            </div>
            <div class="sidebar-opened-el-right"></div>
         </div>
         <div class="sidebar-opened-row-el">
            <div class="sidebar-opened-el-left">
               <label class="control control-checkbox control-black control-group-1">
               1-й уровень вложенности
               <input type="checkbox" checked="checked" />
               <div class="control_indicator"></div>
            </div>
            <div class="sidebar-opened-el-right"></div>
         </div>
         <div class="sidebar-opened-row-el">
            <div class="sidebar-opened-el-left">
               <label class="control control-checkbox control-black control-empty-1">
               Вложенность 1 пустой слой
               <input type="checkbox" checked="checked" />
               <div class="control_indicator"></div>
            </div>
            <div class="sidebar-opened-el-right"></div>
         </div>
         <div class="sidebar-opened-row-el">
            <div class="sidebar-opened-el-left">
               <label class="control control-checkbox control-black control-1-default-1">
               Вложенность 1 слой 1
               <input type="checkbox" />
               <div class="control_indicator"></div>
            </div>
            <div class="sidebar-opened-el-right"></div>
         </div>
         <div class="sidebar-opened-row-el">
            <div class="sidebar-opened-el-left">
               <label class="control control-checkbox control-black control-2-default-1">
               Вложенность 1 слой 2
               <input type="checkbox" />
               <div class="control_indicator"></div>
            </div>
            <div class="sidebar-opened-el-right"></div>
         </div>
         <div class="sidebar-opened-row-el">
            <div class="sidebar-opened-el-left">
               <label class="control control-checkbox control-black control-3-default-1">
               Вложенность 1 слой 3
               <input type="checkbox" />
               <div class="control_indicator"></div>
            </div>
            <div class="sidebar-opened-el-right"></div>
         </div>
         <div class="sidebar-opened-row-el">
            <div class="sidebar-opened-el-left">
               <label class="control control-checkbox control-black control-group-2">
               2-й уровень вложенности
               <input type="checkbox" checked="checked" />
               <div class="control_indicator"></div>
            </div>
            <div class="sidebar-opened-el-right"></div>
         </div>
         <div class="sidebar-opened-row-el">
            <div class="sidebar-opened-el-left">
               <label class="control control-checkbox control-black control-empty-2">
               Вложенность 2 пустой слой
               <input type="checkbox" checked="checked" />
               <div class="control_indicator"></div>
            </div>
            <div class="sidebar-opened-el-right"></div>
         </div>
         <div class="sidebar-opened-row-el">
            <div class="sidebar-opened-el-left">
               <label class="control control-checkbox control-black control-1-default-2">
               Вложенность 2 слой 1
               <input type="checkbox" />
               <div class="control_indicator"></div>
            </div>
            <div class="sidebar-opened-el-right"></div>
         </div>
         <div class="sidebar-opened-row-el">
            <div class="sidebar-opened-el-left">
               <label class="control control-checkbox control-black control-2-default-2">
               Вложенность 2 слой 2
               <input type="checkbox" />
               <div class="control_indicator"></div>
            </div>
            <div class="sidebar-opened-el-right"></div>
         </div>
         <div class="sidebar-opened-row-el">
            <div class="sidebar-opened-el-left">
               <label class="control control-checkbox control-black control-3-default-2">
               Вложенность 2 слой 3
               <input type="checkbox" />
               <div class="control_indicator"></div>
            </div>
            <div class="sidebar-opened-el-right"></div>
         </div>
         <div class="sidebar-opened-row-el">
            <div class="sidebar-opened-el-left">
               <label class="control control-checkbox control-black control-group-3">
               3-й уровень вложенности
               <input type="checkbox" checked="checked" />
               <div class="control_indicator"></div>
            </div>
            <div class="sidebar-opened-el-right"></div>
         </div>
         <div class="sidebar-opened-row-el">
            <div class="sidebar-opened-el-left">
               <label class="control control-checkbox control-black control-empty-3">
               Вложенность 3 пустой слой
               <input type="checkbox" checked="checked" />
               <div class="control_indicator"></div>
            </div>
            <div class="sidebar-opened-el-right"></div>
         </div>
         <div class="sidebar-opened-row-el">
            <div class="sidebar-opened-el-left">
               <label class="control control-checkbox control-black control-1-default-3">
               Вложенность 3 слой 1
               <input type="checkbox" />
               <div class="control_indicator"></div>
            </div>
            <div class="sidebar-opened-el-right"></div>
         </div>
         <div class="sidebar-opened-row-el">
            <div class="sidebar-opened-el-left">
               <label class="control control-checkbox control-black control-2-default-3">
               Вложенность 3 слой 2
               <input type="checkbox" />
               <div class="control_indicator"></div>
            </div>
            <div class="sidebar-opened-el-right"></div>
         </div>
         <div class="sidebar-opened-row-el">
            <div class="sidebar-opened-el-left">
               <label class="control control-checkbox control-black control-3-default-3">
               Вложенность 3 слой 3
               <input type="checkbox" />
               <div class="control_indicator"></div>
            </div>
            <div class="sidebar-opened-el-right"></div>
         </div>
      </div>
   </div>
</div>