<?php
namespace DiMetaTpl2;

if (!function_exists('DiMetaTpl2\writeArr')) {

function writeArr($name, $arr)
{
	if (empty($arr))
		return;
	$value = \DiMeta::exportArr($arr, 2);
	echo("\t\t\$$name = $value;\n");
	if (isArrayAssoc($arr)) {
		echo("\t\tforeach (\$$name as \$k => \$v) {\n");
		echo("\t\t\t\$this->" . $name . "[\$k] = \$v;\n");
		echo("\t\t}\n");
	}
	else {
		echo("\t\tforeach (\$$name as \$e) {\n");
		echo("\t\t\t\$this->" . $name . "[] = \$e;\n");
		echo("\t\t}\n");
	}
}

function writeFn($k, $v)
{
	echo("\tprotected function $k() {\n");
	echo("\t\tparent::$k();\n");
	echo(\DiMeta::indent(2, $v));
	echo("\t}\n\n");
}

function writeAcClass($AC, $meta)
{
	$cls = $meta["name"];
	$acDef = $meta["acLogic1"][$AC];
	if ($AC == "AC0") {
		echo("trait AC0_{$cls}_Imp\n{\n");
		echo("\tprotected function initModel() {\n");
		if ($acDef) {
			foreach ($acDef as $k => $v) {
				if (! in_array($k, ["vcolDefs", "subobj"]))
					continue;
				writeArr($k, $v);
			}
		}
		echo("\t}\n");
	}
	else {
		$parentCls = $AC . '_' . $cls;
		if (! class_exists($parentCls))
			$parentCls = "AccessControl";
		echo("class {$AC}_{$cls}_Imp extends {$parentCls}\n{\n");
		echo("\tuse AC0_{$cls}_Imp;\n");
		echo("\tfunction __construct() {\n");
		echo("\t\t\$this->initModel();\n");

		if ($acDef) {
			foreach ($acDef as $k => $v) {
				if (! in_array($k, ["allowedAc", "requiredFields", "requiredFields2", "readonlyFields", "readonlyFields2"]))
					continue;
				writeArr($k, $v);
			}
		}
		echo("\t}\n"); // construct
	}


	if ($acDef) {
		foreach ($acDef as $k => $v) {
			if (in_array($k, ["onInit", "onValidate", "onValidateId", "onQuery"])) {
				writeFn($k, $v);
			}
			else if ($k == "userCode") {
				echo($v . "\n\n");
			}
		}
	}
	echo("}\n\n"); // class
}

} /* namespace */

echo("<?php\n");
foreach (["AC0", "AC1", "AC2"] as $AC) {
	writeAcClass($AC, $meta);
}

