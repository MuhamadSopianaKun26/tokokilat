# Audit usulan perbaikan dari AI

Peran Anda di sini adalah **reviewer**. Minta sebuah AI (asisten chat atau coding agent) memperbaiki
minimal dua tiket, sebaiknya di branch terpisah. Uji usulannya dengan protokol pengukuran yang sama.
Temukan minimal **dua** usulan bermasalah. Usulan AI yang bagus juga boleh dicatat, tetapi tidak
menggantikan dua temuan wajib.

Alat AI yang dipakai: Copilot
Branch atau commit tempat usulan diterapkan: Branch Noval

---

## A-01: pencarian terasa lambat atau hang

- **Tiket yang diminta diperbaiki:** TK-1041
- **Prompt yang diberikan (ringkas):** "Identifikasi masalah yang terjadi pada tiket keluhan TK-1041 HANYA berdasarkan source code JANGAN jalankan trace, JANGAN menggunakan chrome devtool, dan JANGAN run server. Setelah teridentifikasi, betulkan code terkait dengan masalah tersebut. Berikan potongan kode yang relevan."
- **Usulan AI (ringkas, sertakan potongan kode yang relevan):**
- - Menyimpan hasil normalisasi tiap produk dalam  WeakMap , sehingga produk tidak dinormalisasi berulang kali.
- - Menggunakan  DocumentFragment  agar kartu ditambahkan ke DOM dalam satu operasi.
- - Menunda dan melakukan debounce pengiriman analitik sampai pengguna berhenti mengetik sejenak.
```
const teksPencarian = new WeakMap();
let pengaturLacak;

function cocok(produk, kunci) {
  let teks = teksPencarian.get(produk);
  if (!teks) {
    teks = normalkan(
      produk.nama + ' ' + produk.merek + ' ' +
      produk.kategori + ' ' + produk.kota
    );
    teksPencarian.set(produk, teks);
  }
  return kunci.split(' ').every((k) => teks.includes(k));
}

const fragmen = document.createDocumentFragment();

for (const produk of daftar) {
  fragmen.append(buatKartu(produk));
}

kisi.append(fragmen);

if (window.Lacak && kunci) {
  const data = { kata: saringan.kata, jumlah: hasil.length };
  clearTimeout(pengaturLacak);
  pengaturLacak = setTimeout(
    () => window.Lacak.kirim('search', data),
    250
  );
}
```
- **Jenis masalah pada usulan:** pilih satu atau lebih
  - [x] Salah diagnosis (memperbaiki hal yang bukan penyebab)
  - [x] Tidak lengkap (gejala berkurang tetapi akar masalah masih ada)
  - [ ] Menimbulkan regresi (metrik lain, fitur, aksesibilitas, atau memori memburuk)
  - [ ] Melanggar aturan main (menghapus fitur, mengubah berkas terlarang, dan sebagainya)
  - [x] Memperbaiki sesuatu yang tidak berpengaruh terukur
- **Bukti:**
  - **Tabel Perbandingan Metrik (Median dari 3x Pengujian):**
    | Pengukuran | INP (S1) | Long Task Terlama | Keterangan |
    |---|:---:|:---:|---|
    | **Sebelum Perbaikan (Baseline Tim)** | 3.312 ms | 1.776 ms | Halaman freeze saat mengetik |
    | **Usulan AI (Branch Noval)** | **4.272 ms** | **3.222 ms** | Tidak ada perbaikan terukur, tetap macet |
    | **Perbaikan Benar Tim** | **56 ms** | **0 ms** | Lolos target (INP <= 200 ms, LT <= 100 ms) |
  - **Rincian Repetisi Usulan AI (`laporan/trace-audit_ai/S1/`):**
    - Run 1: INP 4.356 ms | Long Task 3.354 ms (`trace-s1-run1.json` / `.json.gz`)
    - Run 2: INP 3.939 ms | Long Task 3.078 ms (`trace-s1-run2.json` / `.json.gz`)
    - Run 3: INP 4.272 ms | Long Task 3.222 ms (`trace-s1-run3.json` / `.json.gz`)
  - **Analisis Trace DevTools:**
    - Trace baseline tim tersimpan di `laporan/trace/S1-before/` (tangkapan layar: `S1-1-before.png`).
    - Usulan AI menggunakan `WeakMap` untuk cache normalisasi string dan `DocumentFragment` untuk penambahan elemen kartu. Namun profiling *Bottom-Up* pada trace membuktikan bahwa komputasi pencarian string hanya memakan waktu <5 ms (<0.2% total waktu eksekusi).
    - Alarm utama DevTools Insights (`ForcedReflow` dan `DOMSize`) tetap menyala merah: fungsi `samakanTinggiJudul()` di `katalog.js` tetap dipanggil di setiap render, memaksa siklus baca `offsetHeight` dan tulis `style.height` berulang kali untuk ribuan produk (Layout Thrashing memakan 47.9% self-time).
    - AI juga tidak memasang *debounce* pada event listener `input` pada `#kolom-cari`, sehingga setiap ketukan karakter tetap mengunci Main Thread >3 detik dan menahan antrean input OS.
