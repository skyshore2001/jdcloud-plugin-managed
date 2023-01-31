// refer to: https://github.com/json-editor/json-editor
var schema = {
	title: "字段配置",
	type: "array",
	format: "table",
	items: {
		title: "字段",
		type: "object",
		properties: {
			name: {
				title: "名称",
				type: "string",
				required: true,
				options: {
					onNotify: function (val, isManualChange) {
						if (isManualChange)
							this.parent.editors["type"].setValue(UiMeta.guessType(val));

						var showLinkTo = val && val.endsWith("Id");
						var itm = this.parent.editors["linkTo"];
						if (itm) {
							setTimeout(function () {
								if (showLinkTo)
									itm.enable();
								else
									itm.disable();
							});
						}
					}
				}
			},
			type: {
				title: "类型",
				type: "string",
				// type: Enum("s"-string, "t"-text, "tt"-mediumtext, "i"-int, "real", "n"-number, "date", "tm"-datetime, "flag")
				enum: [
					"s",
					"t",
					"i",
					"n",
					"tm",
					"date",
					"flag",
					"real",
					"tt"
				],
				required: true,
				default: "s",
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
						"tt-64K以上文本"
					]
				}
			},
			len: {
				title: "长度",
				type: "integer",
				default: 50,
				options: {
					dependencies: {
						type: "s"
					},
					input_width: "50px"

				},
				description: "4/20/50/255"
			},
			linkTo: {
				title: "链接",
				type: "string",
				options: {
					dependencies: {
						type: "i"
					},

				},
				description: "示例: Item.name"
			},
			title: {
				title: "显示名",
				type: "string"
			}
		}
	}
};

({
	schema: schema,
	no_additional_properties: true,
})
