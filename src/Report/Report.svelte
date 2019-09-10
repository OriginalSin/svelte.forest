<script>
   import {onMount, beforeUpdate, setContext, getContext} from 'svelte';
   
	import * as Config from '../Config.js';
	import * as Store from '../stores.js';
	import Utils from '../Utils.js';
	import SelectInput from './SelectInput.svelte';

const stateStorage = Utils.getState();
let changedParams = {test: 23};
let gmxMap = null;
const unsubscribe = Store.mapLayers.subscribe(value => {
	gmxMap = value;
	// console.log('gmxMap', Utils, gmxMap);
});
let map = null; Store.leafletMap.subscribe(value => { map = value; });

let reportCounts = 0; Store.reportsCount.subscribe(json => {
	let count = json.limit - json.used;
	reportCounts = count > 0 ? count : 0;
});
Utils.getReportsCount()

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

const _closeNotice = (nm) => {
	let name = 'notice-create-report',
		node;
	if (!nm || nm === 0) {
		node = document.getElementsByClassName(name)[0];
		if (node) { node.classList.add('hidden'); }
	}
	if (!nm || nm > 0) {
		node = document.getElementsByClassName(name + nm)[0];
		if (node) { node.classList.add('hidden'); }
	}
};

const changeDelynka = (ev) => {
	let id = ev ? ev.target.selectedOptions[0].value : null;
	if (id) {
		delynkaLayer = _setLayer(id);
		Utils.getLayerItems(delynkaLayer, {type: 'delynka'})
	} else {
		delynkaLayer = null;
		delItems = null;
		reportIsOpen = null;
		_closeNotice();
	}
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
		_closeNotice();
		// console.log('openReport', delynkaLayer);
	}
};
const closeReport = (ev) => { reportIsOpen = null; };

const toggleHint = (ev) => {
	let target = ev.target,
		name = 'notice-create-report' + (target.classList.contains('icon-report') ? '' : '1'),
		node = document.getElementsByClassName(name)[0];
	if (node.classList.contains('hidden')) {
		node.classList.remove('hidden');
	} else {
		node.classList.add('hidden');
	}
};

const _checkForm = (tag, pk) => {
	let form = document.getElementsByClassName('report-form')[0];
	/*,
		arr = prnt.getElementsByTagName(tag || 'input'),
		i, len, key;
*/
	return Object.keys(Config.fields).reduce((p, c) => {
		let el = form[c];
		if (el) {
			p[c] = el.value;
		} else {
			p[c] = '';
		}
		console.log(c, p);
		return p;
	}, {})
	/*
	for (i = 0, len = form.elements.length; i < len; i++) {
		let node = form.elements[i],
			key = node.name;
		if ()
		pk[key] = tag === 'input' ? {value: node.value, field: ''} : {value: '', field: node.selectedOptions[0].value};
	}
	return pk;*/
};

