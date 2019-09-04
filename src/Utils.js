import * as Config from './Config.js';


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
	props: {
		// name: 'ND99E'
	}
};


export default Utils;