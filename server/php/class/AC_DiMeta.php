<?php
class AC0_DiMeta extends AccessControl
{
	protected $subobj = [
		"uiMeta" => ["obj"=>"UiMeta", "cond"=>"diId={id}"]
	];

	function api_sync() {
		$id = mparam("id");
		$this->sync($id);
	}
	function api_syncAc() {
		checkParams($_POST, ["id", "name"]);
		$this->syncAc($_POST);
	}
	function api_diff() {
		$id = mparam("id");
		$meta = queryOne("SELECT * FROM DiMeta", true, $id);
		$this->syncDb([$meta], true);
	}

	function api_syncAll() {
		$this->cleanAc();
		$metaList = queryAll("SELECT * FROM DiMeta", true);
		$this->syncDb($metaList);
		foreach ($metaList as $meta) {
			$this->syncAc($meta);
		}
	}

	function api_cleanAll() {
		$this->cleanAc();
		execOne("TRUNCATE DiMeta");
		execOne("TRUNCATE UiMeta");
		execOne("TRUNCATE UiCfg");
	}
	function api_del() {
		// 删除AC类
		$id = mparam("id");
		list ($manageAcFlag, $name) = queryOne("SELECT manageAcFlag, name FROM DiMeta WHERE id=$id");
		if ($manageAcFlag) {
			$this->onAfterActions[] = function () use ($name) {
				$this->cleanAc($name);
			};
		}
		return parent::api_del();
	}
	function api_class_exists() {
		$cls = mparam("cls");
		return DiMeta::class_exists($cls);
	}

	private function cleanAc($name=null) {
		$dir = __DIR__ . "/ext";
		if ($name) {
			@unlink("$dir/AC_{$name}.php");
			@unlink("$dir/AC_{$name}_Imp.php");
		}
		else {
			foreach (glob("$dir/*.php") as $e) {
				@unlink($e);
			}
		}
	}

