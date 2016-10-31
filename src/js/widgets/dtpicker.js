/**
 * 日期时间插件
 * varstion 1.0.5
 * by Houfeng
 * Houfeng@DCloud.io
 */

(function($, document) {
	
	//创建 DOM
	$.dom = function(str) {
		if (typeof(str) !== 'string') {
			if ((str instanceof Array) || (str[0] && str.length)) {
				return [].slice.call(str);
			} else {
				return [str];
			}
		}
		if (!$.__create_dom_div__) {
			$.__create_dom_div__ = document.createElement('div');
		}
		$.__create_dom_div__.innerHTML = str;
		return [].slice.call($.__create_dom_div__.childNodes);
	};
	
	var domBuffer = '<div class="ui-dtpicker" data-type="datetime">\
		<div class="ui-dtpicker-header">\
			<button data-id="btn-cancel" class="ui-btn">取消</button>\
			<button data-id="btn-ok" class="ui-btn ui-btn-blue">确定</button>\
		</div>\
		<div class="ui-dtpicker-title"><h5 data-id="title-y">年</h5><h5 data-id="title-m">月</h5><h5 data-id="title-d">日</h5><h5 data-id="title-h">时</h5><h5 data-id="title-i">分</h5></div>\
		<div class="ui-dtpicker-body">\
			<div data-id="picker-y" class="ui-picker">\
				<div class="ui-picker-inner">\
					<div class="ui-pciker-rule ui-pciker-rule-ft"></div>\
					<ul class="ui-pciker-list">\
					</ul>\
					<div class="ui-pciker-rule ui-pciker-rule-bg"></div>\
				</div>\
			</div>\
			<div data-id="picker-m" class="ui-picker">\
				<div class="ui-picker-inner">\
					<div class="ui-pciker-rule ui-pciker-rule-ft"></div>\
					<ul class="ui-pciker-list">\
					</ul>\
					<div class="ui-pciker-rule ui-pciker-rule-bg"></div>\
				</div>\
			</div>\
			<div data-id="picker-d" class="ui-picker">\
				<div class="ui-picker-inner">\
					<div class="ui-pciker-rule ui-pciker-rule-ft"></div>\
					<ul class="ui-pciker-list">\
					</ul>\
					<div class="ui-pciker-rule ui-pciker-rule-bg"></div>\
				</div>\
			</div>\
			<div data-id="picker-h" class="ui-picker">\
				<div class="ui-picker-inner">\
					<div class="ui-pciker-rule ui-pciker-rule-ft"></div>\
					<ul class="ui-pciker-list">\
					</ul>\
					<div class="ui-pciker-rule ui-pciker-rule-bg"></div>\
				</div>\
			</div>\
			<div data-id="picker-i" class="ui-picker">\
				<div class="ui-picker-inner">\
					<div class="ui-pciker-rule ui-pciker-rule-ft"></div>\
					<ul class="ui-pciker-list">\
					</ul>\
					<div class="ui-pciker-rule ui-pciker-rule-bg"></div>\
				</div>\
			</div>\
		</div>\
	</div>';

	//plugin
	var DtPicker = $.DtPicker = $.Class.extend({
		init: function(element, options) {
			var self = this;
			var _picker = $.dom(domBuffer)[0];
			options.theme && _picker.classList.add(options.theme);
			self.$element = $(element);

			document.body.appendChild(_picker);
			$('[data-id*="picker"]', _picker).picker();
			var ui = self.ui = {
				picker: _picker,
				mask: $.createMask && $.createMask(),
				ok: $('[data-id="btn-ok"]', _picker)[0],
				cancel: $('[data-id="btn-cancel"]', _picker)[0],
				y: $('[data-id="picker-y"]', _picker)[0],
				m: $('[data-id="picker-m"]', _picker)[0],
				d: $('[data-id="picker-d"]', _picker)[0],
				h: $('[data-id="picker-h"]', _picker)[0],
				i: $('[data-id="picker-i"]', _picker)[0],
				labels: $('[data-id*="title-"]', _picker),
			};
			ui.cancel.addEventListener('tap', function() {
				self.hide();
			}, false);

			ui.ok.addEventListener('tap', function() {
				$.trigger(element, 'ok', self.getSelected());
			}, false);

			ui.y.addEventListener('change', function() {
				self._createDay();
			}, false);

			ui.m.addEventListener('change', function() {
				self._createDay();
			}, false);
			/*ui.mask[0].addEventListener('tap', function() {
				self.hide();
			}, false);*/
			self._create(options);
			//防止滚动穿透
			self.ui.picker.addEventListener('touchstart',function(event){
				event.preventDefault();  
			},false);
			self.ui.picker.addEventListener('touchmove',function(event){
				event.preventDefault();  
			},false);
		},
		getSelected: function() {
			var self = this;
			var ui = self.ui;
			var type = self.options.type;
			var selected = {
				type: type,
				y: ui.y.picker.getSelectedItem(),
				m: ui.m.picker.getSelectedItem(),
				d: ui.d.picker.getSelectedItem(),
				h: ui.h.picker.getSelectedItem(),
				i: ui.i.picker.getSelectedItem(),
				toString: function() {
					return this.value;
				}
			};
			switch (type) {
				case 'datetime':
					selected.value = selected.y.value + '-' + selected.m.value + '-' + selected.d.value + ' ' + selected.h.value + ':' + selected.i.value;
					selected.text = selected.y.text + '-' + selected.m.text + '-' + selected.d.text + ' ' + selected.h.text + ':' + selected.i.text;
					break;
				case 'date':
					selected.value = selected.y.value + '-' + selected.m.value + '-' + selected.d.value;
					selected.text = selected.y.text + '-' + selected.m.text + '-' + selected.d.text;
					break;
				case 'time':
					selected.value = selected.h.value + ':' + selected.i.value;
					selected.text = selected.h.text + ':' + selected.i.text;
					break;
				case 'month':
					selected.value = selected.y.value + '-' + selected.m.value;
					selected.text = selected.y.text + '-' + selected.m.text;
					break;
				case 'hour':
					selected.value = selected.y.value + '-' + selected.m.value + '-' + selected.d.value + ' ' + selected.h.value;
					selected.text = selected.y.text + '-' + selected.m.text + '-' + selected.d.text + ' ' + selected.h.text;
					break;
			}
			return selected;
		},
		setSelectedValue: function(value) {
			var self = this;
			var ui = self.ui;
			var parsedValue = self._parseValue(value);
			ui.y.picker.setSelectedValue(parsedValue.y, 0);
			ui.m.picker.setSelectedValue(parsedValue.m, 0);
			ui.d.picker.setSelectedValue(parsedValue.d, 0);
			ui.h.picker.setSelectedValue(parsedValue.h, 0);
			ui.i.picker.setSelectedValue(parsedValue.i, 0);
		},
		isLeapYear: function(year) {
			return (year % 4 == 0 && year % 100 != 0) || (year % 400 == 0);
		},
		_inArray: function(array, item) {
			for (var index in array) {
				var _item = array[index];
				if (_item === item) return true;
			}
			return false;
		},
		getDayNum: function(year, month) {
			var self = this;
			if (self._inArray([1, 3, 5, 7, 8, 10, 12], month)) {
				return 31;
			} else if (self._inArray([4, 6, 9, 11], month)) {
				return 30;
			} else if (self.isLeapYear(year)) {
				return 29;
			} else {
				return 28;
			}
		},
		_fill: function(num) {
			num = num.toString();
			if (num.length < 2) {
				num = 0 + num;
			}
			return num;
		},
		_createYear: function(current) {
			var self = this;
			var options = self.options;
			var ui = self.ui;
			//生成年列表
			var yArray = [];
			if (options.custom.y) {
				yArray = options.custom.y;
			} else {
				var yBegin = options.beginyear;
				var yEnd = options.endyear;
				for (var y = yBegin; y <= yEnd; y++) {
					yArray.push({
						text: y + '',
						value: y
					});
				}
			}
			ui.y.picker.setItems(yArray);
			//ui.y.picker.setSelectedValue(current);
		},
		_createMonth: function(current) {
			var self = this;
			var options = self.options;
			var ui = self.ui;
			//生成月列表
			var mArray = [];
			if (options.custom.m) {
				mArray = options.custom.m;
			} else {
				for (var m = 1; m <= 12; m++) {
					var val = self._fill(m);
					mArray.push({
						text: val,
						value: val
					});
				}
			}
			ui.m.picker.setItems(mArray);
			//ui.m.picker.setSelectedValue(current);
		},
		_createDay: function(current) {
			var self = this;
			var options = self.options;
			var ui = self.ui;
			//生成日列表
			var dArray = [];
			if (options.custom.d) {
				dArray = options.custom.d;
			} else {
				var maxDay = self.getDayNum(parseInt(ui.y.picker.getSelectedValue()), parseInt(ui.m.picker.getSelectedValue()));
				for (var d = 1; d <= maxDay; d++) {
					var val = self._fill(d);
					dArray.push({
						text: val,
						value: val
					});
				}
			}
			ui.d.picker.setItems(dArray);
			current = current || ui.d.picker.getSelectedValue();
			//ui.d.picker.setSelectedValue(current);
		},
		_createHours: function(current) {
			var self = this;
			var options = self.options;
			var ui = self.ui;
			//生成时列表
			var hArray = [];
			if (options.custom.h) {
				hArray = options.custom.h;
			} else {
				for (var h = 0; h <= 23; h++) {
					var val = self._fill(h);
					hArray.push({
						text: val,
						value: val
					});
				}
			}
			ui.h.picker.setItems(hArray);
			//ui.h.picker.setSelectedValue(current);
		},
		_createMinutes: function(current) {
			var self = this;
			var options = self.options;
			var ui = self.ui;
			//生成分列表
			var iArray = [];
			if (options.custom.i) {
				iArray = options.custom.i;
			} else {
				for (var i = 0; i <= 59; i++) {
					var val = self._fill(i);
					iArray.push({
						text: val,
						value: val
					});
				}
			}
			ui.i.picker.setItems(iArray);
			//ui.i.picker.setSelectedValue(current);
		},
		_setLabels: function() {
			var self = this;
			var options = self.options;
			var ui = self.ui;
			ui.labels.each(function(i, label) {
				label.innerText = options.labels[i];
			});
		},
		_setButtons: function() {
			var self = this;
			var options = self.options;
			var ui = self.ui;
			ui.cancel.innerText = options.buttons[0];
			ui.ok.innerText = options.buttons[1];
		},
		_parseValue: function(value) {
			var self = this;
			var rs = {};
			if (value) {
				var parts = value.replace(":", "-").replace(" ", "-").split("-");
				rs.y = parts[0];
				rs.m = parts[1];
				rs.d = parts[2];
				rs.h = parts[3];
				rs.i = parts[4];
			} else {
				var now = new Date();
				rs.y = now.getFullYear();
				rs.m = now.getMonth() + 1;
				rs.d = now.getDate();
				rs.h = now.getHours();
				rs.i = now.getMinutes();
			}
			return rs;
		},
		_create: function(options) {
			var self = this;
			options = options || {};
			options.labels = options.labels || ['年', '月', '日', '时', '分'];
			options.buttons = options.buttons || ['取消', '确定'];
			options.type = options.type || 'datetime';
			options.custom = options.custom || {};
			self.options = options;
			var now = new Date();
			options.beginyear = options.beginyear || (now.getFullYear() - 5);
			options.endyear = options.endyear || (now.getFullYear() + 5);
			var ui = self.ui;
			//设定label
			self._setLabels();
			self._setButtons();
			//设定类型
			ui.picker.setAttribute('data-type', options.type);
			//生成
			self._createYear();
			self._createMonth();
			self._createDay();
			self._createHours();
			self._createMinutes();
			//设定默认值
			self.setSelectedValue(options.value);
		},
		//显示
		show: function(callback) {
			var self = this;
			var ui = self.ui;
			self.callback = callback || $.noop;
			//ui.mask.show();
			document.body.classList.add($.className('dtpicker-active-for-page'));
			ui.picker.classList.add($.className('active'));
			self.isShown = true;

			//处理物理返回键
			self.__back = $.back;
			$.back = function() {
				self.hide();
			};
		},
		hide: function() {
			var self = this;
			if (self.disposed) return;
			var ui = self.ui;
			ui.picker.classList.remove($.className('active'));
			self.isShown = false;
			//ui.mask.close();
			document.body.classList.remove($.className('dtpicker-active-for-page'));
			//处理物理返回键
			$.back=self.__back;
		},
		toggle: function(){
			var self = this;
			self.isShown ? self.hide() : self.show();
		},
		dispose: function() {
			var self = this;
			self.hide();
			setTimeout(function() {
				self.ui.picker.parentNode.removeChild(self.ui.picker);
				for (var name in self) {
					self[name] = null;
					delete self[name];
				};
				self.disposed = true;
			}, 300);
		}
	});

	DtPicker.DEFAULTS = {
		show : true
	};
	// Progress PLUGIN DEFINITION
	// =======================

	function Plugin(option, _relatedTarget) {
		console.log("me--- ")
		return this.each(function () {
			var $this   = $(this)
			var data    = $this.data('d6.dtPicker')

			var options = $.extend({}, DtPicker.DEFAULTS, $this.data(), typeof option == 'object' && option)

			if (!data) $this.data('d6.dtPicker', (data = new DtPicker(this, options)))
			if (typeof option == 'string') data[option](_relatedTarget)
			else if (options.show) data.show(_relatedTarget)
		})
	}

	var old = $.fn.dtPicker

	$.fn.dtPicker             = Plugin
	$.fn.dtPicker.Constructor = DtPicker

	// Progress NO CONFLICT
	// =================

	$.fn.dtPicker.noConflict = function () {
		$.fn.dtPicker = old
		return this
	}

		/*
		zeptojs 支持事件作用域，默认dom事件
		可以采用 'click.xxx.xxx'方式绑定，
		解除以 data-api 为命名空间并绑定在文档上的事件 
		$(document).off('.data-api')
	*/
	$(document).on('click.d6.dtPicker.data-api', '[data-toggle="dtPicker"]', function(e){
		var $this = $(this);
		var options = $this.data('d6.dtPicker') ? 'toggle' : {};

		if( $this.is('a') ){
			e.preventDefault();	
		} 

		Plugin.call($this, options, this);
	})

})(Zepto, document);