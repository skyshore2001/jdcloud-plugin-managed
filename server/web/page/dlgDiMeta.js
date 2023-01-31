function initDlgDiMeta()
{
	var jdlg = $(this);
	var jfrm = jdlg;
	var frm = jfrm[0];

	jdlg.on("beforeshow", onBeforeShow)
		.on("validate", onValidate);

	jdlg.find(".wui-jsonEditor.cols").on("retdata", cols_retdata);

	function onBeforeShow(ev, formMode, opt) 
	{
		var objParam = opt.objParam;
		var forAdd = formMode == FormMode.forAdd;
		var forSet = formMode == FormMode.forSet;
		if (forAdd) {
			opt.data.manageAcFlag = 1;
			opt.data.cols = JSON.stringify([
				{name: "id", title: "编号", type: "i"},
				{name: "code", title: "编码"},
				{name: "name", title: "名称"},
				{name: "tm", title: "创建时间", type: "tm"},
				{name: "empId", title: "创建人", linkTo: "Employee.name", type: "i"},
			]);
			/*
			opt.data.vcols = JSON.stringify([
				{
					res: [{def: "emp.name", name: "empName", title:"创建人"}],
					join: "LEFT JOIN Employee emp ON emp.id=t0.empId",
					default: true
				}
			]);
			opt.data.subobjs = JSON.stringify([
			  { "name": "emp", "title": "创建人", "obj": "Employee", "cond": "id={empId}", "wantOne": true }
			]);
			*/
		}
		setTimeout(onShow);

		function onShow() {
			$(frm.name).prop("disabled", forSet);
		}
	}

	function onValidate(ev, mode, oriData, newData) 
	{
	}

	function cols_retdata(ev, data) {
		var jvcols = $(frm.vcols);
		var vcols = getJson(jvcols, []);
		// 处理linkTo，自动生成虚拟字段
		$.each(data, function (i, col) {
			if (col.linkTo) {
				setLinkTo(vcols, col);
			}
		});
		if (vcols.length > 0) {
			jvcols.val(JSON.stringify(vcols));
			jvcols.prop("disabled", false); // NOTE: jsonEditor默认状态为disabled，修改后必须置为true，否则无法保存
		}
	}

	function setLinkTo(vcols, col) {
		// col={name: "itemId", linkTo: "ShopItem.name"} => info={table: "ShopItem", alias: "item", vField: "itemName", targetField: "name"}
		var info = UiMeta.parseLinkTo(col);
		if (!info)
			return;
		// 匹配vField. vcol={@res={def,name,title}, join, default, require}
		var resIdx = -1;
		var vcolIdx = vcols.findIndex(vcol => {
			resIdx = vcol.res.findIndex(res => res.name == info.vField);
			return resIdx >= 0;
		});
		var vcol;
		if (vcolIdx >= 0) {
			vcol = vcols[vcolIdx];
		}
		else {
			vcol = {
				res: [{}]
			};
			vcols.push(vcol);
			resIdx = 0;
		}
		vcol.res[resIdx] = {
			def: info.alias + "." + info.targetField,
			name: info.vField,
			title: col.title
		};
		vcol.join = "LEFT JOIN " + info.table + " " + info.alias + " ON " + info.alias + ".id=t0." + col.name;
		vcol.default = true;
	}

	function getJson(jo, defVal) {
		var val = jo.val();
		if (!val)
			return defVal;
		return JSON.parse(val);
	}
}

