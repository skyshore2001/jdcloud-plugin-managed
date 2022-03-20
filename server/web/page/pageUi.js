/**
@module pageUi 通用托管页面

- showPageOpt: {uimeta?=title}
- 通过uimeta参数指定UiMeta名字，如果未指定则与title参数相同。

示例：

	WUI.showPage("pageUi", "售后工单");
	// 等价于
	WUI.showPage("pageUi", {title: "售后工单", uimeta: "售后工单"});

*/
function initPageUi(opt)
{
	var jpage = $(this);
	var jtbl = jpage.find("#tblUi");
	var name = opt.uimeta || opt.title;
	var jdlg = $("#dlgUi_inst_" + name);

	jpage.addClass("wui-page-" + name);
/*
	// 定制工具栏增删改查按钮：r(refresh), f(find), a(add), s(set), d(del)
	jtbl.jdata().toolbar = "rfs";
	// 自定义按钮
	var btn1 = {text: "结算明细", iconCls:'icon-ok', handler: function () {
		var row = WUI.getRow(jtbl);
		if (row == null)
			return;
		WUI.showPage("pageOrder", "结算明细-" + row.id + "-" + row.startDt, [ {cond: "closeLogId="+row.id} ]);
	}};
*/
	UiMeta.getMeta(name, initPage);
	function initPage(uiMeta) {
		var jtbl = jpage.find("table");
		var columns = [];
		if (! UiMeta.udf[uiMeta.obj]) {  // udf会自动加扩展字段，这里避免加两次
			UiMeta.addColByMeta(columns, uiMeta);
		}

		jdlg.objParam = {title: uiMeta.name};
		jtbl.datagrid({
			url: WUI.makeUrl(uiMeta.obj + ".query"),
			toolbar: WUI.dg_toolbar(jtbl, jdlg, "export"),
			onDblClickRow: WUI.dg_dblclick(jtbl, jdlg),
			sortOrder: "desc",
			sortName: "id",
			columns: [ columns ]
		});
	}
}

