/**
 * file_processor.jsx — Обработка списка входных файлов.
 *
 * Последовательно запускает EncoderController для каждого файла,
 * собирает статистику, выводит итоговый отчёт.
 */

var FileProcessor = (function () {

    var inputFiles = [];
    var currentFileIndex = 0;
    var failedFiles = [];
    var exporter = null;

    /**
     * Очистка артефактов от предыдущих запусков.
     * Удаляет temp-пресеты и старые лог-файлы (опционально).
     */
    function cleanupPreviousRun() {
        var scriptFile = new File($.fileName);
        var root = scriptFile.parent.fsName;

        // Удаляем temp-пресет если остался
        var tempPreset = new File(Utils.normalizePath(root + Utils.sep + "Stickers_temp.epr"));
        if (tempPreset.exists) {
            Utils.removeFile(tempPreset.fsName);
            Utils.log("[CLEANUP] Удалён temp-пресет от предыдущего запуска");
        }

        // Удаляем старые лог-файлы (оставляем последние 5)
        try {
            var folder = new Folder(Utils.normalizePath(root));
            var logs = folder.getFiles("convert_*.log");
            if (logs && logs.length > 5) {
                // Сортируем по дате модификации (старые первыми)
                logs.sort(function (a, b) {
                    return a.modified - b.modified;
                });
                var toDelete = logs.length - 5;
                for (var i = 0; i < toDelete; i++) {
                    Utils.removeFile(logs[i].fsName);
                    Utils.log("[CLEANUP] Удалён старый лог: " + logs[i].displayName);
                }
            }
        } catch (e) {
            // не критично
        }
    }

    /**
     * Собирает список входных файлов из папки.
     */
    function collectFiles(folderPath) {
        var folder = new Folder(Utils.normalizePath(folderPath));
        if (!folder.exists) return [];

        var exts = Config.inputExtensions;
        return folder.getFiles(function (f) {
            if (!(f instanceof File)) return false;
            var name = String(f.name).toLowerCase();
            for (var i = 0; i < exts.length; i++) {
                if (Utils.endsWith(name, exts[i])) return true;
            }
            return false;
        }) || [];
    }

    /**
     * Определяет папку вывода для файла.
     */
    function getOutputFolder(sourceFilePath) {
        var f = new File(Utils.normalizePath(sourceFilePath));
        var parentPath = f.parent.fsName;
        var outPath = parentPath + Utils.sep + "Output";
        Utils.ensureFolder(outPath);
        return outPath;
    }

    /**
     * Запускает обработку одного файла.
     */
    function processFile(fileObj) {
        var sourcePath = Utils.normalizePath(fileObj.fsName);
        var destPath = getOutputFolder(sourcePath);

        Utils.log("============================================");
        Utils.log("Файл " + (currentFileIndex + 1) + "/" + inputFiles.length + ": " + sourcePath);
        Utils.log("============================================");

        var st = EncoderController.createState(sourcePath, destPath, exporter);
        EncoderController.tryEncode(st);

        // Ждём завершения обработки этого файла
        while (!st.finished) {
            app.wait(Config.mainLoopInterval);
        }

        if (!st.success) {
            var srcFile = new File(sourcePath);
            failedFiles.push(srcFile.displayName);
        }
    }

    /**
     * Выводит итоговый отчёт.
     */
    function printReport(totalElapsed) {
        Utils.log("============================================");
        Utils.log("Обработка завершена. Файлов: " + inputFiles.length + " | " + Utils.formatDuration(totalElapsed));
        if (failedFiles.length > 0) {
            Utils.log("Не удалось уложить в размер (" + failedFiles.length + "):");
            for (var i = 0; i < failedFiles.length; i++) {
                Utils.log("  - " + failedFiles[i]);
            }
        } else if (inputFiles.length > 0) {
            Utils.log("Все файлы обработаны успешно.");
        }
        Utils.log("============================================");
    }

    /**
     * Главная точка входа: валидация, инициализация и запуск обработки.
     */
    function run() {
        // Инициализируем лог-файл
        Utils.initLogFile();

        // Очистка артефактов от предыдущих запусков
        cleanupPreviousRun();

        // Валидация конфигурации
        var configErrors = validateConfig();
        if (configErrors.length > 0) {
            Utils.log("[ERROR] Ошибки конфигурации:");
            for (var e = 0; e < configErrors.length; e++) {
                Utils.log("  - " + configErrors[e]);
            }
            Utils.closeLogFile();
            return false;
        }

        // Получаем экспортер
        exporter = app.getExporter();
        if (!exporter) {
            Utils.log("[ERROR] Не удалось получить экспортер. Запустите Adobe Media Encoder.");
            Utils.closeLogFile();
            return false;
        }

        // Отладочные события экспортера
        exporter.addEventListener("onEncodeComplete", function () {
            Utils.log("[DEBUG] onEncodeComplete");
        }, false);
        exporter.addEventListener("onError", function () {
            Utils.log("[ERROR] Export error");
        }, false);

        // Проверяем мастер-пресет
        var masterFile = new File(Utils.normalizePath(PresetManager.getMasterPath()));
        if (!masterFile.exists) {
            Utils.log("[ERROR] Пресет не найден: " + PresetManager.getMasterPath());
            Utils.closeLogFile();
            return false;
        }

        // Собираем файлы
        var sourcePath = Utils.normalizePath(Config.sourcePath);
        var folder = new Folder(sourcePath);

        if (!folder.exists) {
            Utils.log("[ERROR] Путь не найден: " + Config.sourcePath);
            Utils.closeLogFile();
            return false;
        }

        inputFiles = collectFiles(sourcePath);
        if (!inputFiles || inputFiles.length === 0) {
            Utils.log("[ERROR] Нет подходящих файлов в: " + sourcePath);
            Utils.closeLogFile();
            return false;
        }

        Utils.log("============================================");
        Utils.log("Пакетная конвертация: " + sourcePath);
        Utils.log("Файлов: " + inputFiles.length);
        Utils.log("Размер: " + Config.outputSize + "x" + Config.outputSize);
        Utils.log("Целевой размер: " + Utils.formatSize(Config.minFileSize) + " — " + Utils.formatSize(Config.maxFileSize));
        Utils.log("============================================");

        var totalStart = Utils.now();

        // Обрабатываем файлы последовательно
        for (currentFileIndex = 0; currentFileIndex < inputFiles.length; currentFileIndex++) {
            processFile(inputFiles[currentFileIndex]);
        }

        printReport(Utils.now() - totalStart);

        // Очистка: удаляем временный пресет
        PresetManager.cleanup();

        // Закрываем лог-файл
        var logPath = Utils.getLogFilePath();
        if (logPath) {
            Utils.log("Лог сохранён: " + logPath);
        }
        Utils.closeLogFile();

        return true;
    }

    // Публичный API
    return {
        run: run
    };

})();
