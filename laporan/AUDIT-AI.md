# Audit usulan perbaikan dari AI

Peran Anda di sini adalah **reviewer**. Minta sebuah AI (asisten chat atau coding agent) memperbaiki
minimal dua tiket, sebaiknya di branch terpisah. Uji usulannya dengan protokol pengukuran yang sama.
Temukan minimal **dua** usulan bermasalah. Usulan AI yang bagus juga boleh dicatat, tetapi tidak
menggantikan dua temuan wajib.

Alat AI yang dipakai: Antigravity (Google DeepMind)  
Branch atau commit tempat usulan diuji: `AI_AUDIT_TK-1063_TK-1070`

---

## A-01: AI Merekomendasikan Throttle Sederhana untuk Masalah Pengguliran Patah-Patah (S5)

- **Tiket yang diminta diperbaiki:** TK-1063
- **Prompt yang diberikan (ringkas):** "Tolong perbaiki `public/js/gulir.js` agar halaman flash sale tidak patah-patah saat pengguna menggulir katalog produk ke bawah."
- **Usulan AI (ringkas, sertakan potongan kode yang relevan):**
  AI mengidentifikasi bahwa event listener `scroll` dipanggil terlalu sering dan mengusulkan membungkus fungsi `periksaGulir` dengan pembatas frekuensi (*throttle* 100 ms):
  ```javascript
  // Usulan AI: fungsi throttle 100 ms pada event scroll
  function throttle(fn, delay) {
    let last = 0;
    return (...args) => {
      const now = Date.now();
      if (now - last >= delay) {
        last = now;
        fn(...args);
      }
    };
  }
  // Dipasang pada window scroll:
  window.addEventListener('scroll', throttle(periksaGulir, 100));
  ```
- **Jenis masalah pada usulan:**
  - [ ] Salah diagnosis (memperbaiki hal yang bukan penyebab)
  - [x] Tidak lengkap (gejala berkurang tetapi akar masalah masih ada)
  - [x] Menimbulkan regresi (metrik lain, fitur, aksesibilitas, atau memori memburuk)
  - [ ] Melanggar aturan main (menghapus fitur, mengubah berkas terlarang, dan sebagainya)
  - [ ] Memperbaiki sesuatu yang tidak berpengaruh terukur
- **Bukti:** [ISI DENGAN TRACE SETELAH MENERAPKAN USULAN AI DAN MENGUKUR ULANG]
  - Masalah 1 (*Tidak lengkap & Akar Masalah Tetap Ada*): Usulan throttle hanya mengurangi frekuensi eksekusi `periksaGulir()`, namun tidak menyentuh akar masalah sebenarnya di dalam tubuh fungsi. Di dalam `periksaGulir()`, loop `document.querySelectorAll('.kartu')` dengan pembacaan `kartu.getBoundingClientRect()` dan penulisan `kartu.style.minHeight` tetap dieksekusi secara sinkron pada ribuan kartu. Setiap kali timer 100 ms tiba, Main Thread tetap terhantam *Forced Synchronous Layout* (Layout Thrashing) raksasa yang menghasilkan Long Task berdurasi ratusan milidetik.
  - Masalah 2 (*Regresi Responsivitas Visual*): Kartu-kartu yang masuk ke layar menjadi terlambat muncul (*pop-in delay*) hingga 100 ms karena pengecekan posisi tertunda oleh throttle. Animasi kartu terasa meloncat tidak wajar ketika pengguna menggulir cepat (*fast scroll*).
- **Mengapa AI bisa keliru di sini:** AI membaca kode secara permukaan dan menerapkan solusi umum *best-practice* teks buku ("scroll berat -> pasang throttle"). AI tidak memeriksa trace panel Performance sehingga tidak melihat bahwa lonjakan waktu CPU bukan disebabkan oleh frekuensi event scroll semata, melainkan oleh *layout thrashing* di dalam loop elemen kartu.
- **Perbaikan yang benar menurut tim:** Mengganti seluruh deteksi posisi kartu dengan API modern browser **`IntersectionObserver`** dan menghapus mutasi `style.minHeight`. Dengan `IntersectionObserver`, kalkulasi perpotongan elemen dengan viewport didelegasikan ke engine browser secara internal dan asinkron tanpa memicu forced layout pada Main Thread.

---

## A-02: AI Mengusulkan `requestAnimationFrame` untuk Animasi Teks Berjalan (S6) yang Tetap Membakar CPU Saat Diam

