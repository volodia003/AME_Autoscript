/**
 * gif_to_webm.jsx — Конвертер GIF → WebM для Telegram стикеров.
 *
 * Автоматически подбирает quality и bitrate бинарным поиском,
 * чтобы выходной файл попал в целевой диапазон размера (250–256 КБ).
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
 *   3. Положите пресет-шаблон (Stickers0.epr) рядом со скриптом
 *   4. Запустите этот скрипт через File → Scripts → Run Script
 */

// Подключаем модули (порядок важен — зависимости идут первыми)
#include "modules/config.jsx"
#include "modules/utils.jsx"
#include "modules/preset_manager.jsx"
#include "modules/encoder_controller.jsx"
#include "modules/file_processor.jsx"

// Запуск
FileProcessor.run();

$.writeln("Скрипт завершён.");
