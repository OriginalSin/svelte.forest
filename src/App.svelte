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

{#await promise}
	<!-- promise is pending -->
	<p>waiting for the promise to resolve...</p>
{:then value}
	<!-- promise was fulfilled -->
	<p>The value is {value}</p>
{:catch error}
	<!-- promise was rejected -->
	<p>Something went wrong: {error.message}</p>
{/await}

  <div class="header">
	 <div class="block_left">
		<a href="http://fires.ru" class="logo">
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
  <div class="copyright"></div>

