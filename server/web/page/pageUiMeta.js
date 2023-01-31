function initPageUiMeta() 
{
	var jpage = $(this);
	var jtbl = jpage.find("#tblUiMeta");
	var jdlg = $("#dlgUiMeta");

	var btnShowPage = {text: "页面测试", iconCls:'icon-ok', handler: function () {
		var row = WUI.getRow(jtbl);
		if (row == null)
			return;
		WUI.unloadDialog(true);
		WUI.showPage("pageUi", row.name+"!");
	}};
	jtbl.datagrid({
		url: WUI.makeUrl("UiMeta.query"),
		toolbar: WUI.dg_toolbar(jtbl, jdlg, "export", btnShowPage),
		onDblClickRow: WUI.dg_dblclick(jtbl, jdlg),
		sortOrder: "desc",
		sortName: "id"
	});
}

