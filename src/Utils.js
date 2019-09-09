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
	getLayerItems: (it, opt) => {
		dataWorker.onmessage = (res) => {
			let data = res.data,
				cmd = data.cmd,
				json = data.out,
				type = opt && opt.type || 'delynka';

			if (cmd === 'getLayerItems') {
				if (type === 'delynka') {
					delItems.set(json.Result);
				} else {
					kvItems.set(json.Result);
				}
			}
	console.log('onmessage', res);
		};
		dataWorker.postMessage({cmd: 'getLayerItems', layerID: it.options.layerID, opt: opt});
	}
};


export default Utils;