<script>
	import { leafletMap, mapLayers } from '../../stores.js';

    export let item;
    export let map;
    export let gmxMap;
    //let is;

	const unsubscribe = leafletMap.subscribe(value => {
		map = value;
	});
	const unsubscribe1 = mapLayers.subscribe(value => {
		gmxMap = value;
	});

	const toggleLayer = (ev) => {
console.log('toggleLayer', item, gmxMap);
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

</script>

<div class="sidebar-opened-row-el">
	<div class="sidebar-opened-el-left">
	   <label class="control control-checkbox control-black {item.group ? 'group' : item.properties.GeometryType} inside-{item.level - 1}">
	   {item.properties.title}
	   <input type="checkbox" on:change={toggleLayer} />
	   <div class="control_indicator"></div>
	</div>
	<div class="sidebar-opened-el-right"></div>
	<div class="sidebar-opened-el-right">
		<div class="sidebar-opened-el-right-1" title="Центрировать"></div>
		<div class="sidebar-opened-el-right-2" title="Редактор объектов"></div>
		<div class="sidebar-opened-el-right-3 {item.properties.IsRasterCatalog ? '' : 'hidden'}" title="Прозрачность"></div>
	</div>
</div>


<style>

</style>
