!(function($) {
    'use strict'

    function NavSlide(ele, option) {
        this.option = $.extend({}, this.DEFAULTS, option);
        this.el = ele;
        this.init();
    }
    NavSlide.v = '1.0';
    NavSlide.DEFAULTS = {
        direction: "right", //默认是向左滑动
        maxslide: 0,
        nowLeft: 0,
        speed: 500,
    }
    NavSlide.prototype.init = function() {
        var _this = this;
        //滑动宽度赋值
        _this.el.$operation = $(_this.el).find(".operation");
        _this.el.$cont = $(_this.el).find(".cont");
        _this.option.maxslide = _this.el.$operation.width();
        //绑定事件
        _this.bind();
    }
    NavSlide.prototype.bind = function() {
        var _this = this;
         //设定初始位置
        $(_this.el).on("touchstart", '.cont', function(e) {
            //设定初始位置
            /*if (event.preventDefault) {
                    event.preventDefault();
                } else {
                    event.returnValue = false;
                }*/
            _this.option.point_x = e.touches[0].screenX;
            _this.option.point_y = e.touches[0].screenY;

            _this.option.init_x = e.touches[0].screenX;

            _this.option.moveDistance = 0;
        }).on("touchmove", function(e) {

            if (e.touches.length == 1) {
                _this.touchmove(e.touches[0].screenX, e.touches[0].screenY);
            }
        }).on("touchend", function(e) {
            _this.touchend();
        })
    }
    NavSlide.prototype.touchmove = function(x, y) {
        var _this = this,
            change_x = x - (_this.option.point_x === null ? x : _this.option.point_x);
        //保留移动的距离
        _this.option.moveDistance = x - _this.option.init_x //移动的总长度
            //锁定滑动范围以及滑动距离
        if (Math.abs(_this.option.moveDistance) < _this.option.maxslide && (_this.option.direction == "left") ? (_this.option.nowLeft >= -this.option.maxslide && _this.option.nowLeft <= 0) : (_this.option.nowLeft <= this.option.maxslide && _this.option.nowLeft >= 0)) {
            if (Math.abs(_this.option.nowLeft) == this.option.maxslide || Math.abs(_this.option.nowLeft) == 0) {
                //禁止向左滑动
                if ((_this.option.direction == "left") ? Math.abs(_this.option.nowLeft) == this.option.maxslide : _this.option.nowLeft == 0) {
                    if (_this.option.moveDistance > 0)
                        _this.option.nowLeft = _this.option.nowLeft + change_x;
                    else
                        _this.option.moveDistance = 0
                } else {
                    //禁止向右边滑动
                    if (_this.option.moveDistance < 0)
                        _this.option.nowLeft = _this.option.nowLeft + change_x;
                    else
                        _this.option.moveDistance = 0
                }
            } else {
                _this.option.nowLeft = _this.option.nowLeft + change_x;
            }
            _this.option.point_x = x;
            _this.style(false);
        }
    }
    NavSlide.prototype.touchend = function() {
        //判断滑动是否超过所需滑动的四分之一
        var _this = this;
        if (Math.abs(_this.option.moveDistance) > _this.option.maxslide / 4) {
            if (_this.option.direction == "left") {
                _this.option.nowLeft = (_this.option.moveDistance > 0) ? 0 : -_this.option.maxslide;
                $(_this.el).parent().trigger("open", $(_this.el)[0]);
            } else {
                _this.option.nowLeft = (_this.option.moveDistance < 0) ? 0 : _this.option.maxslide;
                $(_this.el).parent().trigger("close", $(_this.el)[0]);
            }
        } else {
            if (_this.option.moveDistance != 0) {
                //打开
                if (_this.option.direction == "left")
                    _this.option.nowLeft = (_this.option.moveDistance > 0) ? -_this.option.maxslide : 0;
                else
                    _this.option.nowLeft = (_this.option.moveDistance < 0) ? _this.option.maxslide : 0;
            }else{
                if(Math.abs(_this.option.nowLeft)==_this.option.maxslide){
                    _this.option.nowLeft =0
                }
            }
        }
        _this.style(true);
    }
    NavSlide.prototype.style = function(isAnimation) {
        var _this = this;
        var time = isAnimation ? _this.option.speed : 0;
        var dict = this.option.nowLeft
        _this.el.$cont.css({
            "-webkit-transitionDuration": time + "ms",
            "-webkit-transform": "translate3d(" + dict + "px,0,0)",
            "-webkit-backface-visibility": "hidden",
            "-webkit-transitionTimingFunction": "ease-in-out",
            "transitionDuration": time + "ms",
            "transform": "translate3d(" + dict + "px,0,0)",
            "transitionTimingFunction": "ease-in-out",
        })
    }

    function Plugin(option, args) {
        return this.each(function() {
            $(this).find("li").each(function() {
                var $this = $(this)
                var data = $this.data('dt.navSlide')
                var options = $.extend({}, NavSlide.DEFAULTS, $this.data(), typeof option == 'object' && option)
                if (!data) $this.data('dt.navSlide', (data = new NavSlide(this, options)))
                if (typeof option == 'string') data[option](args)
            })
        })
    }
    var old = $.fn.navslide
    $.fn.navslide = Plugin
    $.fn.navslide.Constructor = NavSlide
        // Progress NO CONFLICT
        // =================
    $.fn.navslide.noConflict = function() {
        $.fn.navslide = old
        return this
    }

})($)
