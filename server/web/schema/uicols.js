// refer to: https://github.com/json-editor/json-editor
var schema = {
	title: "字段配置",
	type: "array",
	format: "tabs",
	items: {
		title: "字段",
		type: "object",
//		format: "categories",
//		headerTemplate: "{{i1}} {{self.name}} {{self.title}}",
		options: {
			onNotify: function (val, isManualChange) {
				var ret = val.title && val.title != val.name? val.title + '(' + val.name + ')': val.name;
				if (!val.notInList && val.listSeq != null) {
					ret = val.listSeq + ":" + ret;
				}

				if (val.pos && val.pos.inline) {
					ret = "+" + ret;
				}
				if (val.pos && val.pos.extend) {
					ret += "-".repeat(val.pos.extend);
				}
				if (val.pos && val.pos.group) {
					ret = "<group>" + ret;
				}
				if (val.pos && val.pos.tab) {
					ret = "[" + val.pos.tab + "] " + ret;
				}
				if (val.uiType == "subobj")
					ret = "[" + ret + "]";

				// 不在列表"?", 不在对话框"??"，都不在"???"
				if (val.notInList) {
					ret = "?" + ret;
				}
				if (val.uiType == null) {
					ret = "??" + ret;
				}
				return ret;
			}
		},
		properties: {
			name: {
				title: "name/字段名",
				type: "string",
				required: true,
				options: {
					onNotify: function (val, isManualChange) {
						if (isManualChange)
							this.parent.editors["type"].setValue(UiMeta.guessType(val));
					}
				}
			},
			title: {
				title: "title/显示名",
				type: "string",
				description: "不指定则从name取值"
			},
			type: {
				title: "类型",
				type: "string",
				enum: [
					"s",
					"t",
					"i",
					"n",
					"tm",
					"date",
					"flag",
					"real",
					"tt",
					"subobj"
				],
				default: "s",
				required: true,
				options: {
					enum_titles: [
						"s-字符串",
						"t-长文本",
						"i-整数",
						"n-小数",
						"tm-日期时间",
						"date-日期",
						"flag-标志",
						"real-浮点数",
						"tt-64K以上文本",
						"subobj-子对象"
					]
				}
			},
			notInList: {
				title: "不在列表中显示",
				type: "boolean",
				required: true,
				format: "checkbox"
			},
			listSeq: {
				title: "列顺序号",
				type: "integer",
				default: 50,
				description: "不指定则与上一个字段相同。第1个字段不指定时默认为1。<a class='easyui-linkbutton btnSeq' href='javascript:;'>配置列顺序</a>",
				options: {
					onClick: function (ev) {
						if ($(ev.target).is(".btnSeq")) {
							var arrEditor = this.parent.parent;
							editListSeq(arrEditor);
						}
					}
				}
			},
			linkTo: {
				type: "string",
				options: {
					dependencies: {
						type: "i"
					}
				}
			},
			uiMeta: {
				title: "uiMeta/页面名",
				type: "string",
				options: {
					dependencies: {
						uiType: "subobj"
					}
				},
				required: true,
				description: "指定已定义的页面名(UiMeta.name)"
			},
			uiType: {
				title: "uiType/UI类型(不指定则不显示在明细对话框)",
				type: "string",
				enum: [
					"text",
					"json",
					"combo-simple",
					"combo",
					"combo-db",
					"combogrid",
					"upload",
					"subobj"
				],
				default: "text",
				options: {
					enum_titles: [
						"text:文本框",
						"json:JSON配置",
						"combo-simple:下拉列表-固定值",
						"combo:下拉列表-固定值映射",
						"combo-db:下拉列表-接口取值",
						"combogrid:下拉数据表",
						"upload:图片或文件",
						"subobj:子对象"
					],
					/*
					onNotify: function (val, isManualChange) {
						var edOpt = this.parent.editors["opt"];
						if (edOpt) {
							setTimeout(function () {
								$(edOpt.container).toggle(!!val);
								// edOpt.disable();
							});
						}
						if (isManualChange && val == "subobj") {
							var edType = this.parent.editors["type"];
							edType.setValue("subobj");
						}
					}
					*/
				}
			},
			opt: {
				title: "opt/配置代码",
				type: "string",
				format: "javascript",
				options: {
					input_height: "200px",
					ace: {
						minLines: 5,
					},
					onClick: function (ev) {
						if ($(ev.target).is(".btnExample")) {
							var field = this.parent.getValue();
							var code = examples[field.uiType];
							if (!code)
								return;
							if (field.linkTo && field.name) {
								// {name: "itemId", linkTo: "ShopItem.name", table: "ShopItem", alias: "item", vField: "itemName", targetField: "name"}
								$.extend(field, UiMeta.parseLinkTo(field));
							}
							code = WUI.applyTpl(code, field);
							this.setValue(code);
						}
					},
					onNotify: function (val, isManualChange) {
						// 验证代码是否正确
						if (isManualChange && val) {
							WUI.evalOptions(val, {});
						}
					}
				},
				description: "<a class='easyui-linkbutton btnExample' href='javascript:;'>查看示例</a>"
			},
			pos: {
				title: "pos/对话框排版",
				type: "object",
				format: "grid",
				properties: {
					inline: {
						type: "boolean",
						required: true,
						format: "checkbox",
						description: "勾上表示使用多列布局，本字段接上一字段，不换行。"
					},
					extend: {
						type: "integer",
						description: "在多列布局时，设置1表示多占用1个字段的位置。"
					},
					group: {
						type: "string",
						description: "指定分组名，字段开始一个新的组（显示一行横线）。`-`表示没有名字。"
					},
					tab: {
						type: "string",
						description: "字段放在指定Tab页上，如`基本`, `高级`"
					}
				}
			}
		}
	}
};

