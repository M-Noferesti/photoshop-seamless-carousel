(function (global) {
  "use strict";
  function CSInterface() {}
  CSInterface.prototype.evalScript = function (script, callback) {
    if (global.__adobe_cep__) {
      global.__adobe_cep__.evalScript(script, callback || function () {});
    } else if (callback) {
      callback('{"ok":false,"message":"Open this panel inside Photoshop."}');
    }
  };
  CSInterface.prototype.getHostEnvironment = function () {
    if (!global.__adobe_cep__) return {};
    try { return JSON.parse(global.__adobe_cep__.getHostEnvironment()); } catch (e) { return {}; }
  };
  global.CSInterface = CSInterface;
}(window));
