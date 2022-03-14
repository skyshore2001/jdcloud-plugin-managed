<?php
class AC0_DiMeta extends AccessControl
{
	protected $subobj = [
		"uiMeta" => ["obj"=>"UiMeta", "cond"=>"diId={id}"]
	];

	function api_sync() {
		$id = mparam("id");
		$meta = queryOne("SELECT * FROM DiMeta", true, $id);

		if (! param("noSyncDb"))
			$this->syncDb([$meta]);
		if ($meta["manageAcFlag"])
			$this->syncAc([$meta]);
	}

	function api_syncAll() {
		$this->cleanAc();
		$metaList = queryAll("SELECT * FROM DiMeta", true);
		$this->syncDb($metaList);
		$this->syncAc($metaList);
	}

	function api_cleanAll() {
		$this->cleanAc();
		execOne("TRUNCATE DiMeta");
		execOne("TRUNCATE UiMeta");
		execOne("TRUNCATE UiCfg");
	}

	private function cleanAc() {
		// xargs -r: no run if empty
		myexec('git ls-files --others "php/class/AC_*.php" | xargs -r rm -rf 2>&1');
	}

	function syncDb($metaArr)
	{
		$tableDefs = arrMap($metaArr, function ($meta) {
			$tableName = $meta["name"];
			$cols = jsonDecode($meta["cols"]);
			$fieldsDef = join(", ", arrMap($cols, function ($col) {
				if ($col["name"] == "id") {
					return "id";
				}
				if ($col["type"] == "s") {
					return $col["name"] . '(' . ($col["len"]?:'s') . ')';
				}
				return $col["name"] . '(' . $col["type"] . ')';
			}));
			$tableDef = "@" . $tableName . ": " . $fieldsDef;
			addLog($tableDef);
			return $tableDef;
		});
		DiMeta::updateDB($tableDefs);
	}

	function syncAc($metaArr)
	{
		foreach ($metaArr as $meta) {
			if ($meta["manageAcFlag"] == 1) { // 独立接口
				$f = __DIR__ . "/AC_" . $meta["name"] . ".php";
				DiMeta::genFileWithTpl($f, "DiMetaTpl.php", $meta);
			}
			else if ($meta["manageAcFlag"] == 2) { // 扩展接口
				$f = __DIR__ . "/AC_" . $meta["name"] . "_Imp.php";
				DiMeta::genFileWithTpl($f, "DiMetaTpl2.php", $meta);
			}
		}
	}

	protected function onQuery() {
		$this->qsearch(["id", "name", "title"], param("q"));
	}

	protected function onValidate() {
		// 防止转义
		foreach ($_POST as $k=>&$v) {
			if (is_scalar($v))
				$v = dbExpr(Q($v));
		}
	}
}

class AC2_DiMeta extends AC0_DiMeta
{
}

class DiMeta
{
	static function updateDB($tableDefs)
	{
		require_once(__DIR__ . "/../../tool/upgrade/upglib.php");
		global $DBH;
		$h = new UpgHelper(["tableDefs" => $tableDefs, "dbh" => $DBH, "prompt" => function ($str) {
			addLog($str);
		}]);
		if (param("diff") != 1) {
			$h->updateDB();
		}
		else {
			$h->showTable(null, true);
			echo("!!! JUST SHOW SQL. Please copy and execute SQL manually.\n");
		}
	}

	static function genFileWithTpl($f, $tpl, $meta)
	{
		$acLogic1 = []; // { AC0/AC1/AC2 => {vcols, subobjs, allowedAc, ..., onInit, onValidate, ...} }

		// 预处理
		if (isset($meta["vcols"])) {
			$vcols = jsonDecode($meta["vcols"]);
			foreach ($vcols as &$vcol) {
				foreach($vcol["res"] as &$res) {
					$res = $res["def"] . ' ' . $res["name"];
				}
			}
			unset($res);
			unset($vcol);
			$acLogic1["AC0"]["vcolDefs"] = $vcols;
		}
		if (isset($meta["subobjs"])) {
			$arr = jsonDecode($meta["subobjs"]);
			$arr1 = [];
			foreach ($arr as $e) {
				$name = $e["name"];
				unset($e["name"]);
				unset($e["title"]);
				$arr1[$name] = $e;
			}
			$acLogic1["AC0"]["subobj"] = $arr1;
		}

		// 合并acLogic=[{class=AC0/AC1/AC2, name=allowedAc/..., type}] -> acLogic1
		if (isset($meta["acLogic"])) {
			$acLogic = jsonDecode($meta["acLogic"]);
			foreach ($acLogic as $one) {
				$name = $one["name"];
				$class = $one["class"];
				foreach ($one as $k=>$v) {
					if (in_array($k, ["allowedAc", "requiredFields", "requiredFields2", "readonlyFields", "readonlyFields2"])) {
						foreach ($v as $v1) {
							$acLogic1[$class][$k][] = $v1;
						}
					}
					else if (in_array($k, ["onInit", "onValidate", "onValidateId", "onQuery", "userCode"])) {
						$acLogic1[$class][$k] .= "// $name\n{$v}\n";
					}
				}
			}
		}
		$meta["acLogic1"] = $acLogic1;

		$fp = fopen($f, "w");
		ob_start(function ($buf) use ($fp){
			fwrite($fp, $buf);
		});
		include($tpl);
		@ob_end_flush();
		fclose($fp);
		$fp = null;
		addLog("create $f\n");
		/*
		if (getenv("doGitAdd"))
			system("git add $f");
		*/
	}

	// opt: {indent?=0, compact?=false}
	static function exportArr($arr, $indent=0)
	{
		$isKv = isArrayAssoc($arr);
		$isMultiLine = count($arr) > 0 && is_array(current($arr));
		$str = "[";
		$first = true;
		foreach ($arr as $k => $e) {
			if ($first) {
				$first = false;
			}
			else {
				$str .= ", ";
			}
			if ($isMultiLine) {
				$str .= "\n" . self::indent($indent+1);
			}
			if ($isKv) {
				$str .= "\"$k\" => ";
			}
			if (is_array($e)) {
				$str .= self::exportArr($e, $indent+1);
			}
			else {
				$str .= var_export($e, true);
			}
		}
		if ($isMultiLine) {
			$str .= "\n";
			$str .= self::indent($indent);
		}
		$str .= "]";
		return $str;
	}

	static function indent($n, $str = null)
	{
		$v = str_repeat("\t", $n);
		if ($str == null)
			return $v;
		return preg_replace('/^/m', $v, $str);
	}
}
