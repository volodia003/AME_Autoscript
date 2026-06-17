/**
 * config.jsx — Конфигурация конвертера GIF → WebM
 */

var Config = {
  userSettings: {
    outputFolder: "",
    outputSize: 0,
    minFileSize: 0,
    maxFileSize: 0,
    sourcePath: "",
    presetFileName: "",
  },
  // Кодирование
  defaultBitrate: 1000,
  bitrateStep: 50,
  minBitrate: 50,
  qualityStart: 50,
  qualityMin: 0,
  qualityMax: 100,

  // XML-теги в пресете для поиска параметров
  presetTags: {
    quality: "WebMVideoQuality",
    bitrate: "WebMVideoBitrate",
    width: "ADBEVideoWidth",
    height: "ADBEVideoHeight",
  },

  // Таймауты (мс)
  fileStableTimeout: 15000,
  fileStableInterval: 500,
  fileStableCount: 3,
  outputFilePollTimeout: 10000,
  outputFilePollInterval: 500,
  mainLoopInterval: 200,

  // Допустимые расширения входных файлов
  inputExtensions: [".gif", ".webm"],
};

/**
 * Валидация конфигурации. Вызывается при старте скрипта.
 * Возвращает массив ошибок (пустой = всё ок).
 */
function validateConfig() {
  var errors = [];

  if (Config.userSettings.outputSize <= 0) {
    errors.push("outputSize должен быть > 0 (сейчас: " + Config.userSettings.outputSize + ")");
  }
  if (Config.userSettings.minFileSize >= Config.userSettings.maxFileSize) {
    errors.push("minFileSize (" + Config.userSettings.minFileSize + ") должен быть < maxFileSize (" + Config.userSettings.maxFileSize + ")");
  }
  if (Config.userSettings.minFileSize <= 0) {
    errors.push("minFileSize должен быть > 0");
  }
  if (Config.defaultBitrate <= 0) {
    errors.push("defaultBitrate должен быть > 0");
  }
  if (Config.minBitrate <= 0) {
    errors.push("minBitrate должен быть > 0");
  }
  if (Config.bitrateStep <= 0) {
    errors.push("bitrateStep должен быть > 0");
  }
  if (Config.qualityMin < 0 || Config.qualityMax > 100) {
    errors.push("qualityMin/qualityMax должны быть в диапазоне 0–100");
  }
  if (Config.qualityMin >= Config.qualityMax) {
    errors.push("qualityMin должен быть < qualityMax");
  }
  if (Config.qualityStart < Config.qualityMin || Config.qualityStart > Config.qualityMax) {
    errors.push("qualityStart должен быть в диапазоне [qualityMin, qualityMax]");
  }

  return errors;
}
