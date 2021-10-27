// refer to: https://github.com/json-editor/json-editor
var schema = {
	title: "虚拟字段配置",
	type: "array",
	format: "tabs",
	items: {
		title: "字段组",
		type: "object",
		properties: {
			res: {
				title: "res/字段定义", // {def, name, title}
				type: "array",
				format: "table",
				items: {
					title: "虚拟字段",
					type: "object",
					properties: {
						def: {
							type: "string"
						},
						name: {
							type: "string"
						},
						title: {
							type: "string"
						}
					}
				}
			},
			join: {
				title: "join/关联语句",
				type: "string",
				description: "示例: <code>`LEFT JOIN Employee emp ON emp.id=t0.empId`</code> t0为当前表"
			},
			require: {
				title: "require/依赖字段",
				type: "string",
				description: "示例: 依赖一个虚拟字段<code>`userId`</code>，或多个，以逗号分隔<code>`userId,procId`</code>"
			},
			default: {
				title: "default/缺省添加",
				type: "boolean",
			},
		},
		defaultProperties: ["res", "join", "default"],
		options: {
			onNotify: function (e, isManualChange) {
				if (e.join && e.join.match(/JOIN\s*(\w+)/i)) {
					return RegExp.$1;
				}
				if (e.res && e.res[0]) {
					return e.res[0].name;
				}
			}
		}
	},
};

({
	schema: schema,
	no_additional_properties: true,
	show_opt_in: false
})
