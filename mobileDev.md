# 移动端开发规范

## 框架基础
1. zepto，打包(event、ajax、fx、fx_methods、data、detect、touch); 方便开源框架使用
2. d6基于zeptojs开发的前端组件库。

## ui组件库

### 使用说明

1. d6有一套默认的主题样式，在html文件中引用dist/d6.css;
2. 引入d6-themes.css文件，d6-themes.css是用户的自定义样式，由用户在IDE中修改自定义属性生成。

### 基本样式
1. 样式统一
	
在统一浏览器默认样式上，Reset 一度非常流行，更有简单粗暴的通配符 reset ：

	* {
	    margin: 0;
	    padding: 0;
	    border:0;
	}
	
时过境迁，Reset 逐渐淡出的前沿前端的视野，[normalize.css](https://github.com/necolas/normalize.css) 取而代之。normalize.css，统一样式的同时保留可辨识性；reset 统一样式，完全没有可读性，分不清是男人、女人，或者是不男不女，看着都一样。

字体抗锯齿，这个在chrome上试过，没什么用

	-webkit-font-smoothing: antialiased

2. 基础设置

Amaze UI 定义的一些基础样式。

1. CSS 盒模型
	
    曾几何时，IE 6 及更低版本的非标准盒模型被喷得体无完肤。IE 原来的盒模型真的不好么？最终，时间给了另外一个答案。 W3C 终认识到所谓标准盒模型在实际使用中的复杂性，于是在 CSS3 中增加 box-sizing 这一属性，允许用户自定义盒模型。
		
	> You tell me I'm wrong, Then you better prove you're right.  
	> King of Pop – Scream
		
    这就是 W3C 的证明。
		
扯远了，Amaze UI 将所有元素的盒模型设置为 border-box。这下好了，妈妈再也不用担心你没计算好 padding、border 而使布局破相了。咱来写样式，不是来学算术。
		
	 *,
	 *:before,
	 *:after {
	   -moz-box-sizing: border-box;
	   -webkit-box-sizing: border-box;
	   box-sizing: border-box;
	 }
	
Box sizing
	
参考链接：

https://developer.mozilla.org/en-US/docs/Web/CSS/box-sizing
http://www.paulirish.com/2012/box-sizing-border-box-ftw/
Box Sizing
	
2. 字号及单位
	
    Amaze UI 将浏览器的基准字号设置为 62.5%，也就是 10px，现在 1rem = 10px —— 为了计算方便。然后在 body 上应用了 font-size: 1.6rem;，将页面字号设置为 16px。
	
    	html {
    	  	font-size: 62.5%;
    	}
    	
    	body {
    	  	font-size: 1.6rem; /* =16px */
    	}
	
	与 em 根据上下文变化不同，rem 只跟基准设置关联，只要修改基准字号，所有使用 rem 作为单位的设置都会相应改变。
	
	当然，并非所有所有浏览器的默认字号都是 16px，所以在不同的浏览器上会有细微差异。
	
	另外，一些需要根据字号做相应变化的场景也使用了 em，需要像素级别精确的场景也使用了 px。
3. 文字排版


## 布局相关
1. 网格grid

	.container 自带padding，padding默认为10px，可以通过less文件进行配置，自动生成

	.container 在使用grid布局时必须在最外层添加container

	** grid 在使用中虽然不是完全依赖container，但是在有些情况下不依赖container会出现横向滚动条，就是当grid的宽度等于整个window的宽度时 **

横向排列等分布局

	<div class="container">
		<div class="grid">
			<div class="grid-cell">
				grid-cell
			</div>
			<div class="grid-cell">
				grid-cell
			</div>
			<div class="grid-cell">
				grid-cell
			</div>
		</div>
	</div>

左侧固定，右侧自适应
	
	<div class="container">
		<div class="grid demo">
			<span class="col-1">左侧固定</span>
			<div class="grid-cell">
				<p>grid-cell</p>
			</div>
		</div>
	<div>


父容器

	.grid

子列容器可以在横向和纵向布局中自适应容器剩余宽度

	.grid-cell

横向排列栅格布局

	.col-1 25%;
	.col-2 50%;
	.col-3 75%;
	.col-4 100%;

纵向排列布局

	.grid-column

## less 组件使用规范

在less根目录下的less文件有一个对应组件名称的*.less文件

如dialog，在less目录下有个dialog.less文件

	/*
    	Dialog
    	参数：
    	@bgColor:#fff, 面板的背景颜色
    	@borderColor:#fff, 面板的边框颜色
    	@tapedColor:#e5e5e5,  按钮的按下颜色
    	@btnTextColor:#0096ff, 按钮文本颜色
    	@btnBorderColor:#ccc 按钮边框颜色
	*/
	.ui-dialog{
		.Dialog(#fff; #0096ff; #e5e5e5; #0096ff; #ccc)
	}

在任何class名称下调用 less类（`Dialog，less以大驼峰式命名，每个首字母大写`）

.ui-dialog 可以是我们提供给用户的默认类，默认类可以有多个，比如用户自行扩展 ui-dialog-blue;

	.ui-dialog-blue{
		//在class体内直接调用 Dialog 类，按顺序传入制定参数就会生成需要的样式
		.Dialog(#fff; #0096ff; #e5e5e5; #0096ff; #ccc)
		
	}

###命名及文档规范

less 每个组件对一个 `*.less` 文件
less\mixins  这个文件下对应一个组件类的 `*.less`文件，用于编写类，方便用户调用

每个组件包括默认和用户自定义的均以 `ui-` 开头，组件的子元素不要加ui;

	如：ui-dialog{
		.dialog-header{}
	}

用户自定义的建议在默认的组件后面添加自定义名称

如：
	
	ui-dialog-blue

## css组件
1. 表单 form input、form checkbox、form radio 。。。
2. 按钮 button，依赖第三方组件库，button.css，button.css；依赖font-awesome，这两个库不与d6合并，用户自行使用
3. tab组件
4. 宫格


### js插件
我们遵循bootstrap的方式开发。参见bootstrap文档
http://v3.bootcss.com/javascript/#js-overview

data 属性
你可以仅仅通过 data 属性 API 就能使用所有的 d6 插件，无需写一行 JavaScript 代码。这是 d6 中的一等 API，也应该是你的首选方式。

话又说回来，在某些情况下可能需要将此功能关闭。因此，我们还提供了关闭 data 属性 API 的方法，即解除以 data-api 为命名空间并绑定在文档上的事件。就像下面这样：

	$(document).off('.data-api')

另外，如果是针对某个特定的插件，只需在 data-api 前面添加那个插件的名称作为命名空间，如下：

	$(document).off('.alert.data-api')

通过 data 属性

不需写 JavaScript 代码也可激活模态框。通过在一个起控制器作用的元素（例如：按钮）上添加 data-toggle="dialog" 属性 data-target=".ui-dialog" 属性用于指向被控制的模态框

	<a href="" class="ui-btn" data-toggle="dialog" data-show="true" data-target=".ui-dialog-blue"> 弹窗 </a>

通过 JavaScript 调用
只需一行 JavaScript 代码，即可通过元素的 class ui-dialog 调用模态框：

	$(".ui-dialog").dialog({});


## 手风琴
## 折叠列表
## 导航
## 滚屏
## 搜索框
## 图片浏览器
## 图片懒加载
## 列表刷新
## 文本框
## 轮播图
## 开关

## 弹窗

### 用法

通过js初始化：

	$('.ui-dialog-blue').dialog({
            show : true 
    })

通过data属性初始化

	<a href="" class="ui-btn" data-toggle="dialog" data-show="true" data-target=".ui-dialog-blue"> 弹窗 </a>
	
	<a href=".ui-dialog-blue" class="ui-btn" data-toggle="dialog" data-show="true"> 弹窗 </a>

### 参数
可以通过 data 属性或 JavaScript 传递参数。对于 data 属性，将参数名附着到 data- 后面，例如 data-animation=""

| 名称	        | 类型	        | 默认值| 描述  |
| ------------- |:-------------:| -----:|-----: |
| show          | true|false    | false |  默认是否显示  |
| target       | String         | 无    |  要打开的弹窗选择器 |  

### 事件

取消

    .on('dialog:cancel', function(e){
        console.log('cancel', e)
    })

跳转

    .on('dialog:jump', function(e){
        console.log('jump', e)
    })
    
确认    

    .on('dialog:confirm', function(e){
        console.log('confirm', e)
    })
    
dialog显示

    .on('dialog:show', function(e, data){
        console.log('show', this, e, data)
    })

dialog 隐藏

    .on('dialog:hide', function(e){
        console.log('hide', this, e)
    })
    
### 方法

show 显示dialog

    .dialog('show')
    
hide 隐藏dialog

    .dialog('hide');

## 城市选择器

### less 对象

用户可以引用d6-themes.css文件，直接添加属于自己的主题样式。
也可以通过ide，修改d6-thmes.les，增加自己的主题，主题提供以下参数

**.PickerTheme** 接受一个颜色参数，修改按钮的背景颜色

	.PickerTheme(@color)

城市选择主题

	.ui-citypicker-red{
	    .PickerTheme(red);
	}
	
时间选择主题，更换btn背景颜色

	.ui-dtpicker-red{
		.PickerTheme(red);
	}
### 用法

通过js初始化：

	$('.ui-cityPicker').cityPicker(options)
	
	也可以 
	var picker = new $.CityPicker(options)

通过data属性初始化

	<button id='showUserPicker' data-toggle="cityPicker">

### 参数
可以通过 data 属性或 JavaScript 传递参数。对于 data 属性，将参数名附着到 data- 后面，例如 data-animation=""

| 名称	        | 类型	        | 默认值| 描述  |
| ------------- |:-------------:| -----:|-----: |
| layer         | number        | 1     |  需要配合生成的列数  |
| buttons       | Array         | 无    |  显示按钮 |  

type 格式：JSON 设置日历初始视图模式

| 名称	        | 描述          |
| ------------- |-------------: |
| datetime      |  完整日期视图(年月日时分)  |
| date          |  年视图(年月日)               |  
| time          |  时间视图(时分)             | 
| month         |  月视图(年月)
| hour          |  时视图(年月日时)

customData

    {
      
        "customData": {
            "h": [{
                value: "am",
                text: "上午"
            }, {
                value: "pm",
                text: "下午"
            }]
        }
    }
    
支持的值:

| 可选值	| 视图模式 		|
| ---------:| -------------:|
| 'y'		| 可设置年别名 |
| 'm'		| 可设置月 别名 |
| 'd'		| 可设置日别名 |
| 'h'		| 可设置时别名 |
| 'i'		| 可设置分别名 |

labels

Type: Array

设置默认标签区域提示语

可设置["年", "月", "日", "时", "分"]这五个字段,

可以根据视图模式选择设置个别标签,也可以设置所有标签,

dtpicker显示的时候只会根据当前视图显示设置项,

*建议不要设置空字符串,会影响美观哦

4.参数:begindate

Type: Date

设置可选择日期最小范围

可单独设置最小年范围, 如: beginyear:2015,

其他日期支持Date格式,如:new Date(2016,5)可指定最小月份6月

5.参数:enddate

Type: Date

设置可选择日期最大范围

可单独设置最大年范围, 如: endyear:2017, 

其他日期支持Date格式,如:new Date(2016,10)可指定最大月份11月
    


    $('.ui-datepicker').dtPicker({
        type: "datetime",   //设置日历初始视图模式
        beginDate: new Date(2015, 04, 25),  //设置开始日期
        endDate: new Date(2016, 04, 25),    //设置结束日期
        labels: ['Year', 'Mon', 'Day', 'Hour', 'min'],  //设置默认标签区域提示语
        customData: {
            h: [{
                value: 'AM',
                text: 'AM'
            }, {
                value: 'PM',
                text: 'PM'
            }]
        }   //时间/日期别名
    })


### 方法

    .cityPicker('show')
    
    .cityPicker('hide')
    
    .cityPicker('setData', data) // 添加数据
    
    .cityPicker('toggle')
    
### 事件

    .on('ok', function(event){ event.detail //传递数据}
    
## 日期选择器

dtPicker组件适用于弹出日期选择器

通过js初始化：

	$('.ui-dtPicker').dtPicker([options])
	
也可以 

	var picker = new $.dtPicker(<element>, [options])

通过data属性初始化

	<button id='showUserPicker' data-toggle="dtPicker">

### 参数
可以通过 data 属性或 JavaScript 传递参数。对于 data 属性，将参数名附着到 data- 后面，例如 data-animation=""

| 名称	        | 类型	        | 默认值| 描述  |
| ------------- |:-------------:| -----:|-----: |
| layer         | number        | 1     |  需要配合生成的列数  |
| buttons       | Array         | 无    |  显示按钮 |    

### 方法

显示

    .dtPicker('show')
隐藏
    
    .dtPicker('hide')

添加数据

    .dtPicker('setData', data) 
    
隐藏和显示交替

    .dtPicker('toggle')
    
设置日期值

    .dtPicker('setSelectedValue', '2012-09-12');
    
### 事件

    .on('ok', function(event){ event.detail //传递数据}

	

> 参考资料：

1. 基于flexbox的栅格化布局库，提供更直观、丰富的布局方式 [http://coffcer.github.io/flex-layout/](http://coffcer.github.io/flex-layout/ "http://coffcer.github.io/flex-layout/")
2. bootstrap 布局例子  [http://v3.bootcss.com/examples/grid/](http://v3.bootcss.com/examples/grid/ "http://v3.bootcss.com/examples/grid/") 
3. aui [http://www.auicss.com/?m=Home&c=Document#calendar](http://www.auicss.com/?m=Home&c=Document#calendar "http://www.auicss.com/?m=Home&c=Document#calendar")
4. 妹子ui [http://amazeui.org/javascript/selected](http://amazeui.org/javascript/selected "http://amazeui.org/javascript/selected")
5. fontawesome  [http://www.bootcss.com/p/font-awesome/](http://www.bootcss.com/p/font-awesome/ "http://www.bootcss.com/p/font-awesome/")
6. iconfont [http://www.iconfont.cn/](http://www.iconfont.cn/ "http://www.iconfont.cn/")
7. dcloud mui [http://dev.dcloud.net.cn/mui/]

> 注意事项：

variables.less 文件中，css变量要使用；结尾
		
	/*----------手风琴-----[maweichao]-----*/
	@accordion-title-background: #fff;
	@accordion-cotent-background: #e6e6e6;

不能引用未定义的变量

对象参数使用，；均可
	
	.Accordion( @accordion-title-background, @accordion-cotent-background, @accordion-color, @accordion-font-size, @accordion-hover-background, @accordion-hover-color, @accordion-top-spacing, @accordion-border-radius, @accordion-isfirstIcon, @accordion-is-lastIcon); 