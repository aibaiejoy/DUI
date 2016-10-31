/**
 * @cname 绑定下行模板使用
 * 初始化：$('.ui-generate').generate();
 * 事件：toggle
    $('.ui-generate').on('toggle', function(e) {
        //e.detail 为事件派发传递的参数。
        console.log(e.detail);
    })
 */
;(function() {
    

    var Generate = $.Generate = $.Class.extend({
        init: function(element, options){
            var self = this;
            options.config = options.config || {};
            this.element = element;
            self.$element = $(element);
            self.method = options.config.method;
            self.tempStr = self.tempStr || self.$element.html().replace(/type=["']template["']/, '');
            self.$element.empty();
            
            self.options = options;
            self.currentPage = 0;

            if(options.refresh){
                self.bindEvent();
                self.$list = $("<div class='J_generate_list'></div>");
                self.$element.append(self.$list);
                self.$element.refresh(options.refresh);
            }

            self.update('append');
        },

        update: function(type, result, callback){
            var self = this;
            var options = self.options;
            options.data = options.data || {};
            options.data.page = {
                nowpage: type == 'prepend' ? 0 : self.currentPage //当前页
            }

            var success = function(data) {
                var nomore = data.nomore || !data.data.length;
                //提供一个接口，用户可以修改后台返回的数据
                var data = options.parse ? options.parse(data.data) : data.data;
                var tempStr = self.buildTemp(self.tempStr, data);
                var args = self.buildArgs(data);

                if(!nomore && type == "append"){
                    self.currentPage++;
                }

                var build = _.template(tempStr);
                var text = build(args);
                
                if(options.refresh){
                    self.$list[type](text);
                }else{
                    self.$element[type](text);    
                }
                callback && callback.call(self, nomore)     
            }
            if(!options.result && !result){
                $[self.method]({
                    config:options.config,
                    data: options.data,
                    success: success,
                    errors: options.errors
                })    
            }else{
                success(result || options.result)
            }
            

            /*var data = {
                "result": 0,
                "nomore" : false,
                "data": [{
                    "id": 0,
                    "name": "update",
                    "des" : "<h1>des描述</h1>",
                    "notes": "你好案说法6666",
                    "imgurl" : "img/1.jpg",
                    "time" : $.formatDateToString(new Date())

                }, {
                    "id": 0,
                    "name": "李颖",
                    "notes": "噶发",
                    "imgurl" : "img/2.jpg"
                }]
            }
            var nomore = data.nomore;
            var data = data.data;
            var tempStr = self.buildTemp(self.tempStr, data);
            var args = self.buildArgs(data);

            if(!nomore && type == "append"){
                self.currentPage++;
            }

            var build = _.template(tempStr);
            var text = build(args);
            
            if(options.refresh){
                self.$list[type](text);
            }else{
                self.$element[type](text);    
            }
            callback && callback.call(self, nomore || !data.length)*/
        },
        //获取下一页数据
        next: function(callback){
            var self = this;
            self.update('append', null, callback);
        },
        //刷新列表，在列表前面追加最新数据
        refresh: function(callback){
            var self = this;
            self.update('prepend', null, callback);
        },

        //绑定下拉刷新组件的下拉和上拉事件
        bindEvent: function(){
            var self = this;
            self.$element.on('pullup', function(e, refresh){
                self.update('append', function(nomore){
                    refresh.endPullupToRefresh(nomore)
                });
            })
            self.$element.on('pulldown', function(e, refresh){
                self.update('prepend', function(nomore){
                    refresh.endPulldownToRefresh(nomore)    
                });
            })
        },

        strToJson: function(str){
            var self = this;
            if(!/\w+:\w+/.test(str)){
                return {};
            }
            var newStr = str.replace(/\s+/, "").replace(/([:,]){1}/g, "\"$1\"");
            return $.parseJSON("{\"" + newStr + "\"}"); 
            
        },

        buildArgs: function(args){
            if($.isPlainObject(args)){
                pre = end = "";
                args = {
                    item : args
                };
            }else if($.isArray(args)){
                args = {
                    list : args
                }
            }
            return args;
        },


        buildTemp : function(tempStr, args){
            var self = this;
            var pre = "<% $.each(list, function(index, item){ %>";
            var end = "<% }) %>";

            $.isPlainObject(args) && (pre = end = "")

            var $temp = $("<div>" + tempStr + "</div>");  //这句对dom结构有要求，必须是个单节点，多节点的话，只能匹配一个

            $temp.find('[ng-model]').map(function(index, item){
                
                var $item = $(item);
                var key = $item.attr("ng-model");
                var config = self.strToJson(key);

                config._html = ( $item.attr("ng-html") || config._html );

                if(config.content){
                    (config._html == "true") ? 
                        ($item.html("<%-item."+ config.content +"%>")) : 
                        ($item.html("<%=item."+ config.content +"%>"))
                }
                
                if(config.src){
                    $item.attr("src", "<%=item."+ config.src + "%>" );
                } 

                if(config.href){
                    $item.attr("href","<%=item."+ config.href + "%>");
                }

                if(config.value){
                    $item.attr("value","<%=item."+ config.value + "%>");
                }
            })
            return pre + $temp.html().replace(/&lt;%/g, "<%").replace(/%&gt;/g, "%>") + end;
        }    
    })

    Generate.DEFAULTS = {
    };
    // PLUGIN DEFINITION
    // =======================

    function Plugin(option, _relatedTarget, args1, args2) {
        return this.each(function () {
            var $this   = $(this)
            var data    = $this.data('d6.generate')

            var options = $.extend({}, Generate.DEFAULTS, $this.data(), typeof option == 'object' && option)

            if (!data) $this.data('d6.generate', (data = new Generate(this, options)))
            if(typeof option == 'string'){ data[option](_relatedTarget, args1, args2) }
        })
    }

    var old = $.fn.generate

    $.fn.generate             = Plugin
    $.fn.generate.Constructor = Generate
    
    // NO CONFLICT
    // =================

    $.fn.generate.noConflict = function () {
        $.fn.generate = old
        return this
    }


})();


