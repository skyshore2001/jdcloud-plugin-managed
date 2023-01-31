<?php

chdir(__DIR__ . '/..'); // baseDir: server/
require_once("api.php");

$addonPackage="tool/upgrade/addon.xml";

$jsonOut = false;

if (isCLI()) {
	$ac = $argv[1];
}
else {
	$ac = $_GET["ac"] ?: $_SERVER["PATH_INFO"];
	if ($ac[0] == '/')
		$ac = substr($ac, 1);
	header("content-type: text/plain");
	header("cache-control: nocache");

	if ($_GET["fmt"] == "json") {
		$ret = null;
		$jsonOut = true;
		$debugInfo = redirectOut(function () use ($ac, &$ret) {
			$ret = doCmd($ac);
		});
		if ($debugInfo)
			$ret[] = $debugInfo;
		echo(jsonEncode($ret, true));
		exit();
	}
}
doCmd($ac);

function doCmd($ac)
{
	global $jsonOut;
	$ret = [0, null];
	try {
		if ($ac == "all") {
			doExport();
		}
		else if ($ac == "install") {
			doImport();
		}
		else if ($ac == "clean") {
			doCleanAll();
		}
		else {
			if ($jsonOut) {
				return [E_PARAM, "bad cmd $ac"];
			}
			echo("Usage: php upgrade-addon.php all|install|clean\n");
		}
	}
	catch (DirectReturn $ex) {
		if ($jsonOut) {
			if ($ex->isUserFmt) {
				$ret = $ex->data;
			}
		}
	}
	catch (MyException $ex) {
		if ($jsonOut) {
			$ret = [$ex->getCode(), $ex->getMessage()];
			if ($ex->internalMessage)
				$ret[] = $ex->internalMessage;
		}
		else {
			echo($ex);
		}
	}
	return $ret;
}

function doExport()
{
	$wr = new XmlWriter();
	$wr->openMemory();
	$wr->setIndent(true);
	$wr->startElement("JdcloudAddon");
	Db2Xml::writeXmlWithJsonFields($wr, "DiMeta", ["cols", "vcols", "subobjs", "acLogic"]);
	Db2Xml::writeXmlWithJsonFields($wr, "UiMeta", ["fields"]);
	Db2Xml::writeXml($wr, "UiCfg");
	$wr->endElement();

	global $addonPackage;
	$xml = $wr->outputMemory(true);
	file_put_contents($addonPackage, $xml);
	echo("=== create server/tool/$addonPackage\n");

	myexec("git add $addonPackage");
}

class Db2Xml
{
/*
fieldFn($k, $v): 对字段进行自定义处理
*/
	static function writeXml($wr, $table, $fieldFn = null) {
		$arr = queryAll("SELECT * FROM $table", true);
		self::writeArr($wr, $arr, $table . "Table", $table, $fieldFn);
	}

/*
对于json字符串字段，直接展开它。通过jsonFields指定json字段。
*/
	static function writeXmlWithJsonFields($wr, $table, $jsonFields) {
		self::writeXml($wr, $table, function ($k, $v) use ($wr, $jsonFields) {
			if (in_array($k, $jsonFields)) {
				$jsonObj = jsonDecode($v);
				self::writeOne($wr, $k, $jsonObj);
				return true;
			}
		});
	}

	static function writeArr($wr, $arr, $arrName, $elemName, $fieldFn = null) {
		$wr->startElement($arrName);
		$wr->writeAttribute("count", count($arr)); // count属性作为array标识，在readOne时用
		foreach ($arr as $e) {
			self::writeOne($wr, $elemName, $e, $fieldFn);
		}
		$wr->endElement();
	}

	static function writeOne($wr, $k, $v, $fieldFn = null) {
		if ($v === null)
			return;

		if (is_array($v)) {
			if (isArray012($v)) {
				self::writeArr($wr, $v, $k, $k . '-element', $fieldFn);
				return;
			}

			// is obj
			$wr->startElement($k);
			foreach ($v as $k1=>$v1) {
				self::writeOne($wr, $k1, $v1, $fieldFn);
			}
			$wr->endElement();
			return;
		}

		if (is_string($v) && $v != "") {
			if ($fieldFn && $fieldFn($k, $v) === true) {
				return;
			}
			if (preg_match('/[\'\"\n]/', $v)) {
				$wr->startElement($k);
				if (stripos($v, "\n") !== false) {
					$v = "\n" . trim($v) . "\n";
				}
				$wr->writeCData($v);
				$wr->endElement();
				return;
			}
		}

		if ($v === null) {
			$v = "null";
		}
		else if ($v === true) {
			$v = "true";
		}
		else if ($v === false) {
			$v = "false";
		}
		$wr->writeElement($k, $v);
	}

	// $xml: SimpleXMLElement
	static function readArr($xml) {
		$ret = [];
		foreach ($xml->children() as $k => $xml1) {
			$v = self::readOne($xml1);
			$ret[] = $v;
		}
		return $ret;
	}
	static function readObj($xml, $doJson=false) {
		$ret = [];
		foreach ($xml->children() as $k => $xml1) {
			$v = self::readOne($xml1);
			if ($doJson && is_array($v))
				$v = jsonEncode($v, true);
			$ret[$k] = $v;
		}
		return $ret;
	}
	static function readOne($xml) {
		$atts = $xml->attributes();
		// is array
		if (isset($atts->count)) {
			return self::readArr($xml);
		}

		if ($xml->count() == 0) {
			$v = trim((string)$xml);
			if ($v === "null")
				$v = null;
			else if ($v === "true")
				$v = true;
			else if ($v === "false")
				$v = false;
			return $v;
		}

		// is obj
		return self::readObj($xml);
	}

	static function readXml($file) {
		@$rootXml = simplexml_load_file($file);
		if (!$rootXml)
			jdRet(E_SERVER, "fail to load addon file", "加载Addon文件失败");
		if ($rootXml->getName() != "JdcloudAddon")
			jdRet(E_PARAM, "bad jscloud addon package");
		foreach ($rootXml as $table => $tableXml) { // table: <DiMetaTable>
			$tableName = preg_replace('/Table$/', '', $table);
			execOne("TRUNCATE TABLE $tableName");
			foreach ($tableXml as $rowXml) {
				$rowData = self::readObj($rowXml, true);
				dbInsert($tableName, $rowData, true);
//				echo(jsonEncode($rowData, true));
			}
		}
	}
}

function doImport()
{
	global $addonPackage;
	Db2Xml::readXml($addonPackage);

	echo("=== import done\n");

	login();
	$rv = callSvc("DiMeta.syncAll");
	if ($rv[0] != 0) {
		echo("*** fail to sync meta: " . $rv[1] . " (" . $rv[2] . ")\n");
		global $jsonOut;
		if ($jsonOut)
			jdRet(null, $rv);
		return;
	}
	echo("=== sync meta done\n");
}

function doCleanAll()
{
	login();
	$rv = callSvc("DiMeta.cleanAll");
	if ($rv[0] != 0) {
		echo("*** fail to clean all: " . $rv[1] . " (" . $rv[2] . ")\n");
		global $jsonOut;
		if ($jsonOut)
			jdRet(null, $rv);
		return;
	}
	echo("=== addon-clean done\n");
}

function login()
{
	if (! isCLI())
		session_start(); // 注意：此处开的session位置与默认callSvc中位置不同，不影响正常应用的登录。
	$_SESSION["empId"] = -1;
	$_SESSION["perms"] = "mgr";
}
