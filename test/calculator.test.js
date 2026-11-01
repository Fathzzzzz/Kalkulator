const test = require("node:test");
const assert = require("node:assert/strict");
const E = require("../src/calculator.js");

function press(keys) {
  const state = E.createState();
  for (const key of keys) {
    if (key === "=") E.equals(state);
    else if (key === "%") E.percent(state);
    else if (key === "+/-") E.toggleSign(state);
    else if (key === "<") E.backspace(state);
    else if (key === "AC") E.clear(state);
    else if (key === ",") E.decimal(state);
    else if ("+-*/".includes(key)) E.operator(state, key);
    else E.digit(state, key);
  }
  return state;
}

const screen = (keys) => E.displayValue(press(keys));

test("aritmetika dasar", () => {
  assert.equal(screen(["2", "+", "3", "="]), "5");
  assert.equal(screen(["9", "-", "4", "="]), "5");
  assert.equal(screen(["6", "*", "7", "="]), "42");
  assert.equal(screen(["8", "/", "2", "="]), "4");
});

test("kali/bagi dihitung sebelum tambah/kurang", () => {
  assert.equal(screen(["2", "+", "3", "*", "4", "="]), "14");
  assert.equal(screen(["1", "0", "-", "6", "/", "3", "="]), "8");
});

test("desimal memakai koma dan tidak berulang", () => {
  assert.equal(screen(["0", ",", "5", "+", "0", ",", "2", "5", "="]), "0,75");
  assert.equal(screen(["1", ",", ",", "5"]), "1,5");
  assert.equal(screen([",", "5"]), "0,5");
});

test("nol di depan diganti digit pertama", () => {
  assert.equal(screen(["0", "0", "7"]), "7");
  assert.equal(screen(["0", ",", "0", "4"]), "0,04");
});

test("pemisah ribuan", () => {
  assert.equal(screen(["1", "2", "3", "4", "5", "6", "7"]), "1.234.567");
  assert.equal(E.formatNumber("-1234.5"), "-1.234,5");
});

test("persen mengikuti konteks operator", () => {
  assert.equal(screen(["2", "0", "0", "+", "1", "0", "%", "="]), "220");
  assert.equal(screen(["5", "0", "%"]), "0,5");
  assert.equal(screen(["8", "0", "*", "5", "0", "%", "="]), "40");
});

test("persen mempertahankan label di baris ekspresi", () => {
  const state = press(["2", "0", "0", "+", "1", "0", "%"]);
  assert.equal(E.expressionText(state), "200 + 10%");
  E.equals(state);
  assert.equal(E.displayValue(state), "220");
  assert.equal(E.expressionText(state), "200 + 20 =");
});

test("ubah tanda", () => {
  assert.equal(screen(["7", "+/-"]), "-7");
  assert.equal(screen(["7", "+/-", "+/-"]), "7");
  assert.equal(screen(["7", "+", "3", "+/-", "="]), "4");
});

test("ubah tanda setelah operator mengubah angka terakhir", () => {
  const state = press(["1", "2", "3", "+", "+/-"]);
  assert.equal(E.displayValue(state), "-123");
  assert.equal(E.expressionText(state), "-123 +");
  assert.equal(screen(["1", "2", "3", "+", "+/-", "4", "="]), "-119");
});

test("hapus digit dan hapus semua", () => {
  assert.equal(screen(["1", "2", "3", "<"]), "12");
  assert.equal(screen(["5", "<", "<"]), "0");
  assert.equal(screen(["5", "+", "3", "AC"]), "0");
  assert.equal(E.expressionText(press(["5", "+", "3", "AC"])), "");
});

test("operator terakhir menimpa operator sebelumnya", () => {
  assert.equal(screen(["5", "+", "*", "2", "="]), "10");
  assert.equal(E.expressionText(press(["5", "+", "*"])), "5 ×");
});

test("sama dengan berulang mengulang operasi terakhir", () => {
  const state = press(["2", "+", "3", "="]);
  E.equals(state);
  assert.equal(E.displayValue(state), "8");
  E.equals(state);
  assert.equal(E.displayValue(state), "11");
});

test("bagi nol menjadi galat yang bisa dipulihkan", () => {
  const state = press(["5", "/", "0", "="]);
  assert.equal(E.displayValue(state), "Error");
  assert.equal(E.expressionText(state), "Tidak bisa dibagi nol.");
  E.digit(state, "4");
  assert.equal(E.displayValue(state), "4");
});

test("hasil panjang dibulatkan ke 12 digit signifikan", () => {
  assert.equal(screen(["1", "/", "3", "="]), "0,333333333333");
  assert.equal(screen(["0", ",", "1", "+", "0", ",", "2", "="]), "0,3");
});

test("baris ekspresi mengikuti masukan", () => {
  assert.equal(E.expressionText(press(["1", "2", "+"])), "12 +");
  assert.equal(E.expressionText(press(["1", "2", "+", "3"])), "12 + 3");
  assert.equal(E.expressionText(press(["1", "2", "+", "3", "="])), "12 + 3 =");
  assert.equal(E.expressionText(press(["1", "2"])), "");
});

test("angka sangat besar tampil dalam notasi eksponen", () => {
  assert.equal(screen(["9", "9", "9", "9", "9", "9", "9", "9", "*", "9", "9", "9", "9", "9", "9", "9", "9", "*", "9", "9", "9", "9", "9", "9", "9", "9", "="]), "9,9999997e+23");
});

test("angka tidak melebihi 16 digit", () => {
  const state = press("123456789012345678".split(""));
  assert.equal(E.displayValue(state).replace(/\./g, ""), "1234567890123456");
});

test("lanjut berhitung dari hasil", () => {
  assert.equal(screen(["2", "+", "3", "=", "*", "4", "="]), "20");
  assert.equal(screen(["2", "+", "3", "=", "1", "0"]), "10");
});
