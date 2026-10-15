# Log prediksi

Aturan: satu entri per masalah. Bagian **Sebelum perbaikan** harus di-commit *sebelum* commit
perbaikannya. Bagian **Sesudah perbaikan** diisi setelah pengukuran ulang. Jangan menyunting
bagian "sebelum" setelah hasilnya diketahui; bila prediksi meleset, jelaskan di bagian "sesudah".

---

## P-01: Layout Thrashing dan DOM Re-rendering Penuh pada Pencarian Real-Time

**Tiket terkait:** TK-1041 (Bu Wulan, Android entry-level)  
**Tanggal dan hash commit entri ini:** 2026-10-16, `57a4aeb`  
**Kaitan ISO/IEC 25010:** Performance efficiency (*Time behaviour*, *Resource utilization*) & Interaction capability (*Operability*, *User engagement*)

### Sebelum perbaikan

- **Yang teramati di trace (baseline):**
  - **Durasi & Metrik (Protokol: Mobile 412x915, CPU 4x slowdown, `npm start` 3000 produk):**
    - Repetisi 1: INP = 3240 ms, Long Task = 1776 ms
    - Repetisi 2: INP = 3504 ms, Long Task = 2832 ms
    - Repetisi 3: INP = 3312 ms, Long Task = 1743 ms
    - **Median Baseline: INP = 3312 ms** (Target: $\le$ 200 ms $\rightarrow$ **GAGAL / 16x di atas batas**), **Long Task = 1776 ms** (Target: $\le$ 100 ms $\rightarrow$ **GAGAL / 17x di atas batas**).
  - **Di track apa pada Performance Panel:**
    - **Track Interactions:** Menampilkan deretan bar interaksi keyboard (`keypress`, `keydown`, `input`) berwarna merah gelap dengan latensi interaksi melebihi 3.200 ms saat pengetikan kata "sepatu".
    - **Track Main Thread:** Teramati balok-balok merah masif (*Long Task*) rapat tanpa jeda, memblokir main thread secara total selama proses pengetikan.
    - **Track Frames:** Mengalami freeze visual total (durasi frame mencapai 2.000 - 3.500 ms).
  - **Fungsi apa yang dominan di Bottom-Up / Call Tree:**
    - `terapkanSaringan` di `pencarian.js:30:33` (Total time: 6.008,5 ms, 81.5%).
    - `renderProduk` di `katalog.js:80:29` (Total time: 5.847,3 ms, 79.3%).
    - `Layout` (Self time: 3.535,7 ms, 47.9%).
    - `samakanTinggiJudul` di `katalog.js:67:28` (Total time: 3.088,8 ms, 41.9%).
    - `get offsetHeight` (Total time: 2.938,9 ms, 39.9%).
    - `buatKartu` di `katalog.js:19:19` (Total time: 1.609,9 ms, 21.8%).
    - `Recalculate style` (Total time: 711,1 ms, 9.6%).
    - `formatRupiah` di `util.js:12:29` (Total time: 636,6 ms, 8.6%).

