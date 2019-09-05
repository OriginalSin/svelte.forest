import Requests from './Requests.js';

var _self = self;
(_self.on || _self.addEventListener).call(_self, 'message', e => {
    const message = e.data || e;
console.log('message getLayerItems', e);
    switch (message.cmd) {
		case 'getLayerItems':
			Requests.getLayerItems({layerID: message.layerID}).then((json) => {
				message.out = json;
				_self.postMessage(message);
			});
			break;
		case 'getMap':
			Requests.getMapTree({mapId: message.mapID}).then((json) => {
				message.out = json;
				_self.postMessage(message);
			});
			break;
		default:
			console.warn('Неизвестная команда:', message.cmd);
			break;
	}
	
/*
    switch (message.type) {
        case 'init':
            if (message.wasm) {
                const memorySize = 16;
                memory = new WebAssembly.Memory({initial: memorySize, maximum: memorySize});
                view = new DataView(memory.buffer);
                wasm = new WebAssembly.Instance(message.wasm, {
                    env: {
                        _now: _performance.now.bind(_performance),
                        memory: memory,
                    },
                });
                runWorkload = runWorkloadWASM;
            } else {
                runWorkload = runWorkloadJS;
            }
            runWorkload(1, 0);
            _self.postMessage('success');
            break;

        case 'workload': {
            setTimeout(() => {
                _self.postMessage(runWorkload(10, message.id));
            }, message.startTime - Date.now());
            break;
        }

        default:
            break;
    }
	*/
});

