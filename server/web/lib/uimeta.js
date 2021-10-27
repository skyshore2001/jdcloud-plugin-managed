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

		callSvr("UiMeta.get", {name: name, for: "exec"}, api_UiMetaGet, {sync: sync});

		function api_UiMetaGet(uiMeta) {
			UiMeta.initUiMeta(uiMeta);
			fn(uiMeta);
		}
	},
	initUiMeta: function (uiMeta) {
		var ctx = UiMeta.ctx;
		$.each(uiMeta.fields, function (i, field) {
			if (field.opt && typeof(field.opt) === "string") {
				field.opt = WUI.evalOptions(field.opt, ctx) || {};
			}
			else {
				field.opt = {};
			}
			if (field.linkTo && (field.uiType == "combo-db" || field.uiType == "combogrid")) {
				var opt = UiMeta.getUicolOptForLinkTo(field, field.uiType);
				$.extend(true, field.opt, opt);
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

	// return: @columns
	addColByMeta: function (columns, uiMeta) {
		$.each(uiMeta.fields, function (i, field) {
			if (field.notInList)
				return;
			addCol(this);
		});
		return columns;

		function addCol(field) {
			var col = {
				field: field.name,
				title: field.title,
				formatter: field.opt && field.opt.formatter,
				styler: field.opt && field.opt.styler,
				sortable: true
			};
			if (field.type == "i") {
				field.sorter = intSort;
			}
			else if (field.type == "n") {
				field.sorter = numberSort;
			}

			var ui = UiMeta.uiTypes[field.uiType];
			if (ui && ui.renderCol) {
				var ret = ui.renderCol(field, {col: col});
				if (ret === false)
					return;
			}
			columns.push(col);
		}
	},

	handleMenu: function (data) {
		if (!data)
			return;

		var tpl = '<div class="perm-mgr perm-emp" style="display:none">' + 
			'<div class="menu-expand-group">' +
				'<a class=""><span><i class="fa fa-pencil-square-o"></i>{title}</span></a>' +
				'<div class="menu-expandable"></div>' +
			'</div>' +
		'</div>';
		var tpl1 = '<div class="menu-expand-group">' +
				'<a class=""><span>{title}</span></a>' +
				'<div class="menu-expandable"></div>' +
			'</div>';
		var tpl2 = '<a href="{link}">{title}</a>';

		var jo = $("#menu");
		$.each(data, function (i, mi) {
			applyMenu(jo, mi);
		});
		WUI.enhanceWithin(jo);

		function applyMenu(jp, mi, level)
		{
			if (level == null)
				level = 0;
			if ($.isArray(mi.value)) {
				var j1;
				if (level == 0) {
					// 如果顶级有同名菜单组，则j1直接用它，不必新建
					jp.find(">div>.menu-expand-group").each(function () {
						if ($(this).find(">a").text() == mi.name) {
							j1 = $(this);
							return false;
						}
					});
					// 新建菜单组，如果有单个菜单项（如“修改密码”），则插入在单个菜单项之前
					if (j1 == null) {
						var ji1 = jp.find(">a:first"); 
						j1 = $(WUI.applyTpl(tpl, {title: mi.name}));
						if (ji1.size() > 0)
							ji1.before(j1);
						else
							j1.appendTo(jp);
					}
				}
				else {
					j1 = $(WUI.applyTpl(tpl1, {title: mi.name})).appendTo(jp);
				}
				var j1p = j1.find(".menu-expandable");
				$.each(mi.value, function (i1, mi1) {
					applyMenu(j1p, mi1, level+1);
				});
			}
			else {
				var j2 = $(WUI.applyTpl(tpl2, {title: mi.name})).appendTo(jp);
				j2.attr("href", mi.value);
			}
		}
	},

	init: function () {
		// load menu and globals
		var url = WUI.makeUrl("UiCfg.script", {menuFn: "UiMeta.handleMenu", udfFn: "UiMeta.initUiMetaArr"});
		WUI.loadScript(url, {async: false});

		var myUDF = {
			prototype: WUI.UDF,

			onGetMeta: function (obj) {
				return UiMeta.udf[obj] || this.prototype.onGetMeta(obj);
			},
			addFieldByMeta: function (jdlg, jtbl, meta) {
				if (meta.obj) {
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

		$("#menu .menu-dev").toggle(!!g_args.dev);
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
		return "s";
	},

	addFieldByMeta: function (jdlg, jtbl, uiMeta) {
		$.each(uiMeta.fields, function () {
			if (this.uiType)
				UiMeta.addField(jdlg, jtbl, this);
		});
	},
	addField: function (jdlg, jtbl, field) {
		if (field.uiType != "subobj") {
			var tpl = "<tr><td>{title}</td><td></td></tr>";
			var jtr = $(WUI.applyTpl(tpl, field)).appendTo(jtbl);
			var jtd = jtr.find("td:eq(1)");
		}

		var ui = UiMeta.uiTypes[field.uiType];
		if (ui && ui.renderInput) {
			var ji = ui.renderInput(field, {jtd: jtd, jdlg: jdlg});
		}
		else {
			var tpl1 = '<input name="{name}">';
			if (field.type == "t" || (field.len && field.len > 200)) {
				tpl1 = '<textarea name="{name}"></textarea>';
			}
			var ji = $(WUI.applyTpl(tpl1, field)).appendTo(jtd);
			// type: Enum("s"-string, "t"-text, "tt"-mediumtext, "i"-int, "real", "n"-number, "date", "tm"-datetime, "flag")
			if (field.name == "id") { // id,tm,updateTm
				ji.prop("disabled", true);
			}
			else if (field.type == "date" || field.type == "tm") {
				ji.attr("placeholder", "年-月-日");
				if (field.type == "date")
					ji.attr("type", "date");
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
			if (field.opt.attr)
				ji.attr(field.opt.attr);
			if (field.opt.class)
				ji.addClass(field.opt.class);
			if (field.opt.style)
				ji.css(field.opt.style);
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
	syncDi: function (di, ui, force) {
		if (ui == null)
			ui = {};
		ui.obj = di.name;
		ui.name = di.title;

		var fields = !force && ui.fields? JSON.parse(ui.fields): [];
		var cols = di.cols? JSON.parse(di.cols): [];
		var vFields = {}; // linkTo产生的虚拟字段
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
				// linkTo产生的虚拟字段默认不显示
				if (vFields[uicol.name]) {
					uicol.notInList = true;
				}
				// 虚拟字段默认在对话框上disable
				else {
					uicol.uiType = "text";
					uicol.opt = "{attr: {disabled: 'disabled'}}";
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
				uiMeta: subobj.title,
			};
			var opt = {
				obj: subobj.obj,
				relatedKey: subobj.cond,
				valueField: subobj.name,
				dlg: 'dlgUi_inst_' + subobj.title
			};
			uicol.opt = JSON.stringify(opt, null, 2);
			addField(uicol);
		});

		ui.fields = JSON.stringify(fields);
		return ui;

		function addField(one) {
			if (! force) {
				var idx = fields.findIndex(e => e.name == one.name);
				if (idx >= 0) {
					var uicol = fields[idx];
					uicol.name = one.name;
					uicol.title = one.title;
					uicol.type = one.type;
					if (one.linkTo)
						uicol.linkTo = one.linkTo;
					return;
				}
			}
			fields.push(one);
		}
	}
}

var PageUi = {
	show: function (name, title) {
		WUI.showPage("PageUi", title||name, [name]);
	}
};

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
	}
}

uiTypes["combo"] = {
	// ctx: {col}
	renderCol: function (field, ctx) {
		var opt = field.opt;
		WUI.assert(opt.enumMap, "字段"+field.name+"定义错误");

		ctx.col.jdEnumMap = opt.enumMap;
		ctx.col.formatter = WUI.formatter.enum(opt.enumMap);
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
	}
}

uiTypes["subobj"] = {
	// ctx: {col}
	renderCol: function (field, ctx) {
		return false;
	},
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
	}
}
});
