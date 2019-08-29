//ddddddd

//http://maps.kosmosnimki.ru/TileSender.ashx?skipTiles=All&MapName=C8612B3A77D84F3F87953BEF17026A5F&srs=3857&ftc=osm&ModeKey=map

// http://maps.kosmosnimki.ru/TileSender.ashx?WrapStyle=func&skipTiles=All&MapName=C8612B3A77D84F3F87953BEF17026A5F&srs=3857&ftc=osm&ModeKey=map&key=&CallbackName=_1



const	_self = self,
		serverBase = _self.serverBase || 'http://maps.kosmosnimki.ru/',
		serverProxy = serverBase + 'Plugins/ForestReport/proxy';

let loaderStatus = {};
const getMapTree = (params) => {
	params = params || {};
	
	let url = `${serverBase}Map/GetMapFolder`;
	url += '?mapId=' + (params.mapId || 'C8612B3A77D84F3F87953BEF17026A5F');
	url += '&folderId=root';
	url += '&srs=3857';
	url += '&skipTiles=All';

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
 console.log('______json_out_______', out, json)
	return out;
};
export default {
	getMapTree
};