// refer to: https://github.com/json-editor/json-editor
var schema = {
	title: "菜单配置",
	$ref: "#/definitions/menus",
	format: "tabs-top",
	definitions: {
		menu: {
			title: "菜单项",
			headerTemplate: "{{self.name}}",
			type: "object",
			properties: {
				name: {
					title: "菜单名",
					type: "string",
					required: true
				},
				value: {
					title: "值",
					oneOf: [
						{
							title: "链接/代码",
							type: "string",
							format: "javascript", // "textarea",
							description: '示例: <code style="margin-left:10px">http://baidu.com</code> <code style="margin-left:10px">WUI.showPage("pageUi", "物料")</code>',
							options: {
								input_height: "200px",
								ace: {
									minLines: 5,
								},
							}
						},
						{
							title: "子菜单",
							$ref: "#/definitions/menus"
						}
					],
					required: true
				},
				/*
				order: {
					title: "序号",
					type: "integer",
					description: "越小越靠前。不指定时，同一级菜单分别为100,200,...",
					default: null
				}
				*/
			}
		},
		menus: {
			type: "array",
			format: "tabs",
			items: {
				$ref: "#/definitions/menu"
			},
		}
	}
};

({
	schema: schema,
	disable_array_delete_all_rows: true,
	disable_array_delete_last_row: true,
	disable_collapse: true,
	disable_edit_json: true,
	disable_properties: true,
	onReady: function () {
		// this: jsoneditor对象
		// this.root_container: DOM对象
		$(jsonEditor.root_container).find(".card-title.je-object__title").hide()
	}
})
