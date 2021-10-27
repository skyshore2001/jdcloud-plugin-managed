# managed - 托管接口与托管页面

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
在开发好托管接口后，应将数据库中meta相关表导出（SQL文件），做为初始化数据，TODO 然后通过upgrade工具更新到数据库，同时调用同步接口生成托管页面（目前先手工来做导入和调用同步接口）。

### 原生页面与托管页面

UiMeta用于定义托管页面。

前端通过`WUI.showPage("pageUi_inst_{UiMeta名}")来打开列表页，通过`WUI.showDlg`WUI.showObjDlg("pageUi_inst_{UiMeta名}")`来打开对象对话框。
在初次执行时，它获取uimeta，自动渲染页面。

托管页面被设计成可以与原生一起执行，意味着它具有与原生相同的能力。托管的代码可以直接调用原生代码。
(TODO: 页面要定制怎么办？比如两个表？ 答：这里特指对象模型页面，要定制任意页面用原生）

注意：托管页面不生成原生代码，而是直接根据uimeta自动渲染。这与托管接口将dimeta生成AC类的实现方式不同，这也导致了托管页面在显示时效率低一些（多了获取uimeta和动态渲染的步骤）。

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
subobj: uiMeta

- manageAcFlag: Enum(0-不生成接口,1-独立接口,2-扩展接口)

其中cols等字段全部是json格式，其结构如下：

- @cols: [{name, title, type(s), linkTo?}]
- @vcols: [{@res, join, default, require}]
	- @res=[{def, name, title}]
- @subobjs: [{name, title obj, cond, res, default, wantOne}]
- @acLogic: [{class, name, type, ...}]
	- class: Enum(AC0, AC1, AC2)
	- type="AC", ...={@allowedAc, @readonlyFields, @readonlyFields2, @requiredFields, @requiredFields2, onInit, onQuery, onValidateId, onValidate, userCode}

关于链接字段：

- 当cols.type=i(整数)且名为`xxxId`形式时，linkTo可以链接到其它表，如"ShopItem.name"。它将自动创建虚拟字段，假如字段名为itemId，则它创建虚拟字段"item.name itemName / LEFT JOIN ShopItem item ON item.id=t0.itemId".
在自动创建页面字段时，列表字段自动生成，对话框字段将以combogrid来展示。

### 托管页面

托管页面定义：

@UiMeta: id, name, diId, obj(s), fields(t), defaultFlag
vcol: diName(DiMeta.title), obj(DiMeta.name)
vcol for search: isUdf(DiMeta.manageAcFlag=2)

- diId: 关联DiMeta
- obj: 在未关联diId时，使用该字段指定对象名。默认为DiMeta.name。
- name: 页面名，可以是中文; 默认为DiMeta.title。
- defaultFlag: 为1时，由DiMeta自动维护，在管理端上做DiMeta同步时会更新或创建它。

- @fields: field/uicol={name, title, type, uiType, opt, notInList, linkTo?, uiMeta?}

- uiType: Enum(text, combobox, combogrid, file, subobj, null-不显示)
- opt: 是一段JS代码（不是JSON），它将被执行做为每个字段的选项，其执行结果是一个对象。根据uiType不同，opt中需要的内容也不同。
	通用opt: {%attr, %style, class}
- notInList: Boolean.
- uiMeta: 仅用于uiType=subobj，链接UiMeta.name

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
在前端加载后，它将被执行，之后可从`g_data.uiMeta.pages[页面名][字段名]`来访问到它。

往往此处的enumMap定义在其它地方也会用到，这时可通过共享选项(ctx变量)在多处脚本中共享它，上面模板中被注释的一行就是使用ctx例子。如果要共用，则会像这样定义字段选项：

	{
		enumMap: ctx.OrderStatusMap,
		...
	}

然后在配置共享选项ctx: 

	{
		OrderStatusMap: {
			CR: "新创建", 
			PA: "待服务", 
			RE: "已服务"
		},
		...
	}

共享选项在前端实现时，用的是`ctx=g_data.uiMeta.options`。

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

TODO: 后端实现：qsearch

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
			{name: "测试1", value: "测试1"}
		]},
		{name: "新菜单组", value: [
			{name: "测试1", value: "测试1"}
		}
	]

如果第一级菜单名在原菜单中存在，则做合并处理，否则新增该菜单。

TODO: order属性: 指定菜单项顺序值，呈现时由小到大排序，在不指定时（包括系统默认的菜单项，是未指定顺序的），则同一级依次为100, 200, 300, ...

## 后端接口

### DiMeta

	DiMeta.add

- TODO manageAcFlag=1时，如果系统中已有AC2类，则不允许创建。
	
	DiMeta.get/query

	DiMeta.set...

- name不允许修改。TODO: 若要支持改name，数据库表要在同步时改名。

	DiMeta.del...

- TODO: del时删除表和AC类？暂时留做手工操作。

DiMeta同步：

	DiMeta.sync(id, force?)

- 与数据库做同步，创建表或更新字段。
	注意默认不会删除或修改字段类型，除非加force=1标志。因为字段可能用了一段时间，很可能需要手工升级后才能删除或调整，TODO 做这些操作须调用DiMeta.diff接口后得到SQL语句，去数据库手工执行。

- 若manageAcFlag=1，则创建或更新相应的AC类。（删除由DiMeta.del接口完成，不在sync接口中）

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
