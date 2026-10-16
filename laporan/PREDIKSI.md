# Log prediksi

Aturan: satu entri per masalah. Bagian **Sebelum perbaikan** harus di-commit *sebelum* commit
perbaikannya. Bagian **Sesudah perbaikan** diisi setelah pengukuran ulang. Jangan menyunting
bagian "sebelum" setelah hasilnya diketahui; bila prediksi meleset, jelaskan di bagian "sesudah".

---

## P-01: Pergeseran Tata Letak (Cumulative Layout Shift) Akibat Pemasangan Banner Promo Asinkron

**Tiket terkait:** TK-1078
**Tanggal dan hash commit entri ini:** 15 Oktober 2026 [Andy 210c19a]

### Sebelum perbaikan

- **Yang teramati di trace (baseline):**
  - Pada track *Layout Shifts* / *Experience*, terdeteksi satu pergeseran tata letak tunggal pada detik ke-~4.1 (sekitar 4163 ms dari *navigation start*).
  - Rincian pada tab *Summary* (saat event *Layout Shift* diklik):
    - *Score*: **0.474**. Nilai ini melampaui batas (target 0,1).
    - *Impacted Nodes*: Elemen footer (`footer.kaki`), bilah utilitas kontrol (`div.alat-kanan`), dan teks ringkasan (`p#ringkasan`) tercatat mengalami pergeseran posisi vertikal ke bawah yang signifikan.
  - Pada track *Network*: Permintaan jaringan ke `/api/promo` berdurasi ~1800 ms selesai tepat sebelum pergeseran tata letak terjadi.
  - Pada track *Main Thread* & tab *Bottom-Up* / *Call Tree*: Begitu respons `/api/promo` selesai diterima, muncul task pemrosesan yang memicu pembaruan pohon DOM, diikuti langsung oleh tahap rendering pipeline: `UpdateLayoutTree` (Recalculate Style), `Layout` (Reflow), dan `Paint`.

- **Dugaan mekanisme:**
  - Menggunakan model *Event Loop* dan tahapan *Rendering Pipeline*:
    1. **Rendering Opportunity Awal**: Pemuatan data produk selesai lebih awal (~180 ms), sehingga kartu produk dan kontrol penyaring sudah dikomposisikan dan digambar pada layar saat *rendering opportunity* pertama. Pengguna telah melihat produk teratas dan bersiap melakukan klik.
    2. **Penyelesaian Task Asinkron**: Respons jaringan `/api/promo` tiba belakangan (~1.8 detik kemudian). Task penyelesaian jaringan mengeksekusi penambahan elemen banner promo (`.promo-banner`) tepat di bagian atas kontainer utama (`#utama`).
    3. **Tahap Pipeline (DOM Mutation -> Style -> Layout -> Paint)**:
       - Penyisipan elemen baru ke dalam kontainer tanpa adanya pencadangan dimensi ruang sebelumnya (*unreserved layout space*) membatalkan validitas geometri (*layout invalidation*).
       - Browser mengeksekusi tahap **Layout**, mendorong seluruh elemen di bawahnya (`#alat`, `#ringkasan`, kisi kartu produk, dan footer) ke bawah sebesar tinggi banner (~180–230px).
       - Tahap **Paint** menggambar ulang posisi elemen baru tersebut. Karena pergeseran terjadi tanpa interaksi pengguna baru saja (`had_recent_input: false`), peramban mencatat penalti `LayoutShift`, dan klik pengguna yang ditujukan ke kartu produk berakhir mengenai banner promosi.

- **Rencana perubahan:**
  - Menyediakan pencadangan ruang tata letak (*layout space reservation*) pada struktur awal kontainer promosi (misalnya menyediakan slot kontainer tetap atau skeleton/placeholder dengan dimensi yang sesuai di `#utama`) sebelum materi promosi selesai dimuat secara asinkron, sehingga saat elemen banner disisipkan, peramban tidak melakukan pergeseran posisi vertikal pada elemen-elemen di sekitarnya.

- **Prediksi terukur:**
  - Setelah perubahan, skor CLS pada S0 diprediksi turun dari **0.137** (trace raw score: 0.474) menjadi **0.00** (atau 0,02), karena tidak ada lagi pergeseran koordinat vertikal (*layout displacement*) pada elemen-elemen di sekitarnya saat banner dimuat.
  - Prediksi efek samping: Area kosong atau kotak kerangka (skeleton) sementara akan terlihat selama ~1.8 detik di bagian atas halaman sebelum materi promosi tampil, namun stabilitas tata letak tetap terjaga.

