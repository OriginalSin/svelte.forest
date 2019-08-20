
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
    const WorkerFactory = createBase64WorkerFactory('Lyogcm9sbHVwLXBsdWdpbi13ZWItd29ya2VyLWxvYWRlciAqLwoKKGZ1bmN0aW9uKGwsIGksIHYsIGUpIHsgdiA9IGwuY3JlYXRlRWxlbWVudChpKTsgdi5hc3luYyA9IDE7IHYuc3JjID0gJy8vJyArIChsb2NhdGlvbi5ob3N0IHx8ICdsb2NhbGhvc3QnKS5zcGxpdCgnOicpWzBdICsgJzozNTcyOS9saXZlcmVsb2FkLmpzP3NuaXB2ZXI9MSc7IGUgPSBsLmdldEVsZW1lbnRzQnlUYWdOYW1lKGkpWzBdOyBlLnBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKHYsIGUpfSkoZG9jdW1lbnQsICdzY3JpcHQnKTsKLy9odHRwOi8vbWFwcy5rb3Ntb3NuaW1raS5ydS9UaWxlU2VuZGVyLmFzaHg/c2tpcFRpbGVzPUFsbCZNYXBOYW1lPUM4NjEyQjNBNzdEODRGM0Y4Nzk1M0JFRjE3MDI2QTVGJnNycz0zODU3JmZ0Yz1vc20mTW9kZUtleT1tYXAKCi8vIGh0dHA6Ly9tYXBzLmtvc21vc25pbWtpLnJ1L1RpbGVTZW5kZXIuYXNoeD9XcmFwU3R5bGU9ZnVuYyZza2lwVGlsZXM9QWxsJk1hcE5hbWU9Qzg2MTJCM0E3N0Q4NEYzRjg3OTUzQkVGMTcwMjZBNUYmc3JzPTM4NTcmZnRjPW9zbSZNb2RlS2V5PW1hcCZrZXk9JkNhbGxiYWNrTmFtZT1fMQoKCgpjb25zdCBfc2VsZiA9IHNlbGYsCgkJc2VydmVyQmFzZSA9IF9zZWxmLnNlcnZlckJhc2UgfHwgJ2h0dHA6Ly9tYXBzLmtvc21vc25pbWtpLnJ1Lyc7CmNvbnN0IGdldE1hcCA9IChwYXJhbXMpID0+IHsKCQoJbGV0IHVybCA9IGAke3NlcnZlckJhc2V9TWFwL0dldE1hcEZvbGRlcmA7CgkvLyBsZXQgdXJsID0gYCR7c2VydmVyQmFzZX1NYXAvR2V0TWFwUHJvcGVydGllc2A7CgkvLyBjb25zdCB1cmwgPSBgJHtzZXJ2ZXJCYXNlfVZlY3RvckxheWVyL1RpbGVTZW5kZXIuYXNoeGA7Cgl1cmwgKz0gJz9tYXBJZD1DODYxMkIzQTc3RDg0RjNGODc5NTNCRUYxNzAyNkE1Ric7Cgl1cmwgKz0gJyZmb2xkZXJJZD1yb290JzsKCXVybCArPSAnJnNycz0zODU3JzsKCXVybCArPSAnJnNraXBUaWxlcz1BbGwnOwoKCXBhcmFtcyA9IHBhcmFtcyB8fCB7fTsKCglpZiAoIXBhcmFtcy5XcmFwU3R5bGUpIHtwYXJhbXMuV3JhcFN0eWxlID0gJ2Z1bmMnOyBwYXJhbXMuQ2FsbGJhY2tOYW1lID0gJ190ZXN0Jzt9CgkKCWlmICghcGFyYW1zLnNraXBUaWxlcykge3BhcmFtcy5za2lwVGlsZXMgPSAnQWxsJzt9CglpZiAoIXBhcmFtcy5zcnMpIHtwYXJhbXMuc3JzID0gJzM4NTcnO30KCWlmICghcGFyYW1zLmZ0Yykge3BhcmFtcy5mdGMgPSAnb3NtJzt9CglpZiAoIXBhcmFtcy5Nb2RlS2V5KSB7cGFyYW1zLk1vZGVLZXkgPSAnbWFwJzt9CglpZiAoIXBhcmFtcy5NYXBOYW1lKSB7cGFyYW1zLk1hcE5hbWUgPSAnQzg2MTJCM0E3N0Q4NEYzRjg3OTUzQkVGMTcwMjZBNUYnO30KCS8vIHJldHVybiBmZXRjaCh1cmwsIHsKCQkvLyBtZXRob2Q6ICdwb3N0JywKCQkvLyBtb2RlOiAnY29ycycsCgkJLy8gY3JlZGVudGlhbHM6ICdpbmNsdWRlJywKCQkvLyBoZWFkZXJzOiB7J0FjY2VwdCc6ICdhcHBsaWNhdGlvbi9qc29uJ30sCgkJLy8gYm9keTogSlNPTi5zdHJpbmdpZnkocGFyYW1zKQkvLyBUT0RPOiDRgdC10YDQstC10YAg0L/QvtGH0LXQvNGDINGC0L4g0L3QtSDRhdC+0YfQtdGCINGA0LDQsdC+0YLQsNGC0Ywg0YLQsNC6IGh0dHBzOi8vZ29vZ2xlY2hyb21lLmdpdGh1Yi5pby9zYW1wbGVzL2ZldGNoLWFwaS9mZXRjaC1wb3N0Lmh0bWwKCS8vIH0pCgkJLy8gLnRoZW4ocmVzID0+IHsgZGVsZXRlIGxvYWRlclN0YXR1c1t1cmxdOyByZXR1cm4gcmVzLmpzb24oKTsgfSkKCQkvLyAuY2F0Y2goZXJyID0+IGNvbnNvbGUud2FybihlcnIpKTsKCXJldHVybiBmZXRjaCh1cmwsIHsKCQltZXRob2Q6ICdnZXQnLAoJCW1vZGU6ICdjb3JzJywKCQljcmVkZW50aWFsczogJ2luY2x1ZGUnLAoJCS8vIGhlYWRlcnM6IHsnQWNjZXB0JzogJ2FwcGxpY2F0aW9uL2pzb24nfSwKCQkvLyBib2R5OiBKU09OLnN0cmluZ2lmeShwYXJhbXMpCS8vIFRPRE86INGB0LXRgNCy0LXRgCDQv9C+0YfQtdC80YMg0YLQviDQvdC1INGF0L7Rh9C10YIg0YDQsNCx0L7RgtCw0YLRjCDRgtCw0LogaHR0cHM6Ly9nb29nbGVjaHJvbWUuZ2l0aHViLmlvL3NhbXBsZXMvZmV0Y2gtYXBpL2ZldGNoLXBvc3QuaHRtbAoJfSkKCQkudGhlbihyZXMgPT4geyByZXR1cm4gcmVzLmpzb24oKTsgfSkKCQkuY2F0Y2goZXJyID0+IGNvbnNvbGUud2FybihlcnIpKTsKfTsKCnZhciBSZXF1ZXN0cyA9IHsKCWdldE1hcAp9OwoKLy8vY29uc29sZS5sb2coJ3Nzc3NzJyk7Cgp2YXIgX3NlbGYkMSA9IHNlbGY7Cihfc2VsZiQxLm9uIHx8IF9zZWxmJDEuYWRkRXZlbnRMaXN0ZW5lcikuY2FsbChfc2VsZiQxLCAnbWVzc2FnZScsIGUgPT4gewogICAgY29uc3QgbWVzc2FnZSA9IGUuZGF0YSB8fCBlOwpjb25zb2xlLmxvZygnc3NmZGYgc3NzJywgbWVzc2FnZSk7CglSZXF1ZXN0cy5nZXRNYXAoKS50aGVuKChqc29uKSA9PiB7CmNvbnNvbGUubG9nKCdqc29uMTExJywganNvbik7Cgl9KTsKCQovKgogICAgc3dpdGNoIChtZXNzYWdlLnR5cGUpIHsKICAgICAgICBjYXNlICdpbml0JzoKICAgICAgICAgICAgaWYgKG1lc3NhZ2Uud2FzbSkgewogICAgICAgICAgICAgICAgY29uc3QgbWVtb3J5U2l6ZSA9IDE2OwogICAgICAgICAgICAgICAgbWVtb3J5ID0gbmV3IFdlYkFzc2VtYmx5Lk1lbW9yeSh7aW5pdGlhbDogbWVtb3J5U2l6ZSwgbWF4aW11bTogbWVtb3J5U2l6ZX0pOwogICAgICAgICAgICAgICAgdmlldyA9IG5ldyBEYXRhVmlldyhtZW1vcnkuYnVmZmVyKTsKICAgICAgICAgICAgICAgIHdhc20gPSBuZXcgV2ViQXNzZW1ibHkuSW5zdGFuY2UobWVzc2FnZS53YXNtLCB7CiAgICAgICAgICAgICAgICAgICAgZW52OiB7CiAgICAgICAgICAgICAgICAgICAgICAgIF9ub3c6IF9wZXJmb3JtYW5jZS5ub3cuYmluZChfcGVyZm9ybWFuY2UpLAogICAgICAgICAgICAgICAgICAgICAgICBtZW1vcnk6IG1lbW9yeSwKICAgICAgICAgICAgICAgICAgICB9LAogICAgICAgICAgICAgICAgfSk7CiAgICAgICAgICAgICAgICBydW5Xb3JrbG9hZCA9IHJ1bldvcmtsb2FkV0FTTTsKICAgICAgICAgICAgfSBlbHNlIHsKICAgICAgICAgICAgICAgIHJ1bldvcmtsb2FkID0gcnVuV29ya2xvYWRKUzsKICAgICAgICAgICAgfQogICAgICAgICAgICBydW5Xb3JrbG9hZCgxLCAwKTsKICAgICAgICAgICAgX3NlbGYucG9zdE1lc3NhZ2UoJ3N1Y2Nlc3MnKTsKICAgICAgICAgICAgYnJlYWs7CgogICAgICAgIGNhc2UgJ3dvcmtsb2FkJzogewogICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHsKICAgICAgICAgICAgICAgIF9zZWxmLnBvc3RNZXNzYWdlKHJ1bldvcmtsb2FkKDEwLCBtZXNzYWdlLmlkKSk7CiAgICAgICAgICAgIH0sIG1lc3NhZ2Uuc3RhcnRUaW1lIC0gRGF0ZS5ub3coKSk7CiAgICAgICAgICAgIGJyZWFrOwogICAgICAgIH0KCiAgICAgICAgZGVmYXVsdDoKICAgICAgICAgICAgYnJlYWs7CiAgICB9CgkqLwp9KTsKCg==', null);
    /* eslint-enable */

    /* src\Map\Map.svelte generated by Svelte v3.7.1 */

    const file = "src\\Map\\Map.svelte";

    function create_fragment(ctx) {
    	var div;

    	return {
    		c: function create() {
    			div = element("div");
    			attr(div, "id", "map");
    			add_location(div, file, 82, 0, 1870);
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

    /* src\Controls\LayersTree\LayersTree.svelte generated by Svelte v3.7.1 */

    const file$1 = "src\\Controls\\LayersTree\\LayersTree.svelte";

    function create_fragment$1(ctx) {
    	var div89, div2, div0, t1, div1, t2, div3, input0, t3, div11, div5, label0, t4, input1, t5, div4, t6, div10, div6, t7, div7, t8, div8, t9, div9, t10, div88, div15, div13, label1, t11, input2, t12, div12, t13, div14, t14, div19, div17, label2, t15, input3, t16, div16, t17, div18, t18, div23, div21, label3, t19, input4, t20, div20, t21, div22, t22, div27, div25, label4, t23, input5, t24, div24, t25, div26, t26, div31, div29, label5, t27, input6, t28, div28, t29, div30, t30, div35, div33, label6, t31, input7, t32, div32, t33, div34, t34, div39, div37, label7, t35, input8, t36, div36, t37, div38, t38, div43, div41, label8, t39, input9, t40, div40, t41, div42, t42, div47, div45, label9, t43, input10, t44, div44, t45, div46, t46, div51, div49, label10, t47, input11, t48, div48, t49, div50, t50, div55, div53, label11, t51, input12, t52, div52, t53, div54, t54, div59, div57, label12, t55, input13, t56, div56, t57, div58, t58, div63, div61, label13, t59, input14, t60, div60, t61, div62, t62, div67, div65, label14, t63, input15, t64, div64, t65, div66, t66, div71, div69, label15, t67, input16, t68, div68, t69, div70, t70, div75, div73, label16, t71, input17, t72, div72, t73, div74, t74, div79, div77, label17, t75, input18, t76, div76, t77, div78, t78, div83, div81, label18, t79, input19, t80, div80, t81, div82, t82, div87, div85, label19, t83, input20, t84, div84, t85, div86;

    	return {
    		c: function create() {
    			div89 = element("div");
    			div2 = element("div");
    			div0 = element("div");
    			div0.textContent = "Название проекта/компании";
    			t1 = space();
    			div1 = element("div");
    			t2 = space();
    			div3 = element("div");
    			input0 = element("input");
    			t3 = space();
    			div11 = element("div");
    			div5 = element("div");
    			label0 = element("label");
    			t4 = text("Выделить все\r\n               ");
    			input1 = element("input");
    			t5 = space();
    			div4 = element("div");
    			t6 = space();
    			div10 = element("div");
    			div6 = element("div");
    			t7 = space();
    			div7 = element("div");
    			t8 = space();
    			div8 = element("div");
    			t9 = space();
    			div9 = element("div");
    			t10 = space();
    			div88 = element("div");
    			div15 = element("div");
    			div13 = element("div");
    			label1 = element("label");
    			t11 = text("Корневой пустой слой\r\n               ");
    			input2 = element("input");
    			t12 = space();
    			div12 = element("div");
    			t13 = space();
    			div14 = element("div");
    			t14 = space();
    			div19 = element("div");
    			div17 = element("div");
    			label2 = element("label");
    			t15 = text("Корневой слой 1\r\n               ");
    			input3 = element("input");
    			t16 = space();
    			div16 = element("div");
    			t17 = space();
    			div18 = element("div");
    			t18 = space();
    			div23 = element("div");
    			div21 = element("div");
    			label3 = element("label");
    			t19 = text("Корневой слой 2\r\n               ");
    			input4 = element("input");
    			t20 = space();
    			div20 = element("div");
    			t21 = space();
    			div22 = element("div");
    			t22 = space();
    			div27 = element("div");
    			div25 = element("div");
    			label4 = element("label");
    			t23 = text("Корневой слой 3\r\n               ");
    			input5 = element("input");
    			t24 = space();
    			div24 = element("div");
    			t25 = space();
    			div26 = element("div");
    			t26 = space();
    			div31 = element("div");
    			div29 = element("div");
    			label5 = element("label");
    			t27 = text("1-й уровень вложенности\r\n               ");
    			input6 = element("input");
    			t28 = space();
    			div28 = element("div");
    			t29 = space();
    			div30 = element("div");
    			t30 = space();
    			div35 = element("div");
    			div33 = element("div");
    			label6 = element("label");
    			t31 = text("Вложенность 1 пустой слой\r\n               ");
    			input7 = element("input");
    			t32 = space();
    			div32 = element("div");
    			t33 = space();
    			div34 = element("div");
    			t34 = space();
    			div39 = element("div");
    			div37 = element("div");
    			label7 = element("label");
    			t35 = text("Вложенность 1 слой 1\r\n               ");
    			input8 = element("input");
    			t36 = space();
    			div36 = element("div");
    			t37 = space();
    			div38 = element("div");
    			t38 = space();
    			div43 = element("div");
    			div41 = element("div");
    			label8 = element("label");
    			t39 = text("Вложенность 1 слой 2\r\n               ");
    			input9 = element("input");
    			t40 = space();
    			div40 = element("div");
    			t41 = space();
    			div42 = element("div");
    			t42 = space();
    			div47 = element("div");
    			div45 = element("div");
    			label9 = element("label");
    			t43 = text("Вложенность 1 слой 3\r\n               ");
    			input10 = element("input");
    			t44 = space();
    			div44 = element("div");
    			t45 = space();
    			div46 = element("div");
    			t46 = space();
    			div51 = element("div");
    			div49 = element("div");
    			label10 = element("label");
    			t47 = text("2-й уровень вложенности\r\n               ");
    			input11 = element("input");
    			t48 = space();
    			div48 = element("div");
    			t49 = space();
    			div50 = element("div");
    			t50 = space();
    			div55 = element("div");
    			div53 = element("div");
    			label11 = element("label");
    			t51 = text("Вложенность 2 пустой слой\r\n               ");
    			input12 = element("input");
    			t52 = space();
    			div52 = element("div");
    			t53 = space();
    			div54 = element("div");
    			t54 = space();
    			div59 = element("div");
    			div57 = element("div");
    			label12 = element("label");
    			t55 = text("Вложенность 2 слой 1\r\n               ");
    			input13 = element("input");
    			t56 = space();
    			div56 = element("div");
    			t57 = space();
    			div58 = element("div");
    			t58 = space();
    			div63 = element("div");
    			div61 = element("div");
    			label13 = element("label");
    			t59 = text("Вложенность 2 слой 2\r\n               ");
    			input14 = element("input");
    			t60 = space();
    			div60 = element("div");
    			t61 = space();
    			div62 = element("div");
    			t62 = space();
    			div67 = element("div");
    			div65 = element("div");
    			label14 = element("label");
    			t63 = text("Вложенность 2 слой 3\r\n               ");
    			input15 = element("input");
    			t64 = space();
    			div64 = element("div");
    			t65 = space();
    			div66 = element("div");
    			t66 = space();
    			div71 = element("div");
    			div69 = element("div");
    			label15 = element("label");
    			t67 = text("3-й уровень вложенности\r\n               ");
    			input16 = element("input");
    			t68 = space();
    			div68 = element("div");
    			t69 = space();
    			div70 = element("div");
    			t70 = space();
    			div75 = element("div");
    			div73 = element("div");
    			label16 = element("label");
    			t71 = text("Вложенность 3 пустой слой\r\n               ");
    			input17 = element("input");
    			t72 = space();
    			div72 = element("div");
    			t73 = space();
    			div74 = element("div");
    			t74 = space();
    			div79 = element("div");
    			div77 = element("div");
    			label17 = element("label");
    			t75 = text("Вложенность 3 слой 1\r\n               ");
    			input18 = element("input");
    			t76 = space();
    			div76 = element("div");
    			t77 = space();
    			div78 = element("div");
    			t78 = space();
    			div83 = element("div");
    			div81 = element("div");
    			label18 = element("label");
    			t79 = text("Вложенность 3 слой 2\r\n               ");
    			input19 = element("input");
    			t80 = space();
    			div80 = element("div");
    			t81 = space();
    			div82 = element("div");
    			t82 = space();
    			div87 = element("div");
    			div85 = element("div");
    			label19 = element("label");
    			t83 = text("Вложенность 3 слой 3\r\n               ");
    			input20 = element("input");
    			t84 = space();
    			div84 = element("div");
    			t85 = space();
    			div86 = element("div");
    			attr(div0, "class", "sidebar-opened-row1-left");
    			add_location(div0, file$1, 73, 12, 2785);
    			attr(div1, "class", "sidebar-opened-row1-right");
    			add_location(div1, file$1, 74, 12, 2868);
    			attr(div2, "class", "sidebar-opened-row1");
    			add_location(div2, file$1, 72, 9, 2738);
    			attr(input0, "type", "text");
    			attr(input0, "name", "input1");
    			attr(input0, "class", "header-input1");
    			add_location(input0, file$1, 77, 12, 2988);
    			attr(div3, "class", "sidebar-opened-row2");
    			add_location(div3, file$1, 76, 9, 2941);
    			attr(input1, "type", "checkbox");
    			add_location(input1, file$1, 83, 15, 3259);
    			attr(div4, "class", "control_indicator");
    			add_location(div4, file$1, 84, 15, 3301);
    			attr(label0, "class", "control control-checkbox");
    			add_location(label0, file$1, 81, 15, 3173);
    			attr(div5, "class", "sidebar-opened-row3-left");
    			add_location(div5, file$1, 80, 12, 3118);
    			attr(div6, "class", "sidebar-opened-row3-right-el1");
    			add_location(div6, file$1, 87, 15, 3428);
    			attr(div7, "class", "sidebar-opened-row3-right-el2");
    			add_location(div7, file$1, 88, 15, 3494);
    			attr(div8, "class", "sidebar-opened-row3-right-el3");
    			add_location(div8, file$1, 89, 15, 3560);
    			attr(div9, "class", "sidebar-opened-row3-right-el4");
    			add_location(div9, file$1, 90, 15, 3626);
    			attr(div10, "class", "sidebar-opened-row3-right");
    			add_location(div10, file$1, 86, 12, 3372);
    			attr(div11, "class", "sidebar-opened-row3");
    			add_location(div11, file$1, 79, 9, 3071);
    			attr(input2, "type", "checkbox");
    			add_location(input2, file$1, 102, 15, 4018);
    			attr(div12, "class", "control_indicator");
    			add_location(div12, file$1, 103, 15, 4060);
    			attr(label1, "class", "control control-checkbox control-black control-empty-0");
    			add_location(label1, file$1, 100, 15, 3894);
    			attr(div13, "class", "sidebar-opened-el-left");
    			add_location(div13, file$1, 99, 12, 3841);
    			attr(div14, "class", "sidebar-opened-el-right");
    			add_location(div14, file$1, 105, 12, 4131);
    			attr(div15, "class", "sidebar-opened-row-el");
    			add_location(div15, file$1, 98, 9, 3792);
    			attr(input3, "type", "checkbox");
    			add_location(input3, file$1, 113, 15, 4431);
    			attr(div16, "class", "control_indicator");
    			add_location(div16, file$1, 114, 15, 4473);
    			attr(label2, "class", "control control-checkbox control-black control-1-default-0");
    			add_location(label2, file$1, 111, 15, 4308);
    			attr(div17, "class", "sidebar-opened-el-left");
    			add_location(div17, file$1, 110, 12, 4255);
    			attr(div18, "class", "sidebar-opened-el-right");
    			add_location(div18, file$1, 116, 12, 4544);
    			attr(div19, "class", "sidebar-opened-row-el");
    			add_location(div19, file$1, 109, 9, 4206);
    			attr(input4, "type", "checkbox");
    			add_location(input4, file$1, 123, 15, 4843);
    			attr(div20, "class", "control_indicator");
    			add_location(div20, file$1, 124, 15, 4885);
    			attr(label3, "class", "control control-checkbox control-black control-2-default-0");
    			add_location(label3, file$1, 121, 15, 4720);
    			attr(div21, "class", "sidebar-opened-el-left");
    			add_location(div21, file$1, 120, 12, 4667);
    			attr(div22, "class", "sidebar-opened-el-right");
    			add_location(div22, file$1, 126, 12, 4956);
    			attr(div23, "class", "sidebar-opened-row-el");
    			add_location(div23, file$1, 119, 10, 4618);
    			attr(input5, "type", "checkbox");
    			add_location(input5, file$1, 133, 15, 5255);
    			attr(div24, "class", "control_indicator");
    			add_location(div24, file$1, 134, 15, 5297);
    			attr(label4, "class", "control control-checkbox control-black control-3-default-0");
    			add_location(label4, file$1, 131, 15, 5132);
    			attr(div25, "class", "sidebar-opened-el-left");
    			add_location(div25, file$1, 130, 12, 5079);
    			attr(div26, "class", "sidebar-opened-el-right");
    			add_location(div26, file$1, 136, 12, 5368);
    			attr(div27, "class", "sidebar-opened-row-el");
    			add_location(div27, file$1, 129, 10, 5030);
    			attr(input6, "type", "checkbox");
    			input6.checked = "checked";
    			add_location(input6, file$1, 143, 15, 5670);
    			attr(div28, "class", "control_indicator");
    			add_location(div28, file$1, 144, 15, 5730);
    			attr(label5, "class", "control control-checkbox control-black control-group-1");
    			add_location(label5, file$1, 141, 15, 5543);
    			attr(div29, "class", "sidebar-opened-el-left");
    			add_location(div29, file$1, 140, 12, 5490);
    			attr(div30, "class", "sidebar-opened-el-right");
    			add_location(div30, file$1, 146, 12, 5801);
    			attr(div31, "class", "sidebar-opened-row-el");
    			add_location(div31, file$1, 139, 9, 5441);
    			attr(input7, "type", "checkbox");
    			input7.checked = "checked";
    			add_location(input7, file$1, 153, 15, 6105);
    			attr(div32, "class", "control_indicator");
    			add_location(div32, file$1, 154, 15, 6165);
    			attr(label6, "class", "control control-checkbox control-black control-empty-1");
    			add_location(label6, file$1, 151, 15, 5976);
    			attr(div33, "class", "sidebar-opened-el-left");
    			add_location(div33, file$1, 150, 12, 5923);
    			attr(div34, "class", "sidebar-opened-el-right");
    			add_location(div34, file$1, 156, 12, 6236);
    			attr(div35, "class", "sidebar-opened-row-el");
    			add_location(div35, file$1, 149, 9, 5874);
    			attr(input8, "type", "checkbox");
    			add_location(input8, file$1, 164, 15, 6541);
    			attr(div36, "class", "control_indicator");
    			add_location(div36, file$1, 165, 15, 6583);
    			attr(label7, "class", "control control-checkbox control-black control-1-default-1");
    			add_location(label7, file$1, 162, 15, 6413);
    			attr(div37, "class", "sidebar-opened-el-left");
    			add_location(div37, file$1, 161, 12, 6360);
    			attr(div38, "class", "sidebar-opened-el-right");
    			add_location(div38, file$1, 167, 12, 6654);
    			attr(div39, "class", "sidebar-opened-row-el");
    			add_location(div39, file$1, 160, 9, 6311);
    			attr(input9, "type", "checkbox");
    			add_location(input9, file$1, 174, 15, 6958);
    			attr(div40, "class", "control_indicator");
    			add_location(div40, file$1, 175, 15, 7000);
    			attr(label8, "class", "control control-checkbox control-black control-2-default-1");
    			add_location(label8, file$1, 172, 15, 6830);
    			attr(div41, "class", "sidebar-opened-el-left");
    			add_location(div41, file$1, 171, 12, 6777);
    			attr(div42, "class", "sidebar-opened-el-right");
    			add_location(div42, file$1, 177, 12, 7071);
    			attr(div43, "class", "sidebar-opened-row-el");
    			add_location(div43, file$1, 170, 10, 6728);
    			attr(input10, "type", "checkbox");
    			add_location(input10, file$1, 184, 15, 7375);
    			attr(div44, "class", "control_indicator");
    			add_location(div44, file$1, 185, 15, 7417);
    			attr(label9, "class", "control control-checkbox control-black control-3-default-1");
    			add_location(label9, file$1, 182, 15, 7247);
    			attr(div45, "class", "sidebar-opened-el-left");
    			add_location(div45, file$1, 181, 12, 7194);
    			attr(div46, "class", "sidebar-opened-el-right");
    			add_location(div46, file$1, 187, 12, 7488);
    			attr(div47, "class", "sidebar-opened-row-el");
    			add_location(div47, file$1, 180, 10, 7145);
    			attr(input11, "type", "checkbox");
    			input11.checked = "checked";
    			add_location(input11, file$1, 194, 15, 7791);
    			attr(div48, "class", "control_indicator");
    			add_location(div48, file$1, 195, 15, 7851);
    			attr(label10, "class", "control control-checkbox control-black control-group-2");
    			add_location(label10, file$1, 192, 15, 7664);
    			attr(div49, "class", "sidebar-opened-el-left");
    			add_location(div49, file$1, 191, 12, 7611);
    			attr(div50, "class", "sidebar-opened-el-right");
    			add_location(div50, file$1, 197, 12, 7922);
    			attr(div51, "class", "sidebar-opened-row-el");
    			add_location(div51, file$1, 190, 10, 7562);
    			attr(input12, "type", "checkbox");
    			input12.checked = "checked";
    			add_location(input12, file$1, 204, 15, 8227);
    			attr(div52, "class", "control_indicator");
    			add_location(div52, file$1, 205, 15, 8287);
    			attr(label11, "class", "control control-checkbox control-black control-empty-2");
    			add_location(label11, file$1, 202, 15, 8098);
    			attr(div53, "class", "sidebar-opened-el-left");
    			add_location(div53, file$1, 201, 12, 8045);
    			attr(div54, "class", "sidebar-opened-el-right");
    			add_location(div54, file$1, 207, 12, 8358);
    			attr(div55, "class", "sidebar-opened-row-el");
    			add_location(div55, file$1, 200, 10, 7996);
    			attr(input13, "type", "checkbox");
    			add_location(input13, file$1, 214, 15, 8661);
    			attr(div56, "class", "control_indicator");
    			add_location(div56, file$1, 215, 15, 8703);
    			attr(label12, "class", "control control-checkbox control-black control-1-default-2");
    			add_location(label12, file$1, 212, 15, 8533);
    			attr(div57, "class", "sidebar-opened-el-left");
    			add_location(div57, file$1, 211, 12, 8480);
    			attr(div58, "class", "sidebar-opened-el-right");
    			add_location(div58, file$1, 217, 12, 8774);
    			attr(div59, "class", "sidebar-opened-row-el");
    			add_location(div59, file$1, 210, 9, 8431);
    			attr(input14, "type", "checkbox");
    			add_location(input14, file$1, 224, 15, 9078);
    			attr(div60, "class", "control_indicator");
    			add_location(div60, file$1, 225, 15, 9120);
    			attr(label13, "class", "control control-checkbox control-black control-2-default-2");
    			add_location(label13, file$1, 222, 15, 8950);
    			attr(div61, "class", "sidebar-opened-el-left");
    			add_location(div61, file$1, 221, 12, 8897);
    			attr(div62, "class", "sidebar-opened-el-right");
    			add_location(div62, file$1, 227, 12, 9191);
    			attr(div63, "class", "sidebar-opened-row-el");
    			add_location(div63, file$1, 220, 10, 8848);
    			attr(input15, "type", "checkbox");
    			add_location(input15, file$1, 234, 15, 9495);
    			attr(div64, "class", "control_indicator");
    			add_location(div64, file$1, 235, 15, 9537);
    			attr(label14, "class", "control control-checkbox control-black control-3-default-2");
    			add_location(label14, file$1, 232, 15, 9367);
    			attr(div65, "class", "sidebar-opened-el-left");
    			add_location(div65, file$1, 231, 12, 9314);
    			attr(div66, "class", "sidebar-opened-el-right");
    			add_location(div66, file$1, 237, 12, 9608);
    			attr(div67, "class", "sidebar-opened-row-el");
    			add_location(div67, file$1, 230, 10, 9265);
    			attr(input16, "type", "checkbox");
    			input16.checked = "checked";
    			add_location(input16, file$1, 244, 15, 9910);
    			attr(div68, "class", "control_indicator");
    			add_location(div68, file$1, 245, 15, 9970);
    			attr(label15, "class", "control control-checkbox control-black control-group-3");
    			add_location(label15, file$1, 242, 15, 9783);
    			attr(div69, "class", "sidebar-opened-el-left");
    			add_location(div69, file$1, 241, 12, 9730);
    			attr(div70, "class", "sidebar-opened-el-right");
    			add_location(div70, file$1, 247, 12, 10041);
    			attr(div71, "class", "sidebar-opened-row-el");
    			add_location(div71, file$1, 240, 9, 9681);
    			attr(input17, "type", "checkbox");
    			input17.checked = "checked";
    			add_location(input17, file$1, 254, 15, 10345);
    			attr(div72, "class", "control_indicator");
    			add_location(div72, file$1, 255, 15, 10405);
    			attr(label16, "class", "control control-checkbox control-black control-empty-3");
    			add_location(label16, file$1, 252, 15, 10216);
    			attr(div73, "class", "sidebar-opened-el-left");
    			add_location(div73, file$1, 251, 12, 10163);
    			attr(div74, "class", "sidebar-opened-el-right");
    			add_location(div74, file$1, 257, 12, 10476);
    			attr(div75, "class", "sidebar-opened-row-el");
    			add_location(div75, file$1, 250, 9, 10114);
    			attr(input18, "type", "checkbox");
    			add_location(input18, file$1, 264, 15, 10779);
    			attr(div76, "class", "control_indicator");
    			add_location(div76, file$1, 265, 15, 10821);
    			attr(label17, "class", "control control-checkbox control-black control-1-default-3");
    			add_location(label17, file$1, 262, 15, 10651);
    			attr(div77, "class", "sidebar-opened-el-left");
    			add_location(div77, file$1, 261, 12, 10598);
    			attr(div78, "class", "sidebar-opened-el-right");
    			add_location(div78, file$1, 267, 12, 10892);
    			attr(div79, "class", "sidebar-opened-row-el");
    			add_location(div79, file$1, 260, 9, 10549);
    			attr(input19, "type", "checkbox");
    			add_location(input19, file$1, 274, 15, 11196);
    			attr(div80, "class", "control_indicator");
    			add_location(div80, file$1, 275, 15, 11238);
    			attr(label18, "class", "control control-checkbox control-black control-2-default-3");
    			add_location(label18, file$1, 272, 15, 11068);
    			attr(div81, "class", "sidebar-opened-el-left");
    			add_location(div81, file$1, 271, 12, 11015);
    			attr(div82, "class", "sidebar-opened-el-right");
    			add_location(div82, file$1, 277, 12, 11309);
    			attr(div83, "class", "sidebar-opened-row-el");
    			add_location(div83, file$1, 270, 10, 10966);
    			attr(input20, "type", "checkbox");
    			add_location(input20, file$1, 284, 15, 11613);
    			attr(div84, "class", "control_indicator");
    			add_location(div84, file$1, 285, 15, 11655);
    			attr(label19, "class", "control control-checkbox control-black control-3-default-3");
    			add_location(label19, file$1, 282, 15, 11485);
    			attr(div85, "class", "sidebar-opened-el-left");
    			add_location(div85, file$1, 281, 12, 11432);
    			attr(div86, "class", "sidebar-opened-el-right");
    			add_location(div86, file$1, 287, 12, 11726);
    			attr(div87, "class", "sidebar-opened-row-el");
    			add_location(div87, file$1, 280, 10, 11383);
    			attr(div88, "class", "sidebar-opened-el-container");
    			add_location(div88, file$1, 94, 9, 3725);
    			attr(div89, "class", "sidebar-opened");
    			add_location(div89, file$1, 71, 12, 2699);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert(target, div89, anchor);
    			append(div89, div2);
    			append(div2, div0);
    			append(div2, t1);
    			append(div2, div1);
    			append(div89, t2);
    			append(div89, div3);
    			append(div3, input0);
    			append(div89, t3);
    			append(div89, div11);
    			append(div11, div5);
    			append(div5, label0);
    			append(label0, t4);
    			append(label0, input1);
    			append(label0, t5);
    			append(label0, div4);
    			append(div11, t6);
    			append(div11, div10);
    			append(div10, div6);
    			append(div10, t7);
    			append(div10, div7);
    			append(div10, t8);
    			append(div10, div8);
    			append(div10, t9);
    			append(div10, div9);
    			append(div89, t10);
    			append(div89, div88);
    			append(div88, div15);
    			append(div15, div13);
    			append(div13, label1);
    			append(label1, t11);
    			append(label1, input2);
    			append(label1, t12);
    			append(label1, div12);
    			append(div15, t13);
    			append(div15, div14);
    			append(div88, t14);
    			append(div88, div19);
    			append(div19, div17);
    			append(div17, label2);
    			append(label2, t15);
    			append(label2, input3);
    			append(label2, t16);
    			append(label2, div16);
    			append(div19, t17);
    			append(div19, div18);
    			append(div88, t18);
    			append(div88, div23);
    			append(div23, div21);
    			append(div21, label3);
    			append(label3, t19);
    			append(label3, input4);
    			append(label3, t20);
    			append(label3, div20);
    			append(div23, t21);
    			append(div23, div22);
    			append(div88, t22);
    			append(div88, div27);
    			append(div27, div25);
    			append(div25, label4);
    			append(label4, t23);
    			append(label4, input5);
    			append(label4, t24);
    			append(label4, div24);
    			append(div27, t25);
    			append(div27, div26);
    			append(div88, t26);
    			append(div88, div31);
    			append(div31, div29);
    			append(div29, label5);
    			append(label5, t27);
    			append(label5, input6);
    			append(label5, t28);
    			append(label5, div28);
    			append(div31, t29);
    			append(div31, div30);
    			append(div88, t30);
    			append(div88, div35);
    			append(div35, div33);
    			append(div33, label6);
    			append(label6, t31);
    			append(label6, input7);
    			append(label6, t32);
    			append(label6, div32);
    			append(div35, t33);
    			append(div35, div34);
    			append(div88, t34);
    			append(div88, div39);
    			append(div39, div37);
    			append(div37, label7);
    			append(label7, t35);
    			append(label7, input8);
    			append(label7, t36);
    			append(label7, div36);
    			append(div39, t37);
    			append(div39, div38);
    			append(div88, t38);
    			append(div88, div43);
    			append(div43, div41);
    			append(div41, label8);
    			append(label8, t39);
    			append(label8, input9);
    			append(label8, t40);
    			append(label8, div40);
    			append(div43, t41);
    			append(div43, div42);
    			append(div88, t42);
    			append(div88, div47);
    			append(div47, div45);
    			append(div45, label9);
    			append(label9, t43);
    			append(label9, input10);
    			append(label9, t44);
    			append(label9, div44);
    			append(div47, t45);
    			append(div47, div46);
    			append(div88, t46);
    			append(div88, div51);
    			append(div51, div49);
    			append(div49, label10);
    			append(label10, t47);
    			append(label10, input11);
    			append(label10, t48);
    			append(label10, div48);
    			append(div51, t49);
    			append(div51, div50);
    			append(div88, t50);
    			append(div88, div55);
    			append(div55, div53);
    			append(div53, label11);
    			append(label11, t51);
    			append(label11, input12);
    			append(label11, t52);
    			append(label11, div52);
    			append(div55, t53);
    			append(div55, div54);
    			append(div88, t54);
    			append(div88, div59);
    			append(div59, div57);
    			append(div57, label12);
    			append(label12, t55);
    			append(label12, input13);
    			append(label12, t56);
    			append(label12, div56);
    			append(div59, t57);
    			append(div59, div58);
    			append(div88, t58);
    			append(div88, div63);
    			append(div63, div61);
    			append(div61, label13);
    			append(label13, t59);
    			append(label13, input14);
    			append(label13, t60);
    			append(label13, div60);
    			append(div63, t61);
    			append(div63, div62);
    			append(div88, t62);
    			append(div88, div67);
    			append(div67, div65);
    			append(div65, label14);
    			append(label14, t63);
    			append(label14, input15);
    			append(label14, t64);
    			append(label14, div64);
    			append(div67, t65);
    			append(div67, div66);
    			append(div88, t66);
    			append(div88, div71);
    			append(div71, div69);
    			append(div69, label15);
    			append(label15, t67);
    			append(label15, input16);
    			append(label15, t68);
    			append(label15, div68);
    			append(div71, t69);
    			append(div71, div70);
    			append(div88, t70);
    			append(div88, div75);
    			append(div75, div73);
    			append(div73, label16);
    			append(label16, t71);
    			append(label16, input17);
    			append(label16, t72);
    			append(label16, div72);
    			append(div75, t73);
    			append(div75, div74);
    			append(div88, t74);
    			append(div88, div79);
    			append(div79, div77);
    			append(div77, label17);
    			append(label17, t75);
    			append(label17, input18);
    			append(label17, t76);
    			append(label17, div76);
    			append(div79, t77);
    			append(div79, div78);
    			append(div88, t78);
    			append(div88, div83);
    			append(div83, div81);
    			append(div81, label18);
    			append(label18, t79);
    			append(label18, input19);
    			append(label18, t80);
    			append(label18, div80);
    			append(div83, t81);
    			append(div83, div82);
    			append(div88, t82);
    			append(div88, div87);
    			append(div87, div85);
    			append(div85, label19);
    			append(label19, t83);
    			append(label19, input20);
    			append(label19, t84);
    			append(label19, div84);
    			append(div87, t85);
    			append(div87, div86);
    		},

    		p: noop,
    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(div89);
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

    class LayersTree extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, []);
    	}
    }

    /* src\Controls\Zoom\Zoom.svelte generated by Svelte v3.7.1 */

    const file$2 = "src\\Controls\\Zoom\\Zoom.svelte";

    function create_fragment$2(ctx) {
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
    			add_location(div0, file$2, 35, 2, 893);
    			attr(div1, "class", "right-controls-3-2");
    			add_location(div1, file$2, 36, 2, 952);
    			attr(div2, "class", "right-controls-3-3");
    			add_location(div2, file$2, 37, 2, 1011);
    			attr(div3, "class", "right-controls-3");
    			add_location(div3, file$2, 34, 2, 860);

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

    class Zoom extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
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

    const file$3 = "src\\Controls\\Base\\Base.svelte";

    function create_fragment$3(ctx) {
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
    			add_location(div0, file$3, 102, 15, 3646);
    			attr(div1, "class", "right-controls-pop-r1-сlose");
    			attr(div1, "id", "close-pop");
    			add_location(div1, file$3, 103, 15, 3716);
    			attr(div2, "class", "right-controls-pop-r1");
    			add_location(div2, file$3, 101, 12, 3595);
    			attr(input0, "type", "radio");
    			attr(input0, "name", "radiog_dark");
    			attr(input0, "id", "radio1");
    			attr(input0, "class", "radio1 css-checkbox");
    			add_location(input0, file$3, 106, 59, 3927);
    			attr(label0, "for", "radio1");
    			attr(label0, "class", "css-label radGroup1 radGroup2");
    			add_location(label0, file$3, 106, 159, 4027);
    			attr(span0, "class", "spacer");
    			add_location(span0, file$3, 106, 38, 3906);
    			attr(div3, "class", "radio-arr");
    			add_location(div3, file$3, 106, 15, 3883);
    			attr(input1, "type", "radio");
    			attr(input1, "name", "radiog_dark");
    			attr(input1, "id", "radio2");
    			attr(input1, "class", "radio2 css-checkbox");
    			input1.checked = "checked";
    			add_location(input1, file$3, 107, 59, 4164);
    			attr(label1, "for", "radio2");
    			attr(label1, "class", "css-label radGroup1 radGroup2");
    			add_location(label1, file$3, 107, 176, 4281);
    			attr(span1, "class", "spacer");
    			add_location(span1, file$3, 107, 38, 4143);
    			attr(div4, "class", "radio-arr");
    			add_location(div4, file$3, 107, 15, 4120);
    			attr(input2, "type", "radio");
    			attr(input2, "name", "radiog_dark");
    			attr(input2, "id", "radio3");
    			attr(input2, "class", "radio3 css-checkbox");
    			add_location(input2, file$3, 108, 59, 4423);
    			attr(label2, "for", "radio3");
    			attr(label2, "class", "css-label radGroup1 radGroup2");
    			add_location(label2, file$3, 108, 159, 4523);
    			attr(span2, "class", "spacer");
    			add_location(span2, file$3, 108, 38, 4402);
    			attr(div5, "class", "radio-arr");
    			add_location(div5, file$3, 108, 15, 4379);
    			attr(input3, "type", "radio");
    			attr(input3, "name", "radiog_dark");
    			attr(input3, "id", "radio4");
    			attr(input3, "class", "radio4 css-checkbox");
    			add_location(input3, file$3, 109, 59, 4668);
    			attr(label3, "for", "radio4");
    			attr(label3, "class", "css-label radGroup1 radGroup2");
    			add_location(label3, file$3, 109, 159, 4768);
    			attr(span3, "class", "spacer");
    			add_location(span3, file$3, 109, 38, 4647);
    			attr(div6, "class", "radio-arr");
    			add_location(div6, file$3, 109, 15, 4624);
    			attr(input4, "type", "radio");
    			attr(input4, "name", "radiog_dark");
    			attr(input4, "id", "radio5");
    			attr(input4, "class", "radio5 css-checkbox");
    			add_location(input4, file$3, 110, 59, 4906);
    			attr(label4, "for", "radio5");
    			attr(label4, "class", "css-label radGroup1 radGroup2");
    			add_location(label4, file$3, 110, 159, 5006);
    			attr(span4, "class", "spacer");
    			add_location(span4, file$3, 110, 38, 4885);
    			attr(div7, "class", "radio-arr");
    			add_location(div7, file$3, 110, 15, 4862);
    			attr(div8, "class", "right-controls-pop-r2");
    			add_location(div8, file$3, 105, 12, 3832);
    			attr(input5, "type", "checkbox");
    			input5.checked = "checked";
    			add_location(input5, file$3, 115, 15, 5263);
    			attr(div9, "class", "control_indicator");
    			add_location(div9, file$3, 116, 15, 5322);
    			attr(label5, "class", "control control-checkbox");
    			add_location(label5, file$3, 113, 15, 5173);
    			attr(div10, "class", "right-controls-pop-r3");
    			add_location(div10, file$3, 112, 12, 5122);
    			attr(div11, "class", "right-controls-pop");
    			attr(div11, "id", "control-pop");
    			add_location(div11, file$3, 100, 9, 3533);
    			attr(div12, "class", div12_class_value = "flexWrapper " + (ctx.base_visible ? '' : 'hidden'));
    			add_location(div12, file$3, 99, 6, 3420);

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

    class Base extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, []);
    	}
    }

    /* src\App.svelte generated by Svelte v3.7.1 */

    const file$4 = "src\\App.svelte";

    // (92:0) {#if sidebar_visible}
    function create_if_block(ctx) {
    	var current_block_type_index, if_block, if_block_anchor, current;

    	var if_block_creators = [
    		create_if_block_1,
    		create_if_block_2,
    		create_if_block_3
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
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},

    		m: function mount(target, anchor) {
    			if (~current_block_type_index) if_blocks[current_block_type_index].m(target, anchor);
    			insert(target, if_block_anchor, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);
    			if (current_block_type_index !== previous_block_index) {
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

    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (~current_block_type_index) if_blocks[current_block_type_index].d(detaching);

    			if (detaching) {
    				detach(if_block_anchor);
    			}
    		}
    	};
    }

    // (98:29) 
    function create_if_block_3(ctx) {
    	var div;

    	return {
    		c: function create() {
    			div = element("div");
    			add_location(div, file$4, 98, 2, 2721);
    		},

    		m: function mount(target, anchor) {
    			insert(target, div, anchor);
    		},

    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(div);
    			}
    		}
    	};
    }

    // (96:29) 
    function create_if_block_2(ctx) {
    	var div;

    	return {
    		c: function create() {
    			div = element("div");
    			add_location(div, file$4, 96, 2, 2681);
    		},

    		m: function mount(target, anchor) {
    			insert(target, div, anchor);
    		},

    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(div);
    			}
    		}
    	};
    }

    // (94:1) {#if sidebar_num === 1}
    function create_if_block_1(ctx) {
    	var current;

    	var layerstree = new LayersTree({ $$inline: true });

    	return {
    		c: function create() {
    			layerstree.$$.fragment.c();
    		},

    		m: function mount(target, anchor) {
    			mount_component(layerstree, target, anchor);
    			current = true;
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(layerstree.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(layerstree.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			destroy_component(layerstree, detaching);
    		}
    	};
    }

    function create_fragment$4(ctx) {
    	var div16, div12, span0, div0, t1, div1, t3, div8, div4, div2, t4, div3, t5, div7, div5, t6, div6, t7, div9, t8, div11, div10, input0, t9, span1, t11, span2, t13, div15, input1, t14, div13, t16, div14, t17, div23, div20, div17, t18, div18, t19, div19, t20, div22, div21, t21, t22, t23, div25, div24, t24, t25, t26, div26, t27, div27, current, dispose;

    	var if_block = (ctx.sidebar_visible) && create_if_block(ctx);

    	var map = new Map$1({ $$inline: true });

    	var zoom = new Zoom({ $$inline: true });

    	var base = new Base({ $$inline: true });

    	return {
    		c: function create() {
    			div16 = element("div");
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
    			div15 = element("div");
    			input1 = element("input");
    			t14 = space();
    			div13 = element("div");
    			div13.textContent = "Имя Фамилия";
    			t16 = space();
    			div14 = element("div");
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
    			attr(div0, "class", "logo_left");
    			add_location(div0, file$4, 48, 5, 1173);
    			attr(div1, "class", "logo_left_text");
    			add_location(div1, file$4, 51, 5, 1226);
    			attr(span0, "class", "logo");
    			add_location(span0, file$4, 47, 2, 1148);
    			attr(div2, "class", "icons-header-left1");
    			add_location(div2, file$4, 57, 5, 1354);
    			attr(div3, "class", "icons-header-left2");
    			add_location(div3, file$4, 58, 5, 1398);
    			attr(div4, "class", "left-icons-left");
    			add_location(div4, file$4, 56, 5, 1319);
    			attr(div5, "class", "icons-header-right1");
    			add_location(div5, file$4, 61, 5, 1490);
    			attr(div6, "class", "icons-header-right2");
    			add_location(div6, file$4, 62, 5, 1535);
    			attr(div7, "class", "left-icons-right");
    			add_location(div7, file$4, 60, 5, 1454);
    			attr(div8, "class", "left-icons");
    			add_location(div8, file$4, 55, 2, 1289);
    			attr(div9, "class", "left-icons-1-act");
    			add_location(div9, file$4, 65, 2, 1598);
    			attr(input0, "class", "range-slider__range");
    			attr(input0, "type", "range");
    			input0.value = "30";
    			attr(input0, "min", "0");
    			attr(input0, "max", "100");
    			add_location(input0, file$4, 68, 5, 1705);
    			attr(span1, "class", "range-slider__value");
    			add_location(span1, file$4, 69, 5, 1788);
    			attr(span2, "class", "percent");
    			add_location(span2, file$4, 70, 5, 1837);
    			attr(div10, "class", "range-slider");
    			add_location(div10, file$4, 67, 5, 1673);
    			attr(div11, "class", "slider-container");
    			add_location(div11, file$4, 66, 2, 1637);
    			attr(div12, "class", "block_left");
    			add_location(div12, file$4, 46, 2, 1121);
    			attr(input1, "type", "text");
    			attr(input1, "name", "input");
    			attr(input1, "placeholder", "Поиск по адресам и координатам");
    			attr(input1, "class", "header-input");
    			add_location(input1, file$4, 75, 2, 1928);
    			attr(div13, "class", "account");
    			add_location(div13, file$4, 76, 2, 2029);
    			attr(div14, "class", "account-star");
    			add_location(div14, file$4, 77, 2, 2070);
    			attr(div15, "class", "block_right");
    			add_location(div15, file$4, 74, 2, 1900);
    			attr(div16, "class", "header");
    			add_location(div16, file$4, 45, 2, 1098);
    			attr(div17, "class", "icons-vert-top-1");
    			add_location(div17, file$4, 82, 3, 2181);
    			attr(div18, "class", "icons-vert-top-2");
    			add_location(div18, file$4, 83, 3, 2258);
    			attr(div19, "class", "icons-vert-top-3");
    			add_location(div19, file$4, 84, 3, 2335);
    			attr(div20, "class", "icons-vert-top");
    			add_location(div20, file$4, 81, 3, 2149);
    			attr(div21, "class", "icons-vert-bottom-1");
    			add_location(div21, file$4, 87, 3, 2457);
    			attr(div22, "class", "icons-vert-bottom");
    			add_location(div22, file$4, 86, 3, 2422);
    			attr(div23, "class", "sidebar");
    			add_location(div23, file$4, 80, 3, 2124);
    			attr(div24, "class", "right-controls-2");
    			add_location(div24, file$4, 107, 2, 2857);
    			attr(div25, "class", "right-controls");
    			add_location(div25, file$4, 106, 1, 2826);
    			attr(div26, "class", "copyright");
    			add_location(div26, file$4, 113, 2, 2955);
    			attr(div27, "class", "copyright-bottom");
    			add_location(div27, file$4, 114, 2, 2987);

    			dispose = [
    				listen(div17, "click", ctx.click_handler),
    				listen(div18, "click", ctx.click_handler_1),
    				listen(div19, "click", ctx.click_handler_2),
    				listen(div21, "click", ctx.toggleSidebar),
    				listen(div24, "click", ctx.toggleBase)
    			];
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert(target, div16, anchor);
    			append(div16, div12);
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
    			append(div16, t13);
    			append(div16, div15);
    			append(div15, input1);
    			append(div15, t14);
    			append(div15, div13);
    			append(div15, t16);
    			append(div15, div14);
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

    		p: function update(changed, ctx) {
    			if (ctx.sidebar_visible) {
    				if (if_block) {
    					if_block.p(changed, ctx);
    					transition_in(if_block, 1);
    				} else {
    					if_block = create_if_block(ctx);
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
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);

    			transition_in(map.$$.fragment, local);

    			transition_in(zoom.$$.fragment, local);

    			transition_in(base.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(if_block);
    			transition_out(map.$$.fragment, local);
    			transition_out(zoom.$$.fragment, local);
    			transition_out(base.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
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

    	let sidebar_num = 1;
    	let sidebar_visible = true;
    	let toggleSidebar = (ev) => {
    console.log('toggleSidebar', ev);
    		$$invalidate('sidebar_visible', sidebar_visible = !sidebar_visible);
    	};
    	let openSidebar = (nm) => {
    console.log('openSidebar', sidebar_num, nm);
    		$$invalidate('sidebar_num', sidebar_num = nm);
    		// let target = ev.target.classList.contains()
    		// sidebar_visible = !sidebar_visible;
    	};

    	function click_handler() {openSidebar(1);}

    	function click_handler_1() {openSidebar(2);}

    	function click_handler_2() {openSidebar(3);}

    	return {
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

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
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
