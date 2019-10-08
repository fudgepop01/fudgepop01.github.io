
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.head.appendChild(r) })(document);
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
    function null_to_empty(value) {
        return value == null ? '' : value;
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
    function svg_element(name) {
        return document.createElementNS('http://www.w3.org/2000/svg', name);
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
    function stop_propagation(fn) {
        return function (event) {
            event.stopPropagation();
            // @ts-ignore
            return fn.call(this, event);
        };
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else
            node.setAttribute(attribute, value);
    }
    function xlink_attr(node, attribute, value) {
        node.setAttributeNS('http://www.w3.org/1999/xlink', attribute, value);
    }
    function to_number(value) {
        return value === '' ? undefined : +value;
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        if (value != null || input.value) {
            input.value = value;
        }
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
    function createEventDispatcher() {
        const component = current_component;
        return (type, detail) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail);
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
            }
        };
    }
    // TODO figure out if we still want to support
    // shorthand events, or if we want to implement
    // a real bubbling mechanism
    function bubble(component, event) {
        const callbacks = component.$$.callbacks[event.type];
        if (callbacks) {
            callbacks.slice().forEach(fn => fn(event));
        }
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
            ? instance(component, props, (key, ret, value = ret) => {
                if ($$.ctx && not_equal($$.ctx[key], $$.ctx[key] = value)) {
                    if ($$.bound[key])
                        $$.bound[key](value);
                    if (ready)
                        make_dirty(component, key);
                }
                return ret;
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

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, detail));
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
    function prop_dev(node, property, value) {
        node[property] = value;
        dispatch_dev("SvelteDOMSetProperty", { node, property, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.data === data)
            return;
        dispatch_dev("SvelteDOMSetData", { node: text, data });
        text.data = data;
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

    var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

    function createCommonjsModule(fn, module) {
    	return module = { exports: {} }, fn(module, module.exports), module.exports;
    }

    function getCjsExportFromNamespace (n) {
    	return n && n['default'] || n;
    }

    var lzString = createCommonjsModule(function (module) {
    // Copyright (c) 2013 Pieroxy <pieroxy@pieroxy.net>
    // This work is free. You can redistribute it and/or modify it
    // under the terms of the WTFPL, Version 2
    // For more information see LICENSE.txt or http://www.wtfpl.net/
    //
    // For more information, the home page:
    // http://pieroxy.net/blog/pages/lz-string/testing.html
    //
    // LZ-based compression algorithm, version 1.4.4
    var LZString = (function() {

    // private property
    var f = String.fromCharCode;
    var keyStrBase64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
    var keyStrUriSafe = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+-$";
    var baseReverseDic = {};

    function getBaseValue(alphabet, character) {
      if (!baseReverseDic[alphabet]) {
        baseReverseDic[alphabet] = {};
        for (var i=0 ; i<alphabet.length ; i++) {
          baseReverseDic[alphabet][alphabet.charAt(i)] = i;
        }
      }
      return baseReverseDic[alphabet][character];
    }

    var LZString = {
      compressToBase64 : function (input) {
        if (input == null) return "";
        var res = LZString._compress(input, 6, function(a){return keyStrBase64.charAt(a);});
        switch (res.length % 4) { // To produce valid Base64
        default: // When could this happen ?
        case 0 : return res;
        case 1 : return res+"===";
        case 2 : return res+"==";
        case 3 : return res+"=";
        }
      },

      decompressFromBase64 : function (input) {
        if (input == null) return "";
        if (input == "") return null;
        return LZString._decompress(input.length, 32, function(index) { return getBaseValue(keyStrBase64, input.charAt(index)); });
      },

      compressToUTF16 : function (input) {
        if (input == null) return "";
        return LZString._compress(input, 15, function(a){return f(a+32);}) + " ";
      },

      decompressFromUTF16: function (compressed) {
        if (compressed == null) return "";
        if (compressed == "") return null;
        return LZString._decompress(compressed.length, 16384, function(index) { return compressed.charCodeAt(index) - 32; });
      },

      //compress into uint8array (UCS-2 big endian format)
      compressToUint8Array: function (uncompressed) {
        var compressed = LZString.compress(uncompressed);
        var buf=new Uint8Array(compressed.length*2); // 2 bytes per character

        for (var i=0, TotalLen=compressed.length; i<TotalLen; i++) {
          var current_value = compressed.charCodeAt(i);
          buf[i*2] = current_value >>> 8;
          buf[i*2+1] = current_value % 256;
        }
        return buf;
      },

      //decompress from uint8array (UCS-2 big endian format)
      decompressFromUint8Array:function (compressed) {
        if (compressed===null || compressed===undefined){
            return LZString.decompress(compressed);
        } else {
            var buf=new Array(compressed.length/2); // 2 bytes per character
            for (var i=0, TotalLen=buf.length; i<TotalLen; i++) {
              buf[i]=compressed[i*2]*256+compressed[i*2+1];
            }

            var result = [];
            buf.forEach(function (c) {
              result.push(f(c));
            });
            return LZString.decompress(result.join(''));

        }

      },


      //compress into a string that is already URI encoded
      compressToEncodedURIComponent: function (input) {
        if (input == null) return "";
        return LZString._compress(input, 6, function(a){return keyStrUriSafe.charAt(a);});
      },

      //decompress from an output of compressToEncodedURIComponent
      decompressFromEncodedURIComponent:function (input) {
        if (input == null) return "";
        if (input == "") return null;
        input = input.replace(/ /g, "+");
        return LZString._decompress(input.length, 32, function(index) { return getBaseValue(keyStrUriSafe, input.charAt(index)); });
      },

      compress: function (uncompressed) {
        return LZString._compress(uncompressed, 16, function(a){return f(a);});
      },
      _compress: function (uncompressed, bitsPerChar, getCharFromInt) {
        if (uncompressed == null) return "";
        var i, value,
            context_dictionary= {},
            context_dictionaryToCreate= {},
            context_c="",
            context_wc="",
            context_w="",
            context_enlargeIn= 2, // Compensate for the first entry which should not count
            context_dictSize= 3,
            context_numBits= 2,
            context_data=[],
            context_data_val=0,
            context_data_position=0,
            ii;

        for (ii = 0; ii < uncompressed.length; ii += 1) {
          context_c = uncompressed.charAt(ii);
          if (!Object.prototype.hasOwnProperty.call(context_dictionary,context_c)) {
            context_dictionary[context_c] = context_dictSize++;
            context_dictionaryToCreate[context_c] = true;
          }

          context_wc = context_w + context_c;
          if (Object.prototype.hasOwnProperty.call(context_dictionary,context_wc)) {
            context_w = context_wc;
          } else {
            if (Object.prototype.hasOwnProperty.call(context_dictionaryToCreate,context_w)) {
              if (context_w.charCodeAt(0)<256) {
                for (i=0 ; i<context_numBits ; i++) {
                  context_data_val = (context_data_val << 1);
                  if (context_data_position == bitsPerChar-1) {
                    context_data_position = 0;
                    context_data.push(getCharFromInt(context_data_val));
                    context_data_val = 0;
                  } else {
                    context_data_position++;
                  }
                }
                value = context_w.charCodeAt(0);
                for (i=0 ; i<8 ; i++) {
                  context_data_val = (context_data_val << 1) | (value&1);
                  if (context_data_position == bitsPerChar-1) {
                    context_data_position = 0;
                    context_data.push(getCharFromInt(context_data_val));
                    context_data_val = 0;
                  } else {
                    context_data_position++;
                  }
                  value = value >> 1;
                }
              } else {
                value = 1;
                for (i=0 ; i<context_numBits ; i++) {
                  context_data_val = (context_data_val << 1) | value;
                  if (context_data_position ==bitsPerChar-1) {
                    context_data_position = 0;
                    context_data.push(getCharFromInt(context_data_val));
                    context_data_val = 0;
                  } else {
                    context_data_position++;
                  }
                  value = 0;
                }
                value = context_w.charCodeAt(0);
                for (i=0 ; i<16 ; i++) {
                  context_data_val = (context_data_val << 1) | (value&1);
                  if (context_data_position == bitsPerChar-1) {
                    context_data_position = 0;
                    context_data.push(getCharFromInt(context_data_val));
                    context_data_val = 0;
                  } else {
                    context_data_position++;
                  }
                  value = value >> 1;
                }
              }
              context_enlargeIn--;
              if (context_enlargeIn == 0) {
                context_enlargeIn = Math.pow(2, context_numBits);
                context_numBits++;
              }
              delete context_dictionaryToCreate[context_w];
            } else {
              value = context_dictionary[context_w];
              for (i=0 ; i<context_numBits ; i++) {
                context_data_val = (context_data_val << 1) | (value&1);
                if (context_data_position == bitsPerChar-1) {
                  context_data_position = 0;
                  context_data.push(getCharFromInt(context_data_val));
                  context_data_val = 0;
                } else {
                  context_data_position++;
                }
                value = value >> 1;
              }


            }
            context_enlargeIn--;
            if (context_enlargeIn == 0) {
              context_enlargeIn = Math.pow(2, context_numBits);
              context_numBits++;
            }
            // Add wc to the dictionary.
            context_dictionary[context_wc] = context_dictSize++;
            context_w = String(context_c);
          }
        }

        // Output the code for w.
        if (context_w !== "") {
          if (Object.prototype.hasOwnProperty.call(context_dictionaryToCreate,context_w)) {
            if (context_w.charCodeAt(0)<256) {
              for (i=0 ; i<context_numBits ; i++) {
                context_data_val = (context_data_val << 1);
                if (context_data_position == bitsPerChar-1) {
                  context_data_position = 0;
                  context_data.push(getCharFromInt(context_data_val));
                  context_data_val = 0;
                } else {
                  context_data_position++;
                }
              }
              value = context_w.charCodeAt(0);
              for (i=0 ; i<8 ; i++) {
                context_data_val = (context_data_val << 1) | (value&1);
                if (context_data_position == bitsPerChar-1) {
                  context_data_position = 0;
                  context_data.push(getCharFromInt(context_data_val));
                  context_data_val = 0;
                } else {
                  context_data_position++;
                }
                value = value >> 1;
              }
            } else {
              value = 1;
              for (i=0 ; i<context_numBits ; i++) {
                context_data_val = (context_data_val << 1) | value;
                if (context_data_position == bitsPerChar-1) {
                  context_data_position = 0;
                  context_data.push(getCharFromInt(context_data_val));
                  context_data_val = 0;
                } else {
                  context_data_position++;
                }
                value = 0;
              }
              value = context_w.charCodeAt(0);
              for (i=0 ; i<16 ; i++) {
                context_data_val = (context_data_val << 1) | (value&1);
                if (context_data_position == bitsPerChar-1) {
                  context_data_position = 0;
                  context_data.push(getCharFromInt(context_data_val));
                  context_data_val = 0;
                } else {
                  context_data_position++;
                }
                value = value >> 1;
              }
            }
            context_enlargeIn--;
            if (context_enlargeIn == 0) {
              context_enlargeIn = Math.pow(2, context_numBits);
              context_numBits++;
            }
            delete context_dictionaryToCreate[context_w];
          } else {
            value = context_dictionary[context_w];
            for (i=0 ; i<context_numBits ; i++) {
              context_data_val = (context_data_val << 1) | (value&1);
              if (context_data_position == bitsPerChar-1) {
                context_data_position = 0;
                context_data.push(getCharFromInt(context_data_val));
                context_data_val = 0;
              } else {
                context_data_position++;
              }
              value = value >> 1;
            }


          }
          context_enlargeIn--;
          if (context_enlargeIn == 0) {
            context_enlargeIn = Math.pow(2, context_numBits);
            context_numBits++;
          }
        }

        // Mark the end of the stream
        value = 2;
        for (i=0 ; i<context_numBits ; i++) {
          context_data_val = (context_data_val << 1) | (value&1);
          if (context_data_position == bitsPerChar-1) {
            context_data_position = 0;
            context_data.push(getCharFromInt(context_data_val));
            context_data_val = 0;
          } else {
            context_data_position++;
          }
          value = value >> 1;
        }

        // Flush the last char
        while (true) {
          context_data_val = (context_data_val << 1);
          if (context_data_position == bitsPerChar-1) {
            context_data.push(getCharFromInt(context_data_val));
            break;
          }
          else context_data_position++;
        }
        return context_data.join('');
      },

      decompress: function (compressed) {
        if (compressed == null) return "";
        if (compressed == "") return null;
        return LZString._decompress(compressed.length, 32768, function(index) { return compressed.charCodeAt(index); });
      },

      _decompress: function (length, resetValue, getNextValue) {
        var dictionary = [],
            next,
            enlargeIn = 4,
            dictSize = 4,
            numBits = 3,
            entry = "",
            result = [],
            i,
            w,
            bits, resb, maxpower, power,
            c,
            data = {val:getNextValue(0), position:resetValue, index:1};

        for (i = 0; i < 3; i += 1) {
          dictionary[i] = i;
        }

        bits = 0;
        maxpower = Math.pow(2,2);
        power=1;
        while (power!=maxpower) {
          resb = data.val & data.position;
          data.position >>= 1;
          if (data.position == 0) {
            data.position = resetValue;
            data.val = getNextValue(data.index++);
          }
          bits |= (resb>0 ? 1 : 0) * power;
          power <<= 1;
        }

        switch (next = bits) {
          case 0:
              bits = 0;
              maxpower = Math.pow(2,8);
              power=1;
              while (power!=maxpower) {
                resb = data.val & data.position;
                data.position >>= 1;
                if (data.position == 0) {
                  data.position = resetValue;
                  data.val = getNextValue(data.index++);
                }
                bits |= (resb>0 ? 1 : 0) * power;
                power <<= 1;
              }
            c = f(bits);
            break;
          case 1:
              bits = 0;
              maxpower = Math.pow(2,16);
              power=1;
              while (power!=maxpower) {
                resb = data.val & data.position;
                data.position >>= 1;
                if (data.position == 0) {
                  data.position = resetValue;
                  data.val = getNextValue(data.index++);
                }
                bits |= (resb>0 ? 1 : 0) * power;
                power <<= 1;
              }
            c = f(bits);
            break;
          case 2:
            return "";
        }
        dictionary[3] = c;
        w = c;
        result.push(c);
        while (true) {
          if (data.index > length) {
            return "";
          }

          bits = 0;
          maxpower = Math.pow(2,numBits);
          power=1;
          while (power!=maxpower) {
            resb = data.val & data.position;
            data.position >>= 1;
            if (data.position == 0) {
              data.position = resetValue;
              data.val = getNextValue(data.index++);
            }
            bits |= (resb>0 ? 1 : 0) * power;
            power <<= 1;
          }

          switch (c = bits) {
            case 0:
              bits = 0;
              maxpower = Math.pow(2,8);
              power=1;
              while (power!=maxpower) {
                resb = data.val & data.position;
                data.position >>= 1;
                if (data.position == 0) {
                  data.position = resetValue;
                  data.val = getNextValue(data.index++);
                }
                bits |= (resb>0 ? 1 : 0) * power;
                power <<= 1;
              }

              dictionary[dictSize++] = f(bits);
              c = dictSize-1;
              enlargeIn--;
              break;
            case 1:
              bits = 0;
              maxpower = Math.pow(2,16);
              power=1;
              while (power!=maxpower) {
                resb = data.val & data.position;
                data.position >>= 1;
                if (data.position == 0) {
                  data.position = resetValue;
                  data.val = getNextValue(data.index++);
                }
                bits |= (resb>0 ? 1 : 0) * power;
                power <<= 1;
              }
              dictionary[dictSize++] = f(bits);
              c = dictSize-1;
              enlargeIn--;
              break;
            case 2:
              return result.join('');
          }

          if (enlargeIn == 0) {
            enlargeIn = Math.pow(2, numBits);
            numBits++;
          }

          if (dictionary[c]) {
            entry = dictionary[c];
          } else {
            if (c === dictSize) {
              entry = w + w.charAt(0);
            } else {
              return null;
            }
          }
          result.push(entry);

          // Add w+entry[0] to the dictionary.
          dictionary[dictSize++] = w + entry.charAt(0);
          enlargeIn--;

          w = entry;

          if (enlargeIn == 0) {
            enlargeIn = Math.pow(2, numBits);
            numBits++;
          }

        }
      }
    };
      return LZString;
    })();

    if(  module != null ) {
      module.exports = LZString;
    }
    });

    var store2 = createCommonjsModule(function (module) {
    (function(window, define) {
        var _ = {
            version: "2.10.0",
            areas: {},
            apis: {},

            // utilities
            inherit: function(api, o) {
                for (var p in api) {
                    if (!o.hasOwnProperty(p)) {
                        Object.defineProperty(o, p, Object.getOwnPropertyDescriptor(api, p));
                    }
                }
                return o;
            },
            stringify: function(d) {
                return d === undefined || typeof d === "function" ? d+'' : JSON.stringify(d);
            },
            parse: function(s) {
                // if it doesn't parse, return as is
                try{ return JSON.parse(s); }catch(e){ return s; }
            },

            // extension hooks
            fn: function(name, fn) {
                _.storeAPI[name] = fn;
                for (var api in _.apis) {
                    _.apis[api][name] = fn;
                }
            },
            get: function(area, key){ return area.getItem(key); },
            set: function(area, key, string){ area.setItem(key, string); },
            remove: function(area, key){ area.removeItem(key); },
            key: function(area, i){ return area.key(i); },
            length: function(area){ return area.length; },
            clear: function(area){ area.clear(); },

            // core functions
            Store: function(id, area, namespace) {
                var store = _.inherit(_.storeAPI, function(key, data, overwrite) {
                    if (arguments.length === 0){ return store.getAll(); }
                    if (typeof data === "function"){ return store.transact(key, data, overwrite); }// fn=data, alt=overwrite
                    if (data !== undefined){ return store.set(key, data, overwrite); }
                    if (typeof key === "string" || typeof key === "number"){ return store.get(key); }
                    if (typeof key === "function"){ return store.each(key); }
                    if (!key){ return store.clear(); }
                    return store.setAll(key, data);// overwrite=data, data=key
                });
                store._id = id;
                try {
                    var testKey = '_-bad-_';
                    area.setItem(testKey, 'wolf');
                    store._area = area;
                    area.removeItem(testKey);
                } catch (e) {}
                if (!store._area) {
                    store._area = _.storage('fake');
                }
                store._ns = namespace || '';
                if (!_.areas[id]) {
                    _.areas[id] = store._area;
                }
                if (!_.apis[store._ns+store._id]) {
                    _.apis[store._ns+store._id] = store;
                }
                return store;
            },
            storeAPI: {
                // admin functions
                area: function(id, area) {
                    var store = this[id];
                    if (!store || !store.area) {
                        store = _.Store(id, area, this._ns);//new area-specific api in this namespace
                        if (!this[id]){ this[id] = store; }
                    }
                    return store;
                },
                namespace: function(namespace, singleArea) {
                    if (!namespace){
                        return this._ns ? this._ns.substring(0,this._ns.length-1) : '';
                    }
                    var ns = namespace, store = this[ns];
                    if (!store || !store.namespace) {
                        store = _.Store(this._id, this._area, this._ns+ns+'.');//new namespaced api
                        if (!this[ns]){ this[ns] = store; }
                        if (!singleArea) {
                            for (var name in _.areas) {
                                store.area(name, _.areas[name]);
                            }
                        }
                    }
                    return store;
                },
                isFake: function(){ return this._area.name === 'fake'; },
                toString: function() {
                    return 'store'+(this._ns?'.'+this.namespace():'')+'['+this._id+']';
                },

                // storage functions
                has: function(key) {
                    if (this._area.has) {
                        return this._area.has(this._in(key));//extension hook
                    }
                    return !!(this._in(key) in this._area);
                },
                size: function(){ return this.keys().length; },
                each: function(fn, fill) {// fill is used by keys(fillList) and getAll(fillList))
                    for (var i=0, m=_.length(this._area); i<m; i++) {
                        var key = this._out(_.key(this._area, i));
                        if (key !== undefined) {
                            if (fn.call(this, key, this.get(key), fill) === false) {
                                break;
                            }
                        }
                        if (m > _.length(this._area)) { m--; i--; }// in case of removeItem
                    }
                    return fill || this;
                },
                keys: function(fillList) {
                    return this.each(function(k, v, list){ list.push(k); }, fillList || []);
                },
                get: function(key, alt) {
                    var s = _.get(this._area, this._in(key));
                    return s !== null ? _.parse(s) : alt || s;// support alt for easy default mgmt
                },
                getAll: function(fillObj) {
                    return this.each(function(k, v, all){ all[k] = v; }, fillObj || {});
                },
                transact: function(key, fn, alt) {
                    var val = this.get(key, alt),
                        ret = fn(val);
                    this.set(key, ret === undefined ? val : ret);
                    return this;
                },
                set: function(key, data, overwrite) {
                    var d = this.get(key);
                    if (d != null && overwrite === false) {
                        return data;
                    }
                    return _.set(this._area, this._in(key), _.stringify(data), overwrite) || d;
                },
                setAll: function(data, overwrite) {
                    var changed, val;
                    for (var key in data) {
                        val = data[key];
                        if (this.set(key, val, overwrite) !== val) {
                            changed = true;
                        }
                    }
                    return changed;
                },
                add: function(key, data) {
                    var d = this.get(key);
                    if (d instanceof Array) {
                        data = d.concat(data);
                    } else if (d !== null) {
                        var type = typeof d;
                        if (type === typeof data && type === 'object') {
                            for (var k in data) {
                                d[k] = data[k];
                            }
                            data = d;
                        } else {
                            data = d + data;
                        }
                    }
                    _.set(this._area, this._in(key), _.stringify(data));
                    return data;
                },
                remove: function(key, alt) {
                    var d = this.get(key, alt);
                    _.remove(this._area, this._in(key));
                    return d;
                },
                clear: function() {
                    if (!this._ns) {
                        _.clear(this._area);
                    } else {
                        this.each(function(k){ _.remove(this._area, this._in(k)); }, 1);
                    }
                    return this;
                },
                clearAll: function() {
                    var area = this._area;
                    for (var id in _.areas) {
                        if (_.areas.hasOwnProperty(id)) {
                            this._area = _.areas[id];
                            this.clear();
                        }
                    }
                    this._area = area;
                    return this;
                },

                // internal use functions
                _in: function(k) {
                    if (typeof k !== "string"){ k = _.stringify(k); }
                    return this._ns ? this._ns + k : k;
                },
                _out: function(k) {
                    return this._ns ?
                        k && k.indexOf(this._ns) === 0 ?
                            k.substring(this._ns.length) :
                            undefined : // so each() knows to skip it
                        k;
                }
            },// end _.storeAPI
            storage: function(name) {
                return _.inherit(_.storageAPI, { items: {}, name: name });
            },
            storageAPI: {
                length: 0,
                has: function(k){ return this.items.hasOwnProperty(k); },
                key: function(i) {
                    var c = 0;
                    for (var k in this.items){
                        if (this.has(k) && i === c++) {
                            return k;
                        }
                    }
                },
                setItem: function(k, v) {
                    if (!this.has(k)) {
                        this.length++;
                    }
                    this.items[k] = v;
                },
                removeItem: function(k) {
                    if (this.has(k)) {
                        delete this.items[k];
                        this.length--;
                    }
                },
                getItem: function(k){ return this.has(k) ? this.items[k] : null; },
                clear: function(){ for (var k in this.items){ this.removeItem(k); } }
            }// end _.storageAPI
        };

        var store =
            // safely set this up (throws error in IE10/32bit mode for local files)
            _.Store("local", (function(){try{ return localStorage; }catch(e){}})());
        store.local = store;// for completeness
        store._ = _;// for extenders and debuggers...
        // safely setup store.session (throws exception in FF for file:/// urls)
        store.area("session", (function(){try{ return sessionStorage; }catch(e){}})());
        store.area("page", _.storage("page"));

        if (typeof define === 'function' && define.amd !== undefined) {
            define('store2', [], function () {
                return store;
            });
        } else if ( module.exports) {
            module.exports = store;
        } else {
            // expose the primary store fn to the global object and save conflicts
            if (window.store){ _.conflict = window.store; }
            window.store = store;
        }

    })(commonjsGlobal, commonjsGlobal && commonjsGlobal.define);
    });

    var StreamSaver = createCommonjsModule(function (module) {
    ((name, definition) => {
       module.exports = definition()
        ;
    })('streamSaver', () => {

      let mitmTransporter = null;
      let supportsTransferable = false;
      const test = fn => { try { fn(); } catch (e) {} };
      const ponyfill = window.WebStreamsPolyfill || {};
      const isSecureContext = window.isSecureContext;
      let useBlobFallback = /constructor/i.test(window.HTMLElement) || !!window.safari;
      const downloadStrategy = isSecureContext || 'MozAppearance' in document.documentElement.style
        ? 'iframe'
        : 'navigate';

      const streamSaver = {
        createWriteStream,
        WritableStream: window.WritableStream || ponyfill.WritableStream,
        supported: true,
        version: { full: '2.0.0', major: 2, minor: 0, dot: 0 },
        mitm: 'https://jimmywarting.github.io/StreamSaver.js/mitm.html?version=2.0.0'
      };

      /**
       * create a hidden iframe and append it to the DOM (body)
       *
       * @param  {string} src page to load
       * @return {HTMLIFrameElement} page to load
       */
      function makeIframe (src) {
        if (!src) throw new Error('meh')
        const iframe = document.createElement('iframe');
        iframe.hidden = true;
        iframe.src = src;
        iframe.loaded = false;
        iframe.name = 'iframe';
        iframe.isIframe = true;
        iframe.postMessage = (...args) => iframe.contentWindow.postMessage(...args);
        iframe.addEventListener('load', () => {
          iframe.loaded = true;
        }, { once: true });
        document.body.appendChild(iframe);
        return iframe
      }

      /**
       * create a popup that simulates the basic things
       * of what a iframe can do
       *
       * @param  {string} src page to load
       * @return {object}     iframe like object
       */
      function makePopup (src) {
        const options = 'width=200,height=100';
        const delegate = document.createDocumentFragment();
        const popup = {
          frame: window.open(src, 'popup', options),
          loaded: false,
          isIframe: false,
          isPopup: true,
          remove () { popup.frame.close(); },
          addEventListener (...args) { delegate.addEventListener(...args); },
          dispatchEvent (...args) { delegate.dispatchEvent(...args); },
          removeEventListener (...args) { delegate.removeEventListener(...args); },
          postMessage (...args) { popup.frame.postMessage(...args); }
        };

        const onReady = evt => {
          if (evt.source === popup.frame) {
            popup.loaded = true;
            window.removeEventListener('message', onReady);
            popup.dispatchEvent(new Event('load'));
          }
        };

        window.addEventListener('message', onReady);

        return popup
      }

      try {
        // We can't look for service worker since it may still work on http
        new Response(new ReadableStream());
        if (isSecureContext && !('serviceWorker' in navigator)) {
          useBlobFallback = true;
        }
      } catch (err) {
        useBlobFallback = true;
      }

      test(() => {
        // Transfariable stream was first enabled in chrome v73 behind a flag
        const { readable } = new TransformStream();
        const mc = new MessageChannel();
        mc.port1.postMessage(readable, [readable]);
        mc.port1.close();
        mc.port2.close();
        supportsTransferable = true;
        // Freeze TransformStream object (can only work with native)
        Object.defineProperty(streamSaver, 'TransformStream', {
          configurable: false,
          writable: false,
          value: TransformStream
        });
      });

      function loadTransporter () {
        if (!mitmTransporter) {
          mitmTransporter = isSecureContext
            ? makeIframe(streamSaver.mitm)
            : makePopup(streamSaver.mitm);
        }
      }

      /**
       * @param  {string} filename filename that should be used
       * @param  {object} options  [description]
       * @param  {number} size     depricated
       * @return {WritableStream}
       */
      function createWriteStream (filename, options, size) {
        let opts = {
          size: null,
          pathname: null,
          writableStrategy: undefined,
          readableStrategy: undefined
        };

        // normalize arguments
        if (Number.isFinite(options)) {
          [ size, options ] = [ options, size ];
          console.warn('[StreamSaver] Depricated pass an object as 2nd argument when creating a write stream');
          opts.size = size;
          opts.writableStrategy = options;
        } else if (options && options.highWaterMark) {
          console.warn('[StreamSaver] Depricated pass an object as 2nd argument when creating a write stream');
          opts.size = size;
          opts.writableStrategy = options;
        } else {
          opts = options || {};
        }
        if (!useBlobFallback) {
          loadTransporter();

          var bytesWritten = 0; // by StreamSaver.js (not the service worker)
          var downloadUrl = null;
          var channel = new MessageChannel();

          // Make filename RFC5987 compatible
          filename = encodeURIComponent(filename.replace(/\//g, ':'))
            .replace(/['()]/g, escape)
            .replace(/\*/g, '%2A');

          const response = {
            transferringReadable: supportsTransferable,
            pathname: opts.pathname || Math.random().toString().slice(-6) + '/' + filename,
            headers: {
              'Content-Type': 'application/octet-stream; charset=utf-8',
              'Content-Disposition': "attachment; filename*=UTF-8''" + filename
            }
          };

          if (opts.size) {
            response.headers['Content-Length'] = opts.size;
          }

          const args = [ response, '*', [ channel.port2 ] ];

          if (supportsTransferable) {
            const transformer = downloadStrategy === 'iframe' ? undefined : {
              // This transformer & flush method is only used by insecure context.
              transform (chunk, controller) {
                bytesWritten += chunk.length;
                controller.enqueue(chunk);

                if (downloadUrl) {
                  location.href = downloadUrl;
                  downloadUrl = null;
                }
              },
              flush () {
                if (downloadUrl) {
                  location.href = downloadUrl;
                }
              }
            };
            var ts = new streamSaver.TransformStream(
              transformer,
              opts.writableStrategy,
              opts.readableStrategy
            );
            const readableStream = ts.readable;

            channel.port1.postMessage({ readableStream }, [ readableStream ]);
          }

          channel.port1.onmessage = evt => {
            // Service worker sent us a link that we should open.
            if (evt.data.download) {
              // Special treatment for popup...
              if (downloadStrategy === 'navigate') {
                mitmTransporter.remove();
                mitmTransporter = null;
                if (bytesWritten) {
                  location.href = evt.data.download;
                } else {
                  downloadUrl = evt.data.download;
                }
              } else {
                if (mitmTransporter.isPopup) {
                  mitmTransporter.remove();
                  // Special case for firefox, they can keep sw alive with fetch
                  if (downloadStrategy === 'iframe') {
                    makeIframe(streamSaver.mitm);
                  }
                }

                // We never remove this iframes b/c it can interrupt saving
                makeIframe(evt.data.download);
              }
            }
          };

          if (mitmTransporter.loaded) {
            mitmTransporter.postMessage(...args);
          } else {
            mitmTransporter.addEventListener('load', () => {
              mitmTransporter.postMessage(...args);
            }, { once: true });
          }
        }

        let chunks = [];

        return (!useBlobFallback && ts && ts.writable) || new streamSaver.WritableStream({
          write (chunk) {
            if (useBlobFallback) {
              // Safari... The new IE6
              // https://github.com/jimmywarting/StreamSaver.js/issues/69
              //
              // even doe it has everything it fails to download anything
              // that comes from the service worker..!
              chunks.push(chunk);
              return
            }

            // is called when a new chunk of data is ready to be written
            // to the underlying sink. It can return a promise to signal
            // success or failure of the write operation. The stream
            // implementation guarantees that this method will be called
            // only after previous writes have succeeded, and never after
            // close or abort is called.

            // TODO: Kind of important that service worker respond back when
            // it has been written. Otherwise we can't handle backpressure
            // EDIT: Transfarable streams solvs this...
            channel.port1.postMessage(chunk);
            bytesWritten += chunk.length;

            if (downloadUrl) {
              location.href = downloadUrl;
              downloadUrl = null;
            }
          },
          close () {
            if (useBlobFallback) {
              const blob = new Blob(chunks, { type: 'application/octet-stream; charset=utf-8' });
              const link = document.createElement('a');
              link.href = URL.createObjectURL(blob);
              link.download = filename;
              link.click();
            } else {
              channel.port1.postMessage('end');
            }
          },
          abort () {
            chunks = [];
            channel.port1.postMessage('abort');
            channel.port1.onmessage = null;
            channel.port1.close();
            channel.port2.close();
            channel = null;
          }
        }, opts.writableStrategy)
      }

      return streamSaver
    });
    });

    /* src\components\paramsBuilder.svelte generated by Svelte v3.12.1 */

    const file = "src\\components\\paramsBuilder.svelte";

    function get_each_context_2(ctx, list, i) {
    	const child_ctx = Object.create(ctx);
    	child_ctx.choice = list[i];
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = Object.create(ctx);
    	child_ctx.choice = list[i];
    	return child_ctx;
    }

    function get_each_context(ctx, list, i) {
    	const child_ctx = Object.create(ctx);
    	child_ctx.key = list[i][0];
    	child_ctx.val = list[i][1];
    	child_ctx.index = i;
    	return child_ctx;
    }

    // (61:4) {#if (!isDisabled(key, props))}
    function create_if_block(ctx) {
    	var div0, t0_value = ctx.key + "", t0, t1, div1, show_if, t2, index = ctx.index, div1_class_value, div1_data_tooltip_value, dispose;

    	function select_block_type(changed, ctx) {
    		if ((show_if == null) || changed.props) show_if = !!(Array.isArray(ctx.val.type));
    		if (show_if) return create_if_block_1;
    		if (ctx.val.type === 'number') return create_if_block_2;
    		if (ctx.val.type === 'string') return create_if_block_3;
    		if (ctx.val.type === 'auto') return create_if_block_4;
    		return create_else_block;
    	}

    	var current_block_type = select_block_type(null, ctx);
    	var if_block = current_block_type(ctx);

    	const assign_div1 = () => ctx.div1_binding(div1, index);
    	const unassign_div1 = () => ctx.div1_binding(null, index);

    	function mouseover_handler(...args) {
    		return ctx.mouseover_handler(ctx, ...args);
    	}

    	const block = {
    		c: function create() {
    			div0 = element("div");
    			t0 = text(t0_value);
    			t1 = space();
    			div1 = element("div");
    			if_block.c();
    			t2 = space();
    			attr_dev(div0, "class", "input-title svelte-1ko1yj5");
    			add_location(div0, file, 61, 8, 1444);
    			attr_dev(div1, "class", div1_class_value = "" + null_to_empty(((ctx.index !== Object.keys(ctx.props).length - 1) ? 'tooltip-left' : 'tooltip-up-left')) + " svelte-1ko1yj5");
    			attr_dev(div1, "data-tooltip", div1_data_tooltip_value = ctx.val.description);
    			add_location(div1, file, 62, 8, 1490);
    			dispose = listen_dev(div1, "mouseover", mouseover_handler);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, div0, anchor);
    			append_dev(div0, t0);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, div1, anchor);
    			if_block.m(div1, null);
    			append_dev(div1, t2);
    			assign_div1();
    		},

    		p: function update(changed, new_ctx) {
    			ctx = new_ctx;
    			if ((changed.props) && t0_value !== (t0_value = ctx.key + "")) {
    				set_data_dev(t0, t0_value);
    			}

    			if (current_block_type === (current_block_type = select_block_type(changed, ctx)) && if_block) {
    				if_block.p(changed, ctx);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);
    				if (if_block) {
    					if_block.c();
    					if_block.m(div1, t2);
    				}
    			}

    			if (index !== ctx.index) {
    				unassign_div1();
    				index = ctx.index;
    				assign_div1();
    			}

    			if ((changed.props) && div1_class_value !== (div1_class_value = "" + null_to_empty(((ctx.index !== Object.keys(ctx.props).length - 1) ? 'tooltip-left' : 'tooltip-up-left')) + " svelte-1ko1yj5")) {
    				attr_dev(div1, "class", div1_class_value);
    			}

    			if ((changed.props) && div1_data_tooltip_value !== (div1_data_tooltip_value = ctx.val.description)) {
    				attr_dev(div1, "data-tooltip", div1_data_tooltip_value);
    			}
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(div0);
    				detach_dev(t1);
    				detach_dev(div1);
    			}

    			if_block.d();
    			unassign_div1();
    			dispose();
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block.name, type: "if", source: "(61:4) {#if (!isDisabled(key, props))}", ctx });
    	return block;
    }

    // (90:8) {:else}
    function create_else_block(ctx) {
    	var select, t, input, dispose;

    	let each_value_2 = JSON.parse(ctx.val.options);

    	let each_blocks = [];

    	for (let i = 0; i < each_value_2.length; i += 1) {
    		each_blocks[i] = create_each_block_2(get_each_context_2(ctx, each_value_2, i));
    	}

    	function select_change_handler_1() {
    		ctx.select_change_handler_1.call(select, ctx);
    	}

    	function input_input_handler_3() {
    		ctx.input_input_handler_3.call(input, ctx);
    	}

    	const block = {
    		c: function create() {
    			select = element("select");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t = space();
    			input = element("input");
    			if (ctx.props[ctx.key].value === void 0) add_render_callback(select_change_handler_1);
    			attr_dev(select, "class", "svelte-1ko1yj5");
    			add_location(select, file, 90, 12, 3070);
    			attr_dev(input, "type", "text");
    			attr_dev(input, "class", "svelte-1ko1yj5");
    			add_location(input, file, 95, 12, 3369);

    			dispose = [
    				listen_dev(select, "change", select_change_handler_1),
    				listen_dev(select, "change", ctx.change_handler_3),
    				listen_dev(input, "input", input_input_handler_3),
    				listen_dev(input, "change", ctx.change_handler_4)
    			];
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, select, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(select, null);
    			}

    			select_option(select, ctx.props[ctx.key].value);

    			insert_dev(target, t, anchor);
    			insert_dev(target, input, anchor);

    			set_input_value(input, ctx.props[ctx.key].value);
    		},

    		p: function update(changed, new_ctx) {
    			ctx = new_ctx;
    			if (changed.props) {
    				each_value_2 = JSON.parse(ctx.val.options);

    				let i;
    				for (i = 0; i < each_value_2.length; i += 1) {
    					const child_ctx = get_each_context_2(ctx, each_value_2, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(changed, child_ctx);
    					} else {
    						each_blocks[i] = create_each_block_2(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(select, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}
    				each_blocks.length = each_value_2.length;
    			}

    			if (changed.props) select_option(select, ctx.props[ctx.key].value);
    			if (changed.props && (input.value !== ctx.props[ctx.key].value)) set_input_value(input, ctx.props[ctx.key].value);
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(select);
    			}

    			destroy_each(each_blocks, detaching);

    			if (detaching) {
    				detach_dev(t);
    				detach_dev(input);
    			}

    			run_all(dispose);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_else_block.name, type: "else", source: "(90:8) {:else}", ctx });
    	return block;
    }

    // (88:38) 
    function create_if_block_4(ctx) {
    	var input, dispose;

    	function input_input_handler_2() {
    		ctx.input_input_handler_2.call(input, ctx);
    	}

    	const block = {
    		c: function create() {
    			input = element("input");
    			attr_dev(input, "type", "text");
    			input.disabled = true;
    			attr_dev(input, "class", "svelte-1ko1yj5");
    			add_location(input, file, 88, 12, 2978);
    			dispose = listen_dev(input, "input", input_input_handler_2);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, input, anchor);

    			set_input_value(input, ctx.props[ctx.key].value);
    		},

    		p: function update(changed, new_ctx) {
    			ctx = new_ctx;
    			if (changed.props && (input.value !== ctx.props[ctx.key].value)) set_input_value(input, ctx.props[ctx.key].value);
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(input);
    			}

    			dispose();
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block_4.name, type: "if", source: "(88:38) ", ctx });
    	return block;
    }

    // (86:40) 
    function create_if_block_3(ctx) {
    	var input, dispose;

    	function input_input_handler_1() {
    		ctx.input_input_handler_1.call(input, ctx);
    	}

    	const block = {
    		c: function create() {
    			input = element("input");
    			attr_dev(input, "type", "text");
    			attr_dev(input, "class", "svelte-1ko1yj5");
    			add_location(input, file, 86, 12, 2831);

    			dispose = [
    				listen_dev(input, "input", input_input_handler_1),
    				listen_dev(input, "change", ctx.change_handler_2)
    			];
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, input, anchor);

    			set_input_value(input, ctx.props[ctx.key].value);
    		},

    		p: function update(changed, new_ctx) {
    			ctx = new_ctx;
    			if (changed.props && (input.value !== ctx.props[ctx.key].value)) set_input_value(input, ctx.props[ctx.key].value);
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(input);
    			}

    			run_all(dispose);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block_3.name, type: "if", source: "(86:40) ", ctx });
    	return block;
    }

    // (84:40) 
    function create_if_block_2(ctx) {
    	var input, input_updating = false, dispose;

    	function input_input_handler() {
    		input_updating = true;
    		ctx.input_input_handler.call(input, ctx);
    	}

    	const block = {
    		c: function create() {
    			input = element("input");
    			attr_dev(input, "type", "number");
    			attr_dev(input, "class", "svelte-1ko1yj5");
    			add_location(input, file, 84, 12, 2679);

    			dispose = [
    				listen_dev(input, "input", input_input_handler),
    				listen_dev(input, "change", ctx.change_handler_1)
    			];
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, input, anchor);

    			set_input_value(input, ctx.props[ctx.key].value);
    		},

    		p: function update(changed, new_ctx) {
    			ctx = new_ctx;
    			if (!input_updating && changed.props) set_input_value(input, ctx.props[ctx.key].value);
    			input_updating = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(input);
    			}

    			run_all(dispose);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block_2.name, type: "if", source: "(84:40) ", ctx });
    	return block;
    }

    // (78:8) {#if Array.isArray(val.type)}
    function create_if_block_1(ctx) {
    	var select, dispose;

    	let each_value_1 = ctx.val.type;

    	let each_blocks = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	function select_change_handler() {
    		ctx.select_change_handler.call(select, ctx);
    	}

    	const block = {
    		c: function create() {
    			select = element("select");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}
    			if (ctx.props[ctx.key].value === void 0) add_render_callback(select_change_handler);
    			attr_dev(select, "class", "svelte-1ko1yj5");
    			add_location(select, file, 78, 12, 2353);

    			dispose = [
    				listen_dev(select, "change", select_change_handler),
    				listen_dev(select, "change", ctx.change_handler)
    			];
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, select, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(select, null);
    			}

    			select_option(select, ctx.props[ctx.key].value);
    		},

    		p: function update(changed, new_ctx) {
    			ctx = new_ctx;
    			if (changed.props) {
    				each_value_1 = ctx.val.type;

    				let i;
    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(changed, child_ctx);
    					} else {
    						each_blocks[i] = create_each_block_1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(select, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}
    				each_blocks.length = each_value_1.length;
    			}

    			if (changed.props) select_option(select, ctx.props[ctx.key].value);
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(select);
    			}

    			destroy_each(each_blocks, detaching);

    			run_all(dispose);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block_1.name, type: "if", source: "(78:8) {#if Array.isArray(val.type)}", ctx });
    	return block;
    }

    // (92:16) {#each JSON.parse(val.options) as choice}
    function create_each_block_2(ctx) {
    	var option, t_value = ctx.choice + "", t, option_value_value, option_selected_value;

    	const block = {
    		c: function create() {
    			option = element("option");
    			t = text(t_value);
    			option.__value = option_value_value = ctx.choice;
    			option.value = option.__value;
    			option.selected = option_selected_value = ctx.choice === ctx.val.value;
    			add_location(option, file, 92, 20, 3231);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, option, anchor);
    			append_dev(option, t);
    		},

    		p: function update(changed, ctx) {
    			if ((changed.props) && t_value !== (t_value = ctx.choice + "")) {
    				set_data_dev(t, t_value);
    			}

    			if ((changed.props) && option_value_value !== (option_value_value = ctx.choice)) {
    				prop_dev(option, "__value", option_value_value);
    			}

    			option.value = option.__value;

    			if ((changed.props) && option_selected_value !== (option_selected_value = ctx.choice === ctx.val.value)) {
    				prop_dev(option, "selected", option_selected_value);
    			}
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(option);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_each_block_2.name, type: "each", source: "(92:16) {#each JSON.parse(val.options) as choice}", ctx });
    	return block;
    }

    // (80:16) {#each val.type as choice}
    function create_each_block_1(ctx) {
    	var option, t_value = ctx.choice + "", t, option_value_value, option_selected_value;

    	const block = {
    		c: function create() {
    			option = element("option");
    			t = text(t_value);
    			option.__value = option_value_value = ctx.choice;
    			option.value = option.__value;
    			option.selected = option_selected_value = ctx.choice === ctx.val.value;
    			add_location(option, file, 80, 20, 2499);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, option, anchor);
    			append_dev(option, t);
    		},

    		p: function update(changed, ctx) {
    			if ((changed.props) && t_value !== (t_value = ctx.choice + "")) {
    				set_data_dev(t, t_value);
    			}

    			if ((changed.props) && option_value_value !== (option_value_value = ctx.choice)) {
    				prop_dev(option, "__value", option_value_value);
    			}

    			option.value = option.__value;

    			if ((changed.props) && option_selected_value !== (option_selected_value = ctx.choice === ctx.val.value)) {
    				prop_dev(option, "selected", option_selected_value);
    			}
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(option);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_each_block_1.name, type: "each", source: "(80:16) {#each val.type as choice}", ctx });
    	return block;
    }

    // (60:0) {#each Object.entries(props) as [key, val], index}
    function create_each_block(ctx) {
    	var show_if = (!ctx.isDisabled(ctx.key, ctx.props)), if_block_anchor;

    	var if_block = (show_if) && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},

    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    		},

    		p: function update(changed, ctx) {
    			if (changed.isDisabled || changed.props) show_if = (!ctx.isDisabled(ctx.key, ctx.props));

    			if (show_if) {
    				if (if_block) {
    					if_block.p(changed, ctx);
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

    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);

    			if (detaching) {
    				detach_dev(if_block_anchor);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_each_block.name, type: "each", source: "(60:0) {#each Object.entries(props) as [key, val], index}", ctx });
    	return block;
    }

    function create_fragment(ctx) {
    	var each_1_anchor;

    	let each_value = Object.entries(ctx.props);

    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each_1_anchor, anchor);
    		},

    		p: function update(changed, ctx) {
    			if (changed.isDisabled || changed.props || changed.items) {
    				each_value = Object.entries(ctx.props);

    				let i;
    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(changed, child_ctx);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
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

    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			destroy_each(each_blocks, detaching);

    			if (detaching) {
    				detach_dev(each_1_anchor);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment.name, type: "component", source: "", ctx });
    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { props = {}, isDisabled = false } = $$props;
        let items = [];

        const dispatch = createEventDispatcher();

    	const writable_props = ['props', 'isDisabled'];
    	Object.keys($$props).forEach(key => {
    		if (!writable_props.includes(key) && !key.startsWith('$$')) console.warn(`<ParamsBuilder> was created with unknown prop '${key}'`);
    	});

    	function select_change_handler({ key }) {
    		props[key].value = select_value(this);
    		$$invalidate('props', props);
    	}

    	const change_handler = () => dispatch('dataChanged');

    	function input_input_handler({ key }) {
    		props[key].value = to_number(this.value);
    		$$invalidate('props', props);
    	}

    	const change_handler_1 = () => dispatch('dataChanged');

    	function input_input_handler_1({ key }) {
    		props[key].value = this.value;
    		$$invalidate('props', props);
    	}

    	const change_handler_2 = () => dispatch('dataChanged');

    	function input_input_handler_2({ key }) {
    		props[key].value = this.value;
    		$$invalidate('props', props);
    	}

    	function select_change_handler_1({ key }) {
    		props[key].value = select_value(this);
    		$$invalidate('props', props);
    	}

    	const change_handler_3 = () => dispatch('dataChanged');

    	function input_input_handler_3({ key }) {
    		props[key].value = this.value;
    		$$invalidate('props', props);
    	}

    	const change_handler_4 = () => dispatch('dataChanged');

    	function div1_binding($$value, index) {
    		if (items[index] === $$value) return;
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			items[index] = $$value;
    			$$invalidate('items', items);
    		});
    	}

    	const mouseover_handler = ({ index }, evt) => {
    	                let self = items[index];
    	                let bounds = self.getBoundingClientRect();
    	                let styles = window.getComputedStyle(self, ':after');
    	                self.style.setProperty('--position-right', `${bounds.left - 5}px`);
    	                self.style.setProperty('--position-top', `${
	                    (bounds.top + parseInt(styles.getPropertyValue('height')) > window.innerHeight) ? 
	                    window.innerHeight - parseInt(styles.getPropertyValue('height')) - 10 : bounds.top 
	                }px`);
    	            };

    	$$self.$set = $$props => {
    		if ('props' in $$props) $$invalidate('props', props = $$props.props);
    		if ('isDisabled' in $$props) $$invalidate('isDisabled', isDisabled = $$props.isDisabled);
    	};

    	$$self.$capture_state = () => {
    		return { props, isDisabled, items };
    	};

    	$$self.$inject_state = $$props => {
    		if ('props' in $$props) $$invalidate('props', props = $$props.props);
    		if ('isDisabled' in $$props) $$invalidate('isDisabled', isDisabled = $$props.isDisabled);
    		if ('items' in $$props) $$invalidate('items', items = $$props.items);
    	};

    	return {
    		props,
    		isDisabled,
    		items,
    		dispatch,
    		select_change_handler,
    		change_handler,
    		input_input_handler,
    		change_handler_1,
    		input_input_handler_1,
    		change_handler_2,
    		input_input_handler_2,
    		select_change_handler_1,
    		change_handler_3,
    		input_input_handler_3,
    		change_handler_4,
    		div1_binding,
    		mouseover_handler
    	};
    }

    class ParamsBuilder extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, ["props", "isDisabled"]);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "ParamsBuilder", options, id: create_fragment.name });
    	}

    	get props() {
    		throw new Error("<ParamsBuilder>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set props(value) {
    		throw new Error("<ParamsBuilder>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get isDisabled() {
    		throw new Error("<ParamsBuilder>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set isDisabled(value) {
    		throw new Error("<ParamsBuilder>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\components\timeline.svelte generated by Svelte v3.12.1 */

    const file$1 = "src\\components\\timeline.svelte";

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = Object.create(ctx);
    	child_ctx.win = list[i];
    	child_ctx.i = i;
    	return child_ctx;
    }

    // (164:2) {#each windows as win, i}
    function create_each_block$1(ctx) {
    	var div, p, t_value = ctx.win.meta.name + "", t, dispose;

    	function click_handler_1() {
    		return ctx.click_handler_1(ctx);
    	}

    	const block = {
    		c: function create() {
    			div = element("div");
    			p = element("p");
    			t = text(t_value);
    			set_style(p, "justify-self", "center");
    			set_style(p, "align-self", "center");
    			set_style(p, "margin", "0");
    			set_style(p, "position", "absolute");
    			add_location(p, file$1, 176, 4, 4878);
    			attr_dev(div, "class", "window");
    			set_style(div, "height", "100%");
    			set_style(div, "flex-grow", ctx.win.data.AG_WINDOW_LENGTH.value);
    			set_style(div, "background-color", ctx.win.meta.color);
    			set_style(div, "border-right", ((ctx.i !== ctx.windows.length - 1) ? '1px solid black' : 'none'));
    			set_style(div, "display", "grid");
    			set_style(div, "position", "relative");
    			set_style(div, "box-shadow", (ctx.anim.windowIndex == ctx.i ? 'inset 0 0 5px black' : 'none'));
    			add_location(div, file$1, 164, 3, 4394);
    			dispose = listen_dev(div, "click", click_handler_1);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, p);
    			append_dev(p, t);
    		},

    		p: function update(changed, new_ctx) {
    			ctx = new_ctx;
    			if ((changed.windows) && t_value !== (t_value = ctx.win.meta.name + "")) {
    				set_data_dev(t, t_value);
    			}

    			if (changed.windows) {
    				set_style(div, "flex-grow", ctx.win.data.AG_WINDOW_LENGTH.value);
    				set_style(div, "background-color", ctx.win.meta.color);
    				set_style(div, "border-right", ((ctx.i !== ctx.windows.length - 1) ? '1px solid black' : 'none'));
    			}

    			if (changed.anim) {
    				set_style(div, "box-shadow", (ctx.anim.windowIndex == ctx.i ? 'inset 0 0 5px black' : 'none'));
    			}
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(div);
    			}

    			dispose();
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_each_block$1.name, type: "each", source: "(164:2) {#each windows as win, i}", ctx });
    	return block;
    }

    // (197:39) 
    function create_if_block_3$1(ctx) {
    	var input, dispose;

    	const block = {
    		c: function create() {
    			input = element("input");
    			attr_dev(input, "type", "text");
    			add_location(input, file$1, 197, 5, 5541);
    			dispose = listen_dev(input, "input", ctx.input_input_handler_2);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, input, anchor);

    			set_input_value(input, ctx.hitboxes[ctx.hitboxes.selected].meta.name);
    		},

    		p: function update(changed, ctx) {
    			if (changed.hitboxes && (input.value !== ctx.hitboxes[ctx.hitboxes.selected].meta.name)) set_input_value(input, ctx.hitboxes[ctx.hitboxes.selected].meta.name);
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(input);
    			}

    			dispose();
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block_3$1.name, type: "if", source: "(197:39) ", ctx });
    	return block;
    }

    // (195:4) {#if editingMode === 'window'}
    function create_if_block_2$1(ctx) {
    	var input, dispose;

    	const block = {
    		c: function create() {
    			input = element("input");
    			attr_dev(input, "type", "text");
    			add_location(input, file$1, 195, 5, 5425);
    			dispose = listen_dev(input, "input", ctx.input_input_handler_1);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, input, anchor);

    			set_input_value(input, ctx.windows[ctx.anim.windowIndex].meta.name);
    		},

    		p: function update(changed, ctx) {
    			if ((changed.windows || changed.anim) && (input.value !== ctx.windows[ctx.anim.windowIndex].meta.name)) set_input_value(input, ctx.windows[ctx.anim.windowIndex].meta.name);
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(input);
    			}

    			dispose();
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block_2$1.name, type: "if", source: "(195:4) {#if editingMode === 'window'}", ctx });
    	return block;
    }

    // (205:39) 
    function create_if_block_1$1(ctx) {
    	var input, dispose;

    	const block = {
    		c: function create() {
    			input = element("input");
    			attr_dev(input, "type", "text");
    			add_location(input, file$1, 205, 5, 5850);
    			dispose = listen_dev(input, "input", ctx.input_input_handler_4);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, input, anchor);

    			set_input_value(input, ctx.hitboxes[ctx.hitboxes.selected].meta.color);
    		},

    		p: function update(changed, ctx) {
    			if (changed.hitboxes && (input.value !== ctx.hitboxes[ctx.hitboxes.selected].meta.color)) set_input_value(input, ctx.hitboxes[ctx.hitboxes.selected].meta.color);
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(input);
    			}

    			dispose();
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block_1$1.name, type: "if", source: "(205:39) ", ctx });
    	return block;
    }

    // (203:4) {#if editingMode === 'window'}
    function create_if_block$1(ctx) {
    	var input, dispose;

    	const block = {
    		c: function create() {
    			input = element("input");
    			attr_dev(input, "type", "text");
    			add_location(input, file$1, 203, 5, 5733);
    			dispose = listen_dev(input, "input", ctx.input_input_handler_3);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, input, anchor);

    			set_input_value(input, ctx.windows[ctx.anim.windowIndex].meta.color);
    		},

    		p: function update(changed, ctx) {
    			if ((changed.windows || changed.anim) && (input.value !== ctx.windows[ctx.anim.windowIndex].meta.color)) set_input_value(input, ctx.windows[ctx.anim.windowIndex].meta.color);
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(input);
    			}

    			dispose();
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block$1.name, type: "if", source: "(203:4) {#if editingMode === 'window'}", ctx });
    	return block;
    }

    function create_fragment$1(ctx) {
    	var div4, div1, input, input_updating = false, input_max_value, t0, p, t1, label0, t2_value = ctx.anim.animFrame + 1 + "", t2, label0_class_value, t3, t4_value = ctx.anim.duration + "", t4, t5, t6, div0, t7, t8_value = ctx.anim.windowIndex + 1 + "", t8, t9, t10_value = ctx.windows.length + "", t10, t11, button0, i0, t13, button1, i1, button1_disabled_value, t15, div2, button2, i2, t17, button3, i3, button3_disabled_value, t19, button4, i4, t20_value = ctx.anim.playing ? 'pause' : 'play_arrow' + "", t20, t21, button5, i5, button5_disabled_value, t23, div3, t24, select, option0, option1, option2, t28, div6, t29, div5, t30, div8, div7, label1, t31, t32, label2, t33, dispose;

    	function input_input_handler() {
    		input_updating = true;
    		ctx.input_input_handler.call(input);
    	}

    	let each_value = ctx.windows;

    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
    	}

    	function select_block_type(changed, ctx) {
    		if (ctx.editingMode === 'window') return create_if_block_2$1;
    		if (ctx.editingMode === 'hitbox') return create_if_block_3$1;
    	}

    	var current_block_type = select_block_type(null, ctx);
    	var if_block0 = current_block_type && current_block_type(ctx);

    	function select_block_type_1(changed, ctx) {
    		if (ctx.editingMode === 'window') return create_if_block$1;
    		if (ctx.editingMode === 'hitbox') return create_if_block_1$1;
    	}

    	var current_block_type_1 = select_block_type_1(null, ctx);
    	var if_block1 = current_block_type_1 && current_block_type_1(ctx);

    	const block = {
    		c: function create() {
    			div4 = element("div");
    			div1 = element("div");
    			input = element("input");
    			t0 = space();
    			p = element("p");
    			t1 = text("frame: ");
    			label0 = element("label");
    			t2 = text(t2_value);
    			t3 = text(" / ");
    			t4 = text(t4_value);
    			t5 = text(";");
    			t6 = space();
    			div0 = element("div");
    			t7 = text("window: ");
    			t8 = text(t8_value);
    			t9 = text(" / ");
    			t10 = text(t10_value);
    			t11 = space();
    			button0 = element("button");
    			i0 = element("i");
    			i0.textContent = "add";
    			t13 = space();
    			button1 = element("button");
    			i1 = element("i");
    			i1.textContent = "delete";
    			t15 = space();
    			div2 = element("div");
    			button2 = element("button");
    			i2 = element("i");
    			i2.textContent = "loop";
    			t17 = space();
    			button3 = element("button");
    			i3 = element("i");
    			i3.textContent = "skip_previous";
    			t19 = space();
    			button4 = element("button");
    			i4 = element("i");
    			t20 = text(t20_value);
    			t21 = space();
    			button5 = element("button");
    			i5 = element("i");
    			i5.textContent = "skip_next";
    			t23 = space();
    			div3 = element("div");
    			t24 = text("playback speed:\r\n\t\t\t");
    			select = element("select");
    			option0 = element("option");
    			option0.textContent = "1/4x";
    			option1 = element("option");
    			option1.textContent = "1/2x";
    			option2 = element("option");
    			option2.textContent = "1x";
    			t28 = space();
    			div6 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t29 = space();
    			div5 = element("div");
    			t30 = space();
    			div8 = element("div");
    			div7 = element("div");
    			label1 = element("label");
    			t31 = text("name:\r\n\t\t\t\t");
    			if (if_block0) if_block0.c();
    			t32 = space();
    			label2 = element("label");
    			t33 = text("color:\r\n\t\t\t\t");
    			if (if_block1) if_block1.c();
    			attr_dev(input, "type", "number");
    			attr_dev(input, "id", "current-frame");
    			attr_dev(input, "min", "0");
    			attr_dev(input, "max", input_max_value = ctx.anim.duration - 1);
    			attr_dev(input, "class", "svelte-1v3rt8w");
    			add_location(input, file$1, 122, 3, 2544);
    			set_style(label0, "width", "" + (ctx.anim.duration.toString().length * 10 + 10) + "px");
    			attr_dev(label0, "id", "current-frame-label");
    			attr_dev(label0, "class", label0_class_value = "" + null_to_empty(((ctx.isCurrentFrameFocused) ? 'active' : '')) + " svelte-1v3rt8w");
    			attr_dev(label0, "for", "current-frame");
    			add_location(label0, file$1, 130, 11, 2871);
    			set_style(p, "width", "150px");
    			set_style(p, "margin", "0");
    			set_style(p, "display", "inline-block");
    			add_location(p, file$1, 129, 3, 2800);
    			attr_dev(i0, "class", "material-icons svelte-1v3rt8w");
    			add_location(i0, file$1, 143, 44, 3341);
    			add_location(button0, file$1, 143, 4, 3301);
    			attr_dev(i1, "class", "material-icons svelte-1v3rt8w");
    			add_location(i1, file$1, 144, 77, 3462);
    			button1.disabled = button1_disabled_value = ctx.windows.length <= 1;
    			attr_dev(button1, "class", "svelte-1v3rt8w");
    			add_location(button1, file$1, 144, 4, 3389);
    			set_style(div0, "width", "400px");
    			set_style(div0, "margin", "0");
    			set_style(div0, "display", "inline-block");
    			add_location(div0, file$1, 141, 3, 3180);
    			attr_dev(div1, "class", "option-group svelte-1v3rt8w");
    			set_style(div1, "justify-self", "left");
    			add_location(div1, file$1, 121, 2, 2486);
    			attr_dev(i2, "class", "material-icons svelte-1v3rt8w");
    			add_location(i2, file$1, 148, 53, 3643);
    			add_location(button2, file$1, 148, 3, 3593);
    			attr_dev(i3, "class", "material-icons svelte-1v3rt8w");
    			add_location(i3, file$1, 149, 65, 3753);
    			button3.disabled = button3_disabled_value = ctx.anim.animFrame === 0;
    			attr_dev(button3, "class", "svelte-1v3rt8w");
    			add_location(button3, file$1, 149, 3, 3691);
    			attr_dev(i4, "class", "material-icons svelte-1v3rt8w");
    			add_location(i4, file$1, 150, 35, 3842);
    			add_location(button4, file$1, 150, 3, 3810);
    			attr_dev(i5, "class", "material-icons svelte-1v3rt8w");
    			add_location(i5, file$1, 151, 82, 4004);
    			button5.disabled = button5_disabled_value = ctx.anim.animFrame === ctx.anim.duration - 1;
    			attr_dev(button5, "class", "svelte-1v3rt8w");
    			add_location(button5, file$1, 151, 3, 3925);
    			attr_dev(div2, "class", "option-group svelte-1v3rt8w");
    			set_style(div2, "justify-self", "center");
    			add_location(div2, file$1, 147, 2, 3532);
    			option0.__value = "0.25";
    			option0.value = option0.__value;
    			add_location(option0, file$1, 156, 4, 4188);
    			option1.__value = "0.5";
    			option1.value = option1.__value;
    			add_location(option1, file$1, 157, 4, 4228);
    			option2.__value = "1";
    			option2.value = option2.__value;
    			option2.selected = true;
    			add_location(option2, file$1, 158, 4, 4267);
    			if (ctx.anim.playSpeed === void 0) add_render_callback(() => ctx.select_change_handler.call(select));
    			add_location(select, file$1, 155, 3, 4146);
    			attr_dev(div3, "class", "option-group svelte-1v3rt8w");
    			set_style(div3, "justify-self", "right");
    			add_location(div3, file$1, 153, 2, 4066);
    			attr_dev(div4, "id", "timeline-controls");
    			attr_dev(div4, "class", "svelte-1v3rt8w");
    			add_location(div4, file$1, 120, 0, 2454);
    			attr_dev(div5, "id", "playhead");
    			set_style(div5, "height", "100%");
    			set_style(div5, "width", "2px");
    			set_style(div5, "background-color", "#8888");
    			set_style(div5, "box-shadow", "0 0 0 1px #000");
    			set_style(div5, "position", "absolute");
    			set_style(div5, "margin-left", "" + ((ctx.anim.duration != 0) ? ctx.anim.animFrame * 100 / ctx.anim.duration : 0) + "%");
    			add_location(div5, file$1, 179, 2, 5007);
    			attr_dev(div6, "id", "timeline");
    			attr_dev(div6, "class", "svelte-1v3rt8w");
    			add_location(div6, file$1, 162, 1, 4341);
    			set_style(label1, "display", "inline-block");
    			add_location(label1, file$1, 192, 3, 5333);
    			set_style(label2, "display", "inline-block");
    			add_location(label2, file$1, 200, 3, 5640);
    			attr_dev(div7, "class", "option-group svelte-1v3rt8w");
    			add_location(div7, file$1, 191, 2, 5302);
    			attr_dev(div8, "id", "window-metadata");
    			attr_dev(div8, "class", "svelte-1v3rt8w");
    			add_location(div8, file$1, 190, 1, 5272);

    			dispose = [
    				listen_dev(input, "input", input_input_handler),
    				listen_dev(input, "focus", ctx.focus_handler),
    				listen_dev(input, "blur", ctx.blur_handler),
    				listen_dev(button0, "click", ctx.handleWindowAddition),
    				listen_dev(button1, "click", ctx.handleWindowDeletion),
    				listen_dev(button2, "click", ctx.click_handler),
    				listen_dev(button3, "click", ctx.skipBack),
    				listen_dev(button4, "click", ctx.startPlaying),
    				listen_dev(button5, "click", ctx.skipAhead),
    				listen_dev(select, "change", ctx.select_change_handler)
    			];
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, div4, anchor);
    			append_dev(div4, div1);
    			append_dev(div1, input);

    			set_input_value(input, ctx.anim.animFrame);

    			append_dev(div1, t0);
    			append_dev(div1, p);
    			append_dev(p, t1);
    			append_dev(p, label0);
    			append_dev(label0, t2);
    			ctx.label0_binding(label0);
    			append_dev(p, t3);
    			append_dev(p, t4);
    			append_dev(p, t5);
    			append_dev(div1, t6);
    			append_dev(div1, div0);
    			append_dev(div0, t7);
    			append_dev(div0, t8);
    			append_dev(div0, t9);
    			append_dev(div0, t10);
    			append_dev(div0, t11);
    			append_dev(div0, button0);
    			append_dev(button0, i0);
    			append_dev(div0, t13);
    			append_dev(div0, button1);
    			append_dev(button1, i1);
    			append_dev(div4, t15);
    			append_dev(div4, div2);
    			append_dev(div2, button2);
    			append_dev(button2, i2);
    			append_dev(div2, t17);
    			append_dev(div2, button3);
    			append_dev(button3, i3);
    			append_dev(div2, t19);
    			append_dev(div2, button4);
    			append_dev(button4, i4);
    			append_dev(i4, t20);
    			append_dev(div2, t21);
    			append_dev(div2, button5);
    			append_dev(button5, i5);
    			append_dev(div4, t23);
    			append_dev(div4, div3);
    			append_dev(div3, t24);
    			append_dev(div3, select);
    			append_dev(select, option0);
    			append_dev(select, option1);
    			append_dev(select, option2);

    			select_option(select, ctx.anim.playSpeed);

    			insert_dev(target, t28, anchor);
    			insert_dev(target, div6, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div6, null);
    			}

    			append_dev(div6, t29);
    			append_dev(div6, div5);
    			insert_dev(target, t30, anchor);
    			insert_dev(target, div8, anchor);
    			append_dev(div8, div7);
    			append_dev(div7, label1);
    			append_dev(label1, t31);
    			if (if_block0) if_block0.m(label1, null);
    			append_dev(div7, t32);
    			append_dev(div7, label2);
    			append_dev(label2, t33);
    			if (if_block1) if_block1.m(label2, null);
    		},

    		p: function update(changed, ctx) {
    			if (!input_updating && changed.anim) set_input_value(input, ctx.anim.animFrame);
    			input_updating = false;

    			if ((changed.anim) && input_max_value !== (input_max_value = ctx.anim.duration - 1)) {
    				attr_dev(input, "max", input_max_value);
    			}

    			if ((changed.anim) && t2_value !== (t2_value = ctx.anim.animFrame + 1 + "")) {
    				set_data_dev(t2, t2_value);
    			}

    			if (changed.anim) {
    				set_style(label0, "width", "" + (ctx.anim.duration.toString().length * 10 + 10) + "px");
    			}

    			if ((changed.isCurrentFrameFocused) && label0_class_value !== (label0_class_value = "" + null_to_empty(((ctx.isCurrentFrameFocused) ? 'active' : '')) + " svelte-1v3rt8w")) {
    				attr_dev(label0, "class", label0_class_value);
    			}

    			if ((changed.anim) && t4_value !== (t4_value = ctx.anim.duration + "")) {
    				set_data_dev(t4, t4_value);
    			}

    			if ((changed.anim) && t8_value !== (t8_value = ctx.anim.windowIndex + 1 + "")) {
    				set_data_dev(t8, t8_value);
    			}

    			if ((changed.windows) && t10_value !== (t10_value = ctx.windows.length + "")) {
    				set_data_dev(t10, t10_value);
    			}

    			if ((changed.windows) && button1_disabled_value !== (button1_disabled_value = ctx.windows.length <= 1)) {
    				prop_dev(button1, "disabled", button1_disabled_value);
    			}

    			if ((changed.anim) && button3_disabled_value !== (button3_disabled_value = ctx.anim.animFrame === 0)) {
    				prop_dev(button3, "disabled", button3_disabled_value);
    			}

    			if ((changed.anim) && t20_value !== (t20_value = ctx.anim.playing ? 'pause' : 'play_arrow' + "")) {
    				set_data_dev(t20, t20_value);
    			}

    			if ((changed.anim) && button5_disabled_value !== (button5_disabled_value = ctx.anim.animFrame === ctx.anim.duration - 1)) {
    				prop_dev(button5, "disabled", button5_disabled_value);
    			}

    			if (changed.anim) select_option(select, ctx.anim.playSpeed);

    			if (changed.windows || changed.anim) {
    				each_value = ctx.windows;

    				let i;
    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$1(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(changed, child_ctx);
    					} else {
    						each_blocks[i] = create_each_block$1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div6, t29);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}
    				each_blocks.length = each_value.length;
    			}

    			if (changed.anim) {
    				set_style(div5, "margin-left", "" + ((ctx.anim.duration != 0) ? ctx.anim.animFrame * 100 / ctx.anim.duration : 0) + "%");
    			}

    			if (current_block_type === (current_block_type = select_block_type(changed, ctx)) && if_block0) {
    				if_block0.p(changed, ctx);
    			} else {
    				if (if_block0) if_block0.d(1);
    				if_block0 = current_block_type && current_block_type(ctx);
    				if (if_block0) {
    					if_block0.c();
    					if_block0.m(label1, null);
    				}
    			}

    			if (current_block_type_1 === (current_block_type_1 = select_block_type_1(changed, ctx)) && if_block1) {
    				if_block1.p(changed, ctx);
    			} else {
    				if (if_block1) if_block1.d(1);
    				if_block1 = current_block_type_1 && current_block_type_1(ctx);
    				if (if_block1) {
    					if_block1.c();
    					if_block1.m(label2, null);
    				}
    			}
    		},

    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(div4);
    			}

    			ctx.label0_binding(null);

    			if (detaching) {
    				detach_dev(t28);
    				detach_dev(div6);
    			}

    			destroy_each(each_blocks, detaching);

    			if (detaching) {
    				detach_dev(t30);
    				detach_dev(div8);
    			}

    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
    			run_all(dispose);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$1.name, type: "component", source: "", ctx });
    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { anim, windows, hitboxes, skipAhead, skipBack, editingMode, winProps, updateStates } = $$props;

        let currentFrameLabel;
    	let isCurrentFrameFocused = false;
    	let fpsMonitor = 0;

        const startPlaying = () => {
    		$$invalidate('anim', anim.playing = !anim.playing, anim);
    		if (anim.playing) play();
    	};
    	const play = () => {
    		if (anim.playing) {
    			requestAnimationFrame(play);
    			$$invalidate('updateStates', updateStates.frames = true, updateStates);
    			fpsMonitor++;
    			if (fpsMonitor >= (1 / anim.playSpeed)) {
    				fpsMonitor = 0;
    				if (anim.animFrame + 1 === anim.duration) { 
    					$$invalidate('anim', anim.animFrame = 0, anim);
    					if (!anim.loop) { $$invalidate('anim', anim.playing = false, anim); }
    				}
    				else { $$invalidate('anim', anim.animFrame += 1, anim);}
    			}
    		}
    	};

    	const handleWindowAddition = () => {
    		windows.splice(anim.windowIndex, 0, {meta: {}, data: JSON.parse(JSON.stringify({...winProps}))} );
    		$$invalidate('anim', anim);
    		$$invalidate('updateStates', updateStates.length = true, updateStates);
    		$$invalidate('updateStates', updateStates.frames = true, updateStates);
    	};
    	const handleWindowDeletion = () => {
    		windows.splice(anim.windowIndex, 1);
    		$$invalidate('anim', anim.animFrame = anim.windowPositions[anim.windowIndex - 1] || 0, anim);
    		$$invalidate('updateStates', updateStates.length = true, updateStates);
    		$$invalidate('updateStates', updateStates.frames = true, updateStates);
    	};

    	const writable_props = ['anim', 'windows', 'hitboxes', 'skipAhead', 'skipBack', 'editingMode', 'winProps', 'updateStates'];
    	Object.keys($$props).forEach(key => {
    		if (!writable_props.includes(key) && !key.startsWith('$$')) console.warn(`<Timeline> was created with unknown prop '${key}'`);
    	});

    	function input_input_handler() {
    		anim.animFrame = to_number(this.value);
    		$$invalidate('anim', anim);
    	}

    	const focus_handler = (evt) => {$$invalidate('isCurrentFrameFocused', isCurrentFrameFocused = true); evt.target.select();};

    	const blur_handler = () => $$invalidate('isCurrentFrameFocused', isCurrentFrameFocused = false);

    	function label0_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			$$invalidate('currentFrameLabel', currentFrameLabel = $$value);
    		});
    	}

    	const click_handler = () => {$$invalidate('anim', anim.loop = !anim.loop, anim);};

    	function select_change_handler() {
    		anim.playSpeed = select_value(this);
    		$$invalidate('anim', anim);
    	}

    	const click_handler_1 = ({ i }) => {$$invalidate('anim', anim.animFrame = anim.windowPositions[i], anim); $$invalidate('updateStates', updateStates.frames = true, updateStates); $$invalidate('editingMode', editingMode = "window");};

    	function input_input_handler_1() {
    		windows[anim.windowIndex].meta.name = this.value;
    		$$invalidate('windows', windows);
    		$$invalidate('anim', anim);
    	}

    	function input_input_handler_2() {
    		hitboxes[hitboxes.selected].meta.name = this.value;
    		$$invalidate('hitboxes', hitboxes);
    	}

    	function input_input_handler_3() {
    		windows[anim.windowIndex].meta.color = this.value;
    		$$invalidate('windows', windows);
    		$$invalidate('anim', anim);
    	}

    	function input_input_handler_4() {
    		hitboxes[hitboxes.selected].meta.color = this.value;
    		$$invalidate('hitboxes', hitboxes);
    	}

    	$$self.$set = $$props => {
    		if ('anim' in $$props) $$invalidate('anim', anim = $$props.anim);
    		if ('windows' in $$props) $$invalidate('windows', windows = $$props.windows);
    		if ('hitboxes' in $$props) $$invalidate('hitboxes', hitboxes = $$props.hitboxes);
    		if ('skipAhead' in $$props) $$invalidate('skipAhead', skipAhead = $$props.skipAhead);
    		if ('skipBack' in $$props) $$invalidate('skipBack', skipBack = $$props.skipBack);
    		if ('editingMode' in $$props) $$invalidate('editingMode', editingMode = $$props.editingMode);
    		if ('winProps' in $$props) $$invalidate('winProps', winProps = $$props.winProps);
    		if ('updateStates' in $$props) $$invalidate('updateStates', updateStates = $$props.updateStates);
    	};

    	$$self.$capture_state = () => {
    		return { anim, windows, hitboxes, skipAhead, skipBack, editingMode, winProps, updateStates, currentFrameLabel, isCurrentFrameFocused, fpsMonitor };
    	};

    	$$self.$inject_state = $$props => {
    		if ('anim' in $$props) $$invalidate('anim', anim = $$props.anim);
    		if ('windows' in $$props) $$invalidate('windows', windows = $$props.windows);
    		if ('hitboxes' in $$props) $$invalidate('hitboxes', hitboxes = $$props.hitboxes);
    		if ('skipAhead' in $$props) $$invalidate('skipAhead', skipAhead = $$props.skipAhead);
    		if ('skipBack' in $$props) $$invalidate('skipBack', skipBack = $$props.skipBack);
    		if ('editingMode' in $$props) $$invalidate('editingMode', editingMode = $$props.editingMode);
    		if ('winProps' in $$props) $$invalidate('winProps', winProps = $$props.winProps);
    		if ('updateStates' in $$props) $$invalidate('updateStates', updateStates = $$props.updateStates);
    		if ('currentFrameLabel' in $$props) $$invalidate('currentFrameLabel', currentFrameLabel = $$props.currentFrameLabel);
    		if ('isCurrentFrameFocused' in $$props) $$invalidate('isCurrentFrameFocused', isCurrentFrameFocused = $$props.isCurrentFrameFocused);
    		if ('fpsMonitor' in $$props) fpsMonitor = $$props.fpsMonitor;
    	};

    	return {
    		anim,
    		windows,
    		hitboxes,
    		skipAhead,
    		skipBack,
    		editingMode,
    		winProps,
    		updateStates,
    		currentFrameLabel,
    		isCurrentFrameFocused,
    		startPlaying,
    		handleWindowAddition,
    		handleWindowDeletion,
    		input_input_handler,
    		focus_handler,
    		blur_handler,
    		label0_binding,
    		click_handler,
    		select_change_handler,
    		click_handler_1,
    		input_input_handler_1,
    		input_input_handler_2,
    		input_input_handler_3,
    		input_input_handler_4
    	};
    }

    class Timeline extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, ["anim", "windows", "hitboxes", "skipAhead", "skipBack", "editingMode", "winProps", "updateStates"]);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "Timeline", options, id: create_fragment$1.name });

    		const { ctx } = this.$$;
    		const props = options.props || {};
    		if (ctx.anim === undefined && !('anim' in props)) {
    			console.warn("<Timeline> was created without expected prop 'anim'");
    		}
    		if (ctx.windows === undefined && !('windows' in props)) {
    			console.warn("<Timeline> was created without expected prop 'windows'");
    		}
    		if (ctx.hitboxes === undefined && !('hitboxes' in props)) {
    			console.warn("<Timeline> was created without expected prop 'hitboxes'");
    		}
    		if (ctx.skipAhead === undefined && !('skipAhead' in props)) {
    			console.warn("<Timeline> was created without expected prop 'skipAhead'");
    		}
    		if (ctx.skipBack === undefined && !('skipBack' in props)) {
    			console.warn("<Timeline> was created without expected prop 'skipBack'");
    		}
    		if (ctx.editingMode === undefined && !('editingMode' in props)) {
    			console.warn("<Timeline> was created without expected prop 'editingMode'");
    		}
    		if (ctx.winProps === undefined && !('winProps' in props)) {
    			console.warn("<Timeline> was created without expected prop 'winProps'");
    		}
    		if (ctx.updateStates === undefined && !('updateStates' in props)) {
    			console.warn("<Timeline> was created without expected prop 'updateStates'");
    		}
    	}

    	get anim() {
    		throw new Error("<Timeline>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set anim(value) {
    		throw new Error("<Timeline>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get windows() {
    		throw new Error("<Timeline>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set windows(value) {
    		throw new Error("<Timeline>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get hitboxes() {
    		throw new Error("<Timeline>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set hitboxes(value) {
    		throw new Error("<Timeline>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get skipAhead() {
    		throw new Error("<Timeline>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set skipAhead(value) {
    		throw new Error("<Timeline>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get skipBack() {
    		throw new Error("<Timeline>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set skipBack(value) {
    		throw new Error("<Timeline>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get editingMode() {
    		throw new Error("<Timeline>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set editingMode(value) {
    		throw new Error("<Timeline>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get winProps() {
    		throw new Error("<Timeline>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set winProps(value) {
    		throw new Error("<Timeline>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get updateStates() {
    		throw new Error("<Timeline>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set updateStates(value) {
    		throw new Error("<Timeline>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\components\LocalStorageFS.svelte generated by Svelte v3.12.1 */

    function create_fragment$2(ctx) {
    	const block = {
    		c: noop,

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: noop,
    		p: noop,
    		i: noop,
    		o: noop,
    		d: noop
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$2.name, type: "component", source: "", ctx });
    	return block;
    }

    class LocalStorageFS extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, null, create_fragment$2, safe_not_equal, []);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "LocalStorageFS", options, id: create_fragment$2.name });
    	}
    }

    var Aacute = "Á";
    var aacute = "á";
    var Abreve = "Ă";
    var abreve = "ă";
    var ac = "∾";
    var acd = "∿";
    var acE = "∾̳";
    var Acirc = "Â";
    var acirc = "â";
    var acute = "´";
    var Acy = "А";
    var acy = "а";
    var AElig = "Æ";
    var aelig = "æ";
    var af = "⁡";
    var Afr = "𝔄";
    var afr = "𝔞";
    var Agrave = "À";
    var agrave = "à";
    var alefsym = "ℵ";
    var aleph = "ℵ";
    var Alpha = "Α";
    var alpha = "α";
    var Amacr = "Ā";
    var amacr = "ā";
    var amalg = "⨿";
    var amp = "&";
    var AMP = "&";
    var andand = "⩕";
    var And = "⩓";
    var and = "∧";
    var andd = "⩜";
    var andslope = "⩘";
    var andv = "⩚";
    var ang = "∠";
    var ange = "⦤";
    var angle = "∠";
    var angmsdaa = "⦨";
    var angmsdab = "⦩";
    var angmsdac = "⦪";
    var angmsdad = "⦫";
    var angmsdae = "⦬";
    var angmsdaf = "⦭";
    var angmsdag = "⦮";
    var angmsdah = "⦯";
    var angmsd = "∡";
    var angrt = "∟";
    var angrtvb = "⊾";
    var angrtvbd = "⦝";
    var angsph = "∢";
    var angst = "Å";
    var angzarr = "⍼";
    var Aogon = "Ą";
    var aogon = "ą";
    var Aopf = "𝔸";
    var aopf = "𝕒";
    var apacir = "⩯";
    var ap = "≈";
    var apE = "⩰";
    var ape = "≊";
    var apid = "≋";
    var apos = "'";
    var ApplyFunction = "⁡";
    var approx = "≈";
    var approxeq = "≊";
    var Aring = "Å";
    var aring = "å";
    var Ascr = "𝒜";
    var ascr = "𝒶";
    var Assign = "≔";
    var ast = "*";
    var asymp = "≈";
    var asympeq = "≍";
    var Atilde = "Ã";
    var atilde = "ã";
    var Auml = "Ä";
    var auml = "ä";
    var awconint = "∳";
    var awint = "⨑";
    var backcong = "≌";
    var backepsilon = "϶";
    var backprime = "‵";
    var backsim = "∽";
    var backsimeq = "⋍";
    var Backslash = "∖";
    var Barv = "⫧";
    var barvee = "⊽";
    var barwed = "⌅";
    var Barwed = "⌆";
    var barwedge = "⌅";
    var bbrk = "⎵";
    var bbrktbrk = "⎶";
    var bcong = "≌";
    var Bcy = "Б";
    var bcy = "б";
    var bdquo = "„";
    var becaus = "∵";
    var because = "∵";
    var Because = "∵";
    var bemptyv = "⦰";
    var bepsi = "϶";
    var bernou = "ℬ";
    var Bernoullis = "ℬ";
    var Beta = "Β";
    var beta = "β";
    var beth = "ℶ";
    var between = "≬";
    var Bfr = "𝔅";
    var bfr = "𝔟";
    var bigcap = "⋂";
    var bigcirc = "◯";
    var bigcup = "⋃";
    var bigodot = "⨀";
    var bigoplus = "⨁";
    var bigotimes = "⨂";
    var bigsqcup = "⨆";
    var bigstar = "★";
    var bigtriangledown = "▽";
    var bigtriangleup = "△";
    var biguplus = "⨄";
    var bigvee = "⋁";
    var bigwedge = "⋀";
    var bkarow = "⤍";
    var blacklozenge = "⧫";
    var blacksquare = "▪";
    var blacktriangle = "▴";
    var blacktriangledown = "▾";
    var blacktriangleleft = "◂";
    var blacktriangleright = "▸";
    var blank = "␣";
    var blk12 = "▒";
    var blk14 = "░";
    var blk34 = "▓";
    var block = "█";
    var bne = "=⃥";
    var bnequiv = "≡⃥";
    var bNot = "⫭";
    var bnot = "⌐";
    var Bopf = "𝔹";
    var bopf = "𝕓";
    var bot = "⊥";
    var bottom = "⊥";
    var bowtie = "⋈";
    var boxbox = "⧉";
    var boxdl = "┐";
    var boxdL = "╕";
    var boxDl = "╖";
    var boxDL = "╗";
    var boxdr = "┌";
    var boxdR = "╒";
    var boxDr = "╓";
    var boxDR = "╔";
    var boxh = "─";
    var boxH = "═";
    var boxhd = "┬";
    var boxHd = "╤";
    var boxhD = "╥";
    var boxHD = "╦";
    var boxhu = "┴";
    var boxHu = "╧";
    var boxhU = "╨";
    var boxHU = "╩";
    var boxminus = "⊟";
    var boxplus = "⊞";
    var boxtimes = "⊠";
    var boxul = "┘";
    var boxuL = "╛";
    var boxUl = "╜";
    var boxUL = "╝";
    var boxur = "└";
    var boxuR = "╘";
    var boxUr = "╙";
    var boxUR = "╚";
    var boxv = "│";
    var boxV = "║";
    var boxvh = "┼";
    var boxvH = "╪";
    var boxVh = "╫";
    var boxVH = "╬";
    var boxvl = "┤";
    var boxvL = "╡";
    var boxVl = "╢";
    var boxVL = "╣";
    var boxvr = "├";
    var boxvR = "╞";
    var boxVr = "╟";
    var boxVR = "╠";
    var bprime = "‵";
    var breve = "˘";
    var Breve = "˘";
    var brvbar = "¦";
    var bscr = "𝒷";
    var Bscr = "ℬ";
    var bsemi = "⁏";
    var bsim = "∽";
    var bsime = "⋍";
    var bsolb = "⧅";
    var bsol = "\\";
    var bsolhsub = "⟈";
    var bull = "•";
    var bullet = "•";
    var bump = "≎";
    var bumpE = "⪮";
    var bumpe = "≏";
    var Bumpeq = "≎";
    var bumpeq = "≏";
    var Cacute = "Ć";
    var cacute = "ć";
    var capand = "⩄";
    var capbrcup = "⩉";
    var capcap = "⩋";
    var cap = "∩";
    var Cap = "⋒";
    var capcup = "⩇";
    var capdot = "⩀";
    var CapitalDifferentialD = "ⅅ";
    var caps = "∩︀";
    var caret = "⁁";
    var caron = "ˇ";
    var Cayleys = "ℭ";
    var ccaps = "⩍";
    var Ccaron = "Č";
    var ccaron = "č";
    var Ccedil = "Ç";
    var ccedil = "ç";
    var Ccirc = "Ĉ";
    var ccirc = "ĉ";
    var Cconint = "∰";
    var ccups = "⩌";
    var ccupssm = "⩐";
    var Cdot = "Ċ";
    var cdot = "ċ";
    var cedil = "¸";
    var Cedilla = "¸";
    var cemptyv = "⦲";
    var cent = "¢";
    var centerdot = "·";
    var CenterDot = "·";
    var cfr = "𝔠";
    var Cfr = "ℭ";
    var CHcy = "Ч";
    var chcy = "ч";
    var check = "✓";
    var checkmark = "✓";
    var Chi = "Χ";
    var chi = "χ";
    var circ = "ˆ";
    var circeq = "≗";
    var circlearrowleft = "↺";
    var circlearrowright = "↻";
    var circledast = "⊛";
    var circledcirc = "⊚";
    var circleddash = "⊝";
    var CircleDot = "⊙";
    var circledR = "®";
    var circledS = "Ⓢ";
    var CircleMinus = "⊖";
    var CirclePlus = "⊕";
    var CircleTimes = "⊗";
    var cir = "○";
    var cirE = "⧃";
    var cire = "≗";
    var cirfnint = "⨐";
    var cirmid = "⫯";
    var cirscir = "⧂";
    var ClockwiseContourIntegral = "∲";
    var CloseCurlyDoubleQuote = "”";
    var CloseCurlyQuote = "’";
    var clubs = "♣";
    var clubsuit = "♣";
    var colon = ":";
    var Colon = "∷";
    var Colone = "⩴";
    var colone = "≔";
    var coloneq = "≔";
    var comma = ",";
    var commat = "@";
    var comp = "∁";
    var compfn = "∘";
    var complement = "∁";
    var complexes = "ℂ";
    var cong = "≅";
    var congdot = "⩭";
    var Congruent = "≡";
    var conint = "∮";
    var Conint = "∯";
    var ContourIntegral = "∮";
    var copf = "𝕔";
    var Copf = "ℂ";
    var coprod = "∐";
    var Coproduct = "∐";
    var copy = "©";
    var COPY = "©";
    var copysr = "℗";
    var CounterClockwiseContourIntegral = "∳";
    var crarr = "↵";
    var cross = "✗";
    var Cross = "⨯";
    var Cscr = "𝒞";
    var cscr = "𝒸";
    var csub = "⫏";
    var csube = "⫑";
    var csup = "⫐";
    var csupe = "⫒";
    var ctdot = "⋯";
    var cudarrl = "⤸";
    var cudarrr = "⤵";
    var cuepr = "⋞";
    var cuesc = "⋟";
    var cularr = "↶";
    var cularrp = "⤽";
    var cupbrcap = "⩈";
    var cupcap = "⩆";
    var CupCap = "≍";
    var cup = "∪";
    var Cup = "⋓";
    var cupcup = "⩊";
    var cupdot = "⊍";
    var cupor = "⩅";
    var cups = "∪︀";
    var curarr = "↷";
    var curarrm = "⤼";
    var curlyeqprec = "⋞";
    var curlyeqsucc = "⋟";
    var curlyvee = "⋎";
    var curlywedge = "⋏";
    var curren = "¤";
    var curvearrowleft = "↶";
    var curvearrowright = "↷";
    var cuvee = "⋎";
    var cuwed = "⋏";
    var cwconint = "∲";
    var cwint = "∱";
    var cylcty = "⌭";
    var dagger = "†";
    var Dagger = "‡";
    var daleth = "ℸ";
    var darr = "↓";
    var Darr = "↡";
    var dArr = "⇓";
    var dash = "‐";
    var Dashv = "⫤";
    var dashv = "⊣";
    var dbkarow = "⤏";
    var dblac = "˝";
    var Dcaron = "Ď";
    var dcaron = "ď";
    var Dcy = "Д";
    var dcy = "д";
    var ddagger = "‡";
    var ddarr = "⇊";
    var DD = "ⅅ";
    var dd = "ⅆ";
    var DDotrahd = "⤑";
    var ddotseq = "⩷";
    var deg = "°";
    var Del = "∇";
    var Delta = "Δ";
    var delta = "δ";
    var demptyv = "⦱";
    var dfisht = "⥿";
    var Dfr = "𝔇";
    var dfr = "𝔡";
    var dHar = "⥥";
    var dharl = "⇃";
    var dharr = "⇂";
    var DiacriticalAcute = "´";
    var DiacriticalDot = "˙";
    var DiacriticalDoubleAcute = "˝";
    var DiacriticalGrave = "`";
    var DiacriticalTilde = "˜";
    var diam = "⋄";
    var diamond = "⋄";
    var Diamond = "⋄";
    var diamondsuit = "♦";
    var diams = "♦";
    var die = "¨";
    var DifferentialD = "ⅆ";
    var digamma = "ϝ";
    var disin = "⋲";
    var div = "÷";
    var divide = "÷";
    var divideontimes = "⋇";
    var divonx = "⋇";
    var DJcy = "Ђ";
    var djcy = "ђ";
    var dlcorn = "⌞";
    var dlcrop = "⌍";
    var dollar = "$";
    var Dopf = "𝔻";
    var dopf = "𝕕";
    var Dot = "¨";
    var dot = "˙";
    var DotDot = "⃜";
    var doteq = "≐";
    var doteqdot = "≑";
    var DotEqual = "≐";
    var dotminus = "∸";
    var dotplus = "∔";
    var dotsquare = "⊡";
    var doublebarwedge = "⌆";
    var DoubleContourIntegral = "∯";
    var DoubleDot = "¨";
    var DoubleDownArrow = "⇓";
    var DoubleLeftArrow = "⇐";
    var DoubleLeftRightArrow = "⇔";
    var DoubleLeftTee = "⫤";
    var DoubleLongLeftArrow = "⟸";
    var DoubleLongLeftRightArrow = "⟺";
    var DoubleLongRightArrow = "⟹";
    var DoubleRightArrow = "⇒";
    var DoubleRightTee = "⊨";
    var DoubleUpArrow = "⇑";
    var DoubleUpDownArrow = "⇕";
    var DoubleVerticalBar = "∥";
    var DownArrowBar = "⤓";
    var downarrow = "↓";
    var DownArrow = "↓";
    var Downarrow = "⇓";
    var DownArrowUpArrow = "⇵";
    var DownBreve = "̑";
    var downdownarrows = "⇊";
    var downharpoonleft = "⇃";
    var downharpoonright = "⇂";
    var DownLeftRightVector = "⥐";
    var DownLeftTeeVector = "⥞";
    var DownLeftVectorBar = "⥖";
    var DownLeftVector = "↽";
    var DownRightTeeVector = "⥟";
    var DownRightVectorBar = "⥗";
    var DownRightVector = "⇁";
    var DownTeeArrow = "↧";
    var DownTee = "⊤";
    var drbkarow = "⤐";
    var drcorn = "⌟";
    var drcrop = "⌌";
    var Dscr = "𝒟";
    var dscr = "𝒹";
    var DScy = "Ѕ";
    var dscy = "ѕ";
    var dsol = "⧶";
    var Dstrok = "Đ";
    var dstrok = "đ";
    var dtdot = "⋱";
    var dtri = "▿";
    var dtrif = "▾";
    var duarr = "⇵";
    var duhar = "⥯";
    var dwangle = "⦦";
    var DZcy = "Џ";
    var dzcy = "џ";
    var dzigrarr = "⟿";
    var Eacute = "É";
    var eacute = "é";
    var easter = "⩮";
    var Ecaron = "Ě";
    var ecaron = "ě";
    var Ecirc = "Ê";
    var ecirc = "ê";
    var ecir = "≖";
    var ecolon = "≕";
    var Ecy = "Э";
    var ecy = "э";
    var eDDot = "⩷";
    var Edot = "Ė";
    var edot = "ė";
    var eDot = "≑";
    var ee = "ⅇ";
    var efDot = "≒";
    var Efr = "𝔈";
    var efr = "𝔢";
    var eg = "⪚";
    var Egrave = "È";
    var egrave = "è";
    var egs = "⪖";
    var egsdot = "⪘";
    var el = "⪙";
    var Element = "∈";
    var elinters = "⏧";
    var ell = "ℓ";
    var els = "⪕";
    var elsdot = "⪗";
    var Emacr = "Ē";
    var emacr = "ē";
    var empty$1 = "∅";
    var emptyset = "∅";
    var EmptySmallSquare = "◻";
    var emptyv = "∅";
    var EmptyVerySmallSquare = "▫";
    var emsp13 = " ";
    var emsp14 = " ";
    var emsp = " ";
    var ENG = "Ŋ";
    var eng = "ŋ";
    var ensp = " ";
    var Eogon = "Ę";
    var eogon = "ę";
    var Eopf = "𝔼";
    var eopf = "𝕖";
    var epar = "⋕";
    var eparsl = "⧣";
    var eplus = "⩱";
    var epsi = "ε";
    var Epsilon = "Ε";
    var epsilon = "ε";
    var epsiv = "ϵ";
    var eqcirc = "≖";
    var eqcolon = "≕";
    var eqsim = "≂";
    var eqslantgtr = "⪖";
    var eqslantless = "⪕";
    var Equal = "⩵";
    var equals = "=";
    var EqualTilde = "≂";
    var equest = "≟";
    var Equilibrium = "⇌";
    var equiv = "≡";
    var equivDD = "⩸";
    var eqvparsl = "⧥";
    var erarr = "⥱";
    var erDot = "≓";
    var escr = "ℯ";
    var Escr = "ℰ";
    var esdot = "≐";
    var Esim = "⩳";
    var esim = "≂";
    var Eta = "Η";
    var eta = "η";
    var ETH = "Ð";
    var eth = "ð";
    var Euml = "Ë";
    var euml = "ë";
    var euro = "€";
    var excl = "!";
    var exist = "∃";
    var Exists = "∃";
    var expectation = "ℰ";
    var exponentiale = "ⅇ";
    var ExponentialE = "ⅇ";
    var fallingdotseq = "≒";
    var Fcy = "Ф";
    var fcy = "ф";
    var female = "♀";
    var ffilig = "ﬃ";
    var fflig = "ﬀ";
    var ffllig = "ﬄ";
    var Ffr = "𝔉";
    var ffr = "𝔣";
    var filig = "ﬁ";
    var FilledSmallSquare = "◼";
    var FilledVerySmallSquare = "▪";
    var fjlig = "fj";
    var flat = "♭";
    var fllig = "ﬂ";
    var fltns = "▱";
    var fnof = "ƒ";
    var Fopf = "𝔽";
    var fopf = "𝕗";
    var forall = "∀";
    var ForAll = "∀";
    var fork = "⋔";
    var forkv = "⫙";
    var Fouriertrf = "ℱ";
    var fpartint = "⨍";
    var frac12 = "½";
    var frac13 = "⅓";
    var frac14 = "¼";
    var frac15 = "⅕";
    var frac16 = "⅙";
    var frac18 = "⅛";
    var frac23 = "⅔";
    var frac25 = "⅖";
    var frac34 = "¾";
    var frac35 = "⅗";
    var frac38 = "⅜";
    var frac45 = "⅘";
    var frac56 = "⅚";
    var frac58 = "⅝";
    var frac78 = "⅞";
    var frasl = "⁄";
    var frown = "⌢";
    var fscr = "𝒻";
    var Fscr = "ℱ";
    var gacute = "ǵ";
    var Gamma = "Γ";
    var gamma = "γ";
    var Gammad = "Ϝ";
    var gammad = "ϝ";
    var gap = "⪆";
    var Gbreve = "Ğ";
    var gbreve = "ğ";
    var Gcedil = "Ģ";
    var Gcirc = "Ĝ";
    var gcirc = "ĝ";
    var Gcy = "Г";
    var gcy = "г";
    var Gdot = "Ġ";
    var gdot = "ġ";
    var ge = "≥";
    var gE = "≧";
    var gEl = "⪌";
    var gel = "⋛";
    var geq = "≥";
    var geqq = "≧";
    var geqslant = "⩾";
    var gescc = "⪩";
    var ges = "⩾";
    var gesdot = "⪀";
    var gesdoto = "⪂";
    var gesdotol = "⪄";
    var gesl = "⋛︀";
    var gesles = "⪔";
    var Gfr = "𝔊";
    var gfr = "𝔤";
    var gg = "≫";
    var Gg = "⋙";
    var ggg = "⋙";
    var gimel = "ℷ";
    var GJcy = "Ѓ";
    var gjcy = "ѓ";
    var gla = "⪥";
    var gl = "≷";
    var glE = "⪒";
    var glj = "⪤";
    var gnap = "⪊";
    var gnapprox = "⪊";
    var gne = "⪈";
    var gnE = "≩";
    var gneq = "⪈";
    var gneqq = "≩";
    var gnsim = "⋧";
    var Gopf = "𝔾";
    var gopf = "𝕘";
    var grave = "`";
    var GreaterEqual = "≥";
    var GreaterEqualLess = "⋛";
    var GreaterFullEqual = "≧";
    var GreaterGreater = "⪢";
    var GreaterLess = "≷";
    var GreaterSlantEqual = "⩾";
    var GreaterTilde = "≳";
    var Gscr = "𝒢";
    var gscr = "ℊ";
    var gsim = "≳";
    var gsime = "⪎";
    var gsiml = "⪐";
    var gtcc = "⪧";
    var gtcir = "⩺";
    var gt = ">";
    var GT = ">";
    var Gt = "≫";
    var gtdot = "⋗";
    var gtlPar = "⦕";
    var gtquest = "⩼";
    var gtrapprox = "⪆";
    var gtrarr = "⥸";
    var gtrdot = "⋗";
    var gtreqless = "⋛";
    var gtreqqless = "⪌";
    var gtrless = "≷";
    var gtrsim = "≳";
    var gvertneqq = "≩︀";
    var gvnE = "≩︀";
    var Hacek = "ˇ";
    var hairsp = " ";
    var half = "½";
    var hamilt = "ℋ";
    var HARDcy = "Ъ";
    var hardcy = "ъ";
    var harrcir = "⥈";
    var harr = "↔";
    var hArr = "⇔";
    var harrw = "↭";
    var Hat = "^";
    var hbar = "ℏ";
    var Hcirc = "Ĥ";
    var hcirc = "ĥ";
    var hearts = "♥";
    var heartsuit = "♥";
    var hellip = "…";
    var hercon = "⊹";
    var hfr = "𝔥";
    var Hfr = "ℌ";
    var HilbertSpace = "ℋ";
    var hksearow = "⤥";
    var hkswarow = "⤦";
    var hoarr = "⇿";
    var homtht = "∻";
    var hookleftarrow = "↩";
    var hookrightarrow = "↪";
    var hopf = "𝕙";
    var Hopf = "ℍ";
    var horbar = "―";
    var HorizontalLine = "─";
    var hscr = "𝒽";
    var Hscr = "ℋ";
    var hslash = "ℏ";
    var Hstrok = "Ħ";
    var hstrok = "ħ";
    var HumpDownHump = "≎";
    var HumpEqual = "≏";
    var hybull = "⁃";
    var hyphen = "‐";
    var Iacute = "Í";
    var iacute = "í";
    var ic = "⁣";
    var Icirc = "Î";
    var icirc = "î";
    var Icy = "И";
    var icy = "и";
    var Idot = "İ";
    var IEcy = "Е";
    var iecy = "е";
    var iexcl = "¡";
    var iff = "⇔";
    var ifr = "𝔦";
    var Ifr = "ℑ";
    var Igrave = "Ì";
    var igrave = "ì";
    var ii = "ⅈ";
    var iiiint = "⨌";
    var iiint = "∭";
    var iinfin = "⧜";
    var iiota = "℩";
    var IJlig = "Ĳ";
    var ijlig = "ĳ";
    var Imacr = "Ī";
    var imacr = "ī";
    var image = "ℑ";
    var ImaginaryI = "ⅈ";
    var imagline = "ℐ";
    var imagpart = "ℑ";
    var imath = "ı";
    var Im = "ℑ";
    var imof = "⊷";
    var imped = "Ƶ";
    var Implies = "⇒";
    var incare = "℅";
    var infin = "∞";
    var infintie = "⧝";
    var inodot = "ı";
    var intcal = "⊺";
    var int = "∫";
    var Int = "∬";
    var integers = "ℤ";
    var Integral = "∫";
    var intercal = "⊺";
    var Intersection = "⋂";
    var intlarhk = "⨗";
    var intprod = "⨼";
    var InvisibleComma = "⁣";
    var InvisibleTimes = "⁢";
    var IOcy = "Ё";
    var iocy = "ё";
    var Iogon = "Į";
    var iogon = "į";
    var Iopf = "𝕀";
    var iopf = "𝕚";
    var Iota = "Ι";
    var iota = "ι";
    var iprod = "⨼";
    var iquest = "¿";
    var iscr = "𝒾";
    var Iscr = "ℐ";
    var isin = "∈";
    var isindot = "⋵";
    var isinE = "⋹";
    var isins = "⋴";
    var isinsv = "⋳";
    var isinv = "∈";
    var it = "⁢";
    var Itilde = "Ĩ";
    var itilde = "ĩ";
    var Iukcy = "І";
    var iukcy = "і";
    var Iuml = "Ï";
    var iuml = "ï";
    var Jcirc = "Ĵ";
    var jcirc = "ĵ";
    var Jcy = "Й";
    var jcy = "й";
    var Jfr = "𝔍";
    var jfr = "𝔧";
    var jmath = "ȷ";
    var Jopf = "𝕁";
    var jopf = "𝕛";
    var Jscr = "𝒥";
    var jscr = "𝒿";
    var Jsercy = "Ј";
    var jsercy = "ј";
    var Jukcy = "Є";
    var jukcy = "є";
    var Kappa = "Κ";
    var kappa = "κ";
    var kappav = "ϰ";
    var Kcedil = "Ķ";
    var kcedil = "ķ";
    var Kcy = "К";
    var kcy = "к";
    var Kfr = "𝔎";
    var kfr = "𝔨";
    var kgreen = "ĸ";
    var KHcy = "Х";
    var khcy = "х";
    var KJcy = "Ќ";
    var kjcy = "ќ";
    var Kopf = "𝕂";
    var kopf = "𝕜";
    var Kscr = "𝒦";
    var kscr = "𝓀";
    var lAarr = "⇚";
    var Lacute = "Ĺ";
    var lacute = "ĺ";
    var laemptyv = "⦴";
    var lagran = "ℒ";
    var Lambda = "Λ";
    var lambda = "λ";
    var lang = "⟨";
    var Lang = "⟪";
    var langd = "⦑";
    var langle = "⟨";
    var lap = "⪅";
    var Laplacetrf = "ℒ";
    var laquo = "«";
    var larrb = "⇤";
    var larrbfs = "⤟";
    var larr = "←";
    var Larr = "↞";
    var lArr = "⇐";
    var larrfs = "⤝";
    var larrhk = "↩";
    var larrlp = "↫";
    var larrpl = "⤹";
    var larrsim = "⥳";
    var larrtl = "↢";
    var latail = "⤙";
    var lAtail = "⤛";
    var lat = "⪫";
    var late = "⪭";
    var lates = "⪭︀";
    var lbarr = "⤌";
    var lBarr = "⤎";
    var lbbrk = "❲";
    var lbrace = "{";
    var lbrack = "[";
    var lbrke = "⦋";
    var lbrksld = "⦏";
    var lbrkslu = "⦍";
    var Lcaron = "Ľ";
    var lcaron = "ľ";
    var Lcedil = "Ļ";
    var lcedil = "ļ";
    var lceil = "⌈";
    var lcub = "{";
    var Lcy = "Л";
    var lcy = "л";
    var ldca = "⤶";
    var ldquo = "“";
    var ldquor = "„";
    var ldrdhar = "⥧";
    var ldrushar = "⥋";
    var ldsh = "↲";
    var le = "≤";
    var lE = "≦";
    var LeftAngleBracket = "⟨";
    var LeftArrowBar = "⇤";
    var leftarrow = "←";
    var LeftArrow = "←";
    var Leftarrow = "⇐";
    var LeftArrowRightArrow = "⇆";
    var leftarrowtail = "↢";
    var LeftCeiling = "⌈";
    var LeftDoubleBracket = "⟦";
    var LeftDownTeeVector = "⥡";
    var LeftDownVectorBar = "⥙";
    var LeftDownVector = "⇃";
    var LeftFloor = "⌊";
    var leftharpoondown = "↽";
    var leftharpoonup = "↼";
    var leftleftarrows = "⇇";
    var leftrightarrow = "↔";
    var LeftRightArrow = "↔";
    var Leftrightarrow = "⇔";
    var leftrightarrows = "⇆";
    var leftrightharpoons = "⇋";
    var leftrightsquigarrow = "↭";
    var LeftRightVector = "⥎";
    var LeftTeeArrow = "↤";
    var LeftTee = "⊣";
    var LeftTeeVector = "⥚";
    var leftthreetimes = "⋋";
    var LeftTriangleBar = "⧏";
    var LeftTriangle = "⊲";
    var LeftTriangleEqual = "⊴";
    var LeftUpDownVector = "⥑";
    var LeftUpTeeVector = "⥠";
    var LeftUpVectorBar = "⥘";
    var LeftUpVector = "↿";
    var LeftVectorBar = "⥒";
    var LeftVector = "↼";
    var lEg = "⪋";
    var leg = "⋚";
    var leq = "≤";
    var leqq = "≦";
    var leqslant = "⩽";
    var lescc = "⪨";
    var les = "⩽";
    var lesdot = "⩿";
    var lesdoto = "⪁";
    var lesdotor = "⪃";
    var lesg = "⋚︀";
    var lesges = "⪓";
    var lessapprox = "⪅";
    var lessdot = "⋖";
    var lesseqgtr = "⋚";
    var lesseqqgtr = "⪋";
    var LessEqualGreater = "⋚";
    var LessFullEqual = "≦";
    var LessGreater = "≶";
    var lessgtr = "≶";
    var LessLess = "⪡";
    var lesssim = "≲";
    var LessSlantEqual = "⩽";
    var LessTilde = "≲";
    var lfisht = "⥼";
    var lfloor = "⌊";
    var Lfr = "𝔏";
    var lfr = "𝔩";
    var lg = "≶";
    var lgE = "⪑";
    var lHar = "⥢";
    var lhard = "↽";
    var lharu = "↼";
    var lharul = "⥪";
    var lhblk = "▄";
    var LJcy = "Љ";
    var ljcy = "љ";
    var llarr = "⇇";
    var ll = "≪";
    var Ll = "⋘";
    var llcorner = "⌞";
    var Lleftarrow = "⇚";
    var llhard = "⥫";
    var lltri = "◺";
    var Lmidot = "Ŀ";
    var lmidot = "ŀ";
    var lmoustache = "⎰";
    var lmoust = "⎰";
    var lnap = "⪉";
    var lnapprox = "⪉";
    var lne = "⪇";
    var lnE = "≨";
    var lneq = "⪇";
    var lneqq = "≨";
    var lnsim = "⋦";
    var loang = "⟬";
    var loarr = "⇽";
    var lobrk = "⟦";
    var longleftarrow = "⟵";
    var LongLeftArrow = "⟵";
    var Longleftarrow = "⟸";
    var longleftrightarrow = "⟷";
    var LongLeftRightArrow = "⟷";
    var Longleftrightarrow = "⟺";
    var longmapsto = "⟼";
    var longrightarrow = "⟶";
    var LongRightArrow = "⟶";
    var Longrightarrow = "⟹";
    var looparrowleft = "↫";
    var looparrowright = "↬";
    var lopar = "⦅";
    var Lopf = "𝕃";
    var lopf = "𝕝";
    var loplus = "⨭";
    var lotimes = "⨴";
    var lowast = "∗";
    var lowbar = "_";
    var LowerLeftArrow = "↙";
    var LowerRightArrow = "↘";
    var loz = "◊";
    var lozenge = "◊";
    var lozf = "⧫";
    var lpar = "(";
    var lparlt = "⦓";
    var lrarr = "⇆";
    var lrcorner = "⌟";
    var lrhar = "⇋";
    var lrhard = "⥭";
    var lrm = "‎";
    var lrtri = "⊿";
    var lsaquo = "‹";
    var lscr = "𝓁";
    var Lscr = "ℒ";
    var lsh = "↰";
    var Lsh = "↰";
    var lsim = "≲";
    var lsime = "⪍";
    var lsimg = "⪏";
    var lsqb = "[";
    var lsquo = "‘";
    var lsquor = "‚";
    var Lstrok = "Ł";
    var lstrok = "ł";
    var ltcc = "⪦";
    var ltcir = "⩹";
    var lt = "<";
    var LT = "<";
    var Lt = "≪";
    var ltdot = "⋖";
    var lthree = "⋋";
    var ltimes = "⋉";
    var ltlarr = "⥶";
    var ltquest = "⩻";
    var ltri = "◃";
    var ltrie = "⊴";
    var ltrif = "◂";
    var ltrPar = "⦖";
    var lurdshar = "⥊";
    var luruhar = "⥦";
    var lvertneqq = "≨︀";
    var lvnE = "≨︀";
    var macr = "¯";
    var male = "♂";
    var malt = "✠";
    var maltese = "✠";
    var map = "↦";
    var mapsto = "↦";
    var mapstodown = "↧";
    var mapstoleft = "↤";
    var mapstoup = "↥";
    var marker = "▮";
    var mcomma = "⨩";
    var Mcy = "М";
    var mcy = "м";
    var mdash = "—";
    var mDDot = "∺";
    var measuredangle = "∡";
    var MediumSpace = " ";
    var Mellintrf = "ℳ";
    var Mfr = "𝔐";
    var mfr = "𝔪";
    var mho = "℧";
    var micro = "µ";
    var midast = "*";
    var midcir = "⫰";
    var mid = "∣";
    var middot = "·";
    var minusb = "⊟";
    var minus = "−";
    var minusd = "∸";
    var minusdu = "⨪";
    var MinusPlus = "∓";
    var mlcp = "⫛";
    var mldr = "…";
    var mnplus = "∓";
    var models = "⊧";
    var Mopf = "𝕄";
    var mopf = "𝕞";
    var mp = "∓";
    var mscr = "𝓂";
    var Mscr = "ℳ";
    var mstpos = "∾";
    var Mu = "Μ";
    var mu = "μ";
    var multimap = "⊸";
    var mumap = "⊸";
    var nabla = "∇";
    var Nacute = "Ń";
    var nacute = "ń";
    var nang = "∠⃒";
    var nap = "≉";
    var napE = "⩰̸";
    var napid = "≋̸";
    var napos = "ŉ";
    var napprox = "≉";
    var natural = "♮";
    var naturals = "ℕ";
    var natur = "♮";
    var nbsp = " ";
    var nbump = "≎̸";
    var nbumpe = "≏̸";
    var ncap = "⩃";
    var Ncaron = "Ň";
    var ncaron = "ň";
    var Ncedil = "Ņ";
    var ncedil = "ņ";
    var ncong = "≇";
    var ncongdot = "⩭̸";
    var ncup = "⩂";
    var Ncy = "Н";
    var ncy = "н";
    var ndash = "–";
    var nearhk = "⤤";
    var nearr = "↗";
    var neArr = "⇗";
    var nearrow = "↗";
    var ne = "≠";
    var nedot = "≐̸";
    var NegativeMediumSpace = "​";
    var NegativeThickSpace = "​";
    var NegativeThinSpace = "​";
    var NegativeVeryThinSpace = "​";
    var nequiv = "≢";
    var nesear = "⤨";
    var nesim = "≂̸";
    var NestedGreaterGreater = "≫";
    var NestedLessLess = "≪";
    var NewLine = "\n";
    var nexist = "∄";
    var nexists = "∄";
    var Nfr = "𝔑";
    var nfr = "𝔫";
    var ngE = "≧̸";
    var nge = "≱";
    var ngeq = "≱";
    var ngeqq = "≧̸";
    var ngeqslant = "⩾̸";
    var nges = "⩾̸";
    var nGg = "⋙̸";
    var ngsim = "≵";
    var nGt = "≫⃒";
    var ngt = "≯";
    var ngtr = "≯";
    var nGtv = "≫̸";
    var nharr = "↮";
    var nhArr = "⇎";
    var nhpar = "⫲";
    var ni = "∋";
    var nis = "⋼";
    var nisd = "⋺";
    var niv = "∋";
    var NJcy = "Њ";
    var njcy = "њ";
    var nlarr = "↚";
    var nlArr = "⇍";
    var nldr = "‥";
    var nlE = "≦̸";
    var nle = "≰";
    var nleftarrow = "↚";
    var nLeftarrow = "⇍";
    var nleftrightarrow = "↮";
    var nLeftrightarrow = "⇎";
    var nleq = "≰";
    var nleqq = "≦̸";
    var nleqslant = "⩽̸";
    var nles = "⩽̸";
    var nless = "≮";
    var nLl = "⋘̸";
    var nlsim = "≴";
    var nLt = "≪⃒";
    var nlt = "≮";
    var nltri = "⋪";
    var nltrie = "⋬";
    var nLtv = "≪̸";
    var nmid = "∤";
    var NoBreak = "⁠";
    var NonBreakingSpace = " ";
    var nopf = "𝕟";
    var Nopf = "ℕ";
    var Not = "⫬";
    var not = "¬";
    var NotCongruent = "≢";
    var NotCupCap = "≭";
    var NotDoubleVerticalBar = "∦";
    var NotElement = "∉";
    var NotEqual = "≠";
    var NotEqualTilde = "≂̸";
    var NotExists = "∄";
    var NotGreater = "≯";
    var NotGreaterEqual = "≱";
    var NotGreaterFullEqual = "≧̸";
    var NotGreaterGreater = "≫̸";
    var NotGreaterLess = "≹";
    var NotGreaterSlantEqual = "⩾̸";
    var NotGreaterTilde = "≵";
    var NotHumpDownHump = "≎̸";
    var NotHumpEqual = "≏̸";
    var notin = "∉";
    var notindot = "⋵̸";
    var notinE = "⋹̸";
    var notinva = "∉";
    var notinvb = "⋷";
    var notinvc = "⋶";
    var NotLeftTriangleBar = "⧏̸";
    var NotLeftTriangle = "⋪";
    var NotLeftTriangleEqual = "⋬";
    var NotLess = "≮";
    var NotLessEqual = "≰";
    var NotLessGreater = "≸";
    var NotLessLess = "≪̸";
    var NotLessSlantEqual = "⩽̸";
    var NotLessTilde = "≴";
    var NotNestedGreaterGreater = "⪢̸";
    var NotNestedLessLess = "⪡̸";
    var notni = "∌";
    var notniva = "∌";
    var notnivb = "⋾";
    var notnivc = "⋽";
    var NotPrecedes = "⊀";
    var NotPrecedesEqual = "⪯̸";
    var NotPrecedesSlantEqual = "⋠";
    var NotReverseElement = "∌";
    var NotRightTriangleBar = "⧐̸";
    var NotRightTriangle = "⋫";
    var NotRightTriangleEqual = "⋭";
    var NotSquareSubset = "⊏̸";
    var NotSquareSubsetEqual = "⋢";
    var NotSquareSuperset = "⊐̸";
    var NotSquareSupersetEqual = "⋣";
    var NotSubset = "⊂⃒";
    var NotSubsetEqual = "⊈";
    var NotSucceeds = "⊁";
    var NotSucceedsEqual = "⪰̸";
    var NotSucceedsSlantEqual = "⋡";
    var NotSucceedsTilde = "≿̸";
    var NotSuperset = "⊃⃒";
    var NotSupersetEqual = "⊉";
    var NotTilde = "≁";
    var NotTildeEqual = "≄";
    var NotTildeFullEqual = "≇";
    var NotTildeTilde = "≉";
    var NotVerticalBar = "∤";
    var nparallel = "∦";
    var npar = "∦";
    var nparsl = "⫽⃥";
    var npart = "∂̸";
    var npolint = "⨔";
    var npr = "⊀";
    var nprcue = "⋠";
    var nprec = "⊀";
    var npreceq = "⪯̸";
    var npre = "⪯̸";
    var nrarrc = "⤳̸";
    var nrarr = "↛";
    var nrArr = "⇏";
    var nrarrw = "↝̸";
    var nrightarrow = "↛";
    var nRightarrow = "⇏";
    var nrtri = "⋫";
    var nrtrie = "⋭";
    var nsc = "⊁";
    var nsccue = "⋡";
    var nsce = "⪰̸";
    var Nscr = "𝒩";
    var nscr = "𝓃";
    var nshortmid = "∤";
    var nshortparallel = "∦";
    var nsim = "≁";
    var nsime = "≄";
    var nsimeq = "≄";
    var nsmid = "∤";
    var nspar = "∦";
    var nsqsube = "⋢";
    var nsqsupe = "⋣";
    var nsub = "⊄";
    var nsubE = "⫅̸";
    var nsube = "⊈";
    var nsubset = "⊂⃒";
    var nsubseteq = "⊈";
    var nsubseteqq = "⫅̸";
    var nsucc = "⊁";
    var nsucceq = "⪰̸";
    var nsup = "⊅";
    var nsupE = "⫆̸";
    var nsupe = "⊉";
    var nsupset = "⊃⃒";
    var nsupseteq = "⊉";
    var nsupseteqq = "⫆̸";
    var ntgl = "≹";
    var Ntilde = "Ñ";
    var ntilde = "ñ";
    var ntlg = "≸";
    var ntriangleleft = "⋪";
    var ntrianglelefteq = "⋬";
    var ntriangleright = "⋫";
    var ntrianglerighteq = "⋭";
    var Nu = "Ν";
    var nu = "ν";
    var num = "#";
    var numero = "№";
    var numsp = " ";
    var nvap = "≍⃒";
    var nvdash = "⊬";
    var nvDash = "⊭";
    var nVdash = "⊮";
    var nVDash = "⊯";
    var nvge = "≥⃒";
    var nvgt = ">⃒";
    var nvHarr = "⤄";
    var nvinfin = "⧞";
    var nvlArr = "⤂";
    var nvle = "≤⃒";
    var nvlt = "<⃒";
    var nvltrie = "⊴⃒";
    var nvrArr = "⤃";
    var nvrtrie = "⊵⃒";
    var nvsim = "∼⃒";
    var nwarhk = "⤣";
    var nwarr = "↖";
    var nwArr = "⇖";
    var nwarrow = "↖";
    var nwnear = "⤧";
    var Oacute = "Ó";
    var oacute = "ó";
    var oast = "⊛";
    var Ocirc = "Ô";
    var ocirc = "ô";
    var ocir = "⊚";
    var Ocy = "О";
    var ocy = "о";
    var odash = "⊝";
    var Odblac = "Ő";
    var odblac = "ő";
    var odiv = "⨸";
    var odot = "⊙";
    var odsold = "⦼";
    var OElig = "Œ";
    var oelig = "œ";
    var ofcir = "⦿";
    var Ofr = "𝔒";
    var ofr = "𝔬";
    var ogon = "˛";
    var Ograve = "Ò";
    var ograve = "ò";
    var ogt = "⧁";
    var ohbar = "⦵";
    var ohm = "Ω";
    var oint = "∮";
    var olarr = "↺";
    var olcir = "⦾";
    var olcross = "⦻";
    var oline = "‾";
    var olt = "⧀";
    var Omacr = "Ō";
    var omacr = "ō";
    var Omega = "Ω";
    var omega = "ω";
    var Omicron = "Ο";
    var omicron = "ο";
    var omid = "⦶";
    var ominus = "⊖";
    var Oopf = "𝕆";
    var oopf = "𝕠";
    var opar = "⦷";
    var OpenCurlyDoubleQuote = "“";
    var OpenCurlyQuote = "‘";
    var operp = "⦹";
    var oplus = "⊕";
    var orarr = "↻";
    var Or = "⩔";
    var or = "∨";
    var ord = "⩝";
    var order = "ℴ";
    var orderof = "ℴ";
    var ordf = "ª";
    var ordm = "º";
    var origof = "⊶";
    var oror = "⩖";
    var orslope = "⩗";
    var orv = "⩛";
    var oS = "Ⓢ";
    var Oscr = "𝒪";
    var oscr = "ℴ";
    var Oslash = "Ø";
    var oslash = "ø";
    var osol = "⊘";
    var Otilde = "Õ";
    var otilde = "õ";
    var otimesas = "⨶";
    var Otimes = "⨷";
    var otimes = "⊗";
    var Ouml = "Ö";
    var ouml = "ö";
    var ovbar = "⌽";
    var OverBar = "‾";
    var OverBrace = "⏞";
    var OverBracket = "⎴";
    var OverParenthesis = "⏜";
    var para = "¶";
    var parallel = "∥";
    var par = "∥";
    var parsim = "⫳";
    var parsl = "⫽";
    var part = "∂";
    var PartialD = "∂";
    var Pcy = "П";
    var pcy = "п";
    var percnt = "%";
    var period = ".";
    var permil = "‰";
    var perp = "⊥";
    var pertenk = "‱";
    var Pfr = "𝔓";
    var pfr = "𝔭";
    var Phi = "Φ";
    var phi = "φ";
    var phiv = "ϕ";
    var phmmat = "ℳ";
    var phone = "☎";
    var Pi = "Π";
    var pi = "π";
    var pitchfork = "⋔";
    var piv = "ϖ";
    var planck = "ℏ";
    var planckh = "ℎ";
    var plankv = "ℏ";
    var plusacir = "⨣";
    var plusb = "⊞";
    var pluscir = "⨢";
    var plus = "+";
    var plusdo = "∔";
    var plusdu = "⨥";
    var pluse = "⩲";
    var PlusMinus = "±";
    var plusmn = "±";
    var plussim = "⨦";
    var plustwo = "⨧";
    var pm = "±";
    var Poincareplane = "ℌ";
    var pointint = "⨕";
    var popf = "𝕡";
    var Popf = "ℙ";
    var pound = "£";
    var prap = "⪷";
    var Pr = "⪻";
    var pr = "≺";
    var prcue = "≼";
    var precapprox = "⪷";
    var prec = "≺";
    var preccurlyeq = "≼";
    var Precedes = "≺";
    var PrecedesEqual = "⪯";
    var PrecedesSlantEqual = "≼";
    var PrecedesTilde = "≾";
    var preceq = "⪯";
    var precnapprox = "⪹";
    var precneqq = "⪵";
    var precnsim = "⋨";
    var pre = "⪯";
    var prE = "⪳";
    var precsim = "≾";
    var prime = "′";
    var Prime = "″";
    var primes = "ℙ";
    var prnap = "⪹";
    var prnE = "⪵";
    var prnsim = "⋨";
    var prod = "∏";
    var Product = "∏";
    var profalar = "⌮";
    var profline = "⌒";
    var profsurf = "⌓";
    var prop = "∝";
    var Proportional = "∝";
    var Proportion = "∷";
    var propto = "∝";
    var prsim = "≾";
    var prurel = "⊰";
    var Pscr = "𝒫";
    var pscr = "𝓅";
    var Psi = "Ψ";
    var psi = "ψ";
    var puncsp = " ";
    var Qfr = "𝔔";
    var qfr = "𝔮";
    var qint = "⨌";
    var qopf = "𝕢";
    var Qopf = "ℚ";
    var qprime = "⁗";
    var Qscr = "𝒬";
    var qscr = "𝓆";
    var quaternions = "ℍ";
    var quatint = "⨖";
    var quest = "?";
    var questeq = "≟";
    var quot = "\"";
    var QUOT = "\"";
    var rAarr = "⇛";
    var race = "∽̱";
    var Racute = "Ŕ";
    var racute = "ŕ";
    var radic = "√";
    var raemptyv = "⦳";
    var rang = "⟩";
    var Rang = "⟫";
    var rangd = "⦒";
    var range = "⦥";
    var rangle = "⟩";
    var raquo = "»";
    var rarrap = "⥵";
    var rarrb = "⇥";
    var rarrbfs = "⤠";
    var rarrc = "⤳";
    var rarr = "→";
    var Rarr = "↠";
    var rArr = "⇒";
    var rarrfs = "⤞";
    var rarrhk = "↪";
    var rarrlp = "↬";
    var rarrpl = "⥅";
    var rarrsim = "⥴";
    var Rarrtl = "⤖";
    var rarrtl = "↣";
    var rarrw = "↝";
    var ratail = "⤚";
    var rAtail = "⤜";
    var ratio = "∶";
    var rationals = "ℚ";
    var rbarr = "⤍";
    var rBarr = "⤏";
    var RBarr = "⤐";
    var rbbrk = "❳";
    var rbrace = "}";
    var rbrack = "]";
    var rbrke = "⦌";
    var rbrksld = "⦎";
    var rbrkslu = "⦐";
    var Rcaron = "Ř";
    var rcaron = "ř";
    var Rcedil = "Ŗ";
    var rcedil = "ŗ";
    var rceil = "⌉";
    var rcub = "}";
    var Rcy = "Р";
    var rcy = "р";
    var rdca = "⤷";
    var rdldhar = "⥩";
    var rdquo = "”";
    var rdquor = "”";
    var rdsh = "↳";
    var real = "ℜ";
    var realine = "ℛ";
    var realpart = "ℜ";
    var reals = "ℝ";
    var Re = "ℜ";
    var rect = "▭";
    var reg = "®";
    var REG = "®";
    var ReverseElement = "∋";
    var ReverseEquilibrium = "⇋";
    var ReverseUpEquilibrium = "⥯";
    var rfisht = "⥽";
    var rfloor = "⌋";
    var rfr = "𝔯";
    var Rfr = "ℜ";
    var rHar = "⥤";
    var rhard = "⇁";
    var rharu = "⇀";
    var rharul = "⥬";
    var Rho = "Ρ";
    var rho = "ρ";
    var rhov = "ϱ";
    var RightAngleBracket = "⟩";
    var RightArrowBar = "⇥";
    var rightarrow = "→";
    var RightArrow = "→";
    var Rightarrow = "⇒";
    var RightArrowLeftArrow = "⇄";
    var rightarrowtail = "↣";
    var RightCeiling = "⌉";
    var RightDoubleBracket = "⟧";
    var RightDownTeeVector = "⥝";
    var RightDownVectorBar = "⥕";
    var RightDownVector = "⇂";
    var RightFloor = "⌋";
    var rightharpoondown = "⇁";
    var rightharpoonup = "⇀";
    var rightleftarrows = "⇄";
    var rightleftharpoons = "⇌";
    var rightrightarrows = "⇉";
    var rightsquigarrow = "↝";
    var RightTeeArrow = "↦";
    var RightTee = "⊢";
    var RightTeeVector = "⥛";
    var rightthreetimes = "⋌";
    var RightTriangleBar = "⧐";
    var RightTriangle = "⊳";
    var RightTriangleEqual = "⊵";
    var RightUpDownVector = "⥏";
    var RightUpTeeVector = "⥜";
    var RightUpVectorBar = "⥔";
    var RightUpVector = "↾";
    var RightVectorBar = "⥓";
    var RightVector = "⇀";
    var ring = "˚";
    var risingdotseq = "≓";
    var rlarr = "⇄";
    var rlhar = "⇌";
    var rlm = "‏";
    var rmoustache = "⎱";
    var rmoust = "⎱";
    var rnmid = "⫮";
    var roang = "⟭";
    var roarr = "⇾";
    var robrk = "⟧";
    var ropar = "⦆";
    var ropf = "𝕣";
    var Ropf = "ℝ";
    var roplus = "⨮";
    var rotimes = "⨵";
    var RoundImplies = "⥰";
    var rpar = ")";
    var rpargt = "⦔";
    var rppolint = "⨒";
    var rrarr = "⇉";
    var Rrightarrow = "⇛";
    var rsaquo = "›";
    var rscr = "𝓇";
    var Rscr = "ℛ";
    var rsh = "↱";
    var Rsh = "↱";
    var rsqb = "]";
    var rsquo = "’";
    var rsquor = "’";
    var rthree = "⋌";
    var rtimes = "⋊";
    var rtri = "▹";
    var rtrie = "⊵";
    var rtrif = "▸";
    var rtriltri = "⧎";
    var RuleDelayed = "⧴";
    var ruluhar = "⥨";
    var rx = "℞";
    var Sacute = "Ś";
    var sacute = "ś";
    var sbquo = "‚";
    var scap = "⪸";
    var Scaron = "Š";
    var scaron = "š";
    var Sc = "⪼";
    var sc = "≻";
    var sccue = "≽";
    var sce = "⪰";
    var scE = "⪴";
    var Scedil = "Ş";
    var scedil = "ş";
    var Scirc = "Ŝ";
    var scirc = "ŝ";
    var scnap = "⪺";
    var scnE = "⪶";
    var scnsim = "⋩";
    var scpolint = "⨓";
    var scsim = "≿";
    var Scy = "С";
    var scy = "с";
    var sdotb = "⊡";
    var sdot = "⋅";
    var sdote = "⩦";
    var searhk = "⤥";
    var searr = "↘";
    var seArr = "⇘";
    var searrow = "↘";
    var sect = "§";
    var semi = ";";
    var seswar = "⤩";
    var setminus = "∖";
    var setmn = "∖";
    var sext = "✶";
    var Sfr = "𝔖";
    var sfr = "𝔰";
    var sfrown = "⌢";
    var sharp = "♯";
    var SHCHcy = "Щ";
    var shchcy = "щ";
    var SHcy = "Ш";
    var shcy = "ш";
    var ShortDownArrow = "↓";
    var ShortLeftArrow = "←";
    var shortmid = "∣";
    var shortparallel = "∥";
    var ShortRightArrow = "→";
    var ShortUpArrow = "↑";
    var shy = "­";
    var Sigma = "Σ";
    var sigma = "σ";
    var sigmaf = "ς";
    var sigmav = "ς";
    var sim = "∼";
    var simdot = "⩪";
    var sime = "≃";
    var simeq = "≃";
    var simg = "⪞";
    var simgE = "⪠";
    var siml = "⪝";
    var simlE = "⪟";
    var simne = "≆";
    var simplus = "⨤";
    var simrarr = "⥲";
    var slarr = "←";
    var SmallCircle = "∘";
    var smallsetminus = "∖";
    var smashp = "⨳";
    var smeparsl = "⧤";
    var smid = "∣";
    var smile = "⌣";
    var smt = "⪪";
    var smte = "⪬";
    var smtes = "⪬︀";
    var SOFTcy = "Ь";
    var softcy = "ь";
    var solbar = "⌿";
    var solb = "⧄";
    var sol = "/";
    var Sopf = "𝕊";
    var sopf = "𝕤";
    var spades = "♠";
    var spadesuit = "♠";
    var spar = "∥";
    var sqcap = "⊓";
    var sqcaps = "⊓︀";
    var sqcup = "⊔";
    var sqcups = "⊔︀";
    var Sqrt = "√";
    var sqsub = "⊏";
    var sqsube = "⊑";
    var sqsubset = "⊏";
    var sqsubseteq = "⊑";
    var sqsup = "⊐";
    var sqsupe = "⊒";
    var sqsupset = "⊐";
    var sqsupseteq = "⊒";
    var square = "□";
    var Square = "□";
    var SquareIntersection = "⊓";
    var SquareSubset = "⊏";
    var SquareSubsetEqual = "⊑";
    var SquareSuperset = "⊐";
    var SquareSupersetEqual = "⊒";
    var SquareUnion = "⊔";
    var squarf = "▪";
    var squ = "□";
    var squf = "▪";
    var srarr = "→";
    var Sscr = "𝒮";
    var sscr = "𝓈";
    var ssetmn = "∖";
    var ssmile = "⌣";
    var sstarf = "⋆";
    var Star = "⋆";
    var star = "☆";
    var starf = "★";
    var straightepsilon = "ϵ";
    var straightphi = "ϕ";
    var strns = "¯";
    var sub = "⊂";
    var Sub = "⋐";
    var subdot = "⪽";
    var subE = "⫅";
    var sube = "⊆";
    var subedot = "⫃";
    var submult = "⫁";
    var subnE = "⫋";
    var subne = "⊊";
    var subplus = "⪿";
    var subrarr = "⥹";
    var subset = "⊂";
    var Subset = "⋐";
    var subseteq = "⊆";
    var subseteqq = "⫅";
    var SubsetEqual = "⊆";
    var subsetneq = "⊊";
    var subsetneqq = "⫋";
    var subsim = "⫇";
    var subsub = "⫕";
    var subsup = "⫓";
    var succapprox = "⪸";
    var succ = "≻";
    var succcurlyeq = "≽";
    var Succeeds = "≻";
    var SucceedsEqual = "⪰";
    var SucceedsSlantEqual = "≽";
    var SucceedsTilde = "≿";
    var succeq = "⪰";
    var succnapprox = "⪺";
    var succneqq = "⪶";
    var succnsim = "⋩";
    var succsim = "≿";
    var SuchThat = "∋";
    var sum = "∑";
    var Sum = "∑";
    var sung = "♪";
    var sup1 = "¹";
    var sup2 = "²";
    var sup3 = "³";
    var sup = "⊃";
    var Sup = "⋑";
    var supdot = "⪾";
    var supdsub = "⫘";
    var supE = "⫆";
    var supe = "⊇";
    var supedot = "⫄";
    var Superset = "⊃";
    var SupersetEqual = "⊇";
    var suphsol = "⟉";
    var suphsub = "⫗";
    var suplarr = "⥻";
    var supmult = "⫂";
    var supnE = "⫌";
    var supne = "⊋";
    var supplus = "⫀";
    var supset = "⊃";
    var Supset = "⋑";
    var supseteq = "⊇";
    var supseteqq = "⫆";
    var supsetneq = "⊋";
    var supsetneqq = "⫌";
    var supsim = "⫈";
    var supsub = "⫔";
    var supsup = "⫖";
    var swarhk = "⤦";
    var swarr = "↙";
    var swArr = "⇙";
    var swarrow = "↙";
    var swnwar = "⤪";
    var szlig = "ß";
    var Tab = "\t";
    var target = "⌖";
    var Tau = "Τ";
    var tau = "τ";
    var tbrk = "⎴";
    var Tcaron = "Ť";
    var tcaron = "ť";
    var Tcedil = "Ţ";
    var tcedil = "ţ";
    var Tcy = "Т";
    var tcy = "т";
    var tdot = "⃛";
    var telrec = "⌕";
    var Tfr = "𝔗";
    var tfr = "𝔱";
    var there4 = "∴";
    var therefore = "∴";
    var Therefore = "∴";
    var Theta = "Θ";
    var theta = "θ";
    var thetasym = "ϑ";
    var thetav = "ϑ";
    var thickapprox = "≈";
    var thicksim = "∼";
    var ThickSpace = "  ";
    var ThinSpace = " ";
    var thinsp = " ";
    var thkap = "≈";
    var thksim = "∼";
    var THORN = "Þ";
    var thorn = "þ";
    var tilde = "˜";
    var Tilde = "∼";
    var TildeEqual = "≃";
    var TildeFullEqual = "≅";
    var TildeTilde = "≈";
    var timesbar = "⨱";
    var timesb = "⊠";
    var times = "×";
    var timesd = "⨰";
    var tint = "∭";
    var toea = "⤨";
    var topbot = "⌶";
    var topcir = "⫱";
    var top = "⊤";
    var Topf = "𝕋";
    var topf = "𝕥";
    var topfork = "⫚";
    var tosa = "⤩";
    var tprime = "‴";
    var trade = "™";
    var TRADE = "™";
    var triangle = "▵";
    var triangledown = "▿";
    var triangleleft = "◃";
    var trianglelefteq = "⊴";
    var triangleq = "≜";
    var triangleright = "▹";
    var trianglerighteq = "⊵";
    var tridot = "◬";
    var trie = "≜";
    var triminus = "⨺";
    var TripleDot = "⃛";
    var triplus = "⨹";
    var trisb = "⧍";
    var tritime = "⨻";
    var trpezium = "⏢";
    var Tscr = "𝒯";
    var tscr = "𝓉";
    var TScy = "Ц";
    var tscy = "ц";
    var TSHcy = "Ћ";
    var tshcy = "ћ";
    var Tstrok = "Ŧ";
    var tstrok = "ŧ";
    var twixt = "≬";
    var twoheadleftarrow = "↞";
    var twoheadrightarrow = "↠";
    var Uacute = "Ú";
    var uacute = "ú";
    var uarr = "↑";
    var Uarr = "↟";
    var uArr = "⇑";
    var Uarrocir = "⥉";
    var Ubrcy = "Ў";
    var ubrcy = "ў";
    var Ubreve = "Ŭ";
    var ubreve = "ŭ";
    var Ucirc = "Û";
    var ucirc = "û";
    var Ucy = "У";
    var ucy = "у";
    var udarr = "⇅";
    var Udblac = "Ű";
    var udblac = "ű";
    var udhar = "⥮";
    var ufisht = "⥾";
    var Ufr = "𝔘";
    var ufr = "𝔲";
    var Ugrave = "Ù";
    var ugrave = "ù";
    var uHar = "⥣";
    var uharl = "↿";
    var uharr = "↾";
    var uhblk = "▀";
    var ulcorn = "⌜";
    var ulcorner = "⌜";
    var ulcrop = "⌏";
    var ultri = "◸";
    var Umacr = "Ū";
    var umacr = "ū";
    var uml = "¨";
    var UnderBar = "_";
    var UnderBrace = "⏟";
    var UnderBracket = "⎵";
    var UnderParenthesis = "⏝";
    var Union = "⋃";
    var UnionPlus = "⊎";
    var Uogon = "Ų";
    var uogon = "ų";
    var Uopf = "𝕌";
    var uopf = "𝕦";
    var UpArrowBar = "⤒";
    var uparrow = "↑";
    var UpArrow = "↑";
    var Uparrow = "⇑";
    var UpArrowDownArrow = "⇅";
    var updownarrow = "↕";
    var UpDownArrow = "↕";
    var Updownarrow = "⇕";
    var UpEquilibrium = "⥮";
    var upharpoonleft = "↿";
    var upharpoonright = "↾";
    var uplus = "⊎";
    var UpperLeftArrow = "↖";
    var UpperRightArrow = "↗";
    var upsi = "υ";
    var Upsi = "ϒ";
    var upsih = "ϒ";
    var Upsilon = "Υ";
    var upsilon = "υ";
    var UpTeeArrow = "↥";
    var UpTee = "⊥";
    var upuparrows = "⇈";
    var urcorn = "⌝";
    var urcorner = "⌝";
    var urcrop = "⌎";
    var Uring = "Ů";
    var uring = "ů";
    var urtri = "◹";
    var Uscr = "𝒰";
    var uscr = "𝓊";
    var utdot = "⋰";
    var Utilde = "Ũ";
    var utilde = "ũ";
    var utri = "▵";
    var utrif = "▴";
    var uuarr = "⇈";
    var Uuml = "Ü";
    var uuml = "ü";
    var uwangle = "⦧";
    var vangrt = "⦜";
    var varepsilon = "ϵ";
    var varkappa = "ϰ";
    var varnothing = "∅";
    var varphi = "ϕ";
    var varpi = "ϖ";
    var varpropto = "∝";
    var varr = "↕";
    var vArr = "⇕";
    var varrho = "ϱ";
    var varsigma = "ς";
    var varsubsetneq = "⊊︀";
    var varsubsetneqq = "⫋︀";
    var varsupsetneq = "⊋︀";
    var varsupsetneqq = "⫌︀";
    var vartheta = "ϑ";
    var vartriangleleft = "⊲";
    var vartriangleright = "⊳";
    var vBar = "⫨";
    var Vbar = "⫫";
    var vBarv = "⫩";
    var Vcy = "В";
    var vcy = "в";
    var vdash = "⊢";
    var vDash = "⊨";
    var Vdash = "⊩";
    var VDash = "⊫";
    var Vdashl = "⫦";
    var veebar = "⊻";
    var vee = "∨";
    var Vee = "⋁";
    var veeeq = "≚";
    var vellip = "⋮";
    var verbar = "|";
    var Verbar = "‖";
    var vert = "|";
    var Vert = "‖";
    var VerticalBar = "∣";
    var VerticalLine = "|";
    var VerticalSeparator = "❘";
    var VerticalTilde = "≀";
    var VeryThinSpace = " ";
    var Vfr = "𝔙";
    var vfr = "𝔳";
    var vltri = "⊲";
    var vnsub = "⊂⃒";
    var vnsup = "⊃⃒";
    var Vopf = "𝕍";
    var vopf = "𝕧";
    var vprop = "∝";
    var vrtri = "⊳";
    var Vscr = "𝒱";
    var vscr = "𝓋";
    var vsubnE = "⫋︀";
    var vsubne = "⊊︀";
    var vsupnE = "⫌︀";
    var vsupne = "⊋︀";
    var Vvdash = "⊪";
    var vzigzag = "⦚";
    var Wcirc = "Ŵ";
    var wcirc = "ŵ";
    var wedbar = "⩟";
    var wedge = "∧";
    var Wedge = "⋀";
    var wedgeq = "≙";
    var weierp = "℘";
    var Wfr = "𝔚";
    var wfr = "𝔴";
    var Wopf = "𝕎";
    var wopf = "𝕨";
    var wp = "℘";
    var wr = "≀";
    var wreath = "≀";
    var Wscr = "𝒲";
    var wscr = "𝓌";
    var xcap = "⋂";
    var xcirc = "◯";
    var xcup = "⋃";
    var xdtri = "▽";
    var Xfr = "𝔛";
    var xfr = "𝔵";
    var xharr = "⟷";
    var xhArr = "⟺";
    var Xi = "Ξ";
    var xi = "ξ";
    var xlarr = "⟵";
    var xlArr = "⟸";
    var xmap = "⟼";
    var xnis = "⋻";
    var xodot = "⨀";
    var Xopf = "𝕏";
    var xopf = "𝕩";
    var xoplus = "⨁";
    var xotime = "⨂";
    var xrarr = "⟶";
    var xrArr = "⟹";
    var Xscr = "𝒳";
    var xscr = "𝓍";
    var xsqcup = "⨆";
    var xuplus = "⨄";
    var xutri = "△";
    var xvee = "⋁";
    var xwedge = "⋀";
    var Yacute = "Ý";
    var yacute = "ý";
    var YAcy = "Я";
    var yacy = "я";
    var Ycirc = "Ŷ";
    var ycirc = "ŷ";
    var Ycy = "Ы";
    var ycy = "ы";
    var yen = "¥";
    var Yfr = "𝔜";
    var yfr = "𝔶";
    var YIcy = "Ї";
    var yicy = "ї";
    var Yopf = "𝕐";
    var yopf = "𝕪";
    var Yscr = "𝒴";
    var yscr = "𝓎";
    var YUcy = "Ю";
    var yucy = "ю";
    var yuml = "ÿ";
    var Yuml = "Ÿ";
    var Zacute = "Ź";
    var zacute = "ź";
    var Zcaron = "Ž";
    var zcaron = "ž";
    var Zcy = "З";
    var zcy = "з";
    var Zdot = "Ż";
    var zdot = "ż";
    var zeetrf = "ℨ";
    var ZeroWidthSpace = "​";
    var Zeta = "Ζ";
    var zeta = "ζ";
    var zfr = "𝔷";
    var Zfr = "ℨ";
    var ZHcy = "Ж";
    var zhcy = "ж";
    var zigrarr = "⇝";
    var zopf = "𝕫";
    var Zopf = "ℤ";
    var Zscr = "𝒵";
    var zscr = "𝓏";
    var zwj = "‍";
    var zwnj = "‌";
    var entities = {
    	Aacute: Aacute,
    	aacute: aacute,
    	Abreve: Abreve,
    	abreve: abreve,
    	ac: ac,
    	acd: acd,
    	acE: acE,
    	Acirc: Acirc,
    	acirc: acirc,
    	acute: acute,
    	Acy: Acy,
    	acy: acy,
    	AElig: AElig,
    	aelig: aelig,
    	af: af,
    	Afr: Afr,
    	afr: afr,
    	Agrave: Agrave,
    	agrave: agrave,
    	alefsym: alefsym,
    	aleph: aleph,
    	Alpha: Alpha,
    	alpha: alpha,
    	Amacr: Amacr,
    	amacr: amacr,
    	amalg: amalg,
    	amp: amp,
    	AMP: AMP,
    	andand: andand,
    	And: And,
    	and: and,
    	andd: andd,
    	andslope: andslope,
    	andv: andv,
    	ang: ang,
    	ange: ange,
    	angle: angle,
    	angmsdaa: angmsdaa,
    	angmsdab: angmsdab,
    	angmsdac: angmsdac,
    	angmsdad: angmsdad,
    	angmsdae: angmsdae,
    	angmsdaf: angmsdaf,
    	angmsdag: angmsdag,
    	angmsdah: angmsdah,
    	angmsd: angmsd,
    	angrt: angrt,
    	angrtvb: angrtvb,
    	angrtvbd: angrtvbd,
    	angsph: angsph,
    	angst: angst,
    	angzarr: angzarr,
    	Aogon: Aogon,
    	aogon: aogon,
    	Aopf: Aopf,
    	aopf: aopf,
    	apacir: apacir,
    	ap: ap,
    	apE: apE,
    	ape: ape,
    	apid: apid,
    	apos: apos,
    	ApplyFunction: ApplyFunction,
    	approx: approx,
    	approxeq: approxeq,
    	Aring: Aring,
    	aring: aring,
    	Ascr: Ascr,
    	ascr: ascr,
    	Assign: Assign,
    	ast: ast,
    	asymp: asymp,
    	asympeq: asympeq,
    	Atilde: Atilde,
    	atilde: atilde,
    	Auml: Auml,
    	auml: auml,
    	awconint: awconint,
    	awint: awint,
    	backcong: backcong,
    	backepsilon: backepsilon,
    	backprime: backprime,
    	backsim: backsim,
    	backsimeq: backsimeq,
    	Backslash: Backslash,
    	Barv: Barv,
    	barvee: barvee,
    	barwed: barwed,
    	Barwed: Barwed,
    	barwedge: barwedge,
    	bbrk: bbrk,
    	bbrktbrk: bbrktbrk,
    	bcong: bcong,
    	Bcy: Bcy,
    	bcy: bcy,
    	bdquo: bdquo,
    	becaus: becaus,
    	because: because,
    	Because: Because,
    	bemptyv: bemptyv,
    	bepsi: bepsi,
    	bernou: bernou,
    	Bernoullis: Bernoullis,
    	Beta: Beta,
    	beta: beta,
    	beth: beth,
    	between: between,
    	Bfr: Bfr,
    	bfr: bfr,
    	bigcap: bigcap,
    	bigcirc: bigcirc,
    	bigcup: bigcup,
    	bigodot: bigodot,
    	bigoplus: bigoplus,
    	bigotimes: bigotimes,
    	bigsqcup: bigsqcup,
    	bigstar: bigstar,
    	bigtriangledown: bigtriangledown,
    	bigtriangleup: bigtriangleup,
    	biguplus: biguplus,
    	bigvee: bigvee,
    	bigwedge: bigwedge,
    	bkarow: bkarow,
    	blacklozenge: blacklozenge,
    	blacksquare: blacksquare,
    	blacktriangle: blacktriangle,
    	blacktriangledown: blacktriangledown,
    	blacktriangleleft: blacktriangleleft,
    	blacktriangleright: blacktriangleright,
    	blank: blank,
    	blk12: blk12,
    	blk14: blk14,
    	blk34: blk34,
    	block: block,
    	bne: bne,
    	bnequiv: bnequiv,
    	bNot: bNot,
    	bnot: bnot,
    	Bopf: Bopf,
    	bopf: bopf,
    	bot: bot,
    	bottom: bottom,
    	bowtie: bowtie,
    	boxbox: boxbox,
    	boxdl: boxdl,
    	boxdL: boxdL,
    	boxDl: boxDl,
    	boxDL: boxDL,
    	boxdr: boxdr,
    	boxdR: boxdR,
    	boxDr: boxDr,
    	boxDR: boxDR,
    	boxh: boxh,
    	boxH: boxH,
    	boxhd: boxhd,
    	boxHd: boxHd,
    	boxhD: boxhD,
    	boxHD: boxHD,
    	boxhu: boxhu,
    	boxHu: boxHu,
    	boxhU: boxhU,
    	boxHU: boxHU,
    	boxminus: boxminus,
    	boxplus: boxplus,
    	boxtimes: boxtimes,
    	boxul: boxul,
    	boxuL: boxuL,
    	boxUl: boxUl,
    	boxUL: boxUL,
    	boxur: boxur,
    	boxuR: boxuR,
    	boxUr: boxUr,
    	boxUR: boxUR,
    	boxv: boxv,
    	boxV: boxV,
    	boxvh: boxvh,
    	boxvH: boxvH,
    	boxVh: boxVh,
    	boxVH: boxVH,
    	boxvl: boxvl,
    	boxvL: boxvL,
    	boxVl: boxVl,
    	boxVL: boxVL,
    	boxvr: boxvr,
    	boxvR: boxvR,
    	boxVr: boxVr,
    	boxVR: boxVR,
    	bprime: bprime,
    	breve: breve,
    	Breve: Breve,
    	brvbar: brvbar,
    	bscr: bscr,
    	Bscr: Bscr,
    	bsemi: bsemi,
    	bsim: bsim,
    	bsime: bsime,
    	bsolb: bsolb,
    	bsol: bsol,
    	bsolhsub: bsolhsub,
    	bull: bull,
    	bullet: bullet,
    	bump: bump,
    	bumpE: bumpE,
    	bumpe: bumpe,
    	Bumpeq: Bumpeq,
    	bumpeq: bumpeq,
    	Cacute: Cacute,
    	cacute: cacute,
    	capand: capand,
    	capbrcup: capbrcup,
    	capcap: capcap,
    	cap: cap,
    	Cap: Cap,
    	capcup: capcup,
    	capdot: capdot,
    	CapitalDifferentialD: CapitalDifferentialD,
    	caps: caps,
    	caret: caret,
    	caron: caron,
    	Cayleys: Cayleys,
    	ccaps: ccaps,
    	Ccaron: Ccaron,
    	ccaron: ccaron,
    	Ccedil: Ccedil,
    	ccedil: ccedil,
    	Ccirc: Ccirc,
    	ccirc: ccirc,
    	Cconint: Cconint,
    	ccups: ccups,
    	ccupssm: ccupssm,
    	Cdot: Cdot,
    	cdot: cdot,
    	cedil: cedil,
    	Cedilla: Cedilla,
    	cemptyv: cemptyv,
    	cent: cent,
    	centerdot: centerdot,
    	CenterDot: CenterDot,
    	cfr: cfr,
    	Cfr: Cfr,
    	CHcy: CHcy,
    	chcy: chcy,
    	check: check,
    	checkmark: checkmark,
    	Chi: Chi,
    	chi: chi,
    	circ: circ,
    	circeq: circeq,
    	circlearrowleft: circlearrowleft,
    	circlearrowright: circlearrowright,
    	circledast: circledast,
    	circledcirc: circledcirc,
    	circleddash: circleddash,
    	CircleDot: CircleDot,
    	circledR: circledR,
    	circledS: circledS,
    	CircleMinus: CircleMinus,
    	CirclePlus: CirclePlus,
    	CircleTimes: CircleTimes,
    	cir: cir,
    	cirE: cirE,
    	cire: cire,
    	cirfnint: cirfnint,
    	cirmid: cirmid,
    	cirscir: cirscir,
    	ClockwiseContourIntegral: ClockwiseContourIntegral,
    	CloseCurlyDoubleQuote: CloseCurlyDoubleQuote,
    	CloseCurlyQuote: CloseCurlyQuote,
    	clubs: clubs,
    	clubsuit: clubsuit,
    	colon: colon,
    	Colon: Colon,
    	Colone: Colone,
    	colone: colone,
    	coloneq: coloneq,
    	comma: comma,
    	commat: commat,
    	comp: comp,
    	compfn: compfn,
    	complement: complement,
    	complexes: complexes,
    	cong: cong,
    	congdot: congdot,
    	Congruent: Congruent,
    	conint: conint,
    	Conint: Conint,
    	ContourIntegral: ContourIntegral,
    	copf: copf,
    	Copf: Copf,
    	coprod: coprod,
    	Coproduct: Coproduct,
    	copy: copy,
    	COPY: COPY,
    	copysr: copysr,
    	CounterClockwiseContourIntegral: CounterClockwiseContourIntegral,
    	crarr: crarr,
    	cross: cross,
    	Cross: Cross,
    	Cscr: Cscr,
    	cscr: cscr,
    	csub: csub,
    	csube: csube,
    	csup: csup,
    	csupe: csupe,
    	ctdot: ctdot,
    	cudarrl: cudarrl,
    	cudarrr: cudarrr,
    	cuepr: cuepr,
    	cuesc: cuesc,
    	cularr: cularr,
    	cularrp: cularrp,
    	cupbrcap: cupbrcap,
    	cupcap: cupcap,
    	CupCap: CupCap,
    	cup: cup,
    	Cup: Cup,
    	cupcup: cupcup,
    	cupdot: cupdot,
    	cupor: cupor,
    	cups: cups,
    	curarr: curarr,
    	curarrm: curarrm,
    	curlyeqprec: curlyeqprec,
    	curlyeqsucc: curlyeqsucc,
    	curlyvee: curlyvee,
    	curlywedge: curlywedge,
    	curren: curren,
    	curvearrowleft: curvearrowleft,
    	curvearrowright: curvearrowright,
    	cuvee: cuvee,
    	cuwed: cuwed,
    	cwconint: cwconint,
    	cwint: cwint,
    	cylcty: cylcty,
    	dagger: dagger,
    	Dagger: Dagger,
    	daleth: daleth,
    	darr: darr,
    	Darr: Darr,
    	dArr: dArr,
    	dash: dash,
    	Dashv: Dashv,
    	dashv: dashv,
    	dbkarow: dbkarow,
    	dblac: dblac,
    	Dcaron: Dcaron,
    	dcaron: dcaron,
    	Dcy: Dcy,
    	dcy: dcy,
    	ddagger: ddagger,
    	ddarr: ddarr,
    	DD: DD,
    	dd: dd,
    	DDotrahd: DDotrahd,
    	ddotseq: ddotseq,
    	deg: deg,
    	Del: Del,
    	Delta: Delta,
    	delta: delta,
    	demptyv: demptyv,
    	dfisht: dfisht,
    	Dfr: Dfr,
    	dfr: dfr,
    	dHar: dHar,
    	dharl: dharl,
    	dharr: dharr,
    	DiacriticalAcute: DiacriticalAcute,
    	DiacriticalDot: DiacriticalDot,
    	DiacriticalDoubleAcute: DiacriticalDoubleAcute,
    	DiacriticalGrave: DiacriticalGrave,
    	DiacriticalTilde: DiacriticalTilde,
    	diam: diam,
    	diamond: diamond,
    	Diamond: Diamond,
    	diamondsuit: diamondsuit,
    	diams: diams,
    	die: die,
    	DifferentialD: DifferentialD,
    	digamma: digamma,
    	disin: disin,
    	div: div,
    	divide: divide,
    	divideontimes: divideontimes,
    	divonx: divonx,
    	DJcy: DJcy,
    	djcy: djcy,
    	dlcorn: dlcorn,
    	dlcrop: dlcrop,
    	dollar: dollar,
    	Dopf: Dopf,
    	dopf: dopf,
    	Dot: Dot,
    	dot: dot,
    	DotDot: DotDot,
    	doteq: doteq,
    	doteqdot: doteqdot,
    	DotEqual: DotEqual,
    	dotminus: dotminus,
    	dotplus: dotplus,
    	dotsquare: dotsquare,
    	doublebarwedge: doublebarwedge,
    	DoubleContourIntegral: DoubleContourIntegral,
    	DoubleDot: DoubleDot,
    	DoubleDownArrow: DoubleDownArrow,
    	DoubleLeftArrow: DoubleLeftArrow,
    	DoubleLeftRightArrow: DoubleLeftRightArrow,
    	DoubleLeftTee: DoubleLeftTee,
    	DoubleLongLeftArrow: DoubleLongLeftArrow,
    	DoubleLongLeftRightArrow: DoubleLongLeftRightArrow,
    	DoubleLongRightArrow: DoubleLongRightArrow,
    	DoubleRightArrow: DoubleRightArrow,
    	DoubleRightTee: DoubleRightTee,
    	DoubleUpArrow: DoubleUpArrow,
    	DoubleUpDownArrow: DoubleUpDownArrow,
    	DoubleVerticalBar: DoubleVerticalBar,
    	DownArrowBar: DownArrowBar,
    	downarrow: downarrow,
    	DownArrow: DownArrow,
    	Downarrow: Downarrow,
    	DownArrowUpArrow: DownArrowUpArrow,
    	DownBreve: DownBreve,
    	downdownarrows: downdownarrows,
    	downharpoonleft: downharpoonleft,
    	downharpoonright: downharpoonright,
    	DownLeftRightVector: DownLeftRightVector,
    	DownLeftTeeVector: DownLeftTeeVector,
    	DownLeftVectorBar: DownLeftVectorBar,
    	DownLeftVector: DownLeftVector,
    	DownRightTeeVector: DownRightTeeVector,
    	DownRightVectorBar: DownRightVectorBar,
    	DownRightVector: DownRightVector,
    	DownTeeArrow: DownTeeArrow,
    	DownTee: DownTee,
    	drbkarow: drbkarow,
    	drcorn: drcorn,
    	drcrop: drcrop,
    	Dscr: Dscr,
    	dscr: dscr,
    	DScy: DScy,
    	dscy: dscy,
    	dsol: dsol,
    	Dstrok: Dstrok,
    	dstrok: dstrok,
    	dtdot: dtdot,
    	dtri: dtri,
    	dtrif: dtrif,
    	duarr: duarr,
    	duhar: duhar,
    	dwangle: dwangle,
    	DZcy: DZcy,
    	dzcy: dzcy,
    	dzigrarr: dzigrarr,
    	Eacute: Eacute,
    	eacute: eacute,
    	easter: easter,
    	Ecaron: Ecaron,
    	ecaron: ecaron,
    	Ecirc: Ecirc,
    	ecirc: ecirc,
    	ecir: ecir,
    	ecolon: ecolon,
    	Ecy: Ecy,
    	ecy: ecy,
    	eDDot: eDDot,
    	Edot: Edot,
    	edot: edot,
    	eDot: eDot,
    	ee: ee,
    	efDot: efDot,
    	Efr: Efr,
    	efr: efr,
    	eg: eg,
    	Egrave: Egrave,
    	egrave: egrave,
    	egs: egs,
    	egsdot: egsdot,
    	el: el,
    	Element: Element,
    	elinters: elinters,
    	ell: ell,
    	els: els,
    	elsdot: elsdot,
    	Emacr: Emacr,
    	emacr: emacr,
    	empty: empty$1,
    	emptyset: emptyset,
    	EmptySmallSquare: EmptySmallSquare,
    	emptyv: emptyv,
    	EmptyVerySmallSquare: EmptyVerySmallSquare,
    	emsp13: emsp13,
    	emsp14: emsp14,
    	emsp: emsp,
    	ENG: ENG,
    	eng: eng,
    	ensp: ensp,
    	Eogon: Eogon,
    	eogon: eogon,
    	Eopf: Eopf,
    	eopf: eopf,
    	epar: epar,
    	eparsl: eparsl,
    	eplus: eplus,
    	epsi: epsi,
    	Epsilon: Epsilon,
    	epsilon: epsilon,
    	epsiv: epsiv,
    	eqcirc: eqcirc,
    	eqcolon: eqcolon,
    	eqsim: eqsim,
    	eqslantgtr: eqslantgtr,
    	eqslantless: eqslantless,
    	Equal: Equal,
    	equals: equals,
    	EqualTilde: EqualTilde,
    	equest: equest,
    	Equilibrium: Equilibrium,
    	equiv: equiv,
    	equivDD: equivDD,
    	eqvparsl: eqvparsl,
    	erarr: erarr,
    	erDot: erDot,
    	escr: escr,
    	Escr: Escr,
    	esdot: esdot,
    	Esim: Esim,
    	esim: esim,
    	Eta: Eta,
    	eta: eta,
    	ETH: ETH,
    	eth: eth,
    	Euml: Euml,
    	euml: euml,
    	euro: euro,
    	excl: excl,
    	exist: exist,
    	Exists: Exists,
    	expectation: expectation,
    	exponentiale: exponentiale,
    	ExponentialE: ExponentialE,
    	fallingdotseq: fallingdotseq,
    	Fcy: Fcy,
    	fcy: fcy,
    	female: female,
    	ffilig: ffilig,
    	fflig: fflig,
    	ffllig: ffllig,
    	Ffr: Ffr,
    	ffr: ffr,
    	filig: filig,
    	FilledSmallSquare: FilledSmallSquare,
    	FilledVerySmallSquare: FilledVerySmallSquare,
    	fjlig: fjlig,
    	flat: flat,
    	fllig: fllig,
    	fltns: fltns,
    	fnof: fnof,
    	Fopf: Fopf,
    	fopf: fopf,
    	forall: forall,
    	ForAll: ForAll,
    	fork: fork,
    	forkv: forkv,
    	Fouriertrf: Fouriertrf,
    	fpartint: fpartint,
    	frac12: frac12,
    	frac13: frac13,
    	frac14: frac14,
    	frac15: frac15,
    	frac16: frac16,
    	frac18: frac18,
    	frac23: frac23,
    	frac25: frac25,
    	frac34: frac34,
    	frac35: frac35,
    	frac38: frac38,
    	frac45: frac45,
    	frac56: frac56,
    	frac58: frac58,
    	frac78: frac78,
    	frasl: frasl,
    	frown: frown,
    	fscr: fscr,
    	Fscr: Fscr,
    	gacute: gacute,
    	Gamma: Gamma,
    	gamma: gamma,
    	Gammad: Gammad,
    	gammad: gammad,
    	gap: gap,
    	Gbreve: Gbreve,
    	gbreve: gbreve,
    	Gcedil: Gcedil,
    	Gcirc: Gcirc,
    	gcirc: gcirc,
    	Gcy: Gcy,
    	gcy: gcy,
    	Gdot: Gdot,
    	gdot: gdot,
    	ge: ge,
    	gE: gE,
    	gEl: gEl,
    	gel: gel,
    	geq: geq,
    	geqq: geqq,
    	geqslant: geqslant,
    	gescc: gescc,
    	ges: ges,
    	gesdot: gesdot,
    	gesdoto: gesdoto,
    	gesdotol: gesdotol,
    	gesl: gesl,
    	gesles: gesles,
    	Gfr: Gfr,
    	gfr: gfr,
    	gg: gg,
    	Gg: Gg,
    	ggg: ggg,
    	gimel: gimel,
    	GJcy: GJcy,
    	gjcy: gjcy,
    	gla: gla,
    	gl: gl,
    	glE: glE,
    	glj: glj,
    	gnap: gnap,
    	gnapprox: gnapprox,
    	gne: gne,
    	gnE: gnE,
    	gneq: gneq,
    	gneqq: gneqq,
    	gnsim: gnsim,
    	Gopf: Gopf,
    	gopf: gopf,
    	grave: grave,
    	GreaterEqual: GreaterEqual,
    	GreaterEqualLess: GreaterEqualLess,
    	GreaterFullEqual: GreaterFullEqual,
    	GreaterGreater: GreaterGreater,
    	GreaterLess: GreaterLess,
    	GreaterSlantEqual: GreaterSlantEqual,
    	GreaterTilde: GreaterTilde,
    	Gscr: Gscr,
    	gscr: gscr,
    	gsim: gsim,
    	gsime: gsime,
    	gsiml: gsiml,
    	gtcc: gtcc,
    	gtcir: gtcir,
    	gt: gt,
    	GT: GT,
    	Gt: Gt,
    	gtdot: gtdot,
    	gtlPar: gtlPar,
    	gtquest: gtquest,
    	gtrapprox: gtrapprox,
    	gtrarr: gtrarr,
    	gtrdot: gtrdot,
    	gtreqless: gtreqless,
    	gtreqqless: gtreqqless,
    	gtrless: gtrless,
    	gtrsim: gtrsim,
    	gvertneqq: gvertneqq,
    	gvnE: gvnE,
    	Hacek: Hacek,
    	hairsp: hairsp,
    	half: half,
    	hamilt: hamilt,
    	HARDcy: HARDcy,
    	hardcy: hardcy,
    	harrcir: harrcir,
    	harr: harr,
    	hArr: hArr,
    	harrw: harrw,
    	Hat: Hat,
    	hbar: hbar,
    	Hcirc: Hcirc,
    	hcirc: hcirc,
    	hearts: hearts,
    	heartsuit: heartsuit,
    	hellip: hellip,
    	hercon: hercon,
    	hfr: hfr,
    	Hfr: Hfr,
    	HilbertSpace: HilbertSpace,
    	hksearow: hksearow,
    	hkswarow: hkswarow,
    	hoarr: hoarr,
    	homtht: homtht,
    	hookleftarrow: hookleftarrow,
    	hookrightarrow: hookrightarrow,
    	hopf: hopf,
    	Hopf: Hopf,
    	horbar: horbar,
    	HorizontalLine: HorizontalLine,
    	hscr: hscr,
    	Hscr: Hscr,
    	hslash: hslash,
    	Hstrok: Hstrok,
    	hstrok: hstrok,
    	HumpDownHump: HumpDownHump,
    	HumpEqual: HumpEqual,
    	hybull: hybull,
    	hyphen: hyphen,
    	Iacute: Iacute,
    	iacute: iacute,
    	ic: ic,
    	Icirc: Icirc,
    	icirc: icirc,
    	Icy: Icy,
    	icy: icy,
    	Idot: Idot,
    	IEcy: IEcy,
    	iecy: iecy,
    	iexcl: iexcl,
    	iff: iff,
    	ifr: ifr,
    	Ifr: Ifr,
    	Igrave: Igrave,
    	igrave: igrave,
    	ii: ii,
    	iiiint: iiiint,
    	iiint: iiint,
    	iinfin: iinfin,
    	iiota: iiota,
    	IJlig: IJlig,
    	ijlig: ijlig,
    	Imacr: Imacr,
    	imacr: imacr,
    	image: image,
    	ImaginaryI: ImaginaryI,
    	imagline: imagline,
    	imagpart: imagpart,
    	imath: imath,
    	Im: Im,
    	imof: imof,
    	imped: imped,
    	Implies: Implies,
    	incare: incare,
    	"in": "∈",
    	infin: infin,
    	infintie: infintie,
    	inodot: inodot,
    	intcal: intcal,
    	int: int,
    	Int: Int,
    	integers: integers,
    	Integral: Integral,
    	intercal: intercal,
    	Intersection: Intersection,
    	intlarhk: intlarhk,
    	intprod: intprod,
    	InvisibleComma: InvisibleComma,
    	InvisibleTimes: InvisibleTimes,
    	IOcy: IOcy,
    	iocy: iocy,
    	Iogon: Iogon,
    	iogon: iogon,
    	Iopf: Iopf,
    	iopf: iopf,
    	Iota: Iota,
    	iota: iota,
    	iprod: iprod,
    	iquest: iquest,
    	iscr: iscr,
    	Iscr: Iscr,
    	isin: isin,
    	isindot: isindot,
    	isinE: isinE,
    	isins: isins,
    	isinsv: isinsv,
    	isinv: isinv,
    	it: it,
    	Itilde: Itilde,
    	itilde: itilde,
    	Iukcy: Iukcy,
    	iukcy: iukcy,
    	Iuml: Iuml,
    	iuml: iuml,
    	Jcirc: Jcirc,
    	jcirc: jcirc,
    	Jcy: Jcy,
    	jcy: jcy,
    	Jfr: Jfr,
    	jfr: jfr,
    	jmath: jmath,
    	Jopf: Jopf,
    	jopf: jopf,
    	Jscr: Jscr,
    	jscr: jscr,
    	Jsercy: Jsercy,
    	jsercy: jsercy,
    	Jukcy: Jukcy,
    	jukcy: jukcy,
    	Kappa: Kappa,
    	kappa: kappa,
    	kappav: kappav,
    	Kcedil: Kcedil,
    	kcedil: kcedil,
    	Kcy: Kcy,
    	kcy: kcy,
    	Kfr: Kfr,
    	kfr: kfr,
    	kgreen: kgreen,
    	KHcy: KHcy,
    	khcy: khcy,
    	KJcy: KJcy,
    	kjcy: kjcy,
    	Kopf: Kopf,
    	kopf: kopf,
    	Kscr: Kscr,
    	kscr: kscr,
    	lAarr: lAarr,
    	Lacute: Lacute,
    	lacute: lacute,
    	laemptyv: laemptyv,
    	lagran: lagran,
    	Lambda: Lambda,
    	lambda: lambda,
    	lang: lang,
    	Lang: Lang,
    	langd: langd,
    	langle: langle,
    	lap: lap,
    	Laplacetrf: Laplacetrf,
    	laquo: laquo,
    	larrb: larrb,
    	larrbfs: larrbfs,
    	larr: larr,
    	Larr: Larr,
    	lArr: lArr,
    	larrfs: larrfs,
    	larrhk: larrhk,
    	larrlp: larrlp,
    	larrpl: larrpl,
    	larrsim: larrsim,
    	larrtl: larrtl,
    	latail: latail,
    	lAtail: lAtail,
    	lat: lat,
    	late: late,
    	lates: lates,
    	lbarr: lbarr,
    	lBarr: lBarr,
    	lbbrk: lbbrk,
    	lbrace: lbrace,
    	lbrack: lbrack,
    	lbrke: lbrke,
    	lbrksld: lbrksld,
    	lbrkslu: lbrkslu,
    	Lcaron: Lcaron,
    	lcaron: lcaron,
    	Lcedil: Lcedil,
    	lcedil: lcedil,
    	lceil: lceil,
    	lcub: lcub,
    	Lcy: Lcy,
    	lcy: lcy,
    	ldca: ldca,
    	ldquo: ldquo,
    	ldquor: ldquor,
    	ldrdhar: ldrdhar,
    	ldrushar: ldrushar,
    	ldsh: ldsh,
    	le: le,
    	lE: lE,
    	LeftAngleBracket: LeftAngleBracket,
    	LeftArrowBar: LeftArrowBar,
    	leftarrow: leftarrow,
    	LeftArrow: LeftArrow,
    	Leftarrow: Leftarrow,
    	LeftArrowRightArrow: LeftArrowRightArrow,
    	leftarrowtail: leftarrowtail,
    	LeftCeiling: LeftCeiling,
    	LeftDoubleBracket: LeftDoubleBracket,
    	LeftDownTeeVector: LeftDownTeeVector,
    	LeftDownVectorBar: LeftDownVectorBar,
    	LeftDownVector: LeftDownVector,
    	LeftFloor: LeftFloor,
    	leftharpoondown: leftharpoondown,
    	leftharpoonup: leftharpoonup,
    	leftleftarrows: leftleftarrows,
    	leftrightarrow: leftrightarrow,
    	LeftRightArrow: LeftRightArrow,
    	Leftrightarrow: Leftrightarrow,
    	leftrightarrows: leftrightarrows,
    	leftrightharpoons: leftrightharpoons,
    	leftrightsquigarrow: leftrightsquigarrow,
    	LeftRightVector: LeftRightVector,
    	LeftTeeArrow: LeftTeeArrow,
    	LeftTee: LeftTee,
    	LeftTeeVector: LeftTeeVector,
    	leftthreetimes: leftthreetimes,
    	LeftTriangleBar: LeftTriangleBar,
    	LeftTriangle: LeftTriangle,
    	LeftTriangleEqual: LeftTriangleEqual,
    	LeftUpDownVector: LeftUpDownVector,
    	LeftUpTeeVector: LeftUpTeeVector,
    	LeftUpVectorBar: LeftUpVectorBar,
    	LeftUpVector: LeftUpVector,
    	LeftVectorBar: LeftVectorBar,
    	LeftVector: LeftVector,
    	lEg: lEg,
    	leg: leg,
    	leq: leq,
    	leqq: leqq,
    	leqslant: leqslant,
    	lescc: lescc,
    	les: les,
    	lesdot: lesdot,
    	lesdoto: lesdoto,
    	lesdotor: lesdotor,
    	lesg: lesg,
    	lesges: lesges,
    	lessapprox: lessapprox,
    	lessdot: lessdot,
    	lesseqgtr: lesseqgtr,
    	lesseqqgtr: lesseqqgtr,
    	LessEqualGreater: LessEqualGreater,
    	LessFullEqual: LessFullEqual,
    	LessGreater: LessGreater,
    	lessgtr: lessgtr,
    	LessLess: LessLess,
    	lesssim: lesssim,
    	LessSlantEqual: LessSlantEqual,
    	LessTilde: LessTilde,
    	lfisht: lfisht,
    	lfloor: lfloor,
    	Lfr: Lfr,
    	lfr: lfr,
    	lg: lg,
    	lgE: lgE,
    	lHar: lHar,
    	lhard: lhard,
    	lharu: lharu,
    	lharul: lharul,
    	lhblk: lhblk,
    	LJcy: LJcy,
    	ljcy: ljcy,
    	llarr: llarr,
    	ll: ll,
    	Ll: Ll,
    	llcorner: llcorner,
    	Lleftarrow: Lleftarrow,
    	llhard: llhard,
    	lltri: lltri,
    	Lmidot: Lmidot,
    	lmidot: lmidot,
    	lmoustache: lmoustache,
    	lmoust: lmoust,
    	lnap: lnap,
    	lnapprox: lnapprox,
    	lne: lne,
    	lnE: lnE,
    	lneq: lneq,
    	lneqq: lneqq,
    	lnsim: lnsim,
    	loang: loang,
    	loarr: loarr,
    	lobrk: lobrk,
    	longleftarrow: longleftarrow,
    	LongLeftArrow: LongLeftArrow,
    	Longleftarrow: Longleftarrow,
    	longleftrightarrow: longleftrightarrow,
    	LongLeftRightArrow: LongLeftRightArrow,
    	Longleftrightarrow: Longleftrightarrow,
    	longmapsto: longmapsto,
    	longrightarrow: longrightarrow,
    	LongRightArrow: LongRightArrow,
    	Longrightarrow: Longrightarrow,
    	looparrowleft: looparrowleft,
    	looparrowright: looparrowright,
    	lopar: lopar,
    	Lopf: Lopf,
    	lopf: lopf,
    	loplus: loplus,
    	lotimes: lotimes,
    	lowast: lowast,
    	lowbar: lowbar,
    	LowerLeftArrow: LowerLeftArrow,
    	LowerRightArrow: LowerRightArrow,
    	loz: loz,
    	lozenge: lozenge,
    	lozf: lozf,
    	lpar: lpar,
    	lparlt: lparlt,
    	lrarr: lrarr,
    	lrcorner: lrcorner,
    	lrhar: lrhar,
    	lrhard: lrhard,
    	lrm: lrm,
    	lrtri: lrtri,
    	lsaquo: lsaquo,
    	lscr: lscr,
    	Lscr: Lscr,
    	lsh: lsh,
    	Lsh: Lsh,
    	lsim: lsim,
    	lsime: lsime,
    	lsimg: lsimg,
    	lsqb: lsqb,
    	lsquo: lsquo,
    	lsquor: lsquor,
    	Lstrok: Lstrok,
    	lstrok: lstrok,
    	ltcc: ltcc,
    	ltcir: ltcir,
    	lt: lt,
    	LT: LT,
    	Lt: Lt,
    	ltdot: ltdot,
    	lthree: lthree,
    	ltimes: ltimes,
    	ltlarr: ltlarr,
    	ltquest: ltquest,
    	ltri: ltri,
    	ltrie: ltrie,
    	ltrif: ltrif,
    	ltrPar: ltrPar,
    	lurdshar: lurdshar,
    	luruhar: luruhar,
    	lvertneqq: lvertneqq,
    	lvnE: lvnE,
    	macr: macr,
    	male: male,
    	malt: malt,
    	maltese: maltese,
    	"Map": "⤅",
    	map: map,
    	mapsto: mapsto,
    	mapstodown: mapstodown,
    	mapstoleft: mapstoleft,
    	mapstoup: mapstoup,
    	marker: marker,
    	mcomma: mcomma,
    	Mcy: Mcy,
    	mcy: mcy,
    	mdash: mdash,
    	mDDot: mDDot,
    	measuredangle: measuredangle,
    	MediumSpace: MediumSpace,
    	Mellintrf: Mellintrf,
    	Mfr: Mfr,
    	mfr: mfr,
    	mho: mho,
    	micro: micro,
    	midast: midast,
    	midcir: midcir,
    	mid: mid,
    	middot: middot,
    	minusb: minusb,
    	minus: minus,
    	minusd: minusd,
    	minusdu: minusdu,
    	MinusPlus: MinusPlus,
    	mlcp: mlcp,
    	mldr: mldr,
    	mnplus: mnplus,
    	models: models,
    	Mopf: Mopf,
    	mopf: mopf,
    	mp: mp,
    	mscr: mscr,
    	Mscr: Mscr,
    	mstpos: mstpos,
    	Mu: Mu,
    	mu: mu,
    	multimap: multimap,
    	mumap: mumap,
    	nabla: nabla,
    	Nacute: Nacute,
    	nacute: nacute,
    	nang: nang,
    	nap: nap,
    	napE: napE,
    	napid: napid,
    	napos: napos,
    	napprox: napprox,
    	natural: natural,
    	naturals: naturals,
    	natur: natur,
    	nbsp: nbsp,
    	nbump: nbump,
    	nbumpe: nbumpe,
    	ncap: ncap,
    	Ncaron: Ncaron,
    	ncaron: ncaron,
    	Ncedil: Ncedil,
    	ncedil: ncedil,
    	ncong: ncong,
    	ncongdot: ncongdot,
    	ncup: ncup,
    	Ncy: Ncy,
    	ncy: ncy,
    	ndash: ndash,
    	nearhk: nearhk,
    	nearr: nearr,
    	neArr: neArr,
    	nearrow: nearrow,
    	ne: ne,
    	nedot: nedot,
    	NegativeMediumSpace: NegativeMediumSpace,
    	NegativeThickSpace: NegativeThickSpace,
    	NegativeThinSpace: NegativeThinSpace,
    	NegativeVeryThinSpace: NegativeVeryThinSpace,
    	nequiv: nequiv,
    	nesear: nesear,
    	nesim: nesim,
    	NestedGreaterGreater: NestedGreaterGreater,
    	NestedLessLess: NestedLessLess,
    	NewLine: NewLine,
    	nexist: nexist,
    	nexists: nexists,
    	Nfr: Nfr,
    	nfr: nfr,
    	ngE: ngE,
    	nge: nge,
    	ngeq: ngeq,
    	ngeqq: ngeqq,
    	ngeqslant: ngeqslant,
    	nges: nges,
    	nGg: nGg,
    	ngsim: ngsim,
    	nGt: nGt,
    	ngt: ngt,
    	ngtr: ngtr,
    	nGtv: nGtv,
    	nharr: nharr,
    	nhArr: nhArr,
    	nhpar: nhpar,
    	ni: ni,
    	nis: nis,
    	nisd: nisd,
    	niv: niv,
    	NJcy: NJcy,
    	njcy: njcy,
    	nlarr: nlarr,
    	nlArr: nlArr,
    	nldr: nldr,
    	nlE: nlE,
    	nle: nle,
    	nleftarrow: nleftarrow,
    	nLeftarrow: nLeftarrow,
    	nleftrightarrow: nleftrightarrow,
    	nLeftrightarrow: nLeftrightarrow,
    	nleq: nleq,
    	nleqq: nleqq,
    	nleqslant: nleqslant,
    	nles: nles,
    	nless: nless,
    	nLl: nLl,
    	nlsim: nlsim,
    	nLt: nLt,
    	nlt: nlt,
    	nltri: nltri,
    	nltrie: nltrie,
    	nLtv: nLtv,
    	nmid: nmid,
    	NoBreak: NoBreak,
    	NonBreakingSpace: NonBreakingSpace,
    	nopf: nopf,
    	Nopf: Nopf,
    	Not: Not,
    	not: not,
    	NotCongruent: NotCongruent,
    	NotCupCap: NotCupCap,
    	NotDoubleVerticalBar: NotDoubleVerticalBar,
    	NotElement: NotElement,
    	NotEqual: NotEqual,
    	NotEqualTilde: NotEqualTilde,
    	NotExists: NotExists,
    	NotGreater: NotGreater,
    	NotGreaterEqual: NotGreaterEqual,
    	NotGreaterFullEqual: NotGreaterFullEqual,
    	NotGreaterGreater: NotGreaterGreater,
    	NotGreaterLess: NotGreaterLess,
    	NotGreaterSlantEqual: NotGreaterSlantEqual,
    	NotGreaterTilde: NotGreaterTilde,
    	NotHumpDownHump: NotHumpDownHump,
    	NotHumpEqual: NotHumpEqual,
    	notin: notin,
    	notindot: notindot,
    	notinE: notinE,
    	notinva: notinva,
    	notinvb: notinvb,
    	notinvc: notinvc,
    	NotLeftTriangleBar: NotLeftTriangleBar,
    	NotLeftTriangle: NotLeftTriangle,
    	NotLeftTriangleEqual: NotLeftTriangleEqual,
    	NotLess: NotLess,
    	NotLessEqual: NotLessEqual,
    	NotLessGreater: NotLessGreater,
    	NotLessLess: NotLessLess,
    	NotLessSlantEqual: NotLessSlantEqual,
    	NotLessTilde: NotLessTilde,
    	NotNestedGreaterGreater: NotNestedGreaterGreater,
    	NotNestedLessLess: NotNestedLessLess,
    	notni: notni,
    	notniva: notniva,
    	notnivb: notnivb,
    	notnivc: notnivc,
    	NotPrecedes: NotPrecedes,
    	NotPrecedesEqual: NotPrecedesEqual,
    	NotPrecedesSlantEqual: NotPrecedesSlantEqual,
    	NotReverseElement: NotReverseElement,
    	NotRightTriangleBar: NotRightTriangleBar,
    	NotRightTriangle: NotRightTriangle,
    	NotRightTriangleEqual: NotRightTriangleEqual,
    	NotSquareSubset: NotSquareSubset,
    	NotSquareSubsetEqual: NotSquareSubsetEqual,
    	NotSquareSuperset: NotSquareSuperset,
    	NotSquareSupersetEqual: NotSquareSupersetEqual,
    	NotSubset: NotSubset,
    	NotSubsetEqual: NotSubsetEqual,
    	NotSucceeds: NotSucceeds,
    	NotSucceedsEqual: NotSucceedsEqual,
    	NotSucceedsSlantEqual: NotSucceedsSlantEqual,
    	NotSucceedsTilde: NotSucceedsTilde,
    	NotSuperset: NotSuperset,
    	NotSupersetEqual: NotSupersetEqual,
    	NotTilde: NotTilde,
    	NotTildeEqual: NotTildeEqual,
    	NotTildeFullEqual: NotTildeFullEqual,
    	NotTildeTilde: NotTildeTilde,
    	NotVerticalBar: NotVerticalBar,
    	nparallel: nparallel,
    	npar: npar,
    	nparsl: nparsl,
    	npart: npart,
    	npolint: npolint,
    	npr: npr,
    	nprcue: nprcue,
    	nprec: nprec,
    	npreceq: npreceq,
    	npre: npre,
    	nrarrc: nrarrc,
    	nrarr: nrarr,
    	nrArr: nrArr,
    	nrarrw: nrarrw,
    	nrightarrow: nrightarrow,
    	nRightarrow: nRightarrow,
    	nrtri: nrtri,
    	nrtrie: nrtrie,
    	nsc: nsc,
    	nsccue: nsccue,
    	nsce: nsce,
    	Nscr: Nscr,
    	nscr: nscr,
    	nshortmid: nshortmid,
    	nshortparallel: nshortparallel,
    	nsim: nsim,
    	nsime: nsime,
    	nsimeq: nsimeq,
    	nsmid: nsmid,
    	nspar: nspar,
    	nsqsube: nsqsube,
    	nsqsupe: nsqsupe,
    	nsub: nsub,
    	nsubE: nsubE,
    	nsube: nsube,
    	nsubset: nsubset,
    	nsubseteq: nsubseteq,
    	nsubseteqq: nsubseteqq,
    	nsucc: nsucc,
    	nsucceq: nsucceq,
    	nsup: nsup,
    	nsupE: nsupE,
    	nsupe: nsupe,
    	nsupset: nsupset,
    	nsupseteq: nsupseteq,
    	nsupseteqq: nsupseteqq,
    	ntgl: ntgl,
    	Ntilde: Ntilde,
    	ntilde: ntilde,
    	ntlg: ntlg,
    	ntriangleleft: ntriangleleft,
    	ntrianglelefteq: ntrianglelefteq,
    	ntriangleright: ntriangleright,
    	ntrianglerighteq: ntrianglerighteq,
    	Nu: Nu,
    	nu: nu,
    	num: num,
    	numero: numero,
    	numsp: numsp,
    	nvap: nvap,
    	nvdash: nvdash,
    	nvDash: nvDash,
    	nVdash: nVdash,
    	nVDash: nVDash,
    	nvge: nvge,
    	nvgt: nvgt,
    	nvHarr: nvHarr,
    	nvinfin: nvinfin,
    	nvlArr: nvlArr,
    	nvle: nvle,
    	nvlt: nvlt,
    	nvltrie: nvltrie,
    	nvrArr: nvrArr,
    	nvrtrie: nvrtrie,
    	nvsim: nvsim,
    	nwarhk: nwarhk,
    	nwarr: nwarr,
    	nwArr: nwArr,
    	nwarrow: nwarrow,
    	nwnear: nwnear,
    	Oacute: Oacute,
    	oacute: oacute,
    	oast: oast,
    	Ocirc: Ocirc,
    	ocirc: ocirc,
    	ocir: ocir,
    	Ocy: Ocy,
    	ocy: ocy,
    	odash: odash,
    	Odblac: Odblac,
    	odblac: odblac,
    	odiv: odiv,
    	odot: odot,
    	odsold: odsold,
    	OElig: OElig,
    	oelig: oelig,
    	ofcir: ofcir,
    	Ofr: Ofr,
    	ofr: ofr,
    	ogon: ogon,
    	Ograve: Ograve,
    	ograve: ograve,
    	ogt: ogt,
    	ohbar: ohbar,
    	ohm: ohm,
    	oint: oint,
    	olarr: olarr,
    	olcir: olcir,
    	olcross: olcross,
    	oline: oline,
    	olt: olt,
    	Omacr: Omacr,
    	omacr: omacr,
    	Omega: Omega,
    	omega: omega,
    	Omicron: Omicron,
    	omicron: omicron,
    	omid: omid,
    	ominus: ominus,
    	Oopf: Oopf,
    	oopf: oopf,
    	opar: opar,
    	OpenCurlyDoubleQuote: OpenCurlyDoubleQuote,
    	OpenCurlyQuote: OpenCurlyQuote,
    	operp: operp,
    	oplus: oplus,
    	orarr: orarr,
    	Or: Or,
    	or: or,
    	ord: ord,
    	order: order,
    	orderof: orderof,
    	ordf: ordf,
    	ordm: ordm,
    	origof: origof,
    	oror: oror,
    	orslope: orslope,
    	orv: orv,
    	oS: oS,
    	Oscr: Oscr,
    	oscr: oscr,
    	Oslash: Oslash,
    	oslash: oslash,
    	osol: osol,
    	Otilde: Otilde,
    	otilde: otilde,
    	otimesas: otimesas,
    	Otimes: Otimes,
    	otimes: otimes,
    	Ouml: Ouml,
    	ouml: ouml,
    	ovbar: ovbar,
    	OverBar: OverBar,
    	OverBrace: OverBrace,
    	OverBracket: OverBracket,
    	OverParenthesis: OverParenthesis,
    	para: para,
    	parallel: parallel,
    	par: par,
    	parsim: parsim,
    	parsl: parsl,
    	part: part,
    	PartialD: PartialD,
    	Pcy: Pcy,
    	pcy: pcy,
    	percnt: percnt,
    	period: period,
    	permil: permil,
    	perp: perp,
    	pertenk: pertenk,
    	Pfr: Pfr,
    	pfr: pfr,
    	Phi: Phi,
    	phi: phi,
    	phiv: phiv,
    	phmmat: phmmat,
    	phone: phone,
    	Pi: Pi,
    	pi: pi,
    	pitchfork: pitchfork,
    	piv: piv,
    	planck: planck,
    	planckh: planckh,
    	plankv: plankv,
    	plusacir: plusacir,
    	plusb: plusb,
    	pluscir: pluscir,
    	plus: plus,
    	plusdo: plusdo,
    	plusdu: plusdu,
    	pluse: pluse,
    	PlusMinus: PlusMinus,
    	plusmn: plusmn,
    	plussim: plussim,
    	plustwo: plustwo,
    	pm: pm,
    	Poincareplane: Poincareplane,
    	pointint: pointint,
    	popf: popf,
    	Popf: Popf,
    	pound: pound,
    	prap: prap,
    	Pr: Pr,
    	pr: pr,
    	prcue: prcue,
    	precapprox: precapprox,
    	prec: prec,
    	preccurlyeq: preccurlyeq,
    	Precedes: Precedes,
    	PrecedesEqual: PrecedesEqual,
    	PrecedesSlantEqual: PrecedesSlantEqual,
    	PrecedesTilde: PrecedesTilde,
    	preceq: preceq,
    	precnapprox: precnapprox,
    	precneqq: precneqq,
    	precnsim: precnsim,
    	pre: pre,
    	prE: prE,
    	precsim: precsim,
    	prime: prime,
    	Prime: Prime,
    	primes: primes,
    	prnap: prnap,
    	prnE: prnE,
    	prnsim: prnsim,
    	prod: prod,
    	Product: Product,
    	profalar: profalar,
    	profline: profline,
    	profsurf: profsurf,
    	prop: prop,
    	Proportional: Proportional,
    	Proportion: Proportion,
    	propto: propto,
    	prsim: prsim,
    	prurel: prurel,
    	Pscr: Pscr,
    	pscr: pscr,
    	Psi: Psi,
    	psi: psi,
    	puncsp: puncsp,
    	Qfr: Qfr,
    	qfr: qfr,
    	qint: qint,
    	qopf: qopf,
    	Qopf: Qopf,
    	qprime: qprime,
    	Qscr: Qscr,
    	qscr: qscr,
    	quaternions: quaternions,
    	quatint: quatint,
    	quest: quest,
    	questeq: questeq,
    	quot: quot,
    	QUOT: QUOT,
    	rAarr: rAarr,
    	race: race,
    	Racute: Racute,
    	racute: racute,
    	radic: radic,
    	raemptyv: raemptyv,
    	rang: rang,
    	Rang: Rang,
    	rangd: rangd,
    	range: range,
    	rangle: rangle,
    	raquo: raquo,
    	rarrap: rarrap,
    	rarrb: rarrb,
    	rarrbfs: rarrbfs,
    	rarrc: rarrc,
    	rarr: rarr,
    	Rarr: Rarr,
    	rArr: rArr,
    	rarrfs: rarrfs,
    	rarrhk: rarrhk,
    	rarrlp: rarrlp,
    	rarrpl: rarrpl,
    	rarrsim: rarrsim,
    	Rarrtl: Rarrtl,
    	rarrtl: rarrtl,
    	rarrw: rarrw,
    	ratail: ratail,
    	rAtail: rAtail,
    	ratio: ratio,
    	rationals: rationals,
    	rbarr: rbarr,
    	rBarr: rBarr,
    	RBarr: RBarr,
    	rbbrk: rbbrk,
    	rbrace: rbrace,
    	rbrack: rbrack,
    	rbrke: rbrke,
    	rbrksld: rbrksld,
    	rbrkslu: rbrkslu,
    	Rcaron: Rcaron,
    	rcaron: rcaron,
    	Rcedil: Rcedil,
    	rcedil: rcedil,
    	rceil: rceil,
    	rcub: rcub,
    	Rcy: Rcy,
    	rcy: rcy,
    	rdca: rdca,
    	rdldhar: rdldhar,
    	rdquo: rdquo,
    	rdquor: rdquor,
    	rdsh: rdsh,
    	real: real,
    	realine: realine,
    	realpart: realpart,
    	reals: reals,
    	Re: Re,
    	rect: rect,
    	reg: reg,
    	REG: REG,
    	ReverseElement: ReverseElement,
    	ReverseEquilibrium: ReverseEquilibrium,
    	ReverseUpEquilibrium: ReverseUpEquilibrium,
    	rfisht: rfisht,
    	rfloor: rfloor,
    	rfr: rfr,
    	Rfr: Rfr,
    	rHar: rHar,
    	rhard: rhard,
    	rharu: rharu,
    	rharul: rharul,
    	Rho: Rho,
    	rho: rho,
    	rhov: rhov,
    	RightAngleBracket: RightAngleBracket,
    	RightArrowBar: RightArrowBar,
    	rightarrow: rightarrow,
    	RightArrow: RightArrow,
    	Rightarrow: Rightarrow,
    	RightArrowLeftArrow: RightArrowLeftArrow,
    	rightarrowtail: rightarrowtail,
    	RightCeiling: RightCeiling,
    	RightDoubleBracket: RightDoubleBracket,
    	RightDownTeeVector: RightDownTeeVector,
    	RightDownVectorBar: RightDownVectorBar,
    	RightDownVector: RightDownVector,
    	RightFloor: RightFloor,
    	rightharpoondown: rightharpoondown,
    	rightharpoonup: rightharpoonup,
    	rightleftarrows: rightleftarrows,
    	rightleftharpoons: rightleftharpoons,
    	rightrightarrows: rightrightarrows,
    	rightsquigarrow: rightsquigarrow,
    	RightTeeArrow: RightTeeArrow,
    	RightTee: RightTee,
    	RightTeeVector: RightTeeVector,
    	rightthreetimes: rightthreetimes,
    	RightTriangleBar: RightTriangleBar,
    	RightTriangle: RightTriangle,
    	RightTriangleEqual: RightTriangleEqual,
    	RightUpDownVector: RightUpDownVector,
    	RightUpTeeVector: RightUpTeeVector,
    	RightUpVectorBar: RightUpVectorBar,
    	RightUpVector: RightUpVector,
    	RightVectorBar: RightVectorBar,
    	RightVector: RightVector,
    	ring: ring,
    	risingdotseq: risingdotseq,
    	rlarr: rlarr,
    	rlhar: rlhar,
    	rlm: rlm,
    	rmoustache: rmoustache,
    	rmoust: rmoust,
    	rnmid: rnmid,
    	roang: roang,
    	roarr: roarr,
    	robrk: robrk,
    	ropar: ropar,
    	ropf: ropf,
    	Ropf: Ropf,
    	roplus: roplus,
    	rotimes: rotimes,
    	RoundImplies: RoundImplies,
    	rpar: rpar,
    	rpargt: rpargt,
    	rppolint: rppolint,
    	rrarr: rrarr,
    	Rrightarrow: Rrightarrow,
    	rsaquo: rsaquo,
    	rscr: rscr,
    	Rscr: Rscr,
    	rsh: rsh,
    	Rsh: Rsh,
    	rsqb: rsqb,
    	rsquo: rsquo,
    	rsquor: rsquor,
    	rthree: rthree,
    	rtimes: rtimes,
    	rtri: rtri,
    	rtrie: rtrie,
    	rtrif: rtrif,
    	rtriltri: rtriltri,
    	RuleDelayed: RuleDelayed,
    	ruluhar: ruluhar,
    	rx: rx,
    	Sacute: Sacute,
    	sacute: sacute,
    	sbquo: sbquo,
    	scap: scap,
    	Scaron: Scaron,
    	scaron: scaron,
    	Sc: Sc,
    	sc: sc,
    	sccue: sccue,
    	sce: sce,
    	scE: scE,
    	Scedil: Scedil,
    	scedil: scedil,
    	Scirc: Scirc,
    	scirc: scirc,
    	scnap: scnap,
    	scnE: scnE,
    	scnsim: scnsim,
    	scpolint: scpolint,
    	scsim: scsim,
    	Scy: Scy,
    	scy: scy,
    	sdotb: sdotb,
    	sdot: sdot,
    	sdote: sdote,
    	searhk: searhk,
    	searr: searr,
    	seArr: seArr,
    	searrow: searrow,
    	sect: sect,
    	semi: semi,
    	seswar: seswar,
    	setminus: setminus,
    	setmn: setmn,
    	sext: sext,
    	Sfr: Sfr,
    	sfr: sfr,
    	sfrown: sfrown,
    	sharp: sharp,
    	SHCHcy: SHCHcy,
    	shchcy: shchcy,
    	SHcy: SHcy,
    	shcy: shcy,
    	ShortDownArrow: ShortDownArrow,
    	ShortLeftArrow: ShortLeftArrow,
    	shortmid: shortmid,
    	shortparallel: shortparallel,
    	ShortRightArrow: ShortRightArrow,
    	ShortUpArrow: ShortUpArrow,
    	shy: shy,
    	Sigma: Sigma,
    	sigma: sigma,
    	sigmaf: sigmaf,
    	sigmav: sigmav,
    	sim: sim,
    	simdot: simdot,
    	sime: sime,
    	simeq: simeq,
    	simg: simg,
    	simgE: simgE,
    	siml: siml,
    	simlE: simlE,
    	simne: simne,
    	simplus: simplus,
    	simrarr: simrarr,
    	slarr: slarr,
    	SmallCircle: SmallCircle,
    	smallsetminus: smallsetminus,
    	smashp: smashp,
    	smeparsl: smeparsl,
    	smid: smid,
    	smile: smile,
    	smt: smt,
    	smte: smte,
    	smtes: smtes,
    	SOFTcy: SOFTcy,
    	softcy: softcy,
    	solbar: solbar,
    	solb: solb,
    	sol: sol,
    	Sopf: Sopf,
    	sopf: sopf,
    	spades: spades,
    	spadesuit: spadesuit,
    	spar: spar,
    	sqcap: sqcap,
    	sqcaps: sqcaps,
    	sqcup: sqcup,
    	sqcups: sqcups,
    	Sqrt: Sqrt,
    	sqsub: sqsub,
    	sqsube: sqsube,
    	sqsubset: sqsubset,
    	sqsubseteq: sqsubseteq,
    	sqsup: sqsup,
    	sqsupe: sqsupe,
    	sqsupset: sqsupset,
    	sqsupseteq: sqsupseteq,
    	square: square,
    	Square: Square,
    	SquareIntersection: SquareIntersection,
    	SquareSubset: SquareSubset,
    	SquareSubsetEqual: SquareSubsetEqual,
    	SquareSuperset: SquareSuperset,
    	SquareSupersetEqual: SquareSupersetEqual,
    	SquareUnion: SquareUnion,
    	squarf: squarf,
    	squ: squ,
    	squf: squf,
    	srarr: srarr,
    	Sscr: Sscr,
    	sscr: sscr,
    	ssetmn: ssetmn,
    	ssmile: ssmile,
    	sstarf: sstarf,
    	Star: Star,
    	star: star,
    	starf: starf,
    	straightepsilon: straightepsilon,
    	straightphi: straightphi,
    	strns: strns,
    	sub: sub,
    	Sub: Sub,
    	subdot: subdot,
    	subE: subE,
    	sube: sube,
    	subedot: subedot,
    	submult: submult,
    	subnE: subnE,
    	subne: subne,
    	subplus: subplus,
    	subrarr: subrarr,
    	subset: subset,
    	Subset: Subset,
    	subseteq: subseteq,
    	subseteqq: subseteqq,
    	SubsetEqual: SubsetEqual,
    	subsetneq: subsetneq,
    	subsetneqq: subsetneqq,
    	subsim: subsim,
    	subsub: subsub,
    	subsup: subsup,
    	succapprox: succapprox,
    	succ: succ,
    	succcurlyeq: succcurlyeq,
    	Succeeds: Succeeds,
    	SucceedsEqual: SucceedsEqual,
    	SucceedsSlantEqual: SucceedsSlantEqual,
    	SucceedsTilde: SucceedsTilde,
    	succeq: succeq,
    	succnapprox: succnapprox,
    	succneqq: succneqq,
    	succnsim: succnsim,
    	succsim: succsim,
    	SuchThat: SuchThat,
    	sum: sum,
    	Sum: Sum,
    	sung: sung,
    	sup1: sup1,
    	sup2: sup2,
    	sup3: sup3,
    	sup: sup,
    	Sup: Sup,
    	supdot: supdot,
    	supdsub: supdsub,
    	supE: supE,
    	supe: supe,
    	supedot: supedot,
    	Superset: Superset,
    	SupersetEqual: SupersetEqual,
    	suphsol: suphsol,
    	suphsub: suphsub,
    	suplarr: suplarr,
    	supmult: supmult,
    	supnE: supnE,
    	supne: supne,
    	supplus: supplus,
    	supset: supset,
    	Supset: Supset,
    	supseteq: supseteq,
    	supseteqq: supseteqq,
    	supsetneq: supsetneq,
    	supsetneqq: supsetneqq,
    	supsim: supsim,
    	supsub: supsub,
    	supsup: supsup,
    	swarhk: swarhk,
    	swarr: swarr,
    	swArr: swArr,
    	swarrow: swarrow,
    	swnwar: swnwar,
    	szlig: szlig,
    	Tab: Tab,
    	target: target,
    	Tau: Tau,
    	tau: tau,
    	tbrk: tbrk,
    	Tcaron: Tcaron,
    	tcaron: tcaron,
    	Tcedil: Tcedil,
    	tcedil: tcedil,
    	Tcy: Tcy,
    	tcy: tcy,
    	tdot: tdot,
    	telrec: telrec,
    	Tfr: Tfr,
    	tfr: tfr,
    	there4: there4,
    	therefore: therefore,
    	Therefore: Therefore,
    	Theta: Theta,
    	theta: theta,
    	thetasym: thetasym,
    	thetav: thetav,
    	thickapprox: thickapprox,
    	thicksim: thicksim,
    	ThickSpace: ThickSpace,
    	ThinSpace: ThinSpace,
    	thinsp: thinsp,
    	thkap: thkap,
    	thksim: thksim,
    	THORN: THORN,
    	thorn: thorn,
    	tilde: tilde,
    	Tilde: Tilde,
    	TildeEqual: TildeEqual,
    	TildeFullEqual: TildeFullEqual,
    	TildeTilde: TildeTilde,
    	timesbar: timesbar,
    	timesb: timesb,
    	times: times,
    	timesd: timesd,
    	tint: tint,
    	toea: toea,
    	topbot: topbot,
    	topcir: topcir,
    	top: top,
    	Topf: Topf,
    	topf: topf,
    	topfork: topfork,
    	tosa: tosa,
    	tprime: tprime,
    	trade: trade,
    	TRADE: TRADE,
    	triangle: triangle,
    	triangledown: triangledown,
    	triangleleft: triangleleft,
    	trianglelefteq: trianglelefteq,
    	triangleq: triangleq,
    	triangleright: triangleright,
    	trianglerighteq: trianglerighteq,
    	tridot: tridot,
    	trie: trie,
    	triminus: triminus,
    	TripleDot: TripleDot,
    	triplus: triplus,
    	trisb: trisb,
    	tritime: tritime,
    	trpezium: trpezium,
    	Tscr: Tscr,
    	tscr: tscr,
    	TScy: TScy,
    	tscy: tscy,
    	TSHcy: TSHcy,
    	tshcy: tshcy,
    	Tstrok: Tstrok,
    	tstrok: tstrok,
    	twixt: twixt,
    	twoheadleftarrow: twoheadleftarrow,
    	twoheadrightarrow: twoheadrightarrow,
    	Uacute: Uacute,
    	uacute: uacute,
    	uarr: uarr,
    	Uarr: Uarr,
    	uArr: uArr,
    	Uarrocir: Uarrocir,
    	Ubrcy: Ubrcy,
    	ubrcy: ubrcy,
    	Ubreve: Ubreve,
    	ubreve: ubreve,
    	Ucirc: Ucirc,
    	ucirc: ucirc,
    	Ucy: Ucy,
    	ucy: ucy,
    	udarr: udarr,
    	Udblac: Udblac,
    	udblac: udblac,
    	udhar: udhar,
    	ufisht: ufisht,
    	Ufr: Ufr,
    	ufr: ufr,
    	Ugrave: Ugrave,
    	ugrave: ugrave,
    	uHar: uHar,
    	uharl: uharl,
    	uharr: uharr,
    	uhblk: uhblk,
    	ulcorn: ulcorn,
    	ulcorner: ulcorner,
    	ulcrop: ulcrop,
    	ultri: ultri,
    	Umacr: Umacr,
    	umacr: umacr,
    	uml: uml,
    	UnderBar: UnderBar,
    	UnderBrace: UnderBrace,
    	UnderBracket: UnderBracket,
    	UnderParenthesis: UnderParenthesis,
    	Union: Union,
    	UnionPlus: UnionPlus,
    	Uogon: Uogon,
    	uogon: uogon,
    	Uopf: Uopf,
    	uopf: uopf,
    	UpArrowBar: UpArrowBar,
    	uparrow: uparrow,
    	UpArrow: UpArrow,
    	Uparrow: Uparrow,
    	UpArrowDownArrow: UpArrowDownArrow,
    	updownarrow: updownarrow,
    	UpDownArrow: UpDownArrow,
    	Updownarrow: Updownarrow,
    	UpEquilibrium: UpEquilibrium,
    	upharpoonleft: upharpoonleft,
    	upharpoonright: upharpoonright,
    	uplus: uplus,
    	UpperLeftArrow: UpperLeftArrow,
    	UpperRightArrow: UpperRightArrow,
    	upsi: upsi,
    	Upsi: Upsi,
    	upsih: upsih,
    	Upsilon: Upsilon,
    	upsilon: upsilon,
    	UpTeeArrow: UpTeeArrow,
    	UpTee: UpTee,
    	upuparrows: upuparrows,
    	urcorn: urcorn,
    	urcorner: urcorner,
    	urcrop: urcrop,
    	Uring: Uring,
    	uring: uring,
    	urtri: urtri,
    	Uscr: Uscr,
    	uscr: uscr,
    	utdot: utdot,
    	Utilde: Utilde,
    	utilde: utilde,
    	utri: utri,
    	utrif: utrif,
    	uuarr: uuarr,
    	Uuml: Uuml,
    	uuml: uuml,
    	uwangle: uwangle,
    	vangrt: vangrt,
    	varepsilon: varepsilon,
    	varkappa: varkappa,
    	varnothing: varnothing,
    	varphi: varphi,
    	varpi: varpi,
    	varpropto: varpropto,
    	varr: varr,
    	vArr: vArr,
    	varrho: varrho,
    	varsigma: varsigma,
    	varsubsetneq: varsubsetneq,
    	varsubsetneqq: varsubsetneqq,
    	varsupsetneq: varsupsetneq,
    	varsupsetneqq: varsupsetneqq,
    	vartheta: vartheta,
    	vartriangleleft: vartriangleleft,
    	vartriangleright: vartriangleright,
    	vBar: vBar,
    	Vbar: Vbar,
    	vBarv: vBarv,
    	Vcy: Vcy,
    	vcy: vcy,
    	vdash: vdash,
    	vDash: vDash,
    	Vdash: Vdash,
    	VDash: VDash,
    	Vdashl: Vdashl,
    	veebar: veebar,
    	vee: vee,
    	Vee: Vee,
    	veeeq: veeeq,
    	vellip: vellip,
    	verbar: verbar,
    	Verbar: Verbar,
    	vert: vert,
    	Vert: Vert,
    	VerticalBar: VerticalBar,
    	VerticalLine: VerticalLine,
    	VerticalSeparator: VerticalSeparator,
    	VerticalTilde: VerticalTilde,
    	VeryThinSpace: VeryThinSpace,
    	Vfr: Vfr,
    	vfr: vfr,
    	vltri: vltri,
    	vnsub: vnsub,
    	vnsup: vnsup,
    	Vopf: Vopf,
    	vopf: vopf,
    	vprop: vprop,
    	vrtri: vrtri,
    	Vscr: Vscr,
    	vscr: vscr,
    	vsubnE: vsubnE,
    	vsubne: vsubne,
    	vsupnE: vsupnE,
    	vsupne: vsupne,
    	Vvdash: Vvdash,
    	vzigzag: vzigzag,
    	Wcirc: Wcirc,
    	wcirc: wcirc,
    	wedbar: wedbar,
    	wedge: wedge,
    	Wedge: Wedge,
    	wedgeq: wedgeq,
    	weierp: weierp,
    	Wfr: Wfr,
    	wfr: wfr,
    	Wopf: Wopf,
    	wopf: wopf,
    	wp: wp,
    	wr: wr,
    	wreath: wreath,
    	Wscr: Wscr,
    	wscr: wscr,
    	xcap: xcap,
    	xcirc: xcirc,
    	xcup: xcup,
    	xdtri: xdtri,
    	Xfr: Xfr,
    	xfr: xfr,
    	xharr: xharr,
    	xhArr: xhArr,
    	Xi: Xi,
    	xi: xi,
    	xlarr: xlarr,
    	xlArr: xlArr,
    	xmap: xmap,
    	xnis: xnis,
    	xodot: xodot,
    	Xopf: Xopf,
    	xopf: xopf,
    	xoplus: xoplus,
    	xotime: xotime,
    	xrarr: xrarr,
    	xrArr: xrArr,
    	Xscr: Xscr,
    	xscr: xscr,
    	xsqcup: xsqcup,
    	xuplus: xuplus,
    	xutri: xutri,
    	xvee: xvee,
    	xwedge: xwedge,
    	Yacute: Yacute,
    	yacute: yacute,
    	YAcy: YAcy,
    	yacy: yacy,
    	Ycirc: Ycirc,
    	ycirc: ycirc,
    	Ycy: Ycy,
    	ycy: ycy,
    	yen: yen,
    	Yfr: Yfr,
    	yfr: yfr,
    	YIcy: YIcy,
    	yicy: yicy,
    	Yopf: Yopf,
    	yopf: yopf,
    	Yscr: Yscr,
    	yscr: yscr,
    	YUcy: YUcy,
    	yucy: yucy,
    	yuml: yuml,
    	Yuml: Yuml,
    	Zacute: Zacute,
    	zacute: zacute,
    	Zcaron: Zcaron,
    	zcaron: zcaron,
    	Zcy: Zcy,
    	zcy: zcy,
    	Zdot: Zdot,
    	zdot: zdot,
    	zeetrf: zeetrf,
    	ZeroWidthSpace: ZeroWidthSpace,
    	Zeta: Zeta,
    	zeta: zeta,
    	zfr: zfr,
    	Zfr: Zfr,
    	ZHcy: ZHcy,
    	zhcy: zhcy,
    	zigrarr: zigrarr,
    	zopf: zopf,
    	Zopf: Zopf,
    	Zscr: Zscr,
    	zscr: zscr,
    	zwj: zwj,
    	zwnj: zwnj
    };

    var entities$1 = /*#__PURE__*/Object.freeze({
        Aacute: Aacute,
        aacute: aacute,
        Abreve: Abreve,
        abreve: abreve,
        ac: ac,
        acd: acd,
        acE: acE,
        Acirc: Acirc,
        acirc: acirc,
        acute: acute,
        Acy: Acy,
        acy: acy,
        AElig: AElig,
        aelig: aelig,
        af: af,
        Afr: Afr,
        afr: afr,
        Agrave: Agrave,
        agrave: agrave,
        alefsym: alefsym,
        aleph: aleph,
        Alpha: Alpha,
        alpha: alpha,
        Amacr: Amacr,
        amacr: amacr,
        amalg: amalg,
        amp: amp,
        AMP: AMP,
        andand: andand,
        And: And,
        and: and,
        andd: andd,
        andslope: andslope,
        andv: andv,
        ang: ang,
        ange: ange,
        angle: angle,
        angmsdaa: angmsdaa,
        angmsdab: angmsdab,
        angmsdac: angmsdac,
        angmsdad: angmsdad,
        angmsdae: angmsdae,
        angmsdaf: angmsdaf,
        angmsdag: angmsdag,
        angmsdah: angmsdah,
        angmsd: angmsd,
        angrt: angrt,
        angrtvb: angrtvb,
        angrtvbd: angrtvbd,
        angsph: angsph,
        angst: angst,
        angzarr: angzarr,
        Aogon: Aogon,
        aogon: aogon,
        Aopf: Aopf,
        aopf: aopf,
        apacir: apacir,
        ap: ap,
        apE: apE,
        ape: ape,
        apid: apid,
        apos: apos,
        ApplyFunction: ApplyFunction,
        approx: approx,
        approxeq: approxeq,
        Aring: Aring,
        aring: aring,
        Ascr: Ascr,
        ascr: ascr,
        Assign: Assign,
        ast: ast,
        asymp: asymp,
        asympeq: asympeq,
        Atilde: Atilde,
        atilde: atilde,
        Auml: Auml,
        auml: auml,
        awconint: awconint,
        awint: awint,
        backcong: backcong,
        backepsilon: backepsilon,
        backprime: backprime,
        backsim: backsim,
        backsimeq: backsimeq,
        Backslash: Backslash,
        Barv: Barv,
        barvee: barvee,
        barwed: barwed,
        Barwed: Barwed,
        barwedge: barwedge,
        bbrk: bbrk,
        bbrktbrk: bbrktbrk,
        bcong: bcong,
        Bcy: Bcy,
        bcy: bcy,
        bdquo: bdquo,
        becaus: becaus,
        because: because,
        Because: Because,
        bemptyv: bemptyv,
        bepsi: bepsi,
        bernou: bernou,
        Bernoullis: Bernoullis,
        Beta: Beta,
        beta: beta,
        beth: beth,
        between: between,
        Bfr: Bfr,
        bfr: bfr,
        bigcap: bigcap,
        bigcirc: bigcirc,
        bigcup: bigcup,
        bigodot: bigodot,
        bigoplus: bigoplus,
        bigotimes: bigotimes,
        bigsqcup: bigsqcup,
        bigstar: bigstar,
        bigtriangledown: bigtriangledown,
        bigtriangleup: bigtriangleup,
        biguplus: biguplus,
        bigvee: bigvee,
        bigwedge: bigwedge,
        bkarow: bkarow,
        blacklozenge: blacklozenge,
        blacksquare: blacksquare,
        blacktriangle: blacktriangle,
        blacktriangledown: blacktriangledown,
        blacktriangleleft: blacktriangleleft,
        blacktriangleright: blacktriangleright,
        blank: blank,
        blk12: blk12,
        blk14: blk14,
        blk34: blk34,
        block: block,
        bne: bne,
        bnequiv: bnequiv,
        bNot: bNot,
        bnot: bnot,
        Bopf: Bopf,
        bopf: bopf,
        bot: bot,
        bottom: bottom,
        bowtie: bowtie,
        boxbox: boxbox,
        boxdl: boxdl,
        boxdL: boxdL,
        boxDl: boxDl,
        boxDL: boxDL,
        boxdr: boxdr,
        boxdR: boxdR,
        boxDr: boxDr,
        boxDR: boxDR,
        boxh: boxh,
        boxH: boxH,
        boxhd: boxhd,
        boxHd: boxHd,
        boxhD: boxhD,
        boxHD: boxHD,
        boxhu: boxhu,
        boxHu: boxHu,
        boxhU: boxhU,
        boxHU: boxHU,
        boxminus: boxminus,
        boxplus: boxplus,
        boxtimes: boxtimes,
        boxul: boxul,
        boxuL: boxuL,
        boxUl: boxUl,
        boxUL: boxUL,
        boxur: boxur,
        boxuR: boxuR,
        boxUr: boxUr,
        boxUR: boxUR,
        boxv: boxv,
        boxV: boxV,
        boxvh: boxvh,
        boxvH: boxvH,
        boxVh: boxVh,
        boxVH: boxVH,
        boxvl: boxvl,
        boxvL: boxvL,
        boxVl: boxVl,
        boxVL: boxVL,
        boxvr: boxvr,
        boxvR: boxvR,
        boxVr: boxVr,
        boxVR: boxVR,
        bprime: bprime,
        breve: breve,
        Breve: Breve,
        brvbar: brvbar,
        bscr: bscr,
        Bscr: Bscr,
        bsemi: bsemi,
        bsim: bsim,
        bsime: bsime,
        bsolb: bsolb,
        bsol: bsol,
        bsolhsub: bsolhsub,
        bull: bull,
        bullet: bullet,
        bump: bump,
        bumpE: bumpE,
        bumpe: bumpe,
        Bumpeq: Bumpeq,
        bumpeq: bumpeq,
        Cacute: Cacute,
        cacute: cacute,
        capand: capand,
        capbrcup: capbrcup,
        capcap: capcap,
        cap: cap,
        Cap: Cap,
        capcup: capcup,
        capdot: capdot,
        CapitalDifferentialD: CapitalDifferentialD,
        caps: caps,
        caret: caret,
        caron: caron,
        Cayleys: Cayleys,
        ccaps: ccaps,
        Ccaron: Ccaron,
        ccaron: ccaron,
        Ccedil: Ccedil,
        ccedil: ccedil,
        Ccirc: Ccirc,
        ccirc: ccirc,
        Cconint: Cconint,
        ccups: ccups,
        ccupssm: ccupssm,
        Cdot: Cdot,
        cdot: cdot,
        cedil: cedil,
        Cedilla: Cedilla,
        cemptyv: cemptyv,
        cent: cent,
        centerdot: centerdot,
        CenterDot: CenterDot,
        cfr: cfr,
        Cfr: Cfr,
        CHcy: CHcy,
        chcy: chcy,
        check: check,
        checkmark: checkmark,
        Chi: Chi,
        chi: chi,
        circ: circ,
        circeq: circeq,
        circlearrowleft: circlearrowleft,
        circlearrowright: circlearrowright,
        circledast: circledast,
        circledcirc: circledcirc,
        circleddash: circleddash,
        CircleDot: CircleDot,
        circledR: circledR,
        circledS: circledS,
        CircleMinus: CircleMinus,
        CirclePlus: CirclePlus,
        CircleTimes: CircleTimes,
        cir: cir,
        cirE: cirE,
        cire: cire,
        cirfnint: cirfnint,
        cirmid: cirmid,
        cirscir: cirscir,
        ClockwiseContourIntegral: ClockwiseContourIntegral,
        CloseCurlyDoubleQuote: CloseCurlyDoubleQuote,
        CloseCurlyQuote: CloseCurlyQuote,
        clubs: clubs,
        clubsuit: clubsuit,
        colon: colon,
        Colon: Colon,
        Colone: Colone,
        colone: colone,
        coloneq: coloneq,
        comma: comma,
        commat: commat,
        comp: comp,
        compfn: compfn,
        complement: complement,
        complexes: complexes,
        cong: cong,
        congdot: congdot,
        Congruent: Congruent,
        conint: conint,
        Conint: Conint,
        ContourIntegral: ContourIntegral,
        copf: copf,
        Copf: Copf,
        coprod: coprod,
        Coproduct: Coproduct,
        copy: copy,
        COPY: COPY,
        copysr: copysr,
        CounterClockwiseContourIntegral: CounterClockwiseContourIntegral,
        crarr: crarr,
        cross: cross,
        Cross: Cross,
        Cscr: Cscr,
        cscr: cscr,
        csub: csub,
        csube: csube,
        csup: csup,
        csupe: csupe,
        ctdot: ctdot,
        cudarrl: cudarrl,
        cudarrr: cudarrr,
        cuepr: cuepr,
        cuesc: cuesc,
        cularr: cularr,
        cularrp: cularrp,
        cupbrcap: cupbrcap,
        cupcap: cupcap,
        CupCap: CupCap,
        cup: cup,
        Cup: Cup,
        cupcup: cupcup,
        cupdot: cupdot,
        cupor: cupor,
        cups: cups,
        curarr: curarr,
        curarrm: curarrm,
        curlyeqprec: curlyeqprec,
        curlyeqsucc: curlyeqsucc,
        curlyvee: curlyvee,
        curlywedge: curlywedge,
        curren: curren,
        curvearrowleft: curvearrowleft,
        curvearrowright: curvearrowright,
        cuvee: cuvee,
        cuwed: cuwed,
        cwconint: cwconint,
        cwint: cwint,
        cylcty: cylcty,
        dagger: dagger,
        Dagger: Dagger,
        daleth: daleth,
        darr: darr,
        Darr: Darr,
        dArr: dArr,
        dash: dash,
        Dashv: Dashv,
        dashv: dashv,
        dbkarow: dbkarow,
        dblac: dblac,
        Dcaron: Dcaron,
        dcaron: dcaron,
        Dcy: Dcy,
        dcy: dcy,
        ddagger: ddagger,
        ddarr: ddarr,
        DD: DD,
        dd: dd,
        DDotrahd: DDotrahd,
        ddotseq: ddotseq,
        deg: deg,
        Del: Del,
        Delta: Delta,
        delta: delta,
        demptyv: demptyv,
        dfisht: dfisht,
        Dfr: Dfr,
        dfr: dfr,
        dHar: dHar,
        dharl: dharl,
        dharr: dharr,
        DiacriticalAcute: DiacriticalAcute,
        DiacriticalDot: DiacriticalDot,
        DiacriticalDoubleAcute: DiacriticalDoubleAcute,
        DiacriticalGrave: DiacriticalGrave,
        DiacriticalTilde: DiacriticalTilde,
        diam: diam,
        diamond: diamond,
        Diamond: Diamond,
        diamondsuit: diamondsuit,
        diams: diams,
        die: die,
        DifferentialD: DifferentialD,
        digamma: digamma,
        disin: disin,
        div: div,
        divide: divide,
        divideontimes: divideontimes,
        divonx: divonx,
        DJcy: DJcy,
        djcy: djcy,
        dlcorn: dlcorn,
        dlcrop: dlcrop,
        dollar: dollar,
        Dopf: Dopf,
        dopf: dopf,
        Dot: Dot,
        dot: dot,
        DotDot: DotDot,
        doteq: doteq,
        doteqdot: doteqdot,
        DotEqual: DotEqual,
        dotminus: dotminus,
        dotplus: dotplus,
        dotsquare: dotsquare,
        doublebarwedge: doublebarwedge,
        DoubleContourIntegral: DoubleContourIntegral,
        DoubleDot: DoubleDot,
        DoubleDownArrow: DoubleDownArrow,
        DoubleLeftArrow: DoubleLeftArrow,
        DoubleLeftRightArrow: DoubleLeftRightArrow,
        DoubleLeftTee: DoubleLeftTee,
        DoubleLongLeftArrow: DoubleLongLeftArrow,
        DoubleLongLeftRightArrow: DoubleLongLeftRightArrow,
        DoubleLongRightArrow: DoubleLongRightArrow,
        DoubleRightArrow: DoubleRightArrow,
        DoubleRightTee: DoubleRightTee,
        DoubleUpArrow: DoubleUpArrow,
        DoubleUpDownArrow: DoubleUpDownArrow,
        DoubleVerticalBar: DoubleVerticalBar,
        DownArrowBar: DownArrowBar,
        downarrow: downarrow,
        DownArrow: DownArrow,
        Downarrow: Downarrow,
        DownArrowUpArrow: DownArrowUpArrow,
        DownBreve: DownBreve,
        downdownarrows: downdownarrows,
        downharpoonleft: downharpoonleft,
        downharpoonright: downharpoonright,
        DownLeftRightVector: DownLeftRightVector,
        DownLeftTeeVector: DownLeftTeeVector,
        DownLeftVectorBar: DownLeftVectorBar,
        DownLeftVector: DownLeftVector,
        DownRightTeeVector: DownRightTeeVector,
        DownRightVectorBar: DownRightVectorBar,
        DownRightVector: DownRightVector,
        DownTeeArrow: DownTeeArrow,
        DownTee: DownTee,
        drbkarow: drbkarow,
        drcorn: drcorn,
        drcrop: drcrop,
        Dscr: Dscr,
        dscr: dscr,
        DScy: DScy,
        dscy: dscy,
        dsol: dsol,
        Dstrok: Dstrok,
        dstrok: dstrok,
        dtdot: dtdot,
        dtri: dtri,
        dtrif: dtrif,
        duarr: duarr,
        duhar: duhar,
        dwangle: dwangle,
        DZcy: DZcy,
        dzcy: dzcy,
        dzigrarr: dzigrarr,
        Eacute: Eacute,
        eacute: eacute,
        easter: easter,
        Ecaron: Ecaron,
        ecaron: ecaron,
        Ecirc: Ecirc,
        ecirc: ecirc,
        ecir: ecir,
        ecolon: ecolon,
        Ecy: Ecy,
        ecy: ecy,
        eDDot: eDDot,
        Edot: Edot,
        edot: edot,
        eDot: eDot,
        ee: ee,
        efDot: efDot,
        Efr: Efr,
        efr: efr,
        eg: eg,
        Egrave: Egrave,
        egrave: egrave,
        egs: egs,
        egsdot: egsdot,
        el: el,
        Element: Element,
        elinters: elinters,
        ell: ell,
        els: els,
        elsdot: elsdot,
        Emacr: Emacr,
        emacr: emacr,
        empty: empty$1,
        emptyset: emptyset,
        EmptySmallSquare: EmptySmallSquare,
        emptyv: emptyv,
        EmptyVerySmallSquare: EmptyVerySmallSquare,
        emsp13: emsp13,
        emsp14: emsp14,
        emsp: emsp,
        ENG: ENG,
        eng: eng,
        ensp: ensp,
        Eogon: Eogon,
        eogon: eogon,
        Eopf: Eopf,
        eopf: eopf,
        epar: epar,
        eparsl: eparsl,
        eplus: eplus,
        epsi: epsi,
        Epsilon: Epsilon,
        epsilon: epsilon,
        epsiv: epsiv,
        eqcirc: eqcirc,
        eqcolon: eqcolon,
        eqsim: eqsim,
        eqslantgtr: eqslantgtr,
        eqslantless: eqslantless,
        Equal: Equal,
        equals: equals,
        EqualTilde: EqualTilde,
        equest: equest,
        Equilibrium: Equilibrium,
        equiv: equiv,
        equivDD: equivDD,
        eqvparsl: eqvparsl,
        erarr: erarr,
        erDot: erDot,
        escr: escr,
        Escr: Escr,
        esdot: esdot,
        Esim: Esim,
        esim: esim,
        Eta: Eta,
        eta: eta,
        ETH: ETH,
        eth: eth,
        Euml: Euml,
        euml: euml,
        euro: euro,
        excl: excl,
        exist: exist,
        Exists: Exists,
        expectation: expectation,
        exponentiale: exponentiale,
        ExponentialE: ExponentialE,
        fallingdotseq: fallingdotseq,
        Fcy: Fcy,
        fcy: fcy,
        female: female,
        ffilig: ffilig,
        fflig: fflig,
        ffllig: ffllig,
        Ffr: Ffr,
        ffr: ffr,
        filig: filig,
        FilledSmallSquare: FilledSmallSquare,
        FilledVerySmallSquare: FilledVerySmallSquare,
        fjlig: fjlig,
        flat: flat,
        fllig: fllig,
        fltns: fltns,
        fnof: fnof,
        Fopf: Fopf,
        fopf: fopf,
        forall: forall,
        ForAll: ForAll,
        fork: fork,
        forkv: forkv,
        Fouriertrf: Fouriertrf,
        fpartint: fpartint,
        frac12: frac12,
        frac13: frac13,
        frac14: frac14,
        frac15: frac15,
        frac16: frac16,
        frac18: frac18,
        frac23: frac23,
        frac25: frac25,
        frac34: frac34,
        frac35: frac35,
        frac38: frac38,
        frac45: frac45,
        frac56: frac56,
        frac58: frac58,
        frac78: frac78,
        frasl: frasl,
        frown: frown,
        fscr: fscr,
        Fscr: Fscr,
        gacute: gacute,
        Gamma: Gamma,
        gamma: gamma,
        Gammad: Gammad,
        gammad: gammad,
        gap: gap,
        Gbreve: Gbreve,
        gbreve: gbreve,
        Gcedil: Gcedil,
        Gcirc: Gcirc,
        gcirc: gcirc,
        Gcy: Gcy,
        gcy: gcy,
        Gdot: Gdot,
        gdot: gdot,
        ge: ge,
        gE: gE,
        gEl: gEl,
        gel: gel,
        geq: geq,
        geqq: geqq,
        geqslant: geqslant,
        gescc: gescc,
        ges: ges,
        gesdot: gesdot,
        gesdoto: gesdoto,
        gesdotol: gesdotol,
        gesl: gesl,
        gesles: gesles,
        Gfr: Gfr,
        gfr: gfr,
        gg: gg,
        Gg: Gg,
        ggg: ggg,
        gimel: gimel,
        GJcy: GJcy,
        gjcy: gjcy,
        gla: gla,
        gl: gl,
        glE: glE,
        glj: glj,
        gnap: gnap,
        gnapprox: gnapprox,
        gne: gne,
        gnE: gnE,
        gneq: gneq,
        gneqq: gneqq,
        gnsim: gnsim,
        Gopf: Gopf,
        gopf: gopf,
        grave: grave,
        GreaterEqual: GreaterEqual,
        GreaterEqualLess: GreaterEqualLess,
        GreaterFullEqual: GreaterFullEqual,
        GreaterGreater: GreaterGreater,
        GreaterLess: GreaterLess,
        GreaterSlantEqual: GreaterSlantEqual,
        GreaterTilde: GreaterTilde,
        Gscr: Gscr,
        gscr: gscr,
        gsim: gsim,
        gsime: gsime,
        gsiml: gsiml,
        gtcc: gtcc,
        gtcir: gtcir,
        gt: gt,
        GT: GT,
        Gt: Gt,
        gtdot: gtdot,
        gtlPar: gtlPar,
        gtquest: gtquest,
        gtrapprox: gtrapprox,
        gtrarr: gtrarr,
        gtrdot: gtrdot,
        gtreqless: gtreqless,
        gtreqqless: gtreqqless,
        gtrless: gtrless,
        gtrsim: gtrsim,
        gvertneqq: gvertneqq,
        gvnE: gvnE,
        Hacek: Hacek,
        hairsp: hairsp,
        half: half,
        hamilt: hamilt,
        HARDcy: HARDcy,
        hardcy: hardcy,
        harrcir: harrcir,
        harr: harr,
        hArr: hArr,
        harrw: harrw,
        Hat: Hat,
        hbar: hbar,
        Hcirc: Hcirc,
        hcirc: hcirc,
        hearts: hearts,
        heartsuit: heartsuit,
        hellip: hellip,
        hercon: hercon,
        hfr: hfr,
        Hfr: Hfr,
        HilbertSpace: HilbertSpace,
        hksearow: hksearow,
        hkswarow: hkswarow,
        hoarr: hoarr,
        homtht: homtht,
        hookleftarrow: hookleftarrow,
        hookrightarrow: hookrightarrow,
        hopf: hopf,
        Hopf: Hopf,
        horbar: horbar,
        HorizontalLine: HorizontalLine,
        hscr: hscr,
        Hscr: Hscr,
        hslash: hslash,
        Hstrok: Hstrok,
        hstrok: hstrok,
        HumpDownHump: HumpDownHump,
        HumpEqual: HumpEqual,
        hybull: hybull,
        hyphen: hyphen,
        Iacute: Iacute,
        iacute: iacute,
        ic: ic,
        Icirc: Icirc,
        icirc: icirc,
        Icy: Icy,
        icy: icy,
        Idot: Idot,
        IEcy: IEcy,
        iecy: iecy,
        iexcl: iexcl,
        iff: iff,
        ifr: ifr,
        Ifr: Ifr,
        Igrave: Igrave,
        igrave: igrave,
        ii: ii,
        iiiint: iiiint,
        iiint: iiint,
        iinfin: iinfin,
        iiota: iiota,
        IJlig: IJlig,
        ijlig: ijlig,
        Imacr: Imacr,
        imacr: imacr,
        image: image,
        ImaginaryI: ImaginaryI,
        imagline: imagline,
        imagpart: imagpart,
        imath: imath,
        Im: Im,
        imof: imof,
        imped: imped,
        Implies: Implies,
        incare: incare,
        infin: infin,
        infintie: infintie,
        inodot: inodot,
        intcal: intcal,
        int: int,
        Int: Int,
        integers: integers,
        Integral: Integral,
        intercal: intercal,
        Intersection: Intersection,
        intlarhk: intlarhk,
        intprod: intprod,
        InvisibleComma: InvisibleComma,
        InvisibleTimes: InvisibleTimes,
        IOcy: IOcy,
        iocy: iocy,
        Iogon: Iogon,
        iogon: iogon,
        Iopf: Iopf,
        iopf: iopf,
        Iota: Iota,
        iota: iota,
        iprod: iprod,
        iquest: iquest,
        iscr: iscr,
        Iscr: Iscr,
        isin: isin,
        isindot: isindot,
        isinE: isinE,
        isins: isins,
        isinsv: isinsv,
        isinv: isinv,
        it: it,
        Itilde: Itilde,
        itilde: itilde,
        Iukcy: Iukcy,
        iukcy: iukcy,
        Iuml: Iuml,
        iuml: iuml,
        Jcirc: Jcirc,
        jcirc: jcirc,
        Jcy: Jcy,
        jcy: jcy,
        Jfr: Jfr,
        jfr: jfr,
        jmath: jmath,
        Jopf: Jopf,
        jopf: jopf,
        Jscr: Jscr,
        jscr: jscr,
        Jsercy: Jsercy,
        jsercy: jsercy,
        Jukcy: Jukcy,
        jukcy: jukcy,
        Kappa: Kappa,
        kappa: kappa,
        kappav: kappav,
        Kcedil: Kcedil,
        kcedil: kcedil,
        Kcy: Kcy,
        kcy: kcy,
        Kfr: Kfr,
        kfr: kfr,
        kgreen: kgreen,
        KHcy: KHcy,
        khcy: khcy,
        KJcy: KJcy,
        kjcy: kjcy,
        Kopf: Kopf,
        kopf: kopf,
        Kscr: Kscr,
        kscr: kscr,
        lAarr: lAarr,
        Lacute: Lacute,
        lacute: lacute,
        laemptyv: laemptyv,
        lagran: lagran,
        Lambda: Lambda,
        lambda: lambda,
        lang: lang,
        Lang: Lang,
        langd: langd,
        langle: langle,
        lap: lap,
        Laplacetrf: Laplacetrf,
        laquo: laquo,
        larrb: larrb,
        larrbfs: larrbfs,
        larr: larr,
        Larr: Larr,
        lArr: lArr,
        larrfs: larrfs,
        larrhk: larrhk,
        larrlp: larrlp,
        larrpl: larrpl,
        larrsim: larrsim,
        larrtl: larrtl,
        latail: latail,
        lAtail: lAtail,
        lat: lat,
        late: late,
        lates: lates,
        lbarr: lbarr,
        lBarr: lBarr,
        lbbrk: lbbrk,
        lbrace: lbrace,
        lbrack: lbrack,
        lbrke: lbrke,
        lbrksld: lbrksld,
        lbrkslu: lbrkslu,
        Lcaron: Lcaron,
        lcaron: lcaron,
        Lcedil: Lcedil,
        lcedil: lcedil,
        lceil: lceil,
        lcub: lcub,
        Lcy: Lcy,
        lcy: lcy,
        ldca: ldca,
        ldquo: ldquo,
        ldquor: ldquor,
        ldrdhar: ldrdhar,
        ldrushar: ldrushar,
        ldsh: ldsh,
        le: le,
        lE: lE,
        LeftAngleBracket: LeftAngleBracket,
        LeftArrowBar: LeftArrowBar,
        leftarrow: leftarrow,
        LeftArrow: LeftArrow,
        Leftarrow: Leftarrow,
        LeftArrowRightArrow: LeftArrowRightArrow,
        leftarrowtail: leftarrowtail,
        LeftCeiling: LeftCeiling,
        LeftDoubleBracket: LeftDoubleBracket,
        LeftDownTeeVector: LeftDownTeeVector,
        LeftDownVectorBar: LeftDownVectorBar,
        LeftDownVector: LeftDownVector,
        LeftFloor: LeftFloor,
        leftharpoondown: leftharpoondown,
        leftharpoonup: leftharpoonup,
        leftleftarrows: leftleftarrows,
        leftrightarrow: leftrightarrow,
        LeftRightArrow: LeftRightArrow,
        Leftrightarrow: Leftrightarrow,
        leftrightarrows: leftrightarrows,
        leftrightharpoons: leftrightharpoons,
        leftrightsquigarrow: leftrightsquigarrow,
        LeftRightVector: LeftRightVector,
        LeftTeeArrow: LeftTeeArrow,
        LeftTee: LeftTee,
        LeftTeeVector: LeftTeeVector,
        leftthreetimes: leftthreetimes,
        LeftTriangleBar: LeftTriangleBar,
        LeftTriangle: LeftTriangle,
        LeftTriangleEqual: LeftTriangleEqual,
        LeftUpDownVector: LeftUpDownVector,
        LeftUpTeeVector: LeftUpTeeVector,
        LeftUpVectorBar: LeftUpVectorBar,
        LeftUpVector: LeftUpVector,
        LeftVectorBar: LeftVectorBar,
        LeftVector: LeftVector,
        lEg: lEg,
        leg: leg,
        leq: leq,
        leqq: leqq,
        leqslant: leqslant,
        lescc: lescc,
        les: les,
        lesdot: lesdot,
        lesdoto: lesdoto,
        lesdotor: lesdotor,
        lesg: lesg,
        lesges: lesges,
        lessapprox: lessapprox,
        lessdot: lessdot,
        lesseqgtr: lesseqgtr,
        lesseqqgtr: lesseqqgtr,
        LessEqualGreater: LessEqualGreater,
        LessFullEqual: LessFullEqual,
        LessGreater: LessGreater,
        lessgtr: lessgtr,
        LessLess: LessLess,
        lesssim: lesssim,
        LessSlantEqual: LessSlantEqual,
        LessTilde: LessTilde,
        lfisht: lfisht,
        lfloor: lfloor,
        Lfr: Lfr,
        lfr: lfr,
        lg: lg,
        lgE: lgE,
        lHar: lHar,
        lhard: lhard,
        lharu: lharu,
        lharul: lharul,
        lhblk: lhblk,
        LJcy: LJcy,
        ljcy: ljcy,
        llarr: llarr,
        ll: ll,
        Ll: Ll,
        llcorner: llcorner,
        Lleftarrow: Lleftarrow,
        llhard: llhard,
        lltri: lltri,
        Lmidot: Lmidot,
        lmidot: lmidot,
        lmoustache: lmoustache,
        lmoust: lmoust,
        lnap: lnap,
        lnapprox: lnapprox,
        lne: lne,
        lnE: lnE,
        lneq: lneq,
        lneqq: lneqq,
        lnsim: lnsim,
        loang: loang,
        loarr: loarr,
        lobrk: lobrk,
        longleftarrow: longleftarrow,
        LongLeftArrow: LongLeftArrow,
        Longleftarrow: Longleftarrow,
        longleftrightarrow: longleftrightarrow,
        LongLeftRightArrow: LongLeftRightArrow,
        Longleftrightarrow: Longleftrightarrow,
        longmapsto: longmapsto,
        longrightarrow: longrightarrow,
        LongRightArrow: LongRightArrow,
        Longrightarrow: Longrightarrow,
        looparrowleft: looparrowleft,
        looparrowright: looparrowright,
        lopar: lopar,
        Lopf: Lopf,
        lopf: lopf,
        loplus: loplus,
        lotimes: lotimes,
        lowast: lowast,
        lowbar: lowbar,
        LowerLeftArrow: LowerLeftArrow,
        LowerRightArrow: LowerRightArrow,
        loz: loz,
        lozenge: lozenge,
        lozf: lozf,
        lpar: lpar,
        lparlt: lparlt,
        lrarr: lrarr,
        lrcorner: lrcorner,
        lrhar: lrhar,
        lrhard: lrhard,
        lrm: lrm,
        lrtri: lrtri,
        lsaquo: lsaquo,
        lscr: lscr,
        Lscr: Lscr,
        lsh: lsh,
        Lsh: Lsh,
        lsim: lsim,
        lsime: lsime,
        lsimg: lsimg,
        lsqb: lsqb,
        lsquo: lsquo,
        lsquor: lsquor,
        Lstrok: Lstrok,
        lstrok: lstrok,
        ltcc: ltcc,
        ltcir: ltcir,
        lt: lt,
        LT: LT,
        Lt: Lt,
        ltdot: ltdot,
        lthree: lthree,
        ltimes: ltimes,
        ltlarr: ltlarr,
        ltquest: ltquest,
        ltri: ltri,
        ltrie: ltrie,
        ltrif: ltrif,
        ltrPar: ltrPar,
        lurdshar: lurdshar,
        luruhar: luruhar,
        lvertneqq: lvertneqq,
        lvnE: lvnE,
        macr: macr,
        male: male,
        malt: malt,
        maltese: maltese,
        map: map,
        mapsto: mapsto,
        mapstodown: mapstodown,
        mapstoleft: mapstoleft,
        mapstoup: mapstoup,
        marker: marker,
        mcomma: mcomma,
        Mcy: Mcy,
        mcy: mcy,
        mdash: mdash,
        mDDot: mDDot,
        measuredangle: measuredangle,
        MediumSpace: MediumSpace,
        Mellintrf: Mellintrf,
        Mfr: Mfr,
        mfr: mfr,
        mho: mho,
        micro: micro,
        midast: midast,
        midcir: midcir,
        mid: mid,
        middot: middot,
        minusb: minusb,
        minus: minus,
        minusd: minusd,
        minusdu: minusdu,
        MinusPlus: MinusPlus,
        mlcp: mlcp,
        mldr: mldr,
        mnplus: mnplus,
        models: models,
        Mopf: Mopf,
        mopf: mopf,
        mp: mp,
        mscr: mscr,
        Mscr: Mscr,
        mstpos: mstpos,
        Mu: Mu,
        mu: mu,
        multimap: multimap,
        mumap: mumap,
        nabla: nabla,
        Nacute: Nacute,
        nacute: nacute,
        nang: nang,
        nap: nap,
        napE: napE,
        napid: napid,
        napos: napos,
        napprox: napprox,
        natural: natural,
        naturals: naturals,
        natur: natur,
        nbsp: nbsp,
        nbump: nbump,
        nbumpe: nbumpe,
        ncap: ncap,
        Ncaron: Ncaron,
        ncaron: ncaron,
        Ncedil: Ncedil,
        ncedil: ncedil,
        ncong: ncong,
        ncongdot: ncongdot,
        ncup: ncup,
        Ncy: Ncy,
        ncy: ncy,
        ndash: ndash,
        nearhk: nearhk,
        nearr: nearr,
        neArr: neArr,
        nearrow: nearrow,
        ne: ne,
        nedot: nedot,
        NegativeMediumSpace: NegativeMediumSpace,
        NegativeThickSpace: NegativeThickSpace,
        NegativeThinSpace: NegativeThinSpace,
        NegativeVeryThinSpace: NegativeVeryThinSpace,
        nequiv: nequiv,
        nesear: nesear,
        nesim: nesim,
        NestedGreaterGreater: NestedGreaterGreater,
        NestedLessLess: NestedLessLess,
        NewLine: NewLine,
        nexist: nexist,
        nexists: nexists,
        Nfr: Nfr,
        nfr: nfr,
        ngE: ngE,
        nge: nge,
        ngeq: ngeq,
        ngeqq: ngeqq,
        ngeqslant: ngeqslant,
        nges: nges,
        nGg: nGg,
        ngsim: ngsim,
        nGt: nGt,
        ngt: ngt,
        ngtr: ngtr,
        nGtv: nGtv,
        nharr: nharr,
        nhArr: nhArr,
        nhpar: nhpar,
        ni: ni,
        nis: nis,
        nisd: nisd,
        niv: niv,
        NJcy: NJcy,
        njcy: njcy,
        nlarr: nlarr,
        nlArr: nlArr,
        nldr: nldr,
        nlE: nlE,
        nle: nle,
        nleftarrow: nleftarrow,
        nLeftarrow: nLeftarrow,
        nleftrightarrow: nleftrightarrow,
        nLeftrightarrow: nLeftrightarrow,
        nleq: nleq,
        nleqq: nleqq,
        nleqslant: nleqslant,
        nles: nles,
        nless: nless,
        nLl: nLl,
        nlsim: nlsim,
        nLt: nLt,
        nlt: nlt,
        nltri: nltri,
        nltrie: nltrie,
        nLtv: nLtv,
        nmid: nmid,
        NoBreak: NoBreak,
        NonBreakingSpace: NonBreakingSpace,
        nopf: nopf,
        Nopf: Nopf,
        Not: Not,
        not: not,
        NotCongruent: NotCongruent,
        NotCupCap: NotCupCap,
        NotDoubleVerticalBar: NotDoubleVerticalBar,
        NotElement: NotElement,
        NotEqual: NotEqual,
        NotEqualTilde: NotEqualTilde,
        NotExists: NotExists,
        NotGreater: NotGreater,
        NotGreaterEqual: NotGreaterEqual,
        NotGreaterFullEqual: NotGreaterFullEqual,
        NotGreaterGreater: NotGreaterGreater,
        NotGreaterLess: NotGreaterLess,
        NotGreaterSlantEqual: NotGreaterSlantEqual,
        NotGreaterTilde: NotGreaterTilde,
        NotHumpDownHump: NotHumpDownHump,
        NotHumpEqual: NotHumpEqual,
        notin: notin,
        notindot: notindot,
        notinE: notinE,
        notinva: notinva,
        notinvb: notinvb,
        notinvc: notinvc,
        NotLeftTriangleBar: NotLeftTriangleBar,
        NotLeftTriangle: NotLeftTriangle,
        NotLeftTriangleEqual: NotLeftTriangleEqual,
        NotLess: NotLess,
        NotLessEqual: NotLessEqual,
        NotLessGreater: NotLessGreater,
        NotLessLess: NotLessLess,
        NotLessSlantEqual: NotLessSlantEqual,
        NotLessTilde: NotLessTilde,
        NotNestedGreaterGreater: NotNestedGreaterGreater,
        NotNestedLessLess: NotNestedLessLess,
        notni: notni,
        notniva: notniva,
        notnivb: notnivb,
        notnivc: notnivc,
        NotPrecedes: NotPrecedes,
        NotPrecedesEqual: NotPrecedesEqual,
        NotPrecedesSlantEqual: NotPrecedesSlantEqual,
        NotReverseElement: NotReverseElement,
        NotRightTriangleBar: NotRightTriangleBar,
        NotRightTriangle: NotRightTriangle,
        NotRightTriangleEqual: NotRightTriangleEqual,
        NotSquareSubset: NotSquareSubset,
        NotSquareSubsetEqual: NotSquareSubsetEqual,
        NotSquareSuperset: NotSquareSuperset,
        NotSquareSupersetEqual: NotSquareSupersetEqual,
        NotSubset: NotSubset,
        NotSubsetEqual: NotSubsetEqual,
        NotSucceeds: NotSucceeds,
        NotSucceedsEqual: NotSucceedsEqual,
        NotSucceedsSlantEqual: NotSucceedsSlantEqual,
        NotSucceedsTilde: NotSucceedsTilde,
        NotSuperset: NotSuperset,
        NotSupersetEqual: NotSupersetEqual,
        NotTilde: NotTilde,
        NotTildeEqual: NotTildeEqual,
        NotTildeFullEqual: NotTildeFullEqual,
        NotTildeTilde: NotTildeTilde,
        NotVerticalBar: NotVerticalBar,
        nparallel: nparallel,
        npar: npar,
        nparsl: nparsl,
        npart: npart,
        npolint: npolint,
        npr: npr,
        nprcue: nprcue,
        nprec: nprec,
        npreceq: npreceq,
        npre: npre,
        nrarrc: nrarrc,
        nrarr: nrarr,
        nrArr: nrArr,
        nrarrw: nrarrw,
        nrightarrow: nrightarrow,
        nRightarrow: nRightarrow,
        nrtri: nrtri,
        nrtrie: nrtrie,
        nsc: nsc,
        nsccue: nsccue,
        nsce: nsce,
        Nscr: Nscr,
        nscr: nscr,
        nshortmid: nshortmid,
        nshortparallel: nshortparallel,
        nsim: nsim,
        nsime: nsime,
        nsimeq: nsimeq,
        nsmid: nsmid,
        nspar: nspar,
        nsqsube: nsqsube,
        nsqsupe: nsqsupe,
        nsub: nsub,
        nsubE: nsubE,
        nsube: nsube,
        nsubset: nsubset,
        nsubseteq: nsubseteq,
        nsubseteqq: nsubseteqq,
        nsucc: nsucc,
        nsucceq: nsucceq,
        nsup: nsup,
        nsupE: nsupE,
        nsupe: nsupe,
        nsupset: nsupset,
        nsupseteq: nsupseteq,
        nsupseteqq: nsupseteqq,
        ntgl: ntgl,
        Ntilde: Ntilde,
        ntilde: ntilde,
        ntlg: ntlg,
        ntriangleleft: ntriangleleft,
        ntrianglelefteq: ntrianglelefteq,
        ntriangleright: ntriangleright,
        ntrianglerighteq: ntrianglerighteq,
        Nu: Nu,
        nu: nu,
        num: num,
        numero: numero,
        numsp: numsp,
        nvap: nvap,
        nvdash: nvdash,
        nvDash: nvDash,
        nVdash: nVdash,
        nVDash: nVDash,
        nvge: nvge,
        nvgt: nvgt,
        nvHarr: nvHarr,
        nvinfin: nvinfin,
        nvlArr: nvlArr,
        nvle: nvle,
        nvlt: nvlt,
        nvltrie: nvltrie,
        nvrArr: nvrArr,
        nvrtrie: nvrtrie,
        nvsim: nvsim,
        nwarhk: nwarhk,
        nwarr: nwarr,
        nwArr: nwArr,
        nwarrow: nwarrow,
        nwnear: nwnear,
        Oacute: Oacute,
        oacute: oacute,
        oast: oast,
        Ocirc: Ocirc,
        ocirc: ocirc,
        ocir: ocir,
        Ocy: Ocy,
        ocy: ocy,
        odash: odash,
        Odblac: Odblac,
        odblac: odblac,
        odiv: odiv,
        odot: odot,
        odsold: odsold,
        OElig: OElig,
        oelig: oelig,
        ofcir: ofcir,
        Ofr: Ofr,
        ofr: ofr,
        ogon: ogon,
        Ograve: Ograve,
        ograve: ograve,
        ogt: ogt,
        ohbar: ohbar,
        ohm: ohm,
        oint: oint,
        olarr: olarr,
        olcir: olcir,
        olcross: olcross,
        oline: oline,
        olt: olt,
        Omacr: Omacr,
        omacr: omacr,
        Omega: Omega,
        omega: omega,
        Omicron: Omicron,
        omicron: omicron,
        omid: omid,
        ominus: ominus,
        Oopf: Oopf,
        oopf: oopf,
        opar: opar,
        OpenCurlyDoubleQuote: OpenCurlyDoubleQuote,
        OpenCurlyQuote: OpenCurlyQuote,
        operp: operp,
        oplus: oplus,
        orarr: orarr,
        Or: Or,
        or: or,
        ord: ord,
        order: order,
        orderof: orderof,
        ordf: ordf,
        ordm: ordm,
        origof: origof,
        oror: oror,
        orslope: orslope,
        orv: orv,
        oS: oS,
        Oscr: Oscr,
        oscr: oscr,
        Oslash: Oslash,
        oslash: oslash,
        osol: osol,
        Otilde: Otilde,
        otilde: otilde,
        otimesas: otimesas,
        Otimes: Otimes,
        otimes: otimes,
        Ouml: Ouml,
        ouml: ouml,
        ovbar: ovbar,
        OverBar: OverBar,
        OverBrace: OverBrace,
        OverBracket: OverBracket,
        OverParenthesis: OverParenthesis,
        para: para,
        parallel: parallel,
        par: par,
        parsim: parsim,
        parsl: parsl,
        part: part,
        PartialD: PartialD,
        Pcy: Pcy,
        pcy: pcy,
        percnt: percnt,
        period: period,
        permil: permil,
        perp: perp,
        pertenk: pertenk,
        Pfr: Pfr,
        pfr: pfr,
        Phi: Phi,
        phi: phi,
        phiv: phiv,
        phmmat: phmmat,
        phone: phone,
        Pi: Pi,
        pi: pi,
        pitchfork: pitchfork,
        piv: piv,
        planck: planck,
        planckh: planckh,
        plankv: plankv,
        plusacir: plusacir,
        plusb: plusb,
        pluscir: pluscir,
        plus: plus,
        plusdo: plusdo,
        plusdu: plusdu,
        pluse: pluse,
        PlusMinus: PlusMinus,
        plusmn: plusmn,
        plussim: plussim,
        plustwo: plustwo,
        pm: pm,
        Poincareplane: Poincareplane,
        pointint: pointint,
        popf: popf,
        Popf: Popf,
        pound: pound,
        prap: prap,
        Pr: Pr,
        pr: pr,
        prcue: prcue,
        precapprox: precapprox,
        prec: prec,
        preccurlyeq: preccurlyeq,
        Precedes: Precedes,
        PrecedesEqual: PrecedesEqual,
        PrecedesSlantEqual: PrecedesSlantEqual,
        PrecedesTilde: PrecedesTilde,
        preceq: preceq,
        precnapprox: precnapprox,
        precneqq: precneqq,
        precnsim: precnsim,
        pre: pre,
        prE: prE,
        precsim: precsim,
        prime: prime,
        Prime: Prime,
        primes: primes,
        prnap: prnap,
        prnE: prnE,
        prnsim: prnsim,
        prod: prod,
        Product: Product,
        profalar: profalar,
        profline: profline,
        profsurf: profsurf,
        prop: prop,
        Proportional: Proportional,
        Proportion: Proportion,
        propto: propto,
        prsim: prsim,
        prurel: prurel,
        Pscr: Pscr,
        pscr: pscr,
        Psi: Psi,
        psi: psi,
        puncsp: puncsp,
        Qfr: Qfr,
        qfr: qfr,
        qint: qint,
        qopf: qopf,
        Qopf: Qopf,
        qprime: qprime,
        Qscr: Qscr,
        qscr: qscr,
        quaternions: quaternions,
        quatint: quatint,
        quest: quest,
        questeq: questeq,
        quot: quot,
        QUOT: QUOT,
        rAarr: rAarr,
        race: race,
        Racute: Racute,
        racute: racute,
        radic: radic,
        raemptyv: raemptyv,
        rang: rang,
        Rang: Rang,
        rangd: rangd,
        range: range,
        rangle: rangle,
        raquo: raquo,
        rarrap: rarrap,
        rarrb: rarrb,
        rarrbfs: rarrbfs,
        rarrc: rarrc,
        rarr: rarr,
        Rarr: Rarr,
        rArr: rArr,
        rarrfs: rarrfs,
        rarrhk: rarrhk,
        rarrlp: rarrlp,
        rarrpl: rarrpl,
        rarrsim: rarrsim,
        Rarrtl: Rarrtl,
        rarrtl: rarrtl,
        rarrw: rarrw,
        ratail: ratail,
        rAtail: rAtail,
        ratio: ratio,
        rationals: rationals,
        rbarr: rbarr,
        rBarr: rBarr,
        RBarr: RBarr,
        rbbrk: rbbrk,
        rbrace: rbrace,
        rbrack: rbrack,
        rbrke: rbrke,
        rbrksld: rbrksld,
        rbrkslu: rbrkslu,
        Rcaron: Rcaron,
        rcaron: rcaron,
        Rcedil: Rcedil,
        rcedil: rcedil,
        rceil: rceil,
        rcub: rcub,
        Rcy: Rcy,
        rcy: rcy,
        rdca: rdca,
        rdldhar: rdldhar,
        rdquo: rdquo,
        rdquor: rdquor,
        rdsh: rdsh,
        real: real,
        realine: realine,
        realpart: realpart,
        reals: reals,
        Re: Re,
        rect: rect,
        reg: reg,
        REG: REG,
        ReverseElement: ReverseElement,
        ReverseEquilibrium: ReverseEquilibrium,
        ReverseUpEquilibrium: ReverseUpEquilibrium,
        rfisht: rfisht,
        rfloor: rfloor,
        rfr: rfr,
        Rfr: Rfr,
        rHar: rHar,
        rhard: rhard,
        rharu: rharu,
        rharul: rharul,
        Rho: Rho,
        rho: rho,
        rhov: rhov,
        RightAngleBracket: RightAngleBracket,
        RightArrowBar: RightArrowBar,
        rightarrow: rightarrow,
        RightArrow: RightArrow,
        Rightarrow: Rightarrow,
        RightArrowLeftArrow: RightArrowLeftArrow,
        rightarrowtail: rightarrowtail,
        RightCeiling: RightCeiling,
        RightDoubleBracket: RightDoubleBracket,
        RightDownTeeVector: RightDownTeeVector,
        RightDownVectorBar: RightDownVectorBar,
        RightDownVector: RightDownVector,
        RightFloor: RightFloor,
        rightharpoondown: rightharpoondown,
        rightharpoonup: rightharpoonup,
        rightleftarrows: rightleftarrows,
        rightleftharpoons: rightleftharpoons,
        rightrightarrows: rightrightarrows,
        rightsquigarrow: rightsquigarrow,
        RightTeeArrow: RightTeeArrow,
        RightTee: RightTee,
        RightTeeVector: RightTeeVector,
        rightthreetimes: rightthreetimes,
        RightTriangleBar: RightTriangleBar,
        RightTriangle: RightTriangle,
        RightTriangleEqual: RightTriangleEqual,
        RightUpDownVector: RightUpDownVector,
        RightUpTeeVector: RightUpTeeVector,
        RightUpVectorBar: RightUpVectorBar,
        RightUpVector: RightUpVector,
        RightVectorBar: RightVectorBar,
        RightVector: RightVector,
        ring: ring,
        risingdotseq: risingdotseq,
        rlarr: rlarr,
        rlhar: rlhar,
        rlm: rlm,
        rmoustache: rmoustache,
        rmoust: rmoust,
        rnmid: rnmid,
        roang: roang,
        roarr: roarr,
        robrk: robrk,
        ropar: ropar,
        ropf: ropf,
        Ropf: Ropf,
        roplus: roplus,
        rotimes: rotimes,
        RoundImplies: RoundImplies,
        rpar: rpar,
        rpargt: rpargt,
        rppolint: rppolint,
        rrarr: rrarr,
        Rrightarrow: Rrightarrow,
        rsaquo: rsaquo,
        rscr: rscr,
        Rscr: Rscr,
        rsh: rsh,
        Rsh: Rsh,
        rsqb: rsqb,
        rsquo: rsquo,
        rsquor: rsquor,
        rthree: rthree,
        rtimes: rtimes,
        rtri: rtri,
        rtrie: rtrie,
        rtrif: rtrif,
        rtriltri: rtriltri,
        RuleDelayed: RuleDelayed,
        ruluhar: ruluhar,
        rx: rx,
        Sacute: Sacute,
        sacute: sacute,
        sbquo: sbquo,
        scap: scap,
        Scaron: Scaron,
        scaron: scaron,
        Sc: Sc,
        sc: sc,
        sccue: sccue,
        sce: sce,
        scE: scE,
        Scedil: Scedil,
        scedil: scedil,
        Scirc: Scirc,
        scirc: scirc,
        scnap: scnap,
        scnE: scnE,
        scnsim: scnsim,
        scpolint: scpolint,
        scsim: scsim,
        Scy: Scy,
        scy: scy,
        sdotb: sdotb,
        sdot: sdot,
        sdote: sdote,
        searhk: searhk,
        searr: searr,
        seArr: seArr,
        searrow: searrow,
        sect: sect,
        semi: semi,
        seswar: seswar,
        setminus: setminus,
        setmn: setmn,
        sext: sext,
        Sfr: Sfr,
        sfr: sfr,
        sfrown: sfrown,
        sharp: sharp,
        SHCHcy: SHCHcy,
        shchcy: shchcy,
        SHcy: SHcy,
        shcy: shcy,
        ShortDownArrow: ShortDownArrow,
        ShortLeftArrow: ShortLeftArrow,
        shortmid: shortmid,
        shortparallel: shortparallel,
        ShortRightArrow: ShortRightArrow,
        ShortUpArrow: ShortUpArrow,
        shy: shy,
        Sigma: Sigma,
        sigma: sigma,
        sigmaf: sigmaf,
        sigmav: sigmav,
        sim: sim,
        simdot: simdot,
        sime: sime,
        simeq: simeq,
        simg: simg,
        simgE: simgE,
        siml: siml,
        simlE: simlE,
        simne: simne,
        simplus: simplus,
        simrarr: simrarr,
        slarr: slarr,
        SmallCircle: SmallCircle,
        smallsetminus: smallsetminus,
        smashp: smashp,
        smeparsl: smeparsl,
        smid: smid,
        smile: smile,
        smt: smt,
        smte: smte,
        smtes: smtes,
        SOFTcy: SOFTcy,
        softcy: softcy,
        solbar: solbar,
        solb: solb,
        sol: sol,
        Sopf: Sopf,
        sopf: sopf,
        spades: spades,
        spadesuit: spadesuit,
        spar: spar,
        sqcap: sqcap,
        sqcaps: sqcaps,
        sqcup: sqcup,
        sqcups: sqcups,
        Sqrt: Sqrt,
        sqsub: sqsub,
        sqsube: sqsube,
        sqsubset: sqsubset,
        sqsubseteq: sqsubseteq,
        sqsup: sqsup,
        sqsupe: sqsupe,
        sqsupset: sqsupset,
        sqsupseteq: sqsupseteq,
        square: square,
        Square: Square,
        SquareIntersection: SquareIntersection,
        SquareSubset: SquareSubset,
        SquareSubsetEqual: SquareSubsetEqual,
        SquareSuperset: SquareSuperset,
        SquareSupersetEqual: SquareSupersetEqual,
        SquareUnion: SquareUnion,
        squarf: squarf,
        squ: squ,
        squf: squf,
        srarr: srarr,
        Sscr: Sscr,
        sscr: sscr,
        ssetmn: ssetmn,
        ssmile: ssmile,
        sstarf: sstarf,
        Star: Star,
        star: star,
        starf: starf,
        straightepsilon: straightepsilon,
        straightphi: straightphi,
        strns: strns,
        sub: sub,
        Sub: Sub,
        subdot: subdot,
        subE: subE,
        sube: sube,
        subedot: subedot,
        submult: submult,
        subnE: subnE,
        subne: subne,
        subplus: subplus,
        subrarr: subrarr,
        subset: subset,
        Subset: Subset,
        subseteq: subseteq,
        subseteqq: subseteqq,
        SubsetEqual: SubsetEqual,
        subsetneq: subsetneq,
        subsetneqq: subsetneqq,
        subsim: subsim,
        subsub: subsub,
        subsup: subsup,
        succapprox: succapprox,
        succ: succ,
        succcurlyeq: succcurlyeq,
        Succeeds: Succeeds,
        SucceedsEqual: SucceedsEqual,
        SucceedsSlantEqual: SucceedsSlantEqual,
        SucceedsTilde: SucceedsTilde,
        succeq: succeq,
        succnapprox: succnapprox,
        succneqq: succneqq,
        succnsim: succnsim,
        succsim: succsim,
        SuchThat: SuchThat,
        sum: sum,
        Sum: Sum,
        sung: sung,
        sup1: sup1,
        sup2: sup2,
        sup3: sup3,
        sup: sup,
        Sup: Sup,
        supdot: supdot,
        supdsub: supdsub,
        supE: supE,
        supe: supe,
        supedot: supedot,
        Superset: Superset,
        SupersetEqual: SupersetEqual,
        suphsol: suphsol,
        suphsub: suphsub,
        suplarr: suplarr,
        supmult: supmult,
        supnE: supnE,
        supne: supne,
        supplus: supplus,
        supset: supset,
        Supset: Supset,
        supseteq: supseteq,
        supseteqq: supseteqq,
        supsetneq: supsetneq,
        supsetneqq: supsetneqq,
        supsim: supsim,
        supsub: supsub,
        supsup: supsup,
        swarhk: swarhk,
        swarr: swarr,
        swArr: swArr,
        swarrow: swarrow,
        swnwar: swnwar,
        szlig: szlig,
        Tab: Tab,
        target: target,
        Tau: Tau,
        tau: tau,
        tbrk: tbrk,
        Tcaron: Tcaron,
        tcaron: tcaron,
        Tcedil: Tcedil,
        tcedil: tcedil,
        Tcy: Tcy,
        tcy: tcy,
        tdot: tdot,
        telrec: telrec,
        Tfr: Tfr,
        tfr: tfr,
        there4: there4,
        therefore: therefore,
        Therefore: Therefore,
        Theta: Theta,
        theta: theta,
        thetasym: thetasym,
        thetav: thetav,
        thickapprox: thickapprox,
        thicksim: thicksim,
        ThickSpace: ThickSpace,
        ThinSpace: ThinSpace,
        thinsp: thinsp,
        thkap: thkap,
        thksim: thksim,
        THORN: THORN,
        thorn: thorn,
        tilde: tilde,
        Tilde: Tilde,
        TildeEqual: TildeEqual,
        TildeFullEqual: TildeFullEqual,
        TildeTilde: TildeTilde,
        timesbar: timesbar,
        timesb: timesb,
        times: times,
        timesd: timesd,
        tint: tint,
        toea: toea,
        topbot: topbot,
        topcir: topcir,
        top: top,
        Topf: Topf,
        topf: topf,
        topfork: topfork,
        tosa: tosa,
        tprime: tprime,
        trade: trade,
        TRADE: TRADE,
        triangle: triangle,
        triangledown: triangledown,
        triangleleft: triangleleft,
        trianglelefteq: trianglelefteq,
        triangleq: triangleq,
        triangleright: triangleright,
        trianglerighteq: trianglerighteq,
        tridot: tridot,
        trie: trie,
        triminus: triminus,
        TripleDot: TripleDot,
        triplus: triplus,
        trisb: trisb,
        tritime: tritime,
        trpezium: trpezium,
        Tscr: Tscr,
        tscr: tscr,
        TScy: TScy,
        tscy: tscy,
        TSHcy: TSHcy,
        tshcy: tshcy,
        Tstrok: Tstrok,
        tstrok: tstrok,
        twixt: twixt,
        twoheadleftarrow: twoheadleftarrow,
        twoheadrightarrow: twoheadrightarrow,
        Uacute: Uacute,
        uacute: uacute,
        uarr: uarr,
        Uarr: Uarr,
        uArr: uArr,
        Uarrocir: Uarrocir,
        Ubrcy: Ubrcy,
        ubrcy: ubrcy,
        Ubreve: Ubreve,
        ubreve: ubreve,
        Ucirc: Ucirc,
        ucirc: ucirc,
        Ucy: Ucy,
        ucy: ucy,
        udarr: udarr,
        Udblac: Udblac,
        udblac: udblac,
        udhar: udhar,
        ufisht: ufisht,
        Ufr: Ufr,
        ufr: ufr,
        Ugrave: Ugrave,
        ugrave: ugrave,
        uHar: uHar,
        uharl: uharl,
        uharr: uharr,
        uhblk: uhblk,
        ulcorn: ulcorn,
        ulcorner: ulcorner,
        ulcrop: ulcrop,
        ultri: ultri,
        Umacr: Umacr,
        umacr: umacr,
        uml: uml,
        UnderBar: UnderBar,
        UnderBrace: UnderBrace,
        UnderBracket: UnderBracket,
        UnderParenthesis: UnderParenthesis,
        Union: Union,
        UnionPlus: UnionPlus,
        Uogon: Uogon,
        uogon: uogon,
        Uopf: Uopf,
        uopf: uopf,
        UpArrowBar: UpArrowBar,
        uparrow: uparrow,
        UpArrow: UpArrow,
        Uparrow: Uparrow,
        UpArrowDownArrow: UpArrowDownArrow,
        updownarrow: updownarrow,
        UpDownArrow: UpDownArrow,
        Updownarrow: Updownarrow,
        UpEquilibrium: UpEquilibrium,
        upharpoonleft: upharpoonleft,
        upharpoonright: upharpoonright,
        uplus: uplus,
        UpperLeftArrow: UpperLeftArrow,
        UpperRightArrow: UpperRightArrow,
        upsi: upsi,
        Upsi: Upsi,
        upsih: upsih,
        Upsilon: Upsilon,
        upsilon: upsilon,
        UpTeeArrow: UpTeeArrow,
        UpTee: UpTee,
        upuparrows: upuparrows,
        urcorn: urcorn,
        urcorner: urcorner,
        urcrop: urcrop,
        Uring: Uring,
        uring: uring,
        urtri: urtri,
        Uscr: Uscr,
        uscr: uscr,
        utdot: utdot,
        Utilde: Utilde,
        utilde: utilde,
        utri: utri,
        utrif: utrif,
        uuarr: uuarr,
        Uuml: Uuml,
        uuml: uuml,
        uwangle: uwangle,
        vangrt: vangrt,
        varepsilon: varepsilon,
        varkappa: varkappa,
        varnothing: varnothing,
        varphi: varphi,
        varpi: varpi,
        varpropto: varpropto,
        varr: varr,
        vArr: vArr,
        varrho: varrho,
        varsigma: varsigma,
        varsubsetneq: varsubsetneq,
        varsubsetneqq: varsubsetneqq,
        varsupsetneq: varsupsetneq,
        varsupsetneqq: varsupsetneqq,
        vartheta: vartheta,
        vartriangleleft: vartriangleleft,
        vartriangleright: vartriangleright,
        vBar: vBar,
        Vbar: Vbar,
        vBarv: vBarv,
        Vcy: Vcy,
        vcy: vcy,
        vdash: vdash,
        vDash: vDash,
        Vdash: Vdash,
        VDash: VDash,
        Vdashl: Vdashl,
        veebar: veebar,
        vee: vee,
        Vee: Vee,
        veeeq: veeeq,
        vellip: vellip,
        verbar: verbar,
        Verbar: Verbar,
        vert: vert,
        Vert: Vert,
        VerticalBar: VerticalBar,
        VerticalLine: VerticalLine,
        VerticalSeparator: VerticalSeparator,
        VerticalTilde: VerticalTilde,
        VeryThinSpace: VeryThinSpace,
        Vfr: Vfr,
        vfr: vfr,
        vltri: vltri,
        vnsub: vnsub,
        vnsup: vnsup,
        Vopf: Vopf,
        vopf: vopf,
        vprop: vprop,
        vrtri: vrtri,
        Vscr: Vscr,
        vscr: vscr,
        vsubnE: vsubnE,
        vsubne: vsubne,
        vsupnE: vsupnE,
        vsupne: vsupne,
        Vvdash: Vvdash,
        vzigzag: vzigzag,
        Wcirc: Wcirc,
        wcirc: wcirc,
        wedbar: wedbar,
        wedge: wedge,
        Wedge: Wedge,
        wedgeq: wedgeq,
        weierp: weierp,
        Wfr: Wfr,
        wfr: wfr,
        Wopf: Wopf,
        wopf: wopf,
        wp: wp,
        wr: wr,
        wreath: wreath,
        Wscr: Wscr,
        wscr: wscr,
        xcap: xcap,
        xcirc: xcirc,
        xcup: xcup,
        xdtri: xdtri,
        Xfr: Xfr,
        xfr: xfr,
        xharr: xharr,
        xhArr: xhArr,
        Xi: Xi,
        xi: xi,
        xlarr: xlarr,
        xlArr: xlArr,
        xmap: xmap,
        xnis: xnis,
        xodot: xodot,
        Xopf: Xopf,
        xopf: xopf,
        xoplus: xoplus,
        xotime: xotime,
        xrarr: xrarr,
        xrArr: xrArr,
        Xscr: Xscr,
        xscr: xscr,
        xsqcup: xsqcup,
        xuplus: xuplus,
        xutri: xutri,
        xvee: xvee,
        xwedge: xwedge,
        Yacute: Yacute,
        yacute: yacute,
        YAcy: YAcy,
        yacy: yacy,
        Ycirc: Ycirc,
        ycirc: ycirc,
        Ycy: Ycy,
        ycy: ycy,
        yen: yen,
        Yfr: Yfr,
        yfr: yfr,
        YIcy: YIcy,
        yicy: yicy,
        Yopf: Yopf,
        yopf: yopf,
        Yscr: Yscr,
        yscr: yscr,
        YUcy: YUcy,
        yucy: yucy,
        yuml: yuml,
        Yuml: Yuml,
        Zacute: Zacute,
        zacute: zacute,
        Zcaron: Zcaron,
        zcaron: zcaron,
        Zcy: Zcy,
        zcy: zcy,
        Zdot: Zdot,
        zdot: zdot,
        zeetrf: zeetrf,
        ZeroWidthSpace: ZeroWidthSpace,
        Zeta: Zeta,
        zeta: zeta,
        zfr: zfr,
        Zfr: Zfr,
        ZHcy: ZHcy,
        zhcy: zhcy,
        zigrarr: zigrarr,
        zopf: zopf,
        Zopf: Zopf,
        Zscr: Zscr,
        zscr: zscr,
        zwj: zwj,
        zwnj: zwnj,
        'default': entities
    });

    var require$$0 = getCjsExportFromNamespace(entities$1);

    /*eslint quotes:0*/
    var entities$2 = require$$0;

    var regex=/[!-#%-\*,-\/:;\?@\[-\]_\{\}\xA1\xA7\xAB\xB6\xB7\xBB\xBF\u037E\u0387\u055A-\u055F\u0589\u058A\u05BE\u05C0\u05C3\u05C6\u05F3\u05F4\u0609\u060A\u060C\u060D\u061B\u061E\u061F\u066A-\u066D\u06D4\u0700-\u070D\u07F7-\u07F9\u0830-\u083E\u085E\u0964\u0965\u0970\u09FD\u0A76\u0AF0\u0C84\u0DF4\u0E4F\u0E5A\u0E5B\u0F04-\u0F12\u0F14\u0F3A-\u0F3D\u0F85\u0FD0-\u0FD4\u0FD9\u0FDA\u104A-\u104F\u10FB\u1360-\u1368\u1400\u166D\u166E\u169B\u169C\u16EB-\u16ED\u1735\u1736\u17D4-\u17D6\u17D8-\u17DA\u1800-\u180A\u1944\u1945\u1A1E\u1A1F\u1AA0-\u1AA6\u1AA8-\u1AAD\u1B5A-\u1B60\u1BFC-\u1BFF\u1C3B-\u1C3F\u1C7E\u1C7F\u1CC0-\u1CC7\u1CD3\u2010-\u2027\u2030-\u2043\u2045-\u2051\u2053-\u205E\u207D\u207E\u208D\u208E\u2308-\u230B\u2329\u232A\u2768-\u2775\u27C5\u27C6\u27E6-\u27EF\u2983-\u2998\u29D8-\u29DB\u29FC\u29FD\u2CF9-\u2CFC\u2CFE\u2CFF\u2D70\u2E00-\u2E2E\u2E30-\u2E4E\u3001-\u3003\u3008-\u3011\u3014-\u301F\u3030\u303D\u30A0\u30FB\uA4FE\uA4FF\uA60D-\uA60F\uA673\uA67E\uA6F2-\uA6F7\uA874-\uA877\uA8CE\uA8CF\uA8F8-\uA8FA\uA8FC\uA92E\uA92F\uA95F\uA9C1-\uA9CD\uA9DE\uA9DF\uAA5C-\uAA5F\uAADE\uAADF\uAAF0\uAAF1\uABEB\uFD3E\uFD3F\uFE10-\uFE19\uFE30-\uFE52\uFE54-\uFE61\uFE63\uFE68\uFE6A\uFE6B\uFF01-\uFF03\uFF05-\uFF0A\uFF0C-\uFF0F\uFF1A\uFF1B\uFF1F\uFF20\uFF3B-\uFF3D\uFF3F\uFF5B\uFF5D\uFF5F-\uFF65]|\uD800[\uDD00-\uDD02\uDF9F\uDFD0]|\uD801\uDD6F|\uD802[\uDC57\uDD1F\uDD3F\uDE50-\uDE58\uDE7F\uDEF0-\uDEF6\uDF39-\uDF3F\uDF99-\uDF9C]|\uD803[\uDF55-\uDF59]|\uD804[\uDC47-\uDC4D\uDCBB\uDCBC\uDCBE-\uDCC1\uDD40-\uDD43\uDD74\uDD75\uDDC5-\uDDC8\uDDCD\uDDDB\uDDDD-\uDDDF\uDE38-\uDE3D\uDEA9]|\uD805[\uDC4B-\uDC4F\uDC5B\uDC5D\uDCC6\uDDC1-\uDDD7\uDE41-\uDE43\uDE60-\uDE6C\uDF3C-\uDF3E]|\uD806[\uDC3B\uDE3F-\uDE46\uDE9A-\uDE9C\uDE9E-\uDEA2]|\uD807[\uDC41-\uDC45\uDC70\uDC71\uDEF7\uDEF8]|\uD809[\uDC70-\uDC74]|\uD81A[\uDE6E\uDE6F\uDEF5\uDF37-\uDF3B\uDF44]|\uD81B[\uDE97-\uDE9A]|\uD82F\uDC9F|\uD836[\uDE87-\uDE8B]|\uD83A[\uDD5E\uDD5F]/;

    var encodeCache = {};


    // Create a lookup array where anything but characters in `chars` string
    // and alphanumeric chars is percent-encoded.
    //
    function getEncodeCache(exclude) {
      var i, ch, cache = encodeCache[exclude];
      if (cache) { return cache; }

      cache = encodeCache[exclude] = [];

      for (i = 0; i < 128; i++) {
        ch = String.fromCharCode(i);

        if (/^[0-9a-z]$/i.test(ch)) {
          // always allow unencoded alphanumeric characters
          cache.push(ch);
        } else {
          cache.push('%' + ('0' + i.toString(16).toUpperCase()).slice(-2));
        }
      }

      for (i = 0; i < exclude.length; i++) {
        cache[exclude.charCodeAt(i)] = exclude[i];
      }

      return cache;
    }


    // Encode unsafe characters with percent-encoding, skipping already
    // encoded sequences.
    //
    //  - string       - string to encode
    //  - exclude      - list of characters to ignore (in addition to a-zA-Z0-9)
    //  - keepEscaped  - don't encode '%' in a correct escape sequence (default: true)
    //
    function encode(string, exclude, keepEscaped) {
      var i, l, code, nextCode, cache,
          result = '';

      if (typeof exclude !== 'string') {
        // encode(string, keepEscaped)
        keepEscaped  = exclude;
        exclude = encode.defaultChars;
      }

      if (typeof keepEscaped === 'undefined') {
        keepEscaped = true;
      }

      cache = getEncodeCache(exclude);

      for (i = 0, l = string.length; i < l; i++) {
        code = string.charCodeAt(i);

        if (keepEscaped && code === 0x25 /* % */ && i + 2 < l) {
          if (/^[0-9a-f]{2}$/i.test(string.slice(i + 1, i + 3))) {
            result += string.slice(i, i + 3);
            i += 2;
            continue;
          }
        }

        if (code < 128) {
          result += cache[code];
          continue;
        }

        if (code >= 0xD800 && code <= 0xDFFF) {
          if (code >= 0xD800 && code <= 0xDBFF && i + 1 < l) {
            nextCode = string.charCodeAt(i + 1);
            if (nextCode >= 0xDC00 && nextCode <= 0xDFFF) {
              result += encodeURIComponent(string[i] + string[i + 1]);
              i++;
              continue;
            }
          }
          result += '%EF%BF%BD';
          continue;
        }

        result += encodeURIComponent(string[i]);
      }

      return result;
    }

    encode.defaultChars   = ";/?:@&=+$,-_.!~*'()#";
    encode.componentChars = "-_.!~*'()";


    var encode_1 = encode;

    /* eslint-disable no-bitwise */

    var decodeCache = {};

    function getDecodeCache(exclude) {
      var i, ch, cache = decodeCache[exclude];
      if (cache) { return cache; }

      cache = decodeCache[exclude] = [];

      for (i = 0; i < 128; i++) {
        ch = String.fromCharCode(i);
        cache.push(ch);
      }

      for (i = 0; i < exclude.length; i++) {
        ch = exclude.charCodeAt(i);
        cache[ch] = '%' + ('0' + ch.toString(16).toUpperCase()).slice(-2);
      }

      return cache;
    }


    // Decode percent-encoded string.
    //
    function decode(string, exclude) {
      var cache;

      if (typeof exclude !== 'string') {
        exclude = decode.defaultChars;
      }

      cache = getDecodeCache(exclude);

      return string.replace(/(%[a-f0-9]{2})+/gi, function(seq) {
        var i, l, b1, b2, b3, b4, chr,
            result = '';

        for (i = 0, l = seq.length; i < l; i += 3) {
          b1 = parseInt(seq.slice(i + 1, i + 3), 16);

          if (b1 < 0x80) {
            result += cache[b1];
            continue;
          }

          if ((b1 & 0xE0) === 0xC0 && (i + 3 < l)) {
            // 110xxxxx 10xxxxxx
            b2 = parseInt(seq.slice(i + 4, i + 6), 16);

            if ((b2 & 0xC0) === 0x80) {
              chr = ((b1 << 6) & 0x7C0) | (b2 & 0x3F);

              if (chr < 0x80) {
                result += '\ufffd\ufffd';
              } else {
                result += String.fromCharCode(chr);
              }

              i += 3;
              continue;
            }
          }

          if ((b1 & 0xF0) === 0xE0 && (i + 6 < l)) {
            // 1110xxxx 10xxxxxx 10xxxxxx
            b2 = parseInt(seq.slice(i + 4, i + 6), 16);
            b3 = parseInt(seq.slice(i + 7, i + 9), 16);

            if ((b2 & 0xC0) === 0x80 && (b3 & 0xC0) === 0x80) {
              chr = ((b1 << 12) & 0xF000) | ((b2 << 6) & 0xFC0) | (b3 & 0x3F);

              if (chr < 0x800 || (chr >= 0xD800 && chr <= 0xDFFF)) {
                result += '\ufffd\ufffd\ufffd';
              } else {
                result += String.fromCharCode(chr);
              }

              i += 6;
              continue;
            }
          }

          if ((b1 & 0xF8) === 0xF0 && (i + 9 < l)) {
            // 111110xx 10xxxxxx 10xxxxxx 10xxxxxx
            b2 = parseInt(seq.slice(i + 4, i + 6), 16);
            b3 = parseInt(seq.slice(i + 7, i + 9), 16);
            b4 = parseInt(seq.slice(i + 10, i + 12), 16);

            if ((b2 & 0xC0) === 0x80 && (b3 & 0xC0) === 0x80 && (b4 & 0xC0) === 0x80) {
              chr = ((b1 << 18) & 0x1C0000) | ((b2 << 12) & 0x3F000) | ((b3 << 6) & 0xFC0) | (b4 & 0x3F);

              if (chr < 0x10000 || chr > 0x10FFFF) {
                result += '\ufffd\ufffd\ufffd\ufffd';
              } else {
                chr -= 0x10000;
                result += String.fromCharCode(0xD800 + (chr >> 10), 0xDC00 + (chr & 0x3FF));
              }

              i += 9;
              continue;
            }
          }

          result += '\ufffd';
        }

        return result;
      });
    }


    decode.defaultChars   = ';/?:@&=+$,#';
    decode.componentChars = '';


    var decode_1 = decode;

    var format = function format(url) {
      var result = '';

      result += url.protocol || '';
      result += url.slashes ? '//' : '';
      result += url.auth ? url.auth + '@' : '';

      if (url.hostname && url.hostname.indexOf(':') !== -1) {
        // ipv6 address
        result += '[' + url.hostname + ']';
      } else {
        result += url.hostname || '';
      }

      result += url.port ? ':' + url.port : '';
      result += url.pathname || '';
      result += url.search || '';
      result += url.hash || '';

      return result;
    };

    // Copyright Joyent, Inc. and other Node contributors.

    //
    // Changes from joyent/node:
    //
    // 1. No leading slash in paths,
    //    e.g. in `url.parse('http://foo?bar')` pathname is ``, not `/`
    //
    // 2. Backslashes are not replaced with slashes,
    //    so `http:\\example.org\` is treated like a relative path
    //
    // 3. Trailing colon is treated like a part of the path,
    //    i.e. in `http://example.org:foo` pathname is `:foo`
    //
    // 4. Nothing is URL-encoded in the resulting object,
    //    (in joyent/node some chars in auth and paths are encoded)
    //
    // 5. `url.parse()` does not have `parseQueryString` argument
    //
    // 6. Removed extraneous result properties: `host`, `path`, `query`, etc.,
    //    which can be constructed using other parts of the url.
    //


    function Url() {
      this.protocol = null;
      this.slashes = null;
      this.auth = null;
      this.port = null;
      this.hostname = null;
      this.hash = null;
      this.search = null;
      this.pathname = null;
    }

    // Reference: RFC 3986, RFC 1808, RFC 2396

    // define these here so at least they only have to be
    // compiled once on the first module load.
    var protocolPattern = /^([a-z0-9.+-]+:)/i,
        portPattern = /:[0-9]*$/,

        // Special case for a simple path URL
        simplePathPattern = /^(\/\/?(?!\/)[^\?\s]*)(\?[^\s]*)?$/,

        // RFC 2396: characters reserved for delimiting URLs.
        // We actually just auto-escape these.
        delims = [ '<', '>', '"', '`', ' ', '\r', '\n', '\t' ],

        // RFC 2396: characters not allowed for various reasons.
        unwise = [ '{', '}', '|', '\\', '^', '`' ].concat(delims),

        // Allowed by RFCs, but cause of XSS attacks.  Always escape these.
        autoEscape = [ '\'' ].concat(unwise),
        // Characters that are never ever allowed in a hostname.
        // Note that any invalid chars are also handled, but these
        // are the ones that are *expected* to be seen, so we fast-path
        // them.
        nonHostChars = [ '%', '/', '?', ';', '#' ].concat(autoEscape),
        hostEndingChars = [ '/', '?', '#' ],
        hostnameMaxLen = 255,
        hostnamePartPattern = /^[+a-z0-9A-Z_-]{0,63}$/,
        hostnamePartStart = /^([+a-z0-9A-Z_-]{0,63})(.*)$/,
        // protocols that can allow "unsafe" and "unwise" chars.
        /* eslint-disable no-script-url */
        // protocols that never have a hostname.
        hostlessProtocol = {
          'javascript': true,
          'javascript:': true
        },
        // protocols that always contain a // bit.
        slashedProtocol = {
          'http': true,
          'https': true,
          'ftp': true,
          'gopher': true,
          'file': true,
          'http:': true,
          'https:': true,
          'ftp:': true,
          'gopher:': true,
          'file:': true
        };
        /* eslint-enable no-script-url */

    function urlParse(url, slashesDenoteHost) {
      if (url && url instanceof Url) { return url; }

      var u = new Url();
      u.parse(url, slashesDenoteHost);
      return u;
    }

    Url.prototype.parse = function(url, slashesDenoteHost) {
      var i, l, lowerProto, hec, slashes,
          rest = url;

      // trim before proceeding.
      // This is to support parse stuff like "  http://foo.com  \n"
      rest = rest.trim();

      if (!slashesDenoteHost && url.split('#').length === 1) {
        // Try fast path regexp
        var simplePath = simplePathPattern.exec(rest);
        if (simplePath) {
          this.pathname = simplePath[1];
          if (simplePath[2]) {
            this.search = simplePath[2];
          }
          return this;
        }
      }

      var proto = protocolPattern.exec(rest);
      if (proto) {
        proto = proto[0];
        lowerProto = proto.toLowerCase();
        this.protocol = proto;
        rest = rest.substr(proto.length);
      }

      // figure out if it's got a host
      // user@server is *always* interpreted as a hostname, and url
      // resolution will treat //foo/bar as host=foo,path=bar because that's
      // how the browser resolves relative URLs.
      if (slashesDenoteHost || proto || rest.match(/^\/\/[^@\/]+@[^@\/]+/)) {
        slashes = rest.substr(0, 2) === '//';
        if (slashes && !(proto && hostlessProtocol[proto])) {
          rest = rest.substr(2);
          this.slashes = true;
        }
      }

      if (!hostlessProtocol[proto] &&
          (slashes || (proto && !slashedProtocol[proto]))) {

        // there's a hostname.
        // the first instance of /, ?, ;, or # ends the host.
        //
        // If there is an @ in the hostname, then non-host chars *are* allowed
        // to the left of the last @ sign, unless some host-ending character
        // comes *before* the @-sign.
        // URLs are obnoxious.
        //
        // ex:
        // http://a@b@c/ => user:a@b host:c
        // http://a@b?@c => user:a host:c path:/?@c

        // v0.12 TODO(isaacs): This is not quite how Chrome does things.
        // Review our test case against browsers more comprehensively.

        // find the first instance of any hostEndingChars
        var hostEnd = -1;
        for (i = 0; i < hostEndingChars.length; i++) {
          hec = rest.indexOf(hostEndingChars[i]);
          if (hec !== -1 && (hostEnd === -1 || hec < hostEnd)) {
            hostEnd = hec;
          }
        }

        // at this point, either we have an explicit point where the
        // auth portion cannot go past, or the last @ char is the decider.
        var auth, atSign;
        if (hostEnd === -1) {
          // atSign can be anywhere.
          atSign = rest.lastIndexOf('@');
        } else {
          // atSign must be in auth portion.
          // http://a@b/c@d => host:b auth:a path:/c@d
          atSign = rest.lastIndexOf('@', hostEnd);
        }

        // Now we have a portion which is definitely the auth.
        // Pull that off.
        if (atSign !== -1) {
          auth = rest.slice(0, atSign);
          rest = rest.slice(atSign + 1);
          this.auth = auth;
        }

        // the host is the remaining to the left of the first non-host char
        hostEnd = -1;
        for (i = 0; i < nonHostChars.length; i++) {
          hec = rest.indexOf(nonHostChars[i]);
          if (hec !== -1 && (hostEnd === -1 || hec < hostEnd)) {
            hostEnd = hec;
          }
        }
        // if we still have not hit it, then the entire thing is a host.
        if (hostEnd === -1) {
          hostEnd = rest.length;
        }

        if (rest[hostEnd - 1] === ':') { hostEnd--; }
        var host = rest.slice(0, hostEnd);
        rest = rest.slice(hostEnd);

        // pull out port.
        this.parseHost(host);

        // we've indicated that there is a hostname,
        // so even if it's empty, it has to be present.
        this.hostname = this.hostname || '';

        // if hostname begins with [ and ends with ]
        // assume that it's an IPv6 address.
        var ipv6Hostname = this.hostname[0] === '[' &&
            this.hostname[this.hostname.length - 1] === ']';

        // validate a little.
        if (!ipv6Hostname) {
          var hostparts = this.hostname.split(/\./);
          for (i = 0, l = hostparts.length; i < l; i++) {
            var part = hostparts[i];
            if (!part) { continue; }
            if (!part.match(hostnamePartPattern)) {
              var newpart = '';
              for (var j = 0, k = part.length; j < k; j++) {
                if (part.charCodeAt(j) > 127) {
                  // we replace non-ASCII char with a temporary placeholder
                  // we need this to make sure size of hostname is not
                  // broken by replacing non-ASCII by nothing
                  newpart += 'x';
                } else {
                  newpart += part[j];
                }
              }
              // we test again with ASCII char only
              if (!newpart.match(hostnamePartPattern)) {
                var validParts = hostparts.slice(0, i);
                var notHost = hostparts.slice(i + 1);
                var bit = part.match(hostnamePartStart);
                if (bit) {
                  validParts.push(bit[1]);
                  notHost.unshift(bit[2]);
                }
                if (notHost.length) {
                  rest = notHost.join('.') + rest;
                }
                this.hostname = validParts.join('.');
                break;
              }
            }
          }
        }

        if (this.hostname.length > hostnameMaxLen) {
          this.hostname = '';
        }

        // strip [ and ] from the hostname
        // the host field still retains them, though
        if (ipv6Hostname) {
          this.hostname = this.hostname.substr(1, this.hostname.length - 2);
        }
      }

      // chop off from the tail first.
      var hash = rest.indexOf('#');
      if (hash !== -1) {
        // got a fragment string.
        this.hash = rest.substr(hash);
        rest = rest.slice(0, hash);
      }
      var qm = rest.indexOf('?');
      if (qm !== -1) {
        this.search = rest.substr(qm);
        rest = rest.slice(0, qm);
      }
      if (rest) { this.pathname = rest; }
      if (slashedProtocol[lowerProto] &&
          this.hostname && !this.pathname) {
        this.pathname = '';
      }

      return this;
    };

    Url.prototype.parseHost = function(host) {
      var port = portPattern.exec(host);
      if (port) {
        port = port[0];
        if (port !== ':') {
          this.port = port.substr(1);
        }
        host = host.substr(0, host.length - port.length);
      }
      if (host) { this.hostname = host; }
    };

    var parse = urlParse;

    var encode$1 = encode_1;
    var decode$1 = decode_1;
    var format$1 = format;
    var parse$1  = parse;

    var mdurl = {
    	encode: encode$1,
    	decode: decode$1,
    	format: format$1,
    	parse: parse$1
    };

    var regex$1=/[\0-\uD7FF\uE000-\uFFFF]|[\uD800-\uDBFF][\uDC00-\uDFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF]/;

    var regex$2=/[\0-\x1F\x7F-\x9F]/;

    var regex$3=/[\xAD\u0600-\u0605\u061C\u06DD\u070F\u08E2\u180E\u200B-\u200F\u202A-\u202E\u2060-\u2064\u2066-\u206F\uFEFF\uFFF9-\uFFFB]|\uD804[\uDCBD\uDCCD]|\uD82F[\uDCA0-\uDCA3]|\uD834[\uDD73-\uDD7A]|\uDB40[\uDC01\uDC20-\uDC7F]/;

    var regex$4=/[ \xA0\u1680\u2000-\u200A\u2028\u2029\u202F\u205F\u3000]/;

    var Any = regex$1;
    var Cc  = regex$2;
    var Cf  = regex$3;
    var P   = regex;
    var Z   = regex$4;

    var uc_micro = {
    	Any: Any,
    	Cc: Cc,
    	Cf: Cf,
    	P: P,
    	Z: Z
    };

    var utils = createCommonjsModule(function (module, exports) {


    function _class(obj) { return Object.prototype.toString.call(obj); }

    function isString(obj) { return _class(obj) === '[object String]'; }

    var _hasOwnProperty = Object.prototype.hasOwnProperty;

    function has(object, key) {
      return _hasOwnProperty.call(object, key);
    }

    // Merge objects
    //
    function assign(obj /*from1, from2, from3, ...*/) {
      var sources = Array.prototype.slice.call(arguments, 1);

      sources.forEach(function (source) {
        if (!source) { return; }

        if (typeof source !== 'object') {
          throw new TypeError(source + 'must be object');
        }

        Object.keys(source).forEach(function (key) {
          obj[key] = source[key];
        });
      });

      return obj;
    }

    // Remove element from array and put another array at those position.
    // Useful for some operations with tokens
    function arrayReplaceAt(src, pos, newElements) {
      return [].concat(src.slice(0, pos), newElements, src.slice(pos + 1));
    }

    ////////////////////////////////////////////////////////////////////////////////

    function isValidEntityCode(c) {
      /*eslint no-bitwise:0*/
      // broken sequence
      if (c >= 0xD800 && c <= 0xDFFF) { return false; }
      // never used
      if (c >= 0xFDD0 && c <= 0xFDEF) { return false; }
      if ((c & 0xFFFF) === 0xFFFF || (c & 0xFFFF) === 0xFFFE) { return false; }
      // control codes
      if (c >= 0x00 && c <= 0x08) { return false; }
      if (c === 0x0B) { return false; }
      if (c >= 0x0E && c <= 0x1F) { return false; }
      if (c >= 0x7F && c <= 0x9F) { return false; }
      // out of range
      if (c > 0x10FFFF) { return false; }
      return true;
    }

    function fromCodePoint(c) {
      /*eslint no-bitwise:0*/
      if (c > 0xffff) {
        c -= 0x10000;
        var surrogate1 = 0xd800 + (c >> 10),
            surrogate2 = 0xdc00 + (c & 0x3ff);

        return String.fromCharCode(surrogate1, surrogate2);
      }
      return String.fromCharCode(c);
    }


    var UNESCAPE_MD_RE  = /\\([!"#$%&'()*+,\-.\/:;<=>?@[\\\]^_`{|}~])/g;
    var ENTITY_RE       = /&([a-z#][a-z0-9]{1,31});/gi;
    var UNESCAPE_ALL_RE = new RegExp(UNESCAPE_MD_RE.source + '|' + ENTITY_RE.source, 'gi');

    var DIGITAL_ENTITY_TEST_RE = /^#((?:x[a-f0-9]{1,8}|[0-9]{1,8}))/i;



    function replaceEntityPattern(match, name) {
      var code = 0;

      if (has(entities$2, name)) {
        return entities$2[name];
      }

      if (name.charCodeAt(0) === 0x23/* # */ && DIGITAL_ENTITY_TEST_RE.test(name)) {
        code = name[1].toLowerCase() === 'x' ?
          parseInt(name.slice(2), 16) : parseInt(name.slice(1), 10);

        if (isValidEntityCode(code)) {
          return fromCodePoint(code);
        }
      }

      return match;
    }

    /*function replaceEntities(str) {
      if (str.indexOf('&') < 0) { return str; }

      return str.replace(ENTITY_RE, replaceEntityPattern);
    }*/

    function unescapeMd(str) {
      if (str.indexOf('\\') < 0) { return str; }
      return str.replace(UNESCAPE_MD_RE, '$1');
    }

    function unescapeAll(str) {
      if (str.indexOf('\\') < 0 && str.indexOf('&') < 0) { return str; }

      return str.replace(UNESCAPE_ALL_RE, function (match, escaped, entity) {
        if (escaped) { return escaped; }
        return replaceEntityPattern(match, entity);
      });
    }

    ////////////////////////////////////////////////////////////////////////////////

    var HTML_ESCAPE_TEST_RE = /[&<>"]/;
    var HTML_ESCAPE_REPLACE_RE = /[&<>"]/g;
    var HTML_REPLACEMENTS = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;'
    };

    function replaceUnsafeChar(ch) {
      return HTML_REPLACEMENTS[ch];
    }

    function escapeHtml(str) {
      if (HTML_ESCAPE_TEST_RE.test(str)) {
        return str.replace(HTML_ESCAPE_REPLACE_RE, replaceUnsafeChar);
      }
      return str;
    }

    ////////////////////////////////////////////////////////////////////////////////

    var REGEXP_ESCAPE_RE = /[.?*+^$[\]\\(){}|-]/g;

    function escapeRE(str) {
      return str.replace(REGEXP_ESCAPE_RE, '\\$&');
    }

    ////////////////////////////////////////////////////////////////////////////////

    function isSpace(code) {
      switch (code) {
        case 0x09:
        case 0x20:
          return true;
      }
      return false;
    }

    // Zs (unicode class) || [\t\f\v\r\n]
    function isWhiteSpace(code) {
      if (code >= 0x2000 && code <= 0x200A) { return true; }
      switch (code) {
        case 0x09: // \t
        case 0x0A: // \n
        case 0x0B: // \v
        case 0x0C: // \f
        case 0x0D: // \r
        case 0x20:
        case 0xA0:
        case 0x1680:
        case 0x202F:
        case 0x205F:
        case 0x3000:
          return true;
      }
      return false;
    }

    ////////////////////////////////////////////////////////////////////////////////

    /*eslint-disable max-len*/


    // Currently without astral characters support.
    function isPunctChar(ch) {
      return regex.test(ch);
    }


    // Markdown ASCII punctuation characters.
    //
    // !, ", #, $, %, &, ', (, ), *, +, ,, -, ., /, :, ;, <, =, >, ?, @, [, \, ], ^, _, `, {, |, }, or ~
    // http://spec.commonmark.org/0.15/#ascii-punctuation-character
    //
    // Don't confuse with unicode punctuation !!! It lacks some chars in ascii range.
    //
    function isMdAsciiPunct(ch) {
      switch (ch) {
        case 0x21/* ! */:
        case 0x22/* " */:
        case 0x23/* # */:
        case 0x24/* $ */:
        case 0x25/* % */:
        case 0x26/* & */:
        case 0x27/* ' */:
        case 0x28/* ( */:
        case 0x29/* ) */:
        case 0x2A/* * */:
        case 0x2B/* + */:
        case 0x2C/* , */:
        case 0x2D/* - */:
        case 0x2E/* . */:
        case 0x2F/* / */:
        case 0x3A/* : */:
        case 0x3B/* ; */:
        case 0x3C/* < */:
        case 0x3D/* = */:
        case 0x3E/* > */:
        case 0x3F/* ? */:
        case 0x40/* @ */:
        case 0x5B/* [ */:
        case 0x5C/* \ */:
        case 0x5D/* ] */:
        case 0x5E/* ^ */:
        case 0x5F/* _ */:
        case 0x60/* ` */:
        case 0x7B/* { */:
        case 0x7C/* | */:
        case 0x7D/* } */:
        case 0x7E/* ~ */:
          return true;
        default:
          return false;
      }
    }

    // Hepler to unify [reference labels].
    //
    function normalizeReference(str) {
      // Trim and collapse whitespace
      //
      str = str.trim().replace(/\s+/g, ' ');

      // In node v10 'ẞ'.toLowerCase() === 'Ṿ', which is presumed to be a bug
      // fixed in v12 (couldn't find any details).
      //
      // So treat this one as a special case
      // (remove this when node v10 is no longer supported).
      //
      if ('ẞ'.toLowerCase() === 'Ṿ') {
        str = str.replace(/ẞ/g, 'ß');
      }

      // .toLowerCase().toUpperCase() should get rid of all differences
      // between letter variants.
      //
      // Simple .toLowerCase() doesn't normalize 125 code points correctly,
      // and .toUpperCase doesn't normalize 6 of them (list of exceptions:
      // İ, ϴ, ẞ, Ω, K, Å - those are already uppercased, but have differently
      // uppercased versions).
      //
      // Here's an example showing how it happens. Lets take greek letter omega:
      // uppercase U+0398 (Θ), U+03f4 (ϴ) and lowercase U+03b8 (θ), U+03d1 (ϑ)
      //
      // Unicode entries:
      // 0398;GREEK CAPITAL LETTER THETA;Lu;0;L;;;;;N;;;;03B8;
      // 03B8;GREEK SMALL LETTER THETA;Ll;0;L;;;;;N;;;0398;;0398
      // 03D1;GREEK THETA SYMBOL;Ll;0;L;<compat> 03B8;;;;N;GREEK SMALL LETTER SCRIPT THETA;;0398;;0398
      // 03F4;GREEK CAPITAL THETA SYMBOL;Lu;0;L;<compat> 0398;;;;N;;;;03B8;
      //
      // Case-insensitive comparison should treat all of them as equivalent.
      //
      // But .toLowerCase() doesn't change ϑ (it's already lowercase),
      // and .toUpperCase() doesn't change ϴ (already uppercase).
      //
      // Applying first lower then upper case normalizes any character:
      // '\u0398\u03f4\u03b8\u03d1'.toLowerCase().toUpperCase() === '\u0398\u0398\u0398\u0398'
      //
      // Note: this is equivalent to unicode case folding; unicode normalization
      // is a different step that is not required here.
      //
      // Final result should be uppercased, because it's later stored in an object
      // (this avoid a conflict with Object.prototype members,
      // most notably, `__proto__`)
      //
      return str.toLowerCase().toUpperCase();
    }

    ////////////////////////////////////////////////////////////////////////////////

    // Re-export libraries commonly used in both markdown-it and its plugins,
    // so plugins won't have to depend on them explicitly, which reduces their
    // bundled size (e.g. a browser build).
    //
    exports.lib                 = {};
    exports.lib.mdurl           = mdurl;
    exports.lib.ucmicro         = uc_micro;

    exports.assign              = assign;
    exports.isString            = isString;
    exports.has                 = has;
    exports.unescapeMd          = unescapeMd;
    exports.unescapeAll         = unescapeAll;
    exports.isValidEntityCode   = isValidEntityCode;
    exports.fromCodePoint       = fromCodePoint;
    // exports.replaceEntities     = replaceEntities;
    exports.escapeHtml          = escapeHtml;
    exports.arrayReplaceAt      = arrayReplaceAt;
    exports.isSpace             = isSpace;
    exports.isWhiteSpace        = isWhiteSpace;
    exports.isMdAsciiPunct      = isMdAsciiPunct;
    exports.isPunctChar         = isPunctChar;
    exports.escapeRE            = escapeRE;
    exports.normalizeReference  = normalizeReference;
    });
    var utils_1 = utils.lib;
    var utils_2 = utils.assign;
    var utils_3 = utils.isString;
    var utils_4 = utils.has;
    var utils_5 = utils.unescapeMd;
    var utils_6 = utils.unescapeAll;
    var utils_7 = utils.isValidEntityCode;
    var utils_8 = utils.fromCodePoint;
    var utils_9 = utils.escapeHtml;
    var utils_10 = utils.arrayReplaceAt;
    var utils_11 = utils.isSpace;
    var utils_12 = utils.isWhiteSpace;
    var utils_13 = utils.isMdAsciiPunct;
    var utils_14 = utils.isPunctChar;
    var utils_15 = utils.escapeRE;
    var utils_16 = utils.normalizeReference;

    // Parse link label

    var parse_link_label = function parseLinkLabel(state, start, disableNested) {
      var level, found, marker, prevPos,
          labelEnd = -1,
          max = state.posMax,
          oldPos = state.pos;

      state.pos = start + 1;
      level = 1;

      while (state.pos < max) {
        marker = state.src.charCodeAt(state.pos);
        if (marker === 0x5D /* ] */) {
          level--;
          if (level === 0) {
            found = true;
            break;
          }
        }

        prevPos = state.pos;
        state.md.inline.skipToken(state);
        if (marker === 0x5B /* [ */) {
          if (prevPos === state.pos - 1) {
            // increase level if we find text `[`, which is not a part of any token
            level++;
          } else if (disableNested) {
            state.pos = oldPos;
            return -1;
          }
        }
      }

      if (found) {
        labelEnd = state.pos;
      }

      // restore old state
      state.pos = oldPos;

      return labelEnd;
    };

    var unescapeAll = utils.unescapeAll;


    var parse_link_destination = function parseLinkDestination(str, pos, max) {
      var code, level,
          lines = 0,
          start = pos,
          result = {
            ok: false,
            pos: 0,
            lines: 0,
            str: ''
          };

      if (str.charCodeAt(pos) === 0x3C /* < */) {
        pos++;
        while (pos < max) {
          code = str.charCodeAt(pos);
          if (code === 0x0A /* \n */) { return result; }
          if (code === 0x3E /* > */) {
            result.pos = pos + 1;
            result.str = unescapeAll(str.slice(start + 1, pos));
            result.ok = true;
            return result;
          }
          if (code === 0x5C /* \ */ && pos + 1 < max) {
            pos += 2;
            continue;
          }

          pos++;
        }

        // no closing '>'
        return result;
      }

      // this should be ... } else { ... branch

      level = 0;
      while (pos < max) {
        code = str.charCodeAt(pos);

        if (code === 0x20) { break; }

        // ascii control characters
        if (code < 0x20 || code === 0x7F) { break; }

        if (code === 0x5C /* \ */ && pos + 1 < max) {
          pos += 2;
          continue;
        }

        if (code === 0x28 /* ( */) {
          level++;
        }

        if (code === 0x29 /* ) */) {
          if (level === 0) { break; }
          level--;
        }

        pos++;
      }

      if (start === pos) { return result; }
      if (level !== 0) { return result; }

      result.str = unescapeAll(str.slice(start, pos));
      result.lines = lines;
      result.pos = pos;
      result.ok = true;
      return result;
    };

    var unescapeAll$1 = utils.unescapeAll;


    var parse_link_title = function parseLinkTitle(str, pos, max) {
      var code,
          marker,
          lines = 0,
          start = pos,
          result = {
            ok: false,
            pos: 0,
            lines: 0,
            str: ''
          };

      if (pos >= max) { return result; }

      marker = str.charCodeAt(pos);

      if (marker !== 0x22 /* " */ && marker !== 0x27 /* ' */ && marker !== 0x28 /* ( */) { return result; }

      pos++;

      // if opening marker is "(", switch it to closing marker ")"
      if (marker === 0x28) { marker = 0x29; }

      while (pos < max) {
        code = str.charCodeAt(pos);
        if (code === marker) {
          result.pos = pos + 1;
          result.lines = lines;
          result.str = unescapeAll$1(str.slice(start + 1, pos));
          result.ok = true;
          return result;
        } else if (code === 0x0A) {
          lines++;
        } else if (code === 0x5C /* \ */ && pos + 1 < max) {
          pos++;
          if (str.charCodeAt(pos) === 0x0A) {
            lines++;
          }
        }

        pos++;
      }

      return result;
    };

    var parseLinkLabel       = parse_link_label;
    var parseLinkDestination = parse_link_destination;
    var parseLinkTitle       = parse_link_title;

    var helpers = {
    	parseLinkLabel: parseLinkLabel,
    	parseLinkDestination: parseLinkDestination,
    	parseLinkTitle: parseLinkTitle
    };

    var assign          = utils.assign;
    var unescapeAll$2     = utils.unescapeAll;
    var escapeHtml      = utils.escapeHtml;


    ////////////////////////////////////////////////////////////////////////////////

    var default_rules = {};


    default_rules.code_inline = function (tokens, idx, options, env, slf) {
      var token = tokens[idx];

      return  '<code' + slf.renderAttrs(token) + '>' +
              escapeHtml(tokens[idx].content) +
              '</code>';
    };


    default_rules.code_block = function (tokens, idx, options, env, slf) {
      var token = tokens[idx];

      return  '<pre' + slf.renderAttrs(token) + '><code>' +
              escapeHtml(tokens[idx].content) +
              '</code></pre>\n';
    };


    default_rules.fence = function (tokens, idx, options, env, slf) {
      var token = tokens[idx],
          info = token.info ? unescapeAll$2(token.info).trim() : '',
          langName = '',
          highlighted, i, tmpAttrs, tmpToken;

      if (info) {
        langName = info.split(/\s+/g)[0];
      }

      if (options.highlight) {
        highlighted = options.highlight(token.content, langName) || escapeHtml(token.content);
      } else {
        highlighted = escapeHtml(token.content);
      }

      if (highlighted.indexOf('<pre') === 0) {
        return highlighted + '\n';
      }

      // If language exists, inject class gently, without modifying original token.
      // May be, one day we will add .clone() for token and simplify this part, but
      // now we prefer to keep things local.
      if (info) {
        i        = token.attrIndex('class');
        tmpAttrs = token.attrs ? token.attrs.slice() : [];

        if (i < 0) {
          tmpAttrs.push([ 'class', options.langPrefix + langName ]);
        } else {
          tmpAttrs[i][1] += ' ' + options.langPrefix + langName;
        }

        // Fake token just to render attributes
        tmpToken = {
          attrs: tmpAttrs
        };

        return  '<pre><code' + slf.renderAttrs(tmpToken) + '>'
              + highlighted
              + '</code></pre>\n';
      }


      return  '<pre><code' + slf.renderAttrs(token) + '>'
            + highlighted
            + '</code></pre>\n';
    };


    default_rules.image = function (tokens, idx, options, env, slf) {
      var token = tokens[idx];

      // "alt" attr MUST be set, even if empty. Because it's mandatory and
      // should be placed on proper position for tests.
      //
      // Replace content with actual value

      token.attrs[token.attrIndex('alt')][1] =
        slf.renderInlineAsText(token.children, options, env);

      return slf.renderToken(tokens, idx, options);
    };


    default_rules.hardbreak = function (tokens, idx, options /*, env */) {
      return options.xhtmlOut ? '<br />\n' : '<br>\n';
    };
    default_rules.softbreak = function (tokens, idx, options /*, env */) {
      return options.breaks ? (options.xhtmlOut ? '<br />\n' : '<br>\n') : '\n';
    };


    default_rules.text = function (tokens, idx /*, options, env */) {
      return escapeHtml(tokens[idx].content);
    };


    default_rules.html_block = function (tokens, idx /*, options, env */) {
      return tokens[idx].content;
    };
    default_rules.html_inline = function (tokens, idx /*, options, env */) {
      return tokens[idx].content;
    };


    /**
     * new Renderer()
     *
     * Creates new [[Renderer]] instance and fill [[Renderer#rules]] with defaults.
     **/
    function Renderer() {

      /**
       * Renderer#rules -> Object
       *
       * Contains render rules for tokens. Can be updated and extended.
       *
       * ##### Example
       *
       * ```javascript
       * var md = require('markdown-it')();
       *
       * md.renderer.rules.strong_open  = function () { return '<b>'; };
       * md.renderer.rules.strong_close = function () { return '</b>'; };
       *
       * var result = md.renderInline(...);
       * ```
       *
       * Each rule is called as independent static function with fixed signature:
       *
       * ```javascript
       * function my_token_render(tokens, idx, options, env, renderer) {
       *   // ...
       *   return renderedHTML;
       * }
       * ```
       *
       * See [source code](https://github.com/markdown-it/markdown-it/blob/master/lib/renderer.js)
       * for more details and examples.
       **/
      this.rules = assign({}, default_rules);
    }


    /**
     * Renderer.renderAttrs(token) -> String
     *
     * Render token attributes to string.
     **/
    Renderer.prototype.renderAttrs = function renderAttrs(token) {
      var i, l, result;

      if (!token.attrs) { return ''; }

      result = '';

      for (i = 0, l = token.attrs.length; i < l; i++) {
        result += ' ' + escapeHtml(token.attrs[i][0]) + '="' + escapeHtml(token.attrs[i][1]) + '"';
      }

      return result;
    };


    /**
     * Renderer.renderToken(tokens, idx, options) -> String
     * - tokens (Array): list of tokens
     * - idx (Numbed): token index to render
     * - options (Object): params of parser instance
     *
     * Default token renderer. Can be overriden by custom function
     * in [[Renderer#rules]].
     **/
    Renderer.prototype.renderToken = function renderToken(tokens, idx, options) {
      var nextToken,
          result = '',
          needLf = false,
          token = tokens[idx];

      // Tight list paragraphs
      if (token.hidden) {
        return '';
      }

      // Insert a newline between hidden paragraph and subsequent opening
      // block-level tag.
      //
      // For example, here we should insert a newline before blockquote:
      //  - a
      //    >
      //
      if (token.block && token.nesting !== -1 && idx && tokens[idx - 1].hidden) {
        result += '\n';
      }

      // Add token name, e.g. `<img`
      result += (token.nesting === -1 ? '</' : '<') + token.tag;

      // Encode attributes, e.g. `<img src="foo"`
      result += this.renderAttrs(token);

      // Add a slash for self-closing tags, e.g. `<img src="foo" /`
      if (token.nesting === 0 && options.xhtmlOut) {
        result += ' /';
      }

      // Check if we need to add a newline after this tag
      if (token.block) {
        needLf = true;

        if (token.nesting === 1) {
          if (idx + 1 < tokens.length) {
            nextToken = tokens[idx + 1];

            if (nextToken.type === 'inline' || nextToken.hidden) {
              // Block-level tag containing an inline tag.
              //
              needLf = false;

            } else if (nextToken.nesting === -1 && nextToken.tag === token.tag) {
              // Opening tag + closing tag of the same type. E.g. `<li></li>`.
              //
              needLf = false;
            }
          }
        }
      }

      result += needLf ? '>\n' : '>';

      return result;
    };


    /**
     * Renderer.renderInline(tokens, options, env) -> String
     * - tokens (Array): list on block tokens to renter
     * - options (Object): params of parser instance
     * - env (Object): additional data from parsed input (references, for example)
     *
     * The same as [[Renderer.render]], but for single token of `inline` type.
     **/
    Renderer.prototype.renderInline = function (tokens, options, env) {
      var type,
          result = '',
          rules = this.rules;

      for (var i = 0, len = tokens.length; i < len; i++) {
        type = tokens[i].type;

        if (typeof rules[type] !== 'undefined') {
          result += rules[type](tokens, i, options, env, this);
        } else {
          result += this.renderToken(tokens, i, options);
        }
      }

      return result;
    };


    /** internal
     * Renderer.renderInlineAsText(tokens, options, env) -> String
     * - tokens (Array): list on block tokens to renter
     * - options (Object): params of parser instance
     * - env (Object): additional data from parsed input (references, for example)
     *
     * Special kludge for image `alt` attributes to conform CommonMark spec.
     * Don't try to use it! Spec requires to show `alt` content with stripped markup,
     * instead of simple escaping.
     **/
    Renderer.prototype.renderInlineAsText = function (tokens, options, env) {
      var result = '';

      for (var i = 0, len = tokens.length; i < len; i++) {
        if (tokens[i].type === 'text') {
          result += tokens[i].content;
        } else if (tokens[i].type === 'image') {
          result += this.renderInlineAsText(tokens[i].children, options, env);
        }
      }

      return result;
    };


    /**
     * Renderer.render(tokens, options, env) -> String
     * - tokens (Array): list on block tokens to renter
     * - options (Object): params of parser instance
     * - env (Object): additional data from parsed input (references, for example)
     *
     * Takes token stream and generates HTML. Probably, you will never need to call
     * this method directly.
     **/
    Renderer.prototype.render = function (tokens, options, env) {
      var i, len, type,
          result = '',
          rules = this.rules;

      for (i = 0, len = tokens.length; i < len; i++) {
        type = tokens[i].type;

        if (type === 'inline') {
          result += this.renderInline(tokens[i].children, options, env);
        } else if (typeof rules[type] !== 'undefined') {
          result += rules[tokens[i].type](tokens, i, options, env, this);
        } else {
          result += this.renderToken(tokens, i, options, env);
        }
      }

      return result;
    };

    var renderer = Renderer;

    /**
     * class Ruler
     *
     * Helper class, used by [[MarkdownIt#core]], [[MarkdownIt#block]] and
     * [[MarkdownIt#inline]] to manage sequences of functions (rules):
     *
     * - keep rules in defined order
     * - assign the name to each rule
     * - enable/disable rules
     * - add/replace rules
     * - allow assign rules to additional named chains (in the same)
     * - cacheing lists of active rules
     *
     * You will not need use this class directly until write plugins. For simple
     * rules control use [[MarkdownIt.disable]], [[MarkdownIt.enable]] and
     * [[MarkdownIt.use]].
     **/


    /**
     * new Ruler()
     **/
    function Ruler() {
      // List of added rules. Each element is:
      //
      // {
      //   name: XXX,
      //   enabled: Boolean,
      //   fn: Function(),
      //   alt: [ name2, name3 ]
      // }
      //
      this.__rules__ = [];

      // Cached rule chains.
      //
      // First level - chain name, '' for default.
      // Second level - diginal anchor for fast filtering by charcodes.
      //
      this.__cache__ = null;
    }

    ////////////////////////////////////////////////////////////////////////////////
    // Helper methods, should not be used directly


    // Find rule index by name
    //
    Ruler.prototype.__find__ = function (name) {
      for (var i = 0; i < this.__rules__.length; i++) {
        if (this.__rules__[i].name === name) {
          return i;
        }
      }
      return -1;
    };


    // Build rules lookup cache
    //
    Ruler.prototype.__compile__ = function () {
      var self = this;
      var chains = [ '' ];

      // collect unique names
      self.__rules__.forEach(function (rule) {
        if (!rule.enabled) { return; }

        rule.alt.forEach(function (altName) {
          if (chains.indexOf(altName) < 0) {
            chains.push(altName);
          }
        });
      });

      self.__cache__ = {};

      chains.forEach(function (chain) {
        self.__cache__[chain] = [];
        self.__rules__.forEach(function (rule) {
          if (!rule.enabled) { return; }

          if (chain && rule.alt.indexOf(chain) < 0) { return; }

          self.__cache__[chain].push(rule.fn);
        });
      });
    };


    /**
     * Ruler.at(name, fn [, options])
     * - name (String): rule name to replace.
     * - fn (Function): new rule function.
     * - options (Object): new rule options (not mandatory).
     *
     * Replace rule by name with new function & options. Throws error if name not
     * found.
     *
     * ##### Options:
     *
     * - __alt__ - array with names of "alternate" chains.
     *
     * ##### Example
     *
     * Replace existing typographer replacement rule with new one:
     *
     * ```javascript
     * var md = require('markdown-it')();
     *
     * md.core.ruler.at('replacements', function replace(state) {
     *   //...
     * });
     * ```
     **/
    Ruler.prototype.at = function (name, fn, options) {
      var index = this.__find__(name);
      var opt = options || {};

      if (index === -1) { throw new Error('Parser rule not found: ' + name); }

      this.__rules__[index].fn = fn;
      this.__rules__[index].alt = opt.alt || [];
      this.__cache__ = null;
    };


    /**
     * Ruler.before(beforeName, ruleName, fn [, options])
     * - beforeName (String): new rule will be added before this one.
     * - ruleName (String): name of added rule.
     * - fn (Function): rule function.
     * - options (Object): rule options (not mandatory).
     *
     * Add new rule to chain before one with given name. See also
     * [[Ruler.after]], [[Ruler.push]].
     *
     * ##### Options:
     *
     * - __alt__ - array with names of "alternate" chains.
     *
     * ##### Example
     *
     * ```javascript
     * var md = require('markdown-it')();
     *
     * md.block.ruler.before('paragraph', 'my_rule', function replace(state) {
     *   //...
     * });
     * ```
     **/
    Ruler.prototype.before = function (beforeName, ruleName, fn, options) {
      var index = this.__find__(beforeName);
      var opt = options || {};

      if (index === -1) { throw new Error('Parser rule not found: ' + beforeName); }

      this.__rules__.splice(index, 0, {
        name: ruleName,
        enabled: true,
        fn: fn,
        alt: opt.alt || []
      });

      this.__cache__ = null;
    };


    /**
     * Ruler.after(afterName, ruleName, fn [, options])
     * - afterName (String): new rule will be added after this one.
     * - ruleName (String): name of added rule.
     * - fn (Function): rule function.
     * - options (Object): rule options (not mandatory).
     *
     * Add new rule to chain after one with given name. See also
     * [[Ruler.before]], [[Ruler.push]].
     *
     * ##### Options:
     *
     * - __alt__ - array with names of "alternate" chains.
     *
     * ##### Example
     *
     * ```javascript
     * var md = require('markdown-it')();
     *
     * md.inline.ruler.after('text', 'my_rule', function replace(state) {
     *   //...
     * });
     * ```
     **/
    Ruler.prototype.after = function (afterName, ruleName, fn, options) {
      var index = this.__find__(afterName);
      var opt = options || {};

      if (index === -1) { throw new Error('Parser rule not found: ' + afterName); }

      this.__rules__.splice(index + 1, 0, {
        name: ruleName,
        enabled: true,
        fn: fn,
        alt: opt.alt || []
      });

      this.__cache__ = null;
    };

    /**
     * Ruler.push(ruleName, fn [, options])
     * - ruleName (String): name of added rule.
     * - fn (Function): rule function.
     * - options (Object): rule options (not mandatory).
     *
     * Push new rule to the end of chain. See also
     * [[Ruler.before]], [[Ruler.after]].
     *
     * ##### Options:
     *
     * - __alt__ - array with names of "alternate" chains.
     *
     * ##### Example
     *
     * ```javascript
     * var md = require('markdown-it')();
     *
     * md.core.ruler.push('my_rule', function replace(state) {
     *   //...
     * });
     * ```
     **/
    Ruler.prototype.push = function (ruleName, fn, options) {
      var opt = options || {};

      this.__rules__.push({
        name: ruleName,
        enabled: true,
        fn: fn,
        alt: opt.alt || []
      });

      this.__cache__ = null;
    };


    /**
     * Ruler.enable(list [, ignoreInvalid]) -> Array
     * - list (String|Array): list of rule names to enable.
     * - ignoreInvalid (Boolean): set `true` to ignore errors when rule not found.
     *
     * Enable rules with given names. If any rule name not found - throw Error.
     * Errors can be disabled by second param.
     *
     * Returns list of found rule names (if no exception happened).
     *
     * See also [[Ruler.disable]], [[Ruler.enableOnly]].
     **/
    Ruler.prototype.enable = function (list, ignoreInvalid) {
      if (!Array.isArray(list)) { list = [ list ]; }

      var result = [];

      // Search by name and enable
      list.forEach(function (name) {
        var idx = this.__find__(name);

        if (idx < 0) {
          if (ignoreInvalid) { return; }
          throw new Error('Rules manager: invalid rule name ' + name);
        }
        this.__rules__[idx].enabled = true;
        result.push(name);
      }, this);

      this.__cache__ = null;
      return result;
    };


    /**
     * Ruler.enableOnly(list [, ignoreInvalid])
     * - list (String|Array): list of rule names to enable (whitelist).
     * - ignoreInvalid (Boolean): set `true` to ignore errors when rule not found.
     *
     * Enable rules with given names, and disable everything else. If any rule name
     * not found - throw Error. Errors can be disabled by second param.
     *
     * See also [[Ruler.disable]], [[Ruler.enable]].
     **/
    Ruler.prototype.enableOnly = function (list, ignoreInvalid) {
      if (!Array.isArray(list)) { list = [ list ]; }

      this.__rules__.forEach(function (rule) { rule.enabled = false; });

      this.enable(list, ignoreInvalid);
    };


    /**
     * Ruler.disable(list [, ignoreInvalid]) -> Array
     * - list (String|Array): list of rule names to disable.
     * - ignoreInvalid (Boolean): set `true` to ignore errors when rule not found.
     *
     * Disable rules with given names. If any rule name not found - throw Error.
     * Errors can be disabled by second param.
     *
     * Returns list of found rule names (if no exception happened).
     *
     * See also [[Ruler.enable]], [[Ruler.enableOnly]].
     **/
    Ruler.prototype.disable = function (list, ignoreInvalid) {
      if (!Array.isArray(list)) { list = [ list ]; }

      var result = [];

      // Search by name and disable
      list.forEach(function (name) {
        var idx = this.__find__(name);

        if (idx < 0) {
          if (ignoreInvalid) { return; }
          throw new Error('Rules manager: invalid rule name ' + name);
        }
        this.__rules__[idx].enabled = false;
        result.push(name);
      }, this);

      this.__cache__ = null;
      return result;
    };


    /**
     * Ruler.getRules(chainName) -> Array
     *
     * Return array of active functions (rules) for given chain name. It analyzes
     * rules configuration, compiles caches if not exists and returns result.
     *
     * Default chain name is `''` (empty string). It can't be skipped. That's
     * done intentionally, to keep signature monomorphic for high speed.
     **/
    Ruler.prototype.getRules = function (chainName) {
      if (this.__cache__ === null) {
        this.__compile__();
      }

      // Chain can be empty, if rules disabled. But we still have to return Array.
      return this.__cache__[chainName] || [];
    };

    var ruler = Ruler;

    // Normalize input string


    // https://spec.commonmark.org/0.29/#line-ending
    var NEWLINES_RE  = /\r\n?|\n/g;
    var NULL_RE      = /\0/g;


    var normalize = function normalize(state) {
      var str;

      // Normalize newlines
      str = state.src.replace(NEWLINES_RE, '\n');

      // Replace NULL characters
      str = str.replace(NULL_RE, '\uFFFD');

      state.src = str;
    };

    var block$1 = function block(state) {
      var token;

      if (state.inlineMode) {
        token          = new state.Token('inline', '', 0);
        token.content  = state.src;
        token.map      = [ 0, 1 ];
        token.children = [];
        state.tokens.push(token);
      } else {
        state.md.block.parse(state.src, state.md, state.env, state.tokens);
      }
    };

    var inline = function inline(state) {
      var tokens = state.tokens, tok, i, l;

      // Parse inlines
      for (i = 0, l = tokens.length; i < l; i++) {
        tok = tokens[i];
        if (tok.type === 'inline') {
          state.md.inline.parse(tok.content, state.md, state.env, tok.children);
        }
      }
    };

    var arrayReplaceAt = utils.arrayReplaceAt;


    function isLinkOpen(str) {
      return /^<a[>\s]/i.test(str);
    }
    function isLinkClose(str) {
      return /^<\/a\s*>/i.test(str);
    }


    var linkify = function linkify(state) {
      var i, j, l, tokens, token, currentToken, nodes, ln, text, pos, lastPos,
          level, htmlLinkLevel, url, fullUrl, urlText,
          blockTokens = state.tokens,
          links;

      if (!state.md.options.linkify) { return; }

      for (j = 0, l = blockTokens.length; j < l; j++) {
        if (blockTokens[j].type !== 'inline' ||
            !state.md.linkify.pretest(blockTokens[j].content)) {
          continue;
        }

        tokens = blockTokens[j].children;

        htmlLinkLevel = 0;

        // We scan from the end, to keep position when new tags added.
        // Use reversed logic in links start/end match
        for (i = tokens.length - 1; i >= 0; i--) {
          currentToken = tokens[i];

          // Skip content of markdown links
          if (currentToken.type === 'link_close') {
            i--;
            while (tokens[i].level !== currentToken.level && tokens[i].type !== 'link_open') {
              i--;
            }
            continue;
          }

          // Skip content of html tag links
          if (currentToken.type === 'html_inline') {
            if (isLinkOpen(currentToken.content) && htmlLinkLevel > 0) {
              htmlLinkLevel--;
            }
            if (isLinkClose(currentToken.content)) {
              htmlLinkLevel++;
            }
          }
          if (htmlLinkLevel > 0) { continue; }

          if (currentToken.type === 'text' && state.md.linkify.test(currentToken.content)) {

            text = currentToken.content;
            links = state.md.linkify.match(text);

            // Now split string to nodes
            nodes = [];
            level = currentToken.level;
            lastPos = 0;

            for (ln = 0; ln < links.length; ln++) {

              url = links[ln].url;
              fullUrl = state.md.normalizeLink(url);
              if (!state.md.validateLink(fullUrl)) { continue; }

              urlText = links[ln].text;

              // Linkifier might send raw hostnames like "example.com", where url
              // starts with domain name. So we prepend http:// in those cases,
              // and remove it afterwards.
              //
              if (!links[ln].schema) {
                urlText = state.md.normalizeLinkText('http://' + urlText).replace(/^http:\/\//, '');
              } else if (links[ln].schema === 'mailto:' && !/^mailto:/i.test(urlText)) {
                urlText = state.md.normalizeLinkText('mailto:' + urlText).replace(/^mailto:/, '');
              } else {
                urlText = state.md.normalizeLinkText(urlText);
              }

              pos = links[ln].index;

              if (pos > lastPos) {
                token         = new state.Token('text', '', 0);
                token.content = text.slice(lastPos, pos);
                token.level   = level;
                nodes.push(token);
              }

              token         = new state.Token('link_open', 'a', 1);
              token.attrs   = [ [ 'href', fullUrl ] ];
              token.level   = level++;
              token.markup  = 'linkify';
              token.info    = 'auto';
              nodes.push(token);

              token         = new state.Token('text', '', 0);
              token.content = urlText;
              token.level   = level;
              nodes.push(token);

              token         = new state.Token('link_close', 'a', -1);
              token.level   = --level;
              token.markup  = 'linkify';
              token.info    = 'auto';
              nodes.push(token);

              lastPos = links[ln].lastIndex;
            }
            if (lastPos < text.length) {
              token         = new state.Token('text', '', 0);
              token.content = text.slice(lastPos);
              token.level   = level;
              nodes.push(token);
            }

            // replace current node
            blockTokens[j].children = tokens = arrayReplaceAt(tokens, i, nodes);
          }
        }
      }
    };

    // Simple typographic replacements

    // TODO:
    // - fractionals 1/2, 1/4, 3/4 -> ½, ¼, ¾
    // - miltiplication 2 x 4 -> 2 × 4

    var RARE_RE = /\+-|\.\.|\?\?\?\?|!!!!|,,|--/;

    // Workaround for phantomjs - need regex without /g flag,
    // or root check will fail every second time
    var SCOPED_ABBR_TEST_RE = /\((c|tm|r|p)\)/i;

    var SCOPED_ABBR_RE = /\((c|tm|r|p)\)/ig;
    var SCOPED_ABBR = {
      c: '©',
      r: '®',
      p: '§',
      tm: '™'
    };

    function replaceFn(match, name) {
      return SCOPED_ABBR[name.toLowerCase()];
    }

    function replace_scoped(inlineTokens) {
      var i, token, inside_autolink = 0;

      for (i = inlineTokens.length - 1; i >= 0; i--) {
        token = inlineTokens[i];

        if (token.type === 'text' && !inside_autolink) {
          token.content = token.content.replace(SCOPED_ABBR_RE, replaceFn);
        }

        if (token.type === 'link_open' && token.info === 'auto') {
          inside_autolink--;
        }

        if (token.type === 'link_close' && token.info === 'auto') {
          inside_autolink++;
        }
      }
    }

    function replace_rare(inlineTokens) {
      var i, token, inside_autolink = 0;

      for (i = inlineTokens.length - 1; i >= 0; i--) {
        token = inlineTokens[i];

        if (token.type === 'text' && !inside_autolink) {
          if (RARE_RE.test(token.content)) {
            token.content = token.content
              .replace(/\+-/g, '±')
              // .., ..., ....... -> …
              // but ?..... & !..... -> ?.. & !..
              .replace(/\.{2,}/g, '…').replace(/([?!])…/g, '$1..')
              .replace(/([?!]){4,}/g, '$1$1$1').replace(/,{2,}/g, ',')
              // em-dash
              .replace(/(^|[^-])---([^-]|$)/mg, '$1\u2014$2')
              // en-dash
              .replace(/(^|\s)--(\s|$)/mg, '$1\u2013$2')
              .replace(/(^|[^-\s])--([^-\s]|$)/mg, '$1\u2013$2');
          }
        }

        if (token.type === 'link_open' && token.info === 'auto') {
          inside_autolink--;
        }

        if (token.type === 'link_close' && token.info === 'auto') {
          inside_autolink++;
        }
      }
    }


    var replacements = function replace(state) {
      var blkIdx;

      if (!state.md.options.typographer) { return; }

      for (blkIdx = state.tokens.length - 1; blkIdx >= 0; blkIdx--) {

        if (state.tokens[blkIdx].type !== 'inline') { continue; }

        if (SCOPED_ABBR_TEST_RE.test(state.tokens[blkIdx].content)) {
          replace_scoped(state.tokens[blkIdx].children);
        }

        if (RARE_RE.test(state.tokens[blkIdx].content)) {
          replace_rare(state.tokens[blkIdx].children);
        }

      }
    };

    var isWhiteSpace   = utils.isWhiteSpace;
    var isPunctChar    = utils.isPunctChar;
    var isMdAsciiPunct = utils.isMdAsciiPunct;

    var QUOTE_TEST_RE = /['"]/;
    var QUOTE_RE = /['"]/g;
    var APOSTROPHE = '\u2019'; /* ’ */


    function replaceAt(str, index, ch) {
      return str.substr(0, index) + ch + str.substr(index + 1);
    }

    function process_inlines(tokens, state) {
      var i, token, text, t, pos, max, thisLevel, item, lastChar, nextChar,
          isLastPunctChar, isNextPunctChar, isLastWhiteSpace, isNextWhiteSpace,
          canOpen, canClose, j, isSingle, stack, openQuote, closeQuote;

      stack = [];

      for (i = 0; i < tokens.length; i++) {
        token = tokens[i];

        thisLevel = tokens[i].level;

        for (j = stack.length - 1; j >= 0; j--) {
          if (stack[j].level <= thisLevel) { break; }
        }
        stack.length = j + 1;

        if (token.type !== 'text') { continue; }

        text = token.content;
        pos = 0;
        max = text.length;

        /*eslint no-labels:0,block-scoped-var:0*/
        OUTER:
        while (pos < max) {
          QUOTE_RE.lastIndex = pos;
          t = QUOTE_RE.exec(text);
          if (!t) { break; }

          canOpen = canClose = true;
          pos = t.index + 1;
          isSingle = (t[0] === "'");

          // Find previous character,
          // default to space if it's the beginning of the line
          //
          lastChar = 0x20;

          if (t.index - 1 >= 0) {
            lastChar = text.charCodeAt(t.index - 1);
          } else {
            for (j = i - 1; j >= 0; j--) {
              if (tokens[j].type === 'softbreak' || tokens[j].type === 'hardbreak') break; // lastChar defaults to 0x20
              if (tokens[j].type !== 'text') continue;

              lastChar = tokens[j].content.charCodeAt(tokens[j].content.length - 1);
              break;
            }
          }

          // Find next character,
          // default to space if it's the end of the line
          //
          nextChar = 0x20;

          if (pos < max) {
            nextChar = text.charCodeAt(pos);
          } else {
            for (j = i + 1; j < tokens.length; j++) {
              if (tokens[j].type === 'softbreak' || tokens[j].type === 'hardbreak') break; // nextChar defaults to 0x20
              if (tokens[j].type !== 'text') continue;

              nextChar = tokens[j].content.charCodeAt(0);
              break;
            }
          }

          isLastPunctChar = isMdAsciiPunct(lastChar) || isPunctChar(String.fromCharCode(lastChar));
          isNextPunctChar = isMdAsciiPunct(nextChar) || isPunctChar(String.fromCharCode(nextChar));

          isLastWhiteSpace = isWhiteSpace(lastChar);
          isNextWhiteSpace = isWhiteSpace(nextChar);

          if (isNextWhiteSpace) {
            canOpen = false;
          } else if (isNextPunctChar) {
            if (!(isLastWhiteSpace || isLastPunctChar)) {
              canOpen = false;
            }
          }

          if (isLastWhiteSpace) {
            canClose = false;
          } else if (isLastPunctChar) {
            if (!(isNextWhiteSpace || isNextPunctChar)) {
              canClose = false;
            }
          }

          if (nextChar === 0x22 /* " */ && t[0] === '"') {
            if (lastChar >= 0x30 /* 0 */ && lastChar <= 0x39 /* 9 */) {
              // special case: 1"" - count first quote as an inch
              canClose = canOpen = false;
            }
          }

          if (canOpen && canClose) {
            // treat this as the middle of the word
            canOpen = false;
            canClose = isNextPunctChar;
          }

          if (!canOpen && !canClose) {
            // middle of word
            if (isSingle) {
              token.content = replaceAt(token.content, t.index, APOSTROPHE);
            }
            continue;
          }

          if (canClose) {
            // this could be a closing quote, rewind the stack to get a match
            for (j = stack.length - 1; j >= 0; j--) {
              item = stack[j];
              if (stack[j].level < thisLevel) { break; }
              if (item.single === isSingle && stack[j].level === thisLevel) {
                item = stack[j];

                if (isSingle) {
                  openQuote = state.md.options.quotes[2];
                  closeQuote = state.md.options.quotes[3];
                } else {
                  openQuote = state.md.options.quotes[0];
                  closeQuote = state.md.options.quotes[1];
                }

                // replace token.content *before* tokens[item.token].content,
                // because, if they are pointing at the same token, replaceAt
                // could mess up indices when quote length != 1
                token.content = replaceAt(token.content, t.index, closeQuote);
                tokens[item.token].content = replaceAt(
                  tokens[item.token].content, item.pos, openQuote);

                pos += closeQuote.length - 1;
                if (item.token === i) { pos += openQuote.length - 1; }

                text = token.content;
                max = text.length;

                stack.length = j;
                continue OUTER;
              }
            }
          }

          if (canOpen) {
            stack.push({
              token: i,
              pos: t.index,
              single: isSingle,
              level: thisLevel
            });
          } else if (canClose && isSingle) {
            token.content = replaceAt(token.content, t.index, APOSTROPHE);
          }
        }
      }
    }


    var smartquotes = function smartquotes(state) {
      /*eslint max-depth:0*/
      var blkIdx;

      if (!state.md.options.typographer) { return; }

      for (blkIdx = state.tokens.length - 1; blkIdx >= 0; blkIdx--) {

        if (state.tokens[blkIdx].type !== 'inline' ||
            !QUOTE_TEST_RE.test(state.tokens[blkIdx].content)) {
          continue;
        }

        process_inlines(state.tokens[blkIdx].children, state);
      }
    };

    // Token class


    /**
     * class Token
     **/

    /**
     * new Token(type, tag, nesting)
     *
     * Create new token and fill passed properties.
     **/
    function Token(type, tag, nesting) {
      /**
       * Token#type -> String
       *
       * Type of the token (string, e.g. "paragraph_open")
       **/
      this.type     = type;

      /**
       * Token#tag -> String
       *
       * html tag name, e.g. "p"
       **/
      this.tag      = tag;

      /**
       * Token#attrs -> Array
       *
       * Html attributes. Format: `[ [ name1, value1 ], [ name2, value2 ] ]`
       **/
      this.attrs    = null;

      /**
       * Token#map -> Array
       *
       * Source map info. Format: `[ line_begin, line_end ]`
       **/
      this.map      = null;

      /**
       * Token#nesting -> Number
       *
       * Level change (number in {-1, 0, 1} set), where:
       *
       * -  `1` means the tag is opening
       * -  `0` means the tag is self-closing
       * - `-1` means the tag is closing
       **/
      this.nesting  = nesting;

      /**
       * Token#level -> Number
       *
       * nesting level, the same as `state.level`
       **/
      this.level    = 0;

      /**
       * Token#children -> Array
       *
       * An array of child nodes (inline and img tokens)
       **/
      this.children = null;

      /**
       * Token#content -> String
       *
       * In a case of self-closing tag (code, html, fence, etc.),
       * it has contents of this tag.
       **/
      this.content  = '';

      /**
       * Token#markup -> String
       *
       * '*' or '_' for emphasis, fence string for fence, etc.
       **/
      this.markup   = '';

      /**
       * Token#info -> String
       *
       * fence infostring
       **/
      this.info     = '';

      /**
       * Token#meta -> Object
       *
       * A place for plugins to store an arbitrary data
       **/
      this.meta     = null;

      /**
       * Token#block -> Boolean
       *
       * True for block-level tokens, false for inline tokens.
       * Used in renderer to calculate line breaks
       **/
      this.block    = false;

      /**
       * Token#hidden -> Boolean
       *
       * If it's true, ignore this element when rendering. Used for tight lists
       * to hide paragraphs.
       **/
      this.hidden   = false;
    }


    /**
     * Token.attrIndex(name) -> Number
     *
     * Search attribute index by name.
     **/
    Token.prototype.attrIndex = function attrIndex(name) {
      var attrs, i, len;

      if (!this.attrs) { return -1; }

      attrs = this.attrs;

      for (i = 0, len = attrs.length; i < len; i++) {
        if (attrs[i][0] === name) { return i; }
      }
      return -1;
    };


    /**
     * Token.attrPush(attrData)
     *
     * Add `[ name, value ]` attribute to list. Init attrs if necessary
     **/
    Token.prototype.attrPush = function attrPush(attrData) {
      if (this.attrs) {
        this.attrs.push(attrData);
      } else {
        this.attrs = [ attrData ];
      }
    };


    /**
     * Token.attrSet(name, value)
     *
     * Set `name` attribute to `value`. Override old value if exists.
     **/
    Token.prototype.attrSet = function attrSet(name, value) {
      var idx = this.attrIndex(name),
          attrData = [ name, value ];

      if (idx < 0) {
        this.attrPush(attrData);
      } else {
        this.attrs[idx] = attrData;
      }
    };


    /**
     * Token.attrGet(name)
     *
     * Get the value of attribute `name`, or null if it does not exist.
     **/
    Token.prototype.attrGet = function attrGet(name) {
      var idx = this.attrIndex(name), value = null;
      if (idx >= 0) {
        value = this.attrs[idx][1];
      }
      return value;
    };


    /**
     * Token.attrJoin(name, value)
     *
     * Join value to existing attribute via space. Or create new attribute if not
     * exists. Useful to operate with token classes.
     **/
    Token.prototype.attrJoin = function attrJoin(name, value) {
      var idx = this.attrIndex(name);

      if (idx < 0) {
        this.attrPush([ name, value ]);
      } else {
        this.attrs[idx][1] = this.attrs[idx][1] + ' ' + value;
      }
    };


    var token = Token;

    function StateCore(src, md, env) {
      this.src = src;
      this.env = env;
      this.tokens = [];
      this.inlineMode = false;
      this.md = md; // link to parser instance
    }

    // re-export Token class to use in core rules
    StateCore.prototype.Token = token;


    var state_core = StateCore;

    var _rules = [
      [ 'normalize',      normalize      ],
      [ 'block',          block$1          ],
      [ 'inline',         inline         ],
      [ 'linkify',        linkify        ],
      [ 'replacements',   replacements   ],
      [ 'smartquotes',    smartquotes    ]
    ];


    /**
     * new Core()
     **/
    function Core() {
      /**
       * Core#ruler -> Ruler
       *
       * [[Ruler]] instance. Keep configuration of core rules.
       **/
      this.ruler = new ruler();

      for (var i = 0; i < _rules.length; i++) {
        this.ruler.push(_rules[i][0], _rules[i][1]);
      }
    }


    /**
     * Core.process(state)
     *
     * Executes core chain rules.
     **/
    Core.prototype.process = function (state) {
      var i, l, rules;

      rules = this.ruler.getRules('');

      for (i = 0, l = rules.length; i < l; i++) {
        rules[i](state);
      }
    };

    Core.prototype.State = state_core;


    var parser_core = Core;

    var isSpace = utils.isSpace;


    function getLine(state, line) {
      var pos = state.bMarks[line] + state.blkIndent,
          max = state.eMarks[line];

      return state.src.substr(pos, max - pos);
    }

    function escapedSplit(str) {
      var result = [],
          pos = 0,
          max = str.length,
          ch,
          escapes = 0,
          lastPos = 0,
          backTicked = false,
          lastBackTick = 0;

      ch  = str.charCodeAt(pos);

      while (pos < max) {
        if (ch === 0x60/* ` */) {
          if (backTicked) {
            // make \` close code sequence, but not open it;
            // the reason is: `\` is correct code block
            backTicked = false;
            lastBackTick = pos;
          } else if (escapes % 2 === 0) {
            backTicked = true;
            lastBackTick = pos;
          }
        } else if (ch === 0x7c/* | */ && (escapes % 2 === 0) && !backTicked) {
          result.push(str.substring(lastPos, pos));
          lastPos = pos + 1;
        }

        if (ch === 0x5c/* \ */) {
          escapes++;
        } else {
          escapes = 0;
        }

        pos++;

        // If there was an un-closed backtick, go back to just after
        // the last backtick, but as if it was a normal character
        if (pos === max && backTicked) {
          backTicked = false;
          pos = lastBackTick + 1;
        }

        ch = str.charCodeAt(pos);
      }

      result.push(str.substring(lastPos));

      return result;
    }


    var table = function table(state, startLine, endLine, silent) {
      var ch, lineText, pos, i, nextLine, columns, columnCount, token,
          aligns, t, tableLines, tbodyLines;

      // should have at least two lines
      if (startLine + 2 > endLine) { return false; }

      nextLine = startLine + 1;

      if (state.sCount[nextLine] < state.blkIndent) { return false; }

      // if it's indented more than 3 spaces, it should be a code block
      if (state.sCount[nextLine] - state.blkIndent >= 4) { return false; }

      // first character of the second line should be '|', '-', ':',
      // and no other characters are allowed but spaces;
      // basically, this is the equivalent of /^[-:|][-:|\s]*$/ regexp

      pos = state.bMarks[nextLine] + state.tShift[nextLine];
      if (pos >= state.eMarks[nextLine]) { return false; }

      ch = state.src.charCodeAt(pos++);
      if (ch !== 0x7C/* | */ && ch !== 0x2D/* - */ && ch !== 0x3A/* : */) { return false; }

      while (pos < state.eMarks[nextLine]) {
        ch = state.src.charCodeAt(pos);

        if (ch !== 0x7C/* | */ && ch !== 0x2D/* - */ && ch !== 0x3A/* : */ && !isSpace(ch)) { return false; }

        pos++;
      }

      lineText = getLine(state, startLine + 1);

      columns = lineText.split('|');
      aligns = [];
      for (i = 0; i < columns.length; i++) {
        t = columns[i].trim();
        if (!t) {
          // allow empty columns before and after table, but not in between columns;
          // e.g. allow ` |---| `, disallow ` ---||--- `
          if (i === 0 || i === columns.length - 1) {
            continue;
          } else {
            return false;
          }
        }

        if (!/^:?-+:?$/.test(t)) { return false; }
        if (t.charCodeAt(t.length - 1) === 0x3A/* : */) {
          aligns.push(t.charCodeAt(0) === 0x3A/* : */ ? 'center' : 'right');
        } else if (t.charCodeAt(0) === 0x3A/* : */) {
          aligns.push('left');
        } else {
          aligns.push('');
        }
      }

      lineText = getLine(state, startLine).trim();
      if (lineText.indexOf('|') === -1) { return false; }
      if (state.sCount[startLine] - state.blkIndent >= 4) { return false; }
      columns = escapedSplit(lineText.replace(/^\||\|$/g, ''));

      // header row will define an amount of columns in the entire table,
      // and align row shouldn't be smaller than that (the rest of the rows can)
      columnCount = columns.length;
      if (columnCount > aligns.length) { return false; }

      if (silent) { return true; }

      token     = state.push('table_open', 'table', 1);
      token.map = tableLines = [ startLine, 0 ];

      token     = state.push('thead_open', 'thead', 1);
      token.map = [ startLine, startLine + 1 ];

      token     = state.push('tr_open', 'tr', 1);
      token.map = [ startLine, startLine + 1 ];

      for (i = 0; i < columns.length; i++) {
        token          = state.push('th_open', 'th', 1);
        token.map      = [ startLine, startLine + 1 ];
        if (aligns[i]) {
          token.attrs  = [ [ 'style', 'text-align:' + aligns[i] ] ];
        }

        token          = state.push('inline', '', 0);
        token.content  = columns[i].trim();
        token.map      = [ startLine, startLine + 1 ];
        token.children = [];

        token          = state.push('th_close', 'th', -1);
      }

      token     = state.push('tr_close', 'tr', -1);
      token     = state.push('thead_close', 'thead', -1);

      token     = state.push('tbody_open', 'tbody', 1);
      token.map = tbodyLines = [ startLine + 2, 0 ];

      for (nextLine = startLine + 2; nextLine < endLine; nextLine++) {
        if (state.sCount[nextLine] < state.blkIndent) { break; }

        lineText = getLine(state, nextLine).trim();
        if (lineText.indexOf('|') === -1) { break; }
        if (state.sCount[nextLine] - state.blkIndent >= 4) { break; }
        columns = escapedSplit(lineText.replace(/^\||\|$/g, ''));

        token = state.push('tr_open', 'tr', 1);
        for (i = 0; i < columnCount; i++) {
          token          = state.push('td_open', 'td', 1);
          if (aligns[i]) {
            token.attrs  = [ [ 'style', 'text-align:' + aligns[i] ] ];
          }

          token          = state.push('inline', '', 0);
          token.content  = columns[i] ? columns[i].trim() : '';
          token.children = [];

          token          = state.push('td_close', 'td', -1);
        }
        token = state.push('tr_close', 'tr', -1);
      }
      token = state.push('tbody_close', 'tbody', -1);
      token = state.push('table_close', 'table', -1);

      tableLines[1] = tbodyLines[1] = nextLine;
      state.line = nextLine;
      return true;
    };

    // Code block (4 spaces padded)


    var code = function code(state, startLine, endLine/*, silent*/) {
      var nextLine, last, token;

      if (state.sCount[startLine] - state.blkIndent < 4) { return false; }

      last = nextLine = startLine + 1;

      while (nextLine < endLine) {
        if (state.isEmpty(nextLine)) {
          nextLine++;
          continue;
        }

        if (state.sCount[nextLine] - state.blkIndent >= 4) {
          nextLine++;
          last = nextLine;
          continue;
        }
        break;
      }

      state.line = last;

      token         = state.push('code_block', 'code', 0);
      token.content = state.getLines(startLine, last, 4 + state.blkIndent, true);
      token.map     = [ startLine, state.line ];

      return true;
    };

    // fences (``` lang, ~~~ lang)


    var fence = function fence(state, startLine, endLine, silent) {
      var marker, len, params, nextLine, mem, token, markup,
          haveEndMarker = false,
          pos = state.bMarks[startLine] + state.tShift[startLine],
          max = state.eMarks[startLine];

      // if it's indented more than 3 spaces, it should be a code block
      if (state.sCount[startLine] - state.blkIndent >= 4) { return false; }

      if (pos + 3 > max) { return false; }

      marker = state.src.charCodeAt(pos);

      if (marker !== 0x7E/* ~ */ && marker !== 0x60 /* ` */) {
        return false;
      }

      // scan marker length
      mem = pos;
      pos = state.skipChars(pos, marker);

      len = pos - mem;

      if (len < 3) { return false; }

      markup = state.src.slice(mem, pos);
      params = state.src.slice(pos, max);

      if (marker === 0x60 /* ` */) {
        if (params.indexOf(String.fromCharCode(marker)) >= 0) {
          return false;
        }
      }

      // Since start is found, we can report success here in validation mode
      if (silent) { return true; }

      // search end of block
      nextLine = startLine;

      for (;;) {
        nextLine++;
        if (nextLine >= endLine) {
          // unclosed block should be autoclosed by end of document.
          // also block seems to be autoclosed by end of parent
          break;
        }

        pos = mem = state.bMarks[nextLine] + state.tShift[nextLine];
        max = state.eMarks[nextLine];

        if (pos < max && state.sCount[nextLine] < state.blkIndent) {
          // non-empty line with negative indent should stop the list:
          // - ```
          //  test
          break;
        }

        if (state.src.charCodeAt(pos) !== marker) { continue; }

        if (state.sCount[nextLine] - state.blkIndent >= 4) {
          // closing fence should be indented less than 4 spaces
          continue;
        }

        pos = state.skipChars(pos, marker);

        // closing code fence must be at least as long as the opening one
        if (pos - mem < len) { continue; }

        // make sure tail has spaces only
        pos = state.skipSpaces(pos);

        if (pos < max) { continue; }

        haveEndMarker = true;
        // found!
        break;
      }

      // If a fence has heading spaces, they should be removed from its inner block
      len = state.sCount[startLine];

      state.line = nextLine + (haveEndMarker ? 1 : 0);

      token         = state.push('fence', 'code', 0);
      token.info    = params;
      token.content = state.getLines(startLine + 1, nextLine, len, true);
      token.markup  = markup;
      token.map     = [ startLine, state.line ];

      return true;
    };

    var isSpace$1 = utils.isSpace;


    var blockquote = function blockquote(state, startLine, endLine, silent) {
      var adjustTab,
          ch,
          i,
          initial,
          l,
          lastLineEmpty,
          lines,
          nextLine,
          offset,
          oldBMarks,
          oldBSCount,
          oldIndent,
          oldParentType,
          oldSCount,
          oldTShift,
          spaceAfterMarker,
          terminate,
          terminatorRules,
          token,
          wasOutdented,
          oldLineMax = state.lineMax,
          pos = state.bMarks[startLine] + state.tShift[startLine],
          max = state.eMarks[startLine];

      // if it's indented more than 3 spaces, it should be a code block
      if (state.sCount[startLine] - state.blkIndent >= 4) { return false; }

      // check the block quote marker
      if (state.src.charCodeAt(pos++) !== 0x3E/* > */) { return false; }

      // we know that it's going to be a valid blockquote,
      // so no point trying to find the end of it in silent mode
      if (silent) { return true; }

      // skip spaces after ">" and re-calculate offset
      initial = offset = state.sCount[startLine] + pos - (state.bMarks[startLine] + state.tShift[startLine]);

      // skip one optional space after '>'
      if (state.src.charCodeAt(pos) === 0x20 /* space */) {
        // ' >   test '
        //     ^ -- position start of line here:
        pos++;
        initial++;
        offset++;
        adjustTab = false;
        spaceAfterMarker = true;
      } else if (state.src.charCodeAt(pos) === 0x09 /* tab */) {
        spaceAfterMarker = true;

        if ((state.bsCount[startLine] + offset) % 4 === 3) {
          // '  >\t  test '
          //       ^ -- position start of line here (tab has width===1)
          pos++;
          initial++;
          offset++;
          adjustTab = false;
        } else {
          // ' >\t  test '
          //    ^ -- position start of line here + shift bsCount slightly
          //         to make extra space appear
          adjustTab = true;
        }
      } else {
        spaceAfterMarker = false;
      }

      oldBMarks = [ state.bMarks[startLine] ];
      state.bMarks[startLine] = pos;

      while (pos < max) {
        ch = state.src.charCodeAt(pos);

        if (isSpace$1(ch)) {
          if (ch === 0x09) {
            offset += 4 - (offset + state.bsCount[startLine] + (adjustTab ? 1 : 0)) % 4;
          } else {
            offset++;
          }
        } else {
          break;
        }

        pos++;
      }

      oldBSCount = [ state.bsCount[startLine] ];
      state.bsCount[startLine] = state.sCount[startLine] + 1 + (spaceAfterMarker ? 1 : 0);

      lastLineEmpty = pos >= max;

      oldSCount = [ state.sCount[startLine] ];
      state.sCount[startLine] = offset - initial;

      oldTShift = [ state.tShift[startLine] ];
      state.tShift[startLine] = pos - state.bMarks[startLine];

      terminatorRules = state.md.block.ruler.getRules('blockquote');

      oldParentType = state.parentType;
      state.parentType = 'blockquote';
      wasOutdented = false;

      // Search the end of the block
      //
      // Block ends with either:
      //  1. an empty line outside:
      //     ```
      //     > test
      //
      //     ```
      //  2. an empty line inside:
      //     ```
      //     >
      //     test
      //     ```
      //  3. another tag:
      //     ```
      //     > test
      //      - - -
      //     ```
      for (nextLine = startLine + 1; nextLine < endLine; nextLine++) {
        // check if it's outdented, i.e. it's inside list item and indented
        // less than said list item:
        //
        // ```
        // 1. anything
        //    > current blockquote
        // 2. checking this line
        // ```
        if (state.sCount[nextLine] < state.blkIndent) wasOutdented = true;

        pos = state.bMarks[nextLine] + state.tShift[nextLine];
        max = state.eMarks[nextLine];

        if (pos >= max) {
          // Case 1: line is not inside the blockquote, and this line is empty.
          break;
        }

        if (state.src.charCodeAt(pos++) === 0x3E/* > */ && !wasOutdented) {
          // This line is inside the blockquote.

          // skip spaces after ">" and re-calculate offset
          initial = offset = state.sCount[nextLine] + pos - (state.bMarks[nextLine] + state.tShift[nextLine]);

          // skip one optional space after '>'
          if (state.src.charCodeAt(pos) === 0x20 /* space */) {
            // ' >   test '
            //     ^ -- position start of line here:
            pos++;
            initial++;
            offset++;
            adjustTab = false;
            spaceAfterMarker = true;
          } else if (state.src.charCodeAt(pos) === 0x09 /* tab */) {
            spaceAfterMarker = true;

            if ((state.bsCount[nextLine] + offset) % 4 === 3) {
              // '  >\t  test '
              //       ^ -- position start of line here (tab has width===1)
              pos++;
              initial++;
              offset++;
              adjustTab = false;
            } else {
              // ' >\t  test '
              //    ^ -- position start of line here + shift bsCount slightly
              //         to make extra space appear
              adjustTab = true;
            }
          } else {
            spaceAfterMarker = false;
          }

          oldBMarks.push(state.bMarks[nextLine]);
          state.bMarks[nextLine] = pos;

          while (pos < max) {
            ch = state.src.charCodeAt(pos);

            if (isSpace$1(ch)) {
              if (ch === 0x09) {
                offset += 4 - (offset + state.bsCount[nextLine] + (adjustTab ? 1 : 0)) % 4;
              } else {
                offset++;
              }
            } else {
              break;
            }

            pos++;
          }

          lastLineEmpty = pos >= max;

          oldBSCount.push(state.bsCount[nextLine]);
          state.bsCount[nextLine] = state.sCount[nextLine] + 1 + (spaceAfterMarker ? 1 : 0);

          oldSCount.push(state.sCount[nextLine]);
          state.sCount[nextLine] = offset - initial;

          oldTShift.push(state.tShift[nextLine]);
          state.tShift[nextLine] = pos - state.bMarks[nextLine];
          continue;
        }

        // Case 2: line is not inside the blockquote, and the last line was empty.
        if (lastLineEmpty) { break; }

        // Case 3: another tag found.
        terminate = false;
        for (i = 0, l = terminatorRules.length; i < l; i++) {
          if (terminatorRules[i](state, nextLine, endLine, true)) {
            terminate = true;
            break;
          }
        }

        if (terminate) {
          // Quirk to enforce "hard termination mode" for paragraphs;
          // normally if you call `tokenize(state, startLine, nextLine)`,
          // paragraphs will look below nextLine for paragraph continuation,
          // but if blockquote is terminated by another tag, they shouldn't
          state.lineMax = nextLine;

          if (state.blkIndent !== 0) {
            // state.blkIndent was non-zero, we now set it to zero,
            // so we need to re-calculate all offsets to appear as
            // if indent wasn't changed
            oldBMarks.push(state.bMarks[nextLine]);
            oldBSCount.push(state.bsCount[nextLine]);
            oldTShift.push(state.tShift[nextLine]);
            oldSCount.push(state.sCount[nextLine]);
            state.sCount[nextLine] -= state.blkIndent;
          }

          break;
        }

        oldBMarks.push(state.bMarks[nextLine]);
        oldBSCount.push(state.bsCount[nextLine]);
        oldTShift.push(state.tShift[nextLine]);
        oldSCount.push(state.sCount[nextLine]);

        // A negative indentation means that this is a paragraph continuation
        //
        state.sCount[nextLine] = -1;
      }

      oldIndent = state.blkIndent;
      state.blkIndent = 0;

      token        = state.push('blockquote_open', 'blockquote', 1);
      token.markup = '>';
      token.map    = lines = [ startLine, 0 ];

      state.md.block.tokenize(state, startLine, nextLine);

      token        = state.push('blockquote_close', 'blockquote', -1);
      token.markup = '>';

      state.lineMax = oldLineMax;
      state.parentType = oldParentType;
      lines[1] = state.line;

      // Restore original tShift; this might not be necessary since the parser
      // has already been here, but just to make sure we can do that.
      for (i = 0; i < oldTShift.length; i++) {
        state.bMarks[i + startLine] = oldBMarks[i];
        state.tShift[i + startLine] = oldTShift[i];
        state.sCount[i + startLine] = oldSCount[i];
        state.bsCount[i + startLine] = oldBSCount[i];
      }
      state.blkIndent = oldIndent;

      return true;
    };

    var isSpace$2 = utils.isSpace;


    var hr = function hr(state, startLine, endLine, silent) {
      var marker, cnt, ch, token,
          pos = state.bMarks[startLine] + state.tShift[startLine],
          max = state.eMarks[startLine];

      // if it's indented more than 3 spaces, it should be a code block
      if (state.sCount[startLine] - state.blkIndent >= 4) { return false; }

      marker = state.src.charCodeAt(pos++);

      // Check hr marker
      if (marker !== 0x2A/* * */ &&
          marker !== 0x2D/* - */ &&
          marker !== 0x5F/* _ */) {
        return false;
      }

      // markers can be mixed with spaces, but there should be at least 3 of them

      cnt = 1;
      while (pos < max) {
        ch = state.src.charCodeAt(pos++);
        if (ch !== marker && !isSpace$2(ch)) { return false; }
        if (ch === marker) { cnt++; }
      }

      if (cnt < 3) { return false; }

      if (silent) { return true; }

      state.line = startLine + 1;

      token        = state.push('hr', 'hr', 0);
      token.map    = [ startLine, state.line ];
      token.markup = Array(cnt + 1).join(String.fromCharCode(marker));

      return true;
    };

    var isSpace$3 = utils.isSpace;


    // Search `[-+*][\n ]`, returns next pos after marker on success
    // or -1 on fail.
    function skipBulletListMarker(state, startLine) {
      var marker, pos, max, ch;

      pos = state.bMarks[startLine] + state.tShift[startLine];
      max = state.eMarks[startLine];

      marker = state.src.charCodeAt(pos++);
      // Check bullet
      if (marker !== 0x2A/* * */ &&
          marker !== 0x2D/* - */ &&
          marker !== 0x2B/* + */) {
        return -1;
      }

      if (pos < max) {
        ch = state.src.charCodeAt(pos);

        if (!isSpace$3(ch)) {
          // " -test " - is not a list item
          return -1;
        }
      }

      return pos;
    }

    // Search `\d+[.)][\n ]`, returns next pos after marker on success
    // or -1 on fail.
    function skipOrderedListMarker(state, startLine) {
      var ch,
          start = state.bMarks[startLine] + state.tShift[startLine],
          pos = start,
          max = state.eMarks[startLine];

      // List marker should have at least 2 chars (digit + dot)
      if (pos + 1 >= max) { return -1; }

      ch = state.src.charCodeAt(pos++);

      if (ch < 0x30/* 0 */ || ch > 0x39/* 9 */) { return -1; }

      for (;;) {
        // EOL -> fail
        if (pos >= max) { return -1; }

        ch = state.src.charCodeAt(pos++);

        if (ch >= 0x30/* 0 */ && ch <= 0x39/* 9 */) {

          // List marker should have no more than 9 digits
          // (prevents integer overflow in browsers)
          if (pos - start >= 10) { return -1; }

          continue;
        }

        // found valid marker
        if (ch === 0x29/* ) */ || ch === 0x2e/* . */) {
          break;
        }

        return -1;
      }


      if (pos < max) {
        ch = state.src.charCodeAt(pos);

        if (!isSpace$3(ch)) {
          // " 1.test " - is not a list item
          return -1;
        }
      }
      return pos;
    }

    function markTightParagraphs(state, idx) {
      var i, l,
          level = state.level + 2;

      for (i = idx + 2, l = state.tokens.length - 2; i < l; i++) {
        if (state.tokens[i].level === level && state.tokens[i].type === 'paragraph_open') {
          state.tokens[i + 2].hidden = true;
          state.tokens[i].hidden = true;
          i += 2;
        }
      }
    }


    var list = function list(state, startLine, endLine, silent) {
      var ch,
          contentStart,
          i,
          indent,
          indentAfterMarker,
          initial,
          isOrdered,
          itemLines,
          l,
          listLines,
          listTokIdx,
          markerCharCode,
          markerValue,
          max,
          nextLine,
          offset,
          oldListIndent,
          oldParentType,
          oldSCount,
          oldTShift,
          oldTight,
          pos,
          posAfterMarker,
          prevEmptyEnd,
          start,
          terminate,
          terminatorRules,
          token,
          isTerminatingParagraph = false,
          tight = true;

      // if it's indented more than 3 spaces, it should be a code block
      if (state.sCount[startLine] - state.blkIndent >= 4) { return false; }

      // Special case:
      //  - item 1
      //   - item 2
      //    - item 3
      //     - item 4
      //      - this one is a paragraph continuation
      if (state.listIndent >= 0 &&
          state.sCount[startLine] - state.listIndent >= 4 &&
          state.sCount[startLine] < state.blkIndent) {
        return false;
      }

      // limit conditions when list can interrupt
      // a paragraph (validation mode only)
      if (silent && state.parentType === 'paragraph') {
        // Next list item should still terminate previous list item;
        //
        // This code can fail if plugins use blkIndent as well as lists,
        // but I hope the spec gets fixed long before that happens.
        //
        if (state.tShift[startLine] >= state.blkIndent) {
          isTerminatingParagraph = true;
        }
      }

      // Detect list type and position after marker
      if ((posAfterMarker = skipOrderedListMarker(state, startLine)) >= 0) {
        isOrdered = true;
        start = state.bMarks[startLine] + state.tShift[startLine];
        markerValue = Number(state.src.substr(start, posAfterMarker - start - 1));

        // If we're starting a new ordered list right after
        // a paragraph, it should start with 1.
        if (isTerminatingParagraph && markerValue !== 1) return false;

      } else if ((posAfterMarker = skipBulletListMarker(state, startLine)) >= 0) {
        isOrdered = false;

      } else {
        return false;
      }

      // If we're starting a new unordered list right after
      // a paragraph, first line should not be empty.
      if (isTerminatingParagraph) {
        if (state.skipSpaces(posAfterMarker) >= state.eMarks[startLine]) return false;
      }

      // We should terminate list on style change. Remember first one to compare.
      markerCharCode = state.src.charCodeAt(posAfterMarker - 1);

      // For validation mode we can terminate immediately
      if (silent) { return true; }

      // Start list
      listTokIdx = state.tokens.length;

      if (isOrdered) {
        token       = state.push('ordered_list_open', 'ol', 1);
        if (markerValue !== 1) {
          token.attrs = [ [ 'start', markerValue ] ];
        }

      } else {
        token       = state.push('bullet_list_open', 'ul', 1);
      }

      token.map    = listLines = [ startLine, 0 ];
      token.markup = String.fromCharCode(markerCharCode);

      //
      // Iterate list items
      //

      nextLine = startLine;
      prevEmptyEnd = false;
      terminatorRules = state.md.block.ruler.getRules('list');

      oldParentType = state.parentType;
      state.parentType = 'list';

      while (nextLine < endLine) {
        pos = posAfterMarker;
        max = state.eMarks[nextLine];

        initial = offset = state.sCount[nextLine] + posAfterMarker - (state.bMarks[startLine] + state.tShift[startLine]);

        while (pos < max) {
          ch = state.src.charCodeAt(pos);

          if (ch === 0x09) {
            offset += 4 - (offset + state.bsCount[nextLine]) % 4;
          } else if (ch === 0x20) {
            offset++;
          } else {
            break;
          }

          pos++;
        }

        contentStart = pos;

        if (contentStart >= max) {
          // trimming space in "-    \n  3" case, indent is 1 here
          indentAfterMarker = 1;
        } else {
          indentAfterMarker = offset - initial;
        }

        // If we have more than 4 spaces, the indent is 1
        // (the rest is just indented code block)
        if (indentAfterMarker > 4) { indentAfterMarker = 1; }

        // "  -  test"
        //  ^^^^^ - calculating total length of this thing
        indent = initial + indentAfterMarker;

        // Run subparser & write tokens
        token        = state.push('list_item_open', 'li', 1);
        token.markup = String.fromCharCode(markerCharCode);
        token.map    = itemLines = [ startLine, 0 ];

        // change current state, then restore it after parser subcall
        oldTight = state.tight;
        oldTShift = state.tShift[startLine];
        oldSCount = state.sCount[startLine];

        //  - example list
        // ^ listIndent position will be here
        //   ^ blkIndent position will be here
        //
        oldListIndent = state.listIndent;
        state.listIndent = state.blkIndent;
        state.blkIndent = indent;

        state.tight = true;
        state.tShift[startLine] = contentStart - state.bMarks[startLine];
        state.sCount[startLine] = offset;

        if (contentStart >= max && state.isEmpty(startLine + 1)) {
          // workaround for this case
          // (list item is empty, list terminates before "foo"):
          // ~~~~~~~~
          //   -
          //
          //     foo
          // ~~~~~~~~
          state.line = Math.min(state.line + 2, endLine);
        } else {
          state.md.block.tokenize(state, startLine, endLine, true);
        }

        // If any of list item is tight, mark list as tight
        if (!state.tight || prevEmptyEnd) {
          tight = false;
        }
        // Item become loose if finish with empty line,
        // but we should filter last element, because it means list finish
        prevEmptyEnd = (state.line - startLine) > 1 && state.isEmpty(state.line - 1);

        state.blkIndent = state.listIndent;
        state.listIndent = oldListIndent;
        state.tShift[startLine] = oldTShift;
        state.sCount[startLine] = oldSCount;
        state.tight = oldTight;

        token        = state.push('list_item_close', 'li', -1);
        token.markup = String.fromCharCode(markerCharCode);

        nextLine = startLine = state.line;
        itemLines[1] = nextLine;
        contentStart = state.bMarks[startLine];

        if (nextLine >= endLine) { break; }

        //
        // Try to check if list is terminated or continued.
        //
        if (state.sCount[nextLine] < state.blkIndent) { break; }

        // if it's indented more than 3 spaces, it should be a code block
        if (state.sCount[startLine] - state.blkIndent >= 4) { break; }

        // fail if terminating block found
        terminate = false;
        for (i = 0, l = terminatorRules.length; i < l; i++) {
          if (terminatorRules[i](state, nextLine, endLine, true)) {
            terminate = true;
            break;
          }
        }
        if (terminate) { break; }

        // fail if list has another type
        if (isOrdered) {
          posAfterMarker = skipOrderedListMarker(state, nextLine);
          if (posAfterMarker < 0) { break; }
        } else {
          posAfterMarker = skipBulletListMarker(state, nextLine);
          if (posAfterMarker < 0) { break; }
        }

        if (markerCharCode !== state.src.charCodeAt(posAfterMarker - 1)) { break; }
      }

      // Finalize list
      if (isOrdered) {
        token = state.push('ordered_list_close', 'ol', -1);
      } else {
        token = state.push('bullet_list_close', 'ul', -1);
      }
      token.markup = String.fromCharCode(markerCharCode);

      listLines[1] = nextLine;
      state.line = nextLine;

      state.parentType = oldParentType;

      // mark paragraphs tight if needed
      if (tight) {
        markTightParagraphs(state, listTokIdx);
      }

      return true;
    };

    var normalizeReference   = utils.normalizeReference;
    var isSpace$4              = utils.isSpace;


    var reference = function reference(state, startLine, _endLine, silent) {
      var ch,
          destEndPos,
          destEndLineNo,
          endLine,
          href,
          i,
          l,
          label,
          labelEnd,
          oldParentType,
          res,
          start,
          str,
          terminate,
          terminatorRules,
          title,
          lines = 0,
          pos = state.bMarks[startLine] + state.tShift[startLine],
          max = state.eMarks[startLine],
          nextLine = startLine + 1;

      // if it's indented more than 3 spaces, it should be a code block
      if (state.sCount[startLine] - state.blkIndent >= 4) { return false; }

      if (state.src.charCodeAt(pos) !== 0x5B/* [ */) { return false; }

      // Simple check to quickly interrupt scan on [link](url) at the start of line.
      // Can be useful on practice: https://github.com/markdown-it/markdown-it/issues/54
      while (++pos < max) {
        if (state.src.charCodeAt(pos) === 0x5D /* ] */ &&
            state.src.charCodeAt(pos - 1) !== 0x5C/* \ */) {
          if (pos + 1 === max) { return false; }
          if (state.src.charCodeAt(pos + 1) !== 0x3A/* : */) { return false; }
          break;
        }
      }

      endLine = state.lineMax;

      // jump line-by-line until empty one or EOF
      terminatorRules = state.md.block.ruler.getRules('reference');

      oldParentType = state.parentType;
      state.parentType = 'reference';

      for (; nextLine < endLine && !state.isEmpty(nextLine); nextLine++) {
        // this would be a code block normally, but after paragraph
        // it's considered a lazy continuation regardless of what's there
        if (state.sCount[nextLine] - state.blkIndent > 3) { continue; }

        // quirk for blockquotes, this line should already be checked by that rule
        if (state.sCount[nextLine] < 0) { continue; }

        // Some tags can terminate paragraph without empty line.
        terminate = false;
        for (i = 0, l = terminatorRules.length; i < l; i++) {
          if (terminatorRules[i](state, nextLine, endLine, true)) {
            terminate = true;
            break;
          }
        }
        if (terminate) { break; }
      }

      str = state.getLines(startLine, nextLine, state.blkIndent, false).trim();
      max = str.length;

      for (pos = 1; pos < max; pos++) {
        ch = str.charCodeAt(pos);
        if (ch === 0x5B /* [ */) {
          return false;
        } else if (ch === 0x5D /* ] */) {
          labelEnd = pos;
          break;
        } else if (ch === 0x0A /* \n */) {
          lines++;
        } else if (ch === 0x5C /* \ */) {
          pos++;
          if (pos < max && str.charCodeAt(pos) === 0x0A) {
            lines++;
          }
        }
      }

      if (labelEnd < 0 || str.charCodeAt(labelEnd + 1) !== 0x3A/* : */) { return false; }

      // [label]:   destination   'title'
      //         ^^^ skip optional whitespace here
      for (pos = labelEnd + 2; pos < max; pos++) {
        ch = str.charCodeAt(pos);
        if (ch === 0x0A) {
          lines++;
        } else if (isSpace$4(ch)) ; else {
          break;
        }
      }

      // [label]:   destination   'title'
      //            ^^^^^^^^^^^ parse this
      res = state.md.helpers.parseLinkDestination(str, pos, max);
      if (!res.ok) { return false; }

      href = state.md.normalizeLink(res.str);
      if (!state.md.validateLink(href)) { return false; }

      pos = res.pos;
      lines += res.lines;

      // save cursor state, we could require to rollback later
      destEndPos = pos;
      destEndLineNo = lines;

      // [label]:   destination   'title'
      //                       ^^^ skipping those spaces
      start = pos;
      for (; pos < max; pos++) {
        ch = str.charCodeAt(pos);
        if (ch === 0x0A) {
          lines++;
        } else if (isSpace$4(ch)) ; else {
          break;
        }
      }

      // [label]:   destination   'title'
      //                          ^^^^^^^ parse this
      res = state.md.helpers.parseLinkTitle(str, pos, max);
      if (pos < max && start !== pos && res.ok) {
        title = res.str;
        pos = res.pos;
        lines += res.lines;
      } else {
        title = '';
        pos = destEndPos;
        lines = destEndLineNo;
      }

      // skip trailing spaces until the rest of the line
      while (pos < max) {
        ch = str.charCodeAt(pos);
        if (!isSpace$4(ch)) { break; }
        pos++;
      }

      if (pos < max && str.charCodeAt(pos) !== 0x0A) {
        if (title) {
          // garbage at the end of the line after title,
          // but it could still be a valid reference if we roll back
          title = '';
          pos = destEndPos;
          lines = destEndLineNo;
          while (pos < max) {
            ch = str.charCodeAt(pos);
            if (!isSpace$4(ch)) { break; }
            pos++;
          }
        }
      }

      if (pos < max && str.charCodeAt(pos) !== 0x0A) {
        // garbage at the end of the line
        return false;
      }

      label = normalizeReference(str.slice(1, labelEnd));
      if (!label) {
        // CommonMark 0.20 disallows empty labels
        return false;
      }

      // Reference can not terminate anything. This check is for safety only.
      /*istanbul ignore if*/
      if (silent) { return true; }

      if (typeof state.env.references === 'undefined') {
        state.env.references = {};
      }
      if (typeof state.env.references[label] === 'undefined') {
        state.env.references[label] = { title: title, href: href };
      }

      state.parentType = oldParentType;

      state.line = startLine + lines + 1;
      return true;
    };

    var isSpace$5 = utils.isSpace;


    var heading = function heading(state, startLine, endLine, silent) {
      var ch, level, tmp, token,
          pos = state.bMarks[startLine] + state.tShift[startLine],
          max = state.eMarks[startLine];

      // if it's indented more than 3 spaces, it should be a code block
      if (state.sCount[startLine] - state.blkIndent >= 4) { return false; }

      ch  = state.src.charCodeAt(pos);

      if (ch !== 0x23/* # */ || pos >= max) { return false; }

      // count heading level
      level = 1;
      ch = state.src.charCodeAt(++pos);
      while (ch === 0x23/* # */ && pos < max && level <= 6) {
        level++;
        ch = state.src.charCodeAt(++pos);
      }

      if (level > 6 || (pos < max && !isSpace$5(ch))) { return false; }

      if (silent) { return true; }

      // Let's cut tails like '    ###  ' from the end of string

      max = state.skipSpacesBack(max, pos);
      tmp = state.skipCharsBack(max, 0x23, pos); // #
      if (tmp > pos && isSpace$5(state.src.charCodeAt(tmp - 1))) {
        max = tmp;
      }

      state.line = startLine + 1;

      token        = state.push('heading_open', 'h' + String(level), 1);
      token.markup = '########'.slice(0, level);
      token.map    = [ startLine, state.line ];

      token          = state.push('inline', '', 0);
      token.content  = state.src.slice(pos, max).trim();
      token.map      = [ startLine, state.line ];
      token.children = [];

      token        = state.push('heading_close', 'h' + String(level), -1);
      token.markup = '########'.slice(0, level);

      return true;
    };

    // lheading (---, ===)


    var lheading = function lheading(state, startLine, endLine/*, silent*/) {
      var content, terminate, i, l, token, pos, max, level, marker,
          nextLine = startLine + 1, oldParentType,
          terminatorRules = state.md.block.ruler.getRules('paragraph');

      // if it's indented more than 3 spaces, it should be a code block
      if (state.sCount[startLine] - state.blkIndent >= 4) { return false; }

      oldParentType = state.parentType;
      state.parentType = 'paragraph'; // use paragraph to match terminatorRules

      // jump line-by-line until empty one or EOF
      for (; nextLine < endLine && !state.isEmpty(nextLine); nextLine++) {
        // this would be a code block normally, but after paragraph
        // it's considered a lazy continuation regardless of what's there
        if (state.sCount[nextLine] - state.blkIndent > 3) { continue; }

        //
        // Check for underline in setext header
        //
        if (state.sCount[nextLine] >= state.blkIndent) {
          pos = state.bMarks[nextLine] + state.tShift[nextLine];
          max = state.eMarks[nextLine];

          if (pos < max) {
            marker = state.src.charCodeAt(pos);

            if (marker === 0x2D/* - */ || marker === 0x3D/* = */) {
              pos = state.skipChars(pos, marker);
              pos = state.skipSpaces(pos);

              if (pos >= max) {
                level = (marker === 0x3D/* = */ ? 1 : 2);
                break;
              }
            }
          }
        }

        // quirk for blockquotes, this line should already be checked by that rule
        if (state.sCount[nextLine] < 0) { continue; }

        // Some tags can terminate paragraph without empty line.
        terminate = false;
        for (i = 0, l = terminatorRules.length; i < l; i++) {
          if (terminatorRules[i](state, nextLine, endLine, true)) {
            terminate = true;
            break;
          }
        }
        if (terminate) { break; }
      }

      if (!level) {
        // Didn't find valid underline
        return false;
      }

      content = state.getLines(startLine, nextLine, state.blkIndent, false).trim();

      state.line = nextLine + 1;

      token          = state.push('heading_open', 'h' + String(level), 1);
      token.markup   = String.fromCharCode(marker);
      token.map      = [ startLine, state.line ];

      token          = state.push('inline', '', 0);
      token.content  = content;
      token.map      = [ startLine, state.line - 1 ];
      token.children = [];

      token          = state.push('heading_close', 'h' + String(level), -1);
      token.markup   = String.fromCharCode(marker);

      state.parentType = oldParentType;

      return true;
    };

    // List of valid html blocks names, accorting to commonmark spec


    var html_blocks = [
      'address',
      'article',
      'aside',
      'base',
      'basefont',
      'blockquote',
      'body',
      'caption',
      'center',
      'col',
      'colgroup',
      'dd',
      'details',
      'dialog',
      'dir',
      'div',
      'dl',
      'dt',
      'fieldset',
      'figcaption',
      'figure',
      'footer',
      'form',
      'frame',
      'frameset',
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'head',
      'header',
      'hr',
      'html',
      'iframe',
      'legend',
      'li',
      'link',
      'main',
      'menu',
      'menuitem',
      'meta',
      'nav',
      'noframes',
      'ol',
      'optgroup',
      'option',
      'p',
      'param',
      'section',
      'source',
      'summary',
      'table',
      'tbody',
      'td',
      'tfoot',
      'th',
      'thead',
      'title',
      'tr',
      'track',
      'ul'
    ];

    // Regexps to match html elements

    var attr_name     = '[a-zA-Z_:][a-zA-Z0-9:._-]*';

    var unquoted      = '[^"\'=<>`\\x00-\\x20]+';
    var single_quoted = "'[^']*'";
    var double_quoted = '"[^"]*"';

    var attr_value  = '(?:' + unquoted + '|' + single_quoted + '|' + double_quoted + ')';

    var attribute   = '(?:\\s+' + attr_name + '(?:\\s*=\\s*' + attr_value + ')?)';

    var open_tag    = '<[A-Za-z][A-Za-z0-9\\-]*' + attribute + '*\\s*\\/?>';

    var close_tag   = '<\\/[A-Za-z][A-Za-z0-9\\-]*\\s*>';
    var comment     = '<!---->|<!--(?:-?[^>-])(?:-?[^-])*-->';
    var processing  = '<[?].*?[?]>';
    var declaration = '<![A-Z]+\\s+[^>]*>';
    var cdata       = '<!\\[CDATA\\[[\\s\\S]*?\\]\\]>';

    var HTML_TAG_RE = new RegExp('^(?:' + open_tag + '|' + close_tag + '|' + comment +
                            '|' + processing + '|' + declaration + '|' + cdata + ')');
    var HTML_OPEN_CLOSE_TAG_RE = new RegExp('^(?:' + open_tag + '|' + close_tag + ')');

    var HTML_TAG_RE_1 = HTML_TAG_RE;
    var HTML_OPEN_CLOSE_TAG_RE_1 = HTML_OPEN_CLOSE_TAG_RE;

    var html_re = {
    	HTML_TAG_RE: HTML_TAG_RE_1,
    	HTML_OPEN_CLOSE_TAG_RE: HTML_OPEN_CLOSE_TAG_RE_1
    };

    var HTML_OPEN_CLOSE_TAG_RE$1 = html_re.HTML_OPEN_CLOSE_TAG_RE;

    // An array of opening and corresponding closing sequences for html tags,
    // last argument defines whether it can terminate a paragraph or not
    //
    var HTML_SEQUENCES = [
      [ /^<(script|pre|style)(?=(\s|>|$))/i, /<\/(script|pre|style)>/i, true ],
      [ /^<!--/,        /-->/,   true ],
      [ /^<\?/,         /\?>/,   true ],
      [ /^<![A-Z]/,     />/,     true ],
      [ /^<!\[CDATA\[/, /\]\]>/, true ],
      [ new RegExp('^</?(' + html_blocks.join('|') + ')(?=(\\s|/?>|$))', 'i'), /^$/, true ],
      [ new RegExp(HTML_OPEN_CLOSE_TAG_RE$1.source + '\\s*$'),  /^$/, false ]
    ];


    var html_block = function html_block(state, startLine, endLine, silent) {
      var i, nextLine, token, lineText,
          pos = state.bMarks[startLine] + state.tShift[startLine],
          max = state.eMarks[startLine];

      // if it's indented more than 3 spaces, it should be a code block
      if (state.sCount[startLine] - state.blkIndent >= 4) { return false; }

      if (!state.md.options.html) { return false; }

      if (state.src.charCodeAt(pos) !== 0x3C/* < */) { return false; }

      lineText = state.src.slice(pos, max);

      for (i = 0; i < HTML_SEQUENCES.length; i++) {
        if (HTML_SEQUENCES[i][0].test(lineText)) { break; }
      }

      if (i === HTML_SEQUENCES.length) { return false; }

      if (silent) {
        // true if this sequence can be a terminator, false otherwise
        return HTML_SEQUENCES[i][2];
      }

      nextLine = startLine + 1;

      // If we are here - we detected HTML block.
      // Let's roll down till block end.
      if (!HTML_SEQUENCES[i][1].test(lineText)) {
        for (; nextLine < endLine; nextLine++) {
          if (state.sCount[nextLine] < state.blkIndent) { break; }

          pos = state.bMarks[nextLine] + state.tShift[nextLine];
          max = state.eMarks[nextLine];
          lineText = state.src.slice(pos, max);

          if (HTML_SEQUENCES[i][1].test(lineText)) {
            if (lineText.length !== 0) { nextLine++; }
            break;
          }
        }
      }

      state.line = nextLine;

      token         = state.push('html_block', '', 0);
      token.map     = [ startLine, nextLine ];
      token.content = state.getLines(startLine, nextLine, state.blkIndent, true);

      return true;
    };

    // Paragraph


    var paragraph = function paragraph(state, startLine/*, endLine*/) {
      var content, terminate, i, l, token, oldParentType,
          nextLine = startLine + 1,
          terminatorRules = state.md.block.ruler.getRules('paragraph'),
          endLine = state.lineMax;

      oldParentType = state.parentType;
      state.parentType = 'paragraph';

      // jump line-by-line until empty one or EOF
      for (; nextLine < endLine && !state.isEmpty(nextLine); nextLine++) {
        // this would be a code block normally, but after paragraph
        // it's considered a lazy continuation regardless of what's there
        if (state.sCount[nextLine] - state.blkIndent > 3) { continue; }

        // quirk for blockquotes, this line should already be checked by that rule
        if (state.sCount[nextLine] < 0) { continue; }

        // Some tags can terminate paragraph without empty line.
        terminate = false;
        for (i = 0, l = terminatorRules.length; i < l; i++) {
          if (terminatorRules[i](state, nextLine, endLine, true)) {
            terminate = true;
            break;
          }
        }
        if (terminate) { break; }
      }

      content = state.getLines(startLine, nextLine, state.blkIndent, false).trim();

      state.line = nextLine;

      token          = state.push('paragraph_open', 'p', 1);
      token.map      = [ startLine, state.line ];

      token          = state.push('inline', '', 0);
      token.content  = content;
      token.map      = [ startLine, state.line ];
      token.children = [];

      token          = state.push('paragraph_close', 'p', -1);

      state.parentType = oldParentType;

      return true;
    };

    var isSpace$6 = utils.isSpace;


    function StateBlock(src, md, env, tokens) {
      var ch, s, start, pos, len, indent, offset, indent_found;

      this.src = src;

      // link to parser instance
      this.md     = md;

      this.env = env;

      //
      // Internal state vartiables
      //

      this.tokens = tokens;

      this.bMarks = [];  // line begin offsets for fast jumps
      this.eMarks = [];  // line end offsets for fast jumps
      this.tShift = [];  // offsets of the first non-space characters (tabs not expanded)
      this.sCount = [];  // indents for each line (tabs expanded)

      // An amount of virtual spaces (tabs expanded) between beginning
      // of each line (bMarks) and real beginning of that line.
      //
      // It exists only as a hack because blockquotes override bMarks
      // losing information in the process.
      //
      // It's used only when expanding tabs, you can think about it as
      // an initial tab length, e.g. bsCount=21 applied to string `\t123`
      // means first tab should be expanded to 4-21%4 === 3 spaces.
      //
      this.bsCount = [];

      // block parser variables
      this.blkIndent  = 0; // required block content indent (for example, if we are
                           // inside a list, it would be positioned after list marker)
      this.line       = 0; // line index in src
      this.lineMax    = 0; // lines count
      this.tight      = false;  // loose/tight mode for lists
      this.ddIndent   = -1; // indent of the current dd block (-1 if there isn't any)
      this.listIndent = -1; // indent of the current list block (-1 if there isn't any)

      // can be 'blockquote', 'list', 'root', 'paragraph' or 'reference'
      // used in lists to determine if they interrupt a paragraph
      this.parentType = 'root';

      this.level = 0;

      // renderer
      this.result = '';

      // Create caches
      // Generate markers.
      s = this.src;
      indent_found = false;

      for (start = pos = indent = offset = 0, len = s.length; pos < len; pos++) {
        ch = s.charCodeAt(pos);

        if (!indent_found) {
          if (isSpace$6(ch)) {
            indent++;

            if (ch === 0x09) {
              offset += 4 - offset % 4;
            } else {
              offset++;
            }
            continue;
          } else {
            indent_found = true;
          }
        }

        if (ch === 0x0A || pos === len - 1) {
          if (ch !== 0x0A) { pos++; }
          this.bMarks.push(start);
          this.eMarks.push(pos);
          this.tShift.push(indent);
          this.sCount.push(offset);
          this.bsCount.push(0);

          indent_found = false;
          indent = 0;
          offset = 0;
          start = pos + 1;
        }
      }

      // Push fake entry to simplify cache bounds checks
      this.bMarks.push(s.length);
      this.eMarks.push(s.length);
      this.tShift.push(0);
      this.sCount.push(0);
      this.bsCount.push(0);

      this.lineMax = this.bMarks.length - 1; // don't count last fake line
    }

    // Push new token to "stream".
    //
    StateBlock.prototype.push = function (type, tag, nesting) {
      var token$1 = new token(type, tag, nesting);
      token$1.block = true;

      if (nesting < 0) this.level--; // closing tag
      token$1.level = this.level;
      if (nesting > 0) this.level++; // opening tag

      this.tokens.push(token$1);
      return token$1;
    };

    StateBlock.prototype.isEmpty = function isEmpty(line) {
      return this.bMarks[line] + this.tShift[line] >= this.eMarks[line];
    };

    StateBlock.prototype.skipEmptyLines = function skipEmptyLines(from) {
      for (var max = this.lineMax; from < max; from++) {
        if (this.bMarks[from] + this.tShift[from] < this.eMarks[from]) {
          break;
        }
      }
      return from;
    };

    // Skip spaces from given position.
    StateBlock.prototype.skipSpaces = function skipSpaces(pos) {
      var ch;

      for (var max = this.src.length; pos < max; pos++) {
        ch = this.src.charCodeAt(pos);
        if (!isSpace$6(ch)) { break; }
      }
      return pos;
    };

    // Skip spaces from given position in reverse.
    StateBlock.prototype.skipSpacesBack = function skipSpacesBack(pos, min) {
      if (pos <= min) { return pos; }

      while (pos > min) {
        if (!isSpace$6(this.src.charCodeAt(--pos))) { return pos + 1; }
      }
      return pos;
    };

    // Skip char codes from given position
    StateBlock.prototype.skipChars = function skipChars(pos, code) {
      for (var max = this.src.length; pos < max; pos++) {
        if (this.src.charCodeAt(pos) !== code) { break; }
      }
      return pos;
    };

    // Skip char codes reverse from given position - 1
    StateBlock.prototype.skipCharsBack = function skipCharsBack(pos, code, min) {
      if (pos <= min) { return pos; }

      while (pos > min) {
        if (code !== this.src.charCodeAt(--pos)) { return pos + 1; }
      }
      return pos;
    };

    // cut lines range from source.
    StateBlock.prototype.getLines = function getLines(begin, end, indent, keepLastLF) {
      var i, lineIndent, ch, first, last, queue, lineStart,
          line = begin;

      if (begin >= end) {
        return '';
      }

      queue = new Array(end - begin);

      for (i = 0; line < end; line++, i++) {
        lineIndent = 0;
        lineStart = first = this.bMarks[line];

        if (line + 1 < end || keepLastLF) {
          // No need for bounds check because we have fake entry on tail.
          last = this.eMarks[line] + 1;
        } else {
          last = this.eMarks[line];
        }

        while (first < last && lineIndent < indent) {
          ch = this.src.charCodeAt(first);

          if (isSpace$6(ch)) {
            if (ch === 0x09) {
              lineIndent += 4 - (lineIndent + this.bsCount[line]) % 4;
            } else {
              lineIndent++;
            }
          } else if (first - lineStart < this.tShift[line]) {
            // patched tShift masked characters to look like spaces (blockquotes, list markers)
            lineIndent++;
          } else {
            break;
          }

          first++;
        }

        if (lineIndent > indent) {
          // partially expanding tabs in code blocks, e.g '\t\tfoobar'
          // with indent=2 becomes '  \tfoobar'
          queue[i] = new Array(lineIndent - indent + 1).join(' ') + this.src.slice(first, last);
        } else {
          queue[i] = this.src.slice(first, last);
        }
      }

      return queue.join('');
    };

    // re-export Token class to use in block rules
    StateBlock.prototype.Token = token;


    var state_block = StateBlock;

    var _rules$1 = [
      // First 2 params - rule name & source. Secondary array - list of rules,
      // which can be terminated by this one.
      [ 'table',      table,      [ 'paragraph', 'reference' ] ],
      [ 'code',       code ],
      [ 'fence',      fence,      [ 'paragraph', 'reference', 'blockquote', 'list' ] ],
      [ 'blockquote', blockquote, [ 'paragraph', 'reference', 'blockquote', 'list' ] ],
      [ 'hr',         hr,         [ 'paragraph', 'reference', 'blockquote', 'list' ] ],
      [ 'list',       list,       [ 'paragraph', 'reference', 'blockquote' ] ],
      [ 'reference',  reference ],
      [ 'heading',    heading,    [ 'paragraph', 'reference', 'blockquote' ] ],
      [ 'lheading',   lheading ],
      [ 'html_block', html_block, [ 'paragraph', 'reference', 'blockquote' ] ],
      [ 'paragraph',  paragraph ]
    ];


    /**
     * new ParserBlock()
     **/
    function ParserBlock() {
      /**
       * ParserBlock#ruler -> Ruler
       *
       * [[Ruler]] instance. Keep configuration of block rules.
       **/
      this.ruler = new ruler();

      for (var i = 0; i < _rules$1.length; i++) {
        this.ruler.push(_rules$1[i][0], _rules$1[i][1], { alt: (_rules$1[i][2] || []).slice() });
      }
    }


    // Generate tokens for input range
    //
    ParserBlock.prototype.tokenize = function (state, startLine, endLine) {
      var ok, i,
          rules = this.ruler.getRules(''),
          len = rules.length,
          line = startLine,
          hasEmptyLines = false,
          maxNesting = state.md.options.maxNesting;

      while (line < endLine) {
        state.line = line = state.skipEmptyLines(line);
        if (line >= endLine) { break; }

        // Termination condition for nested calls.
        // Nested calls currently used for blockquotes & lists
        if (state.sCount[line] < state.blkIndent) { break; }

        // If nesting level exceeded - skip tail to the end. That's not ordinary
        // situation and we should not care about content.
        if (state.level >= maxNesting) {
          state.line = endLine;
          break;
        }

        // Try all possible rules.
        // On success, rule should:
        //
        // - update `state.line`
        // - update `state.tokens`
        // - return true

        for (i = 0; i < len; i++) {
          ok = rules[i](state, line, endLine, false);
          if (ok) { break; }
        }

        // set state.tight if we had an empty line before current tag
        // i.e. latest empty line should not count
        state.tight = !hasEmptyLines;

        // paragraph might "eat" one newline after it in nested lists
        if (state.isEmpty(state.line - 1)) {
          hasEmptyLines = true;
        }

        line = state.line;

        if (line < endLine && state.isEmpty(line)) {
          hasEmptyLines = true;
          line++;
          state.line = line;
        }
      }
    };


    /**
     * ParserBlock.parse(str, md, env, outTokens)
     *
     * Process input string and push block tokens into `outTokens`
     **/
    ParserBlock.prototype.parse = function (src, md, env, outTokens) {
      var state;

      if (!src) { return; }

      state = new this.State(src, md, env, outTokens);

      this.tokenize(state, state.line, state.lineMax);
    };


    ParserBlock.prototype.State = state_block;


    var parser_block = ParserBlock;

    // Skip text characters for text token, place those to pending buffer


    // Rule to skip pure text
    // '{}$%@~+=:' reserved for extentions

    // !, ", #, $, %, &, ', (, ), *, +, ,, -, ., /, :, ;, <, =, >, ?, @, [, \, ], ^, _, `, {, |, }, or ~

    // !!!! Don't confuse with "Markdown ASCII Punctuation" chars
    // http://spec.commonmark.org/0.15/#ascii-punctuation-character
    function isTerminatorChar(ch) {
      switch (ch) {
        case 0x0A/* \n */:
        case 0x21/* ! */:
        case 0x23/* # */:
        case 0x24/* $ */:
        case 0x25/* % */:
        case 0x26/* & */:
        case 0x2A/* * */:
        case 0x2B/* + */:
        case 0x2D/* - */:
        case 0x3A/* : */:
        case 0x3C/* < */:
        case 0x3D/* = */:
        case 0x3E/* > */:
        case 0x40/* @ */:
        case 0x5B/* [ */:
        case 0x5C/* \ */:
        case 0x5D/* ] */:
        case 0x5E/* ^ */:
        case 0x5F/* _ */:
        case 0x60/* ` */:
        case 0x7B/* { */:
        case 0x7D/* } */:
        case 0x7E/* ~ */:
          return true;
        default:
          return false;
      }
    }

    var text$1 = function text(state, silent) {
      var pos = state.pos;

      while (pos < state.posMax && !isTerminatorChar(state.src.charCodeAt(pos))) {
        pos++;
      }

      if (pos === state.pos) { return false; }

      if (!silent) { state.pending += state.src.slice(state.pos, pos); }

      state.pos = pos;

      return true;
    };

    var isSpace$7 = utils.isSpace;


    var newline = function newline(state, silent) {
      var pmax, max, pos = state.pos;

      if (state.src.charCodeAt(pos) !== 0x0A/* \n */) { return false; }

      pmax = state.pending.length - 1;
      max = state.posMax;

      // '  \n' -> hardbreak
      // Lookup in pending chars is bad practice! Don't copy to other rules!
      // Pending string is stored in concat mode, indexed lookups will cause
      // convertion to flat mode.
      if (!silent) {
        if (pmax >= 0 && state.pending.charCodeAt(pmax) === 0x20) {
          if (pmax >= 1 && state.pending.charCodeAt(pmax - 1) === 0x20) {
            state.pending = state.pending.replace(/ +$/, '');
            state.push('hardbreak', 'br', 0);
          } else {
            state.pending = state.pending.slice(0, -1);
            state.push('softbreak', 'br', 0);
          }

        } else {
          state.push('softbreak', 'br', 0);
        }
      }

      pos++;

      // skip heading spaces for next line
      while (pos < max && isSpace$7(state.src.charCodeAt(pos))) { pos++; }

      state.pos = pos;
      return true;
    };

    var isSpace$8 = utils.isSpace;

    var ESCAPED = [];

    for (var i = 0; i < 256; i++) { ESCAPED.push(0); }

    '\\!"#$%&\'()*+,./:;<=>?@[]^_`{|}~-'
      .split('').forEach(function (ch) { ESCAPED[ch.charCodeAt(0)] = 1; });


    var _escape = function escape(state, silent) {
      var ch, pos = state.pos, max = state.posMax;

      if (state.src.charCodeAt(pos) !== 0x5C/* \ */) { return false; }

      pos++;

      if (pos < max) {
        ch = state.src.charCodeAt(pos);

        if (ch < 256 && ESCAPED[ch] !== 0) {
          if (!silent) { state.pending += state.src[pos]; }
          state.pos += 2;
          return true;
        }

        if (ch === 0x0A) {
          if (!silent) {
            state.push('hardbreak', 'br', 0);
          }

          pos++;
          // skip leading whitespaces from next line
          while (pos < max) {
            ch = state.src.charCodeAt(pos);
            if (!isSpace$8(ch)) { break; }
            pos++;
          }

          state.pos = pos;
          return true;
        }
      }

      if (!silent) { state.pending += '\\'; }
      state.pos++;
      return true;
    };

    // Parse backticks

    var backticks = function backtick(state, silent) {
      var start, max, marker, matchStart, matchEnd, token,
          pos = state.pos,
          ch = state.src.charCodeAt(pos);

      if (ch !== 0x60/* ` */) { return false; }

      start = pos;
      pos++;
      max = state.posMax;

      while (pos < max && state.src.charCodeAt(pos) === 0x60/* ` */) { pos++; }

      marker = state.src.slice(start, pos);

      matchStart = matchEnd = pos;

      while ((matchStart = state.src.indexOf('`', matchEnd)) !== -1) {
        matchEnd = matchStart + 1;

        while (matchEnd < max && state.src.charCodeAt(matchEnd) === 0x60/* ` */) { matchEnd++; }

        if (matchEnd - matchStart === marker.length) {
          if (!silent) {
            token         = state.push('code_inline', 'code', 0);
            token.markup  = marker;
            token.content = state.src.slice(pos, matchStart)
              .replace(/\n/g, ' ')
              .replace(/^ (.+) $/, '$1');
          }
          state.pos = matchEnd;
          return true;
        }
      }

      if (!silent) { state.pending += marker; }
      state.pos += marker.length;
      return true;
    };

    // ~~strike through~~


    // Insert each marker as a separate text token, and add it to delimiter list
    //
    var tokenize = function strikethrough(state, silent) {
      var i, scanned, token, len, ch,
          start = state.pos,
          marker = state.src.charCodeAt(start);

      if (silent) { return false; }

      if (marker !== 0x7E/* ~ */) { return false; }

      scanned = state.scanDelims(state.pos, true);
      len = scanned.length;
      ch = String.fromCharCode(marker);

      if (len < 2) { return false; }

      if (len % 2) {
        token         = state.push('text', '', 0);
        token.content = ch;
        len--;
      }

      for (i = 0; i < len; i += 2) {
        token         = state.push('text', '', 0);
        token.content = ch + ch;

        state.delimiters.push({
          marker: marker,
          length: 0, // disable "rule of 3" length checks meant for emphasis
          jump:   i,
          token:  state.tokens.length - 1,
          end:    -1,
          open:   scanned.can_open,
          close:  scanned.can_close
        });
      }

      state.pos += scanned.length;

      return true;
    };


    function postProcess(state, delimiters) {
      var i, j,
          startDelim,
          endDelim,
          token,
          loneMarkers = [],
          max = delimiters.length;

      for (i = 0; i < max; i++) {
        startDelim = delimiters[i];

        if (startDelim.marker !== 0x7E/* ~ */) {
          continue;
        }

        if (startDelim.end === -1) {
          continue;
        }

        endDelim = delimiters[startDelim.end];

        token         = state.tokens[startDelim.token];
        token.type    = 's_open';
        token.tag     = 's';
        token.nesting = 1;
        token.markup  = '~~';
        token.content = '';

        token         = state.tokens[endDelim.token];
        token.type    = 's_close';
        token.tag     = 's';
        token.nesting = -1;
        token.markup  = '~~';
        token.content = '';

        if (state.tokens[endDelim.token - 1].type === 'text' &&
            state.tokens[endDelim.token - 1].content === '~') {

          loneMarkers.push(endDelim.token - 1);
        }
      }

      // If a marker sequence has an odd number of characters, it's splitted
      // like this: `~~~~~` -> `~` + `~~` + `~~`, leaving one marker at the
      // start of the sequence.
      //
      // So, we have to move all those markers after subsequent s_close tags.
      //
      while (loneMarkers.length) {
        i = loneMarkers.pop();
        j = i + 1;

        while (j < state.tokens.length && state.tokens[j].type === 's_close') {
          j++;
        }

        j--;

        if (i !== j) {
          token = state.tokens[j];
          state.tokens[j] = state.tokens[i];
          state.tokens[i] = token;
        }
      }
    }


    // Walk through delimiter list and replace text tokens with tags
    //
    var postProcess_1 = function strikethrough(state) {
      var curr,
          tokens_meta = state.tokens_meta,
          max = state.tokens_meta.length;

      postProcess(state, state.delimiters);

      for (curr = 0; curr < max; curr++) {
        if (tokens_meta[curr] && tokens_meta[curr].delimiters) {
          postProcess(state, tokens_meta[curr].delimiters);
        }
      }
    };

    var strikethrough = {
    	tokenize: tokenize,
    	postProcess: postProcess_1
    };

    // Process *this* and _that_


    // Insert each marker as a separate text token, and add it to delimiter list
    //
    var tokenize$1 = function emphasis(state, silent) {
      var i, scanned, token,
          start = state.pos,
          marker = state.src.charCodeAt(start);

      if (silent) { return false; }

      if (marker !== 0x5F /* _ */ && marker !== 0x2A /* * */) { return false; }

      scanned = state.scanDelims(state.pos, marker === 0x2A);

      for (i = 0; i < scanned.length; i++) {
        token         = state.push('text', '', 0);
        token.content = String.fromCharCode(marker);

        state.delimiters.push({
          // Char code of the starting marker (number).
          //
          marker: marker,

          // Total length of these series of delimiters.
          //
          length: scanned.length,

          // An amount of characters before this one that's equivalent to
          // current one. In plain English: if this delimiter does not open
          // an emphasis, neither do previous `jump` characters.
          //
          // Used to skip sequences like "*****" in one step, for 1st asterisk
          // value will be 0, for 2nd it's 1 and so on.
          //
          jump:   i,

          // A position of the token this delimiter corresponds to.
          //
          token:  state.tokens.length - 1,

          // If this delimiter is matched as a valid opener, `end` will be
          // equal to its position, otherwise it's `-1`.
          //
          end:    -1,

          // Boolean flags that determine if this delimiter could open or close
          // an emphasis.
          //
          open:   scanned.can_open,
          close:  scanned.can_close
        });
      }

      state.pos += scanned.length;

      return true;
    };


    function postProcess$1(state, delimiters) {
      var i,
          startDelim,
          endDelim,
          token,
          ch,
          isStrong,
          max = delimiters.length;

      for (i = max - 1; i >= 0; i--) {
        startDelim = delimiters[i];

        if (startDelim.marker !== 0x5F/* _ */ && startDelim.marker !== 0x2A/* * */) {
          continue;
        }

        // Process only opening markers
        if (startDelim.end === -1) {
          continue;
        }

        endDelim = delimiters[startDelim.end];

        // If the previous delimiter has the same marker and is adjacent to this one,
        // merge those into one strong delimiter.
        //
        // `<em><em>whatever</em></em>` -> `<strong>whatever</strong>`
        //
        isStrong = i > 0 &&
                   delimiters[i - 1].end === startDelim.end + 1 &&
                   delimiters[i - 1].token === startDelim.token - 1 &&
                   delimiters[startDelim.end + 1].token === endDelim.token + 1 &&
                   delimiters[i - 1].marker === startDelim.marker;

        ch = String.fromCharCode(startDelim.marker);

        token         = state.tokens[startDelim.token];
        token.type    = isStrong ? 'strong_open' : 'em_open';
        token.tag     = isStrong ? 'strong' : 'em';
        token.nesting = 1;
        token.markup  = isStrong ? ch + ch : ch;
        token.content = '';

        token         = state.tokens[endDelim.token];
        token.type    = isStrong ? 'strong_close' : 'em_close';
        token.tag     = isStrong ? 'strong' : 'em';
        token.nesting = -1;
        token.markup  = isStrong ? ch + ch : ch;
        token.content = '';

        if (isStrong) {
          state.tokens[delimiters[i - 1].token].content = '';
          state.tokens[delimiters[startDelim.end + 1].token].content = '';
          i--;
        }
      }
    }


    // Walk through delimiter list and replace text tokens with tags
    //
    var postProcess_1$1 = function emphasis(state) {
      var curr,
          tokens_meta = state.tokens_meta,
          max = state.tokens_meta.length;

      postProcess$1(state, state.delimiters);

      for (curr = 0; curr < max; curr++) {
        if (tokens_meta[curr] && tokens_meta[curr].delimiters) {
          postProcess$1(state, tokens_meta[curr].delimiters);
        }
      }
    };

    var emphasis = {
    	tokenize: tokenize$1,
    	postProcess: postProcess_1$1
    };

    var normalizeReference$1   = utils.normalizeReference;
    var isSpace$9              = utils.isSpace;


    var link = function link(state, silent) {
      var attrs,
          code,
          label,
          labelEnd,
          labelStart,
          pos,
          res,
          ref,
          title,
          token,
          href = '',
          oldPos = state.pos,
          max = state.posMax,
          start = state.pos,
          parseReference = true;

      if (state.src.charCodeAt(state.pos) !== 0x5B/* [ */) { return false; }

      labelStart = state.pos + 1;
      labelEnd = state.md.helpers.parseLinkLabel(state, state.pos, true);

      // parser failed to find ']', so it's not a valid link
      if (labelEnd < 0) { return false; }

      pos = labelEnd + 1;
      if (pos < max && state.src.charCodeAt(pos) === 0x28/* ( */) {
        //
        // Inline link
        //

        // might have found a valid shortcut link, disable reference parsing
        parseReference = false;

        // [link](  <href>  "title"  )
        //        ^^ skipping these spaces
        pos++;
        for (; pos < max; pos++) {
          code = state.src.charCodeAt(pos);
          if (!isSpace$9(code) && code !== 0x0A) { break; }
        }
        if (pos >= max) { return false; }

        // [link](  <href>  "title"  )
        //          ^^^^^^ parsing link destination
        start = pos;
        res = state.md.helpers.parseLinkDestination(state.src, pos, state.posMax);
        if (res.ok) {
          href = state.md.normalizeLink(res.str);
          if (state.md.validateLink(href)) {
            pos = res.pos;
          } else {
            href = '';
          }
        }

        // [link](  <href>  "title"  )
        //                ^^ skipping these spaces
        start = pos;
        for (; pos < max; pos++) {
          code = state.src.charCodeAt(pos);
          if (!isSpace$9(code) && code !== 0x0A) { break; }
        }

        // [link](  <href>  "title"  )
        //                  ^^^^^^^ parsing link title
        res = state.md.helpers.parseLinkTitle(state.src, pos, state.posMax);
        if (pos < max && start !== pos && res.ok) {
          title = res.str;
          pos = res.pos;

          // [link](  <href>  "title"  )
          //                         ^^ skipping these spaces
          for (; pos < max; pos++) {
            code = state.src.charCodeAt(pos);
            if (!isSpace$9(code) && code !== 0x0A) { break; }
          }
        } else {
          title = '';
        }

        if (pos >= max || state.src.charCodeAt(pos) !== 0x29/* ) */) {
          // parsing a valid shortcut link failed, fallback to reference
          parseReference = true;
        }
        pos++;
      }

      if (parseReference) {
        //
        // Link reference
        //
        if (typeof state.env.references === 'undefined') { return false; }

        if (pos < max && state.src.charCodeAt(pos) === 0x5B/* [ */) {
          start = pos + 1;
          pos = state.md.helpers.parseLinkLabel(state, pos);
          if (pos >= 0) {
            label = state.src.slice(start, pos++);
          } else {
            pos = labelEnd + 1;
          }
        } else {
          pos = labelEnd + 1;
        }

        // covers label === '' and label === undefined
        // (collapsed reference link and shortcut reference link respectively)
        if (!label) { label = state.src.slice(labelStart, labelEnd); }

        ref = state.env.references[normalizeReference$1(label)];
        if (!ref) {
          state.pos = oldPos;
          return false;
        }
        href = ref.href;
        title = ref.title;
      }

      //
      // We found the end of the link, and know for a fact it's a valid link;
      // so all that's left to do is to call tokenizer.
      //
      if (!silent) {
        state.pos = labelStart;
        state.posMax = labelEnd;

        token        = state.push('link_open', 'a', 1);
        token.attrs  = attrs = [ [ 'href', href ] ];
        if (title) {
          attrs.push([ 'title', title ]);
        }

        state.md.inline.tokenize(state);

        token        = state.push('link_close', 'a', -1);
      }

      state.pos = pos;
      state.posMax = max;
      return true;
    };

    var normalizeReference$2   = utils.normalizeReference;
    var isSpace$a              = utils.isSpace;


    var image$1 = function image(state, silent) {
      var attrs,
          code,
          content,
          label,
          labelEnd,
          labelStart,
          pos,
          ref,
          res,
          title,
          token,
          tokens,
          start,
          href = '',
          oldPos = state.pos,
          max = state.posMax;

      if (state.src.charCodeAt(state.pos) !== 0x21/* ! */) { return false; }
      if (state.src.charCodeAt(state.pos + 1) !== 0x5B/* [ */) { return false; }

      labelStart = state.pos + 2;
      labelEnd = state.md.helpers.parseLinkLabel(state, state.pos + 1, false);

      // parser failed to find ']', so it's not a valid link
      if (labelEnd < 0) { return false; }

      pos = labelEnd + 1;
      if (pos < max && state.src.charCodeAt(pos) === 0x28/* ( */) {
        //
        // Inline link
        //

        // [link](  <href>  "title"  )
        //        ^^ skipping these spaces
        pos++;
        for (; pos < max; pos++) {
          code = state.src.charCodeAt(pos);
          if (!isSpace$a(code) && code !== 0x0A) { break; }
        }
        if (pos >= max) { return false; }

        // [link](  <href>  "title"  )
        //          ^^^^^^ parsing link destination
        start = pos;
        res = state.md.helpers.parseLinkDestination(state.src, pos, state.posMax);
        if (res.ok) {
          href = state.md.normalizeLink(res.str);
          if (state.md.validateLink(href)) {
            pos = res.pos;
          } else {
            href = '';
          }
        }

        // [link](  <href>  "title"  )
        //                ^^ skipping these spaces
        start = pos;
        for (; pos < max; pos++) {
          code = state.src.charCodeAt(pos);
          if (!isSpace$a(code) && code !== 0x0A) { break; }
        }

        // [link](  <href>  "title"  )
        //                  ^^^^^^^ parsing link title
        res = state.md.helpers.parseLinkTitle(state.src, pos, state.posMax);
        if (pos < max && start !== pos && res.ok) {
          title = res.str;
          pos = res.pos;

          // [link](  <href>  "title"  )
          //                         ^^ skipping these spaces
          for (; pos < max; pos++) {
            code = state.src.charCodeAt(pos);
            if (!isSpace$a(code) && code !== 0x0A) { break; }
          }
        } else {
          title = '';
        }

        if (pos >= max || state.src.charCodeAt(pos) !== 0x29/* ) */) {
          state.pos = oldPos;
          return false;
        }
        pos++;
      } else {
        //
        // Link reference
        //
        if (typeof state.env.references === 'undefined') { return false; }

        if (pos < max && state.src.charCodeAt(pos) === 0x5B/* [ */) {
          start = pos + 1;
          pos = state.md.helpers.parseLinkLabel(state, pos);
          if (pos >= 0) {
            label = state.src.slice(start, pos++);
          } else {
            pos = labelEnd + 1;
          }
        } else {
          pos = labelEnd + 1;
        }

        // covers label === '' and label === undefined
        // (collapsed reference link and shortcut reference link respectively)
        if (!label) { label = state.src.slice(labelStart, labelEnd); }

        ref = state.env.references[normalizeReference$2(label)];
        if (!ref) {
          state.pos = oldPos;
          return false;
        }
        href = ref.href;
        title = ref.title;
      }

      //
      // We found the end of the link, and know for a fact it's a valid link;
      // so all that's left to do is to call tokenizer.
      //
      if (!silent) {
        content = state.src.slice(labelStart, labelEnd);

        state.md.inline.parse(
          content,
          state.md,
          state.env,
          tokens = []
        );

        token          = state.push('image', 'img', 0);
        token.attrs    = attrs = [ [ 'src', href ], [ 'alt', '' ] ];
        token.children = tokens;
        token.content  = content;

        if (title) {
          attrs.push([ 'title', title ]);
        }
      }

      state.pos = pos;
      state.posMax = max;
      return true;
    };

    // Process autolinks '<protocol:...>'


    /*eslint max-len:0*/
    var EMAIL_RE    = /^<([a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*)>/;
    var AUTOLINK_RE = /^<([a-zA-Z][a-zA-Z0-9+.\-]{1,31}):([^<>\x00-\x20]*)>/;


    var autolink = function autolink(state, silent) {
      var tail, linkMatch, emailMatch, url, fullUrl, token,
          pos = state.pos;

      if (state.src.charCodeAt(pos) !== 0x3C/* < */) { return false; }

      tail = state.src.slice(pos);

      if (tail.indexOf('>') < 0) { return false; }

      if (AUTOLINK_RE.test(tail)) {
        linkMatch = tail.match(AUTOLINK_RE);

        url = linkMatch[0].slice(1, -1);
        fullUrl = state.md.normalizeLink(url);
        if (!state.md.validateLink(fullUrl)) { return false; }

        if (!silent) {
          token         = state.push('link_open', 'a', 1);
          token.attrs   = [ [ 'href', fullUrl ] ];
          token.markup  = 'autolink';
          token.info    = 'auto';

          token         = state.push('text', '', 0);
          token.content = state.md.normalizeLinkText(url);

          token         = state.push('link_close', 'a', -1);
          token.markup  = 'autolink';
          token.info    = 'auto';
        }

        state.pos += linkMatch[0].length;
        return true;
      }

      if (EMAIL_RE.test(tail)) {
        emailMatch = tail.match(EMAIL_RE);

        url = emailMatch[0].slice(1, -1);
        fullUrl = state.md.normalizeLink('mailto:' + url);
        if (!state.md.validateLink(fullUrl)) { return false; }

        if (!silent) {
          token         = state.push('link_open', 'a', 1);
          token.attrs   = [ [ 'href', fullUrl ] ];
          token.markup  = 'autolink';
          token.info    = 'auto';

          token         = state.push('text', '', 0);
          token.content = state.md.normalizeLinkText(url);

          token         = state.push('link_close', 'a', -1);
          token.markup  = 'autolink';
          token.info    = 'auto';
        }

        state.pos += emailMatch[0].length;
        return true;
      }

      return false;
    };

    var HTML_TAG_RE$1 = html_re.HTML_TAG_RE;


    function isLetter(ch) {
      /*eslint no-bitwise:0*/
      var lc = ch | 0x20; // to lower case
      return (lc >= 0x61/* a */) && (lc <= 0x7a/* z */);
    }


    var html_inline = function html_inline(state, silent) {
      var ch, match, max, token,
          pos = state.pos;

      if (!state.md.options.html) { return false; }

      // Check start
      max = state.posMax;
      if (state.src.charCodeAt(pos) !== 0x3C/* < */ ||
          pos + 2 >= max) {
        return false;
      }

      // Quick fail on second char
      ch = state.src.charCodeAt(pos + 1);
      if (ch !== 0x21/* ! */ &&
          ch !== 0x3F/* ? */ &&
          ch !== 0x2F/* / */ &&
          !isLetter(ch)) {
        return false;
      }

      match = state.src.slice(pos).match(HTML_TAG_RE$1);
      if (!match) { return false; }

      if (!silent) {
        token         = state.push('html_inline', '', 0);
        token.content = state.src.slice(pos, pos + match[0].length);
      }
      state.pos += match[0].length;
      return true;
    };

    var has               = utils.has;
    var isValidEntityCode = utils.isValidEntityCode;
    var fromCodePoint     = utils.fromCodePoint;


    var DIGITAL_RE = /^&#((?:x[a-f0-9]{1,6}|[0-9]{1,7}));/i;
    var NAMED_RE   = /^&([a-z][a-z0-9]{1,31});/i;


    var entity = function entity(state, silent) {
      var ch, code, match, pos = state.pos, max = state.posMax;

      if (state.src.charCodeAt(pos) !== 0x26/* & */) { return false; }

      if (pos + 1 < max) {
        ch = state.src.charCodeAt(pos + 1);

        if (ch === 0x23 /* # */) {
          match = state.src.slice(pos).match(DIGITAL_RE);
          if (match) {
            if (!silent) {
              code = match[1][0].toLowerCase() === 'x' ? parseInt(match[1].slice(1), 16) : parseInt(match[1], 10);
              state.pending += isValidEntityCode(code) ? fromCodePoint(code) : fromCodePoint(0xFFFD);
            }
            state.pos += match[0].length;
            return true;
          }
        } else {
          match = state.src.slice(pos).match(NAMED_RE);
          if (match) {
            if (has(entities$2, match[1])) {
              if (!silent) { state.pending += entities$2[match[1]]; }
              state.pos += match[0].length;
              return true;
            }
          }
        }
      }

      if (!silent) { state.pending += '&'; }
      state.pos++;
      return true;
    };

    // For each opening emphasis-like marker find a matching closing one


    function processDelimiters(state, delimiters) {
      var closerIdx, openerIdx, closer, opener, minOpenerIdx, newMinOpenerIdx,
          isOddMatch, lastJump,
          openersBottom = {},
          max = delimiters.length;

      for (closerIdx = 0; closerIdx < max; closerIdx++) {
        closer = delimiters[closerIdx];

        // Length is only used for emphasis-specific "rule of 3",
        // if it's not defined (in strikethrough or 3rd party plugins),
        // we can default it to 0 to disable those checks.
        //
        closer.length = closer.length || 0;

        if (!closer.close) continue;

        // Previously calculated lower bounds (previous fails)
        // for each marker and each delimiter length modulo 3.
        if (!openersBottom.hasOwnProperty(closer.marker)) {
          openersBottom[closer.marker] = [ -1, -1, -1 ];
        }

        minOpenerIdx = openersBottom[closer.marker][closer.length % 3];
        newMinOpenerIdx = -1;

        openerIdx = closerIdx - closer.jump - 1;

        for (; openerIdx > minOpenerIdx; openerIdx -= opener.jump + 1) {
          opener = delimiters[openerIdx];

          if (opener.marker !== closer.marker) continue;

          if (newMinOpenerIdx === -1) newMinOpenerIdx = openerIdx;

          if (opener.open &&
              opener.end < 0 &&
              opener.level === closer.level) {

            isOddMatch = false;

            // from spec:
            //
            // If one of the delimiters can both open and close emphasis, then the
            // sum of the lengths of the delimiter runs containing the opening and
            // closing delimiters must not be a multiple of 3 unless both lengths
            // are multiples of 3.
            //
            if (opener.close || closer.open) {
              if ((opener.length + closer.length) % 3 === 0) {
                if (opener.length % 3 !== 0 || closer.length % 3 !== 0) {
                  isOddMatch = true;
                }
              }
            }

            if (!isOddMatch) {
              // If previous delimiter cannot be an opener, we can safely skip
              // the entire sequence in future checks. This is required to make
              // sure algorithm has linear complexity (see *_*_*_*_*_... case).
              //
              lastJump = openerIdx > 0 && !delimiters[openerIdx - 1].open ?
                delimiters[openerIdx - 1].jump + 1 :
                0;

              closer.jump  = closerIdx - openerIdx + lastJump;
              closer.open  = false;
              opener.end   = closerIdx;
              opener.jump  = lastJump;
              opener.close = false;
              newMinOpenerIdx = -1;
              break;
            }
          }
        }

        if (newMinOpenerIdx !== -1) {
          // If match for this delimiter run failed, we want to set lower bound for
          // future lookups. This is required to make sure algorithm has linear
          // complexity.
          //
          // See details here:
          // https://github.com/commonmark/cmark/issues/178#issuecomment-270417442
          //
          openersBottom[closer.marker][(closer.length || 0) % 3] = newMinOpenerIdx;
        }
      }
    }


    var balance_pairs = function link_pairs(state) {
      var curr,
          tokens_meta = state.tokens_meta,
          max = state.tokens_meta.length;

      processDelimiters(state, state.delimiters);

      for (curr = 0; curr < max; curr++) {
        if (tokens_meta[curr] && tokens_meta[curr].delimiters) {
          processDelimiters(state, tokens_meta[curr].delimiters);
        }
      }
    };

    // Clean up tokens after emphasis and strikethrough postprocessing:


    var text_collapse = function text_collapse(state) {
      var curr, last,
          level = 0,
          tokens = state.tokens,
          max = state.tokens.length;

      for (curr = last = 0; curr < max; curr++) {
        // re-calculate levels after emphasis/strikethrough turns some text nodes
        // into opening/closing tags
        if (tokens[curr].nesting < 0) level--; // closing tag
        tokens[curr].level = level;
        if (tokens[curr].nesting > 0) level++; // opening tag

        if (tokens[curr].type === 'text' &&
            curr + 1 < max &&
            tokens[curr + 1].type === 'text') {

          // collapse two adjacent text nodes
          tokens[curr + 1].content = tokens[curr].content + tokens[curr + 1].content;
        } else {
          if (curr !== last) { tokens[last] = tokens[curr]; }

          last++;
        }
      }

      if (curr !== last) {
        tokens.length = last;
      }
    };

    var isWhiteSpace$1   = utils.isWhiteSpace;
    var isPunctChar$1    = utils.isPunctChar;
    var isMdAsciiPunct$1 = utils.isMdAsciiPunct;


    function StateInline(src, md, env, outTokens) {
      this.src = src;
      this.env = env;
      this.md = md;
      this.tokens = outTokens;
      this.tokens_meta = Array(outTokens.length);

      this.pos = 0;
      this.posMax = this.src.length;
      this.level = 0;
      this.pending = '';
      this.pendingLevel = 0;

      // Stores { start: end } pairs. Useful for backtrack
      // optimization of pairs parse (emphasis, strikes).
      this.cache = {};

      // List of emphasis-like delimiters for current tag
      this.delimiters = [];

      // Stack of delimiter lists for upper level tags
      this._prev_delimiters = [];
    }


    // Flush pending text
    //
    StateInline.prototype.pushPending = function () {
      var token$1 = new token('text', '', 0);
      token$1.content = this.pending;
      token$1.level = this.pendingLevel;
      this.tokens.push(token$1);
      this.pending = '';
      return token$1;
    };


    // Push new token to "stream".
    // If pending text exists - flush it as text token
    //
    StateInline.prototype.push = function (type, tag, nesting) {
      if (this.pending) {
        this.pushPending();
      }

      var token$1 = new token(type, tag, nesting);
      var token_meta = null;

      if (nesting < 0) {
        // closing tag
        this.level--;
        this.delimiters = this._prev_delimiters.pop();
      }

      token$1.level = this.level;

      if (nesting > 0) {
        // opening tag
        this.level++;
        this._prev_delimiters.push(this.delimiters);
        this.delimiters = [];
        token_meta = { delimiters: this.delimiters };
      }

      this.pendingLevel = this.level;
      this.tokens.push(token$1);
      this.tokens_meta.push(token_meta);
      return token$1;
    };


    // Scan a sequence of emphasis-like markers, and determine whether
    // it can start an emphasis sequence or end an emphasis sequence.
    //
    //  - start - position to scan from (it should point at a valid marker);
    //  - canSplitWord - determine if these markers can be found inside a word
    //
    StateInline.prototype.scanDelims = function (start, canSplitWord) {
      var pos = start, lastChar, nextChar, count, can_open, can_close,
          isLastWhiteSpace, isLastPunctChar,
          isNextWhiteSpace, isNextPunctChar,
          left_flanking = true,
          right_flanking = true,
          max = this.posMax,
          marker = this.src.charCodeAt(start);

      // treat beginning of the line as a whitespace
      lastChar = start > 0 ? this.src.charCodeAt(start - 1) : 0x20;

      while (pos < max && this.src.charCodeAt(pos) === marker) { pos++; }

      count = pos - start;

      // treat end of the line as a whitespace
      nextChar = pos < max ? this.src.charCodeAt(pos) : 0x20;

      isLastPunctChar = isMdAsciiPunct$1(lastChar) || isPunctChar$1(String.fromCharCode(lastChar));
      isNextPunctChar = isMdAsciiPunct$1(nextChar) || isPunctChar$1(String.fromCharCode(nextChar));

      isLastWhiteSpace = isWhiteSpace$1(lastChar);
      isNextWhiteSpace = isWhiteSpace$1(nextChar);

      if (isNextWhiteSpace) {
        left_flanking = false;
      } else if (isNextPunctChar) {
        if (!(isLastWhiteSpace || isLastPunctChar)) {
          left_flanking = false;
        }
      }

      if (isLastWhiteSpace) {
        right_flanking = false;
      } else if (isLastPunctChar) {
        if (!(isNextWhiteSpace || isNextPunctChar)) {
          right_flanking = false;
        }
      }

      if (!canSplitWord) {
        can_open  = left_flanking  && (!right_flanking || isLastPunctChar);
        can_close = right_flanking && (!left_flanking  || isNextPunctChar);
      } else {
        can_open  = left_flanking;
        can_close = right_flanking;
      }

      return {
        can_open:  can_open,
        can_close: can_close,
        length:    count
      };
    };


    // re-export Token class to use in block rules
    StateInline.prototype.Token = token;


    var state_inline = StateInline;

    ////////////////////////////////////////////////////////////////////////////////
    // Parser rules

    var _rules$2 = [
      [ 'text',            text$1 ],
      [ 'newline',         newline ],
      [ 'escape',          _escape ],
      [ 'backticks',       backticks ],
      [ 'strikethrough',   strikethrough.tokenize ],
      [ 'emphasis',        emphasis.tokenize ],
      [ 'link',            link ],
      [ 'image',           image$1 ],
      [ 'autolink',        autolink ],
      [ 'html_inline',     html_inline ],
      [ 'entity',          entity ]
    ];

    var _rules2 = [
      [ 'balance_pairs',   balance_pairs ],
      [ 'strikethrough',   strikethrough.postProcess ],
      [ 'emphasis',        emphasis.postProcess ],
      [ 'text_collapse',   text_collapse ]
    ];


    /**
     * new ParserInline()
     **/
    function ParserInline() {
      var i;

      /**
       * ParserInline#ruler -> Ruler
       *
       * [[Ruler]] instance. Keep configuration of inline rules.
       **/
      this.ruler = new ruler();

      for (i = 0; i < _rules$2.length; i++) {
        this.ruler.push(_rules$2[i][0], _rules$2[i][1]);
      }

      /**
       * ParserInline#ruler2 -> Ruler
       *
       * [[Ruler]] instance. Second ruler used for post-processing
       * (e.g. in emphasis-like rules).
       **/
      this.ruler2 = new ruler();

      for (i = 0; i < _rules2.length; i++) {
        this.ruler2.push(_rules2[i][0], _rules2[i][1]);
      }
    }


    // Skip single token by running all rules in validation mode;
    // returns `true` if any rule reported success
    //
    ParserInline.prototype.skipToken = function (state) {
      var ok, i, pos = state.pos,
          rules = this.ruler.getRules(''),
          len = rules.length,
          maxNesting = state.md.options.maxNesting,
          cache = state.cache;


      if (typeof cache[pos] !== 'undefined') {
        state.pos = cache[pos];
        return;
      }

      if (state.level < maxNesting) {
        for (i = 0; i < len; i++) {
          // Increment state.level and decrement it later to limit recursion.
          // It's harmless to do here, because no tokens are created. But ideally,
          // we'd need a separate private state variable for this purpose.
          //
          state.level++;
          ok = rules[i](state, true);
          state.level--;

          if (ok) { break; }
        }
      } else {
        // Too much nesting, just skip until the end of the paragraph.
        //
        // NOTE: this will cause links to behave incorrectly in the following case,
        //       when an amount of `[` is exactly equal to `maxNesting + 1`:
        //
        //       [[[[[[[[[[[[[[[[[[[[[foo]()
        //
        // TODO: remove this workaround when CM standard will allow nested links
        //       (we can replace it by preventing links from being parsed in
        //       validation mode)
        //
        state.pos = state.posMax;
      }

      if (!ok) { state.pos++; }
      cache[pos] = state.pos;
    };


    // Generate tokens for input range
    //
    ParserInline.prototype.tokenize = function (state) {
      var ok, i,
          rules = this.ruler.getRules(''),
          len = rules.length,
          end = state.posMax,
          maxNesting = state.md.options.maxNesting;

      while (state.pos < end) {
        // Try all possible rules.
        // On success, rule should:
        //
        // - update `state.pos`
        // - update `state.tokens`
        // - return true

        if (state.level < maxNesting) {
          for (i = 0; i < len; i++) {
            ok = rules[i](state, false);
            if (ok) { break; }
          }
        }

        if (ok) {
          if (state.pos >= end) { break; }
          continue;
        }

        state.pending += state.src[state.pos++];
      }

      if (state.pending) {
        state.pushPending();
      }
    };


    /**
     * ParserInline.parse(str, md, env, outTokens)
     *
     * Process input string and push inline tokens into `outTokens`
     **/
    ParserInline.prototype.parse = function (str, md, env, outTokens) {
      var i, rules, len;
      var state = new this.State(str, md, env, outTokens);

      this.tokenize(state);

      rules = this.ruler2.getRules('');
      len = rules.length;

      for (i = 0; i < len; i++) {
        rules[i](state);
      }
    };


    ParserInline.prototype.State = state_inline;


    var parser_inline = ParserInline;

    var re = function (opts) {
      var re = {};

      // Use direct extract instead of `regenerate` to reduse browserified size
      re.src_Any = regex$1.source;
      re.src_Cc  = regex$2.source;
      re.src_Z   = regex$4.source;
      re.src_P   = regex.source;

      // \p{\Z\P\Cc\CF} (white spaces + control + format + punctuation)
      re.src_ZPCc = [ re.src_Z, re.src_P, re.src_Cc ].join('|');

      // \p{\Z\Cc} (white spaces + control)
      re.src_ZCc = [ re.src_Z, re.src_Cc ].join('|');

      // Experimental. List of chars, completely prohibited in links
      // because can separate it from other part of text
      var text_separators = '[><\uff5c]';

      // All possible word characters (everything without punctuation, spaces & controls)
      // Defined via punctuation & spaces to save space
      // Should be something like \p{\L\N\S\M} (\w but without `_`)
      re.src_pseudo_letter       = '(?:(?!' + text_separators + '|' + re.src_ZPCc + ')' + re.src_Any + ')';
      // The same as abothe but without [0-9]
      // var src_pseudo_letter_non_d = '(?:(?![0-9]|' + src_ZPCc + ')' + src_Any + ')';

      ////////////////////////////////////////////////////////////////////////////////

      re.src_ip4 =

        '(?:(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)';

      // Prohibit any of "@/[]()" in user/pass to avoid wrong domain fetch.
      re.src_auth    = '(?:(?:(?!' + re.src_ZCc + '|[@/\\[\\]()]).)+@)?';

      re.src_port =

        '(?::(?:6(?:[0-4]\\d{3}|5(?:[0-4]\\d{2}|5(?:[0-2]\\d|3[0-5])))|[1-5]?\\d{1,4}))?';

      re.src_host_terminator =

        '(?=$|' + text_separators + '|' + re.src_ZPCc + ')(?!-|_|:\\d|\\.-|\\.(?!$|' + re.src_ZPCc + '))';

      re.src_path =

        '(?:' +
          '[/?#]' +
            '(?:' +
              '(?!' + re.src_ZCc + '|' + text_separators + '|[()[\\]{}.,"\'?!\\-]).|' +
              '\\[(?:(?!' + re.src_ZCc + '|\\]).)*\\]|' +
              '\\((?:(?!' + re.src_ZCc + '|[)]).)*\\)|' +
              '\\{(?:(?!' + re.src_ZCc + '|[}]).)*\\}|' +
              '\\"(?:(?!' + re.src_ZCc + '|["]).)+\\"|' +
              "\\'(?:(?!" + re.src_ZCc + "|[']).)+\\'|" +
              "\\'(?=" + re.src_pseudo_letter + '|[-]).|' +  // allow `I'm_king` if no pair found
              '\\.{2,4}[a-zA-Z0-9%/]|' + // github has ... in commit range links,
                                         // google has .... in links (issue #66)
                                         // Restrict to
                                         // - english
                                         // - percent-encoded
                                         // - parts of file path
                                         // until more examples found.
              '\\.(?!' + re.src_ZCc + '|[.]).|' +
              (opts && opts['---'] ?
                '\\-(?!--(?:[^-]|$))(?:-*)|' // `---` => long dash, terminate
                :
                '\\-+|'
              ) +
              '\\,(?!' + re.src_ZCc + ').|' +      // allow `,,,` in paths
              '\\!(?!' + re.src_ZCc + '|[!]).|' +
              '\\?(?!' + re.src_ZCc + '|[?]).' +
            ')+' +
          '|\\/' +
        ')?';

      // Allow anything in markdown spec, forbid quote (") at the first position
      // because emails enclosed in quotes are far more common
      re.src_email_name =

        '[\\-;:&=\\+\\$,\\.a-zA-Z0-9_][\\-;:&=\\+\\$,\\"\\.a-zA-Z0-9_]*';

      re.src_xn =

        'xn--[a-z0-9\\-]{1,59}';

      // More to read about domain names
      // http://serverfault.com/questions/638260/

      re.src_domain_root =

        // Allow letters & digits (http://test1)
        '(?:' +
          re.src_xn +
          '|' +
          re.src_pseudo_letter + '{1,63}' +
        ')';

      re.src_domain =

        '(?:' +
          re.src_xn +
          '|' +
          '(?:' + re.src_pseudo_letter + ')' +
          '|' +
          '(?:' + re.src_pseudo_letter + '(?:-|' + re.src_pseudo_letter + '){0,61}' + re.src_pseudo_letter + ')' +
        ')';

      re.src_host =

        '(?:' +
        // Don't need IP check, because digits are already allowed in normal domain names
        //   src_ip4 +
        // '|' +
          '(?:(?:(?:' + re.src_domain + ')\\.)*' + re.src_domain/*_root*/ + ')' +
        ')';

      re.tpl_host_fuzzy =

        '(?:' +
          re.src_ip4 +
        '|' +
          '(?:(?:(?:' + re.src_domain + ')\\.)+(?:%TLDS%))' +
        ')';

      re.tpl_host_no_ip_fuzzy =

        '(?:(?:(?:' + re.src_domain + ')\\.)+(?:%TLDS%))';

      re.src_host_strict =

        re.src_host + re.src_host_terminator;

      re.tpl_host_fuzzy_strict =

        re.tpl_host_fuzzy + re.src_host_terminator;

      re.src_host_port_strict =

        re.src_host + re.src_port + re.src_host_terminator;

      re.tpl_host_port_fuzzy_strict =

        re.tpl_host_fuzzy + re.src_port + re.src_host_terminator;

      re.tpl_host_port_no_ip_fuzzy_strict =

        re.tpl_host_no_ip_fuzzy + re.src_port + re.src_host_terminator;


      ////////////////////////////////////////////////////////////////////////////////
      // Main rules

      // Rude test fuzzy links by host, for quick deny
      re.tpl_host_fuzzy_test =

        'localhost|www\\.|\\.\\d{1,3}\\.|(?:\\.(?:%TLDS%)(?:' + re.src_ZPCc + '|>|$))';

      re.tpl_email_fuzzy =

          '(^|' + text_separators + '|"|\\(|' + re.src_ZCc + ')' +
          '(' + re.src_email_name + '@' + re.tpl_host_fuzzy_strict + ')';

      re.tpl_link_fuzzy =
          // Fuzzy link can't be prepended with .:/\- and non punctuation.
          // but can start with > (markdown blockquote)
          '(^|(?![.:/\\-_@])(?:[$+<=>^`|\uff5c]|' + re.src_ZPCc + '))' +
          '((?![$+<=>^`|\uff5c])' + re.tpl_host_port_fuzzy_strict + re.src_path + ')';

      re.tpl_link_no_ip_fuzzy =
          // Fuzzy link can't be prepended with .:/\- and non punctuation.
          // but can start with > (markdown blockquote)
          '(^|(?![.:/\\-_@])(?:[$+<=>^`|\uff5c]|' + re.src_ZPCc + '))' +
          '((?![$+<=>^`|\uff5c])' + re.tpl_host_port_no_ip_fuzzy_strict + re.src_path + ')';

      return re;
    };

    ////////////////////////////////////////////////////////////////////////////////
    // Helpers

    // Merge objects
    //
    function assign$1(obj /*from1, from2, from3, ...*/) {
      var sources = Array.prototype.slice.call(arguments, 1);

      sources.forEach(function (source) {
        if (!source) { return; }

        Object.keys(source).forEach(function (key) {
          obj[key] = source[key];
        });
      });

      return obj;
    }

    function _class(obj) { return Object.prototype.toString.call(obj); }
    function isString(obj) { return _class(obj) === '[object String]'; }
    function isObject(obj) { return _class(obj) === '[object Object]'; }
    function isRegExp(obj) { return _class(obj) === '[object RegExp]'; }
    function isFunction(obj) { return _class(obj) === '[object Function]'; }


    function escapeRE(str) { return str.replace(/[.?*+^$[\]\\(){}|-]/g, '\\$&'); }

    ////////////////////////////////////////////////////////////////////////////////


    var defaultOptions = {
      fuzzyLink: true,
      fuzzyEmail: true,
      fuzzyIP: false
    };


    function isOptionsObj(obj) {
      return Object.keys(obj || {}).reduce(function (acc, k) {
        return acc || defaultOptions.hasOwnProperty(k);
      }, false);
    }


    var defaultSchemas = {
      'http:': {
        validate: function (text, pos, self) {
          var tail = text.slice(pos);

          if (!self.re.http) {
            // compile lazily, because "host"-containing variables can change on tlds update.
            self.re.http =  new RegExp(
              '^\\/\\/' + self.re.src_auth + self.re.src_host_port_strict + self.re.src_path, 'i'
            );
          }
          if (self.re.http.test(tail)) {
            return tail.match(self.re.http)[0].length;
          }
          return 0;
        }
      },
      'https:':  'http:',
      'ftp:':    'http:',
      '//':      {
        validate: function (text, pos, self) {
          var tail = text.slice(pos);

          if (!self.re.no_http) {
          // compile lazily, because "host"-containing variables can change on tlds update.
            self.re.no_http =  new RegExp(
              '^' +
              self.re.src_auth +
              // Don't allow single-level domains, because of false positives like '//test'
              // with code comments
              '(?:localhost|(?:(?:' + self.re.src_domain + ')\\.)+' + self.re.src_domain_root + ')' +
              self.re.src_port +
              self.re.src_host_terminator +
              self.re.src_path,

              'i'
            );
          }

          if (self.re.no_http.test(tail)) {
            // should not be `://` & `///`, that protects from errors in protocol name
            if (pos >= 3 && text[pos - 3] === ':') { return 0; }
            if (pos >= 3 && text[pos - 3] === '/') { return 0; }
            return tail.match(self.re.no_http)[0].length;
          }
          return 0;
        }
      },
      'mailto:': {
        validate: function (text, pos, self) {
          var tail = text.slice(pos);

          if (!self.re.mailto) {
            self.re.mailto =  new RegExp(
              '^' + self.re.src_email_name + '@' + self.re.src_host_strict, 'i'
            );
          }
          if (self.re.mailto.test(tail)) {
            return tail.match(self.re.mailto)[0].length;
          }
          return 0;
        }
      }
    };

    /*eslint-disable max-len*/

    // RE pattern for 2-character tlds (autogenerated by ./support/tlds_2char_gen.js)
    var tlds_2ch_src_re = 'a[cdefgilmnoqrstuwxz]|b[abdefghijmnorstvwyz]|c[acdfghiklmnoruvwxyz]|d[ejkmoz]|e[cegrstu]|f[ijkmor]|g[abdefghilmnpqrstuwy]|h[kmnrtu]|i[delmnoqrst]|j[emop]|k[eghimnprwyz]|l[abcikrstuvy]|m[acdeghklmnopqrstuvwxyz]|n[acefgilopruz]|om|p[aefghklmnrstwy]|qa|r[eosuw]|s[abcdeghijklmnortuvxyz]|t[cdfghjklmnortvwz]|u[agksyz]|v[aceginu]|w[fs]|y[et]|z[amw]';

    // DON'T try to make PRs with changes. Extend TLDs with LinkifyIt.tlds() instead
    var tlds_default = 'biz|com|edu|gov|net|org|pro|web|xxx|aero|asia|coop|info|museum|name|shop|рф'.split('|');

    /*eslint-enable max-len*/

    ////////////////////////////////////////////////////////////////////////////////

    function resetScanCache(self) {
      self.__index__ = -1;
      self.__text_cache__   = '';
    }

    function createValidator(re) {
      return function (text, pos) {
        var tail = text.slice(pos);

        if (re.test(tail)) {
          return tail.match(re)[0].length;
        }
        return 0;
      };
    }

    function createNormalizer() {
      return function (match, self) {
        self.normalize(match);
      };
    }

    // Schemas compiler. Build regexps.
    //
    function compile(self) {

      // Load & clone RE patterns.
      var re$1 = self.re = re(self.__opts__);

      // Define dynamic patterns
      var tlds = self.__tlds__.slice();

      self.onCompile();

      if (!self.__tlds_replaced__) {
        tlds.push(tlds_2ch_src_re);
      }
      tlds.push(re$1.src_xn);

      re$1.src_tlds = tlds.join('|');

      function untpl(tpl) { return tpl.replace('%TLDS%', re$1.src_tlds); }

      re$1.email_fuzzy      = RegExp(untpl(re$1.tpl_email_fuzzy), 'i');
      re$1.link_fuzzy       = RegExp(untpl(re$1.tpl_link_fuzzy), 'i');
      re$1.link_no_ip_fuzzy = RegExp(untpl(re$1.tpl_link_no_ip_fuzzy), 'i');
      re$1.host_fuzzy_test  = RegExp(untpl(re$1.tpl_host_fuzzy_test), 'i');

      //
      // Compile each schema
      //

      var aliases = [];

      self.__compiled__ = {}; // Reset compiled data

      function schemaError(name, val) {
        throw new Error('(LinkifyIt) Invalid schema "' + name + '": ' + val);
      }

      Object.keys(self.__schemas__).forEach(function (name) {
        var val = self.__schemas__[name];

        // skip disabled methods
        if (val === null) { return; }

        var compiled = { validate: null, link: null };

        self.__compiled__[name] = compiled;

        if (isObject(val)) {
          if (isRegExp(val.validate)) {
            compiled.validate = createValidator(val.validate);
          } else if (isFunction(val.validate)) {
            compiled.validate = val.validate;
          } else {
            schemaError(name, val);
          }

          if (isFunction(val.normalize)) {
            compiled.normalize = val.normalize;
          } else if (!val.normalize) {
            compiled.normalize = createNormalizer();
          } else {
            schemaError(name, val);
          }

          return;
        }

        if (isString(val)) {
          aliases.push(name);
          return;
        }

        schemaError(name, val);
      });

      //
      // Compile postponed aliases
      //

      aliases.forEach(function (alias) {
        if (!self.__compiled__[self.__schemas__[alias]]) {
          // Silently fail on missed schemas to avoid errons on disable.
          // schemaError(alias, self.__schemas__[alias]);
          return;
        }

        self.__compiled__[alias].validate =
          self.__compiled__[self.__schemas__[alias]].validate;
        self.__compiled__[alias].normalize =
          self.__compiled__[self.__schemas__[alias]].normalize;
      });

      //
      // Fake record for guessed links
      //
      self.__compiled__[''] = { validate: null, normalize: createNormalizer() };

      //
      // Build schema condition
      //
      var slist = Object.keys(self.__compiled__)
                          .filter(function (name) {
                            // Filter disabled & fake schemas
                            return name.length > 0 && self.__compiled__[name];
                          })
                          .map(escapeRE)
                          .join('|');
      // (?!_) cause 1.5x slowdown
      self.re.schema_test   = RegExp('(^|(?!_)(?:[><\uff5c]|' + re$1.src_ZPCc + '))(' + slist + ')', 'i');
      self.re.schema_search = RegExp('(^|(?!_)(?:[><\uff5c]|' + re$1.src_ZPCc + '))(' + slist + ')', 'ig');

      self.re.pretest = RegExp(
        '(' + self.re.schema_test.source + ')|(' + self.re.host_fuzzy_test.source + ')|@',
        'i'
      );

      //
      // Cleanup
      //

      resetScanCache(self);
    }

    /**
     * class Match
     *
     * Match result. Single element of array, returned by [[LinkifyIt#match]]
     **/
    function Match(self, shift) {
      var start = self.__index__,
          end   = self.__last_index__,
          text  = self.__text_cache__.slice(start, end);

      /**
       * Match#schema -> String
       *
       * Prefix (protocol) for matched string.
       **/
      this.schema    = self.__schema__.toLowerCase();
      /**
       * Match#index -> Number
       *
       * First position of matched string.
       **/
      this.index     = start + shift;
      /**
       * Match#lastIndex -> Number
       *
       * Next position after matched string.
       **/
      this.lastIndex = end + shift;
      /**
       * Match#raw -> String
       *
       * Matched string.
       **/
      this.raw       = text;
      /**
       * Match#text -> String
       *
       * Notmalized text of matched string.
       **/
      this.text      = text;
      /**
       * Match#url -> String
       *
       * Normalized url of matched string.
       **/
      this.url       = text;
    }

    function createMatch(self, shift) {
      var match = new Match(self, shift);

      self.__compiled__[match.schema].normalize(match, self);

      return match;
    }


    /**
     * class LinkifyIt
     **/

    /**
     * new LinkifyIt(schemas, options)
     * - schemas (Object): Optional. Additional schemas to validate (prefix/validator)
     * - options (Object): { fuzzyLink|fuzzyEmail|fuzzyIP: true|false }
     *
     * Creates new linkifier instance with optional additional schemas.
     * Can be called without `new` keyword for convenience.
     *
     * By default understands:
     *
     * - `http(s)://...` , `ftp://...`, `mailto:...` & `//...` links
     * - "fuzzy" links and emails (example.com, foo@bar.com).
     *
     * `schemas` is an object, where each key/value describes protocol/rule:
     *
     * - __key__ - link prefix (usually, protocol name with `:` at the end, `skype:`
     *   for example). `linkify-it` makes shure that prefix is not preceeded with
     *   alphanumeric char and symbols. Only whitespaces and punctuation allowed.
     * - __value__ - rule to check tail after link prefix
     *   - _String_ - just alias to existing rule
     *   - _Object_
     *     - _validate_ - validator function (should return matched length on success),
     *       or `RegExp`.
     *     - _normalize_ - optional function to normalize text & url of matched result
     *       (for example, for @twitter mentions).
     *
     * `options`:
     *
     * - __fuzzyLink__ - recognige URL-s without `http(s):` prefix. Default `true`.
     * - __fuzzyIP__ - allow IPs in fuzzy links above. Can conflict with some texts
     *   like version numbers. Default `false`.
     * - __fuzzyEmail__ - recognize emails without `mailto:` prefix.
     *
     **/
    function LinkifyIt(schemas, options) {
      if (!(this instanceof LinkifyIt)) {
        return new LinkifyIt(schemas, options);
      }

      if (!options) {
        if (isOptionsObj(schemas)) {
          options = schemas;
          schemas = {};
        }
      }

      this.__opts__           = assign$1({}, defaultOptions, options);

      // Cache last tested result. Used to skip repeating steps on next `match` call.
      this.__index__          = -1;
      this.__last_index__     = -1; // Next scan position
      this.__schema__         = '';
      this.__text_cache__     = '';

      this.__schemas__        = assign$1({}, defaultSchemas, schemas);
      this.__compiled__       = {};

      this.__tlds__           = tlds_default;
      this.__tlds_replaced__  = false;

      this.re = {};

      compile(this);
    }


    /** chainable
     * LinkifyIt#add(schema, definition)
     * - schema (String): rule name (fixed pattern prefix)
     * - definition (String|RegExp|Object): schema definition
     *
     * Add new rule definition. See constructor description for details.
     **/
    LinkifyIt.prototype.add = function add(schema, definition) {
      this.__schemas__[schema] = definition;
      compile(this);
      return this;
    };


    /** chainable
     * LinkifyIt#set(options)
     * - options (Object): { fuzzyLink|fuzzyEmail|fuzzyIP: true|false }
     *
     * Set recognition options for links without schema.
     **/
    LinkifyIt.prototype.set = function set(options) {
      this.__opts__ = assign$1(this.__opts__, options);
      return this;
    };


    /**
     * LinkifyIt#test(text) -> Boolean
     *
     * Searches linkifiable pattern and returns `true` on success or `false` on fail.
     **/
    LinkifyIt.prototype.test = function test(text) {
      // Reset scan cache
      this.__text_cache__ = text;
      this.__index__      = -1;

      if (!text.length) { return false; }

      var m, ml, me, len, shift, next, re, tld_pos, at_pos;

      // try to scan for link with schema - that's the most simple rule
      if (this.re.schema_test.test(text)) {
        re = this.re.schema_search;
        re.lastIndex = 0;
        while ((m = re.exec(text)) !== null) {
          len = this.testSchemaAt(text, m[2], re.lastIndex);
          if (len) {
            this.__schema__     = m[2];
            this.__index__      = m.index + m[1].length;
            this.__last_index__ = m.index + m[0].length + len;
            break;
          }
        }
      }

      if (this.__opts__.fuzzyLink && this.__compiled__['http:']) {
        // guess schemaless links
        tld_pos = text.search(this.re.host_fuzzy_test);
        if (tld_pos >= 0) {
          // if tld is located after found link - no need to check fuzzy pattern
          if (this.__index__ < 0 || tld_pos < this.__index__) {
            if ((ml = text.match(this.__opts__.fuzzyIP ? this.re.link_fuzzy : this.re.link_no_ip_fuzzy)) !== null) {

              shift = ml.index + ml[1].length;

              if (this.__index__ < 0 || shift < this.__index__) {
                this.__schema__     = '';
                this.__index__      = shift;
                this.__last_index__ = ml.index + ml[0].length;
              }
            }
          }
        }
      }

      if (this.__opts__.fuzzyEmail && this.__compiled__['mailto:']) {
        // guess schemaless emails
        at_pos = text.indexOf('@');
        if (at_pos >= 0) {
          // We can't skip this check, because this cases are possible:
          // 192.168.1.1@gmail.com, my.in@example.com
          if ((me = text.match(this.re.email_fuzzy)) !== null) {

            shift = me.index + me[1].length;
            next  = me.index + me[0].length;

            if (this.__index__ < 0 || shift < this.__index__ ||
                (shift === this.__index__ && next > this.__last_index__)) {
              this.__schema__     = 'mailto:';
              this.__index__      = shift;
              this.__last_index__ = next;
            }
          }
        }
      }

      return this.__index__ >= 0;
    };


    /**
     * LinkifyIt#pretest(text) -> Boolean
     *
     * Very quick check, that can give false positives. Returns true if link MAY BE
     * can exists. Can be used for speed optimization, when you need to check that
     * link NOT exists.
     **/
    LinkifyIt.prototype.pretest = function pretest(text) {
      return this.re.pretest.test(text);
    };


    /**
     * LinkifyIt#testSchemaAt(text, name, position) -> Number
     * - text (String): text to scan
     * - name (String): rule (schema) name
     * - position (Number): text offset to check from
     *
     * Similar to [[LinkifyIt#test]] but checks only specific protocol tail exactly
     * at given position. Returns length of found pattern (0 on fail).
     **/
    LinkifyIt.prototype.testSchemaAt = function testSchemaAt(text, schema, pos) {
      // If not supported schema check requested - terminate
      if (!this.__compiled__[schema.toLowerCase()]) {
        return 0;
      }
      return this.__compiled__[schema.toLowerCase()].validate(text, pos, this);
    };


    /**
     * LinkifyIt#match(text) -> Array|null
     *
     * Returns array of found link descriptions or `null` on fail. We strongly
     * recommend to use [[LinkifyIt#test]] first, for best speed.
     *
     * ##### Result match description
     *
     * - __schema__ - link schema, can be empty for fuzzy links, or `//` for
     *   protocol-neutral  links.
     * - __index__ - offset of matched text
     * - __lastIndex__ - index of next char after mathch end
     * - __raw__ - matched text
     * - __text__ - normalized text
     * - __url__ - link, generated from matched text
     **/
    LinkifyIt.prototype.match = function match(text) {
      var shift = 0, result = [];

      // Try to take previous element from cache, if .test() called before
      if (this.__index__ >= 0 && this.__text_cache__ === text) {
        result.push(createMatch(this, shift));
        shift = this.__last_index__;
      }

      // Cut head if cache was used
      var tail = shift ? text.slice(shift) : text;

      // Scan string until end reached
      while (this.test(tail)) {
        result.push(createMatch(this, shift));

        tail = tail.slice(this.__last_index__);
        shift += this.__last_index__;
      }

      if (result.length) {
        return result;
      }

      return null;
    };


    /** chainable
     * LinkifyIt#tlds(list [, keepOld]) -> this
     * - list (Array): list of tlds
     * - keepOld (Boolean): merge with current list if `true` (`false` by default)
     *
     * Load (or merge) new tlds list. Those are user for fuzzy links (without prefix)
     * to avoid false positives. By default this algorythm used:
     *
     * - hostname with any 2-letter root zones are ok.
     * - biz|com|edu|gov|net|org|pro|web|xxx|aero|asia|coop|info|museum|name|shop|рф
     *   are ok.
     * - encoded (`xn--...`) root zones are ok.
     *
     * If list is replaced, then exact match for 2-chars root zones will be checked.
     **/
    LinkifyIt.prototype.tlds = function tlds(list, keepOld) {
      list = Array.isArray(list) ? list : [ list ];

      if (!keepOld) {
        this.__tlds__ = list.slice();
        this.__tlds_replaced__ = true;
        compile(this);
        return this;
      }

      this.__tlds__ = this.__tlds__.concat(list)
                                      .sort()
                                      .filter(function (el, idx, arr) {
                                        return el !== arr[idx - 1];
                                      })
                                      .reverse();

      compile(this);
      return this;
    };

    /**
     * LinkifyIt#normalize(match)
     *
     * Default normalizer (if schema does not define it's own).
     **/
    LinkifyIt.prototype.normalize = function normalize(match) {

      // Do minimal possible changes by default. Need to collect feedback prior
      // to move forward https://github.com/markdown-it/linkify-it/issues/1

      if (!match.schema) { match.url = 'http://' + match.url; }

      if (match.schema === 'mailto:' && !/^mailto:/i.test(match.url)) {
        match.url = 'mailto:' + match.url;
      }
    };


    /**
     * LinkifyIt#onCompile()
     *
     * Override to modify basic RegExp-s.
     **/
    LinkifyIt.prototype.onCompile = function onCompile() {
    };


    var linkifyIt = LinkifyIt;

    /** Highest positive signed 32-bit float value */
    const maxInt = 2147483647; // aka. 0x7FFFFFFF or 2^31-1

    /** Bootstring parameters */
    const base = 36;
    const tMin = 1;
    const tMax = 26;
    const skew = 38;
    const damp = 700;
    const initialBias = 72;
    const initialN = 128; // 0x80
    const delimiter = '-'; // '\x2D'

    /** Regular expressions */
    const regexPunycode = /^xn--/;
    const regexNonASCII = /[^\0-\x7E]/; // non-ASCII chars
    const regexSeparators = /[\x2E\u3002\uFF0E\uFF61]/g; // RFC 3490 separators

    /** Error messages */
    const errors = {
    	'overflow': 'Overflow: input needs wider integers to process',
    	'not-basic': 'Illegal input >= 0x80 (not a basic code point)',
    	'invalid-input': 'Invalid input'
    };

    /** Convenience shortcuts */
    const baseMinusTMin = base - tMin;
    const floor = Math.floor;
    const stringFromCharCode = String.fromCharCode;

    /*--------------------------------------------------------------------------*/

    /**
     * A generic error utility function.
     * @private
     * @param {String} type The error type.
     * @returns {Error} Throws a `RangeError` with the applicable error message.
     */
    function error(type) {
    	throw new RangeError(errors[type]);
    }

    /**
     * A generic `Array#map` utility function.
     * @private
     * @param {Array} array The array to iterate over.
     * @param {Function} callback The function that gets called for every array
     * item.
     * @returns {Array} A new array of values returned by the callback function.
     */
    function map$1(array, fn) {
    	const result = [];
    	let length = array.length;
    	while (length--) {
    		result[length] = fn(array[length]);
    	}
    	return result;
    }

    /**
     * A simple `Array#map`-like wrapper to work with domain name strings or email
     * addresses.
     * @private
     * @param {String} domain The domain name or email address.
     * @param {Function} callback The function that gets called for every
     * character.
     * @returns {Array} A new string of characters returned by the callback
     * function.
     */
    function mapDomain(string, fn) {
    	const parts = string.split('@');
    	let result = '';
    	if (parts.length > 1) {
    		// In email addresses, only the domain name should be punycoded. Leave
    		// the local part (i.e. everything up to `@`) intact.
    		result = parts[0] + '@';
    		string = parts[1];
    	}
    	// Avoid `split(regex)` for IE8 compatibility. See #17.
    	string = string.replace(regexSeparators, '\x2E');
    	const labels = string.split('.');
    	const encoded = map$1(labels, fn).join('.');
    	return result + encoded;
    }

    /**
     * Creates an array containing the numeric code points of each Unicode
     * character in the string. While JavaScript uses UCS-2 internally,
     * this function will convert a pair of surrogate halves (each of which
     * UCS-2 exposes as separate characters) into a single code point,
     * matching UTF-16.
     * @see `punycode.ucs2.encode`
     * @see <https://mathiasbynens.be/notes/javascript-encoding>
     * @memberOf punycode.ucs2
     * @name decode
     * @param {String} string The Unicode input string (UCS-2).
     * @returns {Array} The new array of code points.
     */
    function ucs2decode(string) {
    	const output = [];
    	let counter = 0;
    	const length = string.length;
    	while (counter < length) {
    		const value = string.charCodeAt(counter++);
    		if (value >= 0xD800 && value <= 0xDBFF && counter < length) {
    			// It's a high surrogate, and there is a next character.
    			const extra = string.charCodeAt(counter++);
    			if ((extra & 0xFC00) == 0xDC00) { // Low surrogate.
    				output.push(((value & 0x3FF) << 10) + (extra & 0x3FF) + 0x10000);
    			} else {
    				// It's an unmatched surrogate; only append this code unit, in case the
    				// next code unit is the high surrogate of a surrogate pair.
    				output.push(value);
    				counter--;
    			}
    		} else {
    			output.push(value);
    		}
    	}
    	return output;
    }

    /**
     * Creates a string based on an array of numeric code points.
     * @see `punycode.ucs2.decode`
     * @memberOf punycode.ucs2
     * @name encode
     * @param {Array} codePoints The array of numeric code points.
     * @returns {String} The new Unicode string (UCS-2).
     */
    const ucs2encode = array => String.fromCodePoint(...array);

    /**
     * Converts a basic code point into a digit/integer.
     * @see `digitToBasic()`
     * @private
     * @param {Number} codePoint The basic numeric code point value.
     * @returns {Number} The numeric value of a basic code point (for use in
     * representing integers) in the range `0` to `base - 1`, or `base` if
     * the code point does not represent a value.
     */
    const basicToDigit = function(codePoint) {
    	if (codePoint - 0x30 < 0x0A) {
    		return codePoint - 0x16;
    	}
    	if (codePoint - 0x41 < 0x1A) {
    		return codePoint - 0x41;
    	}
    	if (codePoint - 0x61 < 0x1A) {
    		return codePoint - 0x61;
    	}
    	return base;
    };

    /**
     * Converts a digit/integer into a basic code point.
     * @see `basicToDigit()`
     * @private
     * @param {Number} digit The numeric value of a basic code point.
     * @returns {Number} The basic code point whose value (when used for
     * representing integers) is `digit`, which needs to be in the range
     * `0` to `base - 1`. If `flag` is non-zero, the uppercase form is
     * used; else, the lowercase form is used. The behavior is undefined
     * if `flag` is non-zero and `digit` has no uppercase form.
     */
    const digitToBasic = function(digit, flag) {
    	//  0..25 map to ASCII a..z or A..Z
    	// 26..35 map to ASCII 0..9
    	return digit + 22 + 75 * (digit < 26) - ((flag != 0) << 5);
    };

    /**
     * Bias adaptation function as per section 3.4 of RFC 3492.
     * https://tools.ietf.org/html/rfc3492#section-3.4
     * @private
     */
    const adapt = function(delta, numPoints, firstTime) {
    	let k = 0;
    	delta = firstTime ? floor(delta / damp) : delta >> 1;
    	delta += floor(delta / numPoints);
    	for (/* no initialization */; delta > baseMinusTMin * tMax >> 1; k += base) {
    		delta = floor(delta / baseMinusTMin);
    	}
    	return floor(k + (baseMinusTMin + 1) * delta / (delta + skew));
    };

    /**
     * Converts a Punycode string of ASCII-only symbols to a string of Unicode
     * symbols.
     * @memberOf punycode
     * @param {String} input The Punycode string of ASCII-only symbols.
     * @returns {String} The resulting string of Unicode symbols.
     */
    const decode$2 = function(input) {
    	// Don't use UCS-2.
    	const output = [];
    	const inputLength = input.length;
    	let i = 0;
    	let n = initialN;
    	let bias = initialBias;

    	// Handle the basic code points: let `basic` be the number of input code
    	// points before the last delimiter, or `0` if there is none, then copy
    	// the first basic code points to the output.

    	let basic = input.lastIndexOf(delimiter);
    	if (basic < 0) {
    		basic = 0;
    	}

    	for (let j = 0; j < basic; ++j) {
    		// if it's not a basic code point
    		if (input.charCodeAt(j) >= 0x80) {
    			error('not-basic');
    		}
    		output.push(input.charCodeAt(j));
    	}

    	// Main decoding loop: start just after the last delimiter if any basic code
    	// points were copied; start at the beginning otherwise.

    	for (let index = basic > 0 ? basic + 1 : 0; index < inputLength; /* no final expression */) {

    		// `index` is the index of the next character to be consumed.
    		// Decode a generalized variable-length integer into `delta`,
    		// which gets added to `i`. The overflow checking is easier
    		// if we increase `i` as we go, then subtract off its starting
    		// value at the end to obtain `delta`.
    		let oldi = i;
    		for (let w = 1, k = base; /* no condition */; k += base) {

    			if (index >= inputLength) {
    				error('invalid-input');
    			}

    			const digit = basicToDigit(input.charCodeAt(index++));

    			if (digit >= base || digit > floor((maxInt - i) / w)) {
    				error('overflow');
    			}

    			i += digit * w;
    			const t = k <= bias ? tMin : (k >= bias + tMax ? tMax : k - bias);

    			if (digit < t) {
    				break;
    			}

    			const baseMinusT = base - t;
    			if (w > floor(maxInt / baseMinusT)) {
    				error('overflow');
    			}

    			w *= baseMinusT;

    		}

    		const out = output.length + 1;
    		bias = adapt(i - oldi, out, oldi == 0);

    		// `i` was supposed to wrap around from `out` to `0`,
    		// incrementing `n` each time, so we'll fix that now:
    		if (floor(i / out) > maxInt - n) {
    			error('overflow');
    		}

    		n += floor(i / out);
    		i %= out;

    		// Insert `n` at position `i` of the output.
    		output.splice(i++, 0, n);

    	}

    	return String.fromCodePoint(...output);
    };

    /**
     * Converts a string of Unicode symbols (e.g. a domain name label) to a
     * Punycode string of ASCII-only symbols.
     * @memberOf punycode
     * @param {String} input The string of Unicode symbols.
     * @returns {String} The resulting Punycode string of ASCII-only symbols.
     */
    const encode$2 = function(input) {
    	const output = [];

    	// Convert the input in UCS-2 to an array of Unicode code points.
    	input = ucs2decode(input);

    	// Cache the length.
    	let inputLength = input.length;

    	// Initialize the state.
    	let n = initialN;
    	let delta = 0;
    	let bias = initialBias;

    	// Handle the basic code points.
    	for (const currentValue of input) {
    		if (currentValue < 0x80) {
    			output.push(stringFromCharCode(currentValue));
    		}
    	}

    	let basicLength = output.length;
    	let handledCPCount = basicLength;

    	// `handledCPCount` is the number of code points that have been handled;
    	// `basicLength` is the number of basic code points.

    	// Finish the basic string with a delimiter unless it's empty.
    	if (basicLength) {
    		output.push(delimiter);
    	}

    	// Main encoding loop:
    	while (handledCPCount < inputLength) {

    		// All non-basic code points < n have been handled already. Find the next
    		// larger one:
    		let m = maxInt;
    		for (const currentValue of input) {
    			if (currentValue >= n && currentValue < m) {
    				m = currentValue;
    			}
    		}

    		// Increase `delta` enough to advance the decoder's <n,i> state to <m,0>,
    		// but guard against overflow.
    		const handledCPCountPlusOne = handledCPCount + 1;
    		if (m - n > floor((maxInt - delta) / handledCPCountPlusOne)) {
    			error('overflow');
    		}

    		delta += (m - n) * handledCPCountPlusOne;
    		n = m;

    		for (const currentValue of input) {
    			if (currentValue < n && ++delta > maxInt) {
    				error('overflow');
    			}
    			if (currentValue == n) {
    				// Represent delta as a generalized variable-length integer.
    				let q = delta;
    				for (let k = base; /* no condition */; k += base) {
    					const t = k <= bias ? tMin : (k >= bias + tMax ? tMax : k - bias);
    					if (q < t) {
    						break;
    					}
    					const qMinusT = q - t;
    					const baseMinusT = base - t;
    					output.push(
    						stringFromCharCode(digitToBasic(t + qMinusT % baseMinusT, 0))
    					);
    					q = floor(qMinusT / baseMinusT);
    				}

    				output.push(stringFromCharCode(digitToBasic(q, 0)));
    				bias = adapt(delta, handledCPCountPlusOne, handledCPCount == basicLength);
    				delta = 0;
    				++handledCPCount;
    			}
    		}

    		++delta;
    		++n;

    	}
    	return output.join('');
    };

    /**
     * Converts a Punycode string representing a domain name or an email address
     * to Unicode. Only the Punycoded parts of the input will be converted, i.e.
     * it doesn't matter if you call it on a string that has already been
     * converted to Unicode.
     * @memberOf punycode
     * @param {String} input The Punycoded domain name or email address to
     * convert to Unicode.
     * @returns {String} The Unicode representation of the given Punycode
     * string.
     */
    const toUnicode = function(input) {
    	return mapDomain(input, function(string) {
    		return regexPunycode.test(string)
    			? decode$2(string.slice(4).toLowerCase())
    			: string;
    	});
    };

    /**
     * Converts a Unicode string representing a domain name or an email address to
     * Punycode. Only the non-ASCII parts of the domain name will be converted,
     * i.e. it doesn't matter if you call it with a domain that's already in
     * ASCII.
     * @memberOf punycode
     * @param {String} input The domain name or email address to convert, as a
     * Unicode string.
     * @returns {String} The Punycode representation of the given domain name or
     * email address.
     */
    const toASCII = function(input) {
    	return mapDomain(input, function(string) {
    		return regexNonASCII.test(string)
    			? 'xn--' + encode$2(string)
    			: string;
    	});
    };

    /*--------------------------------------------------------------------------*/

    /** Define the public API */
    const punycode = {
    	/**
    	 * A string representing the current Punycode.js version number.
    	 * @memberOf punycode
    	 * @type String
    	 */
    	'version': '2.1.0',
    	/**
    	 * An object of methods to convert from JavaScript's internal character
    	 * representation (UCS-2) to Unicode code points, and back.
    	 * @see <https://mathiasbynens.be/notes/javascript-encoding>
    	 * @memberOf punycode
    	 * @type Object
    	 */
    	'ucs2': {
    		'decode': ucs2decode,
    		'encode': ucs2encode
    	},
    	'decode': decode$2,
    	'encode': encode$2,
    	'toASCII': toASCII,
    	'toUnicode': toUnicode
    };

    // markdown-it default options


    var _default = {
      options: {
        html:         false,        // Enable HTML tags in source
        xhtmlOut:     false,        // Use '/' to close single tags (<br />)
        breaks:       false,        // Convert '\n' in paragraphs into <br>
        langPrefix:   'language-',  // CSS language prefix for fenced blocks
        linkify:      false,        // autoconvert URL-like texts to links

        // Enable some language-neutral replacements + quotes beautification
        typographer:  false,

        // Double + single quotes replacement pairs, when typographer enabled,
        // and smartquotes on. Could be either a String or an Array.
        //
        // For example, you can use '«»„“' for Russian, '„“‚‘' for German,
        // and ['«\xA0', '\xA0»', '‹\xA0', '\xA0›'] for French (including nbsp).
        quotes: '\u201c\u201d\u2018\u2019', /* “”‘’ */

        // Highlighter function. Should return escaped HTML,
        // or '' if the source string is not changed and should be escaped externaly.
        // If result starts with <pre... internal wrapper is skipped.
        //
        // function (/*str, lang*/) { return ''; }
        //
        highlight: null,

        maxNesting:   100            // Internal protection, recursion limit
      },

      components: {

        core: {},
        block: {},
        inline: {}
      }
    };

    // "Zero" preset, with nothing enabled. Useful for manual configuring of simple


    var zero = {
      options: {
        html:         false,        // Enable HTML tags in source
        xhtmlOut:     false,        // Use '/' to close single tags (<br />)
        breaks:       false,        // Convert '\n' in paragraphs into <br>
        langPrefix:   'language-',  // CSS language prefix for fenced blocks
        linkify:      false,        // autoconvert URL-like texts to links

        // Enable some language-neutral replacements + quotes beautification
        typographer:  false,

        // Double + single quotes replacement pairs, when typographer enabled,
        // and smartquotes on. Could be either a String or an Array.
        //
        // For example, you can use '«»„“' for Russian, '„“‚‘' for German,
        // and ['«\xA0', '\xA0»', '‹\xA0', '\xA0›'] for French (including nbsp).
        quotes: '\u201c\u201d\u2018\u2019', /* “”‘’ */

        // Highlighter function. Should return escaped HTML,
        // or '' if the source string is not changed and should be escaped externaly.
        // If result starts with <pre... internal wrapper is skipped.
        //
        // function (/*str, lang*/) { return ''; }
        //
        highlight: null,

        maxNesting:   20            // Internal protection, recursion limit
      },

      components: {

        core: {
          rules: [
            'normalize',
            'block',
            'inline'
          ]
        },

        block: {
          rules: [
            'paragraph'
          ]
        },

        inline: {
          rules: [
            'text'
          ],
          rules2: [
            'balance_pairs',
            'text_collapse'
          ]
        }
      }
    };

    // Commonmark default options


    var commonmark = {
      options: {
        html:         true,         // Enable HTML tags in source
        xhtmlOut:     true,         // Use '/' to close single tags (<br />)
        breaks:       false,        // Convert '\n' in paragraphs into <br>
        langPrefix:   'language-',  // CSS language prefix for fenced blocks
        linkify:      false,        // autoconvert URL-like texts to links

        // Enable some language-neutral replacements + quotes beautification
        typographer:  false,

        // Double + single quotes replacement pairs, when typographer enabled,
        // and smartquotes on. Could be either a String or an Array.
        //
        // For example, you can use '«»„“' for Russian, '„“‚‘' for German,
        // and ['«\xA0', '\xA0»', '‹\xA0', '\xA0›'] for French (including nbsp).
        quotes: '\u201c\u201d\u2018\u2019', /* “”‘’ */

        // Highlighter function. Should return escaped HTML,
        // or '' if the source string is not changed and should be escaped externaly.
        // If result starts with <pre... internal wrapper is skipped.
        //
        // function (/*str, lang*/) { return ''; }
        //
        highlight: null,

        maxNesting:   20            // Internal protection, recursion limit
      },

      components: {

        core: {
          rules: [
            'normalize',
            'block',
            'inline'
          ]
        },

        block: {
          rules: [
            'blockquote',
            'code',
            'fence',
            'heading',
            'hr',
            'html_block',
            'lheading',
            'list',
            'reference',
            'paragraph'
          ]
        },

        inline: {
          rules: [
            'autolink',
            'backticks',
            'emphasis',
            'entity',
            'escape',
            'html_inline',
            'image',
            'link',
            'newline',
            'text'
          ],
          rules2: [
            'balance_pairs',
            'emphasis',
            'text_collapse'
          ]
        }
      }
    };

    var config = {
      'default': _default,
      zero: zero,
      commonmark: commonmark
    };

    ////////////////////////////////////////////////////////////////////////////////
    //
    // This validator can prohibit more than really needed to prevent XSS. It's a
    // tradeoff to keep code simple and to be secure by default.
    //
    // If you need different setup - override validator method as you wish. Or
    // replace it with dummy function and use external sanitizer.
    //

    var BAD_PROTO_RE = /^(vbscript|javascript|file|data):/;
    var GOOD_DATA_RE = /^data:image\/(gif|png|jpeg|webp);/;

    function validateLink(url) {
      // url should be normalized at this point, and existing entities are decoded
      var str = url.trim().toLowerCase();

      return BAD_PROTO_RE.test(str) ? (GOOD_DATA_RE.test(str) ? true : false) : true;
    }

    ////////////////////////////////////////////////////////////////////////////////


    var RECODE_HOSTNAME_FOR = [ 'http:', 'https:', 'mailto:' ];

    function normalizeLink(url) {
      var parsed = mdurl.parse(url, true);

      if (parsed.hostname) {
        // Encode hostnames in urls like:
        // `http://host/`, `https://host/`, `mailto:user@host`, `//host/`
        //
        // We don't encode unknown schemas, because it's likely that we encode
        // something we shouldn't (e.g. `skype:name` treated as `skype:host`)
        //
        if (!parsed.protocol || RECODE_HOSTNAME_FOR.indexOf(parsed.protocol) >= 0) {
          try {
            parsed.hostname = punycode.toASCII(parsed.hostname);
          } catch (er) { /**/ }
        }
      }

      return mdurl.encode(mdurl.format(parsed));
    }

    function normalizeLinkText(url) {
      var parsed = mdurl.parse(url, true);

      if (parsed.hostname) {
        // Encode hostnames in urls like:
        // `http://host/`, `https://host/`, `mailto:user@host`, `//host/`
        //
        // We don't encode unknown schemas, because it's likely that we encode
        // something we shouldn't (e.g. `skype:name` treated as `skype:host`)
        //
        if (!parsed.protocol || RECODE_HOSTNAME_FOR.indexOf(parsed.protocol) >= 0) {
          try {
            parsed.hostname = punycode.toUnicode(parsed.hostname);
          } catch (er) { /**/ }
        }
      }

      return mdurl.decode(mdurl.format(parsed));
    }


    /**
     * class MarkdownIt
     *
     * Main parser/renderer class.
     *
     * ##### Usage
     *
     * ```javascript
     * // node.js, "classic" way:
     * var MarkdownIt = require('markdown-it'),
     *     md = new MarkdownIt();
     * var result = md.render('# markdown-it rulezz!');
     *
     * // node.js, the same, but with sugar:
     * var md = require('markdown-it')();
     * var result = md.render('# markdown-it rulezz!');
     *
     * // browser without AMD, added to "window" on script load
     * // Note, there are no dash.
     * var md = window.markdownit();
     * var result = md.render('# markdown-it rulezz!');
     * ```
     *
     * Single line rendering, without paragraph wrap:
     *
     * ```javascript
     * var md = require('markdown-it')();
     * var result = md.renderInline('__markdown-it__ rulezz!');
     * ```
     **/

    /**
     * new MarkdownIt([presetName, options])
     * - presetName (String): optional, `commonmark` / `zero`
     * - options (Object)
     *
     * Creates parser instanse with given config. Can be called without `new`.
     *
     * ##### presetName
     *
     * MarkdownIt provides named presets as a convenience to quickly
     * enable/disable active syntax rules and options for common use cases.
     *
     * - ["commonmark"](https://github.com/markdown-it/markdown-it/blob/master/lib/presets/commonmark.js) -
     *   configures parser to strict [CommonMark](http://commonmark.org/) mode.
     * - [default](https://github.com/markdown-it/markdown-it/blob/master/lib/presets/default.js) -
     *   similar to GFM, used when no preset name given. Enables all available rules,
     *   but still without html, typographer & autolinker.
     * - ["zero"](https://github.com/markdown-it/markdown-it/blob/master/lib/presets/zero.js) -
     *   all rules disabled. Useful to quickly setup your config via `.enable()`.
     *   For example, when you need only `bold` and `italic` markup and nothing else.
     *
     * ##### options:
     *
     * - __html__ - `false`. Set `true` to enable HTML tags in source. Be careful!
     *   That's not safe! You may need external sanitizer to protect output from XSS.
     *   It's better to extend features via plugins, instead of enabling HTML.
     * - __xhtmlOut__ - `false`. Set `true` to add '/' when closing single tags
     *   (`<br />`). This is needed only for full CommonMark compatibility. In real
     *   world you will need HTML output.
     * - __breaks__ - `false`. Set `true` to convert `\n` in paragraphs into `<br>`.
     * - __langPrefix__ - `language-`. CSS language class prefix for fenced blocks.
     *   Can be useful for external highlighters.
     * - __linkify__ - `false`. Set `true` to autoconvert URL-like text to links.
     * - __typographer__  - `false`. Set `true` to enable [some language-neutral
     *   replacement](https://github.com/markdown-it/markdown-it/blob/master/lib/rules_core/replacements.js) +
     *   quotes beautification (smartquotes).
     * - __quotes__ - `“”‘’`, String or Array. Double + single quotes replacement
     *   pairs, when typographer enabled and smartquotes on. For example, you can
     *   use `'«»„“'` for Russian, `'„“‚‘'` for German, and
     *   `['«\xA0', '\xA0»', '‹\xA0', '\xA0›']` for French (including nbsp).
     * - __highlight__ - `null`. Highlighter function for fenced code blocks.
     *   Highlighter `function (str, lang)` should return escaped HTML. It can also
     *   return empty string if the source was not changed and should be escaped
     *   externaly. If result starts with <pre... internal wrapper is skipped.
     *
     * ##### Example
     *
     * ```javascript
     * // commonmark mode
     * var md = require('markdown-it')('commonmark');
     *
     * // default mode
     * var md = require('markdown-it')();
     *
     * // enable everything
     * var md = require('markdown-it')({
     *   html: true,
     *   linkify: true,
     *   typographer: true
     * });
     * ```
     *
     * ##### Syntax highlighting
     *
     * ```js
     * var hljs = require('highlight.js') // https://highlightjs.org/
     *
     * var md = require('markdown-it')({
     *   highlight: function (str, lang) {
     *     if (lang && hljs.getLanguage(lang)) {
     *       try {
     *         return hljs.highlight(lang, str, true).value;
     *       } catch (__) {}
     *     }
     *
     *     return ''; // use external default escaping
     *   }
     * });
     * ```
     *
     * Or with full wrapper override (if you need assign class to `<pre>`):
     *
     * ```javascript
     * var hljs = require('highlight.js') // https://highlightjs.org/
     *
     * // Actual default values
     * var md = require('markdown-it')({
     *   highlight: function (str, lang) {
     *     if (lang && hljs.getLanguage(lang)) {
     *       try {
     *         return '<pre class="hljs"><code>' +
     *                hljs.highlight(lang, str, true).value +
     *                '</code></pre>';
     *       } catch (__) {}
     *     }
     *
     *     return '<pre class="hljs"><code>' + md.utils.escapeHtml(str) + '</code></pre>';
     *   }
     * });
     * ```
     *
     **/
    function MarkdownIt(presetName, options) {
      if (!(this instanceof MarkdownIt)) {
        return new MarkdownIt(presetName, options);
      }

      if (!options) {
        if (!utils.isString(presetName)) {
          options = presetName || {};
          presetName = 'default';
        }
      }

      /**
       * MarkdownIt#inline -> ParserInline
       *
       * Instance of [[ParserInline]]. You may need it to add new rules when
       * writing plugins. For simple rules control use [[MarkdownIt.disable]] and
       * [[MarkdownIt.enable]].
       **/
      this.inline = new parser_inline();

      /**
       * MarkdownIt#block -> ParserBlock
       *
       * Instance of [[ParserBlock]]. You may need it to add new rules when
       * writing plugins. For simple rules control use [[MarkdownIt.disable]] and
       * [[MarkdownIt.enable]].
       **/
      this.block = new parser_block();

      /**
       * MarkdownIt#core -> Core
       *
       * Instance of [[Core]] chain executor. You may need it to add new rules when
       * writing plugins. For simple rules control use [[MarkdownIt.disable]] and
       * [[MarkdownIt.enable]].
       **/
      this.core = new parser_core();

      /**
       * MarkdownIt#renderer -> Renderer
       *
       * Instance of [[Renderer]]. Use it to modify output look. Or to add rendering
       * rules for new token types, generated by plugins.
       *
       * ##### Example
       *
       * ```javascript
       * var md = require('markdown-it')();
       *
       * function myToken(tokens, idx, options, env, self) {
       *   //...
       *   return result;
       * };
       *
       * md.renderer.rules['my_token'] = myToken
       * ```
       *
       * See [[Renderer]] docs and [source code](https://github.com/markdown-it/markdown-it/blob/master/lib/renderer.js).
       **/
      this.renderer = new renderer();

      /**
       * MarkdownIt#linkify -> LinkifyIt
       *
       * [linkify-it](https://github.com/markdown-it/linkify-it) instance.
       * Used by [linkify](https://github.com/markdown-it/markdown-it/blob/master/lib/rules_core/linkify.js)
       * rule.
       **/
      this.linkify = new linkifyIt();

      /**
       * MarkdownIt#validateLink(url) -> Boolean
       *
       * Link validation function. CommonMark allows too much in links. By default
       * we disable `javascript:`, `vbscript:`, `file:` schemas, and almost all `data:...` schemas
       * except some embedded image types.
       *
       * You can change this behaviour:
       *
       * ```javascript
       * var md = require('markdown-it')();
       * // enable everything
       * md.validateLink = function () { return true; }
       * ```
       **/
      this.validateLink = validateLink;

      /**
       * MarkdownIt#normalizeLink(url) -> String
       *
       * Function used to encode link url to a machine-readable format,
       * which includes url-encoding, punycode, etc.
       **/
      this.normalizeLink = normalizeLink;

      /**
       * MarkdownIt#normalizeLinkText(url) -> String
       *
       * Function used to decode link url to a human-readable format`
       **/
      this.normalizeLinkText = normalizeLinkText;


      // Expose utils & helpers for easy acces from plugins

      /**
       * MarkdownIt#utils -> utils
       *
       * Assorted utility functions, useful to write plugins. See details
       * [here](https://github.com/markdown-it/markdown-it/blob/master/lib/common/utils.js).
       **/
      this.utils = utils;

      /**
       * MarkdownIt#helpers -> helpers
       *
       * Link components parser functions, useful to write plugins. See details
       * [here](https://github.com/markdown-it/markdown-it/blob/master/lib/helpers).
       **/
      this.helpers = utils.assign({}, helpers);


      this.options = {};
      this.configure(presetName);

      if (options) { this.set(options); }
    }


    /** chainable
     * MarkdownIt.set(options)
     *
     * Set parser options (in the same format as in constructor). Probably, you
     * will never need it, but you can change options after constructor call.
     *
     * ##### Example
     *
     * ```javascript
     * var md = require('markdown-it')()
     *             .set({ html: true, breaks: true })
     *             .set({ typographer, true });
     * ```
     *
     * __Note:__ To achieve the best possible performance, don't modify a
     * `markdown-it` instance options on the fly. If you need multiple configurations
     * it's best to create multiple instances and initialize each with separate
     * config.
     **/
    MarkdownIt.prototype.set = function (options) {
      utils.assign(this.options, options);
      return this;
    };


    /** chainable, internal
     * MarkdownIt.configure(presets)
     *
     * Batch load of all options and compenent settings. This is internal method,
     * and you probably will not need it. But if you with - see available presets
     * and data structure [here](https://github.com/markdown-it/markdown-it/tree/master/lib/presets)
     *
     * We strongly recommend to use presets instead of direct config loads. That
     * will give better compatibility with next versions.
     **/
    MarkdownIt.prototype.configure = function (presets) {
      var self = this, presetName;

      if (utils.isString(presets)) {
        presetName = presets;
        presets = config[presetName];
        if (!presets) { throw new Error('Wrong `markdown-it` preset "' + presetName + '", check name'); }
      }

      if (!presets) { throw new Error('Wrong `markdown-it` preset, can\'t be empty'); }

      if (presets.options) { self.set(presets.options); }

      if (presets.components) {
        Object.keys(presets.components).forEach(function (name) {
          if (presets.components[name].rules) {
            self[name].ruler.enableOnly(presets.components[name].rules);
          }
          if (presets.components[name].rules2) {
            self[name].ruler2.enableOnly(presets.components[name].rules2);
          }
        });
      }
      return this;
    };


    /** chainable
     * MarkdownIt.enable(list, ignoreInvalid)
     * - list (String|Array): rule name or list of rule names to enable
     * - ignoreInvalid (Boolean): set `true` to ignore errors when rule not found.
     *
     * Enable list or rules. It will automatically find appropriate components,
     * containing rules with given names. If rule not found, and `ignoreInvalid`
     * not set - throws exception.
     *
     * ##### Example
     *
     * ```javascript
     * var md = require('markdown-it')()
     *             .enable(['sub', 'sup'])
     *             .disable('smartquotes');
     * ```
     **/
    MarkdownIt.prototype.enable = function (list, ignoreInvalid) {
      var result = [];

      if (!Array.isArray(list)) { list = [ list ]; }

      [ 'core', 'block', 'inline' ].forEach(function (chain) {
        result = result.concat(this[chain].ruler.enable(list, true));
      }, this);

      result = result.concat(this.inline.ruler2.enable(list, true));

      var missed = list.filter(function (name) { return result.indexOf(name) < 0; });

      if (missed.length && !ignoreInvalid) {
        throw new Error('MarkdownIt. Failed to enable unknown rule(s): ' + missed);
      }

      return this;
    };


    /** chainable
     * MarkdownIt.disable(list, ignoreInvalid)
     * - list (String|Array): rule name or list of rule names to disable.
     * - ignoreInvalid (Boolean): set `true` to ignore errors when rule not found.
     *
     * The same as [[MarkdownIt.enable]], but turn specified rules off.
     **/
    MarkdownIt.prototype.disable = function (list, ignoreInvalid) {
      var result = [];

      if (!Array.isArray(list)) { list = [ list ]; }

      [ 'core', 'block', 'inline' ].forEach(function (chain) {
        result = result.concat(this[chain].ruler.disable(list, true));
      }, this);

      result = result.concat(this.inline.ruler2.disable(list, true));

      var missed = list.filter(function (name) { return result.indexOf(name) < 0; });

      if (missed.length && !ignoreInvalid) {
        throw new Error('MarkdownIt. Failed to disable unknown rule(s): ' + missed);
      }
      return this;
    };


    /** chainable
     * MarkdownIt.use(plugin, params)
     *
     * Load specified plugin with given params into current parser instance.
     * It's just a sugar to call `plugin(md, params)` with curring.
     *
     * ##### Example
     *
     * ```javascript
     * var iterator = require('markdown-it-for-inline');
     * var md = require('markdown-it')()
     *             .use(iterator, 'foo_replace', 'text', function (tokens, idx) {
     *               tokens[idx].content = tokens[idx].content.replace(/foo/g, 'bar');
     *             });
     * ```
     **/
    MarkdownIt.prototype.use = function (plugin /*, params, ... */) {
      var args = [ this ].concat(Array.prototype.slice.call(arguments, 1));
      plugin.apply(plugin, args);
      return this;
    };


    /** internal
     * MarkdownIt.parse(src, env) -> Array
     * - src (String): source string
     * - env (Object): environment sandbox
     *
     * Parse input string and returns list of block tokens (special token type
     * "inline" will contain list of inline tokens). You should not call this
     * method directly, until you write custom renderer (for example, to produce
     * AST).
     *
     * `env` is used to pass data between "distributed" rules and return additional
     * metadata like reference info, needed for the renderer. It also can be used to
     * inject data in specific cases. Usually, you will be ok to pass `{}`,
     * and then pass updated object to renderer.
     **/
    MarkdownIt.prototype.parse = function (src, env) {
      if (typeof src !== 'string') {
        throw new Error('Input data should be a String');
      }

      var state = new this.core.State(src, this, env);

      this.core.process(state);

      return state.tokens;
    };


    /**
     * MarkdownIt.render(src [, env]) -> String
     * - src (String): source string
     * - env (Object): environment sandbox
     *
     * Render markdown string into html. It does all magic for you :).
     *
     * `env` can be used to inject additional metadata (`{}` by default).
     * But you will not need it with high probability. See also comment
     * in [[MarkdownIt.parse]].
     **/
    MarkdownIt.prototype.render = function (src, env) {
      env = env || {};

      return this.renderer.render(this.parse(src, env), this.options, env);
    };


    /** internal
     * MarkdownIt.parseInline(src, env) -> Array
     * - src (String): source string
     * - env (Object): environment sandbox
     *
     * The same as [[MarkdownIt.parse]] but skip all block rules. It returns the
     * block tokens list with the single `inline` element, containing parsed inline
     * tokens in `children` property. Also updates `env` object.
     **/
    MarkdownIt.prototype.parseInline = function (src, env) {
      var state = new this.core.State(src, this, env);

      state.inlineMode = true;
      this.core.process(state);

      return state.tokens;
    };


    /**
     * MarkdownIt.renderInline(src [, env]) -> String
     * - src (String): source string
     * - env (Object): environment sandbox
     *
     * Similar to [[MarkdownIt.render]] but for single paragraph content. Result
     * will NOT be wrapped into `<p>` tags.
     **/
    MarkdownIt.prototype.renderInline = function (src, env) {
      env = env || {};

      return this.renderer.render(this.parseInline(src, env), this.options, env);
    };


    var lib = MarkdownIt;

    var markdownIt = lib;

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

    var helpText = `
# Credits (scroll down for help)

---

I'm just gonna put this front and center so that there isn't any doubt as to which parties various stuffs belongs to:

- Credit for the sound effects goes to "[rafael langoni smith](http://rafaelsmith.com/home)" 
  & "[flashygoodness](https://flashygoodness.bandcamp.com/album/rivals-of-aether-original-soundtrack)"
- Mechanics/Physics based upon those found within [Rivals of Aether](https://www.rivalsofaether.com/)

This webapp was created by me, [fudgepop01](https://twitter.com/fudgepop01), to assist development Steam Workshop characters for the game, Rivals of Aether.

If you would like to support me in my future endeavors, consider [subscribing to me on patreon](https://www.patreon.com/fudgepop01) or [buying me a ko-fi](https://ko-fi.com/fudgepop01). Every cent will be used to further
my ability to create and enhance useful tools, games, videos, and applications (such as this one)! Thank you for reading, and enjoy the app!

---

# Help

---

## Overview

Moves in Rivals of Aether are structured in an interesting way. Every move is split into different parts. Each part is called a "window."
Each of these "windows" is able to modify the character in various ways. Each window can also create "hitboxes" that are activated on particular frames.
These "hitboxes" can be circles, rectangles, or rounded rectangles and have various properties. The attack itself also can have certian propreties, as well
as the overall character. All of these things can be adjusted, and should hopefully be explained sufficiently in the coming paragraphs.

### Getting Started

Click the "upload spritesheet" button in the top-left corner. From here, choose a horizontal spritesheet that you have on your machine.
After everything loads, set the number of frames that the spritesheet has. What you do from this point is basically up to you.

### Parts of the App

Each part of the app serves a particular purpose:

- **left toolbar** (where you upload the spritesheet and see this message)
  - various ways of importing and exporting data.
- **top**
  - the individual sprites in the spritesheet.
  - shows the current frame
  - a sprite can be selected to set the first sprite frame of the selected window
- below that, the **timeline**
  - tools on the top can modify the playback of the attack
  - the timeline itself can be clicked to select the attack window you wish to edit
- below that, the **metadata** (the dark bar below the timeline)
  - can be used to give the current window a name and color
  - can be used to give the selected hitbox a name and color
- below that, the **main stage**
  - a visual preview of how the move will look in-game
  - can be zoomed in and out of with the zoom dropdown
  - is pixel-perfect
- **right toolbar**
  - parameters for the selected window or hitbox
  - hover over a parameter to see a description of what it does

### Editing

hitboxes can be created by clicking and dragging in the main stage when the respective tool is selected.
The bounding box of the sprite is shown as a black border. The sprite itself can be repositioned by click + dragging if the "lock position" box is unchecked.

etc etc.

click 

### Exporting


---

# Tips

---

there are keyboard shortcuts!

- \`,\` and \`.\` go back and forward by 1 frame
- \`[\` and \`]\` go back and forward by 1 window
- \`v\` will enter "pan" mode
- \`o\` will enter circle mode
- \`r\` will enter rounded rectangle mode
- \`b\` will enter rectangle mode
- \`backspace\` will enter erase mode

---

# Changelog

---

### 10/8/2019

- (+) added support for sound playback
- (+) added this help message
- (+) allowed the ability to import and export WIP moves as a small file
- (-) removed filename display
  - seemed unnecessary and took up space
- fixed bug where exporting didn't use the attack index names properly
- fixed bug where sound exports didn't export with "asset_get()"

Upcoming features:

- an in-browser filesystem
- a more flexible way of exporitng code
- built-in presets
- sound effect uploading

---

# FAQs

---
`;

    /* src\atoms\modal.svelte generated by Svelte v3.12.1 */

    const file$2 = "src\\atoms\\modal.svelte";

    // (46:0) {#if visible}
    function create_if_block$2(ctx) {
    	var div1, div0, raw_value = ctx.md.render(ctx.text) + "", div1_intro, div1_outro, current, dispose;

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");
    			attr_dev(div0, "id", "content");
    			attr_dev(div0, "class", "svelte-1q8b98q");
    			add_location(div0, file$2, 47, 8, 1092);
    			attr_dev(div1, "id", "container");
    			attr_dev(div1, "class", "svelte-1q8b98q");
    			add_location(div1, file$2, 46, 4, 980);

    			dispose = [
    				listen_dev(div0, "click", stop_propagation(ctx.click_handler), false, false, true),
    				listen_dev(div1, "click", ctx.click_handler_1)
    			];
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			div0.innerHTML = raw_value;
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if ((!current || changed.text) && raw_value !== (raw_value = ctx.md.render(ctx.text) + "")) {
    				div0.innerHTML = raw_value;
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			add_render_callback(() => {
    				if (div1_outro) div1_outro.end(1);
    				if (!div1_intro) div1_intro = create_in_transition(div1, fly, {y: -2000, duration: 1000});
    				div1_intro.start();
    			});

    			current = true;
    		},

    		o: function outro(local) {
    			if (div1_intro) div1_intro.invalidate();

    			div1_outro = create_out_transition(div1, fade, {});

    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(div1);
    				if (div1_outro) div1_outro.end();
    			}

    			run_all(dispose);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block$2.name, type: "if", source: "(46:0) {#if visible}", ctx });
    	return block;
    }

    function create_fragment$3(ctx) {
    	var if_block_anchor, current;

    	var if_block = (ctx.visible) && create_if_block$2(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if (ctx.visible) {
    				if (if_block) {
    					if_block.p(changed, ctx);
    					transition_in(if_block, 1);
    				} else {
    					if_block = create_if_block$2(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
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
    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);

    			if (detaching) {
    				detach_dev(if_block_anchor);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$3.name, type: "component", source: "", ctx });
    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	

        let { visible = true, text = helpText } = $$props;

        const md = markdownIt({html: true, linkify: true, typographer: true});
        const dispatch = createEventDispatcher();

    	const writable_props = ['visible', 'text'];
    	Object.keys($$props).forEach(key => {
    		if (!writable_props.includes(key) && !key.startsWith('$$')) console.warn(`<Modal> was created with unknown prop '${key}'`);
    	});

    	function click_handler(event) {
    		bubble($$self, event);
    	}

    	const click_handler_1 = () => dispatch('close');

    	$$self.$set = $$props => {
    		if ('visible' in $$props) $$invalidate('visible', visible = $$props.visible);
    		if ('text' in $$props) $$invalidate('text', text = $$props.text);
    	};

    	$$self.$capture_state = () => {
    		return { visible, text };
    	};

    	$$self.$inject_state = $$props => {
    		if ('visible' in $$props) $$invalidate('visible', visible = $$props.visible);
    		if ('text' in $$props) $$invalidate('text', text = $$props.text);
    	};

    	return {
    		visible,
    		text,
    		md,
    		dispatch,
    		click_handler,
    		click_handler_1
    	};
    }

    class Modal extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$3, safe_not_equal, ["visible", "text"]);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "Modal", options, id: create_fragment$3.name });
    	}

    	get visible() {
    		throw new Error("<Modal>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set visible(value) {
    		throw new Error("<Modal>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get text() {
    		throw new Error("<Modal>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set text(value) {
    		throw new Error("<Modal>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

    var _templateObject = _taggedTemplateLiteral(['', ''], ['', '']);

    function _taggedTemplateLiteral(strings, raw) { return Object.freeze(Object.defineProperties(strings, { raw: { value: Object.freeze(raw) } })); }

    function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

    /**
     * @class TemplateTag
     * @classdesc Consumes a pipeline of composable transformer plugins and produces a template tag.
     */
    var TemplateTag = function () {
      /**
       * constructs a template tag
       * @constructs TemplateTag
       * @param  {...Object} [...transformers] - an array or arguments list of transformers
       * @return {Function}                    - a template tag
       */
      function TemplateTag() {
        var _this = this;

        for (var _len = arguments.length, transformers = Array(_len), _key = 0; _key < _len; _key++) {
          transformers[_key] = arguments[_key];
        }

        _classCallCheck(this, TemplateTag);

        this.tag = function (strings) {
          for (var _len2 = arguments.length, expressions = Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++) {
            expressions[_key2 - 1] = arguments[_key2];
          }

          if (typeof strings === 'function') {
            // if the first argument passed is a function, assume it is a template tag and return
            // an intermediary tag that processes the template using the aforementioned tag, passing the
            // result to our tag
            return _this.interimTag.bind(_this, strings);
          }

          if (typeof strings === 'string') {
            // if the first argument passed is a string, just transform it
            return _this.transformEndResult(strings);
          }

          // else, return a transformed end result of processing the template with our tag
          strings = strings.map(_this.transformString.bind(_this));
          return _this.transformEndResult(strings.reduce(_this.processSubstitutions.bind(_this, expressions)));
        };

        // if first argument is an array, extrude it as a list of transformers
        if (transformers.length > 0 && Array.isArray(transformers[0])) {
          transformers = transformers[0];
        }

        // if any transformers are functions, this means they are not initiated - automatically initiate them
        this.transformers = transformers.map(function (transformer) {
          return typeof transformer === 'function' ? transformer() : transformer;
        });

        // return an ES2015 template tag
        return this.tag;
      }

      /**
       * Applies all transformers to a template literal tagged with this method.
       * If a function is passed as the first argument, assumes the function is a template tag
       * and applies it to the template, returning a template tag.
       * @param  {(Function|String|Array<String>)} strings        - Either a template tag or an array containing template strings separated by identifier
       * @param  {...*}                            ...expressions - Optional list of substitution values.
       * @return {(String|Function)}                              - Either an intermediary tag function or the results of processing the template.
       */


      _createClass(TemplateTag, [{
        key: 'interimTag',


        /**
         * An intermediary template tag that receives a template tag and passes the result of calling the template with the received
         * template tag to our own template tag.
         * @param  {Function}        nextTag          - the received template tag
         * @param  {Array<String>}   template         - the template to process
         * @param  {...*}            ...substitutions - `substitutions` is an array of all substitutions in the template
         * @return {*}                                - the final processed value
         */
        value: function interimTag(previousTag, template) {
          for (var _len3 = arguments.length, substitutions = Array(_len3 > 2 ? _len3 - 2 : 0), _key3 = 2; _key3 < _len3; _key3++) {
            substitutions[_key3 - 2] = arguments[_key3];
          }

          return this.tag(_templateObject, previousTag.apply(undefined, [template].concat(substitutions)));
        }

        /**
         * Performs bulk processing on the tagged template, transforming each substitution and then
         * concatenating the resulting values into a string.
         * @param  {Array<*>} substitutions - an array of all remaining substitutions present in this template
         * @param  {String}   resultSoFar   - this iteration's result string so far
         * @param  {String}   remainingPart - the template chunk after the current substitution
         * @return {String}                 - the result of joining this iteration's processed substitution with the result
         */

      }, {
        key: 'processSubstitutions',
        value: function processSubstitutions(substitutions, resultSoFar, remainingPart) {
          var substitution = this.transformSubstitution(substitutions.shift(), resultSoFar);
          return ''.concat(resultSoFar, substitution, remainingPart);
        }

        /**
         * Iterate through each transformer, applying the transformer's `onString` method to the template
         * strings before all substitutions are processed.
         * @param {String}  str - The input string
         * @return {String}     - The final results of processing each transformer
         */

      }, {
        key: 'transformString',
        value: function transformString(str) {
          var cb = function cb(res, transform) {
            return transform.onString ? transform.onString(res) : res;
          };
          return this.transformers.reduce(cb, str);
        }

        /**
         * When a substitution is encountered, iterates through each transformer and applies the transformer's
         * `onSubstitution` method to the substitution.
         * @param  {*}      substitution - The current substitution
         * @param  {String} resultSoFar  - The result up to and excluding this substitution.
         * @return {*}                   - The final result of applying all substitution transformations.
         */

      }, {
        key: 'transformSubstitution',
        value: function transformSubstitution(substitution, resultSoFar) {
          var cb = function cb(res, transform) {
            return transform.onSubstitution ? transform.onSubstitution(res, resultSoFar) : res;
          };
          return this.transformers.reduce(cb, substitution);
        }

        /**
         * Iterates through each transformer, applying the transformer's `onEndResult` method to the
         * template literal after all substitutions have finished processing.
         * @param  {String} endResult - The processed template, just before it is returned from the tag
         * @return {String}           - The final results of processing each transformer
         */

      }, {
        key: 'transformEndResult',
        value: function transformEndResult(endResult) {
          var cb = function cb(res, transform) {
            return transform.onEndResult ? transform.onEndResult(res) : res;
          };
          return this.transformers.reduce(cb, endResult);
        }
      }]);

      return TemplateTag;
    }();
    //# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9UZW1wbGF0ZVRhZy9UZW1wbGF0ZVRhZy5qcyJdLCJuYW1lcyI6WyJUZW1wbGF0ZVRhZyIsInRyYW5zZm9ybWVycyIsInRhZyIsInN0cmluZ3MiLCJleHByZXNzaW9ucyIsImludGVyaW1UYWciLCJiaW5kIiwidHJhbnNmb3JtRW5kUmVzdWx0IiwibWFwIiwidHJhbnNmb3JtU3RyaW5nIiwicmVkdWNlIiwicHJvY2Vzc1N1YnN0aXR1dGlvbnMiLCJsZW5ndGgiLCJBcnJheSIsImlzQXJyYXkiLCJ0cmFuc2Zvcm1lciIsInByZXZpb3VzVGFnIiwidGVtcGxhdGUiLCJzdWJzdGl0dXRpb25zIiwicmVzdWx0U29GYXIiLCJyZW1haW5pbmdQYXJ0Iiwic3Vic3RpdHV0aW9uIiwidHJhbnNmb3JtU3Vic3RpdHV0aW9uIiwic2hpZnQiLCJjb25jYXQiLCJzdHIiLCJjYiIsInJlcyIsInRyYW5zZm9ybSIsIm9uU3RyaW5nIiwib25TdWJzdGl0dXRpb24iLCJlbmRSZXN1bHQiLCJvbkVuZFJlc3VsdCJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7QUFBQTs7OztJQUlxQkEsVztBQUNuQjs7Ozs7O0FBTUEseUJBQTZCO0FBQUE7O0FBQUEsc0NBQWRDLFlBQWM7QUFBZEEsa0JBQWM7QUFBQTs7QUFBQTs7QUFBQSxTQXVCN0JDLEdBdkI2QixHQXVCdkIsVUFBQ0MsT0FBRCxFQUE2QjtBQUFBLHlDQUFoQkMsV0FBZ0I7QUFBaEJBLG1CQUFnQjtBQUFBOztBQUNqQyxVQUFJLE9BQU9ELE9BQVAsS0FBbUIsVUFBdkIsRUFBbUM7QUFDakM7QUFDQTtBQUNBO0FBQ0EsZUFBTyxNQUFLRSxVQUFMLENBQWdCQyxJQUFoQixRQUEyQkgsT0FBM0IsQ0FBUDtBQUNEOztBQUVELFVBQUksT0FBT0EsT0FBUCxLQUFtQixRQUF2QixFQUFpQztBQUMvQjtBQUNBLGVBQU8sTUFBS0ksa0JBQUwsQ0FBd0JKLE9BQXhCLENBQVA7QUFDRDs7QUFFRDtBQUNBQSxnQkFBVUEsUUFBUUssR0FBUixDQUFZLE1BQUtDLGVBQUwsQ0FBcUJILElBQXJCLE9BQVosQ0FBVjtBQUNBLGFBQU8sTUFBS0Msa0JBQUwsQ0FDTEosUUFBUU8sTUFBUixDQUFlLE1BQUtDLG9CQUFMLENBQTBCTCxJQUExQixRQUFxQ0YsV0FBckMsQ0FBZixDQURLLENBQVA7QUFHRCxLQXpDNEI7O0FBQzNCO0FBQ0EsUUFBSUgsYUFBYVcsTUFBYixHQUFzQixDQUF0QixJQUEyQkMsTUFBTUMsT0FBTixDQUFjYixhQUFhLENBQWIsQ0FBZCxDQUEvQixFQUErRDtBQUM3REEscUJBQWVBLGFBQWEsQ0FBYixDQUFmO0FBQ0Q7O0FBRUQ7QUFDQSxTQUFLQSxZQUFMLEdBQW9CQSxhQUFhTyxHQUFiLENBQWlCLHVCQUFlO0FBQ2xELGFBQU8sT0FBT08sV0FBUCxLQUF1QixVQUF2QixHQUFvQ0EsYUFBcEMsR0FBb0RBLFdBQTNEO0FBQ0QsS0FGbUIsQ0FBcEI7O0FBSUE7QUFDQSxXQUFPLEtBQUtiLEdBQVo7QUFDRDs7QUFFRDs7Ozs7Ozs7Ozs7Ozs7QUE0QkE7Ozs7Ozs7OytCQVFXYyxXLEVBQWFDLFEsRUFBNEI7QUFBQSx5Q0FBZkMsYUFBZTtBQUFmQSxxQkFBZTtBQUFBOztBQUNsRCxhQUFPLEtBQUtoQixHQUFaLGtCQUFrQmMsOEJBQVlDLFFBQVosU0FBeUJDLGFBQXpCLEVBQWxCO0FBQ0Q7O0FBRUQ7Ozs7Ozs7Ozs7O3lDQVFxQkEsYSxFQUFlQyxXLEVBQWFDLGEsRUFBZTtBQUM5RCxVQUFNQyxlQUFlLEtBQUtDLHFCQUFMLENBQ25CSixjQUFjSyxLQUFkLEVBRG1CLEVBRW5CSixXQUZtQixDQUFyQjtBQUlBLGFBQU8sR0FBR0ssTUFBSCxDQUFVTCxXQUFWLEVBQXVCRSxZQUF2QixFQUFxQ0QsYUFBckMsQ0FBUDtBQUNEOztBQUVEOzs7Ozs7Ozs7b0NBTWdCSyxHLEVBQUs7QUFDbkIsVUFBTUMsS0FBSyxTQUFMQSxFQUFLLENBQUNDLEdBQUQsRUFBTUMsU0FBTjtBQUFBLGVBQ1RBLFVBQVVDLFFBQVYsR0FBcUJELFVBQVVDLFFBQVYsQ0FBbUJGLEdBQW5CLENBQXJCLEdBQStDQSxHQUR0QztBQUFBLE9BQVg7QUFFQSxhQUFPLEtBQUsxQixZQUFMLENBQWtCUyxNQUFsQixDQUF5QmdCLEVBQXpCLEVBQTZCRCxHQUE3QixDQUFQO0FBQ0Q7O0FBRUQ7Ozs7Ozs7Ozs7MENBT3NCSixZLEVBQWNGLFcsRUFBYTtBQUMvQyxVQUFNTyxLQUFLLFNBQUxBLEVBQUssQ0FBQ0MsR0FBRCxFQUFNQyxTQUFOO0FBQUEsZUFDVEEsVUFBVUUsY0FBVixHQUNJRixVQUFVRSxjQUFWLENBQXlCSCxHQUF6QixFQUE4QlIsV0FBOUIsQ0FESixHQUVJUSxHQUhLO0FBQUEsT0FBWDtBQUlBLGFBQU8sS0FBSzFCLFlBQUwsQ0FBa0JTLE1BQWxCLENBQXlCZ0IsRUFBekIsRUFBNkJMLFlBQTdCLENBQVA7QUFDRDs7QUFFRDs7Ozs7Ozs7O3VDQU1tQlUsUyxFQUFXO0FBQzVCLFVBQU1MLEtBQUssU0FBTEEsRUFBSyxDQUFDQyxHQUFELEVBQU1DLFNBQU47QUFBQSxlQUNUQSxVQUFVSSxXQUFWLEdBQXdCSixVQUFVSSxXQUFWLENBQXNCTCxHQUF0QixDQUF4QixHQUFxREEsR0FENUM7QUFBQSxPQUFYO0FBRUEsYUFBTyxLQUFLMUIsWUFBTCxDQUFrQlMsTUFBbEIsQ0FBeUJnQixFQUF6QixFQUE2QkssU0FBN0IsQ0FBUDtBQUNEOzs7Ozs7ZUFuSGtCL0IsVyIsImZpbGUiOiJUZW1wbGF0ZVRhZy5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGNsYXNzIFRlbXBsYXRlVGFnXG4gKiBAY2xhc3NkZXNjIENvbnN1bWVzIGEgcGlwZWxpbmUgb2YgY29tcG9zYWJsZSB0cmFuc2Zvcm1lciBwbHVnaW5zIGFuZCBwcm9kdWNlcyBhIHRlbXBsYXRlIHRhZy5cbiAqL1xuZXhwb3J0IGRlZmF1bHQgY2xhc3MgVGVtcGxhdGVUYWcge1xuICAvKipcbiAgICogY29uc3RydWN0cyBhIHRlbXBsYXRlIHRhZ1xuICAgKiBAY29uc3RydWN0cyBUZW1wbGF0ZVRhZ1xuICAgKiBAcGFyYW0gIHsuLi5PYmplY3R9IFsuLi50cmFuc2Zvcm1lcnNdIC0gYW4gYXJyYXkgb3IgYXJndW1lbnRzIGxpc3Qgb2YgdHJhbnNmb3JtZXJzXG4gICAqIEByZXR1cm4ge0Z1bmN0aW9ufSAgICAgICAgICAgICAgICAgICAgLSBhIHRlbXBsYXRlIHRhZ1xuICAgKi9cbiAgY29uc3RydWN0b3IoLi4udHJhbnNmb3JtZXJzKSB7XG4gICAgLy8gaWYgZmlyc3QgYXJndW1lbnQgaXMgYW4gYXJyYXksIGV4dHJ1ZGUgaXQgYXMgYSBsaXN0IG9mIHRyYW5zZm9ybWVyc1xuICAgIGlmICh0cmFuc2Zvcm1lcnMubGVuZ3RoID4gMCAmJiBBcnJheS5pc0FycmF5KHRyYW5zZm9ybWVyc1swXSkpIHtcbiAgICAgIHRyYW5zZm9ybWVycyA9IHRyYW5zZm9ybWVyc1swXTtcbiAgICB9XG5cbiAgICAvLyBpZiBhbnkgdHJhbnNmb3JtZXJzIGFyZSBmdW5jdGlvbnMsIHRoaXMgbWVhbnMgdGhleSBhcmUgbm90IGluaXRpYXRlZCAtIGF1dG9tYXRpY2FsbHkgaW5pdGlhdGUgdGhlbVxuICAgIHRoaXMudHJhbnNmb3JtZXJzID0gdHJhbnNmb3JtZXJzLm1hcCh0cmFuc2Zvcm1lciA9PiB7XG4gICAgICByZXR1cm4gdHlwZW9mIHRyYW5zZm9ybWVyID09PSAnZnVuY3Rpb24nID8gdHJhbnNmb3JtZXIoKSA6IHRyYW5zZm9ybWVyO1xuICAgIH0pO1xuXG4gICAgLy8gcmV0dXJuIGFuIEVTMjAxNSB0ZW1wbGF0ZSB0YWdcbiAgICByZXR1cm4gdGhpcy50YWc7XG4gIH1cblxuICAvKipcbiAgICogQXBwbGllcyBhbGwgdHJhbnNmb3JtZXJzIHRvIGEgdGVtcGxhdGUgbGl0ZXJhbCB0YWdnZWQgd2l0aCB0aGlzIG1ldGhvZC5cbiAgICogSWYgYSBmdW5jdGlvbiBpcyBwYXNzZWQgYXMgdGhlIGZpcnN0IGFyZ3VtZW50LCBhc3N1bWVzIHRoZSBmdW5jdGlvbiBpcyBhIHRlbXBsYXRlIHRhZ1xuICAgKiBhbmQgYXBwbGllcyBpdCB0byB0aGUgdGVtcGxhdGUsIHJldHVybmluZyBhIHRlbXBsYXRlIHRhZy5cbiAgICogQHBhcmFtICB7KEZ1bmN0aW9ufFN0cmluZ3xBcnJheTxTdHJpbmc+KX0gc3RyaW5ncyAgICAgICAgLSBFaXRoZXIgYSB0ZW1wbGF0ZSB0YWcgb3IgYW4gYXJyYXkgY29udGFpbmluZyB0ZW1wbGF0ZSBzdHJpbmdzIHNlcGFyYXRlZCBieSBpZGVudGlmaWVyXG4gICAqIEBwYXJhbSAgey4uLip9ICAgICAgICAgICAgICAgICAgICAgICAgICAgIC4uLmV4cHJlc3Npb25zIC0gT3B0aW9uYWwgbGlzdCBvZiBzdWJzdGl0dXRpb24gdmFsdWVzLlxuICAgKiBAcmV0dXJuIHsoU3RyaW5nfEZ1bmN0aW9uKX0gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAtIEVpdGhlciBhbiBpbnRlcm1lZGlhcnkgdGFnIGZ1bmN0aW9uIG9yIHRoZSByZXN1bHRzIG9mIHByb2Nlc3NpbmcgdGhlIHRlbXBsYXRlLlxuICAgKi9cbiAgdGFnID0gKHN0cmluZ3MsIC4uLmV4cHJlc3Npb25zKSA9PiB7XG4gICAgaWYgKHR5cGVvZiBzdHJpbmdzID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAvLyBpZiB0aGUgZmlyc3QgYXJndW1lbnQgcGFzc2VkIGlzIGEgZnVuY3Rpb24sIGFzc3VtZSBpdCBpcyBhIHRlbXBsYXRlIHRhZyBhbmQgcmV0dXJuXG4gICAgICAvLyBhbiBpbnRlcm1lZGlhcnkgdGFnIHRoYXQgcHJvY2Vzc2VzIHRoZSB0ZW1wbGF0ZSB1c2luZyB0aGUgYWZvcmVtZW50aW9uZWQgdGFnLCBwYXNzaW5nIHRoZVxuICAgICAgLy8gcmVzdWx0IHRvIG91ciB0YWdcbiAgICAgIHJldHVybiB0aGlzLmludGVyaW1UYWcuYmluZCh0aGlzLCBzdHJpbmdzKTtcbiAgICB9XG5cbiAgICBpZiAodHlwZW9mIHN0cmluZ3MgPT09ICdzdHJpbmcnKSB7XG4gICAgICAvLyBpZiB0aGUgZmlyc3QgYXJndW1lbnQgcGFzc2VkIGlzIGEgc3RyaW5nLCBqdXN0IHRyYW5zZm9ybSBpdFxuICAgICAgcmV0dXJuIHRoaXMudHJhbnNmb3JtRW5kUmVzdWx0KHN0cmluZ3MpO1xuICAgIH1cblxuICAgIC8vIGVsc2UsIHJldHVybiBhIHRyYW5zZm9ybWVkIGVuZCByZXN1bHQgb2YgcHJvY2Vzc2luZyB0aGUgdGVtcGxhdGUgd2l0aCBvdXIgdGFnXG4gICAgc3RyaW5ncyA9IHN0cmluZ3MubWFwKHRoaXMudHJhbnNmb3JtU3RyaW5nLmJpbmQodGhpcykpO1xuICAgIHJldHVybiB0aGlzLnRyYW5zZm9ybUVuZFJlc3VsdChcbiAgICAgIHN0cmluZ3MucmVkdWNlKHRoaXMucHJvY2Vzc1N1YnN0aXR1dGlvbnMuYmluZCh0aGlzLCBleHByZXNzaW9ucykpLFxuICAgICk7XG4gIH07XG5cbiAgLyoqXG4gICAqIEFuIGludGVybWVkaWFyeSB0ZW1wbGF0ZSB0YWcgdGhhdCByZWNlaXZlcyBhIHRlbXBsYXRlIHRhZyBhbmQgcGFzc2VzIHRoZSByZXN1bHQgb2YgY2FsbGluZyB0aGUgdGVtcGxhdGUgd2l0aCB0aGUgcmVjZWl2ZWRcbiAgICogdGVtcGxhdGUgdGFnIHRvIG91ciBvd24gdGVtcGxhdGUgdGFnLlxuICAgKiBAcGFyYW0gIHtGdW5jdGlvbn0gICAgICAgIG5leHRUYWcgICAgICAgICAgLSB0aGUgcmVjZWl2ZWQgdGVtcGxhdGUgdGFnXG4gICAqIEBwYXJhbSAge0FycmF5PFN0cmluZz59ICAgdGVtcGxhdGUgICAgICAgICAtIHRoZSB0ZW1wbGF0ZSB0byBwcm9jZXNzXG4gICAqIEBwYXJhbSAgey4uLip9ICAgICAgICAgICAgLi4uc3Vic3RpdHV0aW9ucyAtIGBzdWJzdGl0dXRpb25zYCBpcyBhbiBhcnJheSBvZiBhbGwgc3Vic3RpdHV0aW9ucyBpbiB0aGUgdGVtcGxhdGVcbiAgICogQHJldHVybiB7Kn0gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC0gdGhlIGZpbmFsIHByb2Nlc3NlZCB2YWx1ZVxuICAgKi9cbiAgaW50ZXJpbVRhZyhwcmV2aW91c1RhZywgdGVtcGxhdGUsIC4uLnN1YnN0aXR1dGlvbnMpIHtcbiAgICByZXR1cm4gdGhpcy50YWdgJHtwcmV2aW91c1RhZyh0ZW1wbGF0ZSwgLi4uc3Vic3RpdHV0aW9ucyl9YDtcbiAgfVxuXG4gIC8qKlxuICAgKiBQZXJmb3JtcyBidWxrIHByb2Nlc3Npbmcgb24gdGhlIHRhZ2dlZCB0ZW1wbGF0ZSwgdHJhbnNmb3JtaW5nIGVhY2ggc3Vic3RpdHV0aW9uIGFuZCB0aGVuXG4gICAqIGNvbmNhdGVuYXRpbmcgdGhlIHJlc3VsdGluZyB2YWx1ZXMgaW50byBhIHN0cmluZy5cbiAgICogQHBhcmFtICB7QXJyYXk8Kj59IHN1YnN0aXR1dGlvbnMgLSBhbiBhcnJheSBvZiBhbGwgcmVtYWluaW5nIHN1YnN0aXR1dGlvbnMgcHJlc2VudCBpbiB0aGlzIHRlbXBsYXRlXG4gICAqIEBwYXJhbSAge1N0cmluZ30gICByZXN1bHRTb0ZhciAgIC0gdGhpcyBpdGVyYXRpb24ncyByZXN1bHQgc3RyaW5nIHNvIGZhclxuICAgKiBAcGFyYW0gIHtTdHJpbmd9ICAgcmVtYWluaW5nUGFydCAtIHRoZSB0ZW1wbGF0ZSBjaHVuayBhZnRlciB0aGUgY3VycmVudCBzdWJzdGl0dXRpb25cbiAgICogQHJldHVybiB7U3RyaW5nfSAgICAgICAgICAgICAgICAgLSB0aGUgcmVzdWx0IG9mIGpvaW5pbmcgdGhpcyBpdGVyYXRpb24ncyBwcm9jZXNzZWQgc3Vic3RpdHV0aW9uIHdpdGggdGhlIHJlc3VsdFxuICAgKi9cbiAgcHJvY2Vzc1N1YnN0aXR1dGlvbnMoc3Vic3RpdHV0aW9ucywgcmVzdWx0U29GYXIsIHJlbWFpbmluZ1BhcnQpIHtcbiAgICBjb25zdCBzdWJzdGl0dXRpb24gPSB0aGlzLnRyYW5zZm9ybVN1YnN0aXR1dGlvbihcbiAgICAgIHN1YnN0aXR1dGlvbnMuc2hpZnQoKSxcbiAgICAgIHJlc3VsdFNvRmFyLFxuICAgICk7XG4gICAgcmV0dXJuICcnLmNvbmNhdChyZXN1bHRTb0Zhciwgc3Vic3RpdHV0aW9uLCByZW1haW5pbmdQYXJ0KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBJdGVyYXRlIHRocm91Z2ggZWFjaCB0cmFuc2Zvcm1lciwgYXBwbHlpbmcgdGhlIHRyYW5zZm9ybWVyJ3MgYG9uU3RyaW5nYCBtZXRob2QgdG8gdGhlIHRlbXBsYXRlXG4gICAqIHN0cmluZ3MgYmVmb3JlIGFsbCBzdWJzdGl0dXRpb25zIGFyZSBwcm9jZXNzZWQuXG4gICAqIEBwYXJhbSB7U3RyaW5nfSAgc3RyIC0gVGhlIGlucHV0IHN0cmluZ1xuICAgKiBAcmV0dXJuIHtTdHJpbmd9ICAgICAtIFRoZSBmaW5hbCByZXN1bHRzIG9mIHByb2Nlc3NpbmcgZWFjaCB0cmFuc2Zvcm1lclxuICAgKi9cbiAgdHJhbnNmb3JtU3RyaW5nKHN0cikge1xuICAgIGNvbnN0IGNiID0gKHJlcywgdHJhbnNmb3JtKSA9PlxuICAgICAgdHJhbnNmb3JtLm9uU3RyaW5nID8gdHJhbnNmb3JtLm9uU3RyaW5nKHJlcykgOiByZXM7XG4gICAgcmV0dXJuIHRoaXMudHJhbnNmb3JtZXJzLnJlZHVjZShjYiwgc3RyKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBXaGVuIGEgc3Vic3RpdHV0aW9uIGlzIGVuY291bnRlcmVkLCBpdGVyYXRlcyB0aHJvdWdoIGVhY2ggdHJhbnNmb3JtZXIgYW5kIGFwcGxpZXMgdGhlIHRyYW5zZm9ybWVyJ3NcbiAgICogYG9uU3Vic3RpdHV0aW9uYCBtZXRob2QgdG8gdGhlIHN1YnN0aXR1dGlvbi5cbiAgICogQHBhcmFtICB7Kn0gICAgICBzdWJzdGl0dXRpb24gLSBUaGUgY3VycmVudCBzdWJzdGl0dXRpb25cbiAgICogQHBhcmFtICB7U3RyaW5nfSByZXN1bHRTb0ZhciAgLSBUaGUgcmVzdWx0IHVwIHRvIGFuZCBleGNsdWRpbmcgdGhpcyBzdWJzdGl0dXRpb24uXG4gICAqIEByZXR1cm4geyp9ICAgICAgICAgICAgICAgICAgIC0gVGhlIGZpbmFsIHJlc3VsdCBvZiBhcHBseWluZyBhbGwgc3Vic3RpdHV0aW9uIHRyYW5zZm9ybWF0aW9ucy5cbiAgICovXG4gIHRyYW5zZm9ybVN1YnN0aXR1dGlvbihzdWJzdGl0dXRpb24sIHJlc3VsdFNvRmFyKSB7XG4gICAgY29uc3QgY2IgPSAocmVzLCB0cmFuc2Zvcm0pID0+XG4gICAgICB0cmFuc2Zvcm0ub25TdWJzdGl0dXRpb25cbiAgICAgICAgPyB0cmFuc2Zvcm0ub25TdWJzdGl0dXRpb24ocmVzLCByZXN1bHRTb0ZhcilcbiAgICAgICAgOiByZXM7XG4gICAgcmV0dXJuIHRoaXMudHJhbnNmb3JtZXJzLnJlZHVjZShjYiwgc3Vic3RpdHV0aW9uKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBJdGVyYXRlcyB0aHJvdWdoIGVhY2ggdHJhbnNmb3JtZXIsIGFwcGx5aW5nIHRoZSB0cmFuc2Zvcm1lcidzIGBvbkVuZFJlc3VsdGAgbWV0aG9kIHRvIHRoZVxuICAgKiB0ZW1wbGF0ZSBsaXRlcmFsIGFmdGVyIGFsbCBzdWJzdGl0dXRpb25zIGhhdmUgZmluaXNoZWQgcHJvY2Vzc2luZy5cbiAgICogQHBhcmFtICB7U3RyaW5nfSBlbmRSZXN1bHQgLSBUaGUgcHJvY2Vzc2VkIHRlbXBsYXRlLCBqdXN0IGJlZm9yZSBpdCBpcyByZXR1cm5lZCBmcm9tIHRoZSB0YWdcbiAgICogQHJldHVybiB7U3RyaW5nfSAgICAgICAgICAgLSBUaGUgZmluYWwgcmVzdWx0cyBvZiBwcm9jZXNzaW5nIGVhY2ggdHJhbnNmb3JtZXJcbiAgICovXG4gIHRyYW5zZm9ybUVuZFJlc3VsdChlbmRSZXN1bHQpIHtcbiAgICBjb25zdCBjYiA9IChyZXMsIHRyYW5zZm9ybSkgPT5cbiAgICAgIHRyYW5zZm9ybS5vbkVuZFJlc3VsdCA/IHRyYW5zZm9ybS5vbkVuZFJlc3VsdChyZXMpIDogcmVzO1xuICAgIHJldHVybiB0aGlzLnRyYW5zZm9ybWVycy5yZWR1Y2UoY2IsIGVuZFJlc3VsdCk7XG4gIH1cbn1cbiJdfQ==

    /**
     * TemplateTag transformer that trims whitespace on the end result of a tagged template
     * @param  {String} side = '' - The side of the string to trim. Can be 'start' or 'end' (alternatively 'left' or 'right')
     * @return {Object}           - a TemplateTag transformer
     */
    var trimResultTransformer = function trimResultTransformer() {
      var side = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';
      return {
        onEndResult: function onEndResult(endResult) {
          if (side === '') {
            return endResult.trim();
          }

          side = side.toLowerCase();

          if (side === 'start' || side === 'left') {
            return endResult.replace(/^\s*/, '');
          }

          if (side === 'end' || side === 'right') {
            return endResult.replace(/\s*$/, '');
          }

          throw new Error('Side not supported: ' + side);
        }
      };
    };
    //# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy90cmltUmVzdWx0VHJhbnNmb3JtZXIvdHJpbVJlc3VsdFRyYW5zZm9ybWVyLmpzIl0sIm5hbWVzIjpbInRyaW1SZXN1bHRUcmFuc2Zvcm1lciIsInNpZGUiLCJvbkVuZFJlc3VsdCIsImVuZFJlc3VsdCIsInRyaW0iLCJ0b0xvd2VyQ2FzZSIsInJlcGxhY2UiLCJFcnJvciJdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7O0FBS0EsSUFBTUEsd0JBQXdCLFNBQXhCQSxxQkFBd0I7QUFBQSxNQUFDQyxJQUFELHVFQUFRLEVBQVI7QUFBQSxTQUFnQjtBQUM1Q0MsZUFENEMsdUJBQ2hDQyxTQURnQyxFQUNyQjtBQUNyQixVQUFJRixTQUFTLEVBQWIsRUFBaUI7QUFDZixlQUFPRSxVQUFVQyxJQUFWLEVBQVA7QUFDRDs7QUFFREgsYUFBT0EsS0FBS0ksV0FBTCxFQUFQOztBQUVBLFVBQUlKLFNBQVMsT0FBVCxJQUFvQkEsU0FBUyxNQUFqQyxFQUF5QztBQUN2QyxlQUFPRSxVQUFVRyxPQUFWLENBQWtCLE1BQWxCLEVBQTBCLEVBQTFCLENBQVA7QUFDRDs7QUFFRCxVQUFJTCxTQUFTLEtBQVQsSUFBa0JBLFNBQVMsT0FBL0IsRUFBd0M7QUFDdEMsZUFBT0UsVUFBVUcsT0FBVixDQUFrQixNQUFsQixFQUEwQixFQUExQixDQUFQO0FBQ0Q7O0FBRUQsWUFBTSxJQUFJQyxLQUFKLDBCQUFpQ04sSUFBakMsQ0FBTjtBQUNEO0FBakIyQyxHQUFoQjtBQUFBLENBQTlCOztBQW9CQSxlQUFlRCxxQkFBZiIsImZpbGUiOiJ0cmltUmVzdWx0VHJhbnNmb3JtZXIuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIFRlbXBsYXRlVGFnIHRyYW5zZm9ybWVyIHRoYXQgdHJpbXMgd2hpdGVzcGFjZSBvbiB0aGUgZW5kIHJlc3VsdCBvZiBhIHRhZ2dlZCB0ZW1wbGF0ZVxuICogQHBhcmFtICB7U3RyaW5nfSBzaWRlID0gJycgLSBUaGUgc2lkZSBvZiB0aGUgc3RyaW5nIHRvIHRyaW0uIENhbiBiZSAnc3RhcnQnIG9yICdlbmQnIChhbHRlcm5hdGl2ZWx5ICdsZWZ0JyBvciAncmlnaHQnKVxuICogQHJldHVybiB7T2JqZWN0fSAgICAgICAgICAgLSBhIFRlbXBsYXRlVGFnIHRyYW5zZm9ybWVyXG4gKi9cbmNvbnN0IHRyaW1SZXN1bHRUcmFuc2Zvcm1lciA9IChzaWRlID0gJycpID0+ICh7XG4gIG9uRW5kUmVzdWx0KGVuZFJlc3VsdCkge1xuICAgIGlmIChzaWRlID09PSAnJykge1xuICAgICAgcmV0dXJuIGVuZFJlc3VsdC50cmltKCk7XG4gICAgfVxuXG4gICAgc2lkZSA9IHNpZGUudG9Mb3dlckNhc2UoKTtcblxuICAgIGlmIChzaWRlID09PSAnc3RhcnQnIHx8IHNpZGUgPT09ICdsZWZ0Jykge1xuICAgICAgcmV0dXJuIGVuZFJlc3VsdC5yZXBsYWNlKC9eXFxzKi8sICcnKTtcbiAgICB9XG5cbiAgICBpZiAoc2lkZSA9PT0gJ2VuZCcgfHwgc2lkZSA9PT0gJ3JpZ2h0Jykge1xuICAgICAgcmV0dXJuIGVuZFJlc3VsdC5yZXBsYWNlKC9cXHMqJC8sICcnKTtcbiAgICB9XG5cbiAgICB0aHJvdyBuZXcgRXJyb3IoYFNpZGUgbm90IHN1cHBvcnRlZDogJHtzaWRlfWApO1xuICB9LFxufSk7XG5cbmV4cG9ydCBkZWZhdWx0IHRyaW1SZXN1bHRUcmFuc2Zvcm1lcjtcbiJdfQ==

    function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

    /**
     * strips indentation from a template literal
     * @param  {String} type = 'initial' - whether to remove all indentation or just leading indentation. can be 'all' or 'initial'
     * @return {Object}                  - a TemplateTag transformer
     */
    var stripIndentTransformer = function stripIndentTransformer() {
      var type = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 'initial';
      return {
        onEndResult: function onEndResult(endResult) {
          if (type === 'initial') {
            // remove the shortest leading indentation from each line
            var match = endResult.match(/^[^\S\n]*(?=\S)/gm);
            var indent = match && Math.min.apply(Math, _toConsumableArray(match.map(function (el) {
              return el.length;
            })));
            if (indent) {
              var regexp = new RegExp('^.{' + indent + '}', 'gm');
              return endResult.replace(regexp, '');
            }
            return endResult;
          }
          if (type === 'all') {
            // remove all indentation from each line
            return endResult.replace(/^[^\S\n]+/gm, '');
          }
          throw new Error('Unknown type: ' + type);
        }
      };
    };
    //# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9zdHJpcEluZGVudFRyYW5zZm9ybWVyL3N0cmlwSW5kZW50VHJhbnNmb3JtZXIuanMiXSwibmFtZXMiOlsic3RyaXBJbmRlbnRUcmFuc2Zvcm1lciIsInR5cGUiLCJvbkVuZFJlc3VsdCIsImVuZFJlc3VsdCIsIm1hdGNoIiwiaW5kZW50IiwiTWF0aCIsIm1pbiIsIm1hcCIsImVsIiwibGVuZ3RoIiwicmVnZXhwIiwiUmVnRXhwIiwicmVwbGFjZSIsIkVycm9yIl0sIm1hcHBpbmdzIjoiOztBQUFBOzs7OztBQUtBLElBQU1BLHlCQUF5QixTQUF6QkEsc0JBQXlCO0FBQUEsTUFBQ0MsSUFBRCx1RUFBUSxTQUFSO0FBQUEsU0FBdUI7QUFDcERDLGVBRG9ELHVCQUN4Q0MsU0FEd0MsRUFDN0I7QUFDckIsVUFBSUYsU0FBUyxTQUFiLEVBQXdCO0FBQ3RCO0FBQ0EsWUFBTUcsUUFBUUQsVUFBVUMsS0FBVixDQUFnQixtQkFBaEIsQ0FBZDtBQUNBLFlBQU1DLFNBQVNELFNBQVNFLEtBQUtDLEdBQUwsZ0NBQVlILE1BQU1JLEdBQU4sQ0FBVTtBQUFBLGlCQUFNQyxHQUFHQyxNQUFUO0FBQUEsU0FBVixDQUFaLEVBQXhCO0FBQ0EsWUFBSUwsTUFBSixFQUFZO0FBQ1YsY0FBTU0sU0FBUyxJQUFJQyxNQUFKLFNBQWlCUCxNQUFqQixRQUE0QixJQUE1QixDQUFmO0FBQ0EsaUJBQU9GLFVBQVVVLE9BQVYsQ0FBa0JGLE1BQWxCLEVBQTBCLEVBQTFCLENBQVA7QUFDRDtBQUNELGVBQU9SLFNBQVA7QUFDRDtBQUNELFVBQUlGLFNBQVMsS0FBYixFQUFvQjtBQUNsQjtBQUNBLGVBQU9FLFVBQVVVLE9BQVYsQ0FBa0IsYUFBbEIsRUFBaUMsRUFBakMsQ0FBUDtBQUNEO0FBQ0QsWUFBTSxJQUFJQyxLQUFKLG9CQUEyQmIsSUFBM0IsQ0FBTjtBQUNEO0FBakJtRCxHQUF2QjtBQUFBLENBQS9COztBQW9CQSxlQUFlRCxzQkFBZiIsImZpbGUiOiJzdHJpcEluZGVudFRyYW5zZm9ybWVyLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBzdHJpcHMgaW5kZW50YXRpb24gZnJvbSBhIHRlbXBsYXRlIGxpdGVyYWxcbiAqIEBwYXJhbSAge1N0cmluZ30gdHlwZSA9ICdpbml0aWFsJyAtIHdoZXRoZXIgdG8gcmVtb3ZlIGFsbCBpbmRlbnRhdGlvbiBvciBqdXN0IGxlYWRpbmcgaW5kZW50YXRpb24uIGNhbiBiZSAnYWxsJyBvciAnaW5pdGlhbCdcbiAqIEByZXR1cm4ge09iamVjdH0gICAgICAgICAgICAgICAgICAtIGEgVGVtcGxhdGVUYWcgdHJhbnNmb3JtZXJcbiAqL1xuY29uc3Qgc3RyaXBJbmRlbnRUcmFuc2Zvcm1lciA9ICh0eXBlID0gJ2luaXRpYWwnKSA9PiAoe1xuICBvbkVuZFJlc3VsdChlbmRSZXN1bHQpIHtcbiAgICBpZiAodHlwZSA9PT0gJ2luaXRpYWwnKSB7XG4gICAgICAvLyByZW1vdmUgdGhlIHNob3J0ZXN0IGxlYWRpbmcgaW5kZW50YXRpb24gZnJvbSBlYWNoIGxpbmVcbiAgICAgIGNvbnN0IG1hdGNoID0gZW5kUmVzdWx0Lm1hdGNoKC9eW15cXFNcXG5dKig/PVxcUykvZ20pO1xuICAgICAgY29uc3QgaW5kZW50ID0gbWF0Y2ggJiYgTWF0aC5taW4oLi4ubWF0Y2gubWFwKGVsID0+IGVsLmxlbmd0aCkpO1xuICAgICAgaWYgKGluZGVudCkge1xuICAgICAgICBjb25zdCByZWdleHAgPSBuZXcgUmVnRXhwKGBeLnske2luZGVudH19YCwgJ2dtJyk7XG4gICAgICAgIHJldHVybiBlbmRSZXN1bHQucmVwbGFjZShyZWdleHAsICcnKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBlbmRSZXN1bHQ7XG4gICAgfVxuICAgIGlmICh0eXBlID09PSAnYWxsJykge1xuICAgICAgLy8gcmVtb3ZlIGFsbCBpbmRlbnRhdGlvbiBmcm9tIGVhY2ggbGluZVxuICAgICAgcmV0dXJuIGVuZFJlc3VsdC5yZXBsYWNlKC9eW15cXFNcXG5dKy9nbSwgJycpO1xuICAgIH1cbiAgICB0aHJvdyBuZXcgRXJyb3IoYFVua25vd24gdHlwZTogJHt0eXBlfWApO1xuICB9LFxufSk7XG5cbmV4cG9ydCBkZWZhdWx0IHN0cmlwSW5kZW50VHJhbnNmb3JtZXI7XG4iXX0=

    /**
     * Replaces tabs, newlines and spaces with the chosen value when they occur in sequences
     * @param  {(String|RegExp)} replaceWhat - the value or pattern that should be replaced
     * @param  {*}               replaceWith - the replacement value
     * @return {Object}                      - a TemplateTag transformer
     */
    var replaceResultTransformer = function replaceResultTransformer(replaceWhat, replaceWith) {
      return {
        onEndResult: function onEndResult(endResult) {
          if (replaceWhat == null || replaceWith == null) {
            throw new Error('replaceResultTransformer requires at least 2 arguments.');
          }
          return endResult.replace(replaceWhat, replaceWith);
        }
      };
    };
    //# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9yZXBsYWNlUmVzdWx0VHJhbnNmb3JtZXIvcmVwbGFjZVJlc3VsdFRyYW5zZm9ybWVyLmpzIl0sIm5hbWVzIjpbInJlcGxhY2VSZXN1bHRUcmFuc2Zvcm1lciIsInJlcGxhY2VXaGF0IiwicmVwbGFjZVdpdGgiLCJvbkVuZFJlc3VsdCIsImVuZFJlc3VsdCIsIkVycm9yIiwicmVwbGFjZSJdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztBQU1BLElBQU1BLDJCQUEyQixTQUEzQkEsd0JBQTJCLENBQUNDLFdBQUQsRUFBY0MsV0FBZDtBQUFBLFNBQStCO0FBQzlEQyxlQUQ4RCx1QkFDbERDLFNBRGtELEVBQ3ZDO0FBQ3JCLFVBQUlILGVBQWUsSUFBZixJQUF1QkMsZUFBZSxJQUExQyxFQUFnRDtBQUM5QyxjQUFNLElBQUlHLEtBQUosQ0FDSix5REFESSxDQUFOO0FBR0Q7QUFDRCxhQUFPRCxVQUFVRSxPQUFWLENBQWtCTCxXQUFsQixFQUErQkMsV0FBL0IsQ0FBUDtBQUNEO0FBUjZELEdBQS9CO0FBQUEsQ0FBakM7O0FBV0EsZUFBZUYsd0JBQWYiLCJmaWxlIjoicmVwbGFjZVJlc3VsdFRyYW5zZm9ybWVyLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBSZXBsYWNlcyB0YWJzLCBuZXdsaW5lcyBhbmQgc3BhY2VzIHdpdGggdGhlIGNob3NlbiB2YWx1ZSB3aGVuIHRoZXkgb2NjdXIgaW4gc2VxdWVuY2VzXG4gKiBAcGFyYW0gIHsoU3RyaW5nfFJlZ0V4cCl9IHJlcGxhY2VXaGF0IC0gdGhlIHZhbHVlIG9yIHBhdHRlcm4gdGhhdCBzaG91bGQgYmUgcmVwbGFjZWRcbiAqIEBwYXJhbSAgeyp9ICAgICAgICAgICAgICAgcmVwbGFjZVdpdGggLSB0aGUgcmVwbGFjZW1lbnQgdmFsdWVcbiAqIEByZXR1cm4ge09iamVjdH0gICAgICAgICAgICAgICAgICAgICAgLSBhIFRlbXBsYXRlVGFnIHRyYW5zZm9ybWVyXG4gKi9cbmNvbnN0IHJlcGxhY2VSZXN1bHRUcmFuc2Zvcm1lciA9IChyZXBsYWNlV2hhdCwgcmVwbGFjZVdpdGgpID0+ICh7XG4gIG9uRW5kUmVzdWx0KGVuZFJlc3VsdCkge1xuICAgIGlmIChyZXBsYWNlV2hhdCA9PSBudWxsIHx8IHJlcGxhY2VXaXRoID09IG51bGwpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgJ3JlcGxhY2VSZXN1bHRUcmFuc2Zvcm1lciByZXF1aXJlcyBhdCBsZWFzdCAyIGFyZ3VtZW50cy4nLFxuICAgICAgKTtcbiAgICB9XG4gICAgcmV0dXJuIGVuZFJlc3VsdC5yZXBsYWNlKHJlcGxhY2VXaGF0LCByZXBsYWNlV2l0aCk7XG4gIH0sXG59KTtcblxuZXhwb3J0IGRlZmF1bHQgcmVwbGFjZVJlc3VsdFRyYW5zZm9ybWVyO1xuIl19

    var replaceSubstitutionTransformer = function replaceSubstitutionTransformer(replaceWhat, replaceWith) {
      return {
        onSubstitution: function onSubstitution(substitution, resultSoFar) {
          if (replaceWhat == null || replaceWith == null) {
            throw new Error('replaceSubstitutionTransformer requires at least 2 arguments.');
          }

          // Do not touch if null or undefined
          if (substitution == null) {
            return substitution;
          } else {
            return substitution.toString().replace(replaceWhat, replaceWith);
          }
        }
      };
    };
    //# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9yZXBsYWNlU3Vic3RpdHV0aW9uVHJhbnNmb3JtZXIvcmVwbGFjZVN1YnN0aXR1dGlvblRyYW5zZm9ybWVyLmpzIl0sIm5hbWVzIjpbInJlcGxhY2VTdWJzdGl0dXRpb25UcmFuc2Zvcm1lciIsInJlcGxhY2VXaGF0IiwicmVwbGFjZVdpdGgiLCJvblN1YnN0aXR1dGlvbiIsInN1YnN0aXR1dGlvbiIsInJlc3VsdFNvRmFyIiwiRXJyb3IiLCJ0b1N0cmluZyIsInJlcGxhY2UiXSwibWFwcGluZ3MiOiJBQUFBLElBQU1BLGlDQUFpQyxTQUFqQ0EsOEJBQWlDLENBQUNDLFdBQUQsRUFBY0MsV0FBZDtBQUFBLFNBQStCO0FBQ3BFQyxrQkFEb0UsMEJBQ3JEQyxZQURxRCxFQUN2Q0MsV0FEdUMsRUFDMUI7QUFDeEMsVUFBSUosZUFBZSxJQUFmLElBQXVCQyxlQUFlLElBQTFDLEVBQWdEO0FBQzlDLGNBQU0sSUFBSUksS0FBSixDQUNKLCtEQURJLENBQU47QUFHRDs7QUFFRDtBQUNBLFVBQUlGLGdCQUFnQixJQUFwQixFQUEwQjtBQUN4QixlQUFPQSxZQUFQO0FBQ0QsT0FGRCxNQUVPO0FBQ0wsZUFBT0EsYUFBYUcsUUFBYixHQUF3QkMsT0FBeEIsQ0FBZ0NQLFdBQWhDLEVBQTZDQyxXQUE3QyxDQUFQO0FBQ0Q7QUFDRjtBQWRtRSxHQUEvQjtBQUFBLENBQXZDOztBQWlCQSxlQUFlRiw4QkFBZiIsImZpbGUiOiJyZXBsYWNlU3Vic3RpdHV0aW9uVHJhbnNmb3JtZXIuanMiLCJzb3VyY2VzQ29udGVudCI6WyJjb25zdCByZXBsYWNlU3Vic3RpdHV0aW9uVHJhbnNmb3JtZXIgPSAocmVwbGFjZVdoYXQsIHJlcGxhY2VXaXRoKSA9PiAoe1xuICBvblN1YnN0aXR1dGlvbihzdWJzdGl0dXRpb24sIHJlc3VsdFNvRmFyKSB7XG4gICAgaWYgKHJlcGxhY2VXaGF0ID09IG51bGwgfHwgcmVwbGFjZVdpdGggPT0gbnVsbCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAncmVwbGFjZVN1YnN0aXR1dGlvblRyYW5zZm9ybWVyIHJlcXVpcmVzIGF0IGxlYXN0IDIgYXJndW1lbnRzLicsXG4gICAgICApO1xuICAgIH1cblxuICAgIC8vIERvIG5vdCB0b3VjaCBpZiBudWxsIG9yIHVuZGVmaW5lZFxuICAgIGlmIChzdWJzdGl0dXRpb24gPT0gbnVsbCkge1xuICAgICAgcmV0dXJuIHN1YnN0aXR1dGlvbjtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHN1YnN0aXR1dGlvbi50b1N0cmluZygpLnJlcGxhY2UocmVwbGFjZVdoYXQsIHJlcGxhY2VXaXRoKTtcbiAgICB9XG4gIH0sXG59KTtcblxuZXhwb3J0IGRlZmF1bHQgcmVwbGFjZVN1YnN0aXR1dGlvblRyYW5zZm9ybWVyO1xuIl19

    var defaults = {
      separator: '',
      conjunction: '',
      serial: false
    };

    /**
     * Converts an array substitution to a string containing a list
     * @param  {String} [opts.separator = ''] - the character that separates each item
     * @param  {String} [opts.conjunction = '']  - replace the last separator with this
     * @param  {Boolean} [opts.serial = false] - include the separator before the conjunction? (Oxford comma use-case)
     *
     * @return {Object}                     - a TemplateTag transformer
     */
    var inlineArrayTransformer = function inlineArrayTransformer() {
      var opts = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : defaults;
      return {
        onSubstitution: function onSubstitution(substitution, resultSoFar) {
          // only operate on arrays
          if (Array.isArray(substitution)) {
            var arrayLength = substitution.length;
            var separator = opts.separator;
            var conjunction = opts.conjunction;
            var serial = opts.serial;
            // join each item in the array into a string where each item is separated by separator
            // be sure to maintain indentation
            var indent = resultSoFar.match(/(\n?[^\S\n]+)$/);
            if (indent) {
              substitution = substitution.join(separator + indent[1]);
            } else {
              substitution = substitution.join(separator + ' ');
            }
            // if conjunction is set, replace the last separator with conjunction, but only if there is more than one substitution
            if (conjunction && arrayLength > 1) {
              var separatorIndex = substitution.lastIndexOf(separator);
              substitution = substitution.slice(0, separatorIndex) + (serial ? separator : '') + ' ' + conjunction + substitution.slice(separatorIndex + 1);
            }
          }
          return substitution;
        }
      };
    };
    //# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9pbmxpbmVBcnJheVRyYW5zZm9ybWVyL2lubGluZUFycmF5VHJhbnNmb3JtZXIuanMiXSwibmFtZXMiOlsiZGVmYXVsdHMiLCJzZXBhcmF0b3IiLCJjb25qdW5jdGlvbiIsInNlcmlhbCIsImlubGluZUFycmF5VHJhbnNmb3JtZXIiLCJvcHRzIiwib25TdWJzdGl0dXRpb24iLCJzdWJzdGl0dXRpb24iLCJyZXN1bHRTb0ZhciIsIkFycmF5IiwiaXNBcnJheSIsImFycmF5TGVuZ3RoIiwibGVuZ3RoIiwiaW5kZW50IiwibWF0Y2giLCJqb2luIiwic2VwYXJhdG9ySW5kZXgiLCJsYXN0SW5kZXhPZiIsInNsaWNlIl0sIm1hcHBpbmdzIjoiQUFBQSxJQUFNQSxXQUFXO0FBQ2ZDLGFBQVcsRUFESTtBQUVmQyxlQUFhLEVBRkU7QUFHZkMsVUFBUTtBQUhPLENBQWpCOztBQU1BOzs7Ozs7OztBQVFBLElBQU1DLHlCQUF5QixTQUF6QkEsc0JBQXlCO0FBQUEsTUFBQ0MsSUFBRCx1RUFBUUwsUUFBUjtBQUFBLFNBQXNCO0FBQ25ETSxrQkFEbUQsMEJBQ3BDQyxZQURvQyxFQUN0QkMsV0FEc0IsRUFDVDtBQUN4QztBQUNBLFVBQUlDLE1BQU1DLE9BQU4sQ0FBY0gsWUFBZCxDQUFKLEVBQWlDO0FBQy9CLFlBQU1JLGNBQWNKLGFBQWFLLE1BQWpDO0FBQ0EsWUFBTVgsWUFBWUksS0FBS0osU0FBdkI7QUFDQSxZQUFNQyxjQUFjRyxLQUFLSCxXQUF6QjtBQUNBLFlBQU1DLFNBQVNFLEtBQUtGLE1BQXBCO0FBQ0E7QUFDQTtBQUNBLFlBQU1VLFNBQVNMLFlBQVlNLEtBQVosQ0FBa0IsZ0JBQWxCLENBQWY7QUFDQSxZQUFJRCxNQUFKLEVBQVk7QUFDVk4seUJBQWVBLGFBQWFRLElBQWIsQ0FBa0JkLFlBQVlZLE9BQU8sQ0FBUCxDQUE5QixDQUFmO0FBQ0QsU0FGRCxNQUVPO0FBQ0xOLHlCQUFlQSxhQUFhUSxJQUFiLENBQWtCZCxZQUFZLEdBQTlCLENBQWY7QUFDRDtBQUNEO0FBQ0EsWUFBSUMsZUFBZVMsY0FBYyxDQUFqQyxFQUFvQztBQUNsQyxjQUFNSyxpQkFBaUJULGFBQWFVLFdBQWIsQ0FBeUJoQixTQUF6QixDQUF2QjtBQUNBTSx5QkFDRUEsYUFBYVcsS0FBYixDQUFtQixDQUFuQixFQUFzQkYsY0FBdEIsS0FDQ2IsU0FBU0YsU0FBVCxHQUFxQixFQUR0QixJQUVBLEdBRkEsR0FHQUMsV0FIQSxHQUlBSyxhQUFhVyxLQUFiLENBQW1CRixpQkFBaUIsQ0FBcEMsQ0FMRjtBQU1EO0FBQ0Y7QUFDRCxhQUFPVCxZQUFQO0FBQ0Q7QUE1QmtELEdBQXRCO0FBQUEsQ0FBL0I7O0FBK0JBLGVBQWVILHNCQUFmIiwiZmlsZSI6ImlubGluZUFycmF5VHJhbnNmb3JtZXIuanMiLCJzb3VyY2VzQ29udGVudCI6WyJjb25zdCBkZWZhdWx0cyA9IHtcbiAgc2VwYXJhdG9yOiAnJyxcbiAgY29uanVuY3Rpb246ICcnLFxuICBzZXJpYWw6IGZhbHNlLFxufTtcblxuLyoqXG4gKiBDb252ZXJ0cyBhbiBhcnJheSBzdWJzdGl0dXRpb24gdG8gYSBzdHJpbmcgY29udGFpbmluZyBhIGxpc3RcbiAqIEBwYXJhbSAge1N0cmluZ30gW29wdHMuc2VwYXJhdG9yID0gJyddIC0gdGhlIGNoYXJhY3RlciB0aGF0IHNlcGFyYXRlcyBlYWNoIGl0ZW1cbiAqIEBwYXJhbSAge1N0cmluZ30gW29wdHMuY29uanVuY3Rpb24gPSAnJ10gIC0gcmVwbGFjZSB0aGUgbGFzdCBzZXBhcmF0b3Igd2l0aCB0aGlzXG4gKiBAcGFyYW0gIHtCb29sZWFufSBbb3B0cy5zZXJpYWwgPSBmYWxzZV0gLSBpbmNsdWRlIHRoZSBzZXBhcmF0b3IgYmVmb3JlIHRoZSBjb25qdW5jdGlvbj8gKE94Zm9yZCBjb21tYSB1c2UtY2FzZSlcbiAqXG4gKiBAcmV0dXJuIHtPYmplY3R9ICAgICAgICAgICAgICAgICAgICAgLSBhIFRlbXBsYXRlVGFnIHRyYW5zZm9ybWVyXG4gKi9cbmNvbnN0IGlubGluZUFycmF5VHJhbnNmb3JtZXIgPSAob3B0cyA9IGRlZmF1bHRzKSA9PiAoe1xuICBvblN1YnN0aXR1dGlvbihzdWJzdGl0dXRpb24sIHJlc3VsdFNvRmFyKSB7XG4gICAgLy8gb25seSBvcGVyYXRlIG9uIGFycmF5c1xuICAgIGlmIChBcnJheS5pc0FycmF5KHN1YnN0aXR1dGlvbikpIHtcbiAgICAgIGNvbnN0IGFycmF5TGVuZ3RoID0gc3Vic3RpdHV0aW9uLmxlbmd0aDtcbiAgICAgIGNvbnN0IHNlcGFyYXRvciA9IG9wdHMuc2VwYXJhdG9yO1xuICAgICAgY29uc3QgY29uanVuY3Rpb24gPSBvcHRzLmNvbmp1bmN0aW9uO1xuICAgICAgY29uc3Qgc2VyaWFsID0gb3B0cy5zZXJpYWw7XG4gICAgICAvLyBqb2luIGVhY2ggaXRlbSBpbiB0aGUgYXJyYXkgaW50byBhIHN0cmluZyB3aGVyZSBlYWNoIGl0ZW0gaXMgc2VwYXJhdGVkIGJ5IHNlcGFyYXRvclxuICAgICAgLy8gYmUgc3VyZSB0byBtYWludGFpbiBpbmRlbnRhdGlvblxuICAgICAgY29uc3QgaW5kZW50ID0gcmVzdWx0U29GYXIubWF0Y2goLyhcXG4/W15cXFNcXG5dKykkLyk7XG4gICAgICBpZiAoaW5kZW50KSB7XG4gICAgICAgIHN1YnN0aXR1dGlvbiA9IHN1YnN0aXR1dGlvbi5qb2luKHNlcGFyYXRvciArIGluZGVudFsxXSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzdWJzdGl0dXRpb24gPSBzdWJzdGl0dXRpb24uam9pbihzZXBhcmF0b3IgKyAnICcpO1xuICAgICAgfVxuICAgICAgLy8gaWYgY29uanVuY3Rpb24gaXMgc2V0LCByZXBsYWNlIHRoZSBsYXN0IHNlcGFyYXRvciB3aXRoIGNvbmp1bmN0aW9uLCBidXQgb25seSBpZiB0aGVyZSBpcyBtb3JlIHRoYW4gb25lIHN1YnN0aXR1dGlvblxuICAgICAgaWYgKGNvbmp1bmN0aW9uICYmIGFycmF5TGVuZ3RoID4gMSkge1xuICAgICAgICBjb25zdCBzZXBhcmF0b3JJbmRleCA9IHN1YnN0aXR1dGlvbi5sYXN0SW5kZXhPZihzZXBhcmF0b3IpO1xuICAgICAgICBzdWJzdGl0dXRpb24gPVxuICAgICAgICAgIHN1YnN0aXR1dGlvbi5zbGljZSgwLCBzZXBhcmF0b3JJbmRleCkgK1xuICAgICAgICAgIChzZXJpYWwgPyBzZXBhcmF0b3IgOiAnJykgK1xuICAgICAgICAgICcgJyArXG4gICAgICAgICAgY29uanVuY3Rpb24gK1xuICAgICAgICAgIHN1YnN0aXR1dGlvbi5zbGljZShzZXBhcmF0b3JJbmRleCArIDEpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gc3Vic3RpdHV0aW9uO1xuICB9LFxufSk7XG5cbmV4cG9ydCBkZWZhdWx0IGlubGluZUFycmF5VHJhbnNmb3JtZXI7XG4iXX0=

    var splitStringTransformer = function splitStringTransformer(splitBy) {
      return {
        onSubstitution: function onSubstitution(substitution, resultSoFar) {
          if (splitBy != null && typeof splitBy === 'string') {
            if (typeof substitution === 'string' && substitution.includes(splitBy)) {
              substitution = substitution.split(splitBy);
            }
          } else {
            throw new Error('You need to specify a string character to split by.');
          }
          return substitution;
        }
      };
    };
    //# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9zcGxpdFN0cmluZ1RyYW5zZm9ybWVyL3NwbGl0U3RyaW5nVHJhbnNmb3JtZXIuanMiXSwibmFtZXMiOlsic3BsaXRTdHJpbmdUcmFuc2Zvcm1lciIsIm9uU3Vic3RpdHV0aW9uIiwic3Vic3RpdHV0aW9uIiwicmVzdWx0U29GYXIiLCJzcGxpdEJ5IiwiaW5jbHVkZXMiLCJzcGxpdCIsIkVycm9yIl0sIm1hcHBpbmdzIjoiQUFBQSxJQUFNQSx5QkFBeUIsU0FBekJBLHNCQUF5QjtBQUFBLFNBQVk7QUFDekNDLGtCQUR5QywwQkFDMUJDLFlBRDBCLEVBQ1pDLFdBRFksRUFDQztBQUN4QyxVQUFJQyxXQUFXLElBQVgsSUFBbUIsT0FBT0EsT0FBUCxLQUFtQixRQUExQyxFQUFvRDtBQUNsRCxZQUFJLE9BQU9GLFlBQVAsS0FBd0IsUUFBeEIsSUFBb0NBLGFBQWFHLFFBQWIsQ0FBc0JELE9BQXRCLENBQXhDLEVBQXdFO0FBQ3RFRix5QkFBZUEsYUFBYUksS0FBYixDQUFtQkYsT0FBbkIsQ0FBZjtBQUNEO0FBQ0YsT0FKRCxNQUlPO0FBQ0wsY0FBTSxJQUFJRyxLQUFKLENBQVUscURBQVYsQ0FBTjtBQUNEO0FBQ0QsYUFBT0wsWUFBUDtBQUNEO0FBVndDLEdBQVo7QUFBQSxDQUEvQjs7QUFhQSxlQUFlRixzQkFBZiIsImZpbGUiOiJzcGxpdFN0cmluZ1RyYW5zZm9ybWVyLmpzIiwic291cmNlc0NvbnRlbnQiOlsiY29uc3Qgc3BsaXRTdHJpbmdUcmFuc2Zvcm1lciA9IHNwbGl0QnkgPT4gKHtcbiAgb25TdWJzdGl0dXRpb24oc3Vic3RpdHV0aW9uLCByZXN1bHRTb0Zhcikge1xuICAgIGlmIChzcGxpdEJ5ICE9IG51bGwgJiYgdHlwZW9mIHNwbGl0QnkgPT09ICdzdHJpbmcnKSB7XG4gICAgICBpZiAodHlwZW9mIHN1YnN0aXR1dGlvbiA9PT0gJ3N0cmluZycgJiYgc3Vic3RpdHV0aW9uLmluY2x1ZGVzKHNwbGl0QnkpKSB7XG4gICAgICAgIHN1YnN0aXR1dGlvbiA9IHN1YnN0aXR1dGlvbi5zcGxpdChzcGxpdEJ5KTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdZb3UgbmVlZCB0byBzcGVjaWZ5IGEgc3RyaW5nIGNoYXJhY3RlciB0byBzcGxpdCBieS4nKTtcbiAgICB9XG4gICAgcmV0dXJuIHN1YnN0aXR1dGlvbjtcbiAgfSxcbn0pO1xuXG5leHBvcnQgZGVmYXVsdCBzcGxpdFN0cmluZ1RyYW5zZm9ybWVyO1xuIl19

    var isValidValue = function isValidValue(x) {
      return x != null && !Number.isNaN(x) && typeof x !== 'boolean';
    };

    var removeNonPrintingValuesTransformer = function removeNonPrintingValuesTransformer() {
      return {
        onSubstitution: function onSubstitution(substitution) {
          if (Array.isArray(substitution)) {
            return substitution.filter(isValidValue);
          }
          if (isValidValue(substitution)) {
            return substitution;
          }
          return '';
        }
      };
    };
    //# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9yZW1vdmVOb25QcmludGluZ1ZhbHVlc1RyYW5zZm9ybWVyL3JlbW92ZU5vblByaW50aW5nVmFsdWVzVHJhbnNmb3JtZXIuanMiXSwibmFtZXMiOlsiaXNWYWxpZFZhbHVlIiwieCIsIk51bWJlciIsImlzTmFOIiwicmVtb3ZlTm9uUHJpbnRpbmdWYWx1ZXNUcmFuc2Zvcm1lciIsIm9uU3Vic3RpdHV0aW9uIiwic3Vic3RpdHV0aW9uIiwiQXJyYXkiLCJpc0FycmF5IiwiZmlsdGVyIl0sIm1hcHBpbmdzIjoiQUFBQSxJQUFNQSxlQUFlLFNBQWZBLFlBQWU7QUFBQSxTQUNuQkMsS0FBSyxJQUFMLElBQWEsQ0FBQ0MsT0FBT0MsS0FBUCxDQUFhRixDQUFiLENBQWQsSUFBaUMsT0FBT0EsQ0FBUCxLQUFhLFNBRDNCO0FBQUEsQ0FBckI7O0FBR0EsSUFBTUcscUNBQXFDLFNBQXJDQSxrQ0FBcUM7QUFBQSxTQUFPO0FBQ2hEQyxrQkFEZ0QsMEJBQ2pDQyxZQURpQyxFQUNuQjtBQUMzQixVQUFJQyxNQUFNQyxPQUFOLENBQWNGLFlBQWQsQ0FBSixFQUFpQztBQUMvQixlQUFPQSxhQUFhRyxNQUFiLENBQW9CVCxZQUFwQixDQUFQO0FBQ0Q7QUFDRCxVQUFJQSxhQUFhTSxZQUFiLENBQUosRUFBZ0M7QUFDOUIsZUFBT0EsWUFBUDtBQUNEO0FBQ0QsYUFBTyxFQUFQO0FBQ0Q7QUFUK0MsR0FBUDtBQUFBLENBQTNDOztBQVlBLGVBQWVGLGtDQUFmIiwiZmlsZSI6InJlbW92ZU5vblByaW50aW5nVmFsdWVzVHJhbnNmb3JtZXIuanMiLCJzb3VyY2VzQ29udGVudCI6WyJjb25zdCBpc1ZhbGlkVmFsdWUgPSB4ID0+XG4gIHggIT0gbnVsbCAmJiAhTnVtYmVyLmlzTmFOKHgpICYmIHR5cGVvZiB4ICE9PSAnYm9vbGVhbic7XG5cbmNvbnN0IHJlbW92ZU5vblByaW50aW5nVmFsdWVzVHJhbnNmb3JtZXIgPSAoKSA9PiAoe1xuICBvblN1YnN0aXR1dGlvbihzdWJzdGl0dXRpb24pIHtcbiAgICBpZiAoQXJyYXkuaXNBcnJheShzdWJzdGl0dXRpb24pKSB7XG4gICAgICByZXR1cm4gc3Vic3RpdHV0aW9uLmZpbHRlcihpc1ZhbGlkVmFsdWUpO1xuICAgIH1cbiAgICBpZiAoaXNWYWxpZFZhbHVlKHN1YnN0aXR1dGlvbikpIHtcbiAgICAgIHJldHVybiBzdWJzdGl0dXRpb247XG4gICAgfVxuICAgIHJldHVybiAnJztcbiAgfSxcbn0pO1xuXG5leHBvcnQgZGVmYXVsdCByZW1vdmVOb25QcmludGluZ1ZhbHVlc1RyYW5zZm9ybWVyO1xuIl19

    var commaLists = new TemplateTag(inlineArrayTransformer({ separator: ',' }), stripIndentTransformer, trimResultTransformer);
    //# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9jb21tYUxpc3RzL2NvbW1hTGlzdHMuanMiXSwibmFtZXMiOlsiVGVtcGxhdGVUYWciLCJzdHJpcEluZGVudFRyYW5zZm9ybWVyIiwiaW5saW5lQXJyYXlUcmFuc2Zvcm1lciIsInRyaW1SZXN1bHRUcmFuc2Zvcm1lciIsImNvbW1hTGlzdHMiLCJzZXBhcmF0b3IiXSwibWFwcGluZ3MiOiJBQUFBLE9BQU9BLFdBQVAsTUFBd0IsZ0JBQXhCO0FBQ0EsT0FBT0Msc0JBQVAsTUFBbUMsMkJBQW5DO0FBQ0EsT0FBT0Msc0JBQVAsTUFBbUMsMkJBQW5DO0FBQ0EsT0FBT0MscUJBQVAsTUFBa0MsMEJBQWxDOztBQUVBLElBQU1DLGFBQWEsSUFBSUosV0FBSixDQUNqQkUsdUJBQXVCLEVBQUVHLFdBQVcsR0FBYixFQUF2QixDQURpQixFQUVqQkosc0JBRmlCLEVBR2pCRSxxQkFIaUIsQ0FBbkI7O0FBTUEsZUFBZUMsVUFBZiIsImZpbGUiOiJjb21tYUxpc3RzLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IFRlbXBsYXRlVGFnIGZyb20gJy4uL1RlbXBsYXRlVGFnJztcbmltcG9ydCBzdHJpcEluZGVudFRyYW5zZm9ybWVyIGZyb20gJy4uL3N0cmlwSW5kZW50VHJhbnNmb3JtZXInO1xuaW1wb3J0IGlubGluZUFycmF5VHJhbnNmb3JtZXIgZnJvbSAnLi4vaW5saW5lQXJyYXlUcmFuc2Zvcm1lcic7XG5pbXBvcnQgdHJpbVJlc3VsdFRyYW5zZm9ybWVyIGZyb20gJy4uL3RyaW1SZXN1bHRUcmFuc2Zvcm1lcic7XG5cbmNvbnN0IGNvbW1hTGlzdHMgPSBuZXcgVGVtcGxhdGVUYWcoXG4gIGlubGluZUFycmF5VHJhbnNmb3JtZXIoeyBzZXBhcmF0b3I6ICcsJyB9KSxcbiAgc3RyaXBJbmRlbnRUcmFuc2Zvcm1lcixcbiAgdHJpbVJlc3VsdFRyYW5zZm9ybWVyLFxuKTtcblxuZXhwb3J0IGRlZmF1bHQgY29tbWFMaXN0cztcbiJdfQ==

    var commaListsAnd = new TemplateTag(inlineArrayTransformer({ separator: ',', conjunction: 'and' }), stripIndentTransformer, trimResultTransformer);
    //# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9jb21tYUxpc3RzQW5kL2NvbW1hTGlzdHNBbmQuanMiXSwibmFtZXMiOlsiVGVtcGxhdGVUYWciLCJzdHJpcEluZGVudFRyYW5zZm9ybWVyIiwiaW5saW5lQXJyYXlUcmFuc2Zvcm1lciIsInRyaW1SZXN1bHRUcmFuc2Zvcm1lciIsImNvbW1hTGlzdHNBbmQiLCJzZXBhcmF0b3IiLCJjb25qdW5jdGlvbiJdLCJtYXBwaW5ncyI6IkFBQUEsT0FBT0EsV0FBUCxNQUF3QixnQkFBeEI7QUFDQSxPQUFPQyxzQkFBUCxNQUFtQywyQkFBbkM7QUFDQSxPQUFPQyxzQkFBUCxNQUFtQywyQkFBbkM7QUFDQSxPQUFPQyxxQkFBUCxNQUFrQywwQkFBbEM7O0FBRUEsSUFBTUMsZ0JBQWdCLElBQUlKLFdBQUosQ0FDcEJFLHVCQUF1QixFQUFFRyxXQUFXLEdBQWIsRUFBa0JDLGFBQWEsS0FBL0IsRUFBdkIsQ0FEb0IsRUFFcEJMLHNCQUZvQixFQUdwQkUscUJBSG9CLENBQXRCOztBQU1BLGVBQWVDLGFBQWYiLCJmaWxlIjoiY29tbWFMaXN0c0FuZC5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBUZW1wbGF0ZVRhZyBmcm9tICcuLi9UZW1wbGF0ZVRhZyc7XG5pbXBvcnQgc3RyaXBJbmRlbnRUcmFuc2Zvcm1lciBmcm9tICcuLi9zdHJpcEluZGVudFRyYW5zZm9ybWVyJztcbmltcG9ydCBpbmxpbmVBcnJheVRyYW5zZm9ybWVyIGZyb20gJy4uL2lubGluZUFycmF5VHJhbnNmb3JtZXInO1xuaW1wb3J0IHRyaW1SZXN1bHRUcmFuc2Zvcm1lciBmcm9tICcuLi90cmltUmVzdWx0VHJhbnNmb3JtZXInO1xuXG5jb25zdCBjb21tYUxpc3RzQW5kID0gbmV3IFRlbXBsYXRlVGFnKFxuICBpbmxpbmVBcnJheVRyYW5zZm9ybWVyKHsgc2VwYXJhdG9yOiAnLCcsIGNvbmp1bmN0aW9uOiAnYW5kJyB9KSxcbiAgc3RyaXBJbmRlbnRUcmFuc2Zvcm1lcixcbiAgdHJpbVJlc3VsdFRyYW5zZm9ybWVyLFxuKTtcblxuZXhwb3J0IGRlZmF1bHQgY29tbWFMaXN0c0FuZDtcbiJdfQ==

    var commaListsOr = new TemplateTag(inlineArrayTransformer({ separator: ',', conjunction: 'or' }), stripIndentTransformer, trimResultTransformer);
    //# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9jb21tYUxpc3RzT3IvY29tbWFMaXN0c09yLmpzIl0sIm5hbWVzIjpbIlRlbXBsYXRlVGFnIiwic3RyaXBJbmRlbnRUcmFuc2Zvcm1lciIsImlubGluZUFycmF5VHJhbnNmb3JtZXIiLCJ0cmltUmVzdWx0VHJhbnNmb3JtZXIiLCJjb21tYUxpc3RzT3IiLCJzZXBhcmF0b3IiLCJjb25qdW5jdGlvbiJdLCJtYXBwaW5ncyI6IkFBQUEsT0FBT0EsV0FBUCxNQUF3QixnQkFBeEI7QUFDQSxPQUFPQyxzQkFBUCxNQUFtQywyQkFBbkM7QUFDQSxPQUFPQyxzQkFBUCxNQUFtQywyQkFBbkM7QUFDQSxPQUFPQyxxQkFBUCxNQUFrQywwQkFBbEM7O0FBRUEsSUFBTUMsZUFBZSxJQUFJSixXQUFKLENBQ25CRSx1QkFBdUIsRUFBRUcsV0FBVyxHQUFiLEVBQWtCQyxhQUFhLElBQS9CLEVBQXZCLENBRG1CLEVBRW5CTCxzQkFGbUIsRUFHbkJFLHFCQUhtQixDQUFyQjs7QUFNQSxlQUFlQyxZQUFmIiwiZmlsZSI6ImNvbW1hTGlzdHNPci5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBUZW1wbGF0ZVRhZyBmcm9tICcuLi9UZW1wbGF0ZVRhZyc7XG5pbXBvcnQgc3RyaXBJbmRlbnRUcmFuc2Zvcm1lciBmcm9tICcuLi9zdHJpcEluZGVudFRyYW5zZm9ybWVyJztcbmltcG9ydCBpbmxpbmVBcnJheVRyYW5zZm9ybWVyIGZyb20gJy4uL2lubGluZUFycmF5VHJhbnNmb3JtZXInO1xuaW1wb3J0IHRyaW1SZXN1bHRUcmFuc2Zvcm1lciBmcm9tICcuLi90cmltUmVzdWx0VHJhbnNmb3JtZXInO1xuXG5jb25zdCBjb21tYUxpc3RzT3IgPSBuZXcgVGVtcGxhdGVUYWcoXG4gIGlubGluZUFycmF5VHJhbnNmb3JtZXIoeyBzZXBhcmF0b3I6ICcsJywgY29uanVuY3Rpb246ICdvcicgfSksXG4gIHN0cmlwSW5kZW50VHJhbnNmb3JtZXIsXG4gIHRyaW1SZXN1bHRUcmFuc2Zvcm1lcixcbik7XG5cbmV4cG9ydCBkZWZhdWx0IGNvbW1hTGlzdHNPcjtcbiJdfQ==

    var html = new TemplateTag(splitStringTransformer('\n'), removeNonPrintingValuesTransformer, inlineArrayTransformer, stripIndentTransformer, trimResultTransformer);
    //# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9odG1sL2h0bWwuanMiXSwibmFtZXMiOlsiVGVtcGxhdGVUYWciLCJzdHJpcEluZGVudFRyYW5zZm9ybWVyIiwiaW5saW5lQXJyYXlUcmFuc2Zvcm1lciIsInRyaW1SZXN1bHRUcmFuc2Zvcm1lciIsInNwbGl0U3RyaW5nVHJhbnNmb3JtZXIiLCJyZW1vdmVOb25QcmludGluZ1ZhbHVlc1RyYW5zZm9ybWVyIiwiaHRtbCJdLCJtYXBwaW5ncyI6IkFBQUEsT0FBT0EsV0FBUCxNQUF3QixnQkFBeEI7QUFDQSxPQUFPQyxzQkFBUCxNQUFtQywyQkFBbkM7QUFDQSxPQUFPQyxzQkFBUCxNQUFtQywyQkFBbkM7QUFDQSxPQUFPQyxxQkFBUCxNQUFrQywwQkFBbEM7QUFDQSxPQUFPQyxzQkFBUCxNQUFtQywyQkFBbkM7QUFDQSxPQUFPQyxrQ0FBUCxNQUErQyx1Q0FBL0M7O0FBRUEsSUFBTUMsT0FBTyxJQUFJTixXQUFKLENBQ1hJLHVCQUF1QixJQUF2QixDQURXLEVBRVhDLGtDQUZXLEVBR1hILHNCQUhXLEVBSVhELHNCQUpXLEVBS1hFLHFCQUxXLENBQWI7O0FBUUEsZUFBZUcsSUFBZiIsImZpbGUiOiJodG1sLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IFRlbXBsYXRlVGFnIGZyb20gJy4uL1RlbXBsYXRlVGFnJztcbmltcG9ydCBzdHJpcEluZGVudFRyYW5zZm9ybWVyIGZyb20gJy4uL3N0cmlwSW5kZW50VHJhbnNmb3JtZXInO1xuaW1wb3J0IGlubGluZUFycmF5VHJhbnNmb3JtZXIgZnJvbSAnLi4vaW5saW5lQXJyYXlUcmFuc2Zvcm1lcic7XG5pbXBvcnQgdHJpbVJlc3VsdFRyYW5zZm9ybWVyIGZyb20gJy4uL3RyaW1SZXN1bHRUcmFuc2Zvcm1lcic7XG5pbXBvcnQgc3BsaXRTdHJpbmdUcmFuc2Zvcm1lciBmcm9tICcuLi9zcGxpdFN0cmluZ1RyYW5zZm9ybWVyJztcbmltcG9ydCByZW1vdmVOb25QcmludGluZ1ZhbHVlc1RyYW5zZm9ybWVyIGZyb20gJy4uL3JlbW92ZU5vblByaW50aW5nVmFsdWVzVHJhbnNmb3JtZXInO1xuXG5jb25zdCBodG1sID0gbmV3IFRlbXBsYXRlVGFnKFxuICBzcGxpdFN0cmluZ1RyYW5zZm9ybWVyKCdcXG4nKSxcbiAgcmVtb3ZlTm9uUHJpbnRpbmdWYWx1ZXNUcmFuc2Zvcm1lcixcbiAgaW5saW5lQXJyYXlUcmFuc2Zvcm1lcixcbiAgc3RyaXBJbmRlbnRUcmFuc2Zvcm1lcixcbiAgdHJpbVJlc3VsdFRyYW5zZm9ybWVyLFxuKTtcblxuZXhwb3J0IGRlZmF1bHQgaHRtbDtcbiJdfQ==

    var safeHtml = new TemplateTag(splitStringTransformer('\n'), inlineArrayTransformer, stripIndentTransformer, trimResultTransformer, replaceSubstitutionTransformer(/&/g, '&amp;'), replaceSubstitutionTransformer(/</g, '&lt;'), replaceSubstitutionTransformer(/>/g, '&gt;'), replaceSubstitutionTransformer(/"/g, '&quot;'), replaceSubstitutionTransformer(/'/g, '&#x27;'), replaceSubstitutionTransformer(/`/g, '&#x60;'));
    //# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9zYWZlSHRtbC9zYWZlSHRtbC5qcyJdLCJuYW1lcyI6WyJUZW1wbGF0ZVRhZyIsInN0cmlwSW5kZW50VHJhbnNmb3JtZXIiLCJpbmxpbmVBcnJheVRyYW5zZm9ybWVyIiwidHJpbVJlc3VsdFRyYW5zZm9ybWVyIiwic3BsaXRTdHJpbmdUcmFuc2Zvcm1lciIsInJlcGxhY2VTdWJzdGl0dXRpb25UcmFuc2Zvcm1lciIsInNhZmVIdG1sIl0sIm1hcHBpbmdzIjoiQUFBQSxPQUFPQSxXQUFQLE1BQXdCLGdCQUF4QjtBQUNBLE9BQU9DLHNCQUFQLE1BQW1DLDJCQUFuQztBQUNBLE9BQU9DLHNCQUFQLE1BQW1DLDJCQUFuQztBQUNBLE9BQU9DLHFCQUFQLE1BQWtDLDBCQUFsQztBQUNBLE9BQU9DLHNCQUFQLE1BQW1DLDJCQUFuQztBQUNBLE9BQU9DLDhCQUFQLE1BQTJDLG1DQUEzQzs7QUFFQSxJQUFNQyxXQUFXLElBQUlOLFdBQUosQ0FDZkksdUJBQXVCLElBQXZCLENBRGUsRUFFZkYsc0JBRmUsRUFHZkQsc0JBSGUsRUFJZkUscUJBSmUsRUFLZkUsK0JBQStCLElBQS9CLEVBQXFDLE9BQXJDLENBTGUsRUFNZkEsK0JBQStCLElBQS9CLEVBQXFDLE1BQXJDLENBTmUsRUFPZkEsK0JBQStCLElBQS9CLEVBQXFDLE1BQXJDLENBUGUsRUFRZkEsK0JBQStCLElBQS9CLEVBQXFDLFFBQXJDLENBUmUsRUFTZkEsK0JBQStCLElBQS9CLEVBQXFDLFFBQXJDLENBVGUsRUFVZkEsK0JBQStCLElBQS9CLEVBQXFDLFFBQXJDLENBVmUsQ0FBakI7O0FBYUEsZUFBZUMsUUFBZiIsImZpbGUiOiJzYWZlSHRtbC5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBUZW1wbGF0ZVRhZyBmcm9tICcuLi9UZW1wbGF0ZVRhZyc7XG5pbXBvcnQgc3RyaXBJbmRlbnRUcmFuc2Zvcm1lciBmcm9tICcuLi9zdHJpcEluZGVudFRyYW5zZm9ybWVyJztcbmltcG9ydCBpbmxpbmVBcnJheVRyYW5zZm9ybWVyIGZyb20gJy4uL2lubGluZUFycmF5VHJhbnNmb3JtZXInO1xuaW1wb3J0IHRyaW1SZXN1bHRUcmFuc2Zvcm1lciBmcm9tICcuLi90cmltUmVzdWx0VHJhbnNmb3JtZXInO1xuaW1wb3J0IHNwbGl0U3RyaW5nVHJhbnNmb3JtZXIgZnJvbSAnLi4vc3BsaXRTdHJpbmdUcmFuc2Zvcm1lcic7XG5pbXBvcnQgcmVwbGFjZVN1YnN0aXR1dGlvblRyYW5zZm9ybWVyIGZyb20gJy4uL3JlcGxhY2VTdWJzdGl0dXRpb25UcmFuc2Zvcm1lcic7XG5cbmNvbnN0IHNhZmVIdG1sID0gbmV3IFRlbXBsYXRlVGFnKFxuICBzcGxpdFN0cmluZ1RyYW5zZm9ybWVyKCdcXG4nKSxcbiAgaW5saW5lQXJyYXlUcmFuc2Zvcm1lcixcbiAgc3RyaXBJbmRlbnRUcmFuc2Zvcm1lcixcbiAgdHJpbVJlc3VsdFRyYW5zZm9ybWVyLFxuICByZXBsYWNlU3Vic3RpdHV0aW9uVHJhbnNmb3JtZXIoLyYvZywgJyZhbXA7JyksXG4gIHJlcGxhY2VTdWJzdGl0dXRpb25UcmFuc2Zvcm1lcigvPC9nLCAnJmx0OycpLFxuICByZXBsYWNlU3Vic3RpdHV0aW9uVHJhbnNmb3JtZXIoLz4vZywgJyZndDsnKSxcbiAgcmVwbGFjZVN1YnN0aXR1dGlvblRyYW5zZm9ybWVyKC9cIi9nLCAnJnF1b3Q7JyksXG4gIHJlcGxhY2VTdWJzdGl0dXRpb25UcmFuc2Zvcm1lcigvJy9nLCAnJiN4Mjc7JyksXG4gIHJlcGxhY2VTdWJzdGl0dXRpb25UcmFuc2Zvcm1lcigvYC9nLCAnJiN4NjA7JyksXG4pO1xuXG5leHBvcnQgZGVmYXVsdCBzYWZlSHRtbDtcbiJdfQ==

    var oneLine = new TemplateTag(replaceResultTransformer(/(?:\n(?:\s*))+/g, ' '), trimResultTransformer);
    //# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9vbmVMaW5lL29uZUxpbmUuanMiXSwibmFtZXMiOlsiVGVtcGxhdGVUYWciLCJ0cmltUmVzdWx0VHJhbnNmb3JtZXIiLCJyZXBsYWNlUmVzdWx0VHJhbnNmb3JtZXIiLCJvbmVMaW5lIl0sIm1hcHBpbmdzIjoiQUFBQSxPQUFPQSxXQUFQLE1BQXdCLGdCQUF4QjtBQUNBLE9BQU9DLHFCQUFQLE1BQWtDLDBCQUFsQztBQUNBLE9BQU9DLHdCQUFQLE1BQXFDLDZCQUFyQzs7QUFFQSxJQUFNQyxVQUFVLElBQUlILFdBQUosQ0FDZEUseUJBQXlCLGlCQUF6QixFQUE0QyxHQUE1QyxDQURjLEVBRWRELHFCQUZjLENBQWhCOztBQUtBLGVBQWVFLE9BQWYiLCJmaWxlIjoib25lTGluZS5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBUZW1wbGF0ZVRhZyBmcm9tICcuLi9UZW1wbGF0ZVRhZyc7XG5pbXBvcnQgdHJpbVJlc3VsdFRyYW5zZm9ybWVyIGZyb20gJy4uL3RyaW1SZXN1bHRUcmFuc2Zvcm1lcic7XG5pbXBvcnQgcmVwbGFjZVJlc3VsdFRyYW5zZm9ybWVyIGZyb20gJy4uL3JlcGxhY2VSZXN1bHRUcmFuc2Zvcm1lcic7XG5cbmNvbnN0IG9uZUxpbmUgPSBuZXcgVGVtcGxhdGVUYWcoXG4gIHJlcGxhY2VSZXN1bHRUcmFuc2Zvcm1lcigvKD86XFxuKD86XFxzKikpKy9nLCAnICcpLFxuICB0cmltUmVzdWx0VHJhbnNmb3JtZXIsXG4pO1xuXG5leHBvcnQgZGVmYXVsdCBvbmVMaW5lO1xuIl19

    var oneLineTrim = new TemplateTag(replaceResultTransformer(/(?:\n\s*)/g, ''), trimResultTransformer);
    //# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9vbmVMaW5lVHJpbS9vbmVMaW5lVHJpbS5qcyJdLCJuYW1lcyI6WyJUZW1wbGF0ZVRhZyIsInRyaW1SZXN1bHRUcmFuc2Zvcm1lciIsInJlcGxhY2VSZXN1bHRUcmFuc2Zvcm1lciIsIm9uZUxpbmVUcmltIl0sIm1hcHBpbmdzIjoiQUFBQSxPQUFPQSxXQUFQLE1BQXdCLGdCQUF4QjtBQUNBLE9BQU9DLHFCQUFQLE1BQWtDLDBCQUFsQztBQUNBLE9BQU9DLHdCQUFQLE1BQXFDLDZCQUFyQzs7QUFFQSxJQUFNQyxjQUFjLElBQUlILFdBQUosQ0FDbEJFLHlCQUF5QixZQUF6QixFQUF1QyxFQUF2QyxDQURrQixFQUVsQkQscUJBRmtCLENBQXBCOztBQUtBLGVBQWVFLFdBQWYiLCJmaWxlIjoib25lTGluZVRyaW0uanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgVGVtcGxhdGVUYWcgZnJvbSAnLi4vVGVtcGxhdGVUYWcnO1xuaW1wb3J0IHRyaW1SZXN1bHRUcmFuc2Zvcm1lciBmcm9tICcuLi90cmltUmVzdWx0VHJhbnNmb3JtZXInO1xuaW1wb3J0IHJlcGxhY2VSZXN1bHRUcmFuc2Zvcm1lciBmcm9tICcuLi9yZXBsYWNlUmVzdWx0VHJhbnNmb3JtZXInO1xuXG5jb25zdCBvbmVMaW5lVHJpbSA9IG5ldyBUZW1wbGF0ZVRhZyhcbiAgcmVwbGFjZVJlc3VsdFRyYW5zZm9ybWVyKC8oPzpcXG5cXHMqKS9nLCAnJyksXG4gIHRyaW1SZXN1bHRUcmFuc2Zvcm1lcixcbik7XG5cbmV4cG9ydCBkZWZhdWx0IG9uZUxpbmVUcmltO1xuIl19

    var oneLineCommaLists = new TemplateTag(inlineArrayTransformer({ separator: ',' }), replaceResultTransformer(/(?:\s+)/g, ' '), trimResultTransformer);
    //# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9vbmVMaW5lQ29tbWFMaXN0cy9vbmVMaW5lQ29tbWFMaXN0cy5qcyJdLCJuYW1lcyI6WyJUZW1wbGF0ZVRhZyIsImlubGluZUFycmF5VHJhbnNmb3JtZXIiLCJ0cmltUmVzdWx0VHJhbnNmb3JtZXIiLCJyZXBsYWNlUmVzdWx0VHJhbnNmb3JtZXIiLCJvbmVMaW5lQ29tbWFMaXN0cyIsInNlcGFyYXRvciJdLCJtYXBwaW5ncyI6IkFBQUEsT0FBT0EsV0FBUCxNQUF3QixnQkFBeEI7QUFDQSxPQUFPQyxzQkFBUCxNQUFtQywyQkFBbkM7QUFDQSxPQUFPQyxxQkFBUCxNQUFrQywwQkFBbEM7QUFDQSxPQUFPQyx3QkFBUCxNQUFxQyw2QkFBckM7O0FBRUEsSUFBTUMsb0JBQW9CLElBQUlKLFdBQUosQ0FDeEJDLHVCQUF1QixFQUFFSSxXQUFXLEdBQWIsRUFBdkIsQ0FEd0IsRUFFeEJGLHlCQUF5QixVQUF6QixFQUFxQyxHQUFyQyxDQUZ3QixFQUd4QkQscUJBSHdCLENBQTFCOztBQU1BLGVBQWVFLGlCQUFmIiwiZmlsZSI6Im9uZUxpbmVDb21tYUxpc3RzLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IFRlbXBsYXRlVGFnIGZyb20gJy4uL1RlbXBsYXRlVGFnJztcbmltcG9ydCBpbmxpbmVBcnJheVRyYW5zZm9ybWVyIGZyb20gJy4uL2lubGluZUFycmF5VHJhbnNmb3JtZXInO1xuaW1wb3J0IHRyaW1SZXN1bHRUcmFuc2Zvcm1lciBmcm9tICcuLi90cmltUmVzdWx0VHJhbnNmb3JtZXInO1xuaW1wb3J0IHJlcGxhY2VSZXN1bHRUcmFuc2Zvcm1lciBmcm9tICcuLi9yZXBsYWNlUmVzdWx0VHJhbnNmb3JtZXInO1xuXG5jb25zdCBvbmVMaW5lQ29tbWFMaXN0cyA9IG5ldyBUZW1wbGF0ZVRhZyhcbiAgaW5saW5lQXJyYXlUcmFuc2Zvcm1lcih7IHNlcGFyYXRvcjogJywnIH0pLFxuICByZXBsYWNlUmVzdWx0VHJhbnNmb3JtZXIoLyg/OlxccyspL2csICcgJyksXG4gIHRyaW1SZXN1bHRUcmFuc2Zvcm1lcixcbik7XG5cbmV4cG9ydCBkZWZhdWx0IG9uZUxpbmVDb21tYUxpc3RzO1xuIl19

    var oneLineCommaListsOr = new TemplateTag(inlineArrayTransformer({ separator: ',', conjunction: 'or' }), replaceResultTransformer(/(?:\s+)/g, ' '), trimResultTransformer);
    //# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9vbmVMaW5lQ29tbWFMaXN0c09yL29uZUxpbmVDb21tYUxpc3RzT3IuanMiXSwibmFtZXMiOlsiVGVtcGxhdGVUYWciLCJpbmxpbmVBcnJheVRyYW5zZm9ybWVyIiwidHJpbVJlc3VsdFRyYW5zZm9ybWVyIiwicmVwbGFjZVJlc3VsdFRyYW5zZm9ybWVyIiwib25lTGluZUNvbW1hTGlzdHNPciIsInNlcGFyYXRvciIsImNvbmp1bmN0aW9uIl0sIm1hcHBpbmdzIjoiQUFBQSxPQUFPQSxXQUFQLE1BQXdCLGdCQUF4QjtBQUNBLE9BQU9DLHNCQUFQLE1BQW1DLDJCQUFuQztBQUNBLE9BQU9DLHFCQUFQLE1BQWtDLDBCQUFsQztBQUNBLE9BQU9DLHdCQUFQLE1BQXFDLDZCQUFyQzs7QUFFQSxJQUFNQyxzQkFBc0IsSUFBSUosV0FBSixDQUMxQkMsdUJBQXVCLEVBQUVJLFdBQVcsR0FBYixFQUFrQkMsYUFBYSxJQUEvQixFQUF2QixDQUQwQixFQUUxQkgseUJBQXlCLFVBQXpCLEVBQXFDLEdBQXJDLENBRjBCLEVBRzFCRCxxQkFIMEIsQ0FBNUI7O0FBTUEsZUFBZUUsbUJBQWYiLCJmaWxlIjoib25lTGluZUNvbW1hTGlzdHNPci5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBUZW1wbGF0ZVRhZyBmcm9tICcuLi9UZW1wbGF0ZVRhZyc7XG5pbXBvcnQgaW5saW5lQXJyYXlUcmFuc2Zvcm1lciBmcm9tICcuLi9pbmxpbmVBcnJheVRyYW5zZm9ybWVyJztcbmltcG9ydCB0cmltUmVzdWx0VHJhbnNmb3JtZXIgZnJvbSAnLi4vdHJpbVJlc3VsdFRyYW5zZm9ybWVyJztcbmltcG9ydCByZXBsYWNlUmVzdWx0VHJhbnNmb3JtZXIgZnJvbSAnLi4vcmVwbGFjZVJlc3VsdFRyYW5zZm9ybWVyJztcblxuY29uc3Qgb25lTGluZUNvbW1hTGlzdHNPciA9IG5ldyBUZW1wbGF0ZVRhZyhcbiAgaW5saW5lQXJyYXlUcmFuc2Zvcm1lcih7IHNlcGFyYXRvcjogJywnLCBjb25qdW5jdGlvbjogJ29yJyB9KSxcbiAgcmVwbGFjZVJlc3VsdFRyYW5zZm9ybWVyKC8oPzpcXHMrKS9nLCAnICcpLFxuICB0cmltUmVzdWx0VHJhbnNmb3JtZXIsXG4pO1xuXG5leHBvcnQgZGVmYXVsdCBvbmVMaW5lQ29tbWFMaXN0c09yO1xuIl19

    var oneLineCommaListsAnd = new TemplateTag(inlineArrayTransformer({ separator: ',', conjunction: 'and' }), replaceResultTransformer(/(?:\s+)/g, ' '), trimResultTransformer);
    //# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9vbmVMaW5lQ29tbWFMaXN0c0FuZC9vbmVMaW5lQ29tbWFMaXN0c0FuZC5qcyJdLCJuYW1lcyI6WyJUZW1wbGF0ZVRhZyIsImlubGluZUFycmF5VHJhbnNmb3JtZXIiLCJ0cmltUmVzdWx0VHJhbnNmb3JtZXIiLCJyZXBsYWNlUmVzdWx0VHJhbnNmb3JtZXIiLCJvbmVMaW5lQ29tbWFMaXN0c0FuZCIsInNlcGFyYXRvciIsImNvbmp1bmN0aW9uIl0sIm1hcHBpbmdzIjoiQUFBQSxPQUFPQSxXQUFQLE1BQXdCLGdCQUF4QjtBQUNBLE9BQU9DLHNCQUFQLE1BQW1DLDJCQUFuQztBQUNBLE9BQU9DLHFCQUFQLE1BQWtDLDBCQUFsQztBQUNBLE9BQU9DLHdCQUFQLE1BQXFDLDZCQUFyQzs7QUFFQSxJQUFNQyx1QkFBdUIsSUFBSUosV0FBSixDQUMzQkMsdUJBQXVCLEVBQUVJLFdBQVcsR0FBYixFQUFrQkMsYUFBYSxLQUEvQixFQUF2QixDQUQyQixFQUUzQkgseUJBQXlCLFVBQXpCLEVBQXFDLEdBQXJDLENBRjJCLEVBRzNCRCxxQkFIMkIsQ0FBN0I7O0FBTUEsZUFBZUUsb0JBQWYiLCJmaWxlIjoib25lTGluZUNvbW1hTGlzdHNBbmQuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgVGVtcGxhdGVUYWcgZnJvbSAnLi4vVGVtcGxhdGVUYWcnO1xuaW1wb3J0IGlubGluZUFycmF5VHJhbnNmb3JtZXIgZnJvbSAnLi4vaW5saW5lQXJyYXlUcmFuc2Zvcm1lcic7XG5pbXBvcnQgdHJpbVJlc3VsdFRyYW5zZm9ybWVyIGZyb20gJy4uL3RyaW1SZXN1bHRUcmFuc2Zvcm1lcic7XG5pbXBvcnQgcmVwbGFjZVJlc3VsdFRyYW5zZm9ybWVyIGZyb20gJy4uL3JlcGxhY2VSZXN1bHRUcmFuc2Zvcm1lcic7XG5cbmNvbnN0IG9uZUxpbmVDb21tYUxpc3RzQW5kID0gbmV3IFRlbXBsYXRlVGFnKFxuICBpbmxpbmVBcnJheVRyYW5zZm9ybWVyKHsgc2VwYXJhdG9yOiAnLCcsIGNvbmp1bmN0aW9uOiAnYW5kJyB9KSxcbiAgcmVwbGFjZVJlc3VsdFRyYW5zZm9ybWVyKC8oPzpcXHMrKS9nLCAnICcpLFxuICB0cmltUmVzdWx0VHJhbnNmb3JtZXIsXG4pO1xuXG5leHBvcnQgZGVmYXVsdCBvbmVMaW5lQ29tbWFMaXN0c0FuZDtcbiJdfQ==

    var inlineLists = new TemplateTag(inlineArrayTransformer, stripIndentTransformer, trimResultTransformer);
    //# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9pbmxpbmVMaXN0cy9pbmxpbmVMaXN0cy5qcyJdLCJuYW1lcyI6WyJUZW1wbGF0ZVRhZyIsInN0cmlwSW5kZW50VHJhbnNmb3JtZXIiLCJpbmxpbmVBcnJheVRyYW5zZm9ybWVyIiwidHJpbVJlc3VsdFRyYW5zZm9ybWVyIiwiaW5saW5lTGlzdHMiXSwibWFwcGluZ3MiOiJBQUFBLE9BQU9BLFdBQVAsTUFBd0IsZ0JBQXhCO0FBQ0EsT0FBT0Msc0JBQVAsTUFBbUMsMkJBQW5DO0FBQ0EsT0FBT0Msc0JBQVAsTUFBbUMsMkJBQW5DO0FBQ0EsT0FBT0MscUJBQVAsTUFBa0MsMEJBQWxDOztBQUVBLElBQU1DLGNBQWMsSUFBSUosV0FBSixDQUNsQkUsc0JBRGtCLEVBRWxCRCxzQkFGa0IsRUFHbEJFLHFCQUhrQixDQUFwQjs7QUFNQSxlQUFlQyxXQUFmIiwiZmlsZSI6ImlubGluZUxpc3RzLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IFRlbXBsYXRlVGFnIGZyb20gJy4uL1RlbXBsYXRlVGFnJztcbmltcG9ydCBzdHJpcEluZGVudFRyYW5zZm9ybWVyIGZyb20gJy4uL3N0cmlwSW5kZW50VHJhbnNmb3JtZXInO1xuaW1wb3J0IGlubGluZUFycmF5VHJhbnNmb3JtZXIgZnJvbSAnLi4vaW5saW5lQXJyYXlUcmFuc2Zvcm1lcic7XG5pbXBvcnQgdHJpbVJlc3VsdFRyYW5zZm9ybWVyIGZyb20gJy4uL3RyaW1SZXN1bHRUcmFuc2Zvcm1lcic7XG5cbmNvbnN0IGlubGluZUxpc3RzID0gbmV3IFRlbXBsYXRlVGFnKFxuICBpbmxpbmVBcnJheVRyYW5zZm9ybWVyLFxuICBzdHJpcEluZGVudFRyYW5zZm9ybWVyLFxuICB0cmltUmVzdWx0VHJhbnNmb3JtZXIsXG4pO1xuXG5leHBvcnQgZGVmYXVsdCBpbmxpbmVMaXN0cztcbiJdfQ==

    var oneLineInlineLists = new TemplateTag(inlineArrayTransformer, replaceResultTransformer(/(?:\s+)/g, ' '), trimResultTransformer);
    //# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9vbmVMaW5lSW5saW5lTGlzdHMvb25lTGluZUlubGluZUxpc3RzLmpzIl0sIm5hbWVzIjpbIlRlbXBsYXRlVGFnIiwiaW5saW5lQXJyYXlUcmFuc2Zvcm1lciIsInRyaW1SZXN1bHRUcmFuc2Zvcm1lciIsInJlcGxhY2VSZXN1bHRUcmFuc2Zvcm1lciIsIm9uZUxpbmVJbmxpbmVMaXN0cyJdLCJtYXBwaW5ncyI6IkFBQUEsT0FBT0EsV0FBUCxNQUF3QixnQkFBeEI7QUFDQSxPQUFPQyxzQkFBUCxNQUFtQywyQkFBbkM7QUFDQSxPQUFPQyxxQkFBUCxNQUFrQywwQkFBbEM7QUFDQSxPQUFPQyx3QkFBUCxNQUFxQyw2QkFBckM7O0FBRUEsSUFBTUMscUJBQXFCLElBQUlKLFdBQUosQ0FDekJDLHNCQUR5QixFQUV6QkUseUJBQXlCLFVBQXpCLEVBQXFDLEdBQXJDLENBRnlCLEVBR3pCRCxxQkFIeUIsQ0FBM0I7O0FBTUEsZUFBZUUsa0JBQWYiLCJmaWxlIjoib25lTGluZUlubGluZUxpc3RzLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IFRlbXBsYXRlVGFnIGZyb20gJy4uL1RlbXBsYXRlVGFnJztcbmltcG9ydCBpbmxpbmVBcnJheVRyYW5zZm9ybWVyIGZyb20gJy4uL2lubGluZUFycmF5VHJhbnNmb3JtZXInO1xuaW1wb3J0IHRyaW1SZXN1bHRUcmFuc2Zvcm1lciBmcm9tICcuLi90cmltUmVzdWx0VHJhbnNmb3JtZXInO1xuaW1wb3J0IHJlcGxhY2VSZXN1bHRUcmFuc2Zvcm1lciBmcm9tICcuLi9yZXBsYWNlUmVzdWx0VHJhbnNmb3JtZXInO1xuXG5jb25zdCBvbmVMaW5lSW5saW5lTGlzdHMgPSBuZXcgVGVtcGxhdGVUYWcoXG4gIGlubGluZUFycmF5VHJhbnNmb3JtZXIsXG4gIHJlcGxhY2VSZXN1bHRUcmFuc2Zvcm1lcigvKD86XFxzKykvZywgJyAnKSxcbiAgdHJpbVJlc3VsdFRyYW5zZm9ybWVyLFxuKTtcblxuZXhwb3J0IGRlZmF1bHQgb25lTGluZUlubGluZUxpc3RzO1xuIl19

    var stripIndent = new TemplateTag(stripIndentTransformer, trimResultTransformer);
    //# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9zdHJpcEluZGVudC9zdHJpcEluZGVudC5qcyJdLCJuYW1lcyI6WyJUZW1wbGF0ZVRhZyIsInN0cmlwSW5kZW50VHJhbnNmb3JtZXIiLCJ0cmltUmVzdWx0VHJhbnNmb3JtZXIiLCJzdHJpcEluZGVudCJdLCJtYXBwaW5ncyI6IkFBQUEsT0FBT0EsV0FBUCxNQUF3QixnQkFBeEI7QUFDQSxPQUFPQyxzQkFBUCxNQUFtQywyQkFBbkM7QUFDQSxPQUFPQyxxQkFBUCxNQUFrQywwQkFBbEM7O0FBRUEsSUFBTUMsY0FBYyxJQUFJSCxXQUFKLENBQ2xCQyxzQkFEa0IsRUFFbEJDLHFCQUZrQixDQUFwQjs7QUFLQSxlQUFlQyxXQUFmIiwiZmlsZSI6InN0cmlwSW5kZW50LmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IFRlbXBsYXRlVGFnIGZyb20gJy4uL1RlbXBsYXRlVGFnJztcbmltcG9ydCBzdHJpcEluZGVudFRyYW5zZm9ybWVyIGZyb20gJy4uL3N0cmlwSW5kZW50VHJhbnNmb3JtZXInO1xuaW1wb3J0IHRyaW1SZXN1bHRUcmFuc2Zvcm1lciBmcm9tICcuLi90cmltUmVzdWx0VHJhbnNmb3JtZXInO1xuXG5jb25zdCBzdHJpcEluZGVudCA9IG5ldyBUZW1wbGF0ZVRhZyhcbiAgc3RyaXBJbmRlbnRUcmFuc2Zvcm1lcixcbiAgdHJpbVJlc3VsdFRyYW5zZm9ybWVyLFxuKTtcblxuZXhwb3J0IGRlZmF1bHQgc3RyaXBJbmRlbnQ7XG4iXX0=

    var stripIndents = new TemplateTag(stripIndentTransformer('all'), trimResultTransformer);
    //# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9zdHJpcEluZGVudHMvc3RyaXBJbmRlbnRzLmpzIl0sIm5hbWVzIjpbIlRlbXBsYXRlVGFnIiwic3RyaXBJbmRlbnRUcmFuc2Zvcm1lciIsInRyaW1SZXN1bHRUcmFuc2Zvcm1lciIsInN0cmlwSW5kZW50cyJdLCJtYXBwaW5ncyI6IkFBQUEsT0FBT0EsV0FBUCxNQUF3QixnQkFBeEI7QUFDQSxPQUFPQyxzQkFBUCxNQUFtQywyQkFBbkM7QUFDQSxPQUFPQyxxQkFBUCxNQUFrQywwQkFBbEM7O0FBRUEsSUFBTUMsZUFBZSxJQUFJSCxXQUFKLENBQ25CQyx1QkFBdUIsS0FBdkIsQ0FEbUIsRUFFbkJDLHFCQUZtQixDQUFyQjs7QUFLQSxlQUFlQyxZQUFmIiwiZmlsZSI6InN0cmlwSW5kZW50cy5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBUZW1wbGF0ZVRhZyBmcm9tICcuLi9UZW1wbGF0ZVRhZyc7XG5pbXBvcnQgc3RyaXBJbmRlbnRUcmFuc2Zvcm1lciBmcm9tICcuLi9zdHJpcEluZGVudFRyYW5zZm9ybWVyJztcbmltcG9ydCB0cmltUmVzdWx0VHJhbnNmb3JtZXIgZnJvbSAnLi4vdHJpbVJlc3VsdFRyYW5zZm9ybWVyJztcblxuY29uc3Qgc3RyaXBJbmRlbnRzID0gbmV3IFRlbXBsYXRlVGFnKFxuICBzdHJpcEluZGVudFRyYW5zZm9ybWVyKCdhbGwnKSxcbiAgdHJpbVJlc3VsdFRyYW5zZm9ybWVyLFxuKTtcblxuZXhwb3J0IGRlZmF1bHQgc3RyaXBJbmRlbnRzO1xuIl19

    var sfx = ["mfx_back", "mfx_change_color", "mfx_chat_received", "mfx_coin", "mfx_coin_portal", "mfx_confirm", "mfx_flashy_shing", "mfx_forward", "mfx_hover", "mfx_hp", "mfx_hp_spawn", "mfx_input_back", "mfx_input_end", "mfx_input_key", "mfx_levelup", "mfx_logo_shing", "mfx_map_open", "mfx_map_zoom", "mfx_mm_coin", "mfx_mm_coin_all", "mfx_mm_coin_win", "mfx_move_cursor", "mfx_notice", "mfx_option", "mfx_orby_talk", "mfx_orby_talk_done", "mfx_place_marker", "mfx_player_found", "mfx_player_ready", "mfx_result_expand", "mfx_return_cursor", "mfx_ring_bell", "mfx_ring_bell2", "mfx_star", "mfx_timertick", "mfx_timertick2", "mfx_timertick_holy", "mfx_timertick_holy2", "mfx_title_loop", "mfx_title_start", "mfx_title_zoom", "mfx_title_zoom_fast", "mfx_tut_fail", "mfx_unstar", "mfx_wave_complete", "mfx_xp", "playerdefeated_sfx", "plop_sfx", "pullbomb_sfx", "punch_sfx", "select_sfx", "sfx_321", "sfx_absa_8b", "sfx_absa_boltcloud", "sfx_absa_champ_loop", "sfx_absa_cloud_crackle", "sfx_absa_cloud_place", "sfx_absa_cloud_placepop", "sfx_absa_cloud_pop", "sfx_absa_cloud_send", "sfx_absa_concentrate", "sfx_absa_current_pop", "sfx_absa_dashdown", "sfx_absa_dashup", "sfx_absa_dattack", "sfx_absa_gp", "sfx_absa_harderhit", "sfx_absa_jab1", "sfx_absa_jab2", "sfx_absa_jabloop", "sfx_absa_jump", "sfx_absa_kickhit", "sfx_absa_new_whip1", "sfx_absa_new_whip2", "sfx_absa_orb_hit", "sfx_absa_orb_miss", "sfx_absa_orb_missrelease", "sfx_absa_singlezap1", "sfx_absa_singlezap2", "sfx_absa_taunt", "sfx_absa_uair", "sfx_absa_whip", "sfx_absa_whip2", "sfx_absa_whip3", "sfx_absa_whip_charge", "sfx_abyss_bomb_spawn", "sfx_abyss_capture_end", "sfx_abyss_capturing", "sfx_abyss_despawn", "sfx_abyss_explosion", "sfx_abyss_explosion_big", "sfx_abyss_explosion_start", "sfx_abyss_hazard_burst", "sfx_abyss_hazard_hit", "sfx_abyss_hazard_start", "sfx_abyss_hex_curse", "sfx_abyss_hex_hit", "sfx_abyss_portal_intro", "sfx_abyss_portal_spawn", "sfx_abyss_rumble", "sfx_abyss_seed_explode", "sfx_abyss_seed_fall", "sfx_abyss_seed_land", "sfx_abyss_spawn", "sfx_bigplant_clamp", "sfx_bigplant_eat", "sfx_bigplant_lunge", "sfx_birdclap", "sfx_birdflap", "sfx_bird_downspecial", "sfx_bird_downspecial_end", "sfx_bird_nspecial", "sfx_bird_nspecial2", "sfx_bird_screech", "sfx_bird_sidespecial", "sfx_bird_sidespecial_start", "sfx_bird_upspecial", "sfx_bite", "sfx_blink_dash", "sfx_blow_double1", "sfx_blow_double2", "sfx_blow_heavy1", "sfx_blow_heavy2", "sfx_blow_medium1", "sfx_blow_medium2", "sfx_blow_medium3", "sfx_blow_weak1", "sfx_blow_weak2", "sfx_boss_explosion", "sfx_boss_final_cannon", "sfx_boss_final_charge", "sfx_boss_fireball", "sfx_boss_fireball_big", "sfx_boss_fireball_land", "sfx_boss_laser", "sfx_boss_laser_hit", "sfx_boss_shine", "sfx_boss_vortex", "sfx_boss_vortex_end", "sfx_boss_vortex_start", "sfx_bubblemouth", "sfx_bubblepop", "sfx_bubblespray", "sfx_bubblespray_breathless", "sfx_burnapplied", "sfx_burnconsume", "sfx_burnend", "sfx_buzzsaw_hit", "sfx_buzzsaw_throw", "sfx_charge_blade_ready", "sfx_charge_blade_swing", "sfx_chester_appear", "sfx_chester_jump", "sfx_chest_open", "sfx_chest_rummage", "sfx_clairen_dspecial_counter_active", "sfx_clairen_dspecial_counter_success", "sfx_clairen_fspecial_dash", "sfx_clairen_fspecial_slash", "sfx_clairen_hair", "sfx_clairen_hit_med", "sfx_clairen_hit_strong", "sfx_clairen_hit_weak", "sfx_clairen_nspecial_grab_miss", "sfx_clairen_nspecial_grab_success", "sfx_clairen_poke_med", "sfx_clairen_poke_strong", "sfx_clairen_poke_weak", "sfx_clairen_spin", "sfx_clairen_swing_med", "sfx_clairen_swing_mega_delayed", "sfx_clairen_swing_mega_instant", "sfx_clairen_swing_strong", "sfx_clairen_swing_weak", "sfx_clairen_sword_activate", "sfx_clairen_sword_deactivate", "sfx_clairen_tip_assist", "sfx_clairen_tip_loop", "sfx_clairen_tip_med", "sfx_clairen_tip_strong", "sfx_clairen_tip_weak", "sfx_clairen_uspecial_rise", "sfx_clairen_uspecial_swing", "sfx_coin_capture", "sfx_coin_collect", "sfx_crunch", "sfx_crunch_water", "sfx_dash_start", "sfx_death1", "sfx_death2", "sfx_diamond_collect", "sfx_diamond_small_collect", "sfx_dizzy", "sfx_dust_knuckle", "sfx_ell_arc_small_missile_ground", "sfx_ell_arc_taunt_collect", "sfx_ell_arc_taunt_collide", "sfx_ell_arc_taunt_end", "sfx_ell_arc_taunt_start", "sfx_ell_big_missile_fire", "sfx_ell_big_missile_ground", "sfx_ell_cooldown", "sfx_ell_drill_loop", "sfx_ell_drill_stab", "sfx_ell_dspecial_drop", "sfx_ell_dspecial_explosion_1", "sfx_ell_dspecial_explosion_2", "sfx_ell_dspecial_explosion_3", "sfx_ell_dspecial_hit", "sfx_ell_dspecial_stick", "sfx_ell_dtilt1", "sfx_ell_dtilt2", "sfx_ell_eject", "sfx_ell_explosion_medium", "sfx_ell_fist_explode", "sfx_ell_fist_fire", "sfx_ell_fspecial_charge", "sfx_ell_hover", "sfx_ell_missile_loop", "sfx_ell_nair", "sfx_ell_overheat", "sfx_ell_propeller_loop_heavy", "sfx_ell_propeller_loop_light", "sfx_ell_propeller_loop_med", "sfx_ell_small_missile_fire", "sfx_ell_small_missile_ground", "sfx_ell_steam_hit", "sfx_ell_steam_release", "sfx_ell_strong_attack_explosion", "sfx_ell_uspecial_explode", "sfx_ell_uspecial_rebuild", "sfx_ell_utilt_cannon", "sfx_ell_utilt_fire", "sfx_ell_utilt_hit", "sfx_ell_utilt_loop", "sfx_ell_utilt_retract", "sfx_fishing_rod_cast", "sfx_fishing_rod_catch", "sfx_fishing_rod_land", "sfx_fishing_rod_reel", "sfx_fish_collect", "sfx_flareo_rod", "sfx_flare_razer", "sfx_forsburn_breath", "sfx_forsburn_cape_hit", "sfx_forsburn_cape_multihit", "sfx_forsburn_cape_swipe", "sfx_forsburn_combust", "sfx_forsburn_consume", "sfx_forsburn_consume_fail", "sfx_forsburn_consume_full", "sfx_forsburn_disappear", "sfx_forsburn_reappear", "sfx_forsburn_reappear_hit", "sfx_forsburn_spew2", "sfx_forsburn_spew_end", "sfx_forsburn_spew_smoke", "sfx_forsburn_split", "sfx_frog_croak", "sfx_frog_dspecial_cast", "sfx_frog_dspecial_hit", "sfx_frog_dspecial_hit_ground", "sfx_frog_dspecial_spit", "sfx_frog_dspecial_swallow", "sfx_frog_dstrong", "sfx_frog_fspecial_cancel", "sfx_frog_fspecial_charge_full", "sfx_frog_fspecial_charge_gained_1", "sfx_frog_fspecial_charge_gained_2", "sfx_frog_fspecial_charge_loop", "sfx_frog_fspecial_fire", "sfx_frog_fspecial_start", "sfx_frog_fstrong", "sfx_frog_gong_hit", "sfx_frog_jab", "sfx_frog_nspecial_cast", "sfx_frog_nspecial_shove", "sfx_frog_uspecial_cast", "sfx_frog_uspecial_divekick", "sfx_frog_uspecial_spin", "sfx_frog_ustrong", "sfx_gem_collect", "sfx_ghost_glove", "sfx_go", "sfx_grass_creature", "sfx_gus_dirt", "sfx_gus_jump", "sfx_gus_land", "sfx_gus_propeller_dagger_wall", "sfx_holy_die", "sfx_holy_grass", "sfx_holy_lightning", "sfx_holy_tablet", "sfx_holy_tablet_appear", "sfx_holy_tablet_spawning", "sfx_holy_textbox", "sfx_icehit_heavy1", "sfx_icehit_heavy2", "sfx_icehit_medium1", "sfx_icehit_medium2", "sfx_icehit_weak1", "sfx_icehit_weak2", "sfx_ice_back_air", "sfx_ice_burst_up", "sfx_ice_chain", "sfx_ice_dspecial_form", "sfx_ice_dspecial_ground", "sfx_ice_end", "sfx_ice_fspecial_hit_ground", "sfx_ice_fspecial_roar", "sfx_ice_ftilt", "sfx_ice_hammerstart", "sfx_ice_nspecial_armor", "sfx_ice_nspecial_hit_ground", "sfx_ice_on_player", "sfx_ice_shatter", "sfx_ice_shatter_big", "sfx_ice_shieldup", "sfx_ice_sleep", "sfx_ice_uspecial_jump", "sfx_ice_uspecial_start", "sfx_ice_wake", "sfx_infinidagger", "sfx_jumpair", "sfx_jumpground", "sfx_kragg_rock_land", "sfx_kragg_rock_pillar", "sfx_kragg_rock_pull", "sfx_kragg_rock_shatter", "sfx_kragg_roll_end", "sfx_kragg_roll_land", "sfx_kragg_roll_loop", "sfx_kragg_roll_start", "sfx_kragg_roll_turn", "sfx_kragg_spike", "sfx_kragg_throw", "sfx_land", "sfx_land_heavy", "sfx_land_light", "sfx_land_med", "sfx_land_med2", "sfx_leafy_hit1", "sfx_leafy_hit2", "sfx_leafy_hit3", "sfx_leaves", "sfx_may_arc_coineat", "sfx_may_arc_cointoss", "sfx_may_arc_five", "sfx_may_arc_hit", "sfx_may_arc_plant", "sfx_may_arc_talk", "sfx_may_arc_talkstart", "sfx_may_root", "sfx_may_whip1", "sfx_may_whip2", "sfx_may_wrap1", "sfx_may_wrap2", "sfx_metal_hit_strong", "sfx_metal_hit_weak", "sfx_mobile_gear_deploy", "sfx_mobile_gear_jump", "sfx_mobile_gear_move", "sfx_mobile_gear_wall", "sfx_obstacle_hit", "sfx_old_orca_bite", "sfx_orcane_dsmash", "sfx_orcane_fspecial", "sfx_orcane_fspecial_pud", "sfx_orca_absorb", "sfx_orca_bite", "sfx_orca_crunch", "sfx_orca_roll", "sfx_orca_roll_snow", "sfx_orca_shake", "sfx_orca_shake_water", "sfx_orca_snow_evaporate", "sfx_orca_snow_mouth", "sfx_orca_soak", "sfx_ori_bash_hit", "sfx_ori_bash_launch", "sfx_ori_bash_projectile", "sfx_ori_bash_use", "sfx_ori_charged_flame_charge", "sfx_ori_charged_flame_charge2", "sfx_ori_charged_flame_hit", "sfx_ori_charged_flame_release", "sfx_ori_dash_attack_perform", "sfx_ori_dsmash_seinhits", "sfx_ori_dsmash_skitter_alone", "sfx_ori_dsmash_skitter_sein", "sfx_ori_dspecial_bash_miss", "sfx_ori_dtilt_perform", "sfx_ori_energyhit_heavy", "sfx_ori_energyhit_medium", "sfx_ori_energyhit_weak", "sfx_ori_energy_hit", "sfx_ori_glide_end", "sfx_ori_glide_featherout", "sfx_ori_glide_hit", "sfx_ori_glide_start", "sfx_ori_grenade_aim", "sfx_ori_grenade_hit", "sfx_ori_grenade_hit_ground", "sfx_ori_grenade_launch", "sfx_ori_seinhit_heavy", "sfx_ori_seinhit_medium", "sfx_ori_seinhit_weak", "sfx_ori_sein_fstrong", "sfx_ori_sein_fstrong_hit", "sfx_ori_sein_fstrong_hit_final", "sfx_ori_sein_strong_start", "sfx_ori_spirit_flame_1", "sfx_ori_spirit_flame_2", "sfx_ori_spirit_flame_hit_1", "sfx_ori_spirit_flame_hit_2", "sfx_ori_stomp_hit", "sfx_ori_stomp_hitplayer", "sfx_ori_stomp_spin", "sfx_ori_superjump_sein", "sfx_ori_taunt", "sfx_ori_taunt2", "sfx_ori_uptilt", "sfx_ori_uptilt_single", "sfx_ori_ustrong_charge", "sfx_ori_ustrong_launch", "sfx_owl0", "sfx_owl1", "sfx_owl2", "sfx_owl3", "sfx_owl4", "sfx_parry_success", "sfx_parry_use", "sfx_phase_locket", "sfx_pillar_crumble", "sfx_plant_eat", "sfx_plant_fat", "sfx_plant_ready", "sfx_plant_shoot", "sfx_plant_stepped", "sfx_plasma_field_loop", "sfx_playerdefeated", "sfx_poison_hit_med", "sfx_poison_hit_strong", "sfx_poison_hit_weak", "sfx_propeller_dagger_draw", "sfx_propeller_dagger_loop", "sfx_propeller_dagger_release", "sfx_quick_dodge", "sfx_rag_axe_hitsground", "sfx_rag_axe_swing", "sfx_rag_mark", "sfx_rag_plant_eat", "sfx_rag_plant_ready", "sfx_rag_plant_shoot", "sfx_rag_root", "sfx_rag_whip", "sfx_ring_crowd", "sfx_roll", "sfx_sand_screech", "sfx_sand_yell", "sfx_shop_buy", "sfx_shop_close", "sfx_shop_invalid", "sfx_shop_move", "sfx_shop_open", "sfx_shovel_brandish", "sfx_shovel_dig", "sfx_shovel_hit_heavy1", "sfx_shovel_hit_heavy2", "sfx_shovel_hit_light1", "sfx_shovel_hit_light2", "sfx_shovel_hit_light3", "sfx_shovel_hit_med1", "sfx_shovel_hit_med2", "sfx_shovel_knight_die", "sfx_shovel_knight_fanfare", "sfx_shovel_swing_heavy1", "sfx_shovel_swing_heavy2", "sfx_shovel_swing_light1", "sfx_shovel_swing_light2", "sfx_shovel_swing_med1", "sfx_shovel_swing_med2", "sfx_spin", "sfx_spin_longer", "sfx_springgo", "sfx_springswitch", "sfx_stage_pillar", "sfx_swipe_heavy1", "sfx_swipe_heavy2", "sfx_swipe_medium1", "sfx_swipe_medium2", "sfx_swipe_weak1", "sfx_swipe_weak2", "sfx_swish_heavy", "sfx_swish_heavy2", "sfx_swish_medium", "sfx_swish_weak", "sfx_syl_dspecial_growth", "sfx_syl_dspecial_howl", "sfx_syl_dspecial_howlgrowth", "sfx_syl_dspecial_plantaway", "sfx_syl_dstrong", "sfx_syl_fspecial_bite", "sfx_syl_fstrong", "sfx_syl_fstrong_final", "sfx_syl_nspecial", "sfx_syl_nspecial_flowerhit", "sfx_syl_nspecial_plantgrowth", "sfx_syl_promo1", "sfx_syl_uspecial_travel_loop", "sfx_syl_uspecial_travel_start", "sfx_syl_ustrong", "sfx_syl_ustrong_part1", "sfx_syl_ustrong_part2", "sfx_syl_ustrong_part3", "sfx_tow_anchor_land", "sfx_tow_anchor_start", "sfx_troupple_fin_flap", "sfx_troupple_fish_splash_in", "sfx_troupple_fish_splash_out", "sfx_troupple_rumble", "sfx_troupple_splash_big", "sfx_troupple_swipe", "sfx_upbcharge", "sfx_upbmove", "sfx_war_horn", "sfx_watergun_fire", "sfx_watergun_splash", "sfx_waterhit_heavy", "sfx_waterhit_heavy2", "sfx_waterhit_medium", "sfx_waterhit_weak", "sfx_waterwarp", "sfx_waterwarp_start", "sfx_waveland_abs", "sfx_waveland_cla", "sfx_waveland_ell", "sfx_waveland_eta", "sfx_waveland_fors", "sfx_waveland_gus", "sfx_waveland_kra", "sfx_waveland_may", "sfx_waveland_orc", "sfx_waveland_ori", "sfx_waveland_ran", "sfx_waveland_syl", "sfx_waveland_wra", "sfx_waveland_zet", "sfx_zap", "sfx_zetter_downb", "sfx_zetter_fireball_fire", "sfx_zetter_shine", "sfx_zetter_shine_charged", "sfx_zetter_shine_taunt", "sfx_zetter_upb_hit"];

    var winProps = {
        AG_WINDOW_TYPE: {
            value: 0,
            description: stripIndent`
        0 = Normal
        7 = Goes into pratfall
        8 = Goes to the next window if it’s on the ground, otherwise loops
        9 = Looping window
        `,
            type: [0, 7, 8, 9]
        },
        AG_WINDOW_LENGTH: {
            value: 5,
            description: 'The duration of the window, in frames',
            type: 'number'
        },
        AG_WINDOW_ANIM_FRAMES: {
            value: 1,
            description: 'The number of animation frames to display over the duration of the window',
            type: 'number'
        },
        AG_WINDOW_ANIM_FRAME_START: {
            value: 0,
            description: 'The animation frame on which the window starts',
            type: 'number'
        },
        AG_WINDOW_HSPEED: {
            value: null,
            description: 'The horizontal speed to apply during the window in pixels per frame. The type of speed boost depends on AG_WINDOW_HSPEED_TYPE',
            type: 'number'
        },
        AG_WINDOW_VSPEED: {
            value: null,
            description: 'The vertical speed to apply during the window in pixels per frame. The type of speed boost depends on AG_WINDOW_VSPEED_TYPE',
            type: 'number'
        },
        AG_WINDOW_HSPEED_TYPE: {
            value: 0,
            description: stripIndent`
        0 = AG_WINDOW_HSPEED is applied on top of your current momentum as a boost
        1 = Horizontal speed is set to AG_WINDOW_HSPEED on every frame of the window
        2 = Horizontal speed is set to AG_WINDOW_HSPEED on the first frame of the window
        `,
            type: [0, 1, 2]
        },
        AG_WINDOW_VSPEED_TYPE: {
            value: 0,
            description: stripIndent`
        0 = AG_WINDOW_VSPEED is applied on top of your current momentum as a boost
        1 = Vertical speed is set to AG_WINDOW_VSPEED on every frame of the window
        2 = Vertical speed is set to AG_WINDOW_VSPEED on the first frame of the window
        `,
            type: [0, 1, 2]
        },
        AG_WINDOW_HAS_CUSTOM_FRICTION: {
            value: 0,
            description: stripIndent`
        0 = Uses default friction
        1 = Uses custom friction
        `,
            type: [0, 1]
        },
        AG_WINDOW_CUSTOM_AIR_FRICTION: {
            value: null,
            description: 'The horizontal friction to apply per frame while aerial. Only applies if AG_WINDOW_HAS_CUSTOM_FRICTION is 1',
            type: 'number',
            dependencies: ['obj.AG_WINDOW_HAS_CUSTOM_FRICTION.value === 1']
        },
        AG_WINDOW_CUSTOM_GROUND_FRICTION: {
            value: null,
            description: 'The horizontal friction to apply per frame while grounded. Only applies if AG_WINDOW_HAS_CUSTOM_FRICTION is 1',
            type: 'number',
            dependencies: ['obj.AG_WINDOW_HAS_CUSTOM_FRICTION.value === 1']
        },
        AG_WINDOW_CUSTOM_GRAVITY: {
            value: null,
            description: 'The gravitational acceleration to apply every frame of the window. Only applies if AG_USES_CUSTOM_GRAVITY is 1',
            type: 'number'
        },
        AG_WINDOW_HAS_WHIFFLAG: {
            value: 0,
            description: stripIndent`
        0 = Window is always the same length
        1 = Window is 1.5x longer if you haven’t hit someone
        `,
            type: [0, 1]
        },
        AG_WINDOW_INVINCIBILITY: {
            value: 0,
            description: stripIndent`
        0 = No invincibility
        1 = Invincible to all attacks
        2 = Invincible to projectiles
        `,
            type: [0, 1, 2]
        },
        AG_WINDOW_HITPAUSE_FRAME: {
            value: 0,
            description: 'The animation frame to show during hitpause; 0 = no specific frame',
            type: 'number'
        },
        AG_WINDOW_CANCEL_TYPE: {
            value: 0,
            description: stripIndent`
        0 = Window does not cancel
        1 = Cancels into the next window if attack is pressed (when on a jab, this allows it to be tilt-cancelled)
        2 = Cancels into the next window if special is pressed
        Cancels do not work if AG_WINDOW_TYPE is 8
        `,
            type: [0, 1, 2]
        },
        AG_WINDOW_CANCEL_FRAME: {
            value: null,
            description: 'If AG_WINDOW_CANCEL_TYPE is greater than 0, the attack will become cancellable on this frame',
            type: 'number',
            dependencies: ["obj.AG_WINDOW_CANCEL_TYPE.value !== 0"]
        },
        AG_WINDOW_HAS_SFX: {
            value: 0,
            description: stripIndent`
        0 = Does not have a sound effect
        1 = Has a sound effect
        `,
            type: [0, 1]
        },
        AG_WINDOW_SFX: {
            value: null,
            description: 'The index of the sound effect. Only applies if AG_WINDOW_HAS_SFX is 1',
            type: `sound`,
            options: JSON.stringify(sfx),
            dependencies: ["obj.AG_WINDOW_HAS_SFX.value == 1"]
        },
        AG_WINDOW_SFX_FRAME: {
            value: null,
            description: 'The frame in the window that the sound effect is played. Only applies if AG_WINDOW_HAS_SFX is 1',
            type: 'number',
            dependencies: ["obj.AG_WINDOW_HAS_SFX.value == 1"]
        },
    };

    const isDisabled = (prop, obj) => {
        let deps = obj[prop].dependencies;
        if (!deps) return false;
        for (const condition of deps) {
            // eval is fine here because it's 100% client-side
            if (eval(condition)) continue;
            else return true;
        }
        return false;
    };

    /*
    {
        value: ,
        description: ''
    }


    */

    var hitboxProps = {
        HG_PARENT_HITBOX: {
            value: 0,
            description: stripIndent`
        If HG_PARENT_HITBOX is anything other than 0, then it will inherit all values from the hitbox with index: HG_PARENT_HITBOX for all properties except the following:
        HG_HITBOX_TYPE
        HG_WINDOW
        HG_WINDOW_CREATION_FRAME
        HG_LIFETIME
        HG_HITBOX_X
        HG_HITBOX_Y
        HG_HITBOX_GROUP
        `,
            type: 'number',
        },
        HG_HITBOX_TYPE: {
            value: 1,
            description: stripIndent`
        1 = Physical attack
        2 = Projectile
        `,
            type: [1, 2],
        },
        HG_WINDOW: {
            value: 0,
            description: stripIndent`
        The attack window in which the hitbox is created
        `,
            type: 'number',
        },
        HG_WINDOW_CREATION_FRAME: {
            value: 0,
            description: stripIndent`
        The frame in which the hitbox is created, relative to the start of the attack window
        `,
            type: 'number',
        },
        HG_LIFETIME: {
            value: 1,
            description: stripIndent`
        The duration of the hitbox, in frames
        `,
            type: 'number',
        },
        HG_HITBOX_X: {
            value: 0,
            description: stripIndent`
        The x position of the center of the hitbox, relative to the center of the player
        `,
            type: 'number',
        },
        HG_HITBOX_Y: {
            value: 0,
            description: stripIndent`
        The y position of the center of the hitbox, relative to the bottom of the player
        `,
            type: 'number',
        },
        HG_WIDTH: {
            value: 1,
            description: stripIndent`
        The width of the hitbox, in pixels
        `,
            type: 'number',
        },
        HG_HEIGHT: {
            value: 1,
            description: stripIndent`
        The height of the hitbox, in pixels
        `,
            type: 'number',
        },
        HG_SHAPE: {
            value: 0,
            description: stripIndent`
        0 = Circle (hitbox_circle_spr)
        1 = Rectangle (hitbox_square_spr)
        2 = Rounded Rectangle (hitbox_rounded_rectangle)
        `,
            type: [0, 1, 2],
        },
        HG_PRIORITY: {
            value: 1,
            description: stripIndent`
        Ranges from 1 to 10, with a priority 10 hitbox taking priority over a priority 1 hitbox if both hit at the same time
        `,
            type: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
        },
        HG_DAMAGE: {
            value: 0,
            description: stripIndent`
        The damage dealt by the hitbox
        `,
            type: 'number',
        },
        HG_ANGLE: {
            value: 0,
            description: stripIndent`
        The angle at which the hitbox sends opponents. 
        0 is straight horizontally forward, 90 is upward, 270 is downward. 
        A value of 361 will send at 45 for aerial opponents and 40 for grounded opponents. 
        Can be overwritten or modified by HG_ANGLE_FLIPPER
        `,
            type: 'number',
        },
        HG_BASE_KNOCKBACK: {
            value: 0,
            description: stripIndent`
        The amount of knockback the move applies to an opponent regardless of their damage
        `,
            type: 'number',
        },
        HG_KNOCKBACK_SCALING: {
            value:0 ,
            description: stripIndent`
        The amount of knockback to add to HG_BASE_KNOCKBACK relative to the opponent’s damage
        `,
            type: 'number',
        },
        HG_EFFECT: {
            value: 0,
            description: stripIndent`
        1 = Burn
        2 = Burn consume
        3 = Burn stun (extra hitpause on burning opponents. Used to guarantee the final hit on Zetterburn’s empowered strong attack)
        4 = Wrap
        5 = Freeze
        6 = Mark
        8 = Auto Wrap
        9 = Polite (only deals hitstun if already in hitstun)
        10 = Poison
        11 = Plasma Stun
        12 = Crouch armors through it
        `,
            type: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
        },
        HG_BASE_HITPAUSE: {
            value: 0,
            description: stripIndent`
        The amount of hitpause the move applies to an opponent regardless of their damage
        `,
            type: 'number',
        },
        HG_HITPAUSE_SCALING: {
            value: 0,
            description: stripIndent`
        The amount of hitpause to add to HG_BASE_HITPAUSE relative to the opponent’s damage
        `,
            type: 'number',
        },
        HG_VISUAL_EFFECT: {
            value: 0,
            description: stripIndent`
        The visual effect to create when the hitbox hits something
        `,
            type: 'number',
        },
        HG_VISUAL_EFFECT_X_OFFSET: {
            value: 0,
            description: stripIndent`
        Normally, the visual effect is created between the center of the hitbox and the opponent’s position. 
        The value here adds an offset to the center of the hitbox in that calculation
        `,
            type: 'number',
        },
        HG_VISUAL_EFFECT_Y_OFFSET: {
            value: 0,
            description: stripIndent`
        Normally, the visual effect is created between the center of the hitbox and the opponent’s position. 
        The value here adds an offset to the center of the hitbox in that calculation
        `,
            type: 'number',
        },
        HG_HIT_SFX: {
            value: 0,
            description: stripIndent`
        The index of the sound effect to play when the attack hits
        `,
            options: JSON.stringify(sfx),
            type: `sound {${JSON.stringify(sfx)}}`,
        },
        HG_ANGLE_FLIPPER: {
            value: 0,
            description: stripIndent`
        0 = Sends at the exact knockback_angle every time
        1 = Sends away from the center of the enemy player
        2 = Sends toward the center of the enemy player
        3 = Horizontal knockback sends away from the center of the hitbox
        4 = Horizontal knockback sends toward the center of the hitbox
        5 = Horizontal knockback is reversed
        6 = Horizontal knockback sends away from the enemy player
        7 = Horizontal knockback sends toward the enemy player
        8 = Sends away from the center of the hitbox
        9 = Sends toward the center of the hitbox
        `,
            type: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
        },
        HG_EXTRA_HITPAUSE: {
            value: 0,
            description: stripIndent`
        Extra hitpause to apply to the opponent only. Can be negative
        `,
            type: 'number',
        },
        HG_GROUNDEDNESS: {
            value: 0,
            description: stripIndent`
        0 = Can hit both aerial and grounded opponents
        1 = Can only hit grounded opponents
        2 = Can only hit aerial opponents
        `,
            type: [0, 1, 2],
        },
        HG_EXTRA_CAMERA_SHAKE: {
            value: 0,
            description: stripIndent`
        -1 = No camera shake
        0 = Normal camera shake. Only applied if knockback speed is above 1
        1 = Force camera shake, even if knockback speed is lower than 1
        `,
            type: [-1, 0, 1],
        },
        HG_IGNORES_PROJECTILES: {
            value: 0,
            description: stripIndent`
        0 = Can break projectiles
        1 = Cannot break projectiles
        `,
            type: [0, 1],
        },
        HG_HIT_LOCKOUT: {
            value: 0,
            description: stripIndent`
        The number of frames after this hitbox connects where another hitbox belonging to the same player cannot hit the opponent
        `,
            type: 'number',
        },
        HG_EXTENDED_PARRY_STUN: {
            value: 0,
            description: stripIndent`
        When this hitbox is parried, the amount of parry stun inflicted on the opponent will be relative to the distance between you
        `,
            type: 'number',
        },
        HG_HITBOX_GROUP: {
            value: 0,
            description: stripIndent`
        Only one hitbox per group can hit an opponent until the attack ends. 
        This can be overwritten by calling attack_end() to manually reset all hitbox group flags. 
        Hitboxes in group -1 can always hit an opponent. Projectiles always belong to group -1
        `,
            type: 'number',
        },
        HG_HITSTUN_MULTIPLIER: {
            value: 0,
            description: stripIndent`
        The value by which hitstun is multiplied after being calculated normally. 
        A value of 0 results in default hitstun (the same as a value of 1)
        `,
            type: 'number',
        },
        HG_DRIFT_MULTIPLIER: {
            value: 1,
            description: stripIndent`
        Causes the acceleration of the opponent’s drift DI to be multiplied by this value
        `,
            type: 'number',
        },
        HG_SDI_MULTIPLIER: {
            value: 1,
            description: stripIndent`
        Causes the distance of the opponent’s SDI to be multiplied by this value.
        `,
            type: 'number',
        },
        HG_TECHABLE: {
            value: 0,
            description: stripIndent`
        0 = Can tech
        1 = Cannot tech
        2 = Goes through platforms (used by Etalus Uair)
        3 = Cannot tech or bounce
        `,
            type: [0, 1, 2, 3],
        },
        HG_FORCE_FLINCH: {
            value: 0,
            description: stripIndent`
        0 = Does not force flinch
        1 = Forces grounded opponents to flinch
        2 = Cannot cause opponents to flinch
        3 = Causes crouching opponents to flinch
        `,
            type: [0, 1, 2, 3],
        },
        HG_FINAL_BASE_KNOCKBACK: {
            value: 0,
            description: stripIndent`
        If this is greater than 0, the base knockback of the hitbox will progress linearly from HG_BASE_KNOCKBACK to HG_FINAL_BASE_KNOCKBACK over the span of the hitbox’s lifetime
        `,
            type: 'number',
        },
        HG_THROWS_ROCK: {
            value: 0,
            description: stripIndent`
        0 = Breaks rock
        1 = Throws rock
        2 = Ignores rock
        `,
            type: [0, 1, 2],
        },

        // PROJECTILE ONLY ATTRIBUTES
        HG_PROJECTILE_SPRITE: {
            value: "...",
            description: stripIndent`
        The sprite to loop for the projectile’s animation
        `,
            type: 'string',
            dependencies: ["obj.HG_HITBOX_TYPE.value == 2"]
        },
        HG_PROJECTILE_MASK: {
            value: "...",
            description: stripIndent`
        The sprite to use for the projectile’s collision (uses precise collision). Set to -1 to use normal hitbox collision with HG_SHAPE
        `,
            type: 'string',
            dependencies: ["obj.HG_HITBOX_TYPE.value == 2"]
        },
        HG_PROJECTILE_ANIM_SPEED: {
            value: 0.5,
            description: stripIndent`
        The speed at which the projectile’s sprite will animate
        `,
            type: 'number',
            dependencies: ["obj.HG_HITBOX_TYPE.value == 2"]
        },
        HG_PROJECTILE_HSPEED: {
            value: 1,
            description: stripIndent`
        The initial horizontal speed of the projectile in pixels per frame
        `,
            type: 'number',
            dependencies: ["obj.HG_HITBOX_TYPE.value == 2"]
        },
        HG_PROJECTILE_VSPEED: {
            value: 0,
            description: stripIndent`
        The initial vertical speed of the projectile in pixels per frame
        `,
            type: 'number',
            dependencies: ["obj.HG_HITBOX_TYPE.value == 2"]
        },
        HG_PROJECTILE_GRAVITY: {
            value: 0,
            description: stripIndent`
        The downward acceleration applied to the projectile every frame
        `,
            type: 'number',
            dependencies: ["obj.HG_HITBOX_TYPE.value == 2"]
        },
        HG_PROJECTILE_GROUND_FRICTION: {
            value: 0,
            description: stripIndent`
        The decrease in horizontal speed per frame when the projectile is grounded
        `,
            type: 'number',
            dependencies: ["obj.HG_HITBOX_TYPE.value == 2"]
        },
        HG_PROJECTILE_AIR_FRICTION: {
            value: 0,
            description: stripIndent`
        The decrease in horizontal speed per frame when the projectile is aerial
        `,
            type: 'number',
            dependencies: ["obj.HG_HITBOX_TYPE.value == 2"]
        },
        HG_PROJECTILE_WALL_BEHAVIOR: {
            value: 0,
            description: stripIndent`
        0 = Stops at walls
        1 = Goes through walls
        2 = Bounces off walls
        `,
            type: [0, 1, 2],
            dependencies: ["obj.HG_HITBOX_TYPE.value == 2"]
        },
        HG_PROJECTILE_GROUND_BEHAVIOR: {
            value: 0,
            description: stripIndent`
        0 = Stops at ground
        1 = Goes through ground
        2 = Bounces off ground
        `,
            type: [0, 1, 2],
            dependencies: ["obj.HG_HITBOX_TYPE.value == 2"]
        },
        HG_PROJECTILE_ENEMY_BEHAVIOR: {
            value: 0,
            description: stripIndent`
        0 = Stops at enemies
        1 = Goes through enemies
        `,
            type: [0, 1],
            dependencies: ["obj.HG_HITBOX_TYPE.value == 2"]
        },
        HG_PROJECTILE_UNBASHABLE: {
            value: 1,
            description: stripIndent`
        Whether a projectile can be caught by Ori’s bash
        `,
            type: [0, 1],
            dependencies: ["obj.HG_HITBOX_TYPE.value == 2"]
        },
        HG_PROJECTILE_PARRY_STUN: {
            value: 0,
            description: stripIndent`
        Whether parrying the projectile will cause the owner to go into parry stun or not
        `,
            type: [0, 1],
            dependencies: ["obj.HG_HITBOX_TYPE.value == 2"]
        },
        HG_PROJECTILE_DOES_NOT_REFLECT: {
            value: 0,
            description: stripIndent`
        If true, the projectile will not reflect or change ownership when parried
        `,
            type: [0, 1],
            dependencies: ["obj.HG_HITBOX_TYPE.value == 2"]
        },
        HG_PROJECTILE_IS_TRANSCENDENT: {
            value: 0,
            description: stripIndent`
        If true, the projectile will not be breakable by other hitboxes
        `,
            type: [0, 1],
            dependencies: ["obj.HG_HITBOX_TYPE.value == 2"]
        },
        HG_PROJECTILE_DESTROY_EFFECT: {
            value: 0,
            description: stripIndent`
        The visual effect to use when the projectile is destroyed
        `,
            type: 'number',
            dependencies: ["obj.HG_HITBOX_TYPE.value == 2"]
        },
    };

    var atkDataProps = {
        "ATK_INDEX": {
            value: 0,
            description: stripIndent`
        1: AT_JAB
        4: AT_FTILT
        5: AT_DTILT
        6: AT_UTILT
        7: AT_FSTRONG
        8: AT_DSTRONG
        9: AT_USTRONG
        10: AT_DATTACK
        11: AT_FAIR
        12: AT_BAIR
        13: AT_DAIR
        14: AT_UAIR
        15: AT_NAIR
        16: AT_FSPECIAL
        17: AT_DSPECIAL
        18: AT_USPECIAL
        19: AT_NSPECIAL
        20: AT_FSTRONG_2
        21: AT_DSTRONG_2
        22: AT_USTRONG_2
        23: AT_USPECIAL_GROUND
        24: AT_USPECIAL_2
        25: AT_FSPECIAL_2
        26: AT_FTHROW
        27: AT_UTHROW
        28: AT_DTHROW
        29: AT_NTHROW
        30: AT_DSPECIAL_2
        31: AT_EXTRA_1
        32: AT_DSPECIAL_AIR
        33: AT_NSPECIAL_2
        34: AT_FSPECIAL_AIR
        35: AT_TAUNT
        36: AT_TAUNT_2
        37: AT_EXTRA_2
        38: AT_EXTRA_3
        41: AT_NSPECIAL_AIR
        `,
            type: 'number',
        },
        "AG_CATEGORY": {
            value: 0,
            description: stripIndent`
        0 = Grounded only
        1 = Aerial only
        2 = Can be grounded or aerial
        `,
            type: [0, 1, 2],
        },
        "AG_SPRITE": {
            value: '--REPLACE_ME--',
            description: stripIndent`
        The sprite to use for the attack
        `,
            type: 'string',
        },
        "AG_AIR_SPRITE": {
            value: '--REPLACE_ME--',
            description: stripIndent`
        The sprite to use for the attack while aerial. 
        Only applies if AG_CATEGORY is 2
        `,
            type: 'string',
        },
        "AG_HURTBOX_SPRITE": {
            value: '--REPLACE_ME--',
            description: stripIndent`
        The sprite to use for the attack's hurtbox
        `,
            type: 'string',
        },
        "AG_HURTBOX_AIR_SPRITE": {
            value: '--REPLACE_ME--',
            description: stripIndent`
        The sprite to use for the attack's hurtbox while aerial.
        Only applies if AG_CATEGORY is 2
        `,
            type: 'string',
        },
        "AG_NUM_WINDOWS": {
            value: 0,
            description: stripIndent`
        Windows with indexes higher than this value will not naturally transition into later windows
        `,
            type: 'auto',
        },
        "AG_HAS_LANDING_LAG": {
            value: 0,
            description: stripIndent`
        Only applies if AG_CATEGORY is 1
        0 = Continues the attack when landing
        1 = Applies landing lag normally
        `,
            type: [0, 1],
        },
        "AG_OFF_LEDGE": {
            value: 0,
            description: stripIndent`
        0 = Stops at ledge
        1 = Goes off ledge
        `,
            type: [0, 1],
        },
        "AG_LANDING_LAG": {
            value: 0,
            description: stripIndent`
        The number of landing lag frames applied when landing. 
        If you whiff the attack, this value is multiplied by 1.5.
        Only applies if AG_HAS_LANDING_LAG is 1
        `,
            type: 'number',
        },
        "AG_STRONG_CHARGE_WINDOW": {
            value: 0,
            description: stripIndent`
        If attack is held at the end of this window, the character will freeze and charge the attack before moving to the next window
        `,
            type: 'number',
        },
        "AG_USES_CUSTOM_GRAVITY": {
            value: 0,
            description: stripIndent`
        0 = Attack uses default gravity
        1 = Attack uses custom gravity. 
        Values must be set for every window of the attack individually
        `,
            type: [0, 1],
        } 
    };

    var charProps = {
        ground_friction: {
            value: 1.00,
            description: `how fast the character's horizontal speed decreases on the ground`,
            type: 'number'
        },
        air_friction: {
            value: 0.07,
            description: `how fast the character's horizontal speed decreases in midair`,
            type: 'number'
        },
        gravity_speed: {
            value: 0.50,
            description: 'how fast the character falls naturally',
            type: 'number'
        },
        sprite_offset_x: {
            value: 0,
            description: 'sprite offset X location',
            type: 'number'
        },
        sprite_offset_y: {
            value: 0,
            description: 'sprite offset Y location',
            type: 'number'
        },
        position_locked: {
            value: false,
            description: `whether or not the character's offset will move in the editor`,
            type: [true, false]
        }
    };

    const velocityAtFrameGrav = (baseAccel, baseVelocity, frame) => {
        return baseAccel * frame + baseVelocity;
      };

    const strip = (toStrip, clone = true) => {
        const stripped = (clone) ? JSON.parse(JSON.stringify(toStrip)) : toStrip;

        if (Array.isArray(stripped)) {
            for (const entry of stripped) {
                strip(entry, false);
            }
        } else if (stripped.data) {
            for (const [key, val] of Object.entries(stripped.data)) {
                stripped.data[key] = val.value;
            }
        } else {
            for (const [key, val] of Object.entries(stripped)) {
                stripped[key] = val.value;
            }
        }
        
        return stripped;
    };

    const populate = (stripped, fields, clone = true) => {
        const populated = (clone) ? JSON.parse(JSON.stringify(stripped)) : stripped;

        if (Array.isArray(populated)) {
            for (const entry of populated) {
                populate(entry, fields, false);
            }
        } else if (populated.data) {
            for (const [key, val] of Object.entries(populated.data)) {
                if (!Object.keys(fields).includes(key)) {
                    delete populated.data[key];
                    continue;
                }
                populated.data[key] = {
                    ...fields[key],
                    value: val
                };
            }
        } else {
            for (const [key, val] of Object.entries(populated)) {
                if (!Object.keys(fields).includes(key)) {
                    delete populated[key];
                    continue;
                }
                populated[key] = {
                    ...fields[key],
                    value: val
                };
            }
        }

        
        return populated;
    };

    const setAtkValTemplate = `set_attack_value(__ATKNAME__, __AGINDEX__, __VALUE__);`;
    const setAtkValSpriteTemplate = `set_attack_value(__ATKNAME__, __AGINDEX__, sprite_get("__VALUE__"));`;
    const setWinValTemplate = `set_window_value(__ATKNAME__, __WINDOWNUM__, __AGINDEX__, __VALUE__);`;
    const setHbNumTempalte = `set_num_hitboxes(__ATKNAME__, __VALUE__);`;
    const setHbValTemplate = `set_hitbox_value(__ATKNAME__, __HITBOXNUM__, __HGINDEX__, __VALUE__);`;
    const spriteOffsetChangeTemplate = `sprite_change_offset("--REPLACE_ME--", __VALUEX__, __VALUEY__)`;

    const ATK_INDEXES = {
        1: "AT_JAB",
        4: "AT_FTILT",
        5: "AT_DTILT",
        6: "AT_UTILT",
        7: "AT_FSTRONG",
        8: "AT_DSTRONG",
        9: "AT_USTRONG",
        10: "AT_DATTACK",
        11: "AT_FAIR",
        12: "AT_BAIR",
        13: "AT_DAIR",
        14: "AT_UAIR",
        15: "AT_NAIR",
        16: "AT_FSPECIAL",
        17: "AT_DSPECIAL",
        18: "AT_USPECIAL",
        19: "AT_NSPECIAL",
        20: "AT_FSTRONG_2",
        21: "AT_DSTRONG_2",
        22: "AT_USTRONG_2",
        23: "AT_USPECIAL_GROUND",
        24: "AT_USPECIAL_2",
        25: "AT_FSPECIAL_2",
        26: "AT_FTHROW",
        27: "AT_UTHROW",
        28: "AT_DTHROW",
        29: "AT_NTHROW",
        30: "AT_DSPECIAL_2",
        31: "AT_EXTRA_1",
        32: "AT_DSPECIAL_AIR",
        33: "AT_NSPECIAL_2",
        34: "AT_FSPECIAL_AIR",
        35: "AT_TAUNT",
        36: "AT_TAUNT_2",
        37: "AT_EXTRA_2",
        38: "AT_EXTRA_3",
        41: "AT_NSPECIAL_AIR"
    };

    var exporter = (charData, atkData, windows, hitboxes) => {
        let out_INIT = "";
        let out_LOAD = "";
        let out_ATK = "";

        let ATK_NAME;
        if (Object.keys(ATK_INDEXES).includes(atkData.ATK_INDEX.value.toString())) ATK_NAME = ATK_INDEXES[parseInt(atkData.ATK_INDEX.value.toString())];
        else ATK_NAME = atkData.ATK_INDEX.value;

        for (const [key, entry] of Object.entries(charData)) {        
            switch (key) {
                case 'sprite_offset_x':
                case 'sprite_offset_y':
                case 'position_locked':
                    continue;

                default: 
                    out_INIT += `${key} = ${entry.value};\n`;
            }
        }
        out_LOAD += spriteOffsetChangeTemplate
            .replace('__VALUEX__', charData.sprite_offset_x.value)
            .replace('__VALUEY__', charData.sprite_offset_y.value * -1) 
            + '\n';

        for (const [key, entry] of Object.entries(atkData)) {    
            if ([null, undefined, '...', '--REPLACE_ME--', 0].includes(entry.value)) continue;
            switch (key) {
                case 'ATK_INDEX': 
                    continue;
                case 'AG_SPRITE':
                case 'AG_AIR_SPRITE':
                case 'AG_HURTBOX_SPRITE':
                case 'AG_HURTBOX_AIR_SPRITE':
                    out_ATK += setAtkValSpriteTemplate
                        .replace("__ATKNAME__", ATK_NAME)
                        .replace("__AGINDEX__", key)
                        .replace("__VALUE__", entry.value)
                        + '\n';
                    break;
                default: 
                    out_ATK += setAtkValTemplate
                        .replace("__ATKNAME__", ATK_NAME)
                        .replace("__AGINDEX__", key)
                        .replace("__VALUE__", entry.value)
                        + '\n';
            }
        }
        out_ATK += `\nset_attack_value(${ATK_NAME}, AG_NUM_WINDOWS, ${windows.length});\n`;

        for (const [i, win] of windows.entries()) {
            for (const [key, entry] of Object.entries(win.data)) {    
                if ([null, undefined, '...', 0].includes(entry.value)) continue;
                out_ATK += setWinValTemplate
                    .replace("__ATKNAME__", ATK_NAME)
                    .replace("__WINDOWNUM__", i + 1)
                    .replace("__AGINDEX__", key)
                    .replace("__VALUE__", (key === 'AG_WINDOW_SFX') ? `asset_get("${entry.value}")` : entry.value)
                    + '\n';
            }
            out_ATK += '\n';
        }
        out_ATK += '\n' + 
            setHbNumTempalte
            .replace("__ATKNAME__", ATK_NAME)
            .replace("__VALUE__", hitboxes.length)
            + '\n';
        

        const hbs = hitboxes.sort((a, b) => {
            if (a.data.HG_WINDOW.value < b.data.HG_WINDOW.value) return -1;
            if (a.data.HG_WINDOW.value > b.data.HG_WINDOW.value) return 1;
            if (a.data.HG_WINDOW_CREATION_FRAME.value < b.data.HG_WINDOW_CREATION_FRAME.value) return -1;
            if (a.data.HG_WINDOW_CREATION_FRAME.value > b.data.HG_WINDOW_CREATION_FRAME.value) return 1;
            return 0;
        });
        for (const [i, hb] of hbs.entries()) {
            for (const [key, entry] of Object.entries(hb.data)) {  
                if ([null, undefined, '...', 0].includes(entry.value) && !["HG_WINDOW_CREATION_FRAME", "HG_WINDOW"].includes(key)) continue;

                // because I made a few silly miscalculations
                if (key === "HG_HITBOX_X") entry.value -= charData.sprite_offset_x.value; 
                else if (key === "HG_HITBOX_Y") entry.value += charData.sprite_offset_y.value; 
                else if (key === "HG_WINDOW") entry.value ++;
                else if (key === "HG_WINDOW_CREATION_FRAME") entry.value ++;
                
                out_ATK += setHbValTemplate
                    .replace("__ATKNAME__", ATK_NAME)
                    .replace("__HITBOXNUM__", i + 1)
                    .replace("__HGINDEX__", key)
                    .replace("__VALUE__", entry.value)
                    + '\n';
            }
            out_ATK += '\n';
        }

        return {
            out_LOAD,
            out_INIT,
            out_ATK
        }
    };

    /* src\App.svelte generated by Svelte v3.12.1 */
    const { window: window_1 } = globals;

    const file$3 = "src\\App.svelte";

    function get_each_context$2(ctx, list, i) {
    	const child_ctx = Object.create(ctx);
    	child_ctx.hitbox = list[i];
    	child_ctx.each_value = list;
    	child_ctx.i = i;
    	return child_ctx;
    }

    function get_each_context_1$1(ctx, list, i) {
    	const child_ctx = Object.create(ctx);
    	child_ctx.tool = list[i];
    	return child_ctx;
    }

    function get_each_context_2$1(ctx, list, i) {
    	const child_ctx = Object.create(ctx);
    	child_ctx._ = list[i];
    	child_ctx.i = i;
    	return child_ctx;
    }

    // (679:3) {#each new Array(spritesheetSrc.framecount).fill(0) as _, i}
    function create_each_block_2$1(ctx) {
    	var div, dispose;

    	function click_handler_6() {
    		return ctx.click_handler_6(ctx);
    	}

    	const block = {
    		c: function create() {
    			div = element("div");
    			attr_dev(div, "class", "frame");
    			set_style(div, "height", "" + ctx.spritesheetSrc.dimensions.height + "px");
    			set_style(div, "width", "" + ctx.calc.frameWidth + "px");
    			set_style(div, "background-color", "white");
    			set_style(div, "background-image", "url('" + ctx.spritesheetSrc.dataUrl + "')");
    			set_style(div, "background-position", "-" + (ctx.calc.frameWidth) * ctx.i + "px 0");
    			set_style(div, "box-shadow", ((ctx.anim.spriteFrame % ctx.spritesheetSrc.framecount == ctx.i) ? 'inset 0 0 5px black' : 'none'));
    			set_style(div, "border-right", "2px solid black");
    			set_style(div, "display", "inline-block");
    			add_location(div, file$3, 679, 4, 18499);
    			dispose = listen_dev(div, "click", click_handler_6);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    		},

    		p: function update(changed, new_ctx) {
    			ctx = new_ctx;
    			if (changed.spritesheetSrc) {
    				set_style(div, "height", "" + ctx.spritesheetSrc.dimensions.height + "px");
    			}

    			if (changed.calc) {
    				set_style(div, "width", "" + ctx.calc.frameWidth + "px");
    			}

    			if (changed.spritesheetSrc) {
    				set_style(div, "background-image", "url('" + ctx.spritesheetSrc.dataUrl + "')");
    			}

    			if (changed.calc) {
    				set_style(div, "background-position", "-" + (ctx.calc.frameWidth) * ctx.i + "px 0");
    			}

    			if (changed.anim || changed.spritesheetSrc) {
    				set_style(div, "box-shadow", ((ctx.anim.spriteFrame % ctx.spritesheetSrc.framecount == ctx.i) ? 'inset 0 0 5px black' : 'none'));
    			}
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(div);
    			}

    			dispose();
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_each_block_2$1.name, type: "each", source: "(679:3) {#each new Array(spritesheetSrc.framecount).fill(0) as _, i}", ctx });
    	return block;
    }

    // (872:4) {:else}
    function create_else_block_2(ctx) {
    	var each_1_anchor;

    	let each_value_1 = ctx.tools;

    	let each_blocks = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks[i] = create_each_block_1$1(get_each_context_1$1(ctx, each_value_1, i));
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

    		p: function update(changed, ctx) {
    			if (changed.tools) {
    				each_value_1 = ctx.tools;

    				let i;
    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1$1(ctx, each_value_1, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(changed, child_ctx);
    					} else {
    						each_blocks[i] = create_each_block_1$1(child_ctx);
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

    			if (detaching) {
    				detach_dev(each_1_anchor);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_else_block_2.name, type: "else", source: "(872:4) {:else}", ctx });
    	return block;
    }

    // (831:4) {#if mainViewInfo}
    function create_if_block_13(ctx) {
    	var div0, t0, select, option0, option1, option2, option3, option4, option5, t7, div1, t8, input0, input0_updating = false, t9, div2, t10, input1, input1_updating = false, t11, div3, label0, t12, input2, t13, span0, t14, label1, t15, input3, t16, span1, t17, label2, t18, input4, t19, span2, t20, div4, t21, t22_value = ctx.anim.charFramePositionData[ctx.anim.windowIndex][ctx.anim.windowFrame].xvel + "", t22, br0, t23, t24_value = ctx.anim.charFramePositionData[ctx.anim.windowIndex][ctx.anim.windowFrame].yvel + "", t24, br1, t25, t26_value = ctx.anim.charFramePositionData[ctx.anim.windowIndex][ctx.anim.windowFrame].xpos + "", t26, br2, t27, t28_value = ctx.anim.charFramePositionData[ctx.anim.windowIndex][ctx.anim.windowFrame].ypos + "", t28, br3, dispose;

    	function input0_input_handler() {
    		input0_updating = true;
    		ctx.input0_input_handler.call(input0);
    	}

    	function input1_input_handler_1() {
    		input1_updating = true;
    		ctx.input1_input_handler_1.call(input1);
    	}

    	const block = {
    		c: function create() {
    			div0 = element("div");
    			t0 = text("zoom:\n\t\t\t\t\t\t");
    			select = element("select");
    			option0 = element("option");
    			option0.textContent = "1/4x";
    			option1 = element("option");
    			option1.textContent = "1/2x";
    			option2 = element("option");
    			option2.textContent = "1x";
    			option3 = element("option");
    			option3.textContent = "2x";
    			option4 = element("option");
    			option4.textContent = "4x";
    			option5 = element("option");
    			option5.textContent = "8x";
    			t7 = space();
    			div1 = element("div");
    			t8 = text("grid-x: ");
    			input0 = element("input");
    			t9 = space();
    			div2 = element("div");
    			t10 = text("grid-y: ");
    			input1 = element("input");
    			t11 = space();
    			div3 = element("div");
    			label0 = element("label");
    			t12 = text("lock offset: \n\t\t\t\t\t\t\t");
    			input2 = element("input");
    			t13 = space();
    			span0 = element("span");
    			t14 = space();
    			label1 = element("label");
    			t15 = text("show motion: \n\t\t\t\t\t\t\t");
    			input3 = element("input");
    			t16 = space();
    			span1 = element("span");
    			t17 = space();
    			label2 = element("label");
    			t18 = text("play sounds: \n\t\t\t\t\t\t\t");
    			input4 = element("input");
    			t19 = space();
    			span2 = element("span");
    			t20 = space();
    			div4 = element("div");
    			t21 = text("xvel: ");
    			t22 = text(t22_value);
    			br0 = element("br");
    			t23 = text("\n\t\t\t\t\t\tyvel: ");
    			t24 = text(t24_value);
    			br1 = element("br");
    			t25 = text("\n\t\t\t\t\t\txpos: ");
    			t26 = text(t26_value);
    			br2 = element("br");
    			t27 = text("\n\t\t\t\t\t\typos: ");
    			t28 = text(t28_value);
    			br3 = element("br");
    			option0.__value = "0.25";
    			option0.value = option0.__value;
    			add_location(option0, file$3, 834, 7, 25037);
    			option1.__value = "0.5";
    			option1.value = option1.__value;
    			add_location(option1, file$3, 835, 7, 25079);
    			option2.__value = "1";
    			option2.value = option2.__value;
    			option2.selected = true;
    			add_location(option2, file$3, 836, 7, 25120);
    			option3.__value = "2";
    			option3.value = option3.__value;
    			add_location(option3, file$3, 837, 7, 25166);
    			option4.__value = "4";
    			option4.value = option4.__value;
    			add_location(option4, file$3, 838, 7, 25204);
    			option5.__value = "8";
    			option5.value = option5.__value;
    			add_location(option5, file$3, 839, 7, 25242);
    			if (ctx.anim.zoom === void 0) add_render_callback(() => ctx.select_change_handler.call(select));
    			add_location(select, file$3, 833, 6, 24998);
    			attr_dev(div0, "class", "option-param svelte-17vzh85");
    			set_style(div0, "justify-self", "right");
    			set_style(div0, "display", "block");
    			add_location(div0, file$3, 831, 5, 24908);
    			attr_dev(input0, "type", "number");
    			attr_dev(input0, "min", "1");
    			attr_dev(input0, "max", "100");
    			add_location(input0, file$3, 843, 14, 25392);
    			attr_dev(div1, "class", "option-param svelte-17vzh85");
    			set_style(div1, "justify-self", "right");
    			set_style(div1, "display", "block");
    			add_location(div1, file$3, 842, 5, 25306);
    			attr_dev(input1, "type", "number");
    			attr_dev(input1, "min", "1");
    			attr_dev(input1, "max", "100");
    			add_location(input1, file$3, 846, 14, 25578);
    			attr_dev(div2, "class", "option-param svelte-17vzh85");
    			set_style(div2, "justify-self", "right");
    			set_style(div2, "display", "block");
    			add_location(div2, file$3, 845, 5, 25492);
    			attr_dev(input2, "type", "checkbox");
    			attr_dev(input2, "class", "svelte-17vzh85");
    			add_location(input2, file$3, 851, 7, 25792);
    			attr_dev(span0, "class", "checkmark svelte-17vzh85");
    			add_location(span0, file$3, 852, 7, 25867);
    			add_location(label0, file$3, 849, 6, 25756);
    			attr_dev(input3, "type", "checkbox");
    			attr_dev(input3, "class", "svelte-17vzh85");
    			add_location(input3, file$3, 856, 7, 25956);
    			attr_dev(span1, "class", "checkmark svelte-17vzh85");
    			add_location(span1, file$3, 857, 7, 26018);
    			add_location(label1, file$3, 854, 6, 25920);
    			attr_dev(input4, "type", "checkbox");
    			attr_dev(input4, "class", "svelte-17vzh85");
    			add_location(input4, file$3, 861, 7, 26107);
    			attr_dev(span2, "class", "checkmark svelte-17vzh85");
    			add_location(span2, file$3, 862, 7, 26166);
    			add_location(label2, file$3, 859, 6, 26071);
    			attr_dev(div3, "class", "option-param svelte-17vzh85");
    			set_style(div3, "justify-self", "right");
    			set_style(div3, "display", "block");
    			add_location(div3, file$3, 848, 5, 25678);
    			add_location(br0, file$3, 866, 81, 26331);
    			add_location(br1, file$3, 867, 81, 26418);
    			add_location(br2, file$3, 868, 81, 26505);
    			add_location(br3, file$3, 869, 81, 26592);
    			attr_dev(div4, "class", "stats svelte-17vzh85");
    			add_location(div4, file$3, 865, 5, 26230);

    			dispose = [
    				listen_dev(select, "change", ctx.select_change_handler),
    				listen_dev(input0, "input", input0_input_handler),
    				listen_dev(input1, "input", input1_input_handler_1),
    				listen_dev(input2, "change", ctx.input2_change_handler),
    				listen_dev(input3, "change", ctx.input3_change_handler),
    				listen_dev(input4, "change", ctx.input4_change_handler)
    			];
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, div0, anchor);
    			append_dev(div0, t0);
    			append_dev(div0, select);
    			append_dev(select, option0);
    			append_dev(select, option1);
    			append_dev(select, option2);
    			append_dev(select, option3);
    			append_dev(select, option4);
    			append_dev(select, option5);

    			select_option(select, ctx.anim.zoom);

    			insert_dev(target, t7, anchor);
    			insert_dev(target, div1, anchor);
    			append_dev(div1, t8);
    			append_dev(div1, input0);

    			set_input_value(input0, ctx.anim.zoomGrids[ctx.anim.zoom][0]);

    			insert_dev(target, t9, anchor);
    			insert_dev(target, div2, anchor);
    			append_dev(div2, t10);
    			append_dev(div2, input1);

    			set_input_value(input1, ctx.anim.zoomGrids[ctx.anim.zoom][1]);

    			insert_dev(target, t11, anchor);
    			insert_dev(target, div3, anchor);
    			append_dev(div3, label0);
    			append_dev(label0, t12);
    			append_dev(label0, input2);

    			input2.checked = ctx.char.position_locked.value;

    			append_dev(label0, t13);
    			append_dev(label0, span0);
    			append_dev(div3, t14);
    			append_dev(div3, label1);
    			append_dev(label1, t15);
    			append_dev(label1, input3);

    			input3.checked = ctx.anim.movement;

    			append_dev(label1, t16);
    			append_dev(label1, span1);
    			append_dev(div3, t17);
    			append_dev(div3, label2);
    			append_dev(label2, t18);
    			append_dev(label2, input4);

    			input4.checked = ctx.anim.audio;

    			append_dev(label2, t19);
    			append_dev(label2, span2);
    			insert_dev(target, t20, anchor);
    			insert_dev(target, div4, anchor);
    			append_dev(div4, t21);
    			append_dev(div4, t22);
    			append_dev(div4, br0);
    			append_dev(div4, t23);
    			append_dev(div4, t24);
    			append_dev(div4, br1);
    			append_dev(div4, t25);
    			append_dev(div4, t26);
    			append_dev(div4, br2);
    			append_dev(div4, t27);
    			append_dev(div4, t28);
    			append_dev(div4, br3);
    		},

    		p: function update(changed, ctx) {
    			if (changed.anim) select_option(select, ctx.anim.zoom);
    			if (!input0_updating && changed.anim) set_input_value(input0, ctx.anim.zoomGrids[ctx.anim.zoom][0]);
    			input0_updating = false;
    			if (!input1_updating && changed.anim) set_input_value(input1, ctx.anim.zoomGrids[ctx.anim.zoom][1]);
    			input1_updating = false;
    			if (changed.char) input2.checked = ctx.char.position_locked.value;
    			if (changed.anim) input3.checked = ctx.anim.movement;
    			if (changed.anim) input4.checked = ctx.anim.audio;

    			if ((changed.anim) && t22_value !== (t22_value = ctx.anim.charFramePositionData[ctx.anim.windowIndex][ctx.anim.windowFrame].xvel + "")) {
    				set_data_dev(t22, t22_value);
    			}

    			if ((changed.anim) && t24_value !== (t24_value = ctx.anim.charFramePositionData[ctx.anim.windowIndex][ctx.anim.windowFrame].yvel + "")) {
    				set_data_dev(t24, t24_value);
    			}

    			if ((changed.anim) && t26_value !== (t26_value = ctx.anim.charFramePositionData[ctx.anim.windowIndex][ctx.anim.windowFrame].xpos + "")) {
    				set_data_dev(t26, t26_value);
    			}

    			if ((changed.anim) && t28_value !== (t28_value = ctx.anim.charFramePositionData[ctx.anim.windowIndex][ctx.anim.windowFrame].ypos + "")) {
    				set_data_dev(t28, t28_value);
    			}
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(div0);
    				detach_dev(t7);
    				detach_dev(div1);
    				detach_dev(t9);
    				detach_dev(div2);
    				detach_dev(t11);
    				detach_dev(div3);
    				detach_dev(t20);
    				detach_dev(div4);
    			}

    			run_all(dispose);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block_13.name, type: "if", source: "(831:4) {#if mainViewInfo}", ctx });
    	return block;
    }

    // (873:5) {#each tools as tool}
    function create_each_block_1$1(ctx) {
    	var button, i, t0_value = ctx.tool[0] + "", t0, span, t1_value = ctx.tool[1] + "", t1, t2, button_active_value, dispose;

    	function click_handler_9() {
    		return ctx.click_handler_9(ctx);
    	}

    	const block = {
    		c: function create() {
    			button = element("button");
    			i = element("i");
    			t0 = text(t0_value);
    			span = element("span");
    			t1 = text(t1_value);
    			t2 = space();
    			attr_dev(i, "class", "material-icons svelte-17vzh85");
    			add_location(i, file$3, 877, 7, 26786);
    			attr_dev(span, "class", "svelte-17vzh85");
    			add_location(span, file$3, 877, 46, 26825);
    			attr_dev(button, "class", "tool svelte-17vzh85");
    			attr_dev(button, "active", button_active_value = ctx.tools.selected === ctx.tool[1]);
    			add_location(button, file$3, 873, 6, 26655);
    			dispose = listen_dev(button, "click", click_handler_9);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    			append_dev(button, i);
    			append_dev(i, t0);
    			append_dev(button, span);
    			append_dev(span, t1);
    			append_dev(button, t2);
    		},

    		p: function update(changed, new_ctx) {
    			ctx = new_ctx;
    			if ((changed.tools) && t0_value !== (t0_value = ctx.tool[0] + "")) {
    				set_data_dev(t0, t0_value);
    			}

    			if ((changed.tools) && t1_value !== (t1_value = ctx.tool[1] + "")) {
    				set_data_dev(t1, t1_value);
    			}

    			if ((changed.tools) && button_active_value !== (button_active_value = ctx.tools.selected === ctx.tool[1])) {
    				attr_dev(button, "active", button_active_value);
    			}
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(button);
    			}

    			dispose();
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_each_block_1$1.name, type: "each", source: "(873:5) {#each tools as tool}", ctx });
    	return block;
    }

    // (947:4) {:else}
    function create_else_block_1(ctx) {
    	var image, image_x_value, image_y_value, image_width_value, image_height_value, image_xlink_href_value, dispose;

    	const block = {
    		c: function create() {
    			image = svg_element("image");
    			attr_dev(image, "x", image_x_value = ctx.calc.sprXPos);
    			attr_dev(image, "y", image_y_value = ctx.calc.sprYPos);
    			attr_dev(image, "width", image_width_value = ctx.spritesheetSrc.dimensions.width);
    			attr_dev(image, "height", image_height_value = ctx.spritesheetSrc.dimensions.height);
    			xlink_attr(image, "xlink:href", image_xlink_href_value = ctx.spritesheetSrc.dataUrl);
    			attr_dev(image, "clip-path", "url(#spriteClip)");
    			add_location(image, file$3, 947, 5, 29118);

    			dispose = [
    				listen_dev(image, "mousedown", stop_propagation(mousedown_handler), false, false, true),
    				listen_dev(image, "mouseout", stop_propagation(mouseout_handler), false, false, true),
    				listen_dev(image, "mouseup", stop_propagation(mouseup_handler), false, false, true),
    				listen_dev(image, "mousemove", stop_propagation(ctx.mousemove_handler), false, false, true)
    			];
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, image, anchor);
    		},

    		p: function update(changed, ctx) {
    			if ((changed.calc) && image_x_value !== (image_x_value = ctx.calc.sprXPos)) {
    				attr_dev(image, "x", image_x_value);
    			}

    			if ((changed.calc) && image_y_value !== (image_y_value = ctx.calc.sprYPos)) {
    				attr_dev(image, "y", image_y_value);
    			}

    			if ((changed.spritesheetSrc) && image_width_value !== (image_width_value = ctx.spritesheetSrc.dimensions.width)) {
    				attr_dev(image, "width", image_width_value);
    			}

    			if ((changed.spritesheetSrc) && image_height_value !== (image_height_value = ctx.spritesheetSrc.dimensions.height)) {
    				attr_dev(image, "height", image_height_value);
    			}

    			if ((changed.spritesheetSrc) && image_xlink_href_value !== (image_xlink_href_value = ctx.spritesheetSrc.dataUrl)) {
    				xlink_attr(image, "xlink:href", image_xlink_href_value);
    			}
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(image);
    			}

    			run_all(dispose);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_else_block_1.name, type: "else", source: "(947:4) {:else}", ctx });
    	return block;
    }

    // (938:4) {#if char.position_locked.value || tools.selected !== "pan"}
    function create_if_block_12(ctx) {
    	var image, image_x_value, image_y_value, image_width_value, image_height_value, image_xlink_href_value;

    	const block = {
    		c: function create() {
    			image = svg_element("image");
    			attr_dev(image, "x", image_x_value = ctx.calc.sprXPos);
    			attr_dev(image, "y", image_y_value = ctx.calc.sprYPos);
    			attr_dev(image, "width", image_width_value = ctx.spritesheetSrc.dimensions.width);
    			attr_dev(image, "height", image_height_value = ctx.spritesheetSrc.dimensions.height);
    			xlink_attr(image, "xlink:href", image_xlink_href_value = ctx.spritesheetSrc.dataUrl);
    			attr_dev(image, "clip-path", "url(#spriteClip)");
    			add_location(image, file$3, 938, 5, 28858);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, image, anchor);
    		},

    		p: function update(changed, ctx) {
    			if ((changed.calc) && image_x_value !== (image_x_value = ctx.calc.sprXPos)) {
    				attr_dev(image, "x", image_x_value);
    			}

    			if ((changed.calc) && image_y_value !== (image_y_value = ctx.calc.sprYPos)) {
    				attr_dev(image, "y", image_y_value);
    			}

    			if ((changed.spritesheetSrc) && image_width_value !== (image_width_value = ctx.spritesheetSrc.dimensions.width)) {
    				attr_dev(image, "width", image_width_value);
    			}

    			if ((changed.spritesheetSrc) && image_height_value !== (image_height_value = ctx.spritesheetSrc.dimensions.height)) {
    				attr_dev(image, "height", image_height_value);
    			}

    			if ((changed.spritesheetSrc) && image_xlink_href_value !== (image_xlink_href_value = ctx.spritesheetSrc.dataUrl)) {
    				xlink_attr(image, "xlink:href", image_xlink_href_value);
    			}
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(image);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block_12.name, type: "if", source: "(938:4) {#if char.position_locked.value || tools.selected !== \"pan\"}", ctx });
    	return block;
    }

    // (967:5) {#if anim.hitboxFrames[anim.animFrame] && anim.hitboxFrames[anim.animFrame].includes(i)}
    function create_if_block_8(ctx) {
    	var line, line_x__value, line_x__value_1, line_y__value, line_y__value_1, line_stroke_width_value, line_stroke_dasharray_value, if_block1_anchor;

    	function select_block_type_2(changed, ctx) {
    		if (ctx.hitbox.data.HG_SHAPE.value === 0) return create_if_block_10;
    		if (ctx.hitbox.data.HG_SHAPE.value === 1) return create_if_block_11;
    		return create_else_block$1;
    	}

    	var current_block_type = select_block_type_2(null, ctx);
    	var if_block0 = current_block_type(ctx);

    	var if_block1 = (ctx.tools.selected === 'pan') && create_if_block_9(ctx);

    	const block = {
    		c: function create() {
    			if_block0.c();
    			line = svg_element("line");
    			if (if_block1) if_block1.c();
    			if_block1_anchor = empty();
    			attr_dev(line, "class", "angle-indicator");
    			attr_dev(line, "data-index", ctx.i);
    			attr_dev(line, "x1", line_x__value = ctx.calc.sprXPos + ctx.hitbox.data.HG_HITBOX_X.value + ctx.calc.frameWidth * (ctx.anim.spriteFrame));
    			attr_dev(line, "x2", line_x__value_1 = ctx.calc.sprXPos 
    								+ ctx.hitbox.data.HG_HITBOX_X.value 
    								+ ctx.Math.cos(ctx.hitbox.data.HG_ANGLE.value * -ctx.Math.PI/180) 
    								* ctx.hitbox.data.HG_WIDTH.value / 2
    								+ ctx.calc.frameWidth * (ctx.anim.spriteFrame));
    			attr_dev(line, "y1", line_y__value = ctx.calc.sprYPos + ctx.hitbox.data.HG_HITBOX_Y.value);
    			attr_dev(line, "y2", line_y__value_1 = ctx.calc.sprYPos 
    								+ ctx.hitbox.data.HG_HITBOX_Y.value 
    								+ ctx.Math.sin(ctx.hitbox.data.HG_ANGLE.value * -ctx.Math.PI/180) 
    								* ctx.hitbox.data.HG_HEIGHT.value / 2);
    			attr_dev(line, "stroke", "#0008");
    			attr_dev(line, "stroke-width", line_stroke_width_value = 4/ctx.anim.zoom);
    			attr_dev(line, "stroke-dasharray", line_stroke_dasharray_value = (ctx.hitbox.data.HG_ANGLE.value === 361) ? 4/ctx.anim.zoom : 0);
    			add_location(line, file$3, 1009, 6, 32090);
    		},

    		m: function mount(target, anchor) {
    			if_block0.m(target, anchor);
    			insert_dev(target, line, anchor);
    			if (if_block1) if_block1.m(target, anchor);
    			insert_dev(target, if_block1_anchor, anchor);
    		},

    		p: function update(changed, ctx) {
    			if (current_block_type === (current_block_type = select_block_type_2(changed, ctx)) && if_block0) {
    				if_block0.p(changed, ctx);
    			} else {
    				if_block0.d(1);
    				if_block0 = current_block_type(ctx);
    				if (if_block0) {
    					if_block0.c();
    					if_block0.m(line.parentNode, line);
    				}
    			}

    			if ((changed.calc || changed.hitboxes || changed.anim) && line_x__value !== (line_x__value = ctx.calc.sprXPos + ctx.hitbox.data.HG_HITBOX_X.value + ctx.calc.frameWidth * (ctx.anim.spriteFrame))) {
    				attr_dev(line, "x1", line_x__value);
    			}

    			if ((changed.calc || changed.hitboxes || changed.anim) && line_x__value_1 !== (line_x__value_1 = ctx.calc.sprXPos 
    								+ ctx.hitbox.data.HG_HITBOX_X.value 
    								+ ctx.Math.cos(ctx.hitbox.data.HG_ANGLE.value * -ctx.Math.PI/180) 
    								* ctx.hitbox.data.HG_WIDTH.value / 2
    								+ ctx.calc.frameWidth * (ctx.anim.spriteFrame))) {
    				attr_dev(line, "x2", line_x__value_1);
    			}

    			if ((changed.calc || changed.hitboxes) && line_y__value !== (line_y__value = ctx.calc.sprYPos + ctx.hitbox.data.HG_HITBOX_Y.value)) {
    				attr_dev(line, "y1", line_y__value);
    			}

    			if ((changed.calc || changed.hitboxes) && line_y__value_1 !== (line_y__value_1 = ctx.calc.sprYPos 
    								+ ctx.hitbox.data.HG_HITBOX_Y.value 
    								+ ctx.Math.sin(ctx.hitbox.data.HG_ANGLE.value * -ctx.Math.PI/180) 
    								* ctx.hitbox.data.HG_HEIGHT.value / 2)) {
    				attr_dev(line, "y2", line_y__value_1);
    			}

    			if ((changed.anim) && line_stroke_width_value !== (line_stroke_width_value = 4/ctx.anim.zoom)) {
    				attr_dev(line, "stroke-width", line_stroke_width_value);
    			}

    			if ((changed.hitboxes || changed.anim) && line_stroke_dasharray_value !== (line_stroke_dasharray_value = (ctx.hitbox.data.HG_ANGLE.value === 361) ? 4/ctx.anim.zoom : 0)) {
    				attr_dev(line, "stroke-dasharray", line_stroke_dasharray_value);
    			}

    			if (ctx.tools.selected === 'pan') {
    				if (if_block1) {
    					if_block1.p(changed, ctx);
    				} else {
    					if_block1 = create_if_block_9(ctx);
    					if_block1.c();
    					if_block1.m(if_block1_anchor.parentNode, if_block1_anchor);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}
    		},

    		d: function destroy(detaching) {
    			if_block0.d(detaching);

    			if (detaching) {
    				detach_dev(line);
    			}

    			if (if_block1) if_block1.d(detaching);

    			if (detaching) {
    				detach_dev(if_block1_anchor);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block_8.name, type: "if", source: "(967:5) {#if anim.hitboxFrames[anim.animFrame] && anim.hitboxFrames[anim.animFrame].includes(i)}", ctx });
    	return block;
    }

    // (994:6) {:else}
    function create_else_block$1(ctx) {
    	var rect, hitbox = ctx.hitbox, rect_x_value, rect_y_value, rect_rx_value, rect_ry_value, rect_width_value, rect_height_value, rect_fill_value, rect_stroke_value, rect_stroke_width_value;

    	const assign_rect = () => ctx.rect_binding_1(rect, hitbox);
    	const unassign_rect = () => ctx.rect_binding_1(null, hitbox);

    	const block = {
    		c: function create() {
    			rect = svg_element("rect");
    			attr_dev(rect, "class", "hitbox");
    			attr_dev(rect, "data-index", ctx.i);
    			attr_dev(rect, "x", rect_x_value = ctx.calc.sprXPos + ctx.hitbox.data.HG_HITBOX_X.value - ctx.hitbox.data.HG_WIDTH.value / 2 + ctx.calc.frameWidth * (ctx.anim.spriteFrame));
    			attr_dev(rect, "y", rect_y_value = ctx.calc.sprYPos + ctx.hitbox.data.HG_HITBOX_Y.value - ctx.hitbox.data.HG_HEIGHT.value / 2);
    			attr_dev(rect, "rx", rect_rx_value = ctx.hitbox.data.HG_WIDTH.value * 0.25);
    			attr_dev(rect, "ry", rect_ry_value = ctx.hitbox.data.HG_HEIGHT.value * 0.25);
    			attr_dev(rect, "width", rect_width_value = ctx.hitbox.data.HG_WIDTH.value);
    			attr_dev(rect, "height", rect_height_value = ctx.hitbox.data.HG_HEIGHT.value);
    			attr_dev(rect, "fill", rect_fill_value = ctx.hitbox.meta.color);
    			attr_dev(rect, "stroke", rect_stroke_value = (ctx.hitboxes.selected === ctx.i) ? 'black' : ctx.hitbox.meta.stroke || 'black');
    			attr_dev(rect, "stroke-width", rect_stroke_width_value = (ctx.hitboxes.selected === ctx.i) ? 4/ctx.anim.zoom : ctx.hitbox.meta.strokeWidth || 0);
    			add_location(rect, file$3, 994, 7, 31340);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, rect, anchor);
    			assign_rect();
    		},

    		p: function update(changed, new_ctx) {
    			ctx = new_ctx;
    			if (hitbox !== ctx.hitbox) {
    				unassign_rect();
    				hitbox = ctx.hitbox;
    				assign_rect();
    			}

    			if ((changed.calc || changed.hitboxes || changed.anim) && rect_x_value !== (rect_x_value = ctx.calc.sprXPos + ctx.hitbox.data.HG_HITBOX_X.value - ctx.hitbox.data.HG_WIDTH.value / 2 + ctx.calc.frameWidth * (ctx.anim.spriteFrame))) {
    				attr_dev(rect, "x", rect_x_value);
    			}

    			if ((changed.calc || changed.hitboxes) && rect_y_value !== (rect_y_value = ctx.calc.sprYPos + ctx.hitbox.data.HG_HITBOX_Y.value - ctx.hitbox.data.HG_HEIGHT.value / 2)) {
    				attr_dev(rect, "y", rect_y_value);
    			}

    			if ((changed.hitboxes) && rect_rx_value !== (rect_rx_value = ctx.hitbox.data.HG_WIDTH.value * 0.25)) {
    				attr_dev(rect, "rx", rect_rx_value);
    			}

    			if ((changed.hitboxes) && rect_ry_value !== (rect_ry_value = ctx.hitbox.data.HG_HEIGHT.value * 0.25)) {
    				attr_dev(rect, "ry", rect_ry_value);
    			}

    			if ((changed.hitboxes) && rect_width_value !== (rect_width_value = ctx.hitbox.data.HG_WIDTH.value)) {
    				attr_dev(rect, "width", rect_width_value);
    			}

    			if ((changed.hitboxes) && rect_height_value !== (rect_height_value = ctx.hitbox.data.HG_HEIGHT.value)) {
    				attr_dev(rect, "height", rect_height_value);
    			}

    			if ((changed.hitboxes) && rect_fill_value !== (rect_fill_value = ctx.hitbox.meta.color)) {
    				attr_dev(rect, "fill", rect_fill_value);
    			}

    			if ((changed.hitboxes) && rect_stroke_value !== (rect_stroke_value = (ctx.hitboxes.selected === ctx.i) ? 'black' : ctx.hitbox.meta.stroke || 'black')) {
    				attr_dev(rect, "stroke", rect_stroke_value);
    			}

    			if ((changed.hitboxes || changed.anim) && rect_stroke_width_value !== (rect_stroke_width_value = (ctx.hitboxes.selected === ctx.i) ? 4/ctx.anim.zoom : ctx.hitbox.meta.strokeWidth || 0)) {
    				attr_dev(rect, "stroke-width", rect_stroke_width_value);
    			}
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(rect);
    			}

    			unassign_rect();
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_else_block$1.name, type: "else", source: "(994:6) {:else}", ctx });
    	return block;
    }

    // (981:49) 
    function create_if_block_11(ctx) {
    	var rect, hitbox = ctx.hitbox, rect_x_value, rect_y_value, rect_width_value, rect_height_value, rect_fill_value, rect_stroke_value, rect_stroke_width_value;

    	const assign_rect = () => ctx.rect_binding(rect, hitbox);
    	const unassign_rect = () => ctx.rect_binding(null, hitbox);

    	const block = {
    		c: function create() {
    			rect = svg_element("rect");
    			attr_dev(rect, "class", "hitbox");
    			attr_dev(rect, "data-index", ctx.i);
    			attr_dev(rect, "x", rect_x_value = ctx.calc.sprXPos + ctx.hitbox.data.HG_HITBOX_X.value - ctx.hitbox.data.HG_WIDTH.value / 2 + ctx.calc.frameWidth * (ctx.anim.spriteFrame));
    			attr_dev(rect, "y", rect_y_value = ctx.calc.sprYPos + ctx.hitbox.data.HG_HITBOX_Y.value - ctx.hitbox.data.HG_HEIGHT.value / 2);
    			attr_dev(rect, "width", rect_width_value = ctx.hitbox.data.HG_WIDTH.value);
    			attr_dev(rect, "height", rect_height_value = ctx.hitbox.data.HG_HEIGHT.value);
    			attr_dev(rect, "fill", rect_fill_value = ctx.hitbox.meta.color);
    			attr_dev(rect, "stroke", rect_stroke_value = (ctx.hitboxes.selected === ctx.i) ? 'black' : ctx.hitbox.meta.stroke || 'black');
    			attr_dev(rect, "stroke-width", rect_stroke_width_value = (ctx.hitboxes.selected === ctx.i) ? 4/ctx.anim.zoom : ctx.hitbox.meta.strokeWidth || 0);
    			add_location(rect, file$3, 981, 7, 30686);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, rect, anchor);
    			assign_rect();
    		},

    		p: function update(changed, new_ctx) {
    			ctx = new_ctx;
    			if (hitbox !== ctx.hitbox) {
    				unassign_rect();
    				hitbox = ctx.hitbox;
    				assign_rect();
    			}

    			if ((changed.calc || changed.hitboxes || changed.anim) && rect_x_value !== (rect_x_value = ctx.calc.sprXPos + ctx.hitbox.data.HG_HITBOX_X.value - ctx.hitbox.data.HG_WIDTH.value / 2 + ctx.calc.frameWidth * (ctx.anim.spriteFrame))) {
    				attr_dev(rect, "x", rect_x_value);
    			}

    			if ((changed.calc || changed.hitboxes) && rect_y_value !== (rect_y_value = ctx.calc.sprYPos + ctx.hitbox.data.HG_HITBOX_Y.value - ctx.hitbox.data.HG_HEIGHT.value / 2)) {
    				attr_dev(rect, "y", rect_y_value);
    			}

    			if ((changed.hitboxes) && rect_width_value !== (rect_width_value = ctx.hitbox.data.HG_WIDTH.value)) {
    				attr_dev(rect, "width", rect_width_value);
    			}

    			if ((changed.hitboxes) && rect_height_value !== (rect_height_value = ctx.hitbox.data.HG_HEIGHT.value)) {
    				attr_dev(rect, "height", rect_height_value);
    			}

    			if ((changed.hitboxes) && rect_fill_value !== (rect_fill_value = ctx.hitbox.meta.color)) {
    				attr_dev(rect, "fill", rect_fill_value);
    			}

    			if ((changed.hitboxes) && rect_stroke_value !== (rect_stroke_value = (ctx.hitboxes.selected === ctx.i) ? 'black' : ctx.hitbox.meta.stroke || 'black')) {
    				attr_dev(rect, "stroke", rect_stroke_value);
    			}

    			if ((changed.hitboxes || changed.anim) && rect_stroke_width_value !== (rect_stroke_width_value = (ctx.hitboxes.selected === ctx.i) ? 4/ctx.anim.zoom : ctx.hitbox.meta.strokeWidth || 0)) {
    				attr_dev(rect, "stroke-width", rect_stroke_width_value);
    			}
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(rect);
    			}

    			unassign_rect();
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block_11.name, type: "if", source: "(981:49) ", ctx });
    	return block;
    }

    // (968:6) {#if hitbox.data.HG_SHAPE.value === 0}
    function create_if_block_10(ctx) {
    	var ellipse, hitbox = ctx.hitbox, ellipse_cx_value, ellipse_cy_value, ellipse_rx_value, ellipse_ry_value, ellipse_fill_value, ellipse_stroke_value, ellipse_stroke_width_value;

    	const assign_ellipse = () => ctx.ellipse_binding(ellipse, hitbox);
    	const unassign_ellipse = () => ctx.ellipse_binding(null, hitbox);

    	const block = {
    		c: function create() {
    			ellipse = svg_element("ellipse");
    			attr_dev(ellipse, "class", "hitbox");
    			attr_dev(ellipse, "data-index", ctx.i);
    			attr_dev(ellipse, "cx", ellipse_cx_value = ctx.calc.sprXPos + ctx.hitbox.data.HG_HITBOX_X.value + ctx.calc.frameWidth * (ctx.anim.spriteFrame));
    			attr_dev(ellipse, "cy", ellipse_cy_value = ctx.calc.sprYPos + ctx.hitbox.data.HG_HITBOX_Y.value);
    			attr_dev(ellipse, "rx", ellipse_rx_value = ctx.hitbox.data.HG_WIDTH.value / 2);
    			attr_dev(ellipse, "ry", ellipse_ry_value = ctx.hitbox.data.HG_HEIGHT.value / 2);
    			attr_dev(ellipse, "fill", ellipse_fill_value = ctx.hitbox.meta.color);
    			attr_dev(ellipse, "stroke", ellipse_stroke_value = (ctx.hitboxes.selected === ctx.i) ? 'black' : ctx.hitbox.meta.stroke || 'black');
    			attr_dev(ellipse, "stroke-width", ellipse_stroke_width_value = (ctx.hitboxes.selected === ctx.i) ? 4/ctx.anim.zoom : ctx.hitbox.meta.strokeWidth || 0);
    			add_location(ellipse, file$3, 968, 7, 30057);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, ellipse, anchor);
    			assign_ellipse();
    		},

    		p: function update(changed, new_ctx) {
    			ctx = new_ctx;
    			if (hitbox !== ctx.hitbox) {
    				unassign_ellipse();
    				hitbox = ctx.hitbox;
    				assign_ellipse();
    			}

    			if ((changed.calc || changed.hitboxes || changed.anim) && ellipse_cx_value !== (ellipse_cx_value = ctx.calc.sprXPos + ctx.hitbox.data.HG_HITBOX_X.value + ctx.calc.frameWidth * (ctx.anim.spriteFrame))) {
    				attr_dev(ellipse, "cx", ellipse_cx_value);
    			}

    			if ((changed.calc || changed.hitboxes) && ellipse_cy_value !== (ellipse_cy_value = ctx.calc.sprYPos + ctx.hitbox.data.HG_HITBOX_Y.value)) {
    				attr_dev(ellipse, "cy", ellipse_cy_value);
    			}

    			if ((changed.hitboxes) && ellipse_rx_value !== (ellipse_rx_value = ctx.hitbox.data.HG_WIDTH.value / 2)) {
    				attr_dev(ellipse, "rx", ellipse_rx_value);
    			}

    			if ((changed.hitboxes) && ellipse_ry_value !== (ellipse_ry_value = ctx.hitbox.data.HG_HEIGHT.value / 2)) {
    				attr_dev(ellipse, "ry", ellipse_ry_value);
    			}

    			if ((changed.hitboxes) && ellipse_fill_value !== (ellipse_fill_value = ctx.hitbox.meta.color)) {
    				attr_dev(ellipse, "fill", ellipse_fill_value);
    			}

    			if ((changed.hitboxes) && ellipse_stroke_value !== (ellipse_stroke_value = (ctx.hitboxes.selected === ctx.i) ? 'black' : ctx.hitbox.meta.stroke || 'black')) {
    				attr_dev(ellipse, "stroke", ellipse_stroke_value);
    			}

    			if ((changed.hitboxes || changed.anim) && ellipse_stroke_width_value !== (ellipse_stroke_width_value = (ctx.hitboxes.selected === ctx.i) ? 4/ctx.anim.zoom : ctx.hitbox.meta.strokeWidth || 0)) {
    				attr_dev(ellipse, "stroke-width", ellipse_stroke_width_value);
    			}
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(ellipse);
    			}

    			unassign_ellipse();
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block_10.name, type: "if", source: "(968:6) {#if hitbox.data.HG_SHAPE.value === 0}", ctx });
    	return block;
    }

    // (1028:6) {#if tools.selected === 'pan'}
    function create_if_block_9(ctx) {
    	var circle, circle_cx_value, circle_cy_value, circle_r_value;

    	const block = {
    		c: function create() {
    			circle = svg_element("circle");
    			attr_dev(circle, "class", "resizer");
    			attr_dev(circle, "data-index", ctx.i);
    			attr_dev(circle, "cx", circle_cx_value = ctx.calc.sprXPos + ctx.hitbox.data.HG_HITBOX_X.value + ctx.calc.frameWidth * (ctx.anim.spriteFrame));
    			attr_dev(circle, "cy", circle_cy_value = ctx.calc.sprYPos + ctx.hitbox.data.HG_HITBOX_Y.value);
    			attr_dev(circle, "r", circle_r_value = 4/ctx.anim.zoom);
    			add_location(circle, file$3, 1028, 7, 32899);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, circle, anchor);
    		},

    		p: function update(changed, ctx) {
    			if ((changed.calc || changed.hitboxes || changed.anim) && circle_cx_value !== (circle_cx_value = ctx.calc.sprXPos + ctx.hitbox.data.HG_HITBOX_X.value + ctx.calc.frameWidth * (ctx.anim.spriteFrame))) {
    				attr_dev(circle, "cx", circle_cx_value);
    			}

    			if ((changed.calc || changed.hitboxes) && circle_cy_value !== (circle_cy_value = ctx.calc.sprYPos + ctx.hitbox.data.HG_HITBOX_Y.value)) {
    				attr_dev(circle, "cy", circle_cy_value);
    			}

    			if ((changed.anim) && circle_r_value !== (circle_r_value = 4/ctx.anim.zoom)) {
    				attr_dev(circle, "r", circle_r_value);
    			}
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(circle);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block_9.name, type: "if", source: "(1028:6) {#if tools.selected === 'pan'}", ctx });
    	return block;
    }

    // (966:4) {#each hitboxes as hitbox, i}
    function create_each_block$2(ctx) {
    	var show_if = ctx.anim.hitboxFrames[ctx.anim.animFrame] && ctx.anim.hitboxFrames[ctx.anim.animFrame].includes(ctx.i), if_block_anchor;

    	var if_block = (show_if) && create_if_block_8(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},

    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    		},

    		p: function update(changed, ctx) {
    			if (changed.anim) show_if = ctx.anim.hitboxFrames[ctx.anim.animFrame] && ctx.anim.hitboxFrames[ctx.anim.animFrame].includes(ctx.i);

    			if (show_if) {
    				if (if_block) {
    					if_block.p(changed, ctx);
    				} else {
    					if_block = create_if_block_8(ctx);
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},

    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);

    			if (detaching) {
    				detach_dev(if_block_anchor);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_each_block$2.name, type: "each", source: "(966:4) {#each hitboxes as hitbox, i}", ctx });
    	return block;
    }

    // (1059:72) 
    function create_if_block_7(ctx) {
    	var ellipse, ellipse_cx_value, ellipse_cy_value;

    	const block = {
    		c: function create() {
    			ellipse = svg_element("ellipse");
    			set_style(ellipse, "pointer-events", "none");
    			attr_dev(ellipse, "cx", ellipse_cx_value = ctx.Math.floor(ctx.calc.relMouseX));
    			attr_dev(ellipse, "cy", ellipse_cy_value = ctx.Math.floor(ctx.calc.relMouseY));
    			attr_dev(ellipse, "rx", "1");
    			attr_dev(ellipse, "ry", "1");
    			attr_dev(ellipse, "fill", "#F008");
    			attr_dev(ellipse, "stroke", "black");
    			attr_dev(ellipse, "stroke-width", "0");
    			add_location(ellipse, file$3, 1059, 5, 33840);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, ellipse, anchor);
    		},

    		p: function update(changed, ctx) {
    			if ((changed.calc) && ellipse_cx_value !== (ellipse_cx_value = ctx.Math.floor(ctx.calc.relMouseX))) {
    				attr_dev(ellipse, "cx", ellipse_cx_value);
    			}

    			if ((changed.calc) && ellipse_cy_value !== (ellipse_cy_value = ctx.Math.floor(ctx.calc.relMouseY))) {
    				attr_dev(ellipse, "cy", ellipse_cy_value);
    			}
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(ellipse);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block_7.name, type: "if", source: "(1059:72) ", ctx });
    	return block;
    }

    // (1039:4) {#if tools.active}
    function create_if_block_4$1(ctx) {
    	var if_block_anchor;

    	function select_block_type_4(changed, ctx) {
    		if (ctx.tools.selected === 'circle') return create_if_block_5;
    		if (ctx.tools.selected === 'rectangle' || ctx.tools.selected === 'round') return create_if_block_6;
    	}

    	var current_block_type = select_block_type_4(null, ctx);
    	var if_block = current_block_type && current_block_type(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},

    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    		},

    		p: function update(changed, ctx) {
    			if (current_block_type === (current_block_type = select_block_type_4(changed, ctx)) && if_block) {
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

    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);

    			if (detaching) {
    				detach_dev(if_block_anchor);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block_4$1.name, type: "if", source: "(1039:4) {#if tools.active}", ctx });
    	return block;
    }

    // (1049:76) 
    function create_if_block_6(ctx) {
    	var rect, rect_x_value, rect_y_value, rect_stroke_width_value;

    	const block = {
    		c: function create() {
    			rect = svg_element("rect");
    			attr_dev(rect, "x", rect_x_value = ctx.Math.floor(ctx.calc.relMouseX));
    			attr_dev(rect, "y", rect_y_value = ctx.Math.floor(ctx.calc.relMouseY));
    			attr_dev(rect, "fill", "white");
    			attr_dev(rect, "stroke", "black");
    			attr_dev(rect, "stroke-width", rect_stroke_width_value = 4 / ctx.anim.zoom);
    			add_location(rect, file$3, 1049, 6, 33546);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, rect, anchor);
    			ctx.rect_binding_2(rect);
    		},

    		p: function update(changed, ctx) {
    			if ((changed.calc) && rect_x_value !== (rect_x_value = ctx.Math.floor(ctx.calc.relMouseX))) {
    				attr_dev(rect, "x", rect_x_value);
    			}

    			if ((changed.calc) && rect_y_value !== (rect_y_value = ctx.Math.floor(ctx.calc.relMouseY))) {
    				attr_dev(rect, "y", rect_y_value);
    			}

    			if ((changed.anim) && rect_stroke_width_value !== (rect_stroke_width_value = 4 / ctx.anim.zoom)) {
    				attr_dev(rect, "stroke-width", rect_stroke_width_value);
    			}
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(rect);
    			}

    			ctx.rect_binding_2(null);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block_6.name, type: "if", source: "(1049:76) ", ctx });
    	return block;
    }

    // (1040:5) {#if tools.selected === 'circle'}
    function create_if_block_5(ctx) {
    	var ellipse, ellipse_cx_value, ellipse_cy_value, ellipse_stroke_width_value;

    	const block = {
    		c: function create() {
    			ellipse = svg_element("ellipse");
    			attr_dev(ellipse, "cx", ellipse_cx_value = ctx.Math.floor(ctx.calc.relMouseX));
    			attr_dev(ellipse, "cy", ellipse_cy_value = ctx.Math.floor(ctx.calc.relMouseY));
    			attr_dev(ellipse, "fill", "white");
    			attr_dev(ellipse, "stroke", "black");
    			attr_dev(ellipse, "stroke-width", ellipse_stroke_width_value = 4 / ctx.anim.zoom);
    			add_location(ellipse, file$3, 1040, 6, 33254);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, ellipse, anchor);
    			ctx.ellipse_binding_1(ellipse);
    		},

    		p: function update(changed, ctx) {
    			if ((changed.calc) && ellipse_cx_value !== (ellipse_cx_value = ctx.Math.floor(ctx.calc.relMouseX))) {
    				attr_dev(ellipse, "cx", ellipse_cx_value);
    			}

    			if ((changed.calc) && ellipse_cy_value !== (ellipse_cy_value = ctx.Math.floor(ctx.calc.relMouseY))) {
    				attr_dev(ellipse, "cy", ellipse_cy_value);
    			}

    			if ((changed.anim) && ellipse_stroke_width_value !== (ellipse_stroke_width_value = 4 / ctx.anim.zoom)) {
    				attr_dev(ellipse, "stroke-width", ellipse_stroke_width_value);
    			}
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(ellipse);
    			}

    			ctx.ellipse_binding_1(null);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block_5.name, type: "if", source: "(1040:5) {#if tools.selected === 'circle'}", ctx });
    	return block;
    }

    // (1094:38) 
    function create_if_block_3$2(ctx) {
    	var updating_props, current;

    	function paramsbuilder_props_binding_3(value) {
    		ctx.paramsbuilder_props_binding_3.call(null, value);
    		updating_props = true;
    		add_flush_callback(() => updating_props = false);
    	}

    	let paramsbuilder_props = { isDisabled: isDisabled };
    	if (ctx.char !== void 0) {
    		paramsbuilder_props.props = ctx.char;
    	}
    	var paramsbuilder = new ParamsBuilder({
    		props: paramsbuilder_props,
    		$$inline: true
    	});

    	binding_callbacks.push(() => bind(paramsbuilder, 'props', paramsbuilder_props_binding_3));
    	paramsbuilder.$on("dataChanged", ctx.dataChanged_handler_3);

    	const block = {
    		c: function create() {
    			paramsbuilder.$$.fragment.c();
    		},

    		m: function mount(target, anchor) {
    			mount_component(paramsbuilder, target, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var paramsbuilder_changes = {};
    			if (!updating_props && changed.char) {
    				paramsbuilder_changes.props = ctx.char;
    			}
    			paramsbuilder.$set(paramsbuilder_changes);
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(paramsbuilder.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(paramsbuilder.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			destroy_component(paramsbuilder, detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block_3$2.name, type: "if", source: "(1094:38) ", ctx });
    	return block;
    }

    // (1088:38) 
    function create_if_block_2$2(ctx) {
    	var updating_props, current;

    	function paramsbuilder_props_binding_2(value) {
    		ctx.paramsbuilder_props_binding_2.call(null, value);
    		updating_props = true;
    		add_flush_callback(() => updating_props = false);
    	}

    	let paramsbuilder_props = { isDisabled: isDisabled };
    	if (ctx.atkData !== void 0) {
    		paramsbuilder_props.props = ctx.atkData;
    	}
    	var paramsbuilder = new ParamsBuilder({
    		props: paramsbuilder_props,
    		$$inline: true
    	});

    	binding_callbacks.push(() => bind(paramsbuilder, 'props', paramsbuilder_props_binding_2));
    	paramsbuilder.$on("dataChanged", ctx.dataChanged_handler_2);

    	const block = {
    		c: function create() {
    			paramsbuilder.$$.fragment.c();
    		},

    		m: function mount(target, anchor) {
    			mount_component(paramsbuilder, target, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var paramsbuilder_changes = {};
    			if (!updating_props && changed.atkData) {
    				paramsbuilder_changes.props = ctx.atkData;
    			}
    			paramsbuilder.$set(paramsbuilder_changes);
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(paramsbuilder.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(paramsbuilder.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			destroy_component(paramsbuilder, detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block_2$2.name, type: "if", source: "(1088:38) ", ctx });
    	return block;
    }

    // (1082:37) 
    function create_if_block_1$2(ctx) {
    	var updating_props, current;

    	function paramsbuilder_props_binding_1(value) {
    		ctx.paramsbuilder_props_binding_1.call(null, value);
    		updating_props = true;
    		add_flush_callback(() => updating_props = false);
    	}

    	let paramsbuilder_props = { isDisabled: isDisabled };
    	if (ctx.hitboxes[ctx.hitboxes.selected].data !== void 0) {
    		paramsbuilder_props.props = ctx.hitboxes[ctx.hitboxes.selected].data;
    	}
    	var paramsbuilder = new ParamsBuilder({
    		props: paramsbuilder_props,
    		$$inline: true
    	});

    	binding_callbacks.push(() => bind(paramsbuilder, 'props', paramsbuilder_props_binding_1));
    	paramsbuilder.$on("dataChanged", ctx.dataChanged_handler_1);

    	const block = {
    		c: function create() {
    			paramsbuilder.$$.fragment.c();
    		},

    		m: function mount(target, anchor) {
    			mount_component(paramsbuilder, target, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var paramsbuilder_changes = {};
    			if (!updating_props && changed.hitboxes) {
    				paramsbuilder_changes.props = ctx.hitboxes[ctx.hitboxes.selected].data;
    			}
    			paramsbuilder.$set(paramsbuilder_changes);
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(paramsbuilder.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(paramsbuilder.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			destroy_component(paramsbuilder, detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block_1$2.name, type: "if", source: "(1082:37) ", ctx });
    	return block;
    }

    // (1076:2) {#if editingMode === 'window'}
    function create_if_block$3(ctx) {
    	var updating_props, current;

    	function paramsbuilder_props_binding(value) {
    		ctx.paramsbuilder_props_binding.call(null, value);
    		updating_props = true;
    		add_flush_callback(() => updating_props = false);
    	}

    	let paramsbuilder_props = { isDisabled: isDisabled };
    	if (ctx.windows[ctx.anim.windowIndex].data !== void 0) {
    		paramsbuilder_props.props = ctx.windows[ctx.anim.windowIndex].data;
    	}
    	var paramsbuilder = new ParamsBuilder({
    		props: paramsbuilder_props,
    		$$inline: true
    	});

    	binding_callbacks.push(() => bind(paramsbuilder, 'props', paramsbuilder_props_binding));
    	paramsbuilder.$on("dataChanged", ctx.dataChanged_handler);

    	const block = {
    		c: function create() {
    			paramsbuilder.$$.fragment.c();
    		},

    		m: function mount(target, anchor) {
    			mount_component(paramsbuilder, target, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var paramsbuilder_changes = {};
    			if (!updating_props && changed.windows || changed.anim) {
    				paramsbuilder_changes.props = ctx.windows[ctx.anim.windowIndex].data;
    			}
    			paramsbuilder.$set(paramsbuilder_changes);
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(paramsbuilder.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(paramsbuilder.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			destroy_component(paramsbuilder, detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block$3.name, type: "if", source: "(1076:2) {#if editingMode === 'window'}", ctx });
    	return block;
    }

    function create_fragment$4(ctx) {
    	var updating_visible, t0, t1, div13, div5, div0, button0, t3, label0, button1, t5, input0, t6, div1, label1, t8, input1, input1_updating = false, t9, div2, button2, i0, span0, t12, button3, i1, span1, t15, div3, button4, i2, span2, t18, button5, i3, span3, t21, button6, i4, span4, t24, div4, button7, i5, span5, t27, button8, i6, span6, t30, button9, i7, span7, t33, textarea, t34, button10, i8, span8, t37, label2, button11, i9, span9, t40, input2, t41, div7, div6, t42, updating_anim, updating_windows, updating_hitboxes, updating_editingMode, updating_updateStates, t43, div11, div9, button12, t44, t45, button13, t46, button13_active_value, t47, div8, t48, div10, svg, defs, filter, feGaussianBlur, clipPath, rect0, rect0_x_value, rect0_width_value, mask, circle, circle_cx_value, circle_cy_value, circle_r_value, path0, path0_d_value, path0_stroke_width_value, path1, path1_d_value, path1_stroke_width_value, path2, path2_d_value, path2_stroke_width_value, rect1, rect1_x_value, rect1_y_value, rect1_width_value, rect1_height_value, if_block1_anchor, each1_anchor, show_if, svg_viewBox_value, t49, div12, current_block_type_index, if_block3, current, dispose;

    	function modal_visible_binding(value) {
    		ctx.modal_visible_binding.call(null, value);
    		updating_visible = true;
    		add_flush_callback(() => updating_visible = false);
    	}

    	let modal_props = {};
    	if (ctx.modalVisible !== void 0) {
    		modal_props.visible = ctx.modalVisible;
    	}
    	var modal = new Modal({ props: modal_props, $$inline: true });

    	binding_callbacks.push(() => bind(modal, 'visible', modal_visible_binding));
    	modal.$on("close", ctx.close_handler);

    	var localstoragefs = new LocalStorageFS({
    		props: {
    		saveMode: false,
    		active: false
    	},
    		$$inline: true
    	});

    	function input1_input_handler() {
    		input1_updating = true;
    		ctx.input1_input_handler.call(input1);
    	}

    	let each_value_2 = new ctx.Array(ctx.spritesheetSrc.framecount).fill(0);

    	let each_blocks_1 = [];

    	for (let i = 0; i < each_value_2.length; i += 1) {
    		each_blocks_1[i] = create_each_block_2$1(get_each_context_2$1(ctx, each_value_2, i));
    	}

    	function timeline_anim_binding(value_1) {
    		ctx.timeline_anim_binding.call(null, value_1);
    		updating_anim = true;
    		add_flush_callback(() => updating_anim = false);
    	}

    	function timeline_windows_binding(value_2) {
    		ctx.timeline_windows_binding.call(null, value_2);
    		updating_windows = true;
    		add_flush_callback(() => updating_windows = false);
    	}

    	function timeline_hitboxes_binding(value_3) {
    		ctx.timeline_hitboxes_binding.call(null, value_3);
    		updating_hitboxes = true;
    		add_flush_callback(() => updating_hitboxes = false);
    	}

    	function timeline_editingMode_binding(value_4) {
    		ctx.timeline_editingMode_binding.call(null, value_4);
    		updating_editingMode = true;
    		add_flush_callback(() => updating_editingMode = false);
    	}

    	function timeline_updateStates_binding(value_5) {
    		ctx.timeline_updateStates_binding.call(null, value_5);
    		updating_updateStates = true;
    		add_flush_callback(() => updating_updateStates = false);
    	}

    	let timeline_props = {
    		skipAhead: ctx.skipAhead,
    		skipBack: ctx.skipBack,
    		winProps: winProps
    	};
    	if (ctx.anim !== void 0) {
    		timeline_props.anim = ctx.anim;
    	}
    	if (ctx.windows !== void 0) {
    		timeline_props.windows = ctx.windows;
    	}
    	if (ctx.hitboxes !== void 0) {
    		timeline_props.hitboxes = ctx.hitboxes;
    	}
    	if (ctx.editingMode !== void 0) {
    		timeline_props.editingMode = ctx.editingMode;
    	}
    	if (ctx.updateStates !== void 0) {
    		timeline_props.updateStates = ctx.updateStates;
    	}
    	var timeline = new Timeline({ props: timeline_props, $$inline: true });

    	binding_callbacks.push(() => bind(timeline, 'anim', timeline_anim_binding));
    	binding_callbacks.push(() => bind(timeline, 'windows', timeline_windows_binding));
    	binding_callbacks.push(() => bind(timeline, 'hitboxes', timeline_hitboxes_binding));
    	binding_callbacks.push(() => bind(timeline, 'editingMode', timeline_editingMode_binding));
    	binding_callbacks.push(() => bind(timeline, 'updateStates', timeline_updateStates_binding));

    	function select_block_type(changed, ctx) {
    		if (ctx.mainViewInfo) return create_if_block_13;
    		return create_else_block_2;
    	}

    	var current_block_type = select_block_type(null, ctx);
    	var if_block0 = current_block_type(ctx);

    	function select_block_type_1(changed, ctx) {
    		if (ctx.char.position_locked.value || ctx.tools.selected !== "pan") return create_if_block_12;
    		return create_else_block_1;
    	}

    	var current_block_type_1 = select_block_type_1(null, ctx);
    	var if_block1 = current_block_type_1(ctx);

    	let each_value = ctx.hitboxes;

    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$2(get_each_context$2(ctx, each_value, i));
    	}

    	function select_block_type_3(changed, ctx) {
    		if (ctx.tools.active) return create_if_block_4$1;
    		if ((show_if == null) || changed.tools) show_if = !!(['circle', 'rectangle', 'round'].includes(ctx.tools.selected));
    		if (show_if) return create_if_block_7;
    	}

    	var current_block_type_2 = select_block_type_3(null, ctx);
    	var if_block2 = current_block_type_2 && current_block_type_2(ctx);

    	var if_block_creators = [
    		create_if_block$3,
    		create_if_block_1$2,
    		create_if_block_2$2,
    		create_if_block_3$2
    	];

    	var if_blocks = [];

    	function select_block_type_5(changed, ctx) {
    		if (ctx.editingMode === 'window') return 0;
    		if (ctx.editingMode === 'hitbox') return 1;
    		if (ctx.editingMode === 'atkData') return 2;
    		if (ctx.editingMode === 'chrData') return 3;
    		return -1;
    	}

    	if (~(current_block_type_index = select_block_type_5(null, ctx))) {
    		if_block3 = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    	}

    	const block = {
    		c: function create() {
    			modal.$$.fragment.c();
    			t0 = space();
    			localstoragefs.$$.fragment.c();
    			t1 = space();
    			div13 = element("div");
    			div5 = element("div");
    			div0 = element("div");
    			button0 = element("button");
    			button0.textContent = "Help / Credits";
    			t3 = space();
    			label0 = element("label");
    			button1 = element("button");
    			button1.textContent = "upload spritesheet";
    			t5 = space();
    			input0 = element("input");
    			t6 = space();
    			div1 = element("div");
    			label1 = element("label");
    			label1.textContent = "number of frames in spritesheet:";
    			t8 = space();
    			input1 = element("input");
    			t9 = space();
    			div2 = element("div");
    			button2 = element("button");
    			i0 = element("i");
    			i0.textContent = "edit";
    			span0 = element("span");
    			span0.textContent = "edit attack data";
    			t12 = space();
    			button3 = element("button");
    			i1 = element("i");
    			i1.textContent = "person";
    			span1 = element("span");
    			span1.textContent = "edit character data";
    			t15 = space();
    			div3 = element("div");
    			button4 = element("button");
    			i2 = element("i");
    			i2.textContent = "save_alt";
    			span2 = element("span");
    			span2.textContent = "save to browser";
    			t18 = space();
    			button5 = element("button");
    			i3 = element("i");
    			i3.textContent = "unarchive";
    			span3 = element("span");
    			span3.textContent = "load from browser";
    			t21 = space();
    			button6 = element("button");
    			i4 = element("i");
    			i4.textContent = "import_export";
    			span4 = element("span");
    			span4.textContent = "export to GML";
    			t24 = space();
    			div4 = element("div");
    			button7 = element("button");
    			i5 = element("i");
    			i5.textContent = "attachment";
    			span5 = element("span");
    			span5.textContent = "init.gml";
    			t27 = space();
    			button8 = element("button");
    			i6 = element("i");
    			i6.textContent = "attachment";
    			span6 = element("span");
    			span6.textContent = "load.gml";
    			t30 = space();
    			button9 = element("button");
    			i7 = element("i");
    			i7.textContent = "attachment";
    			span7 = element("span");
    			span7.textContent = "[attackname].gml";
    			t33 = space();
    			textarea = element("textarea");
    			t34 = space();
    			button10 = element("button");
    			i8 = element("i");
    			i8.textContent = "attachment";
    			span8 = element("span");
    			span8.textContent = "export WIP";
    			t37 = space();
    			label2 = element("label");
    			button11 = element("button");
    			i9 = element("i");
    			i9.textContent = "attachment";
    			span9 = element("span");
    			span9.textContent = "import WIP";
    			t40 = space();
    			input2 = element("input");
    			t41 = space();
    			div7 = element("div");
    			div6 = element("div");

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].c();
    			}

    			t42 = space();
    			timeline.$$.fragment.c();
    			t43 = space();
    			div11 = element("div");
    			div9 = element("div");
    			button12 = element("button");
    			t44 = text("info");
    			t45 = space();
    			button13 = element("button");
    			t46 = text("tools");
    			t47 = space();
    			div8 = element("div");
    			if_block0.c();
    			t48 = space();
    			div10 = element("div");
    			svg = svg_element("svg");
    			defs = svg_element("defs");
    			filter = svg_element("filter");
    			feGaussianBlur = svg_element("feGaussianBlur");
    			clipPath = svg_element("clipPath");
    			rect0 = svg_element("rect");
    			mask = svg_element("mask");
    			circle = svg_element("circle");
    			path0 = svg_element("path");
    			path1 = svg_element("path");
    			path2 = svg_element("path");
    			rect1 = svg_element("rect");
    			if_block1.c();
    			if_block1_anchor = empty();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each1_anchor = empty();
    			if (if_block2) if_block2.c();
    			t49 = space();
    			div12 = element("div");
    			if (if_block3) if_block3.c();
    			attr_dev(button0, "class", "svelte-17vzh85");
    			add_location(button0, file$3, 626, 3, 16086);
    			set_style(button1, "pointer-events", "none");
    			attr_dev(button1, "class", "svelte-17vzh85");
    			add_location(button1, file$3, 628, 4, 16195);
    			attr_dev(label0, "for", "spritesheet-upload");
    			add_location(label0, file$3, 627, 3, 16158);
    			attr_dev(input0, "id", "spritesheet-upload");
    			attr_dev(input0, "type", "file");
    			attr_dev(input0, "class", "svelte-17vzh85");
    			add_location(input0, file$3, 630, 3, 16275);
    			attr_dev(div0, "class", "inputGroup svelte-17vzh85");
    			add_location(div0, file$3, 625, 2, 16058);
    			attr_dev(label1, "for", "framecount");
    			add_location(label1, file$3, 633, 3, 16464);
    			attr_dev(input1, "id", "framecount");
    			attr_dev(input1, "type", "number");
    			attr_dev(input1, "min", "1");
    			attr_dev(input1, "max", "99");
    			add_location(input1, file$3, 634, 3, 16532);
    			attr_dev(div1, "class", "inputGroup svelte-17vzh85");
    			add_location(div1, file$3, 632, 2, 16436);
    			attr_dev(i0, "class", "material-icons svelte-17vzh85");
    			add_location(i0, file$3, 637, 52, 16714);
    			attr_dev(span0, "class", "svelte-17vzh85");
    			add_location(span0, file$3, 637, 86, 16748);
    			attr_dev(button2, "class", "svelte-17vzh85");
    			add_location(button2, file$3, 637, 3, 16665);
    			attr_dev(i1, "class", "material-icons svelte-17vzh85");
    			add_location(i1, file$3, 638, 52, 16839);
    			attr_dev(span1, "class", "svelte-17vzh85");
    			add_location(span1, file$3, 638, 88, 16875);
    			attr_dev(button3, "class", "svelte-17vzh85");
    			add_location(button3, file$3, 638, 3, 16790);
    			attr_dev(div2, "class", "inputGroup svelte-17vzh85");
    			add_location(div2, file$3, 636, 2, 16637);
    			attr_dev(i2, "class", "material-icons svelte-17vzh85");
    			add_location(i2, file$3, 641, 27, 16981);
    			attr_dev(span2, "class", "svelte-17vzh85");
    			add_location(span2, file$3, 641, 65, 17019);
    			attr_dev(button4, "class", "svelte-17vzh85");
    			add_location(button4, file$3, 641, 3, 16957);
    			attr_dev(i3, "class", "material-icons svelte-17vzh85");
    			add_location(i3, file$3, 642, 27, 17084);
    			attr_dev(span3, "class", "svelte-17vzh85");
    			add_location(span3, file$3, 642, 66, 17123);
    			attr_dev(button5, "class", "svelte-17vzh85");
    			add_location(button5, file$3, 642, 3, 17060);
    			attr_dev(i4, "class", "material-icons svelte-17vzh85");
    			add_location(i4, file$3, 643, 32, 17195);
    			attr_dev(span4, "class", "svelte-17vzh85");
    			add_location(span4, file$3, 643, 75, 17238);
    			attr_dev(button6, "class", "svelte-17vzh85");
    			add_location(button6, file$3, 643, 3, 17166);
    			attr_dev(div3, "class", "inputGroup svelte-17vzh85");
    			add_location(div3, file$3, 640, 2, 16929);
    			attr_dev(i5, "class", "material-icons svelte-17vzh85");
    			add_location(i5, file$3, 646, 52, 17362);
    			attr_dev(span5, "class", "svelte-17vzh85");
    			add_location(span5, file$3, 646, 92, 17402);
    			attr_dev(button7, "class", "svelte-17vzh85");
    			add_location(button7, file$3, 646, 3, 17313);
    			attr_dev(i6, "class", "material-icons svelte-17vzh85");
    			add_location(i6, file$3, 647, 52, 17485);
    			attr_dev(span6, "class", "svelte-17vzh85");
    			add_location(span6, file$3, 647, 92, 17525);
    			attr_dev(button8, "class", "svelte-17vzh85");
    			add_location(button8, file$3, 647, 3, 17436);
    			attr_dev(i7, "class", "material-icons svelte-17vzh85");
    			add_location(i7, file$3, 648, 54, 17610);
    			attr_dev(span7, "class", "svelte-17vzh85");
    			add_location(span7, file$3, 648, 94, 17650);
    			attr_dev(button9, "class", "svelte-17vzh85");
    			add_location(button9, file$3, 648, 3, 17559);
    			set_style(textarea, "height", "300px");
    			set_style(textarea, "width", "100%");
    			set_style(textarea, "color", "#DDD");
    			set_style(textarea, "font-size", "10px");
    			set_style(textarea, "font-family", "monospace");
    			set_style(textarea, "background-color", "black");
    			add_location(textarea, file$3, 649, 3, 17692);
    			attr_dev(i8, "class", "material-icons svelte-17vzh85");
    			add_location(i8, file$3, 661, 4, 17929);
    			attr_dev(span8, "class", "svelte-17vzh85");
    			add_location(span8, file$3, 661, 44, 17969);
    			attr_dev(button10, "class", "svelte-17vzh85");
    			add_location(button10, file$3, 660, 3, 17895);
    			attr_dev(i9, "class", "material-icons svelte-17vzh85");
    			add_location(i9, file$3, 665, 5, 18082);
    			attr_dev(span9, "class", "svelte-17vzh85");
    			add_location(span9, file$3, 665, 45, 18122);
    			set_style(button11, "pointer-events", "none");
    			attr_dev(button11, "class", "svelte-17vzh85");
    			add_location(button11, file$3, 664, 4, 18039);
    			attr_dev(label2, "for", "import-wip");
    			add_location(label2, file$3, 663, 3, 18009);
    			attr_dev(input2, "id", "import-wip");
    			attr_dev(input2, "type", "file");
    			attr_dev(input2, "accept", ".roab");
    			attr_dev(input2, "class", "svelte-17vzh85");
    			add_location(input2, file$3, 668, 3, 18178);
    			attr_dev(div4, "class", "inputGroup svelte-17vzh85");
    			add_location(div4, file$3, 645, 2, 17285);
    			attr_dev(div5, "id", "file");
    			attr_dev(div5, "class", "svelte-17vzh85");
    			add_location(div5, file$3, 624, 1, 16040);
    			attr_dev(div6, "class", "frameContainer");
    			set_style(div6, "width", "" + ctx.spritesheetSrc.dimensions.width + "px");
    			set_style(div6, "height", "100%");
    			set_style(div6, "background-color", "black");
    			add_location(div6, file$3, 672, 2, 18291);
    			attr_dev(div7, "id", "frames");
    			attr_dev(div7, "class", "svelte-17vzh85");
    			add_location(div7, file$3, 671, 1, 18271);
    			attr_dev(button12, "class", "tab svelte-17vzh85");
    			attr_dev(button12, "active", ctx.mainViewInfo);
    			add_location(button12, file$3, 827, 3, 24656);
    			attr_dev(button13, "class", "tab svelte-17vzh85");
    			attr_dev(button13, "active", button13_active_value = !ctx.mainViewInfo);
    			add_location(button13, file$3, 828, 3, 24752);
    			attr_dev(div8, "class", "tool-container svelte-17vzh85");
    			add_location(div8, file$3, 829, 3, 24851);
    			attr_dev(div9, "class", "option-container svelte-17vzh85");
    			set_style(div9, "z-index", "500");
    			set_style(div9, "height", "auto");
    			set_style(div9, "pointer-events", "none");
    			add_location(div9, file$3, 826, 2, 24564);
    			attr_dev(feGaussianBlur, "in", "SourceGraphic");
    			attr_dev(feGaussianBlur, "stdDeviation", "5");
    			add_location(feGaussianBlur, file$3, 897, 6, 27378);
    			attr_dev(filter, "id", "blur");
    			attr_dev(filter, "x", "0");
    			attr_dev(filter, "y", "0");
    			add_location(filter, file$3, 896, 5, 27341);
    			attr_dev(rect0, "x", rect0_x_value = (ctx.anim.spriteFrame % ctx.spritesheetSrc.framecount) / ctx.spritesheetSrc.framecount);
    			attr_dev(rect0, "y", "0");
    			attr_dev(rect0, "width", rect0_width_value = 1 / ctx.spritesheetSrc.framecount);
    			attr_dev(rect0, "height", "1");
    			add_location(rect0, file$3, 900, 6, 27520);
    			attr_dev(clipPath, "id", "spriteClip");
    			attr_dev(clipPath, "clipPathUnits", "objectBoundingBox");
    			add_location(clipPath, file$3, 899, 5, 27453);
    			attr_dev(circle, "cx", circle_cx_value = ctx.calc.relMouseX);
    			attr_dev(circle, "cy", circle_cy_value = ctx.calc.relMouseY);
    			attr_dev(circle, "r", circle_r_value = ctx.anim.gridViewerRadius / ctx.anim.zoom);
    			attr_dev(circle, "fill", "white");
    			attr_dev(circle, "filter", "url(#blur)");
    			add_location(circle, file$3, 903, 6, 27717);
    			attr_dev(mask, "id", "mouseMask");
    			add_location(mask, file$3, 902, 5, 27689);
    			add_location(defs, file$3, 895, 4, 27329);
    			attr_dev(path0, "d", path0_d_value = "\n\t\t\t\t\tM " + -4 * ctx.rend.clientWidth / 2 + " 0\n\t\t\t\t\th " + ctx.rend.clientWidth * 4 + "\n\t\t\t\t");
    			attr_dev(path0, "stroke-width", path0_stroke_width_value = 2 / ctx.anim.zoom);
    			attr_dev(path0, "stroke", "#000F");
    			attr_dev(path0, "shape-rendering", "crispEdges");
    			add_location(path0, file$3, 906, 4, 27875);
    			attr_dev(path1, "d", path1_d_value = "\n\t\t\t\t\tM 0 " + -4 * ctx.rend.clientHeight / 2 + "\n\t\t\t\t\tv " + ctx.rend.clientHeight * 4 + "\n\t\t\t\t");
    			attr_dev(path1, "stroke-width", path1_stroke_width_value = 2 / ctx.anim.zoom);
    			attr_dev(path1, "stroke", "#000F");
    			attr_dev(path1, "shape-rendering", "crispEdges");
    			add_location(path1, file$3, 914, 4, 28060);
    			attr_dev(path2, "d", path2_d_value = (ctx.anim.grid) ? ctx.drawGridOverlay(ctx.anim.zoomGrids[ctx.anim.zoom][0], ctx.anim.zoomGrids[ctx.anim.zoom][1], ctx.anim.gridViewerRadius / ctx.anim.zoom, ctx.calc.relMouseX, ctx.calc.relMouseY) : '');
    			attr_dev(path2, "stroke-width", path2_stroke_width_value = 1 / ctx.anim.zoom);
    			attr_dev(path2, "stroke", "#0008");
    			attr_dev(path2, "shape-rendering", "crispEdges");
    			attr_dev(path2, "mask", "url(#mouseMask)");
    			add_location(path2, file$3, 922, 4, 28247);
    			attr_dev(rect1, "x", rect1_x_value = ctx.calc.sprXPos + ctx.calc.frameWidth * (ctx.anim.spriteFrame));
    			attr_dev(rect1, "y", rect1_y_value = ctx.calc.sprYPos);
    			attr_dev(rect1, "width", rect1_width_value = ctx.calc.frameWidth);
    			attr_dev(rect1, "height", rect1_height_value = ctx.spritesheetSrc.dimensions.height);
    			attr_dev(rect1, "stroke", "black");
    			attr_dev(rect1, "stroke-width", "2");
    			attr_dev(rect1, "fill", "none");
    			add_location(rect1, file$3, 928, 4, 28548);
    			attr_dev(svg, "version", "2.0");
    			set_style(svg, "width", "100%");
    			set_style(svg, "height", "100%");
    			attr_dev(svg, "viewBox", svg_viewBox_value = "\n\t\t\t\t\t" + (ctx.anim.cameraX - ctx.rend.clientWidth) / 2 / ctx.anim.zoom + " \n\t\t\t\t\t" + (ctx.anim.cameraY - ctx.rend.clientHeight) / 2 / ctx.anim.zoom + " \n\t\t\t\t\t" + ctx.rend.clientWidth / ctx.anim.zoom + " \n\t\t\t\t\t" + ctx.rend.clientHeight / ctx.anim.zoom);
    			add_location(svg, file$3, 886, 3, 27049);
    			attr_dev(div10, "class", "grid");
    			set_style(div10, "width", "100%");
    			set_style(div10, "height", "100%");
    			set_style(div10, "position", "absolute");
    			set_style(div10, "top", "0");
    			set_style(div10, "left", "0");
    			set_style(div10, "display", "grid");
    			set_style(div10, "image-rendering", "pixelated");
    			add_location(div10, file$3, 885, 2, 26913);
    			attr_dev(div11, "id", "main");
    			attr_dev(div11, "class", "svelte-17vzh85");
    			add_location(div11, file$3, 705, 1, 19302);
    			attr_dev(div12, "id", "settings");
    			attr_dev(div12, "class", "svelte-17vzh85");
    			add_location(div12, file$3, 1074, 1, 34106);
    			attr_dev(div13, "id", "app");
    			attr_dev(div13, "class", "svelte-17vzh85");
    			add_location(div13, file$3, 623, 0, 16024);

    			dispose = [
    				listen_dev(window_1, "keydown", ctx.keydown_handler),
    				listen_dev(button0, "click", ctx.click_handler),
    				listen_dev(input0, "change", ctx.change_handler),
    				listen_dev(input1, "input", input1_input_handler),
    				listen_dev(button2, "click", ctx.click_handler_1),
    				listen_dev(button3, "click", ctx.click_handler_2),
    				listen_dev(button4, "click", ctx.save),
    				listen_dev(button5, "click", ctx.load),
    				listen_dev(button6, "click", ctx.gmlExport),
    				listen_dev(button7, "click", ctx.click_handler_3),
    				listen_dev(button8, "click", ctx.click_handler_4),
    				listen_dev(button9, "click", ctx.click_handler_5),
    				listen_dev(textarea, "input", ctx.textarea_input_handler),
    				listen_dev(button10, "click", ctx.exportWIP),
    				listen_dev(input2, "change", ctx.loadWIP),
    				listen_dev(button12, "click", ctx.click_handler_7),
    				listen_dev(button13, "click", ctx.click_handler_8),
    				listen_dev(div11, "mousemove", ctx.mousemove_handler_1),
    				listen_dev(div11, "mousedown", ctx.mousedown_handler_1),
    				listen_dev(div11, "mouseup", ctx.mouseup_handler_1)
    			];
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			mount_component(modal, target, anchor);
    			insert_dev(target, t0, anchor);
    			mount_component(localstoragefs, target, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, div13, anchor);
    			append_dev(div13, div5);
    			append_dev(div5, div0);
    			append_dev(div0, button0);
    			append_dev(div0, t3);
    			append_dev(div0, label0);
    			append_dev(label0, button1);
    			append_dev(div0, t5);
    			append_dev(div0, input0);
    			append_dev(div5, t6);
    			append_dev(div5, div1);
    			append_dev(div1, label1);
    			append_dev(div1, t8);
    			append_dev(div1, input1);

    			set_input_value(input1, ctx.spritesheetSrc.framecount);

    			append_dev(div5, t9);
    			append_dev(div5, div2);
    			append_dev(div2, button2);
    			append_dev(button2, i0);
    			append_dev(button2, span0);
    			append_dev(div2, t12);
    			append_dev(div2, button3);
    			append_dev(button3, i1);
    			append_dev(button3, span1);
    			append_dev(div5, t15);
    			append_dev(div5, div3);
    			append_dev(div3, button4);
    			append_dev(button4, i2);
    			append_dev(button4, span2);
    			append_dev(div3, t18);
    			append_dev(div3, button5);
    			append_dev(button5, i3);
    			append_dev(button5, span3);
    			append_dev(div3, t21);
    			append_dev(div3, button6);
    			append_dev(button6, i4);
    			append_dev(button6, span4);
    			append_dev(div5, t24);
    			append_dev(div5, div4);
    			append_dev(div4, button7);
    			append_dev(button7, i5);
    			append_dev(button7, span5);
    			append_dev(div4, t27);
    			append_dev(div4, button8);
    			append_dev(button8, i6);
    			append_dev(button8, span6);
    			append_dev(div4, t30);
    			append_dev(div4, button9);
    			append_dev(button9, i7);
    			append_dev(button9, span7);
    			append_dev(div4, t33);
    			append_dev(div4, textarea);

    			set_input_value(textarea, ctx.outputBox);

    			append_dev(div4, t34);
    			append_dev(div4, button10);
    			append_dev(button10, i8);
    			append_dev(button10, span8);
    			append_dev(div4, t37);
    			append_dev(div4, label2);
    			append_dev(label2, button11);
    			append_dev(button11, i9);
    			append_dev(button11, span9);
    			append_dev(div4, t40);
    			append_dev(div4, input2);
    			append_dev(div13, t41);
    			append_dev(div13, div7);
    			append_dev(div7, div6);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].m(div6, null);
    			}

    			append_dev(div13, t42);
    			mount_component(timeline, div13, null);
    			append_dev(div13, t43);
    			append_dev(div13, div11);
    			append_dev(div11, div9);
    			append_dev(div9, button12);
    			append_dev(button12, t44);
    			append_dev(div9, t45);
    			append_dev(div9, button13);
    			append_dev(button13, t46);
    			append_dev(div9, t47);
    			append_dev(div9, div8);
    			if_block0.m(div8, null);
    			append_dev(div11, t48);
    			append_dev(div11, div10);
    			append_dev(div10, svg);
    			append_dev(svg, defs);
    			append_dev(defs, filter);
    			append_dev(filter, feGaussianBlur);
    			append_dev(defs, clipPath);
    			append_dev(clipPath, rect0);
    			append_dev(defs, mask);
    			append_dev(mask, circle);
    			append_dev(svg, path0);
    			append_dev(svg, path1);
    			append_dev(svg, path2);
    			append_dev(svg, rect1);
    			if_block1.m(svg, null);
    			append_dev(svg, if_block1_anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(svg, null);
    			}

    			append_dev(svg, each1_anchor);
    			if (if_block2) if_block2.m(svg, null);
    			ctx.div11_binding(div11);
    			append_dev(div13, t49);
    			append_dev(div13, div12);
    			if (~current_block_type_index) if_blocks[current_block_type_index].m(div12, null);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var modal_changes = {};
    			if (!updating_visible && changed.modalVisible) {
    				modal_changes.visible = ctx.modalVisible;
    			}
    			modal.$set(modal_changes);

    			if (!input1_updating && changed.spritesheetSrc) set_input_value(input1, ctx.spritesheetSrc.framecount);
    			input1_updating = false;
    			if (changed.outputBox) set_input_value(textarea, ctx.outputBox);

    			if (changed.spritesheetSrc || changed.calc || changed.anim || changed.Array) {
    				each_value_2 = new ctx.Array(ctx.spritesheetSrc.framecount).fill(0);

    				let i;
    				for (i = 0; i < each_value_2.length; i += 1) {
    					const child_ctx = get_each_context_2$1(ctx, each_value_2, i);

    					if (each_blocks_1[i]) {
    						each_blocks_1[i].p(changed, child_ctx);
    					} else {
    						each_blocks_1[i] = create_each_block_2$1(child_ctx);
    						each_blocks_1[i].c();
    						each_blocks_1[i].m(div6, null);
    					}
    				}

    				for (; i < each_blocks_1.length; i += 1) {
    					each_blocks_1[i].d(1);
    				}
    				each_blocks_1.length = each_value_2.length;
    			}

    			if (!current || changed.spritesheetSrc) {
    				set_style(div6, "width", "" + ctx.spritesheetSrc.dimensions.width + "px");
    			}

    			var timeline_changes = {};
    			if (!updating_anim && changed.anim) {
    				timeline_changes.anim = ctx.anim;
    			}
    			if (!updating_windows && changed.windows) {
    				timeline_changes.windows = ctx.windows;
    			}
    			if (!updating_hitboxes && changed.hitboxes) {
    				timeline_changes.hitboxes = ctx.hitboxes;
    			}
    			if (!updating_editingMode && changed.editingMode) {
    				timeline_changes.editingMode = ctx.editingMode;
    			}
    			if (!updating_updateStates && changed.updateStates) {
    				timeline_changes.updateStates = ctx.updateStates;
    			}
    			timeline.$set(timeline_changes);

    			if (!current || changed.mainViewInfo) {
    				attr_dev(button12, "active", ctx.mainViewInfo);
    			}

    			if ((!current || changed.mainViewInfo) && button13_active_value !== (button13_active_value = !ctx.mainViewInfo)) {
    				attr_dev(button13, "active", button13_active_value);
    			}

    			if (current_block_type === (current_block_type = select_block_type(changed, ctx)) && if_block0) {
    				if_block0.p(changed, ctx);
    			} else {
    				if_block0.d(1);
    				if_block0 = current_block_type(ctx);
    				if (if_block0) {
    					if_block0.c();
    					if_block0.m(div8, null);
    				}
    			}

    			if ((!current || changed.anim || changed.spritesheetSrc) && rect0_x_value !== (rect0_x_value = (ctx.anim.spriteFrame % ctx.spritesheetSrc.framecount) / ctx.spritesheetSrc.framecount)) {
    				attr_dev(rect0, "x", rect0_x_value);
    			}

    			if ((!current || changed.spritesheetSrc) && rect0_width_value !== (rect0_width_value = 1 / ctx.spritesheetSrc.framecount)) {
    				attr_dev(rect0, "width", rect0_width_value);
    			}

    			if ((!current || changed.calc) && circle_cx_value !== (circle_cx_value = ctx.calc.relMouseX)) {
    				attr_dev(circle, "cx", circle_cx_value);
    			}

    			if ((!current || changed.calc) && circle_cy_value !== (circle_cy_value = ctx.calc.relMouseY)) {
    				attr_dev(circle, "cy", circle_cy_value);
    			}

    			if ((!current || changed.anim) && circle_r_value !== (circle_r_value = ctx.anim.gridViewerRadius / ctx.anim.zoom)) {
    				attr_dev(circle, "r", circle_r_value);
    			}

    			if ((!current || changed.rend) && path0_d_value !== (path0_d_value = "\n\t\t\t\t\tM " + -4 * ctx.rend.clientWidth / 2 + " 0\n\t\t\t\t\th " + ctx.rend.clientWidth * 4 + "\n\t\t\t\t")) {
    				attr_dev(path0, "d", path0_d_value);
    			}

    			if ((!current || changed.anim) && path0_stroke_width_value !== (path0_stroke_width_value = 2 / ctx.anim.zoom)) {
    				attr_dev(path0, "stroke-width", path0_stroke_width_value);
    			}

    			if ((!current || changed.rend) && path1_d_value !== (path1_d_value = "\n\t\t\t\t\tM 0 " + -4 * ctx.rend.clientHeight / 2 + "\n\t\t\t\t\tv " + ctx.rend.clientHeight * 4 + "\n\t\t\t\t")) {
    				attr_dev(path1, "d", path1_d_value);
    			}

    			if ((!current || changed.anim) && path1_stroke_width_value !== (path1_stroke_width_value = 2 / ctx.anim.zoom)) {
    				attr_dev(path1, "stroke-width", path1_stroke_width_value);
    			}

    			if ((!current || changed.anim || changed.calc) && path2_d_value !== (path2_d_value = (ctx.anim.grid) ? ctx.drawGridOverlay(ctx.anim.zoomGrids[ctx.anim.zoom][0], ctx.anim.zoomGrids[ctx.anim.zoom][1], ctx.anim.gridViewerRadius / ctx.anim.zoom, ctx.calc.relMouseX, ctx.calc.relMouseY) : '')) {
    				attr_dev(path2, "d", path2_d_value);
    			}

    			if ((!current || changed.anim) && path2_stroke_width_value !== (path2_stroke_width_value = 1 / ctx.anim.zoom)) {
    				attr_dev(path2, "stroke-width", path2_stroke_width_value);
    			}

    			if ((!current || changed.calc || changed.anim) && rect1_x_value !== (rect1_x_value = ctx.calc.sprXPos + ctx.calc.frameWidth * (ctx.anim.spriteFrame))) {
    				attr_dev(rect1, "x", rect1_x_value);
    			}

    			if ((!current || changed.calc) && rect1_y_value !== (rect1_y_value = ctx.calc.sprYPos)) {
    				attr_dev(rect1, "y", rect1_y_value);
    			}

    			if ((!current || changed.calc) && rect1_width_value !== (rect1_width_value = ctx.calc.frameWidth)) {
    				attr_dev(rect1, "width", rect1_width_value);
    			}

    			if ((!current || changed.spritesheetSrc) && rect1_height_value !== (rect1_height_value = ctx.spritesheetSrc.dimensions.height)) {
    				attr_dev(rect1, "height", rect1_height_value);
    			}

    			if (current_block_type_1 === (current_block_type_1 = select_block_type_1(changed, ctx)) && if_block1) {
    				if_block1.p(changed, ctx);
    			} else {
    				if_block1.d(1);
    				if_block1 = current_block_type_1(ctx);
    				if (if_block1) {
    					if_block1.c();
    					if_block1.m(svg, if_block1_anchor);
    				}
    			}

    			if (changed.anim || changed.tools || changed.calc || changed.hitboxes || changed.Math) {
    				each_value = ctx.hitboxes;

    				let i;
    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$2(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(changed, child_ctx);
    					} else {
    						each_blocks[i] = create_each_block$2(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(svg, each1_anchor);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}
    				each_blocks.length = each_value.length;
    			}

    			if (current_block_type_2 === (current_block_type_2 = select_block_type_3(changed, ctx)) && if_block2) {
    				if_block2.p(changed, ctx);
    			} else {
    				if (if_block2) if_block2.d(1);
    				if_block2 = current_block_type_2 && current_block_type_2(ctx);
    				if (if_block2) {
    					if_block2.c();
    					if_block2.m(svg, null);
    				}
    			}

    			if ((!current || changed.anim || changed.rend) && svg_viewBox_value !== (svg_viewBox_value = "\n\t\t\t\t\t" + (ctx.anim.cameraX - ctx.rend.clientWidth) / 2 / ctx.anim.zoom + " \n\t\t\t\t\t" + (ctx.anim.cameraY - ctx.rend.clientHeight) / 2 / ctx.anim.zoom + " \n\t\t\t\t\t" + ctx.rend.clientWidth / ctx.anim.zoom + " \n\t\t\t\t\t" + ctx.rend.clientHeight / ctx.anim.zoom)) {
    				attr_dev(svg, "viewBox", svg_viewBox_value);
    			}

    			var previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type_5(changed, ctx);
    			if (current_block_type_index === previous_block_index) {
    				if (~current_block_type_index) if_blocks[current_block_type_index].p(changed, ctx);
    			} else {
    				if (if_block3) {
    					group_outros();
    					transition_out(if_blocks[previous_block_index], 1, 1, () => {
    						if_blocks[previous_block_index] = null;
    					});
    					check_outros();
    				}

    				if (~current_block_type_index) {
    					if_block3 = if_blocks[current_block_type_index];
    					if (!if_block3) {
    						if_block3 = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    						if_block3.c();
    					}
    					transition_in(if_block3, 1);
    					if_block3.m(div12, null);
    				} else {
    					if_block3 = null;
    				}
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(modal.$$.fragment, local);

    			transition_in(localstoragefs.$$.fragment, local);

    			transition_in(timeline.$$.fragment, local);

    			transition_in(if_block3);
    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(modal.$$.fragment, local);
    			transition_out(localstoragefs.$$.fragment, local);
    			transition_out(timeline.$$.fragment, local);
    			transition_out(if_block3);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			destroy_component(modal, detaching);

    			if (detaching) {
    				detach_dev(t0);
    			}

    			destroy_component(localstoragefs, detaching);

    			if (detaching) {
    				detach_dev(t1);
    				detach_dev(div13);
    			}

    			destroy_each(each_blocks_1, detaching);

    			destroy_component(timeline);

    			if_block0.d();
    			if_block1.d();

    			destroy_each(each_blocks, detaching);

    			if (if_block2) if_block2.d();
    			ctx.div11_binding(null);
    			if (~current_block_type_index) if_blocks[current_block_type_index].d();
    			run_all(dispose);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$4.name, type: "component", source: "", ctx });
    	return block;
    }

    const mousedown_handler = (evt) => evt.target.dragging = true;

    const mouseout_handler = (evt) => evt.target.dragging = false;

    const mouseup_handler = (evt) => evt.target.dragging = false;

    function instance$3($$self, $$props, $$invalidate) {
    	

    	// makes a confirmation dialog appear before closing the window
    	window.onbeforeunload = (e) => 'derp';


    	let modalVisible = true;

    	let spritesheetSrc = {
    		file: '...',
    		dataUrl: '',
    		dimensions: {
    			width: 0,
    			height: 0
    		},
    		framecount: 1
    	};

    	let char = charProps;
    	let windows = [
    		{
    			meta: {
    				name: 'derp',
    			},
    			data: JSON.parse(JSON.stringify({...winProps}))
    		},
    	];
    	let hitboxes = [
    		// {
    		// 	meta: {
    		// 		color: ...
    		// 		name: ...
    		//		etc: ...
    		// 	},
    		//  data: {HG_Attrs...}
    		// }
    	];
    	let atkData = JSON.parse(JSON.stringify(atkDataProps));

    	let editingMode = 'window';
    	let mainViewInfo = true;
    	let activeEl;
    	let tools = [
    		["pan_tool", "pan", "v"], 
    		["add_box", "rectangle", "b"], 
    		["rounded_corner", "round", "r"], 
    		["add_circle", "circle", "o"],
    		["clear", "eraser", "Backspace"]

    	];
    	$$invalidate('tools', tools.selected = "pan", tools);

    	let renderer;
    	let rend;

    	let anim = {
    		// controlled
    		animFrame: 0,
    		playSpeed: 1, 
    		playing: false,
    		loop: true,
    		zoom: 1,
    		cameraX: 0,
    		cameraY: 0,
    		movement: true,

    		grid: -1,
    		gridViewerRadius: 45,
    		zoomGrids: {
    			0.25: [50, 50],
    			0.50: [25, 25],
    			1.00: [20, 20],
    			2.00: [10, 10],
    			4.00: [5, 5],
    			8.00: [1, 1],
    		},

    		audio: true,

    		// calculated
    		duration: 0,
    		spriteFrame: 0,
    		windowIndex: 0, // also known as "windex" :^)
    		windowFrame: 0,
    		windowPositions: [],

    		hitboxFrames: {},
    		
    		xpos: 0,
    		ypos: 0,
    		charFramePositionData: [],
    	};

    	let calc = {
    		frameWidth: 0,
    		sprXPos: 0,
    		sprYPos: 0,
    		mouseX: 0,
    		mouseY: 0,
    		relMouseX: 0,
    		relMouseY: 0,
    		aspectRatio: 1
    	};

    	let updateStates = {
    		length: true,
    		movement: true,
    		hitboxes: true,
    		frames: true,
    	};

    	const fullUpdate = () => {
    		$$invalidate('updateStates', updateStates.hitboxes = true, updateStates);
    		$$invalidate('updateStates', updateStates.movement = true, updateStates);
    		$$invalidate('updateStates', updateStates.length = true, updateStates);
    		$$invalidate('updateStates', updateStates.frames = true, updateStates);
    	};

    	const save = () => {
    		store2({
    			anim,
    			windows: strip(windows),
    			hitboxes: strip(hitboxes),
    			spritesheetSrc,
    			char: strip(char),
    			atkData,
    		});
    	};
    	const load = () => {
    		let data = store2();
    		$$invalidate('anim', anim = data.anim);
    		$$invalidate('windows', windows = populate(data.windows, winProps));
    		$$invalidate('spritesheetSrc', spritesheetSrc = data.spritesheetSrc);
    		$$invalidate('char', char = populate(data.char, charProps));
    		$$invalidate('hitboxes', hitboxes = populate(data.hitboxes, hitboxProps));
    		$$invalidate('atkData', atkData = data.atkData);
    		fullUpdate();
    	};
    	const exportWIP = () => {
    		const fileStream = StreamSaver.createWriteStream('WIP.roab');
    		const data = (lzString.compressToUint8Array(JSON.stringify({
    			anim,
    			windows: strip(windows),
    			hitboxes: strip(hitboxes),
    			spritesheetSrc,
    			char: strip(char),
    			atkData,
    		})));

    		new Response(data).body
    			.pipeTo(fileStream);
    	};
    	const loadWIP = async (evt) => {
    		const file = evt.target.files[0];
    		const data = new Uint8Array(await file.arrayBuffer());
    		const d = JSON.parse(lzString.decompressFromUint8Array(data));
    		
    		$$invalidate('anim', anim = d.anim);
    		$$invalidate('windows', windows = populate(d.windows, winProps));
    		$$invalidate('hitboxes', hitboxes = populate(d.hitboxes, hitboxProps));
    		$$invalidate('spritesheetSrc', spritesheetSrc = d.spritesheetSrc);
    		$$invalidate('char', char = populate(d.char, charProps));
    		$$invalidate('atkData', atkData = d.atkData);

    		fullUpdate();
    	};

    	let initGMLCode = 'nothing exported yet';
    	let loadGMLCode = 'nothing exported yet';
    	let attackGMLCode = 'nothing exported yet';
    	let outputBox = 'stuff will appear here when the above buttons are clicked...';
    	const gmlExport = () => {
    		const strings = exporter(char, atkData, windows, JSON.parse(JSON.stringify(hitboxes)));
    		$$invalidate('initGMLCode', initGMLCode = strings.out_INIT);
    		$$invalidate('loadGMLCode', loadGMLCode = strings.out_LOAD);
    		$$invalidate('attackGMLCode', attackGMLCode = strings.out_ATK);
    	};

    	const skipBack = () => {
    		if (anim.windowIndex !== 0) $$invalidate('anim', anim.animFrame = anim.windowPositions[anim.windowIndex - 1], anim);
    		else $$invalidate('anim', anim.animFrame = 0, anim);
    	};
    	const skipAhead = () => {
    		if (anim.windowIndex !== windows.length - 1) $$invalidate('anim', anim.animFrame = anim.windowPositions[anim.windowIndex + 1], anim);
    		else $$invalidate('anim', anim.animFrame = anim.windowPositions[anim.windowIndex] + windows[anim.windowIndex].data.AG_WINDOW_LENGTH.value - 1, anim);
    	};

    	const processImage = async (file) => {
    		$$invalidate('spritesheetSrc', spritesheetSrc.file = file, spritesheetSrc);
    		$$invalidate('spritesheetSrc', spritesheetSrc.buffer = await file.arrayBuffer(), spritesheetSrc);

    		let fileReader = new FileReader();
    		fileReader.onloadend = () => {
    			$$invalidate('spritesheetSrc', spritesheetSrc.dataUrl = fileReader.result, spritesheetSrc);
    			let img = new Image();
    			img.onload = function() {
    				$$invalidate('spritesheetSrc', spritesheetSrc.dimensions = {width: this.width, height: this.height}, spritesheetSrc);

    			};
    			img.src = fileReader.result;
    		};
    		fileReader.readAsDataURL(file);
    	};

    	const drawGridOverlay = (pixelsX, pixelsY, radius, xpos, ypos) => {
    		const yOffset = ypos - radius * 1.5;
    		const xOffset = xpos - radius * 1.5;
    		let out = "";
    		for (let y = yOffset - (yOffset) % pixelsY; y < ypos + radius; y += pixelsY) {
    			out += `
				M ${xpos - radius} ${y}
				h ${radius * 2}
			`;
    		}
    		for (let x = (xOffset - (xOffset) % pixelsX); x < xpos + radius; x += pixelsX) {
    			out += `
				M ${x} ${ypos - radius}
				v ${radius * 2}
			`;
    		}
    		return out;
    	};

    	const keydown_handler = (evt) => {
    			switch(evt.key) {
    				case '[':
    					skipBack();
    					$$invalidate('updateStates', updateStates.frames = true, updateStates);
    					break;
    				case ',':
    					if (anim.animFrame > 0) $$invalidate('anim', anim.animFrame --, anim);
    					$$invalidate('updateStates', updateStates.frames = true, updateStates);
    					break;
    				case ']':
    					skipAhead();
    					$$invalidate('updateStates', updateStates.frames = true, updateStates);
    					break;
    				case '.':
    					if (anim.animFrame < anim.duration - 1) $$invalidate('anim', anim.animFrame ++, anim);
    					$$invalidate('updateStates', updateStates.frames = true, updateStates);
    					break;
    				default: 
    					for (const t of tools) {
    						if (t[1] === tools.selected) continue;
    						else if (t[2] === evt.key) {
    							$$invalidate('tools', tools.selected = t[1], tools);
    							break;
    						}
    					}
    			}

    		};

    	function modal_visible_binding(value) {
    		modalVisible = value;
    		$$invalidate('modalVisible', modalVisible);
    	}

    	const close_handler = () => $$invalidate('modalVisible', modalVisible = false);

    	const click_handler = () => $$invalidate('modalVisible', modalVisible = true);

    	const change_handler = async (evt) => {$$invalidate('spritesheetSrc', spritesheetSrc.file = evt.target.files[0], spritesheetSrc); processImage(evt.target.files[0]);};

    	function input1_input_handler() {
    		spritesheetSrc.framecount = to_number(this.value);
    		$$invalidate('spritesheetSrc', spritesheetSrc);
    	}

    	const click_handler_1 = () => $$invalidate('editingMode', editingMode = 'atkData');

    	const click_handler_2 = () => $$invalidate('editingMode', editingMode = 'chrData');

    	const click_handler_3 = () => $$invalidate('outputBox', outputBox = initGMLCode);

    	const click_handler_4 = () => $$invalidate('outputBox', outputBox = loadGMLCode);

    	const click_handler_5 = () => $$invalidate('outputBox', outputBox = attackGMLCode);

    	function textarea_input_handler() {
    		outputBox = this.value;
    		$$invalidate('outputBox', outputBox);
    	}

    	const click_handler_6 = ({ i }) => {$$invalidate('windows', windows[anim.windowIndex].data.AG_WINDOW_ANIM_FRAME_START.value = i, windows);};

    	function timeline_anim_binding(value_1) {
    		anim = value_1;
    		$$invalidate('anim', anim), $$invalidate('updateStates', updateStates), $$invalidate('windows', windows), $$invalidate('char', char), $$invalidate('atkData', atkData), $$invalidate('hitboxes', hitboxes), $$invalidate('spritesheetSrc', spritesheetSrc);
    	}

    	function timeline_windows_binding(value_2) {
    		windows = value_2;
    		$$invalidate('windows', windows);
    	}

    	function timeline_hitboxes_binding(value_3) {
    		hitboxes = value_3;
    		$$invalidate('hitboxes', hitboxes);
    	}

    	function timeline_editingMode_binding(value_4) {
    		editingMode = value_4;
    		$$invalidate('editingMode', editingMode);
    	}

    	function timeline_updateStates_binding(value_5) {
    		updateStates = value_5;
    		$$invalidate('updateStates', updateStates), $$invalidate('anim', anim), $$invalidate('windows', windows), $$invalidate('char', char), $$invalidate('atkData', atkData), $$invalidate('hitboxes', hitboxes), $$invalidate('spritesheetSrc', spritesheetSrc);
    	}

    	const click_handler_7 = () => $$invalidate('mainViewInfo', mainViewInfo = true);

    	const click_handler_8 = () => $$invalidate('mainViewInfo', mainViewInfo = false);

    	function select_change_handler() {
    		anim.zoom = select_value(this);
    		$$invalidate('anim', anim), $$invalidate('updateStates', updateStates), $$invalidate('windows', windows), $$invalidate('char', char), $$invalidate('atkData', atkData), $$invalidate('hitboxes', hitboxes), $$invalidate('spritesheetSrc', spritesheetSrc);
    	}

    	function input0_input_handler() {
    		anim.zoomGrids[anim.zoom][0] = to_number(this.value);
    		$$invalidate('anim', anim), $$invalidate('updateStates', updateStates), $$invalidate('windows', windows), $$invalidate('char', char), $$invalidate('atkData', atkData), $$invalidate('hitboxes', hitboxes), $$invalidate('spritesheetSrc', spritesheetSrc);
    	}

    	function input1_input_handler_1() {
    		anim.zoomGrids[anim.zoom][1] = to_number(this.value);
    		$$invalidate('anim', anim), $$invalidate('updateStates', updateStates), $$invalidate('windows', windows), $$invalidate('char', char), $$invalidate('atkData', atkData), $$invalidate('hitboxes', hitboxes), $$invalidate('spritesheetSrc', spritesheetSrc);
    	}

    	function input2_change_handler() {
    		char.position_locked.value = this.checked;
    		$$invalidate('char', char);
    	}

    	function input3_change_handler() {
    		anim.movement = this.checked;
    		$$invalidate('anim', anim), $$invalidate('updateStates', updateStates), $$invalidate('windows', windows), $$invalidate('char', char), $$invalidate('atkData', atkData), $$invalidate('hitboxes', hitboxes), $$invalidate('spritesheetSrc', spritesheetSrc);
    	}

    	function input4_change_handler() {
    		anim.audio = this.checked;
    		$$invalidate('anim', anim), $$invalidate('updateStates', updateStates), $$invalidate('windows', windows), $$invalidate('char', char), $$invalidate('atkData', atkData), $$invalidate('hitboxes', hitboxes), $$invalidate('spritesheetSrc', spritesheetSrc);
    	}

    	const click_handler_9 = ({ tool }) => $$invalidate('tools', tools.selected = tool[1], tools);

    	const mousemove_handler = (evt) => {
    								if (evt.target.dragging && !char.position_locked.value && tools.selected === "pan") {
    									$$invalidate('char', char.sprite_offset_x.value += evt.movementX / anim.zoom, char);
    									$$invalidate('char', char.sprite_offset_y.value += evt.movementY / anim.zoom, char);
    								}
    							};

    	function ellipse_binding($$value, hitbox) {
    		if (hitbox.meta.el === $$value) return;
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			hitbox.meta.el = $$value;
    			$$invalidate('hitbox', hitbox);
    		});
    	}

    	function rect_binding($$value, hitbox) {
    		if (hitbox.meta.el === $$value) return;
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			hitbox.meta.el = $$value;
    			$$invalidate('hitbox', hitbox);
    		});
    	}

    	function rect_binding_1($$value, hitbox) {
    		if (hitbox.meta.el === $$value) return;
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			hitbox.meta.el = $$value;
    			$$invalidate('hitbox', hitbox);
    		});
    	}

    	function ellipse_binding_1($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			$$invalidate('activeEl', activeEl = $$value);
    		});
    	}

    	function rect_binding_2($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			$$invalidate('activeEl', activeEl = $$value);
    		});
    	}

    	function div11_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			$$invalidate('renderer', renderer = $$value);
    		});
    	}

    	const mousemove_handler_1 = (evt) => {
    				if (renderer.dragging) {
    					switch(tools.selected) {
    						case "pan": 
    							switch(renderer.target) {
    								case 'hitbox':
    									$$invalidate('hitboxes', hitboxes[hitboxes.selected].data.HG_HITBOX_X.value += evt.movementX/anim.zoom, hitboxes);
    									$$invalidate('hitboxes', hitboxes[hitboxes.selected].data.HG_HITBOX_Y.value += evt.movementY/anim.zoom, hitboxes);
    									$$invalidate('updateStates', updateStates.hitboxes = true, updateStates);
    									break;
    								case 'angle-indicator':
    									$$invalidate('hitboxes', hitboxes[hitboxes.selected].data.HG_ANGLE.value = 180 - Math.atan2(renderer.mouseOrigin[1] - evt.pageY, renderer.mouseOrigin[0] - evt.pageX) * 180/Math.PI, hitboxes);
    									$$invalidate('updateStates', updateStates.hitboxes = true, updateStates);
    									break;
    								case 'resizer':
    									$$invalidate('hitboxes', hitboxes[hitboxes.selected].data.HG_WIDTH.value = Math.ceil(Math.abs((renderer.mouseOrigin[0] - evt.pageX)/anim.zoom)), hitboxes);
    									$$invalidate('hitboxes', hitboxes[hitboxes.selected].data.HG_HEIGHT.value = Math.ceil(Math.abs((renderer.mouseOrigin[1] - evt.pageY)/anim.zoom)), hitboxes);
    									$$invalidate('updateStates', updateStates.hitboxes = true, updateStates);
    									break;
    								default:
    									$$invalidate('anim', anim.cameraX -= evt.movementX, anim);
    									$$invalidate('anim', anim.cameraY -= evt.movementY, anim);
    							}
    							break;
    						case "circle":
    							activeEl.setAttributeNS(null, 'rx', Math.ceil(Math.abs((renderer.mouseOrigin[0] - evt.pageX)/anim.zoom)));
    							activeEl.setAttributeNS(null, 'ry', Math.ceil(Math.abs((renderer.mouseOrigin[1] - evt.pageY)/anim.zoom)));
    							break;
    						case "rectangle":
    						case "round":
    							activeEl.setAttributeNS(null, 'x', renderer.svgPosition[0] - Math.ceil(Math.abs((renderer.mouseOrigin[0] - evt.pageX)/anim.zoom)) );
    							activeEl.setAttributeNS(null, 'y', renderer.svgPosition[1] - Math.ceil(Math.abs((renderer.mouseOrigin[1] - evt.pageY)/anim.zoom)) );
    							activeEl.setAttributeNS(null, 'width', Math.ceil(Math.abs((renderer.mouseOrigin[0] - evt.pageX)/anim.zoom))*2);
    							activeEl.setAttributeNS(null, 'height', Math.ceil(Math.abs((renderer.mouseOrigin[1] - evt.pageY)/anim.zoom))*2);
    							if (tools.selected === "round") {
    								activeEl.setAttributeNS(null, 'rx', parseInt(activeEl.getAttribute('width')) * 0.25);
    								activeEl.setAttributeNS(null, 'ry', parseInt(activeEl.getAttribute('height')) * 0.25);

    							}
    							break;
    					}
    				} else {
    					$$invalidate('calc', calc.mouseX = evt.clientX, calc); $$invalidate('calc', calc.mouseY = evt.clientY, calc);
    				}
    			};

    	const mousedown_handler_1 = (evt) => {
    				$$invalidate('tools', tools.active = true, tools);
    				$$invalidate('renderer', renderer.dragging = true, renderer);
    				$$invalidate('renderer', renderer.target = evt.target.getAttributeNS(null, 'class'), renderer);
    				if (renderer.target === 'hitbox' || renderer.target === 'angle-indicator') {
    					if (tools.selected === 'eraser') {
    						$$invalidate('editingMode', editingMode = 'window');
    						hitboxes.splice(evt.target.getAttributeNS(null, 'data-index'), 1);
    						$$invalidate('updateStates', updateStates.hitboxes = true, updateStates);
    					} else {
    						$$invalidate('editingMode', editingMode = 'hitbox');
    						$$invalidate('hitboxes', hitboxes.selected = parseInt(evt.target.getAttributeNS(null, 'data-index')), hitboxes);
    						const hb = hitboxes[hitboxes.selected];
    						const br = hb.meta.el.getBoundingClientRect();
    						$$invalidate('renderer', renderer.mouseOrigin = [br.left + (br.right - br.left)/2, br.top + (br.bottom - br.top)/2], renderer);
    						$$invalidate('updateStates', updateStates.hitboxes = true, updateStates);
    					}

    				} else {
    					if (renderer.target === "resizer") {
    						$$invalidate('hitboxes', hitboxes.selected = parseInt(evt.target.getAttributeNS(null, 'data-index')), hitboxes);
    						$$invalidate('updateStates', updateStates.hitboxes = true, updateStates);
    					}
    					$$invalidate('renderer', renderer.mouseOrigin = [evt.pageX, evt.pageY], renderer);
    				}
    				$$invalidate('renderer', renderer.svgPosition = [calc.relMouseX, calc.relMouseY], renderer);
    			};

    	const mouseup_handler_1 = (evt) => {
    				$$invalidate('tools', tools.active = false, tools);
    				$$invalidate('renderer', renderer.dragging = false, renderer);
    				switch(tools.selected) {
    					case "pan":
    						let hb = hitboxes[hitboxes.selected];
    						switch(renderer.target) {
    							case 'hitbox':
    								hb.data.HG_HITBOX_X.value = Math.round(hb.data.HG_HITBOX_X.value);
    								hb.data.HG_HITBOX_Y.value = Math.round(hb.data.HG_HITBOX_Y.value);
    								$$invalidate('updateStates', updateStates.hitboxes = true, updateStates);
    								break;
    							case 'angle-indicator':
    								hb.data.HG_ANGLE.value = Math.round(hb.data.HG_ANGLE.value);
    								$$invalidate('updateStates', updateStates.hitboxes = true, updateStates);
    								break;
    							case 'resizer':
    								if (hb.data.HG_WIDTH.value === 0 || hb.data.HG_HEIGHT.value === 0) {
    									$$invalidate('editingMode', editingMode = 'window');
    									hitboxes.splice(hitboxes.selected, 1);
    									$$invalidate('updateStates', updateStates.hitboxes = true, updateStates);
    								}
    							default:
    								break;
    						}
    						break;
    					case "circle":
    					case "rectangle":
    					case "round":
    						let attributes = JSON.parse(JSON.stringify(hitboxProps));
    						attributes.HG_WIDTH.value = 2 * Math.ceil(Math.abs((renderer.mouseOrigin[0] - evt.pageX)/anim.zoom));
    						attributes.HG_HEIGHT.value = 2 * Math.ceil(Math.abs((renderer.mouseOrigin[1] - evt.pageY)/anim.zoom));
    						if (attributes.HG_WIDTH.value === 0 || attributes.HG_HEIGHT.value === 0) break;

    						attributes.HG_HITBOX_X.value = Math.floor(renderer.svgPosition[0]) - calc.sprXPos - calc.frameWidth * (anim.spriteFrame);
    						attributes.HG_HITBOX_Y.value = Math.floor(renderer.svgPosition[1]) - calc.sprYPos;
    						attributes.HG_SHAPE.value = ["circle", "rectangle", "round"].indexOf(tools.selected);
    						attributes.HG_WINDOW.value = anim.windowIndex;
    						attributes.HG_WINDOW_CREATION_FRAME.value = anim.windowFrame;
    						hitboxes.push({meta: {color: '#f008', stroke: '#fFF8', strokeWidth: 0.5, el: null}, data: attributes});
    						$$invalidate('hitboxes', hitboxes.selected = hitboxes.length - 1, hitboxes);
    						$$invalidate('updateStates', updateStates.hitboxes = true, updateStates);
    						$$invalidate('editingMode', editingMode = 'hitbox');
    						break;
    				}
    			};

    	function paramsbuilder_props_binding(value) {
    		windows[anim.windowIndex].data = value;
    		$$invalidate('windows', windows);
    	}

    	const dataChanged_handler = () => {$$invalidate('updateStates', updateStates.length = true, updateStates); $$invalidate('updateStates', updateStates.movement = true, updateStates); $$invalidate('updateStates', updateStates.frames = true, updateStates);};

    	function paramsbuilder_props_binding_1(value) {
    		hitboxes[hitboxes.selected].data = value;
    		$$invalidate('hitboxes', hitboxes);
    	}

    	const dataChanged_handler_1 = () => $$invalidate('updateStates', updateStates.hitboxes = true, updateStates);

    	function paramsbuilder_props_binding_2(value) {
    		atkData = value;
    		$$invalidate('atkData', atkData);
    	}

    	const dataChanged_handler_2 = () => $$invalidate('updateStates', updateStates.movement = true, updateStates);

    	function paramsbuilder_props_binding_3(value) {
    		char = value;
    		$$invalidate('char', char);
    	}

    	const dataChanged_handler_3 = () => $$invalidate('updateStates', updateStates.movement = true, updateStates);

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {
    		if ('modalVisible' in $$props) $$invalidate('modalVisible', modalVisible = $$props.modalVisible);
    		if ('spritesheetSrc' in $$props) $$invalidate('spritesheetSrc', spritesheetSrc = $$props.spritesheetSrc);
    		if ('char' in $$props) $$invalidate('char', char = $$props.char);
    		if ('windows' in $$props) $$invalidate('windows', windows = $$props.windows);
    		if ('hitboxes' in $$props) $$invalidate('hitboxes', hitboxes = $$props.hitboxes);
    		if ('atkData' in $$props) $$invalidate('atkData', atkData = $$props.atkData);
    		if ('editingMode' in $$props) $$invalidate('editingMode', editingMode = $$props.editingMode);
    		if ('mainViewInfo' in $$props) $$invalidate('mainViewInfo', mainViewInfo = $$props.mainViewInfo);
    		if ('activeEl' in $$props) $$invalidate('activeEl', activeEl = $$props.activeEl);
    		if ('tools' in $$props) $$invalidate('tools', tools = $$props.tools);
    		if ('renderer' in $$props) $$invalidate('renderer', renderer = $$props.renderer);
    		if ('rend' in $$props) $$invalidate('rend', rend = $$props.rend);
    		if ('anim' in $$props) $$invalidate('anim', anim = $$props.anim);
    		if ('calc' in $$props) $$invalidate('calc', calc = $$props.calc);
    		if ('updateStates' in $$props) $$invalidate('updateStates', updateStates = $$props.updateStates);
    		if ('initGMLCode' in $$props) $$invalidate('initGMLCode', initGMLCode = $$props.initGMLCode);
    		if ('loadGMLCode' in $$props) $$invalidate('loadGMLCode', loadGMLCode = $$props.loadGMLCode);
    		if ('attackGMLCode' in $$props) $$invalidate('attackGMLCode', attackGMLCode = $$props.attackGMLCode);
    		if ('outputBox' in $$props) $$invalidate('outputBox', outputBox = $$props.outputBox);
    	};

    	$$self.$$.update = ($$dirty = { renderer: 1, updateStates: 1, anim: 1, windows: 1, char: 1, atkData: 1, hitboxes: 1, spritesheetSrc: 1, calc: 1, rend: 1 }) => {
    		if ($$dirty.renderer) { $$invalidate('rend', rend = (renderer) ? renderer : {}); }
    		if ($$dirty.updateStates || $$dirty.anim || $$dirty.windows) { if (updateStates.length) {
    				$$invalidate('updateStates', updateStates.length = false, updateStates);
    				let temp = anim.duration;
    				$$invalidate('anim', anim.duration = windows.reduce((acc, win, i) => {
    					// gets position of window in frames
    					if (anim.windowPositions.length !== i) $$invalidate('anim', anim.windowPositions[i] = acc, anim);
    					else anim.windowPositions.push(acc);
    		
    					// actually calculates the duration		
    					return acc + (win.data.AG_WINDOW_LENGTH.value || 1)
    				} , 0), anim);
    				if (temp !== anim.duration) $$invalidate('updateStates', updateStates.movement = true, updateStates);
    			} }
    		if ($$dirty.anim || $$dirty.updateStates || $$dirty.windows || $$dirty.char || $$dirty.atkData) { if (anim.movement && updateStates.movement) {
    				$$invalidate('updateStates', updateStates.movement = false, updateStates);
    				let prevData = {xvel: 0, yvel: 0, xpos: 0, ypos: 0};
    				for (const [windex, win] of windows.entries()) {
    					let data = win.data;
    		
    					// gets velocities and positions of the character sprite		
    					let HSpeed = data.AG_WINDOW_HSPEED.value || 0;
    					let HFriction = (data.AG_WINDOW_HAS_CUSTOM_FRICTION.value === 1) ?
    						data.AG_WINDOW_CUSTOM_GROUND_FRICTION.value : char.ground_friction.value;
    					let HFrictionAir = (data.AG_WINDOW_HAS_CUSTOM_FRICTION.value === 1) ?
    						data.AG_WINDOW_CUSTOM_AIR_FRICTION.value : char.air_friction.value;
    						HFriction *= -1;
    						HFrictionAir *= -1;
    		
    					let VSpeed = data.AG_WINDOW_VSPEED.value || 0;
    					let Gravity = (atkData.AG_USES_CUSTOM_GRAVITY.value === 1 && data.AG_WINDOW_CUSTOM_GRAVITY.value !== 0) ?
    						data.AG_WINDOW_CUSTOM_GRAVITY.value : char.gravity_speed.value;
    		
    					let duration = data.AG_WINDOW_LENGTH.value || 1;
    					let movementData = new Array(duration).fill(0).map(() => {return {xvel: 0, yvel: 0, xpos: 0, ypos: 0}});
    		
    					// calculate vertical movement
    					switch(data.AG_WINDOW_VSPEED_TYPE.value) {
    						case 0:
    							for (let i = 0; i < duration; i++) {
    								movementData[i].yvel = velocityAtFrameGrav(Gravity, VSpeed + prevData.yvel, i);
    								movementData[i].ypos = (i === 0) ? 
    									prevData.ypos + movementData[i].yvel : 
    									movementData[i-1].ypos + movementData[i].yvel;
    								if (movementData[i].ypos > 0) {
    									movementData[i].ypos = 0;
    									movementData[i].yvel = 0;
    								}
    							}
    							break;
    						case 1:
    							for (let i = 0; i < duration; i++) {
    								movementData[i].yvel = VSpeed;
    								movementData[i].ypos = (i === 0) ? 
    									prevData.ypos + movementData[i].yvel : 
    									movementData[i-1].ypos + movementData[i].yvel;
    								if (movementData[i].ypos > 0) {
    									movementData[i].ypos = 0;
    									movementData[i].yvel = 0;
    								}
    							}
    							break;
    						case 2: 
    							for (let i = 0; i < duration; i++) {
    								movementData[i].yvel = velocityAtFrameGrav(Gravity, VSpeed, i);
    								movementData[i].ypos = (i === 0) ? 
    									prevData.ypos + movementData[i].yvel : 
    									movementData[i-1].ypos + movementData[i].yvel;
    								if (movementData[i].ypos > 0) {
    									movementData[i].ypos = 0;
    									movementData[i].yvel = 0;
    								}
    							}
    							break;
    					}
    		
    					// calculate horizontal movement
    					switch(data.AG_WINDOW_HSPEED_TYPE.value) {
    						case 0:
    							for (let i = 0; i < duration; i++) {
    								let ref = (i === 0) ? prevData : movementData[i-1];
    								let fric = (ref.ypos === 0) ? HFriction : HFrictionAir;
    								movementData[i].xvel = (ref.xvel + fric <= 0) ? 0 : ref.xvel + fric;
    								if (i === 0) movementData[i].xvel += HSpeed;
    								movementData[i].xpos = ref.xpos + movementData[i].xvel;
    							}
    							break;
    						case 1:
    							for (let i = 0; i < duration; i++) {
    								let ref = (i === 0) ? prevData : movementData[i-1];
    								movementData[i].xvel = HSpeed;
    								movementData[i].xpos = ref.xpos + movementData[i].xvel;
    							}
    							break;
    						case 2: 
    							for (let i = 0; i < duration; i++) {
    								let ref = (i === 0) ? prevData : movementData[i-1];
    								let fric = (ref.ypos === 0) ? HFriction : HFrictionAir;
    								movementData[i].xvel = (ref.xvel + fric <= 0) ? 0 : ref.xvel + fric;
    								if (i === 0) movementData[i].xvel = HSpeed;
    								movementData[i].xpos = ref.xpos + movementData[i].xvel;
    							}
    							break;
    					}
    		
    					// update animation data
    					if (windex === anim.charFramePositionData.length) anim.charFramePositionData.push(movementData);
    					else $$invalidate('anim', anim.charFramePositionData[windex] = movementData, anim);
    		
    					// set previous window
    					prevData = movementData[movementData.length - 1];
    				}
    			} }
    		if ($$dirty.updateStates || $$dirty.hitboxes || $$dirty.anim) { if (updateStates.hitboxes) {
    				$$invalidate('updateStates', updateStates.hitboxes = false, updateStates);
    				$$invalidate('anim', anim.hitboxFrames = {}, anim);
    				for (const [index, hb] of hitboxes.entries()) {
    					const frame = anim.windowPositions[hb.data.HG_WINDOW.value] + hb.data.HG_WINDOW_CREATION_FRAME.value;
    					const duration = hb.data.HG_LIFETIME.value;
    					for (let i = frame; i < frame + duration; i++) {
    						if (!anim.hitboxFrames[i]) $$invalidate('anim', anim.hitboxFrames[i] = [], anim);
    						anim.hitboxFrames[i].push(index);
    					}
    				}
    			} }
    		if ($$dirty.updateStates || $$dirty.anim || $$dirty.windows || $$dirty.spritesheetSrc) { if (updateStates.frames) {
    				$$invalidate('updateStates', updateStates.frames = false, updateStates);
    				if (anim.animFrame >= anim.duration) $$invalidate('anim', anim.animFrame = anim.windowPositions[anim.windowIndex], anim);
    				let tracker = anim.animFrame;
    				for (const [i, win] of windows.entries()) {
    					tracker -= win.data.AG_WINDOW_LENGTH.value;
    					if (tracker <= 0) {
    						if (tracker === 0 && anim.duration !== 1) {
    							$$invalidate('anim', anim.windowIndex = i + 1, anim);
    							$$invalidate('anim', anim.windowFrame = 0, anim);
    							break;
    						}
    						$$invalidate('anim', anim.windowIndex = i, anim);
    						$$invalidate('anim', anim.windowFrame = win.data.AG_WINDOW_LENGTH.value - (tracker * -1), anim);
    						break;
    					}
    				}
    				let win = windows[anim.windowIndex].data;
    				$$invalidate('anim', anim.spriteFrame = (win.AG_WINDOW_ANIM_FRAME_START.value + Math.floor((anim.windowFrame / win.AG_WINDOW_LENGTH.value) * win.AG_WINDOW_ANIM_FRAMES.value)) % spritesheetSrc.framecount, anim);
    		
    				if (anim.movement) {
    					$$invalidate('anim', anim.xpos = Math.floor(anim.charFramePositionData[anim.windowIndex][anim.windowFrame].xpos), anim);
    					$$invalidate('anim', anim.ypos = Math.floor(anim.charFramePositionData[anim.windowIndex][anim.windowFrame].ypos), anim);
    				} else {
    					$$invalidate('anim', anim.xpos = 0, anim);
    					$$invalidate('anim', anim.ypos = 0, anim);
    				}
    		
    				if (anim.audio) {
    					const path = (win.AG_WINDOW_SFX.options.includes(win.AG_WINDOW_SFX.value)) ?
    					`./sounds/${win.AG_WINDOW_SFX.value}` : '';
    					if (path !== '' && win.AG_WINDOW_SFX_FRAME.value === anim.windowFrame) {
    						let thing = new Audio(path);
    						thing.play();
    					}
    				}
    			} }
    		if ($$dirty.spritesheetSrc || $$dirty.anim || $$dirty.calc || $$dirty.char || $$dirty.rend) { {
    				$$invalidate('calc', calc.frameWidth = spritesheetSrc.dimensions.width / spritesheetSrc.framecount, calc);
    				$$invalidate('calc', calc.sprXPos = anim.xpos - anim.spriteFrame * calc.frameWidth + Math.floor(char.sprite_offset_x.value) - calc.frameWidth / 2, calc);
    				$$invalidate('calc', calc.sprYPos = anim.ypos + Math.floor(char.sprite_offset_y.value), calc);
    				if (!anim.movement) {
    					$$invalidate('calc', calc.sprXPos += anim.xpos, calc);
    					$$invalidate('calc', calc.sprYPos -= anim.ypos, calc);
    				}
    				if (rend instanceof HTMLElement) {
    					$$invalidate('calc', calc.relMouseX = (calc.mouseX - rend.getBoundingClientRect().left - rend.clientWidth / 2 + anim.cameraX/2)/anim.zoom, calc);
    					$$invalidate('calc', calc.relMouseY = (calc.mouseY - rend.getBoundingClientRect().top - rend.clientHeight / 2 + anim.cameraY/2)/anim.zoom, calc);
    				}
    			} }
    	};

    	return {
    		modalVisible,
    		spritesheetSrc,
    		char,
    		windows,
    		hitboxes,
    		atkData,
    		editingMode,
    		mainViewInfo,
    		activeEl,
    		tools,
    		renderer,
    		rend,
    		anim,
    		calc,
    		updateStates,
    		save,
    		load,
    		exportWIP,
    		loadWIP,
    		initGMLCode,
    		loadGMLCode,
    		attackGMLCode,
    		outputBox,
    		gmlExport,
    		skipBack,
    		skipAhead,
    		processImage,
    		drawGridOverlay,
    		JSON,
    		Array,
    		Math,
    		keydown_handler,
    		modal_visible_binding,
    		close_handler,
    		click_handler,
    		change_handler,
    		input1_input_handler,
    		click_handler_1,
    		click_handler_2,
    		click_handler_3,
    		click_handler_4,
    		click_handler_5,
    		textarea_input_handler,
    		click_handler_6,
    		timeline_anim_binding,
    		timeline_windows_binding,
    		timeline_hitboxes_binding,
    		timeline_editingMode_binding,
    		timeline_updateStates_binding,
    		click_handler_7,
    		click_handler_8,
    		select_change_handler,
    		input0_input_handler,
    		input1_input_handler_1,
    		input2_change_handler,
    		input3_change_handler,
    		input4_change_handler,
    		click_handler_9,
    		mousemove_handler,
    		ellipse_binding,
    		rect_binding,
    		rect_binding_1,
    		ellipse_binding_1,
    		rect_binding_2,
    		div11_binding,
    		mousemove_handler_1,
    		mousedown_handler_1,
    		mouseup_handler_1,
    		paramsbuilder_props_binding,
    		dataChanged_handler,
    		paramsbuilder_props_binding_1,
    		dataChanged_handler_1,
    		paramsbuilder_props_binding_2,
    		dataChanged_handler_2,
    		paramsbuilder_props_binding_3,
    		dataChanged_handler_3
    	};
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$4, safe_not_equal, []);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "App", options, id: create_fragment$4.name });
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
