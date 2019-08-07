<script>
    import {onMount, setContext, getContext} from 'svelte';
    import Map from './Map/Map.svelte';
    import Zoom from './Controls/Zoom/Zoom.svelte';

	export let name;
	
	export let leafletMap = null;
	function callbackFunction(event) {
		console.log(`Notify fired! Detail: ${event.detail}`)
	}

</script>

<style>
	h1 {
		color: purple;
	}
</style>



  <div class="header">
	 <div class="block_left">
		<a href="#" class="logo">
		   <div class="logo_left">
			  &nbsp;
		   </div>
		   <div class="logo_left_text">
			  Logo
		   </div>
		</a>
		<div class="left-icons">
		   <div class="left-icons-left">
			  <div class="icons-header-left1"></div>
			  <div class="icons-header-left2"></div>
		   </div>
		   <div class="left-icons-right">
			  <div class="icons-header-right1"></div>
			  <div class="icons-header-right2"></div>
		   </div>
		</div>
		<div class="left-icons-1-act"></div>
		<div class="slider-container">
		   <div class="range-slider">
			  <input class="range-slider__range" type="range" value="30" min="0" max="100">
			  <span class="range-slider__value">30</span>
			  <span class="percent">%</span>
		   </div>
		</div>
	 </div>
	 <div class="block_right">
		<input type="text" name="input" placeholder="Поиск по адресам и координатам" class="header-input">
		<div class="account">Иннокентий Константинопольсикй</div>
	 </div>
  </div>
	  <div class="sidebar">
		 <div class="icons-vert-top">
			<div class="icons-vert-top-1"></div>
			<div class="icons-vert-top-2"></div>
			<div class="icons-vert-top-3"></div>
		 </div>
		 <div class="icons-vert-bottom">
			<div class="icons-vert-bottom-1"></div>
		 </div>
	  </div>
	  <!--Container for Map-->
	<Map on:notify="{callbackFunction}"></Map>
	<div class="right-controls">
		<div class="right-controls-2"></div>
		<Zoom ></Zoom>
	</div>

      <div id="flexWrapper">
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

  <div class="copyright"></div>
  <div class="copyright-bottom"></div>

