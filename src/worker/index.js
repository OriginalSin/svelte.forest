import Requests from './Requests.js';

var _self = self;
(_self.on || _self.addEventListener).call(_self, 'message', e => {
    const message = e.data || e;
	if (message.cmd === 'getMap') {
		Requests.getMapTree({mapId: message.mapID}).then((json) => {
// console.log(message, json);
			message.out = json;
			_self.postMessage(message);
		});
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

