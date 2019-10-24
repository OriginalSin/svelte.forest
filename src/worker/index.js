import Requests from './Requests.js';

var _self = self;
(_self.on || _self.addEventListener).call(_self, 'message', e => {
    const message = e.data || e;
console.log('message ', e);
    switch (message.cmd) {
		case 'getLayerItems':
			Requests.getLayerItems({layerID: message.layerID}).then((json) => {
				message.out = json;
				let pt = {};
				json.Result.fields.forEach((name, i) => { pt[name] = i; });
				json.Result.fieldKeys = pt;
				_self.postMessage(message);
			});
			break;
		case 'getMap':
			Requests.getMapTree({mapId: message.mapID, search: message.search}).then((json) => {
				message.out = json;
				_self.postMessage(message);
			});
			break;
		case 'getReportsCount':
			Requests.getReportsCount().then((json) => {
				message.out = json;
				_self.postMessage(message);
			});
			break;
		default:
			console.warn('Неизвестная команда:', message.cmd);
			break;
	}
});

