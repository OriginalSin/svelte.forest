<script>
   import {onMount, beforeUpdate, setContext, getContext} from 'svelte';
   
  import * as Store from '../stores.js';
  import Utils from '../Utils.js';

let gmxMap = null;
const unsubscribe = Store.mapLayers.subscribe(value => {
	gmxMap = value;
	// console.log('gmxMap', Utils, gmxMap);
});
let map = null; Store.leafletMap.subscribe(value => { map = value; });

let delynkaLayer = null;
let kvartalLayer = null;
const _setLayer = (id) => {
	let it = gmxMap.layersByID[id],
		bbox = it.getBounds();
	// if (addDelynkaFlag !== 1) {
		map.fitBounds(bbox);
	// }
	map.addLayer(it);
	return it;
};

let delItems = null;
Store.delItems.subscribe(value => {
 delItems = value;
 	 console.log('delItems', delItems);

});

const changeDelynka = (ev) => {
	let id = ev.target.selectedOptions[0].value;
	delynkaLayer = _setLayer(id);
	Utils.getLayerItems(delynkaLayer, {type: 'delynka'})
	//console.log('changeDelynka', id);
};
const fitBounds = (nm) => {
	let arr = delItems.values[nm],
		geo = arr[arr.length - 1],
		bbox = L.gmxUtil.getGeometryBounds(geo),
		latlngBbox = L.latLngBounds([[bbox.min.y, bbox.min.x], [bbox.max.y, bbox.max.x]]);
	map.fitBounds(latlngBbox);
	//console.log('fitBounds', nm, geo);
};
const toggleDelyanka = (ev) => {
	let arr = document.getElementsByClassName('selectDelyanka'),
		ctrlKey = ev.ctrlKey,
		checked = ev.target.checked;

	for (let i = 0, len = arr.length; i < len; i++) {
		arr[i].checked = ctrlKey ? !arr[i].checked : checked;
	}
	console.log('toggleDelyanka', checked, arr);
};

let reportIsOpen = null;
const openReport = (ev) => {
	if (delynkaLayer) {
		reportIsOpen = true;
	console.log('openReport', delynkaLayer);
	}
};
const closeReport = (ev) => { reportIsOpen = null; };