const createReport = (ev) => {
	if (delynkaLayer) {
		changedParams = _checkForm('input', changedParams);
		//_checkForm('select', changedParams);

		//Utils.saveState(changedParams);
	console.log('createReport', stateStorage, changedParams);
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
            <div class="sidebar-opened-row1-left">Лимит:<div class="spacer-7"></div>{reportCounts}</div>
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
            <div class="sidebar-opened-row-tabs-add-text {delynkaLayer ? '' : 'text-slack'}" on:click="{openReport}">Создать отчет</div>
            <div class="left-controls-pop-add-kvartal-r-bot1-right icon-report" on:click="{toggleHint}"></div>
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
					 <label class="control control-checkbox control-black inside-0 delyanka {item[delItems.fieldKeys.FRSTAT] ? 'delyanka-opened' : ''}">
					 Делянка {item[delItems.fieldKeys.gmx_id]}
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
            <div class="ques-map" on:click="{toggleHint}"></div>
            <div class="restore-icon-ot" title="Восстановить значения из ранее созданного отчета"></div>
         </div>
         <div class="popup-map-row2">
            <div class="popup-map-row2-left">Очистить поля ввода</div>
         </div>
         <div class="sidebar-opened-el-container margin-bot-50" id="style-4">
 <form class="report-form">
            <div class="input-kv-1-el2-1-popup-map">
               <div class="kv-1-1">Масштаб</div>
               <div class="styled-select-1-1">
                  <select name="scale">
{#each Config.scales as item}
	<option value="{item.value}">{item.title}</option>
{/each}
                  </select>
               </div>
            </div>
            <div class="popup-map-row3">
               <div class="popup-map-row3-left">Тип отчета</div>
            </div>
            <div class="popup-map-row-check-1">
               <div class="radio-arr popup-mapping"><span class="spacer"><input value="ИЛ" type="radio" name="report_t" id="radio1" class="css-checkbox" /><label for="radio1" class="css-label radGroup1 radGroup2 control-black">Об использовании лесов</label></div>
               <div class="radio-arr popup-mapping"><span class="spacer"><input value="ВЛ" type="radio" name="report_t" id="radio2" class="css-checkbox" checked="checked"/><label for="radio2" class="css-label radGroup1 radGroup2 control-black">О воспроизведении лесов</label></div>
            </div>
            <div class="popup-map-row3">
               <div class="popup-map-row3-left">Организация</div>
            </div>
            <div class="input-kv-map">
               <div class="kv">Наименование организации</div>
               <input type="text" name="company" class="input-left-controls-pop-add-kvartal-popmap">
               <div class="icon-restore tit" ></div>
            </div>
			<SelectInput key="company" bind:delItems={delItems} bind:changedParams={changedParams} />
			<SelectInput key="inn" bind:delItems={delItems} bind:changedParams={changedParams} />

            <div class="popup-map-row3">
               <div class="popup-map-row3-left">Расположение объекта</div>
            </div>
            <div class="input-kv-map">
               <div class="kv">Субъект РФ</div>
               <input type="text" name="region" class="input-left-controls-pop-add-kvartal-popmap">
               <div class="icon-restore tit" ></div>
            </div>
            <div class="input-kv-map">
               <div class="kv">Лесничество</div>
               <input type="text" name="forestr" class="input-left-controls-pop-add-kvartal-popmap">
               <div class="icon-restore tit" ></div>
            </div>
            <div class="input-kv-map">
               <div class="kv">Участковое лесничество</div>
               <input type="text" name="subforest" class="input-left-controls-pop-add-kvartal-popmap">
               <div class="icon-restore tit" ></div>
            </div>
            <div class="input-kv-map">
               <div class="kv">Дача/Урочище</div>
               <input type="text" name="dacha" class="input-left-controls-pop-add-kvartal-popmap">
               <div class="icon-restore tit" ></div>
            </div>
            <div class="input-kv-map">
               <div class="kv">Квартал</div>
               <input type="text" name="kvartal" class="input-left-controls-pop-add-kvartal-popmap">
               <div class="icon-restore tit" ></div>
            </div>
            <div class="input-kv-map">
               <div class="kv">Выдел</div>
               <input type="text" name="vydel" class="input-left-controls-pop-add-kvartal-popmap">
               <div class="icon-restore tit" ></div>
            </div>
            <div class="input-kv-map">
               <div class="kv">Делянка</div>
               <input type="text" name="delyanka" class="input-left-controls-pop-add-kvartal-popmap">
               <div class="icon-restore tit" ></div>
            </div>
            <div class="input-kv-map">
               <div class="kv">Площадь</div>
               <input type="text" name="area" class="input-left-controls-pop-add-kvartal-popmap">
               <div class="icon-restore tit" ></div>
            </div>
            <div class="popup-map-row3">
               <div class="popup-map-row3-left">Хозмероприятия</div>
            </div>
            <div class="input-kv-map">
               <div class="kv">Форма рубки</div>
               <input type="text" name="form_rub" class="input-left-controls-pop-add-kvartal-popmap">
               <div class="icon-restore tit" ></div>
            </div>
            <div class="input-kv-map">
               <div class="kv">Тип рубки</div>
               <input type="text" name="type_rub" class="input-left-controls-pop-add-kvartal-popmap">
               <div class="icon-restore tit" ></div>
            </div>
</form>
         </div>
         <div class="popup-map-bottom">
            <div class="popup-map-bottom-left" on:click="{closeReport}">Отмена</div>
            <div class="popup-map-bottom-right" on:click="{createReport}">Создать отчет</div>
         </div>
      </div>
      <!--КОНЕЦ ПОП-АПА СОЗДАНИЯ ОТЧЕТОВ-->
{/if}

<div class="left-controls-pop-add-kvartal-notice notice-create-report hidden">
         <div class="left-controls-pop-add-kvartal-notice-r1">
         <div class="left-controls-pop-add-kvartal-notice-r1-text ">Создание отчетов</div>
         <div class="left-controls-pop-add-kvartal-notice-r1-right "></div>
         </div>
         <div class="left-controls-pop-add-kvartal-notice-r2">
         Создать новый отчет можно по нескольким делянкам или по одной. Для этого вам необходимо выбрать слой, после чего выделить нужные делянки с помощью чекбоксов
         </div>
</div>

<div class="left-controls-pop-add-kvartal-notice notice-create-report1 hidden">
         <div class="left-controls-pop-add-kvartal-notice-r1">
         <div class="left-controls-pop-add-kvartal-notice-r1-text ">Создание отчетов</div>
         <div class="left-controls-pop-add-kvartal-notice-r1-right "></div>
         </div>
         <div class="left-controls-pop-add-kvartal-notice-r2">
         Создать новый отчет можно по нескольким делянкам или по одной. Для этого вам необходимо выбрать слой, после чего выделить нужные делянки с помощью чекбоксов
         </div>
</div>
