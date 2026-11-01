# Kalkulator

Kalkulator aritmetika yang berjalan sepenuhnya di browser: HTML, JavaScript, dan Tailwind CSS. Tanpa framework, tanpa permintaan jaringan saat dipakai.

## Menjalankan

```bash
npm install
npm run build     # menghasilkan dist/tailwind.css
npm run serve     # http://localhost:4173
```

`index.html` butuh `dist/tailwind.css` yang sudah dibangun. Kalau `dist/` dihapus, jalankan `npm run build` lagi. Untuk mengubah gaya sambil bekerja: `npm run dev` (watch).

## Struktur

| Berkas | Isi |
| --- | --- |
| `index.html` | Markup, label aksesibilitas, skrip tema awal |
| `app.js` | Penanganan tombol, papan ketik, tema, penyesuaian ukuran angka |
| `src/calculator.js` | Mesin hitung murni, tanpa DOM (dipakai juga oleh test) |
| `src/input.css` | Sumber Tailwind, token warna, komponen tombol |
| `dist/tailwind.css` | Hasil build, ikut di-commit supaya halaman bisa dibuka langsung |
| `test/calculator.test.js` | Test mesin hitung dengan `node:test` |

## Perilaku

- Prioritas operator: `×` dan `÷` dihitung sebelum `+` dan `−` (`12 + 3 × 4 = 24`).
- Tombol `=` ditekan lagi mengulang operasi terakhir (`2 + 3 =` lalu `=` memberi `8`).
- `%` mengikuti konteks: `200 + 10 %` menambah 10% dari 200, sedangkan `50 %` sendiri berarti `0,5`.
- Hasil dibulatkan ke 12 digit signifikan. Angka di atas 16 digit masuk menjadi notasi eksponen.
- Bagi nol menampilkan `Error` dan alasan di baris ekspresi; mengetik angka langsung memulihkan.
- Angka memakai pemisah ribuan titik dan desimal koma (`1.234,5`), mengikuti kebiasaan Indonesia.

### Papan ketik

| Tombol | Fungsi |
| --- | --- |
| `0`-`9` | Digit |
| `.` atau `,` | Desimal |
| `+` `-` `*` `x` `/` `:` | Operator |
| `Enter` atau `=` | Hitung |
| `%` | Persen |
| `s` | Ubah tanda |
| `Backspace` | Hapus digit terakhir |
| `Esc` atau `c` | Hapus semua |

`Enter` dan `Spasi` pada tombol yang sedang fokus memakai perilaku bawaan browser, jadi tidak ada aksi ganda.

## Test

```bash
npm test
```

## Keputusan desain

Arah: alat hitung meja yang tenang, bukan panel dashboard.

- **Palet**: kertas hangat (`#efeade`) dan tinta hampir hitam, dengan satu aksen oranye-terakota hanya untuk kolom operator dan tombol `=`. Aksen tidak dipakai di tempat lain supaya tetap menandai "ini yang menghitung".
- **Tipografi**: IBM Plex Sans untuk antarmuka karena bentuknya agak mekanis dan angka `tabular`; IBM Plex Mono hanya di layar angka, meniru layar kalkulator meja, bukan gaya terminal. Font di-host sendiri di `assets/fonts` supaya tidak ada permintaan ke pihak ketiga.
- **Bentuk**: radius 13px untuk tombol, 20px untuk badan kalkulator. Tidak semua elemen dibuat pil; radius dipakai untuk membedakan tingkat, bukan hiasan.
- **Bayangan**: hanya badan kalkulator yang terangkat dari kertas. Tombol memakai garis tepi 1px, bukan bayangan, supaya tidak semua elemen melayang.
- **Tema**: terang dan gelap sama-sama lengkap, mengikuti preferensi sistem saat pertama dibuka, lalu diingat lewat `localStorage`. Kontras teks memenuhi WCAG AA (4,5:1) di kedua tema.
- **Gerak**: hanya umpan balik tekan (90ms) dan cincin fokus. Tidak ada animasi masuk atau denyut berulang, dan semuanya dimatikan saat `prefers-reduced-motion`.
- **Layar**: ukuran angka menyesuaikan lebar layar dan panjang angka (maksimum 48px, minimum 20px), jadi hasil 17 digit tidak pernah meluber.

## Lisensi

Font IBM Plex Sans dan IBM Plex Mono memakai SIL Open Font License 1.1.
