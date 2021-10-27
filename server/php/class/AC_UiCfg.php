<?php

class AC_UiCfg extends AccessControl
{
	protected $allowedAc = [];
	function api_getValue() {
		$name = mparam("name", "G");
		$ret = queryOne("SELECT value FROM UiCfg", false, ["name" => $name]) ?: null;
		return $ret;
	}

	function api_script() {
		$cb = mparam("menuFn");
		$cb2 = mparam("udfFn");

		// 先返回h5code，因为后面可能引用它
		$h5code = callSvcInt("UiCfg.getValue", ["name" => "h5code"]);
		if ($h5code) {
			echo($h5code);
			echo("\n");
		}

		$menu = callSvcInt("UiCfg.getValue", ["name" => "menu"]);
		if ($menu)
			echo("$cb($menu);\n");

		$arr = callSvcInt("UiMeta.query", ["cond" => ["isUdf"=>1], "for"=>"exec", "fmt"=>"array"]);
		if (count($arr) > 0) {
			echo($cb2 . '(' . jsonEncode($arr, $this->env->TEST_MODE) . ");\n");
		}
		jdRet();
	}
}

class AC2_UiCfg extends AC_UiCfg
{
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
}
