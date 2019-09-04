<script>
	import { leafletMap, mapLayers } from '../../stores.js';

    export let item;
    export let map;
    export let gmxMap;
    export let expanded;
    //let is;

	const unsubscribe = leafletMap.subscribe(value => {
		map = value;
	});
	const unsubscribe1 = mapLayers.subscribe(value => {
		gmxMap = value;
	});

	const toggleLayer = (ev) => {
		if (gmxMap && gmxMap.layersByID) {
			let lid = item.properties.name,
				it = gmxMap.layersByID[lid];
			if (it) {
				if (ev.target.checked) {
					map.addLayer(it);
				} else {
					map.removeLayer(it);
				}
			}
		}
	};

	const fitBounds = (ev) => {
		if (gmxMap && gmxMap.layersByID) {
			let lid = item.properties.name,
				it = gmxMap.layersByID[lid];
			if (it) {
				map.fitBounds(it.getBounds());
			}
		}
	};

	const opacityFilter = (ev) => {
		if (gmxMap && gmxMap.layersByID) {
			let lid = item.properties.name,
				it = gmxMap.layersByID[lid];
			if (it) {
// console.log('opacityFilter', item, gmxMap);
				it.setOpacity(0.5);
			}
		}
	};
	if (item.group) {
		expanded = item.properties.expanded
	}
// console.log('expanded', expanded);

</script>

<div class="sidebar-opened-row-el">
	<div class="sidebar-opened-el-left">
	   <label class="control control-checkbox control-black {item.group ? 'group' : item.properties.GeometryType || item.properties.type} inside-{item.level - 1}">
	   {item.properties.title}
	   <input type="checkbox" on:change={toggleLayer} />
	   <div class="control_indicator" on:click={fitBounds}></div>
	   </label>
	</div>
	<div class="sidebar-opened-el-right"></div>
	<div class="sidebar-opened-el-right">
		<div class="sidebar-opened-el-right-1" on:click={fitBounds} title="Центрировать"></div>
		<div class="sidebar-opened-el-right-2" title="Редактор объектов"></div>
		<div class="sidebar-opened-el-right-3 {item.properties.IsRasterCatalog ? '' : 'hidden'}" on:click={opacityFilter} title="Прозрачность"></div>
	</div>
</div>


<style>

</style>
