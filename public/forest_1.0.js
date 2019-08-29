var app = (function () {
    'use strict';

    function noop() { }
    const identity = x => x;
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }

    const is_client = typeof window !== 'undefined';
    let now = is_client
        ? () => window.performance.now()
        : () => Date.now();
    let raf = is_client ? cb => requestAnimationFrame(cb) : noop;

    const tasks = new Set();
    let running = false;
    function run_tasks() {
        tasks.forEach(task => {
            if (!task[0](now())) {
                tasks.delete(task);
                task[1]();
            }
        });
        running = tasks.size > 0;
        if (running)
            raf(run_tasks);
    }
    function loop(fn) {
        let task;
        if (!running) {
            running = true;
            raf(run_tasks);
        }
        return {
            promise: new Promise(fulfil => {
                tasks.add(task = [fn, fulfil]);
            }),
            abort() {
                tasks.delete(task);
            }
        };
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_data(text, data) {
        data = '' + data;
        if (text.data !== data)
            text.data = data;
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let stylesheet;
    let active = 0;
    let current_rules = {};
    // https://github.com/darkskyapp/string-hash/blob/master/index.js
    function hash(str) {
        let hash = 5381;
        let i = str.length;
        while (i--)
            hash = ((hash << 5) - hash) ^ str.charCodeAt(i);
        return hash >>> 0;
    }
    function create_rule(node, a, b, duration, delay, ease, fn, uid = 0) {
        const step = 16.666 / duration;
        let keyframes = '{\n';
        for (let p = 0; p <= 1; p += step) {
            const t = a + (b - a) * ease(p);
            keyframes += p * 100 + `%{${fn(t, 1 - t)}}\n`;
        }
        const rule = keyframes + `100% {${fn(b, 1 - b)}}\n}`;
        const name = `__svelte_${hash(rule)}_${uid}`;
        if (!current_rules[name]) {
            if (!stylesheet) {
                const style = element('style');
                document.head.appendChild(style);
                stylesheet = style.sheet;
            }
            current_rules[name] = true;
            stylesheet.insertRule(`@keyframes ${name} ${rule}`, stylesheet.cssRules.length);
        }
        const animation = node.style.animation || '';
        node.style.animation = `${animation ? `${animation}, ` : ``}${name} ${duration}ms linear ${delay}ms 1 both`;
        active += 1;
        return name;
    }
    function delete_rule(node, name) {
        node.style.animation = (node.style.animation || '')
            .split(', ')
            .filter(name
            ? anim => anim.indexOf(name) < 0 // remove specific animation
            : anim => anim.indexOf('__svelte') === -1 // remove all Svelte animations
        )
            .join(', ');
        if (name && !--active)
            clear_rules();
    }
    function clear_rules() {
        raf(() => {
            if (active)
                return;
            let i = stylesheet.cssRules.length;
            while (i--)
                stylesheet.deleteRule(i);
            current_rules = {};
        });
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error(`Function called outside component initialization`);
        return current_component;
    }
    function beforeUpdate(fn) {
        get_current_component().$$.before_update.push(fn);
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    function flush() {
        const seen_callbacks = new Set();
        do {
            // first, call beforeUpdate functions
            // and update components
            while (dirty_components.length) {
                const component = dirty_components.shift();
                set_current_component(component);
                update(component.$$);
            }
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    callback();
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
    }
    function update($$) {
        if ($$.fragment) {
            $$.update($$.dirty);
            run_all($$.before_update);
            $$.fragment.p($$.dirty, $$.ctx);
            $$.dirty = null;
            $$.after_update.forEach(add_render_callback);
        }
    }

    let promise;
    function wait() {
        if (!promise) {
            promise = Promise.resolve();
            promise.then(() => {
                promise = null;
            });
        }
        return promise;
    }
    function dispatch(node, direction, kind) {
        node.dispatchEvent(custom_event(`${direction ? 'intro' : 'outro'}${kind}`));
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }
    const null_transition = { duration: 0 };
    function create_in_transition(node, fn, params) {
        let config = fn(node, params);
        let running = false;
        let animation_name;
        let task;
        let uid = 0;
        function cleanup() {
            if (animation_name)
                delete_rule(node, animation_name);
        }
        function go() {
            const { delay = 0, duration = 300, easing = identity, tick = noop, css } = config || null_transition;
            if (css)
                animation_name = create_rule(node, 0, 1, duration, delay, easing, css, uid++);
            tick(0, 1);
            const start_time = now() + delay;
            const end_time = start_time + duration;
            if (task)
                task.abort();
            running = true;
            add_render_callback(() => dispatch(node, true, 'start'));
            task = loop(now => {
                if (running) {
                    if (now >= end_time) {
                        tick(1, 0);
                        dispatch(node, true, 'end');
                        cleanup();
                        return running = false;
                    }
                    if (now >= start_time) {
                        const t = easing((now - start_time) / duration);
                        tick(t, 1 - t);
                    }
                }
                return running;
            });
        }
        let started = false;
        return {
            start() {
                if (started)
                    return;
                delete_rule(node);
                if (is_function(config)) {
                    config = config();
                    wait().then(go);
                }
                else {
                    go();
                }
            },
            invalidate() {
                started = false;
            },
            end() {
                if (running) {
                    cleanup();
                    running = false;
                }
            }
        };
    }
    function create_out_transition(node, fn, params) {
        let config = fn(node, params);
        let running = true;
        let animation_name;
        const group = outros;
        group.r += 1;
        function go() {
            const { delay = 0, duration = 300, easing = identity, tick = noop, css } = config || null_transition;
            if (css)
                animation_name = create_rule(node, 1, 0, duration, delay, easing, css);
            const start_time = now() + delay;
            const end_time = start_time + duration;
            add_render_callback(() => dispatch(node, false, 'start'));
            loop(now => {
                if (running) {
                    if (now >= end_time) {
                        tick(0, 1);
                        dispatch(node, false, 'end');
                        if (!--group.r) {
                            // this will result in `end()` being called,
                            // so we don't need to clean up here
                            run_all(group.c);
                        }
                        return false;
                    }
                    if (now >= start_time) {
                        const t = easing((now - start_time) / duration);
                        tick(1 - t, t);
                    }
                }
                return running;
            });
        }
        if (is_function(config)) {
            wait().then(() => {
                // @ts-ignore
                config = config();
                go();
            });
        }
        else {
            go();
        }
        return {
            end(reset) {
                if (reset && config.tick) {
                    config.tick(1, 0);
                }
                if (running) {
                    if (animation_name)
                        delete_rule(node, animation_name);
                    running = false;
                }
            }
        };
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        if (component.$$.fragment) {
            run_all(component.$$.on_destroy);
            component.$$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            component.$$.on_destroy = component.$$.fragment = null;
            component.$$.ctx = {};
        }
    }
    function make_dirty(component, key) {
        if (!component.$$.dirty) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty = blank_object();
        }
        component.$$.dirty[key] = true;
    }
    function init(component, options, instance, create_fragment, not_equal, prop_names) {
        const parent_component = current_component;
        set_current_component(component);
        const props = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props: prop_names,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty: null
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, props, (key, value) => {
                if ($$.ctx && not_equal($$.ctx[key], $$.ctx[key] = value)) {
                    if ($$.bound[key])
                        $$.bound[key](value);
                    if (ready)
                        make_dirty(component, key);
                }
            })
            : props;
        $$.update();
        ready = true;
        run_all($$.before_update);
        $$.fragment = create_fragment($$.ctx);
        if (options.target) {
            if (options.hydrate) {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment.l(children(options.target));
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set() {
            // overridden by instance, if it has props
        }
    }

    const subscriber_queue = [];
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = [];
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (let i = 0; i < subscribers.length; i += 1) {
                        const s = subscribers[i];
                        s[1]();
                        subscriber_queue.push(s, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.push(subscriber);
            if (subscribers.length === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                const index = subscribers.indexOf(subscriber);
                if (index !== -1) {
                    subscribers.splice(index, 1);
                }
                if (subscribers.length === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }

    // export const Store = {
    	// leafletMap: writable(0),
    	// baseContVisible: writable(0),
    	// mapID: writable(0),
    	// mapTree: writable(0)
    // };
    const leafletMap = writable(0);
    const baseContVisible = writable(0);
    const mapTree = writable(0);
    const worker = writable(0);

    const kIsNodeJS = Object.prototype.toString.call(typeof process !== 'undefined' ? process : 0) === '[object process]';
    const kRequire = kIsNodeJS ? module.require : null; // eslint-disable-line

    function createURLWorkerFactory(url) {
    console.log('jjjj', url);
        if (kIsNodeJS) {
            /* node.js */
            const Worker = kRequire('worker_threads').Worker; // eslint-disable-line
            return function WorkerFactory(options) {
                return new Worker(url, options);
            };
        }
        /* browser */
        return function WorkerFactory(options) {
            return new Worker(url, options);
        };
    }

    /* eslint-disable */
    const WorkerFactory = createURLWorkerFactory('web-worker-0.js');
    /* eslint-enable */

    /* src\Map\Map.svelte generated by Svelte v3.7.1 */

    function create_fragment(ctx) {
    	var div;

    	return {
    		c() {
    			div = element("div");
    			attr(div, "id", "map");
    		},

    		m(target, anchor) {
    			insert(target, div, anchor);
    			ctx.div_binding(div);
    		},

    		p: noop,
    		i: noop,
    		o: noop,

    		d(detaching) {
    			if (detaching) {
    				detach(div);
    			}

    			ctx.div_binding(null);
    		}
    	};
    }

    function instance($$self, $$props, $$invalidate) {
    	

    	let dataWorker = new WorkerFactory();
    	worker.set(dataWorker);

    	let mapContainer;    
    	let map = null;

        // setContext ('leafletMap', leafletMap);
        let { center = [55.727110, 37.441406], id = '', layers = [], maxZoom = 21, minZoom = 1, zoom = 4, ftc = 'osm', srs = 3857, distanceUnit = 'auto', squareUnit = 'auto', baseLayers = [], mapID } = $$props;

    // console.log('ssss', mapID, mapTree, leafletMap)

        const resize = () => {
            map.invalidateSize();
        };

        onMount (() => {
    		const data = {};
    		const {
    			DefaultLong,
    			DefaultLat,
    			MinZoom,
    			MaxZoom,
    			DefaultZoom,
    			DistanceUnit,
    			SquareUnit,
    		} = data;
    		$$invalidate('center', center = [DefaultLat || 60.5, DefaultLong || 95.09]);
    		$$invalidate('minZoom', minZoom = MinZoom || minZoom);
    		$$invalidate('maxZoom', maxZoom = MaxZoom || maxZoom);
    		$$invalidate('zoom', zoom = DefaultZoom || zoom);
    		$$invalidate('distanceUnit', distanceUnit = DistanceUnit || distanceUnit);
    		$$invalidate('squareUnit', squareUnit = SquareUnit || squareUnit);
    		map = L.map(mapContainer, {
    			center,
    			minZoom,
    			zoom,
    			maxZoom,
    			zoomControl: false,
    			attributionControl: false,
    			trackResize: true,
    			fadeAnimation: true,
    			zoomAnimation: true,
    			distanceUnit: 'auto',
    			squareUnit: 'auto',
    		})
    			.addControl(L.control.gmxBottom())
    			.addControl(L.control.gmxCopyright({type: 'window', position: 'gmxbottomright'}))  // default options = {position: 'bottomleft'}
                .addControl(L.control.gmxLocation());   // default options = {position: 'bottomright'}

    		resize();
    		leafletMap.set(map);

    // if (!dataWorker) {
    	// setTimeout(function() {
    		// dataWorker = new DataWorker();
    		dataWorker.onmessage = (res) => {
    			let data = res.data,
    				cmd = data.cmd,
    				json = data.out;

    			if (cmd === 'getMap') {
    				mapTree.set(json);
    			}
    	console.log('onmessage', json);
    		};		dataWorker.postMessage({cmd: 'getMap', mapID: mapID});
    	// }, 250);
    // }
    // dataWorker.postMessage('Hello World!');
    		
    		// Requests.getMap().then((json) => {
    	// console.log('json', json);
    		// });

    		// dispatch('leafletMap', leafletMap);
        });

    	function div_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			$$invalidate('mapContainer', mapContainer = $$value);
    		});
    	}

    	$$self.$set = $$props => {
    		if ('center' in $$props) $$invalidate('center', center = $$props.center);
    		if ('id' in $$props) $$invalidate('id', id = $$props.id);
    		if ('layers' in $$props) $$invalidate('layers', layers = $$props.layers);
    		if ('maxZoom' in $$props) $$invalidate('maxZoom', maxZoom = $$props.maxZoom);
    		if ('minZoom' in $$props) $$invalidate('minZoom', minZoom = $$props.minZoom);
    		if ('zoom' in $$props) $$invalidate('zoom', zoom = $$props.zoom);
    		if ('ftc' in $$props) $$invalidate('ftc', ftc = $$props.ftc);
    		if ('srs' in $$props) $$invalidate('srs', srs = $$props.srs);
    		if ('distanceUnit' in $$props) $$invalidate('distanceUnit', distanceUnit = $$props.distanceUnit);
    		if ('squareUnit' in $$props) $$invalidate('squareUnit', squareUnit = $$props.squareUnit);
    		if ('baseLayers' in $$props) $$invalidate('baseLayers', baseLayers = $$props.baseLayers);
    		if ('mapID' in $$props) $$invalidate('mapID', mapID = $$props.mapID);
    	};

    	return {
    		mapContainer,
    		center,
    		id,
    		layers,
    		maxZoom,
    		minZoom,
    		zoom,
    		ftc,
    		srs,
    		distanceUnit,
    		squareUnit,
    		baseLayers,
    		mapID,
    		div_binding
    	};
    }

    class Map$1 extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance, create_fragment, safe_not_equal, ["center", "id", "layers", "maxZoom", "minZoom", "zoom", "ftc", "srs", "distanceUnit", "squareUnit", "baseLayers", "mapID"]);
    	}
    }

    /* src\Controls\LayersTree\LineNode.svelte generated by Svelte v3.7.1 */

    function create_fragment$1(ctx) {
    	var div3, div1, label, t0_value = ctx.item.properties.title, t0, t1, input, t2, div0, label_class_value, t3, div2;

    	return {
    		c() {
    			div3 = element("div");
    			div1 = element("div");
    			label = element("label");
    			t0 = text(t0_value);
    			t1 = space();
    			input = element("input");
    			t2 = space();
    			div0 = element("div");
    			t3 = space();
    			div2 = element("div");
    			attr(input, "type", "checkbox");
    			attr(div0, "class", "control_indicator");
    			attr(label, "class", label_class_value = "control control-checkbox control-black " + (ctx.item.group ? 'control-group-1' : 'control-1-default-1') + " poly level-" + ctx.item.level);
    			attr(div1, "class", "sidebar-opened-el-left");
    			attr(div2, "class", "sidebar-opened-el-right");
    			attr(div3, "class", "sidebar-opened-row-el");
    		},

    		m(target, anchor) {
    			insert(target, div3, anchor);
    			append(div3, div1);
    			append(div1, label);
    			append(label, t0);
    			append(label, t1);
    			append(label, input);
    			append(label, t2);
    			append(label, div0);
    			append(div3, t3);
    			append(div3, div2);
    		},

    		p(changed, ctx) {
    			if ((changed.item) && t0_value !== (t0_value = ctx.item.properties.title)) {
    				set_data(t0, t0_value);
    			}

    			if ((changed.item) && label_class_value !== (label_class_value = "control control-checkbox control-black " + (ctx.item.group ? 'control-group-1' : 'control-1-default-1') + " poly level-" + ctx.item.level)) {
    				attr(label, "class", label_class_value);
    			}
    		},

    		i: noop,
    		o: noop,

    		d(detaching) {
    			if (detaching) {
    				detach(div3);
    			}
    		}
    	};
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { item } = $$props;

    	// import LegendIconCell from './LegendIconCell.html';
    /*
    	export default {
    		data() {
    			return {
    				//gmxTimeline: false,
    				line: null
    			}
    		},
    		// helpers: {
    		// },
    		computed: {
    			checkboxType: ({ parentProps }) => parentProps && parentProps.list ? 'radio' : 'checkbox',
    			checkboxName: ({ parentProps }) => parentProps && parentProps.GroupID || '',
    			properties: ({ line }) => line.content.properties,
    			isGroup: ({ line }) => line.type === 'group',
    			isShowCheckbox: ({ properties }) => properties.ShowCheckbox,
    			isInfo: ({ properties }) => properties.MetaProperties && Object.keys(properties.MetaProperties).length,
    			isRadio: ({ properties }) => properties.list ? 'radio' : 'checkbox',
    			nodeID: ({ properties }) => properties ? properties.name || properties.GroupID : 'root',
    			styles: ({ properties }) => properties.gmxStyles ? properties.gmxStyles.styles : [],
    			multiStyles: ({ properties }) => properties.gmxStyles && properties.gmxStyles.styles.length > 1 ? 'multiStyles' : '',
    			isRoot: ({ properties }) => properties.MapID,
    			isOpened: ({line, layersTree}) => {
    				let content = line.content,
    					props = content.properties,
    					nodeID = props.GroupID || 'root';
    				return layersTree.expanded[nodeID];
    			},
    			isGroupVisible: ({line, layersTree}) => {
    				let content = line.content,
    					props = content.properties,
    					nodeID = props.GroupID || 'root';
    				return layersTree.visible[nodeID];
    			},
    			isVisible: ({line, layersTree}) => {
    				return layersTree.visible[line.content.properties.name];
    			}
    		},
    		components: {
    			LegendIconCell
    		},
    		methods: {
    			clickOnExpander(target) {
    				let {line} = this.get();
    				
    				if (line.type === 'group' && !line.content.properties.ShowCheckbox) {
    					let node = this.refs.ul;
    					if (node) {
    						let isCollapse = node.classList.contains('collapse'),
    							expander = this.refs.expander;
    						if (isCollapse) {
    							node.classList.remove('collapse');
    							expander.checked = true;
    						} else {
    							node.classList.add('collapse');
    							expander.checked = false;
    						}
    					}
    				}
    			},
    			toggleTimeline(node) {
    				if (node) {
    					if (node.classList.contains('disabled')) {
    						node.classList.remove('disabled');
    						node.classList.add('enabled');
    					} else {
    						node.classList.add('disabled');
    						node.classList.remove('enabled');
    					}
    				}
    			},
    			showInfo(target) {
    				let node = target.parentNode.nextElementSibling.getElementsByClassName('description')[0];
    				if (node) {
    					if (node.classList.contains('collapse')) {
    						let {line} = this.get();
    						node.innerHTML = line.content.properties.description || '';
    						node.classList.remove('collapse');
    					} else {
    						node.classList.add('collapse');
    					}
    				}
    			}
    		}
    	}
    	   <label class="control control-checkbox control-black control-1-default-0 poly level-{item.level}">
    	   {item.properties.title}
    */
     // console.log('mapIDnnnn22nnnn', item);

    	$$self.$set = $$props => {
    		if ('item' in $$props) $$invalidate('item', item = $$props.item);
    	};

    	return { item };
    }

    class LineNode extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, ["item"]);
    	}
    }

    /* src\Controls\LayersTree\LayersTree.svelte generated by Svelte v3.7.1 */

    function get_each_context(ctx, list, i) {
    	const child_ctx = Object.create(ctx);
    	child_ctx.item = list[i];
    	return child_ctx;
    }

    // (71:1) {#each layersArr as item}
    function create_each_block(ctx) {
    	var current;

    	var linenode = new LineNode({ props: { item: ctx.item } });

    	return {
    		c() {
    			linenode.$$.fragment.c();
    		},

    		m(target, anchor) {
    			mount_component(linenode, target, anchor);
    			current = true;
    		},

    		p(changed, ctx) {
    			var linenode_changes = {};
    			if (changed.layersArr) linenode_changes.item = ctx.item;
    			linenode.$set(linenode_changes);
    		},

    		i(local) {
    			if (current) return;
    			transition_in(linenode.$$.fragment, local);

    			current = true;
    		},

    		o(local) {
    			transition_out(linenode.$$.fragment, local);
    			current = false;
    		},

    		d(detaching) {
    			destroy_component(linenode, detaching);
    		}
    	};
    }

    function create_fragment$2(ctx) {
    	var div14, div2, div0, t0_value = ctx.mapAttr.properties && ctx.mapAttr.properties.title || 'Название проекта/компании', t0, t1, div1, t2, div3, t3, div11, t10, div13, div12, current;

    	var each_value = ctx.layersArr;

    	var each_blocks = [];

    	for (var i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	return {
    		c() {
    			div14 = element("div");
    			div2 = element("div");
    			div0 = element("div");
    			t0 = text(t0_value);
    			t1 = space();
    			div1 = element("div");
    			t2 = space();
    			div3 = element("div");
    			div3.innerHTML = `<input type="text" name="input1" class="header-input1">`;
    			t3 = space();
    			div11 = element("div");
    			div11.innerHTML = `<div class="sidebar-opened-row3-left"><label class="control control-checkbox">
			         Выделить все
			         <input type="checkbox"> <div class="control_indicator"></div></label></div> <div class="sidebar-opened-row3-right"><div class="sidebar-opened-row3-right-el1"></div> <div class="sidebar-opened-row3-right-el2"></div> <div class="sidebar-opened-row3-right-el3"></div> <div class="sidebar-opened-row3-right-el4"></div></div>`;
    			t10 = space();
    			div13 = element("div");
    			div12 = element("div");

    			for (var i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}
    			attr(div0, "class", "sidebar-opened-row1-left");
    			attr(div1, "class", "sidebar-opened-row1-right");
    			attr(div2, "class", "sidebar-opened-row1");
    			attr(div3, "class", "sidebar-opened-row2");
    			attr(div11, "class", "sidebar-opened-row3");
    			attr(div12, "class", "sidebar-opened-el-container");
    			attr(div12, "id", "style-4");
    			attr(div13, "class", "sidebar-opened-el-container");
    			attr(div14, "class", "sidebar-opened");
    		},

    		m(target, anchor) {
    			insert(target, div14, anchor);
    			append(div14, div2);
    			append(div2, div0);
    			append(div0, t0);
    			append(div2, t1);
    			append(div2, div1);
    			append(div14, t2);
    			append(div14, div3);
    			append(div14, t3);
    			append(div14, div11);
    			append(div14, t10);
    			append(div14, div13);
    			append(div13, div12);

    			for (var i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div12, null);
    			}

    			current = true;
    		},

    		p(changed, ctx) {
    			if ((!current || changed.mapAttr) && t0_value !== (t0_value = ctx.mapAttr.properties && ctx.mapAttr.properties.title || 'Название проекта/компании')) {
    				set_data(t0, t0_value);
    			}

    			if (changed.layersArr) {
    				each_value = ctx.layersArr;

    				for (var i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(changed, child_ctx);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(div12, null);
    					}
    				}

    				group_outros();
    				for (i = each_value.length; i < each_blocks.length; i += 1) out(i);
    				check_outros();
    			}
    		},

    		i(local) {
    			if (current) return;
    			for (var i = 0; i < each_value.length; i += 1) transition_in(each_blocks[i]);

    			current = true;
    		},

    		o(local) {
    			each_blocks = each_blocks.filter(Boolean);
    			for (let i = 0; i < each_blocks.length; i += 1) transition_out(each_blocks[i]);

    			current = false;
    		},

    		d(detaching) {
    			if (detaching) {
    				detach(div14);
    			}

    			destroy_each(each_blocks, detaching);
    		}
    	};
    }

    function instance$2($$self, $$props, $$invalidate) {
    	

    	// let base_visible = false;
       // const unsubscribe = baseContVisible.subscribe(value => {
       // base_visible = value;
       // });
       // let toggleBase = () => {
       // baseContVisible.update(n => !n);
       // };
        // export let mapID;
        let { layersArr = [], mapAttr = {} } = $$props;

    // console.log('ssss', mapID, Store.mapTree, Store.leafletMap)
    	let tree = null;
    	const unsubscribe = mapTree.subscribe(value => {
    		tree = value;
    		if (tree) {
    			if (tree.Status === 'error') {
    				console.warn('tree Error: ', tree);
    				return tree;
    			} else if (tree.layers) {
    				$$invalidate('layersArr', layersArr = tree.layers);
    				$$invalidate('mapAttr', mapAttr = tree.mapAttr);
    			}
    			// map.addLayer(baseLayers[2]);
    console.log('tree', mapAttr, layersArr, tree);
    		}
    	});

    	// let dataWorker = null;
    	// const unsubscribeWorker = Store.worker.subscribe(value => {
    		// dataWorker = value;
    		// if (dataWorker) {
    // console.log('tree', mapID, dataWorker);
    			// dataWorker.postMessage({cmd: 'getMap', mapID: mapID});
    		// }
    	// });

    	$$self.$set = $$props => {
    		if ('layersArr' in $$props) $$invalidate('layersArr', layersArr = $$props.layersArr);
    		if ('mapAttr' in $$props) $$invalidate('mapAttr', mapAttr = $$props.mapAttr);
    	};

    	return { layersArr, mapAttr };
    }

    class LayersTree extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, ["layersArr", "mapAttr"]);
    	}
    }

    /* src\Controls\Zoom\Zoom.svelte generated by Svelte v3.7.1 */

    function create_fragment$3(ctx) {
    	var div3, div0, t0, div1, t2, div2, dispose;

    	return {
    		c() {
    			div3 = element("div");
    			div0 = element("div");
    			t0 = space();
    			div1 = element("div");
    			div1.textContent = "5";
    			t2 = space();
    			div2 = element("div");
    			attr(div0, "class", "right-controls-3-1");
    			attr(div1, "class", "right-controls-3-2");
    			attr(div2, "class", "right-controls-3-3");
    			attr(div3, "class", "right-controls-3");

    			dispose = [
    				listen(div0, "click", ctx.zoomIn),
    				listen(div2, "click", ctx.zoomOut)
    			];
    		},

    		m(target, anchor) {
    			insert(target, div3, anchor);
    			append(div3, div0);
    			append(div3, t0);
    			append(div3, div1);
    			ctx.div1_binding(div1);
    			append(div3, t2);
    			append(div3, div2);
    		},

    		p: noop,
    		i: noop,
    		o: noop,

    		d(detaching) {
    			if (detaching) {
    				detach(div3);
    			}

    			ctx.div1_binding(null);
    			run_all(dispose);
    		}
    	};
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let leafletMap;
    	let zoom;

    	let setZoom = ((ev) => {
    		let z = leafletMap.getZoom();
    		zoom.textContent = z; $$invalidate('zoom', zoom);
    		console.log('setZoom', leafletMap.getZoom(), ev);
    	});
    	let zoomIn = (() => {
    		let z = parseInt(zoom.textContent);
    		console.log('zoomIn', leafletMap.getZoom(), zoom);
    		leafletMap.setZoom(z + 1);
    	});
    	let zoomOut = (() => {
    		let z = parseInt(zoom.textContent);
    		console.log('zoomOut', leafletMap.getZoom());
    		leafletMap.setZoom(z - 1);
    	});
    	// let leafletMap = getContext('leafletMap');
    	// console.log('leafletMap', zoom, leafletMap);
    	L.Map.addInitHook(function () {
    		leafletMap = this;
    		leafletMap.on('zoomend', setZoom);
    	});

    	beforeUpdate(() => {
    		console.log('the component is about to update', leafletMap);
    	});

    	function div1_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			$$invalidate('zoom', zoom = $$value);
    		});
    	}

    	return { zoom, zoomIn, zoomOut, div1_binding };
    }

    class Zoom extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, []);
    	}
    }

    function cubicOut(t) {
        const f = t - 1.0;
        return f * f * f + 1.0;
    }

    function fade(node, { delay = 0, duration = 400 }) {
        const o = +getComputedStyle(node).opacity;
        return {
            delay,
            duration,
            css: t => `opacity: ${t * o}`
        };
    }
    function fly(node, { delay = 0, duration = 400, easing = cubicOut, x = 0, y = 0, opacity = 0 }) {
        const style = getComputedStyle(node);
        const target_opacity = +style.opacity;
        const transform = style.transform === 'none' ? '' : style.transform;
        const od = target_opacity * (1 - opacity);
        return {
            delay,
            duration,
            easing,
            css: (t, u) => `
			transform: ${transform} translate(${(1 - t) * x}px, ${(1 - t) * y}px);
			opacity: ${target_opacity - (od * u)}`
        };
    }

    /* src\Controls\Base\Base.svelte generated by Svelte v3.7.1 */

    function create_fragment$4(ctx) {
    	var div12, div11, div2, div0, t1, div1, t2, div8, div3, span0, input0, label0, t4, div4, span1, input1, label1, t6, div5, span2, input2, label2, t8, div6, span3, input3, label3, t10, div7, span4, input4, label4, t12, div10, div12_class_value, div12_intro, div12_outro, current, dispose;

    	return {
    		c() {
    			div12 = element("div");
    			div11 = element("div");
    			div2 = element("div");
    			div0 = element("div");
    			div0.textContent = "Подложка";
    			t1 = space();
    			div1 = element("div");
    			t2 = space();
    			div8 = element("div");
    			div3 = element("div");
    			span0 = element("span");
    			input0 = element("input");
    			label0 = element("label");
    			label0.textContent = "Карта";
    			t4 = space();
    			div4 = element("div");
    			span1 = element("span");
    			input1 = element("input");
    			label1 = element("label");
    			label1.textContent = "Спутник ру";
    			t6 = space();
    			div5 = element("div");
    			span2 = element("span");
    			input2 = element("input");
    			label2 = element("label");
    			label2.textContent = "MapTiler Topo";
    			t8 = space();
    			div6 = element("div");
    			span3 = element("span");
    			input3 = element("input");
    			label3 = element("label");
    			label3.textContent = "MapBox";
    			t10 = space();
    			div7 = element("div");
    			span4 = element("span");
    			input4 = element("input");
    			label4 = element("label");
    			label4.textContent = "Рельеф RuMap";
    			t12 = space();
    			div10 = element("div");
    			div10.innerHTML = `<label class="control control-checkbox">
			               Координатная сетка
			               <input type="checkbox" checked="checked"> <div class="control_indicator"></div></label>`;
    			attr(div0, "class", "right-controls-pop-r1-text");
    			attr(div1, "class", "right-controls-pop-r1-сlose");
    			attr(div1, "id", "close-pop");
    			attr(div2, "class", "right-controls-pop-r1");
    			attr(input0, "type", "radio");
    			attr(input0, "name", "radiog_dark");
    			attr(input0, "id", "radio1");
    			attr(input0, "class", "radio1 css-checkbox");
    			attr(label0, "for", "radio1");
    			attr(label0, "class", "css-label radGroup1 radGroup2");
    			attr(span0, "class", "spacer");
    			attr(div3, "class", "radio-arr");
    			attr(input1, "type", "radio");
    			attr(input1, "name", "radiog_dark");
    			attr(input1, "id", "radio2");
    			attr(input1, "class", "radio2 css-checkbox");
    			input1.checked = "checked";
    			attr(label1, "for", "radio2");
    			attr(label1, "class", "css-label radGroup1 radGroup2");
    			attr(span1, "class", "spacer");
    			attr(div4, "class", "radio-arr");
    			attr(input2, "type", "radio");
    			attr(input2, "name", "radiog_dark");
    			attr(input2, "id", "radio3");
    			attr(input2, "class", "radio3 css-checkbox");
    			attr(label2, "for", "radio3");
    			attr(label2, "class", "css-label radGroup1 radGroup2");
    			attr(span2, "class", "spacer");
    			attr(div5, "class", "radio-arr");
    			attr(input3, "type", "radio");
    			attr(input3, "name", "radiog_dark");
    			attr(input3, "id", "radio4");
    			attr(input3, "class", "radio4 css-checkbox");
    			attr(label3, "for", "radio4");
    			attr(label3, "class", "css-label radGroup1 radGroup2");
    			attr(span3, "class", "spacer");
    			attr(div6, "class", "radio-arr");
    			attr(input4, "type", "radio");
    			attr(input4, "name", "radiog_dark");
    			attr(input4, "id", "radio5");
    			attr(input4, "class", "radio5 css-checkbox");
    			attr(label4, "for", "radio5");
    			attr(label4, "class", "css-label radGroup1 radGroup2");
    			attr(span4, "class", "spacer");
    			attr(div7, "class", "radio-arr");
    			attr(div8, "class", "right-controls-pop-r2");
    			attr(div10, "class", "right-controls-pop-r3");
    			attr(div11, "class", "right-controls-pop");
    			attr(div11, "id", "control-pop");
    			attr(div12, "class", div12_class_value = "flexWrapper " + (ctx.base_visible ? '' : 'hidden'));

    			dispose = [
    				listen(div1, "click", ctx.toggleBase),
    				listen(input0, "click", ctx.setBase),
    				listen(input1, "click", ctx.setBase),
    				listen(input2, "click", ctx.setBase),
    				listen(input3, "click", ctx.setBase),
    				listen(input4, "click", ctx.setBase)
    			];
    		},

    		m(target, anchor) {
    			insert(target, div12, anchor);
    			append(div12, div11);
    			append(div11, div2);
    			append(div2, div0);
    			append(div2, t1);
    			append(div2, div1);
    			append(div11, t2);
    			append(div11, div8);
    			append(div8, div3);
    			append(div3, span0);
    			append(span0, input0);
    			append(span0, label0);
    			append(div8, t4);
    			append(div8, div4);
    			append(div4, span1);
    			append(span1, input1);
    			append(span1, label1);
    			append(div8, t6);
    			append(div8, div5);
    			append(div5, span2);
    			append(span2, input2);
    			append(span2, label2);
    			append(div8, t8);
    			append(div8, div6);
    			append(div6, span3);
    			append(span3, input3);
    			append(span3, label3);
    			append(div8, t10);
    			append(div8, div7);
    			append(div7, span4);
    			append(span4, input4);
    			append(span4, label4);
    			append(div11, t12);
    			append(div11, div10);
    			current = true;
    		},

    		p(changed, ctx) {
    			if ((!current || changed.base_visible) && div12_class_value !== (div12_class_value = "flexWrapper " + (ctx.base_visible ? '' : 'hidden'))) {
    				attr(div12, "class", div12_class_value);
    			}
    		},

    		i(local) {
    			if (current) return;
    			add_render_callback(() => {
    				if (div12_outro) div12_outro.end(1);
    				if (!div12_intro) div12_intro = create_in_transition(div12, fly, { y: 200, duration: 2000 });
    				div12_intro.start();
    			});

    			current = true;
    		},

    		o(local) {
    			if (div12_intro) div12_intro.invalidate();

    			div12_outro = create_out_transition(div12, fade, {});

    			current = false;
    		},

    		d(detaching) {
    			if (detaching) {
    				detach(div12);
    				if (div12_outro) div12_outro.end();
    			}

    			run_all(dispose);
    		}
    	};
    }

    function instance$4($$self, $$props, $$invalidate) {
    	
    	
    	let base_visible = false;
    	const unsubscribe = baseContVisible.subscribe(value => {
    		$$invalidate('base_visible', base_visible = value);
    	});
    	let toggleBase = () => {
    		baseContVisible.update(n => !n);
    	};

    	let map,
    	baseLayers = {
     		1: L.tileLayer('//{s}tilecart.kosmosnimki.ru/kosmo/{z}/{x}/{y}.png', {
    				maxZoom: 21,
    				maxNativeZoom: 18,
    				attribution: '<a target="_blank" href="http://maps.sputnik.ru" class="">Спутник</a> - © Ростелеком | © <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
    			}),
    		2: L.tileLayer('//tilessputnik.ru/{z}/{x}/{y}.png', {
    				maxZoom: 21,
    				maxNativeZoom: 18,
    				attribution: '<a target="_blank" href="http://maps.sputnik.ru" class="">Спутник</a> - © Ростелеком | © <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
    			}),
    		3: L.tileLayer('//api.maptiler.com/maps/topo/256/{z}/{x}/{y}.png?key=FrA3SZOPvBcowh6thoTf', {
    				maxZoom: 22,
    				// maxNativeZoom: 18,
    				attribution: '<a href="https://www.maptiler.com/copyright/" target="_blank">© MapTiler</a> <a href="https://www.openstreetmap.org/copyright" target="_blank">© OpenStreetMap contributors</a>'
    			}),
    		4: L.tileLayer('//api.mapbox.com/v4/mapbox.streets/{z}/{x}/{y}.png?access_token=pk.eyJ1Ijoia29zbW9zbmlta2lydSIsImEiOiJjaWhxMHNlZDgwNGFldHBtMjdyejQ3YTJ3In0.3UAAWcIBabrbUhHwmp1WjA', {
    				maxZoom: 22,
    				maxNativeZoom: 22,
    				attribution: '<a href="https://www.mapbox.com/about/maps/" target="_blank">© Mapbox</a> <a href="http://www.openstreetmap.org/about/" target="_blank">© OpenStreetMap</a>'
    			}),
    		5: L.tileLayer.Mercator('//{s}tilecart.kosmosnimki.ru/r/{z}/{x}/{y}.png', {
    				maxZoom: 21,
    				maxNativeZoom: 18,
    				attribution: '<a target="_blank" href="http://maps.sputnik.ru" class="">Спутник</a> - © Ростелеком | © <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
    			}),
    	};
    	const unsubscribe1 = leafletMap.subscribe(value => {
    		map = value;
    		if (map) {
    console.log('map', map);
    			map.addLayer(baseLayers[2]);

    		}
    	});
    	let setBase = (ev) => {
    console.log('setBase', ev);
    		let target = ev.target,
    			cont = target.parentNode.parentNode.parentNode,
    			arr = cont.getElementsByTagName('input');
    		for (let i = 0, len = arr.length; i < len; i++) {
    			let nm = i + 1,
    				it = baseLayers[nm],
    				name ='radio' + nm,
    				isVisible = target.classList.contains(name);
    			if (isVisible) {
    				if (!it._map) { map.addLayer(it); }
    			} else {
    				if (it._map) { map.removeLayer(it); }
    			}
    		}
    	};
    /*
    	let zoom;
    	let _this = this;

    	let setZoom = ((ev) => {
    		let z = leafletMap.getZoom();
    		zoom.textContent = z;
    		console.log('setZoom', leafletMap.getZoom(), ev);
    	});
    	let zoomIn = (() => {
    		let z = parseInt(zoom.textContent);
    		console.log('zoomIn', leafletMap.getZoom(), zoom);
    		leafletMap.setZoom(z + 1);
    	});
    	let zoomOut = (() => {
    		let z = parseInt(zoom.textContent);
    		console.log('zoomOut', leafletMap.getZoom());
    		leafletMap.setZoom(z - 1);
    	});
    	// let leafletMap = getContext('leafletMap');
    	// console.log('leafletMap', zoom, leafletMap);
    	L.Map.addInitHook(function () {
    		// leafletMap = this;
    		// leafletMap.on('zoomend', setZoom);
    	});

    	beforeUpdate(() => {
    		console.log('the component is about to update', leafletMap);
    	});
    	*/

    	return { base_visible, toggleBase, setBase };
    }

    class Base extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, []);
    	}
    }

    /* src\Report\Report.svelte generated by Svelte v3.7.1 */

    function create_fragment$5(ctx) {
    	var div_90;

    	return {
    		c() {
    			div_90 = element("div");
    			div_90.innerHTML = `<div class="sidebar-opened-row1"><div class="sidebar-opened-row1-left">Название проекта/компании</div> <div class="sidebar-opened-row1-right"></div></div> <div class="sidebar-opened-row2"><input type="text" name="input1" class="header-input1"></div> <div class="sidebar-opened-row3"><div class="sidebar-opened-row3-left"><label class="control control-checkbox">
			         Выделить все
			         <input type="checkbox"> <div class="control_indicator"></div></label></div> <div class="sidebar-opened-row3-right"><div class="sidebar-opened-row3-right-el1"></div> <div class="sidebar-opened-row3-right-el2"></div> <div class="sidebar-opened-row3-right-el3"></div> <div class="sidebar-opened-row3-right-el4"></div></div></div> <div class="sidebar-opened-el-container"><div class="sidebar-opened-el-container" id="style-4"><div class="sidebar-opened-row-el"><div class="sidebar-opened-el-left"><label class="control control-checkbox control-black control-empty-0">
			               Корневой пустой слой
			               <input type="checkbox"> <div class="control_indicator"></div></label></div> <div class="sidebar-opened-el-right"></div></div> <div class="sidebar-opened-row-el"><div class="sidebar-opened-el-left"><label class="control control-checkbox control-black control-1-default-0">
			               Корневой слой 1
			               <input type="checkbox"> <div class="control_indicator"></div></label></div> <div class="sidebar-opened-el-right"></div></div> <div class="sidebar-opened-row-el"><div class="sidebar-opened-el-left"><label class="control control-checkbox control-black control-2-default-0">
			               Корневой слой 2
			               <input type="checkbox"> <div class="control_indicator"></div></label></div> <div class="sidebar-opened-el-right"></div></div> <div class="sidebar-opened-row-el"><div class="sidebar-opened-el-left"><label class="control control-checkbox control-black control-3-default-0">
			               Корневой слой 3
			               <input type="checkbox"> <div class="control_indicator"></div></label></div> <div class="sidebar-opened-el-right"></div></div> <div class="sidebar-opened-row-el"><div class="sidebar-opened-el-left"><label class="control control-checkbox control-black control-group-1">
			               1-й уровень вложенности
			               <input type="checkbox" checked="checked"> <div class="control_indicator"></div></label></div> <div class="sidebar-opened-el-right"></div></div> <div class="sidebar-opened-row-el"><div class="sidebar-opened-el-left"><label class="control control-checkbox control-black control-empty-1">
			               Вложенность 1 пустой слой
			               <input type="checkbox" checked="checked"> <div class="control_indicator"></div></label></div> <div class="sidebar-opened-el-right"></div></div> <div class="sidebar-opened-row-el"><div class="sidebar-opened-el-left"><label class="control control-checkbox control-black control-1-default-1">
			               Вложенность 1 слой 1
			               <input type="checkbox"> <div class="control_indicator"></div></label></div> <div class="sidebar-opened-el-right"></div></div> <div class="sidebar-opened-row-el"><div class="sidebar-opened-el-left"><label class="control control-checkbox control-black control-2-default-1">
			               Вложенность 1 слой 2
			               <input type="checkbox"> <div class="control_indicator"></div></label></div> <div class="sidebar-opened-el-right"></div></div> <div class="sidebar-opened-row-el"><div class="sidebar-opened-el-left"><label class="control control-checkbox control-black control-3-default-1">
			               Вложенность 1 слой 3
			               <input type="checkbox"> <div class="control_indicator"></div></label></div> <div class="sidebar-opened-el-right"></div></div> <div class="sidebar-opened-row-el"><div class="sidebar-opened-el-left"><label class="control control-checkbox control-black control-group-2">
			               2-й уровень вложенности
			               <input type="checkbox" checked="checked"> <div class="control_indicator"></div></label></div> <div class="sidebar-opened-el-right"></div></div> <div class="sidebar-opened-row-el"><div class="sidebar-opened-el-left"><label class="control control-checkbox control-black control-empty-2">
			               Вложенность 2 пустой слой
			               <input type="checkbox" checked="checked"> <div class="control_indicator"></div></label></div> <div class="sidebar-opened-el-right"></div></div> <div class="sidebar-opened-row-el"><div class="sidebar-opened-el-left"><label class="control control-checkbox control-black control-1-default-2">
			               Вложенность 2 слой 1
			               <input type="checkbox"> <div class="control_indicator"></div></label></div> <div class="sidebar-opened-el-right"></div></div> <div class="sidebar-opened-row-el"><div class="sidebar-opened-el-left"><label class="control control-checkbox control-black control-2-default-2">
			               Вложенность 2 слой 2
			               <input type="checkbox"> <div class="control_indicator"></div></label></div> <div class="sidebar-opened-el-right"></div></div> <div class="sidebar-opened-row-el"><div class="sidebar-opened-el-left"><label class="control control-checkbox control-black control-3-default-2">
			               Вложенность 2 слой 3
			               <input type="checkbox"> <div class="control_indicator"></div></label></div> <div class="sidebar-opened-el-right"></div></div> <div class="sidebar-opened-row-el"><div class="sidebar-opened-el-left"><label class="control control-checkbox control-black control-group-3">
			               3-й уровень вложенности
			               <input type="checkbox" checked="checked"> <div class="control_indicator"></div></label></div> <div class="sidebar-opened-el-right"></div></div> <div class="sidebar-opened-row-el"><div class="sidebar-opened-el-left"><label class="control control-checkbox control-black control-empty-3">
			               Вложенность 3 пустой слой
			               <input type="checkbox" checked="checked"> <div class="control_indicator"></div></label></div> <div class="sidebar-opened-el-right"></div></div> <div class="sidebar-opened-row-el"><div class="sidebar-opened-el-left"><label class="control control-checkbox control-black control-1-default-3">
			               Вложенность 3 слой 1
			               <input type="checkbox"> <div class="control_indicator"></div></label></div> <div class="sidebar-opened-el-right"></div></div> <div class="sidebar-opened-row-el"><div class="sidebar-opened-el-left"><label class="control control-checkbox control-black control-2-default-3">
			               Вложенность 3 слой 2
			               <input type="checkbox"> <div class="control_indicator"></div></label></div> <div class="sidebar-opened-el-right"></div></div> <div class="sidebar-opened-row-el"><div class="sidebar-opened-el-left"><label class="control control-checkbox control-black control-3-default-3">
			               Вложенность 3 слой 3
			               <input type="checkbox"> <div class="control_indicator"></div></label></div> <div class="sidebar-opened-el-right"></div></div></div></div>`;
    			attr(div_90, "class", "sidebar-opened");
    		},

    		m(target, anchor) {
    			insert(target, div_90, anchor);
    		},

    		p: noop,
    		i: noop,
    		o: noop,

    		d(detaching) {
    			if (detaching) {
    				detach(div_90);
    			}
    		}
    	};
    }

    function instance$5($$self, $$props, $$invalidate) {
    	
       
        let { mapID } = $$props;

    // console.log('ssss', mapID, Store.mapTree, Store.leafletMap)
    	let tree = null;
    	const unsubscribe = mapTree.subscribe(value => {
    		tree = value;
    		if (tree) {
    console.log('Report tree', tree);
    			// map.addLayer(baseLayers[2]);
    		}
    	});

    	$$self.$set = $$props => {
    		if ('mapID' in $$props) $$invalidate('mapID', mapID = $$props.mapID);
    	};

    	return { mapID };
    }

    class Report extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, ["mapID"]);
    	}
    }

    /* src\App.svelte generated by Svelte v3.7.1 */

    // (106:0) {#if sidebar_visible}
    function create_if_block(ctx) {
    	var current_block_type_index, if_block, if_block_anchor, current;

    	var if_block_creators = [
    		create_if_block_1,
    		create_if_block_2,
    		create_if_block_3,
    		create_if_block_4
    	];

    	var if_blocks = [];

    	function select_block_type(ctx) {
    		if (ctx.sidebar_num === 1) return 0;
    		if (ctx.sidebar_num === 2) return 1;
    		if (ctx.sidebar_num === 3) return 2;
    		if (ctx.sidebar_num === 4) return 3;
    		return -1;
    	}

    	if (~(current_block_type_index = select_block_type(ctx))) {
    		if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    	}

    	return {
    		c() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},

    		m(target, anchor) {
    			if (~current_block_type_index) if_blocks[current_block_type_index].m(target, anchor);
    			insert(target, if_block_anchor, anchor);
    			current = true;
    		},

    		p(changed, ctx) {
    			var previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);
    			if (current_block_type_index === previous_block_index) {
    				if (~current_block_type_index) if_blocks[current_block_type_index].p(changed, ctx);
    			} else {
    				if (if_block) {
    					group_outros();
    					transition_out(if_blocks[previous_block_index], 1, 1, () => {
    						if_blocks[previous_block_index] = null;
    					});
    					check_outros();
    				}

    				if (~current_block_type_index) {
    					if_block = if_blocks[current_block_type_index];
    					if (!if_block) {
    						if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    						if_block.c();
    					}
    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				} else {
    					if_block = null;
    				}
    			}
    		},

    		i(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},

    		o(local) {
    			transition_out(if_block);
    			current = false;
    		},

    		d(detaching) {
    			if (~current_block_type_index) if_blocks[current_block_type_index].d(detaching);

    			if (detaching) {
    				detach(if_block_anchor);
    			}
    		}
    	};
    }

    // (114:29) 
    function create_if_block_4(ctx) {
    	var current;

    	var report = new Report({ props: { mapID: ctx.name } });

    	return {
    		c() {
    			report.$$.fragment.c();
    		},

    		m(target, anchor) {
    			mount_component(report, target, anchor);
    			current = true;
    		},

    		p(changed, ctx) {
    			var report_changes = {};
    			if (changed.name) report_changes.mapID = ctx.name;
    			report.$set(report_changes);
    		},

    		i(local) {
    			if (current) return;
    			transition_in(report.$$.fragment, local);

    			current = true;
    		},

    		o(local) {
    			transition_out(report.$$.fragment, local);
    			current = false;
    		},

    		d(detaching) {
    			destroy_component(report, detaching);
    		}
    	};
    }

    // (112:29) 
    function create_if_block_3(ctx) {
    	var div;

    	return {
    		c() {
    			div = element("div");
    			div.textContent = "Третья вкладка";
    			attr(div, "class", "sidebar-opened");
    		},

    		m(target, anchor) {
    			insert(target, div, anchor);
    		},

    		p: noop,
    		i: noop,
    		o: noop,

    		d(detaching) {
    			if (detaching) {
    				detach(div);
    			}
    		}
    	};
    }

    // (110:29) 
    function create_if_block_2(ctx) {
    	var div;

    	return {
    		c() {
    			div = element("div");
    			div.textContent = "Вторая вкладка";
    			attr(div, "class", "sidebar-opened");
    		},

    		m(target, anchor) {
    			insert(target, div, anchor);
    		},

    		p: noop,
    		i: noop,
    		o: noop,

    		d(detaching) {
    			if (detaching) {
    				detach(div);
    			}
    		}
    	};
    }

    // (108:1) {#if sidebar_num === 1}
    function create_if_block_1(ctx) {
    	var current;

    	var layerstree = new LayersTree({ props: { mapID: ctx.name } });

    	return {
    		c() {
    			layerstree.$$.fragment.c();
    		},

    		m(target, anchor) {
    			mount_component(layerstree, target, anchor);
    			current = true;
    		},

    		p(changed, ctx) {
    			var layerstree_changes = {};
    			if (changed.name) layerstree_changes.mapID = ctx.name;
    			layerstree.$set(layerstree_changes);
    		},

    		i(local) {
    			if (current) return;
    			transition_in(layerstree.$$.fragment, local);

    			current = true;
    		},

    		o(local) {
    			transition_out(layerstree.$$.fragment, local);
    			current = false;
    		},

    		d(detaching) {
    			destroy_component(layerstree, detaching);
    		}
    	};
    }

    function create_fragment$6(ctx) {
    	var div16, t17, div24, div21, div17, t18, div18, t19, div19, t20, div20, t21, div23, div22, t22, t23, t24, div26, div25, t25, t26, t27, div27, t28, div28, current, dispose;

    	var if_block = (ctx.sidebar_visible) && create_if_block(ctx);

    	var map = new Map$1({ props: { mapID: ctx.name } });

    	var zoom = new Zoom({});

    	var base = new Base({});

    	return {
    		c() {
    			div16 = element("div");
    			div16.innerHTML = `<div class="block_left"><span class="logo"><div class="logo_left">
						   
					   </div> <div class="logo_left_text">
						  Logo
					   </div></span> <div class="left-icons"><div class="left-icons-left"><div class="icons-header-left1"></div> <div class="icons-header-left2"></div></div> <div class="left-icons-right"><div class="icons-header-right1"></div> <div class="icons-header-right2"></div></div></div> <div class="left-icons-1-act"></div> <div class="slider-container"><div class="range-slider"><input class="range-slider__range" type="range" value="30" min="0" max="100"> <span class="range-slider__value">30</span> <span class="percent">%</span></div></div></div> <div class="block_right"><input type="text" name="input" placeholder="Поиск по адресам и координатам" class="header-input"> <div class="account">Имя Фамилия</div> <div class="account-star"></div></div>`;
    			t17 = space();
    			div24 = element("div");
    			div21 = element("div");
    			div17 = element("div");
    			t18 = space();
    			div18 = element("div");
    			t19 = space();
    			div19 = element("div");
    			t20 = space();
    			div20 = element("div");
    			t21 = space();
    			div23 = element("div");
    			div22 = element("div");
    			t22 = space();
    			if (if_block) if_block.c();
    			t23 = space();
    			map.$$.fragment.c();
    			t24 = space();
    			div26 = element("div");
    			div25 = element("div");
    			t25 = space();
    			zoom.$$.fragment.c();
    			t26 = space();
    			base.$$.fragment.c();
    			t27 = space();
    			div27 = element("div");
    			t28 = space();
    			div28 = element("div");
    			attr(div16, "class", "header");
    			attr(div17, "class", "icons-vert-top-1");
    			attr(div18, "class", "icons-vert-top-2");
    			attr(div19, "class", "icons-vert-top-3");
    			attr(div20, "class", "icons-vert-top-3");
    			attr(div21, "class", "icons-vert-top");
    			attr(div22, "class", "icons-vert-bottom-1");
    			attr(div23, "class", "icons-vert-bottom");
    			attr(div24, "class", "sidebar");
    			attr(div25, "class", "right-controls-2");
    			attr(div26, "class", "right-controls");
    			attr(div27, "class", "copyright");
    			attr(div28, "class", "copyright-bottom");

    			dispose = [
    				listen(div17, "click", ctx.click_handler),
    				listen(div18, "click", ctx.click_handler_1),
    				listen(div19, "click", ctx.click_handler_2),
    				listen(div20, "click", ctx.click_handler_3),
    				listen(div22, "click", ctx.toggleSidebar),
    				listen(div25, "click", ctx.toggleBase)
    			];
    		},

    		m(target, anchor) {
    			insert(target, div16, anchor);
    			insert(target, t17, anchor);
    			insert(target, div24, anchor);
    			append(div24, div21);
    			append(div21, div17);
    			append(div21, t18);
    			append(div21, div18);
    			append(div21, t19);
    			append(div21, div19);
    			append(div21, t20);
    			append(div21, div20);
    			append(div24, t21);
    			append(div24, div23);
    			append(div23, div22);
    			insert(target, t22, anchor);
    			if (if_block) if_block.m(target, anchor);
    			insert(target, t23, anchor);
    			mount_component(map, target, anchor);
    			insert(target, t24, anchor);
    			insert(target, div26, anchor);
    			append(div26, div25);
    			append(div26, t25);
    			mount_component(zoom, div26, null);
    			insert(target, t26, anchor);
    			mount_component(base, target, anchor);
    			insert(target, t27, anchor);
    			insert(target, div27, anchor);
    			insert(target, t28, anchor);
    			insert(target, div28, anchor);
    			current = true;
    		},

    		p(changed, ctx) {
    			if (ctx.sidebar_visible) {
    				if (if_block) {
    					if_block.p(changed, ctx);
    					transition_in(if_block, 1);
    				} else {
    					if_block = create_if_block(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(t23.parentNode, t23);
    				}
    			} else if (if_block) {
    				group_outros();
    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});
    				check_outros();
    			}

    			var map_changes = {};
    			if (changed.name) map_changes.mapID = ctx.name;
    			map.$set(map_changes);
    		},

    		i(local) {
    			if (current) return;
    			transition_in(if_block);

    			transition_in(map.$$.fragment, local);

    			transition_in(zoom.$$.fragment, local);

    			transition_in(base.$$.fragment, local);

    			current = true;
    		},

    		o(local) {
    			transition_out(if_block);
    			transition_out(map.$$.fragment, local);
    			transition_out(zoom.$$.fragment, local);
    			transition_out(base.$$.fragment, local);
    			current = false;
    		},

    		d(detaching) {
    			if (detaching) {
    				detach(div16);
    				detach(t17);
    				detach(div24);
    				detach(t22);
    			}

    			if (if_block) if_block.d(detaching);

    			if (detaching) {
    				detach(t23);
    			}

    			destroy_component(map, detaching);

    			if (detaching) {
    				detach(t24);
    				detach(div26);
    			}

    			destroy_component(zoom);

    			if (detaching) {
    				detach(t26);
    			}

    			destroy_component(base, detaching);

    			if (detaching) {
    				detach(t27);
    				detach(div27);
    				detach(t28);
    				detach(div28);
    			}

    			run_all(dispose);
    		}
    	};
    }

    function instance$6($$self, $$props, $$invalidate) {
    	

    	// let base_visible = false;
    	// const unsubscribe = baseContVisible.subscribe(value => {
    // console.log('sssssssss', value);
    		// base_visible = value;
    	// });
    	// const unsubscribe1 = leafletMap.subscribe(value => {
    // console.log('leafletMap', value);
    	// });
    	
        let { name } = $$props;
    // console.log('mapID vv33333v', name); // .mapID

    	let toggleBase = () => {
    		baseContVisible.update(n => !n);
    	};

    	let sidebar_num = 1;
    	let sidebar_visible = true;
    	let toggleSidebar = (ev) => {
    // console.log('toggleSidebar', ev);
    		$$invalidate('sidebar_visible', sidebar_visible = !sidebar_visible);
    		let classList = ev.target.classList,
    			className = 'rotate180';
    		if (classList.contains(className)) {
    			classList.remove(className);
    		} else {
    			classList.add(className);
    		}
    	};
    	let openSidebar = (nm) => {
    // console.log('op222enSidebar', sidebar_num, nm);
    		if (sidebar_num === nm) { nm = 0; }
    		$$invalidate('sidebar_num', sidebar_num = nm);
    	};

        onMount (() => {
    // console.log('mapIDnnnnnnnnnnnnn', name); // .mapID
    	});

    	function click_handler() {openSidebar(1);}

    	function click_handler_1() {openSidebar(2);}

    	function click_handler_2() {openSidebar(3);}

    	function click_handler_3() {openSidebar(4);}

    	$$self.$set = $$props => {
    		if ('name' in $$props) $$invalidate('name', name = $$props.name);
    	};

    	return {
    		name,
    		toggleBase,
    		sidebar_num,
    		sidebar_visible,
    		toggleSidebar,
    		openSidebar,
    		click_handler,
    		click_handler_1,
    		click_handler_2,
    		click_handler_3
    	};
    }

    class App extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$6, create_fragment$6, safe_not_equal, ["name"]);
    	}
    }

    // import Requests from './worker/Requests.js';


    const app = new App({
    	target: document.body,
    	props: {
    		name: '0878531CB0BF4EB58BC7E6E95EFE8783'
    		// name: 'ND99E'
    	}
    });

    return app;

}());
//# sourceMappingURL=forest_1.0.js.map
