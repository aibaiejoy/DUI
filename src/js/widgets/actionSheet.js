/**
 * 显示提示框
 * @param  object  opts 对象属性  
 * opts中的属性
 */
;
(function($, window, undefined) {
	//Popupmenu对象
	var ActionSheet = function(ele,opts){
		this.$ele = $(ele);
		this.opts  = $.extend({}, ActionSheet.DEFAULTS, opts);
		this.$ul = this.$ele.find('ul');
		this.$li = this.$ele.find('ul li');
		this.$liChild = this.$ele.find("li *");
		this.$cancelBtn = this.$ele.find('div[data-type=cancel-btn]');
		if (this.opts.toggle) this.toggle();
		
		this.$ele.on('click', $.proxy(function(e){
			if(e.target == e.currentTarget){
				this.hide(-1);
			}
		}, this));
		this.$ul.on('click', $.proxy(function(e){
			if(e.target == e.currentTarget){
				this.hide(-1);
			}
		}, this));
		this.$cancelBtn.on('click', $.proxy(function(e){
			if(e.target == e.currentTarget){
				this.hide(0);
			}
		}, this));
		this.$li.on('click', $.proxy(function(e){
			if(e.target == e.currentTarget){
				var num =$(e.target).index()+1;
				this.hide(num);
				return $(e.target).id;
			}
		}, this));
		
		this.$liChild.on('click', $.proxy(function(e){
			if(e.target == e.currentTarget){
				var num =$(e.target).parent().index()+1;
				this.hide(num);
				return $(e.target).id;
			}
		}, this));
	}
	//对象默认参数
	ActionSheet.DEFAULTS={
		
		//是否显示，默认true显示
		toggle: false
	}; 
	
	//显示
	ActionSheet.prototype.show = function(){
		this.$ele.show().addClass('active').removeClass('inactive');
		this.isShown = true;
		var startEvent = $.Event('actionSheet:show')
        this.$ele.trigger(startEvent)
	};
	//隐藏
	ActionSheet.prototype.hide = function(num){
		$this = this;
		this.$ele.addClass('inactive').removeClass('active');
		setTimeout(function(){
			$this.$ele.hide();
		},300);
		this.isShown = false;
		var startEvent = $.Event('actionSheet:jump')
        this.$ele.trigger(startEvent,num);
	};
	ActionSheet.prototype.toggle = function() {
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
            var data = $this.data('d6.actionSheet');
            var options = $.extend({}, ActionSheet.DEFAULTS, $this.data(), typeof option == 'object' && option)
            if (!data && options.toggle && /show|hide/.test(option)) options.toggle = false
            if (!data) { $this.data('d6.actionSheet', (data = new ActionSheet(this, options))) }
            if (typeof option == 'string') data[option]()
	  	}) 
	};
	
	var old =  $.fn.actionSheet ;

	$.fn.actionSheet = Plugin;
	
	 // 执行该函数，恢复原先的button定义，并返回Bootstrap定义的button插件  
	$.fn.actionSheet.noConflict = function () {  
	    $.fn.actionSheet = old ;
	    return "你好"  ;
	}  
	
	$(document).on('click.d6.actionSheet.data-api','[data-toggle="actionSheet"]', function (e) {  
        var $this = $(this);
        var href = $this.attr('href');
        var $target = $($this.attr('data-target') || (href && href.replace(/.*(?=#[^\s]+$)/, '')));
		var option = $target.data('d6.actionSheet') ? 'toggle' : $.extend({ remote: !/#/.test(href) && href}, $target.data(), $this.data());
        Plugin.call($target, option);
	}) 
})($, window);