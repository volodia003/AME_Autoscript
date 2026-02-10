/**
 * config.jsx — Конфигурация конвертера GIF → WebM
 *
 * Все настраиваемые параметры собраны в одном месте.
 */

var Config = {
    // Целевой размер выходного видео (px, квадрат)
    outputSize: 512,

    // Допустимый диапазон размера файла (байты)
    minFileSize: 250 * 1024,  // 250 КБ
    maxFileSize: 256 * 1024,  // 256 КБ

    // Путь к исходным файлам (папка или файл)
    sourcePath: "D:\\Stickers\\test",

    // Имя файла пресета-шаблона (лежит рядом со скриптом)
    presetFileName: "Stickers0.epr",

    // Кодирование
    defaultBitrate: 1000,
    bitrateStep: 50,
    minBitrate: 50,
    qualityStart: 50,
    qualityMin: 0,
    qualityMax: 100,

    // XML-теги в пресете для поиска параметров
    presetTags: {
        quality: "VideoQuality",
        bitrate: "VideoBitrate",
        width:   "VideoWidth",
        height:  "VideoHeight"
    },

    // Таймауты (мс)
    fileStableTimeout: 15000,
    fileStableInterval: 500,
    fileStableCount: 3,
    outputFilePollTimeout: 10000,
    outputFilePollInterval: 500,
    mainLoopInterval: 200,

    // Допустимые расширения входных файлов
    inputExtensions: [".gif", ".webm"]
};

/**
 * Валидация конфигурации. Вызывается при старте скрипта.
 * Возвращает массив ошибок (пустой = всё ок).
 */
function validateConfig() {
    var errors = [];

    if (Config.outputSize <= 0) {
        errors.push("outputSize должен быть > 0 (сейчас: " + Config.outputSize + ")");
    }
    if (Config.minFileSize >= Config.maxFileSize) {
        errors.push("minFileSize (" + Config.minFileSize + ") должен быть < maxFileSize (" + Config.maxFileSize + ")");
    }
    if (Config.minFileSize <= 0) {
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
