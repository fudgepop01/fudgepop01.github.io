
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
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_style(node, key, value, important) {
        node.style.setProperty(key, value, important ? 'important' : '');
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
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.23.2' }, detail)));
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

    /* src\components\ko-fi.svelte generated by Svelte v3.23.2 */

    const file = "src\\components\\ko-fi.svelte";

    function create_fragment(ctx) {
    	let a;
    	let span;
    	let img;
    	let img_src_value;
    	let t;
    	let a_href_value;

    	const block = {
    		c: function create() {
    			a = element("a");
    			span = element("span");
    			img = element("img");
    			t = text("\r\n    Support Me on Ko-fi");
    			if (img.src !== (img_src_value = "https://storage.ko-fi.com/cdn/cup-border.png")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "class", "kofiimg svelte-87w9x7");
    			attr_dev(img, "alt", "kofi");
    			add_location(img, file, 14, 4, 376);
    			attr_dev(span, "class", "kofitext svelte-87w9x7");
    			set_style(span, "color", /*color*/ ctx[2], 1);
    			add_location(span, file, 13, 2, 314);
    			attr_dev(a, "title", "Support me on ko-fi.com");
    			attr_dev(a, "class", "kofi-button svelte-87w9x7");
    			set_style(a, "background-color", /*background*/ ctx[1]);
    			set_style(a, "box-shadow", "0 0 1px black");
    			attr_dev(a, "target", "_blank");
    			attr_dev(a, "href", a_href_value = "https://ko-fi.com/" + /*user*/ ctx[0]);
    			add_location(a, file, 7, 0, 126);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, a, anchor);
    			append_dev(a, span);
    			append_dev(span, img);
    			append_dev(span, t);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*color*/ 4) {
    				set_style(span, "color", /*color*/ ctx[2], 1);
    			}

    			if (dirty & /*background*/ 2) {
    				set_style(a, "background-color", /*background*/ ctx[1]);
    			}

    			if (dirty & /*user*/ 1 && a_href_value !== (a_href_value = "https://ko-fi.com/" + /*user*/ ctx[0])) {
    				attr_dev(a, "href", a_href_value);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(a);
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
    	let { user } = $$props;
    	let { background = "#29abe0" } = $$props;
    	let { color = "#fff" } = $$props;
    	const writable_props = ["user", "background", "color"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Ko_fi> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Ko_fi", $$slots, []);

    	$$self.$set = $$props => {
    		if ("user" in $$props) $$invalidate(0, user = $$props.user);
    		if ("background" in $$props) $$invalidate(1, background = $$props.background);
    		if ("color" in $$props) $$invalidate(2, color = $$props.color);
    	};

    	$$self.$capture_state = () => ({ user, background, color });

    	$$self.$inject_state = $$props => {
    		if ("user" in $$props) $$invalidate(0, user = $$props.user);
    		if ("background" in $$props) $$invalidate(1, background = $$props.background);
    		if ("color" in $$props) $$invalidate(2, color = $$props.color);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [user, background, color];
    }

    class Ko_fi extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, { user: 0, background: 1, color: 2 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Ko_fi",
    			options,
    			id: create_fragment.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*user*/ ctx[0] === undefined && !("user" in props)) {
    			console.warn("<Ko_fi> was created without expected prop 'user'");
    		}
    	}

    	get user() {
    		throw new Error("<Ko_fi>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set user(value) {
    		throw new Error("<Ko_fi>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get background() {
    		throw new Error("<Ko_fi>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set background(value) {
    		throw new Error("<Ko_fi>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get color() {
    		throw new Error("<Ko_fi>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set color(value) {
    		throw new Error("<Ko_fi>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\App.svelte generated by Svelte v3.23.2 */

    const { window: window_1 } = globals;
    const file$1 = "src\\App.svelte";

    // (45:1) {:else}
    function create_else_block(ctx) {
    	let div0;
    	let a;
    	let t;
    	let div2;
    	let div1;
    	let img;
    	let img_src_value;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div0 = element("div");
    			a = element("a");
    			t = space();
    			div2 = element("div");
    			div1 = element("div");
    			img = element("img");
    			attr_dev(a, "class", "uk-navbar-toggle");
    			attr_dev(a, "uk-toggle", "");
    			attr_dev(a, "uk-navbar-toggle-icon", "");
    			attr_dev(a, "href", "#offcanvas");
    			add_location(a, file$1, 47, 3, 1278);
    			attr_dev(div0, "class", "uk-navbar-left");
    			add_location(div0, file$1, 45, 2, 1199);
    			attr_dev(img, "class", "logo svelte-1mg5db6");
    			if (img.src !== (img_src_value = "./images/icon.png")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "amiibox logo");
    			attr_dev(img, "uk-img", "");
    			add_location(img, file$1, 51, 4, 1471);
    			attr_dev(div1, "class", "uk-navbar-item uk-logo");
    			add_location(div1, file$1, 50, 3, 1430);
    			attr_dev(div2, "class", "uk-navbar-center");
    			add_location(div2, file$1, 49, 2, 1396);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div0, anchor);
    			append_dev(div0, a);
    			insert_dev(target, t, anchor);
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div1);
    			append_dev(div1, img);

    			if (!mounted) {
    				dispose = listen_dev(a, "click", /*toggleDrawer*/ ctx[3], false, false, false);
    				mounted = true;
    			}
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div0);
    			if (detaching) detach_dev(t);
    			if (detaching) detach_dev(div2);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(45:1) {:else}",
    		ctx
    	});

    	return block;
    }

    // (19:1) {#if innerWidth > 900}
    function create_if_block_1(ctx) {
    	let div0;
    	let ul0;
    	let li0;
    	let a0;
    	let t1;
    	let div4;
    	let div1;
    	let ul1;
    	let li1;
    	let a1;
    	let t3;
    	let div2;
    	let img;
    	let img_src_value;
    	let t4;
    	let div3;
    	let ul2;
    	let li2;
    	let a2;
    	let t5;
    	let sup;
    	let t7;
    	let t8;
    	let div5;
    	let ul3;
    	let li3;
    	let a3;
    	let kofi;
    	let current;

    	kofi = new Ko_fi({
    			props: {
    				user: "fudgepop01",
    				background: "transparent",
    				color: "black"
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			div0 = element("div");
    			ul0 = element("ul");
    			li0 = element("li");
    			a0 = element("a");
    			a0.textContent = "github repo";
    			t1 = space();
    			div4 = element("div");
    			div1 = element("div");
    			ul1 = element("ul");
    			li1 = element("li");
    			a1 = element("a");
    			a1.textContent = "tournament edition";
    			t3 = space();
    			div2 = element("div");
    			img = element("img");
    			t4 = space();
    			div3 = element("div");
    			ul2 = element("ul");
    			li2 = element("li");
    			a2 = element("a");
    			t5 = text("[coming soon");
    			sup = element("sup");
    			sup.textContent = "tm";
    			t7 = text("]");
    			t8 = space();
    			div5 = element("div");
    			ul3 = element("ul");
    			li3 = element("li");
    			a3 = element("a");
    			create_component(kofi.$$.fragment);
    			attr_dev(a0, "href", "https://github.com/fudgepop01/amiibox");
    			add_location(a0, file$1, 21, 8, 415);
    			add_location(li0, file$1, 21, 4, 411);
    			attr_dev(ul0, "class", "uk-navbar-nav");
    			add_location(ul0, file$1, 20, 3, 380);
    			attr_dev(div0, "class", "uk-navbar-left");
    			add_location(div0, file$1, 19, 2, 348);
    			attr_dev(a1, "href", "##");
    			add_location(a1, file$1, 27, 27, 632);
    			attr_dev(li1, "class", "uk-active");
    			add_location(li1, file$1, 27, 5, 610);
    			attr_dev(ul1, "class", "uk-navbar-nav");
    			add_location(ul1, file$1, 26, 4, 578);
    			attr_dev(div1, "class", "uk-navbar-center-left");
    			add_location(div1, file$1, 25, 3, 538);
    			attr_dev(img, "class", "logo svelte-1mg5db6");
    			if (img.src !== (img_src_value = "./images/icon.png")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "amiibox logo");
    			attr_dev(img, "uk-img", "");
    			add_location(img, file$1, 31, 4, 737);
    			attr_dev(div2, "class", "uk-navbar-item uk-logo");
    			add_location(div2, file$1, 30, 3, 696);
    			add_location(sup, file$1, 35, 37, 925);
    			attr_dev(a2, "href", "#none");
    			add_location(a2, file$1, 35, 9, 897);
    			add_location(li2, file$1, 35, 5, 893);
    			attr_dev(ul2, "class", "uk-navbar-nav");
    			add_location(ul2, file$1, 34, 4, 861);
    			attr_dev(div3, "class", "uk-navbar-center-right");
    			add_location(div3, file$1, 33, 3, 820);
    			attr_dev(div4, "class", "uk-navbar-center");
    			add_location(div4, file$1, 24, 2, 504);
    			attr_dev(a3, "href", "https://github.com/fudgepop01/amiibox");
    			add_location(a3, file$1, 41, 8, 1048);
    			add_location(li3, file$1, 41, 4, 1044);
    			attr_dev(ul3, "class", "uk-navbar-nav");
    			add_location(ul3, file$1, 40, 3, 1013);
    			attr_dev(div5, "class", "uk-navbar-right");
    			add_location(div5, file$1, 39, 2, 980);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div0, anchor);
    			append_dev(div0, ul0);
    			append_dev(ul0, li0);
    			append_dev(li0, a0);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, div4, anchor);
    			append_dev(div4, div1);
    			append_dev(div1, ul1);
    			append_dev(ul1, li1);
    			append_dev(li1, a1);
    			append_dev(div4, t3);
    			append_dev(div4, div2);
    			append_dev(div2, img);
    			append_dev(div4, t4);
    			append_dev(div4, div3);
    			append_dev(div3, ul2);
    			append_dev(ul2, li2);
    			append_dev(li2, a2);
    			append_dev(a2, t5);
    			append_dev(a2, sup);
    			append_dev(a2, t7);
    			insert_dev(target, t8, anchor);
    			insert_dev(target, div5, anchor);
    			append_dev(div5, ul3);
    			append_dev(ul3, li3);
    			append_dev(li3, a3);
    			mount_component(kofi, a3, null);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(kofi.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(kofi.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div0);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(div4);
    			if (detaching) detach_dev(t8);
    			if (detaching) detach_dev(div5);
    			destroy_component(kofi);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(19:1) {#if innerWidth > 900}",
    		ctx
    	});

    	return block;
    }

    // (58:0) {#if innerWidth < 900}
    function create_if_block(ctx) {
    	let div1;
    	let div0;
    	let button;
    	let t0;
    	let ul;
    	let li0;
    	let a0;
    	let t2;
    	let li1;
    	let a1;
    	let t3;
    	let sup;
    	let t5;
    	let t6;
    	let li2;
    	let t7;
    	let li3;
    	let t9;
    	let li4;
    	let a2;
    	let span0;
    	let t10;
    	let t11;
    	let li5;
    	let a3;
    	let span1;
    	let t12;
    	let t13;
    	let li6;
    	let t14;
    	let li7;
    	let t16;
    	let li8;
    	let kofi;
    	let current;

    	kofi = new Ko_fi({
    			props: { user: "fudgepop01" },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");
    			button = element("button");
    			t0 = space();
    			ul = element("ul");
    			li0 = element("li");
    			a0 = element("a");
    			a0.textContent = "tournament edition";
    			t2 = space();
    			li1 = element("li");
    			a1 = element("a");
    			t3 = text("(full version coming soon");
    			sup = element("sup");
    			sup.textContent = "TM";
    			t5 = text(")");
    			t6 = space();
    			li2 = element("li");
    			t7 = space();
    			li3 = element("li");
    			li3.textContent = "External Links";
    			t9 = space();
    			li4 = element("li");
    			a2 = element("a");
    			span0 = element("span");
    			t10 = text(" twitter");
    			t11 = space();
    			li5 = element("li");
    			a3 = element("a");
    			span1 = element("span");
    			t12 = text(" github");
    			t13 = space();
    			li6 = element("li");
    			t14 = space();
    			li7 = element("li");
    			li7.textContent = "Donate";
    			t16 = space();
    			li8 = element("li");
    			create_component(kofi.$$.fragment);
    			attr_dev(button, "class", "uk-offcanvas-close");
    			attr_dev(button, "type", "button");
    			attr_dev(button, "uk-close", "");
    			add_location(button, file$1, 60, 4, 1721);
    			attr_dev(a0, "href", "##");
    			add_location(a0, file$1, 63, 33, 1901);
    			attr_dev(li0, "class", "uk-active item");
    			add_location(li0, file$1, 63, 6, 1874);
    			add_location(sup, file$1, 64, 61, 2003);
    			attr_dev(a1, "href", "##");
    			add_location(a1, file$1, 64, 23, 1965);
    			attr_dev(li1, "class", "item");
    			add_location(li1, file$1, 64, 6, 1948);
    			attr_dev(li2, "class", "uk-nav-divider");
    			add_location(li2, file$1, 65, 6, 2033);
    			attr_dev(li3, "class", "uk-nav-header");
    			add_location(li3, file$1, 66, 6, 2072);
    			attr_dev(span0, "uk-icon", "icon: twitter");
    			add_location(span0, file$1, 67, 55, 2173);
    			attr_dev(a2, "href", "https://www.twitter.com/fudgepop01");
    			add_location(a2, file$1, 67, 10, 2128);
    			add_location(li4, file$1, 67, 6, 2124);
    			attr_dev(span1, "uk-icon", "icon: github");
    			add_location(span1, file$1, 68, 50, 2278);
    			attr_dev(a3, "href", "https://github.com/fudgepop01");
    			add_location(a3, file$1, 68, 10, 2238);
    			add_location(li5, file$1, 68, 6, 2234);
    			attr_dev(li6, "class", "uk-nav-divider");
    			add_location(li6, file$1, 69, 6, 2337);
    			attr_dev(li7, "class", "uk-nav-header");
    			add_location(li7, file$1, 70, 6, 2376);
    			attr_dev(li8, "class", "item");
    			add_location(li8, file$1, 71, 6, 2420);
    			attr_dev(ul, "class", "uk-nav uk-nav-primary uk-nav-center uk-margin-auto-vertical");
    			add_location(ul, file$1, 62, 5, 1795);
    			attr_dev(div0, "class", "uk-offcanvas-bar uk-flex uk-flex-column");
    			add_location(div0, file$1, 59, 2, 1663);
    			attr_dev(div1, "id", "offcanvas");
    			attr_dev(div1, "uk-offcanvas", "overlay: true; mode: push");
    			add_location(div1, file$1, 58, 1, 1599);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			append_dev(div0, button);
    			append_dev(div0, t0);
    			append_dev(div0, ul);
    			append_dev(ul, li0);
    			append_dev(li0, a0);
    			append_dev(ul, t2);
    			append_dev(ul, li1);
    			append_dev(li1, a1);
    			append_dev(a1, t3);
    			append_dev(a1, sup);
    			append_dev(a1, t5);
    			append_dev(ul, t6);
    			append_dev(ul, li2);
    			append_dev(ul, t7);
    			append_dev(ul, li3);
    			append_dev(ul, t9);
    			append_dev(ul, li4);
    			append_dev(li4, a2);
    			append_dev(a2, span0);
    			append_dev(a2, t10);
    			append_dev(ul, t11);
    			append_dev(ul, li5);
    			append_dev(li5, a3);
    			append_dev(a3, span1);
    			append_dev(a3, t12);
    			append_dev(ul, t13);
    			append_dev(ul, li6);
    			append_dev(ul, t14);
    			append_dev(ul, li7);
    			append_dev(ul, t16);
    			append_dev(ul, li8);
    			mount_component(kofi, li8, null);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(kofi.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(kofi.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			destroy_component(kofi);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(58:0) {#if innerWidth < 900}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let nav;
    	let current_block_type_index;
    	let if_block0;
    	let t0;
    	let t1;
    	let div1;
    	let h10;
    	let t2;
    	let h10_class_value;
    	let t3;
    	let div0;
    	let button0;
    	let t5;
    	let button1;
    	let div0_class_value;
    	let t7;
    	let main;
    	let div4;
    	let div3;
    	let h11;
    	let t9;
    	let div2;
    	let p0;
    	let t10;
    	let a0;
    	let t12;
    	let t13;
    	let p1;
    	let t15;
    	let p2;
    	let t17;
    	let p3;
    	let t19;
    	let div7;
    	let div6;
    	let h12;
    	let t21;
    	let div5;
    	let p4;
    	let t23;
    	let p5;
    	let t25;
    	let ul2;
    	let li0;
    	let t27;
    	let li1;
    	let t29;
    	let li2;
    	let t31;
    	let li5;
    	let t32;
    	let ul0;
    	let li3;
    	let t34;
    	let li4;
    	let t35;
    	let li6;
    	let t37;
    	let li8;
    	let b;
    	let t39;
    	let ul1;
    	let li7;
    	let t41;
    	let p6;
    	let t43;
    	let footer;
    	let t44;
    	let span;
    	let t45;
    	let a1;
    	let t47;
    	let div8;
    	let kofi;
    	let current;
    	let mounted;
    	let dispose;
    	add_render_callback(/*onwindowresize*/ ctx[4]);
    	const if_block_creators = [create_if_block_1, create_else_block];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*innerWidth*/ ctx[0] > 900) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block0 = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    	let if_block1 = /*innerWidth*/ ctx[0] < 900 && create_if_block(ctx);

    	kofi = new Ko_fi({
    			props: { user: "fudgepop01" },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			nav = element("nav");
    			if_block0.c();
    			t0 = space();
    			if (if_block1) if_block1.c();
    			t1 = space();
    			div1 = element("div");
    			h10 = element("h1");
    			t2 = text("-\\Tournamiibox/-");
    			t3 = space();
    			div0 = element("div");
    			button0 = element("button");
    			button0.textContent = "get tournamiibox";
    			t5 = space();
    			button1 = element("button");
    			button1.textContent = "get amiibo validator";
    			t7 = space();
    			main = element("main");
    			div4 = element("div");
    			div3 = element("div");
    			h11 = element("h1");
    			h11.textContent = "Open, Tournament-Legal Amiibo Tools for Everyone";
    			t9 = space();
    			div2 = element("div");
    			p0 = element("p");
    			t10 = text("Amiibox is an amiibo modding tool developed by\n\t\t\t\t\t");
    			a0 = element("a");
    			a0.textContent = "fudgepop01";
    			t12 = text("\n\t\t\t\t\tfor the purpose of experimentation, exploration, and convenience.\n\t\t\t\t\tIt allows you to take an amiibo bin file, modify its properties, and save\n\t\t\t\t\tit. Think powersaves - but fully customizable and absolutely free!");
    			t13 = space();
    			p1 = element("p");
    			p1.textContent = "The version on this page is a version of amiibox tailored to keeping\n\t\t\t\t\tthings \"tournament legal.\" Unlike the full version, the nickname\n\t\t\t\t\tand marker bit stay completely unmodified. This means you're able to\n\t\t\t\t\texperiment and acquire spirit abilities guilt-free.";
    			t15 = space();
    			p2 = element("p");
    			p2.textContent = "You can also modify the attack and defense values up to a total\n\t\t\t\t\tof 5000 points. This is the natural limit in-game, so it's the natural\n\t\t\t\t\tlimit here too. You are expected to stay within the limits of whatever\n\t\t\t\t\ttournament you enter, however. You can also adjust the \"gift\" value,\n\t\t\t\t\tallowing you to farm amiibo gifts if that's what you really want to do.";
    			t17 = space();
    			p3 = element("p");
    			p3.textContent = "One thing folks will be most excited about is the ability to\n\t\t\t\t\tadjust the amiibo's level. Training an amiibo to level 50 can take time-\n\t\t\t\t\ttime that many don't have as they grow older. It's also annoying when an\n\t\t\t\t\tamiibo has AI that you like that you wish to keep, but are forced to risk\n\t\t\t\t\tgetting rid of it for the sake of leveling it up so it's not at a severe\n\t\t\t\t\tdisadvantage in tournaments. Now you can circumvent that whole ordeal!";
    			t19 = space();
    			div7 = element("div");
    			div6 = element("div");
    			h12 = element("h1");
    			h12.textContent = "An Amiibo Bin Validator";
    			t21 = space();
    			div5 = element("div");
    			p4 = element("p");
    			p4.textContent = "the LAST thing I wanted to do with the release of powerful amiibo modding\n\t\t\t\t\ttools like this is disrupt any existing communities built around training\n\t\t\t\t\tamiibo by hand. To ensure this doesn't happen, I have also created a tool\n\t\t\t\t\tthat lets TOs validate a collection of amiibo bins in an instant. This\n\t\t\t\t\twill eventually be made into a part of this site, but for now it's a\n\t\t\t\t\tstandalone program.";
    			t23 = space();
    			p5 = element("p");
    			p5.textContent = "This program can be configured in a number of ways. through a text file\n\t\t\t\t\tcalled \"rules.txt\" --\n\t\t\t\t\tThe options include:";
    			t25 = space();
    			ul2 = element("ul");
    			li0 = element("li");
    			li0.textContent = "auto sort";
    			t27 = space();
    			li1 = element("li");
    			li1.textContent = "output file";
    			t29 = space();
    			li2 = element("li");
    			li2.textContent = "ban amiibox (full)";
    			t31 = space();
    			li5 = element("li");
    			t32 = text("limit stat modification\n\t\t\t\t\t\t");
    			ul0 = element("ul");
    			li3 = element("li");
    			li3.textContent = "can also get more specitic";
    			t34 = space();
    			li4 = element("li");
    			t35 = space();
    			li6 = element("li");
    			li6.textContent = "ban typing (attack, defense, grab)";
    			t37 = space();
    			li8 = element("li");
    			b = element("b");
    			b.textContent = "ban spirit abilites";
    			t39 = space();
    			ul1 = element("ul");
    			li7 = element("li");
    			li7.textContent = "can specify which abilities to \"include\" or \"exclude\"";
    			t41 = space();
    			p6 = element("p");
    			p6.textContent = "I look forward to seeing all the possibilities now that there's a quick way\n\t\t\t\t\tto validate bins according to a ruleset!~";
    			t43 = space();
    			footer = element("footer");
    			t44 = text("made with ");
    			span = element("span");
    			t45 = text(" by ");
    			a1 = element("a");
    			a1.textContent = "fudgepop01";
    			t47 = space();
    			div8 = element("div");
    			create_component(kofi.$$.fragment);
    			attr_dev(nav, "class", "uk-navbar-container");
    			attr_dev(nav, "uk-navbar", "");
    			attr_dev(nav, "uk-sticky", "");
    			add_location(nav, file$1, 17, 0, 268);
    			attr_dev(h10, "class", h10_class_value = /*innerWidth*/ ctx[0] > 500 ? "uk-heading-large" : "");
    			add_location(h10, file$1, 78, 1, 2601);
    			attr_dev(button0, "class", "uk-button uk-button-primary uk-width-1-2");
    			add_location(button0, file$1, 80, 2, 2768);
    			attr_dev(button1, "class", "uk-button uk-button-secondary uk-width-1-2");
    			add_location(button1, file$1, 81, 2, 2915);
    			attr_dev(div0, "class", div0_class_value = "uk-button-group " + (/*innerWidth*/ ctx[0] > 500 ? "uk-padding" : "") + " uk-width-xlarge");
    			add_location(div0, file$1, 79, 1, 2681);
    			attr_dev(div1, "class", "uk-height-medium uk-width-1-1 uk-flex uk-flex-column uk-flex-middle uk-flex-center");
    			add_location(div1, file$1, 77, 0, 2503);
    			attr_dev(h11, "class", "uk-heading-divider");
    			add_location(h11, file$1, 88, 3, 3193);
    			attr_dev(a0, "href", "https://twitter.com/fudgepop01");
    			add_location(a0, file$1, 94, 5, 3361);
    			add_location(p0, file$1, 92, 4, 3300);
    			add_location(p1, file$1, 99, 4, 3652);
    			add_location(p2, file$1, 105, 4, 3944);
    			add_location(p3, file$1, 112, 4, 4333);
    			add_location(div2, file$1, 91, 3, 3290);
    			attr_dev(div3, "class", "uk-container");
    			add_location(div3, file$1, 87, 2, 3163);
    			attr_dev(div4, "class", "uk-section uk-section-default uk-align-center uk-padding-remove");
    			add_location(div4, file$1, 86, 1, 3083);
    			attr_dev(h12, "class", "uk-heading-divider");
    			add_location(h12, file$1, 126, 3, 4940);
    			add_location(p4, file$1, 130, 4, 5022);
    			add_location(p5, file$1, 138, 4, 5451);
    			add_location(li0, file$1, 144, 5, 5656);
    			add_location(li1, file$1, 145, 5, 5680);
    			add_location(li2, file$1, 146, 5, 5706);
    			add_location(li3, file$1, 150, 7, 5840);
    			add_location(li4, file$1, 151, 7, 5883);
    			attr_dev(ul0, "class", "uk-list uk-list-circle uk-list-collapse");
    			add_location(ul0, file$1, 149, 6, 5780);
    			add_location(li5, file$1, 147, 5, 5739);
    			add_location(li6, file$1, 154, 5, 5921);
    			add_location(b, file$1, 156, 6, 5981);
    			add_location(li7, file$1, 158, 7, 6074);
    			attr_dev(ul1, "class", "uk-list uk-list-circle uk-list-collapse");
    			add_location(ul1, file$1, 157, 6, 6014);
    			add_location(li8, file$1, 155, 5, 5970);
    			attr_dev(ul2, "class", "uk-list uk-list-bullet uk-list-collapse");
    			add_location(ul2, file$1, 143, 4, 5598);
    			add_location(p6, file$1, 162, 4, 6174);
    			add_location(div5, file$1, 129, 3, 5012);
    			attr_dev(div6, "class", "uk-container");
    			add_location(div6, file$1, 125, 2, 4910);
    			attr_dev(div7, "class", "uk-section uk-section-default uk-align-center uk-padding-remove");
    			add_location(div7, file$1, 124, 1, 4830);
    			attr_dev(main, "class", "svelte-1mg5db6");
    			add_location(main, file$1, 85, 0, 3075);
    			attr_dev(span, "uk-icon", "icon: heart");
    			add_location(span, file$1, 172, 11, 6441);
    			attr_dev(a1, "href", "https://twitter.com/fudgepop01");
    			add_location(a1, file$1, 172, 50, 6480);
    			attr_dev(div8, "class", "uk-padding-small");
    			add_location(div8, file$1, 173, 1, 6537);
    			attr_dev(footer, "class", "uk-height-small uk-text-large uk-text-center uk-padding-small svelte-1mg5db6");
    			add_location(footer, file$1, 171, 0, 6351);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, nav, anchor);
    			if_blocks[current_block_type_index].m(nav, null);
    			insert_dev(target, t0, anchor);
    			if (if_block1) if_block1.m(target, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, div1, anchor);
    			append_dev(div1, h10);
    			append_dev(h10, t2);
    			append_dev(div1, t3);
    			append_dev(div1, div0);
    			append_dev(div0, button0);
    			append_dev(div0, t5);
    			append_dev(div0, button1);
    			insert_dev(target, t7, anchor);
    			insert_dev(target, main, anchor);
    			append_dev(main, div4);
    			append_dev(div4, div3);
    			append_dev(div3, h11);
    			append_dev(div3, t9);
    			append_dev(div3, div2);
    			append_dev(div2, p0);
    			append_dev(p0, t10);
    			append_dev(p0, a0);
    			append_dev(p0, t12);
    			append_dev(div2, t13);
    			append_dev(div2, p1);
    			append_dev(div2, t15);
    			append_dev(div2, p2);
    			append_dev(div2, t17);
    			append_dev(div2, p3);
    			append_dev(main, t19);
    			append_dev(main, div7);
    			append_dev(div7, div6);
    			append_dev(div6, h12);
    			append_dev(div6, t21);
    			append_dev(div6, div5);
    			append_dev(div5, p4);
    			append_dev(div5, t23);
    			append_dev(div5, p5);
    			append_dev(div5, t25);
    			append_dev(div5, ul2);
    			append_dev(ul2, li0);
    			append_dev(ul2, t27);
    			append_dev(ul2, li1);
    			append_dev(ul2, t29);
    			append_dev(ul2, li2);
    			append_dev(ul2, t31);
    			append_dev(ul2, li5);
    			append_dev(li5, t32);
    			append_dev(li5, ul0);
    			append_dev(ul0, li3);
    			append_dev(ul0, t34);
    			append_dev(ul0, li4);
    			append_dev(ul2, t35);
    			append_dev(ul2, li6);
    			append_dev(ul2, t37);
    			append_dev(ul2, li8);
    			append_dev(li8, b);
    			append_dev(li8, t39);
    			append_dev(li8, ul1);
    			append_dev(ul1, li7);
    			append_dev(div5, t41);
    			append_dev(div5, p6);
    			insert_dev(target, t43, anchor);
    			insert_dev(target, footer, anchor);
    			append_dev(footer, t44);
    			append_dev(footer, span);
    			append_dev(footer, t45);
    			append_dev(footer, a1);
    			append_dev(footer, t47);
    			append_dev(footer, div8);
    			mount_component(kofi, div8, null);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(window_1, "resize", /*onwindowresize*/ ctx[4]),
    					listen_dev(button0, "click", /*click_handler*/ ctx[5], false, false, false),
    					listen_dev(button1, "click", /*click_handler_1*/ ctx[6], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
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
    				if_block0 = if_blocks[current_block_type_index];

    				if (!if_block0) {
    					if_block0 = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block0.c();
    				}

    				transition_in(if_block0, 1);
    				if_block0.m(nav, null);
    			}

    			if (/*innerWidth*/ ctx[0] < 900) {
    				if (if_block1) {
    					if (dirty & /*innerWidth*/ 1) {
    						transition_in(if_block1, 1);
    					}
    				} else {
    					if_block1 = create_if_block(ctx);
    					if_block1.c();
    					transition_in(if_block1, 1);
    					if_block1.m(t1.parentNode, t1);
    				}
    			} else if (if_block1) {
    				group_outros();

    				transition_out(if_block1, 1, 1, () => {
    					if_block1 = null;
    				});

    				check_outros();
    			}

    			if (!current || dirty & /*innerWidth*/ 1 && h10_class_value !== (h10_class_value = /*innerWidth*/ ctx[0] > 500 ? "uk-heading-large" : "")) {
    				attr_dev(h10, "class", h10_class_value);
    			}

    			if (!current || dirty & /*innerWidth*/ 1 && div0_class_value !== (div0_class_value = "uk-button-group " + (/*innerWidth*/ ctx[0] > 500 ? "uk-padding" : "") + " uk-width-xlarge")) {
    				attr_dev(div0, "class", div0_class_value);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block0);
    			transition_in(if_block1);
    			transition_in(kofi.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block0);
    			transition_out(if_block1);
    			transition_out(kofi.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(nav);
    			if_blocks[current_block_type_index].d();
    			if (detaching) detach_dev(t0);
    			if (if_block1) if_block1.d(detaching);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(div1);
    			if (detaching) detach_dev(t7);
    			if (detaching) detach_dev(main);
    			if (detaching) detach_dev(t43);
    			if (detaching) detach_dev(footer);
    			destroy_component(kofi);
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
    	let innerWidth;
    	let innerHeight;

    	const openLink = url => {
    		window.open(url);
    	};

    	const toggleDrawer = () => {
    		
    	};

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("App", $$slots, []);

    	function onwindowresize() {
    		$$invalidate(0, innerWidth = window_1.innerWidth);
    		$$invalidate(1, innerHeight = window_1.innerHeight);
    	}

    	const click_handler = () => openLink("./downloads/tournament_legal.zip");
    	const click_handler_1 = () => openLink("./downloads/Validator.zip");

    	$$self.$capture_state = () => ({
    		KoFi: Ko_fi,
    		innerWidth,
    		innerHeight,
    		openLink,
    		toggleDrawer
    	});

    	$$self.$inject_state = $$props => {
    		if ("innerWidth" in $$props) $$invalidate(0, innerWidth = $$props.innerWidth);
    		if ("innerHeight" in $$props) $$invalidate(1, innerHeight = $$props.innerHeight);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		innerWidth,
    		innerHeight,
    		openLink,
    		toggleDrawer,
    		onwindowresize,
    		click_handler,
    		click_handler_1
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    const app = new App({
    	target: document.body,
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
