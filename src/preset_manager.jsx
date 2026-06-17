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
    // Ищем позицию идентификатора
    var idPattern = new RegExp("<ParamIdentifier>\\s*" + tagName + "\\s*<\\/ParamIdentifier>");
    var idMatch = content.match(idPattern);

    if (!idMatch) {
      Utils.log("[WARN] Тег не найден в пресете: " + tagName);
      return content;
    }

    var idPos = content.indexOf(idMatch[0]);

    // Отрезаем всё, что идёт ДО идентификатора
    var beforeId = content.substring(0, idPos);

    // Ищем ближайшие теги <ParamValue> двигаясь назад от идентификатора
    var valStartPos = beforeId.lastIndexOf("<ParamValue>");
    var valEndPos = beforeId.lastIndexOf("</ParamValue>");

    if (valStartPos === -1 || valEndPos === -1 || valStartPos > valEndPos) {
      Utils.log("[WARN] <ParamValue> не найден перед тегом: " + tagName);
      return content;
    }

    // Формируем новую строку, аккуратно заменяя значение внутри целевых тегов
    var head = content.substring(0, valStartPos + 12); // 12 - это длина строки "<ParamValue>"
    var tail = content.substring(valEndPos);

    return head + String(newValue) + tail;
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
