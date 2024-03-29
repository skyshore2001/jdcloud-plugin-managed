# managed - 托管接口与托管页面（Addon开发 / 扩展应用开发）

本插件基于筋斗云平台提供Addon开发（也称二次开发，或扩展应用开发）支持，包括用户自定义字段、自定义表和自定义逻辑（UDF/UDT/UDO）。

- 它在管理端的系统设置中增加“开发”菜单
- 可以创建新的数据模型，扩展系统后端接口，并可添加后端自定义业务逻辑；支持字段、虚拟字段、子表、AC类等扩展。
- 可以基于数据模型创建管理端页面，支持主-子表、关联表等常见模型间关系。
- 可以扩展管理端系统菜单项，显示对象页面、报表、预定义查询，或内嵌其它网页或系统。
- 可以为已有对象扩展字段（UDF）、子表、业务逻辑，包括后端数据接口和前端管理页面。

## 用法

先安装依赖的插件：

	./tool/jdcloud-plugin.sh add ../jdcloud-plugin-jsonEditor

然后安装本插件：

	./tool/jdcloud-plugin.sh add ../jdcloud-plugin-managed

在store.html中引入文件uimeta.js，注意顺序！它必须在jdcloud-wui.js和jdcloud-wui-ext.js之间！

	<script src="lib/jdcloud-wui.js"></script>
	<script src="lib/uimeta.js"></script>
	<script src="lib/jdcloud-wui-ext.js"></script>

如果想禁用本插件，只须注释掉对uimeta.js的引用即可。

在store.html中合适位置添加页面模板，它们会被用到：

	<script type="text/html" id="tpl_pageIframe">
	<div title="" my-initfn="UiMeta.initPageIframe">
		<iframe style="width:100%;height:100%;border:0"></iframe>
	</div>
	</script>

	<script type="text/html" id="tpl_dlgSetValue">
	<form title="内容设置">
		<textarea name="value" style="width:100%;height:100%;border:0"></textarea>
	</form>
	</script>

在DESIGN.md中包含本插件：

	**[插件相关]**
	...
	@include server\plugin\jdcloud-plugin-managed.README.md

用tool/upgrade.sh刷新数据库。

最后在打开管理端时，记得添加URL参数dev，如 http://localhost/jdcloud-ganlan/server/web/store.html?dev

## 概要设计

在系统设置菜单下，增加“开发”菜单。仅当有最高管理员权限且有URL参数dev时才显示该菜单。即通过如下URL激活开发菜单：
	
	http://localhost/jdcloud-ganlan/server/web/storm.html?dev

### 原生接口与托管接口

原生接口是即传统的手写AC类实现的后端接口，托管接口是指通过配置meta（特指DiMeta，Di表示数据接口，与Ui相对）后自动生成AC为实现的后端接口。
DiMeta可用于更新数据库表以及生成AC类，该过程称为meta同步(meta sync)；其中是否生成AC类的动作是由托管接口标志（manageAcFlag）控制的，默认值为1即自动生成AC类。

- 如何区分原生接口和托管接口？

对于接口使用者（调用方）来说，托管接口与原生接口没有区别，托管接口的概念是透明的。对于后端实现，托管接口是配置DiMeta后生成AC类，原生接口则是手写AC类。

- 托管接口是否可转成原生接口？原生接口能转成托管接口？

托管转原生：找到DiMeta自动生成的AC类源文件，将其直接包含到后端代码中，并将DiMeta中的manageAcFlag设置为0，之后DiMeta同步仅用于更新数据库（传统方式是在DESIGN文档中维护表设计），而AC类则由人工维护。
原生不可转托管：如果已有原生AC类，是不允许创建同名（对象的）托管接口的，必须手工清除这些AC类才可创建托管接口。

托管开发，被设计为可与原生开发混合在一起实现功能，意味着它具有与原生相同的能力，因而没有必要将托管开发转成原生开发方式（尽管允许）。
常规的功能可使用托管实现，对于复杂的定制，在托管接口中直接调用原生封装好的函数或类即可。

可以理解为托管代码是存在数据库中的，而原生代码是存在git库中的；托管代码实现对象接口，原生代码可做成库被调用。
例如托管实现Obj接口对象，可写一个原生的ObjImp类（或全局函数），封装复杂定制功能，在托管中直接调用即可。

托管接口自动生成的AC类源文件：(交互接口为 DiMeta.sync(id))

	php/class/AC_Obj1.php
	...

- 托管接口在性能上是否比原生接口慢？

由于在DiMeta的同步操作时生成了原生的AC类，实际运行时是直接执行这些AC类（与原生一样）的，因而在性能上两者没有任何区别。

- 托管接口如何重新部署？

