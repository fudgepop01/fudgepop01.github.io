
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
    const file$1 = "src\\App.svelte";

    function create_fragment$1(ctx) {
    	let nav;
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
    	let kofi0;
    	let t9;
    	let div7;
    	let h10;
    	let t11;
    	let div6;
    	let button0;
    	let t13;
    	let button1;
    	let t15;
    	let main;
    	let div10;
    	let div9;
    	let h11;
    	let t17;
    	let div8;
    	let p0;
    	let t18;
    	let a4;
    	let t20;
    	let t21;
    	let p1;
    	let t23;
    	let p2;
    	let t25;
    	let p3;
    	let t27;
    	let div13;
    	let div12;
    	let h12;
    	let t29;
    	let div11;
    	let p4;
    	let t31;
    	let p5;
    	let t33;
    	let ul6;
    	let li4;
    	let t35;
    	let li5;
    	let t37;
    	let li6;
    	let t39;
    	let li9;
    	let t40;
    	let ul4;
    	let li7;
    	let t42;
    	let li8;
    	let t43;
    	let li10;
    	let t45;
    	let li12;
    	let b;
    	let t47;
    	let ul5;
    	let li11;
    	let t49;
    	let p6;
    	let t51;
    	let footer;
    	let t52;
    	let span;
    	let t53;
    	let a5;
    	let t55;
    	let div14;
    	let kofi1;
    	let current;
    	let mounted;
    	let dispose;

    	kofi0 = new Ko_fi({
    			props: {
    				user: "fudgepop01",
    				background: "transparent",
    				color: "black"
    			},
    			$$inline: true
    		});

    	kofi1 = new Ko_fi({
    			props: { user: "fudgepop01" },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			nav = element("nav");
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
    			create_component(kofi0.$$.fragment);
    			t9 = space();
    			div7 = element("div");
    			h10 = element("h1");
    			h10.textContent = "-\\Tournamiibox/-";
    			t11 = space();
    			div6 = element("div");
    			button0 = element("button");
    			button0.textContent = "download tournamiibox";
    			t13 = space();
    			button1 = element("button");
    			button1.textContent = "download amiibo validator";
    			t15 = space();
    			main = element("main");
    			div10 = element("div");
    			div9 = element("div");
    			h11 = element("h1");
    			h11.textContent = "Accessible, Tournament-Legal Amiibo Tools for Everyone";
    			t17 = space();
    			div8 = element("div");
    			p0 = element("p");
    			t18 = text("Amiibox is an amiibo modding tool developed by\n\t\t\t\t\t");
    			a4 = element("a");
    			a4.textContent = "fudgepop01";
    			t20 = text("\n\t\t\t\t\tfor the purpose of experimentation, exploration, and convenience.\n\t\t\t\t\tIt allows you to take an amiibo bin file, modify its properties, and save\n\t\t\t\t\tit. Think powersaves - but fully customizable and absolutely free!");
    			t21 = space();
    			p1 = element("p");
    			p1.textContent = "The version on this page is a version of amiibox tailored to keeping\n\t\t\t\t\tthings \"tournament legal.\" Unlike the full version, the nickname\n\t\t\t\t\tand marker bit stay completely unmodified. This means you're able to\n\t\t\t\t\texperiment and acquire spirit abilities guilt-free.";
    			t23 = space();
    			p2 = element("p");
    			p2.textContent = "You can also modify the attack and defense values up to a total\n\t\t\t\t\tof 5000 points. This is the natural limit in-game, so it's the natural\n\t\t\t\t\tlimit here too. You are expected to stay within the limits of whatever\n\t\t\t\t\ttournament you enter, however. You can also adjust the \"gift\" value,\n\t\t\t\t\tallowing you to farm amiibo gifts if that's what you really want to do.";
    			t25 = space();
    			p3 = element("p");
    			p3.textContent = "One thing folks will be most excited about is the ability to\n\t\t\t\t\tadjust the amiibo's level. Training an amiibo to level 50 can take time-\n\t\t\t\t\ttime that many don't have as they grow older. It's also annoying when an\n\t\t\t\t\tamiibo has AI that you like that you wish to keep, but are forced to risk\n\t\t\t\t\tgetting rid of it for the sake of leveling it up so it's not at a severe\n\t\t\t\t\tdisadvantage in tournaments. Now you can circumvent that whole ordeal!";
    			t27 = space();
    			div13 = element("div");
    			div12 = element("div");
    			h12 = element("h1");
    			h12.textContent = "An Amiibo Bin Validator";
    			t29 = space();
    			div11 = element("div");
    			p4 = element("p");
    			p4.textContent = "the LAST thing I wanted to do with the release of powerful amiibo modding\n\t\t\t\t\ttools like this is disrupt any existing communities built around training\n\t\t\t\t\tamiibo by hand. To ensure this doesn't happen, I have also created a tool\n\t\t\t\t\tthat lets TOs validate a collection of amiibo bins in an instant. This\n\t\t\t\t\twill eventually be made into a part of this site, but for now it's a\n\t\t\t\t\tstandalone program.";
    			t31 = space();
    			p5 = element("p");
    			p5.textContent = "This program can be configured in a number of ways. through a text file\n\t\t\t\t\tcalled \"rules.txt\" --\n\t\t\t\t\tThe options include:";
    			t33 = space();
    			ul6 = element("ul");
    			li4 = element("li");
    			li4.textContent = "auto sort";
    			t35 = space();
    			li5 = element("li");
    			li5.textContent = "output file";
    			t37 = space();
    			li6 = element("li");
    			li6.textContent = "ban amiibox (full)";
    			t39 = space();
    			li9 = element("li");
    			t40 = text("limit stat modification\n\t\t\t\t\t\t");
    			ul4 = element("ul");
    			li7 = element("li");
    			li7.textContent = "can also get more specitic";
    			t42 = space();
    			li8 = element("li");
    			t43 = space();
    			li10 = element("li");
    			li10.textContent = "ban typing (attack, defense, grab)";
    			t45 = space();
    			li12 = element("li");
    			b = element("b");
    			b.textContent = "ban spirit abilites";
    			t47 = space();
    			ul5 = element("ul");
    			li11 = element("li");
    			li11.textContent = "can specify which abilities to \"include\" or \"exclude\"";
    			t49 = space();
    			p6 = element("p");
    			p6.textContent = "I look forward to seeing all the possibilities now that there's a quick way\n\t\t\t\t\tto validate bins according to a ruleset!~";
    			t51 = space();
    			footer = element("footer");
    			t52 = text("made with ");
    			span = element("span");
    			t53 = text(" by ");
    			a5 = element("a");
    			a5.textContent = "fudgepop01";
    			t55 = space();
    			div14 = element("div");
    			create_component(kofi1.$$.fragment);
    			attr_dev(a0, "href", "https://github.com/fudgepop01/amiibox");
    			add_location(a0, file$1, 11, 7, 238);
    			add_location(li0, file$1, 11, 3, 234);
    			attr_dev(ul0, "class", "uk-navbar-nav");
    			add_location(ul0, file$1, 10, 2, 204);
    			attr_dev(div0, "class", "uk-navbar-left");
    			add_location(div0, file$1, 9, 1, 173);
    			attr_dev(a1, "href", "##");
    			add_location(a1, file$1, 17, 26, 449);
    			attr_dev(li1, "class", "uk-active");
    			add_location(li1, file$1, 17, 4, 427);
    			attr_dev(ul1, "class", "uk-navbar-nav");
    			add_location(ul1, file$1, 16, 3, 396);
    			attr_dev(div1, "class", "uk-navbar-center-left");
    			add_location(div1, file$1, 15, 2, 357);
    			attr_dev(img, "class", "logo svelte-1mg5db6");
    			if (img.src !== (img_src_value = "./images/icon.png")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "amiibox logo");
    			attr_dev(img, "uk-img", "");
    			add_location(img, file$1, 21, 3, 550);
    			attr_dev(div2, "class", "uk-navbar-item uk-logo");
    			add_location(div2, file$1, 20, 2, 510);
    			add_location(sup, file$1, 25, 36, 734);
    			attr_dev(a2, "href", "#none");
    			add_location(a2, file$1, 25, 8, 706);
    			add_location(li2, file$1, 25, 4, 702);
    			attr_dev(ul2, "class", "uk-navbar-nav");
    			add_location(ul2, file$1, 24, 3, 671);
    			attr_dev(div3, "class", "uk-navbar-center-right");
    			add_location(div3, file$1, 23, 2, 631);
    			attr_dev(div4, "class", "uk-navbar-center");
    			add_location(div4, file$1, 14, 1, 324);
    			attr_dev(a3, "href", "https://github.com/fudgepop01/amiibox");
    			add_location(a3, file$1, 31, 7, 851);
    			add_location(li3, file$1, 31, 3, 847);
    			attr_dev(ul3, "class", "uk-navbar-nav");
    			add_location(ul3, file$1, 30, 2, 817);
    			attr_dev(div5, "class", "uk-navbar-right");
    			add_location(div5, file$1, 29, 1, 785);
    			attr_dev(nav, "class", "uk-navbar-container");
    			attr_dev(nav, "uk-navbar", "");
    			attr_dev(nav, "uk-sticky", "");
    			add_location(nav, file$1, 8, 0, 118);
    			attr_dev(h10, "class", "uk-heading-large");
    			add_location(h10, file$1, 37, 1, 1095);
    			attr_dev(button0, "class", "uk-button uk-button-primary");
    			add_location(button0, file$1, 39, 3, 1192);
    			attr_dev(button1, "class", "uk-button uk-button-secondary");
    			add_location(button1, file$1, 40, 3, 1332);
    			attr_dev(div6, "class", "uk-button-group uk-padding");
    			add_location(div6, file$1, 38, 2, 1148);
    			attr_dev(div7, "class", "uk-height-medium uk-width-1-1 uk-flex uk-flex-column uk-flex-middle uk-flex-center");
    			add_location(div7, file$1, 36, 0, 997);
    			attr_dev(h11, "class", "uk-heading-divider");
    			add_location(h11, file$1, 47, 3, 1603);
    			attr_dev(a4, "href", "https://twitter.com/fudgepop01");
    			add_location(a4, file$1, 53, 5, 1777);
    			add_location(p0, file$1, 51, 4, 1716);
    			add_location(p1, file$1, 58, 4, 2068);
    			add_location(p2, file$1, 64, 4, 2360);
    			add_location(p3, file$1, 71, 4, 2749);
    			add_location(div8, file$1, 50, 3, 1706);
    			attr_dev(div9, "class", "uk-container");
    			add_location(div9, file$1, 46, 2, 1573);
    			attr_dev(div10, "class", "uk-section uk-section-default uk-align-center uk-padding-remove");
    			add_location(div10, file$1, 45, 1, 1493);
    			attr_dev(h12, "class", "uk-heading-divider");
    			add_location(h12, file$1, 85, 3, 3356);
    			add_location(p4, file$1, 89, 4, 3438);
    			add_location(p5, file$1, 97, 4, 3867);
    			add_location(li4, file$1, 103, 5, 4072);
    			add_location(li5, file$1, 104, 5, 4096);
    			add_location(li6, file$1, 105, 5, 4122);
    			add_location(li7, file$1, 109, 7, 4256);
    			add_location(li8, file$1, 110, 7, 4299);
    			attr_dev(ul4, "class", "uk-list uk-list-circle uk-list-collapse");
    			add_location(ul4, file$1, 108, 6, 4196);
    			add_location(li9, file$1, 106, 5, 4155);
    			add_location(li10, file$1, 113, 5, 4337);
    			add_location(b, file$1, 115, 6, 4397);
    			add_location(li11, file$1, 117, 7, 4490);
    			attr_dev(ul5, "class", "uk-list uk-list-circle uk-list-collapse");
    			add_location(ul5, file$1, 116, 6, 4430);
    			add_location(li12, file$1, 114, 5, 4386);
    			attr_dev(ul6, "class", "uk-list uk-list-bullet uk-list-collapse");
    			add_location(ul6, file$1, 102, 4, 4014);
    			add_location(p6, file$1, 121, 4, 4590);
    			add_location(div11, file$1, 88, 3, 3428);
    			attr_dev(div12, "class", "uk-container");
    			add_location(div12, file$1, 84, 2, 3326);
    			attr_dev(div13, "class", "uk-section uk-section-default uk-align-center uk-padding-remove");
    			add_location(div13, file$1, 83, 1, 3246);
    			attr_dev(main, "class", "svelte-1mg5db6");
    			add_location(main, file$1, 44, 0, 1485);
    			attr_dev(span, "uk-icon", "icon: heart");
    			add_location(span, file$1, 131, 11, 4857);
    			attr_dev(a5, "href", "https://twitter.com/fudgepop01");
    			add_location(a5, file$1, 131, 50, 4896);
    			attr_dev(div14, "class", "uk-padding-small");
    			add_location(div14, file$1, 132, 1, 4953);
    			attr_dev(footer, "class", "uk-height-small uk-text-large uk-text-center uk-padding-small svelte-1mg5db6");
    			add_location(footer, file$1, 130, 0, 4767);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, nav, anchor);
    			append_dev(nav, div0);
    			append_dev(div0, ul0);
    			append_dev(ul0, li0);
    			append_dev(li0, a0);
    			append_dev(nav, t1);
    			append_dev(nav, div4);
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
    			append_dev(nav, t8);
    			append_dev(nav, div5);
    			append_dev(div5, ul3);
    			append_dev(ul3, li3);
    			append_dev(li3, a3);
    			mount_component(kofi0, a3, null);
    			insert_dev(target, t9, anchor);
    			insert_dev(target, div7, anchor);
    			append_dev(div7, h10);
    			append_dev(div7, t11);
    			append_dev(div7, div6);
    			append_dev(div6, button0);
    			append_dev(div6, t13);
    			append_dev(div6, button1);
    			insert_dev(target, t15, anchor);
    			insert_dev(target, main, anchor);
    			append_dev(main, div10);
    			append_dev(div10, div9);
    			append_dev(div9, h11);
    			append_dev(div9, t17);
    			append_dev(div9, div8);
    			append_dev(div8, p0);
    			append_dev(p0, t18);
    			append_dev(p0, a4);
    			append_dev(p0, t20);
    			append_dev(div8, t21);
    			append_dev(div8, p1);
    			append_dev(div8, t23);
    			append_dev(div8, p2);
    			append_dev(div8, t25);
    			append_dev(div8, p3);
    			append_dev(main, t27);
    			append_dev(main, div13);
    			append_dev(div13, div12);
    			append_dev(div12, h12);
    			append_dev(div12, t29);
    			append_dev(div12, div11);
    			append_dev(div11, p4);
    			append_dev(div11, t31);
    			append_dev(div11, p5);
    			append_dev(div11, t33);
    			append_dev(div11, ul6);
    			append_dev(ul6, li4);
    			append_dev(ul6, t35);
    			append_dev(ul6, li5);
    			append_dev(ul6, t37);
    			append_dev(ul6, li6);
    			append_dev(ul6, t39);
    			append_dev(ul6, li9);
    			append_dev(li9, t40);
    			append_dev(li9, ul4);
    			append_dev(ul4, li7);
    			append_dev(ul4, t42);
    			append_dev(ul4, li8);
    			append_dev(ul6, t43);
    			append_dev(ul6, li10);
    			append_dev(ul6, t45);
    			append_dev(ul6, li12);
    			append_dev(li12, b);
    			append_dev(li12, t47);
    			append_dev(li12, ul5);
    			append_dev(ul5, li11);
    			append_dev(div11, t49);
    			append_dev(div11, p6);
    			insert_dev(target, t51, anchor);
    			insert_dev(target, footer, anchor);
    			append_dev(footer, t52);
    			append_dev(footer, span);
    			append_dev(footer, t53);
    			append_dev(footer, a5);
    			append_dev(footer, t55);
    			append_dev(footer, div14);
    			mount_component(kofi1, div14, null);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", /*click_handler*/ ctx[1], false, false, false),
    					listen_dev(button1, "click", /*click_handler_1*/ ctx[2], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(kofi0.$$.fragment, local);
    			transition_in(kofi1.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(kofi0.$$.fragment, local);
    			transition_out(kofi1.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(nav);
    			destroy_component(kofi0);
    			if (detaching) detach_dev(t9);
    			if (detaching) detach_dev(div7);
    			if (detaching) detach_dev(t15);
    			if (detaching) detach_dev(main);
    			if (detaching) detach_dev(t51);
    			if (detaching) detach_dev(footer);
    			destroy_component(kofi1);
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
    	const download = url => {
    		window.open(url);
    	};

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("App", $$slots, []);
    	const click_handler = () => download("./downloads/tournament_legal.zip");
    	const click_handler_1 = () => download("./downloads/Validator.zip");
    	$$self.$capture_state = () => ({ KoFi: Ko_fi, download });
    	return [download, click_handler, click_handler_1];
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
