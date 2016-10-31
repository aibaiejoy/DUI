/**
 * 显示提示框
 * @param type   	类型[1:转圈,2:换位旋转]
 * @param content   提示内容
 * @param time  	关闭倒计时时间
 * @param css  		新的ui
 */
;
(function($, window, undefined) {
	//toast对象
	var Loading = function(opts){
		this.meg = opts.meg;
		this.type = opts.type;
		this.imgCss = 'circularRound'+opts.type;
		this.css = opts.css;
		this.show = opts.show;
		this.duration = opts.duration;
		this.$body = $(document.body);
		this.createLoading();
	}
	
	Loading.prototype = { 
		createLoading:function(){
			//存在toast则删除
			if(!this.show){
				$("#loadingJs").remove();
				return;
			}
			if($("#loadingJs").length>0){
				this.hideLoading();
			}
			this.divEle = $('<div data-type="loading" id="loadingJs"></div>');
			this.divEle.addClass(this.css);
			if(this.type){//有动画
				this.loadingEle = $('<div></div>');
				this.loadingEle.addClass(this.imgCss);
				this.divEle.append(this.loadingEle);
				if(this.type==7){
					this.spotPanelEle = $('<div data-type="spotPanel"></div>');
					this.loadingEle.append(this.spotPanelEle);
					this.spanEle1=$('<span data-type="spotOne"></span>');
					this.spanEle2=$('<span data-type="spotTwo"></span>');
					this.spanEle3=$('<span data-type="spotThree"></span>');
					this.spotPanelEle.append(this.spanEle1);
					this.spotPanelEle.append(this.spanEle2);
					this.spotPanelEle.append(this.spanEle3);
				}
			}
			if(this.meg){//有提示信息
				this.megEle = $('<label></label>');
				this.megEle.text(this.meg);
				this.divEle.append(this.megEle);
			}
			this.$body.append(this.divEle);
			this.showLoading();
		},
		
		//显示
		showLoading:function(){
			this.divEle.addClass('loading-show');
			if(this.duration){
				this.setTimeout();
			}
		},
		
		hideLoading:function(){
			this.divEle.remove();
		},
		
		setTimeout:function(){
			var _this = this;
			setTimeout(function(){
				_this.hideLoading();
			},this.duration);
		}
	}
	
	//初始化变量
	Loading.default = {
		//css样式
		css:"ui-loading",
		
		//是否显示[true显示(默认)，false隐藏]
		show:true,
		
		//动画类型[false(无动画),1,2,3,4,5,6,7]
		type:1,
		
		//提示信息[false:无提示信息]
		meg:'加载中...',
		
		//动画时间[false:表示不自动关闭，用户自己关闭]
		duration:false
	}
	
	$.showLoading = function(opts){
		opts || (opts = {});
		var opts = $.extend({},Loading.default, opts);
		LoadingObj = new Loading(opts);
	}
	
})($, window);