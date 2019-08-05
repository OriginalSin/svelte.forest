const HOST_NAME = '//maps.kosmosnimki.ru';
const SRS = 3857;
const SKIP_TILES = 'NotVisible';
const API_KEY = '33959EF7AFB4FB92EEC2E7B73AE8458B';

const loadRoot = mapId => new Promise ((resolve, reject) => {
    fetch (`${HOST_NAME}/Map/GetMapFolder`, {
        method: 'POST',
        mode: 'cors',
        credentials: 'include',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded'},
        body: `WrapStyle=None&apiKey=${API_KEY}&folderId=root&mapId=${mapId}&srs=${SRS}&skipTiles=${SKIP_TILES}`
    })
    .then (response => response.json())
    .then (data => {
        const {Status} = data;
        if (Status === 'ok') {
            const {Result: {content}} = data;
            resolve(content);
        }
        else {
            reject (data);
        }        
    })
    .catch (e => reject(e));
});

const loadFolder = (mapId, folderId) => new Promise((resolve, reject) => {
    fetch (`${HOST_NAME}/Map/GetMapFolder`, {
        method: 'POST',
        mode: 'cors',
        credentials: 'include',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded'},
        body: `WrapStyle=None&apiKey=${API_KEY}&folderId=${folderId}&mapId=${mapId}&srs=${SRS}&skipTiles=${SKIP_TILES}`
    })
    .then (response => response.json())
    .then (data => {
        const {Status} = data;
        if (Status === 'ok') {
            const {Result: {content}} = data;
            resolve(content);
        }
        else {
            reject (data);
        }        
    })
    .catch (e => reject(e));
});

const loadMap = mapId => new Promise((resolve, reject) => {
    fetch (`${HOST_NAME}/Map/GetMapProperties`, {
        method: 'POST',
        mode: 'cors',
        credentials: 'include',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded'},
        body: `WrapStyle=None&apiKey=${API_KEY}&MapName=${mapId}`
    })
    .then (response => response.json())
    .then (data => {
        const {Status} = data;
        if (Status === 'ok') {
            const {Result: {properties}} = data;
            resolve(properties);
        }
        else {
            reject (data);
        }        
    })
    .catch (e => reject(e));
});

const getMaps = () => new Promise((resolve, reject) => {
    fetch (`${HOST_NAME}/Map/GetMaps.ashx`, {
        method: 'POST',
        mode: 'cors',
        credentials: 'include',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded'},
        body: `WrapStyle=None&apiKey=${API_KEY}`
    })
    .then (response => response.json())
    .then (data => {
        const {Status} = data;
        if (Status === 'ok') {
            const {Result} = data;
            resolve(Result);
        }
        else {
            reject (data);
        }        
    })
    .catch (e => reject(e));
});

export {loadRoot, loadFolder, loadMap, getMaps};