- **Alternatif yang dipertimbangkan dan alasan tidak dipilih:**
  - *Alternatif 1: Menunda rendering seluruh halaman sampai permintaan `/api/promo` selesai.* Alasan tidak dipilih: Memperburuk waktu FCP (*First Contentful Paint*) dan LCP (*Largest Contentful Paint*) secara drastis karena pengguna harus menunggu layar kosong selama ~1.8 detik hanya untuk menanti banner promosi.
  - *Alternatif 2: Menghapus elemen banner promosi.* Alasan tidak dipilih: Melanggar aturan tugas (TUGAS.md Bagian 5 Aturan 4: "Fitur tidak boleh dihapus... banner promo... harus tetap ada").

### Sesudah perbaikan

- **Hash commit perbaikan:** [Andy bed84c3]
- **Hasil ukur (median 3 kali):**
  - **Skor CLS:** Turun dari **0,474** menjadi **0,292** (Percobaan 1: 0,292; Percobaan 2: 0,292; Percobaan 3: 0,292).
  - **Node yang terdampak pergeseran:** Masih tercatat pergeseran pada `DIV class='alat-kanan'`, `FOOTER class='kaki'`, dan `P id='ringkasan' class='ringkasan'` pada saat banner promosi muncul.
  - **Waktu pergeseran:** Terjadi pada saat respons `/api/promo` diterima dan disisipkan (antara detik ke-2,8 s.d. 9,9).
- **Prediksi vs kenyataan:**
  - **Sebagian / Meleset.** Prediksi awal memperkirakan skor CLS akan turun drastis hingga **0,00** (atau <= 0,02). Kenyataannya, perbaikan pada commit `bed84c3` hanya memangkas skor dari 0,474 menjadi 0,292 (~38% perbaikan), sehingga masih melampaui ambang batas target Core Web Vitals (<= 0,1).
  - *Apa yang salah dari model mental?* Pencadangan ruang tata letak (*layout reservation*) yang disediakan pada struktur awal kontainer promosi belum presisi terhadap tinggi akhir elemen banner promosi yang dirender. Akibatnya, saat materi banner promosi selesai dimuat dan dimasukkan ke DOM, elemen tersebut tetap memicu pergeseran tata letak sisa (*residual layout displacement*) sebesar selisih dimensi antara placeholder dan banner asli, mendorong elemen-elemen di bawahnya ke bawah.
- **Efek samping yang muncul:**
  - Terdapat kotak kerangka/placeholder di bagian atas, namun karena dimensinya belum presisi dengan tinggi elemen banner yang sebenarnya, lonjakan tata letak vertikal masih terlihat dan terdeteksi oleh peramban saat banner selesai dimuat.

---

## P-02: Pemborosan Kuota Jaringan dan Pemuatan Gambar Terhambat Akibat *Eager Loading* Seluruh Produk

**Tiket terkait:** TK-1081
**Tanggal dan hash commit entri ini:** 15 Oktober 2026 [Andy 210c19a]

### Sebelum perbaikan

- **Yang teramati di trace (baseline):**
  - Pada track *Network* & Panel *Network*: Terdeteksi **1500 permintaan berkas gambar** (`/img/p/*.svg`) yang diinisiasi hampir secara simultan pada awal siklus hidup halaman (sekitar 2 detik pertama navigasi), dipicu oleh task inisialisasi render katalog produk.
  - Durasi & Status Pemuatan:
    - Dalam jendela 10 detik pertama (S0), dari 1500 permintaan yang diinisiasi, hanya **147 gambar** yang berhasil diselesaikan (median dari 3 percobaan: 136, 191, 147).
    - Waterfall jaringan didominasi oleh bilah abu-abu panjang berstatus *Queueing / Stalled* (antrean tertahan).
    - Permintaan gambar masih terus aktif dan mengantre hingga detik ke-22 s.d. 37, jauh melampaui kebutuhan tampilan layar saat itu.
  - Analisis Konsumsi Jaringan: Seluruh gambar untuk 1500 produk langsung diminta sekaligus ke jaringan, padahal viewport perangkat (412x915) hanya memuat ~4–6 produk teratas.

- **Dugaan mekanisme:**
  - Menggunakan model *Event Loop* dan *Network Pipeline*:
    1. **Inisialisasi DOM Tanpa Pembatasan Pemuatan (Eager Loading)**: Saat task perenderan daftar produk dieksekusi, peramban membuat 1500 elemen gambar dengan atribut sumber daya aktif sekaligus ke dalam DOM.
    2. **Saturasi Antrean Jaringan (*Network Contention*)**: Sub-sistem pemuat sumber daya (*Resource Fetcher*) browser mendeteksi 1500 permintaan aset eksternal dan langsung memasukkannya ke dalam antrean jaringan.
    3. **Batas Konkurensi Soket TCP HTTP/1.1**: Arsitektur peramban membatasi koneksi TCP simultan maksimal 6 koneksi per origin. Akibatnya, 1494 permintaan gambar langsung tertahan dalam status antrean (*stalled*).
    4. **Dampak Pengalaman Pengguna**: Gambar kartu teratas yang berada di dalam viewport harus mengantre soket TCP secara bergantian dengan ratusan gambar produk di posisi bawah halaman. Dengan latensi respons tiap gambar (60–300 ms), pemuatan gambar di viewport menjadi sangat lambat (tampak sebagai kotak abu-abu dalam waktu lama) dan menghabiskan kuota data pengguna secara tidak perlu.

