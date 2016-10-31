/**
 * @cname ui-switch组件
 * 初始化：$('.ui-switch').switch();
 * 事件：toggle
    $('.ui-switch').on('toggle', function(e) {
        //e.detail 为事件派发传递的参数。
        console.log(e.detail);
    })
 */
;(function() {
    var CLASS_SWITCH = 'ui-switch',
        CLASS_SWITCH_HANDLE = 'switch-handle',
        CLASS_ACTIVE = 'switch-active',
        CLASS_DRAGGING = 'switch-dragging',
        CLASS_DISABLED = 'switch-disabled',

        SELECTOR_SWITCH_HANDLE = '.' + CLASS_SWITCH_HANDLE;

    var handle = function(event, target) {
        if (target.classList && target.classList.contains(CLASS_SWITCH)) {
            return target;
        }
        return false;
    };

    //渲染
    var render = function() {
        var self = this,
            opts = self.opts || {},
            element = self.element;
        self._handle || (self._handle = element.querySelector(SELECTOR_SWITCH_HANDLE));
        opts.toggleWidth = element.offsetWidth;
        opts.handleWidth = self._handle.offsetWidth;
        opts.handleX = opts.toggleWidth - opts.handleWidth - 3;

        self.opts = opts;
    };

    //绑定事件
    var bind = function() {
        var self = this,
            opts = self.opts,
            $element = $(self.element);

        $element.on(self.touchStart, $.proxy(handleEvent, self));
        $element.on('drag', $.proxy(handleEvent, self));
        $element.on('swiperight', $.proxy(handleEvent, self));
        $element.on(self.touchEnd, $.proxy(handleEvent, self));
        $element.on('touchcancel', $.proxy(handleEvent, self));
    };


    var handleEvent = function(evt) {
        var self = this,
            opts = self.opts;

        if (self.element.classList.contains(CLASS_DISABLED)) {
            return;
        }
        switch (evt.type) {
            case 'touchstart':
            case 'mousedown':
                start.call(self, evt);
                break;
            case 'drag':
                drag.call(self, evt);
                break;
            case 'swiperight':
                swiperight.call(self, evt);
                break;
            case 'touchend':
            case 'touchcancel':
            case 'mouseup':
                end.call(self, evt);
                break;
        }
    };

    var start = function(evt) {
        var self = this,
            opts = self.opts || {};
            
        self.element.classList.add(CLASS_DRAGGING);
        if (opts.toggleWidth === 0 || opts.handleWidth === 0) { //当switch处于隐藏状态时，width为0，需要重新初始化
            render.call(self);
        }
    };
    var drag = function(evt) {
        var self = this,
            opts = self.opts || {},
            detail = evt.detail;
        if (!opts.isDragging) {
            if (detail.direction === 'left' || detail.direction === 'right') {
                opts.isDragging = true;
                opts.lastChanged = undefined;
                opts.initialState = self.element.classList.contains(CLASS_ACTIVE);
            }
        }
        if (opts.isDragging) {
            setTranslateX.call(self, detail.deltaX);
            evt.stopPropagation();
            detail.gesture.preventDefault();
        }

        self.opts = opts;
    };
    var swiperight = function(evt) {
        var self = this,
            opts = self.opts || {};
        if (opts.isDragging) {
            evt.stopPropagation();
        }
    };
    var end = function(evt) {
        var self = this,
            opts = self.opts || {},
            element = self.element;
        element.classList.remove(CLASS_DRAGGING);
        if (opts.isDragging) {
            opts.isDragging = false;
            evt.stopPropagation();
            var active = element.classList.contains(CLASS_ACTIVE);
            $.trigger(element, 'toggle', active);
        } else {
            self.toggle();
        }
    };

    var setTranslateX = $.animationFrame(function(x) {
        var self = this,
            opts = self.opts || {},
            classList = self.element.classList;
        if (!opts.isDragging) {
            return;
        }
        var isChanged = false;
        if ((opts.initialState && -x > (opts.handleX / 2)) || (!opts.initialState && x > (opts.handleX / 2))) {
            isChanged = true;
        }
        if (opts.lastChanged !== isChanged) {
            if (isChanged) {
                self._handle.style.webkitTransform = 'translate3d(' + (opts.initialState ? 0 : opts.handleX) + 'px,0,0)';
                classList[opts.initialState ? 'remove' : 'add'](CLASS_ACTIVE);
            } else {
                self._handle.style.webkitTransform = 'translate3d(' + (opts.initialState ? opts.handleX : 0) + 'px,0,0)';
                classList[opts.initialState ? 'add' : 'remove'](CLASS_ACTIVE);
            }
            opts.lastChanged = isChanged;
        }

    });

    var Switch = $.Switch = $.Class.extend({
        init: function(element, options){

            this.element = element;
            this.$element = $(element);

            render.call(this);
            bind.call(this);
        },

        toggle : function() {
            var self = this,
                opts = self.opts || {},
                classList = self.element.classList;

            if (classList.contains(CLASS_ACTIVE)) {
                classList.remove(CLASS_ACTIVE);
                self._handle.style.webkitTransform = 'translate3d(0,0,0)';
            } else {
                classList.add(CLASS_ACTIVE);
                self._handle.style.webkitTransform = 'translate3d(' + opts.handleX + 'px,0,0)';
            }
            var active = classList.contains(CLASS_ACTIVE);

            $.trigger(self.element, 'toggle', active);
            return self;
        }
    })

    Switch.DEFAULTS = {
    };
    // PLUGIN DEFINITION
    // =======================

    function Plugin(option, _relatedTarget) {
        return this.each(function () {
            var $this   = $(this)
            var data    = $this.data('d6.switch')

            var options = $.extend({}, Switch.DEFAULTS, $this.data(), typeof option == 'object' && option)

            if (!data) $this.data('d6.switch', (data = new Switch(this, options)))
            if (typeof option == 'string') data[option](_relatedTarget)
        })
    }

    var old = $.fn.switch

    $.fn.switch             = Plugin
    $.fn.switch.Constructor = Switch

    // NO CONFLICT
    // =================

    $.fn.switch.noConflict = function () {
        $.fn.switch = old
        return this
    }


})();