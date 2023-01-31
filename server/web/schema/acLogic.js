// refer to: https://github.com/json-editor/json-editor
var schema = {
	title: "AC逻辑",
	type: "array",
	format: "tabs",
	items: {
		title: "AC逻辑",
		type: "object",
		headerTemplate: "{{i1}} {{self.class}}",
		properties: {
			class: {
				title: "AC类",
				type: "string",
				required: true,
				default: "AC0",
				description: "指定使用AC0/AC1/AC2或完整子类名"
			},
			/*
			type: {
				title: "type",
				type: "string",
				required: true,
				enum: [
					"default",
				],
			},
			*/
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
				$ref: "#/definitions/phpCode",
			},
			onQuery: {
				$ref: "#/definitions/phpCode",
			},
			onValidate: {
				$ref: "#/definitions/phpCode",
			},
			onValidateId: {
				$ref: "#/definitions/phpCode",
			},
			userCode: {
				$ref: "#/definitions/phpCode",
			}
		},
		defaultProperties: ["name", "class", "type", "allowedAc", "onQuery", "onValidate"]
	},
	definitions: {
		phpCode: {
			type: "string",
			format: "php",
			options: {
				dependencies: {
					type: "default"
				},
				ace: {
					mode: {path: "ace/mode/php", inline: true},
					minLines: 5
				}
			},
		}
	}
};

({
	schema: schema,
	no_additional_properties: true,
})
