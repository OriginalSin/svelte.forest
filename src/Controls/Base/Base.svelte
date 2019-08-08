<script>
    import {onMount, beforeUpdate, setContext, getContext} from 'svelte';
	import { fade, fly } from 'svelte/transition';

	import { baseContVisible } from '../../stores.js';

	let base_visible = false;
	const unsubscribe = baseContVisible.subscribe(value => {
console.log('sss 7777777 ssssss', value);
		base_visible = value;
	});
	let toggleBase = () => {
		baseContVisible.update(n => !n);
	};

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

      <div class="flexWrapper {base_visible ? '' : 'hidden'}" in:fly="{{ y: 200, duration: 2000 }}" out:fade>
         <div class="right-controls-pop" id="control-pop">
            <div class="right-controls-pop-r1">
               <div class="right-controls-pop-r1-text">Подложка</div>
               <div class="right-controls-pop-r1-сlose" id="close-pop"></div>
            </div>
            <div class="right-controls-pop-r2">
               <div class="radio-arr"><span class="spacer"><input type="radio" name="radiog_dark" id="radio1" class="css-checkbox" /><label for="radio1" class="css-label radGroup1 radGroup2">Карта</label></div>
               <div class="radio-arr"><span class="spacer"><input type="radio" name="radiog_dark" id="radio2" class="css-checkbox" checked="checked"/><label for="radio2" class="css-label radGroup1 radGroup2">Спутник ру</label></div>
               <div class="radio-arr"><span class="spacer"><input type="radio" name="radiog_dark" id="radio3" class="css-checkbox" /><label for="radio3" class="css-label radGroup1 radGroup2">MapTiler Topo</label></div>
               <div class="radio-arr"><span class="spacer"><input type="radio" name="radiog_dark" id="radio4" class="css-checkbox" /><label for="radio4" class="css-label radGroup1 radGroup2">MapBox</label></div>
               <div class="radio-arr"><span class="spacer"><input type="radio" name="radiog_dark" id="radio5" class="css-checkbox" /><label for="radio5" class="css-label radGroup1 radGroup2">Рельеф RuMap</label></div>
            </div>
            <div class="right-controls-pop-r3">
               <label class="control control-checkbox">
               Координатная сетка
               <input type="checkbox" checked="checked" />
               <div class="control_indicator"></div>
            </div>
         </div>
      </div>
