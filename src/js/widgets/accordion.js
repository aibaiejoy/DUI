+(function($) {
    'use strict';
    /*
        time:2016-07-15
        author:maweichao
        desc:手风琴
     */
    //方法
    var methods = {

    };

    //定义构造  
    var Collapse = function(ele, opt) {
        this.$ele = $(ele);

        this.options = $.extend({}, Collapse.defaults, opt);
        //获取触发元素有时候是空
        this.$trigger = $('[data-toggle="collapse"][href="#' + ele.id + '"],' + '[data-toggle="collapse"][data-target="#' + ele.id + '"]')
        this.transitioning = null
            //如果选项里边设置了parent就设置直接调否者初始化元素样式
        if (this.options.parent) {
            this.$parent = this.getParent()
        } else {
            this.addAriaAndCollapsedClass(this.$ele, this.$trigger)
        }
        if (this.options.toggle) this.toggle()
    };

    //版本号
    Collapse.v = '3.3.6';
    Collapse.defaults = {
        toggle: false
    };
    Collapse.prototype.toggle = function() {
        //通过内容类样式判断是否隐藏
        this[this.$ele.hasClass('active') ? 'hide' : 'show']();
    };
    Collapse.prototype.show = function() {
        if (this.transitioning || this.$ele.hasClass('active')) return
            //var actives = this.$parent && this.$parent.children(".ui-accordion-li-content")
            // debugger;
        var startEvent = $.Event('show:collapse')
        this.$ele.trigger(startEvent)
        if (startEvent.isDefaultPrevented()) return

        this.$trigger.addClass("ui-accordion-li-link-active");
        this.$ele.addClass("active");
        /* function complete() {
            this.$trigger.addClass("ui-accordion-li-link-active");
            this.$ele.addClass("active").trigger('show:collapse');
        }
         if(!$.support.transition) return complete.call(this);*/
    };

    Collapse.prototype.hide = function() {
        if (this.transitioning || !this.$ele.hasClass('active')) return
        var startEvent = $.Event('hide:collapse')
        this.$ele.trigger(startEvent);
        if (startEvent.isDefaultPrevented()) return
        this.$trigger.removeClass("ui-accordion-li-link-active");
        this.$ele.removeClass("active");

    };
    
    Collapse.prototype.addAriaAndCollapsedClass = function($ele, $trigger) {
        //根据内容统一触发元素口径
        var isOpen = $ele.hasClass("active")
        $ele.attr('status', isOpen)
        $trigger.toggleClass('ui-accordion-li-link-active', !isOpen).attr('status', isOpen)
    };

    Collapse.prototype.getParent = function() {
        //获取父亲元素

    };
    
    function Plugin(option) {
        this.each(function() {
            var $this = $(this)
            var data = $this.data('dt.collapse');
            var options = $.extend({}, Collapse.defaults, $this.data(), typeof option == 'object' && option)
            if (!data && options.toggle && /show|hide/.test(option)) options.toggle = false
            if (!data) { $this.data('dt.collapse', (data = new Collapse(this, options))) }
            if (typeof option == 'string') data[option]()
        });
    };

    // 将原先的button插件对象赋值给一个临时变量old  
    var oldplug = $.fn.collapse;

    $.fn.collapse = Plugin;

    //手动暴漏collapse构造以便外部使用
    $.fn.collapse.Constructor = Collapse;

    // 执行该函数，恢复原先的collapse定义，并返回之前定义的collapse插件  
    $.fn.collapse.noConflict = function() {
        $.fn.Collapse = oldplug;
        return this;
    };

       
    //绑定事件
    $(document)
        .on('tap.dt.collapse.data-api', '[data-toggle="collapse"]', function(e) {
            /*    if (e.preventDefault) {
                    e.preventDefault();
                } else {
                    e.returnValue = false;
                }*/
            var $this = $(this)
            if (!$this.attr('data-target')) e.preventDefault
            var $target = getTargetFormTrigger($this)
            var data = $target.data('dt.collapse')
            var option = data ? 'toggle' : $this.data()
            Plugin.call($target, option)
        })

        
    function getTargetFormTrigger($trigger) {
        //此处是根据触发元素的属性获取内容区域的id并且返回内容容器对象
        var href
        var target = $trigger.attr('data-target') || (href = $trigger.attr('href')) && href.replace(/.*(?=#[^\s]+$)/, '')
        return $(target)
    }
})($);
