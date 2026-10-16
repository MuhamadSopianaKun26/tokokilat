# Log prediksi

Aturan: satu entri per masalah. Bagian **Sebelum perbaikan** harus di-commit *sebelum* commit
perbaikannya. Bagian **Sesudah perbaikan** diisi setelah pengukuran ulang. Jangan menyunting
bagian "sebelum" setelah hasilnya diketahui; bila prediksi meleset, jelaskan di bagian "sesudah".

---

## P-05: Scroll Patah-Patah Akibat Layout Thrashing pada Pemeriksaan Posisi Kartu (S5)

**Tiket terkait:** TK-1063  
**Tanggal dan hash commit entri ini:** 16 Oktober 2026, commit `[DIISI SAAT COMMIT]`

### Sebelum perbaikan

- **Yang teramati di trace (baseline):** Ketika halaman digulir terus-menerus selama 10 detik (skenario S5), terjadi *jank* parah dengan Long Task terlama mencapai **2603 ms**, INP mencapai **5347 ms**, dan lebih dari 50 frame mengalami drop (> 50 ms per frame). Pada panel Performance (lihat `laporan/trace/S5/1-sebelum.png`), fungsi `periksaGulir()` di `public/js/gulir.js` mendominasi Main Thread dan memicu serangkaian event `Recalculate Style` dan `Layout` sinkron berulang ratusan kali.
- **Dugaan mekanisme:** `periksaGulir()` dipasang pada event `scroll`, `wheel`, dan `touchmove` tanpa throttling dan dengan `{ passive: false }`. Di dalamnya, terdapat loop `document.querySelectorAll('.kartu')` yang memanggil `kartu.getBoundingClientRect()` lalu diikuti penulisan `kartu.style.minHeight = ...` dan manipulasi class. Pola interleaving baca-tulis properti geometris layout pada ribuan elemen DOM ini menimbulkan **Forced Synchronous Layout (Layout Thrashing)**. Browser dipaksa menghitung ulang layout geometri seluruh dokumen di setiap iterasi perulangan dalam satu frame rendering.
- **Rencana perubahan:** 
  1. Mengganti perulangan `querySelectorAll('.kartu')` dan pembacaan `getBoundingClientRect()` dengan API **`IntersectionObserver`**, sehingga penentuan elemen kartu yang masuk viewport didelegasikan ke engine browser secara asinkron tanpa memicu forced layout.
  2. Menghapus penulisan `kartu.style.minHeight` yang mengotori geometri tata letak.
  3. Memasang listener scroll dengan `{ passive: true }` dan mengoptimalkan update visual header menggunakan `requestAnimationFrame`.
- **Prediksi terukur:** Setelah perubahan, Long Task selama pengguliran turun dari 2603 ms menjadi **<= 100 ms**, INP turun dari 5347 ms menjadi **<= 200 ms**, dan jumlah frame > 50 ms berkurang drastis menjadi **<= 2 frame per 10 detik**. Pengguliran katalog terasa mulus 60 FPS.
- **Alternatif yang dipertimbangkan dan alasan tidak dipilih:** Melakukan throttling event scroll dengan `requestAnimationFrame` atau lodash throttle tanpa `IntersectionObserver`. Alasan tidak dipilih: Throttling biasa tetap harus mengeksekusi loop `getBoundingClientRect()` pada 3.000 kartu per frame, yang tetap memicu layout thrashing; `IntersectionObserver` menyelesaikan akar masalah di tingkat arsitektur browser.

### Sesudah perbaikan

- **Hash commit perbaikan:** ....
- **Hasil ukur (median 3 kali):** ....
- **Prediksi vs kenyataan:** ....
- **Efek samping yang muncul:** ....

---

## P-06: Main Thread Terus Sibuk dan Baterai Boros Saat Halaman Diam (S6)

**Tiket terkait:** TK-1070  
**Tanggal dan hash commit entri ini:** 16 Oktober 2026, commit `[DIISI SAAT COMMIT]`

### Sebelum perbaikan

- **Yang teramati di trace (baseline):** Saat halaman didiamkan selama 10 detik tanpa interaksi apa pun (skenario S6), Main Thread tidak pernah masuk ke status idle (lihat `laporan/trace/S6/1-sebelum.png`). Terjadi ribuan task kuning berulang setiap 10 ms dengan Long Task terakumulasi mencapai **1871 ms** dan puluhan frame > 50 ms. Profiler menunjukkan fungsi timer pada `public/js/promo.js` menghabiskan mayoritas CPU time.
- **Dugaan mekanisme:** Di dalam `public/js/promo.js` terdapat dua timer `setInterval(..., 10)` yang berjalan 100 kali per detik:
  1. `pasangTeksBerjalan()`: Mengubah properti `teks.style.left = x + 'px'` setiap 10 ms. Pengubahan properti `left` memaksa browser menjalankan pipeline lengkap: **Layout -> Paint -> Composite** pada Main Thread secara terus-menerus.
  2. `pasangHitungMundur()`: Menjalankan kalkulasi sisa waktu setiap 10 ms, membaca `wadah.offsetWidth` (forced reflow sinkron), dan menulis `garis.style.width`.
  Aktivitas Main Thread yang non-stop ini mencegah CPU masuk ke low-power state, menyebabkan baterai cepat habis dan perangkat mengalami peningkatan suhu (throttling termal).
- **Rencana perubahan:**
  1. Mengganti animasi teks berjalan berbasis JavaScript timer (`setInterval` + `style.left`) dengan animasi **CSS `@keyframes`** murni menggunakan properti **`transform: translateX(...)`** dan `will-change: transform`. Animasi berbasis `transform` diproses sepenuhnya di **Compositor Thread (GPU)** dan tidak melibatkan Main Thread sama sekali.
  2. Menyesuaikan interval timer hitung mundur dari 10 ms menjadi 1000 ms (atau 100 ms) dan menghindari pembacaan `offsetWidth` di dalam timer dengan memanfaatkan skala persentase transform CSS.
- **Prediksi terukur:** Setelah perubahan, aktivitas Main Thread saat diam turun mendekati **nol**, tidak ada Long Task (> 100 ms) yang terjadi saat halaman menganggur, frame > 50 ms berkurang menjadi **<= 2 per 10 detik**, dan animasi teks berjalan tetap bergerak mulus 60 FPS pada GPU Compositor.
- **Alternatif yang dipertimbangkan dan alasan tidak dipilih:** Menggunakan `requestAnimationFrame` untuk menganimasikan teks berjalan di JavaScript. Alasan tidak dipilih: `requestAnimationFrame` tetap berjalan di Main Thread dan mengeksekusi JavaScript pada setiap frame 16 ms, sehingga Main Thread tidak pernah benar-benar idle saat pengguna diam. Solusi CSS `transform` adalah satu-satunya cara membebaskan Main Thread 100%.

### Sesudah perbaikan

- **Hash commit perbaikan:** ....
- **Hasil ukur (median 3 kali):** ....
- **Prediksi vs kenyataan:** ....
- **Efek samping yang muncul:** ....
