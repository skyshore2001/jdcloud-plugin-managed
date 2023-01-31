<?php
class DiMetaTpl
{
	static function writeArr($name, $arr)
	{
		if (empty($arr))
			return;
		echo("\tprotected \$$name = ");
		echo \DiMeta::exportArr($arr, 1);
		echo(";\n\n");
	}

	static function writeFn($k, $v)
	{
		echo("\tprotected function $k() {\n");
		if (stripos($v, 'parent::') === false)
			echo("\t\tparent::$k();\n");
		echo(\DiMeta::indent(2, $v));
		echo("\t}\n\n");
	}

	static function writeAcClass($AC, $meta)
	{
		$cls = $meta["name"];
		if ($AC == "AC0") {
			echo("class AC0_{$cls} extends AccessControl\n{\n");
		}
		else if ($AC == "AC1" || $AC == "AC2" || $AC == "AC") {
			echo("class {$AC}_{$cls} extends AC0_{$cls}\n{\n");
		}
		else {
			echo("class {$AC} extends AC0_{$cls}\n{\n");
		}

		$acDef = $meta["acLogic1"][$AC];
		if ($acDef) {
			foreach ($acDef as $k => $v) {
				if (in_array($k, ["vcolDefs", "subobj", "allowedAc", "requiredFields", "requiredFields2", "readonlyFields", "readonlyFields2"])) {
					self::writeArr($k, $v);
				}
				else if (in_array($k, ["onInit", "onValidate", "onValidateId", "onQuery"])) {
					self::writeFn($k, $v);
				}
				else if ($k == "userCode") {
					echo($v . "\n\n");
				}
			}
		}
		echo("}\n\n");
	}

	static function exec($meta, $clsList) {
		echo("<?php\n");
		foreach ($clsList as $AC) {
			self::writeAcClass($AC, $meta);
		}
	}
}
