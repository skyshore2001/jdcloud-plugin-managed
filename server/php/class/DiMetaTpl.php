<?php
echo("<?php\n");

function writeArr($name, $arr)
{
	if (empty($arr))
		return;
	echo("\tprotected \$$name = ");
	echo DiMeta::exportArr($arr, 1);
	echo(";\n\n");
}

function writeFn($k, $v)
{
	echo("\tprotected function $k() {\n");
	echo("\t\tparent::$k();\n");
	echo(DiMeta::indent(2, $v));
	echo("\t}\n\n");
}

function writeAcClass($AC, $meta)
{
	$cls = $meta["name"];
	if ($AC == "AC0") {
		echo("class AC0_{$cls} extends AccessControl\n{\n");
	}
	else {
		echo("class {$AC}_{$cls} extends AC0_{$cls}\n{\n");
	}

	$acDef = $meta["acLogic1"][$AC];
	if ($acDef) {
		foreach ($acDef as $k => $v) {
			if (in_array($k, ["vcolDefs", "subobj", "allowedAc", "requiredFields", "requiredFields2", "readonlyFields", "readonlyFields2"])) {
				writeArr($k, $v);
			}
			else if (in_array($k, ["onInit", "onValidate", "onValidateId", "onQuery"])) {
				writeFn($k, $v);
			}
			else if ($k == "userCode") {
				echo($v . "\n\n");
			}
		}
	}
	echo("}\n\n");
}

foreach (["AC0", "AC1", "AC2"] as $AC) {
	writeAcClass($AC, $meta);
}

