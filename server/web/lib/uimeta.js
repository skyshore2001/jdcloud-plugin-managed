var UiMeta = {
	metaMap: {}, // metaName(页面名) => meta
	uiTypes: {}, // uiType => { renderCol(field, ctx), renderInput(field, ctx) }
	udf: {}, // obj(对象名) => uiMeta
	ctx: {}, // 自定义区

	getMeta: function (name, fn, sync) {
		var map = this.metaMap;
		var uiMeta = map[name];
		if (uiMeta) {
			fn(uiMeta);
			return;
		}

		// uimeta以"meta"开头表示从文件加载，示例：WUI.showPage("pageUi", {uimeta:"metaApproveRec", title:"审批记录"}) 
		if (name.startsWith("meta")) {
			var metaUrl = "page/" + name + ".js";
			WUI.loadJson(metaUrl, function (uiMeta) {
				uiMeta.name = name;
				api_UiMetaGet(uiMeta);
			}, {async: !sync});
		}
		// 后端加载meta, 示例：WUI.showPage("pageUi", {uimeta:"审批记录", title:"审批记录"}) 
		else {
			callSvr("UiMeta.get", {name: name, for: "exec"}, api_UiMetaGet, {sync: sync});
		}

		function api_UiMetaGet(uiMeta) {
			UiMeta.initUiMeta(uiMeta);
			fn(uiMeta);
		}
	},
	initUiMeta: function (uiMeta) {
		var ctx = UiMeta.ctx;
		$.each(uiMeta.fields, function (i, field) {
			if (!field.title)
				field.title = field.name;
			if (typeof(field.opt) === "string") {
				field.opt = WUI.evalOptions(field.opt, ctx) || {};
			}
			else if (field.opt == null) {
				field.opt = {};

				// 设置组件默认参数
				if (field.uiType == "upload") {
					if (field.title.match(/附件|att/)) {
						field.opt.pic = false;
						if (! field.title.match(/Id$/))
							field.opt.fname = 1;
					}
				}
			}
			if (field.linkTo && (field.uiType == "combo-db" || field.uiType == "combogrid")) {
				if (!field.opt || !field.opt.combo) {
					var opt = UiMeta.getUicolOptForLinkTo(field, field.uiType);
					$.extend(true, field.opt, opt);
				}
			}
			if (field.uiMeta) {
				UiMeta.initUiMeta(field.uiMeta);
			}
		});
		if (uiMeta.isUdf)
			UiMeta.udf[uiMeta.obj] = uiMeta;
		UiMeta.metaMap[uiMeta.name] = uiMeta;
	},
	initUiMetaArr: function (uiMetaArr) {
		$.each(uiMetaArr, function (i, meta) {
			UiMeta.initUiMeta(meta);
		});
	},
	// 修改meta后调用，让meta立即生效; return dfd.
	reloadUiMeta: function () {
		this.metaMap = {};
		this.udf = {};
		return callSvr("UiMeta.query", {cond:"isUdf=1", fmt:"array", for:"exec"}, function (data) {
			UiMeta.initUiMetaArr(data);
			console.log("reload uimeta");
		})
	},

	// return: @columns
	addColByMeta: function (columns, uiMeta) {
		var doSort = false;
		var seq = 1;
		var fields = $.map(uiMeta.fields, function (field) {
			if (field.notInList) {
				// 二次开发可删除原列表中已有字段
				var idx = columns.findIndex(e => e.field == field.name);
				if (idx >= 0)
					columns.splice(idx, 1);
				return;
			}
			if (field.type == "subobj")
				return;
			// listSeq不指定时，与上1个相同，第1个字段默认值为1.
			if (field.listSeq == null) {
				field.listSeq = seq;
			}
			else {
				seq = field.listSeq;
				doSort = true;
			}
			return field;
		});
		// 只要有指定listSeq则排序
		if (doSort) {
			fields.sort((a,b) => a.listSeq - b.listSeq);
		}
		/* 二次开发与一次开发字段可一起排序，示例ax为一次字段，bx为二次字段
		columns    ; fields
		-----------;----------
		a1,a2,a3,a4; b1,a2,b2 => a1,(b1,a2), a3,a4, b2
		a1,a2,a3,a4; b1,a2,b2,a3 => a1,(b1,a2),(b2,a3), a4
		*/
		if (columns.length == 0) {
			$.each(fields, function (i, field) {
				addCol(this);
			});
		}
		else {
			var fieldIdx = 0, colIdx = 0;
			while (colIdx<columns.length) {
				var fieldIdx1 = fields.findIndex(f => f.name == columns[colIdx].field);
				if (fieldIdx1 >= 0) {
					for (var j=fieldIdx; j<fieldIdx1; ++j) {
						if (addCol(fields[j], colIdx))
							++ colIdx;
					}
					setCol(fields[fieldIdx1], colIdx);
					++ colIdx;
					fieldIdx = fieldIdx1 +1;
				}
				else {
					colIdx ++;
				}
			}
			for (var j=fieldIdx; j<fields.length; ++j) {
				addCol(fields[j]);
			}
		}
		return columns;

		// 返回true表示实际已添加
		function addCol(field, colIdx) {
			var col = {
				field: field.name,
				title: field.title || field.name,
				formatter: field.opt && field.opt.formatter,
				styler: field.opt && field.opt.styler,
				sortable: true
			};
			if (field.type == "i") {
				col.sorter = intSort;
			}
			else if (field.type == "n") {
				col.sorter = numberSort;
			}

			var ui = UiMeta.uiTypes[field.uiType];
			if (ui && ui.renderCol) {
				var ret = ui.renderCol(field, {col: col});
				if (ret === false)
					return;
			}
			if (colIdx == null) {
				columns.push(col);
			}
			else {
				columns.splice(colIdx, 0, col);
			}
			return true;
		}
		function setCol(field, colIdx) {
			var col = columns[colIdx];
			if (field.title && field.title != field.name)
				col.title = field.title;
			if (field.opt && field.opt.formatter)
				col.formatter = field.opt.formatter;
			if (field.opt && field.opt.styler)
				col.styler = field.opt.styler;
			// var ui = UiMeta.uiTypes[field.uiType];
		}
	},

	handleMenu: function (data) {
		if (!data)
			return;

		// 菜单组
		var tpl1 = '<div class="menu-expand-group">' +
				'<a class=""><span>{title}</span></a>' +
				'<div class="menu-expandable"></div>' +
			'</div>';
		// 菜单项
		var tpl2 = '<a href="{link}"><span>{title}</span></a>';
		// 顶级菜单组
		var tpl = '<div class="perm-mgr perm-emp" style="display:none">' + 
			tpl1 +
		'</div>';

		var jo = $("#menu");
		var isReset = jo.hasClass("wui-enhanced");
		if (isReset)
			jo.find(".wui-menu-dynamic").remove();
		var topLevelMenu = [];
		$.each(data, function (i, mi) {
			applyMenu(jo, mi);
		});
		WUI.enhanceWithin(jo);
		if (isReset) {
			WUI.enhanceMenu();
			WUI.applyPermission();
		}

		function applyMenu(jp, mi, level)
		{
			var title = mi.name;
			if (title[0] == '-') {
				title = title.substr(1);
				// 菜单项
				jp.find(">a").each(function (i, e) {
					if ($(e).text() == title)
						$(e).hide();
				});
				// 菜单组
				jp.find(">div>.menu-expand-group").each(function () {
					if ($(this).find(">a:first").text() == title) {
						$(this).hide();
						return false;
					}
				});
				return;
			}

			if (level == null)
				level = 0;

			// 菜单组默认有图标；菜单项默认无图标
			var isGroup = $.isArray(mi.value);
			if (mi.icon) {
				title = '<i class="fa fa-pencil-square-o"></i>'.replace('fa-pencil-square-o', mi.icon) + title;
			}
			else if (isGroup) {
				title = '<i class="fa fa-pencil-square-o"></i>' + title;
			}
			if (isGroup) {
				var j1;
				var isNew = true;
				if (level == 0) {
					// 如果顶级有同名菜单组，则j1直接用它，不必新建
					jp.find(">div>.menu-expand-group").each(function () {
						if ($(this).find(">a").text() == mi.name) {
							j1 = $(this);
							isNew = false;
							// 把之前新创建的顶级菜单插入到它之前
							j1.before(topLevelMenu);
							return false;
						}
					});
					// 新建菜单组，如果有单个菜单项（如“修改密码”），则插入在单个菜单项之前
					if (j1 == null) {
						var ji1 = jp.find(">a:first"); 
						j1 = $(WUI.applyTpl(tpl, {title: title}));
						if (ji1.size() > 0)
							ji1.before(j1);
						else
							j1.appendTo(jp);
					}
					topLevelMenu.push(j1)
				}
				else {
					j1 = $(WUI.applyTpl(tpl1, {title: title})).appendTo(jp);
				}
				if (isNew)
					j1.addClass("wui-menu-dynamic");
				var j1p = j1.find(".menu-expandable:first");
				$.each(mi.value, function (i1, mi1) {
					applyMenu(j1p, mi1, level+1);
				});
			}
			else {
				var j2 = $(WUI.applyTpl(tpl2, {title: title})).appendTo(jp);
				if (/^(http|#|javascript)/.test(mi.value)) {
					j2.attr("href", mi.value);
				}
				else {
					j2.click(function (ev) {
						ev.preventDefault();
						if (mi.value.indexOf("await") >= 0) { // 支持await
							var code = "var f1 = async function () {\n" + mi.value + "\n};\nf1();\n";
							eval(code);
							return;
						}
						eval(mi.value);
					});
				}
				j2.addClass("wui-menu-dynamic");
			}
		}
	},

	init: function () {
		var menuCode = 
				'<div class="menu-expand-group menu-dev">' +
					'<a><span><i class="fa fa-codepen"></i>开发</span></a>' +
					'<div class="menu-expandable">' +
						'<a href="#pageDiMeta">数据模型</a>' +
						'<a href="#pageUiMeta">页面管理</a>' +
						'<a href="javascript:UiMeta.showDlgSetMenu()">菜单管理</a>' +
						'<a href="javascript:UiMeta.showDlgUiCfg(\'h5code\')">前端代码</a>' +
					'</div>' +
				'</div>';
		var jp = $("#menu .menu-expand-group:first .menu-expandable:first");
		$(menuCode).appendTo(jp);
		$("#menu .menu-dev").toggle(!!g_args.dev);
		WUI.enhanceWithin(jp);

		// load menu and globals
		//var url = WUI.makeUrl("UiCfg.script", {menuFn: "UiMeta.handleMenu", udfFn: "UiMeta.initUiMetaArr"});
		var url = WUI.makeUrl("UiCfg.script");
		WUI.loadScript(url, {async: false});

		var myUDF = {
			prototype: WUI.UDF,

			onGetMeta: function (obj) {
				return UiMeta.udf[obj] || this.prototype.onGetMeta(obj);
			},
			addFieldByMeta: function (jdlg, jtbl, meta) {
				if (meta.obj) {
					$.each(meta.fields, function () {
						var it = jdlg.gn(this.name);
						if (it.ji.size() == 0)
							return;

						if (! this.uiType) {
							it.visible(false);
						}
						else {
							if (this.title && this.title != this.name)
								it.setTitle(this.title);
							this.uiType = ""; // dont show again
						}
					});
					UiMeta.addFieldByMeta(jdlg, jtbl, meta);
					return;
				}
				this.prototype.addFieldByMeta(jdlg, jtbl, meta);
			},
			addColByMeta: function (columns, meta) {
				return UiMeta.addColByMeta(columns, meta);
			}
		}
		WUI.UDF = myUDF;

		WUI.PageHeaderMenu.items.push('<div id="reloadUiMeta">刷新Addon</div>');
		WUI.PageHeaderMenu.reloadUiMeta = function () {
			UiMeta.metaMap = {};
			UiMeta.udf = {};
			var url = WUI.makeUrl("UiCfg.script");
			WUI.loadScript(url, {async: false});
			WUI.reloadPage();
			WUI.reloadDialog(true);
		}
	},

	guessType: function (name) {
		var s = name.replace(/\d+$/, '');
		s = s.substr(0,1).toUpperCase() + s.substr(1); // 首字母大写
		if (/(Price|Qty|Total|Amount)$/.test(s))
			return "n";
		if (/(Id|Cnt|编号)$/.test(s))
			return "i";
		if (/(Tm|时间)$/.test(s))
			return "tm";
		if (/(Dt|日期)$/.test(s))
			return "date";
		if (/^是否|Flag$/.test(s))
			return "flag";
		if (/附件|atts/i.test(s))
			return "t";
		return "s";
	},

	addFieldByMeta: function (jdlg, jtbl, uiMeta) {
		var fieldsInLine = getFieldsInLine();
		if (! uiMeta.isUdf)
			jdlg.css("width", 200 + fieldsInLine * 250);
		jdlg.data("fieldsInLine", fieldsInLine);

		$.each(uiMeta.fields, function () {
			if (this.uiType)
				UiMeta.addField(jdlg, jtbl, this);
		});

		function getFieldsInLine() {
			var maxCnt = 1;
			var cnt = 0;
			$.each(uiMeta.fields, function () {
				if (this.uiType && !(this.pos && this.pos.tab)) {
					if (! (this.pos && this.pos.inline)) {
						if (cnt > maxCnt) {
							maxCnt = cnt;
						}
						cnt = 0;
					}
					cnt += 1 + (this.pos && this.pos.extend || 0);
				}
			});
			return maxCnt;
		}
	},
	addField: function (jdlg, jtbl, field) {
		field = $.extend(true, {}, field); // 防止被修改

		// 支持字段分布在tab页: pos.tab
		if (field.pos && field.pos.tab) {
			var tabname = field.pos.tab;
			// 替换jtbl
			jtbl = jdlg.find(".easyui-tabs .wui-form-tab[title=" + tabname + "] .wui-form-table");
			if (jtbl.size() == 0) {
				var code = WUI.applyTpl('<div class="wui-form-tab" title="{title}">' + 
					'<table class="wui-form-table"></table>' + 
				'</div>', {title: tabname});

				var jcont = jdlg.find(".easyui-tabs");
				if (jcont.length == 0) {
					jcont = $('<div class="easyui-tabs" style="width:100%">' + code + '</div>').appendTo(jdlg);
					jtbl = jcont.find(".wui-form-table");
				}
				else {
					var jtab = $(code).appendTo(jcont);
					jtbl = jtab.find(".wui-form-table");
				}
			}
		}

		// 支持字段分组: pos.group
		if (field.pos && field.pos.group) {
			var title = field.pos.group;
			if (title == "-")
				title = "";
			var colspan = (jdlg.data("fieldsInLine")||1) * 2;
			var code = WUI.applyTpl('<tr><td colspan="{colspan}">' +
				'<div class="form-caption"><hr>{title}</div>' +
			'</td></tr>', {title: title, colspan: colspan});
			$(code).appendTo(jtbl);
		}

		if (field.uiType != "subobj") {
			// 支持多列布局 pos.inline=true
			if (field.pos && field.pos.inline) {
				var tpl = "<td>{title}</td><td></td>";
				var jtr = jtbl.find("tr:last");
				jtr.append($(WUI.applyTpl(tpl, field)));
			}
			else {
				var tpl = "<tr><td>{title}</td><td></td></tr>";
				var jtr = $(WUI.applyTpl(tpl, field)).appendTo(jtbl);
			}
			var jtd = jtr.find("td:last");
			// 支持多列布局中字段拉伸占位 pos.extend
			if (field.pos && field.extend) {
				var colspan = field.extend * 2 + 1;
				jtd.attr("colspan", colspan);
			}
		}

		var ui = UiMeta.uiTypes[field.uiType];
		if (ui && ui.renderInput) {
			var ji = ui.renderInput(field, {jtd: jtd, jdlg: jdlg});
		}
		else {
			var tpl1 = '<input name="{name}">';
			if (field.type == "t" || (field.len && field.len > 200) || (field.opt && field.opt.format == 'textarea')) {
				tpl1 = '<textarea name="{name}"></textarea>';
			}
			var ji = $(WUI.applyTpl(tpl1, field)).appendTo(jtd);
			// type: Enum("s"-string, "t"-text, "tt"-mediumtext, "i"-int, "real", "n"-number, "date", "tm"-datetime, "flag")
			if (field.name == "id") { // id,tm,updateTm
				ji.prop("disabled", true);
			}
			else if (field.type == "date" || field.type == "tm") {
				ji.attr("placeholder", "年-月-日");
				if (field.type == "date") {
					ji.addClass("easyui-datebox");
				}
				else {
					ji.addClass("easyui-datetimebox");
				}
				// NOTE: 带时间的类型"datetime-local"要求格式必须为"2020-01-10T00:10"这种
			}
			else if (field.type == "i" || field.type == "real" || field.type == "n") {
				ji.attr("type", "number");
			}
			/* TODO
			else if (field.type == "flag") {
				ji.attr("type", "checkbox");
			}
			*/
			if (field.len) {
				ji.attr("maxlength", field.len);
			}
		}
		if (ji && field.opt) {
			if (field.opt.attr) {
				ji.attr(field.opt.attr);
				delete field.opt.attr;
			}
			if (field.opt.class) {
				ji.addClass(field.opt.class);
				delete field.opt.class;
			}
			if (field.opt.style) {
				ji.css(field.opt.style);
				delete field.opt.style;
			}
			if (field.opt.desc) {
				ji.after('<p class="hint">' + field.opt.desc + "</p>");
			}

			var logic = $.extend({}, field.opt); // 从组件opt中独立出来，避免被组件影响
			WUI.setDlgLogic(jdlg, field.name, logic);
		}
	},

	// col={name: "itemId", linkTo: "ShopItem.name"} => 返回info={table: "ShopItem", alias: "item", vField: "itemName", targetField: "name"}
	parseLinkTo: function (col) {
		var m = col.name.match(/(.*)Id$/);
		if (!m)
			return;
		var m2 = col.linkTo.match(/^(\w+)\.(\w+)$/);
		if (!m2)
			return;
		var info = {
			table: m2[1],
			alias: m[1],
			vField: m[1] + 'Name',
			targetField: m2[2]
		}
		return info;
	},
	getUicolOptForLinkTo: function (field, uiType) {
		var info = UiMeta.parseLinkTo(field);
		if (!info) {
			console.error("字段" + field.name + "定义错误: linkTo=" + field.linkTo);
			return;
		}
		if (uiType == "combo-db") {
			var opt = {
				combo: {
					valueField: "id",
					jd_vField: info.vField,
					url: WUI.makeUrl(info.table + ".query", {
						res: 'id,' + info.targetField,
						pagesz: -1
					}),
					formatter: function (row) { return row.id + '-' + row[info.targetField]; }
				}
			}
		}
		else if (uiType == "combogrid") {
			var opt = {
				combo: {
					jd_vField: info.vField,
					panelWidth: 450,
					width: '95%',
					textField: info.targetField,
					columns: [[
						{field: 'id', title:'编号', width:80},
						{field: info.targetField, title:'名称', width:120},
					]],
					url: WUI.makeUrl(info.table + ".query", {
						res: 'id,' + info.targetField,
					})
				}
			}
		}
		return opt;
	},

	// 从DiMeta同步到UiMeta，结果设置到uiMeta={obj, name, fields}并返回uiMeta
	// 默认只更新相关字段name,type,title,linkTo属性，这样可以保留字段顺序、opt配置等；如果ui.defaultFlag，则会删除多余字段。
	// 如果force=1则全部重新生成。
	syncDi: function (di, ui, force) {
		if (ui == null)
			ui = {};
		ui.obj = di.name;
		// 页面名不更新
		if (!ui.name || force)
			ui.name = di.title;

		var fields = !force && ui.fields? JSON.parse(ui.fields): [];
		var cols = di.cols? JSON.parse(di.cols): [];
		var vFields = {}; // linkTo产生的虚拟字段
		var newFields = {}; // field => true
		$.each(cols, function (i, col) {
			var uicol = {
				name: col.name,
				title: col.title,
				type: col.type,
				uiType: "text"
			};
			if (col.linkTo) {
				uicol.uiType = "combogrid";
				uicol.linkTo = col.linkTo;
				var info = UiMeta.parseLinkTo(col);
				if (info) {
					vFields[info.vField] = true;
				}
			}
			else if (/(picId|pics|attId|atts|图|图片|附件)$/i.test(col.name)) {
				uicol.uiType = "upload";
				if (/Id$/.test(col.name))
					uicol.opt = {multiple: false};
			}
			addField(uicol);
		});

		var vcols = di.vcols? JSON.parse(di.vcols): [];
		$.each(vcols, function (i, vcol) {
			if (! vcol.default)
				return;
			$.each(vcol.res, function (j, res) {
				var uicol = {
					name: res.name,
					title: res.title,
					type: "s",
				}
				if (!uicol.name) {
					// def: "inv.whId" => whId; "(select 1) qty" => qty
					uicol.name = res.def.match(/[^ .]+$/)[0];
				}
				// linkTo产生的虚拟字段默认不显示
				if (vFields[uicol.name]) {
					uicol.notInList = true;
				}
				else if (/(picId|pics|attId|atts|图|图片|附件)$/i.test(uicol.name)) {
					uicol.uiType = "upload";
					uicol.opt = { attr: {disabled: 'disabled'} };
					if (/Id$/.test(uicol.name))
						uicol.opt.multiple = false;
				}
				// 虚拟字段默认在对话框上disable
				else {
					uicol.uiType = "text";
					uicol.opt = {attr: {disabled: 'disabled'}};
				}
				addField(uicol);
			});
		});
		var subobjs = di.subobjs? JSON.parse(di.subobjs): [];
		$.each(subobjs, function (i, subobj) {
			var uicol = {
				name: subobj.name,
				title: subobj.title,
				type: "subobj",
				uiType: "subobj",
				uiMeta: subobj.title || subobj.name,
			};
			uicol.opt = {
				obj: subobj.obj,
				relatedKey: subobj.cond,
				valueField: subobj.name,
				dlg: 'dlgUi_inst_' + uicol.uiMeta
			};
			addField(uicol);
		});

		if (ui.defaultFlag) {
			fields = $.map(fields, function (e) {
				return newFields[e.name]? e: null;
			});
		}

		ui.fields = JSON.stringify(fields);
		return ui;

		function addField(one) {
			newFields[one.name] = true;
			if (! force) {
				var idx = fields.findIndex(function (e) {
					return e.name == one.name;
				});
				if (idx >= 0) {
					var uicol = fields[idx];
					uicol.type = one.type;
					if (one.linkTo)
						uicol.linkTo = one.linkTo;
					return;
				}
			}
			if (one.opt)
				one.opt = JSON.stringify(one.opt, null, 2);
			fields.push(one);
		}
	},

	// 用于主菜单
	showDlgSetMenu: function () {
		var initValue = null;
		callSvr("UiCfg.getValue", {name: "menu"}, function (data) {
			initValue = data;
			DlgJson.show("schema/menu.js", initValue, onSetJson, {modal: false});
		});
		
		function onSetJson (data) {
			var str = JSON.stringify(data, null, 2);
			if (str == initValue)
				return;
			callSvr("UiCfg.setValue", {name: "menu"}, function () {
				UiMeta.handleMenu(data);
				initValue = str;
				app_show("已成功更新");
			}, {value: str});
		}
	},
	showDlgUiCfg: function (name) {
		var dfd = $.when(callSvr("UiCfg.getValue", {name: name}), loadAceLib());
		dfd.then(api_getValue);

		// NOTE: to get the ace editor: 
		//   ed=WUI.getTopDialog()[0].env.editor
		//   ed.getValue()
		function api_getValue(data){
			var jdlg = $('<div title="前端代码"></div>');
			var ed = ace.edit(jdlg[0]);
			WUI.showDlg(jdlg, {
				modal: false,
				dialogOpt: {maximized: true},
				onOk: function () {
					var data1 = ed.getValue();
					if (data1 == data) {
						WUI.closeDlg(jdlg);
						return;
					}
					eval(data1); // 不抛异常就好
					callSvr("UiCfg.setValue", {name: name}, function () {
						data = data1; // “应用”模式下，更新原始数据
						WUI.closeDlg(jdlg);
						app_show("保存成功!");
					}, {value: data1});
				},
				buttons: [
					{ text: "应用", iconCls: "icon-save", handler: function () {
						WUI.saveDlg(jdlg, true);
					}}
				]
			})
			setTimeout(function () {
				ed.setOptions({
					mode: "ace/mode/javascript",
					//tabSize: 2,
					enableBasicAutocompletion: true,
					enableSnippets: true,
					enableLiveAutocompletion: true
				});
				//ed.session.setTabSize(2);
				if (data) {
					ed.setValue(data);
					ed.clearSelection();
				}
			});
		}
	},

	// e.g. WUI.showPage("pageIframe", "必应", ["http://cn.bing.com"])
	initPageIframe: function (href) {
		var jpage = $(this);
		var jifr = jpage.find("iframe:first");
		jifr.attr("src", href);
	},
	formatter: {
		DiMetaGrid: function () {
			return {
				jd_vField: "diName",
				panelWidth: 450,
				width: '95%',
				textField: "title",
				columns: [[
					{field:'id',title:'编号',width:80},
					{field:'name',title:'对象名',width:120},
					{field:'title',title:'显示名',width:120}
				]],
				url: WUI.makeUrl('DiMeta.query', {
					res: 'id,name,title',
				})
			}
		}
	},

/**
@fn UiMeta.on(evname, pageOrDlg, fn)

为页面或对话框绑定事件。示例：

	var pageName = "pageOrder"; // 系统页面名以"page"开头；托管页面用UiMeta名，如"物流订单"
	UiMeta.on("dg_toolbar", pageName, function (ev, button, jtbl, jdlg) {
		var jpage = $(ev.target);
	});

	var dlgName = "dlgOrder"; // 托管对话框用 "dlgUi_inst_{UiMeta名}"，如"dlgUi_inst_物流订单"
	UiMeta.on("create", dlgName, function (ev) {
		var jdlg = $(ev.target);
	});
 */
	on(evname, pageOrDlg, fn) {
		// $(document).off("dg_toolbar.客户").on("dg_toolbar.客户", ".wui-page-客户", 客户_onToolbar);
		// $(document).off("create.dlgOrder").on("create.dlgOrder", "#dlgOrder", dlgOrder_onCreate);
		evname += ".uimeta_" + pageOrDlg;
		var sel;
		if (pageOrDlg.startsWith("page")) {
			sel = ".wui-page." + pageOrDlg;
		}
		else if (pageOrDlg.startsWith("dlg")) {
			sel = "#" + pageOrDlg;
		}
		else {
			sel = ".wui-page-" + pageOrDlg;
		}
		$(document).off(evname).on(evname, sel, fn);
	}
}

$(function () {

UiMeta.init();

var uiTypes = UiMeta.uiTypes;

uiTypes["combo-simple"] = {
	// ctx: {col}
	renderCol: function (field, ctx) {
	},
	// ctx: {jtd}
	renderInput: function (field, ctx) {
		var opt = field.opt;
		var tpl = '<select class="my-combobox" name="{name}">';
		var ji = $(WUI.applyTpl(tpl, field)).appendTo(ctx.jtd);
		WUI.setOptions(ji, {
			jdEnumList: field.opt.enumList
		});
		ji.mycombobox();
		return ji;
	}
}

uiTypes["combo"] = {
	// ctx: {col}
	renderCol: function (field, ctx) {
		var opt = field.opt;
		WUI.assert(opt.enumMap, "字段"+field.name+"定义错误");

		ctx.col.jdEnumMap = opt.enumMap;
		if (!ctx.col.formatter) {
			ctx.col.formatter = WUI.formatter.enum(opt.enumMap);
		}
		else {
			var f1 = WUI.formatter.enum(opt.enumMap);
			var f2 = ctx.col.formatter;
			ctx.col.formatter = function (val, row) {
				return f2(f1(val, row), row);
			}
		}
	},
	// ctx: {jtd}
	renderInput: function (field, ctx) {
		var opt = field.opt;
		WUI.assert(opt.enumMap);

		var tpl = '<select class="my-combobox" name="{name}">';
		var ji = $(WUI.applyTpl(tpl, field)).appendTo(ctx.jtd);
		WUI.setOptions(ji, {
			jdEnumMap: opt.enumMap
		});
		ji.mycombobox();
		return ji;
	}
}

uiTypes["combo-db"] = {
	// ctx: {col}
	renderCol: function (field, ctx) {
		var opt = field.opt;
		WUI.assert(opt.combo && opt.combo.jd_vField, "字段"+field.name+"定义错误");

		ctx.col.field = opt.combo.jd_vField;
	},
	// ctx: {jtd}
	renderInput: function (field, ctx) {
		var opt = field.opt;
		WUI.assert(opt.combo);

		var tpl = '<select class="my-combobox" name="{name}">';
		var ji = $(WUI.applyTpl(tpl, field)).appendTo(ctx.jtd);
		WUI.setOptions(ji, opt.combo);
		ji.mycombobox();
		return ji;
	}
}

uiTypes["combogrid"] = {
	// ctx: {col}
	renderCol: function (field, ctx) {
		var opt = field.opt;
		WUI.assert(opt.combo && opt.combo.jd_vField, "字段"+field.name+"定义错误");

		ctx.col.field = opt.combo.jd_vField;
	},
	// ctx: {jtd}
	renderInput: function (field, ctx) {
		var opt = field.opt;
		WUI.assert(opt.combo);

		var tpl = '<select class="wui-combogrid" name="{name}">';
		var ji = $(WUI.applyTpl(tpl, field)).appendTo(ctx.jtd);
		WUI.setOptions(ji, opt.combo);
		return ji;
	}
}

uiTypes["upload"] = {
	renderCol: function (field, ctx) {
		var opt = field.opt;
		if (opt && opt.pic === false) {
			ctx.col.formatter = WUI.formatter.atts;
		}
		else {
			ctx.col.formatter = WUI.formatter.pics;// WUI.formatter.pics1;
		}
	},
	renderInput: function (field, ctx) {
		var opt = field.opt;

		var tpl1 = '<input name="{name}">';
		var jtd = ctx.jtd;
		var ji = $(WUI.applyTpl(tpl1, field)).appendTo(jtd);
		jtd.addClass("wui-upload");
		WUI.setOptions(jtd, opt);
		return jtd;
	}
}

uiTypes["subobj"] = {
	// ctx: {col}
	/*
	renderCol: function (field, ctx) {
		return false;
	},
	*/
	// ctx: {jtd}
	renderInput: function (field, ctx) {
		var opt = field.opt;
		WUI.assert(opt && opt.obj);
		WUI.assert(field.uiMeta && field.uiMeta.fields);

		var jcont = ctx.jdlg.find(".easyui-tabs");
		if (jcont.length == 0) {
			jcont = $('<div class="easyui-tabs subobj" style="width:100%"></div>').appendTo(ctx.jdlg);
		}
		var tpl = '<div class="wui-subobj wui-subobj-{name}" title="{title}"><table style="width:100%"></table></div>';
		var jsub = $(WUI.applyTpl(tpl, field)).appendTo(jcont);
		var subCols = UiMeta.addColByMeta([], field.uiMeta);
		opt.datagrid = {columns: [ subCols ] };
		WUI.setOptions(jsub, opt);
		return jsub;
	}
}

uiTypes["json"] = {
	// ctx: {col}
	renderCol: function (field, ctx) {
		ctx.col.width = 200;
	},
	// ctx: {jtd}
	renderInput: function (field, ctx) {
		var opt = $.extend({
			schema: 'schema-example.js',
			input: true,
			rows: 10
		}, field.opt);

		var tpl1 = '<textarea name="{name}" rows=' + opt.rows + '></textarea>' + 
				'<p class="hint">' + 
					'<a class="easyui-linkbutton btnEdit" data-options="iconCls: \'icon-edit\'" href="javascript:;">修改</a>' +
					'<a class="easyui-linkbutton btnFormat" data-options="iconCls: \'icon-reload\'" href="javascript:;">格式化JSON</a>' +
					'<a class="easyui-linkbutton btnEditJson" data-options="iconCls: \'icon-edit\'" href="javascript:;">配置</a>' +
				'</p>';
		var jtd = ctx.jtd;
		var ji = $(WUI.applyTpl(tpl1, field)).appendTo(jtd);
		jtd.addClass("wui-jsonEditor");
		WUI.setOptions(jtd, opt);
		return jtd;
	}
}
});