const createReport = (ev) => {
	if (delynkaLayer) {
		//reportIsOpen = true;
	console.log('createReport', delynkaLayer);
	}
};
</script>

      <div class="sidebar-opened">
         <div class="sidebar-opened-row1">
      <div class="sidebar-opened-row1-left">{gmxMap.properties && gmxMap.properties.title || 'Название проекта/компании'}</div>
            <div class="sidebar-opened-row1-right" title="Редактировать"></div>
         </div>
         <div class="sidebar-opened-row1">
            <div class="sidebar-opened-row1-left">Отчеты</div>
            <div class="sidebar-opened-row1-left">Лимит:<div class="spacer-7"></div>123456</div>
         </div>
         <div class="sidebar-opened-row1">
            <div class="check-50">
               <input type="checkbox" name="checkboxG4" id="checkboxG4" class="css-checkbox2" /><label for="checkboxG4" class="css-label2 radGroup1">Снимки Landsat-8</label>
            </div>
            <div class="check-50">
               <input type="checkbox" name="checkboxG5" id="checkboxG5" class="css-checkbox2" /><label for="checkboxG5" class="css-label2 radGroup1">Снимки Sentinel-2</label>
            </div>
         </div>
         <div class="sidebar-opened-row-tabs-1">
            <div class="tabs-input-text">Выбор слоя</div>
            <div class="tabs-input">
               <div class="styled-select-1-1">
				   <select on:change={changeDelynka}>
					<option value="" />
{#each gmxMap.layers as item}
	{#if Utils.isDelynkaLayer(item)}
		<option value="{item.options.layerID}">{item._gmx.rawProperties.title}</option>
	{/if}
{/each}
				   </select>
               </div>
            </div>
         </div>
         <div class="sidebar-opened-row-tabs-add">
            <div class="sidebar-opened-row-tabs-add-text {delynkaLayer ? 'active' : ''}" on:click="{openReport}">Создать отчет</div>
            <div class="left-controls-pop-add-kvartal-r-bot1-right icon-report"></div>
         </div>
{#if !delynkaLayer}
         <div class="sidebar-opened-el-container" id="style-4">
            <div class="report-line-empty">
               <div class="report-line-empty-text">
                  Для создания отчетов вам необходимо выбрать слой в выпадающем списке. В случае отсутствия слоев в проекте, вам необходимо <span>Создать слой</span> в дереве слоев
               </div>
            </div>
         </div>
{:else if delItems}
         <div class="sidebar-opened-row3">
            <div class="sidebar-opened-row3-left">
               <label class="control control-checkbox">
                  Выделить все
                  <input type="checkbox" on:click="{toggleDelyanka}" />
                  <div class="control_indicator"></div>
            </div>
            <div class="sidebar-opened-row3-right">
            </div>
         </div>
         <div class="sidebar-opened-el-container" id="style-4">
{#each delItems.values as item, i}
         
			 <div class="sidebar-opened-row-el">
				 <div class="sidebar-opened-el-left">
					 <label class="control control-checkbox control-black inside-0 delyanka">
					 Делянка {item[16]}
					 <input type="checkbox" class="selectDelyanka" />
					 <div class="control_indicator"></div>
				 </div>
				 <div class="sidebar-opened-el-right">
					<div class="sidebar-opened-el-right-1" title="Центрировать" on:click="{() => { fitBounds(i); }}"></div>
				 </div>
			 </div>
<div class="hidden">
			 <div class="sidebar-opened-row-report">
			 <div class="sidebar-opened-row-report-text-left">01.11.2019</div>
			 <div class="sidebar-opened-row-report-text-right">23:23</div>
			 </div>
			 <div class="sidebar-opened-row-report">
			 <div class="sidebar-opened-row-report-text-left">01.11.2019</div>
			 <div class="sidebar-opened-row-report-text-right">23:23</div>
			 </div>
			 <div class="sidebar-opened-row-report">
			 <div class="sidebar-opened-row-report-text-left">01.11.2019</div>
			 <div class="sidebar-opened-row-report-text-right">23:23</div>
			 </div>
			 <div class="sidebar-opened-row-report">
			 <div class="sidebar-opened-row-report-text-left">01.11.2019</div>
			 <div class="sidebar-opened-row-report-text-right">23:23</div>
			 </div>
			 <div class="sidebar-opened-row-report">
			 <div class="sidebar-opened-row-report-text-left">01.11.2019</div>
			 <div class="sidebar-opened-row-report-text-right">23:23</div>
			 </div>
</div>
         
{/each}
</div>
{/if}
      </div>

{#if reportIsOpen}
	  
      <!--НАЧАЛО ПОП-АПА СОЗДАНИЯ ОТЧЕТОВ-->
         <div class="popup-map">
         <div class="popup-map-row1">
            <div class="popup-map-row1-left">Создание отчетов</div>
            <div class="ques-map"></div>
            <div class="restore-icon-ot" title="Восстановить значения из ранее созданного отчета"></div>
         </div>
         <div class="popup-map-row2">
            <div class="popup-map-row2-left">Очистить поля ввода</div>
         </div>
         <div class="sidebar-opened-el-container margin-bot-50" id="style-4">
            <div class="input-kv-1-el2-1-popup-map">
               <div class="kv-1-1">Масштаб</div>
               <div class="styled-select-1-1">
                  <select>
                     <option value="0">100%</option>
                     <option value="7382">90%</option>
                  </select>
               </div>
            </div>
            <div class="popup-map-row3">
               <div class="popup-map-row3-left">Тип отчета</div>
            </div>
            <div class="popup-map-row-check-1">
               <div class="radio-arr popup-mapping"><span class="spacer"><input type="radio" name="radiog_dark" id="radio1" class="css-checkbox" /><label for="radio1" class="css-label radGroup1 radGroup2 control-black">Об использовании лесов</label></div>
               <div class="radio-arr popup-mapping"><span class="spacer"><input type="radio" name="radiog_dark" id="radio2" class="css-checkbox" checked="checked"/><label for="radio2" class="css-label radGroup1 radGroup2 control-black">О воспроизведении лесов</label></div>
            </div>
            <div class="popup-map-row3">
               <div class="popup-map-row3-left">Организация</div>
            </div>
            <div class="input-kv-map">
               <div class="kv">Наименование организации</div>
               <input type="text" name="" class="input-left-controls-pop-add-kvartal-popmap">
               <div class="icon-restore tit" ></div>
            </div>
            <div class="input-kv-map">
               <div class="kv">ИНН</div>
               <input type="text" name="" class="input-left-controls-pop-add-kvartal-popmap">
               <div class="icon-restore tit" ></div>
            </div>
            <div class="popup-map-row3">
               <div class="popup-map-row3-left">Расположение объекта</div>
            </div>
            <div class="input-kv-map">
               <div class="kv">Субъект РФ</div>
               <input type="text" name="" class="input-left-controls-pop-add-kvartal-popmap">
               <div class="icon-restore tit" ></div>
            </div>
            <div class="input-kv-map">
               <div class="kv">Лесничество</div>
               <input type="text" name="" class="input-left-controls-pop-add-kvartal-popmap">
               <div class="icon-restore tit" ></div>
            </div>
            <div class="input-kv-map">
               <div class="kv">Участковое лесничество</div>
               <input type="text" name="" class="input-left-controls-pop-add-kvartal-popmap">
               <div class="icon-restore tit" ></div>
            </div>
            <div class="input-kv-map">
               <div class="kv">Дача/Урочище</div>
               <input type="text" name="" class="input-left-controls-pop-add-kvartal-popmap">
               <div class="icon-restore tit" ></div>
            </div>
            <div class="input-kv-map">
               <div class="kv">Квартал</div>
               <input type="text" name="" class="input-left-controls-pop-add-kvartal-popmap">
               <div class="icon-restore tit" ></div>
            </div>
            <div class="input-kv-map">
               <div class="kv">Выдел</div>
               <input type="text" name="" class="input-left-controls-pop-add-kvartal-popmap">
               <div class="icon-restore tit" ></div>
            </div>
            <div class="input-kv-map">
               <div class="kv">Делянка</div>
               <input type="text" name="" class="input-left-controls-pop-add-kvartal-popmap">
               <div class="icon-restore tit" ></div>
            </div>
            <div class="input-kv-map">
               <div class="kv">Площадь</div>
               <input type="text" name="" class="input-left-controls-pop-add-kvartal-popmap">
               <div class="icon-restore tit" ></div>
            </div>
            <div class="popup-map-row3">
               <div class="popup-map-row3-left">Хозмероприятия</div>
            </div>
            <div class="input-kv-map">
               <div class="kv">Форма рубки</div>
               <input type="text" name="" class="input-left-controls-pop-add-kvartal-popmap">
               <div class="icon-restore tit" ></div>
            </div>
            <div class="input-kv-map">
               <div class="kv">Тип рубки</div>
               <input type="text" name="" class="input-left-controls-pop-add-kvartal-popmap">
               <div class="icon-restore tit" ></div>
            </div>
         </div>
         <div class="popup-map-bottom">
            <div class="popup-map-bottom-left" on:click="{closeReport}">Отмена</div>
            <div class="popup-map-bottom-right" on:click="{createReport}">Создать отчет</div>
         </div>
      </div>
      <!--КОНЕЦ ПОП-АПА СОЗДАНИЯ ОТЧЕТОВ-->
{/if}

<div class="left-controls-pop-add-kvartal-notice notice-create-report">
         <div class="left-controls-pop-add-kvartal-notice-r1">
         <div class="left-controls-pop-add-kvartal-notice-r1-text ">Создание отчетов</div>
         <div class="left-controls-pop-add-kvartal-notice-r1-right "></div>
         </div>
         <div class="left-controls-pop-add-kvartal-notice-r2">
         Создать новый отчет можно по нескольким делянкам или по одной. Для этого вам необходимо выбрать слой, после чего выделить нужные делянки с помощью чекбоксов
         </div>
</div>

<div class="left-controls-pop-add-kvartal-notice notice-create-report1">
         <div class="left-controls-pop-add-kvartal-notice-r1">
         <div class="left-controls-pop-add-kvartal-notice-r1-text ">Создание отчетов</div>
         <div class="left-controls-pop-add-kvartal-notice-r1-right "></div>
         </div>
         <div class="left-controls-pop-add-kvartal-notice-r2">
         Создать новый отчет можно по нескольким делянкам или по одной. Для этого вам необходимо выбрать слой, после чего выделить нужные делянки с помощью чекбоксов
         </div>
</div>
