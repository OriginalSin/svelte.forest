<script>
    import {onMount, beforeUpdate, setContext, getContext} from 'svelte';
	
	export const leafletMap = getContext('leafletMap');
console.log('leafletMap', this, leafletMap);

beforeUpdate(() => {
	console.log('the component is about to update', arguments);
});
</script>

  <div class="right-controls">
	 <div class="right-controls-2"></div>
	 <div class="right-controls-3">
		<div class="right-controls-3-1"></div>
		<div class="right-controls-3-2">5</div>
		<div class="right-controls-3-3"></div>
	 </div>
  </div>