- **Mengapa AI bisa keliru di sini:**
  AI hanya menganalisis kode secara statis tanpa memiliki akses runtime trace atau model event loop browser. AI mengandalkan pola hafalan generik dari teks buku (*"DOM append lambat, gunakan DocumentFragment"* dan *"string processing lambat, gunakan cache"*). Padahal, trace membuktikan komputasi JavaScript string hampir instan, sedangkan akar masalah sesungguhnya terletak pada tahapan *Rendering Pipeline* (Forced Synchronous Layout pada `samakanTinggiJudul()`) dan *Event Loop Task Queue* (penumpukan macro-task tanpa *debounce*).
- **Perbaikan yang benar menurut tim:**
  1. Memasang *debounce* 150 ms pada event listener input pencarian di `pencarian.js` agar penyaringan hanya dieksekusi saat pengguna berhenti mengetik sejenak.
  2. Mengeliminasi total kalkulasi JavaScript pada `samakanTinggiJudul()` di `katalog.js`, digantikan dengan solusi CSS murni pada `.kartu-judul` menggunakan multi-line clamp (`-webkit-line-clamp: 2; height: 2.7em;`).
  3. Menerapkan *Progressive / Chunked Rendering* pada `katalog.js` (merender 36 kartu pertama secara instan, sisanya dimuat bertahap saat digulir via *infinite scroll*).
  4. Menunda pengiriman analitik `Lacak.kirim('search')` secara asinkron menggunakan `setTimeout(..., 0)`.
  Hasil Tim: INP turun 98.3% menjadi **56 ms** dan Long Task menjadi **0 ms**.

---

## A-02: tombol  + Keranjang  terlihat tidak merespons

- **Tiket yang diminta diperbaiki:** TK-1044
- **Prompt yang diberikan (ringkas):** "Identifikasi masalah yang terjadi pada tiket keluhan TK-1044 HANYA berdasarkan source code JANGAN jalankan trace, JANGAN menggunakan chrome devtool, dan JANGAN run server. Setelah teridentifikasi, betulkan code terkait dengan masalah tersebut. Berikan potongan kode yang relevan."
- **Usulan AI (ringkas, sertakan potongan kode yang relevan):**
- window.Lacak.kirim('add_to_cart', ...) dipanggil sebelum penyimpanan keranjang dan sebelum perubahan visual tombol. Karena SDK berjalan sinkron, pengguna tidak segera melihat tanda bahwa klik sudah diterima. Pengguna dapat mengklik lagi; setiap klik memang menambah jumlah produk karena kode berikut:
```
if (ada) ada.jumlah = Math.min(ada.jumlah + 1, konfig.maksPerProduk);
```
- - Keranjang dan riwayat disimpan lebih dahulu.
- - Lencana, teks tombol, dan toast diperbarui segera.
- - Analitik dijadwalkan setelah handler klik selesai, sehingga tidak menahan umpan balik pengguna
```
simpanKeranjang(keranjang);
simpanRiwayat(riwayat);

perbaruiLencana();
tombol.textContent = 'Ditambahkan ✓';
tombol.classList.add('sudah');
tampilkanToast('Ditambahkan ke keranjang: ' + produk.nama);

if (window.Lacak) {
  const data = { produk, keranjang, riwayat, sumber: konfig.sumber };
  setTimeout(() => window.Lacak.kirim('add_to_cart', data), 0);
}
```
- **Jenis masalah pada usulan:** pilih satu atau lebih
  - [ ] Salah diagnosis (memperbaiki hal yang bukan penyebab)
  - [x] Tidak lengkap (gejala berkurang tetapi akar masalah masih ada)
  - [x] Menimbulkan regresi (metrik lain, fitur, aksesibilitas, atau memori memburuk)
  - [ ] Melanggar aturan main (menghapus fitur, mengubah berkas terlarang, dan sebagainya)
  - [x] Memperbaiki sesuatu yang tidak berpengaruh terukur
