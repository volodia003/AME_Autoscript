/**
 * utils.jsx — Утилиты: работа с путями, файлами, форматирование.
 */
var Utils = (function () {
  var isWindows = $.os.indexOf("Windows") !== -1;
  var sep = isWindows ? "\\" : "/";

  function normalizePath(path) {
    return isWindows ? path.replace(/\//g, "\\") : path.replace(/\\/g, "/");
  }

  function getFileSize(filePath) {
    try {
      var f = new File(normalizePath(filePath));
      if (!f.exists) return -1;
      f.open("r");
      var size = f.length;
      f.close();
      return size;
    } catch (e) {
      return -1;
    }
  }

  function waitForStableFile(filePath, timeoutMs, intervalMs, stableNeeded) {
    // ИСПРАВЛЕНО: fileStableTimeout вместо fileStabvarimeout
    var timeout = timeoutMs || Config.fileStableTimeout;
    var interval = intervalMs || Config.fileStableInterval;
    var needed = stableNeeded || Config.fileStableCount;

    var start = new Date().getTime();
    var lastSize = -1;
    var stableCount = 0;

    while (new Date().getTime() - start < timeout) {
      try {
        var f = new File(normalizePath(filePath));
        if (f.exists) {
          f.open("r");
          var len = f.length;
          f.close();

          if (len > 0) {
            if (len < 1024 * 1024) needed = 1; // Адаптивный порог для легких файлов

            if (len === lastSize) stableCount++;
            else stableCount = 0;

            lastSize = len;
            if (stableCount >= needed) return len;
          }
        }
      } catch (e) {}
      app.wait(interval);
    }
    return lastSize;
  }

  function formatSize(bytes) {
    if (bytes < 1024) return bytes + " Б";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + " КБ";
    return (bytes / (1024 * 1024)).toFixed(2) + " МБ";
  }

  function ensureFolder(path) {
    var folder = new Folder(normalizePath(path));
    if (!folder.exists) return folder.create();
    return true;
  }

  function removeFile(filePath) {
    var f = new File(normalizePath(filePath));
    return f.exists ? f.remove() : true;
  }

  function readTextFile(filePath) {
    var f = new File(normalizePath(filePath));
    if (!f.exists) return null;
    f.open("r");
    var content = f.read();
    var encoding = f.encoding;
    f.close();
    return { content: content, encoding: encoding };
  }

  function writeTextFile(filePath, content, encoding) {
    var f = new File(normalizePath(filePath));
    f.encoding = encoding || "UTF-8";
    f.open("w");
    f.write(content);
    f.close();
    return true;
  }

  function baseName(filePath) {
    var name = new File(normalizePath(filePath)).displayName;
    var dot = name.lastIndexOf(".");
    return dot > 0 ? name.substring(0, dot) : name;
  }

  function endsWith(str, suffix) {
    return str.indexOf(suffix) === str.length - suffix.length;
  }

  function timestamp() {
    var d = new Date();
    var h = d.getHours(),
      m = d.getMinutes(),
      s = d.getSeconds();
    return (h < 10 ? "0" : "") + h + ":" + (m < 10 ? "0" : "") + m + ":" + (s < 10 ? "0" : "") + s;
  }

  var logFile = null;
  var logFilePath = null;

  function initLogFile() {
    var scriptFile = new File($.fileName);
    var d = new Date();
    var dateStr =
      d.getFullYear() +
      (d.getMonth() < 9 ? "0" : "") +
      (d.getMonth() + 1) +
      (d.getDate() < 10 ? "0" : "") +
      d.getDate() +
      "_" +
      (d.getHours() < 10 ? "0" : "") +
      d.getHours() +
      (d.getMinutes() < 10 ? "0" : "") +
      d.getMinutes();
    logFilePath = scriptFile.parent.parent.fsName + sep + "log" + sep + "convert_" + dateStr + ".log";
    logFile = new File(normalizePath(logFilePath));
    logFile.encoding = "UTF-8";
    logFile.open("w");
    logFile.writeln("=== GIF to WebM Converter Log ===");
    logFile.writeln("Started: " + d.toLocaleString() + "\n");
  }

  function closeLogFile() {
    if (logFile) {
      logFile.writeln("\n=== Log closed: " + new Date().toLocaleString() + " ===");
      logFile.close();
      logFile = null;
    }
  }

  function getLogFilePath() {
    return logFilePath;
  }

  function log(msg) {
    var line = "[" + timestamp() + "] " + msg;
    $.writeln(line);
    if (logFile) logFile.writeln(line);
  }

  function now() {
    return new Date().getTime();
  }

  function formatDuration(ms) {
    return ms < 1000 ? ms + " мс" : (ms / 1000).toFixed(1) + " сек";
  }

  return {
    sep: sep,
    normalizePath: normalizePath,
    getFileSize: getFileSize,
    waitForStableFile: waitForStableFile,
    formatSize: formatSize,
    ensureFolder: ensureFolder,
    removeFile: removeFile,
    readTextFile: readTextFile,
    writeTextFile: writeTextFile,
    baseName: baseName,
    endsWith: endsWith,
    timestamp: timestamp,
    log: log,
    now: now,
    formatDuration: formatDuration,
    initLogFile: initLogFile,
    closeLogFile: closeLogFile,
    getLogFilePath: getLogFilePath,
  };
})();