	function syncDb($metaArr, $doDiff=false)
	{
		$tableDefs = arrMap($metaArr, function ($meta) {
			$tableName = $meta["name"];
			$alias = $GLOBALS["conf_tableAlias"][$meta["name"]];
			if ($alias)
				$tableName = $alias;
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
		DiMeta::updateDB($tableDefs, $doDiff);
	}

	function sync($id, $skipSyncDb = false) {
		$meta = queryOne("SELECT * FROM DiMeta", true, $id);

		if (!$skipSyncDb)
			$this->syncDb([$meta]);

		if (issetval("manageAcFlag")) {
			$name = $meta["name"];
			if ($meta["manageAcFlag"] == 1 && (DiMeta::class_exists("AC0_".$name) || DiMeta::class_exists("AC2_" . $name)) ) {
				jdRet(E_FORBIDDEN, "object $name exists", "对象`$name`已存在，请检查[生成托管接口]是否应设置为[扩展]");
			}
			$this->cleanAc($name);
		}
		if ($meta["manageAcFlag"])
			$this->syncAc($meta);
	}

	function syncAc($meta)
	{
		// 子系统的AC须由子系统创建，这时应配置子系统URL：`conf_subsys_url_{子系统名}`
		$alias = $GLOBALS["conf_tableAlias"][$meta["name"]];
		if ($alias && strpos($alias, '.') > 0) {
			session_write_close(); // NOTE: 由于主系统与子系统共享会话，须先解锁当前会话，否则会造成死锁
			list ($subsys, $tbl) = explode(".", $alias);
			$url = getConf("conf_subsys_url_$subsys") . "/DiMeta.syncAc?_app=" . $this->env->appName;
			$headers = [
				"Cookie: " . $_SERVER["HTTP_COOKIE"]
			];
			$rv0 = httpCall($url, $meta, ["useJson"=>1, "headers"=>$headers]);
			$rv = json_decode($rv0, true);
			if ( $rv[0] !== 0 )
				jdRet(E_PARAM, "subsys `$subsys` return: $rv0", "子系统{$subsys}更新AC出错: " . $rv[1]);
			return;
		}

		$dir = __DIR__ . "/ext";
		if (! is_dir($dir)) {
			$rv = mkdir($dir);
			if (!$rv)
				jdRet(E_SERVER, "cannot create dir: $dir");
		}
		DiMeta::genFileWithTpl($dir, $meta);
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

		$this->onAfterActions[] = function () {
			$this->sync($this->id, true); // 只更新AC，不更新DB
		};
	}
}

class AC2_DiMeta extends AC0_DiMeta
{
	protected function onInit() {
		if (!in_array($this->ac, ["get", "query"]))
			checkAuth(PERM_MGR);
		parent::onInit();
	}
}

class DiMeta
{
	static function updateDB($tableDefs, $doDiff=false)
	{
		require_once(__DIR__ . "/../../tool/upgrade/upglib.php");
		$upgOpt = ["tableDefs" => $tableDefs, "dbh" => getJDEnv()->DBH];
		if (!$doDiff) {
			$upgOpt["prompt"] = function ($str) {
				addLog($str);
			};
		}
		$h = new UpgHelper($upgOpt);
		if (!$doDiff) {
			$h->updateDB();
		}
		else {
			$h->showTable(null, true);
			echo("!!! JUST SHOW SQL. Please copy and execute SQL manually.\n");
			jdRet();
		}
	}

	static function genFileWithTpl($dir, $meta)
	{
		$acLogic1 = []; // { AC0/AC1/AC2 => {vcols, subobjs, allowedAc, ..., onInit, onValidate, ...} }

		// 预处理
		if (isset($meta["vcols"])) {
			$vcols = jsonDecode($meta["vcols"]);
			foreach ($vcols as &$vcol) {
				foreach($vcol["res"] as &$res) {
					$def = $res["def"];
					if ($def[0] != '(' && stripos($def, 'select') !== false) {
						$def = "($def)";
						if (!isset($res["name"]))
							jdRet(E_PARAM, "require res.name: def $def", "虚拟字段中复杂查询必须定义name. def=$def");
					}
					if (isset($res["name"]))
						$res = $def . ' ' . $res["name"];
					else
						$res = $def;
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

		$outf = []; // acFile => clsList
		$f = self::getAcFile($meta, $meta["name"]);
		$outf[$f] = ["AC0", "AC1", "AC2"];
		// 合并acLogic=[{class=AC0/AC1/AC2, name=allowedAc/..., type}] -> acLogic1
		if (isset($meta["acLogic"])) {
			$acLogic = jsonDecode($meta["acLogic"]);
			foreach ($acLogic as $one) {
				$class = $one["class"] ?: "AC0";
				if (! in_array($class, ["AC0", "AC1", "AC2"])) {
					$f = self::getAcFile($meta, preg_replace('/AC\d?_/', '', $class));
					$outf[$f][] = $class;
				}
				foreach ($one as $k=>$v) {
					if (in_array($k, ["allowedAc", "requiredFields", "requiredFields2", "readonlyFields", "readonlyFields2"])) {
						foreach ($v as $v1) {
							$acLogic1[$class][$k][] = $v1;
						}
					}
					else if (in_array($k, ["onInit", "onValidate", "onValidateId", "onQuery", "userCode"])) {
						$acLogic1[$class][$k] .= "$v\n";
					}
				}
			}
		}
		$meta["acLogic1"] = $acLogic1;

		foreach ($outf as $f0 => $clsList) {
			$f = $dir . "/" . $f0;
			$fp = fopen($f, "w");
			ob_start(function ($buf) use ($fp){
				fwrite($fp, $buf);
			});
			if ($meta["manageAcFlag"] == 1) { // 独立接口
				DiMetaTpl::exec($meta, $clsList);
			}
			else if ($meta["manageAcFlag"] == 2) { // 扩展接口
				DiMetaTpl2::exec($meta, $clsList);
			}
			@ob_end_flush();
			fclose($fp);
			$fp = null;
			addLog("create $f\n");
		}
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

	static function getAcFile($meta, $name) {
		if ($meta["manageAcFlag"] == 1) { // 独立接口
			$f = "AC_" . $name . ".php";
		}
		else if ($meta["manageAcFlag"] == 2) { // 扩展接口
			$f = "AC_" . $name . "_Imp.php";
		}
		return $f;
	}

	static function class_exists($cls) {
		$GLOBALS["conf_classDir"] = ["class"]; // 去除扩展类, 避免影响class_exists
		if (class_exists($cls))
			return true;
		if (is_array($GLOBALS["conf_subsys"])) {
			foreach ($GLOBALS["conf_subsys"] as $subsys) {
				// 检查类在子系统是否存在
				session_write_close(); // NOTE: 由于主系统与子系统共享会话，须先解锁当前会话，否则会造成死锁
				$url = getConf("conf_subsys_url_$subsys") . "/DiMeta.class_exists?_app=" . getJDEnv()->appName;
				$headers = [
					"Cookie: " . $_SERVER["HTTP_COOKIE"]
				];
				$rv0 = httpCall($url, ["cls"=>$cls], ["useJson"=>1, "headers"=>$headers]);
				$rv = json_decode($rv0, true);
				if ( $rv[0] !== 0 )
					jdRet(E_PARAM, "subsys `$subsys` return: $rv0", "子系统{$subsys}查询AC出错: " . $rv[1]);
				return $rv[1];
			}
		}
		return false;
	}
}