- **Dugaan mekanisme:**
  - **Perspektif Event Loop (Task, Microtask, Rendering Opportunity):**
    1. Kolom pencarian `#kolom-cari` dipasangi listener `input` secara langsung tanpa mekanisme *debounce*. Setiap huruf yang diketik (misal "sepatu" = 6 karakter) memasukkan macro-task berat berturut-turut ke Task Queue.
    2. Masing-masing macro-task tersebut membutuhkan waktu eksekusi JavaScript antara 1.700 ms hingga 2.800 ms.
    3. Karena JavaScript bersifat *single-threaded run-to-completion*, Main Thread terkunci 100%. Event loop **tidak pernah mendapat Rendering Opportunity** di antara ketukan huruf untuk memperbarui frame layar.
    4. Akibatnya, input keyboard tertahan di antrean OS/browser (*input delay* membengkak hingga ribuan ms), teks tidak muncul di layar, dan perangkat pengguna terasa membeku (*hang*).
  - **Perspektif Rendering Pipeline (JS $\rightarrow$ Style $\rightarrow$ Layout $\rightarrow$ Paint $\rightarrow$ Composite):**
    1. Di setiap karakter yang diketik, `renderProduk` menghancurkan seluruh DOM `#kisi` (`innerHTML = ''`) dan membuat ulang 3.000 elemen kartu baru.
    2. Setelah pembuatan kartu, fungsi `samakanTinggiJudul()` melakukan iterasi loop (`JUMLAH_CONTOH = 24`).
    3. Di setiap iterasi: kode menulis style (`j.style.height = 'auto'`), lalu seketika membaca geometri (`j.offsetHeight`), kemudian menulis kembali (`j.style.height = tertinggi + 'px'`).
    4. Siklus tulis-baca-tulis berulang ini adalah pola klasik **Layout Thrashing (Forced Synchronous Layout)**. Browser dipaksa menghitung ulang layout seluruh 3.000 kartu produk berulang kali dalam satu fungsi synchronous, menyumbang 47.9% dari total waktu eksekusi.

- **Rencana perubahan:**
  1. **Debounce pada Input Pencarian:** Pasang fungsi debounce (150 - 200 ms) pada listener `#kolom-cari` di `pencarian.js` agar filtering dan re-render katalog hanya dieksekusi setelah pengguna berhenti mengetik sejenak.
  2. **Eliminasi Total Layout Thrashing:** Hapus kalkulasi JavaScript manual di `samakanTinggiJudul()`. Gantikan dengan styling CSS murni (misalnya `display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; min-height: ...` pada `.kartu-judul`) sehingga perataan tinggi ditangani secara native oleh rendering engine browser.
  3. **Optimasi Pembuatan DOM:** Kurangi biaya pembuatan dan manipulasi DOM massal pada `katalog.js`.

- **Prediksi terukur:**
  - **INP:** Turun drastis dari **3312 ms** menjadi **$\le$ 100 ms** (memenuhi target $\le$ 200 ms).
  - **Long Task Terlama:** Turun dari **1776 ms** menjadi **$\le$ 50 ms** (memenuhi target $\le$ 100 ms).
  - **Alasan:** Forced reflow berulang dihilangkan, macro-task pengetikan tidak lagi memicu render 3.000 elemen per huruf, dan thread rendering bebas memberikan feedback visual teks dalam 16 ms (60 fps).
  - **Prediksi efek samping:** Terdapat jeda kecil yang wajar (~150 ms) sebelum daftar katalog di bawahnya berganti menyaring hasil pencarian kata lengkap, namun kolom teks input sendiri akan merespons seketika tanpa jeda sedikit pun.

- **Alternatif yang dipertimbangkan dan alasan tidak dipilih:**
  - *Alternatif A: Mengurangi `JUMLAH_CONTOH` dari 24 menjadi 4 pada `samakanTinggiJudul`.*  
    **Alasan tidak dipilih:** Tidak menyelesaikan akar masalah. Forced reflow tetap terjadi sebanyak 4 kali pada ribuan elemen DOM, yang pada CPU 4x slowdown masih sanggup menghasilkan Long Task > 300 ms.
  - *Alternatif B: Memindahkan algoritma pencarian string ke Web Worker.*  
    **Alasan tidak dipilih:** Algoritma string matching JS hanya memakan < 5% waktu komputasi. Lebih dari 95% latensi dihabiskan pada Layout Thrashing dan manipulasi DOM di Main Thread, yang tidak bisa diakses dari Web Worker.

### Sesudah perbaikan

- **Hash commit perbaikan:** *(diisi setelah perbaikan)*
- **Hasil ukur (median 3 kali):** *(diisi setelah pengukuran ulang)*
- **Prediksi vs kenyataan:** *(diisi setelah pengukuran ulang)*
- **Efek samping yang muncul:** *(diisi setelah pengukuran ulang)*

