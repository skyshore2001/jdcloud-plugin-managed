function initPageUiMeta() 
{
	var jpage = $(this);
	var jtbl = jpage.find("#tblUiMeta");
	var jdlg = $("#dlgUiMeta");
	jdlg.objParam = {
		// 当改动时清空uiMeta缓存，以便页面能刷新
		onCrud: function () {
			if (!window.UiMeta)
				return;
			console.log('clean metaMap');
			UiMeta.metaMap = {};
		}
	}

/*
	// 定制工具栏增删改查按钮：r(refresh), f(find), a(add), s(set), d(del)
	jtbl.jdata().toolbar = "rfs";
	// 自定义按钮
	var btn1 = {text: "结算明细", iconCls:'icon-ok', handler: function () {
		var row = WUI.getRow(jtbl);
		if (row == null)
			return;
		var objParam = {closeLogId: row.id};
		WUI.showPage("pageOrder", "结算明细-" + row.id, [ objParam ]);
	}};
*/

	var btnShowPage = {text: "页面测试", iconCls:'icon-ok', handler: function () {
		var row = WUI.getRow(jtbl);
		if (row == null)
			return;
		WUI.unloadDialog(true);
		WUI.showPage("pageUi", row.name+"!", [ row.name ]);
	}};
	jtbl.datagrid({
		url: WUI.makeUrl("UiMeta.query"),
		toolbar: WUI.dg_toolbar(jtbl, jdlg, "export", btnShowPage),
		onDblClickRow: WUI.dg_dblclick(jtbl, jdlg),
		sortOrder: "desc",
		sortName: "id"
	});
}