var examples = {
	combo: 
`{
	// 下拉列表：值映射表
	// enumMap: ctx.OrderStatusMap
	enumMap: {
		CR: "新创建", 
		PA: "待服务", 
		RE: "已服务"
	},
	// 不同值的颜色设置。内置颜色: Info(绿), Warning(黄), Error(红), Disabled(灰)
	styler: Formatter.enumStyler({CR: "Info"})
}`,

	"combo-simple": 
`{
	// 下拉列表：值列表
	// enumList: ctx.OrderStatusList,
	enumList: "新创建;待服务;已服务",
	// 不同值的颜色设置。内置颜色: Info(绿), Warning(黄), Error(红), Disabled(灰)
	styler: Formatter.enumStyler({新创建: "Info"})
}`,

	"combo-db": 
`{
	// 链接到对话框
	// formatter: ctx.{name}
	// formatter: WUI.formatter.linkTo("{name}", "#dlg{table}", true),

	// combo: ctx.Employee
	combo: {
		valueField: "id",
		jd_vField: "{vField}",
		url: WUI.makeUrl('{table}.query', {
			res: 'id,name',
			pagesz: -1
		}),
		formatter: function (row) { return row.id + '-' + row.name; }
	}
}`,

	"combogrid": 
`{
	// 链接到对话框
	// formatter: ctx.{name}
	// formatter: WUI.formatter.linkTo("{name}", "#dlg{table}", true),

	// combo: ctx.{table}Grid()
	combo: {
		jd_vField: "{vField}",
		panelWidth: 450,
		width: '95%',
		textField: "name",
		columns: [[
			{field:'id',title:'编号',width:80},
			{field:'name',title:'名称',width:120},
		]],
		url: WUI.makeUrl('{table}.query', {
			res: 'id,name',
		})
	}
}`,

	subobj:
`{
	obj: 'Ordr1',
	// 与主表关联字段，也可以写成'xxId={id}'
	relatedKey: 'orderId',
	// 关联的对话框。如果不指定，则只显示列表，没有操作项。
	dlg: 'dlgUi_inst_{uiMeta}',
	// readonly: true

	// 以下用于在添加主表时一起添加子表：
	// valueField: '{name}', // 填写模型中的子表名
	// vFields: 'itemName,TODO' // 填写页面子表中的虚拟字段，用于在随主表一起提交时剔除子表虚拟字段
}`,

	json: 
`{
	schema: "schema-example.js",
	input: true,
	rows: 10
}`,
};

function editListSeq(arrEditor) {
	var seq = 1;
	var data0 = arrEditor.getValue();
	var data = $.map(data0, (e, i) => {
		if (e.notInList || e.type == "subobj")
			return;
		if (e.listSeq != null)
			seq = e.listSeq;
		return {name: e.name, title: e.title||e.name, listSeq: seq}
	});
	data.sort((a, b) => {
		return a.listSeq - b.listSeq;
	});

	WUI.showDlg("#dlgJson_inst_colSeq", {
		editorOpt: {
			schema: colSeqSchema,
			startval: data,
			disable_array_add: true,
			disable_array_delete: true,
			disable_array_delete_all_rows: true,
			disable_array_delete_last_row: true,
			disable_properties: true
		},
		onSetJson: function (data) {
			var seq = 1;
			data.forEach(e => {
				var e1 = data0.find(e1 => e1.name == e.name);
				if (e1) {
					e1.listSeq = seq++;
				}
			});
			arrEditor.setValue(data0);
		},
	});
}

var colSeqSchema = {
	title: "配置列顺序",
	type: "array",
	format: "table",
	items: {
		title: "字段",
		type: "object",
		properties: {
			name: {
				type: "string"
			},
			title: {
				type: "string",
				options: {
					disabled: true
				}
			},
			listSeq: {
				type: "integer",
				options: {
					hidden: true
				}
			}
		}
	}
};

({
	schema: schema,
	no_additional_properties: true,
})
