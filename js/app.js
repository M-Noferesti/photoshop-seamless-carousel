(function () {
  "use strict";
  var cs = new CSInterface();
  var state = { width: 1080, height: 1350, slides: 5, format: "JPG", boundaryColors: [] };
  var defaultGuideColors = ["#A7F04F", "#47D7FF", "#A98BFF", "#FF6FAE", "#FFD166", "#4FE0B5"];
  var $ = function (id) { return document.getElementById(id); };
  var toastTimer;

  function escapeJS(value) {
    return String(value).replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/[\r\n]/g, " ");
  }

  function runHost(method, args, button) {
    args = args || [];
    var serialized = args.map(function (value) {
      if (typeof value === "number") return String(value);
      if (typeof value === "boolean") return value ? "true" : "false";
      return "'" + escapeJS(value) + "'";
    }).join(",");
    if (button) button.disabled = true;
    showToast("Working in Photoshop…", false, 12000);
    cs.evalScript("CarouselHost." + method + "(" + serialized + ")", function (raw) {
      if (button) button.disabled = false;
      var result;
      try { result = JSON.parse(raw); } catch (e) { result = { ok: false, message: raw || "Photoshop did not return a result." }; }
      showToast(result.message || (result.ok ? "Done" : "Something went wrong"), !result.ok, result.ok ? 3600 : 6500);
    });
  }

  function showToast(message, error, duration) {
    clearTimeout(toastTimer);
    $("toastText").textContent = message;
    $("toast").classList.toggle("is-error", !!error);
    $("toast").classList.add("is-visible");
    toastTimer = setTimeout(function () { $("toast").classList.remove("is-visible"); }, duration || 3200);
  }

  function rangeFill(input) {
    var min = Number(input.min), max = Number(input.max), val = Number(input.value);
    var pct = ((val - min) / (max - min)) * 100;
    input.style.background = "linear-gradient(90deg,var(--accent) 0 " + pct + "%,#303642 " + pct + "% 100%)";
  }

  function updatePreview() {
    state.slides = Number($("slideCount").value);
    state.width = Math.max(320, Number($("slideWidth").value) || 1080);
    state.height = Math.max(320, Number($("slideHeight").value) || 1350);
    $("slideCountOutput").textContent = state.slides;
    $("slideSummary").textContent = state.slides + (state.slides === 1 ? " slide" : " slides");
    $("canvasSummary").textContent = (state.width * state.slides).toLocaleString() + " × " + state.height.toLocaleString() + " px";
    var ratio = Math.abs(state.width / state.height - 1) < .02 ? "1:1 square" : (Math.abs(state.width / state.height - .8) < .02 ? "4:5 portrait" : (Math.abs(state.width / state.height - .5625) < .02 ? "9:16 story" : state.width + ":" + state.height));
    $("ratioSummary").textContent = ratio;
    var html = "";
    for (var i = 1; i <= state.slides; i++) html += '<span data-n="' + String(i).padStart(2, "0") + '"></span>';
    $("miniCarousel").innerHTML = html;
    renderBoundaryColors();
    rangeFill($("slideCount"));
    saveSettings();
  }

  function renderBoundaryColors() {
    var previous = [];
    document.querySelectorAll(".boundary-color").forEach(function (input) { previous.push(input.value); });
    for (var p = 0; p < previous.length; p++) state.boundaryColors[p] = previous[p];
    var html = "";
    for (var i = 0; i < state.slides - 1; i++) {
      var color = state.boundaryColors[i] || defaultGuideColors[i % defaultGuideColors.length];
      html += '<label title="Boundary ' + (i + 1) + '"><span>' + (i + 1) + '</span><input class="boundary-color" type="color" value="' + color + '"></label>';
    }
    $("boundaryColors").innerHTML = html;
    document.querySelectorAll(".boundary-color").forEach(function (input) {
      input.addEventListener("input", function () {
        state.boundaryColors = Array.prototype.map.call(document.querySelectorAll(".boundary-color"), function (item) { return item.value; });
        saveSettings();
      });
    });
  }

  function selectPreset(button) {
    document.querySelectorAll(".preset").forEach(function (item) { item.classList.remove("is-selected"); });
    button.classList.add("is-selected");
    $("slideWidth").value = button.dataset.width;
    $("slideHeight").value = button.dataset.height;
    updatePreview();
  }

  function selectTab(name) {
    document.querySelectorAll(".tab").forEach(function (tab) { tab.classList.toggle("is-active", tab.dataset.tab === name); });
    document.querySelectorAll(".tab-panel").forEach(function (panel) { panel.classList.toggle("is-active", panel.dataset.panel === name); });
  }

  function settings() {
    return {
      slides: Number($("slideCount").value), width: Number($("slideWidth").value), height: Number($("slideHeight").value),
      resolution: Number($("resolution").value), margin: Number($("safeMargin").value), background: $("background").value,
      safeGuides: $("safeGuides").checked, slideGroups: $("slideGroups").checked,
      boundaryColors: Array.prototype.map.call(document.querySelectorAll(".boundary-color"), function (input) { return input.value; }),
      safeGuideColor: $("safeGuideColor").value
    };
  }

  function saveSettings() {
    try { localStorage.setItem("monstizo.carousel.settings", JSON.stringify(settings())); } catch (e) {}
  }

  function loadSettings() {
    try {
      var saved = JSON.parse(localStorage.getItem("monstizo.carousel.settings") || "null");
      if (!saved) return;
      $("slideCount").value = saved.slides || 5; $("slideWidth").value = saved.width || 1080; $("slideHeight").value = saved.height || 1350;
      $("resolution").value = saved.resolution || 72; $("safeMargin").value = saved.margin === 0 ? 0 : (saved.margin || 96);
      $("background").value = saved.background || "#12141a"; $("safeGuides").checked = saved.safeGuides !== false; $("slideGroups").checked = saved.slideGroups !== false;
      state.boundaryColors = saved.boundaryColors || []; $("safeGuideColor").value = saved.safeGuideColor || "#FF9F43";
    } catch (e) {}
  }

  function createDocument() {
    var s = settings();
    if (s.width * s.slides > 300000) return showToast("Total canvas width must be 300,000 px or less.", true);
    runHost("createDocument", [s.width, s.height, s.slides, s.resolution, s.margin, s.background, s.safeGuides, s.slideGroups, s.boundaryColors.join(","), s.safeGuideColor], $("createButton"));
  }

  function addGuides() {
    var s = settings();
    runHost("addGuides", [s.width, s.height, s.slides, s.margin, s.safeGuides, $("replaceGuides").checked, s.boundaryColors.join(","), s.safeGuideColor], $("guidesButton"));
  }

  function updateDocument() {
    var s = settings();
    if (s.width * s.slides > 300000) return showToast("Total canvas width must be 300,000 px or less.", true);
    runHost("updateDocument", [s.width, s.height, s.slides, s.margin, s.safeGuides, s.slideGroups, s.boundaryColors.join(","), s.safeGuideColor], $("updateButton"));
  }

  function exportSlides(triggerButton) {
    var s = settings();
    runHost("exportSlides", [s.width, s.height, s.slides, state.format, Number($("quality").value), $("filenamePrefix").value || "carousel"], triggerButton || $("exportButton"));
  }

  loadSettings();
  document.querySelectorAll(".preset").forEach(function (button) { button.addEventListener("click", function () { selectPreset(button); }); });
  document.querySelectorAll(".tab").forEach(function (button) { button.addEventListener("click", function () { selectTab(button.dataset.tab); }); });
  document.querySelectorAll(".format-button").forEach(function (button) { button.addEventListener("click", function () {
    document.querySelectorAll(".format-button").forEach(function (item) { item.classList.remove("is-selected"); });
    button.classList.add("is-selected"); state.format = button.dataset.format; $("qualityField").style.opacity = state.format === "JPG" ? "1" : ".38";
  }); });
  ["slideCount", "slideWidth", "slideHeight"].forEach(function (id) { $(id).addEventListener("input", updatePreview); });
  ["resolution", "safeMargin", "safeGuides", "slideGroups"].forEach(function (id) { $(id).addEventListener("change", saveSettings); });
  $("background").addEventListener("input", function () { $("colorValue").textContent = this.value.toUpperCase(); saveSettings(); });
  $("safeGuideColor").addEventListener("input", function () { $("safeGuideColorValue").textContent = this.value.toUpperCase(); saveSettings(); });
  $("quality").addEventListener("input", function () { $("qualityOutput").textContent = this.value; rangeFill(this); });
  $("createButton").addEventListener("click", createDocument); $("guidesButton").addEventListener("click", addGuides);
  $("updateButton").addEventListener("click", updateDocument);
  $("exportButton").addEventListener("click", function () { exportSlides($("exportButton")); });
  $("quickExportButton").addEventListener("click", function () { exportSlides($("quickExportButton")); });
  $("helpButton").addEventListener("click", function () { $("helpDialog").setAttribute("open", ""); $("dialogBackdrop").classList.add("is-visible"); });
  function closeHelp() { $("helpDialog").removeAttribute("open"); $("dialogBackdrop").classList.remove("is-visible"); }
  $("closeHelp").addEventListener("click", closeHelp); $("dialogBackdrop").addEventListener("click", closeHelp);
  document.addEventListener("keydown", function (e) {
    var tag = e.target && e.target.tagName ? e.target.tagName.toLowerCase() : "";
    var isTyping = tag === "input" || tag === "textarea" || tag === "select";
    if (e.key === "Escape") closeHelp();
    if (isTyping) return;
    if (e.key === "Enter" && document.querySelector('[data-panel="create"]').classList.contains("is-active")) createDocument();
    if (!e.ctrlKey && !e.metaKey && e.key.toLowerCase() === "u") updateDocument();
    if (!e.ctrlKey && !e.metaKey && e.key.toLowerCase() === "g") addGuides();
    if (!e.ctrlKey && !e.metaKey && e.key.toLowerCase() === "e") exportSlides($("quickExportButton"));
  });
  $("colorValue").textContent = $("background").value.toUpperCase();
  $("safeGuideColorValue").textContent = $("safeGuideColor").value.toUpperCase();
  rangeFill($("quality")); updatePreview();
}());
