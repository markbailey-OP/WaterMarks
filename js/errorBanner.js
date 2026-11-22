// Diagnostic banner: shown only when an uncaught error occurs.
// Kept as a separate classic script so the page needs no inline JavaScript.
(function () {
  function show(text) {
    var banner = document.getElementById("error-banner");
    var msg = document.getElementById("error-message");

    if (!banner || !msg) return;

    banner.style.display = "block";
    msg.textContent = text;
  }

  window.addEventListener("error", function (e) {
    var file = e.filename || (e.error && e.error.fileName) || "Unknown file";
    var line = e.lineno !== undefined ? e.lineno : ((e.error && e.error.lineNumber) || "?");
    var col = e.colno !== undefined ? e.colno : ((e.error && e.error.columnNumber) || "?");
    var message = (e.error && e.error.message) || e.message || String(e);
    var stack = (e.error && e.error.stack) ? ("\n\nStack:\n" + e.error.stack) : "";

    show("File: " + file + "\nLine: " + line + (col !== "?" ? " (Col: " + col + ")" : "") +
      "\nError: " + message + stack);
  });

  window.addEventListener("unhandledrejection", function (e) {
    var reason = e.reason;
    var file = (reason && (reason.fileName || reason.filename)) || "Unknown file";
    var line = (reason && (reason.lineNumber || reason.lineno)) || "?";
    var col = (reason && (reason.columnNumber || reason.colno)) || "?";
    var message = (reason && reason.message) || String(reason || "Unknown rejection");
    var stack = (reason && reason.stack) ? ("\n\nStack:\n" + reason.stack) : "";

    show("Unhandled Promise Rejection:\nFile: " + file + "\nLine: " + line +
      (col !== "?" ? " (Col: " + col + ")" : "") + "\nError: " + message + stack);
  });
})();
