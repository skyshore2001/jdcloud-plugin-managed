// refer to: https://github.com/json-editor/json-editor
var schema = {
	title: "子表配置",
	type: "array",
	format: "tabs",
	items: {
		title: "子表",
		type: "object",
		headerTemplate: "{{self.name}}",
		properties: {
			name: {
				title: "name/名称",
				type: "string",
				required: true,
			},
			title: {
				title: "title/标题",
				type: "string"
			},
			obj: {
				title: "obj/对象名",
				type: "string",
				required: true,
			},
			cond: {
				title: "cond/关联条件",
				type: "string",
				description: "示例: 一般子表 <code>`mainId={id}`</code> 关联表 <code>`id={empId}`</code> 花括号内为主表字段，其它为子表/关联表字段",
			},
			res: {
				title: "res/输出字段",
				type: "string",
			},
			gres: {
				title: "gres/分组字段",
				type: "string",
			},
			default: {
				title: "default/缺省显示",
				type: "boolean",
			},
			wantOne: {
				title: "wantOne/返回关联对象",
				type: "integer",
				enum: [0, 1, 2],
				description: "用于主表-关联表为多对一的情形，不返回数组，而是返回一个对象",
				options: {
					enum_titles: [
						"0-返回数组",
						"1-返回对象",
						"2-返回对象且合并到主表"
					]
				}
			}
		},
		defaultProperties: ["name", "title", "obj", "cond"]
	}
};

({
	schema: schema,
})
