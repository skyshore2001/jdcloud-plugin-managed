/* 

示例：根据MyObj的uimeta展示页面（自动从UiMeta.getMeta("MyObj")获取meta并展示。）

	WUI.showObjDlg("#dlgUi_inst_MyObj"); // 

对话框名"dlgUi_inst_MyObj"中的`_inst_`表示该对话框是基于"dlgUi"的一个实例，用于一份定义对应多个实例。

也可以通过opt.uiMeta直接指定生成界面的meta，示例

	WUI.showObjDlg("#dlgUi_inst_MyObj", FormMode.forSet, {
		id: 999,
		uiMeta: {
			name: "内容管理",  // 用作页面标题
			obj: "MyObj", // 自动通过MyObj.get/MyObj.set接口存取
			fields: [
				{name: "value", title: "内容", type: "t"}  // t默认用textarea展示
			]
		},
	});

也可用更底层的showDlg来做，接口调用更灵活，如：

	callSvr("UiCfg.getValue", {name: "h5code"}, function (data){
		WUI.showDlg("#dlgUi_inst_code", {
			modal: false,
			data: {value:data}, forSet: true, // 指定初始值，且只提交修改的内容
			// dialogOpt: {maximized: true},
			// reload: true, // 每次都重新加载（测试用）
			uiMeta: {
				name: "前端代码",  // 页面标题
				fields: [
					{name: "value", title: "", type: "t", opt: {style: { width:'100%',height: 200}}}
				]
			},
			url: WUI.makeUrl("UiCfg.setValue", {name: "h5code"}),
			onOk: 'close'
		})
	});

 */
function initDlgUi(opt)
{
	var jdlg = $(this);
	var jfrm = jdlg;
	var frm = jfrm[0];

	jdlg.on("beforeshow", onBeforeShow)
		.on("validate", onValidate);
	
	var id = jdlg.attr("id");
	WUI.assert(id && id.indexOf("_inst_") > 0, "对话框调用错误");
	if (opt.uiMeta == null) {
		var arr = id.split("_inst_");
		var uiMetaName = arr[1];
		UiMeta.getMeta(uiMetaName, initDlg);
	}
	else {
		initDlg(opt.uiMeta);
	}

	function initDlg(uiMeta) {
		uiMeta = $.extend(true, {}, uiMeta); // 复制一份，避免修改了缓存中的内容
		jfrm.attr({
			"my-obj": uiMeta.obj,
			title: uiMeta.name
		});
		var jtbl = $("<table class='wui-form-table'>").appendTo(jfrm);
		UiMeta.addFieldByMeta(jdlg, jtbl, uiMeta);
		$.parser.parse(jdlg); // easyui enhancement
		WUI.enhanceWithin(jdlg);
	}

	function onBeforeShow(ev, formMode, opt) 
	{
		var objParam = opt.objParam;
		var forAdd = formMode == FormMode.forAdd;
		setTimeout(onShow);

		function onShow() {
//			var dialogOpt = jdlg.dialog('options');
//			if (dialogOpt.height == 'auto')
			$(document).one("idle", function (ev) {
				console.log('adjust height');
				jdlg.dialog({height: "auto"});
			});
		}
	}

	function onValidate(ev, mode, oriData, newData) 
	{
	}
}

