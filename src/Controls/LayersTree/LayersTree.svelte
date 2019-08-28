<script>
   import {onMount, beforeUpdate, setContext, getContext} from 'svelte';
   
   // import { mapTree, leafletMap } from '../../stores.js';
	import * as Store from '../../stores.js';
    import LineNode from './LineNode.svelte';

	// let base_visible = false;
   // const unsubscribe = baseContVisible.subscribe(value => {
   // base_visible = value;
   // });
   // let toggleBase = () => {
   // baseContVisible.update(n => !n);
   // };
    // export let mapID;
    export let layersArr = [];

// console.log('ssss', mapID, Store.mapTree, Store.leafletMap)
	let tree = null;
	const unsubscribe = Store.mapTree.subscribe(value => {
		tree = value;
		if (tree) {
console.log('tree', tree);
			if (tree.Status === 'error') {
				console.warn('tree Error: ', tree);
				return tree;
			} else if (tree.layers) {
				layersArr = tree.layers;
			}
			// map.addLayer(baseLayers[2]);
		}
	});

	// let dataWorker = null;
	// const unsubscribeWorker = Store.worker.subscribe(value => {
		// dataWorker = value;
		// if (dataWorker) {
// console.log('tree', mapID, dataWorker);
			// dataWorker.postMessage({cmd: 'getMap', mapID: mapID});
		// }
	// });

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
	{#each layersArr as item}
		<LineNode item={item} />
	{/each}
      </div>
   </div>
</div>