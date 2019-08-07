<script>
    import {onMount, beforeUpdate, setContext, getContext} from 'svelte';
	
	let leafletMap;
	let zoom;
	let _this = this;

	let setZoom = ((ev) => {
		let z = leafletMap.getZoom();
		zoom.textContent = z;
		console.log('setZoom', leafletMap.getZoom(), ev);
	});
	let zoomIn = (() => {
		let z = parseInt(zoom.textContent);
		console.log('zoomIn', leafletMap.getZoom(), zoom);
		leafletMap.setZoom(z + 1);
	});
	let zoomOut = (() => {
		let z = parseInt(zoom.textContent);
		console.log('zoomOut', leafletMap.getZoom());
		leafletMap.setZoom(z - 1);
	});
	// let leafletMap = getContext('leafletMap');
	// console.log('leafletMap', zoom, leafletMap);
	L.Map.addInitHook(function () {
		leafletMap = this;
		leafletMap.on('zoomend', setZoom);
	});

	beforeUpdate(() => {
		console.log('the component is about to update', leafletMap);
	});
</script>

	 <div class="right-controls-3">
		<div class="right-controls-3-1" on:click={zoomIn}></div>
		<div class="right-controls-3-2" bind:this={zoom}>5</div>
		<div class="right-controls-3-3" on:click={zoomOut}></div>
	 </div>
