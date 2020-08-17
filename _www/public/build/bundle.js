
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
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
            dirty
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if ($$.bound[i])
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
        $set() {
            // overridden by instance, if it has props
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.24.0' }, detail)));
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

    const apiEnvironment = "/api/environment";
    const environment = writable({
    	NameServers: [],
    	HostsBlocks: [],
    	HostsFiles: [],
    	MasterFiles: [],
    });
    const nanoSeconds = 1000000000;

    async function setEnvironment(got) {
    	got.PruneDelay = got.PruneDelay / nanoSeconds;
    	got.PruneThreshold = got.PruneThreshold / nanoSeconds;
    	for (let x = 0; x < got.HostsFiles.length; x++) {
    		got.HostsFiles[x].hosts = [];
    	}
    	environment.set(got);
    }

    /* src/LabelHint.svelte generated by Svelte v3.24.0 */

    const file = "src/LabelHint.svelte";

    // (43:0) {#if showInfo}
    function create_if_block(ctx) {
    	let div;

    	const block = {
    		c: function create() {
    			div = element("div");
    			attr_dev(div, "class", "label-hint-info svelte-wc51fh");
    			add_location(div, file, 43, 0, 752);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			div.innerHTML = /*info*/ ctx[2];
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*info*/ 4) div.innerHTML = /*info*/ ctx[2];		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(43:0) {#if showInfo}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let label;
    	let t0;
    	let div;
    	let t1;
    	let t2;
    	let span;
    	let t4;
    	let if_block_anchor;
    	let mounted;
    	let dispose;
    	let if_block = /*showInfo*/ ctx[3] && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			label = element("label");
    			t0 = space();
    			div = element("div");
    			t1 = text(/*title*/ ctx[1]);
    			t2 = text(":\n\t");
    			span = element("span");
    			span.textContent = "?";
    			t4 = space();
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    			attr_dev(label, "for", /*target*/ ctx[0]);
    			attr_dev(label, "class", "label-hint svelte-wc51fh");
    			add_location(label, file, 35, 0, 557);
    			attr_dev(span, "class", "label-hint-toggle svelte-wc51fh");
    			add_location(span, file, 38, 1, 647);
    			attr_dev(div, "class", "label-hint-title svelte-wc51fh");
    			add_location(div, file, 36, 0, 605);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, label, anchor);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, div, anchor);
    			append_dev(div, t1);
    			append_dev(div, t2);
    			append_dev(div, span);
    			insert_dev(target, t4, anchor);
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);

    			if (!mounted) {
    				dispose = listen_dev(span, "click", /*click_handler*/ ctx[4], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*target*/ 1) {
    				attr_dev(label, "for", /*target*/ ctx[0]);
    			}

    			if (dirty & /*title*/ 2) set_data_dev(t1, /*title*/ ctx[1]);

    			if (/*showInfo*/ ctx[3]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block(ctx);
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(label);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(div);
    			if (detaching) detach_dev(t4);
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    			mounted = false;
    			dispose();
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
    	let { target } = $$props;
    	let { title } = $$props;
    	let { info } = $$props;
    	let showInfo = false;
    	const writable_props = ["target", "title", "info"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<LabelHint> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("LabelHint", $$slots, []);
    	const click_handler = () => $$invalidate(3, showInfo = !showInfo);

    	$$self.$set = $$props => {
    		if ("target" in $$props) $$invalidate(0, target = $$props.target);
    		if ("title" in $$props) $$invalidate(1, title = $$props.title);
    		if ("info" in $$props) $$invalidate(2, info = $$props.info);
    	};

    	$$self.$capture_state = () => ({ target, title, info, showInfo });

    	$$self.$inject_state = $$props => {
    		if ("target" in $$props) $$invalidate(0, target = $$props.target);
    		if ("title" in $$props) $$invalidate(1, title = $$props.title);
    		if ("info" in $$props) $$invalidate(2, info = $$props.info);
    		if ("showInfo" in $$props) $$invalidate(3, showInfo = $$props.showInfo);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [target, title, info, showInfo, click_handler];
    }

    class LabelHint extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, { target: 0, title: 1, info: 2 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "LabelHint",
    			options,
    			id: create_fragment.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*target*/ ctx[0] === undefined && !("target" in props)) {
    			console.warn("<LabelHint> was created without expected prop 'target'");
    		}

    		if (/*title*/ ctx[1] === undefined && !("title" in props)) {
    			console.warn("<LabelHint> was created without expected prop 'title'");
    		}

    		if (/*info*/ ctx[2] === undefined && !("info" in props)) {
    			console.warn("<LabelHint> was created without expected prop 'info'");
    		}
    	}

    	get target() {
    		throw new Error("<LabelHint>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set target(value) {
    		throw new Error("<LabelHint>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
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
    }

    /* src/InputNumber.svelte generated by Svelte v3.24.0 */

    const file$1 = "src/InputNumber.svelte";

    // (30:1) {#if unit !== ''}
    function create_if_block$1(ctx) {
    	let span;
    	let t;

    	const block = {
    		c: function create() {
    			span = element("span");
    			t = text(/*unit*/ ctx[1]);
    			attr_dev(span, "class", "suffix svelte-1w51kyk");
    			add_location(span, file$1, 30, 2, 473);
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
    		source: "(30:1) {#if unit !== ''}",
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
    			attr_dev(input, "class", "svelte-1w51kyk");
    			add_location(input, file$1, 28, 1, 392);
    			attr_dev(div, "class", "input-number svelte-1w51kyk");
    			add_location(div, file$1, 27, 0, 364);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, input);
    			set_input_value(input, /*val*/ ctx[0]);
    			append_dev(div, t);
    			if (if_block) if_block.m(div, null);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input, "change", /*onChange*/ ctx[2], false, false, false),
    					listen_dev(input, "input", /*input_input_handler*/ ctx[5])
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*val*/ 1 && to_number(input.value) !== /*val*/ ctx[0]) {
    				set_input_value(input, /*val*/ ctx[0]);
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
    	let { val = 0 } = $$props;
    	let { unit } = $$props;

    	function onChange() {
    		value = +value;

    		if (isNaN(value)) {
    			value = max;
    		} else if (value < min) {
    			value = min;
    		} else if (value > max) {
    			value = max;
    		}
    	}

    	const writable_props = ["min", "max", "val", "unit"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<InputNumber> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("InputNumber", $$slots, []);

    	function input_input_handler() {
    		val = to_number(this.value);
    		$$invalidate(0, val);
    	}

    	$$self.$set = $$props => {
    		if ("min" in $$props) $$invalidate(3, min = $$props.min);
    		if ("max" in $$props) $$invalidate(4, max = $$props.max);
    		if ("val" in $$props) $$invalidate(0, val = $$props.val);
    		if ("unit" in $$props) $$invalidate(1, unit = $$props.unit);
    	};

    	$$self.$capture_state = () => ({ min, max, val, unit, onChange });

    	$$self.$inject_state = $$props => {
    		if ("min" in $$props) $$invalidate(3, min = $$props.min);
    		if ("max" in $$props) $$invalidate(4, max = $$props.max);
    		if ("val" in $$props) $$invalidate(0, val = $$props.val);
    		if ("unit" in $$props) $$invalidate(1, unit = $$props.unit);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [val, unit, onChange, min, max, input_input_handler];
    }

    class InputNumber extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, { min: 3, max: 4, val: 0, unit: 1 });

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

    	get val() {
    		throw new Error("<InputNumber>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set val(value) {
    		throw new Error("<InputNumber>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get unit() {
    		throw new Error("<InputNumber>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set unit(value) {
    		throw new Error("<InputNumber>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/InputAddress.svelte generated by Svelte v3.24.0 */

    const file$2 = "src/InputAddress.svelte";

    // (45:1) {#if isInvalid}
    function create_if_block$2(ctx) {
    	let span;
    	let t;

    	const block = {
    		c: function create() {
    			span = element("span");
    			t = text(/*error*/ ctx[2]);
    			attr_dev(span, "class", "invalid svelte-1iljdeb");
    			add_location(span, file$2, 45, 1, 781);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			append_dev(span, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*error*/ 4) set_data_dev(t, /*error*/ ctx[2]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$2.name,
    		type: "if",
    		source: "(45:1) {#if isInvalid}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$2(ctx) {
    	let div;
    	let input;
    	let t;
    	let mounted;
    	let dispose;
    	let if_block = /*isInvalid*/ ctx[1] && create_if_block$2(ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			input = element("input");
    			t = space();
    			if (if_block) if_block.c();
    			attr_dev(input, "type", "text");
    			attr_dev(input, "class", "svelte-1iljdeb");
    			toggle_class(input, "invalid", /*isInvalid*/ ctx[1]);
    			add_location(input, file$2, 38, 1, 671);
    			attr_dev(div, "class", "input-address");
    			add_location(div, file$2, 37, 0, 642);
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
    					if_block = create_if_block$2(ctx);
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
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { value = "" } = $$props;
    	let isInvalid = false;
    	let error = "";

    	function onBlur() {
    		const ipport = value.split(":");

    		if (ipport.length !== 2) {
    			$$invalidate(1, isInvalid = true);
    			return;
    		}

    		const ip = ipport[0];

    		if (ip.length > 0) {
    			const nums = ip.split(".");

    			if (nums.length != 4) {
    				$$invalidate(1, isInvalid = true);
    				$$invalidate(2, error = "invalid IP address");
    				return;
    			}
    		}

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
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<InputAddress> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("InputAddress", $$slots, []);

    	function input_input_handler() {
    		value = this.value;
    		$$invalidate(0, value);
    	}

    	$$self.$set = $$props => {
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

    class InputAddress extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, { value: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "InputAddress",
    			options,
    			id: create_fragment$2.name
    		});
    	}

    	get value() {
    		throw new Error("<InputAddress>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set value(value) {
    		throw new Error("<InputAddress>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/Environment.svelte generated by Svelte v3.24.0 */

    const { Object: Object_1, console: console_1 } = globals;
    const file$3 = "src/Environment.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[17] = list[i];
    	child_ctx[18] = list;
    	child_ctx[19] = i;
    	return child_ctx;
    }

    // (123:1) {#each env.NameServers as ns}
    function create_each_block(ctx) {
    	let div;
    	let input;
    	let t0;
    	let button;
    	let mounted;
    	let dispose;

    	function input_input_handler() {
    		/*input_input_handler*/ ctx[6].call(input, /*each_value*/ ctx[18], /*ns_index*/ ctx[19]);
    	}

    	const block = {
    		c: function create() {
    			div = element("div");
    			input = element("input");
    			t0 = space();
    			button = element("button");
    			button.textContent = "Delete";
    			attr_dev(input, "class", "svelte-1gci9yh");
    			add_location(input, file$3, 124, 2, 2629);
    			attr_dev(button, "class", "svelte-1gci9yh");
    			add_location(button, file$3, 125, 2, 2655);
    			attr_dev(div, "class", "input-deletable svelte-1gci9yh");
    			add_location(div, file$3, 123, 1, 2597);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, input);
    			set_input_value(input, /*ns*/ ctx[17]);
    			append_dev(div, t0);
    			append_dev(div, button);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input, "input", input_input_handler),
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
    		id: create_each_block.name,
    		type: "each",
    		source: "(123:1) {#each env.NameServers as ns}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$3(ctx) {
    	let div5;
    	let h2;
    	let t1;
    	let p;
    	let t3;
    	let h30;
    	let t5;
    	let div0;
    	let labelhint0;
    	let t6;
    	let input0;
    	let t7;
    	let labelhint1;
    	let t8;
    	let inputnumber0;
    	let updating_val;
    	let t9;
    	let h31;
    	let t11;
    	let div3;
    	let labelhint2;
    	let t12;
    	let t13;
    	let button0;
    	let t15;
    	let labelhint3;
    	let t16;
    	let inputaddress;
    	let updating_value;
    	let t17;
    	let labelhint4;
    	let t18;
    	let inputnumber1;
    	let updating_val_1;
    	let t19;
    	let labelhint5;
    	let t20;
    	let inputnumber2;
    	let updating_val_2;
    	let t21;
    	let labelhint6;
    	let t22;
    	let input1;
    	let t23;
    	let labelhint7;
    	let t24;
    	let input2;
    	let t25;
    	let labelhint8;
    	let t26;
    	let div1;
    	let input3;
    	let t27;
    	let span0;
    	let t29;
    	let labelhint9;
    	let t30;
    	let div2;
    	let input4;
    	let t31;
    	let span1;
    	let t33;
    	let labelhint10;
    	let t34;
    	let inputnumber3;
    	let updating_val_3;
    	let t35;
    	let labelhint11;
    	let t36;
    	let inputnumber4;
    	let updating_val_4;
    	let t37;
    	let div4;
    	let button1;
    	let current;
    	let mounted;
    	let dispose;

    	labelhint0 = new LabelHint({
    			props: {
    				target: "FileResolvConf",
    				title: "System resolv.conf",
    				info: "A path to dynamically generated resolv.conf(5) by\nresolvconf(8).  If set, the nameserver values in referenced file will\nreplace 'parent' value and 'parent' will become a fallback in\ncase the referenced file being deleted or can not be parsed."
    			},
    			$$inline: true
    		});

    	labelhint1 = new LabelHint({
    			props: {
    				target: "Debug",
    				title: "Debug level",
    				info: "This option only used for debugging program or if user\nwant to monitor what kind of traffic goes in and out of rescached."
    			},
    			$$inline: true
    		});

    	function inputnumber0_val_binding(value) {
    		/*inputnumber0_val_binding*/ ctx[5].call(null, value);
    	}

    	let inputnumber0_props = { min: "0", max: "3", unit: "" };

    	if (/*env*/ ctx[0].Debug !== void 0) {
    		inputnumber0_props.val = /*env*/ ctx[0].Debug;
    	}

    	inputnumber0 = new InputNumber({
    			props: inputnumber0_props,
    			$$inline: true
    		});

    	binding_callbacks.push(() => bind(inputnumber0, "val", inputnumber0_val_binding));

    	labelhint2 = new LabelHint({
    			props: {
    				target: "NameServers",
    				title: "Name servers",
    				info: "List of parent DNS servers."
    			},
    			$$inline: true
    		});

    	let each_value = /*env*/ ctx[0].NameServers;
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	labelhint3 = new LabelHint({
    			props: {
    				target: "ListenAddress",
    				title: "Listen address",
    				info: "Address in local network where rescached will\nlistening for query from client through UDP and TCP.\n<br/>\nIf you want rescached to serve a query from another host in your local\nnetwork, change this value to <tt>0.0.0.0:53</tt>."
    			},
    			$$inline: true
    		});

    	function inputaddress_value_binding(value) {
    		/*inputaddress_value_binding*/ ctx[7].call(null, value);
    	}

    	let inputaddress_props = {};

    	if (/*env*/ ctx[0].ListenAddress !== void 0) {
    		inputaddress_props.value = /*env*/ ctx[0].ListenAddress;
    	}

    	inputaddress = new InputAddress({
    			props: inputaddress_props,
    			$$inline: true
    		});

    	binding_callbacks.push(() => bind(inputaddress, "value", inputaddress_value_binding));

    	labelhint4 = new LabelHint({
    			props: {
    				target: "HTTPPort",
    				title: "HTTP listen port",
    				info: "Port to serve DNS over HTTP"
    			},
    			$$inline: true
    		});

    	function inputnumber1_val_binding(value) {
    		/*inputnumber1_val_binding*/ ctx[8].call(null, value);
    	}

    	let inputnumber1_props = { min: "0", max: "65535", unit: "" };

    	if (/*env*/ ctx[0].HTTPPort !== void 0) {
    		inputnumber1_props.val = /*env*/ ctx[0].HTTPPort;
    	}

    	inputnumber1 = new InputNumber({
    			props: inputnumber1_props,
    			$$inline: true
    		});

    	binding_callbacks.push(() => bind(inputnumber1, "val", inputnumber1_val_binding));

    	labelhint5 = new LabelHint({
    			props: {
    				target: "TLSPort",
    				title: "TLS listen port",
    				info: "Port to listen for DNS over TLS"
    			},
    			$$inline: true
    		});

    	function inputnumber2_val_binding(value) {
    		/*inputnumber2_val_binding*/ ctx[9].call(null, value);
    	}

    	let inputnumber2_props = { min: "0", max: "65535", unit: "" };

    	if (/*env*/ ctx[0].TLSPort !== void 0) {
    		inputnumber2_props.val = /*env*/ ctx[0].TLSPort;
    	}

    	inputnumber2 = new InputNumber({
    			props: inputnumber2_props,
    			$$inline: true
    		});

    	binding_callbacks.push(() => bind(inputnumber2, "val", inputnumber2_val_binding));

    	labelhint6 = new LabelHint({
    			props: {
    				target: "TLSCertFile",
    				title: "TLS certificate",
    				info: "Path to certificate file to serve DNS over TLS and\nHTTPS"
    			},
    			$$inline: true
    		});

    	labelhint7 = new LabelHint({
    			props: {
    				target: "TLSPrivateKey",
    				title: "TLS private key",
    				info: "Path to certificate private key file to serve DNS over TLS and\nHTTPS."
    			},
    			$$inline: true
    		});

    	labelhint8 = new LabelHint({
    			props: {
    				target: "TLSAllowInsecure",
    				title: "TLS allow insecure",
    				info: "If its true, allow serving DoH and DoT with self signed\ncertificate."
    			},
    			$$inline: true
    		});

    	labelhint9 = new LabelHint({
    			props: {
    				target: "DoHBehindProxy",
    				title: "DoH behind proxy",
    				info: "If its true, serve DNS over HTTP only, even if\ncertificate files is defined.\nThis allow serving DNS request forwarded by another proxy server."
    			},
    			$$inline: true
    		});

    	labelhint10 = new LabelHint({
    			props: {
    				target: "PruneDelay",
    				title: "Prune delay",
    				info: "Delay for pruning caches.\nEvery N seconds, rescached will traverse all caches and remove response that\nhas not been accessed less than cache.prune_threshold.\nIts value must be equal or greater than 1 hour (3600 seconds).\n"
    			},
    			$$inline: true
    		});

    	function inputnumber3_val_binding(value) {
    		/*inputnumber3_val_binding*/ ctx[14].call(null, value);
    	}

    	let inputnumber3_props = {
    		min: "3600",
    		max: "36000",
    		unit: "Seconds"
    	};

    	if (/*env*/ ctx[0].PruneDelay !== void 0) {
    		inputnumber3_props.val = /*env*/ ctx[0].PruneDelay;
    	}

    	inputnumber3 = new InputNumber({
    			props: inputnumber3_props,
    			$$inline: true
    		});

    	binding_callbacks.push(() => bind(inputnumber3, "val", inputnumber3_val_binding));

    	labelhint11 = new LabelHint({
    			props: {
    				target: "PruneThreshold",
    				title: "Prune threshold",
    				info: "The duration when the cache will be considered expired.\nIts value must be negative and greater or equal than -1 hour (-3600 seconds)."
    			},
    			$$inline: true
    		});

    	function inputnumber4_val_binding(value) {
    		/*inputnumber4_val_binding*/ ctx[15].call(null, value);
    	}

    	let inputnumber4_props = {
    		min: "-36000",
    		max: "-3600",
    		unit: "Seconds"
    	};

    	if (/*env*/ ctx[0].PruneThreshold !== void 0) {
    		inputnumber4_props.val = /*env*/ ctx[0].PruneThreshold;
    	}

    	inputnumber4 = new InputNumber({
    			props: inputnumber4_props,
    			$$inline: true
    		});

    	binding_callbacks.push(() => bind(inputnumber4, "val", inputnumber4_val_binding));

    	const block = {
    		c: function create() {
    			div5 = element("div");
    			h2 = element("h2");
    			h2.textContent = "/ Environment";
    			t1 = space();
    			p = element("p");
    			p.textContent = "This page allow you to change the rescached environment.\nUpon save, the rescached service will be restarted.";
    			t3 = space();
    			h30 = element("h3");
    			h30.textContent = "rescached";
    			t5 = space();
    			div0 = element("div");
    			create_component(labelhint0.$$.fragment);
    			t6 = space();
    			input0 = element("input");
    			t7 = space();
    			create_component(labelhint1.$$.fragment);
    			t8 = space();
    			create_component(inputnumber0.$$.fragment);
    			t9 = space();
    			h31 = element("h3");
    			h31.textContent = "DNS server";
    			t11 = space();
    			div3 = element("div");
    			create_component(labelhint2.$$.fragment);
    			t12 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t13 = space();
    			button0 = element("button");
    			button0.textContent = "Add";
    			t15 = space();
    			create_component(labelhint3.$$.fragment);
    			t16 = space();
    			create_component(inputaddress.$$.fragment);
    			t17 = space();
    			create_component(labelhint4.$$.fragment);
    			t18 = space();
    			create_component(inputnumber1.$$.fragment);
    			t19 = space();
    			create_component(labelhint5.$$.fragment);
    			t20 = space();
    			create_component(inputnumber2.$$.fragment);
    			t21 = space();
    			create_component(labelhint6.$$.fragment);
    			t22 = space();
    			input1 = element("input");
    			t23 = space();
    			create_component(labelhint7.$$.fragment);
    			t24 = space();
    			input2 = element("input");
    			t25 = space();
    			create_component(labelhint8.$$.fragment);
    			t26 = space();
    			div1 = element("div");
    			input3 = element("input");
    			t27 = space();
    			span0 = element("span");
    			span0.textContent = "Yes";
    			t29 = space();
    			create_component(labelhint9.$$.fragment);
    			t30 = space();
    			div2 = element("div");
    			input4 = element("input");
    			t31 = space();
    			span1 = element("span");
    			span1.textContent = "Yes";
    			t33 = space();
    			create_component(labelhint10.$$.fragment);
    			t34 = space();
    			create_component(inputnumber3.$$.fragment);
    			t35 = space();
    			create_component(labelhint11.$$.fragment);
    			t36 = space();
    			create_component(inputnumber4.$$.fragment);
    			t37 = space();
    			div4 = element("div");
    			button1 = element("button");
    			button1.textContent = "Save";
    			add_location(h2, file$3, 84, 0, 1583);
    			add_location(p, file$3, 88, 0, 1610);
    			add_location(h30, file$3, 93, 0, 1729);
    			attr_dev(input0, "name", "FileResolvConf");
    			attr_dev(input0, "class", "svelte-1gci9yh");
    			add_location(input0, file$3, 103, 1, 2089);
    			add_location(div0, file$3, 94, 0, 1748);
    			add_location(h31, file$3, 115, 0, 2429);
    			add_location(button0, file$3, 130, 1, 2736);
    			attr_dev(input1, "name", "TLSCertFile");
    			attr_dev(input1, "class", "svelte-1gci9yh");
    			add_location(input1, file$3, 168, 1, 3692);
    			attr_dev(input2, "name", "TLSPrivateKey");
    			attr_dev(input2, "class", "svelte-1gci9yh");
    			add_location(input2, file$3, 176, 1, 3907);
    			attr_dev(input3, "name", "TLSAllowInsecure");
    			attr_dev(input3, "type", "checkbox");
    			attr_dev(input3, "class", "svelte-1gci9yh");
    			add_location(input3, file$3, 185, 2, 4160);
    			attr_dev(span0, "class", "suffix svelte-1gci9yh");
    			add_location(span0, file$3, 190, 2, 4256);
    			attr_dev(div1, "class", "input-suffix svelte-1gci9yh");
    			add_location(div1, file$3, 184, 1, 4131);
    			attr_dev(input4, "name", "DoHBehindProxy");
    			attr_dev(input4, "type", "checkbox");
    			attr_dev(input4, "class", "svelte-1gci9yh");
    			add_location(input4, file$3, 203, 2, 4566);
    			attr_dev(span1, "class", "suffix svelte-1gci9yh");
    			add_location(span1, file$3, 208, 2, 4658);
    			attr_dev(div2, "class", "input-suffix svelte-1gci9yh");
    			add_location(div2, file$3, 202, 1, 4537);
    			add_location(div3, file$3, 116, 0, 2449);
    			add_location(button1, file$3, 244, 1, 5450);
    			add_location(div4, file$3, 243, 0, 5443);
    			attr_dev(div5, "class", "environment");
    			add_location(div5, file$3, 83, 0, 1557);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div5, anchor);
    			append_dev(div5, h2);
    			append_dev(div5, t1);
    			append_dev(div5, p);
    			append_dev(div5, t3);
    			append_dev(div5, h30);
    			append_dev(div5, t5);
    			append_dev(div5, div0);
    			mount_component(labelhint0, div0, null);
    			append_dev(div0, t6);
    			append_dev(div0, input0);
    			set_input_value(input0, /*env*/ ctx[0].FileResolvConf);
    			append_dev(div0, t7);
    			mount_component(labelhint1, div0, null);
    			append_dev(div0, t8);
    			mount_component(inputnumber0, div0, null);
    			append_dev(div5, t9);
    			append_dev(div5, h31);
    			append_dev(div5, t11);
    			append_dev(div5, div3);
    			mount_component(labelhint2, div3, null);
    			append_dev(div3, t12);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div3, null);
    			}

    			append_dev(div3, t13);
    			append_dev(div3, button0);
    			append_dev(div3, t15);
    			mount_component(labelhint3, div3, null);
    			append_dev(div3, t16);
    			mount_component(inputaddress, div3, null);
    			append_dev(div3, t17);
    			mount_component(labelhint4, div3, null);
    			append_dev(div3, t18);
    			mount_component(inputnumber1, div3, null);
    			append_dev(div3, t19);
    			mount_component(labelhint5, div3, null);
    			append_dev(div3, t20);
    			mount_component(inputnumber2, div3, null);
    			append_dev(div3, t21);
    			mount_component(labelhint6, div3, null);
    			append_dev(div3, t22);
    			append_dev(div3, input1);
    			set_input_value(input1, /*env*/ ctx[0].TLSCertFile);
    			append_dev(div3, t23);
    			mount_component(labelhint7, div3, null);
    			append_dev(div3, t24);
    			append_dev(div3, input2);
    			set_input_value(input2, /*env*/ ctx[0].TLSPrivateKey);
    			append_dev(div3, t25);
    			mount_component(labelhint8, div3, null);
    			append_dev(div3, t26);
    			append_dev(div3, div1);
    			append_dev(div1, input3);
    			input3.checked = /*env*/ ctx[0].TLSAllowInsecure;
    			append_dev(div1, t27);
    			append_dev(div1, span0);
    			append_dev(div3, t29);
    			mount_component(labelhint9, div3, null);
    			append_dev(div3, t30);
    			append_dev(div3, div2);
    			append_dev(div2, input4);
    			input4.checked = /*env*/ ctx[0].DoHBehindProxy;
    			append_dev(div2, t31);
    			append_dev(div2, span1);
    			append_dev(div3, t33);
    			mount_component(labelhint10, div3, null);
    			append_dev(div3, t34);
    			mount_component(inputnumber3, div3, null);
    			append_dev(div3, t35);
    			mount_component(labelhint11, div3, null);
    			append_dev(div3, t36);
    			mount_component(inputnumber4, div3, null);
    			append_dev(div5, t37);
    			append_dev(div5, div4);
    			append_dev(div4, button1);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(input0, "input", /*input0_input_handler*/ ctx[4]),
    					listen_dev(button0, "click", /*addNameServer*/ ctx[1], false, false, false),
    					listen_dev(input1, "input", /*input1_input_handler*/ ctx[10]),
    					listen_dev(input2, "input", /*input2_input_handler*/ ctx[11]),
    					listen_dev(input3, "change", /*input3_change_handler*/ ctx[12]),
    					listen_dev(input4, "change", /*input4_change_handler*/ ctx[13]),
    					listen_dev(button1, "click", /*updateEnvironment*/ ctx[3], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*env*/ 1 && input0.value !== /*env*/ ctx[0].FileResolvConf) {
    				set_input_value(input0, /*env*/ ctx[0].FileResolvConf);
    			}

    			const inputnumber0_changes = {};

    			if (dirty & /*$$scope*/ 1048576) {
    				inputnumber0_changes.$$scope = { dirty, ctx };
    			}

    			if (!updating_val && dirty & /*env*/ 1) {
    				updating_val = true;
    				inputnumber0_changes.val = /*env*/ ctx[0].Debug;
    				add_flush_callback(() => updating_val = false);
    			}

    			inputnumber0.$set(inputnumber0_changes);

    			if (dirty & /*deleteNameServer, env*/ 5) {
    				each_value = /*env*/ ctx[0].NameServers;
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div3, t13);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}

    			const inputaddress_changes = {};

    			if (!updating_value && dirty & /*env*/ 1) {
    				updating_value = true;
    				inputaddress_changes.value = /*env*/ ctx[0].ListenAddress;
    				add_flush_callback(() => updating_value = false);
    			}

    			inputaddress.$set(inputaddress_changes);
    			const inputnumber1_changes = {};

    			if (dirty & /*$$scope*/ 1048576) {
    				inputnumber1_changes.$$scope = { dirty, ctx };
    			}

    			if (!updating_val_1 && dirty & /*env*/ 1) {
    				updating_val_1 = true;
    				inputnumber1_changes.val = /*env*/ ctx[0].HTTPPort;
    				add_flush_callback(() => updating_val_1 = false);
    			}

    			inputnumber1.$set(inputnumber1_changes);
    			const inputnumber2_changes = {};

    			if (dirty & /*$$scope*/ 1048576) {
    				inputnumber2_changes.$$scope = { dirty, ctx };
    			}

    			if (!updating_val_2 && dirty & /*env*/ 1) {
    				updating_val_2 = true;
    				inputnumber2_changes.val = /*env*/ ctx[0].TLSPort;
    				add_flush_callback(() => updating_val_2 = false);
    			}

    			inputnumber2.$set(inputnumber2_changes);

    			if (dirty & /*env*/ 1 && input1.value !== /*env*/ ctx[0].TLSCertFile) {
    				set_input_value(input1, /*env*/ ctx[0].TLSCertFile);
    			}

    			if (dirty & /*env*/ 1 && input2.value !== /*env*/ ctx[0].TLSPrivateKey) {
    				set_input_value(input2, /*env*/ ctx[0].TLSPrivateKey);
    			}

    			if (dirty & /*env*/ 1) {
    				input3.checked = /*env*/ ctx[0].TLSAllowInsecure;
    			}

    			if (dirty & /*env*/ 1) {
    				input4.checked = /*env*/ ctx[0].DoHBehindProxy;
    			}

    			const inputnumber3_changes = {};

    			if (!updating_val_3 && dirty & /*env*/ 1) {
    				updating_val_3 = true;
    				inputnumber3_changes.val = /*env*/ ctx[0].PruneDelay;
    				add_flush_callback(() => updating_val_3 = false);
    			}

    			inputnumber3.$set(inputnumber3_changes);
    			const inputnumber4_changes = {};

    			if (!updating_val_4 && dirty & /*env*/ 1) {
    				updating_val_4 = true;
    				inputnumber4_changes.val = /*env*/ ctx[0].PruneThreshold;
    				add_flush_callback(() => updating_val_4 = false);
    			}

    			inputnumber4.$set(inputnumber4_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(labelhint0.$$.fragment, local);
    			transition_in(labelhint1.$$.fragment, local);
    			transition_in(inputnumber0.$$.fragment, local);
    			transition_in(labelhint2.$$.fragment, local);
    			transition_in(labelhint3.$$.fragment, local);
    			transition_in(inputaddress.$$.fragment, local);
    			transition_in(labelhint4.$$.fragment, local);
    			transition_in(inputnumber1.$$.fragment, local);
    			transition_in(labelhint5.$$.fragment, local);
    			transition_in(inputnumber2.$$.fragment, local);
    			transition_in(labelhint6.$$.fragment, local);
    			transition_in(labelhint7.$$.fragment, local);
    			transition_in(labelhint8.$$.fragment, local);
    			transition_in(labelhint9.$$.fragment, local);
    			transition_in(labelhint10.$$.fragment, local);
    			transition_in(inputnumber3.$$.fragment, local);
    			transition_in(labelhint11.$$.fragment, local);
    			transition_in(inputnumber4.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(labelhint0.$$.fragment, local);
    			transition_out(labelhint1.$$.fragment, local);
    			transition_out(inputnumber0.$$.fragment, local);
    			transition_out(labelhint2.$$.fragment, local);
    			transition_out(labelhint3.$$.fragment, local);
    			transition_out(inputaddress.$$.fragment, local);
    			transition_out(labelhint4.$$.fragment, local);
    			transition_out(inputnumber1.$$.fragment, local);
    			transition_out(labelhint5.$$.fragment, local);
    			transition_out(inputnumber2.$$.fragment, local);
    			transition_out(labelhint6.$$.fragment, local);
    			transition_out(labelhint7.$$.fragment, local);
    			transition_out(labelhint8.$$.fragment, local);
    			transition_out(labelhint9.$$.fragment, local);
    			transition_out(labelhint10.$$.fragment, local);
    			transition_out(inputnumber3.$$.fragment, local);
    			transition_out(labelhint11.$$.fragment, local);
    			transition_out(inputnumber4.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div5);
    			destroy_component(labelhint0);
    			destroy_component(labelhint1);
    			destroy_component(inputnumber0);
    			destroy_component(labelhint2);
    			destroy_each(each_blocks, detaching);
    			destroy_component(labelhint3);
    			destroy_component(inputaddress);
    			destroy_component(labelhint4);
    			destroy_component(inputnumber1);
    			destroy_component(labelhint5);
    			destroy_component(inputnumber2);
    			destroy_component(labelhint6);
    			destroy_component(labelhint7);
    			destroy_component(labelhint8);
    			destroy_component(labelhint9);
    			destroy_component(labelhint10);
    			destroy_component(inputnumber3);
    			destroy_component(labelhint11);
    			destroy_component(inputnumber4);
    			mounted = false;
    			run_all(dispose);
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
    	let env = {
    		NameServers: [],
    		HostsBlocks: [],
    		HostsFiles: []
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

    		const resJSON = await res.json();
    		console.log(resJSON);
    	}

    	const writable_props = [];

    	Object_1.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1.warn(`<Environment> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Environment", $$slots, []);

    	function input0_input_handler() {
    		env.FileResolvConf = this.value;
    		$$invalidate(0, env);
    	}

    	function inputnumber0_val_binding(value) {
    		env.Debug = value;
    		$$invalidate(0, env);
    	}

    	function input_input_handler(each_value, ns_index) {
    		each_value[ns_index] = this.value;
    		$$invalidate(0, env);
    	}

    	function inputaddress_value_binding(value) {
    		env.ListenAddress = value;
    		$$invalidate(0, env);
    	}

    	function inputnumber1_val_binding(value) {
    		env.HTTPPort = value;
    		$$invalidate(0, env);
    	}

    	function inputnumber2_val_binding(value) {
    		env.TLSPort = value;
    		$$invalidate(0, env);
    	}

    	function input1_input_handler() {
    		env.TLSCertFile = this.value;
    		$$invalidate(0, env);
    	}

    	function input2_input_handler() {
    		env.TLSPrivateKey = this.value;
    		$$invalidate(0, env);
    	}

    	function input3_change_handler() {
    		env.TLSAllowInsecure = this.checked;
    		$$invalidate(0, env);
    	}

    	function input4_change_handler() {
    		env.DoHBehindProxy = this.checked;
    		$$invalidate(0, env);
    	}

    	function inputnumber3_val_binding(value) {
    		env.PruneDelay = value;
    		$$invalidate(0, env);
    	}

    	function inputnumber4_val_binding(value) {
    		env.PruneThreshold = value;
    		$$invalidate(0, env);
    	}

    	$$self.$capture_state = () => ({
    		onDestroy,
    		apiEnvironment,
    		environment,
    		nanoSeconds,
    		LabelHint,
    		InputNumber,
    		InputAddress,
    		env,
    		envUnsubscribe,
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
    		input0_input_handler,
    		inputnumber0_val_binding,
    		input_input_handler,
    		inputaddress_value_binding,
    		inputnumber1_val_binding,
    		inputnumber2_val_binding,
    		input1_input_handler,
    		input2_input_handler,
    		input3_change_handler,
    		input4_change_handler,
    		inputnumber3_val_binding,
    		inputnumber4_val_binding
    	];
    }

    class Environment extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Environment",
    			options,
    			id: create_fragment$3.name
    		});
    	}
    }

    /* src/HostsBlock.svelte generated by Svelte v3.24.0 */

    const { console: console_1$1 } = globals;
    const file$4 = "src/HostsBlock.svelte";

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[5] = list[i];
    	child_ctx[6] = list;
    	child_ctx[7] = i;
    	return child_ctx;
    }

    // (87:2) {#each env.HostsBlocks as hostsBlock}
    function create_each_block$1(ctx) {
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
    			add_location(input0, file$4, 89, 4, 1623);
    			attr_dev(span0, "class", "svelte-ze2due");
    			add_location(span0, file$4, 88, 3, 1612);
    			attr_dev(span1, "class", "svelte-ze2due");
    			add_location(span1, file$4, 94, 3, 1710);
    			input1.disabled = true;
    			attr_dev(input1, "class", "svelte-ze2due");
    			add_location(input1, file$4, 98, 4, 1764);
    			attr_dev(span2, "class", "svelte-ze2due");
    			add_location(span2, file$4, 97, 3, 1753);
    			attr_dev(span3, "class", "svelte-ze2due");
    			add_location(span3, file$4, 103, 3, 1838);
    			attr_dev(div, "class", "item svelte-ze2due");
    			add_location(div, file$4, 87, 2, 1590);
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
    		id: create_each_block$1.name,
    		type: "each",
    		source: "(87:2) {#each env.HostsBlocks as hostsBlock}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$4(ctx) {
    	let div3;
    	let h2;
    	let t1;
    	let p;
    	let t3;
    	let div1;
    	let div0;
    	let span0;
    	let t5;
    	let span1;
    	let t7;
    	let span2;
    	let t9;
    	let span3;
    	let t11;
    	let t12;
    	let div2;
    	let button;
    	let mounted;
    	let dispose;
    	let each_value = /*env*/ ctx[0].HostsBlocks;
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			div3 = element("div");
    			h2 = element("h2");
    			h2.textContent = "/ Hosts block";
    			t1 = space();
    			p = element("p");
    			p.textContent = "Configure the source of blocked hosts file.";
    			t3 = space();
    			div1 = element("div");
    			div0 = element("div");
    			span0 = element("span");
    			span0.textContent = "Enabled";
    			t5 = space();
    			span1 = element("span");
    			span1.textContent = "Name";
    			t7 = space();
    			span2 = element("span");
    			span2.textContent = "URL";
    			t9 = space();
    			span3 = element("span");
    			span3.textContent = "Last updated";
    			t11 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t12 = space();
    			div2 = element("div");
    			button = element("button");
    			button.textContent = "Save";
    			add_location(h2, file$4, 71, 1, 1296);
    			add_location(p, file$4, 75, 1, 1325);
    			attr_dev(span0, "class", "svelte-ze2due");
    			add_location(span0, file$4, 81, 3, 1440);
    			attr_dev(span1, "class", "svelte-ze2due");
    			add_location(span1, file$4, 82, 3, 1466);
    			attr_dev(span2, "class", "svelte-ze2due");
    			add_location(span2, file$4, 83, 3, 1489);
    			attr_dev(span3, "class", "svelte-ze2due");
    			add_location(span3, file$4, 84, 3, 1511);
    			attr_dev(div0, "class", "item header svelte-ze2due");
    			add_location(div0, file$4, 80, 2, 1411);
    			attr_dev(div1, "class", "block_source svelte-ze2due");
    			add_location(div1, file$4, 79, 1, 1382);
    			add_location(button, file$4, 111, 2, 1922);
    			add_location(div2, file$4, 110, 1, 1914);
    			attr_dev(div3, "class", "hosts-block");
    			add_location(div3, file$4, 70, 0, 1269);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div3, anchor);
    			append_dev(div3, h2);
    			append_dev(div3, t1);
    			append_dev(div3, p);
    			append_dev(div3, t3);
    			append_dev(div3, div1);
    			append_dev(div1, div0);
    			append_dev(div0, span0);
    			append_dev(div0, t5);
    			append_dev(div0, span1);
    			append_dev(div0, t7);
    			append_dev(div0, span2);
    			append_dev(div0, t9);
    			append_dev(div0, span3);
    			append_dev(div1, t11);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div1, null);
    			}

    			append_dev(div3, t12);
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
    					const child_ctx = get_each_context$1(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$1(child_ctx);
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
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    const apiHostsBlock = "/api/hosts_block";

    function instance$4($$self, $$props, $$invalidate) {
    	let env = {
    		NameServers: [],
    		HostsBlocks: [],
    		HostsFiles: []
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
    			console.log("updateHostsBlocks: ", res.status, res.statusText);
    			return;
    		}

    		setEnvironment(await res.json());
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1$1.warn(`<HostsBlock> was created with unknown prop '${key}'`);
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
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "HostsBlock",
    			options,
    			id: create_fragment$4.name
    		});
    	}
    }

    /* src/HostsDir.svelte generated by Svelte v3.24.0 */

    const { console: console_1$2 } = globals;
    const file$5 = "src/HostsDir.svelte";

    function get_each_context$2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[13] = list[i];
    	child_ctx[14] = list;
    	child_ctx[15] = i;
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[16] = list[i];
    	return child_ctx;
    }

    // (132:2) {#each env.HostsFiles as hf}
    function create_each_block_1(ctx) {
    	let div;
    	let a;
    	let t_value = /*hf*/ ctx[16].Name + "";
    	let t;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div = element("div");
    			a = element("a");
    			t = text(t_value);
    			attr_dev(a, "href", "#");
    			add_location(a, file$5, 133, 3, 2524);
    			attr_dev(div, "class", "item svelte-1vh8vt2");
    			add_location(div, file$5, 132, 2, 2502);
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
    						if (is_function(/*getHostsFile*/ ctx[3](/*hf*/ ctx[16]))) /*getHostsFile*/ ctx[3](/*hf*/ ctx[16]).apply(this, arguments);
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
    			if (dirty & /*env*/ 1 && t_value !== (t_value = /*hf*/ ctx[16].Name + "")) set_data_dev(t, t_value);
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
    		source: "(132:2) {#each env.HostsFiles as hf}",
    		ctx
    	});

    	return block;
    }

    // (155:2) {:else}
    function create_else_block(ctx) {
    	let p;
    	let t0_value = /*hostsFile*/ ctx[1].Name + "";
    	let t0;
    	let t1;
    	let t2_value = /*hostsFile*/ ctx[1].hosts.length + "";
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
    	let each_value = /*hostsFile*/ ctx[1].hosts;
    	validate_each_argument(each_value);
    	const get_key = ctx => /*idx*/ ctx[15];
    	validate_each_keys(ctx, each_value, get_each_context$2, get_key);

    	for (let i = 0; i < each_value.length; i += 1) {
    		let child_ctx = get_each_context$2(ctx, each_value, i);
    		let key = get_key(child_ctx);
    		each_1_lookup.set(key, each_blocks[i] = create_each_block$2(key, child_ctx));
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
    			add_location(button0, file$5, 157, 3, 2965);
    			add_location(p, file$5, 155, 2, 2903);
    			add_location(button1, file$5, 162, 3, 3054);
    			add_location(div, file$5, 161, 2, 3045);
    			add_location(button2, file$5, 185, 2, 3448);
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
    			if (dirty & /*hostsFile*/ 2 && t2_value !== (t2_value = /*hostsFile*/ ctx[1].hosts.length + "")) set_data_dev(t2, t2_value);

    			if (dirty & /*deleteHost, hostsFile*/ 130) {
    				const each_value = /*hostsFile*/ ctx[1].hosts;
    				validate_each_argument(each_value);
    				validate_each_keys(ctx, each_value, get_each_context$2, get_key);
    				each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value, each_1_lookup, t8.parentNode, destroy_block, create_each_block$2, t8, get_each_context$2);
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
    		source: "(155:2) {:else}",
    		ctx
    	});

    	return block;
    }

    // (151:2) {#if hostsFile.Name === ""}
    function create_if_block$3(ctx) {
    	let p;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "Select one of the hosts file to manage.";
    			add_location(p, file$5, 151, 2, 2837);
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
    		id: create_if_block$3.name,
    		type: "if",
    		source: "(151:2) {#if hostsFile.Name === \\\"\\\"}",
    		ctx
    	});

    	return block;
    }

    // (168:2) {#each hostsFile.hosts as host, idx (idx)}
    function create_each_block$2(key_1, ctx) {
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
    			add_location(input0, file$5, 169, 3, 3182);
    			attr_dev(input1, "class", "host_value svelte-1vh8vt2");
    			attr_dev(input1, "placeholder", "IP address");
    			add_location(input1, file$5, 174, 3, 3276);
    			add_location(button, file$5, 179, 3, 3371);
    			attr_dev(div, "class", "host svelte-1vh8vt2");
    			add_location(div, file$5, 168, 2, 3160);
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
    		id: create_each_block$2.name,
    		type: "each",
    		source: "(168:2) {#each hostsFile.hosts as host, idx (idx)}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$5(ctx) {
    	let div2;
    	let h2;
    	let t1;
    	let div0;
    	let t2;
    	let br0;
    	let t3;
    	let label;
    	let span;
    	let t5;
    	let br1;
    	let t6;
    	let input;
    	let t7;
    	let button;
    	let t9;
    	let div1;
    	let mounted;
    	let dispose;
    	let each_value_1 = /*env*/ ctx[0].HostsFiles;
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
    			h2 = element("h2");
    			h2.textContent = "/ hosts.d";
    			t1 = space();
    			div0 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t2 = space();
    			br0 = element("br");
    			t3 = space();
    			label = element("label");
    			span = element("span");
    			span.textContent = "New hosts file:";
    			t5 = space();
    			br1 = element("br");
    			t6 = space();
    			input = element("input");
    			t7 = space();
    			button = element("button");
    			button.textContent = "Create";
    			t9 = space();
    			div1 = element("div");
    			if_block.c();
    			add_location(h2, file$5, 126, 1, 2420);
    			add_location(br0, file$5, 138, 2, 2608);
    			add_location(span, file$5, 140, 3, 2627);
    			add_location(br1, file$5, 141, 3, 2659);
    			add_location(input, file$5, 142, 3, 2668);
    			add_location(label, file$5, 139, 2, 2616);
    			add_location(button, file$5, 144, 2, 2715);
    			attr_dev(div0, "class", "nav-left svelte-1vh8vt2");
    			add_location(div0, file$5, 130, 1, 2446);
    			attr_dev(div1, "class", "content svelte-1vh8vt2");
    			add_location(div1, file$5, 149, 1, 2783);
    			attr_dev(div2, "class", "hosts_d");
    			add_location(div2, file$5, 125, 0, 2397);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, h2);
    			append_dev(div2, t1);
    			append_dev(div2, div0);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div0, null);
    			}

    			append_dev(div0, t2);
    			append_dev(div0, br0);
    			append_dev(div0, t3);
    			append_dev(div0, label);
    			append_dev(label, span);
    			append_dev(label, t5);
    			append_dev(label, br1);
    			append_dev(label, t6);
    			append_dev(label, input);
    			set_input_value(input, /*newHostsFile*/ ctx[2]);
    			append_dev(div0, t7);
    			append_dev(div0, button);
    			append_dev(div2, t9);
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
    			if (dirty & /*getHostsFile, env*/ 9) {
    				each_value_1 = /*env*/ ctx[0].HostsFiles;
    				validate_each_argument(each_value_1);
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div0, t2);
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
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    const apiHostsDir = "/api/hosts.d";

    function instance$5($$self, $$props, $$invalidate) {
    	let env = { HostsFiles: [] };
    	let hostsFile = { Name: "", hosts: [] };
    	let newHostsFile = "";

    	const envUnsubscribe = environment.subscribe(value => {
    		$$invalidate(0, env = value);
    	});

    	onDestroy(envUnsubscribe);

    	async function getHostsFile(hf) {
    		if (hf.hosts.length > 0) {
    			$$invalidate(1, hostsFile = hf);
    			return;
    		}

    		const res = await fetch(apiHostsDir + "/" + hf.Name);
    		hf.hosts = await res.json();
    		$$invalidate(1, hostsFile = hf);
    	}

    	async function createHostsFile() {
    		if (newHostsFile === "") {
    			return;
    		}

    		const res = await fetch(apiHostsDir + "/" + newHostsFile, { method: "PUT" });

    		if (res.status >= 400) {
    			console.log("createHostsFile: ", res.status, res.statusText);
    			return;
    		}

    		const hf = {
    			Name: newHostsFile,
    			Path: newHostsFile,
    			hosts: []
    		};

    		env.HostsFiles.push(hf);
    		$$invalidate(0, env);
    	}

    	async function updateHostsFile() {
    		const res = await fetch(apiHostsDir + "/" + hostsFile.Name, {
    			method: "POST",
    			body: JSON.stringify(hostsFile.hosts)
    		});

    		if (res.status >= 400) {
    			console.log("updateHostsFile: ", res.status, res.statusText);
    			return;
    		}

    		$$invalidate(1, hostsFile.hosts = await res.json(), hostsFile);
    	}

    	function addHost() {
    		let newHost = { Name: "", Value: "" };
    		hostsFile.hosts.unshift(newHost);
    		$$invalidate(1, hostsFile);
    	}

    	function deleteHost(idx) {
    		console.log("deleteHost at ", idx);
    		hostsFile.hosts.splice(idx, 1);
    		$$invalidate(1, hostsFile);
    	}

    	async function deleteHostsFile(hfile) {
    		const res = await fetch(apiHostsDir + "/" + hfile.Name, { method: "DELETE" });

    		if (res.status >= 400) {
    			console.log("deleteHostsFile: ", res.status, res.statusText);
    			return;
    		}

    		for (let x = 0; x < env.HostsFiles.length; x++) {
    			if (env.HostsFiles[x].Name == hfile.Name) {
    				$$invalidate(1, hostsFile = { Name: "", Path: "", hosts: [] });
    				env.HostsFiles.splice(x, 1);
    				$$invalidate(0, env);
    				return;
    			}
    		}
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1$2.warn(`<HostsDir> was created with unknown prop '${key}'`);
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
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "HostsDir",
    			options,
    			id: create_fragment$5.name
    		});
    	}
    }

    /* src/MasterDir.svelte generated by Svelte v3.24.0 */

    const { Object: Object_1$1, console: console_1$3 } = globals;
    const file$6 = "src/MasterDir.svelte";

    function get_each_context$3(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[26] = list[i][0];
    	child_ctx[27] = list[i][1];
    	return child_ctx;
    }

    function get_each_context_2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[5] = list[i];
    	child_ctx[35] = i;
    	return child_ctx;
    }

    function get_each_context_1$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[30] = list[i][0];
    	child_ctx[31] = list[i][1];
    	return child_ctx;
    }

    function get_each_context_3(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[36] = list[i][0];
    	child_ctx[37] = list[i][1];
    	return child_ctx;
    }

    // (217:0) {#each Object.entries(env.MasterFiles) as [name, mf]}
    function create_each_block_3(ctx) {
    	let div;
    	let span;
    	let t_value = /*mf*/ ctx[37].Name + "";
    	let t;
    	let mounted;
    	let dispose;

    	function click_handler(...args) {
    		return /*click_handler*/ ctx[11](/*mf*/ ctx[37], ...args);
    	}

    	const block = {
    		c: function create() {
    			div = element("div");
    			span = element("span");
    			t = text(t_value);
    			add_location(span, file$6, 218, 3, 3475);
    			attr_dev(div, "class", "item svelte-nv73ia");
    			add_location(div, file$6, 217, 2, 3453);
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
    			if (dirty[0] & /*env*/ 1 && t_value !== (t_value = /*mf*/ ctx[37].Name + "")) set_data_dev(t, t_value);
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
    		source: "(217:0) {#each Object.entries(env.MasterFiles) as [name, mf]}",
    		ctx
    	});

    	return block;
    }

    // (241:0) {:else}
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
    		each_blocks[i] = create_each_block$3(get_each_context$3(ctx, each_value, i));
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
    			add_location(button0, file$6, 243, 3, 3876);
    			add_location(p, file$6, 241, 2, 3850);
    			attr_dev(span0, "class", "name svelte-nv73ia");
    			add_location(span0, file$6, 249, 3, 3974);
    			attr_dev(span1, "class", "type svelte-nv73ia");
    			add_location(span1, file$6, 252, 3, 4017);
    			attr_dev(span2, "class", "value svelte-nv73ia");
    			add_location(span2, file$6, 255, 3, 4060);
    			attr_dev(div0, "class", "rr header svelte-nv73ia");
    			add_location(div0, file$6, 248, 2, 3947);
    			attr_dev(span3, "class", "svelte-nv73ia");
    			add_location(span3, file$6, 281, 4, 4540);
    			attr_dev(input, "class", "name svelte-nv73ia");
    			add_location(input, file$6, 284, 4, 4574);
    			attr_dev(label0, "class", "svelte-nv73ia");
    			add_location(label0, file$6, 280, 3, 4528);
    			attr_dev(span4, "class", "svelte-nv73ia");
    			add_location(span4, file$6, 288, 4, 4664);
    			if (/*rr*/ ctx[5].Type === void 0) add_render_callback(() => /*select_change_handler*/ ctx[14].call(select));
    			add_location(select, file$6, 291, 4, 4698);
    			attr_dev(label1, "class", "svelte-nv73ia");
    			add_location(label1, file$6, 287, 3, 4652);
    			attr_dev(button1, "class", "create");
    			attr_dev(button1, "type", "submit");
    			add_location(button1, file$6, 370, 4, 6181);
    			attr_dev(div1, "class", "actions svelte-nv73ia");
    			add_location(div1, file$6, 369, 3, 6155);
    			attr_dev(form, "class", "svelte-nv73ia");
    			add_location(form, file$6, 279, 2, 4476);
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
    					listen_dev(button0, "click", deleteMasterFile, false, false, false),
    					listen_dev(input, "input", /*input_input_handler_1*/ ctx[13]),
    					listen_dev(select, "change", /*select_change_handler*/ ctx[14]),
    					listen_dev(select, "blur", /*onSelectRRType*/ ctx[7], false, false, false),
    					listen_dev(form, "submit", prevent_default(/*handleCreateRR*/ ctx[8]), false, true, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*activeMF*/ 4 && t0_value !== (t0_value = /*activeMF*/ ctx[2].Name + "")) set_data_dev(t0, t0_value);

    			if (dirty[0] & /*activeMF, handleDeleteRR, getTypeName*/ 1540) {
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
    					const child_ctx = get_each_context$3(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$3(child_ctx);
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
    		source: "(241:0) {:else}",
    		ctx
    	});

    	return block;
    }

    // (237:0) {#if activeMF.Name === ""}
    function create_if_block$4(ctx) {
    	let p;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "Select one of the master file to manage.";
    			add_location(p, file$6, 237, 2, 3785);
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
    		source: "(237:0) {#if activeMF.Name === \\\"\\\"}",
    		ctx
    	});

    	return block;
    }

    // (262:2) {#each listRR as rr, idx}
    function create_each_block_2(ctx) {
    	let div;
    	let span0;
    	let t0_value = /*rr*/ ctx[5].Name + "";
    	let t0;
    	let t1;
    	let span1;
    	let t2_value = /*getTypeName*/ ctx[10](/*rr*/ ctx[5].Type) + "";
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
    			add_location(span0, file$6, 263, 3, 4223);
    			attr_dev(span1, "class", "type svelte-nv73ia");
    			add_location(span1, file$6, 266, 3, 4271);
    			attr_dev(span2, "class", "value svelte-nv73ia");
    			add_location(span2, file$6, 269, 3, 4332);
    			add_location(button, file$6, 272, 3, 4382);
    			attr_dev(div, "class", "rr svelte-nv73ia");
    			add_location(div, file$6, 262, 2, 4203);
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
    						if (is_function(/*handleDeleteRR*/ ctx[9](/*rr*/ ctx[5], /*idx*/ ctx[35]))) /*handleDeleteRR*/ ctx[9](/*rr*/ ctx[5], /*idx*/ ctx[35]).apply(this, arguments);
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
    			if (dirty[0] & /*activeMF*/ 4 && t2_value !== (t2_value = /*getTypeName*/ ctx[10](/*rr*/ ctx[5].Type) + "")) set_data_dev(t2, t2_value);
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
    		source: "(262:2) {#each listRR as rr, idx}",
    		ctx
    	});

    	return block;
    }

    // (261:1) {#each Object.entries(activeMF.Records) as [dname, listRR]}
    function create_each_block_1$1(ctx) {
    	let each_1_anchor;
    	let each_value_2 = /*listRR*/ ctx[31];
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
    			if (dirty[0] & /*handleDeleteRR, activeMF, getTypeName*/ 1540) {
    				each_value_2 = /*listRR*/ ctx[31];
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
    		source: "(261:1) {#each Object.entries(activeMF.Records) as [dname, listRR]}",
    		ctx
    	});

    	return block;
    }

    // (296:1) {#each Object.entries(RRTypes) as [k, v]}
    function create_each_block$3(ctx) {
    	let option;
    	let t0_value = /*v*/ ctx[27] + "";
    	let t0;
    	let t1;
    	let option_value_value;

    	const block = {
    		c: function create() {
    			option = element("option");
    			t0 = text(t0_value);
    			t1 = space();
    			option.__value = option_value_value = parseInt(/*k*/ ctx[26]);
    			option.value = option.__value;
    			add_location(option, file$6, 296, 5, 4816);
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
    		id: create_each_block$3.name,
    		type: "each",
    		source: "(296:1) {#each Object.entries(RRTypes) as [k, v]}",
    		ctx
    	});

    	return block;
    }

    // (356:26) 
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
    			add_location(span0, file$6, 357, 4, 5928);
    			attr_dev(input0, "type", "number");
    			attr_dev(input0, "min", "1");
    			attr_dev(input0, "max", "65535");
    			attr_dev(input0, "class", "svelte-nv73ia");
    			add_location(input0, file$6, 360, 4, 5968);
    			attr_dev(label0, "class", "svelte-nv73ia");
    			add_location(label0, file$6, 356, 3, 5916);
    			attr_dev(span1, "class", "svelte-nv73ia");
    			add_location(span1, file$6, 363, 4, 6060);
    			attr_dev(input1, "class", "svelte-nv73ia");
    			add_location(input1, file$6, 366, 4, 6098);
    			attr_dev(label1, "class", "svelte-nv73ia");
    			add_location(label1, file$6, 362, 3, 6048);
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
    					listen_dev(input0, "input", /*input0_input_handler_1*/ ctx[23]),
    					listen_dev(input1, "input", /*input1_input_handler_1*/ ctx[24])
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
    		source: "(356:26) ",
    		ctx
    	});

    	return block;
    }

    // (313:25) 
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
    			add_location(span0, file$6, 314, 4, 5152);
    			attr_dev(input0, "class", "svelte-nv73ia");
    			add_location(input0, file$6, 317, 4, 5193);
    			attr_dev(label0, "class", "svelte-nv73ia");
    			add_location(label0, file$6, 313, 3, 5140);
    			attr_dev(span1, "class", "svelte-nv73ia");
    			add_location(span1, file$6, 320, 4, 5253);
    			attr_dev(input1, "class", "svelte-nv73ia");
    			add_location(input1, file$6, 323, 4, 5294);
    			attr_dev(label1, "class", "svelte-nv73ia");
    			add_location(label1, file$6, 319, 3, 5241);
    			attr_dev(span2, "class", "svelte-nv73ia");
    			add_location(span2, file$6, 326, 4, 5354);
    			attr_dev(input2, "type", "number");
    			attr_dev(input2, "class", "svelte-nv73ia");
    			add_location(input2, file$6, 329, 4, 5390);
    			attr_dev(label2, "class", "svelte-nv73ia");
    			add_location(label2, file$6, 325, 3, 5342);
    			attr_dev(span3, "class", "svelte-nv73ia");
    			add_location(span3, file$6, 332, 4, 5463);
    			attr_dev(input3, "type", "number");
    			attr_dev(input3, "class", "svelte-nv73ia");
    			add_location(input3, file$6, 335, 4, 5500);
    			attr_dev(label3, "class", "svelte-nv73ia");
    			add_location(label3, file$6, 331, 3, 5451);
    			attr_dev(span4, "class", "svelte-nv73ia");
    			add_location(span4, file$6, 338, 4, 5574);
    			attr_dev(input4, "type", "number");
    			attr_dev(input4, "class", "svelte-nv73ia");
    			add_location(input4, file$6, 341, 4, 5609);
    			attr_dev(label4, "class", "svelte-nv73ia");
    			add_location(label4, file$6, 337, 3, 5562);
    			attr_dev(span5, "class", "svelte-nv73ia");
    			add_location(span5, file$6, 344, 4, 5681);
    			attr_dev(input5, "type", "number");
    			attr_dev(input5, "class", "svelte-nv73ia");
    			add_location(input5, file$6, 347, 4, 5717);
    			attr_dev(label5, "class", "svelte-nv73ia");
    			add_location(label5, file$6, 343, 3, 5669);
    			attr_dev(span6, "class", "svelte-nv73ia");
    			add_location(span6, file$6, 350, 4, 5790);
    			attr_dev(input6, "type", "number");
    			attr_dev(input6, "class", "svelte-nv73ia");
    			add_location(input6, file$6, 353, 4, 5827);
    			attr_dev(label6, "class", "svelte-nv73ia");
    			add_location(label6, file$6, 349, 3, 5778);
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
    					listen_dev(input0, "input", /*input0_input_handler*/ ctx[16]),
    					listen_dev(input1, "input", /*input1_input_handler*/ ctx[17]),
    					listen_dev(input2, "input", /*input2_input_handler*/ ctx[18]),
    					listen_dev(input3, "input", /*input3_input_handler*/ ctx[19]),
    					listen_dev(input4, "input", /*input4_input_handler*/ ctx[20]),
    					listen_dev(input5, "input", /*input5_input_handler*/ ctx[21]),
    					listen_dev(input6, "input", /*input6_input_handler*/ ctx[22])
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
    		source: "(313:25) ",
    		ctx
    	});

    	return block;
    }

    // (304:1) {#if rr.Type === 1 || rr.Type === 2 || rr.Type === 5 ||   rr.Type === 12 || rr.Type === 16 || rr.Type === 28  }
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
    			add_location(span, file$6, 307, 4, 5034);
    			attr_dev(input, "class", "svelte-nv73ia");
    			add_location(input, file$6, 310, 4, 5069);
    			attr_dev(label, "class", "svelte-nv73ia");
    			add_location(label, file$6, 306, 3, 5022);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, label, anchor);
    			append_dev(label, span);
    			append_dev(label, t1);
    			append_dev(label, input);
    			set_input_value(input, /*rr*/ ctx[5].Value);

    			if (!mounted) {
    				dispose = listen_dev(input, "input", /*input_input_handler_2*/ ctx[15]);
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
    		source: "(304:1) {#if rr.Type === 1 || rr.Type === 2 || rr.Type === 5 ||   rr.Type === 12 || rr.Type === 16 || rr.Type === 28  }",
    		ctx
    	});

    	return block;
    }

    function create_fragment$6(ctx) {
    	let div2;
    	let h2;
    	let t1;
    	let div0;
    	let t2;
    	let br0;
    	let t3;
    	let label;
    	let span;
    	let t5;
    	let br1;
    	let t6;
    	let input;
    	let t7;
    	let button;
    	let t9;
    	let div1;
    	let mounted;
    	let dispose;
    	let each_value_3 = Object.entries(/*env*/ ctx[0].MasterFiles);
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
    			h2 = element("h2");
    			h2.textContent = "/ master.d";
    			t1 = space();
    			div0 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t2 = space();
    			br0 = element("br");
    			t3 = space();
    			label = element("label");
    			span = element("span");
    			span.textContent = "New master file:";
    			t5 = space();
    			br1 = element("br");
    			t6 = space();
    			input = element("input");
    			t7 = space();
    			button = element("button");
    			button.textContent = "Create";
    			t9 = space();
    			div1 = element("div");
    			if_block.c();
    			add_location(h2, file$6, 213, 1, 3350);
    			add_location(br0, file$6, 223, 2, 3555);
    			add_location(span, file$6, 226, 3, 3575);
    			add_location(br1, file$6, 227, 3, 3608);
    			add_location(input, file$6, 228, 3, 3617);
    			add_location(label, file$6, 225, 2, 3564);
    			add_location(button, file$6, 230, 2, 3665);
    			attr_dev(div0, "class", "nav-left svelte-nv73ia");
    			add_location(div0, file$6, 215, 1, 3374);
    			attr_dev(div1, "class", "content svelte-nv73ia");
    			add_location(div1, file$6, 235, 1, 3734);
    			attr_dev(div2, "class", "master_d");
    			add_location(div2, file$6, 212, 0, 3326);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, h2);
    			append_dev(div2, t1);
    			append_dev(div2, div0);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div0, null);
    			}

    			append_dev(div0, t2);
    			append_dev(div0, br0);
    			append_dev(div0, t3);
    			append_dev(div0, label);
    			append_dev(label, span);
    			append_dev(label, t5);
    			append_dev(label, br1);
    			append_dev(label, t6);
    			append_dev(label, input);
    			set_input_value(input, /*newMasterFile*/ ctx[1]);
    			append_dev(div0, t7);
    			append_dev(div0, button);
    			append_dev(div2, t9);
    			append_dev(div2, div1);
    			if_block.m(div1, null);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input, "input", /*input_input_handler*/ ctx[12]),
    					listen_dev(button, "click", createMasterFile, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*activeMF, env*/ 5) {
    				each_value_3 = Object.entries(/*env*/ ctx[0].MasterFiles);
    				validate_each_argument(each_value_3);
    				let i;

    				for (i = 0; i < each_value_3.length; i += 1) {
    					const child_ctx = get_each_context_3(ctx, each_value_3, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_3(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div0, t2);
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
    		id: create_fragment$6.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    const apiMasterd = "/api/master.d/";

    function createMasterFile() {
    	
    }

    function deleteMasterFile() {
    	
    }

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

    function instance$6($$self, $$props, $$invalidate) {
    	let env = {
    		NameServers: [],
    		HostsBlocks: [],
    		HostsFiles: [],
    		MasterFiles: {}
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
    			console.log("handleCreateRR: ", res.status, res.statusText);
    			return;
    		}

    		let newRR = await res.json();
    		let listRR = activeMF.Records[newRR.Name];

    		if (typeof listRR === "undefined") {
    			listRR = [];
    		}

    		listRR.push(newRR);
    		$$invalidate(2, activeMF.Records[newRR.Name] = listRR, activeMF);
    		console.log("handleCreateRR:", newRR);
    	}

    	async function handleDeleteRR(rr, idx) {
    		let api = apiMasterd + activeMF.Name + "/rr/" + rr.Type;

    		const res = await fetch(api, {
    			method: "DELETE",
    			headers: { "Content-Type": "application/json" },
    			body: JSON.stringify(rr)
    		});

    		if (res.status >= 400) {
    			console.log("handleCreateRR: ", res.status, res.statusText);
    			return;
    		}

    		let listRR = activeMF.Records[rr.Name];
    		listRR.splice(idx, 1);
    		$$invalidate(2, activeMF.Records[rr.Name] = listRR, activeMF);
    		let resbody = await res.json();
    		console.log("response body:", resbody);
    	}

    	function getTypeName(k) {
    		let v = RRTypes[k];

    		if (v === "") {
    			return k;
    		}

    		return v;
    	}

    	const writable_props = [];

    	Object_1$1.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1$3.warn(`<MasterDir> was created with unknown prop '${key}'`);
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
    		createMasterFile,
    		deleteMasterFile,
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
    		init(this, options, instance$6, create_fragment$6, safe_not_equal, {}, [-1, -1]);

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "MasterDir",
    			options,
    			id: create_fragment$6.name
    		});
    	}
    }

    /* src/App.svelte generated by Svelte v3.24.0 */

    const { console: console_1$4 } = globals;
    const file$7 = "src/App.svelte";

    // (77:1) {:else}
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
    		source: "(77:1) {:else}",
    		ctx
    	});

    	return block;
    }

    // (75:36) 
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
    		source: "(75:36) ",
    		ctx
    	});

    	return block;
    }

    // (73:35) 
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
    		source: "(73:35) ",
    		ctx
    	});

    	return block;
    }

    // (71:1) {#if state === stateHostsBlock}
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
    		source: "(71:1) {#if state === stateHostsBlock}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$7(ctx) {
    	let div;
    	let nav;
    	let a0;
    	let t1;
    	let a1;
    	let t2;
    	let a1_href_value;
    	let t3;
    	let a2;
    	let t4;
    	let a2_href_value;
    	let t5;
    	let a3;
    	let t6;
    	let a3_href_value;
    	let t7;
    	let current_block_type_index;
    	let if_block;
    	let current;
    	let mounted;
    	let dispose;
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
    			div = element("div");
    			nav = element("nav");
    			a0 = element("a");
    			a0.textContent = "rescached";
    			t1 = text("\n\t\t/\n\t\t");
    			a1 = element("a");
    			t2 = text("Hosts blocks");
    			t3 = text("\n\t\t/\n\t\t");
    			a2 = element("a");
    			t4 = text("hosts.d");
    			t5 = text("\n\t\t/\n\t\t");
    			a3 = element("a");
    			t6 = text("master.d");
    			t7 = space();
    			if_block.c();
    			attr_dev(a0, "href", "#home");
    			add_location(a0, file$7, 53, 2, 1080);
    			attr_dev(a1, "href", a1_href_value = "#" + stateHostsBlock);
    			add_location(a1, file$7, 57, 2, 1147);
    			attr_dev(a2, "href", a2_href_value = "#" + stateHostsDir);
    			add_location(a2, file$7, 61, 2, 1243);
    			attr_dev(a3, "href", a3_href_value = "#" + stateMasterDir);
    			add_location(a3, file$7, 65, 2, 1330);
    			attr_dev(nav, "class", "menu svelte-1h1xxlc");
    			add_location(nav, file$7, 52, 1, 1059);
    			attr_dev(div, "class", "main svelte-1h1xxlc");
    			add_location(div, file$7, 51, 0, 1039);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, nav);
    			append_dev(nav, a0);
    			append_dev(nav, t1);
    			append_dev(nav, a1);
    			append_dev(a1, t2);
    			append_dev(nav, t3);
    			append_dev(nav, a2);
    			append_dev(a2, t4);
    			append_dev(nav, t5);
    			append_dev(nav, a3);
    			append_dev(a3, t6);
    			append_dev(div, t7);
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
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if_blocks[current_block_type_index].d();
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

    const stateHostsBlock = "hosts_block";
    const stateHostsDir = "hosts_d";
    const stateMasterDir = "master_d";

    function instance$7($$self, $$props, $$invalidate) {
    	let state;

    	let env = {
    		NameServers: [],
    		HostsBlocks: [],
    		HostsFiles: []
    	};

    	onMount(async () => {
    		const res = await fetch(apiEnvironment);

    		if (res.status >= 400) {
    			console.log("onMount: ", res.status, res.statusText);
    			return;
    		}

    		setEnvironment(await res.json());
    		$$invalidate(0, state = window.location.hash.slice(1));
    		console.log("state:", state);
    	});

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1$4.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("App", $$slots, []);
    	const click_handler = () => $$invalidate(0, state = "");
    	const click_handler_1 = () => $$invalidate(0, state = stateHostsBlock);
    	const click_handler_2 = () => $$invalidate(0, state = stateHostsDir);
    	const click_handler_3 = () => $$invalidate(0, state = stateMasterDir);

    	$$self.$capture_state = () => ({
    		onMount,
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
    		init(this, options, instance$7, create_fragment$7, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$7.name
    		});
    	}
    }

    const app = new App({
    	target: document.body,
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
