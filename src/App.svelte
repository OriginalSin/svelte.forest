<script>
    import {onMount, setContext, getContext} from 'svelte';
	
	import { baseContVisible } from './stores.js';

    import Map from './Map/Map.svelte';
    import LayersTree from './Controls/LayersTree/LayersTree.svelte';
    import Zoom from './Controls/Zoom/Zoom.svelte';
    import Base from './Controls/Base/Base.svelte';
    import Report from './Report/Report.svelte';

	// let base_visible = false;
	// const unsubscribe = baseContVisible.subscribe(value => {
// console.log('sssssssss', value);
		// base_visible = value;
	// });
	// const unsubscribe1 = leafletMap.subscribe(value => {
// console.log('leafletMap', value);
	// });
	
    export let name;
// console.log('mapID vv33333v', name); // .mapID

	let toggleBase = () => {
		baseContVisible.update(n => !n);
	};

	let sidebar_num = 1;
	let sidebar_visible = true;
	let toggleSidebar = (ev) => {
// console.log('toggleSidebar', ev);
		sidebar_visible = !sidebar_visible;
		let classList = ev.target.classList,
			className = 'rotate180';
		if (classList.contains(className)) {
			classList.remove(className);
		} else {
			classList.add(className);
		}
	};
	let openSidebar = (nm) => {
// console.log('op222enSidebar', sidebar_num, nm);
		if (sidebar_num === nm) { nm = 0; }
		sidebar_num = nm;
	};

    onMount (() => {
// console.log('mapIDnnnnnnnnnnnnn', name); // .mapID
	});

</script>

<style>
	h1 {
		color: purple;
	}
</style>

  <div class="header">
	 <div class="block_left">
		<span class="logo">
		   <div class="logo_left">
			  &nbsp;
		   </div>
		   <div class="logo_left_text">
			  Logo
		   </div>
		</span>
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
		<div class="account">Имя Фамилия</div>
		<div class="account-star"></div>
	 </div>
  </div>
	  <div class="sidebar">
		 <div class="icons-vert-top">
			<div class="icons-vert-top-1" on:click="{() => {openSidebar(1);}}"></div>
			<div class="icons-vert-top-2" on:click="{() => {openSidebar(2);}}"></div>
			<div class="icons-vert-top-3" on:click="{() => {openSidebar(3);}}"></div>
			<div class="icons-vert-top-3" on:click="{() => {openSidebar(4);}}"></div>
		 </div>
		 <div class="icons-vert-bottom">
			<div class="icons-vert-bottom-1" on:click="{toggleSidebar}"></div>
		 </div>
	  </div>
	  
{#if sidebar_visible}
	  <!--OPENED SIDEBAR-->
	{#if sidebar_num === 1}
		<LayersTree mapID={name}></LayersTree>
	{:else if sidebar_num === 2}
		<div class="sidebar-opened">Вторая вкладка</div>
	{:else if sidebar_num === 3}
		<div class="sidebar-opened">Третья вкладка</div>
	{:else if sidebar_num === 4}
		<Report mapID={name}></Report>
	{/if}

      <!--END OPENED SIDEBAR-->
{/if}
	  
	  <!--Container for Map-->
	<Map mapID={name}></Map>
	<div class="right-controls">
		<div class="right-controls-2" on:click={toggleBase}></div>
		<Zoom ></Zoom>
	</div>

	<Base />

  <div class="copyright"></div>
  <div class="copyright-bottom"></div>

