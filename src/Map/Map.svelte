<script>
    import {onMount, createEventDispatcher, setContext, getContext} from 'svelte';
    // import {loadMap} from '../Map/Actions.js';

	import { leafletMap, mapLayers, mapTree, worker } from '../stores.js';
	// import Store from '../stores.js';

	import Requests from '../worker/Requests.js';
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
			// .addControl(L.control.gmxBottom())
			.addControl(L.control.gmxLogo({position: 'gmxbottomright'}))	// {type: 'color'}
			.addControl(L.control.gmxCopyright({type: 'window', position: 'gmxbottomright'}))
            .addControl(L.control.gmxLocation());

		resize();
		leafletMap.set(map);

		L.gmx.loadMap(mapID)
			.then((res) => {
	// console.log('loadMap', res);
				mapLayers.set(res);
			});

		dataWorker.onmessage = (res) => {
			let data = res.data,
				cmd = data.cmd,
				json = data.out;

			if (cmd === 'getMap') {
				mapTree.set(json);
			}
	// console.log('onmessage', json);
		};
		let pars = Requests.parseURLParams(location.search);
		dataWorker.postMessage({cmd: 'getMap', mapID: pars.main.length ? pars.main[0] : mapID, search: location.search});
    });
</script>

<div id="map" bind:this="{mapContainer}">
</div>
