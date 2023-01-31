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

	var jmnuSyncMore = jpage.find(".mnuSyncMore").menu({
		onClick: function (o) {
			switch (o.id) {
			case "mnuDiff":
				var row = WUI.getRow(jtbl);
				if (row == null)
					return;
				var url = WUI.makeUrl("DiMeta.diff", {id: row.id});
				window.open(url);
				break;
			case "mnuSyncAll":
				app_alert("同步所有数据模型？", "q", function () {
					callSvr("DiMeta.syncAll", function () {
						app_show("全部数据模型同步完成!");
					})
				});
				break;
			}
		}
	});
	var btnSync = {text: "同步", iconCls:'icon-ok', class: 'splitbutton', menu: jmnuSyncMore, handler: function () {
		var row = WUI.getRow(jtbl);
		if (row == null)
			return;
		syncDi(row);
	}};
	var btnShowPage = {text: "页面测试", iconCls:'icon-ok', handler: function () {
		var row = WUI.getRow(jtbl);
		if (row == null)
			return;
		WUI.showPage("pageUi", row.title+"!");
	}};

	var jmenuAddon = jpage.find(".mnuAddon").menu({
		onClick: function (o) {
			// console.log(o);
			switch (o.id) {
			case "mnuAddonExport":
				app_alert("将当前Addon配置导出安装包（XML），用于在其它环境上部署安装。确定要操作？", "q", function () {
					doAddon("all");
				});
				break;
			case "mnuAddonInstall":
				app_alert("自动导入Addon安装包，<span style='color:red'>当前所有Addon配置将被覆盖</span>。确定要操作？", "q", function () {
					doAddon("install");
				});
				break;
			case "mnuAddonClean":
				app_alert("<span style='color:red'>将清空当前所有Addon配置</span>。确定要操作？", "q", function () {
					doAddon("clean");
				});
				break;
			}
		}
	});
	var btnAddon = {text: "管理Addon", iconCls:'icon-more', class:"menubutton", menu: jmenuAddon};

	jtbl.datagrid({
		url: WUI.makeUrl("DiMeta.query"),
		toolbar: WUI.dg_toolbar(jtbl, jdlg, "export", btnSync, btnShowPage, btnAddon),
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
		WUI.unloadDialog(true);
		UiMeta.reloadUiMeta();
		app_alert("同步完成!");
	}

	function doAddon(cmd) {
		var url = WUI.makeUrl("../tool/upgrade-addon.php/" + cmd, {fmt:"json"});
		callSvr(url, function (data) {
			if (cmd == "all") {
				app_alert("导出完成。<a href='../tool/upgrade/addon.xml' download='addon.xml'>点这里下载</a>。");
				return;
			}
			app_alert("操作成功！点击确定刷新应用。", function () {
				WUI.reloadSite();
			});
		});
	}
}

