/**
 * preset_manager.jsx — Управление пресетами Adobe Media Encoder.
 *
 * Парсит XML-пресет по тегам (не по номерам строк),
 * подставляет quality, bitrate, width, height.
 * Кеширует содержимое мастер-пресета для повторного использования.
 */

var PresetManager = (function () {
  var scriptFile = new File($.fileName);
  var projectRoot = scriptFile.parent.parent.fsName;

  // Кеш мастер-пресета: читаем с диска один раз
  var masterCache = null;

  /**
   * Путь к мастер-пресету.
   */
  function getMasterPath() {
    return projectRoot + Utils.sep + "public" + Utils.sep + Config.userSettings.presetFileName;
  }

  /**
   * Загружает мастер-пресет в кеш (если ещё не загружен).
   * Возвращает { content, encoding } или null.
   */
  function loadMaster() {
    if (masterCache) return masterCache;

    var result = Utils.readTextFile(getMasterPath());
    if (!result) {
      Utils.log("[ERROR] Мастер-пресет не найден: " + getMasterPath());
      return null;
    }
    masterCache = result;
    return masterCache;
  }

  /**
   * Сбрасывает кеш (если пресет изменился на диске).
   */
  function invalidateCache() {
    masterCache = null;
  }

  /**
   * Заменяет значение XML-тега:
   *   <ParamName>tagName</ParamName> ... <ParamValue>OLD</ParamValue>
   * на newValue.
   *
   * Ищет <ParamName>, затем ближайший <ParamValue> после него.
   * Если тег не найден — возвращает контент без изменений.
   */
  function replaceTagValue(content, tagName, newValue) {
    // Разбиваем весь XML на массив блоков параметров
    var blocks = content.split("<ExporterParam ");
    var found = false;

    for (var i = 1; i < blocks.length; i++) {
      // Ищем блок, который содержит нужный нам идентификатор
      var idTag = "<ParamIdentifier>" + tagName + "</ParamIdentifier>";
      if (blocks[i].indexOf(idTag) !== -1) {
        // Как только нашли правильный блок, меняем <ParamValue> только внутри него
        blocks[i] = blocks[i].replace(
          /<ParamValue>[\s\S]*?<\/ParamValue>/,
          "<ParamValue>" + newValue + "</ParamValue>",
        );
        found = true;
        break; // Параметр обновлен, выходим из цикла
      }
    }

    if (!found) {
      Utils.log("[WARN] Тег не найден в пресете: " + tagName);
      return content;
    }

    // Склеиваем блоки обратно в полноценный XML
    return blocks.join("<ExporterParam ");
  }

  /**
   * Создаёт временный пресет с заданными quality и bitrate.
   * Использует кешированный мастер-пресет.
   *
   * Возвращает путь к временному пресету или null при ошибке.
   */
  function createTempPreset(quality, bitrate) {
    var master = loadMaster();
    if (!master) return null;

    var content = master.content;
    var tags = Config.presetTags;

    content = replaceTagValue(content, tags.quality, quality);
    content = replaceTagValue(content, tags.bitrate, bitrate);

    if (Config.userSettings.outputSize != null) {
      var sizeStr = String(Config.userSettings.outputSize);
      content = replaceTagValue(content, tags.width, sizeStr);
      content = replaceTagValue(content, tags.height, sizeStr);
    }

    var tempPath = projectRoot + Utils.sep + "public" + Utils.sep + "Stickers_temp.epr";
    if (!Utils.writeTextFile(tempPath, content, master.encoding)) {
      return null;
    }

    return tempPath;
  }

  /**
   * Удаляет временный пресет с диска.
   * Вызывается после завершения всех кодировок.
   */
  function cleanup() {
    var tempPath = projectRoot + Utils.sep + "public" + Utils.sep + "Stickers_temp.epr";
    if (Utils.removeFile(tempPath)) {
      Utils.log("[CLEANUP] Удалён временный пресет: Stickers_temp.epr");
    }
  }

  // Публичный API
  return {
    getMasterPath: getMasterPath,
    createTempPreset: createTempPreset,
    invalidateCache: invalidateCache,
    cleanup: cleanup,
  };
})();
