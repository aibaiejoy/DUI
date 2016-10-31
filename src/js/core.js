
;
(function(global, $, undefined) {
	var d6 = {
			verticalSwipe: true //是否可以纵向滑动
		},
		$ui = {},
		Base = {},
		readyRE = /complete|loaded|interactive/,
		REQUIRE_RE = /"(?:\\"|[^"])*"|'(?:\\'|[^'])*'|\/\*[\S\s]*?\*\/|\/(?:\\\/|[^\/\r\n])+\/(?=[^\/])|\/\/.*|\.\s*require|(?:^|[^$])\brequire\s*\(\s*(["'])(.+?)\1\s*\)/g,
		SLASH_RE = /\\\\/g;

	Base.eachObj = function(obj, iterator) {
		obj && Object.keys(obj).forEach(function(key) {
			iterator(key, obj[key]);
		});
	};
	Base.getWidget = function(name) {
		return $ui.widgets[name]
	};
	Base.register = function(name, callback) {
		if ($.isFunction(callback)) {
			callback.call(global, $ui.plugins[name])
		}
	};
	Base.init = function() {};
	/**
	 * @name extend
	 * @desc 扩充现有组件
	 */
	Base.extend = function(obj) {
		var proto = this.prototype;
		Base.eachObj(obj, function(key, val) {
			proto[key] = val;
		});
		return this;
	};

	Base.parseTpl = function(str, data) {
		console.log("Base.parseTpl 已过期")
		var tmpl = 'var __p=[];' + 'with(obj||{}){__p.push(\'' +
			str.replace(/\\/g, '\\\\')
			.replace(/'/g, '\\\'')
			.replace(/<%=([\s\S]+?)%>/g, function(match, code) {
				return '\',' + code.replace(/\\'/, '\'') + ',\'';
			})
			.replace(/<%([\s\S]+?)%>/g, function(match, code) {
				return '\');' + code.replace(/\\'/, '\'')
					.replace(/[\r\n\t]/g, ' ') + '__p.push(\'';
			})
			.replace(/\r/g, '\\r')
			.replace(/\n/g, '\\n')
			.replace(/\t/g, '\\t') +
			'\');}return __p.join("");',

			func = new Function('obj', tmpl);

		return data ? func(data) : func;
	};

	$ui.uuid = 0;
	$ui.data = {};
	$ui.widgets = {};
	$ui.plugins = {};
	$ui.module = {};

	$ui.define = function(name, options) {
		if ($ui.widgets[name]) return $ui.widgets[name];
		var defOpts = {
			/**
			 * 参照对象
			 * @property {String} [ref=null]
			 */
			ref: null, //参照目标 

			/**
			 * 点击回调函数
			 * @type {function}
			 */
			callback: null
		}
		var klass = function(opts) {
			var baseOpts = $.extend(true, {}, this.options);
			this.opts = $.extend(true, baseOpts, opts);
			this.ref = $(this.opts.ref);
			this.callback = this.opts.callback;
			this.$family = {
				name: name
			}
			this.init();
		}
		
		$.extend(klass.prototype , Base);
		//$ui.widgets[name] = Base.extend.call(klass, Base);
		//$.extend(klass.prototype.options || {}, defOpts, options);
		klass.prototype.options = $.extend(defOpts, options);
		
		return $ui.widgets[name] = klass;
	};

	$ui.plugin = function(name, factory) {
		$ui.plugins[name] = factory
	};

	var define = function(factory) {
		if ($.isFunction(factory)) {
			var module = factory.call(global, $ui)
		}
	};

	var require = function(widget) {
		var widget = Base.getWidget(widget);
		return widget;
	}

	global.define = define;
	global.d6 = d6;

	/*
		@author 李光
	    判断是否Touch屏幕
	*/
	var isTouchScreen = Base.isTouchScreen = (function() {
		return (('ontouchstart' in window) || window.DocumentTouch && document instanceof DocumentTouch);
	})();
	
	Base.touchEve = (function() {
		return isTouchScreen ? "tap" : "click"
	})();

	Base.touchStart = (function() {
		return isTouchScreen ? "touchstart" : "mousedown"
	})();

	Base.touchEnd = (function() {
		return isTouchScreen ? "touchend" : "mouseup mouseout"
	})();

	Base.touchCancel = (function() {
		return isTouchScreen ? "touchcancel" : "mouseup"
	})();

	Base.touchMove = (function() {
		return isTouchScreen ? "touchmove" : "mousemove"
	})();

	Base.longTap = (function() {
		return isTouchScreen ? "longTap" : "mouseup"
	})();

	Base.touchOver = (function() {
		return isTouchScreen ? "touchend touchmove" : "mouseup"
	})();


	var initializing = false,
		fnTest = /xyz/.test(function() {
			xyz;
		}) ? /\b_super\b/ : /.*/;

	var Class = function() {};

	Class.extend = function(prop) {
		var _super = this.prototype;
		initializing = true;
		var prototype = new this();
		initializing = false;
	
		for (var name in prop) {
			prototype[name] = typeof prop[name] == "function" &&
				typeof _super[name] == "function" && fnTest.test(prop[name]) ?
				(function(name, fn) {
					return function() {
						var tmp = this._super;

						this._super = _super[name];

						var ret = fn.apply(this, arguments);
						this._super = tmp;

						return ret;
					};
				})(name, prop[name]) :
				prop[name];
		}
		function Child() {
			if (!initializing && this.init)
				this.init.apply(this, arguments);
		}
		Child.prototype = prototype;
		Child.prototype.constructor = Child;
		Child.extend = arguments.callee;
		return Child;
	};
	//扩展Class
	Class = Class.extend(Base);
	Class = Class.extend(_);

	$.Class = Class;
	
	$.namespace = 'ui';
	$.classNamePrefix = $.namespace + '-';
	$.classSelectorPrefix = '.' + $.classNamePrefix;
	/**
	 * 返回正确的className
	 * @param {type} className
	 * @returns {String}
	 */
	$.className = function(className) {
		return $.classNamePrefix + className;
	};
	
	/**
	 * trigger event
	 * @param {type} element
	 * @param {type} eventType
	 * @param {type} eventData
	 * @returns {_L8.$}
	 */
	$.trigger = function(element, eventType, eventData) {
		element.dispatchEvent(new CustomEvent(eventType, {
			detail: eventData,
			bubbles: true,
			cancelable: true
		}));
		
		return this;
	};
})(window, Zepto);