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

    //http://maps.kosmosnimki.ru/TileSender.ashx?skipTiles=All&MapName=C8612B3A77D84F3F87953BEF17026A5F&srs=3857&ftc=osm&ModeKey=map

    // http://maps.kosmosnimki.ru/TileSender.ashx?WrapStyle=func&skipTiles=All&MapName=C8612B3A77D84F3F87953BEF17026A5F&srs=3857&ftc=osm&ModeKey=map&key=&CallbackName=_1



    const _self = self,
    		serverBase = _self.serverBase || 'http://maps.kosmosnimki.ru/';

    const kIsNodeJS = Object.prototype.toString.call(typeof process !== 'undefined' ? process : 0) === '[object process]';
    const kRequire = kIsNodeJS ? module.require : null; // eslint-disable-line

    function createBase64WorkerFactory(base64, sourcemap = null) {
        const source = kIsNodeJS ? Buffer.from(base64, 'base64').toString('ascii') : atob(base64);
        const start = source.indexOf('\n', 10) + 1;
        const body = source.substring(start) + (sourcemap ? `//# sourceMappingURL=${sourcemap}` : '');

        if (kIsNodeJS) {
            /* node.js */
            const Worker = kRequire('worker_threads').Worker; // eslint-disable-line
            return function WorkerFactory(options) {
                return new Worker(body, Object.assign({}, options, { eval: true }));
            };
        }

        /* browser */
        const blob = new Blob([body], { type: 'application/javascript' });
        const url = URL.createObjectURL(blob);
        return function WorkerFactory(options) {
            return new Worker(url, options);
        };
    }

    /* eslint-disable */
    const WorkerFactory = createBase64WorkerFactory('Lyogcm9sbHVwLXBsdWdpbi13ZWItd29ya2VyLWxvYWRlciAqLwovL2h0dHA6Ly9tYXBzLmtvc21vc25pbWtpLnJ1L1RpbGVTZW5kZXIuYXNoeD9za2lwVGlsZXM9QWxsJk1hcE5hbWU9Qzg2MTJCM0E3N0Q4NEYzRjg3OTUzQkVGMTcwMjZBNUYmc3JzPTM4NTcmZnRjPW9zbSZNb2RlS2V5PW1hcA0KDQovLyBodHRwOi8vbWFwcy5rb3Ntb3NuaW1raS5ydS9UaWxlU2VuZGVyLmFzaHg/V3JhcFN0eWxlPWZ1bmMmc2tpcFRpbGVzPUFsbCZNYXBOYW1lPUM4NjEyQjNBNzdEODRGM0Y4Nzk1M0JFRjE3MDI2QTVGJnNycz0zODU3JmZ0Yz1vc20mTW9kZUtleT1tYXAma2V5PSZDYWxsYmFja05hbWU9XzENCg0KDQoNCmNvbnN0IF9zZWxmID0gc2VsZiwNCgkJc2VydmVyQmFzZSA9IF9zZWxmLnNlcnZlckJhc2UgfHwgJ2h0dHA6Ly9tYXBzLmtvc21vc25pbWtpLnJ1Lyc7DQ0KY29uc3QgZ2V0TWFwID0gKHBhcmFtcykgPT4gew0KCQ0KCWxldCB1cmwgPSBgJHtzZXJ2ZXJCYXNlfU1hcC9HZXRNYXBQcm9wZXJ0aWVzYDsNCgkvLyBjb25zdCB1cmwgPSBgJHtzZXJ2ZXJCYXNlfVZlY3RvckxheWVyL1RpbGVTZW5kZXIuYXNoeGA7DQoJdXJsICs9ICc/TWFwTmFtZT1DODYxMkIzQTc3RDg0RjNGODc5NTNCRUYxNzAyNkE1Ric7DQoJcGFyYW1zID0gcGFyYW1zIHx8IHt9Ow0KDQoJaWYgKCFwYXJhbXMuV3JhcFN0eWxlKSB7cGFyYW1zLldyYXBTdHlsZSA9ICdmdW5jJzsgcGFyYW1zLkNhbGxiYWNrTmFtZSA9ICdfdGVzdCc7fQ0KCQ0KCWlmICghcGFyYW1zLnNraXBUaWxlcykge3BhcmFtcy5za2lwVGlsZXMgPSAnQWxsJzt9DQoJaWYgKCFwYXJhbXMuc3JzKSB7cGFyYW1zLnNycyA9ICczODU3Jzt9DQoJaWYgKCFwYXJhbXMuZnRjKSB7cGFyYW1zLmZ0YyA9ICdvc20nO30NCglpZiAoIXBhcmFtcy5Nb2RlS2V5KSB7cGFyYW1zLk1vZGVLZXkgPSAnbWFwJzt9DQoJaWYgKCFwYXJhbXMuTWFwTmFtZSkge3BhcmFtcy5NYXBOYW1lID0gJ0M4NjEyQjNBNzdEODRGM0Y4Nzk1M0JFRjE3MDI2QTVGJzt9DQoJLy8gcmV0dXJuIGZldGNoKHVybCwgew0KCQkvLyBtZXRob2Q6ICdwb3N0JywNCgkJLy8gbW9kZTogJ2NvcnMnLA0KCQkvLyBjcmVkZW50aWFsczogJ2luY2x1ZGUnLA0KCQkvLyBoZWFkZXJzOiB7J0FjY2VwdCc6ICdhcHBsaWNhdGlvbi9qc29uJ30sDQoJCS8vIGJvZHk6IEpTT04uc3RyaW5naWZ5KHBhcmFtcykJLy8gVE9ETzog0YHQtdGA0LLQtdGAINC/0L7Rh9C10LzRgyDRgtC+INC90LUg0YXQvtGH0LXRgiDRgNCw0LHQvtGC0LDRgtGMINGC0LDQuiBodHRwczovL2dvb2dsZWNocm9tZS5naXRodWIuaW8vc2FtcGxlcy9mZXRjaC1hcGkvZmV0Y2gtcG9zdC5odG1sDQoJLy8gfSkNCgkJLy8gLnRoZW4ocmVzID0+IHsgZGVsZXRlIGxvYWRlclN0YXR1c1t1cmxdOyByZXR1cm4gcmVzLmpzb24oKTsgfSkNCgkJLy8gLmNhdGNoKGVyciA9PiBjb25zb2xlLndhcm4oZXJyKSk7DQoJcmV0dXJuIGZldGNoKHVybCwgew0KCQltZXRob2Q6ICdnZXQnLA0KCQltb2RlOiAnY29ycycsDQoJCWNyZWRlbnRpYWxzOiAnaW5jbHVkZScsDQoJCS8vIGhlYWRlcnM6IHsnQWNjZXB0JzogJ2FwcGxpY2F0aW9uL2pzb24nfSwNCgkJLy8gYm9keTogSlNPTi5zdHJpbmdpZnkocGFyYW1zKQkvLyBUT0RPOiDRgdC10YDQstC10YAg0L/QvtGH0LXQvNGDINGC0L4g0L3QtSDRhdC+0YfQtdGCINGA0LDQsdC+0YLQsNGC0Ywg0YLQsNC6IGh0dHBzOi8vZ29vZ2xlY2hyb21lLmdpdGh1Yi5pby9zYW1wbGVzL2ZldGNoLWFwaS9mZXRjaC1wb3N0Lmh0bWwNCgl9KQ0KCQkudGhlbihyZXMgPT4geyByZXR1cm4gcmVzLmpzb24oKTsgfSkNCgkJLmNhdGNoKGVyciA9PiBjb25zb2xlLndhcm4oZXJyKSk7DQp9Ow0KDQp2YXIgUmVxdWVzdHMgPSB7DQoJZ2V0TWFwDQp9OwoKLy8vY29uc29sZS5sb2coJ3Nzc3NzJyk7DQoNCnZhciBfc2VsZiQxID0gc2VsZjsNCihfc2VsZiQxLm9uIHx8IF9zZWxmJDEuYWRkRXZlbnRMaXN0ZW5lcikuY2FsbChfc2VsZiQxLCAnbWVzc2FnZScsIGUgPT4gew0KICAgIGNvbnN0IG1lc3NhZ2UgPSBlLmRhdGEgfHwgZTsNCmNvbnNvbGUubG9nKCdzc2ZkZiBzc3MnLCBtZXNzYWdlKTsNCglSZXF1ZXN0cy5nZXRNYXAoKS50aGVuKChqc29uKSA9PiB7DQpjb25zb2xlLmxvZygnanNvbjExMScsIGpzb24pOw0KCX0pOw0KCQ0KLyoNCiAgICBzd2l0Y2ggKG1lc3NhZ2UudHlwZSkgew0KICAgICAgICBjYXNlICdpbml0JzoNCiAgICAgICAgICAgIGlmIChtZXNzYWdlLndhc20pIHsNCiAgICAgICAgICAgICAgICBjb25zdCBtZW1vcnlTaXplID0gMTY7DQogICAgICAgICAgICAgICAgbWVtb3J5ID0gbmV3IFdlYkFzc2VtYmx5Lk1lbW9yeSh7aW5pdGlhbDogbWVtb3J5U2l6ZSwgbWF4aW11bTogbWVtb3J5U2l6ZX0pOw0KICAgICAgICAgICAgICAgIHZpZXcgPSBuZXcgRGF0YVZpZXcobWVtb3J5LmJ1ZmZlcik7DQogICAgICAgICAgICAgICAgd2FzbSA9IG5ldyBXZWJBc3NlbWJseS5JbnN0YW5jZShtZXNzYWdlLndhc20sIHsNCiAgICAgICAgICAgICAgICAgICAgZW52OiB7DQogICAgICAgICAgICAgICAgICAgICAgICBfbm93OiBfcGVyZm9ybWFuY2Uubm93LmJpbmQoX3BlcmZvcm1hbmNlKSwNCiAgICAgICAgICAgICAgICAgICAgICAgIG1lbW9yeTogbWVtb3J5LA0KICAgICAgICAgICAgICAgICAgICB9LA0KICAgICAgICAgICAgICAgIH0pOw0KICAgICAgICAgICAgICAgIHJ1bldvcmtsb2FkID0gcnVuV29ya2xvYWRXQVNNOw0KICAgICAgICAgICAgfSBlbHNlIHsNCiAgICAgICAgICAgICAgICBydW5Xb3JrbG9hZCA9IHJ1bldvcmtsb2FkSlM7DQogICAgICAgICAgICB9DQogICAgICAgICAgICBydW5Xb3JrbG9hZCgxLCAwKTsNCiAgICAgICAgICAgIF9zZWxmLnBvc3RNZXNzYWdlKCdzdWNjZXNzJyk7DQogICAgICAgICAgICBicmVhazsNCg0KICAgICAgICBjYXNlICd3b3JrbG9hZCc6IHsNCiAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4gew0KICAgICAgICAgICAgICAgIF9zZWxmLnBvc3RNZXNzYWdlKHJ1bldvcmtsb2FkKDEwLCBtZXNzYWdlLmlkKSk7DQogICAgICAgICAgICB9LCBtZXNzYWdlLnN0YXJ0VGltZSAtIERhdGUubm93KCkpOw0KICAgICAgICAgICAgYnJlYWs7DQogICAgICAgIH0NCg0KICAgICAgICBkZWZhdWx0Og0KICAgICAgICAgICAgYnJlYWs7DQogICAgfQ0KCSovDQp9KTsKCg==', null);
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
    	

    let dataWorker;

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

    if (!dataWorker) {
    	setTimeout(function() {
    		dataWorker = new WorkerFactory();
    		dataWorker.postMessage('Hello World!');		
    	}, 250);
    }
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

    class Map$1 extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance, create_fragment, safe_not_equal, ["center", "id", "layers", "maxZoom", "minZoom", "zoom", "ftc", "srs", "distanceUnit", "squareUnit", "baseLayers"]);
    	}
    }

    /* src\Controls\LayersTree\LayersTree.svelte generated by Svelte v3.7.1 */

    function create_fragment$1(ctx) {
    	var div_28;

    	return {
    		c() {
    			div_28 = element("div");
    			div_28.innerHTML = `<div class="sidebar-opened-row1"><div class="sidebar-opened-row1-left">Название проекта/компании</div> <div class="sidebar-opened-row1-right"></div></div> <div class="sidebar-opened-row2"><input type="text" name="input1" class="header-input1"></div> <div class="sidebar-opened-row3"><div class="sidebar-opened-row3-left"><label class="control control-checkbox">
			               Выделить все
			               <input type="checkbox"> <div class="control_indicator"></div></label></div> <div class="sidebar-opened-row3-right"><div class="sidebar-opened-row3-right-el1"></div> <div class="sidebar-opened-row3-right-el2"></div> <div class="sidebar-opened-row3-right-el3"></div> <div class="sidebar-opened-row3-right-el4"></div></div></div> <div class="sidebar-opened-row-el"><div class="sidebar-opened-el-left"><label class="control control-checkbox control-black control-group">
			               Делянки
			               <input type="checkbox" checked="checked"> <div class="control_indicator"></div></label></div> <div class="sidebar-opened-el-right"></div></div> <div class="sidebar-opened-row-el"><div class="sidebar-opened-el-left"><label class="control control-checkbox control-black control-empty">
			               Пустой слой
			               <input type="checkbox"> <div class="control_indicator"></div></label></div> <div class="sidebar-opened-el-right"></div></div> <div class="sidebar-opened-row-el"><div class="sidebar-opened-el-left"><label class="control control-checkbox control-black control-group">
			               Квартальные сети
			               <input type="checkbox" checked="checked"> <div class="control_indicator"></div></label></div> <div class="sidebar-opened-el-right"></div></div> <div class="sidebar-opened-row-el"><div class="sidebar-opened-el-left"><label class="control control-checkbox control-black control-empty">
			               Пустой слой
			               <input type="checkbox" checked="checked"> <div class="control_indicator"></div></label></div> <div class="sidebar-opened-el-right"></div></div>`;
    			attr(div_28, "class", "sidebar-opened");
    		},

    		m(target, anchor) {
    			insert(target, div_28, anchor);
    		},

    		p: noop,
    		i: noop,
    		o: noop,

    		d(detaching) {
    			if (detaching) {
    				detach(div_28);
    			}
    		}
    	};
    }

    function instance$1($$self, $$props, $$invalidate) {
    	const unsubscribe = baseContVisible.subscribe(value => {
    	});

    /*
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
    	*/

    	return {};
    }

    class LayersTree extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, []);
    	}
    }

    /* src\Controls\Zoom\Zoom.svelte generated by Svelte v3.7.1 */

    function create_fragment$2(ctx) {
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

    function instance$2($$self, $$props, $$invalidate) {
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
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, []);
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

    function create_fragment$3(ctx) {
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

    function instance$3($$self, $$props, $$invalidate) {
    	

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
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, []);
    	}
    }

    /* src\App.svelte generated by Svelte v3.7.1 */

    function create_fragment$4(ctx) {
    	var div16, t17, div23, t21, t22, t23, div25, div24, t24, t25, t26, div26, t27, div27, current, dispose;

    	var layerstree = new LayersTree({});

    	var map = new Map$1({});

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
    			div23 = element("div");
    			div23.innerHTML = `<div class="icons-vert-top"><div class="icons-vert-top-1"></div> <div class="icons-vert-top-2"></div> <div class="icons-vert-top-3"></div></div> <div class="icons-vert-bottom"><div class="icons-vert-bottom-1"></div></div>`;
    			t21 = space();
    			layerstree.$$.fragment.c();
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
    			attr(div23, "class", "sidebar");
    			attr(div24, "class", "right-controls-2");
    			attr(div25, "class", "right-controls");
    			attr(div26, "class", "copyright");
    			attr(div27, "class", "copyright-bottom");
    			dispose = listen(div24, "click", ctx.toggleBase);
    		},

    		m(target, anchor) {
    			insert(target, div16, anchor);
    			insert(target, t17, anchor);
    			insert(target, div23, anchor);
    			insert(target, t21, anchor);
    			mount_component(layerstree, target, anchor);
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

    		p: noop,

    		i(local) {
    			if (current) return;
    			transition_in(layerstree.$$.fragment, local);

    			transition_in(map.$$.fragment, local);

    			transition_in(zoom.$$.fragment, local);

    			transition_in(base.$$.fragment, local);

    			current = true;
    		},

    		o(local) {
    			transition_out(layerstree.$$.fragment, local);
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

    			destroy_component(layerstree, detaching);

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

    			dispose();
    		}
    	};
    }

    function instance$4($$self, $$props, $$invalidate) {
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

    	return { toggleBase };
    }

    class App extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, []);
    	}
    }

    const app = new App({
    	target: document.body,
    	props: {
    		name: 'C8612B3A77D84F3F87953BEF17026A5F'
    	}
    });

    return app;

}());
//# sourceMappingURL=forest_1.0.js.map
