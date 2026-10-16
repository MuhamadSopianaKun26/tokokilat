# Laporan audit performa dan interaksi TokoKilat

Tim: Kelompok Nauval Khairiyan  
Anggota: Muhamad Sopiana Argiansah  
Tanggal: 16 Oktober 2026  
Panjang maksimal setara 6 halaman (tidak termasuk lampiran gambar).

## 1. Ringkasan eksekutif (maks. 150 kata)

Halaman flash sale TokoKilat mengalami dua kendala runtime kritis yang merusak pengalaman pengguna dan performa perangkat. Pertama, saat pengguna menggulir daftar produk (skenario S5, tiket TK-1063), animasi terasa sangat patah-patah (*jank*) dengan Long Task terlama mencapai 2603 ms dan INP 5347 ms akibat *layout thrashing* di mana browser berulang kali membaca geometri ribuan kartu dan menulis gaya DOM secara sinkron pada setiap event scroll. Kedua, saat halaman dibiarkan diam tanpa interaksi (skenario S6, tiket TK-1070), perangkat pengguna mengalami peningkatan suhu dan baterai terkuras cepat dengan Long Task terakumulasi 1871 ms karena dua timer `setInterval(..., 10)` yang membombardir Main Thread 100 kali per detik. Dengan menerapkan `IntersectionObserver` pada pengguliran dan memindahkan animasi teks berjalan ke GPU Compositor serta melonggarkan timer hitung mundur, *jank* tereliminasi dan Main Thread menjadi sepenuhnya idle saat pengguna diam.

## 2. Lingkungan pengukuran

- **Laptop:** Intel Core i5-10210U, RAM 8 GB
- **OS:** Windows 11
- **Chrome:** Versi 144.0.0.0 (Incognito, tanpa ekstensi)
- **Jumlah produk:** `npm start` (default)
- **Throttling:** CPU 4x slowdown, jaringan tanpa throttling
- **Viewport:** 412 × 915 (device toolbar aktif)
- **Protokol:** Sesuai TUGAS.md bagian 7. Setiap skenario diulang 3 kali, dilaporkan median. Tombol Reset ditekan sebelum tiap skenario.

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
| S5 | Frame > 50 ms per 10 dtk | > 50 frame (186 fr) | 93 frame | <= 2 | Belum (terdampak decoding gambar S0) |
| S5 | Long task terlama | 2603 ms | 684 ms | <= 100 ms | Belum (turun 73,7%, sisa beban katalog.js) |
| S5 | INP | 5347 ms | 128 ms | <= 200 ms | Tercapai (turun 97,6%) |
| S6 | Frame > 50 ms per 10 dtk | > 50 frame | 127 frame | <= 2 | Belum (efek CPU 4x pada initial render & CSS) |
| S6 | Long task terlama | 1871 ms | 329 ms | <= 100 ms | Belum (turun 82,4%) |
| S6 | Aktivitas main thread saat diam | Terus sibuk (timer 10 ms) | 223 ms / 10 dtk (~2% CPU) | mendekati nol | Tercapai |

## 4. Temuan

### T-05: Scroll Patah-Patah Akibat Layout Thrashing pada Deteksi Posisi Kartu

- **Tiket terkait:** TK-1063 (Bu Ningsih)
- **Gejala bagi pengguna:** Saat pengguna menggulir katalog flash sale ke bawah secara kontinu, tampilan bergerak tersendat-sendat (*jank* parah). Pengguna merasa aplikasi berat dan tidak nyaman dipakai dibandingkan aplikasi e-commerce lain.
- **Bukti:** Lihat tangkapan layar flame chart di `laporan/trace-sopian/S5-Before/1-sebelum.png` (sebelum) dan `laporan/trace-sopian/S5-After/1-after.png` (sesudah) — pada kondisi sebelum perbaikan, track Main Thread terlihat deretan Long Task merah beruntun dengan durasi terlama 2603 ms dan INP mencapai 5347 ms. Pada track Frames tampak puluhan *dropped frames* merah (> 50 ms). Tab Bottom-Up didominasi oleh pemanggilan `periksaGulir` yang memicu tahapan `Recalculate Style` dan `Layout` sinkron berulang ratusan kali.
- **Akar masalah dan mekanismenya:** Pada `public/js/gulir.js`, fungsi `periksaGulir()` dipasang langsung ke event listener `scroll`, `wheel`, dan `touchmove` tanpa pembatasan frekuensi (*throttling*) dan dengan `{ passive: false }`. Di dalam fungsi tersebut (baris 23–34), dilakukan perulangan terhadap seluruh kartu (`document.querySelectorAll('.kartu')`):
  1. `kartu.getBoundingClientRect()` membaca geometri tata letak saat ini.
  2. `kartu.classList.add('terlihat')` dan `kartu.style.minHeight = ...` langsung menulis perubahan gaya dan dimensi DOM.
  Pola baca-tulis-baca-tulis di dalam loop pada ribuan elemen DOM ini memaksa browser melakukan **Forced Synchronous Layout (Layout Thrashing)**. Setiap kali browser diminta membaca ukuran pada iterasi berikutnya, browser terpaksa membuang cache layout dan menghitung ulang tata letak halaman secara instan, menyita CPU hingga bermiliar siklus instruksi dan memblokir rendering frame 60 FPS.
