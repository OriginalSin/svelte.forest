<script>
    import {onMount, beforeUpdate, setContext, getContext} from 'svelte';
	import { fade, fly } from 'svelte/transition';

	import { baseContVisible, leafletMap } from '../../stores.js';
	
	let base_visible = false;
	const unsubscribe = baseContVisible.subscribe(value => {
		base_visible = value;
	});
	let toggleBase = () => {
		baseContVisible.update(n => !n);
	};

	let map,
	baseLayers = {
 		1: L.tileLayer('//{s}tilecart.kosmosnimki.ru/kosmo/{z}/{x}/{y}.png', {
				maxZoom: 21,
				maxNativeZoom: 18,
				attribution: '<a target="_blank" href="http://maps.sputnik.ru" class="">Спутник</a> - © Ростелеком | © <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
			}),
		2: L.tileLayer('//tilessputnik.ru/{z}/{x}/{y}.png', {
				maxZoom: 21,
				maxNativeZoom: 18,
				attribution: '<a target="_blank" href="http://maps.sputnik.ru" class="">Спутник</a> - © Ростелеком | © <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
			}),
		3: L.tileLayer('//api.maptiler.com/maps/topo/256/{z}/{x}/{y}.png?key=FrA3SZOPvBcowh6thoTf', {
				maxZoom: 22,
				// maxNativeZoom: 18,
				attribution: '<a href="https://www.maptiler.com/copyright/" target="_blank">© MapTiler</a> <a href="https://www.openstreetmap.org/copyright" target="_blank">© OpenStreetMap contributors</a>'
			}),
		4: L.tileLayer('//api.mapbox.com/v4/mapbox.streets/{z}/{x}/{y}.png?access_token=pk.eyJ1Ijoia29zbW9zbmlta2lydSIsImEiOiJjaWhxMHNlZDgwNGFldHBtMjdyejQ3YTJ3In0.3UAAWcIBabrbUhHwmp1WjA', {
				maxZoom: 22,
				maxNativeZoom: 22,
				attribution: '<a href="https://www.mapbox.com/about/maps/" target="_blank">© Mapbox</a> <a href="http://www.openstreetmap.org/about/" target="_blank">© OpenStreetMap</a>'
			}),
		5: L.tileLayer.Mercator('//{s}tilecart.kosmosnimki.ru/r/{z}/{x}/{y}.png', {
				maxZoom: 21,
				maxNativeZoom: 18,
				attribution: '<a target="_blank" href="http://maps.sputnik.ru" class="">Спутник</a> - © Ростелеком | © <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
			}),
	};
	const unsubscribe1 = leafletMap.subscribe(value => {
		map = value;
		if (map) {
// console.log('map', map);
			map.addLayer(baseLayers[2]);

		}
	});
	let setBase = (ev) => {
// console.log('setBase', ev);
		let target = ev.target,
			cont = target.parentNode.parentNode.parentNode,
			arr = cont.getElementsByTagName('input');
		for (let i = 0, len = arr.length; i < len; i++) {
			let nm = i + 1,
				it = baseLayers[nm],
				name ='radio' + nm,
				isVisible = target.classList.contains(name);
			if (isVisible) {
				if (!it._map) { map.addLayer(it); }
			} else {
				if (it._map) { map.removeLayer(it); }
			}
		}
	};
/*
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
		// leafletMap = this;
		// leafletMap.on('zoomend', setZoom);
	});

	beforeUpdate(() => {
		console.log('the component is about to update', leafletMap);
	});
	*/
</script>

      <div class="flexWrapper {base_visible ? '' : 'hidden'}" in:fly="{{ y: 200, duration: 2000 }}" out:fade>
         <div class="right-controls-pop" id="control-pop">
            <div class="right-controls-pop-r1">
               <div class="right-controls-pop-r1-text">Подложка</div>
               <div class="right-controls-pop-r1-сlose" id="close-pop" on:click={toggleBase}></div>
            </div>
            <div class="right-controls-pop-r2">
               <div class="radio-arr"><span class="spacer"><input on:click={setBase} type="radio" name="radiog_dark" id="radio1" class="radio1 css-checkbox" /><label for="radio1" class="css-label radGroup1 radGroup2">Карта</label></div>
               <div class="radio-arr"><span class="spacer"><input on:click={setBase} type="radio" name="radiog_dark" id="radio2" class="radio2 css-checkbox" checked="checked"/><label for="radio2" class="css-label radGroup1 radGroup2">Спутник ру</label></div>
               <div class="radio-arr"><span class="spacer"><input on:click={setBase} type="radio" name="radiog_dark" id="radio3" class="radio3 css-checkbox" /><label for="radio3" class="css-label radGroup1 radGroup2">MapTiler Topo</label></div>
               <div class="radio-arr"><span class="spacer"><input on:click={setBase} type="radio" name="radiog_dark" id="radio4" class="radio4 css-checkbox" /><label for="radio4" class="css-label radGroup1 radGroup2">MapBox</label></div>
               <div class="radio-arr"><span class="spacer"><input on:click={setBase} type="radio" name="radiog_dark" id="radio5" class="radio5 css-checkbox" /><label for="radio5" class="css-label radGroup1 radGroup2">Рельеф RuMap</label></div>
            </div>
            <div class="right-controls-pop-r3">
               <label class="control control-checkbox">
               Координатная сетка
               <input type="checkbox" checked="checked" />
               <div class="control_indicator"></div>
            </div>
         </div>
      </div>
