
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
    			add_location(div, file$3, 33, 0, 579);
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

    	onMount(() => {
    		let timerID = setTimeout(
    			() => {
    				messages.update(msgs => {
    					msgs.splice(0, 1);
    					return msgs;
    				});
    			},
    			5000
    		);
    	});

    	const writable_props = ["text", "kind"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<NotifItem> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("NotifItem", $$slots, []);

    	$$self.$$set = $$props => {
    		if ("text" in $$props) $$invalidate(0, text = $$props.text);
    		if ("kind" in $$props) $$invalidate(1, kind = $$props.kind);
    	};

    	$$self.$capture_state = () => ({ onMount, fade, messages, text, kind });

    	$$self.$inject_state = $$props => {
    		if ("text" in $$props) $$invalidate(0, text = $$props.text);
    		if ("kind" in $$props) $$invalidate(1, kind = $$props.kind);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [text, kind];
    }

    class NotifItem extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, { text: 0, kind: 1 });

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
    }

    /* node_modules/wui.svelte/src/components/Notif.svelte generated by Svelte v3.24.1 */
    const file$4 = "node_modules/wui.svelte/src/components/Notif.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[1] = list[i];
    	return child_ctx;
    }

    // (38:1) {#each $messages as msg}
    function create_each_block(ctx) {
    	let notifitem;
    	let current;

    	notifitem = new NotifItem({
    			props: {
    				text: /*msg*/ ctx[1].text,
    				kind: /*msg*/ ctx[1].kind
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(notifitem.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(notifitem, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const notifitem_changes = {};
    			if (dirty & /*$messages*/ 1) notifitem_changes.text = /*msg*/ ctx[1].text;
    			if (dirty & /*$messages*/ 1) notifitem_changes.kind = /*msg*/ ctx[1].kind;
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
    			destroy_component(notifitem, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(38:1) {#each $messages as msg}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$4(ctx) {
    	let div;
    	let current;
    	let each_value = /*$messages*/ ctx[0];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			div = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(div, "class", "wui-notif svelte-xdooa2");
    			add_location(div, file$4, 36, 0, 623);
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
    			if (dirty & /*$messages*/ 1) {
    				each_value = /*$messages*/ ctx[0];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(div, null);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

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
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_each(each_blocks, detaching);
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
    	component_subscribe($$self, messages, $$value => $$invalidate(0, $messages = $$value));
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Notif> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Notif", $$slots, []);

    	$$self.$capture_state = () => ({
    		messages,
    		NotifItem,
    		WuiPushNotif,
    		$messages
    	});

    	return [$messages];
    }

    class Notif extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Notif",
    			options,
    			id: create_fragment$4.name
    		});
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

    /* src/Environment.svelte generated by Svelte v3.24.1 */

    const { Object: Object_1 } = globals;
    const file$5 = "src/Environment.svelte";

    function get_each_context$1(ctx, list, i) {
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
    			add_location(input, file$5, 104, 2, 2224);
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
    function create_each_block$1(ctx) {
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
    			add_location(input, file$5, 135, 2, 2820);
    			attr_dev(button, "class", "svelte-ivqrh9");
    			add_location(button, file$5, 136, 2, 2846);
    			attr_dev(div, "class", "input-deletable svelte-ivqrh9");
    			add_location(div, file$5, 134, 1, 2788);
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
    		id: create_each_block$1.name,
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
    			add_location(input, file$5, 193, 2, 3948);
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
    			add_location(input, file$5, 205, 2, 4205);
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
    			add_location(input, file$5, 218, 3, 4510);
    			attr_dev(span, "class", "suffix");
    			add_location(span, file$5, 222, 3, 4583);
    			attr_dev(div, "class", "input-checkbox svelte-ivqrh9");
    			add_location(div, file$5, 217, 2, 4478);
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
    			add_location(input, file$5, 236, 3, 4914);
    			attr_dev(span, "class", "suffix");
    			add_location(span, file$5, 240, 3, 4985);
    			attr_dev(div, "class", "input-checkbox svelte-ivqrh9");
    			add_location(div, file$5, 235, 2, 4882);
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

    function create_fragment$5(ctx) {
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
    		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
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
    			add_location(p, file$5, 89, 0, 1747);
    			add_location(h30, file$5, 94, 0, 1866);
    			add_location(div0, file$5, 95, 0, 1885);
    			add_location(h31, file$5, 124, 0, 2595);
    			add_location(button0, file$5, 142, 1, 2928);
    			add_location(div1, file$5, 125, 0, 2615);
    			add_location(button1, file$5, 280, 3, 5859);
    			add_location(div2, file$5, 279, 2, 5850);
    			attr_dev(div3, "class", "section-bottom svelte-ivqrh9");
    			add_location(div3, file$5, 278, 1, 5819);
    			attr_dev(div4, "class", "environment");
    			add_location(div4, file$5, 88, 0, 1721);
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
    					const child_ctx = get_each_context$1(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$1(child_ctx);
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
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    const defTitleWidth = "300px";

    function instance$5($$self, $$props, $$invalidate) {
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
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Environment",
    			options,
    			id: create_fragment$5.name
    		});
    	}
    }

    /* src/HostsBlock.svelte generated by Svelte v3.24.1 */
    const file$6 = "src/HostsBlock.svelte";

    function get_each_context$2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[5] = list[i];
    	child_ctx[6] = list;
    	child_ctx[7] = i;
    	return child_ctx;
    }

    // (83:2) {#each env.HostsBlocks as hostsBlock}
    function create_each_block$2(ctx) {
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
    			add_location(input0, file$6, 85, 4, 1632);
    			attr_dev(span0, "class", "svelte-ze2due");
    			add_location(span0, file$6, 84, 3, 1621);
    			attr_dev(span1, "class", "svelte-ze2due");
    			add_location(span1, file$6, 90, 3, 1719);
    			input1.disabled = true;
    			attr_dev(input1, "class", "svelte-ze2due");
    			add_location(input1, file$6, 94, 4, 1773);
    			attr_dev(span2, "class", "svelte-ze2due");
    			add_location(span2, file$6, 93, 3, 1762);
    			attr_dev(span3, "class", "svelte-ze2due");
    			add_location(span3, file$6, 99, 3, 1847);
    			attr_dev(div, "class", "item svelte-ze2due");
    			add_location(div, file$6, 83, 2, 1599);
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
    		id: create_each_block$2.name,
    		type: "each",
    		source: "(83:2) {#each env.HostsBlocks as hostsBlock}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$6(ctx) {
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
    		each_blocks[i] = create_each_block$2(get_each_context$2(ctx, each_value, i));
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
    			add_location(p, file$6, 71, 1, 1334);
    			attr_dev(span0, "class", "svelte-ze2due");
    			add_location(span0, file$6, 77, 3, 1449);
    			attr_dev(span1, "class", "svelte-ze2due");
    			add_location(span1, file$6, 78, 3, 1475);
    			attr_dev(span2, "class", "svelte-ze2due");
    			add_location(span2, file$6, 79, 3, 1498);
    			attr_dev(span3, "class", "svelte-ze2due");
    			add_location(span3, file$6, 80, 3, 1520);
    			attr_dev(div0, "class", "item header svelte-ze2due");
    			add_location(div0, file$6, 76, 2, 1420);
    			attr_dev(div1, "class", "block_source svelte-ze2due");
    			add_location(div1, file$6, 75, 1, 1391);
    			add_location(button, file$6, 107, 2, 1931);
    			add_location(div2, file$6, 106, 1, 1923);
    			attr_dev(div3, "class", "hosts-block");
    			add_location(div3, file$6, 70, 0, 1307);
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
    					const child_ctx = get_each_context$2(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$2(child_ctx);
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
    		id: create_fragment$6.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    const apiHostsBlock = "/api/hosts_block";

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
    		init(this, options, instance$6, create_fragment$6, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "HostsBlock",
    			options,
    			id: create_fragment$6.name
    		});
    	}
    }

    /* src/HostsDir.svelte generated by Svelte v3.24.1 */

    const { Object: Object_1$1 } = globals;
    const file$7 = "src/HostsDir.svelte";

    function get_each_context$3(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[13] = list[i];
    	child_ctx[14] = list;
    	child_ctx[15] = i;
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[16] = list[i][0];
    	child_ctx[17] = list[i][1];
    	child_ctx[16] = i;
    	return child_ctx;
    }

    // (135:2) {#each Object.entries(env.HostsFiles) as [name,hf], name }
    function create_each_block_1(ctx) {
    	let div;
    	let a;
    	let t_value = /*hf*/ ctx[17].Name + "";
    	let t;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div = element("div");
    			a = element("a");
    			t = text(t_value);
    			attr_dev(a, "href", "#");
    			add_location(a, file$7, 136, 3, 2784);
    			attr_dev(div, "class", "item svelte-1vh8vt2");
    			add_location(div, file$7, 135, 2, 2762);
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
    						if (is_function(/*getHostsFile*/ ctx[3](/*hf*/ ctx[17]))) /*getHostsFile*/ ctx[3](/*hf*/ ctx[17]).apply(this, arguments);
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
    			if (dirty & /*env*/ 1 && t_value !== (t_value = /*hf*/ ctx[17].Name + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1.name,
    		type: "each",
    		source: "(135:2) {#each Object.entries(env.HostsFiles) as [name,hf], name }",
    		ctx
    	});

    	return block;
    }

    // (160:2) {:else}
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
    	let div;
    	let button1;
    	let t7;
    	let each_blocks = [];
    	let each_1_lookup = new Map();
    	let t8;
    	let button2;
    	let mounted;
    	let dispose;
    	let each_value = /*hostsFile*/ ctx[1].Records;
    	validate_each_argument(each_value);
    	const get_key = ctx => /*idx*/ ctx[15];
    	validate_each_keys(ctx, each_value, get_each_context$3, get_key);

    	for (let i = 0; i < each_value.length; i += 1) {
    		let child_ctx = get_each_context$3(ctx, each_value, i);
    		let key = get_key(child_ctx);
    		each_1_lookup.set(key, each_blocks[i] = create_each_block$3(key, child_ctx));
    	}

    	const block = {
    		c: function create() {
    			p = element("p");
    			t0 = text(t0_value);
    			t1 = text(" (");
    			t2 = text(t2_value);
    			t3 = text(" records)\n\t\t\t");
    			button0 = element("button");
    			button0.textContent = "Delete";
    			t5 = space();
    			div = element("div");
    			button1 = element("button");
    			button1.textContent = "Add";
    			t7 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t8 = space();
    			button2 = element("button");
    			button2.textContent = "Save";
    			add_location(button0, file$7, 162, 3, 3233);
    			add_location(p, file$7, 160, 2, 3169);
    			add_location(button1, file$7, 167, 3, 3322);
    			add_location(div, file$7, 166, 2, 3313);
    			add_location(button2, file$7, 190, 2, 3718);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			append_dev(p, t0);
    			append_dev(p, t1);
    			append_dev(p, t2);
    			append_dev(p, t3);
    			append_dev(p, button0);
    			insert_dev(target, t5, anchor);
    			insert_dev(target, div, anchor);
    			append_dev(div, button1);
    			insert_dev(target, t7, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, t8, anchor);
    			insert_dev(target, button2, anchor);

    			if (!mounted) {
    				dispose = [
    					listen_dev(
    						button0,
    						"click",
    						function () {
    							if (is_function(/*deleteHostsFile*/ ctx[8](/*hostsFile*/ ctx[1]))) /*deleteHostsFile*/ ctx[8](/*hostsFile*/ ctx[1]).apply(this, arguments);
    						},
    						false,
    						false,
    						false
    					),
    					listen_dev(button1, "click", /*addHost*/ ctx[6], false, false, false),
    					listen_dev(button2, "click", /*updateHostsFile*/ ctx[5], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty & /*hostsFile*/ 2 && t0_value !== (t0_value = /*hostsFile*/ ctx[1].Name + "")) set_data_dev(t0, t0_value);
    			if (dirty & /*hostsFile*/ 2 && t2_value !== (t2_value = /*hostsFile*/ ctx[1].Records.length + "")) set_data_dev(t2, t2_value);

    			if (dirty & /*deleteHost, hostsFile*/ 130) {
    				const each_value = /*hostsFile*/ ctx[1].Records;
    				validate_each_argument(each_value);
    				validate_each_keys(ctx, each_value, get_each_context$3, get_key);
    				each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value, each_1_lookup, t8.parentNode, destroy_block, create_each_block$3, t8, get_each_context$3);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    			if (detaching) detach_dev(t5);
    			if (detaching) detach_dev(div);
    			if (detaching) detach_dev(t7);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].d(detaching);
    			}

    			if (detaching) detach_dev(t8);
    			if (detaching) detach_dev(button2);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(160:2) {:else}",
    		ctx
    	});

    	return block;
    }

    // (156:2) {#if hostsFile.Name === ""}
    function create_if_block$3(ctx) {
    	let div;

    	const block = {
    		c: function create() {
    			div = element("div");
    			div.textContent = "Select one of the hosts file to manage.";
    			add_location(div, file$7, 156, 2, 3099);
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
    		id: create_if_block$3.name,
    		type: "if",
    		source: "(156:2) {#if hostsFile.Name === \\\"\\\"}",
    		ctx
    	});

    	return block;
    }

    // (173:2) {#each hostsFile.Records as host, idx (idx)}
    function create_each_block$3(key_1, ctx) {
    	let div;
    	let input0;
    	let t0;
    	let input1;
    	let t1;
    	let button;
    	let mounted;
    	let dispose;

    	function input0_input_handler() {
    		/*input0_input_handler*/ ctx[10].call(input0, /*each_value*/ ctx[14], /*idx*/ ctx[15]);
    	}

    	function input1_input_handler() {
    		/*input1_input_handler*/ ctx[11].call(input1, /*each_value*/ ctx[14], /*idx*/ ctx[15]);
    	}

    	const block = {
    		key: key_1,
    		first: null,
    		c: function create() {
    			div = element("div");
    			input0 = element("input");
    			t0 = space();
    			input1 = element("input");
    			t1 = space();
    			button = element("button");
    			button.textContent = "X";
    			attr_dev(input0, "class", "host_name svelte-1vh8vt2");
    			attr_dev(input0, "placeholder", "Domain name");
    			add_location(input0, file$7, 174, 3, 3452);
    			attr_dev(input1, "class", "host_value svelte-1vh8vt2");
    			attr_dev(input1, "placeholder", "IP address");
    			add_location(input1, file$7, 179, 3, 3546);
    			add_location(button, file$7, 184, 3, 3641);
    			attr_dev(div, "class", "host svelte-1vh8vt2");
    			add_location(div, file$7, 173, 2, 3430);
    			this.first = div;
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, input0);
    			set_input_value(input0, /*host*/ ctx[13].Name);
    			append_dev(div, t0);
    			append_dev(div, input1);
    			set_input_value(input1, /*host*/ ctx[13].Value);
    			append_dev(div, t1);
    			append_dev(div, button);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input0, "input", input0_input_handler),
    					listen_dev(input1, "input", input1_input_handler),
    					listen_dev(
    						button,
    						"click",
    						function () {
    							if (is_function(/*deleteHost*/ ctx[7](/*idx*/ ctx[15]))) /*deleteHost*/ ctx[7](/*idx*/ ctx[15]).apply(this, arguments);
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

    			if (dirty & /*hostsFile*/ 2 && input0.value !== /*host*/ ctx[13].Name) {
    				set_input_value(input0, /*host*/ ctx[13].Name);
    			}

    			if (dirty & /*hostsFile*/ 2 && input1.value !== /*host*/ ctx[13].Value) {
    				set_input_value(input1, /*host*/ ctx[13].Value);
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
    		id: create_each_block$3.name,
    		type: "each",
    		source: "(173:2) {#each hostsFile.Records as host, idx (idx)}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$7(ctx) {
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
    		each_blocks[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	function select_block_type(ctx, dirty) {
    		if (/*hostsFile*/ ctx[1].Name === "") return create_if_block$3;
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
    			add_location(br0, file$7, 142, 2, 2869);
    			add_location(span, file$7, 145, 3, 2889);
    			add_location(br1, file$7, 146, 3, 2921);
    			add_location(input, file$7, 147, 3, 2930);
    			add_location(label, file$7, 144, 2, 2878);
    			add_location(button, file$7, 149, 2, 2977);
    			attr_dev(div0, "class", "nav-left svelte-1vh8vt2");
    			add_location(div0, file$7, 133, 1, 2676);
    			attr_dev(div1, "class", "content svelte-1vh8vt2");
    			add_location(div1, file$7, 154, 1, 3045);
    			attr_dev(div2, "class", "hosts_d");
    			add_location(div2, file$7, 132, 0, 2653);
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
    			set_input_value(input, /*newHostsFile*/ ctx[2]);
    			append_dev(div0, t5);
    			append_dev(div0, button);
    			append_dev(div2, t7);
    			append_dev(div2, div1);
    			if_block.m(div1, null);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input, "input", /*input_input_handler*/ ctx[9]),
    					listen_dev(button, "click", /*createHostsFile*/ ctx[4], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*getHostsFile, Object, env*/ 9) {
    				each_value_1 = Object.entries(/*env*/ ctx[0].HostsFiles);
    				validate_each_argument(each_value_1);
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div0, t0);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_1.length;
    			}

    			if (dirty & /*newHostsFile*/ 4 && input.value !== /*newHostsFile*/ ctx[2]) {
    				set_input_value(input, /*newHostsFile*/ ctx[2]);
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
    		id: create_fragment$7.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    const apiHostsDir = "/api/hosts.d";

    function instance$7($$self, $$props, $$invalidate) {
    	let env = { HostsFiles: {} };
    	let hostsFile = { Name: "", Records: [] };
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

    	function addHost() {
    		let newHost = { Name: "", Value: "" };
    		hostsFile.Records.unshift(newHost);
    		$$invalidate(1, hostsFile);
    	}

    	function deleteHost(idx) {
    		hostsFile.Records.splice(idx, 1);
    		$$invalidate(1, hostsFile);
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
    		$$invalidate(2, newHostsFile);
    	}

    	function input0_input_handler(each_value, idx) {
    		each_value[idx].Name = this.value;
    		$$invalidate(1, hostsFile);
    	}

    	function input1_input_handler(each_value, idx) {
    		each_value[idx].Value = this.value;
    		$$invalidate(1, hostsFile);
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
    		newHostsFile,
    		envUnsubscribe,
    		getHostsFile,
    		createHostsFile,
    		updateHostsFile,
    		addHost,
    		deleteHost,
    		deleteHostsFile
    	});

    	$$self.$inject_state = $$props => {
    		if ("env" in $$props) $$invalidate(0, env = $$props.env);
    		if ("hostsFile" in $$props) $$invalidate(1, hostsFile = $$props.hostsFile);
    		if ("newHostsFile" in $$props) $$invalidate(2, newHostsFile = $$props.newHostsFile);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		env,
    		hostsFile,
    		newHostsFile,
    		getHostsFile,
    		createHostsFile,
    		updateHostsFile,
    		addHost,
    		deleteHost,
    		deleteHostsFile,
    		input_input_handler,
    		input0_input_handler,
    		input1_input_handler
    	];
    }

    class HostsDir extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$7, create_fragment$7, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "HostsDir",
    			options,
    			id: create_fragment$7.name
    		});
    	}
    }

    /* src/MasterDir.svelte generated by Svelte v3.24.1 */

    const { Object: Object_1$2 } = globals;
    const file$8 = "src/MasterDir.svelte";

    function get_each_context$4(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[28] = list[i][0];
    	child_ctx[29] = list[i][1];
    	return child_ctx;
    }

    function get_each_context_2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[5] = list[i];
    	child_ctx[37] = i;
    	return child_ctx;
    }

    function get_each_context_1$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[32] = list[i][0];
    	child_ctx[33] = list[i][1];
    	return child_ctx;
    }

    function get_each_context_3(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[38] = list[i][0];
    	child_ctx[39] = list[i][1];
    	return child_ctx;
    }

    // (253:0) {#each Object.entries(env.ZoneFiles) as [name, mf]}
    function create_each_block_3(ctx) {
    	let div;
    	let span;
    	let t_value = /*mf*/ ctx[39].Name + "";
    	let t;
    	let mounted;
    	let dispose;

    	function click_handler(...args) {
    		return /*click_handler*/ ctx[13](/*mf*/ ctx[39], ...args);
    	}

    	const block = {
    		c: function create() {
    			div = element("div");
    			span = element("span");
    			t = text(t_value);
    			add_location(span, file$8, 254, 3, 4482);
    			attr_dev(div, "class", "item svelte-nv73ia");
    			add_location(div, file$8, 253, 2, 4460);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, span);
    			append_dev(span, t);

    			if (!mounted) {
    				dispose = listen_dev(span, "click", click_handler, false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty[0] & /*env*/ 1 && t_value !== (t_value = /*mf*/ ctx[39].Name + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_3.name,
    		type: "each",
    		source: "(253:0) {#each Object.entries(env.ZoneFiles) as [name, mf]}",
    		ctx
    	});

    	return block;
    }

    // (277:0) {:else}
    function create_else_block$1(ctx) {
    	let p;
    	let t0_value = /*activeMF*/ ctx[2].Name + "";
    	let t0;
    	let t1;
    	let button0;
    	let t3;
    	let div0;
    	let span0;
    	let t5;
    	let span1;
    	let t7;
    	let span2;
    	let t9;
    	let t10;
    	let form;
    	let label0;
    	let span3;
    	let t12;
    	let input;
    	let t13;
    	let t14_value = /*activeMF*/ ctx[2].Name + "";
    	let t14;
    	let t15;
    	let label1;
    	let span4;
    	let t17;
    	let select;
    	let t18;
    	let t19;
    	let div1;
    	let button1;
    	let mounted;
    	let dispose;
    	let each_value_1 = Object.entries(/*activeMF*/ ctx[2].Records);
    	validate_each_argument(each_value_1);
    	let each_blocks_1 = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks_1[i] = create_each_block_1$1(get_each_context_1$1(ctx, each_value_1, i));
    	}

    	let each_value = Object.entries(/*RRTypes*/ ctx[6]);
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$4(get_each_context$4(ctx, each_value, i));
    	}

    	function select_block_type_1(ctx, dirty) {
    		if (/*rr*/ ctx[5].Type === 1 || /*rr*/ ctx[5].Type === 2 || /*rr*/ ctx[5].Type === 5 || /*rr*/ ctx[5].Type === 12 || /*rr*/ ctx[5].Type === 16 || /*rr*/ ctx[5].Type === 28) return create_if_block_1;
    		if (/*rr*/ ctx[5].Type === 6) return create_if_block_2;
    		if (/*rr*/ ctx[5].Type === 15) return create_if_block_3;
    	}

    	let current_block_type = select_block_type_1(ctx);
    	let if_block = current_block_type && current_block_type(ctx);

    	const block = {
    		c: function create() {
    			p = element("p");
    			t0 = text(t0_value);
    			t1 = space();
    			button0 = element("button");
    			button0.textContent = "Delete";
    			t3 = space();
    			div0 = element("div");
    			span0 = element("span");
    			span0.textContent = "Name";
    			t5 = space();
    			span1 = element("span");
    			span1.textContent = "Type";
    			t7 = space();
    			span2 = element("span");
    			span2.textContent = "Value";
    			t9 = space();

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].c();
    			}

    			t10 = space();
    			form = element("form");
    			label0 = element("label");
    			span3 = element("span");
    			span3.textContent = "Name:";
    			t12 = space();
    			input = element("input");
    			t13 = text("\n\t\t\t\t.");
    			t14 = text(t14_value);
    			t15 = space();
    			label1 = element("label");
    			span4 = element("span");
    			span4.textContent = "Type:";
    			t17 = space();
    			select = element("select");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t18 = space();
    			if (if_block) if_block.c();
    			t19 = space();
    			div1 = element("div");
    			button1 = element("button");
    			button1.textContent = "Create";
    			add_location(button0, file$8, 279, 3, 4885);
    			add_location(p, file$8, 277, 2, 4859);
    			attr_dev(span0, "class", "name svelte-nv73ia");
    			add_location(span0, file$8, 285, 3, 4989);
    			attr_dev(span1, "class", "type svelte-nv73ia");
    			add_location(span1, file$8, 288, 3, 5032);
    			attr_dev(span2, "class", "value svelte-nv73ia");
    			add_location(span2, file$8, 291, 3, 5075);
    			attr_dev(div0, "class", "rr header svelte-nv73ia");
    			add_location(div0, file$8, 284, 2, 4962);
    			attr_dev(span3, "class", "svelte-nv73ia");
    			add_location(span3, file$8, 317, 4, 5555);
    			attr_dev(input, "class", "name svelte-nv73ia");
    			add_location(input, file$8, 320, 4, 5589);
    			attr_dev(label0, "class", "svelte-nv73ia");
    			add_location(label0, file$8, 316, 3, 5543);
    			attr_dev(span4, "class", "svelte-nv73ia");
    			add_location(span4, file$8, 324, 4, 5679);
    			if (/*rr*/ ctx[5].Type === void 0) add_render_callback(() => /*select_change_handler*/ ctx[16].call(select));
    			add_location(select, file$8, 327, 4, 5713);
    			attr_dev(label1, "class", "svelte-nv73ia");
    			add_location(label1, file$8, 323, 3, 5667);
    			attr_dev(button1, "class", "create");
    			attr_dev(button1, "type", "submit");
    			add_location(button1, file$8, 406, 4, 7196);
    			attr_dev(div1, "class", "actions svelte-nv73ia");
    			add_location(div1, file$8, 405, 3, 7170);
    			attr_dev(form, "class", "svelte-nv73ia");
    			add_location(form, file$8, 315, 2, 5491);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			append_dev(p, t0);
    			append_dev(p, t1);
    			append_dev(p, button0);
    			insert_dev(target, t3, anchor);
    			insert_dev(target, div0, anchor);
    			append_dev(div0, span0);
    			append_dev(div0, t5);
    			append_dev(div0, span1);
    			append_dev(div0, t7);
    			append_dev(div0, span2);
    			insert_dev(target, t9, anchor);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].m(target, anchor);
    			}

    			insert_dev(target, t10, anchor);
    			insert_dev(target, form, anchor);
    			append_dev(form, label0);
    			append_dev(label0, span3);
    			append_dev(label0, t12);
    			append_dev(label0, input);
    			set_input_value(input, /*rr*/ ctx[5].Name);
    			append_dev(label0, t13);
    			append_dev(label0, t14);
    			append_dev(form, t15);
    			append_dev(form, label1);
    			append_dev(label1, span4);
    			append_dev(label1, t17);
    			append_dev(label1, select);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(select, null);
    			}

    			select_option(select, /*rr*/ ctx[5].Type);
    			append_dev(form, t18);
    			if (if_block) if_block.m(form, null);
    			append_dev(form, t19);
    			append_dev(form, div1);
    			append_dev(div1, button1);

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", /*handleMasterFileDelete*/ ctx[8], false, false, false),
    					listen_dev(input, "input", /*input_input_handler_1*/ ctx[15]),
    					listen_dev(select, "change", /*select_change_handler*/ ctx[16]),
    					listen_dev(select, "blur", /*onSelectRRType*/ ctx[9], false, false, false),
    					listen_dev(form, "submit", prevent_default(/*handleCreateRR*/ ctx[10]), false, true, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*activeMF*/ 4 && t0_value !== (t0_value = /*activeMF*/ ctx[2].Name + "")) set_data_dev(t0, t0_value);

    			if (dirty[0] & /*activeMF, handleDeleteRR, getTypeName*/ 6148) {
    				each_value_1 = Object.entries(/*activeMF*/ ctx[2].Records);
    				validate_each_argument(each_value_1);
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1$1(ctx, each_value_1, i);

    					if (each_blocks_1[i]) {
    						each_blocks_1[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_1[i] = create_each_block_1$1(child_ctx);
    						each_blocks_1[i].c();
    						each_blocks_1[i].m(t10.parentNode, t10);
    					}
    				}

    				for (; i < each_blocks_1.length; i += 1) {
    					each_blocks_1[i].d(1);
    				}

    				each_blocks_1.length = each_value_1.length;
    			}

    			if (dirty[0] & /*rr, RRTypes*/ 96 && input.value !== /*rr*/ ctx[5].Name) {
    				set_input_value(input, /*rr*/ ctx[5].Name);
    			}

    			if (dirty[0] & /*activeMF*/ 4 && t14_value !== (t14_value = /*activeMF*/ ctx[2].Name + "")) set_data_dev(t14, t14_value);

    			if (dirty[0] & /*RRTypes*/ 64) {
    				each_value = Object.entries(/*RRTypes*/ ctx[6]);
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$4(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$4(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(select, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}

    			if (dirty[0] & /*rr, RRTypes*/ 96) {
    				select_option(select, /*rr*/ ctx[5].Type);
    			}

    			if (current_block_type === (current_block_type = select_block_type_1(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if (if_block) if_block.d(1);
    				if_block = current_block_type && current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(form, t19);
    				}
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    			if (detaching) detach_dev(t3);
    			if (detaching) detach_dev(div0);
    			if (detaching) detach_dev(t9);
    			destroy_each(each_blocks_1, detaching);
    			if (detaching) detach_dev(t10);
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
    		source: "(277:0) {:else}",
    		ctx
    	});

    	return block;
    }

    // (273:0) {#if activeMF.Name === ""}
    function create_if_block$4(ctx) {
    	let p;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "Select one of the zone file to manage.";
    			add_location(p, file$8, 273, 2, 4796);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$4.name,
    		type: "if",
    		source: "(273:0) {#if activeMF.Name === \\\"\\\"}",
    		ctx
    	});

    	return block;
    }

    // (298:2) {#each listRR as rr, idx}
    function create_each_block_2(ctx) {
    	let div;
    	let span0;
    	let t0_value = /*rr*/ ctx[5].Name + "";
    	let t0;
    	let t1;
    	let span1;
    	let t2_value = /*getTypeName*/ ctx[12](/*rr*/ ctx[5].Type) + "";
    	let t2;
    	let t3;
    	let span2;
    	let t4_value = /*rr*/ ctx[5].Value + "";
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
    			attr_dev(span0, "class", "name svelte-nv73ia");
    			add_location(span0, file$8, 299, 3, 5238);
    			attr_dev(span1, "class", "type svelte-nv73ia");
    			add_location(span1, file$8, 302, 3, 5286);
    			attr_dev(span2, "class", "value svelte-nv73ia");
    			add_location(span2, file$8, 305, 3, 5347);
    			add_location(button, file$8, 308, 3, 5397);
    			attr_dev(div, "class", "rr svelte-nv73ia");
    			add_location(div, file$8, 298, 2, 5218);
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
    						if (is_function(/*handleDeleteRR*/ ctx[11](/*rr*/ ctx[5], /*idx*/ ctx[37]))) /*handleDeleteRR*/ ctx[11](/*rr*/ ctx[5], /*idx*/ ctx[37]).apply(this, arguments);
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
    			if (dirty[0] & /*activeMF*/ 4 && t0_value !== (t0_value = /*rr*/ ctx[5].Name + "")) set_data_dev(t0, t0_value);
    			if (dirty[0] & /*activeMF*/ 4 && t2_value !== (t2_value = /*getTypeName*/ ctx[12](/*rr*/ ctx[5].Type) + "")) set_data_dev(t2, t2_value);
    			if (dirty[0] & /*activeMF*/ 4 && t4_value !== (t4_value = /*rr*/ ctx[5].Value + "")) set_data_dev(t4, t4_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_2.name,
    		type: "each",
    		source: "(298:2) {#each listRR as rr, idx}",
    		ctx
    	});

    	return block;
    }

    // (297:1) {#each Object.entries(activeMF.Records) as [dname, listRR]}
    function create_each_block_1$1(ctx) {
    	let each_1_anchor;
    	let each_value_2 = /*listRR*/ ctx[33];
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
    			if (dirty[0] & /*handleDeleteRR, activeMF, getTypeName*/ 6148) {
    				each_value_2 = /*listRR*/ ctx[33];
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
    		id: create_each_block_1$1.name,
    		type: "each",
    		source: "(297:1) {#each Object.entries(activeMF.Records) as [dname, listRR]}",
    		ctx
    	});

    	return block;
    }

    // (332:1) {#each Object.entries(RRTypes) as [k, v]}
    function create_each_block$4(ctx) {
    	let option;
    	let t0_value = /*v*/ ctx[29] + "";
    	let t0;
    	let t1;
    	let option_value_value;

    	const block = {
    		c: function create() {
    			option = element("option");
    			t0 = text(t0_value);
    			t1 = space();
    			option.__value = option_value_value = parseInt(/*k*/ ctx[28]);
    			option.value = option.__value;
    			add_location(option, file$8, 332, 5, 5831);
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
    		id: create_each_block$4.name,
    		type: "each",
    		source: "(332:1) {#each Object.entries(RRTypes) as [k, v]}",
    		ctx
    	});

    	return block;
    }

    // (392:26) 
    function create_if_block_3(ctx) {
    	let label0;
    	let span0;
    	let t1;
    	let input0;
    	let t2;
    	let label1;
    	let span1;
    	let t4;
    	let input1;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			label0 = element("label");
    			span0 = element("span");
    			span0.textContent = "Preference:";
    			t1 = space();
    			input0 = element("input");
    			t2 = space();
    			label1 = element("label");
    			span1 = element("span");
    			span1.textContent = "Exchange:";
    			t4 = space();
    			input1 = element("input");
    			attr_dev(span0, "class", "svelte-nv73ia");
    			add_location(span0, file$8, 393, 4, 6943);
    			attr_dev(input0, "type", "number");
    			attr_dev(input0, "min", "1");
    			attr_dev(input0, "max", "65535");
    			attr_dev(input0, "class", "svelte-nv73ia");
    			add_location(input0, file$8, 396, 4, 6983);
    			attr_dev(label0, "class", "svelte-nv73ia");
    			add_location(label0, file$8, 392, 3, 6931);
    			attr_dev(span1, "class", "svelte-nv73ia");
    			add_location(span1, file$8, 399, 4, 7075);
    			attr_dev(input1, "class", "svelte-nv73ia");
    			add_location(input1, file$8, 402, 4, 7113);
    			attr_dev(label1, "class", "svelte-nv73ia");
    			add_location(label1, file$8, 398, 3, 7063);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, label0, anchor);
    			append_dev(label0, span0);
    			append_dev(label0, t1);
    			append_dev(label0, input0);
    			set_input_value(input0, /*rrMX*/ ctx[4].Preference);
    			insert_dev(target, t2, anchor);
    			insert_dev(target, label1, anchor);
    			append_dev(label1, span1);
    			append_dev(label1, t4);
    			append_dev(label1, input1);
    			set_input_value(input1, /*rrMX*/ ctx[4].Exchange);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input0, "input", /*input0_input_handler_1*/ ctx[25]),
    					listen_dev(input1, "input", /*input1_input_handler_1*/ ctx[26])
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*rrMX*/ 16 && to_number(input0.value) !== /*rrMX*/ ctx[4].Preference) {
    				set_input_value(input0, /*rrMX*/ ctx[4].Preference);
    			}

    			if (dirty[0] & /*rrMX*/ 16 && input1.value !== /*rrMX*/ ctx[4].Exchange) {
    				set_input_value(input1, /*rrMX*/ ctx[4].Exchange);
    			}
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
    		id: create_if_block_3.name,
    		type: "if",
    		source: "(392:26) ",
    		ctx
    	});

    	return block;
    }

    // (349:25) 
    function create_if_block_2(ctx) {
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
    	let label2;
    	let span2;
    	let t7;
    	let input2;
    	let t8;
    	let label3;
    	let span3;
    	let t10;
    	let input3;
    	let t11;
    	let label4;
    	let span4;
    	let t13;
    	let input4;
    	let t14;
    	let label5;
    	let span5;
    	let t16;
    	let input5;
    	let t17;
    	let label6;
    	let span6;
    	let t19;
    	let input6;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			label0 = element("label");
    			span0 = element("span");
    			span0.textContent = "Name server:";
    			t1 = space();
    			input0 = element("input");
    			t2 = space();
    			label1 = element("label");
    			span1 = element("span");
    			span1.textContent = "Admin email:";
    			t4 = space();
    			input1 = element("input");
    			t5 = space();
    			label2 = element("label");
    			span2 = element("span");
    			span2.textContent = "Serial:";
    			t7 = space();
    			input2 = element("input");
    			t8 = space();
    			label3 = element("label");
    			span3 = element("span");
    			span3.textContent = "Refresh:";
    			t10 = space();
    			input3 = element("input");
    			t11 = space();
    			label4 = element("label");
    			span4 = element("span");
    			span4.textContent = "Retry:";
    			t13 = space();
    			input4 = element("input");
    			t14 = space();
    			label5 = element("label");
    			span5 = element("span");
    			span5.textContent = "Expire:";
    			t16 = space();
    			input5 = element("input");
    			t17 = space();
    			label6 = element("label");
    			span6 = element("span");
    			span6.textContent = "Minimum:";
    			t19 = space();
    			input6 = element("input");
    			attr_dev(span0, "class", "svelte-nv73ia");
    			add_location(span0, file$8, 350, 4, 6167);
    			attr_dev(input0, "class", "svelte-nv73ia");
    			add_location(input0, file$8, 353, 4, 6208);
    			attr_dev(label0, "class", "svelte-nv73ia");
    			add_location(label0, file$8, 349, 3, 6155);
    			attr_dev(span1, "class", "svelte-nv73ia");
    			add_location(span1, file$8, 356, 4, 6268);
    			attr_dev(input1, "class", "svelte-nv73ia");
    			add_location(input1, file$8, 359, 4, 6309);
    			attr_dev(label1, "class", "svelte-nv73ia");
    			add_location(label1, file$8, 355, 3, 6256);
    			attr_dev(span2, "class", "svelte-nv73ia");
    			add_location(span2, file$8, 362, 4, 6369);
    			attr_dev(input2, "type", "number");
    			attr_dev(input2, "class", "svelte-nv73ia");
    			add_location(input2, file$8, 365, 4, 6405);
    			attr_dev(label2, "class", "svelte-nv73ia");
    			add_location(label2, file$8, 361, 3, 6357);
    			attr_dev(span3, "class", "svelte-nv73ia");
    			add_location(span3, file$8, 368, 4, 6478);
    			attr_dev(input3, "type", "number");
    			attr_dev(input3, "class", "svelte-nv73ia");
    			add_location(input3, file$8, 371, 4, 6515);
    			attr_dev(label3, "class", "svelte-nv73ia");
    			add_location(label3, file$8, 367, 3, 6466);
    			attr_dev(span4, "class", "svelte-nv73ia");
    			add_location(span4, file$8, 374, 4, 6589);
    			attr_dev(input4, "type", "number");
    			attr_dev(input4, "class", "svelte-nv73ia");
    			add_location(input4, file$8, 377, 4, 6624);
    			attr_dev(label4, "class", "svelte-nv73ia");
    			add_location(label4, file$8, 373, 3, 6577);
    			attr_dev(span5, "class", "svelte-nv73ia");
    			add_location(span5, file$8, 380, 4, 6696);
    			attr_dev(input5, "type", "number");
    			attr_dev(input5, "class", "svelte-nv73ia");
    			add_location(input5, file$8, 383, 4, 6732);
    			attr_dev(label5, "class", "svelte-nv73ia");
    			add_location(label5, file$8, 379, 3, 6684);
    			attr_dev(span6, "class", "svelte-nv73ia");
    			add_location(span6, file$8, 386, 4, 6805);
    			attr_dev(input6, "type", "number");
    			attr_dev(input6, "class", "svelte-nv73ia");
    			add_location(input6, file$8, 389, 4, 6842);
    			attr_dev(label6, "class", "svelte-nv73ia");
    			add_location(label6, file$8, 385, 3, 6793);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, label0, anchor);
    			append_dev(label0, span0);
    			append_dev(label0, t1);
    			append_dev(label0, input0);
    			set_input_value(input0, /*rrSOA*/ ctx[3].MName);
    			insert_dev(target, t2, anchor);
    			insert_dev(target, label1, anchor);
    			append_dev(label1, span1);
    			append_dev(label1, t4);
    			append_dev(label1, input1);
    			set_input_value(input1, /*rrSOA*/ ctx[3].RName);
    			insert_dev(target, t5, anchor);
    			insert_dev(target, label2, anchor);
    			append_dev(label2, span2);
    			append_dev(label2, t7);
    			append_dev(label2, input2);
    			set_input_value(input2, /*rrSOA*/ ctx[3].Serial);
    			insert_dev(target, t8, anchor);
    			insert_dev(target, label3, anchor);
    			append_dev(label3, span3);
    			append_dev(label3, t10);
    			append_dev(label3, input3);
    			set_input_value(input3, /*rrSOA*/ ctx[3].Refresh);
    			insert_dev(target, t11, anchor);
    			insert_dev(target, label4, anchor);
    			append_dev(label4, span4);
    			append_dev(label4, t13);
    			append_dev(label4, input4);
    			set_input_value(input4, /*rrSOA*/ ctx[3].Retry);
    			insert_dev(target, t14, anchor);
    			insert_dev(target, label5, anchor);
    			append_dev(label5, span5);
    			append_dev(label5, t16);
    			append_dev(label5, input5);
    			set_input_value(input5, /*rrSOA*/ ctx[3].Expire);
    			insert_dev(target, t17, anchor);
    			insert_dev(target, label6, anchor);
    			append_dev(label6, span6);
    			append_dev(label6, t19);
    			append_dev(label6, input6);
    			set_input_value(input6, /*rrSOA*/ ctx[3].Minimum);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input0, "input", /*input0_input_handler*/ ctx[18]),
    					listen_dev(input1, "input", /*input1_input_handler*/ ctx[19]),
    					listen_dev(input2, "input", /*input2_input_handler*/ ctx[20]),
    					listen_dev(input3, "input", /*input3_input_handler*/ ctx[21]),
    					listen_dev(input4, "input", /*input4_input_handler*/ ctx[22]),
    					listen_dev(input5, "input", /*input5_input_handler*/ ctx[23]),
    					listen_dev(input6, "input", /*input6_input_handler*/ ctx[24])
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*rrSOA*/ 8 && input0.value !== /*rrSOA*/ ctx[3].MName) {
    				set_input_value(input0, /*rrSOA*/ ctx[3].MName);
    			}

    			if (dirty[0] & /*rrSOA*/ 8 && input1.value !== /*rrSOA*/ ctx[3].RName) {
    				set_input_value(input1, /*rrSOA*/ ctx[3].RName);
    			}

    			if (dirty[0] & /*rrSOA*/ 8 && to_number(input2.value) !== /*rrSOA*/ ctx[3].Serial) {
    				set_input_value(input2, /*rrSOA*/ ctx[3].Serial);
    			}

    			if (dirty[0] & /*rrSOA*/ 8 && to_number(input3.value) !== /*rrSOA*/ ctx[3].Refresh) {
    				set_input_value(input3, /*rrSOA*/ ctx[3].Refresh);
    			}

    			if (dirty[0] & /*rrSOA*/ 8 && to_number(input4.value) !== /*rrSOA*/ ctx[3].Retry) {
    				set_input_value(input4, /*rrSOA*/ ctx[3].Retry);
    			}

    			if (dirty[0] & /*rrSOA*/ 8 && to_number(input5.value) !== /*rrSOA*/ ctx[3].Expire) {
    				set_input_value(input5, /*rrSOA*/ ctx[3].Expire);
    			}

    			if (dirty[0] & /*rrSOA*/ 8 && to_number(input6.value) !== /*rrSOA*/ ctx[3].Minimum) {
    				set_input_value(input6, /*rrSOA*/ ctx[3].Minimum);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(label0);
    			if (detaching) detach_dev(t2);
    			if (detaching) detach_dev(label1);
    			if (detaching) detach_dev(t5);
    			if (detaching) detach_dev(label2);
    			if (detaching) detach_dev(t8);
    			if (detaching) detach_dev(label3);
    			if (detaching) detach_dev(t11);
    			if (detaching) detach_dev(label4);
    			if (detaching) detach_dev(t14);
    			if (detaching) detach_dev(label5);
    			if (detaching) detach_dev(t17);
    			if (detaching) detach_dev(label6);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(349:25) ",
    		ctx
    	});

    	return block;
    }

    // (340:1) {#if rr.Type === 1 || rr.Type === 2 || rr.Type === 5 ||   rr.Type === 12 || rr.Type === 16 || rr.Type === 28  }
    function create_if_block_1(ctx) {
    	let label;
    	let span;
    	let t1;
    	let input;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			label = element("label");
    			span = element("span");
    			span.textContent = "Value:";
    			t1 = space();
    			input = element("input");
    			attr_dev(span, "class", "svelte-nv73ia");
    			add_location(span, file$8, 343, 4, 6049);
    			attr_dev(input, "class", "svelte-nv73ia");
    			add_location(input, file$8, 346, 4, 6084);
    			attr_dev(label, "class", "svelte-nv73ia");
    			add_location(label, file$8, 342, 3, 6037);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, label, anchor);
    			append_dev(label, span);
    			append_dev(label, t1);
    			append_dev(label, input);
    			set_input_value(input, /*rr*/ ctx[5].Value);

    			if (!mounted) {
    				dispose = listen_dev(input, "input", /*input_input_handler_2*/ ctx[17]);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*rr, RRTypes*/ 96 && input.value !== /*rr*/ ctx[5].Value) {
    				set_input_value(input, /*rr*/ ctx[5].Value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(label);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(340:1) {#if rr.Type === 1 || rr.Type === 2 || rr.Type === 5 ||   rr.Type === 12 || rr.Type === 16 || rr.Type === 28  }",
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
    	let each_value_3 = Object.entries(/*env*/ ctx[0].ZoneFiles);
    	validate_each_argument(each_value_3);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_3.length; i += 1) {
    		each_blocks[i] = create_each_block_3(get_each_context_3(ctx, each_value_3, i));
    	}

    	function select_block_type(ctx, dirty) {
    		if (/*activeMF*/ ctx[2].Name === "") return create_if_block$4;
    		return create_else_block$1;
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
    			add_location(br0, file$8, 259, 2, 4562);
    			add_location(span, file$8, 262, 3, 4582);
    			add_location(br1, file$8, 263, 3, 4613);
    			add_location(input, file$8, 264, 3, 4622);
    			add_location(label, file$8, 261, 2, 4571);
    			add_location(button, file$8, 266, 2, 4670);
    			attr_dev(div0, "class", "nav-left svelte-nv73ia");
    			add_location(div0, file$8, 251, 1, 4383);
    			attr_dev(div1, "class", "content svelte-nv73ia");
    			add_location(div1, file$8, 271, 1, 4745);
    			attr_dev(div2, "class", "master_d");
    			add_location(div2, file$8, 250, 0, 4359);
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
    			set_input_value(input, /*newMasterFile*/ ctx[1]);
    			append_dev(div0, t5);
    			append_dev(div0, button);
    			append_dev(div2, t7);
    			append_dev(div2, div1);
    			if_block.m(div1, null);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input, "input", /*input_input_handler*/ ctx[14]),
    					listen_dev(button, "click", /*handleMasterFileCreate*/ ctx[7], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*activeMF, env*/ 5) {
    				each_value_3 = Object.entries(/*env*/ ctx[0].ZoneFiles);
    				validate_each_argument(each_value_3);
    				let i;

    				for (i = 0; i < each_value_3.length; i += 1) {
    					const child_ctx = get_each_context_3(ctx, each_value_3, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_3(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div0, t0);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_3.length;
    			}

    			if (dirty[0] & /*newMasterFile*/ 2 && input.value !== /*newMasterFile*/ ctx[1]) {
    				set_input_value(input, /*newMasterFile*/ ctx[1]);
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

    const apiMasterd = "/api/master.d/";

    function newRR() {
    	return { Name: "", Type: 1, Value: "" };
    }

    function newMX() {
    	return { Preference: 1, Exchange: "" };
    }

    function newSOA() {
    	return {
    		MName: "",
    		RName: "",
    		Serial: 0,
    		Refresh: 0,
    		Retry: 0,
    		Expire: 0,
    		Minimum: 0
    	};
    }

    function instance$8($$self, $$props, $$invalidate) {
    	let env = {
    		NameServers: [],
    		HostsBlocks: [],
    		HostsFiles: [],
    		ZoneFiles: {}
    	};

    	let newMasterFile = "";
    	let activeMF = { Name: "" };

    	let RRTypes = {
    		1: "A",
    		2: "NS",
    		5: "CNAME",
    		6: "SOA",
    		12: "PTR",
    		15: "MX",
    		16: "TXT",
    		28: "AAAA"
    	};

    	let rr = newRR();
    	let rrSOA = newSOA();
    	let rrMX = newMX();

    	const envUnsubscribe = environment.subscribe(value => {
    		$$invalidate(0, env = value);
    	});

    	onDestroy(envUnsubscribe);

    	async function handleMasterFileCreate() {
    		let api = apiMasterd + newMasterFile;
    		const res = await fetch(api, { method: "PUT" });

    		if (res.status >= 400) {
    			const resError = await res.json();
    			WuiPushNotif.Error("ERROR: handleCreateRR: ", resError.message);
    			return;
    		}

    		$$invalidate(2, activeMF = await res.json());
    		$$invalidate(0, env.ZoneFiles[activeMF.Name] = activeMF, env);
    		WuiPushNotif.Info("The new zone file '" + newMasterFile + "' has been created");
    	}

    	async function handleMasterFileDelete() {
    		let api = apiMasterd + activeMF.Name;
    		const res = await fetch(api, { method: "DELETE" });

    		if (res.status >= 400) {
    			const resError = await res.json();
    			WuiPushNotif.Error("ERROR: handleCreateRR: ", resError.message);
    			return;
    		}

    		WuiPushNotif.Info("The zone file '" + activeMF.Name + "' has beed deleted");
    		delete env.ZoneFiles[activeMF.Name];
    		$$invalidate(2, activeMF = { Name: "" });
    		$$invalidate(0, env);
    	}

    	function onSelectRRType() {
    		switch (rr.Type) {
    			case 6:
    				$$invalidate(3, rrSOA = newSOA());
    				break;
    			case 15:
    				$$invalidate(4, rrMX = newMX());
    				break;
    		}
    	}

    	async function handleCreateRR() {
    		switch (rr.Type) {
    			case 6:
    				$$invalidate(5, rr.Value = rrSOA, rr);
    				break;
    			case 15:
    				$$invalidate(5, rr.Value = rrMX, rr);
    				break;
    		}

    		let api = apiMasterd + activeMF.Name + "/rr/" + rr.Type;

    		const res = await fetch(api, {
    			method: "POST",
    			headers: { "Content-Type": "application/json" },
    			body: JSON.stringify(rr)
    		});

    		if (res.status >= 400) {
    			const resError = await res.json();
    			WuiPushNotif.Error("ERROR: handleCreateRR: ", resError.message);
    			return;
    		}

    		let newRR = await res.json();
    		let listRR = activeMF.Records[newRR.Name];

    		if (typeof listRR === "undefined") {
    			listRR = [];
    		}

    		listRR.push(newRR);
    		$$invalidate(2, activeMF.Records[newRR.Name] = listRR, activeMF);
    		WuiPushNotif.Info("The new record '" + newRR.Name + "' has been created");
    	}

    	async function handleDeleteRR(rr, idx) {
    		let api = apiMasterd + activeMF.Name + "/rr/" + rr.Type;

    		const res = await fetch(api, {
    			method: "DELETE",
    			headers: { "Content-Type": "application/json" },
    			body: JSON.stringify(rr)
    		});

    		if (res.status >= 400) {
    			const resError = await res.json();
    			WuiPushNotif.Error("ERROR: handleCreateRR: ", resError.message);
    			return;
    		}

    		WuiPushNotif.Info("The record '" + rr.Name + "' has been deleted");
    		let listRR = activeMF.Records[rr.Name];
    		listRR.splice(idx, 1);
    		$$invalidate(2, activeMF.Records[rr.Name] = listRR, activeMF);
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
    	const click_handler = mf => $$invalidate(2, activeMF = mf);

    	function input_input_handler() {
    		newMasterFile = this.value;
    		$$invalidate(1, newMasterFile);
    	}

    	function input_input_handler_1() {
    		rr.Name = this.value;
    		$$invalidate(5, rr);
    		$$invalidate(6, RRTypes);
    	}

    	function select_change_handler() {
    		rr.Type = select_value(this);
    		$$invalidate(5, rr);
    		$$invalidate(6, RRTypes);
    	}

    	function input_input_handler_2() {
    		rr.Value = this.value;
    		$$invalidate(5, rr);
    		$$invalidate(6, RRTypes);
    	}

    	function input0_input_handler() {
    		rrSOA.MName = this.value;
    		$$invalidate(3, rrSOA);
    	}

    	function input1_input_handler() {
    		rrSOA.RName = this.value;
    		$$invalidate(3, rrSOA);
    	}

    	function input2_input_handler() {
    		rrSOA.Serial = to_number(this.value);
    		$$invalidate(3, rrSOA);
    	}

    	function input3_input_handler() {
    		rrSOA.Refresh = to_number(this.value);
    		$$invalidate(3, rrSOA);
    	}

    	function input4_input_handler() {
    		rrSOA.Retry = to_number(this.value);
    		$$invalidate(3, rrSOA);
    	}

    	function input5_input_handler() {
    		rrSOA.Expire = to_number(this.value);
    		$$invalidate(3, rrSOA);
    	}

    	function input6_input_handler() {
    		rrSOA.Minimum = to_number(this.value);
    		$$invalidate(3, rrSOA);
    	}

    	function input0_input_handler_1() {
    		rrMX.Preference = to_number(this.value);
    		$$invalidate(4, rrMX);
    	}

    	function input1_input_handler_1() {
    		rrMX.Exchange = this.value;
    		$$invalidate(4, rrMX);
    	}

    	$$self.$capture_state = () => ({
    		onDestroy,
    		WuiPushNotif,
    		environment,
    		nanoSeconds,
    		setEnvironment,
    		apiMasterd,
    		env,
    		newMasterFile,
    		activeMF,
    		RRTypes,
    		rr,
    		rrSOA,
    		rrMX,
    		envUnsubscribe,
    		handleMasterFileCreate,
    		handleMasterFileDelete,
    		onSelectRRType,
    		handleCreateRR,
    		handleDeleteRR,
    		getTypeName,
    		newRR,
    		newMX,
    		newSOA
    	});

    	$$self.$inject_state = $$props => {
    		if ("env" in $$props) $$invalidate(0, env = $$props.env);
    		if ("newMasterFile" in $$props) $$invalidate(1, newMasterFile = $$props.newMasterFile);
    		if ("activeMF" in $$props) $$invalidate(2, activeMF = $$props.activeMF);
    		if ("RRTypes" in $$props) $$invalidate(6, RRTypes = $$props.RRTypes);
    		if ("rr" in $$props) $$invalidate(5, rr = $$props.rr);
    		if ("rrSOA" in $$props) $$invalidate(3, rrSOA = $$props.rrSOA);
    		if ("rrMX" in $$props) $$invalidate(4, rrMX = $$props.rrMX);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		env,
    		newMasterFile,
    		activeMF,
    		rrSOA,
    		rrMX,
    		rr,
    		RRTypes,
    		handleMasterFileCreate,
    		handleMasterFileDelete,
    		onSelectRRType,
    		handleCreateRR,
    		handleDeleteRR,
    		getTypeName,
    		click_handler,
    		input_input_handler,
    		input_input_handler_1,
    		select_change_handler,
    		input_input_handler_2,
    		input0_input_handler,
    		input1_input_handler,
    		input2_input_handler,
    		input3_input_handler,
    		input4_input_handler,
    		input5_input_handler,
    		input6_input_handler,
    		input0_input_handler_1,
    		input1_input_handler_1
    	];
    }

    class MasterDir extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$8, create_fragment$8, safe_not_equal, {}, [-1, -1]);

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "MasterDir",
    			options,
    			id: create_fragment$8.name
    		});
    	}
    }

    /* src/App.svelte generated by Svelte v3.24.1 */
    const file$9 = "src/App.svelte";

    // (101:1) {:else}
    function create_else_block$2(ctx) {
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
    		id: create_else_block$2.name,
    		type: "else",
    		source: "(101:1) {:else}",
    		ctx
    	});

    	return block;
    }

    // (99:36) 
    function create_if_block_2$1(ctx) {
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
    		id: create_if_block_2$1.name,
    		type: "if",
    		source: "(99:36) ",
    		ctx
    	});

    	return block;
    }

    // (97:35) 
    function create_if_block_1$1(ctx) {
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
    		id: create_if_block_1$1.name,
    		type: "if",
    		source: "(97:35) ",
    		ctx
    	});

    	return block;
    }

    // (95:1) {#if state === stateHostsBlock}
    function create_if_block$5(ctx) {
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
    		id: create_if_block$5.name,
    		type: "if",
    		source: "(95:1) {#if state === stateHostsBlock}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$9(ctx) {
    	let wuinotif;
    	let t0;
    	let div;
    	let nav;
    	let a0;
    	let t2;
    	let a1;
    	let t3;
    	let a1_href_value;
    	let t4;
    	let a2;
    	let t5;
    	let a2_href_value;
    	let t6;
    	let a3;
    	let t7;
    	let a3_href_value;
    	let t8;
    	let current_block_type_index;
    	let if_block;
    	let current;
    	let mounted;
    	let dispose;
    	wuinotif = new Notif({ $$inline: true });
    	const if_block_creators = [create_if_block$5, create_if_block_1$1, create_if_block_2$1, create_else_block$2];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*state*/ ctx[0] === stateHostsBlock) return 0;
    		if (/*state*/ ctx[0] === stateHostsDir) return 1;
    		if (/*state*/ ctx[0] === stateMasterDir) return 2;
    		return 3;
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
    			t3 = text("Hosts blocks");
    			t4 = text("\n\t\t/\n\t\t");
    			a2 = element("a");
    			t5 = text("hosts.d");
    			t6 = text("\n\t\t/\n\t\t");
    			a3 = element("a");
    			t7 = text("master.d");
    			t8 = space();
    			if_block.c();
    			attr_dev(a0, "href", "#home");
    			attr_dev(a0, "class", "svelte-jyzzth");
    			toggle_class(a0, "active", /*state*/ ctx[0] === "" || /*state*/ ctx[0] === "home");
    			add_location(a0, file$9, 61, 2, 1258);
    			attr_dev(a1, "href", a1_href_value = "#" + stateHostsBlock);
    			attr_dev(a1, "class", "svelte-jyzzth");
    			toggle_class(a1, "active", /*state*/ ctx[0] === stateHostsBlock);
    			add_location(a1, file$9, 69, 2, 1381);
    			attr_dev(a2, "href", a2_href_value = "#" + stateHostsDir);
    			attr_dev(a2, "class", "svelte-jyzzth");
    			toggle_class(a2, "active", /*state*/ ctx[0] === stateHostsDir);
    			add_location(a2, file$9, 77, 2, 1530);
    			attr_dev(a3, "href", a3_href_value = "#" + stateMasterDir);
    			attr_dev(a3, "class", "svelte-jyzzth");
    			toggle_class(a3, "active", /*state*/ ctx[0] === stateMasterDir);
    			add_location(a3, file$9, 85, 2, 1670);
    			attr_dev(nav, "class", "menu svelte-jyzzth");
    			add_location(nav, file$9, 60, 1, 1237);
    			attr_dev(div, "class", "main svelte-jyzzth");
    			add_location(div, file$9, 59, 0, 1217);
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
    			append_dev(a1, t3);
    			append_dev(nav, t4);
    			append_dev(nav, a2);
    			append_dev(a2, t5);
    			append_dev(nav, t6);
    			append_dev(nav, a3);
    			append_dev(a3, t7);
    			append_dev(div, t8);
    			if_blocks[current_block_type_index].m(div, null);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(a0, "click", /*click_handler*/ ctx[1], false, false, false),
    					listen_dev(a1, "click", /*click_handler_1*/ ctx[2], false, false, false),
    					listen_dev(a2, "click", /*click_handler_2*/ ctx[3], false, false, false),
    					listen_dev(a3, "click", /*click_handler_3*/ ctx[4], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*state*/ 1) {
    				toggle_class(a0, "active", /*state*/ ctx[0] === "" || /*state*/ ctx[0] === "home");
    			}

    			if (dirty & /*state, stateHostsBlock*/ 1) {
    				toggle_class(a1, "active", /*state*/ ctx[0] === stateHostsBlock);
    			}

    			if (dirty & /*state, stateHostsDir*/ 1) {
    				toggle_class(a2, "active", /*state*/ ctx[0] === stateHostsDir);
    			}

    			if (dirty & /*state, stateMasterDir*/ 1) {
    				toggle_class(a3, "active", /*state*/ ctx[0] === stateMasterDir);
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
    		id: create_fragment$9.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    const stateHostsBlock = "hosts_block";
    const stateHostsDir = "hosts_d";
    const stateMasterDir = "master_d";

    function instance$9($$self, $$props, $$invalidate) {
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
    	const click_handler_1 = () => $$invalidate(0, state = stateHostsBlock);
    	const click_handler_2 = () => $$invalidate(0, state = stateHostsDir);
    	const click_handler_3 = () => $$invalidate(0, state = stateMasterDir);

    	$$self.$capture_state = () => ({
    		onMount,
    		WuiNotif: Notif,
    		WuiPushNotif,
    		apiEnvironment,
    		environment,
    		nanoSeconds,
    		setEnvironment,
    		Environment,
    		HostsBlock,
    		HostsDir,
    		MasterDir,
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

    	return [state, click_handler, click_handler_1, click_handler_2, click_handler_3];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$9, create_fragment$9, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$9.name
    		});
    	}
    }

    const app = new App({
    	target: document.body,
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
