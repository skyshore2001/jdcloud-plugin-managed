<?php

chdir(__DIR__);
require_once("../api.php");

$addonPackage="upgrade/addon.sql.gz";

if (isCLI()) {
	$ac = $argv[1];
}
else {
	$ac = $_GET["ac"] ?: $_SERVER["PATH_INFO"];
	if ($ac[0] == '/')
		$ac = substr($ac, 1);
	header("content-type: text/plain");
	header("cache-control: nocache");
}

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
	echo("Usage: php upgrade-addon.php all|install|clean\n");
}

function setEnvForDb()
{
	$P_DB = getenv("P_DB");
	$P_DBCRED = getenv("P_DBCRED");

	assert($P_DB && $P_DBCRED);
	if (! preg_match('/^"?(.*?)(:(\d+))?\/(\w+)"?$/', $P_DB, $ms))
		die("bad db=`{$P_DB}`");
	$dbhost = $ms[1];
	$dbport = $ms[3] ?: 3306;
	$dbname = $ms[4];

	list($dbuser, $dbpwd) = getCred($P_DBCRED); 
	putenv("dbhost=$dbhost");
	putenv("dbport=$dbport");
	putenv("dbname=$dbname");
	putenv("dbuser=$dbuser");
	putenv("dbpwd=$dbpwd");

	global $addonPackage;
	putenv("addon=$addonPackage");
}

function doExport()
{
	setEnvForDb();
	$cmd = 'sh -c "mysqldump -h $dbhost -P $dbport -u $dbuser -p\"$dbpwd\" $dbname DiMeta UiMeta UiCfg | gzip > $addon 2>&1"';
	$out = system($cmd, $rv);
	if ($rv) {
		echo("*** fail to export addon.\n");
		return;
	}
	global $addonPackage;
	echo("=== create server/tool/$addonPackage\n");

	$cmd = 'sh -c "git add $addon"';
	$out = system($cmd, $rv);
}

function doImport()
{
	setEnvForDb();

	$cmd = 'sh -c "zcat $addon | mysql -h $dbhost -P $dbport -u $dbuser -p\"$dbpwd\" $dbname 2>&1"';
	$out = system($cmd, $rv);
	if ($rv) {
		echo("*** fail to import addon.\n");
		return;
	}
	echo("=== import done\n");

	login();
	$rv = callSvc("DiMeta.syncAll");
	if ($rv[0] != 0) {
		echo("*** fail to sync meta\n" . jsonEncode($rv,true) . "\n");
		return;
	}
	echo("=== sync meta done\n");
}

function doCleanAll()
{
	login();
	$rv = callSvc("DiMeta.cleanAll");
	if ($rv[0] != 0) {
		echo("*** fail to clean all\n" . jsonEncode($rv,true) . "\n");
		return;
	}
	echo("=== addon-clean done\n");
}

function login()
{
	session_start(); // 注意：此处开的session位置与默认callSvc中位置不同，不影响正常应用的登录。
	$_SESSION["empId"] = 1;
}
