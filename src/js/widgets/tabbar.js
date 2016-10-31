!(function($) {
    'use strict'
    /*
    time:2016-07-25
    author:maweichao
    desc:tab选项卡，依赖iscroll和slide插件完成
     */
    var methods = {
        isTouchScreen: function() {
            return (('ontouchstart' in window) || window.DocumentTouch && document instanceof DocumentTouch);
        }
    }
    TabBar.v = '1.0.6';
    TabBar.defaults = {
        //选中指定的元素
        active: 0
    };

    function TabBar(ele, opt) {
        this.el = ele;
        this.option = $.extend({}, TabBar.defaults, opt);
        this.init(ele, opt);
    }
    TabBar.prototype.init = function() {
        var _this = this;
        var $el = $(_this.el).addClass('ui-navigator-wrapper'),
            option = _this.option;
        _this.navScroll = new IScroll(_this.el, {
            scrollX: true,
            scrollY: false,
            disableMouse: false,
            disablePointer: true
        })
        var $tabbar = _this.el.$tabbar = $el.find(".tabbar").first();
        _this.el.$bottomLine = $("<div class='btmLine'></div").appendTo($tabbar);
        if ($tabbar.data().target)
            _this.$el_tab =($tabbar.data().target).length > 0 ? $("#" + $tabbar.data().target + "") : undefined;

        if ($el.is('.tabbar')) {
           _this.el = $el.wrap("div").parent()[0];
        }
        if (option.active == undefined) {
            option.active = $tabbar.find('.active').index();
            ~option.active || (option.active = 0);
        }
        //初始化菜单
        _this.swtichTo(option.active);
        //初始化内容
        _this.tabCont();
        $tabbar.on(methods.isTouchScreen ? "tap" : "click", "a.ui-nav-item:not(.active)", function(e) {
            _this.swtichTo($(this).index());
            //调用底部的banner图
            if(_this.slideCont)
            _this.slideCont.slideTo($(this).index(), 1000, false);
        })
    }
    TabBar.prototype.tabCont = function() {
        var _this = this;
        try{
            if (_this.$el_tab.length>0) { 
              _this.slideCont = new Swiper(_this.$el_tab,{ 
                onSlideChangeEnd: function(swiper){
                      _this.swtichTo(swiper.activeIndex)
                }
             });  
          }
        }catch(e){
            console.log("该tabbar没有底部内容");
        }
    }
    TabBar.prototype.slidding = function(index) {
        //根据下标主动选中我要的效果
        var _this=this;
        var left = this.el.$tabbar.offset().left,
            $li = _this.el.$tabbar.find("a.ui-nav-item").removeClass("active").eq(index).addClass("active");
        _this.el.$bottomLine.animate({
            left: $li.offset().left - left,
            width: $li.width()
        }, 200);
        _this.navScroll.scrollToElement($li[0],500);
        _this.el.$tabbar.trigger("switch", { index: index, ele: $li[0] });
    }
    TabBar.prototype.swtichTo = function(index) {
        this.slidding(index);
    }
    var oldplug = $.fn.tabbar;
    function plugin(option) {
        return this.each(function() {
            var $this = $(this)
            var data = $this.data('dt.tabbar')
            var options = $.extend({}, TabBar.defaults, $this.data(), typeof option == 'object' && option)
            if (!data) { $this.data('dt.tabbar', (data = new TabBar(this, options))) }
            if (typeof option == "string") data[oiption]
        })
    }
    $.fn.tabbar = plugin;
    //手动暴漏collapse构造以便外部使用
    $.fn.tabbar.Constructor = TabBar;
    $.fn.collapse.noConflict = function() {
        $.fn.tabbar = oldplug;
        return this;
    };
})($);
