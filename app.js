(function () {
  "use strict";

  var Engine = window.KalkulatorEngine;
  var state = Engine.createState();

  var displayEl = document.getElementById("display");
  var expressionEl = document.getElementById("expression");
  var announcerEl = document.getElementById("announcer");
  var keypadEl = document.querySelector('[role="group"]');
  var themeToggle = document.getElementById("theme-toggle");

  var MAX_FONT = 48;
  var MIN_FONT = 20;
  var MONO_ADVANCE = 0.6; // IBM Plex Mono: lebar digit 0.6em

  function render() {
    var value = Engine.displayValue(state);
    var expression = Engine.expressionText(state);

    displayEl.textContent = value;
    expressionEl.textContent = expression || "\u00a0";
    expressionEl.scrollLeft = expressionEl.scrollWidth;
    fitDisplay(value.length);
  }

  function fitDisplay(length) {
    var width = displayEl.clientWidth || 300;
    var size = Math.floor(width / (MONO_ADVANCE * Math.max(length, 1)));
    displayEl.style.setProperty(
      "--display-size",
      Math.max(MIN_FONT, Math.min(MAX_FONT, size)) + "px"
    );
  }

  function announce(message) {
    announcerEl.textContent = message;
  }

  function apply(action, value) {
    switch (action) {
      case "digit":
        Engine.digit(state, value);
        break;
      case "decimal":
        Engine.decimal(state);
        break;
      case "operator":
        Engine.operator(state, value);
        break;
      case "equals":
        Engine.equals(state);
        break;
      case "percent":
        Engine.percent(state);
        break;
      case "sign":
        Engine.toggleSign(state);
        break;
      case "backspace":
        Engine.backspace(state);
        break;
      case "clear":
        Engine.clear(state);
        break;
    }
    render();
    if (action === "equals") {
      announce(
        state.error ? state.error : "Hasil " + Engine.displayValue(state).replace(/-/g, "minus ")
      );
    }
  }

  /* ---------- Tombol ---------- */

  keypadEl.addEventListener("click", function (event) {
    var button = event.target.closest("button[data-action]");
    if (!button) return;
    apply(button.dataset.action, button.dataset.value);
  });

  /* ---------- Papan ketik ---------- */

  var KEY_ACTIONS = {
    "+": ["operator", "+"],
    "-": ["operator", "-"],
    "*": ["operator", "*"],
    x: ["operator", "*"],
    X: ["operator", "*"],
    "/": ["operator", "/"],
    ":": ["operator", "/"],
    ".": ["decimal"],
    ",": ["decimal"],
    "%": ["percent"],
    s: ["sign"],
    S: ["sign"],
    Enter: ["equals"],
    "=": ["equals"],
    Backspace: ["backspace"],
    Escape: ["clear"],
    c: ["clear"],
    C: ["clear"],
  };

  function keyAction(key) {
    if (/^[0-9]$/.test(key)) return ["digit", key];
    return KEY_ACTIONS[key] || null;
  }

  document.addEventListener("keydown", function (event) {
    if (event.metaKey || event.ctrlKey || event.altKey) return;

    // Spasi pada tombol yang sedang fokus: biarkan browser yang mengirim
    // klik, supaya tombol tidak terpicu dua kali. Enter tetap berarti
    // "hitung", sesuai petunjuk di bawah kalkulator.
    var focusedKey = event.target.closest && event.target.closest("button[data-action]");
    if (focusedKey && event.key === " ") return;

    var action = keyAction(event.key);
    if (!action) return;

    event.preventDefault();
    apply(action[0], action[1]);
    flash(event.key);
  });

  function flash(key) {
    var button = keypadEl.querySelector('[data-key="' + CSS.escape(key) + '"]');
    if (!button) return;
    button.classList.add("is-pressed");
    window.setTimeout(function () {
      button.classList.remove("is-pressed");
    }, 110);
  }

  /* ---------- Tema ---------- */

  function syncThemeButton() {
    var dark = document.documentElement.classList.contains("dark");
    themeToggle.setAttribute("aria-pressed", String(dark));
    themeToggle.querySelector(".icon-sun").classList.toggle("hidden", dark);
    themeToggle.querySelector(".icon-moon").classList.toggle("hidden", !dark);
  }

  themeToggle.addEventListener("click", function () {
    var dark = document.documentElement.classList.toggle("dark");
    try {
      localStorage.setItem("kalkulator-theme", dark ? "dark" : "light");
    } catch (error) {
      /* localStorage diblokir: tema tetap berlaku untuk sesi ini */
    }
    syncThemeButton();
  });

  syncThemeButton();
  render();
  window.addEventListener("resize", function () {
    fitDisplay(displayEl.textContent.length);
  });
})();