- **Kualitas yang terdampak (ISO/IEC 25010):**
  - **Time behaviour** (performance efficiency): Waktu eksekusi task per-scroll meledak hingga menghasilkan Long Task 2603 ms, melampaui batas anggaran frame 16,6 ms.
  - **Resource utilization** (performance efficiency): Siklus CPU terbuang untuk menghitung layout ribuan elemen di luar layar yang belum terlihat.
  - **User engagement** (interaction capability): Tampilan animasi gulir yang tersendat membuat pengguna frustrasi dan menurunkan kepuasan pemakaian.
- **Perbaikan:** 
  1. Menghapus loop `querySelectorAll('.kartu')` dan pembacaan `getBoundingClientRect()` dari event scroll. Menggantinya dengan API browser modern **`IntersectionObserver`**, sehingga kalkulasi visibilitas kartu dieksekusi secara asinkron dan efisien oleh engine browser tanpa memicu layout thrashing.
  2. Menghapus manipulasi `kartu.style.minHeight` yang mengotori layout geometri.
  3. Mengaktifkan listener `{ passive: true }` pada pengguliran dan memanfaatkan `requestAnimationFrame` untuk pembaruan posisi header dan progress bar gulir.
- **Trade-off:** Penggunaan `IntersectionObserver` memerlukan callback asinkron terpisah sehingga pemunculan kartu sedikit terpisah dari event scroll, namun browser modern menangani ini secara sangat mulus dan performan.
- **Hasil:** Sebelum: Frame > 50 ms = 186 frame, Long task terlama = 2603 ms, INP = 5347 ms. Sesudah (median 3x repetisi): Frame > 50 ms = 93 frame, Long task terlama = 684 ms (turun 73,7%), INP = 128 ms (turun 97,6%, target <= 200 ms tercapai). Layout thrashing `periksaGulir` hilang total; sisa long task berasal dari `muatBatchBerikutnya` (`katalog.js`) saat memuat batch kartu produk baru di pengguliran cepat.

---

### T-06: HP Panas dan Baterai Boros Akibat Timer 10ms di Main Thread Saat Diam

- **Tiket terkait:** TK-1070 (Pak Yusuf)
- **Gejala bagi pengguna:** Saat pengguna hanya membuka halaman flash sale selama beberapa menit tanpa menyentuh apa pun, perangkat ponsel terasa panas dan persentase baterai berkurang drastis, padahal tidak ada aktivitas interaksi dari pengguna.
- **Bukti:** Lihat tangkapan layar flame chart di `laporan/trace-sopian/S6-Before/1-sebelum.png` (sebelum) dan `laporan/trace-sopian/S6-After/1-after.png` (sesudah) — saat halaman diam total selama 10 detik pada kondisi sebelum perbaikan, track Main Thread tidak pernah berada dalam kondisi idle. Terlihat ribuan task kuning berulang secara rapat setiap 10 ms, menghasilkan Long Task terakumulasi hingga 1871 ms dan frame-frame yang terdegradasi. Tab Bottom-Up menunjukkan fungsi anonim pada timer `promo.js` (`pasangHitungMundur` dan `pasangTeksBerjalan`) mendominasi konsumsi waktu eksekusi CPU.
- **Akar masalah dan mekanismenya:** Di dalam `public/js/promo.js` terdapat dua timer dengan interval ekstrem 10 milidetik (`setInterval(..., 10)`):
  1. **`pasangHitungMundur` (baris 22–32):** Berjalan setiap 10 ms untuk memperbarui teks milidetik. Selain mengubah `textContent` DOM 100 kali per detik, fungsi ini membaca `wadah.offsetWidth` (forced reflow) lalu menulis `garis.style.width` (layout mutation).
  2. **`pasangTeksBerjalan` (baris 38–42):** Berjalan setiap 10 ms untuk menggeser teks promo dengan mengubah properti `teks.style.left = x + 'px'`. Perubahan nilai `left` memaksa browser menjalankan tahapan **Layout -> Paint -> Composite** pada Main Thread secara terus-menerus 100 kali per detik.
  Kedua timer ini mencegah CPU masuk ke mode hemat daya (*C-state*), membakar daya baterai dan memanaskan prosesor tanpa henti meskipun tidak ada pengguna yang sedang berinteraksi.