- **Tiket yang diminta diperbaiki:** TK-1070
- **Prompt yang diberikan (ringkas):** "Tolong perbaiki animasi teks berjalan di `public/js/promo.js` agar tidak membuat perangkat pengguna panas dan baterai cepat habis saat halaman didiamkan."
- **Usulan AI (ringkas, sertakan potongan kode yang relevan):**
  AI mengusulkan mengganti `setInterval(..., 10)` dengan `requestAnimationFrame` (rAF) agar animasi tersinkronisasi dengan refresh rate layar:
  ```javascript
  // Usulan AI: Mengganti setInterval dengan requestAnimationFrame loop
  function pasangTeksBerjalan() {
    const teks = $('#berjalan-teks');
    let x = teks.parentElement.offsetWidth;
    function langkah() {
      x -= 1;
      if (x < -teks.offsetWidth) x = teks.parentElement.offsetWidth;
      teks.style.left = x + 'px';
      requestAnimationFrame(langkah);
    }
    requestAnimationFrame(langkah);
  }
  ```
- **Jenis masalah pada usulan:**
  - [x] Salah diagnosis (memperbaiki hal yang bukan penyebab)
  - [x] Tidak lengkap (gejala berkurang tetapi akar masalah masih ada)
  - [ ] Menimbulkan regresi (metrik lain, fitur, aksesibilitas, atau memori memburuk)
  - [ ] Melanggar aturan main (menghapus fitur, mengubah berkas terlarang, dan sebagainya)
  - [ ] Memperbaiki sesuatu yang tidak berpengaruh terukur
- **Bukti:** [ISI DENGAN TRACE SETELAH MENERAPKAN USULAN AI DAN MENGUKUR ULANG]
  - Masalah 1 (*Main Thread Tetap Tidak Bisa Idle*): Target skenario S6 adalah aktivitas Main Thread mendekati **nol** saat pengguna diam. Menggunakan `requestAnimationFrame` tetap menjalankan fungsi JavaScript pada Main Thread di setiap frame (60 kali per detik). Akibatnya, CPU tidak pernah bisa masuk ke low-power sleep mode (*C-state*), dan baterai perangkat tetap terkuras.
  - Masalah 2 (*Tahap Pipeline Berat Tetap Terpicu*): Usulan AI masih memanipulasi properti tata letak `teks.style.left`. Properti `left` memaksa browser menjalankan tahapan **Layout -> Paint -> Composite** pada Main Thread secara terus-menerus di setiap frame 16,6 ms.
- **Mengapa AI bisa keliru di sini:** AI mengira masalah pemborosan daya murni karena timer 10 ms berjalan lebih cepat dari 60 FPS (16,6 ms), sehingga menyarankan `requestAnimationFrame` sebagai solusi rendering standar. AI tidak memahami bahwa untuk animasi kontinu sederhana, solusi terbaik platform web modern adalah mendelegasikannya ke thread terpisah di GPU (Compositor Thread) dan membebaskan Main Thread secara total.
- **Perbaikan yang benar menurut tim:** Mengubah teks berjalan menjadi animasi murni **CSS `@keyframes`** dengan properti **`transform: translateX(...)`** dan `will-change: transform`. Animasi `transform` diproses 100% oleh Compositor Thread tanpa memicu layout, paint, atau JavaScript execution pada Main Thread saat halaman menganggur.

---

## Refleksi (maks. 200 kata)

Penggunaan AI dalam perbaikan performa browser runtime menunjukkan bahwa AI cenderung memberikan saran perbaikan tingkat sintaksis umum (seperti throttle atau rAF) daripada solusi berbasis arsitektur browser. AI sering kali tidak mempertimbangkan perbedaan mendasar antara operasi yang berjalan di Main Thread versus thread lain (seperti engine IntersectionObserver atau Compositor Thread pada GPU).

Diagnosis performa web memerlukan pemahaman mendalam terhadap pipeline rendering browser (Parse HTML -> Recalculate Styles -> Layout -> Paint -> Composite) serta perilaku Event Loop (Task Queue, Microtask Queue, Rendering Opportunity). Kunci utama perbaikan skenario S5 dan S6 bukanlah mempercepat kode JavaScript yang memblokir, melainkan memindahkan beban kerja keluar dari Main Thread: menyerahkan deteksi elemen ke `IntersectionObserver` dan menyerahkan animasi ke CSS Compositor.
