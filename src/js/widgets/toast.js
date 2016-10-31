/**
 * 显示提示框
 * @param  object  opts 对象属性  
 * opts中的属性
 * [css:"toast-group"      默然样式
 * duration: 2000          动画时间，默认2s
 * meg:"hello world"       提示内容
 * top:'80%'               提示信息位置，默认据上方80%水平居中]
 */
;
(function($, window, undefined) {
	//toast对象
	var Toast = function(opts){
		this.meg = opts.meg;
		this.duration = opts.duration;
		this.top = opts.top;
		this.css = opts.css;
		this.$body = $(document.body);
		this.createToast();
	}
	
	Toast.prototype = { 
		//创建toast
		createToast:function(){
			//存在toast则删除
			if($("#toastJs").length>0){
				return;
			}
			this.divEle = $('<div id="toastJs"></div>');
			this.divEle.addClass(this.css);
			this.divEle.css('top',this.top);
			this.megEle = $('<span></span>');
			this.megEle.text(this.meg);
			this.divEle.append(this.megEle);
			this.$body.append(this.divEle);
			this.showToast();
		},
		//显示toast
		showToast:function(){
			this.divEle.addClass('toast-show');
			this.setTimeout();
		},
		//隐藏toast
		hideToast:function(){
			this.divEle.remove();
		},
		//倒计时关闭
		setTimeout:function(){
			var _this = this;
			setTimeout(function(){
				_this.hideToast();
			},this.duration);
		}
	}
	
	//对象默认参数
	Toast.default={
		//样式
		css:"ui-toast",
		
		//动画时间，默认2s
		duration: 2000,
		
		//提示内容
		meg:"hello world",
		
		//提示信息为准，默认据上方80%水平居中
		top:'80%'
		
	};
	
	//jquery扩展静态方法
	$.showToast = function(opts){
		opts || (opts = {});
		var opts = $.extend({},Toast.default, opts);
		toastObj = new Toast(opts);
	}

})($, window);