/**
 * utils.jsx — Утилиты: работа с путями, файлами, форматирование.
 */

var Utils = (function () {

    var isWindows = $.os.indexOf("Windows") !== -1;
    var sep = isWindows ? "\\" : "/";

    /**
     * Нормализует разделители пути под текущую ОС.
     */
    function normalizePath(path) {
        if (isWindows) {
            return path.replace(/\//g, "\\");
        }
        return path.replace(/\\/g, "/");
    }

    /**
     * Возвращает размер файла в байтах. -1 если файл не найден.
     */
    function getFileSize(filePath) {
        try {
            var f = new File(normalizePath(filePath));
            if (!f.exists) return -1;
            f.open("r");
            var size = f.length;
            f.close();
            return size;
        } catch (e) {
            $.writeln("[WARN] getFileSize error: " + e.message);
            return -1;
        }
    }

    /**
     * Ждёт появления файла и стабилизации его размера.
     * Адаптивно: для файлов < 1 МБ достаточно 1 проверки стабильности,
     * для больших — полный цикл из Config.fileStableCount проверок.
     * Возвращает размер в байтах или -1 при таймауте.
     */
    function waitForStableFile(filePath, timeoutMs, intervalMs, stableNeeded) {
        var timeout = timeoutMs || Config.fileStableTimeout;
        var interval = intervalMs || Config.fileStableInterval;
        var needed = stableNeeded || Config.fileStableCount;

        var start = new Date().getTime();
        var lastSize = -1;
        var stableCount = 0;
        var adaptiveApplied = false;

        while ((new Date().getTime() - start) < timeout) {
            try {
                var f = new File(normalizePath(filePath));
                if (f.exists) {
                    f.open("r");
                    var len = f.length;
                    f.close();

                    if (len > 0) {
                        // Адаптивный порог: маленькие файлы пишутся мгновенно
                        if (!adaptiveApplied && len < 1024 * 1024) {
                            needed = 1;
                            adaptiveApplied = true;
                        }

                        if (len === lastSize) {
                            stableCount++;
                        } else {
                            stableCount = 0;
                        }
                        lastSize = len;

                        if (stableCount >= needed) return len;
                    }
                }
            } catch (e) {
                // файл может быть заблокирован — просто ждём
            }
            app.wait(interval);
        }

        return lastSize;
    }

    /**
     * Форматирует размер в человекочитаемый вид.
     */
    function formatSize(bytes) {
        if (bytes < 1024) return bytes + " Б";
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + " КБ";
        return (bytes / (1024 * 1024)).toFixed(2) + " МБ";
    }

    /**
     * Создаёт папку, если она не существует.
     * Возвращает true при успехе.
     */
    function ensureFolder(path) {
        try {
            var folder = new Folder(normalizePath(path));
            if (!folder.exists) {
                if (!folder.create()) {
                    $.writeln("[ERROR] Не удалось создать папку: " + path);
                    return false;
                }
            }
            return true;
        } catch (e) {
            $.writeln("[ERROR] ensureFolder: " + e.message);
            return false;
        }
    }

    /**
     * Безопасно удаляет файл. Возвращает true при успехе.
     */
    function removeFile(filePath) {
        try {
            var f = new File(normalizePath(filePath));
            if (f.exists) {
                return f.remove();
            }
            return true;
        } catch (e) {
            $.writeln("[WARN] removeFile error: " + filePath + " — " + e.message);
            return false;
        }
    }

    /**
     * Читает текстовый файл целиком. Возвращает null при ошибке.
     */
    function readTextFile(filePath) {
        try {
            var f = new File(normalizePath(filePath));
            if (!f.exists) return null;
            f.open("r");
            var content = f.read();
            var encoding = f.encoding;
            f.close();
            return { content: content, encoding: encoding };
        } catch (e) {
            $.writeln("[ERROR] readTextFile: " + e.message);
            return null;
        }
    }

    /**
     * Записывает текст в файл. Возвращает true при успехе.
     */
    function writeTextFile(filePath, content, encoding) {
        try {
            var f = new File(normalizePath(filePath));
            f.encoding = encoding || "UTF-8";
            f.open("w");
            f.write(content);
            f.close();
            return true;
        } catch (e) {
            $.writeln("[ERROR] writeTextFile: " + e.message);
            return false;
        }
    }


    /**
     * Извлекает имя файла без расширения.
     */
    function baseName(filePath) {
        var f = new File(normalizePath(filePath));
        var name = f.displayName;
        var dot = name.lastIndexOf(".");
        return dot > 0 ? name.substring(0, dot) : name;
    }

    /**
     * Проверяет, заканчивается ли строка на указанный суффикс.
     */
    function endsWith(str, suffix) {
        return str.indexOf(suffix) === str.length - suffix.length;
    }

    /**
     * Возвращает текущее время в формате HH:MM:SS для логов.
     */
    function timestamp() {
        var d = new Date();
        var h = d.getHours();
        var m = d.getMinutes();
        var s = d.getSeconds();
        return (h < 10 ? "0" : "") + h + ":" +
               (m < 10 ? "0" : "") + m + ":" +
               (s < 10 ? "0" : "") + s;
    }

    // Файл лога: создаётся рядом со скриптом
    var logFile = null;
    var logFilePath = null;

    /**
     * Инициализирует лог-файл. Вызывается один раз при старте.
     */
    function initLogFile() {
        try {
            var scriptFile = new File($.fileName);
            var d = new Date();
            var dateStr = d.getFullYear() +
                          (d.getMonth() < 9 ? "0" : "") + (d.getMonth() + 1) +
                          (d.getDate() < 10 ? "0" : "") + d.getDate() + "_" +
                          (d.getHours() < 10 ? "0" : "") + d.getHours() +
                          (d.getMinutes() < 10 ? "0" : "") + d.getMinutes() +
                          (d.getSeconds() < 10 ? "0" : "") + d.getSeconds();
            logFilePath = scriptFile.parent.fsName + sep + "convert_" + dateStr + ".log";
            logFile = new File(normalizePath(logFilePath));
            logFile.encoding = "UTF-8";
            logFile.open("w");
            logFile.writeln("=== GIF to WebM Converter Log ===");
            logFile.writeln("Started: " + d.toLocaleString());
            logFile.writeln("");
        } catch (e) {
            $.writeln("[WARN] Не удалось создать лог-файл: " + e.message);
            logFile = null;
        }
    }

    /**
     * Закрывает лог-файл.
     */
    function closeLogFile() {
        if (logFile) {
            try {
                logFile.writeln("");
                logFile.writeln("=== Log closed: " + new Date().toLocaleString() + " ===");
                logFile.close();
            } catch (e) { /* ignore */ }
            logFile = null;
        }
    }

    /**
     * Возвращает путь к текущему лог-файлу (или null).
     */
    function getLogFilePath() {
        return logFilePath;
    }

    /**
     * Логирование с таймстампом. Пишет в консоль и в файл.
     */
    function log(msg) {
        var line = "[" + timestamp() + "] " + msg;
        $.writeln(line);
        if (logFile) {
            try {
                logFile.writeln(line);
            } catch (e) { /* ignore */ }
        }
    }

    /**
     * Возвращает текущее время в миллисекундах (для замера длительности).
     */
    function now() {
        return new Date().getTime();
    }

    /**
     * Форматирует длительность в мс в человекочитаемый вид.
     */
    function formatDuration(ms) {
        if (ms < 1000) return ms + " мс";
        var sec = (ms / 1000).toFixed(1);
        return sec + " сек";
    }

    // Публичный API
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
        getLogFilePath: getLogFilePath
    };

})();
