<script>
    import {onMount, createEventDispatcher, setContext, getContext} from 'svelte';
    // import {loadMap} from '../Map/Actions.js';

	import { leafletMap, mapTree, worker } from '../stores.js';
	// import Store from '../stores.js';

	// import Requests from '../worker/Requests.js';
	import DataWorker from 'web-worker:../worker';

	let dataWorker = new DataWorker();
	worker.set(dataWorker);

	let mapContainer;    
	let map = null;

    // setContext ('leafletMap', leafletMap);
    export let center = [55.727110, 37.441406];
    export let id = '';
    export let layers = [];    
    export let maxZoom = 21;
    export let minZoom = 1;
    export let zoom = 4;
    export let ftc = 'osm';
    export let srs = 3857; 
    export let distanceUnit = 'auto';
    export let squareUnit = 'auto';
    export let baseLayers = [];    
	export let mapID;

// console.log('ssss', mapID, mapTree, leafletMap)

    const resize = () => {
        map.invalidateSize();
    };

	const dispatch = createEventDispatcher();

    onMount (() => {
		const data = {};
		const {
			DefaultLong,
			DefaultLat,
			MinZoom,
			MaxZoom,
			DefaultZoom,
			DistanceUnit,
			SquareUnit,
		} = data;
		center = [DefaultLat || 60.5, DefaultLong || 95.09];
		minZoom = MinZoom || minZoom;
		maxZoom = MaxZoom || maxZoom;
		zoom = DefaultZoom || zoom;
		distanceUnit = DistanceUnit || distanceUnit;
		squareUnit = SquareUnit || squareUnit;
		map = L.map(mapContainer, {
			center,
			minZoom,
			zoom,
			maxZoom,
			zoomControl: false,
			attributionControl: false,
			trackResize: true,
			fadeAnimation: true,
			zoomAnimation: true,
			distanceUnit: 'auto',
			squareUnit: 'auto',
		})
			.addControl(L.control.gmxBottom())
			.addControl(L.control.gmxCopyright({type: 'window', position: 'gmxbottomright'}))  // default options = {position: 'bottomleft'}
            .addControl(L.control.gmxLocation());   // default options = {position: 'bottomright'}

		resize();
		leafletMap.set(map);

// if (!dataWorker) {
	// setTimeout(function() {
		// dataWorker = new DataWorker();
		dataWorker.onmessage = (res) => {
			let data = res.data,
				cmd = data.cmd,
				json = data.out;

			if (cmd === 'getMap') {
				mapTree.set(json);
			}
	console.log('onmessage', json);
		};
		dataWorker.postMessage({cmd: 'getMap', mapID: mapID});
	// }, 250);
// }
// dataWorker.postMessage('Hello World!');
		
		// Requests.getMap().then((json) => {
	// console.log('json', json);
		// });

		// dispatch('leafletMap', leafletMap);
    });
</script>

<div id="map" bind:this="{mapContainer}">
</div>
