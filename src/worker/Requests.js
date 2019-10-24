
const	_self = self || window,
		serverBase = _self.serverBase || '//maps.kosmosnimki.ru/',
		serverProxy = serverBase + 'Plugins/ForestReport/proxy';

let loaderStatus = {};
let _sessionKeys = {};
let _app = {};

const parseURLParams = (str) => {
	let sp = new URLSearchParams(str || location.search),
		out = {},
		arr = [];
	for (let p of sp) {
		let k = p[0], z = p[1];
		if (z) {
			if (!out[k]) {out[k] = [];}
			out[k].push(z);
		} else {
			arr.push(k);
		}
	}
	return {main: arr, keys: out};
};

const requestSessionKey = (serverHost, apiKey) => {
	let keys = _sessionKeys;
	if (!(serverHost in keys)) {
		keys[serverHost] = new Promise(function(resolve, reject) {
			if (apiKey) {
				utils.getJson({
					url: '//' + serverHost + '/ApiKey.ashx',
					params: {WrapStyle: 'None', Key: apiKey}
				})
					.then(function(json) {
						let res = json.res;
						if (res.Status === 'ok' && res.Result) {
							resolve(res.Result.Key !== 'null' ? '' : res.Result.Key);
						} else {
							reject(json);
						}
					})
					.catch(function() {
						resolve('');
					});
			} else {
				resolve('');
			}
		});
	}
	return keys[serverHost];
};

const getMapTree = (params) => {
	params = params || {};
console.log('parseURLParams', parseURLParams(params.search));

	let url = `${serverBase}Map/GetMapFolder`;
	url += '?mapId=' + (params.mapId || 'C8612B3A77D84F3F87953BEF17026A5F');
	url += '&folderId=root';
	url += '&srs=3857'; 
	url += '&skipTiles=All';
	url += '&visibleItemOnly=false';

	loaderStatus[url] = true;

	return fetch(url, {
		method: 'get',
		mode: 'cors',
		credentials: 'include',
		// headers: {'Accept': 'application/json'},
		// body: JSON.stringify(params)	// TODO: сервер почему то не хочет работать так https://googlechrome.github.io/samples/fetch-api/fetch-post.html
	})
		.then(res => {
			delete loaderStatus[url];
			return res.json();
		})
		.then(json => {
			return parseTree(json);
		})
		.catch(err => console.warn(err));
};

const _iterateNodeChilds = (node, level, out) => {
	level = level || 0;
	out = out || {
		layers: []
	};
	
	if (node) {
		let type = node.type,
			content = node.content,
			props = content.properties;
		if (type === 'layer') {
			let ph = { level: level, properties: props };
			if (content.geometry) { ph.geometry = content.geometry; }
			out.layers.push(ph);
		} else if (type === 'group') {
			let childs = content.children || [];
			out.layers.push({ level: level, group: true, childsLen: childs.length, properties: props });
			childs.map((it) => {
				_iterateNodeChilds(it, level + 1, out);
			});
		}
		
	} else {
		return out;
	}
	return out;
};

const parseTree = (json) => {
	let out = {};
	if (json.Status === 'error') {
		out = json;
	} else if (json.Result && json.Result.content) {
		out = _iterateNodeChilds(json.Result);
		out.mapAttr = out.layers.shift();
	}
// console.log('______json_out_______', out, json)
	return out;
};
const getReq = url => {
	return fetch(url, {
			method: 'get',
			mode: 'cors',
			credentials: 'include'
		// headers: {'Accept': 'application/json'},
		// body: JSON.stringify(params)	// TODO: сервер почему то не хочет работать так https://googlechrome.github.io/samples/fetch-api/fetch-post.html
		})
		.then(res => res.json())
		.catch(err => console.warn(err));
};

const getLayerItems = (params) => {
	params = params || {};

	let url = `${serverBase}VectorLayer/Search.ashx`;
	url += '?layer=' + params.layerID;
	if (params.id) { '&query=gmx_id=' + params.id; }

	url += '&out_cs=EPSG:4326';
	url += '&geometry=true';
	return getReq(url);
};
const getReportsCount = () => {
	return getReq(serverProxy + '?path=/rest/v1/get-current-user-info');
};

export default {
	parseURLParams,
	getMapTree,
	getReportsCount,
	getLayerItems
};