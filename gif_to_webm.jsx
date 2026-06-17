/**
 * gif_to_webm.jsx — Конвертер GIF → WebM для Telegram стикеров.
 *
 * Автоматически подбирает quality и bitrate бинарным поиском,
 * чтобы выходной файл попал в целевой диапазон размера.
 *
 * Структура:
 *   modules/config.jsx             — конфигурация
 *   modules/utils.jsx              — утилиты (файлы, пути, форматирование)
 *   modules/preset_manager.jsx     — управление пресетами AME
 *   modules/encoder_controller.jsx — бинарный поиск и кодирование
 *   modules/file_processor.jsx     — пакетная обработка файлов
 *
 * Использование:
 *   1. Откройте Adobe Media Encoder
 *   2. Настройте Config.sourcePath в modules/config.jsx
 *   3. Положите пресет-шаблон рядом со скриптом
 *   4. Запустите этот скрипт через File → Scripts → Run Script
 */

//@include "src/config.jsx"
//@include "src/utils.jsx";
//@include "src/preset_manager.jsx";
//@include "src/encoder_controller.jsx";
//@include "src/file_processor.jsx";

var settings = Config.userSettings;

settings.outputFolder = "/Users/vladimir/Projects/Stickers/test/Output";

settings.sourcePath = "/Users/vladimir/Projects/Stickers/test";

settings.presetFileName = "metadata.epr";

settings.outputSize = 512;

settings.minFileSize = 230;
settings.maxFileSize = 256;
// Запуск
FileProcessor.run();

$.writeln("Скрипт завершён.");
