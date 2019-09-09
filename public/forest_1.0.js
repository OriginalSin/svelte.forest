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
    function add_flush_callback(fn) {
        flush_callbacks.push(fn);
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

    const globals = (typeof window !== 'undefined' ? window : global);

    function bind(component, name, callback) {
        if (component.$$.props.indexOf(name) === -1)
            return;
        component.$$.bound[name] = callback;
        callback(component.$$.ctx[name]);
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
    const mapLayers = writable(0);
    const baseContVisible = writable(0);
    const mapTree = writable(0);
    const worker = writable(0);
    const kvItems = writable(0);
    const delItems = writable(0);

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
    			// .addControl(L.control.gmxBottom())
    			.addControl(L.control.gmxLogo({position: 'gmxbottomright'}))	// {type: 'color'}
    			.addControl(L.control.gmxCopyright({type: 'window', position: 'gmxbottomright'}))
                .addControl(L.control.gmxLocation());

    		resize();
    		leafletMap.set(map);

    		L.gmx.loadMap(mapID)
    			.then((res) => {
    	// console.log('loadMap', res);
    				mapLayers.set(res);
    			});

    		dataWorker.onmessage = (res) => {
    			let data = res.data,
    				cmd = data.cmd,
    				json = data.out;

    			if (cmd === 'getMap') {
    				mapTree.set(json);
    			}
    	// console.log('onmessage', json);
    		};		dataWorker.postMessage({cmd: 'getMap', mapID: mapID});
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
    	var div6, div1, label, t0_value = ctx.item.properties.title, t0, t1, input, t2, div0, label_class_value, t3, div5, div2, t4, div3, t5, div4, div4_class_value, dispose;

    	return {
    		c() {
    			div6 = element("div");
    			div1 = element("div");
    			label = element("label");
    			t0 = text(t0_value);
    			t1 = space();
    			input = element("input");
    			t2 = space();
    			div0 = element("div");
    			t3 = space();
    			div5 = element("div");
    			div2 = element("div");
    			t4 = space();
    			div3 = element("div");
    			t5 = space();
    			div4 = element("div");
    			attr(input, "type", "checkbox");
    			attr(div0, "class", "control_indicator");
    			attr(label, "class", label_class_value = "control control-checkbox control-black " + (ctx.item.group ? 'group' : ctx.item.properties.GeometryType || ctx.item.properties.type) + " inside-" + (ctx.item.level - 1));
    			attr(div1, "class", "sidebar-opened-el-left");
    			attr(div2, "class", "sidebar-opened-el-right-1");
    			attr(div2, "title", "Центрировать");
    			attr(div3, "class", "sidebar-opened-el-right-2");
    			attr(div3, "title", "Редактор объектов");
    			attr(div4, "class", div4_class_value = "sidebar-opened-el-right-3 " + (ctx.item.properties.IsRasterCatalog ? '' : 'hidden'));
    			attr(div4, "title", "Прозрачность");
    			attr(div5, "class", "sidebar-opened-el-right");
    			attr(div6, "class", "sidebar-opened-row-el");

    			dispose = [
    				listen(input, "change", ctx.toggleLayer),
    				listen(div0, "click", ctx.fitBounds),
    				listen(div2, "click", ctx.fitBounds),
    				listen(div4, "click", ctx.opacityFilter)
    			];
    		},

    		m(target, anchor) {
    			insert(target, div6, anchor);
    			append(div6, div1);
    			append(div1, label);
    			append(label, t0);
    			append(label, t1);
    			append(label, input);
    			append(label, t2);
    			append(label, div0);
    			append(div6, t3);
    			append(div6, div5);
    			append(div5, div2);
    			append(div5, t4);
    			append(div5, div3);
    			append(div5, t5);
    			append(div5, div4);
    		},

    		p(changed, ctx) {
    			if ((changed.item) && t0_value !== (t0_value = ctx.item.properties.title)) {
    				set_data(t0, t0_value);
    			}

    			if ((changed.item) && label_class_value !== (label_class_value = "control control-checkbox control-black " + (ctx.item.group ? 'group' : ctx.item.properties.GeometryType || ctx.item.properties.type) + " inside-" + (ctx.item.level - 1))) {
    				attr(label, "class", label_class_value);
    			}

    			if ((changed.item) && div4_class_value !== (div4_class_value = "sidebar-opened-el-right-3 " + (ctx.item.properties.IsRasterCatalog ? '' : 'hidden'))) {
    				attr(div4, "class", div4_class_value);
    			}
    		},

    		i: noop,
    		o: noop,

    		d(detaching) {
    			if (detaching) {
    				detach(div6);
    			}

    			run_all(dispose);
    		}
    	};
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { item, map, gmxMap, expanded } = $$props;
        //let is;

    	const unsubscribe = leafletMap.subscribe(value => {
    		$$invalidate('map', map = value);
    	});
    	const unsubscribe1 = mapLayers.subscribe(value => {
    		$$invalidate('gmxMap', gmxMap = value);
    	});

    	const toggleLayer = (ev) => {
    		if (gmxMap && gmxMap.layersByID) {
    			let lid = item.properties.name,
    				it = gmxMap.layersByID[lid];
    			if (it) {
    				if (ev.target.checked) {
    					map.addLayer(it);
    				} else {
    					map.removeLayer(it);
    				}
    			}
    		}
    	};

    	const fitBounds = (ev) => {
    		if (gmxMap && gmxMap.layersByID) {
    			let lid = item.properties.name,
    				it = gmxMap.layersByID[lid];
    			if (it) {
    				map.fitBounds(it.getBounds());
    			}
    		}
    	};

    	const opacityFilter = (ev) => {
    		if (gmxMap && gmxMap.layersByID) {
    			let lid = item.properties.name,
    				it = gmxMap.layersByID[lid];
    			if (it) {
    // console.log('opacityFilter', item, gmxMap);
    				it.setOpacity(0.5);
    			}
    		}
    	};
    	if (item.group) {
    		$$invalidate('expanded', expanded = item.properties.expanded);
    	}
    // console.log('expanded', expanded);

    	$$self.$set = $$props => {
    		if ('item' in $$props) $$invalidate('item', item = $$props.item);
    		if ('map' in $$props) $$invalidate('map', map = $$props.map);
    		if ('gmxMap' in $$props) $$invalidate('gmxMap', gmxMap = $$props.gmxMap);
    		if ('expanded' in $$props) $$invalidate('expanded', expanded = $$props.expanded);
    	};

    	return {
    		item,
    		map,
    		gmxMap,
    		expanded,
    		toggleLayer,
    		fitBounds,
    		opacityFilter
    	};
    }

    class LineNode extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, ["item", "map", "gmxMap", "expanded"]);
    	}
    }

    /* src\Controls\LayersTree\LayersTree.svelte generated by Svelte v3.7.1 */

    function get_each_context(ctx, list, i) {
    	const child_ctx = Object.create(ctx);
    	child_ctx.item = list[i];
    	return child_ctx;
    }

    // (71:2) {#each layersArr as item}
    function create_each_block(ctx) {
    	var updating_expanded, current;

    	function linenode_expanded_binding(value) {
    		ctx.linenode_expanded_binding.call(null, value);
    		updating_expanded = true;
    		add_flush_callback(() => updating_expanded = false);
    	}

    	let linenode_props = { item: ctx.item };
    	if (ctx.expanded !== void 0) {
    		linenode_props.expanded = ctx.expanded;
    	}
    	var linenode = new LineNode({ props: linenode_props });

    	binding_callbacks.push(() => bind(linenode, 'expanded', linenode_expanded_binding));

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
    			if (!updating_expanded && changed.expanded) {
    				linenode_changes.expanded = ctx.expanded;
    			}
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
    	var div13, div2, div0, t0_value = ctx.mapAttr.properties && ctx.mapAttr.properties.title || 'Название проекта/компании', t0, t1, div1, t2, div3, t3, div11, t10, div12, current;

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
    			div13 = element("div");
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
			         <input type="checkbox"> <div class="control_indicator"></div></label></div> <div class="sidebar-opened-row3-right"><div class="sidebar-opened-row3-right-el1" title="Создать слой"></div> <div class="sidebar-opened-row3-right-el2" title="Добавить группу"></div> <div class="sidebar-opened-row3-right-el3" title="Загрузить"></div> <div class="sidebar-opened-row3-right-el4" title="Фильтр"></div></div>`;
    			t10 = space();
    			div12 = element("div");

    			for (var i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}
    			attr(div0, "class", "sidebar-opened-row1-left");
    			attr(div1, "class", "sidebar-opened-row1-right");
    			attr(div1, "title", "Редактировать");
    			attr(div2, "class", "sidebar-opened-row1");
    			attr(div3, "class", "sidebar-opened-row2");
    			attr(div11, "class", "sidebar-opened-row3");
    			attr(div12, "class", "sidebar-opened-el-container");
    			attr(div12, "id", "style-4");
    			attr(div13, "class", "sidebar-opened");
    		},

    		m(target, anchor) {
    			insert(target, div13, anchor);
    			append(div13, div2);
    			append(div2, div0);
    			append(div0, t0);
    			append(div2, t1);
    			append(div2, div1);
    			append(div13, t2);
    			append(div13, div3);
    			append(div13, t3);
    			append(div13, div11);
    			append(div13, t10);
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

    			if (changed.layersArr || changed.expanded) {
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
    				detach(div13);
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
        let { layersArr = [], mapAttr = {}, expanded = true } = $$props;

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
    // console.log('tree', mapAttr, layersArr, tree);
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

    	function linenode_expanded_binding(value) {
    		expanded = value;
    		$$invalidate('expanded', expanded);
    	}

    	$$self.$set = $$props => {
    		if ('layersArr' in $$props) $$invalidate('layersArr', layersArr = $$props.layersArr);
    		if ('mapAttr' in $$props) $$invalidate('mapAttr', mapAttr = $$props.mapAttr);
    		if ('expanded' in $$props) $$invalidate('expanded', expanded = $$props.expanded);
    	};

    	return {
    		layersArr,
    		mapAttr,
    		expanded,
    		linenode_expanded_binding
    	};
    }

    class LayersTree extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, ["layersArr", "mapAttr", "expanded"]);
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
    		//console.log('setZoom', leafletMap.getZoom(), ev);
    	});
    	let zoomIn = (() => {
    		let z = parseInt(zoom.textContent);
    //		console.log('zoomIn', leafletMap.getZoom(), zoom);
    		leafletMap.setZoom(z + 1);
    	});
    	let zoomOut = (() => {
    		let z = parseInt(zoom.textContent);
    		//console.log('zoomOut', leafletMap.getZoom());
    		leafletMap.setZoom(z - 1);
    	});
    	// let leafletMap = getContext('leafletMap');
    	// console.log('leafletMap', zoom, leafletMap);
    	L.Map.addInitHook(function () {
    		leafletMap = this;
    		leafletMap.on('zoomend', setZoom);
    	});

    	beforeUpdate(() => {
    		//console.log('the component is about to update', leafletMap);
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
    // console.log('map', map);
    			map.addLayer(baseLayers[2]);

    		}
    	});
    	let setBase = (ev) => {
    // console.log('setBase', ev);
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

    const serverBase = window.serverBase || '//maps.kosmosnimki.ru/';

    /*jslint plusplus:true */
    function Geomag(model) {
    	var wmm,
    		maxord = 12,
    		a = 6378.137,		// WGS 1984 Equatorial axis (km)
    		b = 6356.7523142,	// WGS 1984 Polar axis (km)
    		re = 6371.2,
    		a2 = a * a,
    		b2 = b * b,
    		c2 = a2 - b2,
    		a4 = a2 * a2,
    		b4 = b2 * b2,
    		c4 = a4 - b4,
    		z = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    		unnormalizedWMM;

    	function parseCof(cof) {
    		wmm = (function (cof) {
    			var modelLines = cof.split('\n'), wmm = [], i, vals, epoch, model, modelDate;
    			for (i in modelLines) {
    				if (modelLines.hasOwnProperty(i)) {
    					vals = modelLines[i].replace(/^\s+|\s+$/g, "").split(/\s+/);
    					if (vals.length === 3) {
    						epoch = parseFloat(vals[0]);
    						model = vals[1];
    						modelDate = vals[2];
    					} else if (vals.length === 6) {
    						wmm.push({
    							n: parseInt(vals[0], 10),
    							m: parseInt(vals[1], 10),
    							gnm: parseFloat(vals[2]),
    							hnm: parseFloat(vals[3]),
    							dgnm: parseFloat(vals[4]),
    							dhnm: parseFloat(vals[5])
    						});
    					}
    				}
    			}

    			return {epoch: epoch, model: model, modelDate: modelDate, wmm: wmm};
    		}(cof));
    	}

    	function unnormalize(wmm) {
    		var i, j, m, n, D2, flnmj,
    			c = [z.slice(), z.slice(), z.slice(), z.slice(), z.slice(), z.slice(),
    				z.slice(), z.slice(), z.slice(), z.slice(), z.slice(), z.slice(),
    				z.slice()],
    			cd = [z.slice(), z.slice(), z.slice(), z.slice(), z.slice(), z.slice(),
    				z.slice(), z.slice(), z.slice(), z.slice(), z.slice(), z.slice(),
    				z.slice()],
    			k = [z.slice(), z.slice(), z.slice(), z.slice(), z.slice(), z.slice(),
    				z.slice(), z.slice(), z.slice(), z.slice(), z.slice(), z.slice(),
    				z.slice()],
    			snorm = [z.slice(), z.slice(), z.slice(), z.slice(), z.slice(),
    				z.slice(), z.slice(), z.slice(), z.slice(), z.slice(), z.slice(),
    				z.slice(), z.slice()],
    			model = wmm.wmm;
    		for (i in model) {
    			if (model.hasOwnProperty(i)) {
    				if (model[i].m <= model[i].n) {
    					c[model[i].m][model[i].n] = model[i].gnm;
    					cd[model[i].m][model[i].n] = model[i].dgnm;
    					if (model[i].m !== 0) {
    						c[model[i].n][model[i].m - 1] = model[i].hnm;
    						cd[model[i].n][model[i].m - 1] = model[i].dhnm;
    					}
    				}
    			}
    		}
    		/* CONVERT SCHMIDT NORMALIZED GAUSS COEFFICIENTS TO UNNORMALIZED */
    		snorm[0][0] = 1;

    		for (n = 1; n <= maxord; n++) {
    			snorm[0][n] = snorm[0][n - 1] * (2 * n - 1) / n;
    			j = 2;

    			for (m = 0, D2 = (n - m + 1); D2 > 0; D2--, m++) {
    				k[m][n] = (((n - 1) * (n - 1)) - (m * m)) /
    					((2 * n - 1) * (2 * n - 3));
    				if (m > 0) {
    					flnmj = ((n - m + 1) * j) / (n + m);
    					snorm[m][n] = snorm[m - 1][n] * Math.sqrt(flnmj);
    					j = 1;
    					c[n][m - 1] = snorm[m][n] * c[n][m - 1];
    					cd[n][m - 1] = snorm[m][n] * cd[n][m - 1];
    				}
    				c[m][n] = snorm[m][n] * c[m][n];
    				cd[m][n] = snorm[m][n] * cd[m][n];
    			}
    		}
    		k[1][1] = 0.0;

    		unnormalizedWMM = {epoch: wmm.epoch, k: k, c: c, cd: cd};
    	}

    	this.setCof = function (cof) {
    		parseCof(cof);
    		unnormalize(wmm);
    	};
    	this.getWmm = function () {
    		return wmm;
    	};
    	this.setUnnorm = function (val) {
    		unnormalizedWMM = val;
    	};
    	this.getUnnorm = function () {
    		return unnormalizedWMM;
    	};
    	this.getEpoch = function () {
    		return unnormalizedWMM.epoch;
    	};
    	this.setEllipsoid = function (e) {
    		a = e.a;
    		b = e.b;
    		re = 6371.2;
    		a2 = a * a;
    		b2 = b * b;
    		c2 = a2 - b2;
    		a4 = a2 * a2;
    		b4 = b2 * b2;
    		c4 = a4 - b4;
    	};
    	this.getEllipsoid = function () {
    		return {a: a, b: b};
    	};
    	this.calculate = function (glat, glon, h, date) {
    		if (unnormalizedWMM === undefined) {
    			throw new Error("A World Magnetic Model has not been set.")
    		}
    		if (glat === undefined || glon === undefined) {
    			throw new Error("Latitude and longitude are required arguments.");
    		}
    		function rad2deg(rad) {
    			return rad * (180 / Math.PI);
    		}
    		function deg2rad(deg) {
    			return deg * (Math.PI / 180);
    		}
    		function decimalDate(date) {
    			date = date || new Date();
    			var year = date.getFullYear(),
    				daysInYear = 365 +
    					(((year % 400 === 0) || (year % 4 === 0 && (year % 100 > 0))) ? 1 : 0),
    				msInYear = daysInYear * 24 * 60 * 60 * 1000;

    			return date.getFullYear() + (date.valueOf() - (new Date(year, 0)).valueOf()) / msInYear;
    		}

    		var epoch = unnormalizedWMM.epoch,
    			k = unnormalizedWMM.k,
    			c = unnormalizedWMM.c,
    			cd = unnormalizedWMM.cd,
    			alt = (h / 3280.8399) || 0, // convert h (in feet) to kilometers (default, 0 km)
    			dt = decimalDate(date) - epoch,
    			rlat = deg2rad(glat),
    			rlon = deg2rad(glon),
    			srlon = Math.sin(rlon),
    			srlat = Math.sin(rlat),
    			crlon = Math.cos(rlon),
    			crlat = Math.cos(rlat),
    			srlat2 = srlat * srlat,
    			crlat2 = crlat * crlat,
    			q,
    			q1,
    			q2,
    			ct,
    			st,
    			r2,
    			r,
    			d,
    			ca,
    			sa,
    			aor,
    			ar,
    			br = 0.0,
    			bt = 0.0,
    			bp = 0.0,
    			bpp = 0.0,
    			par,
    			temp1,
    			temp2,
    			parp,
    			D4,
    			m,
    			n,
    			fn = [0, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
    			fm = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    			z = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    			tc = [z.slice(), z.slice(), z.slice(), z.slice(), z.slice(), z.slice(),
    				z.slice(), z.slice(), z.slice(), z.slice(), z.slice(), z.slice(),
    				z.slice()],
    			sp = z.slice(),
    			cp = z.slice(),
    			pp = z.slice(),
    			p = [z.slice(), z.slice(), z.slice(), z.slice(), z.slice(), z.slice(),
    				z.slice(), z.slice(), z.slice(), z.slice(), z.slice(), z.slice(),
    				z.slice()],
    			dp = [z.slice(), z.slice(), z.slice(), z.slice(), z.slice(), z.slice(),
    				z.slice(), z.slice(), z.slice(), z.slice(), z.slice(), z.slice(),
    				z.slice()],
    			bx,
    			by,
    			bz,
    			bh,
    			ti,
    			dec,
    			dip,
    			gv;
    		sp[0] = 0.0;
    		sp[1] = srlon;
    		cp[1] = crlon;
    		tc[0][0] = 0;
    		cp[0] = 1.0;
    		pp[0] = 1.0;
    		p[0][0] = 1;

    		/* CONVERT FROM GEODETIC COORDS. TO SPHERICAL COORDS. */
    		q = Math.sqrt(a2 - c2 * srlat2);
    		q1 = alt * q;
    		q2 = ((q1 + a2) / (q1 + b2)) * ((q1 + a2) / (q1 + b2));
    		ct = srlat / Math.sqrt(q2 * crlat2 + srlat2);
    		st = Math.sqrt(1.0 - (ct * ct));
    		r2 = (alt * alt) + 2.0 * q1 + (a4 - c4 * srlat2) / (q * q);
    		r = Math.sqrt(r2);
    		d = Math.sqrt(a2 * crlat2 + b2 * srlat2);
    		ca = (alt + d) / r;
    		sa = c2 * crlat * srlat / (r * d);

    		for (m = 2; m <= maxord; m++) {
    			sp[m] = sp[1] * cp[m - 1] + cp[1] * sp[m - 1];
    			cp[m] = cp[1] * cp[m - 1] - sp[1] * sp[m - 1];
    		}

    		aor = re / r;
    		ar = aor * aor;

    		for (n = 1; n <= maxord; n++) {
    			ar = ar * aor;
    			for (m = 0, D4 = (n + m + 1); D4 > 0; D4--, m++) {

    		/*
    				COMPUTE UNNORMALIZED ASSOCIATED LEGENDRE POLYNOMIALS
    				AND DERIVATIVES VIA RECURSION RELATIONS
    		*/
    				if (n === m) {
    					p[m][n] = st * p[m - 1][n - 1];
    					dp[m][n] = st * dp[m - 1][n - 1] + ct *
    						p[m - 1][n - 1];
    				} else if (n === 1 && m === 0) {
    					p[m][n] = ct * p[m][n - 1];
    					dp[m][n] = ct * dp[m][n - 1] - st * p[m][n - 1];
    				} else if (n > 1 && n !== m) {
    					if (m > n - 2) { p[m][n - 2] = 0; }
    					if (m > n - 2) { dp[m][n - 2] = 0.0; }
    					p[m][n] = ct * p[m][n - 1] - k[m][n] * p[m][n - 2];
    					dp[m][n] = ct * dp[m][n - 1] - st * p[m][n - 1] -
    						k[m][n] * dp[m][n - 2];
    				}

    		/*
    				TIME ADJUST THE GAUSS COEFFICIENTS
    		*/

    				tc[m][n] = c[m][n] + dt * cd[m][n];
    				if (m !== 0) {
    					tc[n][m - 1] = c[n][m - 1] + dt * cd[n][m - 1];
    				}

    		/*
    				ACCUMULATE TERMS OF THE SPHERICAL HARMONIC EXPANSIONS
    		*/
    				par = ar * p[m][n];
    				if (m === 0) {
    					temp1 = tc[m][n] * cp[m];
    					temp2 = tc[m][n] * sp[m];
    				} else {
    					temp1 = tc[m][n] * cp[m] + tc[n][m - 1] * sp[m];
    					temp2 = tc[m][n] * sp[m] - tc[n][m - 1] * cp[m];
    				}
    				bt = bt - ar * temp1 * dp[m][n];
    				bp += (fm[m] * temp2 * par);
    				br += (fn[n] * temp1 * par);
    		/*
    					SPECIAL CASE:  NORTH/SOUTH GEOGRAPHIC POLES
    		*/
    				if (st === 0.0 && m === 1) {
    					if (n === 1) {
    						pp[n] = pp[n - 1];
    					} else {
    						pp[n] = ct * pp[n - 1] - k[m][n] * pp[n - 2];
    					}
    					parp = ar * pp[n];
    					bpp += (fm[m] * temp2 * parp);
    				}
    			}
    		}

    		bp = (st === 0.0 ? bpp : bp / st);
    		/*
    			ROTATE MAGNETIC VECTOR COMPONENTS FROM SPHERICAL TO
    			GEODETIC COORDINATES
    		*/
    		bx = -bt * ca - br * sa;
    		by = bp;
    		bz = bt * sa - br * ca;

    		/*
    			COMPUTE DECLINATION (DEC), INCLINATION (DIP) AND
    			TOTAL INTENSITY (TI)
    		*/
    		bh = Math.sqrt((bx * bx) + (by * by));
    		ti = Math.sqrt((bh * bh) + (bz * bz));
    		dec = rad2deg(Math.atan2(by, bx));
    		dip = rad2deg(Math.atan2(bz, bh));

    		/*
    			COMPUTE MAGNETIC GRID VARIATION IF THE CURRENT
    			GEODETIC POSITION IS IN THE ARCTIC OR ANTARCTIC
    			(I.E. GLAT > +55 DEGREES OR GLAT < -55 DEGREES)
    			OTHERWISE, SET MAGNETIC GRID VARIATION TO -999.0
    		*/

    		if (Math.abs(glat) >= 55.0) {
    			if (glat > 0.0 && glon >= 0.0) {
    				gv = dec - glon;
    			} else if (glat > 0.0 && glon < 0.0) {
    				gv = dec + Math.abs(glon);
    			} else if (glat < 0.0 && glon >= 0.0) {
    				gv = dec + glon;
    			} else if (glat < 0.0 && glon < 0.0) {
    				gv = dec - Math.abs(glon);
    			}
    			if (gv > 180.0) {
    				gv -= 360.0;
    			} else if (gv < -180.0) { gv += 360.0; }
    		}

    		return {dec: dec, dip: dip, ti: ti, bh: bh, bx: bx, by: by, bz: bz, lat: glat, lon: glon, gv: gv};
    	};
    	this.calc = this.calculate;
    	this.mag = this.calculate;

    	if (model !== undefined) { // initialize
    		if (typeof model === 'string') { // WMM.COF file
    			parseCof(model);
    			unnormalize(wmm);
    		} else if (typeof model === 'object') { // unnorm obj
    			this.setUnnorm(model);
    		} else {
    			throw new Error("Invalid argument type");
    		}
    	}
    }

    var cof = `
    2010.0            WMM-2010        11/20/2009
  1  0  -29496.6       0.0       11.6        0.0
  1  1   -1586.3    4944.4       16.5      -25.9
  2  0   -2396.6       0.0      -12.1        0.0
  2  1    3026.1   -2707.7       -4.4      -22.5
  2  2    1668.6    -576.1        1.9      -11.8
  3  0    1340.1       0.0        0.4        0.0
  3  1   -2326.2    -160.2       -4.1        7.3
  3  2    1231.9     251.9       -2.9       -3.9
  3  3     634.0    -536.6       -7.7       -2.6
  4  0     912.6       0.0       -1.8        0.0
  4  1     808.9     286.4        2.3        1.1
  4  2     166.7    -211.2       -8.7        2.7
  4  3    -357.1     164.3        4.6        3.9
  4  4      89.4    -309.1       -2.1       -0.8
  5  0    -230.9       0.0       -1.0        0.0
  5  1     357.2      44.6        0.6        0.4
  5  2     200.3     188.9       -1.8        1.8
  5  3    -141.1    -118.2       -1.0        1.2
  5  4    -163.0       0.0        0.9        4.0
  5  5      -7.8     100.9        1.0       -0.6
  6  0      72.8       0.0       -0.2        0.0
  6  1      68.6     -20.8       -0.2       -0.2
  6  2      76.0      44.1       -0.1       -2.1
  6  3    -141.4      61.5        2.0       -0.4
  6  4     -22.8     -66.3       -1.7       -0.6
  6  5      13.2       3.1       -0.3        0.5
  6  6     -77.9      55.0        1.7        0.9
  7  0      80.5       0.0        0.1        0.0
  7  1     -75.1     -57.9       -0.1        0.7
  7  2      -4.7     -21.1       -0.6        0.3
  7  3      45.3       6.5        1.3       -0.1
  7  4      13.9      24.9        0.4       -0.1
  7  5      10.4       7.0        0.3       -0.8
  7  6       1.7     -27.7       -0.7       -0.3
  7  7       4.9      -3.3        0.6        0.3
  8  0      24.4       0.0       -0.1        0.0
  8  1       8.1      11.0        0.1       -0.1
  8  2     -14.5     -20.0       -0.6        0.2
  8  3      -5.6      11.9        0.2        0.4
  8  4     -19.3     -17.4       -0.2        0.4
  8  5      11.5      16.7        0.3        0.1
  8  6      10.9       7.0        0.3       -0.1
  8  7     -14.1     -10.8       -0.6        0.4
  8  8      -3.7       1.7        0.2        0.3
  9  0       5.4       0.0       -0.0        0.0
  9  1       9.4     -20.5       -0.1       -0.0
  9  2       3.4      11.5        0.0       -0.2
  9  3      -5.2      12.8        0.3        0.0
  9  4       3.1      -7.2       -0.4       -0.1
  9  5     -12.4      -7.4       -0.3        0.1
  9  6      -0.7       8.0        0.1       -0.0
  9  7       8.4       2.1       -0.1       -0.2
  9  8      -8.5      -6.1       -0.4        0.3
  9  9     -10.1       7.0       -0.2        0.2
 10  0      -2.0       0.0        0.0        0.0
 10  1      -6.3       2.8       -0.0        0.1
 10  2       0.9      -0.1       -0.1       -0.1
 10  3      -1.1       4.7        0.2        0.0
 10  4      -0.2       4.4       -0.0       -0.1
 10  5       2.5      -7.2       -0.1       -0.1
 10  6      -0.3      -1.0       -0.2       -0.0
 10  7       2.2      -3.9        0.0       -0.1
 10  8       3.1      -2.0       -0.1       -0.2
 10  9      -1.0      -2.0       -0.2        0.0
 10 10      -2.8      -8.3       -0.2       -0.1
 11  0       3.0       0.0        0.0        0.0
 11  1      -1.5       0.2        0.0       -0.0
 11  2      -2.1       1.7       -0.0        0.1
 11  3       1.7      -0.6        0.1        0.0
 11  4      -0.5      -1.8       -0.0        0.1
 11  5       0.5       0.9        0.0        0.0
 11  6      -0.8      -0.4       -0.0        0.1
 11  7       0.4      -2.5       -0.0        0.0
 11  8       1.8      -1.3       -0.0       -0.1
 11  9       0.1      -2.1        0.0       -0.1
 11 10       0.7      -1.9       -0.1       -0.0
 11 11       3.8      -1.8       -0.0       -0.1
 12  0      -2.2       0.0       -0.0        0.0
 12  1      -0.2      -0.9        0.0       -0.0
 12  2       0.3       0.3        0.1        0.0
 12  3       1.0       2.1        0.1       -0.0
 12  4      -0.6      -2.5       -0.1        0.0
 12  5       0.9       0.5       -0.0       -0.0
 12  6      -0.1       0.6        0.0        0.1
 12  7       0.5      -0.0        0.0        0.0
 12  8      -0.4       0.1       -0.0        0.0
 12  9      -0.4       0.3        0.0       -0.0
 12 10       0.2      -0.9        0.0       -0.0
 12 11      -0.8      -0.2       -0.1        0.0
 12 12       0.0       0.9        0.1        0.0
999999999999999999999999999999999999999999999999
999999999999999999999999999999999999999999999999
`;
    var geoMag = new Geomag(cof).mag;

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

    /* src\Layers\Layers.svelte generated by Svelte v3.7.1 */
    const { Object: Object_1 } = globals;

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = Object_1.create(ctx);
    	child_ctx.it = list[i];
    	child_ctx.i = i;
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = Object_1.create(ctx);
    	child_ctx.it = list[i];
    	child_ctx.i = i;
    	return child_ctx;
    }

    function get_each_context_2(ctx, list, i) {
    	const child_ctx = Object_1.create(ctx);
    	child_ctx.item = list[i];
    	return child_ctx;
    }

    function get_each_context_3(ctx, list, i) {
    	const child_ctx = Object_1.create(ctx);
    	child_ctx.item = list[i];
    	return child_ctx;
    }

    function get_each_context_4(ctx, list, i) {
    	const child_ctx = Object_1.create(ctx);
    	child_ctx.item = list[i];
    	return child_ctx;
    }

    // (150:1) {#if Utils.isDelynkaLayer(item)}
    function create_if_block_6(ctx) {
    	var option, t_value = ctx.item._gmx.rawProperties.title, t, option_value_value;

    	return {
    		c() {
    			option = element("option");
    			t = text(t_value);
    			option.__value = option_value_value = ctx.item.options.layerID;
    			option.value = option.__value;
    		},

    		m(target, anchor) {
    			insert(target, option, anchor);
    			append(option, t);
    		},

    		p(changed, ctx) {
    			if ((changed.gmxMap) && t_value !== (t_value = ctx.item._gmx.rawProperties.title)) {
    				set_data(t, t_value);
    			}

    			if ((changed.gmxMap) && option_value_value !== (option_value_value = ctx.item.options.layerID)) {
    				option.__value = option_value_value;
    			}

    			option.value = option.__value;
    		},

    		d(detaching) {
    			if (detaching) {
    				detach(option);
    			}
    		}
    	};
    }

    // (149:2) {#each gmxMap.layers as item}
    function create_each_block_4(ctx) {
    	var if_block_anchor;

    	var if_block = (Utils.isDelynkaLayer(ctx.item)) && create_if_block_6(ctx);

    	return {
    		c() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},

    		m(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert(target, if_block_anchor, anchor);
    		},

    		p(changed, ctx) {
    			if (Utils.isDelynkaLayer(ctx.item)) {
    				if (if_block) {
    					if_block.p(changed, ctx);
    				} else {
    					if_block = create_if_block_6(ctx);
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},

    		d(detaching) {
    			if (if_block) if_block.d(detaching);

    			if (detaching) {
    				detach(if_block_anchor);
    			}
    		}
    	};
    }

    // (170:1) {#if Utils.isKvartalLayer(item)}
    function create_if_block_5(ctx) {
    	var option, t_value = ctx.item._gmx.rawProperties.title, t, option_value_value;

    	return {
    		c() {
    			option = element("option");
    			t = text(t_value);
    			option.__value = option_value_value = ctx.item.options.layerID;
    			option.value = option.__value;
    		},

    		m(target, anchor) {
    			insert(target, option, anchor);
    			append(option, t);
    		},

    		p(changed, ctx) {
    			if ((changed.gmxMap) && t_value !== (t_value = ctx.item._gmx.rawProperties.title)) {
    				set_data(t, t_value);
    			}

    			if ((changed.gmxMap) && option_value_value !== (option_value_value = ctx.item.options.layerID)) {
    				option.__value = option_value_value;
    			}

    			option.value = option.__value;
    		},

    		d(detaching) {
    			if (detaching) {
    				detach(option);
    			}
    		}
    	};
    }

    // (169:2) {#each gmxMap.layers as item}
    function create_each_block_3(ctx) {
    	var if_block_anchor;

    	var if_block = (Utils.isKvartalLayer(ctx.item)) && create_if_block_5(ctx);

    	return {
    		c() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},

    		m(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert(target, if_block_anchor, anchor);
    		},

    		p(changed, ctx) {
    			if (Utils.isKvartalLayer(ctx.item)) {
    				if (if_block) {
    					if_block.p(changed, ctx);
    				} else {
    					if_block = create_if_block_5(ctx);
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},

    		d(detaching) {
    			if (if_block) if_block.d(detaching);

    			if (detaching) {
    				detach(if_block_anchor);
    			}
    		}
    	};
    }

    // (271:31) 
    function create_if_block_4(ctx) {
    	var div21, div2, div0, t1, div1, t2, div3, t3, div16, t20, div17, t21, div20, div18, t23, div19, dispose;

    	return {
    		c() {
    			div21 = element("div");
    			div2 = element("div");
    			div0 = element("div");
    			div0.textContent = "Добавление делянки";
    			t1 = space();
    			div1 = element("div");
    			t2 = space();
    			div3 = element("div");
    			t3 = space();
    			div16 = element("div");
    			div16.innerHTML = `<div class="left-controls-pop-add-kvartal-r1 margin-bot-13"><div class="popup-title">Шаг 2. Информация</div></div> <div class="input-kv"><div class="kv">Наименование организации</div> <input type="text" name="" class="input-left-controls-pop-add-kvartal"></div> <div class="input-kv"><div class="kv">Субъект РФ</div> <input type="text" name="" class="input-left-controls-pop-add-kvartal"></div> <div class="input-kv"><div class="kv">Лесничество</div> <input type="text" name="" class="input-left-controls-pop-add-kvartal"></div> <div class="input-kv"><div class="kv">Участковое лесничество</div> <input type="text" name="" class="input-left-controls-pop-add-kvartal"></div> <div class="input-kv"><div class="kv">Дача</div> <input type="text" name="" class="input-left-controls-pop-add-kvartal"></div>`;
    			t20 = space();
    			div17 = element("div");
    			t21 = space();
    			div20 = element("div");
    			div18 = element("div");
    			div18.textContent = "Отмена";
    			t23 = space();
    			div19 = element("div");
    			div19.textContent = "Сохранить";
    			attr(div0, "class", "left-controls-pop-add-kvartal-r1-text");
    			attr(div1, "class", "left-controls-pop-add-kvartal-r1-close");
    			attr(div2, "class", "left-controls-pop-add-kvartal-r1");
    			attr(div3, "class", "left-controls-pop-add-kvartal-r1-bottom margin-bot-0");
    			attr(div16, "class", "left-controls-pop-add-kvartal-scroll");
    			attr(div16, "id", "style-4");
    			attr(div17, "class", "left-controls-pop-add-kvartal-r1-bottom");
    			attr(div18, "class", "left-controls-pop-add-kvartal-r-bot2-left");
    			attr(div19, "class", "left-controls-pop-add-kvartal-r-bot2-right");
    			attr(div20, "class", "left-controls-pop-add-kvartal-r-bot2");
    			attr(div21, "class", "left-controls-pop-add-kvartal");

    			dispose = [
    				listen(div1, "click", ctx.addDelynka0),
    				listen(div18, "click", ctx.addDelynka0)
    			];
    		},

    		m(target, anchor) {
    			insert(target, div21, anchor);
    			append(div21, div2);
    			append(div2, div0);
    			append(div2, t1);
    			append(div2, div1);
    			append(div21, t2);
    			append(div21, div3);
    			append(div21, t3);
    			append(div21, div16);
    			append(div21, t20);
    			append(div21, div17);
    			append(div21, t21);
    			append(div21, div20);
    			append(div20, div18);
    			append(div20, t23);
    			append(div20, div19);
    		},

    		p: noop,

    		d(detaching) {
    			if (detaching) {
    				detach(div21);
    			}

    			run_all(dispose);
    		}
    	};
    }

    // (183:0) {#if addDelynkaFlag === 1}
    function create_if_block(ctx) {
    	var div23, div2, div0, t1, div1, t2, div3, t3, div18, div5, t5, div8, div6, t7, div7, select, option, t8, div10, div9, t10, input0, t11, datalist, raw_value = ctx.kvData && ctx.getOptions(ctx.kvData, 'kvartal'), t12, div15, div12, div11, t14, input1, input1_value_value, t15, div14, div13, t16, input2, input2_value_value, t17, div17, div16, t18, t19, t20, t21, div19, t22, div22, div20, t24, div21, dispose;

    	var each_value_2 = ctx.gmxMap.layers;

    	var each_blocks_2 = [];

    	for (var i = 0; i < each_value_2.length; i += 1) {
    		each_blocks_2[i] = create_each_block_2(get_each_context_2(ctx, each_value_2, i));
    	}

    	var each_value_1 = ctx.snap.snap;

    	var each_blocks_1 = [];

    	for (var i = 0; i < each_value_1.length; i += 1) {
    		each_blocks_1[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	var each_value = ctx.snap.ring;

    	var each_blocks = [];

    	for (var i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
    	}

    	return {
    		c() {
    			div23 = element("div");
    			div2 = element("div");
    			div0 = element("div");
    			div0.textContent = "Добавление делянки";
    			t1 = space();
    			div1 = element("div");
    			t2 = space();
    			div3 = element("div");
    			t3 = space();
    			div18 = element("div");
    			div5 = element("div");
    			div5.innerHTML = `<div class="popup-title">Шаг 1. Контур делянки</div>`;
    			t5 = space();
    			div8 = element("div");
    			div6 = element("div");
    			div6.textContent = "Слой квартальной сети";
    			t7 = space();
    			div7 = element("div");
    			select = element("select");
    			option = element("option");

    			for (var i = 0; i < each_blocks_2.length; i += 1) {
    				each_blocks_2[i].c();
    			}

    			t8 = space();
    			div10 = element("div");
    			div9 = element("div");
    			div9.textContent = "Квартал";
    			t10 = space();
    			input0 = element("input");
    			t11 = space();
    			datalist = element("datalist");
    			t12 = space();
    			div15 = element("div");
    			div12 = element("div");
    			div11 = element("div");
    			div11.textContent = "Координаты опорной точки";
    			t14 = space();
    			input1 = element("input");
    			t15 = space();
    			div14 = element("div");
    			div13 = element("div");
    			t16 = space();
    			input2 = element("input");
    			t17 = space();
    			div17 = element("div");
    			div16 = element("div");
    			t18 = text(ctx.latlngStr);
    			t19 = space();

    			for (var i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].c();
    			}

    			t20 = space();

    			for (var i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t21 = space();
    			div19 = element("div");
    			t22 = space();
    			div22 = element("div");
    			div20 = element("div");
    			div20.textContent = "Отмена";
    			t24 = space();
    			div21 = element("div");
    			div21.textContent = "Далее";
    			attr(div0, "class", "left-controls-pop-add-kvartal-r1-text");
    			attr(div1, "class", "left-controls-pop-add-kvartal-r1-close");
    			attr(div2, "class", "left-controls-pop-add-kvartal-r1");
    			attr(div3, "class", "left-controls-pop-add-kvartal-r1-bottom margin-bot-0");
    			attr(div5, "class", "left-controls-pop-add-kvartal-r1");
    			attr(div6, "class", "kv-1-1");
    			option.__value = "";
    			option.value = option.__value;
    			attr(div7, "class", "styled-select-1-1");
    			attr(div8, "class", "input-kv-1-el2-2-3");
    			attr(div9, "class", "kv");
    			attr(input0, "type", "text");
    			attr(input0, "list", "kvartal");
    			attr(input0, "name", "kvartal");
    			attr(input0, "class", "kvartal input-left-controls-pop-add-kvartal");
    			attr(datalist, "id", "kvartal");
    			attr(div10, "class", "input-kv inp-icon-before");
    			attr(div11, "class", "kv-1");
    			input1.value = input1_value_value = ctx.latlng && ctx.latlng[1];
    			attr(input1, "type", "text");
    			attr(input1, "name", "lat");
    			attr(input1, "class", "input-left-controls-pop-add-kvartal-1");
    			attr(input1, "placeholder", "lat");
    			attr(div12, "class", "input-kv-1-el1");
    			attr(div13, "class", "kv-1");
    			input2.value = input2_value_value = ctx.latlng && ctx.latlng[0];
    			attr(input2, "type", "text");
    			attr(input2, "name", "lon");
    			attr(input2, "class", "input-left-controls-pop-add-kvartal-1 right-inp");
    			attr(input2, "placeholder", "long");
    			attr(div14, "class", "input-kv-1-el2");
    			attr(div15, "class", "input-kv-1 margin-top--7");
    			attr(div16, "class", "left-controls-pop-lat-long-output-text");
    			attr(div17, "class", "left-controls-pop-lat-long-output");
    			attr(div18, "class", "left-controls-pop-add-kvartal-scroll");
    			attr(div18, "id", "style-4");
    			attr(div19, "class", "left-controls-pop-add-kvartal-r1-bottom");
    			attr(div20, "class", "left-controls-pop-add-kvartal-r-bot2-left");
    			attr(div21, "class", "left-controls-pop-add-kvartal-r-bot2-right");
    			attr(div22, "class", "left-controls-pop-add-kvartal-r-bot2");
    			attr(div23, "class", "left-controls-pop-add-kvartal");

    			dispose = [
    				listen(div1, "click", ctx.addDelynka0),
    				listen(select, "change", ctx.changeKvartal),
    				listen(input0, "change", ctx.setKvartal),
    				listen(div20, "click", ctx.addDelynka0),
    				listen(div21, "click", ctx.addDelynka2)
    			];
    		},

    		m(target, anchor) {
    			insert(target, div23, anchor);
    			append(div23, div2);
    			append(div2, div0);
    			append(div2, t1);
    			append(div2, div1);
    			append(div23, t2);
    			append(div23, div3);
    			append(div23, t3);
    			append(div23, div18);
    			append(div18, div5);
    			append(div18, t5);
    			append(div18, div8);
    			append(div8, div6);
    			append(div8, t7);
    			append(div8, div7);
    			append(div7, select);
    			append(select, option);

    			for (var i = 0; i < each_blocks_2.length; i += 1) {
    				each_blocks_2[i].m(select, null);
    			}

    			append(div18, t8);
    			append(div18, div10);
    			append(div10, div9);
    			append(div10, t10);
    			append(div10, input0);
    			append(div10, t11);
    			append(div10, datalist);
    			datalist.innerHTML = raw_value;
    			append(div18, t12);
    			append(div18, div15);
    			append(div15, div12);
    			append(div12, div11);
    			append(div12, t14);
    			append(div12, input1);
    			append(div15, t15);
    			append(div15, div14);
    			append(div14, div13);
    			append(div14, t16);
    			append(div14, input2);
    			append(div18, t17);
    			append(div18, div17);
    			append(div17, div16);
    			append(div16, t18);
    			append(div18, t19);

    			for (var i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].m(div18, null);
    			}

    			append(div18, t20);

    			for (var i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div18, null);
    			}

    			append(div23, t21);
    			append(div23, div19);
    			append(div23, t22);
    			append(div23, div22);
    			append(div22, div20);
    			append(div22, t24);
    			append(div22, div21);
    		},

    		p(changed, ctx) {
    			if (changed.Utils || changed.gmxMap) {
    				each_value_2 = ctx.gmxMap.layers;

    				for (var i = 0; i < each_value_2.length; i += 1) {
    					const child_ctx = get_each_context_2(ctx, each_value_2, i);

    					if (each_blocks_2[i]) {
    						each_blocks_2[i].p(changed, child_ctx);
    					} else {
    						each_blocks_2[i] = create_each_block_2(child_ctx);
    						each_blocks_2[i].c();
    						each_blocks_2[i].m(select, null);
    					}
    				}

    				for (; i < each_blocks_2.length; i += 1) {
    					each_blocks_2[i].d(1);
    				}
    				each_blocks_2.length = each_value_2.length;
    			}

    			if ((changed.kvData) && raw_value !== (raw_value = ctx.kvData && ctx.getOptions(ctx.kvData, 'kvartal'))) {
    				datalist.innerHTML = raw_value;
    			}

    			if ((changed.latlng) && input1_value_value !== (input1_value_value = ctx.latlng && ctx.latlng[1])) {
    				input1.value = input1_value_value;
    			}

    			if ((changed.latlng) && input2_value_value !== (input2_value_value = ctx.latlng && ctx.latlng[0])) {
    				input2.value = input2_value_value;
    			}

    			if (changed.latlngStr) {
    				set_data(t18, ctx.latlngStr);
    			}

    			if (changed.snap) {
    				each_value_1 = ctx.snap.snap;

    				for (var i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks_1[i]) {
    						each_blocks_1[i].p(changed, child_ctx);
    					} else {
    						each_blocks_1[i] = create_each_block_1(child_ctx);
    						each_blocks_1[i].c();
    						each_blocks_1[i].m(div18, t20);
    					}
    				}

    				for (; i < each_blocks_1.length; i += 1) {
    					each_blocks_1[i].d(1);
    				}
    				each_blocks_1.length = each_value_1.length;
    			}

    			if (changed.snap) {
    				each_value = ctx.snap.ring;

    				for (var i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$1(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(changed, child_ctx);
    					} else {
    						each_blocks[i] = create_each_block$1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div18, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}
    				each_blocks.length = each_value.length;
    			}
    		},

    		d(detaching) {
    			if (detaching) {
    				detach(div23);
    			}

    			destroy_each(each_blocks_2, detaching);

    			destroy_each(each_blocks_1, detaching);

    			destroy_each(each_blocks, detaching);

    			run_all(dispose);
    		}
    	};
    }

    // (202:1) {#if Utils.isKvartalLayer(item)}
    function create_if_block_3(ctx) {
    	var option, t_value = ctx.item._gmx.rawProperties.title, t, option_value_value;

    	return {
    		c() {
    			option = element("option");
    			t = text(t_value);
    			option.__value = option_value_value = ctx.item.options.layerID;
    			option.value = option.__value;
    		},

    		m(target, anchor) {
    			insert(target, option, anchor);
    			append(option, t);
    		},

    		p(changed, ctx) {
    			if ((changed.gmxMap) && t_value !== (t_value = ctx.item._gmx.rawProperties.title)) {
    				set_data(t, t_value);
    			}

    			if ((changed.gmxMap) && option_value_value !== (option_value_value = ctx.item.options.layerID)) {
    				option.__value = option_value_value;
    			}

    			option.value = option.__value;
    		},

    		d(detaching) {
    			if (detaching) {
    				detach(option);
    			}
    		}
    	};
    }

    // (201:2) {#each gmxMap.layers as item}
    function create_each_block_2(ctx) {
    	var if_block_anchor;

    	var if_block = (Utils.isKvartalLayer(ctx.item)) && create_if_block_3(ctx);

    	return {
    		c() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},

    		m(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert(target, if_block_anchor, anchor);
    		},

    		p(changed, ctx) {
    			if (Utils.isKvartalLayer(ctx.item)) {
    				if (if_block) {
    					if_block.p(changed, ctx);
    				} else {
    					if_block = create_if_block_3(ctx);
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},

    		d(detaching) {
    			if (if_block) if_block.d(detaching);

    			if (detaching) {
    				detach(if_block_anchor);
    			}
    		}
    	};
    }

    // (232:1) {#if !i}
    function create_if_block_2(ctx) {
    	var div;

    	return {
    		c() {
    			div = element("div");
    			div.textContent = "Привязочный ход";
    			attr(div, "class", "kv-1");
    		},

    		m(target, anchor) {
    			insert(target, div, anchor);
    		},

    		d(detaching) {
    			if (detaching) {
    				detach(div);
    			}
    		}
    	};
    }

    // (229:0) {#each snap.snap as it, i}
    function create_each_block_1(ctx) {
    	var div5, div0, t0, input0, input0_value_value, t1, div2, div1, t2, input1, input1_value_value, t3, div3, t4, div4, dispose;

    	var if_block = (!ctx.i) && create_if_block_2();

    	return {
    		c() {
    			div5 = element("div");
    			div0 = element("div");
    			if (if_block) if_block.c();
    			t0 = space();
    			input0 = element("input");
    			t1 = space();
    			div2 = element("div");
    			div1 = element("div");
    			t2 = space();
    			input1 = element("input");
    			t3 = space();
    			div3 = element("div");
    			t4 = space();
    			div4 = element("div");
    			attr(input0, "type", "text");
    			input0.value = input0_value_value = (ctx.it[2] || ctx.it[0]) !== undefined ? ctx.it[2] || ctx.it[0] : '';
    			attr(input0, "name", "snap" + ctx.i + "_a");
    			attr(input0, "class", "input-left-controls-pop-add-kvartal-1 hod1");
    			attr(input0, "placeholder", "Angle");
    			attr(div0, "class", "input-kv-1-el1");
    			attr(div1, "class", "kv-1");
    			attr(input1, "type", "text");
    			input1.value = input1_value_value = ctx.it[1] !== undefined ? Math.round(ctx.it[1]) : '';
    			attr(input1, "name", "snap" + ctx.i + "_d");
    			attr(input1, "class", "input-left-controls-pop-add-kvartal-1 hod2");
    			attr(input1, "placeholder", "Distance");
    			attr(div2, "class", "input-kv-1-el2");
    			attr(div3, "class", "input-kv-1-el4");
    			attr(div4, "class", "input-kv-1-el3");
    			attr(div5, "class", "input-kv-1 margin-top--7");

    			dispose = [
    				listen(input0, "keyup", ctx.onKeyUp),
    				listen(input0, "input", ctx.setPoint),
    				listen(input1, "keyup", ctx.onKeyUp),
    				listen(input1, "input", ctx.setPoint),
    				listen(div3, "click", ctx.addDelynka0),
    				listen(div4, "click", ctx.addDelynka0)
    			];
    		},

    		m(target, anchor) {
    			insert(target, div5, anchor);
    			append(div5, div0);
    			if (if_block) if_block.m(div0, null);
    			append(div0, t0);
    			append(div0, input0);
    			append(div5, t1);
    			append(div5, div2);
    			append(div2, div1);
    			append(div2, t2);
    			append(div2, input1);
    			append(div5, t3);
    			append(div5, div3);
    			append(div5, t4);
    			append(div5, div4);
    		},

    		p(changed, ctx) {
    			if (!ctx.i) {
    				if (!if_block) {
    					if_block = create_if_block_2();
    					if_block.c();
    					if_block.m(div0, t0);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}

    			if ((changed.snap) && input0_value_value !== (input0_value_value = (ctx.it[2] || ctx.it[0]) !== undefined ? ctx.it[2] || ctx.it[0] : '')) {
    				input0.value = input0_value_value;
    			}

    			if ((changed.snap) && input1_value_value !== (input1_value_value = ctx.it[1] !== undefined ? Math.round(ctx.it[1]) : '')) {
    				input1.value = input1_value_value;
    			}
    		},

    		d(detaching) {
    			if (detaching) {
    				detach(div5);
    			}

    			if (if_block) if_block.d();
    			run_all(dispose);
    		}
    	};
    }

    // (249:1) {#if !i}
    function create_if_block_1(ctx) {
    	var div;

    	return {
    		c() {
    			div = element("div");
    			div.textContent = "Контур делянки    ";
    			attr(div, "class", "kv-1");
    		},

    		m(target, anchor) {
    			insert(target, div, anchor);
    		},

    		d(detaching) {
    			if (detaching) {
    				detach(div);
    			}
    		}
    	};
    }

    // (246:0) {#each snap.ring as it, i}
    function create_each_block$1(ctx) {
    	var div5, div0, t0, input0, input0_value_value, t1, div2, div1, t2, input1, input1_value_value, t3, div3, t4, div4, t5, dispose;

    	var if_block = (!ctx.i) && create_if_block_1();

    	return {
    		c() {
    			div5 = element("div");
    			div0 = element("div");
    			if (if_block) if_block.c();
    			t0 = space();
    			input0 = element("input");
    			t1 = space();
    			div2 = element("div");
    			div1 = element("div");
    			t2 = space();
    			input1 = element("input");
    			t3 = space();
    			div3 = element("div");
    			t4 = space();
    			div4 = element("div");
    			t5 = space();
    			attr(input0, "type", "text");
    			input0.value = input0_value_value = (ctx.it[2] || ctx.it[0]) !== undefined ? ctx.it[2] || ctx.it[0] : '';
    			attr(input0, "name", "ring" + ctx.i + "_a");
    			attr(input0, "class", "input-left-controls-pop-add-kvartal-1 hod1");
    			attr(input0, "placeholder", "Angle");
    			attr(div0, "class", "input-kv-1-el1");
    			attr(div1, "class", "kv-1");
    			attr(input1, "type", "text");
    			input1.value = input1_value_value = ctx.it[1] !== undefined ? Math.round(ctx.it[1]) : '';
    			attr(input1, "name", "ring" + ctx.i + "_d");
    			attr(input1, "class", "input-left-controls-pop-add-kvartal-1 hod2");
    			attr(input1, "placeholder", "Distance");
    			attr(div2, "class", "input-kv-1-el2");
    			attr(div3, "class", "input-kv-1-el4");
    			attr(div4, "class", "input-kv-1-el3");
    			attr(div5, "class", "input-kv-1 margin-top--7");

    			dispose = [
    				listen(input0, "keyup", ctx.onKeyUp),
    				listen(input0, "input", ctx.setPoint),
    				listen(input1, "keyup", ctx.onKeyUp),
    				listen(input1, "input", ctx.setPoint)
    			];
    		},

    		m(target, anchor) {
    			insert(target, div5, anchor);
    			append(div5, div0);
    			if (if_block) if_block.m(div0, null);
    			append(div0, t0);
    			append(div0, input0);
    			append(div5, t1);
    			append(div5, div2);
    			append(div2, div1);
    			append(div2, t2);
    			append(div2, input1);
    			append(div5, t3);
    			append(div5, div3);
    			append(div5, t4);
    			append(div5, div4);
    			append(div5, t5);
    		},

    		p(changed, ctx) {
    			if (!ctx.i) {
    				if (!if_block) {
    					if_block = create_if_block_1();
    					if_block.c();
    					if_block.m(div0, t0);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}

    			if ((changed.snap) && input0_value_value !== (input0_value_value = (ctx.it[2] || ctx.it[0]) !== undefined ? ctx.it[2] || ctx.it[0] : '')) {
    				input0.value = input0_value_value;
    			}

    			if ((changed.snap) && input1_value_value !== (input1_value_value = ctx.it[1] !== undefined ? Math.round(ctx.it[1]) : '')) {
    				input1.value = input1_value_value;
    			}
    		},

    		d(detaching) {
    			if (detaching) {
    				detach(div5);
    			}

    			if (if_block) if_block.d();
    			run_all(dispose);
    		}
    	};
    }

    function create_fragment$5(ctx) {
    	var div19, div2, div0, t0_value = ctx.gmxMap.properties && ctx.gmxMap.properties.title || 'Название проекта/компании', t0, t1, div1, t2, div18, div17, input0, t3, label0, t5, div3, t6, input1, t7, label1, t9, section0, div6, t13, div10, div7, t15, div9, div8, select0, option0, t16, div12, div11, t18, section1, div16, div13, t20, div15, div14, select1, option1, t21, if_block_anchor, dispose;

    	var each_value_4 = ctx.gmxMap.layers;

    	var each_blocks_1 = [];

    	for (var i = 0; i < each_value_4.length; i += 1) {
    		each_blocks_1[i] = create_each_block_4(get_each_context_4(ctx, each_value_4, i));
    	}

    	var each_value_3 = ctx.gmxMap.layers;

    	var each_blocks = [];

    	for (var i = 0; i < each_value_3.length; i += 1) {
    		each_blocks[i] = create_each_block_3(get_each_context_3(ctx, each_value_3, i));
    	}

    	function select_block_type(ctx) {
    		if (ctx.addDelynkaFlag === 1) return create_if_block;
    		if (ctx.addDelynkaFlag === 2) return create_if_block_4;
    	}

    	var current_block_type = select_block_type(ctx);
    	var if_block = current_block_type && current_block_type(ctx);

    	return {
    		c() {
    			div19 = element("div");
    			div2 = element("div");
    			div0 = element("div");
    			t0 = text(t0_value);
    			t1 = space();
    			div1 = element("div");
    			t2 = space();
    			div18 = element("div");
    			div17 = element("div");
    			input0 = element("input");
    			t3 = space();
    			label0 = element("label");
    			label0.textContent = "Делянки";
    			t5 = space();
    			div3 = element("div");
    			t6 = space();
    			input1 = element("input");
    			t7 = space();
    			label1 = element("label");
    			label1.textContent = "Квартальные сети";
    			t9 = space();
    			section0 = element("section");
    			div6 = element("div");
    			div6.innerHTML = `<div class="check-50"><input type="checkbox" name="checkboxG4" id="checkboxG4" class="css-checkbox2"><label for="checkboxG4" class="css-label2 radGroup1">Снимки Landsat-8</label></div> <div class="check-50"><input type="checkbox" name="checkboxG5" id="checkboxG5" class="css-checkbox2" checked="checked"><label for="checkboxG5" class="css-label2 radGroup1">Снимки Sentinel-2</label></div>`;
    			t13 = space();
    			div10 = element("div");
    			div7 = element("div");
    			div7.textContent = "Выбор слоя";
    			t15 = space();
    			div9 = element("div");
    			div8 = element("div");
    			select0 = element("select");
    			option0 = element("option");

    			for (var i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].c();
    			}

    			t16 = space();
    			div12 = element("div");
    			div11 = element("div");
    			div11.textContent = "Добавить делянку";
    			t18 = space();
    			section1 = element("section");
    			div16 = element("div");
    			div13 = element("div");
    			div13.textContent = "Выбор слоя";
    			t20 = space();
    			div15 = element("div");
    			div14 = element("div");
    			select1 = element("select");
    			option1 = element("option");

    			for (var i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t21 = space();
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    			attr(div0, "class", "sidebar-opened-row1-left");
    			attr(div1, "class", "sidebar-opened-row1-right");
    			attr(div1, "title", "Редактировать");
    			attr(div2, "class", "sidebar-opened-row1");
    			attr(input0, "id", "tab1");
    			attr(input0, "type", "radio");
    			attr(input0, "name", "tabs");
    			input0.checked = true;
    			attr(label0, "for", "tab1");
    			attr(label0, "title", "Wordpress");
    			attr(div3, "class", "line-tabs-separator");
    			attr(input1, "id", "tab2");
    			attr(input1, "type", "radio");
    			attr(input1, "name", "tabs");
    			attr(label1, "for", "tab2");
    			attr(label1, "title", "Windows");
    			attr(div6, "class", "sidebar-opened-row1");
    			attr(div7, "class", "tabs-input-text");
    			option0.__value = "";
    			option0.value = option0.__value;
    			attr(div8, "class", "styled-select-1-1");
    			attr(div9, "class", "tabs-input");
    			attr(div10, "class", "sidebar-opened-row-tabs-1");
    			attr(div11, "class", "sidebar-opened-row-tabs-add-text");
    			attr(div12, "class", "sidebar-opened-row-tabs-add");
    			attr(section0, "id", "content-tab1");
    			attr(div13, "class", "tabs-input-text");
    			option1.__value = "";
    			option1.value = option1.__value;
    			attr(div14, "class", "styled-select-1-1");
    			attr(div15, "class", "tabs-input");
    			attr(div16, "class", "sidebar-opened-row-tabs-1");
    			attr(section1, "id", "content-tab2");
    			attr(div17, "class", "tabs");
    			attr(div18, "class", "sidebar-opened-el-container");
    			attr(div18, "id", "style-4");
    			attr(div19, "class", "sidebar-opened");

    			dispose = [
    				listen(select0, "change", ctx.changeDelynka),
    				listen(div11, "click", ctx.addDelynka1),
    				listen(select1, "change", ctx.changeKvartal)
    			];
    		},

    		m(target, anchor) {
    			insert(target, div19, anchor);
    			append(div19, div2);
    			append(div2, div0);
    			append(div0, t0);
    			append(div2, t1);
    			append(div2, div1);
    			append(div19, t2);
    			append(div19, div18);
    			append(div18, div17);
    			append(div17, input0);
    			append(div17, t3);
    			append(div17, label0);
    			append(div17, t5);
    			append(div17, div3);
    			append(div17, t6);
    			append(div17, input1);
    			append(div17, t7);
    			append(div17, label1);
    			append(div17, t9);
    			append(div17, section0);
    			append(section0, div6);
    			append(section0, t13);
    			append(section0, div10);
    			append(div10, div7);
    			append(div10, t15);
    			append(div10, div9);
    			append(div9, div8);
    			append(div8, select0);
    			append(select0, option0);

    			for (var i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].m(select0, null);
    			}

    			append(section0, t16);
    			append(section0, div12);
    			append(div12, div11);
    			append(div17, t18);
    			append(div17, section1);
    			append(section1, div16);
    			append(div16, div13);
    			append(div16, t20);
    			append(div16, div15);
    			append(div15, div14);
    			append(div14, select1);
    			append(select1, option1);

    			for (var i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(select1, null);
    			}

    			insert(target, t21, anchor);
    			if (if_block) if_block.m(target, anchor);
    			insert(target, if_block_anchor, anchor);
    		},

    		p(changed, ctx) {
    			if ((changed.gmxMap) && t0_value !== (t0_value = ctx.gmxMap.properties && ctx.gmxMap.properties.title || 'Название проекта/компании')) {
    				set_data(t0, t0_value);
    			}

    			if (changed.Utils || changed.gmxMap) {
    				each_value_4 = ctx.gmxMap.layers;

    				for (var i = 0; i < each_value_4.length; i += 1) {
    					const child_ctx = get_each_context_4(ctx, each_value_4, i);

    					if (each_blocks_1[i]) {
    						each_blocks_1[i].p(changed, child_ctx);
    					} else {
    						each_blocks_1[i] = create_each_block_4(child_ctx);
    						each_blocks_1[i].c();
    						each_blocks_1[i].m(select0, null);
    					}
    				}

    				for (; i < each_blocks_1.length; i += 1) {
    					each_blocks_1[i].d(1);
    				}
    				each_blocks_1.length = each_value_4.length;
    			}

    			if (changed.Utils || changed.gmxMap) {
    				each_value_3 = ctx.gmxMap.layers;

    				for (var i = 0; i < each_value_3.length; i += 1) {
    					const child_ctx = get_each_context_3(ctx, each_value_3, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(changed, child_ctx);
    					} else {
    						each_blocks[i] = create_each_block_3(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(select1, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}
    				each_blocks.length = each_value_3.length;
    			}

    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
    				if_block.p(changed, ctx);
    			} else {
    				if (if_block) if_block.d(1);
    				if_block = current_block_type && current_block_type(ctx);
    				if (if_block) {
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			}
    		},

    		i: noop,
    		o: noop,

    		d(detaching) {
    			if (detaching) {
    				detach(div19);
    			}

    			destroy_each(each_blocks_1, detaching);

    			destroy_each(each_blocks, detaching);

    			if (detaching) {
    				detach(t21);
    			}

    			if (if_block) if_block.d(detaching);

    			if (detaching) {
    				detach(if_block_anchor);
    			}

    			run_all(dispose);
    		}
    	};
    }

    function instance$5($$self, $$props, $$invalidate) {
    	

    let gmxMap = null;
    const unsubscribe = mapLayers.subscribe(value => {
    	$$invalidate('gmxMap', gmxMap = value);
    	// console.log('gmxMap', Utils, gmxMap);
    });
    let map = null;
    const unsubscribe1 = leafletMap.subscribe(value => {
    	map = value;
    });

    let kvData = null;
    kvItems.subscribe(value => {
    	if (value) {
    		$$invalidate('kvData', kvData = value);
    		let kv = -1;
    		kvData.fields.find((c, i) => {
    			if (c === 'kv') {
    				kv = i;
    				return true
    			}
    			return false;
    		});
    		kvData.optionsField = kv; $$invalidate('kvData', kvData);
    	}
    console.log('kvData', kvData);
    });

    let addDelynkaFlag = null;
    const addDelynka0 = () => { $$invalidate('addDelynkaFlag', addDelynkaFlag = 0); };
    const addDelynka1 = () => { $$invalidate('addDelynkaFlag', addDelynkaFlag = 1); };
    const addDelynka2 = () => { $$invalidate('addDelynkaFlag', addDelynkaFlag = 2); };

    let delynkaLayer = null;
    let kvartalLayer = null;
    const _setLayer = (id) => {
    	let it = gmxMap.layersByID[id],
    		bbox = it.getBounds();
    	// if (addDelynkaFlag !== 1) {
    		map.fitBounds(bbox);
    	// }
    	map.addLayer(it);
    	return it;
    };
    const changeDelynka = (ev) => {
    	let id = ev.target.selectedOptions[0].value;
    	delynkaLayer = _setLayer(id);
    	Utils.getLayerItems(delynkaLayer);
    	console.log('changeDelynka', id);
    };

    const changeKvartal = (ev) => {
    	let id = ev.target.selectedOptions[0].value;
    	kvartalLayer = _setLayer(id);
    	Utils.getLayerItems(kvartalLayer);
    	console.log('changeKvartal', id);
    };

    const getOptionsData = (pt, subVal, cnt) => {
    	let nm = pt.optionsField;
    	return '<option value="' + Object.keys(pt.values.reduce((p, c) => {
    		if (!subVal || c.indexOf(subVal) !== -1) {
    			let out = c[nm];
    			p[out] = true;
    		}
    		return p;
    	}, {})).slice(0, cnt || 50).join('" /><option value="') + ' />';
    };

    const getOptions = (pt, name) => {
    	let node = name ? document.body.getElementsByClassName(name)[0] : null;
    	return getOptionsData(pt, node && node.value);
    };

    let snap = {
    	snap: [[]],
    	ring: [[]]
    };
    let latlng = null;
    let latlngStr = '';
    const setKvartal = (ev) => {
    	let kv = ev.target.value,
    		nm = kvData.optionsField;
    	let pt = kvData.values.find((c) => c[nm] == kv);
    	if (pt) {
    		let bbox = L.gmxUtil.getGeometryBounds(pt[pt.length - 1]);
    		$$invalidate('latlng', latlng = bbox.getCenter());
    		$$invalidate('latlngStr', latlngStr = L.gmxUtil.latLonFormatCoordinates2(latlng[0], latlng[1]));
    		map.fitBounds(L.latLngBounds([[bbox.min.y, bbox.min.x], [bbox.max.y, bbox.max.x]]));
    		snap.latlng = latlng; $$invalidate('snap', snap);
    	// console.log('setKvartal', latlng, pt);
    	}
    };

    const nextPoint = (node) => {
    };

    const onKeyUp = (ev) => {
    	if (ev.key === 'Enter') {
    		nextPoint(ev.target);
    	}
    };

    const setPoint = (ev) => {
    	let node = ev.target,
    		key = ev.data;

    	if (node.value === '') {
    		return;
    	}
    };

    	return {
    		gmxMap,
    		kvData,
    		addDelynkaFlag,
    		addDelynka0,
    		addDelynka1,
    		addDelynka2,
    		changeDelynka,
    		changeKvartal,
    		getOptions,
    		snap,
    		latlng,
    		latlngStr,
    		setKvartal,
    		onKeyUp,
    		setPoint
    	};
    }

    class Layers extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, []);
    	}
    }

    /* src\Report\Report.svelte generated by Svelte v3.7.1 */

    function get_each_context$2(ctx, list, i) {
    	const child_ctx = Object.create(ctx);
    	child_ctx.item = list[i];
    	child_ctx.i = i;
    	return child_ctx;
    }

    function get_each_context_1$1(ctx, list, i) {
    	const child_ctx = Object.create(ctx);
    	child_ctx.item = list[i];
    	return child_ctx;
    }

    // (98:1) {#if Utils.isDelynkaLayer(item)}
    function create_if_block_3$1(ctx) {
    	var option, t_value = ctx.item._gmx.rawProperties.title, t, option_value_value;

    	return {
    		c() {
    			option = element("option");
    			t = text(t_value);
    			option.__value = option_value_value = ctx.item.options.layerID;
    			option.value = option.__value;
    		},

    		m(target, anchor) {
    			insert(target, option, anchor);
    			append(option, t);
    		},

    		p(changed, ctx) {
    			if ((changed.gmxMap) && t_value !== (t_value = ctx.item._gmx.rawProperties.title)) {
    				set_data(t, t_value);
    			}

    			if ((changed.gmxMap) && option_value_value !== (option_value_value = ctx.item.options.layerID)) {
    				option.__value = option_value_value;
    			}

    			option.value = option.__value;
    		},

    		d(detaching) {
    			if (detaching) {
    				detach(option);
    			}
    		}
    	};
    }

    // (97:0) {#each gmxMap.layers as item}
    function create_each_block_1$1(ctx) {
    	var if_block_anchor;

    	var if_block = (Utils.isDelynkaLayer(ctx.item)) && create_if_block_3$1(ctx);

    	return {
    		c() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},

    		m(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert(target, if_block_anchor, anchor);
    		},

    		p(changed, ctx) {
    			if (Utils.isDelynkaLayer(ctx.item)) {
    				if (if_block) {
    					if_block.p(changed, ctx);
    				} else {
    					if_block = create_if_block_3$1(ctx);
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},

    		d(detaching) {
    			if (if_block) if_block.d(detaching);

    			if (detaching) {
    				detach(if_block_anchor);
    			}
    		}
    	};
    }

    // (118:19) 
    function create_if_block_2$1(ctx) {
    	var div3, div1, label, t0, input, t1, div0, t2, div2, t3, each_1_anchor, dispose;

    	var each_value = ctx.delItems.values;

    	var each_blocks = [];

    	for (var i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$2(get_each_context$2(ctx, each_value, i));
    	}

    	return {
    		c() {
    			div3 = element("div");
    			div1 = element("div");
    			label = element("label");
    			t0 = text("Выделить все\n                  ");
    			input = element("input");
    			t1 = space();
    			div0 = element("div");
    			t2 = space();
    			div2 = element("div");
    			t3 = space();

    			for (var i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    			attr(input, "type", "checkbox");
    			attr(div0, "class", "control_indicator");
    			attr(label, "class", "control control-checkbox");
    			attr(div1, "class", "sidebar-opened-row3-left");
    			attr(div2, "class", "sidebar-opened-row3-right");
    			attr(div3, "class", "sidebar-opened-row3");
    			dispose = listen(input, "click", ctx.toggleDelyanka);
    		},

    		m(target, anchor) {
    			insert(target, div3, anchor);
    			append(div3, div1);
    			append(div1, label);
    			append(label, t0);
    			append(label, input);
    			append(label, t1);
    			append(label, div0);
    			append(div3, t2);
    			append(div3, div2);
    			insert(target, t3, anchor);

    			for (var i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert(target, each_1_anchor, anchor);
    		},

    		p(changed, ctx) {
    			if (changed.delItems) {
    				each_value = ctx.delItems.values;

    				for (var i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$2(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(changed, child_ctx);
    					} else {
    						each_blocks[i] = create_each_block$2(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}
    				each_blocks.length = each_value.length;
    			}
    		},

    		d(detaching) {
    			if (detaching) {
    				detach(div3);
    				detach(t3);
    			}

    			destroy_each(each_blocks, detaching);

    			if (detaching) {
    				detach(each_1_anchor);
    			}

    			dispose();
    		}
    	};
    }

    // (110:0) {#if !delynkaLayer}
    function create_if_block_1$1(ctx) {
    	var div_2;

    	return {
    		c() {
    			div_2 = element("div");
    			div_2.innerHTML = `<div class="report-line-empty"><div class="report-line-empty-text">
			                  Для создания отчетов вам необходимо выбрать слой в выпадающем списке. В случае отсутствия слоев в проекте, вам необходимо <span>Создать слой</span> в дереве слоев
			               </div></div>`;
    			attr(div_2, "class", "sidebar-opened-el-container");
    			attr(div_2, "id", "style-4");
    		},

    		m(target, anchor) {
    			insert(target, div_2, anchor);
    		},

    		p: noop,

    		d(detaching) {
    			if (detaching) {
    				detach(div_2);
    			}
    		}
    	};
    }

    // (129:0) {#each delItems.values as item, i}
    function create_each_block$2(ctx) {
    	var div21, div4, div1, label, t0, t1_value = ctx.item[16], t1, t2, input, t3, div0, t4, div3, div2, t5, div20, t25, dispose;

    	function click_handler() {
    		return ctx.click_handler(ctx);
    	}

    	return {
    		c() {
    			div21 = element("div");
    			div4 = element("div");
    			div1 = element("div");
    			label = element("label");
    			t0 = text("Делянка ");
    			t1 = text(t1_value);
    			t2 = space();
    			input = element("input");
    			t3 = space();
    			div0 = element("div");
    			t4 = space();
    			div3 = element("div");
    			div2 = element("div");
    			t5 = space();
    			div20 = element("div");
    			div20.innerHTML = `<div class="sidebar-opened-row-report"><div class="sidebar-opened-row-report-text-left">01.11.2019</div> <div class="sidebar-opened-row-report-text-right">23:23</div></div> <div class="sidebar-opened-row-report"><div class="sidebar-opened-row-report-text-left">01.11.2019</div> <div class="sidebar-opened-row-report-text-right">23:23</div></div> <div class="sidebar-opened-row-report"><div class="sidebar-opened-row-report-text-left">01.11.2019</div> <div class="sidebar-opened-row-report-text-right">23:23</div></div> <div class="sidebar-opened-row-report"><div class="sidebar-opened-row-report-text-left">01.11.2019</div> <div class="sidebar-opened-row-report-text-right">23:23</div></div> <div class="sidebar-opened-row-report"><div class="sidebar-opened-row-report-text-left">01.11.2019</div> <div class="sidebar-opened-row-report-text-right">23:23</div></div>`;
    			t25 = space();
    			attr(input, "type", "checkbox");
    			attr(input, "class", "selectDelyanka");
    			attr(div0, "class", "control_indicator");
    			attr(label, "class", "control control-checkbox control-black inside-0 delyanka");
    			attr(div1, "class", "sidebar-opened-el-left");
    			attr(div2, "class", "sidebar-opened-el-right-1");
    			attr(div2, "title", "Центрировать");
    			attr(div3, "class", "sidebar-opened-el-right");
    			attr(div4, "class", "sidebar-opened-row-el");
    			attr(div20, "class", "hidden");
    			attr(div21, "class", "sidebar-opened-el-container");
    			attr(div21, "id", "style-4");
    			dispose = listen(div2, "click", click_handler);
    		},

    		m(target, anchor) {
    			insert(target, div21, anchor);
    			append(div21, div4);
    			append(div4, div1);
    			append(div1, label);
    			append(label, t0);
    			append(label, t1);
    			append(label, t2);
    			append(label, input);
    			append(label, t3);
    			append(label, div0);
    			append(div4, t4);
    			append(div4, div3);
    			append(div3, div2);
    			append(div21, t5);
    			append(div21, div20);
    			append(div21, t25);
    		},

    		p(changed, new_ctx) {
    			ctx = new_ctx;
    			if ((changed.delItems) && t1_value !== (t1_value = ctx.item[16])) {
    				set_data(t1, t1_value);
    			}
    		},

    		d(detaching) {
    			if (detaching) {
    				detach(div21);
    			}

    			dispose();
    		}
    	};
    }

    // (169:0) {#if reportIsOpen}
    function create_if_block$1(ctx) {
    	var div60, div3, t3, div5, t5, div56, div8, div6, t7, div7, select, option0, option1, t10, div10, t12, div13, t16, div15, t18, div18, t22, div21, t26, div23, t28, div26, t32, div29, t36, div32, t40, div35, t44, div38, t48, div41, t52, div44, t56, div47, t60, div49, t62, div52, t66, div55, t70, div59, div57, t72, div58, dispose;

    	return {
    		c() {
    			div60 = element("div");
    			div3 = element("div");
    			div3.innerHTML = `<div class="popup-map-row1-left">Создание отчетов</div> <div class="ques-map"></div> <div class="restore-icon-ot" title="Восстановить значения из ранее созданного отчета"></div>`;
    			t3 = space();
    			div5 = element("div");
    			div5.innerHTML = `<div class="popup-map-row2-left">Очистить поля ввода</div>`;
    			t5 = space();
    			div56 = element("div");
    			div8 = element("div");
    			div6 = element("div");
    			div6.textContent = "Масштаб";
    			t7 = space();
    			div7 = element("div");
    			select = element("select");
    			option0 = element("option");
    			option0.textContent = "100%";
    			option1 = element("option");
    			option1.textContent = "90%";
    			t10 = space();
    			div10 = element("div");
    			div10.innerHTML = `<div class="popup-map-row3-left">Тип отчета</div>`;
    			t12 = space();
    			div13 = element("div");
    			div13.innerHTML = `<div class="radio-arr popup-mapping"><span class="spacer"><input type="radio" name="radiog_dark" id="radio1" class="css-checkbox"><label for="radio1" class="css-label radGroup1 radGroup2 control-black">Об использовании лесов</label></span></div> <div class="radio-arr popup-mapping"><span class="spacer"><input type="radio" name="radiog_dark" id="radio2" class="css-checkbox" checked="checked"><label for="radio2" class="css-label radGroup1 radGroup2 control-black">О воспроизведении лесов</label></span></div>`;
    			t16 = space();
    			div15 = element("div");
    			div15.innerHTML = `<div class="popup-map-row3-left">Организация</div>`;
    			t18 = space();
    			div18 = element("div");
    			div18.innerHTML = `<div class="kv">Наименование организации</div> <input type="text" name="" class="input-left-controls-pop-add-kvartal-popmap"> <div class="icon-restore tit"></div>`;
    			t22 = space();
    			div21 = element("div");
    			div21.innerHTML = `<div class="kv">ИНН</div> <input type="text" name="" class="input-left-controls-pop-add-kvartal-popmap"> <div class="icon-restore tit"></div>`;
    			t26 = space();
    			div23 = element("div");
    			div23.innerHTML = `<div class="popup-map-row3-left">Расположение объекта</div>`;
    			t28 = space();
    			div26 = element("div");
    			div26.innerHTML = `<div class="kv">Субъект РФ</div> <input type="text" name="" class="input-left-controls-pop-add-kvartal-popmap"> <div class="icon-restore tit"></div>`;
    			t32 = space();
    			div29 = element("div");
    			div29.innerHTML = `<div class="kv">Лесничество</div> <input type="text" name="" class="input-left-controls-pop-add-kvartal-popmap"> <div class="icon-restore tit"></div>`;
    			t36 = space();
    			div32 = element("div");
    			div32.innerHTML = `<div class="kv">Участковое лесничество</div> <input type="text" name="" class="input-left-controls-pop-add-kvartal-popmap"> <div class="icon-restore tit"></div>`;
    			t40 = space();
    			div35 = element("div");
    			div35.innerHTML = `<div class="kv">Дача/Урочище</div> <input type="text" name="" class="input-left-controls-pop-add-kvartal-popmap"> <div class="icon-restore tit"></div>`;
    			t44 = space();
    			div38 = element("div");
    			div38.innerHTML = `<div class="kv">Квартал</div> <input type="text" name="" class="input-left-controls-pop-add-kvartal-popmap"> <div class="icon-restore tit"></div>`;
    			t48 = space();
    			div41 = element("div");
    			div41.innerHTML = `<div class="kv">Выдел</div> <input type="text" name="" class="input-left-controls-pop-add-kvartal-popmap"> <div class="icon-restore tit"></div>`;
    			t52 = space();
    			div44 = element("div");
    			div44.innerHTML = `<div class="kv">Делянка</div> <input type="text" name="" class="input-left-controls-pop-add-kvartal-popmap"> <div class="icon-restore tit"></div>`;
    			t56 = space();
    			div47 = element("div");
    			div47.innerHTML = `<div class="kv">Площадь</div> <input type="text" name="" class="input-left-controls-pop-add-kvartal-popmap"> <div class="icon-restore tit"></div>`;
    			t60 = space();
    			div49 = element("div");
    			div49.innerHTML = `<div class="popup-map-row3-left">Хозмероприятия</div>`;
    			t62 = space();
    			div52 = element("div");
    			div52.innerHTML = `<div class="kv">Форма рубки</div> <input type="text" name="" class="input-left-controls-pop-add-kvartal-popmap"> <div class="icon-restore tit"></div>`;
    			t66 = space();
    			div55 = element("div");
    			div55.innerHTML = `<div class="kv">Тип рубки</div> <input type="text" name="" class="input-left-controls-pop-add-kvartal-popmap"> <div class="icon-restore tit"></div>`;
    			t70 = space();
    			div59 = element("div");
    			div57 = element("div");
    			div57.textContent = "Отмена";
    			t72 = space();
    			div58 = element("div");
    			div58.textContent = "Создать отчет";
    			attr(div3, "class", "popup-map-row1");
    			attr(div5, "class", "popup-map-row2");
    			attr(div6, "class", "kv-1-1");
    			option0.__value = "0";
    			option0.value = option0.__value;
    			option1.__value = "7382";
    			option1.value = option1.__value;
    			attr(div7, "class", "styled-select-1-1");
    			attr(div8, "class", "input-kv-1-el2-1-popup-map");
    			attr(div10, "class", "popup-map-row3");
    			attr(div13, "class", "popup-map-row-check-1");
    			attr(div15, "class", "popup-map-row3");
    			attr(div18, "class", "input-kv-map");
    			attr(div21, "class", "input-kv-map");
    			attr(div23, "class", "popup-map-row3");
    			attr(div26, "class", "input-kv-map");
    			attr(div29, "class", "input-kv-map");
    			attr(div32, "class", "input-kv-map");
    			attr(div35, "class", "input-kv-map");
    			attr(div38, "class", "input-kv-map");
    			attr(div41, "class", "input-kv-map");
    			attr(div44, "class", "input-kv-map");
    			attr(div47, "class", "input-kv-map");
    			attr(div49, "class", "popup-map-row3");
    			attr(div52, "class", "input-kv-map");
    			attr(div55, "class", "input-kv-map");
    			attr(div56, "class", "sidebar-opened-el-container margin-bot-50");
    			attr(div56, "id", "style-4");
    			attr(div57, "class", "popup-map-bottom-left");
    			attr(div58, "class", "popup-map-bottom-right");
    			attr(div59, "class", "popup-map-bottom");
    			attr(div60, "class", "popup-map");

    			dispose = [
    				listen(div57, "click", ctx.closeReport),
    				listen(div58, "click", ctx.createReport)
    			];
    		},

    		m(target, anchor) {
    			insert(target, div60, anchor);
    			append(div60, div3);
    			append(div60, t3);
    			append(div60, div5);
    			append(div60, t5);
    			append(div60, div56);
    			append(div56, div8);
    			append(div8, div6);
    			append(div8, t7);
    			append(div8, div7);
    			append(div7, select);
    			append(select, option0);
    			append(select, option1);
    			append(div56, t10);
    			append(div56, div10);
    			append(div56, t12);
    			append(div56, div13);
    			append(div56, t16);
    			append(div56, div15);
    			append(div56, t18);
    			append(div56, div18);
    			append(div56, t22);
    			append(div56, div21);
    			append(div56, t26);
    			append(div56, div23);
    			append(div56, t28);
    			append(div56, div26);
    			append(div56, t32);
    			append(div56, div29);
    			append(div56, t36);
    			append(div56, div32);
    			append(div56, t40);
    			append(div56, div35);
    			append(div56, t44);
    			append(div56, div38);
    			append(div56, t48);
    			append(div56, div41);
    			append(div56, t52);
    			append(div56, div44);
    			append(div56, t56);
    			append(div56, div47);
    			append(div56, t60);
    			append(div56, div49);
    			append(div56, t62);
    			append(div56, div52);
    			append(div56, t66);
    			append(div56, div55);
    			append(div60, t70);
    			append(div60, div59);
    			append(div59, div57);
    			append(div59, t72);
    			append(div59, div58);
    		},

    		d(detaching) {
    			if (detaching) {
    				detach(div60);
    			}

    			run_all(dispose);
    		}
    	};
    }

    function create_fragment$6(ctx) {
    	var div15, div2, div0, t0_value = ctx.gmxMap.properties && ctx.gmxMap.properties.title || 'Название проекта/компании', t0, t1, div1, t2, div4, t4, div7, t8, div11, div8, t10, div10, div9, select, option, t11, div14, div12, t12, div12_class_value, t13, div13, t14, t15, if_block1_anchor, dispose;

    	var each_value_1 = ctx.gmxMap.layers;

    	var each_blocks = [];

    	for (var i = 0; i < each_value_1.length; i += 1) {
    		each_blocks[i] = create_each_block_1$1(get_each_context_1$1(ctx, each_value_1, i));
    	}

    	function select_block_type(ctx) {
    		if (!ctx.delynkaLayer) return create_if_block_1$1;
    		if (ctx.delItems) return create_if_block_2$1;
    	}

    	var current_block_type = select_block_type(ctx);
    	var if_block0 = current_block_type && current_block_type(ctx);

    	var if_block1 = (ctx.reportIsOpen) && create_if_block$1(ctx);

    	return {
    		c() {
    			div15 = element("div");
    			div2 = element("div");
    			div0 = element("div");
    			t0 = text(t0_value);
    			t1 = space();
    			div1 = element("div");
    			t2 = space();
    			div4 = element("div");
    			div4.innerHTML = `<div class="sidebar-opened-row1-left">Отчеты</div>`;
    			t4 = space();
    			div7 = element("div");
    			div7.innerHTML = `<div class="check-50"><input type="checkbox" name="checkboxG4" id="checkboxG4" class="css-checkbox2"><label for="checkboxG4" class="css-label2 radGroup1">Снимки Landsat-8</label></div> <div class="check-50"><input type="checkbox" name="checkboxG5" id="checkboxG5" class="css-checkbox2"><label for="checkboxG5" class="css-label2 radGroup1">Снимки Sentinel-2</label></div>`;
    			t8 = space();
    			div11 = element("div");
    			div8 = element("div");
    			div8.textContent = "Выбор слоя";
    			t10 = space();
    			div10 = element("div");
    			div9 = element("div");
    			select = element("select");
    			option = element("option");

    			for (var i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t11 = space();
    			div14 = element("div");
    			div12 = element("div");
    			t12 = text("Создать отчет");
    			t13 = space();
    			div13 = element("div");
    			t14 = space();
    			if (if_block0) if_block0.c();
    			t15 = space();
    			if (if_block1) if_block1.c();
    			if_block1_anchor = empty();
    			attr(div0, "class", "sidebar-opened-row1-left");
    			attr(div1, "class", "sidebar-opened-row1-right");
    			attr(div1, "title", "Редактировать");
    			attr(div2, "class", "sidebar-opened-row1");
    			attr(div4, "class", "sidebar-opened-row1");
    			attr(div7, "class", "sidebar-opened-row1");
    			attr(div8, "class", "tabs-input-text");
    			option.__value = "";
    			option.value = option.__value;
    			attr(div9, "class", "styled-select-1-1");
    			attr(div10, "class", "tabs-input");
    			attr(div11, "class", "sidebar-opened-row-tabs-1");
    			attr(div12, "class", div12_class_value = "sidebar-opened-row-tabs-add-text " + (ctx.delynkaLayer ? 'active' : ''));
    			attr(div13, "class", "left-controls-pop-add-kvartal-r-bot1-right icon-report");
    			attr(div14, "class", "sidebar-opened-row-tabs-add");
    			attr(div15, "class", "sidebar-opened");

    			dispose = [
    				listen(select, "change", ctx.changeDelynka),
    				listen(div12, "click", ctx.openReport)
    			];
    		},

    		m(target, anchor) {
    			insert(target, div15, anchor);
    			append(div15, div2);
    			append(div2, div0);
    			append(div0, t0);
    			append(div2, t1);
    			append(div2, div1);
    			append(div15, t2);
    			append(div15, div4);
    			append(div15, t4);
    			append(div15, div7);
    			append(div15, t8);
    			append(div15, div11);
    			append(div11, div8);
    			append(div11, t10);
    			append(div11, div10);
    			append(div10, div9);
    			append(div9, select);
    			append(select, option);

    			for (var i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(select, null);
    			}

    			append(div15, t11);
    			append(div15, div14);
    			append(div14, div12);
    			append(div12, t12);
    			append(div14, t13);
    			append(div14, div13);
    			append(div15, t14);
    			if (if_block0) if_block0.m(div15, null);
    			insert(target, t15, anchor);
    			if (if_block1) if_block1.m(target, anchor);
    			insert(target, if_block1_anchor, anchor);
    		},

    		p(changed, ctx) {
    			if ((changed.gmxMap) && t0_value !== (t0_value = ctx.gmxMap.properties && ctx.gmxMap.properties.title || 'Название проекта/компании')) {
    				set_data(t0, t0_value);
    			}

    			if (changed.Utils || changed.gmxMap) {
    				each_value_1 = ctx.gmxMap.layers;

    				for (var i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1$1(ctx, each_value_1, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(changed, child_ctx);
    					} else {
    						each_blocks[i] = create_each_block_1$1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(select, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}
    				each_blocks.length = each_value_1.length;
    			}

    			if ((changed.delynkaLayer) && div12_class_value !== (div12_class_value = "sidebar-opened-row-tabs-add-text " + (ctx.delynkaLayer ? 'active' : ''))) {
    				attr(div12, "class", div12_class_value);
    			}

    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block0) {
    				if_block0.p(changed, ctx);
    			} else {
    				if (if_block0) if_block0.d(1);
    				if_block0 = current_block_type && current_block_type(ctx);
    				if (if_block0) {
    					if_block0.c();
    					if_block0.m(div15, null);
    				}
    			}

    			if (ctx.reportIsOpen) {
    				if (!if_block1) {
    					if_block1 = create_if_block$1(ctx);
    					if_block1.c();
    					if_block1.m(if_block1_anchor.parentNode, if_block1_anchor);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}
    		},

    		i: noop,
    		o: noop,

    		d(detaching) {
    			if (detaching) {
    				detach(div15);
    			}

    			destroy_each(each_blocks, detaching);

    			if (if_block0) if_block0.d();

    			if (detaching) {
    				detach(t15);
    			}

    			if (if_block1) if_block1.d(detaching);

    			if (detaching) {
    				detach(if_block1_anchor);
    			}

    			run_all(dispose);
    		}
    	};
    }

    function instance$6($$self, $$props, $$invalidate) {
    	

    let gmxMap = null;
    const unsubscribe = mapLayers.subscribe(value => {
    	$$invalidate('gmxMap', gmxMap = value);
    	// console.log('gmxMap', Utils, gmxMap);
    });
    let map = null; leafletMap.subscribe(value => { map = value; });

    let delynkaLayer = null;
    const _setLayer = (id) => {
    	let it = gmxMap.layersByID[id],
    		bbox = it.getBounds();
    	// if (addDelynkaFlag !== 1) {
    		map.fitBounds(bbox);
    	// }
    	map.addLayer(it);
    	return it;
    };

    let delItems$1 = null;
    delItems.subscribe(value => {
     $$invalidate('delItems', delItems$1 = value);
     	 console.log('delItems', delItems$1);

    });

    const changeDelynka = (ev) => {
    	let id = ev.target.selectedOptions[0].value;
    	$$invalidate('delynkaLayer', delynkaLayer = _setLayer(id));
    	Utils.getLayerItems(delynkaLayer, {type: 'delynka'});
    	//console.log('changeDelynka', id);
    };
    const fitBounds = (nm) => {
    	let arr = delItems$1.values[nm],
    		geo = arr[arr.length - 1],
    		bbox = L.gmxUtil.getGeometryBounds(geo),
    		latlngBbox = L.latLngBounds([[bbox.min.y, bbox.min.x], [bbox.max.y, bbox.max.x]]);
    	map.fitBounds(latlngBbox);
    	//console.log('fitBounds', nm, geo);
    };
    const toggleDelyanka = (ev) => {
    	let arr = document.getElementsByClassName('selectDelyanka'),
    		ctrlKey = ev.ctrlKey,
    		checked = ev.target.checked;

    	for (let i = 0, len = arr.length; i < len; i++) {
    		arr[i].checked = ctrlKey ? !arr[i].checked : checked;
    	}
    	console.log('toggleDelyanka', checked, arr);
    };

    let reportIsOpen = null;
    const openReport = (ev) => {
    	if (delynkaLayer) {
    		$$invalidate('reportIsOpen', reportIsOpen = true);
    	console.log('openReport', delynkaLayer);
    	}
    };
    const closeReport = (ev) => { $$invalidate('reportIsOpen', reportIsOpen = null); };

    const createReport = (ev) => {
    	if (delynkaLayer) {
    		//reportIsOpen = true;
    	console.log('createReport', delynkaLayer);
    	}
    };

    	function click_handler({ i }) { fitBounds(i); }

    	return {
    		gmxMap,
    		delynkaLayer,
    		delItems: delItems$1,
    		changeDelynka,
    		fitBounds,
    		toggleDelyanka,
    		reportIsOpen,
    		openReport,
    		closeReport,
    		createReport,
    		click_handler
    	};
    }

    class Report extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$6, create_fragment$6, safe_not_equal, []);
    	}
    }

    /* src\App.svelte generated by Svelte v3.7.1 */

    // (107:0) {#if sidebar_visible}
    function create_if_block$2(ctx) {
    	var current_block_type_index, if_block, if_block_anchor, current;

    	var if_block_creators = [
    		create_if_block_1$2,
    		create_if_block_2$2,
    		create_if_block_3$2
    	];

    	var if_blocks = [];

    	function select_block_type(ctx) {
    		if (ctx.sidebar_num === 1) return 0;
    		if (ctx.sidebar_num === 2) return 1;
    		if (ctx.sidebar_num === 3) return 2;
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

    // (113:29) 
    function create_if_block_3$2(ctx) {
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

    // (111:29) 
    function create_if_block_2$2(ctx) {
    	var current;

    	var layers = new Layers({ props: { mapID: ctx.name } });

    	return {
    		c() {
    			layers.$$.fragment.c();
    		},

    		m(target, anchor) {
    			mount_component(layers, target, anchor);
    			current = true;
    		},

    		p(changed, ctx) {
    			var layers_changes = {};
    			if (changed.name) layers_changes.mapID = ctx.name;
    			layers.$set(layers_changes);
    		},

    		i(local) {
    			if (current) return;
    			transition_in(layers.$$.fragment, local);

    			current = true;
    		},

    		o(local) {
    			transition_out(layers.$$.fragment, local);
    			current = false;
    		},

    		d(detaching) {
    			destroy_component(layers, detaching);
    		}
    	};
    }

    // (109:1) {#if sidebar_num === 1}
    function create_if_block_1$2(ctx) {
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

    function create_fragment$7(ctx) {
    	var div16, t17, div23, div20, div17, t18, div18, t19, div19, t20, div22, div21, t21, t22, t23, div25, div24, t24, t25, t26, div26, t27, div27, current, dispose;

    	var if_block = (ctx.sidebar_visible) && create_if_block$2(ctx);

    	var map = new Map$1({ props: { mapID: ctx.name } });

    	var zoom = new Zoom({});

    	var base = new Base({});

    	return {
    		c() {
    			div16 = element("div");
    			div16.innerHTML = `<div class="block_left"><span class="logo"><div class="logo_left">
						   
					   </div> <div class="logo_left_text">
						  Logo
					   </div></span> <div class="left-icons"><div class="left-icons-left"><div class="icons-header-left1" title="Сохранить карту"></div> <div class="icons-header-left2" title="Ссылка на карту"></div></div> <div class="left-icons-right"><div class="icons-header-right1" title="Загрузить векторный слой"></div> <div class="icons-header-right2" title="Загрузить растровый слой"></div></div></div> <div class="left-icons-1-act" title="Прозрачность"></div> <div class="slider-container"><div class="range-slider"><input class="range-slider__range" type="range" value="30" min="0" max="100"> <span class="range-slider__value">30</span> <span class="percent">%</span></div></div></div> <div class="block_right"><input type="text" name="input" placeholder="Поиск по адресам и координатам" class="header-input"> <div class="account">Имя Фамилия</div> <div class="account-star"></div></div>`;
    			t17 = space();
    			div23 = element("div");
    			div20 = element("div");
    			div17 = element("div");
    			t18 = space();
    			div18 = element("div");
    			t19 = space();
    			div19 = element("div");
    			t20 = space();
    			div22 = element("div");
    			div21 = element("div");
    			t21 = space();
    			if (if_block) if_block.c();
    			t22 = space();
    			map.$$.fragment.c();
    			t23 = space();
    			div25 = element("div");
    			div24 = element("div");
    			t24 = space();
    			zoom.$$.fragment.c();
    			t25 = space();
    			base.$$.fragment.c();
    			t26 = space();
    			div26 = element("div");
    			t27 = space();
    			div27 = element("div");
    			attr(div16, "class", "header");
    			attr(div17, "class", "icons-vert-top-1");
    			attr(div17, "title", "Менеджер слоев");
    			attr(div18, "class", "icons-vert-top-2");
    			attr(div18, "title", "Объекты");
    			attr(div19, "class", "icons-vert-top-3");
    			attr(div19, "title", "Отчеты");
    			attr(div20, "class", "icons-vert-top");
    			attr(div21, "class", "icons-vert-bottom-1");
    			attr(div21, "title", "Раскрыть / Свернуть");
    			attr(div22, "class", "icons-vert-bottom");
    			attr(div23, "class", "sidebar");
    			attr(div24, "class", "right-controls-2");
    			attr(div25, "class", "right-controls");
    			attr(div26, "class", "copyright");
    			attr(div27, "class", "copyright-bottom");

    			dispose = [
    				listen(div17, "click", ctx.click_handler),
    				listen(div18, "click", ctx.click_handler_1),
    				listen(div19, "click", ctx.click_handler_2),
    				listen(div21, "click", ctx.toggleSidebar),
    				listen(div24, "click", ctx.toggleBase)
    			];
    		},

    		m(target, anchor) {
    			insert(target, div16, anchor);
    			insert(target, t17, anchor);
    			insert(target, div23, anchor);
    			append(div23, div20);
    			append(div20, div17);
    			append(div20, t18);
    			append(div20, div18);
    			append(div20, t19);
    			append(div20, div19);
    			append(div23, t20);
    			append(div23, div22);
    			append(div22, div21);
    			insert(target, t21, anchor);
    			if (if_block) if_block.m(target, anchor);
    			insert(target, t22, anchor);
    			mount_component(map, target, anchor);
    			insert(target, t23, anchor);
    			insert(target, div25, anchor);
    			append(div25, div24);
    			append(div25, t24);
    			mount_component(zoom, div25, null);
    			insert(target, t25, anchor);
    			mount_component(base, target, anchor);
    			insert(target, t26, anchor);
    			insert(target, div26, anchor);
    			insert(target, t27, anchor);
    			insert(target, div27, anchor);
    			current = true;
    		},

    		p(changed, ctx) {
    			if (ctx.sidebar_visible) {
    				if (if_block) {
    					if_block.p(changed, ctx);
    					transition_in(if_block, 1);
    				} else {
    					if_block = create_if_block$2(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(t22.parentNode, t22);
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
    				detach(div23);
    				detach(t21);
    			}

    			if (if_block) if_block.d(detaching);

    			if (detaching) {
    				detach(t22);
    			}

    			destroy_component(map, detaching);

    			if (detaching) {
    				detach(t23);
    				detach(div25);
    			}

    			destroy_component(zoom);

    			if (detaching) {
    				detach(t25);
    			}

    			destroy_component(base, detaching);

    			if (detaching) {
    				detach(t26);
    				detach(div26);
    				detach(t27);
    				detach(div27);
    			}

    			run_all(dispose);
    		}
    	};
    }

    function instance$7($$self, $$props, $$invalidate) {
    	

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
    		click_handler_2
    	};
    }

    class App extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$7, create_fragment$7, safe_not_equal, ["name"]);
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
