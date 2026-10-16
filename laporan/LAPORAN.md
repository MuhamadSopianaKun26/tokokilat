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

Ulangi blok berikut untuk tiap temuan. Urutkan berdasarkan dampak, bukan urutan tiket.

### T-01: [judul]
- **Tiket terkait:** ....
- **Gejala bagi pengguna:** ....
- **Bukti:** tangkapan layar flame chart beranotasi (tandai task, fungsi dominan, dan tahap pipeline).
- **Akar masalah dan mekanismenya:** berkas, fungsi, dan penjelasan menurut event loop atau rendering pipeline.
- **Kualitas yang terdampak (ISO/IEC 25010):** sub-karakteristik performance efficiency dan
  interaction capability, beserta hubungan sebab-akibatnya.
- **Perbaikan:** apa yang diubah dan mengapa itu bekerja.
- **Trade-off:** alternatif yang dipertimbangkan, harga dari pilihan Anda.
- **Hasil:** angka sebelum dan sesudah.

## 5. Dugaan yang ternyata keliru
Dugaan dari catatan serah terima, dari tiket, atau dari tim Anda sendiri yang terbantah oleh
pengukuran. Sertakan angkanya. Bagian ini sama pentingnya dengan bagian temuan.

## 6. Yang belum beres dan rekomendasi
Masalah yang tersisa, risiko, dan usulan untuk tim lain (backend, vendor SDK, desain).

## 7. Pernyataan penggunaan AI dan pembagian kerja
Alat AI yang dipakai dan untuk apa. Kontribusi tiap anggota.