- **Bukti:**
  - **Tabel Perbandingan Metrik (Median dari 3x Pengujian):**
    | Pengukuran | INP (S2) | Long Task Terlama | Pesanan dari Multi-Klik |
    |---|:---:|:---:|:---:|
    | **Sebelum Perbaikan (Baseline Tim)** | 232 ms | 137 ms | 3 (Duplikat) |
    | **Usulan AI (Branch Noval)** | **532 ms** *(Regresi!)* | **523 ms** | **3 (Duplikat)** |
    | **Perbaikan Benar Tim** | **48 ms** | **0 ms** | **1 (Aman)** |
  - **Rincian Repetisi Usulan AI (`laporan/trace-audit_ai/S2/`):**
    - Run 1: INP 539 ms | Long Task 274 ms (`trace-s2-run1.json` / `.json.gz`)
    - Run 2: INP 532 ms | Long Task 621 ms (`trace-s2-run2.json` / `.json.gz`)
    - Run 3: INP 415 ms | Long Task 523 ms (`trace-s2-run3.json` / `.json.gz`)
  - **Analisis Trace DevTools:**
    - Trace baseline tim tersimpan di `laporan/trace/S2-before/` (tangkapan layar: `S2-1-before.png`).
    - Usulan AI menimbulkan **regresi performa**: INP melonjak dari 232 ms menjadi **532 ms** (kategori *Bad* / >500 ms).
    - Flame chart membuktikan bahwa sekadar membungkus `window.Lacak.kirim` dengan `setTimeout(..., 0)` tanpa memangkas ukuran data riwayat tidak menyelesaikan masalah: payload `riwayat` raksasa (9.000 objek seberat >600 KB) langsung diproses oleh fungsi hashing 12-pass vendor SDK di macro-task berikutnya, bersaing ketat dengan frame render browser sehingga *Presentation Delay* membengkak menjadi 273 ms.
    - Selain itu, operasi I/O `localStorage.setItem` berukuran ratusan KB tetap dieksekusi secara sinkron di main thread.
    - Yang paling fatal, usulan AI **tidak menyelesaikan akar keluhan Pak Anton**: tombol "+ Keranjang" tidak diberikan proteksi kunci/disable (`tombol.disabled = true`), sehingga klik cepat berkali-kali tetap diterima dan barang tetap masuk berkali-kali ke keranjang.
- **Mengapa AI bisa keliru di sini:**
  AI hanya menata ulang urutan baris kode secara dangkal (*"simpan dulu, ubah teks, lalu lempar Lacak ke setTimeout"*). AI tidak memahami biaya komputasi runtime hashing SDK pada string berukuran 600 KB yang tetap memblokir main thread di giliran event loop berikutnya. Lebih jauh lagi, AI gagal memahami aspek *Interaction Capability & User Error Protection*: keluhan pengguna mengenai tombol yang diklik berkali-kali membutuhkan proteksi fisik/state berupa *disable guard*, bukan sekadar pemindahan urutan baris teks.
- **Perbaikan yang benar menurut tim:**
  1. *Immediate Optimistic UI:* Memperbarui teks dan status visual tombol secara instan di baris pertama handler klik (`tombol.textContent = 'Ditambahkan ✓'`, styling hijau, dan toast).
  2. *Disable Guard:* Mengunci tombol sementara (`tombol.disabled = true`) selama 1.5 detik untuk mencegah aksi klik berulang dari pengguna (*user error protection*).
  3. *Penyusutan Payload Analitik:* Memanfaatkan aturan main (Bagian 5 Poin 1) dengan hanya mengirimkan 5 riwayat terbaru ke SDK analitik (bukan 9.000 entri lama seberat 600 KB), memangkas waktu hashing SDK menjadi <1 ms.
  4. *Defer I/O Persistensi:* Menunda operasi penulisan disk `localStorage.setItem` via `setTimeout(..., 0)` di luar frame interaksi kritis.
  Hasil Tim: INP turun menjadi **48 ms**, Long Task menjadi **0 ms**, dan jumlah barang dari klik berulang tepat **1**.

---

## Refleksi (maks. 200 kata)

Penggunaan AI dalam audit performa web menunjukkan batas yang tegas antara analisis teks dan realitas runtime browser:

1. **Di mana AI paling membantu:**
   AI sangat efektif sebagai rekan diskusi analitis untuk memetakan gejala empiris ke konsep teoritis (seperti sub-karakteristik kualitas ISO/IEC 25010 dan model Event Loop), menstrukturkan laporan teknis, serta menyusun alternatif sintaks modern (seperti CSS multi-line clamp dan pola debounce).

2. **Di mana kita harus paling waspada:**
   Kewaspadaan tertinggi diperlukan saat AI memberikan diagnosis dan perbaikan kode hanya berdasarkan pembacaan source code (*static inspection*). AI rentan merekomendasikan resep hafalan generik (seperti `DocumentFragment`, cache WeakMap, atau sekadar `setTimeout(0)`) yang mengabaikan dinamika runtime nyata. Seperti terbukti pada TK-1041 dan TK-1044, usulan AI tidak menyentuh akar masalah sistemik (*Layout Thrashing* dan *payload serialization*), bahkan dapat menimbulkan regresi latensi (INP melonjak ke 532 ms).

Pengukuran empiris menggunakan Chrome DevTools Performance Trace adalah satu-satunya sumber kebenaran yang sah dalam rekayasa performa web.