开发原生接口时，meta是定义在DESIGN文档中的，开发时通过tool/upgrade.sh工具来更新数据库，部署时通过生成meta文件，然后在线访问tool/init.php页面或tool/upgrade/页面来更新数据库。
在开发好托管接口后，应将所有数据模型、页面、菜单、代码等导出，称为“导出Addon安装包”，然后在目标环境下安装。

具体操作：打开菜单【系统设置-开发-数据模型】，工具栏按钮【管理Addon】，选择下拉菜单【导出安装包】或【自动安装】。详情参考[部署Addon]。

### 原生页面与托管页面

UiMeta用于定义托管页面。

管理端通过`WUI.showPage("pageUi", {uimeta: UiMeta名, title: title})`来打开列表页(如果未指定uimeta，则使用title当作uimeta)，通过`WUI.showDlg`WUI.showObjDlg("pageUi_inst_{UiMeta名}")`来打开对象对话框。
在初次执行时，它获取uimeta，自动渲染页面。

托管页面被设计成可以与原生一起执行，意味着它具有与原生相同的能力。托管的代码可以直接调用原生代码。

注意：托管页面不生成原生代码，而是直接根据uimeta自动渲染。这与托管接口将dimeta生成AC类的实现方式不同，这也导致了托管页面在显示时效率低一些（多了获取uimeta和动态渲染的步骤）。

**【定制页面】**

目前托管页面提供的典型的CRUD功能。

如果非CRUD页面，首先考虑是否可以借助一些通用页面，比如要展示一个定制报表，可用到pageSimple页面，或更高级的WUI.showDataReport函数（自定义报表、多维分析）等；
如果等一个页面中展示多个表，甚至多个tab页，考虑使用pageTab页面。请参考[前端文档](http://oliveche.com/jdcloud-site/api_web.html#pageSimple)。

如果仍无法满足需求，则须使用原先开发，制做新的页面或对话框，然后可以在托管代码中（包括定制菜单中）用WUI.showPage/WUI.showDlg来调用它们。

### UDF设计

需求：为系统已有对象页面增加字段。

示例：为订单对象（Ordr）增加商品属性（itemId，指向商品Item），表示订单购买了哪个商品。

#### 系统页面怎样知道是否有UDF

字段DiMeta.manageAcFlag=2时，表示扩展对象。基于扩展对象的页面，称为扩展页面，就是用于生成UDF。

在管理端初始化时，全部扩展页面会发到前端，存在UiMeta.udf中，格式为`{obj => uiMeta}`。

在初始化对象页面或对话框时，检测到在`UiMeta.udf`中有匹配自身obj的uiMeta则自动添加UDF。

#### 数据模型如何扩展，比如虚拟字段和子表？

由于原数据模型中已经有对象及AC类，在模型扩展时，不能创建AC类以免和之前冲突，那么怎样配置虚拟字段甚至子表呢？

如果DiMeta.manageAcFlag=1，生成`ACx_xxx`类，如果值为2，则生成`ACx_xxx_Imp`类。文件位于`php/class`目录下面。
在onCreateAC回调（api.php）中设置优先匹配Imp类，该类应继承系统已有的类。

代码自动生成方案为：(以扩展Ordr为例)

	trait AC0_Ordr_Imp;
	{
		protected function initModel() {
			// 添加vcolDefs和subobjs
		}
	}

	class AC2_Ordr_Imp extends AC2_Ordr
	{
		use AC0_Ordr_Imp;
		function __construct() {
			$this->initModel();
			// 添加allowedAc等其它数组
		}
	}

#### 如何在数据表和对话框上加载UDF

WUI提供了扩展对象WUI.UDF，在uimeta.js中实现了它的相关方法。

注意系统根据对话框或数据表的obj来确定是否需要扩展UDF。

在对话框上，WUI.showDlg在初始化时调用WUI.UDF.addFieldByMeta方法。

在数据表上，先在jquery-easyui库中扩展了datagrid.onInitOptions回调（修改了库源码）。然后WUI在该回调中检查obj并调用UDF.addColByMeta方法。

## 数据库设计

### 托管接口

托管接口定义：

@DiMeta: id, name, manageAcFlag, title, cols(t), vcols(t), subobjs(t), acLogic(t)

vcol
: @uiMeta

- manageAcFlag: Enum(0-不生成接口,1-独立接口,2-扩展接口)

其中cols等字段全部是json格式，其结构如下：

- @cols: [{name, title, type(s), linkTo?}]
- @vcols: [{@res, join, default, require}]
	- @res=[{def, name, title}]
- @subobjs: [{name, title obj, cond, res, default, wantOne}]
- @acLogic: [{class, @allowedAc, @readonlyFields, @readonlyFields2, @requiredFields, @requiredFields2, onInit, onQuery, onValidateId, onValidate, userCode}]
	- class: 指定类名，常用为AC0/AC1/AC2。特别地，对于继承关系，比如当前类为InvRecord(库存记录)有子类InvOrder(库存请求)，则应创建AC2_InvOrder类，才能正常使用该子类。

关于链接字段：

- 当cols.type=i(整数)且名为`xxxId`形式时，linkTo可以链接到其它表，如"ShopItem.name"。它将自动创建虚拟字段，假如字段名为itemId，则它创建虚拟字段"item.name itemName / LEFT JOIN ShopItem item ON item.id=t0.itemId".
在自动创建页面字段时，列表字段自动生成，对话框字段将以combogrid来展示。

#### 自定义函数逻辑 - acLogic

acLogic.class设置之后的代码生成到哪个类。默认用AC0，然后AC1（用户端）或AC2（管理端）都会继承它。如果只在管理端用，也可以直接指定用AC2类。

通过acLogic.onValidate等函数可以定制后端逻辑；
要特别注意的是，如果是对已有对象进行扩展（manageAcFlag=2），回调函数的执行时机，默认是在系统对象相应回调函数之后。

以onValidate为例，比如导入工单时，物料名称（itemName）中包含有"?"号，想自动替换为空格，可以设置：

	if ($this->ac == "add" && issetval("itemName")) {
		$_POST["itemName"] = str_replace("?"," ",$_POST["itemName"]);
	}

它将在系统处理逻辑之后再执行扩展逻辑。

如果想先执行扩展逻辑再做系统逻辑：

	... // 扩展逻辑代码，在系统默认逻辑之前执行
	parent::onValidate();
	... // 扩展逻辑代码，在系统默认逻辑之后执行

如果只要扩展逻辑，不要系统逻辑：

	... // 扩展逻辑代码
	// 下面一行注释掉，而不是删掉；因为要出现parent::字样系统才不会先执行默认逻辑。
	//parent::onValidate();

acLogic.userCode字段中可以扩展AC类的成员变量或成员函数，用于在onValidate等回调函数中调用，比如：

	function hello() {
		addLog("hello");
	}

然后在onValidate中可调用：

	$this->hello();

### 托管页面

托管页面定义：

@UiMeta: id, name, diId, obj(s), fields(t), defaultFlag

vcol
: diName(DiMeta.title), obj(DiMeta.name)

vcol for search
: isUdf(DiMeta.manageAcFlag=2)

- diId: 关联DiMeta
- obj: 在未关联diId时，使用该字段指定对象名。默认为DiMeta.name。
- name: 页面名，可以是中文; 默认为DiMeta.title。
- defaultFlag: 为1时，由DiMeta自动维护，在管理端上做DiMeta同步时会更新或创建它。

- @fields: field/uicol={name, title, type, uiType, opt, notInList, linkTo?, uiMeta?, pos?, listSeq?}

	- uiType: Enum(text/json, combo/combo-simple/combo-db/combogrid, file, subobj, null-不显示)
	- opt: 是一段JS代码（不是JSON），它将被执行做为每个字段的选项，其执行结果是一个对象。根据uiType不同，opt中需要的内容也不同。
		通用opt: {%attr, %style, class, desc} + WUI.setDlgLogic中支持的选项(如disabled, valueForAdd等)
		- dscr: 字段说明，将显示在字段下方
	- notInList: Boolean. 指定不显示在列表中。
	- uiMeta: 仅用于uiType=subobj，链接UiMeta.name
	- pos: 对话框中排版设置。示例：{tab:"基本",group:"-",inline:true,extend:1}
		- tab: 指定在哪个tab页。如果不指定则在对话框上方。
		- group: 指定在哪个组。如果不指定则在默认上方组；如果指定为"-"表示没有组名。
		- inline: 如果为true，表示使用多列布局，该组件接上一组件，不换行。
		- extend: 在多列布局中，指定扩展几列。值为1表示占用2列(colspan=3)；值为2表示占用3列(colspan=5)。
	- listSeq: Integer. 指定列顺序号，如果不指定，则与上一个相同，如果是第1个字段，不指定时默认为1。

#### 通用选项

字段的通用选项如下：

- opt.attr: 设置属性。例如多行文本字段可设置`{rows:3}`指定行数
- opt.style: 设置样式。例如`{width: "100%"}`
- opt.class: 设置CSS类, 多个类以空格分隔，如`jdcloud-plugin-ueditor`, `mybutton mybutton-primary`
- opt.desc: 设置描述信息(hint)，一般在字段下方以蓝色小字出现。
- opt.required 为1表示必填
- opt.validType 用于文本框，验证方式。

详细参考[http://oliveche.com/jdcloud-site/ref-addon.html#字段选项配置opt]().

#### 文本框(uiType=text)

如果type=s，默认以input来展现；如果type=t，或长度大于200，或指定选项`format:"textarea"`，则以textarea来展现。

#### JSON配置框(uiType=json)

读写JSON配置，可以设置schema文件来编辑JSON。

以下选项用于json editor，后面的值是默认选项值：

	schema: "schema-example.js",
	input: true, // 如果设置为false，则不显示输入框
	rows: 10 // 输入框显示多少行

采用jdcloud-plugin-jsonEditor来实现。

#### 固定值下拉列表(uiType=text)

#### 固定值下拉列表(uiType=combo)

配置模板：

	{
		// 下拉列表：值映射表
		// enumMap: ctx.OrderStatusMap
		enumMap: {
			CR: "新创建", 
			PA: "待服务", 
			RE: "已服务"
		},
		// 不同值的颜色设置
		styler: Formatter.enumStyler({CR: "Info"})
	}

其中，Formatter是全局变量，可直接使用。
在前端加载后，它将被执行，之后可从`UiMeta.metaMap.页面名.字段名`来访问到它。

往往此处的enumMap定义在其它地方也会用到，这时可通过共享选项(ctx变量)在多处脚本中共享它，上面模板中被注释的一行就是使用ctx例子。如果要共用，则会像这样定义字段选项：

	{
		enumMap: ctx.OrderStatusMap,
		...
	}

共用的选项、函数等可配置`UiMeta.ctx`：

	$.extend(UiMeta.ctx, {
		OrderStatusMap: {
			CR: "新创建", 
			PA: "待服务", 
			RE: "已服务"
		},
		...
	});

按惯例，一个页面内多处共用的内容写在id字段配置选项中，多个页面都共用的内容则配置在前端代码中。

前端实现：

	页面列表：
	<th data-options="field:'status', jdEnumMap: OrderStatusMap, formatter:Formatter.enum(OrderStatusMap), styler:Formatter..., sortable:true">状态</th>
	对话框：
	<select name="status" class="my-combobox" data-options="jdEnumMap:ctx.OrderStatusMap"></select>

#### 固定值下拉列表-简单(uiType=combo-simple)

配置模板：

	{
		// 下拉列表：值列表
		// enumList: ctx.OrderStatusList,
		enumList: "新创建;待服务;已服务",
		// 不同值的颜色设置
		styler: Formatter.enumStyler({CR: "Info"})
	}

前端实现：

	页面列表：
	<th data-options="field:'status', styler:Formatter..., sortable:true">状态</th>
	对话框：
	<select name="status" class="my-combobox" data-options="jdEnumList:ctx.OrderStatusList"></select>

#### 动态下拉列表(uiType=combo-db)

配置模板：

	{
		// 链接到对话框
		// formatter: ctx.empId
		formatter: WUI.formatter.linkTo("empId", "#dlgEmployee", true),

		// combo: ctx.Employee
		combo: {
			valueField: "id",
			jd_vField: "empName",
			url: WUI.makeUrl('Employee.query', {
				res: 'id,name',
				pagesz: -1
			}),
			formatter: function (row) { return row.id + '-' + row.name; }
		}
	}

前端实现：

	页面列表
	<th data-options="field:'empName', sortable:true, formatter:Formatter.customerId">客户代码</th>
	对话框
	<select name="customerId" class="my-combobox" data-options="ListOptions.Customer()"></select>

#### 动态下拉表格(uiType=combogrid)

配置模板：

	{
		// 链接到对话框
		// formatter: ctx.empId
		formatter: WUI.formatter.linkTo("empId", "#dlgEmployee", true),

		// combo: ctx.EmployeeGrid
		combo: {
			jd_vField: "empName",
			panelWidth: 450,
			width: '95%',
			textField: "name",
			columns: [[
				{field:'id',title:'编号',width:80},
				{field:'name',title:'名称',width:120},
			]],
			url: WUI.makeUrl('Employee.query', {
				res: 'id,name',
			})
		}
	}
		
前端实现：

	页面列表：
	<th data-options="field:'empName', sortable:true, formatter:opt.formatter">数据模型</th>
	对话框中：
	<select name="empId" class="wui-combogrid" data-options="opt.combo"></select>

后端实现：qsearch
为支持模糊查询，须在【系统设置-开发-数据模型】中打开模型对话框，配置【AC逻辑】，添加后端代码，在【onQuery】中添加：

	$this->qsearch(["id","code","name"], param("q"));

这表示在id, code和name三个字段中（这个按需修改）进行模糊查询，查询参数使用`q`（这个一般不改）。


示例：当选择了一个工件(snId, 使用combogrid组件)后，自动填充工单(orderId, 使用combogrid组件)、工单开工时间(actualTm)等字段。

	{
		combo: {
			jd_vField: "snCode",
			panelWidth: 450,
			width: '95%',
			textField: "code",
			columns: [[
				{field:'id',title:'编号',width:80},
				{field:'code',title:'序列号',width:120},
				{field:'orderName',title:'工单',width:120},
				{field:'category',title:'型号',width:120},
			]],
			url: WUI.makeUrl('Sn.query', {
				res: 'id,code,orderId,orderName,orderCode,cateId,category',
			})
		},

		// 监听自己，当选择一个工件后，自动填充其它字段
		watch: "snId",
		onWatch: async function (e, ev, gn) {
			console.log(ev);

			// 自动填充工单。gn对combogrid组件可以设置一个数组，同时设置value和text
			gn("orderId").val([ev.data.orderId, ev.data.orderCode]);
			// 也可以只设置值：gn("orderId").val(ev.data.orderId);

			// 发起查询，填写工单时间
			var rv = await callSvr("Ordr.get", {id: ev.data.orderId, res: "actualTm"})
			gn("actualTm").val(rv.actualTm);

			// 再发起查询，自动填写型号和产品线
			var rv = await callSvr("Category.get", {id: ev.data.cateId, res: "fatherName, fatherName2"})
			gn("series").val(rv.fatherName);
			gn("productLine").val(rv.fatherName2);
		}
	}

上面两个查询是先后依次调用的，也可以并行调用：

	var rv = await Promise.all([
		callSvr("Ordr.get", {id: ev.data.orderId, res: "actualTm"})
		callSvr("Category.get", {id: ev.data.cateId, res: "fatherName, fatherName2"})
	]);

	gn("actualTm").val(rv[0].actualTm);

	gn("series").val(rv[1].fatherName);
	gn("productLine").val(rv[1].fatherName2);

#### 子表(uiType=subobj)

这时field.name必须与UiMeta.name匹配，表示引用哪个子表。

配置模板：

	{
		obj: 'Ordr1',
		relatedKey:'orderId', // 'orderId={id}'
		valueField:'orders',
		dlg:'dlgUi_inst_Ordr1',
	}

前端实现：

	对话框中：
		<div class="easyui-tabs">
			<div class="wui-subobj" data-options="obj:'Ordr1', relatedKey:'orderId', valueField:'orders', dlg:'dlgOrdr1'" title="订单明细">
				<table>
					<thead><tr>
						<th data-options="field:'id', sortable:true, sorter:intSort">编号</th>
						<th data-options="field:'itemId', sortable:true, sorter:intSort">产品</th>
						<th data-options="field:'qty', sortable:true, sorter:numberSort">数量</th>
					</tr></thead>
				</table>
			</div>
		</div>

#### 图片或文件(uiType=upload)

配置模板：
	wui-upload

前端实现：
	
	列表页：
	<th data-options="field:'picId', sortable:true, formatter: Formatter.pics">主图</th>

	对话框中：
		<tr>
			<td>主图</td>
			<td class="wui-upload" data-options="multiple:false">
				<input name="picId">
			</td>
		</tr>

	
	列表页：
	<th data-options="field:'attId', sortable:true, formatter: Formatter.atts">文件</th>

	对话框中：
		<tr>
			<td>文件</td>
			<td class="wui-upload" data-options="multiple:false">
				<input name="picId">
			</td>
		</tr>

### 菜单定制与前端全局逻辑

@UiCfg: id, name, value(t)

- name=menu时，为新增菜单，格式见下面示例
- name=h5code，其内容为前端逻辑

菜单示例：

	[
		{name: "运营管理", value: [
			{name: "物流订单", value: "WUI.showPage(\"pageUi\", \"物流订单\")"},
			{name: "-订单管理", value: ""},
			{name: "官网", value: "http://oliveche.com"},
		]},
		{name: "统计分析", icon: "fa-bar-chart", value: [
			{name: "订单分析", value: "..."}
		}
	]

如果第一级菜单名在原菜单中存在，则做合并处理，否则新增该菜单。

对于一级菜单，无论是系统已有菜单还是自定义菜单，顺序与列表中的顺序一致，
比如当前系统菜单为"系统设置 运营管理"，自定义菜单为"主数据管理 运营管理 订单菜单", 则"主数据管理"菜单会添加到系统已有的"运营管理"之前。
自定义的二级菜单则依次排在原系统菜单之下。

如果菜单名为"-"开头，表示不显示当前层级下某个已有的系统菜单项。

通过icon可以指定图标，图标使用font awesome库，不指定时默认为"fa-pencil-square-o"。
名字与图标对应参考这里：
http://www.fontawesome.com.cn/icons-ui/

## 后端接口

### DiMeta

	DiMeta.add

- manageAcFlag=1（创建新对象）或2（扩展系统已有对象）。注意如果系统中已有该类，必须用manageAcFlag=2来扩展，否则无法生效。
	
	DiMeta.get/query

	DiMeta.set...

- name不允许修改。因为它已关联数据库表。

	DiMeta.del...

- 注意：del接口不删除该DiMeta对应的数据库表。但会删除它对应的AC类。

DiMeta同步：

	DiMeta.sync(id)
	DiMeta.syncAc(meta)
	DiMeta.diff(id)

- sync接口先更新数据库，创建表或更新字段，然后若manageAcFlag=1，则创建或更新相应的后端AC类到php/class/ext/目录；（删除由DiMeta.del接口完成，不在sync接口中）
	注意默认不会删除或修改字段类型。因为字段可能用了一段时间，很可能需要手工升级后才能删除或调整，做这些操作须调用DiMeta.diff接口后得到SQL语句，去数据库手工执行
	具体操作：打开菜单【系统设置-开发-数据模型】，工具栏按钮【同步】，选择下拉菜单【字段差异】。

- syncAc接口只创建后端AC类。

	DiMeta.syncAll()

- 清空托管的AC类（php/class/ext目录下所有php文件）
- 分别同步每个DiMeta

清除addon：

	DiMeta.cleanAll()

- 清除DiMeta, UiMeta和UiCfg
- 注意此操作无法恢复! 注意确保addon已打包（导出）。

### UiMeta

	UiMeta.get(name)
	UiMeta.get(name, for=exec) -> {id, fields=[{name, title, type, uiType, opt, uiMeta?}]}

- for: 设置为"exec"时，返回为前端定制的字段及格式, 如fields转成数组对象。对于fields中的type=subobj的项，将uiMeta字段自动转换，其值为调用UiMeta.get(uiMeta)的结果。

	UiMeta.add/get/set/del

注意UiMeta无须同步生成page或dialog，UI界面是由pageUi或dlgUi自动根据uiMeta生成的。

UiMeta全局配置配置

	UiCfg.getValue(name) -> value

	UiCfg.setValue(name)(value)

- 如果name不存在，则自动创建。

取初始化逻辑

	UiCfg.script(udfFn, menuFn)

- 返回JS脚本，包含菜单设置和全局前端代码。menuFn为menu的处理函数名。udfFn为UDF页面meta的处理函数名。

示例：

	var url = WUI.makeUrl("UiCfg.script", {menuFn: "UiMeta.handleMenu"});
	WUI.loadScript(url)

如果只需要加载前端代码，可以调用：

	var url = WUI.makeUrl("UiCfg.getValue", {name: "h5code", _raw:1});
	WUI.loadScript(url)

## 部署Addon

扩展应用（Addon）存储在开发数据库中。通过从开发环境导出addon，然后导入addon到其它服务器，实现部署。

具体操作：打开菜单【系统设置-开发-数据模型配置】，工具栏按钮【管理Addon】，选择下拉菜单【导出安装包】或【自动安装】。
前者导出Addon到xml文件，默认位置为server/upgrade/tool/addon.xml，可以下载或直接提交到代码库中。
后者将该addon.xml文件导入，实现addon的安装部署。

其底层通过upgrade-addon.php工具来实现。

### Addon部署的底层实现

可以通过命令行和在线执行两种方式来部署Addon。

核心程序是 

	server/tool/upgrade-addon.php

它依赖php-xml软件，在CentOS Linux上应安装：

	sudo yum install php-xml

习惯上，是通过在tool目录下运行make命令执行相应操作：

	# 打包，即生成安装包到server/tool/upgrade/addon.xml，它类似`make meta`生成META文件。
	make addon

	# 使用addon.xml文件来安装addon
	make addon-install

	# 清空addon程序
	make addon-clean

也可以直接命令行访问，如：

	# 打包
	php server/tool/upgrade-addon.php
	# 安装
	php server/tool/upgrade-addon.php install
	# 清空
	php server/tool/upgrade-addon.php clean

也可以在线访问，主要用在线上环境上直接升级，如：

	# 打包
	http://{baseurl}/tool/upgrade-addon.php

	# 安装
	http://{baseurl}/tool/upgrade-addon.php/install

	# 清空
	http://{baseurl}/tool/upgrade-addon.php/clean

注意：

- 其中用到sh(包括常用shell命令), git等工具，确保它们都在PATH中可直接调用。

- 在Windows环境下，sh是安装git-bash后自带的（路径示例：C:\Program Files\Git\usr\bin）
	如果使用Apache系统服务的方式（默认是SYSTEM用户执行），应确保上述命令行在系统PATH（而不只是当前用户的PATH）中。

- Windows环境中Apache+php调用shell命令可能会卡死，应修改git-bash下的文件：/etc/nsswitch.conf （路径示例：C:\Program Files\Git\etc\nsswitch.conf）

		db_home: env 
		#db_home: env windows cygwin desc

- 在通过HTTP调用upgrade-addon程序时支持fmt=json参数，可返回筋斗云兼容的json格式，示例：

		http://{baseurl}/tool/upgrade-addon.php/install?fmt=json

- 脚本使用虚拟管理员（empId=-1）进行操作。

### 打包

	php server/tool/upgrade-addon.php

它连接conf.user.php中设置的数据库，导出Addon程序到server/tool/upgrade/addon.xml文件（并添加到git）。

### 部署

部署Addon（初始安装或更新）:

	php server/tool/upgrade-addon.php install

或在线执行

	http://{baseurl}/tool/upgrade-addon.php/install
	或
	http://{baseurl}/tool/upgrade-addon.php?ac=install

- 自动导入addon.xml文件。
- 注意：即使是更新，也是全部删除后重建addon相关的表。
- 调用DiMeta.syncAll接口刷新数据库。

## 专题问题

### 如何设置系统标题?

菜单`开发-前端代码`中添加代码：

	$(function () {
		setAppTitle("毅博仓储智能管理系统");
	});

### 如何修改对话框已有字段的逻辑？

可以在其它字段的逻辑里一起修改。目前onWatch回调提供gn函数可以操作任意字段。

如果想完全控制对话框逻辑，可以监听对话框相关事件，比如create/beforeshow/show/validate/retdata等事件。
系统提供了安全又方便的UiMeta.on函数，支持在控制台中反复调试执行；在二次开发调试时，会反复修改代码，建议可以先在控制台中输入代码段来直接测试。

示例：隐藏系统已有的订单对话框上的“描述”字段。

	UiMeta.on("create", "dlgOrder", function (ev) {
		var jdlg = $(ev.target);
		WUI.setDlgLogic(jdlg, "dscr", {show: false});
	});

或者：

	UiMeta.on("show", "dlgOrder", function (ev, formMode, initData) {
		var jdlg = $(ev.target);
		jdlg.gn("dscr").visible(false);
	});

上面代码可以打开菜单`开发-前端代码`，加入其中。

注意如果是自定义对象，比如“商品”对话框，则使用`dlgUi_inst_商品`这样的名字来访问对话框，示例：

	UiMeta.on("create", "dlgUi_inst_商品", function (ev) {
		var jdlg = $(ev.target);
		WUI.setDlgLogic(jdlg, "name", {
			readonlyForSet: true
		});
	});

这等价于在页面字段"name"上设置readonlyForSet属性。

如果只是想隐藏已有字段，或是修改字段的标题，也可以在页面字段列表中添加要修改的已有字段并配置标题，或是不显示（uiType不选就是不显示）。
此方法也适用于调整列表中列的标题和显示顺序（参考[定制列表显示顺序]）。

不支持定制对话框上已有字段的顺序，有此需求建议直接修改源码。

### 如何定制列表页上的操作按钮？比如点击显示关联对象，或做设置操作。

处理dg_toolbar事件，匹配当前页面对象。
示例：在自定义的商品页面上，加上“关联订单”按钮。

	UiMeta.on("dg_toolbar", "商品", function (ev, buttons, jtbl, jdlg) {
		// var jpage = $(ev.target);
		// console.log(jpage);
		var btnLinkToOrder = {text: "关联订单", iconCls: "icon-redo", handler: function () {
			var row = WUI.getRow(jtbl);
			if (row == null)
				return;
			var pageFilter = { cond: {itemId: row.id} };
			WUI.showPage("pageOrder", "关联订单-" + row.name, [null, pageFilter] );
		}};
		buttons.push(btnLinkToOrder);
	});

参考demo2管理端入门学习案例，关联操作的设计模式有好几种，除了在工具栏菜单，也可在单元格中点击关联对象的数目等，这可以设置相应组件的formatter方法。

以上代码加到菜单`开发-前端代码`中。

注意：如果是系统页面，则用原页面名"pageOrder"来匹配页面，如：

	UiMeta.on("dg_toolbar", "pageOrder", function (ev, buttons, jtbl, jdlg) {
		// var jpage = $(ev.target);
		// console.log(jpage);
		var btnLinkToItem = {text: "关联商品", iconCls: "icon-redo", handler: function () {
			var row = WUI.getRow(jtbl);
			if (row == null)
				return;
			var pageFilter = { cond: {id: row.itemId} };
			PageUi.show("商品", "关联商品-订单"+row.id, pageFilter);
		}};
		buttons.push(btnLinkToItem);
	});

### 共用页面如何实现？

对话框上能动态隐藏字段，在列表上是否能生效？列表上能传标题到对话框吗？

常常用于多类型共用页面的处理，比如订单通过“订单类型”字段分为“商品”订单和“服务”订单，可以用pageFilter机制分别打开。
(参考管理端教程中的例子)

打开服务订单试试：

	WUI.showPage("pageOrder", "服务订单", [null, {cond: {订单类型:"服务"}}])

再打开商品单试试：

	WUI.showPage("pageOrder", "商品订单", [null, {cond: {订单类型:"商品"}}])

要动态设置表格字段，建议也是监听dg_toolbar事件，用setTimeout等待数据表初始化次做设定。

	UiMeta.on("dg_toolbar", "pageOrder", function (ev, buttons, jtbl, jdlg) {
		var jpage = $(ev.target);
		// 传title参数给关联的对话框
		jdlg.objParam = {
			title: jpage.attr("title")
		};
		setTimeout(onPageInit);

		function onPageInit() {
			var type = WUI.getPageFilter(jpage, "订单类型");
			WUI.toggleFields(jtbl, {
				itemName: type == "商品",
				price: type == "商品",
				itemPicId: type == "商品",
				qty: type == "商品"
			});
		}
	});

### 如何自定义报表并加入菜单？

通过在数据表左上角右键，打开自定义报表对话框，设定好报表后，选上“复制报表代码”即可。
如果以开发模式打开的（URL中有dev参数），它会询问是否添加到菜单。这时可把代码添加到自定义菜单去。

### 对话框上字段排版

如果字段很多，在对话框上常常使用多列布局（典型地，每行2个字段）、字段分组（组间有分隔线）、字段分页（一些字段放在Tab页中）。

这些可以调整页面上字段的排版设置实现：uicol.pos

示例：如下排版

	字段1 字段2
	字段3

配置：

	字段2：pos.inline=true

示例：如下排版（字段3占满一行空间）

	字段1 字段2
	字段3......

配置：

	字段2：pos.inline=true
	字段3：pos.extend=1

示例：如下排版

	字段1 字段2
	字段3
	------------
	*分组1*
	字段4 字段5

	[分页1]
	字段a1
	字段a2

	[分页2]
	字段b1 字段b2
	------------
	字段b3.......

配置：

	字段2：pos.inline=true
	字段4：pos.group=分组1 (分组只要指定一次，同组的“字段5”等无须再指定group)

	字段a1: pos.tab=分页1
	字段a2: pos.tab=分页1
	
	字段b1: pos.tab=分页2
	字段b2: pos.tab=分页2, pos.inline=true
	字段b3: pos.tab=分页2, pos.group="-", pos.extend=1 （指定分组但无名字）

注意：也可以所有字段都在分组中的。

### 定制列表显示顺序

二次开发页面上字段的顺序，已经决定了列表和对话框中的显示顺序。如果希望定制列表中列序（与对话框中顺序不同），还可以通过“列顺序号(listSeq)”属性来设置。

默认情况下，所有字段未指定列顺序，则第1列的顺序号为1，其它列与上1列顺序号相同，也可以指定顺序号，示例：

	a1, a2, a3, a4
	(顺序号为：1,1,1,1)

	a1, a2(listSeq=10), a3(listSeq=2), a4
	(顺序号为：1,10,2,2, 实际顺序为 a1, a3, a4, a2，即把a3移到a2之前)

也支持为一次开发中的已有列表定制顺序。示例：

	原列表字段：c1, c2, c3, c4
	二次开发字段: a1, a2, a3, a4
	实际顺序：c1, c2, c3, c4, a1, a2, a3, a4

把a2放到c1和c2间：

	二次开发字段: a1(listSeq=2), a2(seq=1), c2, a3(listSeq=10), a4
	实际顺序：c1, a2, c2, c3, c4, a1, a3, a4

在字段配置时，可以点击“列顺序号”下方的“配置列顺序”，打开列顺序编辑工具，方便地自动生成listSeq.

如果不想显示某字段，设置“不在列表中显示”即可。(notInList=true)


### 关于继承关系的配置 / 共用表

示例：InvOrder(库存请求)与InvRecord(库存记录)共同使用表InvRecord。在产品代码中AC2_InvOrder继承AC2_InvRecord。

二次开发在做扩展时，应注意：

- 只能设置表即InvRecord，而不能设置InvOrder。
- 数据模型中，必须在AC逻辑中添加类AC2_InvOrder，否则无法扩展该类。
- 前端页面(pageInvRecord)的列表(table组件)上，必须设置"my-obj=InvRecord"来指定基础对象，否则在显示InvOrder时将无法加载udf扩展字段；
类似地，在对话框(dlgInvRecord)上也需要指定"my-obj=InvRecord"，好在这里一般都会指定。

