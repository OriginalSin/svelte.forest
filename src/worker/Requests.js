

//http://maps.kosmosnimki.ru/TileSender.ashx?skipTiles=All&MapName=C8612B3A77D84F3F87953BEF17026A5F&srs=3857&ftc=osm&ModeKey=map

// http://maps.kosmosnimki.ru/TileSender.ashx?WrapStyle=func&skipTiles=All&MapName=C8612B3A77D84F3F87953BEF17026A5F&srs=3857&ftc=osm&ModeKey=map&key=&CallbackName=_1



const	_self = self,
		serverBase = _self.serverBase || 'http://maps.kosmosnimki.ru/',
		serverProxy = serverBase + 'Plugins/ForestReport/proxy';
// console.log('______________', Config.fieldsConf)

let loaderStatus = {};
const getMap = (params) => {
	
	let url = `${serverBase}Map/GetMapProperties`;
	// const url = `${serverBase}VectorLayer/TileSender.ashx`;
	url += '?MapName=C8612B3A77D84F3F87953BEF17026A5F';
	
	loaderStatus[url] = true;
	params = params || {};

	if (!params.WrapStyle) {params.WrapStyle = 'func'; params.CallbackName = '_test';}
	
	if (!params.skipTiles) {params.skipTiles = 'All';}
	if (!params.srs) {params.srs = '3857';}
	if (!params.ftc) {params.ftc = 'osm';}
	if (!params.ModeKey) {params.ModeKey = 'map';}
	if (!params.MapName) {params.MapName = 'C8612B3A77D84F3F87953BEF17026A5F';}
	// return fetch(url, {
		// method: 'post',
		// mode: 'cors',
		// credentials: 'include',
		// headers: {'Accept': 'application/json'},
		// body: JSON.stringify(params)	// TODO: сервер почему то не хочет работать так https://googlechrome.github.io/samples/fetch-api/fetch-post.html
	// })
		// .then(res => { delete loaderStatus[url]; return res.json(); })
		// .catch(err => console.warn(err));
	return fetch(url, {
		method: 'get',
		mode: 'cors',
		credentials: 'include',
		// headers: {'Accept': 'application/json'},
		// body: JSON.stringify(params)	// TODO: сервер почему то не хочет работать так https://googlechrome.github.io/samples/fetch-api/fetch-post.html
	})
		.then(res => { delete loaderStatus[url]; return res.json(); })
		.catch(err => console.warn(err));
};

export default {
	getMap
};