<script>
   import {onMount, beforeUpdate, setContext, getContext} from 'svelte';
   
   // import { mapTree, leafletMap } from '../../stores.js';
  import * as Store from '../stores.js';
  import Utils from '../Utils.js';

let gmxMap = null;
const unsubscribe = Store.mapLayers.subscribe(value => {
	gmxMap = value;
	// console.log('gmxMap', Utils, gmxMap);
});
let map = null;
const unsubscribe1 = Store.leafletMap.subscribe(value => {
	map = value;
});

let kvData = null;
Store.kvItems.subscribe(value => {
	if (value) {
		kvData = value;
		let kv = -1;
		kvData.fields.find((c, i) => {
			if (c === 'kv') {
				kv = i;
				return true
			}
			return false;
		});
		kvData.optionsField = kv;
	}
console.log('kvData', kvData)
});

let addDelynkaFlag = null;
const addDelynka0 = () => { addDelynkaFlag = 0; };
const addDelynka1 = () => { addDelynkaFlag = 1; };
const addDelynka2 = () => { addDelynkaFlag = 2; };

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
const changeDelynka = (ev) => {
	let id = ev.target.selectedOptions[0].value;
	delynkaLayer = _setLayer(id);
	Utils.getLayerItems(delynkaLayer)
	console.log('changeDelynka', id);
};

const changeKvartal = (ev) => {
	let id = ev.target.selectedOptions[0].value;
	kvartalLayer = _setLayer(id);
	Utils.getLayerItems(kvartalLayer)
	console.log('changeKvartal', id);
};

const getOptionsData = (pt, subVal, cnt) => {
	let nm = pt.optionsField;
	return '<option value="' + Object.keys(pt.values.reduce((p, c) => {
		if (!subVal || c.indexOf(subVal) !== -1) {
			let out = c[nm];
			p[out] = true;
		}
		return p;
	}, {})).slice(0, cnt || 50).join('" /><option value="') + ' />';
};

const getOptions = (pt, name) => {
	let node = name ? document.body.getElementsByClassName(name)[0] : null;
	return getOptionsData(pt, node && node.value);
};

let snap = {
	snap: [[]],
	ring: [[]]
};
let latlng = null;
let latlngStr = '';
const setKvartal = (ev) => {
	let kv = ev.target.value,
		nm = kvData.optionsField;
	let pt = kvData.values.find((c) => c[nm] == kv);
	if (pt) {
		let bbox = L.gmxUtil.getGeometryBounds(pt[pt.length - 1]);
		latlng = bbox.getCenter();
		latlngStr = L.gmxUtil.latLonFormatCoordinates2(latlng[0], latlng[1]);
		map.fitBounds(L.latLngBounds([[bbox.min.y, bbox.min.x], [bbox.max.y, bbox.max.x]]));
		snap.latlng = latlng;
	// console.log('setKvartal', latlng, pt);
	}
};

const nextPoint = (node) => {
};

const onKeyUp = (ev) => {
	if (ev.key === 'Enter') {
		nextPoint(ev.target, true);
	}
};

const setPoint = (ev) => {
	let node = ev.target,
		key = ev.data,
		_focus = null;

	if (node.value === '') {
		return;
	}
};

</script>