- **Rencana perubahan:**
  - Menerapkan penundaan pemuatan gambar berdasarkan kebutuhan viewport (*native lazy loading*) pada elemen gambar produk (`loading="lazy"`), sehingga browser hanya meminta berkas gambar saat elemen tersebut mendekati atau berada di dalam viewport. Untuk kartu produk yang langsung terlihat pada viewport awal, pemuatan dapat diprioritaskan.

- **Prediksi terukur:**
  - Jumlah permintaan gambar dalam 10 detik pertama pada Skenario S0 diprediksi turun drastis dari **1500 permintaan** menjadi sekitar **6–12 permintaan** (sebanding dengan jumlah produk di viewport awal 412x915).
  - Waktu penyelesaian gambar pada kartu produk di viewport awal akan selesai dalam waktu singkat (< 1 detik) karena 6 soket koneksi tidak tersumbat oleh antrean gambar di luar layar.
  - Volume transfer data awal berkurang drastis (>95%).
  - Prediksi efek samping: Saat pengguna menggulir cepat (*fast scrolling*), gambar di bagian bawah mungkin memerlukan sedikit waktu untuk mengunduh saat baru memasuki viewport.

- **Alternatif yang dipertimbangkan dan alasan tidak dipilih:**
  - *Alternatif 1: Menggunakan pustaka JavaScript pihak ketiga (misalnya library infinite scroll / lazy load).* Alasan tidak dipilih: Melanggar aturan tugas ("Tanpa framework, library, atau bundler").
  - *Alternatif 2: Memangkas jumlah total produk yang dikirim oleh server.* Alasan tidak dipilih: Melanggar aturan tugas (berkas server tidak boleh diubah; Aturan 3: seluruh produk harus tetap ada dan dapat dicari).

### Sesudah perbaikan

- **Hash commit perbaikan:** [Andy bed84c3]
- **Hasil ukur (median 3 kali):**
  - **Jumlah permintaan gambar diinisiasi (10 detik pertama):** Turun dari **1500 permintaan** menjadi **811 permintaan** (Percobaan 1: 689; Percobaan 2: 811; Percobaan 3: 897).
  - **Jumlah gambar selesai dalam 10 detik pertama:** Naik dari median 147 menjadi **284 gambar** (Percobaan 1: 293; Percobaan 2: 50; Percobaan 3: 284).
  - **Gambar terakhir selesai dalam 10 detik pertama:** Median pada detik ke-**9,95** (Percobaan 1: 9,95 dtk; Percobaan 2: 9,67 dtk; Percobaan 3: 9,98 dtk).
  - **Unduhan latar belakang:** Unduhan gambar masih terus aktif dan mengantre di latar belakang hingga detik ke-20 s.d. 32 (total selesai ~610–811 gambar).
- **Prediksi vs kenyataan:**
  - **Sebagian / Meleset.** Prediksi awal memperkirakan jumlah inisiasi gambar awal akan turun drastis hingga **6–12 permintaan** (sebanding dengan jumlah produk di viewport awal 412x915). Kenyataannya, peramban masih menginisiasi ratusan permintaan (median 811 permintaan gambar).
  - *Apa yang salah dari model mental?* Penambahan atribut `loading="lazy"` pada elemen kartu produk tidak serta-merta membatasi unduhan hanya pada kartu yang berada di viewport awal apabila seluruh 1500 elemen kartu dimasukkan ke DOM sekaligus tanpa dimensi (tinggi) yang eksplisit sebelum tahap *Style & Layout* selesai dihitung. Pada siklus pemuatan awal, sebelum peramban menyelesaikan kalkulasi geometri posisi tiap elemen, kartu-kartu produk dianggap menumpuk di koordinat Y teratas atau masuk dalam margin ambang pramuat (*lazy load pre-load intersection margin* Chromium yang cukup lebar, ~1250px). Hal ini menyebabkan peramban tetap mengantrekan ratusan permintaan gambar ke jaringan sebelum pembatasan viewport bekerja efektif.
- **Efek samping yang muncul:**
  - Meskipun beban inisiasi terpangkas hampir separuh (dari 1500 menjadi 811), saturasi antrean koneksi (*network contention*) tetap terjadi di fase awal sehingga pemuatan gambar kartu di viewport atas masih harus bersaing dengan ratusan gambar kartu di bawahnya.
