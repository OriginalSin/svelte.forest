<script>
	import * as Config from '../Config.js';

export let key = null;

console.log('key', key)

/*
export default {
	data() {
		return {
			key: '',
			prnt: null,
			cols: []
		};
	},
	computed: {
		value: ({ key, changedParams }) => {
			let it = changedParams ? changedParams[key] : {};
			return it && it.value || '';
		},
		colName: ({ key, changedParams }) => {
			let it = changedParams ? changedParams[key] : {};
			return it && it.field || '';
		},
		isClicked: ({ key, changedParams }) => {
			let it = changedParams ? changedParams[key] : {};
			return it && it.field || false;
		},
		select: ({ key, params }) => { let it = params[key]; return it.select; },
		list: ({ key, params }) => { let it = params[key]; return it.list; },
		title: ({ key, params }) => { let it = params[key]; return it.title || it.value; }
	},
	methods: {
		setSelection(val) {
			const { key, changedParams, prnt } = this.get();
 // console.log(`___ setSelection ______`, key, prnt, this.props.prnt);
			changedParams[key] = {value: '', field: val};
			// resetButton1();
			this.set({changedParams: changedParams, recheckFlag: 1});
		},
		setValue(val, fieldFlag) {
			const { key, changedParams, meta, params, prnt } = this.get();
 // console.log(`___ setValue ______`, key, prnt);
			// let it = params[key],
				// meta[params[key].title]
 
			changedParams[key] = {value: !fieldFlag ? val : '', field: fieldFlag ? val : ''};
			this.set({changedParams: changedParams, recheckFlag: 1});
			// resetButton1();
		}
	},
	onstate({ changed, current, previous }) {
// console.log('select onstate', changed, current);
		if (changed.meta) {
		// if (changed.meta && !current.changedParams[current.key] && current.meta[current.key]) {
			let key = current.key,
				val = current.params[key].fieldName;
			if (val) {
				this.setSelection(val);
			}
		}
		if (changed.changedParams) {
// console.log('changedParams', this.refs.submitButton)
			//	if (this.refs.submitButton && this.refs.submitButton.textContent !== 'Создать отчеты') {
		}

	}
};

*/

export let delItems = null;
export let changedParams = {};

	console.log('delItems', delItems, Config, changedParams);

let isClicked = false;
let colName = '';
const toggleFieldFlag = (ev) => {
	let target = ev.target;
	console.log('toggleFieldFlag', ev, target.parentNode);
	isClicked = !isClicked;
};

const setSelection = (ev) => {
	let target = ev.target;
	colName = target.options[target.selectedIndex].value;
	changedParams[key] = {value: '', field: colName};
	
console.log(`___ setSelection ______`, colName);
};


let list = ['ddd', 'ssdsd'];
const setInput = (ev) => {
	let target = ev.target;
	changedParams[key] = {value: target.value, field: ''};
	console.log('setInput', key, changedParams[key]);
};

</script>

<div class="input-kv-map-pop">
	<div class="kv-pop">{Config.fields[key].title}</div>
{#if isClicked}
    <div class="styled-select-1-1-pop">
	<select name="{key}" on:change="{setSelection}" class="input-left-controls-pop-add-kvartal-popmap">
		{#each delItems.fields as it}
			<option value="{it}" selected="{colName === it}">{it}</option>
		{/each}
	</select>
	</div>
{:else}
	<input on:change="{setInput}" name="{key}" list="{key}" class="input-left-controls-pop-add-kvartal-popmap" type="text">
	{#if list}
		<datalist id="{key}">
		{#each list as it}
			<option value="{it}" />
		{/each}
		</datalist>
	{/if}   
{/if}
	<div class="icon-restore-1 tit" on:click="{toggleFieldFlag}"></div>
</div>

<style>

</style>
