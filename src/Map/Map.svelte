<script>
    import {onMount, createEventDispatcher, setContext, getContext} from 'svelte';
    // import {loadMap} from '../Map/Actions.js';
    
    let mapContainer;    
    export let leafletMap = null;

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
    
    const resize = () => {
        leafletMap.invalidateSize();
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
		leafletMap = L.map(mapContainer, {
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
		});
		let osm = L.tileLayer('//tilessputnik.ru/{z}/{x}/{y}.png', {
			maxZoom: 21,
			maxNativeZoom: 18,
			attribution: '<a target="_blank" href="http://maps.sputnik.ru" class="">Спутник</a> - © Ростелеком | © <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
		});
		leafletMap.addLayer(osm);
		resize();
		dispatch('leafletMap', leafletMap);
    });
</script>

<div id="map" bind:this="{mapContainer}">
</div>
