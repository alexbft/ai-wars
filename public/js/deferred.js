// This file was generated by modules-webmake (modules for web) project
// see: https://github.com/medikoo/modules-webmake

(function (modules) {
	var getModule, getRequire, require;
	getModule = (function (wrap) {
		return function (scope, tree, path, fullpath) {
			var name, dir, exports = {}, module = { exports: exports }, fn, isDir;
			path = path.split(/[\\/]/);
			name = path.pop();
			if (!name) {
				isDir = true;
				name = path.pop();
			}
			if ((name === '.') || (name === '..')) {
				path.push(name);
				name = '';
			}
			while ((dir = path.shift())) {
				if (dir === '..') {
					scope = tree.pop();
				} else if (dir !== '.') {
					tree.push(scope);
					scope = scope[dir];
				}
			}
			if (name) {
				if (!isDir && scope[name + '.js']) {
					name += '.js';
				}
				if (typeof scope[name] === 'object') {
					tree.push(scope);
					scope = scope[name];
					name = 'index.js';
				}
			} else {
				name = 'index.js';
			}
			fn = scope[name];
			if (!fn) {
				throw new Error("Could not find module '" + fullpath + "'");
			}
			scope[name] = wrap(module);
			fn.call(exports, exports, module, getRequire(scope, tree));
			return module.exports;
		};
	}(function (cmodule) {
		return function (ignore, module) {
			module.exports = cmodule.exports;
		};
	}));
	require = function (scope, tree, fullpath) {
		var name, path = fullpath, t = fullpath.charAt(0);
		if (t === '/') {
			path = path.slice(1);
			scope = modules['/'];
			tree = [];
		} else if (t !== '.') {
			name = path.split('/', 1)[0];
			scope = modules[name];
			tree = [];
			path = path.slice(name.length + 1) || scope[':mainpath:'];
		}
		return getModule(scope, tree, path, fullpath);
	};
	getRequire = function (scope, tree) {
		return function (path) {
			return require(scope, [].concat(tree), path);
		};
	};
	return getRequire(modules, []);
})
({
	"deferred": {
		"lib": {
			"deferred.js": function (exports, module, require) {
				'use strict';

				var every     = Array.prototype.every
				  , isError   = require('es5-ext/lib/Error/is-error')
				  , isPromise = require('./is-promise')

				  , promise, Deferred;

				Deferred = function () {
					this.promise = promise();
				};
				Deferred.prototype = {
					resolved: false,
					resolve: function (value) {
						if (this.resolved) {
							return this.promise;
						}
						this.resolved = true;
						return this.promise._base.resolve(value);
					}
				};

				module.exports = function deferred(value) {
					var o, l, args, d, waiting, initialized, result;
					if ((l = arguments.length)) {
						if (l > 1) {
							d = deferred();
							waiting = 0;
							result = new Array(arguments.length);
							every.call(arguments, function (value, index) {
								if (isPromise(value)) {
									++waiting;
									value.end(function (value) {
										result[index] = value;
										if (!--waiting && initialized) {
											d.resolve(result);
										}
									}, d.resolve);
								} else if (isError(value)) {
									d.resolve(value);
									return false;
								} else {
									result[index] = value;
								}
								return true;
							});
							initialized = true;
							if (!waiting) {
								d.resolve(result);
							}
							return d.promise;
						} else {
							return promise(value);
						}
					}

					o = new Deferred();
					return {
						resolve: o.resolve.bind(o),
						promise: o.promise
					};
				};

				promise = require('./promise');
			},
			"ext": {
				"array": {
					"map.js": function (exports, module, require) {
						'use strict';

						var every          = Array.prototype.every
						  , call           = Function.prototype.call
						  , assertNotNull  = require('es5-ext/lib/assert-not-null')
						  , isError        = require('es5-ext/lib/Error/is-error')
						  , assertCallable = require('es5-ext/lib/Object/assert-callable')
						  , create         = require('es5-ext/lib/Object/prototype/plain-create')
						  , deferred       = require('../../deferred')
						  , isPromise      = require('../../is-promise');

						var proto = {
							iterate: function (value, index) {
								if (!this.cb && isError(value)) {
									this.d.resolve(value);
									return false;
								}
								++this.waiting;
								if (isPromise(value)) {
									if (isPromise(value = value.valueOf())) {
										value.end(this.processValue.bind(this, index), this.d.resolve);
									} else if (isError(value)) {
										this.d.resolve(value);
										return false;
									} else {
										return this.processValue(index, value);
									}
								} else {
									return this.processValue(index, value);
								}
								return true;
							},
							processValue: function self(index, value) {
								var d;
								if (this.d.promise._base.resolved) {
									return false;
								}
								if (this.cb) {
									if (!this.limit) {
										d = deferred();
										this.held.push(d.resolve);
										d.promise(self.bind(this, index, value));
										return true;
									}
									try {
										value = call.call(this.cb, this.context, value, index, this.list);
									} catch (e) {
										this.d.resolve(e);
										return false;
									}
									if (isPromise(value) && isPromise(value = value.valueOf())) {
										--this.limit;
										value.end(this.unhold.bind(this, index), this.d.resolve);
										return true;
									} else if (isError(value)) {
										this.d.resolve(value);
										return false;
									}
								}
								this.processResult(index, value);
								return true;
							},
							unhold: function (index, value) {
								this.processResult(index, value);
								if (!this.d.promise._base.resolved) {
									++this.limit;
									if (this.held.length) {
										this.held.shift()();
									}
								}
							},
							processResult: function (index, value) {
								if (this.d.promise._base.resolved) {
									return;
								}
								this.result[index] = value;
								if (!--this.waiting && this.initialized) {
									this.d.resolve(this.result);
								}
							}
						};

						module.exports = function (cb, thisArg, limit) {
							var result, iterator, d;
							assertNotNull(this);
							if (cb != null) {
								assertCallable(cb);
							}
							d = deferred();
							every.call(this, (iterator = create.call(proto, {
								d: d,
								cb: cb,
								held: [],
								limit: (limit >>> 0) || Infinity,
								list: this,
								context: thisArg,
								waiting: 0,
								result: new Array(this.length >>> 0)
							})).iterate, iterator);
							iterator.initialized = true;
							if (!iterator.waiting) {
								d.resolve(iterator.result);
							}
							return d.promise;
						};
					},
					"reduce.js": function (exports, module, require) {
						'use strict';

						var every          = Array.prototype.every
						  , call           = Function.prototype.call
						  , assertNotNull  = require('es5-ext/lib/assert-not-null')
						  , isError        = require('es5-ext/lib/Error/is-error')
						  , silent         = require('es5-ext/lib/Function/prototype/silent')
						  , assertCallable = require('es5-ext/lib/Object/assert-callable')
						  , create         = require('es5-ext/lib/Object/prototype/plain-create')
						  , isPromise      = require('../../is-promise')
						  , promise        = require('../../promise');

						var proto = {
							iterate: function self(value, index) {
								if (!this.initialized) {
									this.initialized = true;
									return isError(this.current = value) ? false : true;
								}
								if (this.current && isPromise(this.current)) {
									this.current =
										this.current(this.processValue.bind(this, value, index));
								} else if (isError(this.current =
										this.processValue(value, index, this.current))) {
									return false;
								}
								return true;
							},
							processValue: function (value, index, accumulator) {
								if (this.cb) {
									if (value && isPromise(value)) {
										value = value(this.processCb.bind(this, accumulator, index));
									} else {
										value = this.processCb(accumulator, index, value);
									}
								}
								if (isPromise(value)) {
									value = value.valueOf();
								}
								return value;
							},
							processCb: function (accumulator, index, value) {
								return silent.call(this.cb, accumulator, value, index, this.list);
							}
						};

						module.exports = function (cb, initial) {
							var iterator;
							assertNotNull(this);
							if (cb != null) {
								assertCallable(cb);
							}
							if (initial && isError(initial)) {
								return promise(initial);
							}
							every.call(this, (iterator = create.call(proto, {
								initialized: (arguments.length > 1),
								current: initial,
								cb: cb,
								list: this
							})).iterate, iterator);

							if (!iterator.initialized) {
								throw new Error("Reduce of empty array with no initial value");
							}
							return promise(iterator.current);
						};
					}
				},
				"function": {
					"delay.js": function (exports, module, require) {
						// Delay function execution, return promise for function result

						'use strict';

						var silent         = require('es5-ext/lib/Function/prototype/silent')
						  , assertCallable = require('es5-ext/lib/Object/assert-callable')
						  , deferred       = require('../../deferred')
						  , delayed;

						delayed = function (fn, args, resolve) {
							resolve(silent.apply(fn.bind(this), args));
						};

						module.exports = function (timeout) {
							var fn;
							assertCallable(this);
							fn = this;
							return function () {
								var d = deferred();
								setTimeout(delayed.bind(this, fn, arguments, d.resolve), timeout);
								return d.promise;
							};
						};
					},
					"promisify-async.js": function (exports, module, require) {
						// Promisify asynchronous function

						'use strict';

						var isArray        = Array.isArray
						  , some           = Array.prototype.some
						  , assertCallable = require('es5-ext/lib/Object/assert-callable')
						  , apply          = require('../utils/apply-async')
						  , deferred       = require('../../deferred')
						  , isPromise      = require('../../is-promise');

						module.exports = function (length) {
							var fn, args;
							assertCallable(this);
							fn = this;
							if (length != null) {
								length = length >>> 0;
							}
							return function () {
								var d;
								d = deferred();
								if (some.call(arguments, isPromise)) {
									deferred.apply(null, arguments)(function (args) {
										apply.call(this, fn, isArray(args) ? args : [args], d.resolve, length);
									}.bind(this));
								} else {
									apply.call(this, fn, arguments, d.resolve, length);
								}
								return d.promise;
							};
						};
					},
					"promisify-sync.js": function (exports, module, require) {
						// Promisify synchronous function

						'use strict';

						var isArray        = Array.isArray
						  , slice          = Array.prototype.slice
						  , some           = Array.prototype.some
						  , assertCallable = require('es5-ext/lib/Object/assert-callable')
						  , silent         = require('es5-ext/lib/Function/prototype/silent')
						  , deferred       = require('../../deferred')
						  , isPromise      = require('../../is-promise');

						module.exports = function (length) {
							var fn, args;
							assertCallable(this);
							fn = this;
							if (length != null) {
								length = length >>> 0;
							}
							return function () {
								var args = arguments;
								if (length != null) {
									args = slice.call(args, 0, length);
								}
								if (some.call(args, isPromise)) {
									return deferred.apply(null, args)(function (args) {
										return fn.apply(this, isArray(args) ? args : [args]);
									}.bind(this));
								} else {
									return deferred(silent.apply(fn.bind(this), args));
								}
							};
						};
					},
					"promisify.js": function (exports, module, require) {
						// Promisify function.
						// It's universal approach that should work for both synchronous and
						// asynchronous functions. It may not produce desired result for specific cases
						// (e.g. synchrouns function that takes variable ammount of arguments), choose
						// then directly promisifySync or promisifyAsync methods.

						'use strict';

						var isArray        = Array.isArray
						  , some           = Array.prototype.some
						  , assertCallable = require('es5-ext/lib/Object/assert-callable')
						  , apply          = require('../utils/apply')
						  , deferred       = require('../../deferred')
						  , isPromise      = require('../../is-promise');

						module.exports = function (length) {
							var fn, args;
							assertCallable(this);
							fn = this;
							if (length != null) {
								length = length >>> 0;
							}
							return function () {
								var d;
								d = deferred();
								if (some.call(arguments, isPromise)) {
									deferred.apply(null, arguments)(function (args) {
										apply.call(this, fn, isArray(args) ? args : [args], d.resolve, length);
									}.bind(this));
								} else {
									apply.call(this, fn, arguments, d.resolve, length);
								}
								return d.promise;
							};
						};
					}
				},
				"promise": {
					"get.js": function (exports, module, require) {
						'use strict';

						require('../../extend')('get', null, function (args, resolve) {
							return resolve(this.failed ? this.promise : this.value[args[0]]);
						});

						module.exports = require('../../deferred');
					},
					"invoke-async.js": function (exports, module, require) {
						'use strict';

						var slice      = Array.prototype.slice
						  , apply      = require('../utils/apply-async')
						  , invoke     = require('./utils/invoke');

						require('../../extend')('invokeAsync', null, function (args, resolve) {
							var fn = args[0];
							args = slice.call(args, 1);
							return invoke(this, fn, args, apply, resolve, true);
						});

						module.exports = require('../../deferred');
					},
					"invoke-sync.js": function (exports, module, require) {
						'use strict';

						var slice      = Array.prototype.slice
						  , silent     = require('es5-ext/lib/Function/prototype/silent')
						  , invoke     = require('./utils/invoke')
						  , apply;

						apply = function (fn, args, resolve) {
							return resolve(silent.apply(fn.bind(this), args));
						};

						require('../../extend')('invokeSync', null, function (args, resolve) {
							var fn = args[0];
							args = slice.call(args, 1);
							return invoke(this, fn, args, apply, resolve);
						});

						module.exports = require('../../deferred');
					},
					"invoke.js": function (exports, module, require) {
						'use strict';

						var slice      = Array.prototype.slice
						  , apply      = require('../utils/apply')
						  , invoke     = require('./utils/invoke');

						require('../../extend')('invoke', null, function (args, resolve) {
							var fn = args[0];
							args = slice.call(args, 1);
							return invoke(this, fn, args, apply, resolve, true);
						});

						module.exports = require('../../deferred');
					},
					"map.js": function (exports, module, require) {
						// Map extension for promise array-like values

						'use strict';

						require('./utils/array')('map', require('../array/map'));

						module.exports = require('../../deferred');
					},
					"match.js": function (exports, module, require) {
						'use strict';

						var isFunction = require('es5-ext/lib/Function/is-function')
						  , match      = require('es5-ext/lib/Function/prototype/match')
						  , back       = require('../../promise').back;

						require('../../extend')('match', null, function (args, resolve) {
							var win = args[0], fail = args[1];
							return back.then.call(this, (!this.failed && isFunction(win)) ?
									match.call(win) : win, fail, resolve);
						});

						module.exports = require('../../deferred');
					},
					"reduce.js": function (exports, module, require) {
						// Reduce extension for promise array-like values

						'use strict';

						require('./utils/array')('reduce', require('../array/reduce'));

						module.exports = require('../../deferred');
					},
					"utils": {
						"array.js": function (exports, module, require) {
							// Factory for promise extensions that use array extensions

							'use strict';

							var silent = require('es5-ext/lib/Function/prototype/silent')
							  , extend = require('../../../extend');

							module.exports = function (name, ext) {
								extend(name, null, function (args, resolve) {
									var cb, cbs;
									if (this.failed) {
										return resolve(this.promise);
									} else {
										return resolve(silent.call(ext.bind(this.value,
											args[0], args[1], args[2])));
									}
								});
							};
						},
						"invoke.js": function (exports, module, require) {
							'use strict';

							var isArray    = Array.isArray
							  , slice      = Array.prototype.slice
							  , some       = Array.prototype.some
							  , isCallable = require('es5-ext/lib/Object/is-callable')
							  , deferred   = require('../../../deferred')
							  , promise    = require('../../../promise')
							  , isPromise  = require('../../../is-promise');

							module.exports = function (base, fn, args, apply, resolve, async) {
								var d, result;
								if (base.failed) {
									return resolve(base.promise);
								}
								if (!isCallable(fn)) {
									if (!isCallable(base.value[fn])) {
										return resolve(new Error("Cannot invoke '" + fn +
											"' on given value. It's not a function."));
									}
									fn = base.value[fn];
								}
								if (some.call(args, isPromise)) {
									if (resolve === promise) {
										d = deferred();
										resolve = d.resolve;
									}
									deferred.apply(null, args)(function (args) {
										apply.call(base.value, fn, isArray(args) ? args : [args], resolve);
									});
								} else {
									if (async && (resolve === promise)) {
										d = deferred();
										resolve = d.resolve;
									}
									result = apply.call(base.value, fn, args, resolve);
									if (!async) {
										return result;
									}
								}
								return d && d.promise;
							};
						}
					}
				},
				"utils": {
					"apply-async.js": function (exports, module, require) {
						'use strict';

						var slice   = Array.prototype.slice
						  , toArray = require('es5-ext/lib/Object/prototype/to-array');

						module.exports = function (fn, args, resolve, length) {
							args = (length != null) ? slice.call(args, 0, length) : toArray.call(args);
							while (args.length < length) {
								args.push(undefined);
							}
							try {
								return fn.apply(this, args.concat(function (error, result) {
									if (error == null) {
										resolve((arguments.length > 2) ? slice.call(arguments, 1) : result);
									} else {
										resolve(error);
									}
								}));
							} catch (e) {
								resolve(e);
							}
						};
					},
					"apply.js": function (exports, module, require) {
						'use strict';

						var apply = require('./apply-async');

						module.exports = function (fn, args, resolve, length) {
							var value;
							if ((value = apply.call(this, fn, args, resolve, length)) !== undefined) {
								resolve(value);
							}
						};
					}
				}
			},
			"extend.js": function (exports, module, require) {
				'use strict';

				var assertCallable = require('es5-ext/lib/Object/assert-callable')
					, deferred       = require('./deferred')
				  , promise        = require('./promise')

				  , front = promise.front, back = promise.back;

				module.exports = function (name, f, b) {
					f && assertCallable(f) && b && assertCallable(b);
					if (!f) {
						if (!b) {
							throw new Error("No methods provided");
						}
						f = function () {
							if (this._base.resolved) {
								return b.call(this._base, arguments, promise);
							} else {
								var d = deferred();
								this._base.next(name, [arguments, d.resolve]);
								return d.promise;
							}
						};
					}
					front[name] = f;
					if (b) {
						back[name] = b;
					}
					return deferred;
				};
			},
			"index.js": function (exports, module, require) {
				'use strict';

				var call  = Function.prototype.call
				  , merge = require('es5-ext/lib/Object/prototype/merge');

				module.exports = merge.call(require('./deferred'), {
					isPromise:      require('./is-promise'),
					delay:          call.bind(require('./ext/function/delay')),
					promisify:      call.bind(require('./ext/function/promisify')),
					promisifyAsync: call.bind(require('./ext/function/promisify-async')),
					promisifySync:  call.bind(require('./ext/function/promisify-sync')),
					map:            call.bind(require('./ext/array/map')),
					reduce:         call.bind(require('./ext/array/reduce'))
                });

                // exporting deferred
				if (typeof window != "undefined") window.deferred = module.exports;

				require('./ext/promise/get');
				require('./ext/promise/invoke');
				require('./ext/promise/invoke-async');
				require('./ext/promise/invoke-sync');
				require('./ext/promise/map');
				require('./ext/promise/match');
				require('./ext/promise/reduce');
			},
			"is-promise.js": function (exports, module, require) {
				// Whether given object is a promise

				'use strict';

				var isFunction = require('es5-ext/lib/Function/is-function');

				module.exports = function (o) {
					return isFunction(o) && (o === o.then);
				};
			},
			"promise.js": function (exports, module, require) {
				'use strict';

				var push             = Array.prototype.push
				  , apply            = Function.prototype.apply
				  , defineProperty   = Object.defineProperty
				  , keys             = Object.keys
				  , isError          = require('es5-ext/lib/Error/is-error')
				  , noop             = require('es5-ext/lib/Function/noop')
				  , match            = require('es5-ext/lib/Function/prototype/match')
				  , silent           = require('es5-ext/lib/Function/prototype/silent')
				  , assertCallable   = require('es5-ext/lib/Object/assert-callable')
				  , dscr             = require('es5-ext/lib/Object/descriptor')
				  , isCallable       = require('es5-ext/lib/Object/is-callable')
				  , isPromise        = require('./is-promise')

				  , front, back, Resolved, Unresolved, deferred, createPromise;

				front = {
					end: function (win, fail) {
						(win != null) && assertCallable(win);
						(fail != null) && assertCallable(fail);
						this._base.next('end', arguments);
					},
					valueOf: function () {
						return this._base.resolved ? this._base.value : this;
					}
				};

				back = {
					then: function (win, fail, resolve) {
						var cb = this.failed ? fail : win;
						return resolve((cb == null) ? this.promise :
								(isCallable(cb) ? silent.call(cb, this.value) : cb));
					},
					end:  function (win, fail) {
						if (this.failed) {
							if (fail) {
								fail(this.value);
							} else if (!win || (arguments.length > 1)) {
								throw this.value;
							} else {
								win(this.value);
							}
						} else if (win) {
							if (arguments.length > 1) {
								win(this.value);
							} else {
								win(null, this.value);
							}
						}
					}
				};

				Resolved = function (value) {
					this.value = value;
					this.failed = isError(value);
				};
				Resolved.prototype = {
					resolved: true,
					link: function (promise) {
						var previous, base;
						base = dscr.v(this);
						previous = promise._base;
						this.promise = promise;
						defineProperty(promise, '_base', base);
						if (previous) {
							clearTimeout(previous.timeout);
							if (previous.monitor) {
								clearTimeout(previous.monitor);
							}
							previous.promises.forEach(function (promise) {
								defineProperty(promise, '_base', base);
							}, this);
							previous.pending.forEach(match.call(this.next), this);
						}
						return promise;
					},
					next: function (name, args) {
						back[name].apply(this, args);
					}
				};

				Unresolved = function () {
					this.pending = [];
					this.promises = [];
					this.timeout = setTimeout(noop, 1e13);
					this.monitor = deferred.MONITOR && deferred.MONITOR();
				};
				Unresolved.prototype = {
					resolved: false,
					link: function (promise) {
						var previous, base;
						base = dscr.c(this);
						if ((previous = promise._base)) {
							clearTimeout(previous.timeout);
							if (previous.monitor) {
								clearTimeout(previous.monitor);
							}
							previous.promises.forEach(function (promise) {
								defineProperty(promise, '_base', base);
								this.promises.push(promise);
							}, this);
							push.apply(this.pending, previous.pending);
						}
						this.promises.push(promise);
						defineProperty(promise, '_base', base);
						return promise;
					},
					next: function () {
						this.pending.push(arguments);
					},
					resolve: function (value) {
						return (isPromise(value) ? value._base :
								new Resolved(value)).link(this.promises[0]);
					}
				};

				createPromise = module.exports = function (value) {
					var promise;

					if (isPromise(value)) {
						return value;
					}

					promise = function (win, fail) {
						var d;
						if (promise._base.resolved) {
							return back.then.call(promise._base, win, fail, createPromise);
						} else {
							d = deferred();
							promise._base.next('then', [win, fail, d.resolve]);
							return d.promise;
						}
					};
					promise.then = promise;
					keys(front).forEach(function (key) {
						promise[key] = front[key];
					});

					((arguments.length) ? new Resolved(value) : new Unresolved()).link(promise);
					return promise;
				};

				createPromise.front = front;
				createPromise.back = back;

				deferred = require('./deferred');
			}
		}
	},
	"es5-ext": {
		":mainpath:": "lib\\index",
		"lib": {
			"Error": {
				"is-error.js": function (exports, module, require) {
					// Whether object is error

					'use strict';

					var toString = Object.prototype.toString

					  , id = toString.call(new Error())
					  , exceptionRe = /^\[object [a-zA-z0-9]*(?:Exception|Error)\]$/;

					module.exports = function (x) {
						var xid;
						return (x && (x instanceof Error) || ((xid = toString.call(x)) === id) ||
							xid.match(exceptionRe)) || false;
					};
				}
			},
			"Function": {
				"is-arguments.js": function (exports, module, require) {
					'use strict';

					var toString = Object.prototype.toString

					  , id = '[object Arguments]';

					module.exports = function (x) {
						return toString.call(x) === id;
					};
				},
				"is-function.js": function (exports, module, require) {
					// Is f a function ?

					'use strict';

					var toString = Object.prototype.toString

					  , id = toString.call(function () {});

					module.exports = function (f) {
						return (typeof f === "function") && (toString.call(f) === id);
					};
				},
				"noop.js": function (exports, module, require) {
					// No operation function

					'use strict';

					module.exports = function () {};
				},
				"prototype": {
					"match.js": function (exports, module, require) {
						// Match first list argument to function arguments
						//
						// matched(f)(args) =def f.apply(null, args);

						'use strict';

						var apply          = Function.prototype.apply
						  , assertCallable = require('../../Object/assert-callable');

						module.exports = function () {
							var fn = this;
							assertCallable(fn);
							return function (args) {
								return apply.call(fn, this, args);
							};
						};
					},
					"silent.js": function (exports, module, require) {
						// Run function, if function throws than catch exception and return its error
						// otherwise return function result

						'use strict';

						var apply          = Function.prototype.apply
						  , assertCallable = require('../../Object/assert-callable');

						module.exports = function () {
							assertCallable(this);
							try {
								return apply.call(this, null, arguments);
							} catch (e) {
								return e;
							}
						};
					}
				}
			},
			"Object": {
				"assert-callable.js": function (exports, module, require) {
					// Throw error if given object is not callable

					'use strict';

					var isCallable = require('./is-callable');

					module.exports = function (fn) {
						if (!isCallable(fn)) {
							throw new TypeError(fn + " is not a function");
						}
					};
				},
				"descriptor.js": function (exports, module, require) {
					// Functions that wraps values in descriptors
					// Handy way to define properties with descriptors

					'use strict';

					var assertCallable = require('./assert-callable')

					  , byValueOrGetSet, byValue;

					byValueOrGetSet = function (c, e) {
						return function (get, set) {
							if (set) {
								assertCallable(get);
								assertCallable(set);
								return { get: get, set: set, configurable: c, enumerable: e };
							}
							return { value: get, configurable: c, enumerable: e };
						};
					};

					byValue = function (c, e) {
						return function (value) {
							return { value: value, writable: true, configurable: c, enumerable: e };
						};
					};

					exports = module.exports = byValueOrGetSet(false, false);
					exports.c   = byValueOrGetSet(true, false);
					exports.ce  = byValueOrGetSet(true, true);
					exports.cew = byValue(true, true);
					exports.cw  = byValue(true, false);
					exports.e   = byValueOrGetSet(false, true);
					exports.ew  = byValue(false, true);
					exports.v   = exports;
					exports.w   = byValue(false, false);
				},
				"is-callable.js": function (exports, module, require) {
					// Whether object is callable
					// Inspired by: http://www.davidflanagan.com/2009/08/typeof-isfuncti.html

					'use strict';

					var forEach = Array.prototype.forEach.bind([]);

					module.exports = function (obj) {
						var type;
						if (!obj) {
							return false;
						}
						type = typeof obj;
						if (type === 'function') {
							return true;
						}
						if (type !== 'object') {
							return false;
						}

						try {
							forEach(obj);
							return true;
						} catch (e) {
							if (e instanceof TypeError) {
								return false;
							}
							throw e;
						}
					};
				},
				"prototype": {
					"merge.js": function (exports, module, require) {
						// Merge properties of one object into other.
						// Property keys found in both objects will be overwritten.

						'use strict';

						var keys          = Object.keys
						  , assertNotNull = require('../../assert-not-null')
						  , merge;

						merge = function (obj, key) {
							return (this[key] = obj[key]);
						};

						module.exports = function (arg) {
							assertNotNull(this);
							keys(arg).forEach(merge.bind(this, arg));
							return this;
						};
					},
					"plain-create.js": function (exports, module, require) {
						// Object.create ES3 way, no descriptors involved

						'use strict';

						var merge = require('./merge');

						module.exports = function (properties) {
							var Constructor, obj
							Constructor = function () {};
							Constructor.prototype = this;
							obj = new Constructor();
							return properties ? merge.call(obj, properties) : obj;
						};
					},
					"to-array.js": function (exports, module, require) {
						// Convert array-like object to an Array

						'use strict';

						var isArray       = Array.isArray
						  , slice         = Array.prototype.slice
						  , isArguments   = require('../../Function/is-arguments')

						module.exports = function () {
							if (isArray(this)) {
								return this;
							} else if (isArguments(this)) {
								return (this.length === 1) ? [this[0]] : Array.apply(null, this);
							} else {
								return slice.call(this);
							}
						};
					}
				}
			},
			"assert-not-null.js": function (exports, module, require) {
				// Throw error if given object is null or undefined

				'use strict';

				module.exports = function (value) {
					if (value == null) {
						throw new TypeError("Cannot use null or undefined")
					}
				};
			}
		}
	}
})
("deferred/lib/index");
