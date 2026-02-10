/**
 * encoder_controller.jsx — Контроллер кодирования.
 *
 * Бинарный поиск оптимального quality (без массива candidates —
 * работаем напрямую с low/high как значениями quality 0–100).
 *
 * После первого кодирования пытается оценить целевой quality
 * линейной интерполяцией для ускорения сходимости.
 *
 * Защита от дубликатов: пропускает уже проверенные комбинации Q+bitrate.
 */

var EncoderController = (function () {

    /**
     * Создаёт начальное состояние для обработки одного файла.
     * startQuality позволяет задать стартовый quality (адаптивный старт из предыдущего файла).
     */
    function createState(sourcePath, destPath, exporter, startQuality) {
        var initQuality = (startQuality !== undefined && startQuality >= Config.qualityMin && startQuality <= Config.qualityMax)
            ? startQuality
            : Config.qualityStart;

        return {
            sourcePath: sourcePath,
            destPath: destPath,
            exporter: exporter,

            // Диапазон поиска quality (напрямую, без массива)
            low: Config.qualityMin,
            high: Config.qualityMax,
            currentQuality: initQuality,
            currentBitrate: Config.defaultBitrate,

            // Лучший найденный результат (<= maxFileSize)
            bestQuality: -1,
            bestBitrate: -1,
            bestSize: -1,
            bestOutputPath: null,

            // Все выходные файлы (для очистки)
            outputPaths: [],

            // История: ключ "Q_bitrate" → sizeBytes (защита от дубликатов)
            history: {},

            // Все замеры для интерполяции: [{ quality, size }]
            samples: [],

            isEncoding: false,
            finished: false,
            success: false,
            iterationStart: 0,
            totalStart: 0
        };
    }

    /**
     * Формирует ключ для истории проверенных комбинаций.
     */
    function historyKey(quality, bitrate) {
        return String(quality) + "_" + String(bitrate);
    }

    /**
     * Проверяет, была ли уже проверена эта комбинация.
     */
    function alreadyTried(st, quality, bitrate) {
        return st.history[historyKey(quality, bitrate)] !== undefined;
    }

    /**
     * Записывает результат в историю.
     */
    function recordHistory(st, quality, bitrate, size) {
        st.history[historyKey(quality, bitrate)] = size;
    }


    /**
     * Линейная интерполяция целевого quality по всем накопленным замерам.
     * Выбирает два замера, наиболее близких к целевому размеру (один выше, один ниже),
     * и интерполирует между ними.
     * Возвращает оценку quality или null если данных недостаточно.
     */
    function interpolateQuality(st) {
        if (st.samples.length < 2) return null;

        var targetSize = (Config.minFileSize + Config.maxFileSize) / 2;

        // Ищем ближайший замер ниже целевого и ближайший выше
        var below = null; // замер с size <= targetSize, ближайший к target
        var above = null; // замер с size > targetSize, ближайший к target

        for (var i = 0; i < st.samples.length; i++) {
            var s = st.samples[i];
            if (s.size <= 0) continue; // пропускаем неудачные

            if (s.size <= targetSize) {
                if (!below || s.size > below.size) below = s;
            } else {
                if (!above || s.size < above.size) above = s;
            }
        }

        // Нужны оба — один ниже, один выше целевого
        if (!below || !above) return null;
        if (below.quality === above.quality) return null;

        var dSize = above.size - below.size;
        if (Math.abs(dSize) < 100) return null;

        var estimated = below.quality + (targetSize - below.size) * (above.quality - below.quality) / dSize;

        estimated = Math.round(estimated);
        if (estimated < st.low) estimated = st.low;
        if (estimated > st.high) estimated = st.high;

        return estimated;
    }

    /**
     * Регистрирует выходной файл для последующей очистки.
     */
    function registerOutput(st, path) {
        if (!path) return;
        for (var i = 0; i < st.outputPaths.length; i++) {
            if (st.outputPaths[i] === path) return;
        }
        st.outputPaths.push(path);
    }

    /**
     * Запоминает кандидата, если он лучше текущего лучшего
     * и не превышает максимальный размер.
     */
    function rememberCandidate(st, quality, bitrate, size, outputPath) {
        if (size > Config.maxFileSize) return;
        if (st.bestQuality < 0 || size > st.bestSize) {
            st.bestQuality = quality;
            st.bestBitrate = bitrate;
            st.bestSize = size;
            st.bestOutputPath = outputPath;
        }
    }

    /**
     * Удаляет все промежуточные файлы, кроме keepPath.
     */
    function cleanupOutputs(st, keepPath) {
        for (var i = 0; i < st.outputPaths.length; i++) {
            var p = st.outputPaths[i];
            if (keepPath && p === keepPath) continue;
            Utils.removeFile(p);
        }
    }

    /**
     * Ищет самый свежий .webm файл в папке вывода.
     */
    function findLatestWebm(st) {
        try {
            var folder = new Folder(Utils.normalizePath(st.destPath));
            if (!folder.exists) return null;

            var base = Utils.baseName(st.sourcePath);
            var files = folder.getFiles(function (f) {
                if (!(f instanceof File)) return false;
                var n = String(f.name).toLowerCase();
                if (!Utils.endsWith(n, ".webm")) return false;
                return String(f.name).indexOf(base) === 0;
            });

            if (!files || files.length === 0) return null;

            var latest = files[0];
            for (var i = 1; i < files.length; i++) {
                if (files[i].modified > latest.modified) latest = files[i];
            }
            return latest.fsName;
        } catch (e) {
            Utils.log("[WARN] findLatestWebm: " + e.message);
            return null;
        }
    }

    /**
     * Завершает поиск для текущего файла.
     */
    function finalize(st) {
        st.finished = true;
        var elapsed = Utils.formatDuration(Utils.now() - st.totalStart);

        if (st.bestQuality < 0 || st.bestOutputPath === null) {
            Utils.log("[RESULT] Не найдено варианта <= " + Utils.formatSize(Config.maxFileSize) + " (" + elapsed + ")");
            cleanupOutputs(st, null);
            st.success = false;
            return;
        }

        Utils.log("============================================");
        if (st.bestSize >= Config.minFileSize && st.bestSize <= Config.maxFileSize) {
            Utils.log("Результат в целевом диапазоне:");
        } else {
            Utils.log("Целевой диапазон не достигнут. Лучший вариант:");
        }
        Utils.log("Q=" + st.bestQuality + ", Bitrate=" + st.bestBitrate +
                  " | " + Utils.formatSize(st.bestSize) + " | " + elapsed);
        Utils.log("Файл: " + st.bestOutputPath);
        Utils.log("============================================");

        cleanupOutputs(st, st.bestOutputPath);
        st.success = true;
    }


    /**
     * Определяет следующий шаг поиска по результату кодирования.
     * Использует интерполяцию после 2+ замеров, иначе бинарный поиск.
     */
    function chooseNext(st, qualityUsed, sizeBytes) {
        // Сохраняем замер для интерполяции
        st.samples.push({ quality: qualityUsed, size: sizeBytes });

        if (sizeBytes > Config.maxFileSize) {
            if (qualityUsed === st.low && qualityUsed === 0) {
                // При Q=0 не уложились — снижаем bitrate
                st.currentBitrate -= Config.bitrateStep;
                if (st.currentBitrate < Config.minBitrate) {
                    Utils.log("[INFO] Битрейт минимален, подходящий вариант не найден.");
                    finalize(st);
                    return;
                }
                // Сбрасываем диапазон и историю для нового bitrate
                st.low = Config.qualityMin;
                st.high = Config.qualityMax;
                st.samples = [];
                Utils.log("[INFO] Q=0 не уложились. Bitrate -> " + st.currentBitrate);
                st.currentQuality = 0;
                tryEncode(st);
                return;
            }
            // Слишком большой — снижаем quality
            st.high = qualityUsed - 1;
        } else if (sizeBytes < Config.minFileSize) {
            // Слишком маленький — повышаем quality
            st.low = qualityUsed + 1;
        } else {
            // Попали в диапазон
            Utils.log("[OK] В диапазоне при Q=" + qualityUsed + ", Bitrate=" + st.currentBitrate);
            st.finished = true;
            cleanupOutputs(st, st.bestOutputPath);
            return;
        }

        if (st.low > st.high) {
            finalize(st);
            return;
        }

        // Пробуем интерполяцию, иначе бинарный поиск
        var estimated = interpolateQuality(st);
        if (estimated !== null && estimated >= st.low && estimated <= st.high) {
            st.currentQuality = estimated;
            Utils.log("[INTERPOLATE] Оценка: Q=" + estimated);
        } else {
            st.currentQuality = Math.floor((st.low + st.high) / 2);
        }

        // Защита от дубликатов: если эта комбинация уже проверена, сдвигаемся
        if (alreadyTried(st, st.currentQuality, st.currentBitrate)) {
            Utils.log("[SKIP] Q=" + st.currentQuality + " уже проверен, сдвигаемся");
            // Ищем ближайший непроверенный quality в диапазоне
            var found = false;
            for (var offset = 1; offset <= (st.high - st.low); offset++) {
                var up = st.currentQuality + offset;
                var down = st.currentQuality - offset;
                if (up <= st.high && !alreadyTried(st, up, st.currentBitrate)) {
                    st.currentQuality = up;
                    found = true;
                    break;
                }
                if (down >= st.low && !alreadyTried(st, down, st.currentBitrate)) {
                    st.currentQuality = down;
                    found = true;
                    break;
                }
            }
            if (!found) {
                finalize(st);
                return;
            }
        }

        tryEncode(st);
    }

    /**
     * Обрабатывает результат успешного кодирования.
     */
    function onEncodeDone(st, wrapper, qualityUsed, bitrateUsed) {
        var iterTime = Utils.formatDuration(Utils.now() - st.iterationStart);
        var outputPath = null;

        // Пытаемся получить путь из outputFiles
        if (wrapper && wrapper.outputFiles && wrapper.outputFiles.length > 0) {
            outputPath = wrapper.outputFiles[0];
        } else {
            var start = Utils.now();
            while ((Utils.now() - start) < Config.outputFilePollTimeout) {
                app.wait(Config.outputFilePollInterval);
                if (wrapper && wrapper.outputFiles && wrapper.outputFiles.length > 0) {
                    outputPath = wrapper.outputFiles[0];
                    break;
                }
            }
        }

        // Фоллбэк: ищем свежий .webm
        if (!outputPath) {
            outputPath = findLatestWebm(st);
        }

        if (!outputPath) {
            Utils.log("[WARN] Не удалось получить путь к выходному файлу.");
            if (st.low > st.high) {
                finalize(st);
            } else {
                st.currentQuality = Math.floor((st.low + st.high) / 2);
                tryEncode(st);
            }
            return;
        }

        // Ждём стабилизации размера файла
        var size = Utils.waitForStableFile(outputPath);
        if (size < 0) {
            Utils.log("[WARN] Файл не найден или нечитаем: " + outputPath);
            if (st.low > st.high) {
                finalize(st);
            } else {
                st.currentQuality = Math.floor((st.low + st.high) / 2);
                tryEncode(st);
            }
            return;
        }

        Utils.log("Q=" + qualityUsed + " | " + Utils.formatSize(size) + " | " + iterTime);

        registerOutput(st, outputPath);
        recordHistory(st, qualityUsed, bitrateUsed, size);
        rememberCandidate(st, qualityUsed, bitrateUsed, size, outputPath);
        chooseNext(st, qualityUsed, size);
    }


    /**
     * Проверяет, можно ли сразу попробовать Q=100 для маленького исходника.
     * Если исходный файл уже меньше maxFileSize, начинаем с максимального quality.
     * Возвращает true если стартовый quality был изменён.
     */
    function trySmallFileShortcut(st) {
        // Только при первом вызове (до первого кодирования)
        if (st.totalStart) return false;

        var sourceSize = Utils.getFileSize(st.sourcePath);
        if (sourceSize <= 0) return false;

        if (sourceSize <= Config.maxFileSize) {
            Utils.log("[SHORTCUT] Исходник " + Utils.formatSize(sourceSize) +
                      " <= " + Utils.formatSize(Config.maxFileSize) + ", пробуем Q=100");
            st.currentQuality = Config.qualityMax;
            return true;
        }
        return false;
    }

    /**
     * Запускает кодирование с текущими параметрами.
     */
    function tryEncode(st) {
        if (st.finished) return;
        if (st.isEncoding) return;

        if (st.low > st.high) {
            Utils.log("[INFO] Нет доступных значений quality.");
            finalize(st);
            return;
        }

        // Инициализируем таймер при первом вызове
        if (!st.totalStart) {
            st.totalStart = Utils.now();
            // Проверяем, можно ли начать с Q=100 для маленького файла
            trySmallFileShortcut(st);
        }

        var quality = st.currentQuality;
        var bitrate = st.currentBitrate;

        // Защита от дубликатов
        if (alreadyTried(st, quality, bitrate)) {
            Utils.log("[SKIP] Q=" + quality + ", Bitrate=" + bitrate + " уже проверен");
            finalize(st);
            return;
        }

        var presetPath = PresetManager.createTempPreset(quality, bitrate);
        if (!presetPath) {
            Utils.log("[ERROR] Не удалось создать пресет для Q=" + quality);
            finalize(st);
            return;
        }

        st.iterationStart = Utils.now();
        Utils.log("--- Try Q=" + quality + ", Bitrate=" + bitrate + " [" + st.low + ".." + st.high + "] ---");

        var wrapper = st.exporter.exportItem(
            st.sourcePath,
            st.destPath,
            Utils.normalizePath(presetPath)
        );

        if (!wrapper) {
            Utils.log("[WARN] exportItem вернул null для Q=" + quality);
            // Сужаем диапазон и пробуем середину
            if (quality === st.low) {
                st.low++;
            } else if (quality === st.high) {
                st.high--;
            } else {
                st.high = quality - 1;
            }
            if (st.low > st.high) {
                finalize(st);
                return;
            }
            st.currentQuality = Math.floor((st.low + st.high) / 2);
            tryEncode(st);
            return;
        }

        st.isEncoding = true;
        var handled = false;

        wrapper.addEventListener("onEncodeProgress", function (ev) {
            var p = Number(ev.result);
            if (!isNaN(p) && (p % 25 === 0 || p === 100)) {
                $.writeln("  Q=" + quality + " progress: " + p + "%");
            }
        }, false);

        wrapper.addEventListener("onEncodeFinished", function (ev) {
            if (handled) return;
            handled = true;
            st.isEncoding = false;

            if (ev.result === "Done!") {
                onEncodeDone(st, wrapper, quality, bitrate);
            } else {
                Utils.log("[WARN] Кодирование не успешно: " + ev.result);
                // Записываем в историю как неудачу
                recordHistory(st, quality, bitrate, -1);

                if (quality === st.low) {
                    st.low++;
                } else if (quality === st.high) {
                    st.high--;
                } else {
                    st.high = quality - 1;
                }

                if (st.low > st.high) {
                    finalize(st);
                    return;
                }
                st.currentQuality = Math.floor((st.low + st.high) / 2);
                tryEncode(st);
            }
        }, false);
    }

    // Публичный API
    return {
        createState: createState,
        tryEncode: tryEncode,
        finalize: finalize,
        cleanupOutputs: cleanupOutputs
    };

})();
