
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    const identity = x => x;
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
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
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function validate_store(store, name) {
        if (store != null && typeof store.subscribe !== 'function') {
            throw new Error(`'${name}' is not a store with a 'subscribe' method`);
        }
    }
    function subscribe(store, ...callbacks) {
        if (store == null) {
            return noop;
        }
        const unsub = store.subscribe(...callbacks);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }
    function component_subscribe(component, store, callback) {
        component.$$.on_destroy.push(subscribe(store, callback));
    }
    function create_slot(definition, ctx, $$scope, fn) {
        if (definition) {
            const slot_ctx = get_slot_context(definition, ctx, $$scope, fn);
            return definition[0](slot_ctx);
        }
    }
    function get_slot_context(definition, ctx, $$scope, fn) {
        return definition[1] && fn
            ? assign($$scope.ctx.slice(), definition[1](fn(ctx)))
            : $$scope.ctx;
    }
    function get_slot_changes(definition, $$scope, dirty, fn) {
        if (definition[2] && fn) {
            const lets = definition[2](fn(dirty));
            if ($$scope.dirty === undefined) {
                return lets;
            }
            if (typeof lets === 'object') {
                const merged = [];
                const len = Math.max($$scope.dirty.length, lets.length);
                for (let i = 0; i < len; i += 1) {
                    merged[i] = $$scope.dirty[i] | lets[i];
                }
                return merged;
            }
            return $$scope.dirty | lets;
        }
        return $$scope.dirty;
    }
    function update_slot(slot, slot_definition, ctx, $$scope, dirty, get_slot_changes_fn, get_slot_context_fn) {
        const slot_changes = get_slot_changes(slot_definition, $$scope, dirty, get_slot_changes_fn);
        if (slot_changes) {
            const slot_context = get_slot_context(slot_definition, ctx, $$scope, get_slot_context_fn);
            slot.p(slot_context, slot_changes);
        }
    }

    const is_client = typeof window !== 'undefined';
    let now = is_client
        ? () => window.performance.now()
        : () => Date.now();
    let raf = is_client ? cb => requestAnimationFrame(cb) : noop;

    const tasks = new Set();
    function run_tasks(now) {
        tasks.forEach(task => {
            if (!task.c(now)) {
                tasks.delete(task);
                task.f();
            }
        });
        if (tasks.size !== 0)
            raf(run_tasks);
    }
    /**
     * Creates a new task that runs on each raf frame
     * until it returns a falsy value or is aborted
     */
    function loop(callback) {
        let task;
        if (tasks.size === 0)
            raf(run_tasks);
        return {
            promise: new Promise(fulfill => {
                tasks.add(task = { c: callback, f: fulfill });
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
    function prevent_default(fn) {
        return function (event) {
            event.preventDefault();
            // @ts-ignore
            return fn.call(this, event);
        };
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function to_number(value) {
        return value === '' ? undefined : +value;
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function set_style(node, key, value, important) {
        node.style.setProperty(key, value, important ? 'important' : '');
    }
    function select_option(select, value) {
        for (let i = 0; i < select.options.length; i += 1) {
            const option = select.options[i];
            if (option.__value === value) {
                option.selected = true;
                return;
            }
        }
    }
    function select_value(select) {
        const selected_option = select.querySelector(':checked') || select.options[0];
        return selected_option && selected_option.__value;
    }
    function toggle_class(element, name, toggle) {
        element.classList[toggle ? 'add' : 'remove'](name);
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    const active_docs = new Set();
    let active = 0;
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
        const doc = node.ownerDocument;
        active_docs.add(doc);
        const stylesheet = doc.__svelte_stylesheet || (doc.__svelte_stylesheet = doc.head.appendChild(element('style')).sheet);
        const current_rules = doc.__svelte_rules || (doc.__svelte_rules = {});
        if (!current_rules[name]) {
            current_rules[name] = true;
            stylesheet.insertRule(`@keyframes ${name} ${rule}`, stylesheet.cssRules.length);
        }
        const animation = node.style.animation || '';
        node.style.animation = `${animation ? `${animation}, ` : ``}${name} ${duration}ms linear ${delay}ms 1 both`;
        active += 1;
        return name;
    }
    function delete_rule(node, name) {
        const previous = (node.style.animation || '').split(', ');
        const next = previous.filter(name
            ? anim => anim.indexOf(name) < 0 // remove specific animation
            : anim => anim.indexOf('__svelte') === -1 // remove all Svelte animations
        );
        const deleted = previous.length - next.length;
        if (deleted) {
            node.style.animation = next.join(', ');
            active -= deleted;
            if (!active)
                clear_rules();
        }
    }
    function clear_rules() {
        raf(() => {
            if (active)
                return;
            active_docs.forEach(doc => {
                const stylesheet = doc.__svelte_stylesheet;
                let i = stylesheet.cssRules.length;
                while (i--)
                    stylesheet.deleteRule(i);
                doc.__svelte_rules = {};
            });
            active_docs.clear();
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
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }
    function onDestroy(fn) {
        get_current_component().$$.on_destroy.push(fn);
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
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
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
    function create_bidirectional_transition(node, fn, params, intro) {
        let config = fn(node, params);
        let t = intro ? 0 : 1;
        let running_program = null;
        let pending_program = null;
        let animation_name = null;
        function clear_animation() {
            if (animation_name)
                delete_rule(node, animation_name);
        }
        function init(program, duration) {
            const d = program.b - t;
            duration *= Math.abs(d);
            return {
                a: t,
                b: program.b,
                d,
                duration,
                start: program.start,
                end: program.start + duration,
                group: program.group
            };
        }
        function go(b) {
            const { delay = 0, duration = 300, easing = identity, tick = noop, css } = config || null_transition;
            const program = {
                start: now() + delay,
                b
            };
            if (!b) {
                // @ts-ignore todo: improve typings
                program.group = outros;
                outros.r += 1;
            }
            if (running_program) {
                pending_program = program;
            }
            else {
                // if this is an intro, and there's a delay, we need to do
                // an initial tick and/or apply CSS animation immediately
                if (css) {
                    clear_animation();
                    animation_name = create_rule(node, t, b, duration, delay, easing, css);
                }
                if (b)
                    tick(0, 1);
                running_program = init(program, duration);
                add_render_callback(() => dispatch(node, b, 'start'));
                loop(now => {
                    if (pending_program && now > pending_program.start) {
                        running_program = init(pending_program, duration);
                        pending_program = null;
                        dispatch(node, running_program.b, 'start');
                        if (css) {
                            clear_animation();
                            animation_name = create_rule(node, t, running_program.b, running_program.duration, 0, easing, config.css);
                        }
                    }
                    if (running_program) {
                        if (now >= running_program.end) {
                            tick(t = running_program.b, 1 - t);
                            dispatch(node, running_program.b, 'end');
                            if (!pending_program) {
                                // we're done
                                if (running_program.b) {
                                    // intro — we can tidy up immediately
                                    clear_animation();
                                }
                                else {
                                    // outro — needs to be coordinated
                                    if (!--running_program.group.r)
                                        run_all(running_program.group.c);
                                }
                            }
                            running_program = null;
                        }
                        else if (now >= running_program.start) {
                            const p = now - running_program.start;
                            t = running_program.a + running_program.d * easing(p / running_program.duration);
                            tick(t, 1 - t);
                        }
                    }
                    return !!(running_program || pending_program);
                });
            }
        }
        return {
            run(b) {
                if (is_function(config)) {
                    wait().then(() => {
                        // @ts-ignore
                        config = config();
                        go(b);
                    });
                }
                else {
                    go(b);
                }
            },
            end() {
                clear_animation();
                running_program = pending_program = null;
            }
        };
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);

    function destroy_block(block, lookup) {
        block.d(1);
        lookup.delete(block.key);
    }
    function outro_and_destroy_block(block, lookup) {
        transition_out(block, 1, 1, () => {
            lookup.delete(block.key);
        });
    }
    function update_keyed_each(old_blocks, dirty, get_key, dynamic, ctx, list, lookup, node, destroy, create_each_block, next, get_context) {
        let o = old_blocks.length;
        let n = list.length;
        let i = o;
        const old_indexes = {};
        while (i--)
            old_indexes[old_blocks[i].key] = i;
        const new_blocks = [];
        const new_lookup = new Map();
        const deltas = new Map();
        i = n;
        while (i--) {
            const child_ctx = get_context(ctx, list, i);
            const key = get_key(child_ctx);
            let block = lookup.get(key);
            if (!block) {
                block = create_each_block(key, child_ctx);
                block.c();
            }
            else if (dynamic) {
                block.p(child_ctx, dirty);
            }
            new_lookup.set(key, new_blocks[i] = block);
            if (key in old_indexes)
                deltas.set(key, Math.abs(i - old_indexes[key]));
        }
        const will_move = new Set();
        const did_move = new Set();
        function insert(block) {
            transition_in(block, 1);
            block.m(node, next);
            lookup.set(block.key, block);
            next = block.first;
            n--;
        }
        while (o && n) {
            const new_block = new_blocks[n - 1];
            const old_block = old_blocks[o - 1];
            const new_key = new_block.key;
            const old_key = old_block.key;
            if (new_block === old_block) {
                // do nothing
                next = new_block.first;
                o--;
                n--;
            }
            else if (!new_lookup.has(old_key)) {
                // remove old block
                destroy(old_block, lookup);
                o--;
            }
            else if (!lookup.has(new_key) || will_move.has(new_key)) {
                insert(new_block);
            }
            else if (did_move.has(old_key)) {
                o--;
            }
            else if (deltas.get(new_key) > deltas.get(old_key)) {
                did_move.add(new_key);
                insert(new_block);
            }
            else {
                will_move.add(old_key);
                o--;
            }
        }
        while (o--) {
            const old_block = old_blocks[o];
            if (!new_lookup.has(old_block.key))
                destroy(old_block, lookup);
        }
        while (n)
            insert(new_blocks[n - 1]);
        return new_blocks;
    }
    function validate_each_keys(ctx, list, get_context, get_key) {
        const keys = new Set();
        for (let i = 0; i < list.length; i++) {
            const key = get_key(get_context(ctx, list, i));
            if (keys.has(key)) {
                throw new Error(`Cannot have duplicate keys in a keyed each`);
            }
            keys.add(key);
        }
    }

    function bind(component, name, callback) {
        const index = component.$$.props[name];
        if (index !== undefined) {
            component.$$.bound[index] = callback;
            callback(component.$$.ctx[index]);
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
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
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
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
            dirty,
            skip_bound: false
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
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
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.24.1' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev("SvelteDOMInsert", { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev("SvelteDOMInsert", { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev("SvelteDOMRemove", { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ["capture"] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev("SvelteDOMAddEventListener", { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev("SvelteDOMRemoveEventListener", { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
        else
            dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev("SvelteDOMSetData", { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
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
        $capture_state() { }
        $inject_state() { }
    }

    /* node_modules/wui.svelte/src/components/InputIPPort.svelte generated by Svelte v3.24.1 */

    const file = "node_modules/wui.svelte/src/components/InputIPPort.svelte";

    // (54:1) {#if isInvalid}
    function create_if_block(ctx) {
    	let div;
    	let t;

    	const block = {
    		c: function create() {
    			div = element("div");
    			t = text(/*error*/ ctx[2]);
    			attr_dev(div, "class", "invalid svelte-sy39ke");
    			add_location(div, file, 54, 1, 911);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*error*/ 4) set_data_dev(t, /*error*/ ctx[2]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(54:1) {#if isInvalid}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let div;
    	let input;
    	let t;
    	let mounted;
    	let dispose;
    	let if_block = /*isInvalid*/ ctx[1] && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			input = element("input");
    			t = space();
    			if (if_block) if_block.c();
    			attr_dev(input, "type", "text");
    			attr_dev(input, "placeholder", "127.0.0.1:8080");
    			attr_dev(input, "class", "svelte-sy39ke");
    			toggle_class(input, "invalid", /*isInvalid*/ ctx[1]);
    			add_location(input, file, 46, 1, 770);
    			attr_dev(div, "class", "wui-input-ipport svelte-sy39ke");
    			add_location(div, file, 45, 0, 738);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, input);
    			set_input_value(input, /*value*/ ctx[0]);
    			append_dev(div, t);
    			if (if_block) if_block.m(div, null);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input, "input", /*input_input_handler*/ ctx[4]),
    					listen_dev(input, "blur", /*onBlur*/ ctx[3], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*value*/ 1 && input.value !== /*value*/ ctx[0]) {
    				set_input_value(input, /*value*/ ctx[0]);
    			}

    			if (dirty & /*isInvalid*/ 2) {
    				toggle_class(input, "invalid", /*isInvalid*/ ctx[1]);
    			}

    			if (/*isInvalid*/ ctx[1]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block(ctx);
    					if_block.c();
    					if_block.m(div, null);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (if_block) if_block.d();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { value = "" } = $$props;
    	let isInvalid = false;
    	let error = "";

    	function onBlur() {
    		if (value === "") {
    			$$invalidate(1, isInvalid = false);
    			$$invalidate(2, error = "");
    			return;
    		}

    		const ipport = value.split(":");

    		if (ipport.length !== 2) {
    			$$invalidate(1, isInvalid = true);
    			$$invalidate(2, error = "missing port number");
    			return;
    		}

    		const ip = ipport[0];
    		const port = parseInt(ipport[1]);

    		if (isNaN(port) || port <= 0 || port >= 65535) {
    			$$invalidate(1, isInvalid = true);
    			$$invalidate(2, error = "invalid port number");
    			return;
    		}

    		$$invalidate(1, isInvalid = false);
    		$$invalidate(0, value = ip + ":" + port);
    	}

    	const writable_props = ["value"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<InputIPPort> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("InputIPPort", $$slots, []);

    	function input_input_handler() {
    		value = this.value;
    		$$invalidate(0, value);
    	}

    	$$self.$$set = $$props => {
    		if ("value" in $$props) $$invalidate(0, value = $$props.value);
    	};

    	$$self.$capture_state = () => ({ value, isInvalid, error, onBlur });

    	$$self.$inject_state = $$props => {
    		if ("value" in $$props) $$invalidate(0, value = $$props.value);
    		if ("isInvalid" in $$props) $$invalidate(1, isInvalid = $$props.isInvalid);
    		if ("error" in $$props) $$invalidate(2, error = $$props.error);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [value, isInvalid, error, onBlur, input_input_handler];
    }

    class InputIPPort extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, { value: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "InputIPPort",
    			options,
    			id: create_fragment.name
    		});
    	}

    	get value() {
    		throw new Error("<InputIPPort>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set value(value) {
    		throw new Error("<InputIPPort>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* node_modules/wui.svelte/src/components/InputNumber.svelte generated by Svelte v3.24.1 */

    const file$1 = "node_modules/wui.svelte/src/components/InputNumber.svelte";

    // (34:1) {#if unit !== ''}
    function create_if_block$1(ctx) {
    	let span;
    	let t;

    	const block = {
    		c: function create() {
    			span = element("span");
    			t = text(/*unit*/ ctx[1]);
    			attr_dev(span, "class", "suffix svelte-1qrd8wr");
    			add_location(span, file$1, 34, 2, 547);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			append_dev(span, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*unit*/ 2) set_data_dev(t, /*unit*/ ctx[1]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(34:1) {#if unit !== ''}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let div;
    	let input;
    	let t;
    	let mounted;
    	let dispose;
    	let if_block = /*unit*/ ctx[1] !== "" && create_if_block$1(ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			input = element("input");
    			t = space();
    			if (if_block) if_block.c();
    			attr_dev(input, "type", "number");
    			attr_dev(input, "class", "svelte-1qrd8wr");
    			add_location(input, file$1, 32, 1, 468);
    			attr_dev(div, "class", "wui-input-number svelte-1qrd8wr");
    			add_location(div, file$1, 31, 0, 436);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, input);
    			set_input_value(input, /*value*/ ctx[0]);
    			append_dev(div, t);
    			if (if_block) if_block.m(div, null);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input, "blur", /*onBlur*/ ctx[2], false, false, false),
    					listen_dev(input, "input", /*input_input_handler*/ ctx[5])
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*value*/ 1 && to_number(input.value) !== /*value*/ ctx[0]) {
    				set_input_value(input, /*value*/ ctx[0]);
    			}

    			if (/*unit*/ ctx[1] !== "") {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block$1(ctx);
    					if_block.c();
    					if_block.m(div, null);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (if_block) if_block.d();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { min } = $$props;
    	let { max } = $$props;
    	let { value = 0 } = $$props;
    	let { unit } = $$props;

    	function onBlur() {
    		$$invalidate(0, value = +value);

    		if (isNaN(value)) {
    			$$invalidate(0, value = max);
    		} else if (value < min) {
    			$$invalidate(0, value = min);
    		} else if (value > max) {
    			$$invalidate(0, value = max);
    		}
    	}

    	const writable_props = ["min", "max", "value", "unit"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<InputNumber> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("InputNumber", $$slots, []);

    	function input_input_handler() {
    		value = to_number(this.value);
    		$$invalidate(0, value);
    	}

    	$$self.$$set = $$props => {
    		if ("min" in $$props) $$invalidate(3, min = $$props.min);
    		if ("max" in $$props) $$invalidate(4, max = $$props.max);
    		if ("value" in $$props) $$invalidate(0, value = $$props.value);
    		if ("unit" in $$props) $$invalidate(1, unit = $$props.unit);
    	};

    	$$self.$capture_state = () => ({ min, max, value, unit, onBlur });

    	$$self.$inject_state = $$props => {
    		if ("min" in $$props) $$invalidate(3, min = $$props.min);
    		if ("max" in $$props) $$invalidate(4, max = $$props.max);
    		if ("value" in $$props) $$invalidate(0, value = $$props.value);
    		if ("unit" in $$props) $$invalidate(1, unit = $$props.unit);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [value, unit, onBlur, min, max, input_input_handler];
    }

    class InputNumber extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, { min: 3, max: 4, value: 0, unit: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "InputNumber",
    			options,
    			id: create_fragment$1.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*min*/ ctx[3] === undefined && !("min" in props)) {
    			console.warn("<InputNumber> was created without expected prop 'min'");
    		}

    		if (/*max*/ ctx[4] === undefined && !("max" in props)) {
    			console.warn("<InputNumber> was created without expected prop 'max'");
    		}

    		if (/*unit*/ ctx[1] === undefined && !("unit" in props)) {
    			console.warn("<InputNumber> was created without expected prop 'unit'");
    		}
    	}

    	get min() {
    		throw new Error("<InputNumber>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set min(value) {
    		throw new Error("<InputNumber>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get max() {
    		throw new Error("<InputNumber>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set max(value) {
    		throw new Error("<InputNumber>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get value() {
    		throw new Error("<InputNumber>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set value(value) {
    		throw new Error("<InputNumber>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get unit() {
    		throw new Error("<InputNumber>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set unit(value) {
    		throw new Error("<InputNumber>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* node_modules/wui.svelte/src/components/LabelHint.svelte generated by Svelte v3.24.1 */

    const file$2 = "node_modules/wui.svelte/src/components/LabelHint.svelte";

    // (57:0) {#if showInfo}
    function create_if_block$2(ctx) {
    	let div;

    	const block = {
    		c: function create() {
    			div = element("div");
    			attr_dev(div, "class", "info svelte-1weevo5");
    			add_location(div, file$2, 57, 0, 859);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			div.innerHTML = /*info*/ ctx[1];
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*info*/ 2) div.innerHTML = /*info*/ ctx[1];		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$2.name,
    		type: "if",
    		source: "(57:0) {#if showInfo}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$2(ctx) {
    	let label;
    	let span1;
    	let t0;
    	let t1;
    	let span0;
    	let t3;
    	let t4;
    	let if_block_anchor;
    	let current;
    	let mounted;
    	let dispose;
    	const default_slot_template = /*$$slots*/ ctx[5].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[4], null);
    	let if_block = /*showInfo*/ ctx[3] && create_if_block$2(ctx);

    	const block = {
    		c: function create() {
    			label = element("label");
    			span1 = element("span");
    			t0 = text(/*title*/ ctx[0]);
    			t1 = space();
    			span0 = element("span");
    			span0.textContent = "?";
    			t3 = space();
    			if (default_slot) default_slot.c();
    			t4 = space();
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    			attr_dev(span0, "class", "toggle svelte-1weevo5");
    			add_location(span0, file$2, 46, 2, 731);
    			attr_dev(span1, "class", "title svelte-1weevo5");
    			set_style(span1, "width", /*title_width*/ ctx[2]);
    			add_location(span1, file$2, 44, 1, 669);
    			attr_dev(label, "class", "label-hint svelte-1weevo5");
    			add_location(label, file$2, 43, 0, 641);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, label, anchor);
    			append_dev(label, span1);
    			append_dev(span1, t0);
    			append_dev(span1, t1);
    			append_dev(span1, span0);
    			append_dev(label, t3);

    			if (default_slot) {
    				default_slot.m(label, null);
    			}

    			insert_dev(target, t4, anchor);
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(span0, "click", /*click_handler*/ ctx[6], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (!current || dirty & /*title*/ 1) set_data_dev(t0, /*title*/ ctx[0]);

    			if (!current || dirty & /*title_width*/ 4) {
    				set_style(span1, "width", /*title_width*/ ctx[2]);
    			}

    			if (default_slot) {
    				if (default_slot.p && dirty & /*$$scope*/ 16) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[4], dirty, null, null);
    				}
    			}

    			if (/*showInfo*/ ctx[3]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block$2(ctx);
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(label);
    			if (default_slot) default_slot.d(detaching);
    			if (detaching) detach_dev(t4);
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { title } = $$props;
    	let { info } = $$props;
    	let { title_width = "300px" } = $$props;
    	let showInfo = false;
    	const writable_props = ["title", "info", "title_width"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<LabelHint> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("LabelHint", $$slots, ['default']);
    	const click_handler = () => $$invalidate(3, showInfo = !showInfo);

    	$$self.$$set = $$props => {
    		if ("title" in $$props) $$invalidate(0, title = $$props.title);
    		if ("info" in $$props) $$invalidate(1, info = $$props.info);
    		if ("title_width" in $$props) $$invalidate(2, title_width = $$props.title_width);
    		if ("$$scope" in $$props) $$invalidate(4, $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => ({ title, info, title_width, showInfo });

    	$$self.$inject_state = $$props => {
    		if ("title" in $$props) $$invalidate(0, title = $$props.title);
    		if ("info" in $$props) $$invalidate(1, info = $$props.info);
    		if ("title_width" in $$props) $$invalidate(2, title_width = $$props.title_width);
    		if ("showInfo" in $$props) $$invalidate(3, showInfo = $$props.showInfo);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [title, info, title_width, showInfo, $$scope, $$slots, click_handler];
    }

    class LabelHint extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, { title: 0, info: 1, title_width: 2 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "LabelHint",
    			options,
    			id: create_fragment$2.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*title*/ ctx[0] === undefined && !("title" in props)) {
    			console.warn("<LabelHint> was created without expected prop 'title'");
    		}

    		if (/*info*/ ctx[1] === undefined && !("info" in props)) {
    			console.warn("<LabelHint> was created without expected prop 'info'");
    		}
    	}

    	get title() {
    		throw new Error("<LabelHint>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set title(value) {
    		throw new Error("<LabelHint>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get info() {
    		throw new Error("<LabelHint>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set info(value) {
    		throw new Error("<LabelHint>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get title_width() {
    		throw new Error("<LabelHint>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set title_width(value) {
    		throw new Error("<LabelHint>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    function fade(node, { delay = 0, duration = 400, easing = identity }) {
        const o = +getComputedStyle(node).opacity;
        return {
            delay,
            duration,
            easing,
            css: t => `opacity: ${t * o}`
        };
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

    const messages = writable([]);

    /* node_modules/wui.svelte/src/components/NotifItem.svelte generated by Svelte v3.24.1 */
    const file$3 = "node_modules/wui.svelte/src/components/NotifItem.svelte";

    function create_fragment$3(ctx) {
    	let div;
    	let t;
    	let div_class_value;
    	let div_transition;
    	let current;

    	const block = {
    		c: function create() {
    			div = element("div");
    			t = text(/*text*/ ctx[0]);
    			attr_dev(div, "class", div_class_value = "wui-notif-item " + /*kind*/ ctx[1] + " svelte-1n99njq");
    			add_location(div, file$3, 35, 0, 625);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, t);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (!current || dirty & /*text*/ 1) set_data_dev(t, /*text*/ ctx[0]);

    			if (!current || dirty & /*kind*/ 2 && div_class_value !== (div_class_value = "wui-notif-item " + /*kind*/ ctx[1] + " svelte-1n99njq")) {
    				attr_dev(div, "class", div_class_value);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			add_render_callback(() => {
    				if (!div_transition) div_transition = create_bidirectional_transition(div, fade, {}, true);
    				div_transition.run(1);
    			});

    			current = true;
    		},
    		o: function outro(local) {
    			if (!div_transition) div_transition = create_bidirectional_transition(div, fade, {}, false);
    			div_transition.run(0);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (detaching && div_transition) div_transition.end();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let { text = "" } = $$props;
    	let { kind = "" } = $$props;
    	let { timeout = 5000 } = $$props;

    	onMount(() => {
    		let timerID = setTimeout(
    			() => {
    				messages.update(msgs => {
    					msgs.splice(0, 1);
    					msgs = msgs;
    					return msgs;
    				});
    			},
    			timeout
    		);
    	});

    	const writable_props = ["text", "kind", "timeout"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<NotifItem> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("NotifItem", $$slots, []);

    	$$self.$$set = $$props => {
    		if ("text" in $$props) $$invalidate(0, text = $$props.text);
    		if ("kind" in $$props) $$invalidate(1, kind = $$props.kind);
    		if ("timeout" in $$props) $$invalidate(2, timeout = $$props.timeout);
    	};

    	$$self.$capture_state = () => ({
    		onMount,
    		fade,
    		messages,
    		text,
    		kind,
    		timeout
    	});

    	$$self.$inject_state = $$props => {
    		if ("text" in $$props) $$invalidate(0, text = $$props.text);
    		if ("kind" in $$props) $$invalidate(1, kind = $$props.kind);
    		if ("timeout" in $$props) $$invalidate(2, timeout = $$props.timeout);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [text, kind, timeout];
    }

    class NotifItem extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, { text: 0, kind: 1, timeout: 2 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "NotifItem",
    			options,
    			id: create_fragment$3.name
    		});
    	}

    	get text() {
    		throw new Error("<NotifItem>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set text(value) {
    		throw new Error("<NotifItem>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get kind() {
    		throw new Error("<NotifItem>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set kind(value) {
    		throw new Error("<NotifItem>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get timeout() {
    		throw new Error("<NotifItem>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set timeout(value) {
    		throw new Error("<NotifItem>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* node_modules/wui.svelte/src/components/Notif.svelte generated by Svelte v3.24.1 */
    const file$4 = "node_modules/wui.svelte/src/components/Notif.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[2] = list[i];
    	return child_ctx;
    }

    // (41:1) {#each $messages as msg (msg)}
    function create_each_block(key_1, ctx) {
    	let first;
    	let notifitem;
    	let current;

    	notifitem = new NotifItem({
    			props: {
    				text: /*msg*/ ctx[2].text,
    				kind: /*msg*/ ctx[2].kind,
    				timeout: /*timeout*/ ctx[0]
    			},
    			$$inline: true
    		});

    	const block = {
    		key: key_1,
    		first: null,
    		c: function create() {
    			first = empty();
    			create_component(notifitem.$$.fragment);
    			this.first = first;
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, first, anchor);
    			mount_component(notifitem, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const notifitem_changes = {};
    			if (dirty & /*$messages*/ 2) notifitem_changes.text = /*msg*/ ctx[2].text;
    			if (dirty & /*$messages*/ 2) notifitem_changes.kind = /*msg*/ ctx[2].kind;
    			if (dirty & /*timeout*/ 1) notifitem_changes.timeout = /*timeout*/ ctx[0];
    			notifitem.$set(notifitem_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(notifitem.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(notifitem.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(first);
    			destroy_component(notifitem, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(41:1) {#each $messages as msg (msg)}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$4(ctx) {
    	let div;
    	let each_blocks = [];
    	let each_1_lookup = new Map();
    	let current;
    	let each_value = /*$messages*/ ctx[1];
    	validate_each_argument(each_value);
    	const get_key = ctx => /*msg*/ ctx[2];
    	validate_each_keys(ctx, each_value, get_each_context, get_key);

    	for (let i = 0; i < each_value.length; i += 1) {
    		let child_ctx = get_each_context(ctx, each_value, i);
    		let key = get_key(child_ctx);
    		each_1_lookup.set(key, each_blocks[i] = create_each_block(key, child_ctx));
    	}

    	const block = {
    		c: function create() {
    			div = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(div, "class", "wui-notif svelte-xdooa2");
    			add_location(div, file$4, 39, 0, 670);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div, null);
    			}

    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*$messages, timeout*/ 3) {
    				const each_value = /*$messages*/ ctx[1];
    				validate_each_argument(each_value);
    				group_outros();
    				validate_each_keys(ctx, each_value, get_each_context, get_key);
    				each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value, each_1_lookup, div, outro_and_destroy_block, create_each_block, null, get_each_context);
    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].d();
    			}
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    const WuiPushNotif = {
    	Info(text) {
    		const msg = { text };
    		messages.update(msgs => msgs = [...msgs, msg]);
    	},
    	Error(text) {
    		const msg = { text, kind: "error" };
    		messages.update(msgs => msgs = [...msgs, msg]);
    	}
    };

    function instance$4($$self, $$props, $$invalidate) {
    	let $messages;
    	validate_store(messages, "messages");
    	component_subscribe($$self, messages, $$value => $$invalidate(1, $messages = $$value));
    	let { timeout = 5000 } = $$props;
    	const writable_props = ["timeout"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Notif> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Notif", $$slots, []);

    	$$self.$$set = $$props => {
    		if ("timeout" in $$props) $$invalidate(0, timeout = $$props.timeout);
    	};

    	$$self.$capture_state = () => ({
    		messages,
    		NotifItem,
    		WuiPushNotif,
    		timeout,
    		$messages
    	});

    	$$self.$inject_state = $$props => {
    		if ("timeout" in $$props) $$invalidate(0, timeout = $$props.timeout);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [timeout, $messages];
    }

    class Notif extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, { timeout: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Notif",
    			options,
    			id: create_fragment$4.name
    		});
    	}

    	get timeout() {
    		throw new Error("<Notif>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set timeout(value) {
    		throw new Error("<Notif>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    const apiEnvironment = "/api/environment";
    const environment = writable({
    	NameServers: [],
    	HostsBlocks: [],
    	HostsFiles: {},
    	ZoneFiles: [],
    });
    const nanoSeconds = 1000000000;

    async function setEnvironment(got) {
    	got.PruneDelay = got.PruneDelay / nanoSeconds;
    	got.PruneThreshold = got.PruneThreshold / nanoSeconds;
    	for (const [key, value] of Object.entries(got.HostsFiles)) {
    		got.HostsFiles[key].Records = [];
    	}
    	environment.set(got);
    }

    const RRTypes = {
    	1: "A",
    	2: "NS",
    	5: "CNAME",
    	12: "PTR",
    	15: "MX",
    	16: "TXT",
    	28: "AAAA",
    };

    function getRRTypeName(k) {
    	let v = RRTypes[k];
    	if (v === "") {
    		return k
    	}
    	return v
    }

    /* src/Dashboard.svelte generated by Svelte v3.24.1 */
    const file$5 = "src/Dashboard.svelte";

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[8] = list[i];
    	return child_ctx;
    }

    function get_each_context_2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[8] = list[i];
    	return child_ctx;
    }

    function get_each_context_3(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[8] = list[i];
    	return child_ctx;
    }

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[5] = list[i];
    	return child_ctx;
    }

    // (100:3) {#if msg.Answer !== null && msg.Answer.length > 0}
    function create_if_block_2(ctx) {
    	let each_1_anchor;
    	let each_value_3 = /*msg*/ ctx[5].Answer;
    	validate_each_argument(each_value_3);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_3.length; i += 1) {
    		each_blocks[i] = create_each_block_3(get_each_context_3(ctx, each_value_3, i));
    	}

    	const block = {
    		c: function create() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each_1_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*listMsg, getRRTypeName*/ 2) {
    				each_value_3 = /*msg*/ ctx[5].Answer;
    				validate_each_argument(each_value_3);
    				let i;

    				for (i = 0; i < each_value_3.length; i += 1) {
    					const child_ctx = get_each_context_3(ctx, each_value_3, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_3(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_3.length;
    			}
    		},
    		d: function destroy(detaching) {
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(each_1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(100:3) {#if msg.Answer !== null && msg.Answer.length > 0}",
    		ctx
    	});

    	return block;
    }

    // (101:4) {#each msg.Answer as rr}
    function create_each_block_3(ctx) {
    	let div;
    	let span0;
    	let t1;
    	let span1;
    	let t2_value = getRRTypeName(/*rr*/ ctx[8].Type) + "";
    	let t2;
    	let t3;
    	let span2;
    	let t4_value = /*rr*/ ctx[8].TTL + "";
    	let t4;
    	let t5;
    	let span3;
    	let t6_value = /*rr*/ ctx[8].Value + "";
    	let t6;
    	let t7;

    	const block = {
    		c: function create() {
    			div = element("div");
    			span0 = element("span");
    			span0.textContent = "Answer";
    			t1 = space();
    			span1 = element("span");
    			t2 = text(t2_value);
    			t3 = space();
    			span2 = element("span");
    			t4 = text(t4_value);
    			t5 = space();
    			span3 = element("span");
    			t6 = text(t6_value);
    			t7 = space();
    			attr_dev(span0, "class", "kind svelte-1xo5wbm");
    			add_location(span0, file$5, 102, 6, 1888);
    			attr_dev(span1, "class", "type svelte-1xo5wbm");
    			add_location(span1, file$5, 103, 6, 1929);
    			attr_dev(span2, "class", "ttl svelte-1xo5wbm");
    			add_location(span2, file$5, 104, 6, 1988);
    			attr_dev(span3, "class", "value svelte-1xo5wbm");
    			add_location(span3, file$5, 105, 6, 2030);
    			attr_dev(div, "class", "rr svelte-1xo5wbm");
    			add_location(div, file$5, 101, 5, 1865);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, span0);
    			append_dev(div, t1);
    			append_dev(div, span1);
    			append_dev(span1, t2);
    			append_dev(div, t3);
    			append_dev(div, span2);
    			append_dev(span2, t4);
    			append_dev(div, t5);
    			append_dev(div, span3);
    			append_dev(span3, t6);
    			append_dev(div, t7);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*listMsg*/ 2 && t2_value !== (t2_value = getRRTypeName(/*rr*/ ctx[8].Type) + "")) set_data_dev(t2, t2_value);
    			if (dirty & /*listMsg*/ 2 && t4_value !== (t4_value = /*rr*/ ctx[8].TTL + "")) set_data_dev(t4, t4_value);
    			if (dirty & /*listMsg*/ 2 && t6_value !== (t6_value = /*rr*/ ctx[8].Value + "")) set_data_dev(t6, t6_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_3.name,
    		type: "each",
    		source: "(101:4) {#each msg.Answer as rr}",
    		ctx
    	});

    	return block;
    }

    // (110:3) {#if msg.Authority !== null && msg.Authority.length > 0}
    function create_if_block_1(ctx) {
    	let each_1_anchor;
    	let each_value_2 = /*msg*/ ctx[5].Authority;
    	validate_each_argument(each_value_2);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_2.length; i += 1) {
    		each_blocks[i] = create_each_block_2(get_each_context_2(ctx, each_value_2, i));
    	}

    	const block = {
    		c: function create() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each_1_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*listMsg, getRRTypeName*/ 2) {
    				each_value_2 = /*msg*/ ctx[5].Authority;
    				validate_each_argument(each_value_2);
    				let i;

    				for (i = 0; i < each_value_2.length; i += 1) {
    					const child_ctx = get_each_context_2(ctx, each_value_2, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_2(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_2.length;
    			}
    		},
    		d: function destroy(detaching) {
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(each_1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(110:3) {#if msg.Authority !== null && msg.Authority.length > 0}",
    		ctx
    	});

    	return block;
    }

    // (111:4) {#each msg.Authority as rr}
    function create_each_block_2(ctx) {
    	let div;
    	let span0;
    	let t1;
    	let span1;
    	let t2_value = getRRTypeName(/*rr*/ ctx[8].Type) + "";
    	let t2;
    	let t3;
    	let span2;
    	let t4_value = /*rr*/ ctx[8].TTL + "";
    	let t4;
    	let t5;
    	let span3;
    	let t6_value = /*rr*/ ctx[8].Value + "";
    	let t6;
    	let t7;

    	const block = {
    		c: function create() {
    			div = element("div");
    			span0 = element("span");
    			span0.textContent = "Authority";
    			t1 = space();
    			span1 = element("span");
    			t2 = text(t2_value);
    			t3 = space();
    			span2 = element("span");
    			t4 = text(t4_value);
    			t5 = space();
    			span3 = element("span");
    			t6 = text(t6_value);
    			t7 = space();
    			attr_dev(span0, "class", "kind svelte-1xo5wbm");
    			add_location(span0, file$5, 112, 6, 2223);
    			attr_dev(span1, "class", "type svelte-1xo5wbm");
    			add_location(span1, file$5, 113, 6, 2267);
    			attr_dev(span2, "class", "ttl svelte-1xo5wbm");
    			add_location(span2, file$5, 114, 6, 2326);
    			attr_dev(span3, "class", "value svelte-1xo5wbm");
    			add_location(span3, file$5, 115, 6, 2368);
    			attr_dev(div, "class", "rr svelte-1xo5wbm");
    			add_location(div, file$5, 111, 5, 2200);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, span0);
    			append_dev(div, t1);
    			append_dev(div, span1);
    			append_dev(span1, t2);
    			append_dev(div, t3);
    			append_dev(div, span2);
    			append_dev(span2, t4);
    			append_dev(div, t5);
    			append_dev(div, span3);
    			append_dev(span3, t6);
    			append_dev(div, t7);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*listMsg*/ 2 && t2_value !== (t2_value = getRRTypeName(/*rr*/ ctx[8].Type) + "")) set_data_dev(t2, t2_value);
    			if (dirty & /*listMsg*/ 2 && t4_value !== (t4_value = /*rr*/ ctx[8].TTL + "")) set_data_dev(t4, t4_value);
    			if (dirty & /*listMsg*/ 2 && t6_value !== (t6_value = /*rr*/ ctx[8].Value + "")) set_data_dev(t6, t6_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_2.name,
    		type: "each",
    		source: "(111:4) {#each msg.Authority as rr}",
    		ctx
    	});

    	return block;
    }

    // (120:3) {#if msg.Additional !== null && msg.Additional.length > 0}
    function create_if_block$3(ctx) {
    	let each_1_anchor;
    	let each_value_1 = /*msg*/ ctx[5].Additional;
    	validate_each_argument(each_value_1);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	const block = {
    		c: function create() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each_1_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*listMsg, getRRTypeName*/ 2) {
    				each_value_1 = /*msg*/ ctx[5].Additional;
    				validate_each_argument(each_value_1);
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_1.length;
    			}
    		},
    		d: function destroy(detaching) {
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(each_1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$3.name,
    		type: "if",
    		source: "(120:3) {#if msg.Additional !== null && msg.Additional.length > 0}",
    		ctx
    	});

    	return block;
    }

    // (121:4) {#each msg.Additional as rr}
    function create_each_block_1(ctx) {
    	let div;
    	let span0;
    	let t1;
    	let span1;
    	let t2_value = getRRTypeName(/*rr*/ ctx[8].Type) + "";
    	let t2;
    	let t3;
    	let span2;
    	let t4_value = /*rr*/ ctx[8].TTL + "";
    	let t4;
    	let t5;
    	let span3;
    	let t6_value = /*rr*/ ctx[8].Value + "";
    	let t6;
    	let t7;

    	const block = {
    		c: function create() {
    			div = element("div");
    			span0 = element("span");
    			span0.textContent = "Additional";
    			t1 = space();
    			span1 = element("span");
    			t2 = text(t2_value);
    			t3 = space();
    			span2 = element("span");
    			t4 = text(t4_value);
    			t5 = space();
    			span3 = element("span");
    			t6 = text(t6_value);
    			t7 = space();
    			attr_dev(span0, "class", "kind svelte-1xo5wbm");
    			add_location(span0, file$5, 122, 6, 2564);
    			attr_dev(span1, "class", "type svelte-1xo5wbm");
    			add_location(span1, file$5, 123, 6, 2609);
    			attr_dev(span2, "class", "ttl svelte-1xo5wbm");
    			add_location(span2, file$5, 124, 6, 2668);
    			attr_dev(span3, "class", "value svelte-1xo5wbm");
    			add_location(span3, file$5, 125, 6, 2710);
    			attr_dev(div, "class", "rr svelte-1xo5wbm");
    			add_location(div, file$5, 121, 5, 2541);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, span0);
    			append_dev(div, t1);
    			append_dev(div, span1);
    			append_dev(span1, t2);
    			append_dev(div, t3);
    			append_dev(div, span2);
    			append_dev(span2, t4);
    			append_dev(div, t5);
    			append_dev(div, span3);
    			append_dev(span3, t6);
    			append_dev(div, t7);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*listMsg*/ 2 && t2_value !== (t2_value = getRRTypeName(/*rr*/ ctx[8].Type) + "")) set_data_dev(t2, t2_value);
    			if (dirty & /*listMsg*/ 2 && t4_value !== (t4_value = /*rr*/ ctx[8].TTL + "")) set_data_dev(t4, t4_value);
    			if (dirty & /*listMsg*/ 2 && t6_value !== (t6_value = /*rr*/ ctx[8].Value + "")) set_data_dev(t6, t6_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1.name,
    		type: "each",
    		source: "(121:4) {#each msg.Additional as rr}",
    		ctx
    	});

    	return block;
    }

    // (81:1) {#each listMsg as msg (msg)}
    function create_each_block$1(key_1, ctx) {
    	let div2;
    	let div0;
    	let t0_value = /*msg*/ ctx[5].Question.Name + "";
    	let t0;
    	let t1;
    	let button;
    	let t3;
    	let div1;
    	let span0;
    	let t4;
    	let span1;
    	let t6;
    	let span2;
    	let t8;
    	let span3;
    	let t10;
    	let t11;
    	let t12;
    	let t13;
    	let mounted;
    	let dispose;
    	let if_block0 = /*msg*/ ctx[5].Answer !== null && /*msg*/ ctx[5].Answer.length > 0 && create_if_block_2(ctx);
    	let if_block1 = /*msg*/ ctx[5].Authority !== null && /*msg*/ ctx[5].Authority.length > 0 && create_if_block_1(ctx);
    	let if_block2 = /*msg*/ ctx[5].Additional !== null && /*msg*/ ctx[5].Additional.length > 0 && create_if_block$3(ctx);

    	const block = {
    		key: key_1,
    		first: null,
    		c: function create() {
    			div2 = element("div");
    			div0 = element("div");
    			t0 = text(t0_value);
    			t1 = space();
    			button = element("button");
    			button.textContent = "Remove from caches";
    			t3 = space();
    			div1 = element("div");
    			span0 = element("span");
    			t4 = space();
    			span1 = element("span");
    			span1.textContent = "Type";
    			t6 = space();
    			span2 = element("span");
    			span2.textContent = "TTL";
    			t8 = space();
    			span3 = element("span");
    			span3.textContent = "Value";
    			t10 = space();
    			if (if_block0) if_block0.c();
    			t11 = space();
    			if (if_block1) if_block1.c();
    			t12 = space();
    			if (if_block2) if_block2.c();
    			t13 = space();
    			attr_dev(button, "class", "b-remove");
    			add_location(button, file$5, 85, 4, 1454);
    			attr_dev(div0, "class", "qname");
    			add_location(div0, file$5, 82, 3, 1405);
    			attr_dev(span0, "class", "kind svelte-1xo5wbm");
    			add_location(span0, file$5, 93, 4, 1627);
    			attr_dev(span1, "class", "type svelte-1xo5wbm");
    			add_location(span1, file$5, 94, 4, 1659);
    			attr_dev(span2, "class", "ttl svelte-1xo5wbm");
    			add_location(span2, file$5, 95, 4, 1696);
    			attr_dev(span3, "class", "value svelte-1xo5wbm");
    			add_location(span3, file$5, 96, 4, 1731);
    			attr_dev(div1, "class", "rr header svelte-1xo5wbm");
    			add_location(div1, file$5, 92, 3, 1599);
    			attr_dev(div2, "class", "message svelte-1xo5wbm");
    			add_location(div2, file$5, 81, 2, 1380);
    			this.first = div2;
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div0);
    			append_dev(div0, t0);
    			append_dev(div0, t1);
    			append_dev(div0, button);
    			append_dev(div2, t3);
    			append_dev(div2, div1);
    			append_dev(div1, span0);
    			append_dev(div1, t4);
    			append_dev(div1, span1);
    			append_dev(div1, t6);
    			append_dev(div1, span2);
    			append_dev(div1, t8);
    			append_dev(div1, span3);
    			append_dev(div2, t10);
    			if (if_block0) if_block0.m(div2, null);
    			append_dev(div2, t11);
    			if (if_block1) if_block1.m(div2, null);
    			append_dev(div2, t12);
    			if (if_block2) if_block2.m(div2, null);
    			append_dev(div2, t13);

    			if (!mounted) {
    				dispose = listen_dev(
    					button,
    					"click",
    					function () {
    						if (is_function(/*handleRemoveFromCaches*/ ctx[3](/*msg*/ ctx[5].Question.Name))) /*handleRemoveFromCaches*/ ctx[3](/*msg*/ ctx[5].Question.Name).apply(this, arguments);
    					},
    					false,
    					false,
    					false
    				);

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty & /*listMsg*/ 2 && t0_value !== (t0_value = /*msg*/ ctx[5].Question.Name + "")) set_data_dev(t0, t0_value);

    			if (/*msg*/ ctx[5].Answer !== null && /*msg*/ ctx[5].Answer.length > 0) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_2(ctx);
    					if_block0.c();
    					if_block0.m(div2, t11);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (/*msg*/ ctx[5].Authority !== null && /*msg*/ ctx[5].Authority.length > 0) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    				} else {
    					if_block1 = create_if_block_1(ctx);
    					if_block1.c();
    					if_block1.m(div2, t12);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}

    			if (/*msg*/ ctx[5].Additional !== null && /*msg*/ ctx[5].Additional.length > 0) {
    				if (if_block2) {
    					if_block2.p(ctx, dirty);
    				} else {
    					if_block2 = create_if_block$3(ctx);
    					if_block2.c();
    					if_block2.m(div2, t13);
    				}
    			} else if (if_block2) {
    				if_block2.d(1);
    				if_block2 = null;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
    			if (if_block2) if_block2.d();
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$1.name,
    		type: "each",
    		source: "(81:1) {#each listMsg as msg (msg)}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$5(ctx) {
    	let div1;
    	let div0;
    	let t0;
    	let input;
    	let t1;
    	let button;
    	let t3;
    	let each_blocks = [];
    	let each_1_lookup = new Map();
    	let mounted;
    	let dispose;
    	let each_value = /*listMsg*/ ctx[1];
    	validate_each_argument(each_value);
    	const get_key = ctx => /*msg*/ ctx[5];
    	validate_each_keys(ctx, each_value, get_each_context$1, get_key);

    	for (let i = 0; i < each_value.length; i += 1) {
    		let child_ctx = get_each_context$1(ctx, each_value, i);
    		let key = get_key(child_ctx);
    		each_1_lookup.set(key, each_blocks[i] = create_each_block$1(key, child_ctx));
    	}

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");
    			t0 = text("Caches:\n\t\t");
    			input = element("input");
    			t1 = space();
    			button = element("button");
    			button.textContent = "Search";
    			t3 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			add_location(input, file$5, 75, 2, 1256);
    			add_location(button, file$5, 76, 2, 1285);
    			attr_dev(div0, "class", "search");
    			add_location(div0, file$5, 73, 1, 1223);
    			attr_dev(div1, "class", "dashboard");
    			add_location(div1, file$5, 72, 0, 1198);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			append_dev(div0, t0);
    			append_dev(div0, input);
    			set_input_value(input, /*query*/ ctx[0]);
    			append_dev(div0, t1);
    			append_dev(div0, button);
    			append_dev(div1, t3);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div1, null);
    			}

    			if (!mounted) {
    				dispose = [
    					listen_dev(input, "input", /*input_input_handler*/ ctx[4]),
    					listen_dev(button, "click", /*handleSearch*/ ctx[2], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*query*/ 1 && input.value !== /*query*/ ctx[0]) {
    				set_input_value(input, /*query*/ ctx[0]);
    			}

    			if (dirty & /*listMsg, getRRTypeName, handleRemoveFromCaches*/ 10) {
    				const each_value = /*listMsg*/ ctx[1];
    				validate_each_argument(each_value);
    				validate_each_keys(ctx, each_value, get_each_context$1, get_key);
    				each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value, each_1_lookup, div1, destroy_block, create_each_block$1, null, get_each_context$1);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].d();
    			}

    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    const apiCaches = "/api/caches";

    function instance$5($$self, $$props, $$invalidate) {
    	let query = "";
    	let listMsg = [];

    	async function handleSearch() {
    		const res = await fetch(apiCaches + "?query=" + query);

    		if (res.status >= 400) {
    			const resbody = await res.json();
    			WuiPushNotif.Error("ERROR: " + resbody.message);
    			return;
    		}

    		$$invalidate(1, listMsg = await res.json());
    	}

    	async function handleRemoveFromCaches(name) {
    		const res = await fetch(apiCaches + "?name=" + name, { method: "DELETE" });

    		if (res.status >= 400) {
    			const resbody = await res.json();
    			WuiPushNotif.Error("ERROR: " + resbody.message);
    			return;
    		}

    		for (let x = 0; x < listMsg.length; x++) {
    			if (listMsg[x].Question.Name === name) {
    				listMsg.splice(x, 1);
    				$$invalidate(1, listMsg);
    				break;
    			}
    		}

    		const msg = await res.json();
    		WuiPushNotif.Info(msg.message);
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Dashboard> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Dashboard", $$slots, []);

    	function input_input_handler() {
    		query = this.value;
    		$$invalidate(0, query);
    	}

    	$$self.$capture_state = () => ({
    		WuiPushNotif,
    		getRRTypeName,
    		apiCaches,
    		query,
    		listMsg,
    		handleSearch,
    		handleRemoveFromCaches
    	});

    	$$self.$inject_state = $$props => {
    		if ("query" in $$props) $$invalidate(0, query = $$props.query);
    		if ("listMsg" in $$props) $$invalidate(1, listMsg = $$props.listMsg);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [query, listMsg, handleSearch, handleRemoveFromCaches, input_input_handler];
    }

    class Dashboard extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Dashboard",
    			options,
    			id: create_fragment$5.name
    		});
    	}
    }

    /* src/Environment.svelte generated by Svelte v3.24.1 */

    const { Object: Object_1 } = globals;
    const file$6 = "src/Environment.svelte";

    function get_each_context$2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[17] = list[i];
    	child_ctx[18] = list;
    	child_ctx[19] = i;
    	return child_ctx;
    }

    // (97:1) <WuiLabelHint   title="System resolv.conf"   title_width="{defTitleWidth}"   info="A path to dynamically generated resolv.conf(5) by resolvconf(8).  If set, the nameserver values in referenced file will replace 'parent' value and 'parent' will become a fallback in case the referenced file being deleted or can not be parsed."  >
    function create_default_slot_11(ctx) {
    	let input;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			input = element("input");
    			attr_dev(input, "class", "svelte-ivqrh9");
    			add_location(input, file$6, 104, 2, 2224);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, input, anchor);
    			set_input_value(input, /*env*/ ctx[0].FileResolvConf);

    			if (!mounted) {
    				dispose = listen_dev(input, "input", /*input_input_handler*/ ctx[4]);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*env*/ 1 && input.value !== /*env*/ ctx[0].FileResolvConf) {
    				set_input_value(input, /*env*/ ctx[0].FileResolvConf);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(input);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_11.name,
    		type: "slot",
    		source: "(97:1) <WuiLabelHint   title=\\\"System resolv.conf\\\"   title_width=\\\"{defTitleWidth}\\\"   info=\\\"A path to dynamically generated resolv.conf(5) by resolvconf(8).  If set, the nameserver values in referenced file will replace 'parent' value and 'parent' will become a fallback in case the referenced file being deleted or can not be parsed.\\\"  >",
    		ctx
    	});

    	return block;
    }

    // (110:1) <WuiLabelHint   title="Debug level"   title_width="{defTitleWidth}"   info="This option only used for debugging program or if user want to monitor what kind of traffic goes in and out of rescached."  >
    function create_default_slot_10(ctx) {
    	let wuiinputnumber;
    	let updating_value;
    	let current;

    	function wuiinputnumber_value_binding(value) {
    		/*wuiinputnumber_value_binding*/ ctx[5].call(null, value);
    	}

    	let wuiinputnumber_props = { min: "0", max: "3", unit: "" };

    	if (/*env*/ ctx[0].Debug !== void 0) {
    		wuiinputnumber_props.value = /*env*/ ctx[0].Debug;
    	}

    	wuiinputnumber = new InputNumber({
    			props: wuiinputnumber_props,
    			$$inline: true
    		});

    	binding_callbacks.push(() => bind(wuiinputnumber, "value", wuiinputnumber_value_binding));

    	const block = {
    		c: function create() {
    			create_component(wuiinputnumber.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(wuiinputnumber, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const wuiinputnumber_changes = {};

    			if (!updating_value && dirty & /*env*/ 1) {
    				updating_value = true;
    				wuiinputnumber_changes.value = /*env*/ ctx[0].Debug;
    				add_flush_callback(() => updating_value = false);
    			}

    			wuiinputnumber.$set(wuiinputnumber_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(wuiinputnumber.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(wuiinputnumber.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(wuiinputnumber, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_10.name,
    		type: "slot",
    		source: "(110:1) <WuiLabelHint   title=\\\"Debug level\\\"   title_width=\\\"{defTitleWidth}\\\"   info=\\\"This option only used for debugging program or if user want to monitor what kind of traffic goes in and out of rescached.\\\"  >",
    		ctx
    	});

    	return block;
    }

    // (134:1) {#each env.NameServers as ns}
    function create_each_block$2(ctx) {
    	let div;
    	let input;
    	let t0;
    	let button;
    	let mounted;
    	let dispose;

    	function input_input_handler_1() {
    		/*input_input_handler_1*/ ctx[6].call(input, /*each_value*/ ctx[18], /*ns_index*/ ctx[19]);
    	}

    	const block = {
    		c: function create() {
    			div = element("div");
    			input = element("input");
    			t0 = space();
    			button = element("button");
    			button.textContent = "Delete";
    			attr_dev(input, "class", "svelte-ivqrh9");
    			add_location(input, file$6, 135, 2, 2820);
    			attr_dev(button, "class", "svelte-ivqrh9");
    			add_location(button, file$6, 136, 2, 2846);
    			attr_dev(div, "class", "input-deletable svelte-ivqrh9");
    			add_location(div, file$6, 134, 1, 2788);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, input);
    			set_input_value(input, /*ns*/ ctx[17]);
    			append_dev(div, t0);
    			append_dev(div, button);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input, "input", input_input_handler_1),
    					listen_dev(
    						button,
    						"click",
    						function () {
    							if (is_function(/*deleteNameServer*/ ctx[2](/*ns*/ ctx[17]))) /*deleteNameServer*/ ctx[2](/*ns*/ ctx[17]).apply(this, arguments);
    						},
    						false,
    						false,
    						false
    					)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (dirty & /*env*/ 1 && input.value !== /*ns*/ ctx[17]) {
    				set_input_value(input, /*ns*/ ctx[17]);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$2.name,
    		type: "each",
    		source: "(134:1) {#each env.NameServers as ns}",
    		ctx
    	});

    	return block;
    }

    // (149:1) <WuiLabelHint   title="Listen address"   title_width="{defTitleWidth}"   info="Address in local network where rescached will listening for query from client through UDP and TCP. <br/> If you want rescached to serve a query from another host in your local network, change this value to <tt>0.0.0.0:53</tt>."  >
    function create_default_slot_8(ctx) {
    	let wuiinputipport;
    	let updating_value;
    	let current;

    	function wuiinputipport_value_binding(value) {
    		/*wuiinputipport_value_binding*/ ctx[7].call(null, value);
    	}

    	let wuiinputipport_props = {};

    	if (/*env*/ ctx[0].ListenAddress !== void 0) {
    		wuiinputipport_props.value = /*env*/ ctx[0].ListenAddress;
    	}

    	wuiinputipport = new InputIPPort({
    			props: wuiinputipport_props,
    			$$inline: true
    		});

    	binding_callbacks.push(() => bind(wuiinputipport, "value", wuiinputipport_value_binding));

    	const block = {
    		c: function create() {
    			create_component(wuiinputipport.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(wuiinputipport, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const wuiinputipport_changes = {};

    			if (!updating_value && dirty & /*env*/ 1) {
    				updating_value = true;
    				wuiinputipport_changes.value = /*env*/ ctx[0].ListenAddress;
    				add_flush_callback(() => updating_value = false);
    			}

    			wuiinputipport.$set(wuiinputipport_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(wuiinputipport.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(wuiinputipport.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(wuiinputipport, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_8.name,
    		type: "slot",
    		source: "(149:1) <WuiLabelHint   title=\\\"Listen address\\\"   title_width=\\\"{defTitleWidth}\\\"   info=\\\"Address in local network where rescached will listening for query from client through UDP and TCP. <br/> If you want rescached to serve a query from another host in your local network, change this value to <tt>0.0.0.0:53</tt>.\\\"  >",
    		ctx
    	});

    	return block;
    }

    // (163:1) <WuiLabelHint   title="HTTP listen port"   title_width="{defTitleWidth}"   info="Port to serve DNS over HTTP"  >
    function create_default_slot_7(ctx) {
    	let wuiinputnumber;
    	let updating_value;
    	let current;

    	function wuiinputnumber_value_binding_1(value) {
    		/*wuiinputnumber_value_binding_1*/ ctx[8].call(null, value);
    	}

    	let wuiinputnumber_props = { min: "0", max: "65535", unit: "" };

    	if (/*env*/ ctx[0].HTTPPort !== void 0) {
    		wuiinputnumber_props.value = /*env*/ ctx[0].HTTPPort;
    	}

    	wuiinputnumber = new InputNumber({
    			props: wuiinputnumber_props,
    			$$inline: true
    		});

    	binding_callbacks.push(() => bind(wuiinputnumber, "value", wuiinputnumber_value_binding_1));

    	const block = {
    		c: function create() {
    			create_component(wuiinputnumber.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(wuiinputnumber, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const wuiinputnumber_changes = {};

    			if (!updating_value && dirty & /*env*/ 1) {
    				updating_value = true;
    				wuiinputnumber_changes.value = /*env*/ ctx[0].HTTPPort;
    				add_flush_callback(() => updating_value = false);
    			}

    			wuiinputnumber.$set(wuiinputnumber_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(wuiinputnumber.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(wuiinputnumber.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(wuiinputnumber, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_7.name,
    		type: "slot",
    		source: "(163:1) <WuiLabelHint   title=\\\"HTTP listen port\\\"   title_width=\\\"{defTitleWidth}\\\"   info=\\\"Port to serve DNS over HTTP\\\"  >",
    		ctx
    	});

    	return block;
    }

    // (176:1) <WuiLabelHint   title="TLS listen port"   title_width="{defTitleWidth}"   info="Port to listen for DNS over TLS"  >
    function create_default_slot_6(ctx) {
    	let wuiinputnumber;
    	let updating_value;
    	let current;

    	function wuiinputnumber_value_binding_2(value) {
    		/*wuiinputnumber_value_binding_2*/ ctx[9].call(null, value);
    	}

    	let wuiinputnumber_props = { min: "0", max: "65535", unit: "" };

    	if (/*env*/ ctx[0].TLSPort !== void 0) {
    		wuiinputnumber_props.value = /*env*/ ctx[0].TLSPort;
    	}

    	wuiinputnumber = new InputNumber({
    			props: wuiinputnumber_props,
    			$$inline: true
    		});

    	binding_callbacks.push(() => bind(wuiinputnumber, "value", wuiinputnumber_value_binding_2));

    	const block = {
    		c: function create() {
    			create_component(wuiinputnumber.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(wuiinputnumber, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const wuiinputnumber_changes = {};

    			if (!updating_value && dirty & /*env*/ 1) {
    				updating_value = true;
    				wuiinputnumber_changes.value = /*env*/ ctx[0].TLSPort;
    				add_flush_callback(() => updating_value = false);
    			}

    			wuiinputnumber.$set(wuiinputnumber_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(wuiinputnumber.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(wuiinputnumber.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(wuiinputnumber, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_6.name,
    		type: "slot",
    		source: "(176:1) <WuiLabelHint   title=\\\"TLS listen port\\\"   title_width=\\\"{defTitleWidth}\\\"   info=\\\"Port to listen for DNS over TLS\\\"  >",
    		ctx
    	});

    	return block;
    }

    // (189:1) <WuiLabelHint   title="TLS certificate"   title_width="{defTitleWidth}"   info="Path to certificate file to serve DNS over TLS and HTTPS">
    function create_default_slot_5(ctx) {
    	let input;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			input = element("input");
    			attr_dev(input, "placeholder", "/path/to/certificate");
    			attr_dev(input, "class", "svelte-ivqrh9");
    			add_location(input, file$6, 193, 2, 3948);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, input, anchor);
    			set_input_value(input, /*env*/ ctx[0].TLSCertFile);

    			if (!mounted) {
    				dispose = listen_dev(input, "input", /*input_input_handler_2*/ ctx[10]);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*env*/ 1 && input.value !== /*env*/ ctx[0].TLSCertFile) {
    				set_input_value(input, /*env*/ ctx[0].TLSCertFile);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(input);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_5.name,
    		type: "slot",
    		source: "(189:1) <WuiLabelHint   title=\\\"TLS certificate\\\"   title_width=\\\"{defTitleWidth}\\\"   info=\\\"Path to certificate file to serve DNS over TLS and HTTPS\\\">",
    		ctx
    	});

    	return block;
    }

    // (200:1) <WuiLabelHint   title="TLS private key"   title_width="{defTitleWidth}"   info="Path to certificate private key file to serve DNS over TLS and HTTPS."  >
    function create_default_slot_4(ctx) {
    	let input;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			input = element("input");
    			attr_dev(input, "placeholder", "/path/to/certificate/private.key");
    			attr_dev(input, "class", "svelte-ivqrh9");
    			add_location(input, file$6, 205, 2, 4205);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, input, anchor);
    			set_input_value(input, /*env*/ ctx[0].TLSPrivateKey);

    			if (!mounted) {
    				dispose = listen_dev(input, "input", /*input_input_handler_3*/ ctx[11]);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*env*/ 1 && input.value !== /*env*/ ctx[0].TLSPrivateKey) {
    				set_input_value(input, /*env*/ ctx[0].TLSPrivateKey);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(input);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_4.name,
    		type: "slot",
    		source: "(200:1) <WuiLabelHint   title=\\\"TLS private key\\\"   title_width=\\\"{defTitleWidth}\\\"   info=\\\"Path to certificate private key file to serve DNS over TLS and HTTPS.\\\"  >",
    		ctx
    	});

    	return block;
    }

    // (212:1) <WuiLabelHint   title="TLS allow insecure"   title_width="{defTitleWidth}"   info="If its true, allow serving DoH and DoT with self signed certificate."  >
    function create_default_slot_3(ctx) {
    	let div;
    	let input;
    	let t0;
    	let span;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div = element("div");
    			input = element("input");
    			t0 = space();
    			span = element("span");
    			span.textContent = "Yes";
    			attr_dev(input, "type", "checkbox");
    			attr_dev(input, "class", "svelte-ivqrh9");
    			add_location(input, file$6, 218, 3, 4510);
    			attr_dev(span, "class", "suffix");
    			add_location(span, file$6, 222, 3, 4583);
    			attr_dev(div, "class", "input-checkbox svelte-ivqrh9");
    			add_location(div, file$6, 217, 2, 4478);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, input);
    			input.checked = /*env*/ ctx[0].TLSAllowInsecure;
    			append_dev(div, t0);
    			append_dev(div, span);

    			if (!mounted) {
    				dispose = listen_dev(input, "change", /*input_change_handler*/ ctx[12]);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*env*/ 1) {
    				input.checked = /*env*/ ctx[0].TLSAllowInsecure;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_3.name,
    		type: "slot",
    		source: "(212:1) <WuiLabelHint   title=\\\"TLS allow insecure\\\"   title_width=\\\"{defTitleWidth}\\\"   info=\\\"If its true, allow serving DoH and DoT with self signed certificate.\\\"  >",
    		ctx
    	});

    	return block;
    }

    // (229:1) <WuiLabelHint   title="DoH behind proxy"   title_width="{defTitleWidth}"   info="If its true, serve DNS over HTTP only, even if certificate files is defined. This allow serving DNS request forwarded by another proxy server."  >
    function create_default_slot_2(ctx) {
    	let div;
    	let input;
    	let t0;
    	let span;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div = element("div");
    			input = element("input");
    			t0 = space();
    			span = element("span");
    			span.textContent = "Yes";
    			attr_dev(input, "type", "checkbox");
    			attr_dev(input, "class", "svelte-ivqrh9");
    			add_location(input, file$6, 236, 3, 4914);
    			attr_dev(span, "class", "suffix");
    			add_location(span, file$6, 240, 3, 4985);
    			attr_dev(div, "class", "input-checkbox svelte-ivqrh9");
    			add_location(div, file$6, 235, 2, 4882);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, input);
    			input.checked = /*env*/ ctx[0].DoHBehindProxy;
    			append_dev(div, t0);
    			append_dev(div, span);

    			if (!mounted) {
    				dispose = listen_dev(input, "change", /*input_change_handler_1*/ ctx[13]);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*env*/ 1) {
    				input.checked = /*env*/ ctx[0].DoHBehindProxy;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_2.name,
    		type: "slot",
    		source: "(229:1) <WuiLabelHint   title=\\\"DoH behind proxy\\\"   title_width=\\\"{defTitleWidth}\\\"   info=\\\"If its true, serve DNS over HTTP only, even if certificate files is defined. This allow serving DNS request forwarded by another proxy server.\\\"  >",
    		ctx
    	});

    	return block;
    }

    // (247:1) <WuiLabelHint   title="Prune delay"   title_width="{defTitleWidth}"   info="Delay for pruning caches. Every N seconds, rescached will traverse all caches and remove response that has not been accessed less than cache.prune_threshold. Its value must be equal or greater than 1 hour (3600 seconds). "  >
    function create_default_slot_1(ctx) {
    	let wuiinputnumber;
    	let updating_value;
    	let current;

    	function wuiinputnumber_value_binding_3(value) {
    		/*wuiinputnumber_value_binding_3*/ ctx[14].call(null, value);
    	}

    	let wuiinputnumber_props = {
    		min: "3600",
    		max: "36000",
    		unit: "seconds"
    	};

    	if (/*env*/ ctx[0].PruneDelay !== void 0) {
    		wuiinputnumber_props.value = /*env*/ ctx[0].PruneDelay;
    	}

    	wuiinputnumber = new InputNumber({
    			props: wuiinputnumber_props,
    			$$inline: true
    		});

    	binding_callbacks.push(() => bind(wuiinputnumber, "value", wuiinputnumber_value_binding_3));

    	const block = {
    		c: function create() {
    			create_component(wuiinputnumber.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(wuiinputnumber, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const wuiinputnumber_changes = {};

    			if (!updating_value && dirty & /*env*/ 1) {
    				updating_value = true;
    				wuiinputnumber_changes.value = /*env*/ ctx[0].PruneDelay;
    				add_flush_callback(() => updating_value = false);
    			}

    			wuiinputnumber.$set(wuiinputnumber_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(wuiinputnumber.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(wuiinputnumber.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(wuiinputnumber, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_1.name,
    		type: "slot",
    		source: "(247:1) <WuiLabelHint   title=\\\"Prune delay\\\"   title_width=\\\"{defTitleWidth}\\\"   info=\\\"Delay for pruning caches. Every N seconds, rescached will traverse all caches and remove response that has not been accessed less than cache.prune_threshold. Its value must be equal or greater than 1 hour (3600 seconds). \\\"  >",
    		ctx
    	});

    	return block;
    }

    // (264:1) <WuiLabelHint   title="Prune threshold"   title_width="{defTitleWidth}"   info="The duration when the cache will be considered expired. Its value must be negative and greater or equal than -1 hour (-3600 seconds)."  >
    function create_default_slot(ctx) {
    	let wuiinputnumber;
    	let updating_value;
    	let current;

    	function wuiinputnumber_value_binding_4(value) {
    		/*wuiinputnumber_value_binding_4*/ ctx[15].call(null, value);
    	}

    	let wuiinputnumber_props = {
    		min: "-36000",
    		max: "-3600",
    		unit: "seconds"
    	};

    	if (/*env*/ ctx[0].PruneThreshold !== void 0) {
    		wuiinputnumber_props.value = /*env*/ ctx[0].PruneThreshold;
    	}

    	wuiinputnumber = new InputNumber({
    			props: wuiinputnumber_props,
    			$$inline: true
    		});

    	binding_callbacks.push(() => bind(wuiinputnumber, "value", wuiinputnumber_value_binding_4));

    	const block = {
    		c: function create() {
    			create_component(wuiinputnumber.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(wuiinputnumber, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const wuiinputnumber_changes = {};

    			if (!updating_value && dirty & /*env*/ 1) {
    				updating_value = true;
    				wuiinputnumber_changes.value = /*env*/ ctx[0].PruneThreshold;
    				add_flush_callback(() => updating_value = false);
    			}

    			wuiinputnumber.$set(wuiinputnumber_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(wuiinputnumber.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(wuiinputnumber.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(wuiinputnumber, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot.name,
    		type: "slot",
    		source: "(264:1) <WuiLabelHint   title=\\\"Prune threshold\\\"   title_width=\\\"{defTitleWidth}\\\"   info=\\\"The duration when the cache will be considered expired. Its value must be negative and greater or equal than -1 hour (-3600 seconds).\\\"  >",
    		ctx
    	});

    	return block;
    }

    function create_fragment$6(ctx) {
    	let div4;
    	let p;
    	let t1;
    	let h30;
    	let t3;
    	let div0;
    	let wuilabelhint0;
    	let t4;
    	let wuilabelhint1;
    	let t5;
    	let h31;
    	let t7;
    	let div1;
    	let wuilabelhint2;
    	let t8;
    	let t9;
    	let button0;
    	let t11;
    	let wuilabelhint3;
    	let t12;
    	let wuilabelhint4;
    	let t13;
    	let wuilabelhint5;
    	let t14;
    	let wuilabelhint6;
    	let t15;
    	let wuilabelhint7;
    	let t16;
    	let wuilabelhint8;
    	let t17;
    	let wuilabelhint9;
    	let t18;
    	let wuilabelhint10;
    	let t19;
    	let wuilabelhint11;
    	let t20;
    	let div3;
    	let div2;
    	let button1;
    	let current;
    	let mounted;
    	let dispose;

    	wuilabelhint0 = new LabelHint({
    			props: {
    				title: "System resolv.conf",
    				title_width: defTitleWidth,
    				info: "A path to dynamically generated resolv.conf(5) by\nresolvconf(8).  If set, the nameserver values in referenced file will\nreplace 'parent' value and 'parent' will become a fallback in\ncase the referenced file being deleted or can not be parsed.",
    				$$slots: { default: [create_default_slot_11] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	wuilabelhint1 = new LabelHint({
    			props: {
    				title: "Debug level",
    				title_width: defTitleWidth,
    				info: "This option only used for debugging program or if user\nwant to monitor what kind of traffic goes in and out of rescached.",
    				$$slots: { default: [create_default_slot_10] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	wuilabelhint2 = new LabelHint({
    			props: {
    				title: "Parent name servers",
    				title_width: defTitleWidth,
    				info: "List of parent DNS servers."
    			},
    			$$inline: true
    		});

    	let each_value = /*env*/ ctx[0].NameServers;
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$2(get_each_context$2(ctx, each_value, i));
    	}

    	wuilabelhint3 = new LabelHint({
    			props: {
    				title: "Listen address",
    				title_width: defTitleWidth,
    				info: "Address in local network where rescached will\nlistening for query from client through UDP and TCP.\n<br/>\nIf you want rescached to serve a query from another host in your local\nnetwork, change this value to <tt>0.0.0.0:53</tt>.",
    				$$slots: { default: [create_default_slot_8] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	wuilabelhint4 = new LabelHint({
    			props: {
    				title: "HTTP listen port",
    				title_width: defTitleWidth,
    				info: "Port to serve DNS over HTTP",
    				$$slots: { default: [create_default_slot_7] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	wuilabelhint5 = new LabelHint({
    			props: {
    				title: "TLS listen port",
    				title_width: defTitleWidth,
    				info: "Port to listen for DNS over TLS",
    				$$slots: { default: [create_default_slot_6] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	wuilabelhint6 = new LabelHint({
    			props: {
    				title: "TLS certificate",
    				title_width: defTitleWidth,
    				info: "Path to certificate file to serve DNS over TLS and\nHTTPS",
    				$$slots: { default: [create_default_slot_5] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	wuilabelhint7 = new LabelHint({
    			props: {
    				title: "TLS private key",
    				title_width: defTitleWidth,
    				info: "Path to certificate private key file to serve DNS over TLS and\nHTTPS.",
    				$$slots: { default: [create_default_slot_4] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	wuilabelhint8 = new LabelHint({
    			props: {
    				title: "TLS allow insecure",
    				title_width: defTitleWidth,
    				info: "If its true, allow serving DoH and DoT with self signed\ncertificate.",
    				$$slots: { default: [create_default_slot_3] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	wuilabelhint9 = new LabelHint({
    			props: {
    				title: "DoH behind proxy",
    				title_width: defTitleWidth,
    				info: "If its true, serve DNS over HTTP only, even if\ncertificate files is defined.\nThis allow serving DNS request forwarded by another proxy server.",
    				$$slots: { default: [create_default_slot_2] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	wuilabelhint10 = new LabelHint({
    			props: {
    				title: "Prune delay",
    				title_width: defTitleWidth,
    				info: "Delay for pruning caches.\nEvery N seconds, rescached will traverse all caches and remove response that\nhas not been accessed less than cache.prune_threshold.\nIts value must be equal or greater than 1 hour (3600 seconds).\n",
    				$$slots: { default: [create_default_slot_1] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	wuilabelhint11 = new LabelHint({
    			props: {
    				title: "Prune threshold",
    				title_width: defTitleWidth,
    				info: "The duration when the cache will be considered expired.\nIts value must be negative and greater or equal than -1 hour (-3600 seconds).",
    				$$slots: { default: [create_default_slot] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			div4 = element("div");
    			p = element("p");
    			p.textContent = "This page allow you to change the rescached environment.\nUpon save, the rescached service will be restarted.";
    			t1 = space();
    			h30 = element("h3");
    			h30.textContent = "rescached";
    			t3 = space();
    			div0 = element("div");
    			create_component(wuilabelhint0.$$.fragment);
    			t4 = space();
    			create_component(wuilabelhint1.$$.fragment);
    			t5 = space();
    			h31 = element("h3");
    			h31.textContent = "DNS server";
    			t7 = space();
    			div1 = element("div");
    			create_component(wuilabelhint2.$$.fragment);
    			t8 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t9 = space();
    			button0 = element("button");
    			button0.textContent = "Add";
    			t11 = space();
    			create_component(wuilabelhint3.$$.fragment);
    			t12 = space();
    			create_component(wuilabelhint4.$$.fragment);
    			t13 = space();
    			create_component(wuilabelhint5.$$.fragment);
    			t14 = space();
    			create_component(wuilabelhint6.$$.fragment);
    			t15 = space();
    			create_component(wuilabelhint7.$$.fragment);
    			t16 = space();
    			create_component(wuilabelhint8.$$.fragment);
    			t17 = space();
    			create_component(wuilabelhint9.$$.fragment);
    			t18 = space();
    			create_component(wuilabelhint10.$$.fragment);
    			t19 = space();
    			create_component(wuilabelhint11.$$.fragment);
    			t20 = space();
    			div3 = element("div");
    			div2 = element("div");
    			button1 = element("button");
    			button1.textContent = "Save";
    			add_location(p, file$6, 89, 0, 1747);
    			add_location(h30, file$6, 94, 0, 1866);
    			add_location(div0, file$6, 95, 0, 1885);
    			add_location(h31, file$6, 124, 0, 2595);
    			add_location(button0, file$6, 142, 1, 2928);
    			add_location(div1, file$6, 125, 0, 2615);
    			add_location(button1, file$6, 280, 3, 5859);
    			add_location(div2, file$6, 279, 2, 5850);
    			attr_dev(div3, "class", "section-bottom svelte-ivqrh9");
    			add_location(div3, file$6, 278, 1, 5819);
    			attr_dev(div4, "class", "environment");
    			add_location(div4, file$6, 88, 0, 1721);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div4, anchor);
    			append_dev(div4, p);
    			append_dev(div4, t1);
    			append_dev(div4, h30);
    			append_dev(div4, t3);
    			append_dev(div4, div0);
    			mount_component(wuilabelhint0, div0, null);
    			append_dev(div0, t4);
    			mount_component(wuilabelhint1, div0, null);
    			append_dev(div4, t5);
    			append_dev(div4, h31);
    			append_dev(div4, t7);
    			append_dev(div4, div1);
    			mount_component(wuilabelhint2, div1, null);
    			append_dev(div1, t8);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div1, null);
    			}

    			append_dev(div1, t9);
    			append_dev(div1, button0);
    			append_dev(div1, t11);
    			mount_component(wuilabelhint3, div1, null);
    			append_dev(div1, t12);
    			mount_component(wuilabelhint4, div1, null);
    			append_dev(div1, t13);
    			mount_component(wuilabelhint5, div1, null);
    			append_dev(div1, t14);
    			mount_component(wuilabelhint6, div1, null);
    			append_dev(div1, t15);
    			mount_component(wuilabelhint7, div1, null);
    			append_dev(div1, t16);
    			mount_component(wuilabelhint8, div1, null);
    			append_dev(div1, t17);
    			mount_component(wuilabelhint9, div1, null);
    			append_dev(div1, t18);
    			mount_component(wuilabelhint10, div1, null);
    			append_dev(div1, t19);
    			mount_component(wuilabelhint11, div1, null);
    			append_dev(div4, t20);
    			append_dev(div4, div3);
    			append_dev(div3, div2);
    			append_dev(div2, button1);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", /*addNameServer*/ ctx[1], false, false, false),
    					listen_dev(button1, "click", /*updateEnvironment*/ ctx[3], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			const wuilabelhint0_changes = {};

    			if (dirty & /*$$scope, env*/ 1048577) {
    				wuilabelhint0_changes.$$scope = { dirty, ctx };
    			}

    			wuilabelhint0.$set(wuilabelhint0_changes);
    			const wuilabelhint1_changes = {};

    			if (dirty & /*$$scope, env*/ 1048577) {
    				wuilabelhint1_changes.$$scope = { dirty, ctx };
    			}

    			wuilabelhint1.$set(wuilabelhint1_changes);
    			const wuilabelhint2_changes = {};

    			if (dirty & /*$$scope*/ 1048576) {
    				wuilabelhint2_changes.$$scope = { dirty, ctx };
    			}

    			wuilabelhint2.$set(wuilabelhint2_changes);

    			if (dirty & /*deleteNameServer, env*/ 5) {
    				each_value = /*env*/ ctx[0].NameServers;
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$2(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$2(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div1, t9);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}

    			const wuilabelhint3_changes = {};

    			if (dirty & /*$$scope, env*/ 1048577) {
    				wuilabelhint3_changes.$$scope = { dirty, ctx };
    			}

    			wuilabelhint3.$set(wuilabelhint3_changes);
    			const wuilabelhint4_changes = {};

    			if (dirty & /*$$scope, env*/ 1048577) {
    				wuilabelhint4_changes.$$scope = { dirty, ctx };
    			}

    			wuilabelhint4.$set(wuilabelhint4_changes);
    			const wuilabelhint5_changes = {};

    			if (dirty & /*$$scope, env*/ 1048577) {
    				wuilabelhint5_changes.$$scope = { dirty, ctx };
    			}

    			wuilabelhint5.$set(wuilabelhint5_changes);
    			const wuilabelhint6_changes = {};

    			if (dirty & /*$$scope, env*/ 1048577) {
    				wuilabelhint6_changes.$$scope = { dirty, ctx };
    			}

    			wuilabelhint6.$set(wuilabelhint6_changes);
    			const wuilabelhint7_changes = {};

    			if (dirty & /*$$scope, env*/ 1048577) {
    				wuilabelhint7_changes.$$scope = { dirty, ctx };
    			}

    			wuilabelhint7.$set(wuilabelhint7_changes);
    			const wuilabelhint8_changes = {};

    			if (dirty & /*$$scope, env*/ 1048577) {
    				wuilabelhint8_changes.$$scope = { dirty, ctx };
    			}

    			wuilabelhint8.$set(wuilabelhint8_changes);
    			const wuilabelhint9_changes = {};

    			if (dirty & /*$$scope, env*/ 1048577) {
    				wuilabelhint9_changes.$$scope = { dirty, ctx };
    			}

    			wuilabelhint9.$set(wuilabelhint9_changes);
    			const wuilabelhint10_changes = {};

    			if (dirty & /*$$scope, env*/ 1048577) {
    				wuilabelhint10_changes.$$scope = { dirty, ctx };
    			}

    			wuilabelhint10.$set(wuilabelhint10_changes);
    			const wuilabelhint11_changes = {};

    			if (dirty & /*$$scope, env*/ 1048577) {
    				wuilabelhint11_changes.$$scope = { dirty, ctx };
    			}

    			wuilabelhint11.$set(wuilabelhint11_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(wuilabelhint0.$$.fragment, local);
    			transition_in(wuilabelhint1.$$.fragment, local);
    			transition_in(wuilabelhint2.$$.fragment, local);
    			transition_in(wuilabelhint3.$$.fragment, local);
    			transition_in(wuilabelhint4.$$.fragment, local);
    			transition_in(wuilabelhint5.$$.fragment, local);
    			transition_in(wuilabelhint6.$$.fragment, local);
    			transition_in(wuilabelhint7.$$.fragment, local);
    			transition_in(wuilabelhint8.$$.fragment, local);
    			transition_in(wuilabelhint9.$$.fragment, local);
    			transition_in(wuilabelhint10.$$.fragment, local);
    			transition_in(wuilabelhint11.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(wuilabelhint0.$$.fragment, local);
    			transition_out(wuilabelhint1.$$.fragment, local);
    			transition_out(wuilabelhint2.$$.fragment, local);
    			transition_out(wuilabelhint3.$$.fragment, local);
    			transition_out(wuilabelhint4.$$.fragment, local);
    			transition_out(wuilabelhint5.$$.fragment, local);
    			transition_out(wuilabelhint6.$$.fragment, local);
    			transition_out(wuilabelhint7.$$.fragment, local);
    			transition_out(wuilabelhint8.$$.fragment, local);
    			transition_out(wuilabelhint9.$$.fragment, local);
    			transition_out(wuilabelhint10.$$.fragment, local);
    			transition_out(wuilabelhint11.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div4);
    			destroy_component(wuilabelhint0);
    			destroy_component(wuilabelhint1);
    			destroy_component(wuilabelhint2);
    			destroy_each(each_blocks, detaching);
    			destroy_component(wuilabelhint3);
    			destroy_component(wuilabelhint4);
    			destroy_component(wuilabelhint5);
    			destroy_component(wuilabelhint6);
    			destroy_component(wuilabelhint7);
    			destroy_component(wuilabelhint8);
    			destroy_component(wuilabelhint9);
    			destroy_component(wuilabelhint10);
    			destroy_component(wuilabelhint11);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$6.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    const defTitleWidth = "300px";

    function instance$6($$self, $$props, $$invalidate) {
    	let env = {
    		NameServers: [],
    		HostsBlocks: [],
    		HostsFiles: {}
    	};

    	const envUnsubscribe = environment.subscribe(value => {
    		$$invalidate(0, env = value);
    	});

    	onDestroy(envUnsubscribe);

    	function addNameServer() {
    		$$invalidate(0, env.NameServers = [...env.NameServers, ""], env);
    	}

    	function deleteNameServer(ns) {
    		for (let x = 0; x < env.NameServers.length; x++) {
    			if (env.NameServers[x] === ns) {
    				env.NameServers.splice(x, 1);
    				$$invalidate(0, env);
    				break;
    			}
    		}
    	}

    	async function updateEnvironment() {
    		let got = {};
    		Object.assign(got, env);
    		environment.set(env);
    		got.PruneDelay = got.PruneDelay * nanoSeconds;
    		got.PruneThreshold = got.PruneThreshold * nanoSeconds;

    		const res = await fetch(apiEnvironment, {
    			method: "POST",
    			headers: { "Content-Type": "application/json" },
    			body: JSON.stringify(got)
    		});

    		if (res.status >= 400) {
    			const resbody = await res.json();
    			WuiPushNotif.Error("ERROR: ", resbody.message);
    			return;
    		}

    		WuiPushNotif.Info("The environment succesfully updated ...");
    	}

    	const writable_props = [];

    	Object_1.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Environment> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Environment", $$slots, []);

    	function input_input_handler() {
    		env.FileResolvConf = this.value;
    		$$invalidate(0, env);
    	}

    	function wuiinputnumber_value_binding(value) {
    		env.Debug = value;
    		$$invalidate(0, env);
    	}

    	function input_input_handler_1(each_value, ns_index) {
    		each_value[ns_index] = this.value;
    		$$invalidate(0, env);
    	}

    	function wuiinputipport_value_binding(value) {
    		env.ListenAddress = value;
    		$$invalidate(0, env);
    	}

    	function wuiinputnumber_value_binding_1(value) {
    		env.HTTPPort = value;
    		$$invalidate(0, env);
    	}

    	function wuiinputnumber_value_binding_2(value) {
    		env.TLSPort = value;
    		$$invalidate(0, env);
    	}

    	function input_input_handler_2() {
    		env.TLSCertFile = this.value;
    		$$invalidate(0, env);
    	}

    	function input_input_handler_3() {
    		env.TLSPrivateKey = this.value;
    		$$invalidate(0, env);
    	}

    	function input_change_handler() {
    		env.TLSAllowInsecure = this.checked;
    		$$invalidate(0, env);
    	}

    	function input_change_handler_1() {
    		env.DoHBehindProxy = this.checked;
    		$$invalidate(0, env);
    	}

    	function wuiinputnumber_value_binding_3(value) {
    		env.PruneDelay = value;
    		$$invalidate(0, env);
    	}

    	function wuiinputnumber_value_binding_4(value) {
    		env.PruneThreshold = value;
    		$$invalidate(0, env);
    	}

    	$$self.$capture_state = () => ({
    		onDestroy,
    		apiEnvironment,
    		environment,
    		nanoSeconds,
    		WuiPushNotif,
    		WuiLabelHint: LabelHint,
    		WuiInputNumber: InputNumber,
    		WuiInputIPPort: InputIPPort,
    		env,
    		envUnsubscribe,
    		defTitleWidth,
    		addNameServer,
    		deleteNameServer,
    		updateEnvironment
    	});

    	$$self.$inject_state = $$props => {
    		if ("env" in $$props) $$invalidate(0, env = $$props.env);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		env,
    		addNameServer,
    		deleteNameServer,
    		updateEnvironment,
    		input_input_handler,
    		wuiinputnumber_value_binding,
    		input_input_handler_1,
    		wuiinputipport_value_binding,
    		wuiinputnumber_value_binding_1,
    		wuiinputnumber_value_binding_2,
    		input_input_handler_2,
    		input_input_handler_3,
    		input_change_handler,
    		input_change_handler_1,
    		wuiinputnumber_value_binding_3,
    		wuiinputnumber_value_binding_4
    	];
    }

    class Environment extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$6, create_fragment$6, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Environment",
    			options,
    			id: create_fragment$6.name
    		});
    	}
    }

    /* src/HostsBlock.svelte generated by Svelte v3.24.1 */
    const file$7 = "src/HostsBlock.svelte";

    function get_each_context$3(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[5] = list[i];
    	child_ctx[6] = list;
    	child_ctx[7] = i;
    	return child_ctx;
    }

    // (83:2) {#each env.HostsBlocks as hostsBlock}
    function create_each_block$3(ctx) {
    	let div;
    	let span0;
    	let input0;
    	let t0;
    	let span1;
    	let t1_value = /*hostsBlock*/ ctx[5].Name + "";
    	let t1;
    	let t2;
    	let span2;
    	let input1;
    	let t3;
    	let span3;
    	let t4_value = /*hostsBlock*/ ctx[5].LastUpdated + "";
    	let t4;
    	let t5;
    	let mounted;
    	let dispose;

    	function input0_change_handler() {
    		/*input0_change_handler*/ ctx[2].call(input0, /*each_value*/ ctx[6], /*hostsBlock_index*/ ctx[7]);
    	}

    	function input1_input_handler() {
    		/*input1_input_handler*/ ctx[3].call(input1, /*each_value*/ ctx[6], /*hostsBlock_index*/ ctx[7]);
    	}

    	const block = {
    		c: function create() {
    			div = element("div");
    			span0 = element("span");
    			input0 = element("input");
    			t0 = space();
    			span1 = element("span");
    			t1 = text(t1_value);
    			t2 = space();
    			span2 = element("span");
    			input1 = element("input");
    			t3 = space();
    			span3 = element("span");
    			t4 = text(t4_value);
    			t5 = space();
    			attr_dev(input0, "type", "checkbox");
    			attr_dev(input0, "class", "svelte-ze2due");
    			add_location(input0, file$7, 85, 4, 1632);
    			attr_dev(span0, "class", "svelte-ze2due");
    			add_location(span0, file$7, 84, 3, 1621);
    			attr_dev(span1, "class", "svelte-ze2due");
    			add_location(span1, file$7, 90, 3, 1719);
    			input1.disabled = true;
    			attr_dev(input1, "class", "svelte-ze2due");
    			add_location(input1, file$7, 94, 4, 1773);
    			attr_dev(span2, "class", "svelte-ze2due");
    			add_location(span2, file$7, 93, 3, 1762);
    			attr_dev(span3, "class", "svelte-ze2due");
    			add_location(span3, file$7, 99, 3, 1847);
    			attr_dev(div, "class", "item svelte-ze2due");
    			add_location(div, file$7, 83, 2, 1599);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, span0);
    			append_dev(span0, input0);
    			input0.checked = /*hostsBlock*/ ctx[5].IsEnabled;
    			append_dev(div, t0);
    			append_dev(div, span1);
    			append_dev(span1, t1);
    			append_dev(div, t2);
    			append_dev(div, span2);
    			append_dev(span2, input1);
    			set_input_value(input1, /*hostsBlock*/ ctx[5].URL);
    			append_dev(div, t3);
    			append_dev(div, span3);
    			append_dev(span3, t4);
    			append_dev(div, t5);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input0, "change", input0_change_handler),
    					listen_dev(input1, "input", input1_input_handler)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (dirty & /*env*/ 1) {
    				input0.checked = /*hostsBlock*/ ctx[5].IsEnabled;
    			}

    			if (dirty & /*env*/ 1 && t1_value !== (t1_value = /*hostsBlock*/ ctx[5].Name + "")) set_data_dev(t1, t1_value);

    			if (dirty & /*env*/ 1 && input1.value !== /*hostsBlock*/ ctx[5].URL) {
    				set_input_value(input1, /*hostsBlock*/ ctx[5].URL);
    			}

    			if (dirty & /*env*/ 1 && t4_value !== (t4_value = /*hostsBlock*/ ctx[5].LastUpdated + "")) set_data_dev(t4, t4_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$3.name,
    		type: "each",
    		source: "(83:2) {#each env.HostsBlocks as hostsBlock}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$7(ctx) {
    	let div3;
    	let p;
    	let t1;
    	let div1;
    	let div0;
    	let span0;
    	let t3;
    	let span1;
    	let t5;
    	let span2;
    	let t7;
    	let span3;
    	let t9;
    	let t10;
    	let div2;
    	let button;
    	let mounted;
    	let dispose;
    	let each_value = /*env*/ ctx[0].HostsBlocks;
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$3(get_each_context$3(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			div3 = element("div");
    			p = element("p");
    			p.textContent = "Configure the source of blocked hosts file.";
    			t1 = space();
    			div1 = element("div");
    			div0 = element("div");
    			span0 = element("span");
    			span0.textContent = "Enabled";
    			t3 = space();
    			span1 = element("span");
    			span1.textContent = "Name";
    			t5 = space();
    			span2 = element("span");
    			span2.textContent = "URL";
    			t7 = space();
    			span3 = element("span");
    			span3.textContent = "Last updated";
    			t9 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t10 = space();
    			div2 = element("div");
    			button = element("button");
    			button.textContent = "Save";
    			add_location(p, file$7, 71, 1, 1334);
    			attr_dev(span0, "class", "svelte-ze2due");
    			add_location(span0, file$7, 77, 3, 1449);
    			attr_dev(span1, "class", "svelte-ze2due");
    			add_location(span1, file$7, 78, 3, 1475);
    			attr_dev(span2, "class", "svelte-ze2due");
    			add_location(span2, file$7, 79, 3, 1498);
    			attr_dev(span3, "class", "svelte-ze2due");
    			add_location(span3, file$7, 80, 3, 1520);
    			attr_dev(div0, "class", "item header svelte-ze2due");
    			add_location(div0, file$7, 76, 2, 1420);
    			attr_dev(div1, "class", "block_source svelte-ze2due");
    			add_location(div1, file$7, 75, 1, 1391);
    			add_location(button, file$7, 107, 2, 1931);
    			add_location(div2, file$7, 106, 1, 1923);
    			attr_dev(div3, "class", "hosts-block");
    			add_location(div3, file$7, 70, 0, 1307);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div3, anchor);
    			append_dev(div3, p);
    			append_dev(div3, t1);
    			append_dev(div3, div1);
    			append_dev(div1, div0);
    			append_dev(div0, span0);
    			append_dev(div0, t3);
    			append_dev(div0, span1);
    			append_dev(div0, t5);
    			append_dev(div0, span2);
    			append_dev(div0, t7);
    			append_dev(div0, span3);
    			append_dev(div1, t9);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div1, null);
    			}

    			append_dev(div3, t10);
    			append_dev(div3, div2);
    			append_dev(div2, button);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*updateHostsBlocks*/ ctx[1], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*env*/ 1) {
    				each_value = /*env*/ ctx[0].HostsBlocks;
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$3(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$3(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div1, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div3);
    			destroy_each(each_blocks, detaching);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$7.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    const apiHostsBlock = "/api/hosts_block";

    function instance$7($$self, $$props, $$invalidate) {
    	let env = {
    		NameServers: [],
    		HostsBlocks: [],
    		HostsFiles: {}
    	};

    	const envUnsubscribe = environment.subscribe(value => {
    		$$invalidate(0, env = value);
    	});

    	onDestroy(envUnsubscribe);

    	async function updateHostsBlocks() {
    		const res = await fetch(apiHostsBlock, {
    			method: "POST",
    			headers: { "Content-Type": "application/json" },
    			body: JSON.stringify(env.HostsBlocks)
    		});

    		if (res.status >= 400) {
    			WuiPushNotif.Error("ERROR: ", res.status, res.statusText);
    			return;
    		}

    		setEnvironment(await res.json());
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<HostsBlock> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("HostsBlock", $$slots, []);

    	function input0_change_handler(each_value, hostsBlock_index) {
    		each_value[hostsBlock_index].IsEnabled = this.checked;
    		$$invalidate(0, env);
    	}

    	function input1_input_handler(each_value, hostsBlock_index) {
    		each_value[hostsBlock_index].URL = this.value;
    		$$invalidate(0, env);
    	}

    	$$self.$capture_state = () => ({
    		onDestroy,
    		WuiPushNotif,
    		environment,
    		nanoSeconds,
    		setEnvironment,
    		apiHostsBlock,
    		env,
    		envUnsubscribe,
    		updateHostsBlocks
    	});

    	$$self.$inject_state = $$props => {
    		if ("env" in $$props) $$invalidate(0, env = $$props.env);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [env, updateHostsBlocks, input0_change_handler, input1_input_handler];
    }

    class HostsBlock extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$7, create_fragment$7, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "HostsBlock",
    			options,
    			id: create_fragment$7.name
    		});
    	}
    }

    /* src/HostsDir.svelte generated by Svelte v3.24.1 */

    const { Object: Object_1$1 } = globals;
    const file$8 = "src/HostsDir.svelte";

    function get_each_context$4(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[15] = list[i];
    	child_ctx[17] = i;
    	return child_ctx;
    }

    function get_each_context_1$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[18] = list[i][0];
    	child_ctx[19] = list[i][1];
    	child_ctx[18] = i;
    	return child_ctx;
    }

    // (178:2) {#each Object.entries(env.HostsFiles) as [name,hf], name }
    function create_each_block_1$1(ctx) {
    	let div;
    	let a;
    	let t_value = /*hf*/ ctx[19].Name + "";
    	let t;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div = element("div");
    			a = element("a");
    			t = text(t_value);
    			attr_dev(a, "href", "#");
    			add_location(a, file$8, 179, 3, 3810);
    			attr_dev(div, "class", "item svelte-1w15y7z");
    			add_location(div, file$8, 178, 2, 3788);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, a);
    			append_dev(a, t);

    			if (!mounted) {
    				dispose = listen_dev(
    					a,
    					"click",
    					function () {
    						if (is_function(/*getHostsFile*/ ctx[4](/*hf*/ ctx[19]))) /*getHostsFile*/ ctx[4](/*hf*/ ctx[19]).apply(this, arguments);
    					},
    					false,
    					false,
    					false
    				);

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty & /*env*/ 1 && t_value !== (t_value = /*hf*/ ctx[19].Name + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1$1.name,
    		type: "each",
    		source: "(178:2) {#each Object.entries(env.HostsFiles) as [name,hf], name }",
    		ctx
    	});

    	return block;
    }

    // (203:2) {:else}
    function create_else_block(ctx) {
    	let p;
    	let t0_value = /*hostsFile*/ ctx[1].Name + "";
    	let t0;
    	let t1;
    	let t2_value = /*hostsFile*/ ctx[1].Records.length + "";
    	let t2;
    	let t3;
    	let button0;
    	let t5;
    	let div0;
    	let button1;
    	let t7;
    	let t8;
    	let div1;
    	let span0;
    	let t10;
    	let span1;
    	let t12;
    	let each_blocks = [];
    	let each_1_lookup = new Map();
    	let each_1_anchor;
    	let mounted;
    	let dispose;
    	let if_block = /*newRecord*/ ctx[2] !== null && create_if_block_1$1(ctx);
    	let each_value = /*hostsFile*/ ctx[1].Records;
    	validate_each_argument(each_value);
    	const get_key = ctx => /*idx*/ ctx[17];
    	validate_each_keys(ctx, each_value, get_each_context$4, get_key);

    	for (let i = 0; i < each_value.length; i += 1) {
    		let child_ctx = get_each_context$4(ctx, each_value, i);
    		let key = get_key(child_ctx);
    		each_1_lookup.set(key, each_blocks[i] = create_each_block$4(key, child_ctx));
    	}

    	const block = {
    		c: function create() {
    			p = element("p");
    			t0 = text(t0_value);
    			t1 = text(" (");
    			t2 = text(t2_value);
    			t3 = text(" records)\n\t\t\t\t");
    			button0 = element("button");
    			button0.textContent = "Delete";
    			t5 = space();
    			div0 = element("div");
    			button1 = element("button");
    			button1.textContent = "Add";
    			t7 = space();
    			if (if_block) if_block.c();
    			t8 = space();
    			div1 = element("div");
    			span0 = element("span");
    			span0.textContent = "Domain name";
    			t10 = space();
    			span1 = element("span");
    			span1.textContent = "IP address";
    			t12 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    			add_location(button0, file$8, 205, 4, 4265);
    			add_location(p, file$8, 203, 3, 4199);
    			add_location(button1, file$8, 210, 4, 4359);
    			add_location(div0, file$8, 209, 3, 4349);
    			attr_dev(span0, "class", "host_name svelte-1w15y7z");
    			add_location(span0, file$8, 234, 4, 4824);
    			attr_dev(span1, "class", "host_value svelte-1w15y7z");
    			add_location(span1, file$8, 235, 4, 4873);
    			attr_dev(div1, "class", "host header svelte-1w15y7z");
    			add_location(div1, file$8, 233, 3, 4794);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			append_dev(p, t0);
    			append_dev(p, t1);
    			append_dev(p, t2);
    			append_dev(p, t3);
    			append_dev(p, button0);
    			insert_dev(target, t5, anchor);
    			insert_dev(target, div0, anchor);
    			append_dev(div0, button1);
    			insert_dev(target, t7, anchor);
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, t8, anchor);
    			insert_dev(target, div1, anchor);
    			append_dev(div1, span0);
    			append_dev(div1, t10);
    			append_dev(div1, span1);
    			insert_dev(target, t12, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each_1_anchor, anchor);

    			if (!mounted) {
    				dispose = [
    					listen_dev(
    						button0,
    						"click",
    						function () {
    							if (is_function(/*deleteHostsFile*/ ctx[9](/*hostsFile*/ ctx[1]))) /*deleteHostsFile*/ ctx[9](/*hostsFile*/ ctx[1]).apply(this, arguments);
    						},
    						false,
    						false,
    						false
    					),
    					listen_dev(button1, "click", /*addRecord*/ ctx[6], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty & /*hostsFile*/ 2 && t0_value !== (t0_value = /*hostsFile*/ ctx[1].Name + "")) set_data_dev(t0, t0_value);
    			if (dirty & /*hostsFile*/ 2 && t2_value !== (t2_value = /*hostsFile*/ ctx[1].Records.length + "")) set_data_dev(t2, t2_value);

    			if (/*newRecord*/ ctx[2] !== null) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block_1$1(ctx);
    					if_block.c();
    					if_block.m(t8.parentNode, t8);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}

    			if (dirty & /*handleHostsRecordDelete, hostsFile*/ 258) {
    				const each_value = /*hostsFile*/ ctx[1].Records;
    				validate_each_argument(each_value);
    				validate_each_keys(ctx, each_value, get_each_context$4, get_key);
    				each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value, each_1_lookup, each_1_anchor.parentNode, destroy_block, create_each_block$4, each_1_anchor, get_each_context$4);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    			if (detaching) detach_dev(t5);
    			if (detaching) detach_dev(div0);
    			if (detaching) detach_dev(t7);
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(t8);
    			if (detaching) detach_dev(div1);
    			if (detaching) detach_dev(t12);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].d(detaching);
    			}

    			if (detaching) detach_dev(each_1_anchor);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(203:2) {:else}",
    		ctx
    	});

    	return block;
    }

    // (199:2) {#if hostsFile.Name === ""}
    function create_if_block$4(ctx) {
    	let div;

    	const block = {
    		c: function create() {
    			div = element("div");
    			div.textContent = "Select one of the hosts file to manage.";
    			add_location(div, file$8, 199, 3, 4126);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$4.name,
    		type: "if",
    		source: "(199:2) {#if hostsFile.Name === \\\"\\\"}",
    		ctx
    	});

    	return block;
    }

    // (216:3) {#if newRecord !== null}
    function create_if_block_1$1(ctx) {
    	let div;
    	let input0;
    	let t0;
    	let input1;
    	let t1;
    	let button;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div = element("div");
    			input0 = element("input");
    			t0 = space();
    			input1 = element("input");
    			t1 = space();
    			button = element("button");
    			button.textContent = "Create";
    			attr_dev(input0, "class", "host_name svelte-1w15y7z");
    			attr_dev(input0, "placeholder", "Domain name");
    			add_location(input0, file$8, 217, 5, 4479);
    			attr_dev(input1, "class", "host_value svelte-1w15y7z");
    			attr_dev(input1, "placeholder", "IP address");
    			add_location(input1, file$8, 222, 5, 4588);
    			add_location(button, file$8, 227, 5, 4698);
    			attr_dev(div, "class", "host svelte-1w15y7z");
    			add_location(div, file$8, 216, 4, 4455);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, input0);
    			set_input_value(input0, /*newRecord*/ ctx[2].Name);
    			append_dev(div, t0);
    			append_dev(div, input1);
    			set_input_value(input1, /*newRecord*/ ctx[2].Value);
    			append_dev(div, t1);
    			append_dev(div, button);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input0, "input", /*input0_input_handler*/ ctx[11]),
    					listen_dev(input1, "input", /*input1_input_handler*/ ctx[12]),
    					listen_dev(button, "click", /*handleHostsRecordCreate*/ ctx[7], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*newRecord*/ 4 && input0.value !== /*newRecord*/ ctx[2].Name) {
    				set_input_value(input0, /*newRecord*/ ctx[2].Name);
    			}

    			if (dirty & /*newRecord*/ 4 && input1.value !== /*newRecord*/ ctx[2].Value) {
    				set_input_value(input1, /*newRecord*/ ctx[2].Value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$1.name,
    		type: "if",
    		source: "(216:3) {#if newRecord !== null}",
    		ctx
    	});

    	return block;
    }

    // (239:3) {#each hostsFile.Records as rr, idx (idx)}
    function create_each_block$4(key_1, ctx) {
    	let div;
    	let span0;
    	let t0_value = /*rr*/ ctx[15].Name + "";
    	let t0;
    	let t1;
    	let span1;
    	let t2_value = /*rr*/ ctx[15].Value + "";
    	let t2;
    	let t3;
    	let button;
    	let t5;
    	let mounted;
    	let dispose;

    	const block = {
    		key: key_1,
    		first: null,
    		c: function create() {
    			div = element("div");
    			span0 = element("span");
    			t0 = text(t0_value);
    			t1 = space();
    			span1 = element("span");
    			t2 = text(t2_value);
    			t3 = space();
    			button = element("button");
    			button.textContent = "X";
    			t5 = space();
    			attr_dev(span0, "class", "host_name svelte-1w15y7z");
    			add_location(span0, file$8, 240, 5, 5003);
    			attr_dev(span1, "class", "host_value svelte-1w15y7z");
    			add_location(span1, file$8, 241, 5, 5051);
    			add_location(button, file$8, 242, 5, 5101);
    			attr_dev(div, "class", "host svelte-1w15y7z");
    			add_location(div, file$8, 239, 4, 4979);
    			this.first = div;
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, span0);
    			append_dev(span0, t0);
    			append_dev(div, t1);
    			append_dev(div, span1);
    			append_dev(span1, t2);
    			append_dev(div, t3);
    			append_dev(div, button);
    			append_dev(div, t5);

    			if (!mounted) {
    				dispose = listen_dev(
    					button,
    					"click",
    					function () {
    						if (is_function(/*handleHostsRecordDelete*/ ctx[8](/*rr*/ ctx[15], /*idx*/ ctx[17]))) /*handleHostsRecordDelete*/ ctx[8](/*rr*/ ctx[15], /*idx*/ ctx[17]).apply(this, arguments);
    					},
    					false,
    					false,
    					false
    				);

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty & /*hostsFile*/ 2 && t0_value !== (t0_value = /*rr*/ ctx[15].Name + "")) set_data_dev(t0, t0_value);
    			if (dirty & /*hostsFile*/ 2 && t2_value !== (t2_value = /*rr*/ ctx[15].Value + "")) set_data_dev(t2, t2_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$4.name,
    		type: "each",
    		source: "(239:3) {#each hostsFile.Records as rr, idx (idx)}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$8(ctx) {
    	let div2;
    	let div0;
    	let t0;
    	let br0;
    	let t1;
    	let label;
    	let span;
    	let t3;
    	let br1;
    	let t4;
    	let input;
    	let t5;
    	let button;
    	let t7;
    	let div1;
    	let mounted;
    	let dispose;
    	let each_value_1 = Object.entries(/*env*/ ctx[0].HostsFiles);
    	validate_each_argument(each_value_1);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks[i] = create_each_block_1$1(get_each_context_1$1(ctx, each_value_1, i));
    	}

    	function select_block_type(ctx, dirty) {
    		if (/*hostsFile*/ ctx[1].Name === "") return create_if_block$4;
    		return create_else_block;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			div0 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t0 = space();
    			br0 = element("br");
    			t1 = space();
    			label = element("label");
    			span = element("span");
    			span.textContent = "New hosts file:";
    			t3 = space();
    			br1 = element("br");
    			t4 = space();
    			input = element("input");
    			t5 = space();
    			button = element("button");
    			button.textContent = "Create";
    			t7 = space();
    			div1 = element("div");
    			if_block.c();
    			add_location(br0, file$8, 185, 2, 3895);
    			add_location(span, file$8, 188, 3, 3915);
    			add_location(br1, file$8, 189, 3, 3947);
    			add_location(input, file$8, 190, 3, 3956);
    			add_location(label, file$8, 187, 2, 3904);
    			add_location(button, file$8, 192, 2, 4003);
    			attr_dev(div0, "class", "nav-left svelte-1w15y7z");
    			add_location(div0, file$8, 176, 1, 3702);
    			attr_dev(div1, "class", "content svelte-1w15y7z");
    			add_location(div1, file$8, 197, 1, 4071);
    			attr_dev(div2, "class", "hosts_d");
    			add_location(div2, file$8, 175, 0, 3679);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div0);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div0, null);
    			}

    			append_dev(div0, t0);
    			append_dev(div0, br0);
    			append_dev(div0, t1);
    			append_dev(div0, label);
    			append_dev(label, span);
    			append_dev(label, t3);
    			append_dev(label, br1);
    			append_dev(label, t4);
    			append_dev(label, input);
    			set_input_value(input, /*newHostsFile*/ ctx[3]);
    			append_dev(div0, t5);
    			append_dev(div0, button);
    			append_dev(div2, t7);
    			append_dev(div2, div1);
    			if_block.m(div1, null);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input, "input", /*input_input_handler*/ ctx[10]),
    					listen_dev(button, "click", /*createHostsFile*/ ctx[5], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*getHostsFile, Object, env*/ 17) {
    				each_value_1 = Object.entries(/*env*/ ctx[0].HostsFiles);
    				validate_each_argument(each_value_1);
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1$1(ctx, each_value_1, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_1$1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div0, t0);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_1.length;
    			}

    			if (dirty & /*newHostsFile*/ 8 && input.value !== /*newHostsFile*/ ctx[3]) {
    				set_input_value(input, /*newHostsFile*/ ctx[3]);
    			}

    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(div1, null);
    				}
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    			destroy_each(each_blocks, detaching);
    			if_block.d();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$8.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    const apiHostsDir = "/api/hosts.d";

    function instance$8($$self, $$props, $$invalidate) {
    	let env = { HostsFiles: {} };
    	let hostsFile = { Name: "", Records: [] };
    	let newRecord = null;
    	let newHostsFile = "";

    	const envUnsubscribe = environment.subscribe(value => {
    		$$invalidate(0, env = value);
    	});

    	onDestroy(envUnsubscribe);

    	async function getHostsFile(hf) {
    		if (hf.Records === null) {
    			hf.Records = [];
    		}

    		if (hf.Records.length > 0) {
    			$$invalidate(1, hostsFile = hf);
    			return;
    		}

    		const res = await fetch(apiHostsDir + "/" + hf.Name);
    		hf.Records = await res.json();
    		$$invalidate(1, hostsFile = hf);
    	}

    	async function createHostsFile() {
    		if (newHostsFile === "") {
    			return;
    		}

    		const res = await fetch(apiHostsDir + "/" + newHostsFile, { method: "PUT" });

    		if (res.status >= 400) {
    			const resError = await res.json();
    			WuiPushNotif.Error("ERROR: createHostsFile: ", resError.message);
    			return;
    		}

    		const hf = { Name: newHostsFile, Records: [] };
    		$$invalidate(0, env.HostsFiles[newHostsFile] = hf, env);
    		$$invalidate(0, env);
    		WuiPushNotif.Info("The new host file '" + newHostsFile + "' has been created");
    	}

    	async function updateHostsFile() {
    		const res = await fetch(apiHostsDir + "/" + hostsFile.Name, {
    			method: "POST",
    			body: JSON.stringify(hostsFile.Records)
    		});

    		if (res.status >= 400) {
    			const resError = await res.json();
    			WuiPushNotif.Error("ERROR: updateHostsFile: ", resError.message);
    			return;
    		}

    		$$invalidate(1, hostsFile.Records = await res.json(), hostsFile);
    		WuiPushNotif.Info("The host file '" + hostsFile.Name + "' has been updated");
    	}

    	function addRecord() {
    		if (newRecord !== null) {
    			return;
    		}

    		$$invalidate(2, newRecord = { Name: "", Value: "" });
    	}

    	async function handleHostsRecordCreate() {
    		const api = apiHostsDir + "/" + hostsFile.Name + "/rr" + "?domain=" + newRecord.Name + "&value=" + newRecord.Value;
    		const res = await fetch(api, { method: "POST" });

    		if (res.status >= 400) {
    			const resError = await res.json();
    			WuiPushNotif.Error("ERROR: " + resError.message);
    			return;
    		}

    		const rr = await res.json();
    		hostsFile.Records.push(rr);
    		$$invalidate(1, hostsFile);
    		$$invalidate(2, newRecord = null);
    		WuiPushNotif.Info("Record '" + rr.Name + "' has been created");
    	}

    	async function handleHostsRecordDelete(rr, idx) {
    		const api = apiHostsDir + "/" + hostsFile.Name + "/rr" + "?domain=" + rr.Name;
    		const res = await fetch(api, { method: "DELETE" });

    		if (res.status >= 400) {
    			const resError = await res.json();
    			WuiPushNotif.Error("ERROR: " + resError.message);
    			return;
    		}

    		hostsFile.Records.splice(idx, 1);
    		$$invalidate(1, hostsFile);
    		WuiPushNotif.Info("Record '" + rr.Name + "' has been deleted");
    	}

    	async function deleteHostsFile(hfile) {
    		const res = await fetch(apiHostsDir + "/" + hfile.Name, { method: "DELETE" });

    		if (res.status >= 400) {
    			const resError = await res.json();
    			WuiPushNotif.Error("ERROR: deleteHostsFile: ", resError.message);
    			return;
    		}

    		delete env.HostsFiles[hfile.Name];
    		$$invalidate(0, env);
    		$$invalidate(1, hostsFile = { Name: "", Records: [] });
    		WuiPushNotif.Info("The host file '" + hfile.Name + "' has been deleted");
    	}

    	const writable_props = [];

    	Object_1$1.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<HostsDir> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("HostsDir", $$slots, []);

    	function input_input_handler() {
    		newHostsFile = this.value;
    		$$invalidate(3, newHostsFile);
    	}

    	function input0_input_handler() {
    		newRecord.Name = this.value;
    		$$invalidate(2, newRecord);
    	}

    	function input1_input_handler() {
    		newRecord.Value = this.value;
    		$$invalidate(2, newRecord);
    	}

    	$$self.$capture_state = () => ({
    		onDestroy,
    		WuiPushNotif,
    		apiEnvironment,
    		environment,
    		nanoSeconds,
    		apiHostsDir,
    		env,
    		hostsFile,
    		newRecord,
    		newHostsFile,
    		envUnsubscribe,
    		getHostsFile,
    		createHostsFile,
    		updateHostsFile,
    		addRecord,
    		handleHostsRecordCreate,
    		handleHostsRecordDelete,
    		deleteHostsFile
    	});

    	$$self.$inject_state = $$props => {
    		if ("env" in $$props) $$invalidate(0, env = $$props.env);
    		if ("hostsFile" in $$props) $$invalidate(1, hostsFile = $$props.hostsFile);
    		if ("newRecord" in $$props) $$invalidate(2, newRecord = $$props.newRecord);
    		if ("newHostsFile" in $$props) $$invalidate(3, newHostsFile = $$props.newHostsFile);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		env,
    		hostsFile,
    		newRecord,
    		newHostsFile,
    		getHostsFile,
    		createHostsFile,
    		addRecord,
    		handleHostsRecordCreate,
    		handleHostsRecordDelete,
    		deleteHostsFile,
    		input_input_handler,
    		input0_input_handler,
    		input1_input_handler
    	];
    }

    class HostsDir extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$8, create_fragment$8, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "HostsDir",
    			options,
    			id: create_fragment$8.name
    		});
    	}
    }

    /* src/MasterDir.svelte generated by Svelte v3.24.1 */

    const { Object: Object_1$2 } = globals;
    const file$9 = "src/MasterDir.svelte";

    function get_each_context$5(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[32] = list[i][0];
    	child_ctx[33] = list[i][1];
    	return child_ctx;
    }

    function get_each_context_2$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[40] = list[i];
    	child_ctx[42] = i;
    	return child_ctx;
    }

    function get_each_context_1$2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[36] = list[i][0];
    	child_ctx[37] = list[i][1];
    	return child_ctx;
    }

    function get_each_context_3$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[43] = list[i][0];
    	child_ctx[44] = list[i][1];
    	return child_ctx;
    }

    // (282:2) {#each Object.entries(env.ZoneFiles) as [name, zoneFile]}
    function create_each_block_3$1(ctx) {
    	let div;
    	let span;
    	let t_value = /*zoneFile*/ ctx[44].Name + "";
    	let t;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div = element("div");
    			span = element("span");
    			t = text(t_value);
    			add_location(span, file$9, 283, 4, 5107);
    			attr_dev(div, "class", "item svelte-yu4l71");
    			add_location(div, file$9, 282, 3, 5084);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, span);
    			append_dev(span, t);

    			if (!mounted) {
    				dispose = listen_dev(
    					span,
    					"click",
    					function () {
    						if (is_function(/*setActiveZone*/ ctx[6](/*zoneFile*/ ctx[44]))) /*setActiveZone*/ ctx[6](/*zoneFile*/ ctx[44]).apply(this, arguments);
    					},
    					false,
    					false,
    					false
    				);

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty[0] & /*env*/ 1 && t_value !== (t_value = /*zoneFile*/ ctx[44].Name + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_3$1.name,
    		type: "each",
    		source: "(282:2) {#each Object.entries(env.ZoneFiles) as [name, zoneFile]}",
    		ctx
    	});

    	return block;
    }

    // (306:2) {:else}
    function create_else_block$1(ctx) {
    	let h3;
    	let t0_value = /*activeZone*/ ctx[2].Name + "";
    	let t0;
    	let t1;
    	let button0;
    	let t3;
    	let h40;
    	let t4;
    	let button1;
    	let t6;
    	let div1;
    	let wuilabelhint0;
    	let t7;
    	let wuilabelhint1;
    	let t8;
    	let wuilabelhint2;
    	let t9;
    	let wuilabelhint3;
    	let t10;
    	let wuilabelhint4;
    	let t11;
    	let wuilabelhint5;
    	let t12;
    	let wuilabelhint6;
    	let t13;
    	let div0;
    	let button2;
    	let t15;
    	let h41;
    	let t17;
    	let div2;
    	let span0;
    	let t19;
    	let span1;
    	let t21;
    	let span2;
    	let t23;
    	let t24;
    	let form;
    	let label;
    	let span3;
    	let t26;
    	let select;
    	let t27;
    	let t28;
    	let div3;
    	let button3;
    	let current;
    	let mounted;
    	let dispose;

    	wuilabelhint0 = new LabelHint({
    			props: {
    				title: "Name server",
    				title_width: "150px",
    				info: "The domain-name of the name server that was the\noriginal or primary source of data for this zone.\nIt should be domain-name where the rescached run.",
    				$$slots: { default: [create_default_slot_6$1] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	wuilabelhint1 = new LabelHint({
    			props: {
    				title: "Admin email",
    				title_width: "150px",
    				info: "Email address of the administrator responsible for\nthis zone.\nThe \"@\" on email address is replaced with dot, and if there is a dot before\n\"@\" it should be escaped with \"\\\".\nFor example, \"dns.admin@domain.tld\" would be written as\n\"dns\\.admin.domain.tld\".",
    				$$slots: { default: [create_default_slot_5$1] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	wuilabelhint2 = new LabelHint({
    			props: {
    				title: "Serial",
    				title_width: "150px",
    				info: "Serial number for this zone. If a secondary name\nserver observes an increase in this number, the server will assume that the\nzone has been updated and initiate a zone transfer.",
    				$$slots: { default: [create_default_slot_4$1] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	wuilabelhint3 = new LabelHint({
    			props: {
    				title: "Refresh",
    				title_width: "150px",
    				info: "Number of seconds after which secondary name servers\nshould query the master for the SOA record, to detect zone changes.\nRecommendation for small and stable zones is 86400 seconds (24 hours).",
    				$$slots: { default: [create_default_slot_3$1] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	wuilabelhint4 = new LabelHint({
    			props: {
    				title: "Retry",
    				title_width: "150px",
    				info: "Number of seconds after which secondary name servers\nshould retry to request the serial number from the master if the master does\nnot respond.\nIt must be less than Refresh.\nRecommendation for small and stable zones is 7200 seconds (2 hours).",
    				$$slots: { default: [create_default_slot_2$1] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	wuilabelhint5 = new LabelHint({
    			props: {
    				title: "Expire",
    				title_width: "150px",
    				info: "Number of seconds after which secondary name servers\nshould stop answering request for this zone if the master does not respond.\nThis value must be bigger than the sum of Refresh and Retry.\nRecommendation for small and stable zones is 3600000 seconds (1000 hours).",
    				$$slots: { default: [create_default_slot_1$1] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	wuilabelhint6 = new LabelHint({
    			props: {
    				title: "Minimum",
    				title_width: "150px",
    				info: "Time to live for purposes of negative caching.\nRecommendation for small and stable zones is 1800 seconds (30 min).",
    				$$slots: { default: [create_default_slot$1] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	let each_value_1 = Object.entries(/*activeZone*/ ctx[2].Records);
    	validate_each_argument(each_value_1);
    	let each_blocks_1 = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks_1[i] = create_each_block_1$2(get_each_context_1$2(ctx, each_value_1, i));
    	}

    	let each_value = Object.entries(/*RRTypes*/ ctx[5]);
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$5(get_each_context$5(ctx, each_value, i));
    	}

    	function select_block_type_1(ctx, dirty) {
    		if (/*_rr*/ ctx[3].Type === 1 || /*_rr*/ ctx[3].Type === 2 || /*_rr*/ ctx[3].Type === 5 || /*_rr*/ ctx[3].Type === 16 || /*_rr*/ ctx[3].Type === 28) return create_if_block_1$2;
    		if (/*_rr*/ ctx[3].Type === 12) return create_if_block_2$1;
    		if (/*_rr*/ ctx[3].Type === 15) return create_if_block_3;
    	}

    	let current_block_type = select_block_type_1(ctx);
    	let if_block = current_block_type && current_block_type(ctx);

    	const block = {
    		c: function create() {
    			h3 = element("h3");
    			t0 = text(t0_value);
    			t1 = space();
    			button0 = element("button");
    			button0.textContent = "Delete";
    			t3 = space();
    			h40 = element("h4");
    			t4 = text("SOA record\n\t\t\t\t");
    			button1 = element("button");
    			button1.textContent = "Delete";
    			t6 = space();
    			div1 = element("div");
    			create_component(wuilabelhint0.$$.fragment);
    			t7 = space();
    			create_component(wuilabelhint1.$$.fragment);
    			t8 = space();
    			create_component(wuilabelhint2.$$.fragment);
    			t9 = space();
    			create_component(wuilabelhint3.$$.fragment);
    			t10 = space();
    			create_component(wuilabelhint4.$$.fragment);
    			t11 = space();
    			create_component(wuilabelhint5.$$.fragment);
    			t12 = space();
    			create_component(wuilabelhint6.$$.fragment);
    			t13 = space();
    			div0 = element("div");
    			button2 = element("button");
    			button2.textContent = "Save";
    			t15 = space();
    			h41 = element("h4");
    			h41.textContent = "List records";
    			t17 = space();
    			div2 = element("div");
    			span0 = element("span");
    			span0.textContent = "Name";
    			t19 = space();
    			span1 = element("span");
    			span1.textContent = "Type";
    			t21 = space();
    			span2 = element("span");
    			span2.textContent = "Value";
    			t23 = space();

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].c();
    			}

    			t24 = space();
    			form = element("form");
    			label = element("label");
    			span3 = element("span");
    			span3.textContent = "Type:";
    			t26 = space();
    			select = element("select");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t27 = space();
    			if (if_block) if_block.c();
    			t28 = space();
    			div3 = element("div");
    			button3 = element("button");
    			button3.textContent = "Create";
    			attr_dev(button0, "class", "action-delete svelte-yu4l71");
    			add_location(button0, file$9, 308, 4, 5538);
    			add_location(h3, file$9, 306, 3, 5507);
    			attr_dev(button1, "class", "action-delete svelte-yu4l71");
    			add_location(button1, file$9, 318, 4, 5679);
    			attr_dev(h40, "class", "svelte-yu4l71");
    			add_location(h40, file$9, 316, 3, 5655);
    			attr_dev(button2, "class", "svelte-yu4l71");
    			add_location(button2, file$9, 415, 5, 8540);
    			attr_dev(div0, "class", "actions svelte-yu4l71");
    			add_location(div0, file$9, 414, 4, 8513);
    			attr_dev(div1, "class", "rr-soa");
    			add_location(div1, file$9, 325, 3, 5790);
    			attr_dev(h41, "class", "svelte-yu4l71");
    			add_location(h41, file$9, 421, 3, 8625);
    			attr_dev(span0, "class", "name svelte-yu4l71");
    			add_location(span0, file$9, 423, 4, 8680);
    			attr_dev(span1, "class", "type svelte-yu4l71");
    			add_location(span1, file$9, 426, 4, 8726);
    			attr_dev(span2, "class", "value svelte-yu4l71");
    			add_location(span2, file$9, 429, 4, 8772);
    			attr_dev(div2, "class", "rr header svelte-yu4l71");
    			add_location(div2, file$9, 422, 3, 8652);
    			attr_dev(span3, "class", "svelte-yu4l71");
    			add_location(span3, file$9, 455, 5, 9310);
    			if (/*_rr*/ ctx[3].Type === void 0) add_render_callback(() => /*select_change_handler*/ ctx[23].call(select));
    			add_location(select, file$9, 458, 5, 9347);
    			attr_dev(label, "class", "svelte-yu4l71");
    			add_location(label, file$9, 454, 4, 9297);
    			attr_dev(button3, "class", "create svelte-yu4l71");
    			attr_dev(button3, "type", "submit");
    			add_location(button3, file$9, 524, 5, 10707);
    			attr_dev(div3, "class", "actions svelte-yu4l71");
    			add_location(div3, file$9, 523, 4, 10680);
    			attr_dev(form, "class", "svelte-yu4l71");
    			add_location(form, file$9, 453, 3, 9244);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h3, anchor);
    			append_dev(h3, t0);
    			append_dev(h3, t1);
    			append_dev(h3, button0);
    			insert_dev(target, t3, anchor);
    			insert_dev(target, h40, anchor);
    			append_dev(h40, t4);
    			append_dev(h40, button1);
    			insert_dev(target, t6, anchor);
    			insert_dev(target, div1, anchor);
    			mount_component(wuilabelhint0, div1, null);
    			append_dev(div1, t7);
    			mount_component(wuilabelhint1, div1, null);
    			append_dev(div1, t8);
    			mount_component(wuilabelhint2, div1, null);
    			append_dev(div1, t9);
    			mount_component(wuilabelhint3, div1, null);
    			append_dev(div1, t10);
    			mount_component(wuilabelhint4, div1, null);
    			append_dev(div1, t11);
    			mount_component(wuilabelhint5, div1, null);
    			append_dev(div1, t12);
    			mount_component(wuilabelhint6, div1, null);
    			append_dev(div1, t13);
    			append_dev(div1, div0);
    			append_dev(div0, button2);
    			insert_dev(target, t15, anchor);
    			insert_dev(target, h41, anchor);
    			insert_dev(target, t17, anchor);
    			insert_dev(target, div2, anchor);
    			append_dev(div2, span0);
    			append_dev(div2, t19);
    			append_dev(div2, span1);
    			append_dev(div2, t21);
    			append_dev(div2, span2);
    			insert_dev(target, t23, anchor);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].m(target, anchor);
    			}

    			insert_dev(target, t24, anchor);
    			insert_dev(target, form, anchor);
    			append_dev(form, label);
    			append_dev(label, span3);
    			append_dev(label, t26);
    			append_dev(label, select);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(select, null);
    			}

    			select_option(select, /*_rr*/ ctx[3].Type);
    			append_dev(form, t27);
    			if (if_block) if_block.m(form, null);
    			append_dev(form, t28);
    			append_dev(form, div3);
    			append_dev(div3, button3);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", /*handleZoneFileDelete*/ ctx[8], false, false, false),
    					listen_dev(button1, "click", /*handleSOADelete*/ ctx[10], false, false, false),
    					listen_dev(button2, "click", /*handleSOASave*/ ctx[11], false, false, false),
    					listen_dev(select, "change", /*select_change_handler*/ ctx[23]),
    					listen_dev(select, "blur", /*onSelectRRType*/ ctx[9], false, false, false),
    					listen_dev(form, "submit", prevent_default(/*handleCreateRR*/ ctx[12]), false, true, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if ((!current || dirty[0] & /*activeZone*/ 4) && t0_value !== (t0_value = /*activeZone*/ ctx[2].Name + "")) set_data_dev(t0, t0_value);
    			const wuilabelhint0_changes = {};

    			if (dirty[0] & /*activeZone*/ 4 | dirty[1] & /*$$scope*/ 65536) {
    				wuilabelhint0_changes.$$scope = { dirty, ctx };
    			}

    			wuilabelhint0.$set(wuilabelhint0_changes);
    			const wuilabelhint1_changes = {};

    			if (dirty[0] & /*activeZone*/ 4 | dirty[1] & /*$$scope*/ 65536) {
    				wuilabelhint1_changes.$$scope = { dirty, ctx };
    			}

    			wuilabelhint1.$set(wuilabelhint1_changes);
    			const wuilabelhint2_changes = {};

    			if (dirty[0] & /*activeZone*/ 4 | dirty[1] & /*$$scope*/ 65536) {
    				wuilabelhint2_changes.$$scope = { dirty, ctx };
    			}

    			wuilabelhint2.$set(wuilabelhint2_changes);
    			const wuilabelhint3_changes = {};

    			if (dirty[0] & /*activeZone*/ 4 | dirty[1] & /*$$scope*/ 65536) {
    				wuilabelhint3_changes.$$scope = { dirty, ctx };
    			}

    			wuilabelhint3.$set(wuilabelhint3_changes);
    			const wuilabelhint4_changes = {};

    			if (dirty[0] & /*activeZone*/ 4 | dirty[1] & /*$$scope*/ 65536) {
    				wuilabelhint4_changes.$$scope = { dirty, ctx };
    			}

    			wuilabelhint4.$set(wuilabelhint4_changes);
    			const wuilabelhint5_changes = {};

    			if (dirty[0] & /*activeZone*/ 4 | dirty[1] & /*$$scope*/ 65536) {
    				wuilabelhint5_changes.$$scope = { dirty, ctx };
    			}

    			wuilabelhint5.$set(wuilabelhint5_changes);
    			const wuilabelhint6_changes = {};

    			if (dirty[0] & /*activeZone*/ 4 | dirty[1] & /*$$scope*/ 65536) {
    				wuilabelhint6_changes.$$scope = { dirty, ctx };
    			}

    			wuilabelhint6.$set(wuilabelhint6_changes);

    			if (dirty[0] & /*activeZone, handleDeleteRR, getTypeName*/ 24580) {
    				each_value_1 = Object.entries(/*activeZone*/ ctx[2].Records);
    				validate_each_argument(each_value_1);
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1$2(ctx, each_value_1, i);

    					if (each_blocks_1[i]) {
    						each_blocks_1[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_1[i] = create_each_block_1$2(child_ctx);
    						each_blocks_1[i].c();
    						each_blocks_1[i].m(t24.parentNode, t24);
    					}
    				}

    				for (; i < each_blocks_1.length; i += 1) {
    					each_blocks_1[i].d(1);
    				}

    				each_blocks_1.length = each_value_1.length;
    			}

    			if (dirty[0] & /*RRTypes*/ 32) {
    				each_value = Object.entries(/*RRTypes*/ ctx[5]);
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$5(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$5(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(select, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}

    			if (dirty[0] & /*_rr, RRTypes*/ 40) {
    				select_option(select, /*_rr*/ ctx[3].Type);
    			}

    			if (current_block_type === (current_block_type = select_block_type_1(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if (if_block) if_block.d(1);
    				if_block = current_block_type && current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(form, t28);
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(wuilabelhint0.$$.fragment, local);
    			transition_in(wuilabelhint1.$$.fragment, local);
    			transition_in(wuilabelhint2.$$.fragment, local);
    			transition_in(wuilabelhint3.$$.fragment, local);
    			transition_in(wuilabelhint4.$$.fragment, local);
    			transition_in(wuilabelhint5.$$.fragment, local);
    			transition_in(wuilabelhint6.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(wuilabelhint0.$$.fragment, local);
    			transition_out(wuilabelhint1.$$.fragment, local);
    			transition_out(wuilabelhint2.$$.fragment, local);
    			transition_out(wuilabelhint3.$$.fragment, local);
    			transition_out(wuilabelhint4.$$.fragment, local);
    			transition_out(wuilabelhint5.$$.fragment, local);
    			transition_out(wuilabelhint6.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h3);
    			if (detaching) detach_dev(t3);
    			if (detaching) detach_dev(h40);
    			if (detaching) detach_dev(t6);
    			if (detaching) detach_dev(div1);
    			destroy_component(wuilabelhint0);
    			destroy_component(wuilabelhint1);
    			destroy_component(wuilabelhint2);
    			destroy_component(wuilabelhint3);
    			destroy_component(wuilabelhint4);
    			destroy_component(wuilabelhint5);
    			destroy_component(wuilabelhint6);
    			if (detaching) detach_dev(t15);
    			if (detaching) detach_dev(h41);
    			if (detaching) detach_dev(t17);
    			if (detaching) detach_dev(div2);
    			if (detaching) detach_dev(t23);
    			destroy_each(each_blocks_1, detaching);
    			if (detaching) detach_dev(t24);
    			if (detaching) detach_dev(form);
    			destroy_each(each_blocks, detaching);

    			if (if_block) {
    				if_block.d();
    			}

    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block$1.name,
    		type: "else",
    		source: "(306:2) {:else}",
    		ctx
    	});

    	return block;
    }

    // (302:2) {#if activeZone.Name === ""}
    function create_if_block$5(ctx) {
    	let p;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "Select one of the zone file to manage.";
    			add_location(p, file$9, 302, 3, 5439);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$5.name,
    		type: "if",
    		source: "(302:2) {#if activeZone.Name === \\\"\\\"}",
    		ctx
    	});

    	return block;
    }

    // (327:4) <WuiLabelHint      title="Name server"      title_width="150px"      info="The domain-name of the name server that was the original or primary source of data for this zone. It should be domain-name where the rescached run."     >
    function create_default_slot_6$1(ctx) {
    	let input;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			input = element("input");
    			add_location(input, file$9, 333, 5, 6050);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, input, anchor);
    			set_input_value(input, /*activeZone*/ ctx[2].SOA.Value.MName);

    			if (!mounted) {
    				dispose = listen_dev(input, "input", /*input_input_handler_1*/ ctx[16]);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*activeZone*/ 4 && input.value !== /*activeZone*/ ctx[2].SOA.Value.MName) {
    				set_input_value(input, /*activeZone*/ ctx[2].SOA.Value.MName);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(input);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_6$1.name,
    		type: "slot",
    		source: "(327:4) <WuiLabelHint      title=\\\"Name server\\\"      title_width=\\\"150px\\\"      info=\\\"The domain-name of the name server that was the original or primary source of data for this zone. It should be domain-name where the rescached run.\\\"     >",
    		ctx
    	});

    	return block;
    }

    // (336:4) <WuiLabelHint      title="Admin email"      title_width="150px"      info='Email address of the administrator responsible for this zone. The "@" on email address is replaced with dot, and if there is a dot before "@" it should be escaped with "\". For example, "dns.admin@domain.tld" would be written as "dns\.admin.domain.tld".'     >
    function create_default_slot_5$1(ctx) {
    	let input;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			input = element("input");
    			add_location(input, file$9, 345, 5, 6463);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, input, anchor);
    			set_input_value(input, /*activeZone*/ ctx[2].SOA.Value.RName);

    			if (!mounted) {
    				dispose = listen_dev(input, "input", /*input_input_handler_2*/ ctx[17]);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*activeZone*/ 4 && input.value !== /*activeZone*/ ctx[2].SOA.Value.RName) {
    				set_input_value(input, /*activeZone*/ ctx[2].SOA.Value.RName);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(input);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_5$1.name,
    		type: "slot",
    		source: "(336:4) <WuiLabelHint      title=\\\"Admin email\\\"      title_width=\\\"150px\\\"      info='Email address of the administrator responsible for this zone. The \\\"@\\\" on email address is replaced with dot, and if there is a dot before \\\"@\\\" it should be escaped with \\\"\\\\\". For example, \\\"dns.admin@domain.tld\\\" would be written as \\\"dns\\.admin.domain.tld\\\".'     >",
    		ctx
    	});

    	return block;
    }

    // (348:4) <WuiLabelHint      title="Serial"      title_width="150px"      info="Serial number for this zone. If a secondary name server observes an increase in this number, the server will assume that the zone has been updated and initiate a zone transfer."     >
    function create_default_slot_4$1(ctx) {
    	let input;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			input = element("input");
    			attr_dev(input, "type", "number");
    			attr_dev(input, "min", "0");
    			add_location(input, file$9, 354, 5, 6794);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, input, anchor);
    			set_input_value(input, /*activeZone*/ ctx[2].SOA.Value.Serial);

    			if (!mounted) {
    				dispose = listen_dev(input, "input", /*input_input_handler_3*/ ctx[18]);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*activeZone*/ 4 && to_number(input.value) !== /*activeZone*/ ctx[2].SOA.Value.Serial) {
    				set_input_value(input, /*activeZone*/ ctx[2].SOA.Value.Serial);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(input);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_4$1.name,
    		type: "slot",
    		source: "(348:4) <WuiLabelHint      title=\\\"Serial\\\"      title_width=\\\"150px\\\"      info=\\\"Serial number for this zone. If a secondary name server observes an increase in this number, the server will assume that the zone has been updated and initiate a zone transfer.\\\"     >",
    		ctx
    	});

    	return block;
    }

    // (361:4) <WuiLabelHint      title="Refresh"      title_width="150px"      info="Number of seconds after which secondary name servers should query the master for the SOA record, to detect zone changes. Recommendation for small and stable zones is 86400 seconds (24 hours)."     >
    function create_default_slot_3$1(ctx) {
    	let input;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			input = element("input");
    			attr_dev(input, "type", "number");
    			attr_dev(input, "min", "0");
    			add_location(input, file$9, 367, 5, 7184);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, input, anchor);
    			set_input_value(input, /*activeZone*/ ctx[2].SOA.Value.Refresh);

    			if (!mounted) {
    				dispose = listen_dev(input, "input", /*input_input_handler_4*/ ctx[19]);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*activeZone*/ 4 && to_number(input.value) !== /*activeZone*/ ctx[2].SOA.Value.Refresh) {
    				set_input_value(input, /*activeZone*/ ctx[2].SOA.Value.Refresh);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(input);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_3$1.name,
    		type: "slot",
    		source: "(361:4) <WuiLabelHint      title=\\\"Refresh\\\"      title_width=\\\"150px\\\"      info=\\\"Number of seconds after which secondary name servers should query the master for the SOA record, to detect zone changes. Recommendation for small and stable zones is 86400 seconds (24 hours).\\\"     >",
    		ctx
    	});

    	return block;
    }

    // (374:4) <WuiLabelHint      title="Retry"      title_width="150px"      info="Number of seconds after which secondary name servers should retry to request the serial number from the master if the master does not respond. It must be less than Refresh. Recommendation for small and stable zones is 7200 seconds (2 hours)."     >
    function create_default_slot_2$1(ctx) {
    	let input;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			input = element("input");
    			attr_dev(input, "type", "number");
    			attr_dev(input, "min", "0");
    			add_location(input, file$9, 382, 5, 7623);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, input, anchor);
    			set_input_value(input, /*activeZone*/ ctx[2].SOA.Value.Retry);

    			if (!mounted) {
    				dispose = listen_dev(input, "input", /*input_input_handler_5*/ ctx[20]);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*activeZone*/ 4 && to_number(input.value) !== /*activeZone*/ ctx[2].SOA.Value.Retry) {
    				set_input_value(input, /*activeZone*/ ctx[2].SOA.Value.Retry);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(input);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_2$1.name,
    		type: "slot",
    		source: "(374:4) <WuiLabelHint      title=\\\"Retry\\\"      title_width=\\\"150px\\\"      info=\\\"Number of seconds after which secondary name servers should retry to request the serial number from the master if the master does not respond. It must be less than Refresh. Recommendation for small and stable zones is 7200 seconds (2 hours).\\\"     >",
    		ctx
    	});

    	return block;
    }

    // (389:4) <WuiLabelHint      title="Expire"      title_width="150px"      info="Number of seconds after which secondary name servers should stop answering request for this zone if the master does not respond. This value must be bigger than the sum of Refresh and Retry. Recommendation for small and stable zones is 3600000 seconds (1000 hours)."     >
    function create_default_slot_1$1(ctx) {
    	let input;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			input = element("input");
    			attr_dev(input, "type", "number");
    			attr_dev(input, "min", "0");
    			add_location(input, file$9, 396, 5, 8084);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, input, anchor);
    			set_input_value(input, /*activeZone*/ ctx[2].SOA.Value.Expire);

    			if (!mounted) {
    				dispose = listen_dev(input, "input", /*input_input_handler_6*/ ctx[21]);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*activeZone*/ 4 && to_number(input.value) !== /*activeZone*/ ctx[2].SOA.Value.Expire) {
    				set_input_value(input, /*activeZone*/ ctx[2].SOA.Value.Expire);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(input);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_1$1.name,
    		type: "slot",
    		source: "(389:4) <WuiLabelHint      title=\\\"Expire\\\"      title_width=\\\"150px\\\"      info=\\\"Number of seconds after which secondary name servers should stop answering request for this zone if the master does not respond. This value must be bigger than the sum of Refresh and Retry. Recommendation for small and stable zones is 3600000 seconds (1000 hours).\\\"     >",
    		ctx
    	});

    	return block;
    }

    // (403:4) <WuiLabelHint      title="Minimum"      title_width="150px"      info="Time to live for purposes of negative caching. Recommendation for small and stable zones is 1800 seconds (30 min)."     >
    function create_default_slot$1(ctx) {
    	let input;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			input = element("input");
    			attr_dev(input, "type", "number");
    			attr_dev(input, "min", "0");
    			add_location(input, file$9, 408, 5, 8397);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, input, anchor);
    			set_input_value(input, /*activeZone*/ ctx[2].SOA.Value.Minimum);

    			if (!mounted) {
    				dispose = listen_dev(input, "input", /*input_input_handler_7*/ ctx[22]);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*activeZone*/ 4 && to_number(input.value) !== /*activeZone*/ ctx[2].SOA.Value.Minimum) {
    				set_input_value(input, /*activeZone*/ ctx[2].SOA.Value.Minimum);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(input);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot$1.name,
    		type: "slot",
    		source: "(403:4) <WuiLabelHint      title=\\\"Minimum\\\"      title_width=\\\"150px\\\"      info=\\\"Time to live for purposes of negative caching. Recommendation for small and stable zones is 1800 seconds (30 min).\\\"     >",
    		ctx
    	});

    	return block;
    }

    // (436:4) {#each listRR as rr, idx}
    function create_each_block_2$1(ctx) {
    	let div;
    	let span0;
    	let t0_value = /*rr*/ ctx[40].Name + "";
    	let t0;
    	let t1;
    	let span1;
    	let t2_value = /*getTypeName*/ ctx[14](/*rr*/ ctx[40].Type) + "";
    	let t2;
    	let t3;
    	let span2;
    	let t4_value = /*rr*/ ctx[40].Value + "";
    	let t4;
    	let t5;
    	let button;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div = element("div");
    			span0 = element("span");
    			t0 = text(t0_value);
    			t1 = space();
    			span1 = element("span");
    			t2 = text(t2_value);
    			t3 = space();
    			span2 = element("span");
    			t4 = text(t4_value);
    			t5 = space();
    			button = element("button");
    			button.textContent = "X";
    			attr_dev(span0, "class", "name svelte-yu4l71");
    			add_location(span0, file$9, 437, 6, 8950);
    			attr_dev(span1, "class", "type svelte-yu4l71");
    			add_location(span1, file$9, 440, 6, 9007);
    			attr_dev(span2, "class", "value svelte-yu4l71");
    			add_location(span2, file$9, 443, 6, 9077);
    			add_location(button, file$9, 446, 6, 9136);
    			attr_dev(div, "class", "rr svelte-yu4l71");
    			add_location(div, file$9, 436, 5, 8927);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, span0);
    			append_dev(span0, t0);
    			append_dev(div, t1);
    			append_dev(div, span1);
    			append_dev(span1, t2);
    			append_dev(div, t3);
    			append_dev(div, span2);
    			append_dev(span2, t4);
    			append_dev(div, t5);
    			append_dev(div, button);

    			if (!mounted) {
    				dispose = listen_dev(
    					button,
    					"click",
    					function () {
    						if (is_function(/*handleDeleteRR*/ ctx[13](/*rr*/ ctx[40], /*idx*/ ctx[42]))) /*handleDeleteRR*/ ctx[13](/*rr*/ ctx[40], /*idx*/ ctx[42]).apply(this, arguments);
    					},
    					false,
    					false,
    					false
    				);

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty[0] & /*activeZone*/ 4 && t0_value !== (t0_value = /*rr*/ ctx[40].Name + "")) set_data_dev(t0, t0_value);
    			if (dirty[0] & /*activeZone*/ 4 && t2_value !== (t2_value = /*getTypeName*/ ctx[14](/*rr*/ ctx[40].Type) + "")) set_data_dev(t2, t2_value);
    			if (dirty[0] & /*activeZone*/ 4 && t4_value !== (t4_value = /*rr*/ ctx[40].Value + "")) set_data_dev(t4, t4_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_2$1.name,
    		type: "each",
    		source: "(436:4) {#each listRR as rr, idx}",
    		ctx
    	});

    	return block;
    }

    // (435:3) {#each Object.entries(activeZone.Records) as [dname, listRR]}
    function create_each_block_1$2(ctx) {
    	let each_1_anchor;
    	let each_value_2 = /*listRR*/ ctx[37];
    	validate_each_argument(each_value_2);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_2.length; i += 1) {
    		each_blocks[i] = create_each_block_2$1(get_each_context_2$1(ctx, each_value_2, i));
    	}

    	const block = {
    		c: function create() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each_1_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*handleDeleteRR, activeZone, getTypeName*/ 24580) {
    				each_value_2 = /*listRR*/ ctx[37];
    				validate_each_argument(each_value_2);
    				let i;

    				for (i = 0; i < each_value_2.length; i += 1) {
    					const child_ctx = get_each_context_2$1(ctx, each_value_2, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_2$1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_2.length;
    			}
    		},
    		d: function destroy(detaching) {
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(each_1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1$2.name,
    		type: "each",
    		source: "(435:3) {#each Object.entries(activeZone.Records) as [dname, listRR]}",
    		ctx
    	});

    	return block;
    }

    // (463:6) {#each Object.entries(RRTypes) as [k, v]}
    function create_each_block$5(ctx) {
    	let option;
    	let t0_value = /*v*/ ctx[33] + "";
    	let t0;
    	let t1;
    	let option_value_value;

    	const block = {
    		c: function create() {
    			option = element("option");
    			t0 = text(t0_value);
    			t1 = space();
    			option.__value = option_value_value = parseInt(/*k*/ ctx[32]);
    			option.value = option.__value;
    			add_location(option, file$9, 463, 7, 9476);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, option, anchor);
    			append_dev(option, t0);
    			append_dev(option, t1);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(option);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$5.name,
    		type: "each",
    		source: "(463:6) {#each Object.entries(RRTypes) as [k, v]}",
    		ctx
    	});

    	return block;
    }

    // (502:30) 
    function create_if_block_3(ctx) {
    	let label0;
    	let span0;
    	let t1;
    	let input0;
    	let t2;
    	let t3_value = /*activeZone*/ ctx[2].Name + "";
    	let t3;
    	let t4;
    	let label1;
    	let span1;
    	let t6;
    	let input1;
    	let t7;
    	let label2;
    	let span2;
    	let t9;
    	let input2;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			label0 = element("label");
    			span0 = element("span");
    			span0.textContent = "Name:";
    			t1 = space();
    			input0 = element("input");
    			t2 = text("\n\t\t\t\t\t\t.");
    			t3 = text(t3_value);
    			t4 = space();
    			label1 = element("label");
    			span1 = element("span");
    			span1.textContent = "Preference:";
    			t6 = space();
    			input1 = element("input");
    			t7 = space();
    			label2 = element("label");
    			span2 = element("span");
    			span2.textContent = "Exchange:";
    			t9 = space();
    			input2 = element("input");
    			attr_dev(span0, "class", "svelte-yu4l71");
    			add_location(span0, file$9, 503, 6, 10285);
    			attr_dev(input0, "class", "name svelte-yu4l71");
    			add_location(input0, file$9, 506, 6, 10325);
    			attr_dev(label0, "class", "svelte-yu4l71");
    			add_location(label0, file$9, 502, 5, 10271);
    			attr_dev(span1, "class", "svelte-yu4l71");
    			add_location(span1, file$9, 510, 6, 10426);
    			attr_dev(input1, "type", "number");
    			attr_dev(input1, "min", "1");
    			attr_dev(input1, "max", "65535");
    			attr_dev(input1, "class", "svelte-yu4l71");
    			add_location(input1, file$9, 513, 6, 10472);
    			attr_dev(label1, "class", "svelte-yu4l71");
    			add_location(label1, file$9, 509, 5, 10412);
    			attr_dev(span2, "class", "svelte-yu4l71");
    			add_location(span2, file$9, 516, 6, 10571);
    			attr_dev(input2, "class", "svelte-yu4l71");
    			add_location(input2, file$9, 519, 6, 10615);
    			attr_dev(label2, "class", "svelte-yu4l71");
    			add_location(label2, file$9, 515, 5, 10557);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, label0, anchor);
    			append_dev(label0, span0);
    			append_dev(label0, t1);
    			append_dev(label0, input0);
    			set_input_value(input0, /*_rr*/ ctx[3].Name);
    			append_dev(label0, t2);
    			append_dev(label0, t3);
    			insert_dev(target, t4, anchor);
    			insert_dev(target, label1, anchor);
    			append_dev(label1, span1);
    			append_dev(label1, t6);
    			append_dev(label1, input1);
    			set_input_value(input1, /*_rrMX*/ ctx[4].Preference);
    			insert_dev(target, t7, anchor);
    			insert_dev(target, label2, anchor);
    			append_dev(label2, span2);
    			append_dev(label2, t9);
    			append_dev(label2, input2);
    			set_input_value(input2, /*_rrMX*/ ctx[4].Exchange);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input0, "input", /*input0_input_handler_2*/ ctx[28]),
    					listen_dev(input1, "input", /*input1_input_handler_2*/ ctx[29]),
    					listen_dev(input2, "input", /*input2_input_handler*/ ctx[30])
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*_rr, RRTypes*/ 40 && input0.value !== /*_rr*/ ctx[3].Name) {
    				set_input_value(input0, /*_rr*/ ctx[3].Name);
    			}

    			if (dirty[0] & /*activeZone*/ 4 && t3_value !== (t3_value = /*activeZone*/ ctx[2].Name + "")) set_data_dev(t3, t3_value);

    			if (dirty[0] & /*_rrMX*/ 16 && to_number(input1.value) !== /*_rrMX*/ ctx[4].Preference) {
    				set_input_value(input1, /*_rrMX*/ ctx[4].Preference);
    			}

    			if (dirty[0] & /*_rrMX*/ 16 && input2.value !== /*_rrMX*/ ctx[4].Exchange) {
    				set_input_value(input2, /*_rrMX*/ ctx[4].Exchange);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(label0);
    			if (detaching) detach_dev(t4);
    			if (detaching) detach_dev(label1);
    			if (detaching) detach_dev(t7);
    			if (detaching) detach_dev(label2);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3.name,
    		type: "if",
    		source: "(502:30) ",
    		ctx
    	});

    	return block;
    }

    // (488:30) 
    function create_if_block_2$1(ctx) {
    	let label0;
    	let span0;
    	let t1;
    	let input0;
    	let t2;
    	let label1;
    	let span1;
    	let t4;
    	let input1;
    	let t5;
    	let t6_value = /*activeZone*/ ctx[2].Name + "";
    	let t6;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			label0 = element("label");
    			span0 = element("span");
    			span0.textContent = "Name:";
    			t1 = space();
    			input0 = element("input");
    			t2 = space();
    			label1 = element("label");
    			span1 = element("span");
    			span1.textContent = "Value:";
    			t4 = space();
    			input1 = element("input");
    			t5 = text("\n\t\t\t\t\t\t.");
    			t6 = text(t6_value);
    			attr_dev(span0, "class", "svelte-yu4l71");
    			add_location(span0, file$9, 489, 6, 9996);
    			attr_dev(input0, "class", "svelte-yu4l71");
    			add_location(input0, file$9, 492, 6, 10036);
    			attr_dev(label0, "class", "svelte-yu4l71");
    			add_location(label0, file$9, 488, 5, 9982);
    			attr_dev(span1, "class", "svelte-yu4l71");
    			add_location(span1, file$9, 495, 6, 10099);
    			attr_dev(input1, "class", "name svelte-yu4l71");
    			add_location(input1, file$9, 498, 6, 10140);
    			attr_dev(label1, "class", "svelte-yu4l71");
    			add_location(label1, file$9, 494, 5, 10085);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, label0, anchor);
    			append_dev(label0, span0);
    			append_dev(label0, t1);
    			append_dev(label0, input0);
    			set_input_value(input0, /*_rr*/ ctx[3].Name);
    			insert_dev(target, t2, anchor);
    			insert_dev(target, label1, anchor);
    			append_dev(label1, span1);
    			append_dev(label1, t4);
    			append_dev(label1, input1);
    			set_input_value(input1, /*_rr*/ ctx[3].Value);
    			append_dev(label1, t5);
    			append_dev(label1, t6);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input0, "input", /*input0_input_handler_1*/ ctx[26]),
    					listen_dev(input1, "input", /*input1_input_handler_1*/ ctx[27])
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*_rr, RRTypes*/ 40 && input0.value !== /*_rr*/ ctx[3].Name) {
    				set_input_value(input0, /*_rr*/ ctx[3].Name);
    			}

    			if (dirty[0] & /*_rr, RRTypes*/ 40 && input1.value !== /*_rr*/ ctx[3].Value) {
    				set_input_value(input1, /*_rr*/ ctx[3].Value);
    			}

    			if (dirty[0] & /*activeZone*/ 4 && t6_value !== (t6_value = /*activeZone*/ ctx[2].Name + "")) set_data_dev(t6, t6_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(label0);
    			if (detaching) detach_dev(t2);
    			if (detaching) detach_dev(label1);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2$1.name,
    		type: "if",
    		source: "(488:30) ",
    		ctx
    	});

    	return block;
    }

    // (471:4) {#if _rr.Type === 1 || _rr.Type === 2 || _rr.Type === 5 ||      _rr.Type === 16 || _rr.Type === 28     }
    function create_if_block_1$2(ctx) {
    	let label0;
    	let span0;
    	let t1;
    	let input0;
    	let t2;
    	let t3_value = /*activeZone*/ ctx[2].Name + "";
    	let t3;
    	let t4;
    	let label1;
    	let span1;
    	let t6;
    	let input1;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			label0 = element("label");
    			span0 = element("span");
    			span0.textContent = "Name:";
    			t1 = space();
    			input0 = element("input");
    			t2 = text("\n\t\t\t\t\t\t.");
    			t3 = text(t3_value);
    			t4 = space();
    			label1 = element("label");
    			span1 = element("span");
    			span1.textContent = "Value:";
    			t6 = space();
    			input1 = element("input");
    			attr_dev(span0, "class", "svelte-yu4l71");
    			add_location(span0, file$9, 474, 6, 9705);
    			attr_dev(input0, "class", "name svelte-yu4l71");
    			add_location(input0, file$9, 477, 6, 9745);
    			attr_dev(label0, "class", "svelte-yu4l71");
    			add_location(label0, file$9, 473, 5, 9691);
    			attr_dev(span1, "class", "svelte-yu4l71");
    			add_location(span1, file$9, 482, 6, 9847);
    			attr_dev(input1, "class", "svelte-yu4l71");
    			add_location(input1, file$9, 485, 6, 9888);
    			attr_dev(label1, "class", "svelte-yu4l71");
    			add_location(label1, file$9, 481, 5, 9833);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, label0, anchor);
    			append_dev(label0, span0);
    			append_dev(label0, t1);
    			append_dev(label0, input0);
    			set_input_value(input0, /*_rr*/ ctx[3].Name);
    			append_dev(label0, t2);
    			append_dev(label0, t3);
    			insert_dev(target, t4, anchor);
    			insert_dev(target, label1, anchor);
    			append_dev(label1, span1);
    			append_dev(label1, t6);
    			append_dev(label1, input1);
    			set_input_value(input1, /*_rr*/ ctx[3].Value);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input0, "input", /*input0_input_handler*/ ctx[24]),
    					listen_dev(input1, "input", /*input1_input_handler*/ ctx[25])
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*_rr, RRTypes*/ 40 && input0.value !== /*_rr*/ ctx[3].Name) {
    				set_input_value(input0, /*_rr*/ ctx[3].Name);
    			}

    			if (dirty[0] & /*activeZone*/ 4 && t3_value !== (t3_value = /*activeZone*/ ctx[2].Name + "")) set_data_dev(t3, t3_value);

    			if (dirty[0] & /*_rr, RRTypes*/ 40 && input1.value !== /*_rr*/ ctx[3].Value) {
    				set_input_value(input1, /*_rr*/ ctx[3].Value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(label0);
    			if (detaching) detach_dev(t4);
    			if (detaching) detach_dev(label1);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$2.name,
    		type: "if",
    		source: "(471:4) {#if _rr.Type === 1 || _rr.Type === 2 || _rr.Type === 5 ||      _rr.Type === 16 || _rr.Type === 28     }",
    		ctx
    	});

    	return block;
    }

    function create_fragment$9(ctx) {
    	let div2;
    	let div0;
    	let t0;
    	let br0;
    	let t1;
    	let label;
    	let span;
    	let t3;
    	let br1;
    	let t4;
    	let input;
    	let t5;
    	let button;
    	let t7;
    	let div1;
    	let current_block_type_index;
    	let if_block;
    	let current;
    	let mounted;
    	let dispose;
    	let each_value_3 = Object.entries(/*env*/ ctx[0].ZoneFiles);
    	validate_each_argument(each_value_3);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_3.length; i += 1) {
    		each_blocks[i] = create_each_block_3$1(get_each_context_3$1(ctx, each_value_3, i));
    	}

    	const if_block_creators = [create_if_block$5, create_else_block$1];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*activeZone*/ ctx[2].Name === "") return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			div0 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t0 = space();
    			br0 = element("br");
    			t1 = space();
    			label = element("label");
    			span = element("span");
    			span.textContent = "New zone file:";
    			t3 = space();
    			br1 = element("br");
    			t4 = space();
    			input = element("input");
    			t5 = space();
    			button = element("button");
    			button.textContent = "Create";
    			t7 = space();
    			div1 = element("div");
    			if_block.c();
    			add_location(br0, file$9, 288, 2, 5204);
    			add_location(span, file$9, 291, 3, 5224);
    			add_location(br1, file$9, 292, 3, 5255);
    			add_location(input, file$9, 293, 3, 5264);
    			add_location(label, file$9, 290, 2, 5213);
    			add_location(button, file$9, 295, 2, 5310);
    			attr_dev(div0, "class", "nav-left svelte-yu4l71");
    			add_location(div0, file$9, 280, 1, 4998);
    			attr_dev(div1, "class", "content svelte-yu4l71");
    			add_location(div1, file$9, 300, 1, 5383);
    			attr_dev(div2, "class", "master_d");
    			add_location(div2, file$9, 279, 0, 4974);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div0);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div0, null);
    			}

    			append_dev(div0, t0);
    			append_dev(div0, br0);
    			append_dev(div0, t1);
    			append_dev(div0, label);
    			append_dev(label, span);
    			append_dev(label, t3);
    			append_dev(label, br1);
    			append_dev(label, t4);
    			append_dev(label, input);
    			set_input_value(input, /*newZoneFile*/ ctx[1]);
    			append_dev(div0, t5);
    			append_dev(div0, button);
    			append_dev(div2, t7);
    			append_dev(div2, div1);
    			if_blocks[current_block_type_index].m(div1, null);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(input, "input", /*input_input_handler*/ ctx[15]),
    					listen_dev(button, "click", /*handleZoneFileCreate*/ ctx[7], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*setActiveZone, env*/ 65) {
    				each_value_3 = Object.entries(/*env*/ ctx[0].ZoneFiles);
    				validate_each_argument(each_value_3);
    				let i;

    				for (i = 0; i < each_value_3.length; i += 1) {
    					const child_ctx = get_each_context_3$1(ctx, each_value_3, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_3$1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div0, t0);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_3.length;
    			}

    			if (dirty[0] & /*newZoneFile*/ 2 && input.value !== /*newZoneFile*/ ctx[1]) {
    				set_input_value(input, /*newZoneFile*/ ctx[1]);
    			}

    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				}

    				transition_in(if_block, 1);
    				if_block.m(div1, null);
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
    			if (detaching) detach_dev(div2);
    			destroy_each(each_blocks, detaching);
    			if_blocks[current_block_type_index].d();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$9.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    const apiMasterd = "/api/master.d/";

    function newRR() {
    	return { Name: "", Type: 1, Value: "" };
    }

    function newMX() {
    	return { Preference: 1, Exchange: "" };
    }

    function newSOA() {
    	return {
    		Name: "",
    		Type: 6,
    		Value: {
    			MName: "",
    			RName: "",
    			Serial: 0,
    			Refresh: 0,
    			Retry: 0,
    			Expire: 0,
    			Minimum: 0
    		}
    	};
    }

    function instance$9($$self, $$props, $$invalidate) {
    	let env = {
    		NameServers: [],
    		HostsBlocks: [],
    		HostsFiles: [],
    		ZoneFiles: {}
    	};

    	let newZoneFile = "";
    	let activeZone = { Name: "" };

    	let RRTypes = {
    		1: "A",
    		2: "NS",
    		5: "CNAME",
    		12: "PTR",
    		15: "MX",
    		16: "TXT",
    		28: "AAAA"
    	};

    	let _rr = newRR();
    	let _rrMX = newMX();

    	const envUnsubscribe = environment.subscribe(value => {
    		$$invalidate(0, env = value);
    	});

    	onDestroy(envUnsubscribe);

    	function setActiveZone(zone) {
    		if (zone.SOA === null) {
    			zone.SOA = newSOA();
    		}

    		$$invalidate(2, activeZone = zone);
    	}

    	async function handleZoneFileCreate() {
    		const res = await fetch(apiMasterd + newZoneFile, { method: "PUT" });

    		if (res.status >= 400) {
    			const resError = await res.json();
    			WuiPushNotif.Error("ERROR: handleZoneFileCreate: " + resError.message);
    			return;
    		}

    		$$invalidate(2, activeZone = await res.json());
    		$$invalidate(2, activeZone.SOA = newSOA(), activeZone);
    		$$invalidate(0, env.ZoneFiles[activeZone.Name] = activeZone, env);
    		WuiPushNotif.Info("The new zone file '" + newZoneFile + "' has been created");
    	}

    	async function handleZoneFileDelete() {
    		let api = apiMasterd + activeZone.Name;
    		const res = await fetch(api, { method: "DELETE" });

    		if (res.status >= 400) {
    			const resError = await res.json();
    			WuiPushNotif.Error("ERROR: handleZoneFileDelete: " + resError.message);
    			return;
    		}

    		WuiPushNotif.Info("The zone file '" + activeZone.Name + "' has beed deleted");
    		delete env.ZoneFiles[activeZone.Name];
    		$$invalidate(2, activeZone = { Name: "" });
    		$$invalidate(0, env);
    	}

    	function onSelectRRType() {
    		switch (_rr.Type) {
    			case 15:
    				$$invalidate(4, _rrMX = newMX());
    				break;
    		}
    	}

    	async function handleSOADelete() {
    		return handleDeleteRR(activeZone.SOA, -1);
    	}

    	async function handleSOASave() {
    		$$invalidate(3, _rr = activeZone.SOA);
    		return handleCreateRR();
    	}

    	async function handleCreateRR() {
    		switch (_rr.Type) {
    			case 15:
    				$$invalidate(3, _rr.Value = _rrMX, _rr);
    				break;
    		}

    		let api = apiMasterd + activeZone.Name + "/rr/" + _rr.Type;

    		const res = await fetch(api, {
    			method: "POST",
    			headers: { "Content-Type": "application/json" },
    			body: JSON.stringify(_rr)
    		});

    		if (res.status >= 400) {
    			const resError = await res.json();
    			WuiPushNotif.Error("ERROR: handleCreateRR: " + resError.message);
    			return;
    		}

    		let resRR = await res.json();

    		if (resRR.Type === 6) {
    			$$invalidate(2, activeZone.SOA = resRR, activeZone);
    			WuiPushNotif.Info("SOA record has been saved");
    		} else {
    			let listRR = activeZone.Records[resRR.Name];

    			if (typeof listRR === "undefined") {
    				listRR = [];
    			}

    			listRR.push(resRR);
    			$$invalidate(2, activeZone.Records[resRR.Name] = listRR, activeZone);
    			WuiPushNotif.Info("The new record '" + resRR.Name + "' has been created");
    		}
    	}

    	async function handleDeleteRR(rr, idx) {
    		let api = apiMasterd + activeZone.Name + "/rr/" + rr.Type;

    		const res = await fetch(api, {
    			method: "DELETE",
    			headers: { "Content-Type": "application/json" },
    			body: JSON.stringify(rr)
    		});

    		if (res.status >= 400) {
    			const resError = await res.json();
    			WuiPushNotif.Error("ERROR: handleDeleteRR: " + resError.message);
    			return;
    		}

    		WuiPushNotif.Info("The record '" + rr.Name + "' has been deleted");

    		if (rr.Type == 6) {
    			// SOA.
    			$$invalidate(2, activeZone.SOA = newSOA(), activeZone);
    		} else {
    			let listRR = activeZone.Records[rr.Name];
    			listRR.splice(idx, 1);
    			$$invalidate(2, activeZone.Records[rr.Name] = listRR, activeZone);
    		}

    		let resbody = await res.json();
    	}

    	function getTypeName(k) {
    		let v = RRTypes[k];

    		if (v === "") {
    			return k;
    		}

    		return v;
    	}

    	const writable_props = [];

    	Object_1$2.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<MasterDir> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("MasterDir", $$slots, []);

    	function input_input_handler() {
    		newZoneFile = this.value;
    		$$invalidate(1, newZoneFile);
    	}

    	function input_input_handler_1() {
    		activeZone.SOA.Value.MName = this.value;
    		$$invalidate(2, activeZone);
    	}

    	function input_input_handler_2() {
    		activeZone.SOA.Value.RName = this.value;
    		$$invalidate(2, activeZone);
    	}

    	function input_input_handler_3() {
    		activeZone.SOA.Value.Serial = to_number(this.value);
    		$$invalidate(2, activeZone);
    	}

    	function input_input_handler_4() {
    		activeZone.SOA.Value.Refresh = to_number(this.value);
    		$$invalidate(2, activeZone);
    	}

    	function input_input_handler_5() {
    		activeZone.SOA.Value.Retry = to_number(this.value);
    		$$invalidate(2, activeZone);
    	}

    	function input_input_handler_6() {
    		activeZone.SOA.Value.Expire = to_number(this.value);
    		$$invalidate(2, activeZone);
    	}

    	function input_input_handler_7() {
    		activeZone.SOA.Value.Minimum = to_number(this.value);
    		$$invalidate(2, activeZone);
    	}

    	function select_change_handler() {
    		_rr.Type = select_value(this);
    		$$invalidate(3, _rr);
    		$$invalidate(5, RRTypes);
    	}

    	function input0_input_handler() {
    		_rr.Name = this.value;
    		$$invalidate(3, _rr);
    		$$invalidate(5, RRTypes);
    	}

    	function input1_input_handler() {
    		_rr.Value = this.value;
    		$$invalidate(3, _rr);
    		$$invalidate(5, RRTypes);
    	}

    	function input0_input_handler_1() {
    		_rr.Name = this.value;
    		$$invalidate(3, _rr);
    		$$invalidate(5, RRTypes);
    	}

    	function input1_input_handler_1() {
    		_rr.Value = this.value;
    		$$invalidate(3, _rr);
    		$$invalidate(5, RRTypes);
    	}

    	function input0_input_handler_2() {
    		_rr.Name = this.value;
    		$$invalidate(3, _rr);
    		$$invalidate(5, RRTypes);
    	}

    	function input1_input_handler_2() {
    		_rrMX.Preference = to_number(this.value);
    		$$invalidate(4, _rrMX);
    	}

    	function input2_input_handler() {
    		_rrMX.Exchange = this.value;
    		$$invalidate(4, _rrMX);
    	}

    	$$self.$capture_state = () => ({
    		onDestroy,
    		WuiPushNotif,
    		WuiLabelHint: LabelHint,
    		environment,
    		nanoSeconds,
    		setEnvironment,
    		apiMasterd,
    		env,
    		newZoneFile,
    		activeZone,
    		RRTypes,
    		_rr,
    		_rrMX,
    		envUnsubscribe,
    		setActiveZone,
    		handleZoneFileCreate,
    		handleZoneFileDelete,
    		onSelectRRType,
    		handleSOADelete,
    		handleSOASave,
    		handleCreateRR,
    		handleDeleteRR,
    		getTypeName,
    		newRR,
    		newMX,
    		newSOA
    	});

    	$$self.$inject_state = $$props => {
    		if ("env" in $$props) $$invalidate(0, env = $$props.env);
    		if ("newZoneFile" in $$props) $$invalidate(1, newZoneFile = $$props.newZoneFile);
    		if ("activeZone" in $$props) $$invalidate(2, activeZone = $$props.activeZone);
    		if ("RRTypes" in $$props) $$invalidate(5, RRTypes = $$props.RRTypes);
    		if ("_rr" in $$props) $$invalidate(3, _rr = $$props._rr);
    		if ("_rrMX" in $$props) $$invalidate(4, _rrMX = $$props._rrMX);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		env,
    		newZoneFile,
    		activeZone,
    		_rr,
    		_rrMX,
    		RRTypes,
    		setActiveZone,
    		handleZoneFileCreate,
    		handleZoneFileDelete,
    		onSelectRRType,
    		handleSOADelete,
    		handleSOASave,
    		handleCreateRR,
    		handleDeleteRR,
    		getTypeName,
    		input_input_handler,
    		input_input_handler_1,
    		input_input_handler_2,
    		input_input_handler_3,
    		input_input_handler_4,
    		input_input_handler_5,
    		input_input_handler_6,
    		input_input_handler_7,
    		select_change_handler,
    		input0_input_handler,
    		input1_input_handler,
    		input0_input_handler_1,
    		input1_input_handler_1,
    		input0_input_handler_2,
    		input1_input_handler_2,
    		input2_input_handler
    	];
    }

    class MasterDir extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$9, create_fragment$9, safe_not_equal, {}, [-1, -1]);

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "MasterDir",
    			options,
    			id: create_fragment$9.name
    		});
    	}
    }

    /* src/App.svelte generated by Svelte v3.24.1 */
    const file$a = "src/App.svelte";

    // (113:1) {:else}
    function create_else_block$2(ctx) {
    	let dashboard;
    	let current;
    	dashboard = new Dashboard({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(dashboard.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(dashboard, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(dashboard.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(dashboard.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(dashboard, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block$2.name,
    		type: "else",
    		source: "(113:1) {:else}",
    		ctx
    	});

    	return block;
    }

    // (111:36) 
    function create_if_block_3$1(ctx) {
    	let masterdir;
    	let current;
    	masterdir = new MasterDir({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(masterdir.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(masterdir, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(masterdir.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(masterdir.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(masterdir, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3$1.name,
    		type: "if",
    		source: "(111:36) ",
    		ctx
    	});

    	return block;
    }

    // (109:35) 
    function create_if_block_2$2(ctx) {
    	let hostsdir;
    	let current;
    	hostsdir = new HostsDir({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(hostsdir.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(hostsdir, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(hostsdir.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(hostsdir.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(hostsdir, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2$2.name,
    		type: "if",
    		source: "(109:35) ",
    		ctx
    	});

    	return block;
    }

    // (107:37) 
    function create_if_block_1$3(ctx) {
    	let hostsblock;
    	let current;
    	hostsblock = new HostsBlock({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(hostsblock.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(hostsblock, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(hostsblock.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(hostsblock.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(hostsblock, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$3.name,
    		type: "if",
    		source: "(107:37) ",
    		ctx
    	});

    	return block;
    }

    // (105:1) {#if state === stateEnvironment}
    function create_if_block$6(ctx) {
    	let environment_1;
    	let current;
    	environment_1 = new Environment({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(environment_1.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(environment_1, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(environment_1.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(environment_1.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(environment_1, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$6.name,
    		type: "if",
    		source: "(105:1) {#if state === stateEnvironment}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$a(ctx) {
    	let wuinotif;
    	let t0;
    	let div;
    	let nav;
    	let a0;
    	let t2;
    	let a1;
    	let t4;
    	let a2;
    	let t5;
    	let a2_href_value;
    	let t6;
    	let a3;
    	let t7;
    	let a3_href_value;
    	let t8;
    	let a4;
    	let t9;
    	let a4_href_value;
    	let t10;
    	let current_block_type_index;
    	let if_block;
    	let current;
    	let mounted;
    	let dispose;

    	wuinotif = new Notif({
    			props: { timeout: "3000" },
    			$$inline: true
    		});

    	const if_block_creators = [
    		create_if_block$6,
    		create_if_block_1$3,
    		create_if_block_2$2,
    		create_if_block_3$1,
    		create_else_block$2
    	];

    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*state*/ ctx[0] === stateEnvironment) return 0;
    		if (/*state*/ ctx[0] === stateHostsBlock) return 1;
    		if (/*state*/ ctx[0] === stateHostsDir) return 2;
    		if (/*state*/ ctx[0] === stateMasterDir) return 3;
    		return 4;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			create_component(wuinotif.$$.fragment);
    			t0 = space();
    			div = element("div");
    			nav = element("nav");
    			a0 = element("a");
    			a0.textContent = "rescached";
    			t2 = text("\n\t\t/\n\t\t");
    			a1 = element("a");
    			a1.textContent = "Environment";
    			t4 = text("\n\t\t/\n\t\t");
    			a2 = element("a");
    			t5 = text("Hosts blocks");
    			t6 = text("\n\t\t/\n\t\t");
    			a3 = element("a");
    			t7 = text("hosts.d");
    			t8 = text("\n\t\t/\n\t\t");
    			a4 = element("a");
    			t9 = text("master.d");
    			t10 = space();
    			if_block.c();
    			attr_dev(a0, "href", "#home");
    			attr_dev(a0, "class", "svelte-jyzzth");
    			toggle_class(a0, "active", /*state*/ ctx[0] === "" || /*state*/ ctx[0] === "home");
    			add_location(a0, file$a, 63, 2, 1357);
    			attr_dev(a1, "href", "#environment");
    			attr_dev(a1, "class", "svelte-jyzzth");
    			toggle_class(a1, "active", /*state*/ ctx[0] === stateEnvironment);
    			add_location(a1, file$a, 71, 2, 1480);
    			attr_dev(a2, "href", a2_href_value = "#" + stateHostsBlock);
    			attr_dev(a2, "class", "svelte-jyzzth");
    			toggle_class(a2, "active", /*state*/ ctx[0] === stateHostsBlock);
    			add_location(a2, file$a, 79, 2, 1624);
    			attr_dev(a3, "href", a3_href_value = "#" + stateHostsDir);
    			attr_dev(a3, "class", "svelte-jyzzth");
    			toggle_class(a3, "active", /*state*/ ctx[0] === stateHostsDir);
    			add_location(a3, file$a, 87, 2, 1773);
    			attr_dev(a4, "href", a4_href_value = "#" + stateMasterDir);
    			attr_dev(a4, "class", "svelte-jyzzth");
    			toggle_class(a4, "active", /*state*/ ctx[0] === stateMasterDir);
    			add_location(a4, file$a, 95, 2, 1913);
    			attr_dev(nav, "class", "menu svelte-jyzzth");
    			add_location(nav, file$a, 62, 1, 1336);
    			attr_dev(div, "class", "main svelte-jyzzth");
    			add_location(div, file$a, 61, 0, 1316);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(wuinotif, target, anchor);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, div, anchor);
    			append_dev(div, nav);
    			append_dev(nav, a0);
    			append_dev(nav, t2);
    			append_dev(nav, a1);
    			append_dev(nav, t4);
    			append_dev(nav, a2);
    			append_dev(a2, t5);
    			append_dev(nav, t6);
    			append_dev(nav, a3);
    			append_dev(a3, t7);
    			append_dev(nav, t8);
    			append_dev(nav, a4);
    			append_dev(a4, t9);
    			append_dev(div, t10);
    			if_blocks[current_block_type_index].m(div, null);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(a0, "click", /*click_handler*/ ctx[1], false, false, false),
    					listen_dev(a1, "click", /*click_handler_1*/ ctx[2], false, false, false),
    					listen_dev(a2, "click", /*click_handler_2*/ ctx[3], false, false, false),
    					listen_dev(a3, "click", /*click_handler_3*/ ctx[4], false, false, false),
    					listen_dev(a4, "click", /*click_handler_4*/ ctx[5], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*state*/ 1) {
    				toggle_class(a0, "active", /*state*/ ctx[0] === "" || /*state*/ ctx[0] === "home");
    			}

    			if (dirty & /*state, stateEnvironment*/ 1) {
    				toggle_class(a1, "active", /*state*/ ctx[0] === stateEnvironment);
    			}

    			if (dirty & /*state, stateHostsBlock*/ 1) {
    				toggle_class(a2, "active", /*state*/ ctx[0] === stateHostsBlock);
    			}

    			if (dirty & /*state, stateHostsDir*/ 1) {
    				toggle_class(a3, "active", /*state*/ ctx[0] === stateHostsDir);
    			}

    			if (dirty & /*state, stateMasterDir*/ 1) {
    				toggle_class(a4, "active", /*state*/ ctx[0] === stateMasterDir);
    			}

    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index !== previous_block_index) {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				}

    				transition_in(if_block, 1);
    				if_block.m(div, null);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(wuinotif.$$.fragment, local);
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(wuinotif.$$.fragment, local);
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(wuinotif, detaching);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(div);
    			if_blocks[current_block_type_index].d();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$a.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    const stateEnvironment = "environment";
    const stateHostsBlock = "hosts_block";
    const stateHostsDir = "hosts_d";
    const stateMasterDir = "master_d";

    function instance$a($$self, $$props, $$invalidate) {
    	let state;

    	let env = {
    		NameServers: [],
    		HostsBlocks: [],
    		HostsFiles: {}
    	};

    	onMount(async () => {
    		const res = await fetch(apiEnvironment);

    		if (res.status >= 400) {
    			WuiPushNotif.Error("ERROR: {apiEnvironment}: ", res.status, res.statusText);
    			return;
    		}

    		setEnvironment(await res.json());
    		$$invalidate(0, state = window.location.hash.slice(1));
    	});

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("App", $$slots, []);
    	const click_handler = () => $$invalidate(0, state = "");
    	const click_handler_1 = () => $$invalidate(0, state = stateEnvironment);
    	const click_handler_2 = () => $$invalidate(0, state = stateHostsBlock);
    	const click_handler_3 = () => $$invalidate(0, state = stateHostsDir);
    	const click_handler_4 = () => $$invalidate(0, state = stateMasterDir);

    	$$self.$capture_state = () => ({
    		onMount,
    		WuiNotif: Notif,
    		WuiPushNotif,
    		apiEnvironment,
    		environment,
    		nanoSeconds,
    		setEnvironment,
    		Dashboard,
    		Environment,
    		HostsBlock,
    		HostsDir,
    		MasterDir,
    		stateEnvironment,
    		stateHostsBlock,
    		stateHostsDir,
    		stateMasterDir,
    		state,
    		env
    	});

    	$$self.$inject_state = $$props => {
    		if ("state" in $$props) $$invalidate(0, state = $$props.state);
    		if ("env" in $$props) env = $$props.env;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		state,
    		click_handler,
    		click_handler_1,
    		click_handler_2,
    		click_handler_3,
    		click_handler_4
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$a, create_fragment$a, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$a.name
    		});
    	}
    }

    const app = new App({
    	target: document.body,
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
