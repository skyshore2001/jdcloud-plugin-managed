// refer to: https://github.com/json-editor/json-editor
var schema = {
	title: "AC逻辑",
	type: "array",
	format: "tabs",
	items: {
		title: "AC逻辑",
		type: "object",
		headerTemplate: "{{self.name}}",
		properties: {
			name: {
				title: "name/名称",
				type: "string",
				required: true,
			},
			class: {
				title: "AC类",
				type: "string",
				required: true,
				enum: [
					"AC0",
					"AC1",
					"AC2"
				],
				default: "AC0"
			},
			type: {
				title: "type",
				type: "string",
				required: true,
				enum: [
					"default",
				],
			},
			allowedAc: {
				title: "allowedAc",
				type: "array",
				format: "table",
				items: {
					title: "接口",
					type: "string"
				},
				description: "示例: query, get, set, add, del, setIf, batchAdd",
				options: {
					dependencies: {
						type: "default"
					},
				},
			},
			readonlyFields: {
				title: "readonlyFields",
				type: "array",
				format: "table",
				items: {
					title: "字段",
					type: "string"
				},
				options: {
					dependencies: {
						type: "default"
					},
				},
			},
			readonlyFields2: {
				title: "readonlyFields2",
				type: "array",
				format: "table",
				items: {
					title: "字段",
					type: "string"
				},
				options: {
					dependencies: {
						type: "default"
					},
				},
			},
			requiredFields: {
				title: "requiredFields",
				type: "array",
				format: "table",
				items: {
					title: "字段",
					type: "string"
				},
				options: {
					dependencies: {
						type: "default"
					},
				},
			},
			requiredFields2: {
				title: "requiredFields2",
				type: "array",
				format: "table",
				items: {
					title: "字段",
					type: "string"
				},
				options: {
					dependencies: {
						type: "default"
					},
				},
			},

			onInit: {
				type: "string",
				format: "textarea",
				options: {
					dependencies: {
						type: "default"
					},
				},
			},
			onQuery: {
				type: "string",
				format: "textarea",
				options: {
					dependencies: {
						type: "default"
					},
				},
			},
			onValidate: {
				type: "string",
				format: "textarea",
				options: {
					dependencies: {
						type: "default"
					},
				},
			},
			onValidateId: {
				type: "string",
				format: "textarea",
				options: {
					dependencies: {
						type: "default"
					},
				},
			},
			userCode: {
				type: "string",
				format: "textarea",
				options: {
					dependencies: {
						type: "default"
					},
				},
			}
		},
		defaultProperties: ["name", "class", "type", "allowedAc", "onQuery", "onValidate"]
	}
};

({
	schema: schema,
	no_additional_properties: true,
	show_opt_in: false
})
