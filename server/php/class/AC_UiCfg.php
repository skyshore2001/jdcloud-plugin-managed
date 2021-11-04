<?php

class AC0_UiCfg extends AccessControl
{
	function api_getValue() {
		$name = mparam("name", "G");
		$ret = queryOne("SELECT value FROM UiCfg", false, ["name" => $name]) ?: null;
		return $ret;
	}

	function api_setValue() {
		$name = mparam("name", "G");
		$value = mparam("value", "P", false);
		$id = queryOne("SELECT id FROM UiCfg", false, ["name" => $name]);
		if ($id === false) {
			dbInsert("UiCfg", ["name" => $name, "value" => dbExpr(Q($value))]);
		}
		else {
			dbUpdate("UiCfg", ["value" => dbExpr(Q($value))], $id);
		}
	}

	// 注意AC调用时无权限，所以用new AC0来做
	function api_script() {
		$cb = param("menuFn", "UiMeta.handleMenu");
		$cb2 = param("udfFn", "UiMeta.initUiMetaArr");

		// 先返回h5code，因为后面可能引用它
		$ac = new AC0_UiCfg();
		$h5code = $ac->callSvc("UiCfg", "getValue", ["name" => "h5code"]);
		if ($h5code) {
			echo($h5code);
			echo("\n");
		}

		$menu = $ac->callSvc("UiCfg", "getValue", ["name" => "menu"]);
		if ($menu)
			echo("$cb($menu);\n");

		$ac = new AC0_UiMeta();
		$arr = $ac->callSvc("UiMeta", "query", ["cond" => ["isUdf"=>1, "defaultFlag"=>1], "for"=>"exec", "fmt"=>"array"]);
		if (count($arr) > 0) {
			echo($cb2 . '(' . jsonEncode($arr, $this->env->TEST_MODE) . ");\n");
		}
		jdRet();
	}
}

class AC_UiCfg extends AC0_UiCfg
{
	protected function onInit() {
		if (!in_array($this->ac, ["script"]))
			jdRet(E_FORBIDDEN, "ac={$this->ac} not allowed");
	}
}

class AC2_UiCfg extends AC0_UiCfg
{
}
