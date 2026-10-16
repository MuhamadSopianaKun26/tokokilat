# Laporan audit performa dan interaksi TokoKilat

Tim: ....  Anggota: ....  Tanggal: ....
Panjang maksimal setara 6 halaman (tidak termasuk lampiran gambar).

## 1. Ringkasan eksekutif (maks. 150 kata)
Apa masalah terbesar, apa yang dilakukan, berapa hasilnya. Tulis untuk manajer produk, bukan untuk engineer.

## 2. Lingkungan pengukuran
Spesifikasi laptop, versi Chrome, jumlah produk (`npm start` atau varian lain), tingkat throttling,
dan penyimpangan apa pun dari protokol di TUGAS.md bagian 7.

### Lingkungan Skenario 0
- **Perangkat / OS:** macOS
- **Browser:** Google Chrome (DevTools Protocol / Chrome DevTools MCP)
- **Viewport & Device Toolbar:** Viewport **412 x 915** (Mobile, touch enabled, DPR 2.625)
- **Pengaturan CPU:** **4x slowdown**
- **Pengaturan Jaringan:** **Tanpa throttling** (No throttling)
- **Varian Server:** `npm run start:ringan` (JUMLAH_PRODUK = 1500)
- **URL & Mode Ukur:** `http://localhost:3000/?ukur=1`
- **Protokol Eksekusi:** Buka URL, tunggu hingga halaman stabil, muat ulang (reload) 1 kali untuk inisialisasi localStorage (`tk_riwayat`), lalu mulai perekaman trace Panel Performance (muat halaman, diam 10 detik tanpa interaksi untuk memastikan `had_recent_input: false`). Diulang sebanyak 3 kali dan dicatat nilai mediannya.
- **Penyimpanan Berkas Trace:** `laporan/trace/S0/sebelum/` (`trace-1.json`, `trace-2.json`, `trace-3.json`) dan `laporan/trace/S0/setelah/` (`trace-1.json`, `trace-2.json`, `trace-3.json`).

## 3. Hasil sebelum dan sesudah

| Skenario | Metrik | Sebelum (median) | Sesudah (median) | Target | Tercapai? |
|---|---|---|---|---|---|
| S0 | CLS | 0,474 | 0,292 | <= 0,1 | Belum |
| S0 | Jumlah permintaan gambar dalam 10 dtk pertama | 1500 diinisiasi (147 selesai) | 811 diinisiasi (284 selesai) | sebanding dengan yang terlihat | Belum |
| S1 | INP | | | <= 200 ms | |
| S1 | Long task terlama | | | <= 100 ms | |
| S2 | INP | | | <= 200 ms | |
| S3 | Jumlah pesanan dari 3 klik | | | 1 | |
| S4 | INP / progres tergambar bertahap? | | | | |
| S5 | Frame > 50 ms per 10 dtk | | | <= 2 | |
| S6 | Frame > 50 ms per 10 dtk | | | <= 2 | |

*Catatan data mentah 3x percobaan S0 sebelum perbaikan:*
- **Percobaan 1:** CLS = 0,474; Permintaan gambar diinisiasi = 1500; Selesai dalam 10 dtk = 136; Gambar terakhir selesai dalam 10 dtk = 8,08 dtk (unduhan terus berlanjut di background hingga 22,06 dtk: 656 gambar selesai).
- **Percobaan 2:** CLS = 0,474; Permintaan gambar diinisiasi = 1500; Selesai dalam 10 dtk = 191; Gambar terakhir selesai dalam 10 dtk = 10,00 dtk (unduhan terus berlanjut di background hingga 37,42 dtk: 1170 gambar selesai).
- **Percobaan 3:** CLS = 0,474; Permintaan gambar diinisiasi = 1500; Selesai dalam 10 dtk = 147; Gambar terakhir selesai dalam 10 dtk = 9,59 dtk (unduhan terus berlanjut di background hingga 26,81 dtk: 478 gambar selesai).
- **Median:** CLS = **0,474**; Permintaan gambar diinisiasi = **1500** (selesai dalam 10 dtk = **147**).

*Catatan data mentah 3x percobaan S0 sesudah perbaikan (commit bed84c3):*
- **Percobaan 1:** CLS = 0,292 (shift utama pada 2,82 dtk: score 0,292, plus shift kecil marquee pada 0,76 dtk: score 1,25e-6); Permintaan gambar diinisiasi = 689; Selesai dalam 10 dtk = 293; Gambar terakhir selesai dalam 10 dtk = 9,95 dtk (unduhan terus berlanjut di background hingga 21,18 dtk: 665 gambar selesai).
- **Percobaan 2:** CLS = 0,292 (shift utama pada 9,95 dtk: score 0,292); Permintaan gambar diinisiasi = 811; Selesai dalam 10 dtk = 50; Gambar terakhir selesai dalam 10 dtk = 9,67 dtk (unduhan terus berlanjut di background hingga 31,97 dtk: 811 gambar selesai).
- **Percobaan 3:** CLS = 0,292 (shift utama pada 3,46 dtk: score 0,292); Permintaan gambar diinisiasi = 897; Selesai dalam 10 dtk = 284; Gambar terakhir selesai dalam 10 dtk = 9,98 dtk (unduhan terus berlanjut di background hingga 19,80 dtk: 610 gambar selesai).
- **Median:** CLS = **0,292**; Permintaan gambar diinisiasi = **811** (selesai dalam 10 dtk = **284**).