<div class="sidebar-opened">
   <div class="sidebar-opened-row1">
      <div class="sidebar-opened-row1-left">{gmxMap.properties && gmxMap.properties.title || 'Название проекта/компании'}</div>
      <div class="sidebar-opened-row1-right" title="Редактировать"></div>
   </div>
         <div class="sidebar-opened-el-container" id="style-4">
            <div class="tabs">
               <input id="tab1" type="radio" name="tabs" checked>
               <label for="tab1" title="Wordpress">Делянки</label>
               <div class="line-tabs-separator"></div>
               <input id="tab2" type="radio" name="tabs">
               <label for="tab2" title="Windows">Квартальные сети</label>
               <section id="content-tab1">
                  <div class="sidebar-opened-row1">
                     <div class="check-50">
                        <input type="checkbox" name="checkboxG4" id="checkboxG4" class="css-checkbox2" /><label for="checkboxG4" class="css-label2 radGroup1">Снимки Landsat-8</label>
                     </div>
                     <div class="check-50">
                        <input type="checkbox" name="checkboxG5" id="checkboxG5" class="css-checkbox2" checked="checked"/><label for="checkboxG5" class="css-label2 radGroup1">Снимки Sentinel-2</label>
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
                     <div class="sidebar-opened-row-tabs-add-text" on:click={addDelynka1}>Добавить делянку</div>
                  </div>
               </section>
               <section id="content-tab2">
                  <div class="sidebar-opened-row-tabs-1">
                     <div class="tabs-input-text">Выбор слоя</div>
                     <div class="tabs-input">
                        <div class="styled-select-1-1">
                           <select on:change={changeKvartal}>
							<option value="" />
  {#each gmxMap.layers as item}
	{#if Utils.isKvartalLayer(item)}
	  <option value="{item.options.layerID}">{item._gmx.rawProperties.title}</option>
	{/if}
  {/each}
                           </select>
                        </div>
                     </div>
                  </div>
               </section>
            </div>
         </div>
</div>

{#if addDelynkaFlag === 1}
         <!--НАЧАЛО ПОП-АП ДОБАВЛЕНИЕ ДЕЛЯНКИ-1-->
         
            <div class="left-controls-pop-add-kvartal">
               <div class="left-controls-pop-add-kvartal-r1">
                  <div class="left-controls-pop-add-kvartal-r1-text">Добавление делянки</div>
                  <div class="left-controls-pop-add-kvartal-r1-close" on:click={addDelynka0}></div>
               </div>
               <div class="left-controls-pop-add-kvartal-r1-bottom margin-bot-0"></div>
               <div class="left-controls-pop-add-kvartal-scroll" id="style-4">
                  <div class="left-controls-pop-add-kvartal-r1">
                     <div class="popup-title">Шаг 1. Контур делянки</div>
                  </div>
                  <div class="input-kv-1-el2-2-3">
                     <div class="kv-1-1">Слой квартальной сети</div>
                     <div class="styled-select-1-1">
                        <select on:change={changeKvartal}>
							<option value="" />
  {#each gmxMap.layers as item}
	{#if Utils.isKvartalLayer(item)}
	  <option value="{item.options.layerID}">{item._gmx.rawProperties.title}</option>
	{/if}
  {/each}
                        </select>
                     </div>
                  </div>
                  <div class="input-kv inp-icon-before">
                     <div class="kv">Квартал</div>
                     <input on:change={setKvartal} type="text" list="kvartal" name="kvartal" class="kvartal input-left-controls-pop-add-kvartal">
					 <datalist id="kvartal">
						{@html kvData && getOptions(kvData, 'kvartal')}
					 </datalist>
                  </div>
                  <div class="input-kv-1 margin-top--7">
                     <div class="input-kv-1-el1">
                        <div class="kv-1">Координаты опорной точки</div>
                        <input value="{latlng && latlng[1]}" type="text" name="lat" class="input-left-controls-pop-add-kvartal-1" placeholder="lat">
                     </div>
                     <div class="input-kv-1-el2">
                        <div class="kv-1"></div>
                        <input value="{latlng && latlng[0]}" type="text" name="lon" class="input-left-controls-pop-add-kvartal-1 right-inp" placeholder="long">
                     </div>
                  </div>
                  <div class="left-controls-pop-lat-long-output">
                     <div class="left-controls-pop-lat-long-output-text">{latlngStr}</div>
                  </div>
{#each snap.snap as it, i}
                  <div class="input-kv-1 margin-top--7">
					 <div class="input-kv-1-el1">
	{#if !i}
                        <div class="kv-1">Привязочный ход</div>
	{/if}
                        <input type="text" value="{(it[2] || it[0]) !== undefined ? it[2] || it[0] : ''}" name="snap{i}_a" on:keyup={onKeyUp} on:input={setPoint} class="input-left-controls-pop-add-kvartal-1 hod1" placeholder="Angle">
                     </div>
                     <div class="input-kv-1-el2">
                        <div class="kv-1"></div>
                        <input type="text" value="{it[1] !== undefined ? Math.round(it[1]) : ''}" name="snap{i}_d" on:keyup={onKeyUp} on:input={setPoint} class="input-left-controls-pop-add-kvartal-1 hod2" placeholder="Distance">
                     </div>
                     <div class="input-kv-1-el4" on:click={addDelynka0}></div>
                     <div class="input-kv-1-el3" on:click={addDelynka0}></div>
                  </div>
{/each}

{#each snap.ring as it, i}
                  <div class="input-kv-1 margin-top--7">
                     <div class="input-kv-1-el1">
	{#if !i}
                        <div class="kv-1">Контур делянки&nbsp;&nbsp;&nbsp;&nbsp;</div>
	{/if}
                        <input type="text" value="{(it[2] || it[0]) !== undefined ? it[2] || it[0] : ''}" name="ring{i}_a" on:keyup={onKeyUp} on:input={setPoint} class="input-left-controls-pop-add-kvartal-1 hod1" placeholder="Angle">
                     </div>
                     <div class="input-kv-1-el2">
                        <div class="kv-1"></div>
                        <input type="text" value="{it[1] !== undefined ? Math.round(it[1]) : ''}" name="ring{i}_d" on:keyup={onKeyUp} on:input={setPoint} class="input-left-controls-pop-add-kvartal-1 hod2" placeholder="Distance">
                     </div>
                     <div class="input-kv-1-el4"></div>
                     <div class="input-kv-1-el3"></div>
                  </div>
{/each}
               </div>
               <div class="left-controls-pop-add-kvartal-r1-bottom"></div>
               <div class="left-controls-pop-add-kvartal-r-bot2">
                  <div class="left-controls-pop-add-kvartal-r-bot2-left" on:click={addDelynka0}>Отмена</div>
                  <div class="left-controls-pop-add-kvartal-r-bot2-right" on:click={addDelynka2}>Далее</div>
               </div>
            </div>
         
         <!--КОНЕЦ ПОП-АП ДОБАВЛЕНИЕ ДЕЛЯНКИ-1-->
{:else if addDelynkaFlag === 2}
         <!--НАЧАЛО ПОП-АП ДОБАВЛЕНИЕ ДЕЛЯНКИ-2-->
         
            <div class="left-controls-pop-add-kvartal">
               <div class="left-controls-pop-add-kvartal-r1">
                  <div class="left-controls-pop-add-kvartal-r1-text">Добавление делянки</div>
                  <div class="left-controls-pop-add-kvartal-r1-close" on:click={addDelynka0}></div>
               </div>
               <div class="left-controls-pop-add-kvartal-r1-bottom margin-bot-0"></div>
               <div class="left-controls-pop-add-kvartal-scroll" id="style-4">
                  <div class="left-controls-pop-add-kvartal-r1 margin-bot-13">
                     <div class="popup-title">Шаг 2. Информация</div>
                  </div>
                  <div class="input-kv">
                     <div class="kv">Наименование организации</div>
                     <input type="text" name="" class="input-left-controls-pop-add-kvartal">
                  </div>
                  <div class="input-kv">
                     <div class="kv">Субъект РФ</div>
                     <input type="text" name="" class="input-left-controls-pop-add-kvartal">
                  </div>
                  <div class="input-kv">
                     <div class="kv">Лесничество</div>
                     <input type="text" name="" class="input-left-controls-pop-add-kvartal">
                  </div>
                  <div class="input-kv">
                     <div class="kv">Участковое лесничество</div>
                     <input type="text" name="" class="input-left-controls-pop-add-kvartal">
                  </div>
                  <div class="input-kv">
                     <div class="kv">Дача</div>
                     <input type="text" name="" class="input-left-controls-pop-add-kvartal">
                  </div>
               </div>
               <div class="left-controls-pop-add-kvartal-r1-bottom"></div>
               <div class="left-controls-pop-add-kvartal-r-bot2">
                  <div class="left-controls-pop-add-kvartal-r-bot2-left" on:click={addDelynka0}>Отмена</div>
                  <div class="left-controls-pop-add-kvartal-r-bot2-right">Сохранить</div>
               </div>
            </div>
         
         <!--КОНЕЦ ПОП-АП ДОБАВЛЕНИЕ ДЕЛЯНКИ-2-->
{/if}