---

## P-02: Hambatan Main Thread, Serialisasi Berat Riwayat, dan Ketiadaan Optimistic UI pada Penambahan Keranjang

**Tiket terkait:** TK-1044 (Pak Anton, Android 3 tahun)  
**Tanggal dan hash commit entri ini:** 2026-10-16, `57a4aeb`  
**Kaitan ISO/IEC 25010:** Performance efficiency (*Time behaviour*) & Interaction capability (*Operability*, *User error protection*)

### Sebelum perbaikan

- **Yang teramati di trace (baseline):**
  - **Durasi & Metrik (Protokol: Mobile 412x915, CPU 4x slowdown, `npm start` 3000 produk):**
    - Repetisi 1: INP = 232 ms, Long Task = 137 ms
    - Repetisi 2: INP = 216 ms, Long Task = 135 ms
    - Repetisi 3: INP = 264 ms, Long Task = 139 ms
    - **Median Baseline: INP = 232 ms** (Target: $\le$ 200 ms $\rightarrow$ **GAGAL**), **Long Task = 137 ms** (Target: $\le$ 100 ms $\rightarrow$ **GAGAL**).
  - **Di track apa pada Performance Panel:**
    - **Track Interactions:** Menampilkan satu bar interaksi pointerdown/click berwarna oranye-merah pada tombol `.tombol-tambah` dengan durasi 216 - 264 ms sebelum frame perubahan visual digambar.
    - **Track Main Thread:** Teramati Long Task tepat saat interaksi klik berlangsung, menahan thread selama >130 ms.
    - **Track Frames:** Mengalami keterlambatan presentasi frame tombol sekitar 200 - 260 ms.
  - **Fungsi apa yang dominan di Bottom-Up / Call Tree:**
    - Eksekusi handler `tambahKeKeranjang` di `keranjang.js:68`.
    - Operasi synchronous `JSON.parse(localStorage.getItem('tk_riwayat'))` yang mem-parsing array riwayat masif berisi 9.000 objek.
    - Eksekusi `window.Lacak.kirim('add_to_cart', { produk, keranjang, riwayat, sumber: konfig.sumber })`:
      - Fungsi hashing `t(s)` di `lacak.min.js:2:368` (terlihat pada flame chart) yang melakukan iterasi loop `Math.imul` di atas payload string JSON raksasa berukuran ratusan kilobyte.
    - Operasi disk I/O synchronous `localStorage.setItem('tk_riwayat', JSON.stringify(riwayat))` untuk 9.000 item.
    - Aktivitas background timer `promo.js` yang memicu `Layout` dan `get offsetWidth` secara berkala pada ribuan elemen DOM, memperparah antrean task di main thread.

- **Dugaan mekanisme:**
  - **Perspektif Event Loop (Task, Microtask, Rendering Opportunity):**
    1. Ketika pengguna mengklik "+ Keranjang", browser menjadwalkan macro-task `click`.
    2. Di dalam handler `tambahKeKeranjang`: kode secara berurutan membaca keranjang & 9.000 riwayat (JSON.parse), memanggil SDK analitik yang melakukan hashing string ratusan KB, lalu menulis kembali 9.000 riwayat ke localStorage (JSON.stringify).
    3. Kode pembaruan DOM (`tombol.textContent = 'Ditambahkan ✓'`, kelas visual, update lencana) diletakkan di bagian paling akhir fungsi.
    4. Karena eksekusi JS bersifat *run-to-completion*, seluruh parsing, hashing, dan I/O disk harus tuntas sebelum task berakhir.
    5. Selama ~140-200 ms, event loop tidak memiliki **Rendering Opportunity**. Pengguna tidak melihat umpan balik visual apa pun di layar saat menekan tombol.
    6. Akibat ketiadaan feedback seketika (*zero responsiveness*), pengguna seperti Pak Anton mengira tombol rusak dan menekannya berulang-ulang, yang pada akhirnya memicu transaksi ganda (*double/triple submission*).
  - **Perspektif Rendering Pipeline (JS $\rightarrow$ Style $\rightarrow$ Layout $\rightarrow$ Paint $\rightarrow$ Composite):**
    - Mutasi visual tombol tertahan di antrean JavaScript. Pipeline Style dan Paint tidak dapat dimulai sebelum operasi analitik dan serialisasi localStorage yang berat selesai dieksekusi.

