/**
 * 显示提示框
 * @param  object  opts 对象属性  
 * opts中的属性
 */
;
(function($, window, undefined) {
	//Popupmenu对象
	var Popupmenu = function(ele,opts){
		this.$ele = $(ele);
		this.opts  = $.extend({}, Popupmenu.DEFAULTS, opts);
		this.$li = this.$ele.find('ul li');
		if (this.opts.toggle) this.toggle();
		
		this.$ele.on('click', $.proxy(function(e){
			if(e.target == e.currentTarget){
				this.hide(-1);
			}
		}, this));
		
		this.$li.on('click', $.proxy(function(e){
			if(e.target == e.currentTarget){
				this.$li.removeClass('active');
				$(e.target).addClass('active');
				var num =$(e.target).index()+1;
				this.hide(num);
				return $(e.target).id;
			}
		}, this));
	}
	//对象默认参数
	Popupmenu.DEFAULTS={
		
		//是否显示，默认true显示
		toggle: false
	}; 
	
	//显示
	Popupmenu.prototype.show = function(){
		this.$ele.show().addClass('active');
		this.isShown = true;
		var startEvent = $.Event('popupmenu:show')
        this.$ele.trigger(startEvent)
	};
	//隐藏
	Popupmenu.prototype.hide = function(num){
		this.$ele.hide().removeClass('active');
		this.isShown = false;
		var startEvent = $.Event('popupmenu:hide')
        this.$ele.trigger(startEvent,num);
	};
	Popupmenu.prototype.toggle = function() {
    	//通过内容类样式判断是否隐藏
        if(this.isShown){
        	this.hide();
        }else{
        	this.show();
        }
   	};
	function Plugin(option){
		return this.each(function () {  
	    	var $this   = $(this);
            var data = $this.data('d6.popupmenu');
            var options = $.extend({}, Popupmenu.DEFAULTS, $this.data(), typeof option == 'object' && option)
            if (!data && options.toggle && /show|hide/.test(option)) options.toggle = false
            if (!data) { $this.data('d6.popupmenu', (data = new Popupmenu(this, options))) }
            if (typeof option == 'string') data[option]()
	  	}) 
	};
	
	var old =  $.fn.popupmenu ;

	$.fn.popupmenu = Plugin;
	
	 // 执行该函数，恢复原先的button定义，并返回Bootstrap定义的button插件  
	$.fn.popupmenu.noConflict = function () {  
	    $.fn.popupmenu = old ;
	    return this  ;
	}  
	
	$(document).on('click.d6.popupmenu.data-api','[data-toggle="menuBtn"]', function (e) {  
        var $this = $(this);
        var href = $this.attr('href');
        var $target = $($this.attr('data-target') || (href && href.replace(/.*(?=#[^\s]+$)/, '')));
		var option = $target.data('d6.popupmenu') ? 'toggle' : $.extend({ remote: !/#/.test(href) && href}, $target.data(), $this.data());
        Plugin.call($target, option);
	}) 
})($, window);