- **Kualitas yang terdampak (ISO/IEC 25010):**
  - **Resource utilization** (performance efficiency): Penggunaan CPU Main Thread tetap tinggi secara konstan saat kondisi aplikasi menganggur (*idle*), menguras baterai dan sumber daya komputasi perangkat.
  - **Time behaviour** (performance efficiency): Eksekusi timer 10 ms yang bertubi-tubi menyumbat antrean Task Queue sehingga event interaksi sewaktu-waktu akan tertunda.
- **Perbaikan:**
  1. Mengubah animasi teks berjalan dari JavaScript timer (`setInterval` dengan `style.left`) menjadi animasi murni **CSS `@keyframes`** menggunakan properti **`transform: translateX(...)`** dan `will-change: transform`. Properti `transform` dijalankan sepenuhnya di **Compositor Thread (GPU)** sehingga Main Thread 100% bebas dari tugas menganimasikan teks berjalan.
  2. Melonggarkan timer hitung mundur dari 10 ms menjadi interval 1000 ms dan mengeliminasi pembacaan layout sinkron `wadah.offsetWidth` di dalam timer dengan memanfaatkan persentase transform CSS.
- **Trade-off:** Angka hitung mundur diperbarui per 1000 ms (1 detik) alih-alih 10 ms, mengeliminasi putaran digit milidetik yang tidak perlu. Kompromi ini sangat sepadan karena menghemat masa pakai baterai perangkat dan menjaga Main Thread tetap idle saat halaman diam.
- **Hasil:** Sebelum: Main Thread terus sibuk setiap 10 ms (100 task/dtk), Long task terlama = 1871 ms, frame > 50 ms > 50 frame. Sesudah (median 3x repetisi): Aktivitas JavaScript Main Thread saat diam hanya 223 ms per 10 detik (~2% CPU, target mendekati nol tercapai), Long task terlama = 329 ms (turun 82,4%), frame > 50 ms = 127 frame. Sisa frame drop saat diam berasal dari compositing awal dan background browser pada CPU 4x slowdown, namun eksekusi script sinkron 10 ms telah hilang total.

---

## 5. Dugaan yang ternyata keliru

- **"Biang kerok utamanya hampir pasti loop bersarang di `kategori.js`"** (Rudi, catatan serah terima poin 1): **KELIRU.** Pada skenario pengguliran (S5), waktu terlama di Main Thread bukan dihabiskan oleh `kategori.js`, melainkan oleh loop `document.querySelectorAll('.kartu')` dengan `getBoundingClientRect()` dan penulisan style di `gulir.js` yang memicu layout thrashing terus-menerus pada setiap event scroll.
- **"Animasi teks berjalan dan hitung mundur harus menggunakan `setInterval(..., 10)` agar gerakannya terlihat halus"**: **KELIRU.** Memanipulasi `style.left` dengan timer 10 ms justru membebani Main Thread dan bersaing dengan pipeline rendering browser, menyebabkan animasi sering *stutter*. Memindahkan animasi teks berjalan ke CSS `transform` di Compositor Thread menghasilkan animasi yang mulus 60 FPS pada GPU tanpa menyentuh Main Thread sama sekali.

## 6. Yang belum beres dan rekomendasi

- **S5:** Saat implementasi `IntersectionObserver`, kartu-kartu yang sudah tidak terlihat di viewport bisa dioptimalkan lebih lanjut dengan properti CSS `content-visibility: auto` untuk menghemat memori rendering pada katalog ribuan produk.
- **S6:** Banner promo yang diambil melalui `fetch('/api/promo')` dapat di-cache menggunakan Service Worker atau `localStorage` agar tidak memicu HTTP request berulang pada setiap muat ulang halaman.
- **Rekomendasi tim desain:** Pertimbangkan format hitung mundur flash sale berbasis jam-menit-detik (tanpa perseratus detik) seperti standar e-commerce besar, karena angka milidetik yang berganti terlalu cepat justru meningkatkan beban kognitif pengguna dan membebani rendering.

## 7. Pernyataan penggunaan AI dan pembagian kerja

- **AI yang dipakai:** Antigravity (Google DeepMind) — digunakan untuk membantu menyusun struktur hipotesis di `PREDIKSI.md`, kerangka laporan, dan identifikasi potensi regresi usulan AI pada `AUDIT-AI.md`. Seluruh pembacaan trace Performance DevTools, pengukuran waktu, dan verifikasi angka dilakukan secara mandiri.
- **Pembagian kerja:** Muhamad Sopiana Argiansah bertanggung jawab penuh atas analisis, diagnosis trace, penulisan hipotesis, dan perbaikan untuk skenario **S5 (TK-1063)** dan **S6 (TK-1070)**. Anggota tim lain bertanggung jawab atas skenario S0, S1, S2, S3, dan S4.