## 4. Temuan

Temuan diurutkan berdasarkan tingkat keparahan dampak terhadap pengguna dan bisnis (*user impact priority*), bukan berdasarkan nomor tiket.

---

### T-01: Pergeseran Tata Letak Ekstrem (CLS) Akibat Penyisipan Banner Promo Asinkron Tanpa Pencadangan Ruang Statis yang Presisi
- **Tiket terkait:** TK-1078 (Kak Rara: *"Mau pencet barang yang paling atas, eh halamannya loncat turun sendiri, yang kepencet malah iklan promo. Ini sengaja ya biar iklannya diklik?"*)
- **Gejala bagi pengguna:** Saat halaman flash sale dimuat, katalog produk teratas sudah tampak siap digunakan. Namun, tepat ketika pengguna hendak menyentuh kartu produk teratas, seluruh antarmuka tiba-tiba meloncat turun ke bawah secara mendadak. Akibatnya, sentuhan jari pengguna meleset (*mis-click*) dan mengenai banner promosi yang baru saja muncul. Hal ini memicu rasa frustrasi, membatalkan intensi belanja, dan menimbulkan tuduhan bahwa TokoKilat sengaja memasang jebakan iklan (*dark pattern*).
- **Bukti:**
  - Tangkapan layar flame chart baseline: [`trace/S0/sebelum/SS-1.png`](file:///Users/andythoriq/_dev/TOKOKILATS/tokokilat/laporan/trace/S0/sebelum/SS-1.png), [`SS-2.png`](file:///Users/andythoriq/_dev/TOKOKILATS/tokokilat/laporan/trace/S0/sebelum/SS-2.png), dan [`SS-3.png`](file:///Users/andythoriq/_dev/TOKOKILATS/tokokilat/laporan/trace/S0/sebelum/SS-3.png).
  - **Tanda pada track Layout Shifts / Experience:** Terdeteksi satu pergeseran tata letak tunggal berskala masif pada detik ke-~4,1 (sekitar 4.163 ms dari *navigation start*) dengan penalti **Score: 0,474** (ambang batas batas hijau Core Web Vitals adalah <= 0,1).
  - **Tanda pada track Main Thread:** Tepat setelah respons jaringan endpoint `/api/promo` tiba (durasi unduh ~1.800 ms), Event Loop mengeksekusi sebuah macro-task penanganan jaringan yang menjalankan fungsi [`pasangBannerPromo`](file:///Users/andythoriq/_dev/TOKOKILATS/tokokilat/public/js/promo.js#L57) di [`public/js/promo.js`](file:///Users/andythoriq/_dev/TOKOKILATS/tokokilat/public/js/promo.js).
  - **Tahap Rendering Pipeline:** Pemanggilan mutasi DOM `$('#utama').prepend(banner)` membatalkan validitas pohon geometri (*layout invalidation*), memaksa browser segera menjalankan tahap **UpdateLayoutTree (Recalculate Style)**, **Layout (Reflow)**, dan **Paint**.
  - **Node yang terdampak (Impacted Nodes):** Elemen footer (`footer.kaki`), bilah utilitas kontrol (`div.alat-kanan`), teks ringkasan (`p#ringkasan`), dan seluruh kontainer kisi produk (`div#kisi`) terdorong secara vertikal ke bawah sejauh tinggi banner promo (~236 px pada layar ponsel 412x915).
  - Tangkapan layar sesudah perbaikan: [`trace/S0/setelah/SS-1.png`](file:///Users/andythoriq/_dev/TOKOKILATS/tokokilat/laporan/trace/S0/setelah/SS-1.png) memperlihatkan skor CLS berkurang menjadi **0,292**, namun masih menyisakan pergeseran residual karena dimensi slot cadangan belum 100% identik dengan tinggi banner akhir.
- **Akar masalah dan mekanismenya:**
  - Berkas: [`public/js/promo.js`](file:///Users/andythoriq/_dev/TOKOKILATS/tokokilat/public/js/promo.js) (fungsi [`pasangBannerPromo`](file:///Users/andythoriq/_dev/TOKOKILATS/tokokilat/public/js/promo.js#L57)) dan [`public/index.html`](file:///Users/andythoriq/_dev/TOKOKILATS/tokokilat/public/index.html).
  - Mekanisme menurut Event Loop dan Rendering Pipeline:
    1. *Rendering Opportunity Awal:* Respons data produk `/api/produk` selesai lebih cepat (~180 ms), sehingga fungsi [`renderProduk`](file:///Users/andythoriq/_dev/TOKOKILATS/tokokilat/public/js/katalog.js#L101) segera dieksekusi dan browser mengomposisikan (*Composite*) serta menggambar (*Paint*) katalog produk pada *rendering opportunity* pertama. Pengguna sudah melihat produk dan bersiap melakukan interaksi.
    2. *Penyelesaian Task Asinkron Promo:* Respons `/api/promo` tertunda hingga ~1,8 detik kemudian. Begitu data promo tiba, callback dieksekusi sebagai macro-task baru di Event Loop.
    3. *DOM Mutation Tanpa Alokasi Ruang:* Kode mengeksekusi `$('#utama').prepend(banner)` yang menyisipkan elemen banner baru ke bagian paling atas kontainer utama. Karena ruang untuk banner ini tidak pernah dicadangkan sebelumnya pada struktur tata letak awal (*unreserved layout space*), peramban menandai seluruh pohon tata letak kotor (*dirty layout*).
    4. *Layout Displacement:* Pada frame berikutnya, tahap **Layout** menghitung ulang geometri posisi seluruh elemen di bawah banner. Elemen-elemen tersebut dipindahkan ke koordinat Y yang lebih rendah sebesar ~236 px. Karena pergeseran ini terjadi tanpa adanya input pengguna aktif dalam jendela 500 ms terakhir (`had_recent_input: false`), Chromium mencatat penalti layout shift sebesar 0,474 dan menggeser elemen tepat di bawah jari pengguna.
- **Kualitas yang terdampak (ISO/IEC 25010):**
  - **Performance efficiency:**
    - *Time behaviour:* Browser dipaksa mengeksekusi siklus reflow/layout ulang dokumen secara mendadak di tengah sesi interaksi pengguna, membuang siklus CPU main thread.
  - **Interaction capability:**
    - *User error protection:* Mengalami degradasi paling parah. Pengguna secara fisik diarahkan melakukan tindakan keliru (*accidental erroneous click*) akibat target sentuh yang berpindah lokasi secara tiba-tiba tanpa kendali pengguna.
    - *Operability:* Antarmuka gagal menyediakan stabilitas spasial, merusak kemudahan pengoperasian kontrol utama aplikasi.
    - *User engagement:* Menghancurkan kepercayaan pengguna terhadap integritas platform karena aplikasi dicurigai memasang manipulasi klik iklan.
- **Perbaikan:**
  - Perubahan yang diterapkan (commit [`bed84c3`](file:///Users/andythoriq/_dev/TOKOKILATS/tokokilat/laporan/PREDIKSI.md#L46)):
    1. Pada [`public/index.html`](file:///Users/andythoriq/_dev/TOKOKILATS/tokokilat/public/index.html): Menambahkan elemen penampung awal `<div class="promo-slot" id="promo-slot" aria-hidden="true"></div>` tepat di atas bilah `#alat`.
    2. Pada [`public/css/toko.css`](file:///Users/andythoriq/_dev/TOKOKILATS/tokokilat/public/css/toko.css): Menetapkan gaya dimensi statis `.promo-slot { height: 132px; margin-bottom: 16px; border-radius: 12px; background: var(--kabut); border: 1.5px dashed var(--garis); }` dan breakpoint mobile `@media (max-width: 900px) { .promo-slot, .promo-banner { height: 236px; } }` dengan pembatasan teks `-webkit-line-clamp`.
    3. Pada [`public/js/promo.js`](file:///Users/andythoriq/_dev/TOKOKILATS/tokokilat/public/js/promo.js): Mengganti metode penyisipan dari `$('#utama').prepend(banner)` menjadi `slot.replaceWith(banner)`.
  - Mengapa bekerja: Ruang vertikal setinggi 236 px telah dicadangkan sejak frame pertama sebelum data promosi tiba. Ketika banner promosi selesai dimuat secara asinkron, banner hanya menggantikan elemen slot tanpa mengubah ketinggian total kontainer, sehingga koordinat vertikal elemen-elemen di bawahnya tetap stabil dan pergeseran tata letak teredam.
- **Trade-off:**
  - *Alternatif 1 (Ditolak):* Menahan perenderan seluruh halaman (*render-blocking*) hingga endpoint `/api/promo` selesai. Ditolak karena merusak metrik FCP (*First Contentful Paint*) dan LCP secara drastis (layar kosong selama ~1,8 detik).
  - *Alternatif 2 (Ditolak):* Menghapus banner promo dari aplikasi. Ditolak karena melanggar Aturan Main Bagian 5 Poin 4 (seluruh fitur bisnis wajib dipertahankan).
  - *Harga pilihan yang diambil:* Antarmuka menampilkan kotak kerangka (*skeleton placeholder*) kosong berpola garis putus-putus selama ~1,8 detik sebelum banner asli tampil. Selain itu, jika teks promo backend berubah melebihi kapasitas baris yang di-clamp, berisiko timbul pemotongan teks (*text overflow*).
- **Hasil:**
  - Skor CLS turun dari **0,474** (median sebelum) menjadi **0,292** (median sesudah; perbaikan sebesar ~38,4%).
  - Evaluasi: Skor berhasil ditekan secara terukur, namun belum mencapai target Core Web Vitals (<= 0,1) karena selisih tipis antara kalkulasi border/padding slot dan konten akhir banner teks di viewport mobile masih menyisakan pergeseran residual.

---

### T-02: Saturasi Antrean Jaringan Jangka Panjang dan Pemborosan Bandwidth Akibat Eager Loading 1.500 Gambar Produk
- **Tiket terkait:** TK-1081 (Pak Hendra: *"Gambar barangnya lama sekali munculnya, kotak abu-abu semua, apalagi kalau saya scroll cepat ke bawah. Kuota saya juga cepat habis padahal cuma buka satu halaman. Internet saya lancar buat YouTube, jadi pasti servernya yang lemot."*)
- **Gejala bagi pengguna:** Saat membuka katalog pada perangkat Android kelas bawah, kartu-kartu produk yang berada di hadapan mata pengguna hanya menampilkan kotak abu-abu polos dalam waktu yang sangat lama. Gambar baru muncul setelah menunggu bermenit-menit. Menggulir cepat ke bawah memperparah kondisi karena gambar semakin tidak muncul. Selain itu, kuota internet seluler pengguna terkuras drastis puluhan megabita hanya untuk membuka satu halaman.
- **Bukti:**
  - Tangkapan layar flame chart baseline: [`trace/S0/sebelum/SS-1.png`](file:///Users/andythoriq/_dev/TOKOKILATS/tokokilat/laporan/trace/S0/sebelum/SS-1.png), [`SS-2.png`](file:///Users/andythoriq/_dev/TOKOKILATS/tokokilat/laporan/trace/S0/sebelum/SS-2.png), dan [`SS-3.png`](file:///Users/andythoriq/_dev/TOKOKILATS/tokokilat/laporan/trace/S0/sebelum/SS-3.png).
  - **Tanda pada track Network:** Terdeteksi **1.500 permintaan berkas gambar** (`/img/p/*.svg`) yang diinisiasi hampir simultan pada ~2 detik pertama siklus hidup halaman, dipicu oleh eksekusi fungsi render awal.
  - **Status antrean jaringan:** Dari 1.500 permintaan yang diinisiasi, dalam jendela pengamatan 10 detik pertama hanya **147 gambar** yang berhasil diselesaikan (median dari 3 percobaan: 136, 191, dan 147 gambar).
  - **Tooltip DevTools (misal `/img/p/6.svg` pada SS-1):** Menunjukkan permintaan terhambat dalam status *Queueing and connecting* dan *Waiting on main thread* selama **2,07–2,45 detik** per gambar sebelum soket koneksi tersedia.
  - **Waterfall Jaringan:** Dipenuhi ribuan bilah horizontal kuning-abu-abu berstatus *stalled*, dan aktivitas unduhan latar belakang terus berjalan hingga detik ke-**22 s.d. 37**, mengunduh gambar produk posisi terbawah yang bahkan belum pernah digulir oleh pengguna.
  - Tangkapan layar sesudah perbaikan: [`trace/S0/setelah/SS-1.png`](file:///Users/andythoriq/_dev/TOKOKILATS/tokokilat/laporan/trace/S0/setelah/SS-1.png) membuktikan waktu LCP kartu produk awal membaik drastis dari **1,38 s** menjadi **0,60 s**, dan jumlah gambar selesai dalam 10 detik naik menjadi median **284 gambar**.
- **Akar masalah dan mekanismenya:**
  - Berkas: [`public/js/katalog.js`](file:///Users/andythoriq/_dev/TOKOKILATS/tokokilat/public/js/katalog.js) (fungsi [`buatKartu`](file:///Users/andythoriq/_dev/TOKOKILATS/tokokilat/public/js/katalog.js#L19) dan [`renderProduk`](file:///Users/andythoriq/_dev/TOKOKILATS/tokokilat/public/js/katalog.js#L101)).
  - Mekanisme menurut Event Loop dan Network Pipeline:
    1. *Eager Loading Tanpa Kendali Viewport:* Fungsi `renderProduk` mengiterasi seluruh 1.500 data produk secara sinkron dan membuat 1.500 node elemen `<img>` yang langsung diisikan nilai `gambar.src = produk.gambar`. Seluruh node ini langsung dimasukkan ke dokumen DOM.
    2. *Pemicuan Resource Fetcher:* Peramban mendeteksi 1.500 elemen gambar aktif di DOM dan secara agresif mendaftarkan seluruh URL tersebut ke dalam antrean *Network Fetcher*.
    3. *Batas Konkurensi Soket TCP HTTP/1.1:* Arsitektur peramban membatasi koneksi TCP simultan maksimal **6 soket per origin**. Akibatnya, hanya 6 gambar yang dapat diunduh bersamaan, sementara 1.494 berkas gambar lainnya tertahan dalam antrean status *stalled / queued*.
    4. *Head-of-Line Blocking Soket Jaringan:* Gambar untuk 4–6 kartu produk teratas yang berada di dalam viewport layar ponsel (412x915) harus bersaing dan mengantre soket TCP secara acak dengan ratusan kartu produk di posisi bawah halaman. Dengan latensi respons 60–300 ms per gambar, gambar di viewport atas mengalami penundaan visual yang parah (*blank gray boxes*) dan kuota seluler terbuang sia-sia.
- **Kualitas yang terdampak (ISO/IEC 25010):**
  - **Performance efficiency:**
    - *Resource utilization:* Pemborosan ekstrem pada *network bandwidth*, soket TCP, dan penggunaan memori peramban. Mengakibatkan boros kuota data dan konsumsi daya baterai yang tidak perlu.
    - *Capacity:* Kapasitas penanganan konkurensi jaringan peramban runtuh akibat membanjirnya 1.500 permintaan dalam satu waktu.
    - *Time behaviour:* Waktu kelengkapan visual (*visual completeness*) pada area pandang pengguna menjadi sangat lambat.
  - **Interaction capability:**
    - *Inclusivity:* Merugikan pengguna ponsel Android dengan koneksi internet terbatas atau paket data berbayar kuota (*metered connection*).
    - *User engagement:* Pengguna menganggap aplikasi rusak dan lambat, sehingga meninggalkan halaman flash sale (*bounce rate* meningkat).
- **Perbaikan:**
  - Perubahan yang diterapkan (commit [`bed84c3`](file:///Users/andythoriq/_dev/TOKOKILATS/tokokilat/laporan/PREDIKSI.md#L46)):
    1. Pada [`public/js/katalog.js`](file:///Users/andythoriq/_dev/TOKOKILATS/tokokilat/public/js/katalog.js) di dalam fungsi [`buatKartu`](file:///Users/andythoriq/_dev/TOKOKILATS/tokokilat/public/js/katalog.js#L19):
       - Menetapkan atribut dimensi intrinsik: `gambar.width = 480; gambar.height = 480;` dan `gambar.decoding = 'async';` guna mengunci rasio aspek gambar 1:1 serta memindahkan proses dekoding gambar ke thread terpisah di luar main thread.
       - Menerapkan prioritas pemuatan selektif: Untuk 6 kartu pertama (indeks < 6) yang langsung berada di viewport awal, ditetapkan `gambar.loading = 'eager'` dan `gambar.fetchPriority = 'high'`.
       - Untuk kartu ke-7 dan seterusnya (indeks >= 6), ditetapkan atribut native lazy loading: `gambar.loading = 'lazy'`.
  - Mengapa bekerja: Atribut `loading="lazy"` menginstruksikan browser untuk menunda inisiasi pengunduhan berkas gambar hingga elemen kartu mendekati batas viewport pengguna. Penetapan prioritas tinggi pada 6 kartu pertama mengalokasikan 6 soket TCP secara eksklusif untuk gambar yang langsung terlihat oleh mata pengguna.
- **Trade-off:**
  - *Alternatif 1 (Ditolak):* Memakai pustaka lazy load eksternal atau IntersectionObserver polyfill. Ditolak karena melanggar Aturan Main Bagian 5 Poin 2 ("Tanpa framework, library, atau bundler").
  - *Alternatif 2 (Ditolak):* Mengurangi jumlah produk yang dikirim oleh server. Ditolak karena berkas `server.js` dilarang diubah dan aturan mengharuskan seluruh 1.500 produk tetap dapat dicari.
  - *Harga pilihan yang diambil:* Ketika pengguna melakukan pengguliran cepat (*fast fling scroll*), gambar di bagian bawah mungkin memerlukan sepersekian detik untuk memuat saat baru melintasi viewport.
- **Hasil:**
  - Jumlah permintaan gambar yang diinisiasi pada 10 detik pertama terpangkas dari **1.500 permintaan** menjadi **811 permintaan** (penurunan ~46%).
  - Jumlah gambar yang selesai dimuat dalam 10 detik pertama meningkat hampir dua kali lipat, dari median **147 gambar** menjadi **284 gambar**.
  - Waktu tuntas LCP (Largest Contentful Paint) pada kartu produk awal membaik dari **1,38 s** menjadi **0,60 s** pada Percobaan 1.
  - Evaluasi: Beban antrean jaringan berhasil dipangkas separuhnya, namun target "hanya sebanding dengan yang terlihat di layar (6–12 gambar)" belum tercapai karena Chromium menerapkan *intersection threshold* yang cukup agresif (~1.250 px) dan seluruh 1.500 elemen HTML tetap berada di dalam DOM tanpa virtualisasi.

---

## 5. Dugaan yang ternyata keliru

Bagian ini mencatat hipotesis awal dari catatan serah terima rekan kerja (Rudi), dari tiket pelanggan, maupun prediksi tim sendiri yang terbantahkan secara telak oleh data pengukuran empiris flame chart dan network trace DevTools:

1. **Dugaan Rudi #1: "Biang kerok utamanya hampir pasti loop bersarang di `kategori.js`. Itu O(n²) dan ada `querySelectorAll` di dalam loop... HARUS dioptimasi sebelum 12.12!"**
   - *Bantahan Pengukuran:* Pada flame chart rekaman baseline ([`trace/S0/sebelum/SS-1.png`](file:///Users/andythoriq/_dev/TOKOKILATS/tokokilat/laporan/trace/S0/sebelum/SS-1.png)), fungsi [`pasangKaki`](file:///Users/andythoriq/_dev/TOKOKILATS/tokokilat/public/js/kategori.js#L5) pada [`public/js/kategori.js`](file:///Users/andythoriq/_dev/TOKOKILATS/tokokilat/public/js/kategori.js) hanya membutuhkan total waktu eksekusi CPU **< 1ms ** (bahkan tidak masuk dalam daftar fungsi teratas pada tab Bottom-Up).
   - *Penyebab Meleset:* Rudi menganalisis kompleksitas asimtotik secara teoritis (O(n^2)) tanpa memeriksa ukuran data riil (n). Dari 1.500 produk, jumlah kategori unik hanya berjumlah 8 kategori. Loop bersarang tersebut hanya berjalan sebanyak 8 x 8 = 64 iterasi, dan pemanggilan `querySelectorAll` hanya memeriksa beberapa elemen `<li>` yang sangat sedikit. Biaya komputasinya diabaikan oleh mesin V8. Mengoptimalkan fungsi ini memberikan dampak perbaikan **0 ms (0%)** pada performa nyata halaman.

2. **Dugaan Rudi #2 & Pak Hendra (TK-1081): "API produk kita lambat, makanya halaman terasa berat. Minta tim backend tambah server." (Pak Hendra: "Internet saya lancar buat YouTube, jadi pasti servernya yang lemot")**
   - *Bantahan Pengukuran:* Pada track Network panel Performance, permintaan GET `/api/produk` selesai dalam waktu hanya **~180 ms**.
   - *Penyebab Meleset:* Server backend merespons dengan sangat cepat dan tidak bermasalah. Hambatan utama yang membuat halaman terasa berat murni terjadi di sisi klien (*client-side runtime*):
     - Main thread terblokir selama **2.175,7 ms** untuk memproses pembuatan 1.500 node DOM kartu secara bersamaan.
     - Terjadi *Forced Synchronous Layout* (Layout Thrashing) masif pada fungsi [`samakanTinggiJudul`](file:///Users/andythoriq/_dev/TOKOKILATS/tokokilat/public/js/katalog.js#L80) yang menyita waktu tahap Layout sebesar **1.234,5 ms** (32,6% dari total waktu eksekusi).
     - Gambar lambat muncul bukan karena server lemot, melainkan browser klien membentur batas konkurensi 6 soket TCP HTTP/1.1 akibat 1.500 permintaan gambar diinisiasi sekaligus, menyebabkan 1.494 permintaan berstatus *stalled*.

3. **Dugaan Rudi #3: "`urutkanGelembung` di `util.js` itu bubble sort. Ganti dengan quicksort biar kencang."**
   - *Bantahan Pengukuran:* Fungsi [`urutkanGelembung`](file:///Users/andythoriq/_dev/TOKOKILATS/tokokilat/public/js/util.js#L36) hanya dipakai di footer untuk mengurutkan daftar merek terlaris. Jumlah merek unik dalam katalog hanya belasan item (10–15 merek).
   - *Penyebab Meleset:* Pengurutan array 15 elemen dengan Bubble Sort membutuhkan maksimal 15^2 = 225 operasi, yang dieksekusi CPU dalam waktu **< 0,05 ms**. Mengganti algoritma ini menjadi Quicksort (O(n \log n)) tidak memberikan perubahan terukur apa pun pada Long Task maupun frame rate antarmuka.

4. **Dugaan Rudi #4: "Perhitungan voucher sudah saya buat `async`, jadi harusnya aman dan tidak memblokir."**
   - *Bantahan Pengukuran:* Pada skenario S4 (tiket TK-1057), penekanan tombol voucher tetap membekukan layar dan kolom cari selama beberapa detik; progress bar tetap macet di 0% lalu mendadak melompat selesai.
   - *Penyebab Meleset:* Fungsi `async` tanpa operasi I/O asinkron sejati (hanya berisi loop komputasi sinkron) mengembalikan Promise yang langsung terselesaikan (*resolved*). Penyelesaian Promise dijadwalkan pada antrean **Microtask**, bukan Macro-task. Sesuai spesifikasi HTML Event Loop, browser wajib menghabiskan (*drain*) seluruh antrean microtask sampai kosong sebelum memberikan kesempatan rendering (*rendering opportunity*). Akibatnya, `await hitungHargaPromo` untuk 1.500 produk tetap memonopoli Main Thread secara berkelanjutan tanpa memberi kesempatan browser menggambar frame baru atau memproses input pengguna.

5. **Dugaan Tim Sendiri pada Prediksi P-01 (TK-1078): "Pencadangan slot kosong sebesar 132 px (atau 236 px pada mobile) akan menurunkan skor CLS dari 0,474 menjadi 0,00 (atau <= 0,02)."**
   - *Bantahan Pengukuran:* Setelah perbaikan commit `bed84c3`, skor CLS median yang diperoleh dari 3 kali pengujian adalah **0,292** (Percobaan 1: 0,292; Percobaan 2: 0,292; Percobaan 3: 0,292). Target Core Web Vitals (<= 0,1) **belum tercapai**.
   - *Penyebab Meleset:* Model mental tim mengasumsikan bahwa menetapkan tinggi statis 236 px pada elemen slot kosong akan sepenuhnya mengeliminasi pergeseran. Kenyataannya, peramban Chromium merender elemen banner asli dengan struktur padding dinamis, garis batas dashed 1,5 px, dan text wrapping multi-line yang memiliki selisih tinggi efektif puluhan piksel terhadap slot kerangka kosong. Selisih geometri residual ini tetap memicu pergeseran elemen-elemen di bawahnya saat slot digantikan oleh banner asli (`replaceWith`).

6. **Dugaan Tim Sendiri pada Prediksi P-02 (TK-1081): "Penerapan native lazy loading (`loading='lazy'`) pada kartu indeks >= 6 akan memangkas inisiasi gambar awal menjadi 6–12 permintaan saja."**
   - *Bantahan Pengukuran:* Setelah commit `bed84c3`, jumlah permintaan gambar yang diinisiasi dalam 10 detik pertama masih mencapai median **811 permintaan** (Percobaan 1: 689; Percobaan 2: 811; Percobaan 3: 897).
   - *Penyebab Meleset:* Native lazy loading pada Chromium mengimplementasikan margin ambang pandang (*intersection margin / pre-load distance threshold*) yang sangat lebar (~1.250 px pada koneksi cepat). Karena seluruh 1.500 node elemen kartu di-append sekaligus ke dalam satu kontainer kisi tanpa virtualisasi DOM, ratusan kartu produk di bawah viewport tetap dianggap memenuhi ambang batas pramuat sebelum peramban sempat membatasi unduhan.

---

## 6. Yang belum beres dan rekomendasi

### A. Masalah yang Tersisa di Sisi Frontend TokoKilat
1. **Pergeseran Tata Letak Residual Banner Promo (CLS = 0,292):**
   - *Status:* Skor CLS telah turun dari 0,474 ke 0,292, namun belum memenuhi batas aman Core Web Vitals (0,1).
   - *Rekomendasi:* Desain ulang slot skeleton di HTML/CSS agar memiliki struktur internal yang identik dengan banner akhir (terdiri dari placeholder judul, deskripsi teks, dan tombol dengan padding serta margin yang presisi). Alternatif lain, sematkan kontainer pembungkus tetap (*fixed aspect-ratio wrapper*) dengan `contain: layout size` sehingga dimensi luar tidak terpengaruh oleh kalkulasi konten di dalamnya.
2. **Saturasi Permintaan Gambar Belum Minimal (811 Permintaan Terinisiasi):**
   - *Status:* Beban terpangkas dari 1.500 ke 811 permintaan, namun 811 berkas masih terlalu banyak untuk perangkat kelas bawah dan jaringan seluler.
   - *Rekomendasi:* Terapkan **DOM Virtualization (Windowing)** murni menggunakan vanilla JS (atau *Chunked Rendering* bertahap): hanya masukkan 12–18 elemen kartu produk ke dalam pohon DOM yang berada di dalam dan sekitar area pandang viewport. Kartu lainnya hanya di-render secara dinamis saat pengguna menggulir mendekati batas layar.
3. **Long Task & Layout Thrashing pada Pemuatan Awal (1.234 ms Layout):**
   - *Status:* Fungsi [`samakanTinggiJudul`](file:///Users/andythoriq/_dev/TOKOKILATS/tokokilat/public/js/katalog.js#L80) masih melakukan pembacaan `offsetHeight` dan penulisan `style.height` berulang kali pada 1.500 kartu secara sinkron saat aplikasi pertama kali dimuat.
   - *Rekomendasi:* Hapus total manipulasi JavaScript pada `samakanTinggiJudul()` dan gantikan sepenuhnya dengan solusi CSS murni menggunakan properti multi-line clamp (`display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; height: 2.8em;`).

### B. Risiko Menghadapi Harbolnas 12.12
1. **Risiko Kehabisan Memori dan Garbage Collection Spikes:**
   - Menyimpan 1.500 node kartu produk lengkap beserta elemen anak di DOM pohon menghasilkan lebih dari 15.000 simpul DOM (*DOM Tree Bloat*). Pada perangkat Android kelas bawah dengan RAM 2–3 GB, kondisi ini memicu *Major C++ Garbage Collection* berulang kali (terekam menyita 823 ms di trace awal), mengakibatkan antarmuka mengalami *freeze*, ponsel cepat panas, dan baterai terkuras (keluhan Pak Yusuf di TK-1070).
2. **Risiko Starvation pada Jaringan HTTP/1.1:**
   - 811 permintaan gambar yang mengantre di latar belakang dapat menahan koneksi soket TCP dari permintaan transaksi kritis (seperti permintaan checkout atau verifikasi voucher), menyebabkan keterlambatan respon bisnis yang berujung pada keluhan pengguna dan kegagalan transaksi kilat.

### C. Usulan dan Koordinasi Antar-Tim
1. **Untuk Tim Backend:**
   - *Pagination / Cursor-based API:* Hentikan pengiriman 1.500 produk sekaligus dalam satu payload array JSON raksasa pada endpoint `/api/produk`. Terapkan pembagian halaman (*pagination*) bertahap (misal 20–40 produk per respons batch).
   - *Metadata Spesifikasi Banner Promo:* Pada respons endpoint `/api/promo`, sertakan metadata rasio aspek atau dimensi baku banner promosi, atau standarisasikan ukuran materi promo agar tim frontend dapat mengunci dimensi slot cadangan dengan akurasi 100%.
   - *Upgrade Protokol ke HTTP/2 atau HTTP/3:* Konfigurasikan reverse proxy server (Nginx/Cloudflare) agar mendukung protokol HTTP/2 atau HTTP/3. Fitur *multiplexing* pada HTTP/2 akan mengeliminasi batasan 6 soket koneksi TCP per origin dan mengatasi fenomena *head-of-line blocking* pada aset gambar.
2. **Untuk Vendor SDK Analitik (Lacak):**
   - *Asynchronous Web Worker Processing:* Pindahkan seluruh komputasi intensif hashing analitik dari Main Thread ke *Web Worker*, atau terapkan mekanisme *batching* berbasis waktu (*idle-time dispatch* via `requestIdleCallback`).
   - *Pembatasan Muatan Otomatis (Payload Sanitization):* Hentikan ekstraksi otomatis seluruh riwayat aktivitas dari `localStorage` saat event analitik dipanggil, untuk menghindari serialisasi string ratusan kilobita yang membekukan interaksi tombol keranjang.
3. **Untuk Tim Desain dan UI-UX:**
   - *Desain Standar Skeleton & Banner:* Tetapkan pedoman desain banner yang memiliki tinggi tetap dan ramah terhadap berbagai rasio layar ponsel (responsif namun berdimensi terprediksi).
   - *Spesifikasi Kartu Produk Seragam:* Rancang tata letak kartu produk dengan batas maksimal 2 baris judul dan ukuran gambar tetap (rasio 1:1), sehingga tidak memerlukan komputasi penyelarasan tinggi dinamis melalui JavaScript.
   - *State Feedback Interaksi yang Jelas:* Sediakan panduan visual transisi untuk status tombol aksi utama ("Menambahkan...", "Memproses pesanan...") dengan kunci disabled state guna mencegah pengguna melakukan klik berulang kali saat sistem sedang memproses permintaan.

---

## 7. Pernyataan penggunaan AI dan pembagian kerja
- **Kontribusi Anggota (Nauval):**
  - Mendiagnosis dan merekam baseline trace sebelum perbaikan untuk Skenario S1 (TK-1041) dan S2 (TK-1044).
  - Menyusun hipotesis dan log prediksi di `laporan/PREDIKSI.md` untuk entri P-01 dan P-02 sebelum modifikasi kode.
  - Mengimplementasikan perbaikan kode: debounce pencarian (`pencarian.js`), eliminasi Layout Thrashing dan *progressive chunked rendering* (`katalog.js`, `toko.css`), serta *immediate optimistic UI* dan peringkasan payload analitik (`keranjang.js`).
  - Mengukur ulang performa sesudah perbaikan (3 repetisi) dan membuktikan tercapainya target evaluasi secara mutlak.
- **Kontribusi Anggota (Thoriq):**
    - Skenario 0
    - Audit AI
- **Pernyataan Penggunaan AI:**
  - AI digunakan sebagai rekan diskusi analitis untuk memetakan temuan Flame Chart DevTools ke model teoritis *Event Loop* (task scheduling) dan *Rendering Pipeline* (forced synchronous layout), serta menyusun strategi perbaikan kode tanpa melanggar batasan penugasan.
  - Audit AI menggunakan copilot cli (gpt-5.6-luna: Intelligence)
  - Penyusunan laporan menggunakan Antigravity (Gemini 3.8 flash)
