/**
 * 显示提示框
 * @param  object  opts 对象属性  
 */
;
(function($, window, undefined) {
	//toast对象
	var PathMenu = function(ele,opts){
		console.log(opts);
		this.$ele = $(ele);
		this.opts  = $.extend({}, PathMenu.DEFAULTS, opts);
		this.$parent = this.$ele.parent();
		this.$liChild = this.$ele.next().find("li *");
		this.$li = this.$ele.next().find("li");
		if (this.opts.toggle) this.toggle();
		
		this.$parent.on('click', $.proxy(function(e){	
			if(e.target == e.currentTarget){
				this.hide(-1);
			}
		}, this));
		
		this.$liChild.on('click', $.proxy(function(e){
			if(e.target == e.currentTarget){
				var num =$(e.target).parent().index()+1;
				this.hide(num);
			}
		}, this));
		
		this.$li.on('click', $.proxy(function(e){
			if(e.target == e.currentTarget){
				var num =$(e.target).index()+1;
				this.hide(num);
			}
		}, this));
	}
	//对象默认参数
	PathMenu.DEFAULTS={
		
		//是否显示，默认true显示
		toggle: false
	}; 
	
	//显示
	PathMenu.prototype.show = function(){
		this.$parent.addClass('active');
		this.$ele.prop("checked", true);
		this.isShown = true;
		var startEvent = $.Event('pathMenu:show')
        this.$ele.trigger(startEvent)
	};
	//隐藏
	PathMenu.prototype.hide = function(num){
		this.$parent.removeClass('active');
		
		this.$ele.prop("checked", false);
		this.isShown = false;
		var startEvent = $.Event('pathMenu:hide')
        this.$ele.trigger(startEvent,num);
	};
	PathMenu.prototype.toggle = function() {
    	//通过内容类样式判断是否隐藏
        if(this.isShown){
        	this.hide(0);
        }else{
        	this.show();
        }
   	};
	function Plugin(option){
		return this.each(function () {  
	    	var $this   = $(this);
            var data = $this.data('d6.pathMenu');
            var options = $.extend({}, PathMenu.DEFAULTS, $this.data(), typeof option == 'object' && option)
            if (!data && options.toggle && /show|hide/.test(option)) options.toggle = false
            if (!data) { $this.data('d6.pathMenu', (data = new PathMenu(this, options))) }
            if (typeof option == 'string') data[option]()
	  	}) 
	};
	
	var old =  $.fn.pathMenu ;

	$.fn.pathMenu = Plugin;
	
	 // 执行该函数，恢复原先的button定义，并返回Bootstrap定义的button插件  
	$.fn.pathMenu.noConflict = function () {  
	    $.fn.pathMenu = old ;
	    return this  ;
	}  
	
	$(document).on('click.d6.pathMenu.data-api','[data-toggle="pathmenuBtn"]', function (e) {  
        var $this = $(this);
        var href = $this.attr('href');
        var $target = $($this.attr('data-target') || (href && href.replace(/.*(?=#[^\s]+$)/, '')));
		var option = $target.data('d6.pathMenu') ? 'toggle' : $.extend({ remote: !/#/.test(href) && href}, $target.data(), $this.data());
        Plugin.call($target, option);
	}) 
})($, window);