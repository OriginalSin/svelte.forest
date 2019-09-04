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

         <div class="sidebar-opened-row-el">
            <div class="sidebar-opened-el-left">
               <label class="control control-checkbox control-black control-group">
               Делянки
               <input type="checkbox" checked="checked" />
               <div class="control_indicator"></div>
            </div>
            <div class="sidebar-opened-el-right"></div>
         </div>

         <div class="sidebar-opened-row-el">
            <div class="sidebar-opened-el-left">
               <label class="control control-checkbox control-black control-empty">
               Пустой слой
               <input type="checkbox" />
               <div class="control_indicator"></div>
            </div>
            <div class="sidebar-opened-el-right"></div>
         </div>

         <div class="sidebar-opened-row-el">
            <div class="sidebar-opened-el-left">
               <label class="control control-checkbox control-black control-group">
               Квартальные сети
               <input type="checkbox" checked="checked" />
               <div class="control_indicator"></div>
            </div>
            <div class="sidebar-opened-el-right"></div>
         </div>

         <div class="sidebar-opened-row-el">
            <div class="sidebar-opened-el-left">
               <label class="control control-checkbox control-black control-empty">
               Пустой слой
               <input type="checkbox" checked="checked" />
               <div class="control_indicator"></div>
            </div>
            <div class="sidebar-opened-el-right"></div>
         </div>
      </div>