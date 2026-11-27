// Light/dark theme toggle, shared by every page.
// The light theme is the default. A visitor's choice is remembered in
// localStorage (a small note the browser keeps); if the browser blocks it,
// the page still works, it just forgets the choice.

(function () {
  var KEY = "portal-theme";

  function readSaved() {
    try {
      return localStorage.getItem(KEY);
    } catch (e) {
      return null;
    }
  }

  function save(theme) {
    try {
      localStorage.setItem(KEY, theme);
    } catch (e) {
      /* ignore: the choice just won't be remembered */
    }
  }

  function apply(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    var button = document.getElementById("theme-toggle");
    if (button) {
      button.setAttribute("aria-pressed", theme === "dark" ? "true" : "false");
      button.textContent = theme === "dark" ? "Dark theme: on" : "Dark theme: off";
    }
  }

  // Runs while the page loads (this file is loaded in <head>), so the right
  // colors are in place before anything is drawn and the page doesn't flash.
  var current = readSaved() === "dark" ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", current);

  document.addEventListener("DOMContentLoaded", function () {
    apply(current);
    var button = document.getElementById("theme-toggle");
    if (button) {
      button.addEventListener("click", function () {
        current = current === "dark" ? "light" : "dark";
        save(current);
        apply(current);
      });
    }
  });
})();
