// refer to: https://github.com/json-editor/json-editor
var schema = {
	title: "字段配置",
	type: "array",
	format: "tabs",
	items: {
		title: "字段",
		type: "object",
		headerTemplate: "{{i1}} {{self.name}}",
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
				required: true,
				type: "string"
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
				title: "uiType/UI类型",
				type: "string",
				enum: [
					"text",
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
						"combo-simple:下拉列表",
						"combo:下拉列表-值映射",
						"combo-db:下拉列表-接口取值",
						"combogrid:下拉表格-接口取值",
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
				format: "textarea",
				options: {
					input_height: "200px",
					onClick: function (ev) {
						if ($(ev.target).is(".btnExample")) {
							var field = this.parent.getValue();
							this.setValue(examples[field.uiType]);
						}
					}
				},
				description: "<a class='easyui-linkbutton btnExample' href='javascript:;'>查看示例</a>"
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
	// 不同值的颜色设置
	styler: Formatter.enumStyler({CR: "Info"})
}`,

	"combo-simple": 
`{
	// 下拉列表：值列表
	// enumList: ctx.OrderStatusList,
	enumList: "新创建;待服务;已服务",
	// 不同值的颜色设置
	styler: Formatter.enumStyler({CR: "Info"})
}`,

	"combo-db": 
`{
	// 链接到对话框
	// formatter: ctx.empId
	formatter: WUI.formatter.linkTo("empId", "#dlgEmployee", true),

	// combo: ctx.Employee
	combo: {
		valueField: "id",
		jd_vField: "empName",
		url: WUI.makeUrl('Employee.query', {
			res: 'id,name',
			pagesz: -1
		}),
		formatter: function (row) { return row.id + '-' + row.name; }
	}
}`,

	"combogrid": 
`{
	// 链接到对话框
	// formatter: ctx.empId
	formatter: WUI.formatter.linkTo("empId", "#dlgEmployee", true),

	// combo: ctx.EmployeeGrid
	combo: {
		jd_vField: "empName",
		panelWidth: 450,
		width: '95%',
		textField: "name",
		columns: [[
			{field:'id',title:'编号',width:80},
			{field:'name',title:'名称',width:120},
		]],
		url: WUI.makeUrl('Employee.query', {
			res: 'id,name',
		})
	}
}`,

	subobj:
`{
	obj: 'Ordr1',
	relatedKey:'orderId', // 'orderId={id}'
	valueField:'orders',
	dlg:'dlgUi_inst_Ordr1'
}`
};

({
	schema: schema,
	no_additional_properties: true,
	show_opt_in: false
})