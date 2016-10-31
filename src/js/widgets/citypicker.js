/**
 * 弹出选择列表插件
 * 依赖： picker.js
 * varstion 1.0.1
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

	var panelBuffer = '<div class="ui-citypicker">\
		<div class="ui-citypicker-header">\
			<button class="ui-btn ui-citypicker-btn-cancel">取消</button>\
			<button class="ui-btn ui-btn-blue ui-citypicker-btn-ok">确定</button>\
			<div class="ui-citypicker-clear"></div>\
		</div>\
		<div class="ui-citypicker-body">\
		</div>\
	</div>';

	var pickerBuffer = '<div class="ui-picker">\
		<div class="ui-picker-inner">\
			<div class="ui-pciker-rule ui-pciker-rule-ft"></div>\
			<ul class="ui-pciker-list">\
			</ul>\
			<div class="ui-pciker-rule ui-pciker-rule-bg"></div>\
		</div>\
	</div>';

	//定义弹出选择器类
	var CityPicker = $.CityPicker = $.Class.extend({
		//构造函数
		init: function(element, options) {
			var self = this;

			self.element = element;

			self.options = options || {};
			self.options.buttons = self.options.buttons || ['取消', '确定'];
			self.panel = $.dom(panelBuffer)[0], document.body.appendChild(self.panel);
			options.theme && self.panel.classList.add(options.theme);

			self.ok = self.panel.querySelector('.ui-citypicker-btn-ok');
			self.cancel = self.panel.querySelector('.ui-citypicker-btn-cancel');
			self.body = self.panel.querySelector('.ui-citypicker-body');
			self.mask = $.createMask && $.createMask();
			self.cancel.innerText = self.options.buttons[0];
			self.ok.innerText = self.options.buttons[1];

			self.dataArray = options.dataArray || ( options.layer == 3 ? cityData3 : cityData ); 

			self.cancel.addEventListener('tap', function(event) {
				self.hide();
			}, false);
			self.ok.addEventListener('tap', function(event) {
				$.trigger(element, 'ok', self.getSelectedItems());
			}, false);
			/*self.mask[0].addEventListener('tap', function() {
				self.hide();
			}, false);*/
			self._createPicker();

			self.setData(self.dataArray)
			//防止滚动穿透
			self.panel.addEventListener('touchstart', function(event) {
				event.preventDefault();
			}, false);
			self.panel.addEventListener('touchmove', function(event) {
				event.preventDefault();
			}, false);
		},
		_createPicker: function() {
			var self = this;
			var layer = self.options.layer || 1;
			var width = (100 / layer) + '%';
			self.pickers = [];
			for (var i = 1; i <= layer; i++) {
				var pickerElement = $.dom(pickerBuffer)[0];
				pickerElement.style.width = width;
				self.body.appendChild(pickerElement);
				var picker = $(pickerElement).picker();
				self.pickers.push(picker);
				pickerElement.addEventListener('change', function(event) {
					var nextPickerElement = this.nextSibling;
					if (nextPickerElement && nextPickerElement.picker) {
						var eventData = event.detail || {};
						var preItem = eventData.item || {};
						nextPickerElement.picker.setItems(preItem.children);
					}
				}, false);
			}
		},
		//填充数据
		setData: function(data) {
			var self = this;
			data = data || [];
			self.pickers[0].setItems(data);
		},
		//获取选中的项（数组）
		getSelectedItems: function() {
			var self = this;
			var items = [];
			for (var i in self.pickers) {
				var picker = self.pickers[i];
				items.push(picker.getSelectedItem() || {});
			}
			return items;
		},
		//显示
		show: function() {
			var self = this;
			//self.mask.show();
			document.body.classList.add($.className('citypicker-active-for-page'));
			self.panel.classList.add($.className('active'));
			//处理物理返回键
			self.__back = $.back;
			$.back = function() {
				self.hide();
			};
			self.isShow = true;
		},
		//隐藏
		hide: function() {
			var self = this;
			if (self.disposed) return;
			self.panel.classList.remove($.className('active'));
			//self.mask.close();
			document.body.classList.remove($.className('citypicker-active-for-page'));
			//处理物理返回键
			$.back=self.__back;
			self.isShow = false;
		},
		toggle: function(){
			var self = this;
			if(self.isShow){
				self.hide();
			}else{
				self.show();
			}
		},
		dispose: function() {
			var self = this;
			self.hide();
			setTimeout(function() {
				self.panel.parentNode.removeChild(self.panel);
				for (var name in self) {
					self[name] = null;
					delete self[name];
				};
				self.disposed = true;
			}, 300);
		}
	});

	CityPicker.DEFAULTS = {
		show : true
	};
	// Progress PLUGIN DEFINITION
	// =======================

	function Plugin(option, _relatedTarget) {
		return this.each(function () {
			var $this   = $(this)
			var data    = $this.data('d6.cityPicker')

			var options = $.extend({}, CityPicker.DEFAULTS, $this.data(), typeof option == 'object' && option)

			if (!data) $this.data('d6.cityPicker', (data = new CityPicker(this, options)))
			if (typeof option == 'string') data[option](_relatedTarget)
			else if (options.show) data.show(_relatedTarget)
		})
	}

	var old = $.fn.cityPicker

	$.fn.cityPicker             = Plugin
	$.fn.cityPicker.Constructor = CityPicker


	// Progress NO CONFLICT
	// =================

	$.fn.cityPicker.noConflict = function () {
		$.fn.cityPicker = old
		return this
	}

		/*
		zeptojs 支持事件作用域，默认dom事件
		可以采用 'click.xxx.xxx'方式绑定，
		解除以 data-api 为命名空间并绑定在文档上的事件 
		$(document).off('.data-api')
	*/
	$(document).on('click.d6.cityPicker.data-api', '[data-toggle="cityPicker"]', function(e){
		var $this = $(this);
		var options = $this.data('d6.cityPicker') ? 'toggle' : {};

		if( $this.is('a') ){
			e.preventDefault();	
		} 

		Plugin.call($this, options, this);
	})

})(Zepto, document);