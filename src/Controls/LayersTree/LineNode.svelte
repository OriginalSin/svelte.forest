<script>

    export let item;

	// import LegendIconCell from './LegendIconCell.html';
/*
	export default {
		data() {
			return {
				//gmxTimeline: false,
				line: null
			}
		},
		// helpers: {
		// },
		computed: {
			checkboxType: ({ parentProps }) => parentProps && parentProps.list ? 'radio' : 'checkbox',
			checkboxName: ({ parentProps }) => parentProps && parentProps.GroupID || '',
			properties: ({ line }) => line.content.properties,
			isGroup: ({ line }) => line.type === 'group',
			isShowCheckbox: ({ properties }) => properties.ShowCheckbox,
			isInfo: ({ properties }) => properties.MetaProperties && Object.keys(properties.MetaProperties).length,
			isRadio: ({ properties }) => properties.list ? 'radio' : 'checkbox',
			nodeID: ({ properties }) => properties ? properties.name || properties.GroupID : 'root',
			styles: ({ properties }) => properties.gmxStyles ? properties.gmxStyles.styles : [],
			multiStyles: ({ properties }) => properties.gmxStyles && properties.gmxStyles.styles.length > 1 ? 'multiStyles' : '',
			isRoot: ({ properties }) => properties.MapID,
			isOpened: ({line, layersTree}) => {
				let content = line.content,
					props = content.properties,
					nodeID = props.GroupID || 'root';
				return layersTree.expanded[nodeID];
			},
			isGroupVisible: ({line, layersTree}) => {
				let content = line.content,
					props = content.properties,
					nodeID = props.GroupID || 'root';
				return layersTree.visible[nodeID];
			},
			isVisible: ({line, layersTree}) => {
				return layersTree.visible[line.content.properties.name];
			}
		},
		components: {
			LegendIconCell
		},
		methods: {
			clickOnExpander(target) {
				let {line} = this.get();
				
				if (line.type === 'group' && !line.content.properties.ShowCheckbox) {
					let node = this.refs.ul;
					if (node) {
						let isCollapse = node.classList.contains('collapse'),
							expander = this.refs.expander;
						if (isCollapse) {
							node.classList.remove('collapse');
							expander.checked = true;
						} else {
							node.classList.add('collapse');
							expander.checked = false;
						}
					}
				}
			},
			toggleTimeline(node) {
				if (node) {
					if (node.classList.contains('disabled')) {
						node.classList.remove('disabled');
						node.classList.add('enabled');
					} else {
						node.classList.add('disabled');
						node.classList.remove('enabled');
					}
				}
			},
			showInfo(target) {
				let node = target.parentNode.nextElementSibling.getElementsByClassName('description')[0];
				if (node) {
					if (node.classList.contains('collapse')) {
						let {line} = this.get();
						node.innerHTML = line.content.properties.description || '';
						node.classList.remove('collapse');
					} else {
						node.classList.add('collapse');
					}
				}
			}
		}
	}
	   <label class="control control-checkbox control-black control-1-default-0 poly level-{item.level}">
	   {item.properties.title}
*/
 // console.log('mapIDnnnn22nnnn', item);

</script>

<div class="sidebar-opened-row-el">
	<div class="sidebar-opened-el-left">
	   <label class="control control-checkbox control-black control-1-default-0 poly level-{item.level}">
	   {item.properties.title}
	   <input type="checkbox" />
	   <div class="control_indicator"></div>
	</div>
	<div class="sidebar-opened-el-right"></div>
</div>

<style>
</style>
