/**
 * 显示提示框
 * @param  object  opts 对象属性  
 * opts中的属性
 */
;
(function($, window, undefined) {
	var cssPrefix = $.fx.cssPrefix;//浏览器前缀
	var transitionEnd = $.fx.transitionEnd;
    var translateZ = ' translateZ(0)';
	
	var CLASS_FULLPAGE_ARROW = 'fullpage-arrow',
        CLASS_FULLPAGE_INNER = 'fullPage-inner',
        CLASS_FULLPAGE_PAGE = 'fullpage-page',
        CLASS_STATE_ACTIVE = 'active',
        CLASS_FULLPAGE_DOTS = 'fullpage-dots';
    
    var SELECTOR_FULLPAGE_INNER = '.' + CLASS_FULLPAGE_INNER,
        SELECTOR_FULLPAGE_PAGE = '.' + CLASS_FULLPAGE_PAGE;
    
    var domArrow = '<span class="'+CLASS_FULLPAGE_ARROW+'"><b class="iconfont icon-up-button"></b></span>';
	var domInner = '<div class="'+CLASS_FULLPAGE_INNER+'"></div>';
	
	var domDots = '<div class="' + CLASS_FULLPAGE_DOTS + '"><%= new Array( len + 1 )' +
        '.join("<i></i>") %></div>';
	
	//渲染组件
    var render = function() {
        var _fp = this,
            opts = _fp.opts;
        _fp.curIndex = 0;
        _fp.startY = 0;
        _fp.movingFlag = false;
        opts.der = 0.1;//【？？？？】
        _fp.ref.children().wrapAll(domInner);//给轮播加一层
        _fp._inner = _fp.ref.find(SELECTOR_FULLPAGE_INNER);//找到轮播这层
        _fp._pages = _fp.ref.find(SELECTOR_FULLPAGE_PAGE);//找到单个轮播层
        _fp.pagesLength = _fp._pages.length;//确定有几个轮播page
        opts.dots && initDots.call(_fp);//给页面添加轮播的原点
        update.call(_fp);//设置高度及滚动方式
        _fp.status = 1;
        opts.arrow && (_fp._arrow = $(domArrow).appendTo(_fp.ref));
//      opts.gesture && (opts.loop = false)
    };
    
    var bind = function() {
    	console.log("4444444444");
        var _fp = this,
            opts = _fp.opts;
        if(!opts.isHandSlide){
        	return;
        }
        _fp._inner.on('touchstart', function(e) {
            if (!_fp.status) {
                return 1;
            }
            if (_fp.movingFlag) {
                return 0;
            }

            _fp.startX = e.targetTouches[0].pageX;
            _fp.startY = e.targetTouches[0].pageY;
        });
        _fp._inner.on('touchend', function(e) {
            if (!_fp.status) {
                return 1;
            }
            if (_fp.movingFlag) {
                return 0;
            }
            var sub = (e.changedTouches[0].pageY - _fp.startY) / _fp.height;
            var der = ((sub > 0 && sub > opts.der) || (sub < 0 && sub < -opts.der)) ? sub > 0 ? -1 : 1 : 0;
            _fp.dir = -der // -1 向上 1 向下
            moveTo.call(_fp, _fp.curIndex + der, true);

        });
//      if (opts.gesture) {
//          _fp._inner.on('touchmove', function(e) {
//              if (!_fp.status) {
//                  return 1;
//              }
//              if (_fp.movingFlag) {
//                  _fp.startX = e.targetTouches[0].pageX;
//                  _fp.startY = e.targetTouches[0].pageY;
//                  return 0;
//              }
//
//              var y = e.changedTouches[0].pageY - _fp.startY;
//              if ((_fp.curIndex == 0 && y > 0) || (_fp.curIndex === _fp.pagesLength - 1 && y < 0)) y /= 2;
//              if ((_fp.curIndex == 0 && y > 0) || (_fp.curIndex == _fp.pagesLength - 1 && y < 0)) {
//                  y = 0;
//              }
//              var dist = (-_fp.curIndex * _fp.height + y);
//              _fp._inner.removeClass('anim');
//              _fp._inner.css({
//                  '-webkit-transform': 'translate3d(' + 0 + 'px , ' + dist + 'px , 0px);',
//                  'transform': 'translate3d(' + 0 + 'px , ' + dist + 'px , 0px);'
//              });
//          });
//          e.preventDefault();
//      }else{
        	_fp._inner.on('touchmove', function(e) {
        		e.preventDefault();
        	})
//      }

        // 翻转屏幕提示
        // ==============================      
        // 转屏事件检测
        $(window).on('ortchange', function(evt) {
            _fp.ref.trigger('ortchange');
        });

        _fp._inner.on(transitionEnd,
            $.proxy(tansitionEnd, _fp));
    };

    
    
    var tansitionEnd = function(evt) {
        var _fp = this,
            opts = _fp.opts;
        _fp.ref.trigger('afterChange', [_fp.curIndex]);
    };
    //设置高度及滚动方式
    var update = function() {
    	console.log("777777")
        var _fp = this,
            opts = _fp.opts;
        if (opts.fullPage) {//是否全屏
            $(document.body).css('position', 'absolute');
            $(document.body).height($(window).height());
            _fp.height = $(document.body).height();
        } else {
            _fp.height = _fp.ref.parent().height();
        }
        _fp.ref.height(_fp.height);
        _fp._pages.height(_fp.height);
//      if (!opts.gesture) {
            $.each(_fp._pages, function(index, el) {
                move.call(_fp, index, 0);
            })
            move.call(_fp, _fp.curIndex, 0);
//      }
    };
    
    /*滚动
     * pageNum ：当前页面编号
     */
    var move = function(pageNum, speed) {
    	console.log("88888")
        isMove = true;
        var _fp = this,
            opts = _fp.opts;
        var prePageNum = pageNum - 1 > -1 ? pageNum - 1 : _fp.pagesLength - 1;//前一页
        var nextPageNum = pageNum + 1 < _fp.pagesLength ? pageNum + 1 : 0;//后一页
        if (speed == 0) {//【？？？】
            speed = speedPre = speedNext = 0;
        } else {
            speed = speedPre = speedNext = opts.speed
        }
        if (_fp.dir == 1) { // 【-1 向上 1 向下】
            speedPre = 0;
        } else {
            speedNext = 0;
        }
		
		var pageOffsetTop = 0-_fp._pages[pageNum].offsetTop;
		var preOffsetTop = 0-_fp._pages[prePageNum].offsetTop;
		var nextOffsetTop = 0-_fp._pages[nextPageNum].offsetTop;
		
        if (_fp.pagesLength == 1) {
            _fp._pages[pageNum].style.cssText += cssPrefix + 'transition-duration:' + speed +
                'ms;' + cssPrefix + 'transform: translate(0,' +
                pageOffsetTop + 'px)' + translateZ + ';';
        	
        } else if (_fp.pagesLength == 2) {
        	
            if (typeof _fp.dir === 'undefined') {
                _fp._pages[pageNum].style.cssText += cssPrefix + 'transition-duration:' + speed +
                    'ms;' + cssPrefix + 'transform: translate(0,' +
                    pageOffsetTop + 'px)' + translateZ + ';';
               _fp._pages[nextPageNum].style.cssText += cssPrefix + 'transition-duration:' + 0 +
                    'ms;' + cssPrefix + 'transform: translate(0,' +
                    (nextOffsetTop + _fp.height) + 'px)' + translateZ + ';';
            } else if (_fp.dir == -1) { //向上
                _fp._pages[pageNum].style.cssText += cssPrefix + 'transition-duration:' + 0 +
                    'ms;' + cssPrefix + 'transform: translate(0,' +
                    (pageOffsetTop + _fp.height) + 'px)' + translateZ + ';';
                _fp._pages[prePageNum].style.cssText += cssPrefix + 'transition-duration:' + speed +
                    'ms;' + cssPrefix + 'transform: translate(0,' +
                    (preOffsetTop - _fp.height) + 'px)' + translateZ + ';';
                _fp._pages[pageNum].style.cssText += cssPrefix + 'transition-duration:' + speed +
                    'ms;' + cssPrefix + 'transform: translate(0,' +
                    pageOffsetTop + 'px)' + translateZ + ';';
//				
            } else if (_fp.dir == 1) { //向下
                _fp._pages[pageNum].style.cssText += cssPrefix + 'transition-duration:' + 0 +
                    'ms;' + cssPrefix + 'transform: translate(0,' +
                    (pageOffsetTop - _fp.height - _fp.height) + 'px)' + translateZ + ';';
                _fp._pages[prePageNum].style.cssText += cssPrefix + 'transition-duration:' + speed +
                    'ms;' + cssPrefix + 'transform: translate(0,' +
                    (preOffsetTop + _fp.height) + 'px)' + translateZ + ';';
                _fp._pages[pageNum].style.cssText += cssPrefix + 'transition-duration:' + speed +
                    'ms;' + cssPrefix + 'transform: translate(0,' +
                    pageOffsetTop + 'px)' + translateZ + ';';
            	
            }
        } else {
            _fp._pages[prePageNum].style.cssText += cssPrefix + 'transition-duration:' + speedPre +
                'ms;' + cssPrefix + 'transform: translate(0,' +
                (preOffsetTop - _fp.height) + 'px)' + translateZ + ';';
            _fp._pages[pageNum].style.cssText += cssPrefix + 'transition-duration:' + speed +
                'ms;' + cssPrefix + 'transform: translate(0,' +
                pageOffsetTop + 'px)' + translateZ + ';';
            _fp._pages[nextPageNum].style.cssText += cssPrefix + 'transition-duration:' + speedNext +
                'ms;' + cssPrefix + 'transform: translate(0,' +
                (nextOffsetTop + _fp.height) + 'px)' + translateZ + ';';
//      	
        }
    };
    
    var moveTo = function(next, anim) {
        var _fp = this,
            opts = _fp.opts;
        var cur = _fp.curIndex;

        next = fix.call(_fp, next, _fp.pagesLength, opts.loop);

        if (anim) {
            _fp._inner.addClass('anim');
        } else {
            _fp._inner.removeClass('anim');
        }

        if (next !== cur) {
            _fp.ref.trigger('beforeChange', [cur, next]);
        } else {
            return;
        }

        _fp.movingFlag = true;
        _fp.curIndex = next;
//      if (!opts.gesture) {
            move.call(_fp, next);
//      } else {
//          _fp._inner.css({
//              '-webkit-transform': 'translate3d(' + 0 + 'px , ' + (-next * _fp.height) + 'px , 0px);',
//              'transform': 'translate3d(' + 0 + 'px , ' + (-next * _fp.height) + 'px , 0px);'
//          });
//      }

        if (next !== cur) {
            _fp.ref.trigger('change', [cur, next]);
        }

        window.setTimeout(function() {
            _fp.movingFlag = false;
            if (next !== cur) {
                _fp._pages.removeClass('active').eq(next).addClass('active');
                opts.dots && updateDots.apply(_fp, [next, cur]);
            }
        }, opts.speed + 100);

        return this;
    };
	
	var fix = function(cur, pagesLength, loop) {
        var _fp = this;
        if (cur < 0) {
            return !!loop ? pagesLength - 1 : 0;
        }

        if (cur >= pagesLength) {
            if (!!loop) {
                return 0;
            } else {
                return pagesLength - 1;
            }
        }


        return cur;
    };
	
    //给页面添加轮播的原点
    var initDots = function() {
    	console.log("5555555")
        var _fp = this,
            opts = _fp.opts;

        var dots = _fp.parseTpl(domDots, {
            len: _fp.pagesLength
        });
        dots = $(dots).appendTo(_fp.ref[0]);

        _fp._dots = dots.children().toArray();

        updateDots.call(_fp, _fp.curIndex);
    };
    
    /**
     * 更新dots
     */
    var updateDots = function(to, from) {
    	console.log("66666")
        var _fp = this,
            dots = _fp._dots;
        typeof from === 'undefined' || $(dots[from % _fp.pagesLength]).removeClass(CLASS_STATE_ACTIVE);
        $(dots[to % _fp.pagesLength]).addClass(CLASS_STATE_ACTIVE);
    };
    
	define(function($ui){
		var $fullpage = $ui.define('Fullpage', {
            loop: false,//循环
//          gesture: false,//是否滑动
            isHandSlide:true,//是否手动滑
            dots: false,//是否要圆点
            arrow: false,//是否要底部图标
            fullPage: true,//是否整屏
            speed: 500//自动跳转频率
        });
        //初始化
        $fullpage.prototype.init = function() {
        	console.log("222222");
            render.call(this);
            bind.call(this);
        };
        
        $.extend($fullpage.prototype, {
            start: function() {
                this.status = 1;
                return this;
            },
            stop: function() {
                this.status = 0;
                return this;
            },
            moveTo: function(next) {
                moveTo.call(this, next, true);
                return this;
            },
            prev: function() {
                this.moveTo(this.curIndex - 1);
                return this;
            },
            next: function() {
                this.moveTo(this.curIndex + 1);
                return this;
            },
            getCurIndex: function() {
                return this.curIndex;
            }
        });
        
        //注册$插件
        $.fn.fullpage = function(opts) {
        	console.log("1111111111");
            var fullpageObjs = [];
            opts || (opts = {});
            this.each(function() {
                var fullpageObj = null;
                var id = this.getAttribute('data-fullpage');
                if (!id) {
                    opts = $.extend(opts, {
                        ref: this
                    });
                    id = ++$ui.uuid;
                    fullpageObj = $ui.data[id] = new $fullpage(opts);
                    this.setAttribute('data-fullpage', id);
                } else {
                    fullpageObj = $ui.data[id];
                }
                fullpageObjs.push(fullpageObj);
            });
            return fullpageObjs.length > 1 ? fullpageObjs : fullpageObjs[0];
        };
	})
})($, window);