function initDlgUiMeta()
{
	var jdlg = $(this);
	var jfrm = jdlg;
	var frm = jfrm[0];

	jdlg.on("beforeshow", onBeforeShow)
		.on("validate", onValidate);

	jdlg.find(".btnSyncDi").click(function (ev) {
		var diId = $(frm.diId).val();
		if (! diId)
			return;
		callSvr("DiMeta.get", {id: diId, res:"id,name,title,cols,vcols,subobjs"}, api_DiMetaGet);
	});

	function api_DiMetaGet(data) {
		// console.log(data);
		var ui = {
			fields: $(frm.fields).val()
		};
		UiMeta.syncDi(data, ui);
		$(frm.obj).val(ui.obj);
		$(frm.name).val(ui.name);
		$(frm.fields).val(ui.fields);
		$(frm.fields).prop("disabled", false); // NOTE: jsonEditor未手工修改时，默认为disabled状态
	}
	
	function onBeforeShow(ev, formMode, opt) 
	{
		var objParam = opt.objParam;
		var forAdd = formMode == FormMode.forAdd;
		var forSet = formMode == FormMode.forSet;

		var dis = forSet && !!opt.data.defaultFlag;
		var ji = jdlg.find("[comboname=diId]"); 
		ji.combogrid({disabled: dis});

		setTimeout(onShow);

		function onShow() {
		}
	}

	function onValidate(ev, mode, oriData, newData) 
	{
	}
}

