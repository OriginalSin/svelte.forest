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

let addDelynkaFlag = null;
const addDelynka0 = () => { addDelynkaFlag = 0; };
const addDelynka1 = () => { addDelynkaFlag = 1; };
const addDelynka2 = () => { addDelynkaFlag = 2; };

const setLayer = (id) => {
	let it = gmxMap.layersByID[id],
		bbox = it.getBounds();
	map.fitBounds(bbox);
	map.addLayer(it);
};
const changeDelynka = (ev) => {
	let id = ev.target.selectedOptions[0].value;
	setLayer(id);
	console.log('changeDelynka', id);
};

const changeKvartal = (ev) => {
	let id = ev.target.selectedOptions[0].value;
	setLayer(id);
	console.log('changeKvartal', id);
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
         <div class="left-controls-pop-add-main-cont">
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
                        <select>
                           <option value="0">Сеть1 </option>
                           <option value="7382">Сеть2 </option>
                        </select>
                     </div>
                  </div>
                  <div class="input-kv inp-icon-before">
                     <div class="kv">Квартал</div>
                     <input type="text" name="" class="input-left-controls-pop-add-kvartal">
                  </div>
                  <div class="input-kv-1 margin-top--7">
                     <div class="input-kv-1-el1">
                        <div class="kv-1">Координаты опорной точки</div>
                        <input type="text" name="" class="input-left-controls-pop-add-kvartal-1" placeholder="lat">
                     </div>
                     <div class="input-kv-1-el2">
                        <div class="kv-1"></div>
                        <input type="text" name="" class="input-left-controls-pop-add-kvartal-1 right-inp" placeholder="long">
                     </div>
                  </div>
                  <div class="left-controls-pop-lat-long-output">
                     <div class="left-controls-pop-lat-long-output-text">00'00'07.2'' N, 00'00'00'' W</div>
                  </div>
                  <div class="input-kv-1 margin-top--7">
                     <div class="input-kv-1-el1">
                        <div class="kv-1">Привязочный ход</div>
                        <input type="text" name="" class="input-left-controls-pop-add-kvartal-1 hod1" placeholder="192500">
                     </div>
                     <div class="input-kv-1-el2">
                        <div class="kv-1"></div>
                        <input type="text" name="" class="input-left-controls-pop-add-kvartal-1 hod2" placeholder="192500">
                     </div>
                     <div class="input-kv-1-el4"></div>
                     <div class="input-kv-1-el3"></div>
                  </div>
                  <div class="input-kv-1 margin-top--7">
                     <div class="input-kv-1-el1">
                        <div class="kv-1">Контур делянки&nbsp;&nbsp;&nbsp;&nbsp;</div>
                        <input type="text" name="" class="input-left-controls-pop-add-kvartal-1 hod1" placeholder="192500">
                     </div>
                     <div class="input-kv-1-el2">
                        <div class="kv-1"></div>
                        <input type="text" name="" class="input-left-controls-pop-add-kvartal-1 hod2" placeholder="192500">
                     </div>
                     <div class="input-kv-1-el4"></div>
                     <div class="input-kv-1-el3"></div>
                  </div>
               </div>
               <div class="left-controls-pop-add-kvartal-r1-bottom"></div>
               <div class="left-controls-pop-add-kvartal-r-bot2">
                  <div class="left-controls-pop-add-kvartal-r-bot2-left" on:click={addDelynka0}>Отмена</div>
                  <div class="left-controls-pop-add-kvartal-r-bot2-right" on:click={addDelynka2}>Далее</div>
               </div>
            </div>
         </div>
         <!--КОНЕЦ ПОП-АП ДОБАВЛЕНИЕ ДЕЛЯНКИ-1-->
{:else if addDelynkaFlag === 2}
         <!--НАЧАЛО ПОП-АП ДОБАВЛЕНИЕ ДЕЛЯНКИ-2-->
         <div class="left-controls-pop-add-main-cont">
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
         </div>
         <!--КОНЕЦ ПОП-АП ДОБАВЛЕНИЕ ДЕЛЯНКИ-2-->
{/if}

