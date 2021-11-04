<?php
class AC0_UiMeta extends AccessControl
{
	protected $vcolDefs = [
		[
			"res" => ["di.title diName", "ifnull(di.name,t0.obj) obj", "if(di.manageAcFlag=2,1,0) isUdf"],
			"join" => "LEFT JOIN DiMeta di ON di.id=t0.diId",
			"default" => true,
		]
	];
	protected function onValidateId()
	{
		$name = param("name", null, "G");
		if ($name) {
			$this->id = queryOne("SELECT id FROM UiMeta", false, ["name"=>$name]);
			if ($this->id === false)
				jdRet(E_PARAM, "cannot find UiMeta.name=`$name`", "找不到页面`$name`");
		}
	}
	protected function onValidate() {
		// 防止转义
		foreach ($_POST as $k=>&$v) {
			if (is_scalar($v))
				$v = dbExpr(Q($v));
		}
	}
	protected function onQuery()
	{
		$for = param("for", null, "G");
		if ($for === "exec") {
			$this->enumFields["fields"] = function ($e, $row) {
				if (!$e)
					return [];
				$ret = jsonDecode($e);
				// TODO: 此处应避免相互引用成环导致死循环
				foreach ($ret as &$field) {
					if ($field["uiType"] == "subobj") {
						$field["uiMeta"] = callSvcInt("UiMeta.get", ["name" => $field["uiMeta"], "for"=>"exec"]);
					}
				}
				unset($field);
				return $ret;
			};
		}
	}
}

class AC2_UiMeta extends AC0_UiMeta
{
}

