<script>
   import {onMount, beforeUpdate, setContext, getContext} from 'svelte';
   
	import * as Store from '../stores.js';
   
    export let mapID;

// console.log('ssss', mapID, Store.mapTree, Store.leafletMap)
	let tree = null;
	const unsubscribe = Store.mapTree.subscribe(value => {
		tree = value;
		if (tree) {
console.log('Report tree', tree);
			// map.addLayer(baseLayers[2]);
		}
	});

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