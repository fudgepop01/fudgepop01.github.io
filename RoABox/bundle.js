
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.head.appendChild(r) })(document);
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
    function null_to_empty(value) {
        return value == null ? '' : value;
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

    /* src\components\paramsBuilder.svelte generated by Svelte v3.12.1 */

    const file = "src\\components\\paramsBuilder.svelte";

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

    // (56:4) {#if (!isDisabled(key, props))}
    function create_if_block(ctx) {
    	var div0, t0_value = ctx.key + "", t0, t1, div1, show_if, t2, index = ctx.index, div1_class_value, div1_data_tooltip_value, dispose;

    	function select_block_type(changed, ctx) {
    		if ((show_if == null) || changed.props) show_if = !!(Array.isArray(ctx.val.type));
    		if (show_if) return create_if_block_1;
    		if (ctx.val.type === 'number') return create_if_block_2;
    		if (ctx.val.type === 'string') return create_if_block_3;
    		if (ctx.val.type === 'auto') return create_if_block_4;
    	}

    	var current_block_type = select_block_type(null, ctx);
    	var if_block = current_block_type && current_block_type(ctx);

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
    			if (if_block) if_block.c();
    			t2 = space();
    			attr_dev(div0, "class", "input-title svelte-189lgej");
    			add_location(div0, file, 56, 8, 1280);
    			attr_dev(div1, "class", div1_class_value = "" + null_to_empty(((ctx.index !== Object.keys(ctx.props).length - 1) ? 'tooltip-left' : 'tooltip-up-left')) + " svelte-189lgej");
    			attr_dev(div1, "data-tooltip", div1_data_tooltip_value = ctx.val.description);
    			add_location(div1, file, 57, 8, 1326);
    			dispose = listen_dev(div1, "mouseover", mouseover_handler);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, div0, anchor);
    			append_dev(div0, t0);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, div1, anchor);
    			if (if_block) if_block.m(div1, null);
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
    				if (if_block) if_block.d(1);
    				if_block = current_block_type && current_block_type(ctx);
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

    			if ((changed.props) && div1_class_value !== (div1_class_value = "" + null_to_empty(((ctx.index !== Object.keys(ctx.props).length - 1) ? 'tooltip-left' : 'tooltip-up-left')) + " svelte-189lgej")) {
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

    			if (if_block) if_block.d();
    			unassign_div1();
    			dispose();
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block.name, type: "if", source: "(56:4) {#if (!isDisabled(key, props))}", ctx });
    	return block;
    }

    // (83:38) 
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
    			attr_dev(input, "class", "svelte-189lgej");
    			add_location(input, file, 83, 12, 2689);
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
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block_4.name, type: "if", source: "(83:38) ", ctx });
    	return block;
    }

    // (81:40) 
    function create_if_block_3(ctx) {
    	var input, dispose;

    	function input_input_handler_1() {
    		ctx.input_input_handler_1.call(input, ctx);
    	}

    	const block = {
    		c: function create() {
    			input = element("input");
    			attr_dev(input, "type", "text");
    			attr_dev(input, "class", "svelte-189lgej");
    			add_location(input, file, 81, 12, 2583);
    			dispose = listen_dev(input, "input", input_input_handler_1);
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
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block_3.name, type: "if", source: "(81:40) ", ctx });
    	return block;
    }

    // (79:40) 
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
    			attr_dev(input, "class", "svelte-189lgej");
    			add_location(input, file, 79, 12, 2473);
    			dispose = listen_dev(input, "input", input_input_handler);
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

    			dispose();
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block_2.name, type: "if", source: "(79:40) ", ctx });
    	return block;
    }

    // (73:8) {#if Array.isArray(val.type)}
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
    			add_location(select, file, 73, 12, 2189);
    			dispose = listen_dev(select, "change", select_change_handler);
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

    			dispose();
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block_1.name, type: "if", source: "(73:8) {#if Array.isArray(val.type)}", ctx });
    	return block;
    }

    // (75:16) {#each val.type as choice}
    function create_each_block_1(ctx) {
    	var option, t_value = ctx.choice + "", t, option_value_value, option_selected_value;

    	const block = {
    		c: function create() {
    			option = element("option");
    			t = text(t_value);
    			option.__value = option_value_value = ctx.choice;
    			option.value = option.__value;
    			option.selected = option_selected_value = ctx.choice === ctx.val.value;
    			add_location(option, file, 75, 20, 2293);
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
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_each_block_1.name, type: "each", source: "(75:16) {#each val.type as choice}", ctx });
    	return block;
    }

    // (55:0) {#each Object.entries(props) as [key, val], index}
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
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_each_block.name, type: "each", source: "(55:0) {#each Object.entries(props) as [key, val], index}", ctx });
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

    	const writable_props = ['props', 'isDisabled'];
    	Object.keys($$props).forEach(key => {
    		if (!writable_props.includes(key) && !key.startsWith('$$')) console.warn(`<ParamsBuilder> was created with unknown prop '${key}'`);
    	});

    	function select_change_handler({ key }) {
    		props[key].value = select_value(this);
    		$$invalidate('props', props);
    	}

    	function input_input_handler({ key }) {
    		props[key].value = to_number(this.value);
    		$$invalidate('props', props);
    	}

    	function input_input_handler_1({ key }) {
    		props[key].value = this.value;
    		$$invalidate('props', props);
    	}

    	function input_input_handler_2({ key }) {
    		props[key].value = this.value;
    		$$invalidate('props', props);
    	}

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
    		select_change_handler,
    		input_input_handler,
    		input_input_handler_1,
    		input_input_handler_2,
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

    // (154:2) {#each windows as win, i}
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
    			add_location(p, file$1, 166, 4, 4619);
    			attr_dev(div, "class", "window");
    			set_style(div, "height", "100%");
    			set_style(div, "flex-grow", ctx.win.data.AG_WINDOW_LENGTH.value);
    			set_style(div, "background-color", ctx.win.meta.color);
    			set_style(div, "border-right", ((ctx.i !== ctx.windows.length - 1) ? '1px solid black' : 'none'));
    			set_style(div, "display", "grid");
    			set_style(div, "position", "relative");
    			set_style(div, "box-shadow", (ctx.anim.windowIndex == ctx.i ? 'inset 0 0 5px black' : 'none'));
    			add_location(div, file$1, 154, 3, 4163);
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
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_each_block$1.name, type: "each", source: "(154:2) {#each windows as win, i}", ctx });
    	return block;
    }

    // (187:39) 
    function create_if_block_3$1(ctx) {
    	var input, dispose;

    	const block = {
    		c: function create() {
    			input = element("input");
    			attr_dev(input, "type", "text");
    			add_location(input, file$1, 187, 5, 5282);
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
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block_3$1.name, type: "if", source: "(187:39) ", ctx });
    	return block;
    }

    // (185:4) {#if editingMode === 'window'}
    function create_if_block_2$1(ctx) {
    	var input, dispose;

    	const block = {
    		c: function create() {
    			input = element("input");
    			attr_dev(input, "type", "text");
    			add_location(input, file$1, 185, 5, 5166);
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
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block_2$1.name, type: "if", source: "(185:4) {#if editingMode === 'window'}", ctx });
    	return block;
    }

    // (195:39) 
    function create_if_block_1$1(ctx) {
    	var input, dispose;

    	const block = {
    		c: function create() {
    			input = element("input");
    			attr_dev(input, "type", "text");
    			add_location(input, file$1, 195, 5, 5591);
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
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block_1$1.name, type: "if", source: "(195:39) ", ctx });
    	return block;
    }

    // (193:4) {#if editingMode === 'window'}
    function create_if_block$1(ctx) {
    	var input, dispose;

    	const block = {
    		c: function create() {
    			input = element("input");
    			attr_dev(input, "type", "text");
    			add_location(input, file$1, 193, 5, 5474);
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
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block$1.name, type: "if", source: "(193:4) {#if editingMode === 'window'}", ctx });
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
    			add_location(input, file$1, 112, 3, 2313);
    			set_style(label0, "width", "" + (ctx.anim.duration.toString().length * 10 + 10) + "px");
    			attr_dev(label0, "id", "current-frame-label");
    			attr_dev(label0, "class", label0_class_value = "" + null_to_empty(((ctx.isCurrentFrameFocused) ? 'active' : '')) + " svelte-1v3rt8w");
    			attr_dev(label0, "for", "current-frame");
    			add_location(label0, file$1, 120, 11, 2640);
    			set_style(p, "width", "150px");
    			set_style(p, "margin", "0");
    			set_style(p, "display", "inline-block");
    			add_location(p, file$1, 119, 3, 2569);
    			attr_dev(i0, "class", "material-icons svelte-1v3rt8w");
    			add_location(i0, file$1, 133, 44, 3110);
    			add_location(button0, file$1, 133, 4, 3070);
    			attr_dev(i1, "class", "material-icons svelte-1v3rt8w");
    			add_location(i1, file$1, 134, 77, 3231);
    			button1.disabled = button1_disabled_value = ctx.windows.length <= 1;
    			attr_dev(button1, "class", "svelte-1v3rt8w");
    			add_location(button1, file$1, 134, 4, 3158);
    			set_style(div0, "width", "400px");
    			set_style(div0, "margin", "0");
    			set_style(div0, "display", "inline-block");
    			add_location(div0, file$1, 131, 3, 2949);
    			attr_dev(div1, "class", "option-group svelte-1v3rt8w");
    			set_style(div1, "justify-self", "left");
    			add_location(div1, file$1, 111, 2, 2255);
    			attr_dev(i2, "class", "material-icons svelte-1v3rt8w");
    			add_location(i2, file$1, 138, 53, 3412);
    			add_location(button2, file$1, 138, 3, 3362);
    			attr_dev(i3, "class", "material-icons svelte-1v3rt8w");
    			add_location(i3, file$1, 139, 65, 3522);
    			button3.disabled = button3_disabled_value = ctx.anim.animFrame === 0;
    			attr_dev(button3, "class", "svelte-1v3rt8w");
    			add_location(button3, file$1, 139, 3, 3460);
    			attr_dev(i4, "class", "material-icons svelte-1v3rt8w");
    			add_location(i4, file$1, 140, 35, 3611);
    			add_location(button4, file$1, 140, 3, 3579);
    			attr_dev(i5, "class", "material-icons svelte-1v3rt8w");
    			add_location(i5, file$1, 141, 82, 3773);
    			button5.disabled = button5_disabled_value = ctx.anim.animFrame === ctx.anim.duration - 1;
    			attr_dev(button5, "class", "svelte-1v3rt8w");
    			add_location(button5, file$1, 141, 3, 3694);
    			attr_dev(div2, "class", "option-group svelte-1v3rt8w");
    			set_style(div2, "justify-self", "center");
    			add_location(div2, file$1, 137, 2, 3301);
    			option0.__value = "0.25";
    			option0.value = option0.__value;
    			add_location(option0, file$1, 146, 4, 3957);
    			option1.__value = "0.5";
    			option1.value = option1.__value;
    			add_location(option1, file$1, 147, 4, 3997);
    			option2.__value = "1";
    			option2.value = option2.__value;
    			option2.selected = true;
    			add_location(option2, file$1, 148, 4, 4036);
    			if (ctx.anim.playSpeed === void 0) add_render_callback(() => ctx.select_change_handler.call(select));
    			add_location(select, file$1, 145, 3, 3915);
    			attr_dev(div3, "class", "option-group svelte-1v3rt8w");
    			set_style(div3, "justify-self", "right");
    			add_location(div3, file$1, 143, 2, 3835);
    			attr_dev(div4, "id", "timeline-controls");
    			attr_dev(div4, "class", "svelte-1v3rt8w");
    			add_location(div4, file$1, 110, 0, 2223);
    			attr_dev(div5, "id", "playhead");
    			set_style(div5, "height", "100%");
    			set_style(div5, "width", "2px");
    			set_style(div5, "background-color", "#8888");
    			set_style(div5, "box-shadow", "0 0 0 1px #000");
    			set_style(div5, "position", "absolute");
    			set_style(div5, "margin-left", "" + ((ctx.anim.duration != 0) ? ctx.anim.animFrame * 100 / ctx.anim.duration : 0) + "%");
    			add_location(div5, file$1, 169, 2, 4748);
    			attr_dev(div6, "id", "timeline");
    			attr_dev(div6, "class", "svelte-1v3rt8w");
    			add_location(div6, file$1, 152, 1, 4110);
    			set_style(label1, "display", "inline-block");
    			add_location(label1, file$1, 182, 3, 5074);
    			set_style(label2, "display", "inline-block");
    			add_location(label2, file$1, 190, 3, 5381);
    			attr_dev(div7, "class", "option-group svelte-1v3rt8w");
    			add_location(div7, file$1, 181, 2, 5043);
    			attr_dev(div8, "id", "window-metadata");
    			attr_dev(div8, "class", "svelte-1v3rt8w");
    			add_location(div8, file$1, 180, 1, 5013);

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
    	let { anim, windows, hitboxes, skipAhead, skipBack, editingMode, winProps } = $$props;

        let currentFrameLabel;
    	let isCurrentFrameFocused = false;

        const startPlaying = () => {
    		$$invalidate('anim', anim.playing = !anim.playing, anim);
    		if (anim.playing) play();
    	};
    	const play = () => {
    		if (anim.playing) {
    			setTimeout(() => { 
    				if (anim.animFrame + 1 === anim.duration) { 
    					$$invalidate('anim', anim.animFrame = 0, anim);
    					if (!anim.loop) { $$invalidate('anim', anim.playing = false, anim); }
    				}
    				else { $$invalidate('anim', anim.animFrame += 1, anim); }
    				requestAnimationFrame(play);
    			}, 1000 / 60 * (1 / anim.playSpeed));
    		}
    	};

    	const handleWindowAddition = () => {
    		windows.splice(anim.windowIndex, 0, {meta: {}, data: JSON.parse(JSON.stringify({...winProps}))} );
    		$$invalidate('anim', anim);
    	};
    	const handleWindowDeletion = () => {
    		windows.splice(anim.windowIndex, 1);
    		$$invalidate('anim', anim.animFrame = anim.windowPositions[anim.windowIndex - 1] || 0, anim);
    	};

    	const writable_props = ['anim', 'windows', 'hitboxes', 'skipAhead', 'skipBack', 'editingMode', 'winProps'];
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

    	const click_handler_1 = ({ i }) => {$$invalidate('anim', anim.animFrame = anim.windowPositions[i], anim); $$invalidate('editingMode', editingMode = "window");};

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
    	};

    	$$self.$capture_state = () => {
    		return { anim, windows, hitboxes, skipAhead, skipBack, editingMode, winProps, currentFrameLabel, isCurrentFrameFocused };
    	};

    	$$self.$inject_state = $$props => {
    		if ('anim' in $$props) $$invalidate('anim', anim = $$props.anim);
    		if ('windows' in $$props) $$invalidate('windows', windows = $$props.windows);
    		if ('hitboxes' in $$props) $$invalidate('hitboxes', hitboxes = $$props.hitboxes);
    		if ('skipAhead' in $$props) $$invalidate('skipAhead', skipAhead = $$props.skipAhead);
    		if ('skipBack' in $$props) $$invalidate('skipBack', skipBack = $$props.skipBack);
    		if ('editingMode' in $$props) $$invalidate('editingMode', editingMode = $$props.editingMode);
    		if ('winProps' in $$props) $$invalidate('winProps', winProps = $$props.winProps);
    		if ('currentFrameLabel' in $$props) $$invalidate('currentFrameLabel', currentFrameLabel = $$props.currentFrameLabel);
    		if ('isCurrentFrameFocused' in $$props) $$invalidate('isCurrentFrameFocused', isCurrentFrameFocused = $$props.isCurrentFrameFocused);
    	};

    	return {
    		anim,
    		windows,
    		hitboxes,
    		skipAhead,
    		skipBack,
    		editingMode,
    		winProps,
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
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, ["anim", "windows", "hitboxes", "skipAhead", "skipBack", "editingMode", "winProps"]);
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
    }

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
            type: 'number',
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
            type: 'number',
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

    const velocityAtFrameGrav = (baseAccel, baseVelocity, frame) => {
        return baseAccel * frame + baseVelocity;
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
        41: "A,T_NSPECIAL_AIR"
    };

    var exporter = (charData, atkData, windows, hitboxes) => {
        let out_INIT = "";
        let out_LOAD = "";
        let out_ATK = "";

        let ATK_NAME;
        if (Object.keys(ATK_INDEXES).includes(parseInt(atkData.ATK_INDEX.value))) ATK_NAME = ATK_INDEXES[parseInt(atkData.ATK_INDEX.value)];
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
            .replace('__VALUEY__', charData.sprite_offset_y.value) 
            + '\n';

        for (const [key, entry] of Object.entries(atkData)) {    
            if (entry.value === 0) continue;    
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
                    .replace("__VALUE__", entry.value)
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
                if ([null, undefined, '...', 0].includes(entry.value) && key !== "HG_WINDOW_CREATION_FRAME") continue;

                // because I made a few silly miscalculations
                if (key === "HG_HITBOX_X") entry.value -= charData.sprite_offset_x.value; 
                else if (key === "HG_HITBOX_Y") entry.value += charData.sprite_offset_y.value; 
                else if (key === "HG_WINDOW") entry.value ++;

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

    const file$2 = "src\\App.svelte";

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

    function get_each_context_2(ctx, list, i) {
    	const child_ctx = Object.create(ctx);
    	child_ctx._ = list[i];
    	child_ctx.i = i;
    	return child_ctx;
    }

    // (623:3) {#each new Array(spritesheetSrc.framecount).fill(0) as _, i}
    function create_each_block_2(ctx) {
    	var div, dispose;

    	function click_handler_7() {
    		return ctx.click_handler_7(ctx);
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
    			add_location(div, file$2, 623, 4, 16621);
    			dispose = listen_dev(div, "click", click_handler_7);
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
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_each_block_2.name, type: "each", source: "(623:3) {#each new Array(spritesheetSrc.framecount).fill(0) as _, i}", ctx });
    	return block;
    }

    // (829:4) {:else}
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
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_else_block_2.name, type: "else", source: "(829:4) {:else}", ctx });
    	return block;
    }

    // (793:4) {#if mainViewInfo}
    function create_if_block_13(ctx) {
    	var div0, t0, select, option0, option1, option2, option3, option4, option5, t7, div1, t8, input0, input0_updating = false, t9, div2, t10, input1, input1_updating = false, t11, div3, label0, t12, input2, t13, span0, t14, label1, t15, input3, t16, span1, t17, div4, t18, t19_value = ctx.anim.charFramePositionData[ctx.anim.windowIndex][ctx.anim.windowFrame].xvel + "", t19, br0, t20, t21_value = ctx.anim.charFramePositionData[ctx.anim.windowIndex][ctx.anim.windowFrame].yvel + "", t21, br1, t22, t23_value = ctx.anim.charFramePositionData[ctx.anim.windowIndex][ctx.anim.windowFrame].xpos + "", t23, br2, t24, t25_value = ctx.anim.charFramePositionData[ctx.anim.windowIndex][ctx.anim.windowFrame].ypos + "", t25, br3, dispose;

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
    			div4 = element("div");
    			t18 = text("xvel: ");
    			t19 = text(t19_value);
    			br0 = element("br");
    			t20 = text("\n\t\t\t\t\t\tyvel: ");
    			t21 = text(t21_value);
    			br1 = element("br");
    			t22 = text("\n\t\t\t\t\t\txpos: ");
    			t23 = text(t23_value);
    			br2 = element("br");
    			t24 = text("\n\t\t\t\t\t\typos: ");
    			t25 = text(t25_value);
    			br3 = element("br");
    			option0.__value = "0.25";
    			option0.value = option0.__value;
    			add_location(option0, file$2, 796, 7, 23342);
    			option1.__value = "0.5";
    			option1.value = option1.__value;
    			add_location(option1, file$2, 797, 7, 23384);
    			option2.__value = "1";
    			option2.value = option2.__value;
    			option2.selected = true;
    			add_location(option2, file$2, 798, 7, 23425);
    			option3.__value = "2";
    			option3.value = option3.__value;
    			add_location(option3, file$2, 799, 7, 23471);
    			option4.__value = "4";
    			option4.value = option4.__value;
    			add_location(option4, file$2, 800, 7, 23509);
    			option5.__value = "8";
    			option5.value = option5.__value;
    			add_location(option5, file$2, 801, 7, 23547);
    			if (ctx.anim.zoom === void 0) add_render_callback(() => ctx.select_change_handler.call(select));
    			add_location(select, file$2, 795, 6, 23303);
    			attr_dev(div0, "class", "option-param svelte-17vzh85");
    			set_style(div0, "justify-self", "right");
    			set_style(div0, "display", "block");
    			add_location(div0, file$2, 793, 5, 23213);
    			attr_dev(input0, "type", "number");
    			attr_dev(input0, "min", "1");
    			attr_dev(input0, "max", "100");
    			add_location(input0, file$2, 805, 14, 23697);
    			attr_dev(div1, "class", "option-param svelte-17vzh85");
    			set_style(div1, "justify-self", "right");
    			set_style(div1, "display", "block");
    			add_location(div1, file$2, 804, 5, 23611);
    			attr_dev(input1, "type", "number");
    			attr_dev(input1, "min", "1");
    			attr_dev(input1, "max", "100");
    			add_location(input1, file$2, 808, 14, 23883);
    			attr_dev(div2, "class", "option-param svelte-17vzh85");
    			set_style(div2, "justify-self", "right");
    			set_style(div2, "display", "block");
    			add_location(div2, file$2, 807, 5, 23797);
    			attr_dev(input2, "type", "checkbox");
    			attr_dev(input2, "class", "svelte-17vzh85");
    			add_location(input2, file$2, 813, 7, 24097);
    			attr_dev(span0, "class", "checkmark svelte-17vzh85");
    			add_location(span0, file$2, 814, 7, 24172);
    			add_location(label0, file$2, 811, 6, 24061);
    			attr_dev(input3, "type", "checkbox");
    			attr_dev(input3, "class", "svelte-17vzh85");
    			add_location(input3, file$2, 818, 7, 24261);
    			attr_dev(span1, "class", "checkmark svelte-17vzh85");
    			add_location(span1, file$2, 819, 7, 24323);
    			add_location(label1, file$2, 816, 6, 24225);
    			attr_dev(div3, "class", "option-param svelte-17vzh85");
    			set_style(div3, "justify-self", "right");
    			set_style(div3, "display", "block");
    			add_location(div3, file$2, 810, 5, 23983);
    			add_location(br0, file$2, 823, 81, 24488);
    			add_location(br1, file$2, 824, 81, 24575);
    			add_location(br2, file$2, 825, 81, 24662);
    			add_location(br3, file$2, 826, 81, 24749);
    			attr_dev(div4, "class", "stats svelte-17vzh85");
    			add_location(div4, file$2, 822, 5, 24387);

    			dispose = [
    				listen_dev(select, "change", ctx.select_change_handler),
    				listen_dev(input0, "input", input0_input_handler),
    				listen_dev(input1, "input", input1_input_handler_1),
    				listen_dev(input2, "change", ctx.input2_change_handler),
    				listen_dev(input3, "change", ctx.input3_change_handler)
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
    			insert_dev(target, t17, anchor);
    			insert_dev(target, div4, anchor);
    			append_dev(div4, t18);
    			append_dev(div4, t19);
    			append_dev(div4, br0);
    			append_dev(div4, t20);
    			append_dev(div4, t21);
    			append_dev(div4, br1);
    			append_dev(div4, t22);
    			append_dev(div4, t23);
    			append_dev(div4, br2);
    			append_dev(div4, t24);
    			append_dev(div4, t25);
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

    			if ((changed.anim) && t19_value !== (t19_value = ctx.anim.charFramePositionData[ctx.anim.windowIndex][ctx.anim.windowFrame].xvel + "")) {
    				set_data_dev(t19, t19_value);
    			}

    			if ((changed.anim) && t21_value !== (t21_value = ctx.anim.charFramePositionData[ctx.anim.windowIndex][ctx.anim.windowFrame].yvel + "")) {
    				set_data_dev(t21, t21_value);
    			}

    			if ((changed.anim) && t23_value !== (t23_value = ctx.anim.charFramePositionData[ctx.anim.windowIndex][ctx.anim.windowFrame].xpos + "")) {
    				set_data_dev(t23, t23_value);
    			}

    			if ((changed.anim) && t25_value !== (t25_value = ctx.anim.charFramePositionData[ctx.anim.windowIndex][ctx.anim.windowFrame].ypos + "")) {
    				set_data_dev(t25, t25_value);
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
    				detach_dev(t17);
    				detach_dev(div4);
    			}

    			run_all(dispose);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block_13.name, type: "if", source: "(793:4) {#if mainViewInfo}", ctx });
    	return block;
    }

    // (830:5) {#each tools as tool}
    function create_each_block_1$1(ctx) {
    	var button, i, t0_value = ctx.tool[0] + "", t0, span, t1_value = ctx.tool[1] + "", t1, t2, button_active_value, dispose;

    	function click_handler_10() {
    		return ctx.click_handler_10(ctx);
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
    			add_location(i, file$2, 834, 7, 24943);
    			attr_dev(span, "class", "svelte-17vzh85");
    			add_location(span, file$2, 834, 46, 24982);
    			attr_dev(button, "class", "tool svelte-17vzh85");
    			attr_dev(button, "active", button_active_value = ctx.tools.selected === ctx.tool[1]);
    			add_location(button, file$2, 830, 6, 24812);
    			dispose = listen_dev(button, "click", click_handler_10);
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
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_each_block_1$1.name, type: "each", source: "(830:5) {#each tools as tool}", ctx });
    	return block;
    }

    // (904:4) {:else}
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
    			add_location(image, file$2, 904, 5, 27275);

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
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_else_block_1.name, type: "else", source: "(904:4) {:else}", ctx });
    	return block;
    }

    // (895:4) {#if char.position_locked.value || tools.selected !== "pan"}
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
    			add_location(image, file$2, 895, 5, 27015);
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
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block_12.name, type: "if", source: "(895:4) {#if char.position_locked.value || tools.selected !== \"pan\"}", ctx });
    	return block;
    }

    // (924:5) {#if anim.hitboxFrames[anim.animFrame] && anim.hitboxFrames[anim.animFrame].includes(i)}
    function create_if_block_8(ctx) {
    	var line, line_x__value, line_x__value_1, line_y__value, line_y__value_1, line_stroke_width_value, line_stroke_dasharray_value, if_block1_anchor;

    	function select_block_type_2(changed, ctx) {
    		if (ctx.hitbox.data.HG_SHAPE.value === 0) return create_if_block_10;
    		if (ctx.hitbox.data.HG_SHAPE.value === 1) return create_if_block_11;
    		return create_else_block;
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
    			add_location(line, file$2, 966, 6, 30247);
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
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block_8.name, type: "if", source: "(924:5) {#if anim.hitboxFrames[anim.animFrame] && anim.hitboxFrames[anim.animFrame].includes(i)}", ctx });
    	return block;
    }

    // (951:6) {:else}
    function create_else_block(ctx) {
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
    			add_location(rect, file$2, 951, 7, 29497);
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
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_else_block.name, type: "else", source: "(951:6) {:else}", ctx });
    	return block;
    }

    // (938:49) 
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
    			add_location(rect, file$2, 938, 7, 28843);
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
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block_11.name, type: "if", source: "(938:49) ", ctx });
    	return block;
    }

    // (925:6) {#if hitbox.data.HG_SHAPE.value === 0}
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
    			add_location(ellipse, file$2, 925, 7, 28214);
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
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block_10.name, type: "if", source: "(925:6) {#if hitbox.data.HG_SHAPE.value === 0}", ctx });
    	return block;
    }

    // (985:6) {#if tools.selected === 'pan'}
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
    			add_location(circle, file$2, 985, 7, 31056);
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
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block_9.name, type: "if", source: "(985:6) {#if tools.selected === 'pan'}", ctx });
    	return block;
    }

    // (923:4) {#each hitboxes as hitbox, i}
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
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_each_block$2.name, type: "each", source: "(923:4) {#each hitboxes as hitbox, i}", ctx });
    	return block;
    }

    // (1016:72) 
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
    			add_location(ellipse, file$2, 1016, 5, 31997);
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
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block_7.name, type: "if", source: "(1016:72) ", ctx });
    	return block;
    }

    // (996:4) {#if tools.active}
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
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block_4$1.name, type: "if", source: "(996:4) {#if tools.active}", ctx });
    	return block;
    }

    // (1006:76) 
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
    			add_location(rect, file$2, 1006, 6, 31703);
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
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block_6.name, type: "if", source: "(1006:76) ", ctx });
    	return block;
    }

    // (997:5) {#if tools.selected === 'circle'}
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
    			add_location(ellipse, file$2, 997, 6, 31411);
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
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block_5.name, type: "if", source: "(997:5) {#if tools.selected === 'circle'}", ctx });
    	return block;
    }

    // (1039:38) 
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
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block_3$2.name, type: "if", source: "(1039:38) ", ctx });
    	return block;
    }

    // (1037:38) 
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
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block_2$2.name, type: "if", source: "(1037:38) ", ctx });
    	return block;
    }

    // (1035:37) 
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
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block_1$2.name, type: "if", source: "(1035:37) ", ctx });
    	return block;
    }

    // (1033:2) {#if editingMode === 'window'}
    function create_if_block$2(ctx) {
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
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block$2.name, type: "if", source: "(1033:2) {#if editingMode === 'window'}", ctx });
    	return block;
    }

    function create_fragment$2(ctx) {
    	var div13, div5, div0, label0, t1, input0, t2, p, t3_value = ctx.spritesheetSrc ? ctx.spritesheetSrc.file.name : '...' + "", t3, t4, div1, label1, t6, input1, input1_updating = false, t7, div2, button0, i0, span0, t10, button1, i1, span1, t13, div3, button2, i2, span2, t16, button3, i3, span3, t19, button4, i4, span4, t22, div4, button5, i5, span5, t25, button6, i6, span6, t28, button7, i7, span7, t31, textarea, t32, button8, i8, span8, t35, button9, i9, span9, t38, div7, div6, t39, updating_anim, updating_windows, updating_hitboxes, updating_editingMode, t40, div11, div9, button10, t41, t42, button11, t43, button11_active_value, t44, div8, t45, div10, svg, defs, filter, feGaussianBlur, clipPath, rect0, rect0_x_value, rect0_width_value, mask, circle, circle_cx_value, circle_cy_value, circle_r_value, path0, path0_d_value, path0_stroke_width_value, path1, path1_d_value, path1_stroke_width_value, path2, path2_d_value, path2_stroke_width_value, rect1, rect1_x_value, rect1_y_value, rect1_width_value, rect1_height_value, if_block1_anchor, each1_anchor, show_if, svg_viewBox_value, t46, div12, current_block_type_index, if_block3, current, dispose;

    	function input1_input_handler() {
    		input1_updating = true;
    		ctx.input1_input_handler.call(input1);
    	}

    	let each_value_2 = new ctx.Array(ctx.spritesheetSrc.framecount).fill(0);

    	let each_blocks_1 = [];

    	for (let i = 0; i < each_value_2.length; i += 1) {
    		each_blocks_1[i] = create_each_block_2(get_each_context_2(ctx, each_value_2, i));
    	}

    	function timeline_anim_binding(value) {
    		ctx.timeline_anim_binding.call(null, value);
    		updating_anim = true;
    		add_flush_callback(() => updating_anim = false);
    	}

    	function timeline_windows_binding(value_1) {
    		ctx.timeline_windows_binding.call(null, value_1);
    		updating_windows = true;
    		add_flush_callback(() => updating_windows = false);
    	}

    	function timeline_hitboxes_binding(value_2) {
    		ctx.timeline_hitboxes_binding.call(null, value_2);
    		updating_hitboxes = true;
    		add_flush_callback(() => updating_hitboxes = false);
    	}

    	function timeline_editingMode_binding(value_3) {
    		ctx.timeline_editingMode_binding.call(null, value_3);
    		updating_editingMode = true;
    		add_flush_callback(() => updating_editingMode = false);
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
    	var timeline = new Timeline({ props: timeline_props, $$inline: true });

    	binding_callbacks.push(() => bind(timeline, 'anim', timeline_anim_binding));
    	binding_callbacks.push(() => bind(timeline, 'windows', timeline_windows_binding));
    	binding_callbacks.push(() => bind(timeline, 'hitboxes', timeline_hitboxes_binding));
    	binding_callbacks.push(() => bind(timeline, 'editingMode', timeline_editingMode_binding));

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
    		create_if_block$2,
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
    			div13 = element("div");
    			div5 = element("div");
    			div0 = element("div");
    			label0 = element("label");
    			label0.textContent = "upload spritesheet:";
    			t1 = space();
    			input0 = element("input");
    			t2 = space();
    			p = element("p");
    			t3 = text(t3_value);
    			t4 = space();
    			div1 = element("div");
    			label1 = element("label");
    			label1.textContent = "number of frames in spritesheet:";
    			t6 = space();
    			input1 = element("input");
    			t7 = space();
    			div2 = element("div");
    			button0 = element("button");
    			i0 = element("i");
    			i0.textContent = "edit";
    			span0 = element("span");
    			span0.textContent = "edit attack data";
    			t10 = space();
    			button1 = element("button");
    			i1 = element("i");
    			i1.textContent = "person";
    			span1 = element("span");
    			span1.textContent = "edit character data";
    			t13 = space();
    			div3 = element("div");
    			button2 = element("button");
    			i2 = element("i");
    			i2.textContent = "save_alt";
    			span2 = element("span");
    			span2.textContent = "save to browser";
    			t16 = space();
    			button3 = element("button");
    			i3 = element("i");
    			i3.textContent = "unarchive";
    			span3 = element("span");
    			span3.textContent = "load from browser";
    			t19 = space();
    			button4 = element("button");
    			i4 = element("i");
    			i4.textContent = "import_export";
    			span4 = element("span");
    			span4.textContent = "export to GML";
    			t22 = space();
    			div4 = element("div");
    			button5 = element("button");
    			i5 = element("i");
    			i5.textContent = "attachment";
    			span5 = element("span");
    			span5.textContent = "init.gml";
    			t25 = space();
    			button6 = element("button");
    			i6 = element("i");
    			i6.textContent = "attachment";
    			span6 = element("span");
    			span6.textContent = "load.gml";
    			t28 = space();
    			button7 = element("button");
    			i7 = element("i");
    			i7.textContent = "attachment";
    			span7 = element("span");
    			span7.textContent = "[attackname].gml";
    			t31 = space();
    			textarea = element("textarea");
    			t32 = space();
    			button8 = element("button");
    			i8 = element("i");
    			i8.textContent = "attachment";
    			span8 = element("span");
    			span8.textContent = "export WIP";
    			t35 = space();
    			button9 = element("button");
    			i9 = element("i");
    			i9.textContent = "attachment";
    			span9 = element("span");
    			span9.textContent = "import WIP";
    			t38 = space();
    			div7 = element("div");
    			div6 = element("div");

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].c();
    			}

    			t39 = space();
    			timeline.$$.fragment.c();
    			t40 = space();
    			div11 = element("div");
    			div9 = element("div");
    			button10 = element("button");
    			t41 = text("info");
    			t42 = space();
    			button11 = element("button");
    			t43 = text("tools");
    			t44 = space();
    			div8 = element("div");
    			if_block0.c();
    			t45 = space();
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
    			t46 = space();
    			div12 = element("div");
    			if (if_block3) if_block3.c();
    			attr_dev(label0, "for", "spritesheet-upload");
    			add_location(label0, file$2, 558, 3, 14047);
    			attr_dev(input0, "id", "spritesheet-upload");
    			attr_dev(input0, "type", "file");
    			attr_dev(input0, "class", "svelte-17vzh85");
    			add_location(input0, file$2, 559, 3, 14110);
    			attr_dev(p, "class", "filename svelte-17vzh85");
    			add_location(p, file$2, 560, 3, 14263);
    			attr_dev(div0, "class", "inputGroup svelte-17vzh85");
    			add_location(div0, file$2, 557, 2, 14019);
    			attr_dev(label1, "for", "framecount");
    			add_location(label1, file$2, 563, 3, 14378);
    			attr_dev(input1, "id", "framecount");
    			attr_dev(input1, "type", "number");
    			attr_dev(input1, "min", "1");
    			attr_dev(input1, "max", "99");
    			add_location(input1, file$2, 564, 3, 14446);
    			attr_dev(div1, "class", "inputGroup svelte-17vzh85");
    			add_location(div1, file$2, 562, 2, 14350);
    			attr_dev(i0, "class", "material-icons svelte-17vzh85");
    			add_location(i0, file$2, 567, 52, 14628);
    			attr_dev(span0, "class", "svelte-17vzh85");
    			add_location(span0, file$2, 567, 86, 14662);
    			attr_dev(button0, "class", "svelte-17vzh85");
    			add_location(button0, file$2, 567, 3, 14579);
    			attr_dev(i1, "class", "material-icons svelte-17vzh85");
    			add_location(i1, file$2, 568, 52, 14753);
    			attr_dev(span1, "class", "svelte-17vzh85");
    			add_location(span1, file$2, 568, 88, 14789);
    			attr_dev(button1, "class", "svelte-17vzh85");
    			add_location(button1, file$2, 568, 3, 14704);
    			attr_dev(div2, "class", "inputGroup svelte-17vzh85");
    			add_location(div2, file$2, 566, 2, 14551);
    			attr_dev(i2, "class", "material-icons svelte-17vzh85");
    			add_location(i2, file$2, 571, 27, 14895);
    			attr_dev(span2, "class", "svelte-17vzh85");
    			add_location(span2, file$2, 571, 65, 14933);
    			attr_dev(button2, "class", "svelte-17vzh85");
    			add_location(button2, file$2, 571, 3, 14871);
    			attr_dev(i3, "class", "material-icons svelte-17vzh85");
    			add_location(i3, file$2, 572, 27, 14998);
    			attr_dev(span3, "class", "svelte-17vzh85");
    			add_location(span3, file$2, 572, 66, 15037);
    			attr_dev(button3, "class", "svelte-17vzh85");
    			add_location(button3, file$2, 572, 3, 14974);
    			attr_dev(i4, "class", "material-icons svelte-17vzh85");
    			add_location(i4, file$2, 573, 32, 15109);
    			attr_dev(span4, "class", "svelte-17vzh85");
    			add_location(span4, file$2, 573, 75, 15152);
    			attr_dev(button4, "class", "svelte-17vzh85");
    			add_location(button4, file$2, 573, 3, 15080);
    			attr_dev(div3, "class", "inputGroup svelte-17vzh85");
    			add_location(div3, file$2, 570, 2, 14843);
    			attr_dev(i5, "class", "material-icons svelte-17vzh85");
    			add_location(i5, file$2, 576, 52, 15276);
    			attr_dev(span5, "class", "svelte-17vzh85");
    			add_location(span5, file$2, 576, 92, 15316);
    			attr_dev(button5, "class", "svelte-17vzh85");
    			add_location(button5, file$2, 576, 3, 15227);
    			attr_dev(i6, "class", "material-icons svelte-17vzh85");
    			add_location(i6, file$2, 577, 52, 15399);
    			attr_dev(span6, "class", "svelte-17vzh85");
    			add_location(span6, file$2, 577, 92, 15439);
    			attr_dev(button6, "class", "svelte-17vzh85");
    			add_location(button6, file$2, 577, 3, 15350);
    			attr_dev(i7, "class", "material-icons svelte-17vzh85");
    			add_location(i7, file$2, 578, 54, 15524);
    			attr_dev(span7, "class", "svelte-17vzh85");
    			add_location(span7, file$2, 578, 94, 15564);
    			attr_dev(button7, "class", "svelte-17vzh85");
    			add_location(button7, file$2, 578, 3, 15473);
    			set_style(textarea, "height", "300px");
    			set_style(textarea, "width", "100%");
    			set_style(textarea, "color", "#DDD");
    			set_style(textarea, "font-size", "10px");
    			set_style(textarea, "font-family", "monospace");
    			set_style(textarea, "background-color", "black");
    			add_location(textarea, file$2, 579, 3, 15606);
    			attr_dev(i8, "class", "material-icons svelte-17vzh85");
    			add_location(i8, file$2, 600, 4, 15991);
    			attr_dev(span8, "class", "svelte-17vzh85");
    			add_location(span8, file$2, 600, 44, 16031);
    			attr_dev(button8, "class", "svelte-17vzh85");
    			add_location(button8, file$2, 590, 3, 15819);
    			attr_dev(i9, "class", "material-icons svelte-17vzh85");
    			add_location(i9, file$2, 611, 4, 16293);
    			attr_dev(span9, "class", "svelte-17vzh85");
    			add_location(span9, file$2, 611, 44, 16333);
    			attr_dev(button9, "class", "svelte-17vzh85");
    			add_location(button9, file$2, 602, 3, 16071);
    			attr_dev(div4, "class", "inputGroup svelte-17vzh85");
    			add_location(div4, file$2, 575, 2, 15199);
    			attr_dev(div5, "id", "file");
    			attr_dev(div5, "class", "svelte-17vzh85");
    			add_location(div5, file$2, 556, 1, 14001);
    			attr_dev(div6, "class", "frameContainer");
    			set_style(div6, "width", "" + ctx.spritesheetSrc.dimensions.width + "px");
    			set_style(div6, "height", "100%");
    			set_style(div6, "background-color", "black");
    			add_location(div6, file$2, 616, 2, 16413);
    			attr_dev(div7, "id", "frames");
    			attr_dev(div7, "class", "svelte-17vzh85");
    			add_location(div7, file$2, 615, 1, 16393);
    			attr_dev(button10, "class", "tab svelte-17vzh85");
    			attr_dev(button10, "active", ctx.mainViewInfo);
    			add_location(button10, file$2, 789, 3, 22961);
    			attr_dev(button11, "class", "tab svelte-17vzh85");
    			attr_dev(button11, "active", button11_active_value = !ctx.mainViewInfo);
    			add_location(button11, file$2, 790, 3, 23057);
    			attr_dev(div8, "class", "tool-container svelte-17vzh85");
    			add_location(div8, file$2, 791, 3, 23156);
    			attr_dev(div9, "class", "option-container svelte-17vzh85");
    			set_style(div9, "z-index", "500");
    			set_style(div9, "height", "auto");
    			set_style(div9, "pointer-events", "none");
    			add_location(div9, file$2, 788, 2, 22869);
    			attr_dev(feGaussianBlur, "in", "SourceGraphic");
    			attr_dev(feGaussianBlur, "stdDeviation", "5");
    			add_location(feGaussianBlur, file$2, 854, 6, 25535);
    			attr_dev(filter, "id", "blur");
    			attr_dev(filter, "x", "0");
    			attr_dev(filter, "y", "0");
    			add_location(filter, file$2, 853, 5, 25498);
    			attr_dev(rect0, "x", rect0_x_value = (ctx.anim.spriteFrame % ctx.spritesheetSrc.framecount) / ctx.spritesheetSrc.framecount);
    			attr_dev(rect0, "y", "0");
    			attr_dev(rect0, "width", rect0_width_value = 1 / ctx.spritesheetSrc.framecount);
    			attr_dev(rect0, "height", "1");
    			add_location(rect0, file$2, 857, 6, 25677);
    			attr_dev(clipPath, "id", "spriteClip");
    			attr_dev(clipPath, "clipPathUnits", "objectBoundingBox");
    			add_location(clipPath, file$2, 856, 5, 25610);
    			attr_dev(circle, "cx", circle_cx_value = ctx.calc.relMouseX);
    			attr_dev(circle, "cy", circle_cy_value = ctx.calc.relMouseY);
    			attr_dev(circle, "r", circle_r_value = ctx.anim.gridViewerRadius / ctx.anim.zoom);
    			attr_dev(circle, "fill", "white");
    			attr_dev(circle, "filter", "url(#blur)");
    			add_location(circle, file$2, 860, 6, 25874);
    			attr_dev(mask, "id", "mouseMask");
    			add_location(mask, file$2, 859, 5, 25846);
    			add_location(defs, file$2, 852, 4, 25486);
    			attr_dev(path0, "d", path0_d_value = "\n\t\t\t\t\tM " + -4 * ctx.rend.clientWidth / 2 + " 0\n\t\t\t\t\th " + ctx.rend.clientWidth * 4 + "\n\t\t\t\t");
    			attr_dev(path0, "stroke-width", path0_stroke_width_value = 2 / ctx.anim.zoom);
    			attr_dev(path0, "stroke", "#000F");
    			attr_dev(path0, "shape-rendering", "crispEdges");
    			add_location(path0, file$2, 863, 4, 26032);
    			attr_dev(path1, "d", path1_d_value = "\n\t\t\t\t\tM 0 " + -4 * ctx.rend.clientHeight / 2 + "\n\t\t\t\t\tv " + ctx.rend.clientHeight * 4 + "\n\t\t\t\t");
    			attr_dev(path1, "stroke-width", path1_stroke_width_value = 2 / ctx.anim.zoom);
    			attr_dev(path1, "stroke", "#000F");
    			attr_dev(path1, "shape-rendering", "crispEdges");
    			add_location(path1, file$2, 871, 4, 26217);
    			attr_dev(path2, "d", path2_d_value = (ctx.anim.grid) ? ctx.drawGridOverlay(ctx.anim.zoomGrids[ctx.anim.zoom][0], ctx.anim.zoomGrids[ctx.anim.zoom][1], ctx.anim.gridViewerRadius / ctx.anim.zoom, ctx.calc.relMouseX, ctx.calc.relMouseY) : '');
    			attr_dev(path2, "stroke-width", path2_stroke_width_value = 1 / ctx.anim.zoom);
    			attr_dev(path2, "stroke", "#0008");
    			attr_dev(path2, "shape-rendering", "crispEdges");
    			attr_dev(path2, "mask", "url(#mouseMask)");
    			add_location(path2, file$2, 879, 4, 26404);
    			attr_dev(rect1, "x", rect1_x_value = ctx.calc.sprXPos + ctx.calc.frameWidth * (ctx.anim.spriteFrame));
    			attr_dev(rect1, "y", rect1_y_value = ctx.calc.sprYPos);
    			attr_dev(rect1, "width", rect1_width_value = ctx.calc.frameWidth);
    			attr_dev(rect1, "height", rect1_height_value = ctx.spritesheetSrc.dimensions.height);
    			attr_dev(rect1, "stroke", "black");
    			attr_dev(rect1, "stroke-width", "2");
    			attr_dev(rect1, "fill", "none");
    			add_location(rect1, file$2, 885, 4, 26705);
    			attr_dev(svg, "version", "2.0");
    			set_style(svg, "width", "100%");
    			set_style(svg, "height", "100%");
    			attr_dev(svg, "viewBox", svg_viewBox_value = "\n\t\t\t\t\t" + (ctx.anim.cameraX - ctx.rend.clientWidth) / 2 / ctx.anim.zoom + " \n\t\t\t\t\t" + (ctx.anim.cameraY - ctx.rend.clientHeight) / 2 / ctx.anim.zoom + " \n\t\t\t\t\t" + ctx.rend.clientWidth / ctx.anim.zoom + " \n\t\t\t\t\t" + ctx.rend.clientHeight / ctx.anim.zoom);
    			add_location(svg, file$2, 843, 3, 25206);
    			attr_dev(div10, "class", "grid");
    			set_style(div10, "width", "100%");
    			set_style(div10, "height", "100%");
    			set_style(div10, "position", "absolute");
    			set_style(div10, "top", "0");
    			set_style(div10, "left", "0");
    			set_style(div10, "display", "grid");
    			set_style(div10, "image-rendering", "pixelated");
    			add_location(div10, file$2, 842, 2, 25070);
    			attr_dev(div11, "id", "main");
    			attr_dev(div11, "tabindex", "0");
    			attr_dev(div11, "class", "svelte-17vzh85");
    			add_location(div11, file$2, 648, 1, 17389);
    			attr_dev(div12, "id", "settings");
    			attr_dev(div12, "class", "svelte-17vzh85");
    			add_location(div12, file$2, 1031, 1, 32263);
    			attr_dev(div13, "id", "app");
    			attr_dev(div13, "class", "svelte-17vzh85");
    			add_location(div13, file$2, 555, 0, 13985);

    			dispose = [
    				listen_dev(input0, "change", ctx.change_handler),
    				listen_dev(input1, "input", input1_input_handler),
    				listen_dev(button0, "click", ctx.click_handler),
    				listen_dev(button1, "click", ctx.click_handler_1),
    				listen_dev(button2, "click", ctx.save),
    				listen_dev(button3, "click", ctx.load),
    				listen_dev(button4, "click", ctx.gmlExport),
    				listen_dev(button5, "click", ctx.click_handler_2),
    				listen_dev(button6, "click", ctx.click_handler_3),
    				listen_dev(button7, "click", ctx.click_handler_4),
    				listen_dev(textarea, "input", ctx.textarea_input_handler),
    				listen_dev(button8, "click", ctx.click_handler_5),
    				listen_dev(button9, "click", ctx.click_handler_6),
    				listen_dev(button10, "click", ctx.click_handler_8),
    				listen_dev(button11, "click", ctx.click_handler_9),
    				listen_dev(div11, "keydown", ctx.keydown_handler),
    				listen_dev(div11, "mousemove", ctx.mousemove_handler_1),
    				listen_dev(div11, "mousedown", ctx.mousedown_handler_1),
    				listen_dev(div11, "mouseup", ctx.mouseup_handler_1)
    			];
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, div13, anchor);
    			append_dev(div13, div5);
    			append_dev(div5, div0);
    			append_dev(div0, label0);
    			append_dev(div0, t1);
    			append_dev(div0, input0);
    			append_dev(div0, t2);
    			append_dev(div0, p);
    			append_dev(p, t3);
    			append_dev(div5, t4);
    			append_dev(div5, div1);
    			append_dev(div1, label1);
    			append_dev(div1, t6);
    			append_dev(div1, input1);

    			set_input_value(input1, ctx.spritesheetSrc.framecount);

    			append_dev(div5, t7);
    			append_dev(div5, div2);
    			append_dev(div2, button0);
    			append_dev(button0, i0);
    			append_dev(button0, span0);
    			append_dev(div2, t10);
    			append_dev(div2, button1);
    			append_dev(button1, i1);
    			append_dev(button1, span1);
    			append_dev(div5, t13);
    			append_dev(div5, div3);
    			append_dev(div3, button2);
    			append_dev(button2, i2);
    			append_dev(button2, span2);
    			append_dev(div3, t16);
    			append_dev(div3, button3);
    			append_dev(button3, i3);
    			append_dev(button3, span3);
    			append_dev(div3, t19);
    			append_dev(div3, button4);
    			append_dev(button4, i4);
    			append_dev(button4, span4);
    			append_dev(div5, t22);
    			append_dev(div5, div4);
    			append_dev(div4, button5);
    			append_dev(button5, i5);
    			append_dev(button5, span5);
    			append_dev(div4, t25);
    			append_dev(div4, button6);
    			append_dev(button6, i6);
    			append_dev(button6, span6);
    			append_dev(div4, t28);
    			append_dev(div4, button7);
    			append_dev(button7, i7);
    			append_dev(button7, span7);
    			append_dev(div4, t31);
    			append_dev(div4, textarea);

    			set_input_value(textarea, ctx.outputBox);

    			append_dev(div4, t32);
    			append_dev(div4, button8);
    			append_dev(button8, i8);
    			append_dev(button8, span8);
    			append_dev(div4, t35);
    			append_dev(div4, button9);
    			append_dev(button9, i9);
    			append_dev(button9, span9);
    			append_dev(div13, t38);
    			append_dev(div13, div7);
    			append_dev(div7, div6);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].m(div6, null);
    			}

    			append_dev(div13, t39);
    			mount_component(timeline, div13, null);
    			append_dev(div13, t40);
    			append_dev(div13, div11);
    			append_dev(div11, div9);
    			append_dev(div9, button10);
    			append_dev(button10, t41);
    			append_dev(div9, t42);
    			append_dev(div9, button11);
    			append_dev(button11, t43);
    			append_dev(div9, t44);
    			append_dev(div9, div8);
    			if_block0.m(div8, null);
    			append_dev(div11, t45);
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
    			append_dev(div13, t46);
    			append_dev(div13, div12);
    			if (~current_block_type_index) if_blocks[current_block_type_index].m(div12, null);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if ((!current || changed.spritesheetSrc) && t3_value !== (t3_value = ctx.spritesheetSrc ? ctx.spritesheetSrc.file.name : '...' + "")) {
    				set_data_dev(t3, t3_value);
    			}

    			if (!input1_updating && changed.spritesheetSrc) set_input_value(input1, ctx.spritesheetSrc.framecount);
    			input1_updating = false;
    			if (changed.outputBox) set_input_value(textarea, ctx.outputBox);

    			if (changed.spritesheetSrc || changed.calc || changed.anim || changed.Array) {
    				each_value_2 = new ctx.Array(ctx.spritesheetSrc.framecount).fill(0);

    				let i;
    				for (i = 0; i < each_value_2.length; i += 1) {
    					const child_ctx = get_each_context_2(ctx, each_value_2, i);

    					if (each_blocks_1[i]) {
    						each_blocks_1[i].p(changed, child_ctx);
    					} else {
    						each_blocks_1[i] = create_each_block_2(child_ctx);
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
    			timeline.$set(timeline_changes);

    			if (!current || changed.mainViewInfo) {
    				attr_dev(button10, "active", ctx.mainViewInfo);
    			}

    			if ((!current || changed.mainViewInfo) && button11_active_value !== (button11_active_value = !ctx.mainViewInfo)) {
    				attr_dev(button11, "active", button11_active_value);
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
    			transition_in(timeline.$$.fragment, local);

    			transition_in(if_block3);
    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(timeline.$$.fragment, local);
    			transition_out(if_block3);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
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
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$2.name, type: "component", source: "", ctx });
    	return block;
    }

    const mousedown_handler = (evt) => evt.target.dragging = true;

    const mouseout_handler = (evt) => evt.target.dragging = false;

    const mouseup_handler = (evt) => evt.target.dragging = false;

    function instance$2($$self, $$props, $$invalidate) {
    	window.onbeforeunload = (e) => {
    		return 'derp';
    	};

    	let spritesheetSrc = {
    		file: '...',
    		dataUrl: '',
    		dimensions: {
    			width: 0,
    			height: 0
    		},
    		framecount: 1
    	};
    	let hurtboxSrc = {
    		file: '...',
    		buffer: null
    	};
    	let codeFile;


    	let char = {
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

    		// calculated
    		duration: 0,
    		spriteFrame: 0,
    		windowIndex: 0, // also known as "windex" :^)
    		windowFrame: 0,
    		windowPositions: [],

    		hitboxFrames: {},
    		
    		xpos: 0,
    		ypos: 0,
    		charFramePositionData: []
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

    	const save = () => {
    		store2({
    			anim,
    			windows,
    			hitboxes,
    			spritesheetSrc,
    			char,
    			atkData,
    		});
    	};
    	const load = () => {
    		let data = store2();
    		
    		$$invalidate('anim', anim = data.anim);
    		$$invalidate('windows', windows = data.windows);
    		$$invalidate('spritesheetSrc', spritesheetSrc = data.spritesheetSrc);
    		$$invalidate('char', char = data.char);
    		$$invalidate('hitboxes', hitboxes = data.hitboxes);
    		$$invalidate('atkData', atkData = data.atkData);
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

    	const change_handler = async (evt) => {$$invalidate('spritesheetSrc', spritesheetSrc.file = evt.target.files[0], spritesheetSrc); processImage(evt.target.files[0]);};

    	function input1_input_handler() {
    		spritesheetSrc.framecount = to_number(this.value);
    		$$invalidate('spritesheetSrc', spritesheetSrc);
    	}

    	const click_handler = () => $$invalidate('editingMode', editingMode = 'atkData');

    	const click_handler_1 = () => $$invalidate('editingMode', editingMode = 'chrData');

    	const click_handler_2 = () => $$invalidate('outputBox', outputBox = initGMLCode);

    	const click_handler_3 = () => $$invalidate('outputBox', outputBox = loadGMLCode);

    	const click_handler_4 = () => $$invalidate('outputBox', outputBox = attackGMLCode);

    	function textarea_input_handler() {
    		outputBox = this.value;
    		$$invalidate('outputBox', outputBox);
    	}

    	const click_handler_5 = () => {
    					$$invalidate('outputBox', outputBox = JSON.stringify({
    						anim,
    						windows,
    						hitboxes,
    						spritesheetSrc,
    						char,
    						atkData,
    					}, null, 2));
    				};

    	const click_handler_6 = () => {
    					let d = JSON.parse(outputBox);
    					$$invalidate('anim', anim = d.anim);
    					$$invalidate('windows', windows = d.windows);
    					$$invalidate('hitboxes', hitboxes = d.hitboxes);
    					$$invalidate('spritesheetSrc', spritesheetSrc = d.spritesheetSrc);
    					$$invalidate('char', char = d.char);
    					$$invalidate('atkData', atkData = d.atkData);
    				};

    	const click_handler_7 = ({ i }) => {$$invalidate('windows', windows[anim.windowIndex].data.AG_WINDOW_ANIM_FRAME_START.value = i, windows);};

    	function timeline_anim_binding(value) {
    		anim = value;
    		$$invalidate('anim', anim), $$invalidate('windows', windows), $$invalidate('char', char), $$invalidate('atkData', atkData), $$invalidate('hitboxes', hitboxes), $$invalidate('spritesheetSrc', spritesheetSrc);
    	}

    	function timeline_windows_binding(value_1) {
    		windows = value_1;
    		$$invalidate('windows', windows);
    	}

    	function timeline_hitboxes_binding(value_2) {
    		hitboxes = value_2;
    		$$invalidate('hitboxes', hitboxes);
    	}

    	function timeline_editingMode_binding(value_3) {
    		editingMode = value_3;
    		$$invalidate('editingMode', editingMode);
    	}

    	const click_handler_8 = () => $$invalidate('mainViewInfo', mainViewInfo = true);

    	const click_handler_9 = () => $$invalidate('mainViewInfo', mainViewInfo = false);

    	function select_change_handler() {
    		anim.zoom = select_value(this);
    		$$invalidate('anim', anim), $$invalidate('windows', windows), $$invalidate('char', char), $$invalidate('atkData', atkData), $$invalidate('hitboxes', hitboxes), $$invalidate('spritesheetSrc', spritesheetSrc);
    	}

    	function input0_input_handler() {
    		anim.zoomGrids[anim.zoom][0] = to_number(this.value);
    		$$invalidate('anim', anim), $$invalidate('windows', windows), $$invalidate('char', char), $$invalidate('atkData', atkData), $$invalidate('hitboxes', hitboxes), $$invalidate('spritesheetSrc', spritesheetSrc);
    	}

    	function input1_input_handler_1() {
    		anim.zoomGrids[anim.zoom][1] = to_number(this.value);
    		$$invalidate('anim', anim), $$invalidate('windows', windows), $$invalidate('char', char), $$invalidate('atkData', atkData), $$invalidate('hitboxes', hitboxes), $$invalidate('spritesheetSrc', spritesheetSrc);
    	}

    	function input2_change_handler() {
    		char.position_locked.value = this.checked;
    		$$invalidate('char', char);
    	}

    	function input3_change_handler() {
    		anim.movement = this.checked;
    		$$invalidate('anim', anim), $$invalidate('windows', windows), $$invalidate('char', char), $$invalidate('atkData', atkData), $$invalidate('hitboxes', hitboxes), $$invalidate('spritesheetSrc', spritesheetSrc);
    	}

    	const click_handler_10 = ({ tool }) => $$invalidate('tools', tools.selected = tool[1], tools);

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

    	const keydown_handler = (evt) => {
    				switch(evt.key) {
    					case '[':
    						skipBack();
    						break;
    					case ',':
    						if (anim.animFrame > 0) $$invalidate('anim', anim.animFrame --, anim);
    						break;
    					case ']':
    						skipAhead();
    						break;
    					case '.':
    						if (anim.animFrame < anim.duration - 1) $$invalidate('anim', anim.animFrame ++, anim);
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

    	const mousemove_handler_1 = (evt) => {
    				if (renderer.dragging) {
    					switch(tools.selected) {
    						case "pan": 
    							switch(renderer.target) {
    								case 'hitbox':
    									$$invalidate('hitboxes', hitboxes[hitboxes.selected].data.HG_HITBOX_X.value += evt.movementX/anim.zoom, hitboxes);
    									$$invalidate('hitboxes', hitboxes[hitboxes.selected].data.HG_HITBOX_Y.value += evt.movementY/anim.zoom, hitboxes);
    									break;
    								case 'angle-indicator':
    									$$invalidate('hitboxes', hitboxes[hitboxes.selected].data.HG_ANGLE.value = 180 - Math.atan2(renderer.mouseOrigin[1] - evt.pageY, renderer.mouseOrigin[0] - evt.pageX) * 180/Math.PI, hitboxes);
    									break;
    								case 'resizer':
    									$$invalidate('hitboxes', hitboxes[hitboxes.selected].data.HG_WIDTH.value = Math.ceil(Math.abs((renderer.mouseOrigin[0] - evt.pageX)/anim.zoom)), hitboxes);
    									$$invalidate('hitboxes', hitboxes[hitboxes.selected].data.HG_HEIGHT.value = Math.ceil(Math.abs((renderer.mouseOrigin[1] - evt.pageY)/anim.zoom)), hitboxes);
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
    						$$invalidate('hitboxes', hitboxes.forceUpdate = true, hitboxes);
    					} else {
    						$$invalidate('editingMode', editingMode = 'hitbox');
    						$$invalidate('hitboxes', hitboxes.selected = parseInt(evt.target.getAttributeNS(null, 'data-index')), hitboxes);
    						const hb = hitboxes[hitboxes.selected];
    						const br = hb.meta.el.getBoundingClientRect();
    						$$invalidate('renderer', renderer.mouseOrigin = [br.left + (br.right - br.left)/2, br.top + (br.bottom - br.top)/2], renderer);
    					}

    				} else {
    					if (renderer.target === "resizer") {
    						$$invalidate('hitboxes', hitboxes.selected = parseInt(evt.target.getAttributeNS(null, 'data-index')), hitboxes);
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
    								break;
    							case 'angle-indicator':
    								hb.data.HG_ANGLE.value = Math.round(hb.data.HG_ANGLE.value);
    								break;
    							case 'resizer':
    								if (hb.data.HG_WIDTH.value === 0 || hb.data.HG_HEIGHT.value === 0) {
    									$$invalidate('editingMode', editingMode = 'window');
    									hitboxes.splice(hitboxes.selected, 1);
    									$$invalidate('hitboxes', hitboxes.forceUpdate = true, hitboxes);
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
    						$$invalidate('editingMode', editingMode = 'hitbox');
    						break;
    				}
    			};

    	function paramsbuilder_props_binding(value) {
    		windows[anim.windowIndex].data = value;
    		$$invalidate('windows', windows);
    	}

    	function paramsbuilder_props_binding_1(value) {
    		hitboxes[hitboxes.selected].data = value;
    		$$invalidate('hitboxes', hitboxes);
    	}

    	function paramsbuilder_props_binding_2(value) {
    		atkData = value;
    		$$invalidate('atkData', atkData);
    	}

    	function paramsbuilder_props_binding_3(value) {
    		char = value;
    		$$invalidate('char', char);
    	}

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {
    		if ('spritesheetSrc' in $$props) $$invalidate('spritesheetSrc', spritesheetSrc = $$props.spritesheetSrc);
    		if ('hurtboxSrc' in $$props) hurtboxSrc = $$props.hurtboxSrc;
    		if ('codeFile' in $$props) codeFile = $$props.codeFile;
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
    		if ('initGMLCode' in $$props) $$invalidate('initGMLCode', initGMLCode = $$props.initGMLCode);
    		if ('loadGMLCode' in $$props) $$invalidate('loadGMLCode', loadGMLCode = $$props.loadGMLCode);
    		if ('attackGMLCode' in $$props) $$invalidate('attackGMLCode', attackGMLCode = $$props.attackGMLCode);
    		if ('outputBox' in $$props) $$invalidate('outputBox', outputBox = $$props.outputBox);
    	};

    	$$self.$$.update = ($$dirty = { renderer: 1, windows: 1, anim: 1, char: 1, atkData: 1, hitboxes: 1, spritesheetSrc: 1, calc: 1, rend: 1 }) => {
    		if ($$dirty.renderer) { $$invalidate('rend', rend = (renderer) ? renderer : {}); }
    		if ($$dirty.windows || $$dirty.anim) { $$invalidate('anim', anim.duration = windows.reduce((acc, win, i) => {
    				// gets position of window in frames
    				if (anim.windowPositions.length !== i) $$invalidate('anim', anim.windowPositions[i] = acc, anim);
    				else anim.windowPositions.push(acc);
    		
    				// actually calculates the duration		
    				return acc + (win.data.AG_WINDOW_LENGTH.value || 1)
    			} , 0), anim); }
    		if ($$dirty.anim || $$dirty.windows || $$dirty.char || $$dirty.atkData) { if (anim.movement) {
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
    		if ($$dirty.hitboxes || $$dirty.anim) { {
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
    		if ($$dirty.anim || $$dirty.windows || $$dirty.spritesheetSrc) { {
    				if (anim.animFrame >= anim.duration) $$invalidate('anim', anim.animFrame = anim.windowPositions[anim.windowIndex], anim);
    				let tracker = anim.animFrame;
    				for (const [i, win] of windows.entries()) {
    					tracker -= win.data.AG_WINDOW_LENGTH.value;
    					if (tracker <= 0) {
    						if (tracker === 0) {
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
    		save,
    		load,
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
    		change_handler,
    		input1_input_handler,
    		click_handler,
    		click_handler_1,
    		click_handler_2,
    		click_handler_3,
    		click_handler_4,
    		textarea_input_handler,
    		click_handler_5,
    		click_handler_6,
    		click_handler_7,
    		timeline_anim_binding,
    		timeline_windows_binding,
    		timeline_hitboxes_binding,
    		timeline_editingMode_binding,
    		click_handler_8,
    		click_handler_9,
    		select_change_handler,
    		input0_input_handler,
    		input1_input_handler_1,
    		input2_change_handler,
    		input3_change_handler,
    		click_handler_10,
    		mousemove_handler,
    		ellipse_binding,
    		rect_binding,
    		rect_binding_1,
    		ellipse_binding_1,
    		rect_binding_2,
    		div11_binding,
    		keydown_handler,
    		mousemove_handler_1,
    		mousedown_handler_1,
    		mouseup_handler_1,
    		paramsbuilder_props_binding,
    		paramsbuilder_props_binding_1,
    		paramsbuilder_props_binding_2,
    		paramsbuilder_props_binding_3
    	};
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, []);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "App", options, id: create_fragment$2.name });
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
