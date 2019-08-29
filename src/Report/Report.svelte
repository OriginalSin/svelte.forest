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

     <!--OPENED SIDEBAR-->
      <div class="sidebar-opened">
         <div class="sidebar-opened-row1">
            <div class="sidebar-opened-row1-left">Название проекта/компании</div>
            <div class="sidebar-opened-row1-right" title="Редактировать"></div>
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
               <div class="sidebar-opened-row3-right-el1" title="Создать слой"></div>
               <div class="sidebar-opened-row3-right-el2" title="Добавить группу"></div>
               <div class="sidebar-opened-row3-right-el3" title="Загрузить"></div>
               <div class="sidebar-opened-row3-right-el4" title="Фильтр"></div>
            </div>
         </div>

         <div class="sidebar-opened-el-container" id="style-4">

         

         <div class="sidebar-opened-row-el">
            <div class="sidebar-opened-el-left">
               <label class="control control-checkbox control-black inside-0 poly">
               Корневой пустой слой
               <input type="checkbox" />
               <div class="control_indicator"></div>
            </div>
            <div class="sidebar-opened-el-right"></div>
         </div>


         <div class="sidebar-opened-row-el">
            <div class="sidebar-opened-el-left">
               <label class="control control-checkbox control-black inside-0 point">
               Корневой слой точка
               <input type="checkbox" />
               <div class="control_indicator"></div>
            </div>
            <div class="sidebar-opened-el-right"></div>
         </div>

          <div class="sidebar-opened-row-el">
            <div class="sidebar-opened-el-left">
               <label class="control control-checkbox control-black inside-0 line">
               Корневой слой линия
               <input type="checkbox" />
               <div class="control_indicator"></div>
            </div>
            <div class="sidebar-opened-el-right"></div>
         </div>

          <div class="sidebar-opened-row-el">
            <div class="sidebar-opened-el-left">
               <label class="control control-checkbox control-black inside-0 poly">
               Корневой слой полигон
               <input type="checkbox" />
               <div class="control_indicator"></div>
            </div>
            <div class="sidebar-opened-el-right"></div>
         </div>

         <div class="sidebar-opened-row-el">
            <div class="sidebar-opened-el-left">
               <label class="control control-checkbox control-black inside-0 group">
               1-й уровень вложенности
               <input type="checkbox" checked="checked" />
               <div class="control_indicator"></div>
            </div>
            <div class="sidebar-opened-el-right"></div>
         </div>

         <div class="sidebar-opened-row-el">
            <div class="sidebar-opened-el-left">
               <label class="control control-checkbox control-black inside-1 poly">
               Вложенность 1 пустой слой
               <input type="checkbox" checked="checked" />
               <div class="control_indicator"></div>
            </div>
            <div class="sidebar-opened-el-right"></div>
         </div>


         <div class="sidebar-opened-row-el">
            <div class="sidebar-opened-el-left">
               <label class="control control-checkbox control-black inside-1 point">
               Вложенность 1 точка
               <input type="checkbox" />
               <div class="control_indicator"></div>
            </div>
            <div class="sidebar-opened-el-right"></div>
         </div>

          <div class="sidebar-opened-row-el">
            <div class="sidebar-opened-el-left">
               <label class="control control-checkbox control-black inside-1 line">
               Вложенность 1 линия
               <input type="checkbox" />
               <div class="control_indicator"></div>
            </div>
            <div class="sidebar-opened-el-right"></div>
         </div>

          <div class="sidebar-opened-row-el">
            <div class="sidebar-opened-el-left">
               <label class="control control-checkbox control-black inside-1 poly">
               Вложенность 1 полигон
               <input type="checkbox" />
               <div class="control_indicator"></div>
            </div>
            <div class="sidebar-opened-el-right"></div>
         </div>

          <div class="sidebar-opened-row-el">
            <div class="sidebar-opened-el-left">
               <label class="control control-checkbox control-black inside-1 group">
               2-й уровень вложенности
               <input type="checkbox" checked="checked" />
               <div class="control_indicator"></div>
            </div>
            <div class="sidebar-opened-el-right"></div>
         </div>

          <div class="sidebar-opened-row-el">
            <div class="sidebar-opened-el-left">
               <label class="control control-checkbox control-black inside-2 poly">
               Вложенность 2 пустой слой
               <input type="checkbox" checked="checked" />
               <div class="control_indicator"></div>
            </div>
            <div class="sidebar-opened-el-right"></div>
         </div>

         <div class="sidebar-opened-row-el">
            <div class="sidebar-opened-el-left">
               <label class="control control-checkbox control-black inside-2 point">
               Вложенность 2 точка
               <input type="checkbox" />
               <div class="control_indicator"></div>
            </div>
            <div class="sidebar-opened-el-right"></div>
         </div>

          <div class="sidebar-opened-row-el">
            <div class="sidebar-opened-el-left">
               <label class="control control-checkbox control-black inside-2 line">
               Вложенность 2 линия
               <input type="checkbox" />
               <div class="control_indicator"></div>
            </div>
            <div class="sidebar-opened-el-right"></div>
         </div>

          <div class="sidebar-opened-row-el">
            <div class="sidebar-opened-el-left">
               <label class="control control-checkbox control-black inside-2 poly">
               Вложенность 2 полигон
               <input type="checkbox" />
               <div class="control_indicator"></div>
            </div>
            <div class="sidebar-opened-el-right"></div>
         </div>

         <div class="sidebar-opened-row-el">
            <div class="sidebar-opened-el-left">
               <label class="control control-checkbox control-black inside-2 group">
               3-й уровень вложенности
               <input type="checkbox" checked="checked" />
               <div class="control_indicator"></div>
            </div>
            <div class="sidebar-opened-el-right"></div>
         </div>

         <div class="sidebar-opened-row-el">
            <div class="sidebar-opened-el-left">
               <label class="control control-checkbox control-black inside-3 poly">
               Вложенность 3 пустой слой
               <input type="checkbox" checked="checked" />
               <div class="control_indicator"></div>
            </div>
            <div class="sidebar-opened-el-right"></div>
         </div>

         <div class="sidebar-opened-row-el">
            <div class="sidebar-opened-el-left">
               <label class="control control-checkbox control-black inside-3 point">
               Вложенность 3 точка
               <input type="checkbox" />
               <div class="control_indicator"></div>
            </div>
            <div class="sidebar-opened-el-right"></div>
         </div>

          <div class="sidebar-opened-row-el">
            <div class="sidebar-opened-el-left">
               <label class="control control-checkbox control-black inside-3 line">
               Вложенность 3 линия
               <input type="checkbox" />
               <div class="control_indicator"></div>
            </div>
            <div class="sidebar-opened-el-right"></div>
         </div>

          <div class="sidebar-opened-row-el">
            <div class="sidebar-opened-el-left">
               <label class="control control-checkbox control-black inside-3 poly">
               Вложенность 3 полигон
               <input type="checkbox" />
               <div class="control_indicator"></div>
            </div>
            <div class="sidebar-opened-el-right">
               <div class="sidebar-opened-el-right-1" title="Центрировать"></div>
               <div class="sidebar-opened-el-right-2" title="Редактор объектов"></div>
               <div class="sidebar-opened-el-right-3" title="Прозрачность"></div>
            </div>
         </div>
      </div>
      </div>
      <!--END OPENED SIDEBAR-->