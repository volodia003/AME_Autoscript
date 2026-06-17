/**
 * file_processor.jsx — Обработка списка входных файлов.
 */
var FileProcessor = (function () {
  var inputFiles = [],
    currentFileIndex = 0,
    failedFiles = [],
    exporter = null;

  function cleanupPreviousRun() {
    var root = new File($.fileName).parent.fsName;
    var tempPreset = new File(Utils.normalizePath(root + Utils.sep + "public" + Utils.sep + "Stickers_temp.epr"));
    if (tempPreset.exists) Utils.removeFile(tempPreset.fsName);

    try {
      var logs = new Folder(Utils.normalizePath(root)).getFiles("../log/convert_*.log");
      if (logs && logs.length > 5) {
        logs.sort(function (a, b) {
          return a.modified - b.modified;
        });
        for (var i = 0; i < logs.length - 5; i++) Utils.removeFile(logs[i].fsName);
      }
    } catch (e) {}
  }

  function collectFiles(folderPath) {
    var folder = new Folder(Utils.normalizePath(folderPath));
    if (!folder.exists) return [];
    var exts = Config.inputExtensions;
    return (
      folder.getFiles(function (f) {
        if (!(f instanceof File)) return false;
        var name = String(f.name).toLowerCase();
        for (var i = 0; i < exts.length; i++) if (Utils.endsWith(name, exts[i])) return true;
        return false;
      }) || []
    );
  }

  function getOutputFolder(sourceFilePath) {
    var outPath = new File(Utils.normalizePath(sourceFilePath)).parent.fsName + Utils.sep + "Output";
    Utils.ensureFolder(outPath);
    return outPath;
  }

  function processFile(fileObj) {
    var sourcePath = Utils.normalizePath(fileObj.fsName);
    var destPath = getOutputFolder(sourcePath) + Utils.sep + Utils.baseName(sourcePath) + ".webm";

    Utils.log("============================================");
    Utils.log("Файл " + (currentFileIndex + 1) + "/" + inputFiles.length + ": " + sourcePath);
    Utils.log("============================================");

    var st = EncoderController.createState(sourcePath, destPath, exporter);
    EncoderController.tryEncode(st);

    while (!st.finished) app.wait(Config.mainLoopInterval);
    if (!st.success) failedFiles.push(new File(sourcePath).displayName);
  }

  function printReport(totalElapsed) {
    Utils.log("============================================");
    Utils.log("Обработка завершена. Файлов: " + inputFiles.length + " | " + Utils.formatDuration(totalElapsed));
    if (failedFiles.length > 0) {
      Utils.log("Не удалось уложить в размер (" + failedFiles.length + "):");
      for (var i = 0; i < failedFiles.length; i++) Utils.log("  - " + failedFiles[i]);
    } else if (inputFiles.length > 0) Utils.log("Все файлы обработаны успешно.");
    Utils.log("============================================");
  }

  function run() {
    Utils.initLogFile();
    cleanupPreviousRun();

    var configErrors = validateConfig();
    if (configErrors.length > 0) {
      Utils.log("[ERROR] Ошибки конфигурации:");
      for (var e = 0; e < configErrors.length; e++) Utils.log("  - " + configErrors[e]);
      Utils.closeLogFile();
      return false;
    }

    // ВНИМАНИЕ: Мутация (*= 1024) удалена. Оперируем строгими килобайтами вплоть до контроллера.

    exporter = app.getExporter();
    if (!exporter) return false;

    exporter.addEventListener(
      "onEncodeComplete",
      function () {
        Utils.log("[DEBUG] onEncodeComplete");
      },
      false,
    );
    exporter.addEventListener(
      "onError",
      function () {
        Utils.log("[ERROR] Export error");
      },
      false,
    );

    if (!new File(Utils.normalizePath(PresetManager.getMasterPath())).exists) return false;

    var sourcePath = Utils.normalizePath(Config.userSettings.sourcePath);
    inputFiles = collectFiles(sourcePath);
    if (!inputFiles || inputFiles.length === 0) return false;

    Utils.log("============================================");
    Utils.log("Пакетная конвертация: " + sourcePath);
    Utils.log("Файлов: " + inputFiles.length);
    Utils.log("Размер: " + Config.userSettings.outputSize + "x" + Config.userSettings.outputSize);
    Utils.log(
      "Целевой размер: " + Config.userSettings.minFileSize + " КБ — " + Config.userSettings.maxFileSize + " КБ",
    );
    Utils.log("============================================");

    var totalStart = Utils.now();
    for (currentFileIndex = 0; currentFileIndex < inputFiles.length; currentFileIndex++) {
      processFile(inputFiles[currentFileIndex]);
    }

    printReport(Utils.now() - totalStart);
    PresetManager.cleanup();
    Utils.closeLogFile();
    return true;
  }

  return { run: run };
})();
