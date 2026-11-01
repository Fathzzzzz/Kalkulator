/**
 * Mesin hitung murni, tanpa DOM.
 * Dipakai app.js di browser dan test/calculator.test.js di Node.
 *
 * Angka disimpan sebagai string kanonik dengan titik desimal ("12.5").
 * Tampilan yang mengubahnya ke koma dan pemisah ribuan.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  } else {
    root.KalkulatorEngine = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var MAX_ENTRY_DIGITS = 16;
  var PRECISION = 12;
  var PRECEDENCE = { "+": 1, "-": 1, "*": 2, "/": 2 };
  var SYMBOLS = { "+": "+", "-": "\u2212", "*": "\u00d7", "/": "\u00f7" };

  function createState() {
    return {
      tokens: [], // { kind: "num", raw } | { kind: "op", op }
      current: null, // angka yang sedang diketik
      currentLabel: null, // label ekspresi bila angka bukan hasil ketikan (mis. "10%")
      overwrite: true, // digit berikutnya memulai angka baru
      settled: false, // hasil baru saja dihitung
      repeat: null, // { op, raw } untuk penekanan = berulang
      lastExpression: "", // baris ekspresi setelah =
      error: null, // pesan galat, mis. bagi nol
    };
  }

  function reset(state) {
    var fresh = createState();
    for (var key in fresh) state[key] = fresh[key];
    return state;
  }

  function toRaw(value) {
    if (!isFinite(value)) return null;
    var rounded = Number(value.toPrecision(PRECISION));
    if (Object.is(rounded, -0)) rounded = 0;
    return String(rounded);
  }

  function countDigits(raw) {
    return raw.replace(/[^0-9]/g, "").length;
  }

  function compute(a, b, op) {
    switch (op) {
      case "+":
        return a + b;
      case "-":
        return a - b;
      case "*":
        return a * b;
      case "/":
        if (b === 0) throw new RangeError("DIVIDE_BY_ZERO");
        return a / b;
      default:
        throw new RangeError("UNKNOWN_OP");
    }
  }

  /** Evaluasi token dengan prioritas kali/bagi di atas tambah/kurang. */
  function evaluateTokens(tokens) {
    var values = [];
    var ops = [];

    function apply() {
      var op = ops.pop();
      var b = values.pop();
      var a = values.pop();
      values.push(compute(a, b, op));
    }

    for (var i = 0; i < tokens.length; i++) {
      var token = tokens[i];
      if (token.kind === "num") {
        values.push(parseFloat(token.raw));
        continue;
      }
      while (ops.length && PRECEDENCE[ops[ops.length - 1]] >= PRECEDENCE[token.op]) {
        apply();
      }
      ops.push(token.op);
    }
    while (ops.length) apply();
    return values[0];
  }

  function lastToken(state) {
    return state.tokens.length ? state.tokens[state.tokens.length - 1] : null;
  }

  function lastNumberRaw(state) {
    for (var i = state.tokens.length - 1; i >= 0; i--) {
      if (state.tokens[i].kind === "num") return state.tokens[i].raw;
    }
    return null;
  }

  function currentValue(state) {
    var raw = state.current !== null ? state.current : lastNumberRaw(state);
    return raw === null ? 0 : parseFloat(raw);
  }

  function fail(state, message) {
    reset(state);
    state.error = message;
    return state;
  }

  function pushCurrent(state) {
    state.tokens.push({ kind: "num", raw: state.current });
    state.current = null;
  }

  function digit(state, value) {
    if (state.error) reset(state);
    state.currentLabel = null;
    if (state.overwrite || state.current === null) {
      state.current = value;
      state.overwrite = false;
    } else if (state.current === "0") {
      state.current = value;
    } else if (state.current === "-0") {
      state.current = "-" + value;
    } else if (countDigits(state.current) < MAX_ENTRY_DIGITS) {
      state.current += value;
    }
    state.settled = false;
    return state;
  }

  function decimal(state) {
    if (state.error) reset(state);
    state.currentLabel = null;
    if (state.overwrite || state.current === null) {
      state.current = "0.";
      state.overwrite = false;
    } else if (state.current.indexOf(".") === -1) {
      state.current += ".";
    }
    state.settled = false;
    return state;
  }

  function operator(state, op) {
    if (state.error) reset(state);
    if (!PRECEDENCE[op]) return state;

    state.currentLabel = null;
    if (state.current !== null) {
      pushCurrent(state);
    } else if (state.tokens.length === 0) {
      state.current = "0";
      pushCurrent(state);
    }

    var last = lastToken(state);
    if (last && last.kind === "op") {
      state.tokens[state.tokens.length - 1] = { kind: "op", op: op };
    } else {
      state.tokens.push({ kind: "op", op: op });
    }

    state.overwrite = true;
    state.settled = false;
    state.repeat = null;
    return state;
  }

  function applyRepeat(state) {
    var value = currentValue(state);
    var result = compute(value, parseFloat(state.repeat.raw), state.repeat.op);
    var raw = toRaw(result);
    if (raw === null) return fail(state, "Hasil di luar jangkauan angka.");
    state.current = raw;
    state.overwrite = true;
    state.settled = true;
    state.lastExpression =
      formatNumber(toRaw(value) || "0") +
      " " +
      SYMBOLS[state.repeat.op] +
      " " +
      formatNumber(state.repeat.raw) +
      " =";
    return state;
  }

  function equals(state) {
    if (state.error) return state;
    if (state.settled && state.repeat) return applyRepeat(state);

    var tokens = state.tokens.slice();
    if (state.current !== null) {
      tokens.push({ kind: "num", raw: state.current });
    } else if (tokens.length && tokens[tokens.length - 1].kind === "op") {
      tokens.pop();
    }
    if (!tokens.length) return state;

    var result;
    try {
      result = evaluateTokens(tokens);
    } catch (error) {
      if (error instanceof RangeError && error.message === "DIVIDE_BY_ZERO") {
        return fail(state, "Tidak bisa dibagi nol.");
      }
      return fail(state, "Perhitungan gagal.");
    }

    var raw = toRaw(result);
    if (raw === null) return fail(state, "Hasil di luar jangkauan angka.");

    var last = tokens[tokens.length - 1];
    var prev = tokens[tokens.length - 2];
    state.repeat =
      last.kind === "num" && prev && prev.kind === "op"
        ? { op: prev.op, raw: last.raw }
        : null;

    state.lastExpression = tokens.map(formatToken).join(" ") + " =";
    state.current = raw;
    state.tokens = [];
    state.overwrite = true;
    state.settled = true;
    return state;
  }

  function percent(state) {
    if (state.error) reset(state);
    var value = currentValue(state);
    var pending = lastToken(state);
    var result;

    if (pending && pending.kind === "op" && (pending.op === "+" || pending.op === "-")) {
      // 200 + 10% berarti 200 + 10% dari 200.
      var base = evaluateTokens(state.tokens.slice(0, -1));
      result = (base * value) / 100;
    } else {
      result = value / 100;
    }

    var raw = toRaw(result);
    if (raw === null) return fail(state, "Hasil di luar jangkauan angka.");
    state.current = raw;
    state.currentLabel = formatNumber(toRaw(value)) + "%";
    state.overwrite = false;
    state.settled = false;
    return state;
  }

  function toggleSign(state) {
    if (state.error) reset(state);
    state.currentLabel = null;
    if (state.current !== null) {
      state.current =
        state.current.charAt(0) === "-" ? state.current.slice(1) : "-" + state.current;
    } else {
      var raw = lastNumberRaw(state);
      if (raw === null) {
        state.current = "-0";
      } else if (state.tokens.length && lastToken(state).kind === "num") {
        state.tokens[state.tokens.length - 1] = {
          kind: "num",
          raw: raw.charAt(0) === "-" ? raw.slice(1) : "-" + raw,
        };
      }
    }
    state.settled = false;
    return state;
  }

  function backspace(state) {
    if (state.error) return reset(state);
    state.currentLabel = null;
    if (state.current !== null) {
      var next = state.current.slice(0, -1);
      if (next === "" || next === "-") next = "0";
      state.current = next;
    } else if (state.tokens.length) {
      state.tokens.pop();
    }
    state.settled = false;
    return state;
  }

  function clear(state) {
    return reset(state);
  }

  /** String kanonik -> tampilan Indonesia: 1234.5 menjadi 1.234,5 */
  function formatNumber(raw) {
    if (raw === null || raw === undefined) return "0";
    if (/^-?\d+(\.\d+)?e[+-]\d+$/.test(raw)) {
      // Angka sangat besar/kecil: biarkan notasi eksponen, hanya koma yang diganti.
      return raw.replace(".", ",");
    }
    if (!/^-?\d+(\.\d+)?$/.test(raw)) return String(raw);

    var negative = raw.charAt(0) === "-";
    var body = negative ? raw.slice(1) : raw;
    var parts = body.split(".");
    var whole = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    var out = parts.length > 1 ? whole + "," + parts[1] : whole;
    return negative ? "-" + out : out;
  }

  function formatToken(token) {
    return token.kind === "num" ? formatNumber(token.raw) : SYMBOLS[token.op];
  }

  /** Angka yang harus tampil di layar utama. */
  function displayValue(state) {
    if (state.error) return "Error";
    if (state.current !== null) return formatNumber(state.current);
    var raw = lastNumberRaw(state);
    return raw === null ? "0" : formatNumber(raw);
  }

  /** Baris ekspresi kecil di atas layar. */
  function expressionText(state) {
    if (state.error) return state.error;
    var parts = state.tokens.map(formatToken);
    if (state.current !== null && state.tokens.length) {
      parts.push(state.currentLabel || formatNumber(state.current));
    }
    if (parts.length) return parts.join(" ");
    return state.settled ? state.lastExpression : "";
  }

  return {
    createState: createState,
    digit: digit,
    decimal: decimal,
    operator: operator,
    equals: equals,
    percent: percent,
    toggleSign: toggleSign,
    backspace: backspace,
    clear: clear,
    displayValue: displayValue,
    expressionText: expressionText,
    formatNumber: formatNumber,
  };
});
