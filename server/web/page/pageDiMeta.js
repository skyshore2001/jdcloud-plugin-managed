function initPageDiMeta() 
{
	var jpage = $(this);
	var jtbl = jpage.find("#tblDiMeta");
	var jdlg = $("#dlgDiMeta");

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

	var btnSync = {text: "同步", iconCls:'icon-ok', handler: function () {
		var row = WUI.getRow(jtbl);
		if (row == null)
			return;
		syncDi(row);
	}};
	var btnShowPage = {text: "页面测试", iconCls:'icon-ok', handler: function () {
		var row = WUI.getRow(jtbl);
		if (row == null)
			return;
		WUI.unloadDialog(true);
		WUI.showPage("pageUi", row.title+"!", [ row.title ]);
	}};
	jtbl.datagrid({
		url: WUI.makeUrl("DiMeta.query"),
		toolbar: WUI.dg_toolbar(jtbl, jdlg, "export", btnSync, btnShowPage),
		onDblClickRow: WUI.dg_dblclick(jtbl, jdlg),
		sortOrder: "desc",
		sortName: "id"
	});

	async function syncDi(row) {
		await callSvr("DiMeta.sync", {id: row.id});
		var ui0 = await callSvr("UiMeta.query", {cond: {diId: row.id, defaultFlag:1}, res:"t0.*", fmt: "one?"});
		var ui = $.extend(true, {}, ui0);
		UiMeta.syncDi(row, ui);
		if (ui0.id) {
			// 如果没有变化则不提交
			$.each(ui, (k, v) => {
				if (v == ui0[k])
					delete ui[k];
			});
			if (! $.isEmptyObject(ui)) {
				await callSvr("UiMeta.set", {id: ui0.id}, $.noop, ui);
			}
		}
		else {
			ui.defaultFlag = 1;
			ui.diId = row.id;
			await callSvr("UiMeta.add", $.noop, ui);
		}
		app_alert("同步完成!");
	}
}