- **Rencana perubahan:**
  1. **Immediate Optimistic UI Feedback:** Ubah teks tombol menjadi `'Ditambahkan ✓'`, tambahkan kelas status visual, dan perbarui lencana keranjang seketika di baris pertama handler klik sebelum operasi komputasi berat apa pun dijalankan.
  2. **Debounce / Disable Guard pada Tombol:** Segera pasang status nonaktif sementara (`tombol.disabled = true` atau flag guard) pada tombol yang baru saja ditekan untuk mengeliminasi risiko klik ganda (*accidental multi-click*).
  3. **Penyusutan Payload SDK Analitik:** Aturan main `TUGAS.md` Bagian 5 poin 1 mengizinkan perubahan cara, waktu, dan isi data saat memanggil SDK selama event tetap terkirim dengan informasi masuk akal. Ubah pemanggilan `Lacak.kirim('add_to_cart')` agar tidak mengirim 9.000 riwayat historis lama, melainkan hanya data produk, keranjang, dan beberapa riwayat terbaru. Hal ini memangkas ukuran payload dari >600 KB menjadi <2 KB sehingga hashing Lacak SDK selesai dalam <1 ms.
  4. **Defer I/O Persistensi Riwayat:** Tunda penulisan array riwayat besar ke `localStorage` menggunakan `setTimeout(..., 0)` atau `requestIdleCallback` agar berjalan di task terpisah di luar frame interaksi kritis.

- **Prediksi terukur:**
  - **INP:** Turun dari **232 ms** menjadi **$\le$ 50 ms** (memenuhi target $\le$ 200 ms).
  - **Long Task Terlama:** Turun dari **137 ms** menjadi **$\le$ 50 ms** (memenuhi target $\le$ 100 ms).
  - **Pesanan Ganda:** Turun dari multi-klik tidak terkontrol menjadi tepat 1 penambahan terproteksi.
  - **Alasan:** Umpan balik visual diproses di frame pertama (< 16 ms), komputasi hashing Lacak berkurang >99%, dan penulisan disk dipisahkan dari interaksi klik utama.
  - **Prediksi efek samping:** Tidak ada degradasi fungsional; event tracking analitik tetap terkirim lengkap dan valid, data keranjang tersimpan dengan akurat.

- **Alternatif yang dipertimbangkan dan alasan tidak dipilih:**
  - *Alternatif A: Menghapus pemanggilan `window.Lacak.kirim`.*  
    **Alasan tidak dipilih:** Dilarang keras oleh aturan penugasan (`TUGAS.md` bagian 5 poin 1). Event `add_to_cart` wajib tetap terkirim ke vendor SDK.
  - *Alternatif B: Memindahkan seluruh penanganan keranjang ke Web Worker.*  
    **Alasan tidak dipilih:** Web Worker tidak memiliki akses ke `window.localStorage` (Web Storage API tidak tersedia di Worker scope) dan tidak dapat langsung memanipulasi DOM tombol. Overhead serialisasi `postMessage` justru menambah kompleksitas tanpa menyelesaikan kebutuhan penyimpanan data.

### Sesudah perbaikan

- **Hash commit perbaikan:** *(diisi setelah perbaikan)*
- **Hasil ukur (median 3 kali):** *(diisi setelah pengukuran ulang)*
- **Prediksi vs kenyataan:** *(diisi setelah pengukuran ulang)*
- **Efek samping yang muncul:** *(diisi setelah pengukuran ulang)*
