!(function($) {
    "use strict"
    /*
    time:2016-08-02
    author:maweichao
    desc:div容器轮播
     */
    function Slide(ele, option) {
        this.option = $.extend({}, this.defautopt, option)
        this.el = ele
        this.init();
    }
    Slide.v = '1.0';
    Slide.defautopt = {
        //是否循环
        isLoop: false,
        isAutoScroll: false,
        speed: 500,
        index: 0,
        point_x: 0,
        point_y: 0,
        nowLeft: 0,
        waitTime: 3000, //滚动间隔时间
        direction: "left", //默认是向左滑动
        //系统所需变量外部不可配置
        styleType: "none", //circle|square|number|none
        // moveDistance: 0,
        // init_x: 0,
        change_poit:0,
        busy:false,
    }

    Slide.prototype.init = function() {
        var _this = this,
            $ul = _this.el.$ul = $(_this.el).find(".slide-ul"),
            $li = _this.el.$li = $ul.find(".slide-li");
        //判断指定的activ
        _this.option.index = $ul.find("li.active").length > 0 ? $ul.find("li.active").index() : _this.option.index;
        $li.eq(_this.option.index).addClass("active");
        if (_this.option.isLoop) {
            _this.el.$ul.prepend(_this.el.$li.eq(_this.el.$li.length - 1).clone().removeClass("active")).append(_this.el.$li.eq(0).clone().removeClass("active"))
            _this.el.$li = _this.el.$ul.find(".slide-li");
            _this.option.nowLeft = -_this.option.scrollWidth;
            _this.style(false);
        }
        //创建表示页码
        _this.createIndex();
        //绑定事件这块看情况如果需要就写不需要就用外部对象代理事件
        _this.bind();
        //初始化滚动条件 
        _this.patch();

        _this.goPage(_this.option.index);
        //自动
        if (_this.option.isAutoScroll) _this.autoScroll();
    }

    Slide.prototype.createIndex = function() {
        var _this = this;
        if (_this.option.styleType == "circle" || _this.option.styleType == "square" || _this.option.styleType == "number") {
            //创建标识页码
            var ulEl = document.createElement("ul");
            var liEl = document.createElement("li");
            var pageNum = (_this.option.isLoop) ? _this.el.$li.length - 2 : _this.el.$li.length;
            $(ulEl).css({
                width: "100%",
                height: 30,
                position: "absolute",
                zIndex: 1,
                bottom: "15%",
                textAlign: "center",
                // border:"1px solid red"
            });
            //根据不通的配置加载不同的样式
            var degs = { square: "0", circle: "50%", number: "0" };
            $(liEl).css({
                display: "inline-block",
                verticalAlign: "middle",
                margin: "0 3px",
                height: 15,
                width: 15,
                color: "#000",
                borderRadius: degs[_this.option.styleType]
            });
            var liEl_list = {};
            for (var k = 0; k < pageNum; k++) {
                (function(arg) {
                    liEl_list = $(liEl).clone(true).click(
                            function() {
                                _this.goPage(arg);
                            }
                        ) //.text(arg + 1)//.prop("outerHTML"); 
                    liEl_list = _this.option.styleType == "number" ? liEl_list.text(arg + 1) : liEl_list;
                })(k);
                $(ulEl).append(liEl_list);
            }
            $(_this.el).append(ulEl);
            _this.el.$ulEl = $(ulEl);
        }
    }
    Slide.prototype.patch = function() {
        var _this = this;
        //是否超过2个
        if (!_this.el.$li.eq(1).length && _this.el.$li.length > 0 && !_this.option.isLoop) {
            _this.el.$ul.append(_this.el.$li.eq(0).clone().removeClass("active"));
            _this.el.$li = _this.el.$ul.find(".slide-li");
        }
        _this.el.$li.width(_this.option.scrollWidth = document.documentElement.clientWidth);
        _this.el.$ul.width(_this.option.scrollWidth * _this.el.$li.length);
    }
    Slide.prototype.autoScroll = function() {
        var _this = this;
        //clearTimeout(_this.option.timer);
        _this.option.timer = setTimeout(function() {
            _this.option.direction == "left" ? _this.option.index++ : _this.option.index--
            _this.goPage(_this.option.index);
        }, _this.option.waitTime)
    }
    Slide.prototype.goPage = function(index) {
        //需要滚动到指定的页面上
        var _this = this,
            liSize = _this.el.$li.length, 
            scroll_W = _this.option.scrollWidth;
            clearTimeout(_this.option.timer);
             _this.option.busy  = true; 
        if (_this.option.isLoop) {
            //由于循环影响dom结构所以对循环判断
            // 坑爹的循环啊
            var ind = index + 1;
            index = ind < 0 ? liSize - 1 : ind;
            index = ind > liSize - 1 ? 0 : ind;
            _this.option.nowLeft = -(index * scroll_W);
            _this.style(true);
            if (index == liSize - 1) {
                index = 1
                _this.change(index);
            }
            if (index == 0) {
                index = liSize - 2;
                _this.change(index);
            }
            _this.option.index = index - 1;
        } else {
            index = index < 0 ? liSize - 1 : index;
            index = index > liSize - 1 ? 0 : index;
            _this.option.nowLeft = -(index * scroll_W);
            _this.style(true);
            _this.option.index = index;
        }
        _this.el.$li.removeClass("active");
        _this.el.$li.eq(_this.option.index).addClass("active");

        //是否自动
        if (_this.option.isAutoScroll) _this.autoScroll();
        if (_this.option.styleType == "circle" || _this.option.styleType == "square" || _this.option.styleType == "number") {
            _this.el.$ulEl.find("li").css({
                background: _this.option.styleType == "number" ? "transparent" : "#C1C1C1",
                color: "#000"
            });
            $.each(_this.el.$ulEl.find("li"), function(i, j) {
                if (_this.option.index == i) {
                    $(this).css({
                        background: _this.option.styleType == "number" ? "transparent" : "#828282",
                        color: "red"
                    });
                }
            })
        }
         _this.option.busy = false;
    }
    Slide.prototype.change = function(index) {
        var _this = this; 
        _this.option.nowLeft = -(index * _this.option.scrollWidth);
        setTimeout(function() {
            _this.style(false);
            _this.option.busy = false;
             if (_this.option.isAutoScroll) _this.autoScroll();
        }, _this.option.speed);
    }
    Slide.prototype.bind = function() {
        var _this = this;
        $(_this.el).on("touchstart", '.slide-ul', function(e) {
                //设定初始位置
                /* if (event.preventDefault) {
                     event.preventDefault();
                 } else {
                     event.returnValue = false;
                 }*/
                 if (e.touches.length == 1&& !_this.option.busy) {
                    _this.option.point_x = e.touches[0].screenX;
                    _this.option.point_y = e.touches[0].screenY;
                    }

                  _this.stop();
            }).on("touchmove", function(e) {
                if (e.touches.length == 1&& !_this.option.busy) {
                    _this.touchMove(e.touches[0].screenX, e.touches[0].screenY);
                }
            }).on("touchend", function(e) {
                !_this.option.busy &&_this.touchMoveEnd();
                  _this.start();
            })
            //是否横屏
        $(window).on("onorientationchange" in window ? "orientationchange" : "resize", function() {
            _this.patch();
        });
    }
    Slide.prototype.touchMove = function(x, y) {
        var _this = this,
            change_x = x - (_this.option.point_x === null ? x : _this.option.point_x),
            change_y = y - (_this.option.point_y === null ? y : _this.option.point_y);

        //保留移动的距离
        // if (!_this.option.init_x) _this.option.init_x = _this.option.point_x
        // _this.option.moveDistance = x - _this.option.init_x

        _this.option.change_poit=change_x;
       var  marginleft = _this.option.nowLeft;
       var  return_value = false,
        sin=change_y / Math.sqrt(change_x * change_x + change_y * change_y);
         _this.option.nowLeft = marginleft + change_x;

         if(sin > Math.sin(Math.PI / 3) || sin < -Math.sin(Math.PI / 3)) { //滑动屏幕角度范围：PI/3  -- 2PI/3
              return_value = true; //不阻止默认行为
        }
        _this.option.point_x = x;
        _this.option.point_y =y;
        _this.style(false);
        return return_value;
    }
    Slide.prototype.touchMoveEnd = function() {
        //如果滚动小于100px不做任何改变
         var _this = this;
        var changeX = this.now_left % this.width,ind;
            if(_this.option.change_poit != 0) {
                if(_this.option.change_poit<0) { 
                    _this.option.index = _this.option.index+1
                } else {  
                    _this.option.index = _this.option.index-1
                }
            }  
            this.point_x = this.point_y = null;
             _this.goPage(_this.option.index);
             _this.el.$ul.trigger("slide:change", _this.el.$li.eq(_this.option.index)[0]);
            _this.option.change_poit=0;
    }
    Slide.prototype.stop = function() {
        var _this = this;
        clearTimeout(_this.option.timer);
    }
    Slide.prototype.start = function() {
        var _this = this;
        if (_this.option.isAutoScroll) _this.autoScroll();
    }
    Slide.prototype.style = function(isAnimation) {
        var _this = this;
        var time = isAnimation ? _this.option.speed : 0;
        var dict = this.option.nowLeft
        _this.el.$ul.css({
            "-webkit-transitionDuration": time + "ms",
            "-webkit-transform": "translate3d(" + dict + "px,0,0)",
            "-webkit-backface-visibility": "hidden",
            "-webkit-transitionTimingFunction": "ease-in-out",
            "transitionDuration": time + "ms",
            "transform": "translate3d(" + dict + "px,0,0)",
            "transitionTimingFunction": "ease-in-out",
        })
    }

    function plugin(option) {
        return this.each(function() {
            var $this = $(this),
                data = $this.data("dt.slide");
            var options = $.extend({}, Slide.defautopt, $this.data(), typeof option == "object" && option)
            if (!data) { $this.data('dt.slide', (data = new Slide(this, options))) }
            if (typeof option == "string") data[option]()
        });
    }
    var oldplug = $.fn.slide;
    $.fn.slide = plugin;
    $.fn.slide.Constructor = Slide;
    $.fn.slide.noConflict = function() {
        $.fn.slide = oldplug;
        return this;
    };
})($);
