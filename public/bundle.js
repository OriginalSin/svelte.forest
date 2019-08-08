
(function(l, i, v, e) { v = l.createElement(i); v.async = 1; v.src = '//' + (location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; e = l.getElementsByTagName(i)[0]; e.parentNode.insertBefore(v, e)})(document, 'script');
var app = (function () {
    'use strict';

    function noop() { }
    const identity = x => x;
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
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
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
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
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error(`'target' is a required option`);
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn(`Component was already destroyed`); // eslint-disable-line no-console
            };
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

    const leafletMap = writable(0);
    const baseContVisible = writable(0);

    /* src\Map\Map.svelte generated by Svelte v3.7.1 */

    const file = "src\\Map\\Map.svelte";

    function create_fragment(ctx) {
    	var div;

    	return {
    		c: function create() {
    			div = element("div");
    			attr(div, "id", "map");
    			add_location(div, file, 65, 0, 1500);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert(target, div, anchor);
    			ctx.div_binding(div);
    		},

    		p: noop,
    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(div);
    			}

    			ctx.div_binding(null);
    		}
    	};
    }

    function instance($$self, $$props, $$invalidate) {
    	

    	let mapContainer;    
    	let map = null;

        // setContext ('leafletMap', leafletMap);
        let { center = [55.727110, 37.441406], id = '', layers = [], maxZoom = 21, minZoom = 1, zoom = 4, ftc = 'osm', srs = 3857, distanceUnit = 'auto', squareUnit = 'auto', baseLayers = [] } = $$props;    
        
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
    		});
    		resize();
    		leafletMap.set(map);
    		
    		// dispatch('leafletMap', leafletMap);
        });

    	const writable_props = ['center', 'id', 'layers', 'maxZoom', 'minZoom', 'zoom', 'ftc', 'srs', 'distanceUnit', 'squareUnit', 'baseLayers'];
    	Object.keys($$props).forEach(key => {
    		if (!writable_props.includes(key) && !key.startsWith('$$')) console.warn(`<Map> was created with unknown prop '${key}'`);
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
    		div_binding
    	};
    }

    class Map$1 extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, ["center", "id", "layers", "maxZoom", "minZoom", "zoom", "ftc", "srs", "distanceUnit", "squareUnit", "baseLayers"]);
    	}

    	get center() {
    		throw new Error("<Map>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set center(value) {
    		throw new Error("<Map>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get id() {
    		throw new Error("<Map>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set id(value) {
    		throw new Error("<Map>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get layers() {
    		throw new Error("<Map>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set layers(value) {
    		throw new Error("<Map>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get maxZoom() {
    		throw new Error("<Map>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set maxZoom(value) {
    		throw new Error("<Map>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get minZoom() {
    		throw new Error("<Map>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set minZoom(value) {
    		throw new Error("<Map>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get zoom() {
    		throw new Error("<Map>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set zoom(value) {
    		throw new Error("<Map>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get ftc() {
    		throw new Error("<Map>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set ftc(value) {
    		throw new Error("<Map>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get srs() {
    		throw new Error("<Map>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set srs(value) {
    		throw new Error("<Map>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get distanceUnit() {
    		throw new Error("<Map>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set distanceUnit(value) {
    		throw new Error("<Map>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get squareUnit() {
    		throw new Error("<Map>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set squareUnit(value) {
    		throw new Error("<Map>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get baseLayers() {
    		throw new Error("<Map>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set baseLayers(value) {
    		throw new Error("<Map>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\Controls\Zoom\Zoom.svelte generated by Svelte v3.7.1 */

    const file$1 = "src\\Controls\\Zoom\\Zoom.svelte";

    function create_fragment$1(ctx) {
    	var div3, div0, t0, div1, t2, div2, dispose;

    	return {
    		c: function create() {
    			div3 = element("div");
    			div0 = element("div");
    			t0 = space();
    			div1 = element("div");
    			div1.textContent = "5";
    			t2 = space();
    			div2 = element("div");
    			attr(div0, "class", "right-controls-3-1");
    			add_location(div0, file$1, 35, 2, 893);
    			attr(div1, "class", "right-controls-3-2");
    			add_location(div1, file$1, 36, 2, 952);
    			attr(div2, "class", "right-controls-3-3");
    			add_location(div2, file$1, 37, 2, 1011);
    			attr(div3, "class", "right-controls-3");
    			add_location(div3, file$1, 34, 2, 860);

    			dispose = [
    				listen(div0, "click", ctx.zoomIn),
    				listen(div2, "click", ctx.zoomOut)
    			];
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
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

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(div3);
    			}

    			ctx.div1_binding(null);
    			run_all(dispose);
    		}
    	};
    }

    function instance$1($$self, $$props, $$invalidate) {
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

    class Zoom extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, []);
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

    const file$2 = "src\\Controls\\Base\\Base.svelte";

    function create_fragment$2(ctx) {
    	var div12, div11, div2, div0, t1, div1, t2, div8, div3, span0, input0, label0, t4, div4, span1, input1, label1, t6, div5, span2, input2, label2, t8, div6, span3, input3, label3, t10, div7, span4, input4, label4, t12, div10, label5, t13, input5, t14, div9, div12_class_value, div12_intro, div12_outro, current, dispose;

    	return {
    		c: function create() {
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
    			label5 = element("label");
    			t13 = text("Координатная сетка\n               ");
    			input5 = element("input");
    			t14 = space();
    			div9 = element("div");
    			attr(div0, "class", "right-controls-pop-r1-text");
    			add_location(div0, file$2, 102, 15, 3646);
    			attr(div1, "class", "right-controls-pop-r1-сlose");
    			attr(div1, "id", "close-pop");
    			add_location(div1, file$2, 103, 15, 3716);
    			attr(div2, "class", "right-controls-pop-r1");
    			add_location(div2, file$2, 101, 12, 3595);
    			attr(input0, "type", "radio");
    			attr(input0, "name", "radiog_dark");
    			attr(input0, "id", "radio1");
    			attr(input0, "class", "radio1 css-checkbox");
    			add_location(input0, file$2, 106, 59, 3927);
    			attr(label0, "for", "radio1");
    			attr(label0, "class", "css-label radGroup1 radGroup2");
    			add_location(label0, file$2, 106, 159, 4027);
    			attr(span0, "class", "spacer");
    			add_location(span0, file$2, 106, 38, 3906);
    			attr(div3, "class", "radio-arr");
    			add_location(div3, file$2, 106, 15, 3883);
    			attr(input1, "type", "radio");
    			attr(input1, "name", "radiog_dark");
    			attr(input1, "id", "radio2");
    			attr(input1, "class", "radio2 css-checkbox");
    			input1.checked = "checked";
    			add_location(input1, file$2, 107, 59, 4164);
    			attr(label1, "for", "radio2");
    			attr(label1, "class", "css-label radGroup1 radGroup2");
    			add_location(label1, file$2, 107, 176, 4281);
    			attr(span1, "class", "spacer");
    			add_location(span1, file$2, 107, 38, 4143);
    			attr(div4, "class", "radio-arr");
    			add_location(div4, file$2, 107, 15, 4120);
    			attr(input2, "type", "radio");
    			attr(input2, "name", "radiog_dark");
    			attr(input2, "id", "radio3");
    			attr(input2, "class", "radio3 css-checkbox");
    			add_location(input2, file$2, 108, 59, 4423);
    			attr(label2, "for", "radio3");
    			attr(label2, "class", "css-label radGroup1 radGroup2");
    			add_location(label2, file$2, 108, 159, 4523);
    			attr(span2, "class", "spacer");
    			add_location(span2, file$2, 108, 38, 4402);
    			attr(div5, "class", "radio-arr");
    			add_location(div5, file$2, 108, 15, 4379);
    			attr(input3, "type", "radio");
    			attr(input3, "name", "radiog_dark");
    			attr(input3, "id", "radio4");
    			attr(input3, "class", "radio4 css-checkbox");
    			add_location(input3, file$2, 109, 59, 4668);
    			attr(label3, "for", "radio4");
    			attr(label3, "class", "css-label radGroup1 radGroup2");
    			add_location(label3, file$2, 109, 159, 4768);
    			attr(span3, "class", "spacer");
    			add_location(span3, file$2, 109, 38, 4647);
    			attr(div6, "class", "radio-arr");
    			add_location(div6, file$2, 109, 15, 4624);
    			attr(input4, "type", "radio");
    			attr(input4, "name", "radiog_dark");
    			attr(input4, "id", "radio5");
    			attr(input4, "class", "radio5 css-checkbox");
    			add_location(input4, file$2, 110, 59, 4906);
    			attr(label4, "for", "radio5");
    			attr(label4, "class", "css-label radGroup1 radGroup2");
    			add_location(label4, file$2, 110, 159, 5006);
    			attr(span4, "class", "spacer");
    			add_location(span4, file$2, 110, 38, 4885);
    			attr(div7, "class", "radio-arr");
    			add_location(div7, file$2, 110, 15, 4862);
    			attr(div8, "class", "right-controls-pop-r2");
    			add_location(div8, file$2, 105, 12, 3832);
    			attr(input5, "type", "checkbox");
    			input5.checked = "checked";
    			add_location(input5, file$2, 115, 15, 5263);
    			attr(div9, "class", "control_indicator");
    			add_location(div9, file$2, 116, 15, 5322);
    			attr(label5, "class", "control control-checkbox");
    			add_location(label5, file$2, 113, 15, 5173);
    			attr(div10, "class", "right-controls-pop-r3");
    			add_location(div10, file$2, 112, 12, 5122);
    			attr(div11, "class", "right-controls-pop");
    			attr(div11, "id", "control-pop");
    			add_location(div11, file$2, 100, 9, 3533);
    			attr(div12, "class", div12_class_value = "flexWrapper " + (ctx.base_visible ? '' : 'hidden'));
    			add_location(div12, file$2, 99, 6, 3420);

    			dispose = [
    				listen(div1, "click", ctx.toggleBase),
    				listen(input0, "click", ctx.setBase),
    				listen(input1, "click", ctx.setBase),
    				listen(input2, "click", ctx.setBase),
    				listen(input3, "click", ctx.setBase),
    				listen(input4, "click", ctx.setBase)
    			];
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
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
    			append(div10, label5);
    			append(label5, t13);
    			append(label5, input5);
    			append(label5, t14);
    			append(label5, div9);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if ((!current || changed.base_visible) && div12_class_value !== (div12_class_value = "flexWrapper " + (ctx.base_visible ? '' : 'hidden'))) {
    				attr(div12, "class", div12_class_value);
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			add_render_callback(() => {
    				if (div12_outro) div12_outro.end(1);
    				if (!div12_intro) div12_intro = create_in_transition(div12, fly, { y: 200, duration: 2000 });
    				div12_intro.start();
    			});

    			current = true;
    		},

    		o: function outro(local) {
    			if (div12_intro) div12_intro.invalidate();

    			div12_outro = create_out_transition(div12, fade, {});

    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(div12);
    				if (div12_outro) div12_outro.end();
    			}

    			run_all(dispose);
    		}
    	};
    }

    function instance$2($$self, $$props, $$invalidate) {
    	

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

    class Base extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, []);
    	}
    }

    /* src\App.svelte generated by Svelte v3.7.1 */

    const file$3 = "src\\App.svelte";

    function create_fragment$3(ctx) {
    	var div15, div12, span0, div0, t1, div1, t3, div8, div4, div2, t4, div3, t5, div7, div5, t6, div6, t7, div9, t8, div11, div10, input0, t9, span1, t11, span2, t13, div14, input1, t14, div13, t16, div22, div19, div16, t17, div17, t18, div18, t19, div21, div20, t20, t21, div24, div23, t22, t23, t24, div25, t25, div26, current, dispose;

    	var map = new Map$1({ $$inline: true });

    	var zoom = new Zoom({ $$inline: true });

    	var base = new Base({ $$inline: true });

    	return {
    		c: function create() {
    			div15 = element("div");
    			div12 = element("div");
    			span0 = element("span");
    			div0 = element("div");
    			div0.textContent = " ";
    			t1 = space();
    			div1 = element("div");
    			div1.textContent = "Logo";
    			t3 = space();
    			div8 = element("div");
    			div4 = element("div");
    			div2 = element("div");
    			t4 = space();
    			div3 = element("div");
    			t5 = space();
    			div7 = element("div");
    			div5 = element("div");
    			t6 = space();
    			div6 = element("div");
    			t7 = space();
    			div9 = element("div");
    			t8 = space();
    			div11 = element("div");
    			div10 = element("div");
    			input0 = element("input");
    			t9 = space();
    			span1 = element("span");
    			span1.textContent = "30";
    			t11 = space();
    			span2 = element("span");
    			span2.textContent = "%";
    			t13 = space();
    			div14 = element("div");
    			input1 = element("input");
    			t14 = space();
    			div13 = element("div");
    			div13.textContent = "Иннокентий Константинопольсикй";
    			t16 = space();
    			div22 = element("div");
    			div19 = element("div");
    			div16 = element("div");
    			t17 = space();
    			div17 = element("div");
    			t18 = space();
    			div18 = element("div");
    			t19 = space();
    			div21 = element("div");
    			div20 = element("div");
    			t20 = space();
    			map.$$.fragment.c();
    			t21 = space();
    			div24 = element("div");
    			div23 = element("div");
    			t22 = space();
    			zoom.$$.fragment.c();
    			t23 = space();
    			base.$$.fragment.c();
    			t24 = space();
    			div25 = element("div");
    			t25 = space();
    			div26 = element("div");
    			attr(div0, "class", "logo_left");
    			add_location(div0, file$3, 40, 5, 905);
    			attr(div1, "class", "logo_left_text");
    			add_location(div1, file$3, 43, 5, 958);
    			attr(span0, "class", "logo");
    			add_location(span0, file$3, 39, 2, 880);
    			attr(div2, "class", "icons-header-left1");
    			add_location(div2, file$3, 49, 5, 1086);
    			attr(div3, "class", "icons-header-left2");
    			add_location(div3, file$3, 50, 5, 1130);
    			attr(div4, "class", "left-icons-left");
    			add_location(div4, file$3, 48, 5, 1051);
    			attr(div5, "class", "icons-header-right1");
    			add_location(div5, file$3, 53, 5, 1222);
    			attr(div6, "class", "icons-header-right2");
    			add_location(div6, file$3, 54, 5, 1267);
    			attr(div7, "class", "left-icons-right");
    			add_location(div7, file$3, 52, 5, 1186);
    			attr(div8, "class", "left-icons");
    			add_location(div8, file$3, 47, 2, 1021);
    			attr(div9, "class", "left-icons-1-act");
    			add_location(div9, file$3, 57, 2, 1330);
    			attr(input0, "class", "range-slider__range");
    			attr(input0, "type", "range");
    			input0.value = "30";
    			attr(input0, "min", "0");
    			attr(input0, "max", "100");
    			add_location(input0, file$3, 60, 5, 1437);
    			attr(span1, "class", "range-slider__value");
    			add_location(span1, file$3, 61, 5, 1520);
    			attr(span2, "class", "percent");
    			add_location(span2, file$3, 62, 5, 1569);
    			attr(div10, "class", "range-slider");
    			add_location(div10, file$3, 59, 5, 1405);
    			attr(div11, "class", "slider-container");
    			add_location(div11, file$3, 58, 2, 1369);
    			attr(div12, "class", "block_left");
    			add_location(div12, file$3, 38, 2, 853);
    			attr(input1, "type", "text");
    			attr(input1, "name", "input");
    			attr(input1, "placeholder", "Поиск по адресам и координатам");
    			attr(input1, "class", "header-input");
    			add_location(input1, file$3, 67, 2, 1660);
    			attr(div13, "class", "account");
    			add_location(div13, file$3, 68, 2, 1761);
    			attr(div14, "class", "block_right");
    			add_location(div14, file$3, 66, 2, 1632);
    			attr(div15, "class", "header");
    			add_location(div15, file$3, 37, 2, 830);
    			attr(div16, "class", "icons-vert-top-1");
    			add_location(div16, file$3, 73, 3, 1897);
    			attr(div17, "class", "icons-vert-top-2");
    			add_location(div17, file$3, 74, 3, 1937);
    			attr(div18, "class", "icons-vert-top-3");
    			add_location(div18, file$3, 75, 3, 1977);
    			attr(div19, "class", "icons-vert-top");
    			add_location(div19, file$3, 72, 3, 1865);
    			attr(div20, "class", "icons-vert-bottom-1");
    			add_location(div20, file$3, 78, 3, 2062);
    			attr(div21, "class", "icons-vert-bottom");
    			add_location(div21, file$3, 77, 3, 2027);
    			attr(div22, "class", "sidebar");
    			add_location(div22, file$3, 71, 3, 1840);
    			attr(div23, "class", "right-controls-2");
    			add_location(div23, file$3, 84, 2, 2195);
    			attr(div24, "class", "right-controls");
    			add_location(div24, file$3, 83, 1, 2164);
    			attr(div25, "class", "copyright");
    			add_location(div25, file$3, 90, 2, 2293);
    			attr(div26, "class", "copyright-bottom");
    			add_location(div26, file$3, 91, 2, 2325);
    			dispose = listen(div23, "click", ctx.toggleBase);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert(target, div15, anchor);
    			append(div15, div12);
    			append(div12, span0);
    			append(span0, div0);
    			append(span0, t1);
    			append(span0, div1);
    			append(div12, t3);
    			append(div12, div8);
    			append(div8, div4);
    			append(div4, div2);
    			append(div4, t4);
    			append(div4, div3);
    			append(div8, t5);
    			append(div8, div7);
    			append(div7, div5);
    			append(div7, t6);
    			append(div7, div6);
    			append(div12, t7);
    			append(div12, div9);
    			append(div12, t8);
    			append(div12, div11);
    			append(div11, div10);
    			append(div10, input0);
    			append(div10, t9);
    			append(div10, span1);
    			append(div10, t11);
    			append(div10, span2);
    			append(div15, t13);
    			append(div15, div14);
    			append(div14, input1);
    			append(div14, t14);
    			append(div14, div13);
    			insert(target, t16, anchor);
    			insert(target, div22, anchor);
    			append(div22, div19);
    			append(div19, div16);
    			append(div19, t17);
    			append(div19, div17);
    			append(div19, t18);
    			append(div19, div18);
    			append(div22, t19);
    			append(div22, div21);
    			append(div21, div20);
    			insert(target, t20, anchor);
    			mount_component(map, target, anchor);
    			insert(target, t21, anchor);
    			insert(target, div24, anchor);
    			append(div24, div23);
    			append(div24, t22);
    			mount_component(zoom, div24, null);
    			insert(target, t23, anchor);
    			mount_component(base, target, anchor);
    			insert(target, t24, anchor);
    			insert(target, div25, anchor);
    			insert(target, t25, anchor);
    			insert(target, div26, anchor);
    			current = true;
    		},

    		p: noop,

    		i: function intro(local) {
    			if (current) return;
    			transition_in(map.$$.fragment, local);

    			transition_in(zoom.$$.fragment, local);

    			transition_in(base.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(map.$$.fragment, local);
    			transition_out(zoom.$$.fragment, local);
    			transition_out(base.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(div15);
    				detach(t16);
    				detach(div22);
    				detach(t20);
    			}

    			destroy_component(map, detaching);

    			if (detaching) {
    				detach(t21);
    				detach(div24);
    			}

    			destroy_component(zoom);

    			if (detaching) {
    				detach(t23);
    			}

    			destroy_component(base, detaching);

    			if (detaching) {
    				detach(t24);
    				detach(div25);
    				detach(t25);
    				detach(div26);
    			}

    			dispose();
    		}
    	};
    }

    function instance$3($$self, $$props, $$invalidate) {
    	const unsubscribe = baseContVisible.subscribe(value => {
    console.log('sssssssss', value);
    	});
    	const unsubscribe1 = leafletMap.subscribe(value => {
    console.log('leafletMap', value);
    	});
    	let toggleBase = () => {
    		baseContVisible.update(n => !n);
    console.log('leafletMap1', leafletMap);
    	};
    /*
    	export let name;
    	
    	export let leafletMap = null;
    	function callbackFunction(event) {
    		console.log(`Notify fired! Detail: ${event.detail}`)
    	}
    */

    	return { toggleBase };
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, []);
    	}
    }

    const app = new App({
    	target: document.body,
    	props: {
    		name: 'world'
    	}
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
