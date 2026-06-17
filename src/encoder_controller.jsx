/**
 * encoder_controller.jsx — Контроллер кодирования.
 */
var EncoderController = (function () {
  function createState(sourcePath, destPath, exporter, startQuality) {
    return {
      sourcePath: sourcePath,
      destPath: destPath,
      exporter: exporter,
      low: Config.qualityMin,
      high: Config.qualityMax,
      currentQuality: startQuality !== undefined ? startQuality : Config.qualityStart,
      currentBitrate: Config.defaultBitrate,
      bestQuality: -1,
      bestBitrate: -1,
      bestSize: -1,
      bestOutputPath: null,
      outputPaths: [],
      history: {},
      samples: [],
      isEncoding: false,
      finished: false,
      success: false,
      iterationStart: 0,
      totalStart: 0,
    };
  }

  function historyKey(q, b) {
    return String(q) + "_" + String(b);
  }
  function alreadyTried(st, q, b) {
    return st.history[historyKey(q, b)] !== undefined;
  }
  function recordHistory(st, q, b, size) {
    st.history[historyKey(q, b)] = size;
  }

  function interpolateQuality(st) {
    if (st.samples.length < 2) return null;
    var targetSize = (Config.userSettings.minFileSize * 1024 + Config.userSettings.maxFileSize * 1024) / 2;
    var below = null,
      above = null;

    for (var i = 0; i < st.samples.length; i++) {
      var s = st.samples[i];
      if (s.size <= 0) continue;
      if (s.size <= targetSize) {
        if (!below || s.size > below.size) below = s;
      } else {
        if (!above || s.size < above.size) above = s;
      }
    }

    if (!below || !above || below.quality === above.quality) return null;
    var dSize = above.size - below.size;
    if (Math.abs(dSize) < 100) return null;

    var estimated = Math.round(below.quality + ((targetSize - below.size) * (above.quality - below.quality)) / dSize);
    return Math.max(st.low, Math.min(st.high, estimated));
  }

  function registerOutput(st, path) {
    for (var i = 0; i < st.outputPaths.length; i++) {
      if (st.outputPaths[i] === path) return;
    }
    st.outputPaths.push(path);
  }

  function rememberCandidate(st, quality, bitrate, size, outputPath) {
    if (size > Config.userSettings.maxFileSize * 1024) return;
    if (st.bestQuality < 0 || size > st.bestSize) {
      st.bestQuality = quality;
      st.bestBitrate = bitrate;
      st.bestSize = size;
      st.bestOutputPath = outputPath;
    }
  }

  function cleanupOutputs(st, keepPath) {
    for (var i = 0; i < st.outputPaths.length; i++) {
      if (st.outputPaths[i] !== keepPath) Utils.removeFile(st.outputPaths[i]);
    }
  }

  function finalize(st) {
    st.finished = true;
    var elapsed = Utils.formatDuration(Utils.now() - st.totalStart);
    var maxBytes = Config.userSettings.maxFileSize * 1024;
    var minBytes = Config.userSettings.minFileSize * 1024;

    if (st.bestQuality < 0 || st.bestOutputPath === null) {
      Utils.log("[RESULT] Не найдено варианта <= " + Utils.formatSize(maxBytes) + " (" + elapsed + ")");
      cleanupOutputs(st, null);
      st.success = false;
      return;
    }

    Utils.log("============================================");
    if (st.bestSize >= minBytes && st.bestSize <= maxBytes) Utils.log("Результат в целевом диапазоне:");
    else Utils.log("Целевой диапазон не достигнут. Лучший вариант:");

    Utils.log(
      "Q=" + st.bestQuality + ", Bitrate=" + st.bestBitrate + " | " + Utils.formatSize(st.bestSize) + " | " + elapsed,
    );
    Utils.log("Файл: " + st.bestOutputPath);
    Utils.log("============================================");

    cleanupOutputs(st, st.bestOutputPath);
    st.success = true;
  }

  function chooseNext(st, qualityUsed, sizeBytes) {
    st.samples.push({ quality: qualityUsed, size: sizeBytes });
    var maxBytes = Config.userSettings.maxFileSize * 1024;
    var minBytes = Config.userSettings.minFileSize * 1024;

    if (sizeBytes > maxBytes) {
      if (qualityUsed === 0) {
        st.currentBitrate -= Config.bitrateStep;
        if (st.currentBitrate < Config.minBitrate) return finalize(st);
        st.low = Config.qualityMin;
        st.high = Config.qualityMax;
        st.samples = [];
        st.currentQuality = 0;
        Utils.log("[INFO] Q=0 не уложились. Bitrate -> " + st.currentBitrate);
        return tryEncode(st);
      }
      st.high = qualityUsed - 1;
    } else if (sizeBytes < minBytes) {
      st.low = qualityUsed + 1;
    } else {
      Utils.log("[OK] В диапазоне при Q=" + qualityUsed + ", Bitrate=" + st.currentBitrate);
      st.finished = true;
      return cleanupOutputs(st, st.bestOutputPath);
    }

    if (st.low > st.high) return finalize(st);

    var estimated = interpolateQuality(st);
    if (estimated !== null && estimated >= st.low && estimated <= st.high) {
      st.currentQuality = estimated;
    } else {
      st.currentQuality = Math.floor((st.low + st.high) / 2);
    }

    if (alreadyTried(st, st.currentQuality, st.currentBitrate)) {
      var found = false;
      for (var offset = 1; offset <= st.high - st.low; offset++) {
        var up = st.currentQuality + offset,
          down = st.currentQuality - offset;
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
      if (!found) return finalize(st);
    }
    tryEncode(st);
  }

  function onEncodeDone(st, qualityUsed, bitrateUsed) {
    var iterTime = Utils.formatDuration(Utils.now() - st.iterationStart);

    // ИДЕМПОТЕНТНОСТЬ: Мы точно знаем путь, нет нужды парсить массивы и искать дубликаты
    var outputPath = st.destPath;
    var size = Utils.waitForStableFile(outputPath);

    if (size < 0) {
      Utils.log("[WARN] Файл не найден или нечитаем: " + outputPath);
      if (st.low > st.high) finalize(st);
      else {
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

  function trySmallFileShortcut(st) {
    if (st.totalStart) return false;
    var sourceSize = Utils.getFileSize(st.sourcePath);
    if (sourceSize > 0 && sourceSize <= Config.userSettings.maxFileSize * 1024) {
      st.currentQuality = Config.qualityMax;
      return true;
    }
    return false;
  }

  function tryEncode(st) {
    if (st.finished || st.isEncoding) return;
    if (st.low > st.high) return finalize(st);

    if (!st.totalStart) {
      st.totalStart = Utils.now();
      trySmallFileShortcut(st);
    }

    var quality = st.currentQuality,
      bitrate = st.currentBitrate;
    if (alreadyTried(st, quality, bitrate)) return finalize(st);

    var presetPath = PresetManager.createTempPreset(quality, bitrate);
    if (!presetPath) return finalize(st);

    // ПРИНУДИТЕЛЬНАЯ ОЧИСТКА: Гарантируем, что AME не создаст файл _1.webm
    var outF = new File(st.destPath);
    if (outF.exists) outF.remove();

    st.iterationStart = Utils.now();
    Utils.log("--- Try Q=" + quality + ", Bitrate=" + bitrate + " [" + st.low + ".." + st.high + "] ---");

    var wrapper = st.exporter.exportItem(st.sourcePath, st.destPath, Utils.normalizePath(presetPath));

    if (!wrapper) {
      Utils.log("[WARN] exportItem вернул null для Q=" + quality);
      if (quality === st.low) st.low++;
      else if (quality === st.high) st.high--;
      else st.high = quality - 1;
      if (st.low > st.high) return finalize(st);
      st.currentQuality = Math.floor((st.low + st.high) / 2);
      return tryEncode(st);
    }

    st.isEncoding = true;
    var handled = false;

    wrapper.addEventListener(
      "onEncodeProgress",
      function (ev) {
        var p = Number(ev.result);
        if (!isNaN(p) && (p % 25 === 0 || p === 100)) $.writeln("  Q=" + quality + " progress: " + p + "%");
      },
      false,
    );

    wrapper.addEventListener(
      "onEncodeFinished",
      function (ev) {
        if (handled) return;
        handled = true;
        st.isEncoding = false;

        if (ev.result === "Done!") {
          onEncodeDone(st, quality, bitrate);
        } else {
          Utils.log("[WARN] Кодирование не успешно: " + ev.result);
          recordHistory(st, quality, bitrate, -1);
          if (quality === st.low) st.low++;
          else if (quality === st.high) st.high--;
          else st.high = quality - 1;
          if (st.low > st.high) return finalize(st);
          st.currentQuality = Math.floor((st.low + st.high) / 2);
          tryEncode(st);
        }
      },
      false,
    );
  }

  return { createState: createState, tryEncode: tryEncode, finalize: finalize, cleanupOutputs: cleanupOutputs };
})();
