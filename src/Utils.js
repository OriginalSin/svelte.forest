import * as Config from './Config.js';
import { worker, kvItems, delItems } from './stores.js';

let dataWorker = null;
worker.subscribe(value => { dataWorker = value; });

const Utils = {
	isDelynkaLayer: (it) => {
		let out = false;
		if (it._gmx) {
			let attr = it._gmx.tileAttributeTypes;
			out = attr.snap && attr.FRSTAT;
		}
		return out;
	},
	isKvartalLayer: (it) => {
		let out = false;
		if (it._gmx) {
			let attr = it._gmx.tileAttributeTypes;
			out = attr.kv;
		}
		return out;
	},
	getLayerItems: (it) => {
		dataWorker.onmessage = (res) => {
			let data = res.data,
				cmd = data.cmd,
				json = data.out;

			if (cmd === 'getLayerItems') {
				kvItems.set(json.Result);
			}
	// console.log('onmessage', res);
		};
		dataWorker.postMessage({cmd: 'getLayerItems', layerID: it.options.layerID});
	}
};


export default Utils;