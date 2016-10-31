/*
	使用data参数初始化
	<a href="" class="ui-btn" data-toggle="dialog" data-show="true" data-target=".ui-dialog-blue"> 弹窗 </a>

	使用js初始化
	dialog 参数
	show:true|false 默认是否直接显示
	方法：
	show：$(".ui-dialog").dialog('show')
	hide: $(".ui-dialog").dialog('hide')

	事件：
	dialog:cancel 点击取消
	dialog:jump 点击跳转
	dialog:confirm 点击确认
	dialog:show 当dialog显示后触发, 回调函数中除了事件对象event，还有{relatedTarget:指向点击的button}
	dialog:hide 当dialog隐藏后触发
*/

+function ($){
	'use strict';

	var Dialog = $.Dialog = $.Class.extend({
		init: function(element, options){
			this.options = options;
			this.$body = $(document.body);
			this.$element = $(element);
			this.$panel = this.$element.find('.dialog-panel');
			this.$btns = this.$element.find('.dialog-btn');

			this.$element.on('click', $.proxy(function(e){
				if(e.target == e.currentTarget){
					this.hide();
				}
			}, this));

			this.$btns.on('click', $.proxy(function(e){
				var data = $(e.currentTarget).data();
				this.$element.trigger("dialog:" + data.action);
			}, this))
		}, 
		show : function(_relatedTarget){
			this.$element.removeClass('fade');
			this.isShown = true;
			this.$element.trigger("dialog:show", { relatedTarget: _relatedTarget });
		},

		hide : function(_relatedTarget){
			this.$element.addClass('fade')
			this.isShown = false;
			this.$element.trigger("dialog:hide", { relatedTarget: _relatedTarget });
		},

		toggle : function(_relatedTarget){
			if(this.isShown){
				this.hide(_relatedTarget);
			}else{
				this.show(_relatedTarget);
			}
		}
	})

	Dialog.DEFAULTS = {
		show : true
	}

	function Plugin(option, _relatedTarget){

		return this.each(function(){
			var $this = $(this);
			var data = $this.data('d6.dialog')
			var options = $.extend({}, Dialog.DEFAULTS, $this.data(), typeof option == 'object' && option);

			if(!data) $this.data('d6.dialog', (data = new Dialog(this, options)));
			if(typeof option == 'string'){ 
				data[option](_relatedTarget)
			}else if(options.show){
				data.show(_relatedTarget)
			}
		})
	}

	var old = $.fn.dialog;

	$.fn.dialog = Plugin;
	$.fn.dialog.Constructor = Plugin;

	// conflict

	$.fn.dialog.noConflict = function(){
		$.fn.dialog = old;
		return this;
	}

	/*
		zeptojs 支持事件作用域，默认dom事件
		可以采用 'click.xxx.xxx'方式绑定，
		解除以 data-api 为命名空间并绑定在文档上的事件 
		$(document).off('.data-api')
	*/
	$(document).on('click.d6.dialog.data-api', '[data-toggle="dialog"]', function(e){
		var $this = $(this);
		var href = $this.attr('href');
		var $target = $($this.attr('data-target') || (href && href.replace(/.*(?=#[^\s]+$)/, '')));
		var option = $target.data('d6.dialog') ? 'toggle' : $.extend({ remote: !/#/.test(href) && href}, $target.data(), $this.data());

		if( $this.is('a') ){
			e.preventDefault();	
		} 

		Plugin.call($target, option, this);
	})

}(Zepto);