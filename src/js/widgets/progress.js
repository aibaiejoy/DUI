+function ($) {
	//'use strict';

	// Progress CLASS DEFINITION
	// ======================

	/*
		方法：setProgress(<length> | <percentage>)
		<length>: 用长度值来定义宽度。不允许负值, 需要带单位
		<percentage>: 用百分比来定义宽度。不允许负值，需要带%号

		$(".progress").progress("setProgress", "30%");

		事件：update(e, data)
		data.percentage 进度的百分比
		data.length 进度的长度值
		$(".progress").on("update", function(e, data){
			console.log(e, data)
		})
	*/

	var Progress = function (element, options) {
		this.options             = options
		this.$body               = $(document.body)
		this.$element            = $(element)
		this.$bar                = this.$element.find(".progress-bar")
		this.$holder 			 = this.$element.find(".progress-holder")
		this.$tip 				 = this.$element.find(".progress-holder-tip")

		this.lastX 				 = this.$bar.css("flexBasis") - 0;  //利用js变量弱类型转换, 转换字符串到数字
		this.countWidth 		 = this.$element.width() - this.$holder.width();

		this.$element
			.on("touchstart", $.proxy(_touchstart, this))
			.on("touchmove", $.proxy(_touchmove, this))
			.on("touchend", $.proxy(_touchend, this)); 
	}
	var _touchstart = function(e){
		this.startX = e.touches[0].clientX;
		return false;
	}
	var _touchmove = function(e){
		var moveX = e.touches[0].clientX;		

		this.lastX += (moveX - this.startX);

		if( this.lastX > this.countWidth){
			this.lastX = this.countWidth;
		}
		if( this.lastX < 0 ){
			this.lastX = 0;
		}
		if( this.lastX <= this.countWidth && this.lastX >= 0){
			this.startX = moveX;
			this.$bar.css({"flexBasis": this.lastX}); 
			this.percentage = parseInt(this.lastX / this.countWidth * 100) + "%";
			this.$tip.text(this.percentage);
		}
		return false; //e.stopPropagation
	}
	var _touchend = function(){
		this.$element.trigger("update", {percentage:this.percentage, "length":this.lastX + "px"});
		return false;
	}

	Progress.VERSION  = '3.3.5'

	Progress.TRANSITION_DURATION = 300
	Progress.BACKDROP_TRANSITION_DURATION = 150

	Progress.DEFAULTS = {
		backdrop: true,
		keyboard: true,
		show: true
	}

	Progress.prototype.setProgress = function (length) {
		var percentageReg = /(^\d+)%$/;
		var percentageNum;
		// 参数为百分比
		if(percentageReg.test(length)){
			this.percentage = length;
			percentageNum = percentageReg.exec(length)[1];
			this.lastX = parseInt(percentageNum/100 * this.countWidth);
		}else{
			this.lastX = parseInt(length.replace("px", ""));
			this.percentage = parseInt(this.lastX / this.countWidth * 100) + "%";
		}

		this.$bar.css({"flexBasis": this.lastX});	
		this.$tip.text(this.percentage);
		return this;
	}


	// Progress PLUGIN DEFINITION
	// =======================

	function Plugin(option, _relatedTarget) {
		
		return this.each(function () {
			var $this   = $(this)
			var data    = $this.data('bs.progress')
			var options = $.extend({}, Progress.DEFAULTS, $this.data(), typeof option == 'object' && option)

			if (!data) $this.data('bs.progress', (data = new Progress(this, options)))
			if (typeof option == 'string') data[option](_relatedTarget)
			/*else if (options.show) data.show(_relatedTarget)*/
		})
	}

	var old = $.fn.progress

	$.fn.progress             = Plugin
	$.fn.progress.Constructor = Progress


	// Progress NO CONFLICT
	// =================

	$.fn.progress.noConflict = function () {
		$.fn.progress = old
		return this
	}

}(Zepto);
