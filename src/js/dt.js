
!(function($) {
	var noMatch = /(.)^/;
	var escapes = {
		"'": "'",
		'\\': '\\',
		'\r': 'r',
		'\n': 'n',
		'\u2028': 'u2028',
		'\u2029': 'u2029'
	};
	var escapeChar = function(match) {
		return '\\' + escapes[match];
	};
	var baseUrl = "";
	//扩展jquery方法
	$.extend($, {
		config: "",
		typeBindFn: {
			"form": function(data) {
				$.formFn(data);
			},
			"listview": function(data) {
				$.listviewFn(data);
			},
		},
		parsing: function(args) {
			//解析配置文件同时存放解析结果
			if(typeof args == "object") this.config = args;
			if(typeof args == "string") this.config = JSON.parse(args);
		},
		getValue: function(name) {
			var $ele = $("*[name=" + name + "]"),
				returnAry = [];
			try {
				switch($ele[0].type) {
					case "file":
						console.log("如果是file的话就做单独处理了，引入第三方插件或者单独实现上传功能，暂时预留");
						break;
					case "checkbox":
						var ckAray = [];
						$ele.each(function(n, m) {
							if(this.checked) ckAray.push($(this).val())
						})
						returnAry = ckAray;
						break;
					case "radio":
						$ele.each(function() {
							if(this.checked) {
								returnAry.push($(this).val());
							}
						})
						break;
					default:
						returnAry.push($ele.val());
						break;
				}
			} catch(e) {
				console.log("匹配dom类型错误，请查证是否有name为" + name + "的dom元素或参数是否包含" + name);
			}
			return returnAry;
		},
		isEmpty: function(obj) {
			if(obj == null) return true;
			for(var i in obj) return false;
			return true;
		},
		where: function(data) {
			//从新拼写where数组对象
			var returnObj = {},
				selectMap = {},
				whereRule = {},
				orderRule = {},
				updateRule = {},
				page = data.page ? data.page : {
					nowpage: 0,
					shownum: 10
				},
				whereData = data.data ? data.data : {},
				_this = this; 
			try {
				try {
					if(this.config.maps.length > 0) {
						$.each(this.config.maps, function() {
							//selectMap[this["entity"]] = this["entity"];
							if(_this.config.method == "update") {
								updateRule[this["entity"]] = whereData[this['dom']] ? whereData[this['dom']] : _this.getValue(this['dom'])[0]
							}
						});
					}
				} catch(e) {
					console.log(e.message);
				}
				if(this.config.where.length > 0) {
					$.each(this.config.where, function(i) {
						var whereKey = "",
							whereVal = "",
							_value = whereData[this['dom']] ? whereData[this['dom']] : _this.getValue(this['dom'])[0];
						whereKey = this["entity"] + " " + this["rOperation"];
						if(_value != "") whereVal = _value;
						if(i != 0&&!$.isEmpty(whereRule)&&this["lOperation"] &&$.trim(whereVal)!= ""&& whereVal != undefined)
						whereKey = " " + this["lOperation"] + " " + whereKey;
						if(this["rOperation"] == "like" && whereVal != "" && whereVal != undefined)
							whereRule[whereKey] = "%" + whereVal + "%";
						else
						if(whereVal != "" && whereVal != undefined) whereRule[whereKey] = whereVal;
					});
				}
				//分页信息
				if(this.config.orderRule && this.config.method == "search") {
					var startPoint = startPoint = ((page.nowpage - 1) * page.shownum - 1) >= 0 ? (page.nowpage - 1) * page.shownum - 1 : 0;
					orderRule = {
						orderRule: {
							"property": this.config.orderRule.property,
							"order": this.config.orderRule.order,
							"limitRule": {
								"limit": startPoint + "," + page.shownum
							}
						}
					}
				}
			} catch(e) {
				console.log(e.message);
			} finally {
				var selectMap = this.config.method == "search" ? {
					selectMap: selectMap
				} : {};
				var whererule = {"1=": 1};
				try {
					whererule = $.isEmpty(whereRule) ? {"1=": 1} : whereRule;
				} catch(e) {
					//跳过
				}
				$.extend(returnObj, selectMap, {
					whereRule: this.config.method == "search" ? whererule : whereRule
				}, orderRule, _this.config.method == "update" ? {
					updateRule: updateRule
				} : {});
			}
				
			return returnObj;
		},
		joining: function(data) {
			//根据dom和配置信息完成字符串的拼接
			var returnObj = {},
				domValObj = {},
				attrValObj = {},
				_this = this;
			if(!this.config.maps) return;
			$.each(this.config.maps, function() {
				var valueAry = _this.getValue(this['dom']);
				var _value = data[this['dom']] ? data[this['dom']] : valueAry.length > 1 ? valueAry.toString() : valueAry[0];
				domValObj[this['dom']] = _value
				attrValObj[this['entity']] = _value;
			});
			$.extend(returnObj, {
				attrDomName: this.config.maps
			}, {
				attrValue: attrValObj
			}, {
				domValue: domValObj
			});
			return attrValObj;
		},
		request: function(sentdata, sc, er) {
			//对开发人员传递过来的data进行解析
			try {
				baseUrl = rd.app.getBaseUrl();
			} catch(e) {
				console.log("rd对象不存在或者获取baseUrl失败");
			}
			var xhr = $.createXHR();
			xhr.open(this.config.server.type, baseUrl + this.config.server.url, true); 
			if(this.config.method=="create"||this.config.method=="delete"||this.config.method=="update"||this.config.method=="search")
			xhr.setRequestHeader("Content-Type", "application/json; charset=utf-8"); 
			
			//xhr.setRequestHeader("Content-Type", "multipart/form-data;");
			xhr.setRequestHeader("Cache-Control", "no-cache");
			xhr.send(sentdata);
			xhr.onreadystatechange = function() {
				if(xhr.readyState == 4) {
					if((xhr.status >= 200 && xhr.status < 300) || xhr.status == 304) {
						if(JSON.parse(xhr.responseText).result != 0) {
							 sc(JSON.parse(xhr.responseText));
							//$.render(JSON.parse(xhr.responseText).data);
						} else {
							er(JSON.parse(xhr.responseText).data);
						}
					} else {
						alert("Request was unsuccessful: " + xhr.status);
					}
				}
			};
		},
		createXHR: function() {
			if(typeof XMLHttpRequest != "undefined") {
				return new XMLHttpRequest();
			} else if(typeof ActiveXObject != "undefined") {
				if(typeof arguments.callee.activeXString != "string") {
					var versions = ["MSXML2.XMLHttp.6.0", "MSXML2.XMLHttp.3.0",
							"MSXML2.XMLHttp"
						],
						i, len;
					for(i = 0, len = versions.length; i < len; i++) {
						try {
							new ActiveXObject(versions[i]);
							arguments.callee.activeXString = versions[i];
							break;
						} catch(ex) {
							//跳过
						}
					}
				}
				return new ActiveXObject(arguments.callee.activeXString);
			} else {
				throw new Error("No XHR object available.");
			}
		},
		insert: function(args, data, sc, er) {
			this.parsing(args);
			this.config.method = "create"
			this.request(JSON.stringify($.joining(data)), sc, er);
		},
		del: function(args, data, sc, er) {
			this.parsing(args);
			this.config.method = "delete"
			this.request(JSON.stringify($.where(data)), sc, er);
		},
		update: function(args, data, sc, er) {
			this.parsing(args);
			this.config.method = "update"
			this.request(JSON.stringify($.where(data)), sc, er);
		},
		search: function(args, data, sc, er) {
			this.parsing(args);
			this.config.method = "search"
			this.request(JSON.stringify($.where(data)), sc, er);
		},
		upload:function(file,sc, er){
			//file可是file的id或者是对象
			var $frmDom=$(document.createElement("form"));
	 		$frmDom.prop("enctype","multipart/form-data");
	 		var $uploadFile= (typeof file =="string")?$("#"+file):file;
	 		var $cloneFile=$uploadFile.clone(true);
	 		$uploadFile.before($cloneFile);
	 		 $frmDom.append($uploadFile.attr("name","file"));
	 		this.config = {
	 			method:"upload",
				server: {
					url: "http://192.168.168.51:8080/service-gateway/file/uploadFile",
					type: "POST"
				}
			}
	 		this.request(new FormData($frmDom[0]), sc, er);
		},
		dt: function(args, data, sc, er) {
			switch(this.config.method) {
				case "update":
					_this.update(args, data, sc, er);
					break;
				case "delete": //直接调用该方法
					_this.del(args, data, sc, er);
					break;
				case "create":
					_this.insert(args, data, sc, er);
					break;
				case "search":
					_this.search(args, data, sc, er);
					break;
				default:
					console.log("不做任何动作");
					break;
			}
		},
		
		render: function(data) {
			/*switch(this.config.method) {
				case "update":
					alert("修改成功");
					console.log("更新响应结果");
					break;
				case "delete":
					alert("删除成功");
					console.log("删除响应结果");
					break;
				case "create":
					alert("新增成功");
					console.log("新增回执结果");
					break;
				case "search":
					console.log("查询请求结果");
					for(var key in this.typeBindFn) {
						if(key == this.config.uiType) {
							this.typeBindFn[key](this.transform(data));
						}
					 }
					break;
				default:
					console.log("不做任何动作");
					break;
			}*/
			var tpl=arguments[1].templ;  
   			var tmp=(typeof tpl=="string")?$("*[data-temp='"+tpl+"']").eq(0).html():tpl.html();
   			 var build=$.template(tmp)({data:arguments[0]});
		    $("*[name='"+tpl+"']").eq(0).html(build); 
		},
		transform:function(data){  
			var maps=this.config.maps;
			var returnobj=[];
			try{
				$.each(data, function() { 
				var obj={};
				$.each(this, function(i,item) {    
					$.each(maps, function() {    
					     if(i==this["entity"]){
					     	obj[this["dom"]]=item;
					     }
					});
				});
				returnobj.push(obj);
			});
			}catch(e){
				console.log("实体转化前台名称报错"+e);
			}
			return returnobj;
		},
		formFn: function(data) {
			var $list = $("*[data-temp='"+this.config.tempName+"']");
			 var isdata=$.isArray(data)?data[0]:data;
				try{
					for(var key in isdata) {
					var $ele = $list.find("*[name=" + key + "]"),
						value = isdata[key];
					try {
						switch($ele[0].type) {
							case "file":
								break;
							case "checkbox":
								$ele.each(function(n, m) {
									$.each(value, function(i, j) {
										if(n == j) $(m).prop("checked", true);
									});
								})
								break;
							case "radio":
								$ele.each(function(i) {
									if(i == value) $(this).prop("checked", true);
								})
								break;
							default:
								$ele.val(value);
								break;
						}
					} catch(e) {
						 console.log("查看表单是否有名字为"+key+"的DOM元素");
					}
				}
				}catch(e){
					 console.log("绑定表单失败请查看返回数据格式");
				}
		},
		listviewFn: function(data) {
			var $list = $("*[data-temp='"+this.config.tempName+"']"),
			 _this = this;
		  	try{
		  		$.each($list, function() {
				var _unit = "",
					$newfirst = $(this).children().eq(0);
				$.each(data, function(i, item) {
					var $cloneFirst = $newfirst.clone(true).show(),
						$firstList = $cloneFirst.find("*");
					for(var key in item) {
						$.each($firstList, function(n, m) {
							if($(this).attr("name") == key) {
								if($(this).prop("tagName")=="IMG")
								$(this).prop("src",item[key]);
								else
								$(this).html(item[key]);
							}
						});
					}
					_unit = _unit + $cloneFirst.prop("outerHTML");
				});
				$(this).html(_unit);
			});
		  	}catch(e){
		  	   console.log("绑定listview失败，请查看返回数据格式是否");
		  	}
		},
		templateSettings: {
			evaluate: /<%([\s\S]+?)%>/g,
			interpolate: /<%=([\s\S]+?)%>/g,
			escape: /<%-([\s\S]+?)%>/g,
		},
		template: function(text, settings, oldSettings) {
			var _this = this;
			if(!settings && oldSettings) settings = oldSettings;
			settings = $.extend({}, settings, _this.templateSettings);
			//拼接正则表达式
			var matcher = RegExp([
				(settings.escape || noMatch).source,
				(settings.interpolate || noMatch).source,
				(settings.evaluate || noMatch).source
			].join('|') + '|$', 'g');
			var index = 0;
			var source = "__p+='";
			text.replace(matcher, function(match, escape, interpolate, evaluate, offset) {
				source += text.slice(index, offset).replace(/\\|'|\r|\n|\u2028|\u2029/g, escapeChar);
				index = offset + match.length;
				if(escape) {
					source += "'+\n((__t=(" + escape + "))==null?'':_.escape(__t))+\n'";
				} else if(interpolate) {
					source += "'+\n((__t=(" + interpolate + "))==null?'':__t)+\n'";
				} else if(evaluate) {
					source += "';\n" + evaluate + "\n__p+='";
				}
				return match;
			});
			source += "';\n";
			if(!settings.variable) source = 'with(obj||{}){\n' + source + '}\n';
			source = "var __t,__p='',__j=Array.prototype.join," + "print=function(){__p+=__j.call(arguments,'');};\n" + source + 'return __p;\n';
			try {
				var render = new Function(settings.variable || 'obj', '_', source);
			} catch(e) {
				e.source = source;
				throw e;
			}
			var template = function(data) {
				return render.call(this, data, $);
			};
			var argument = settings.variable || 'obj';
			template.source = 'function(' + argument + '){\n' + source + '}';
			return template;
		},

	});
})($);