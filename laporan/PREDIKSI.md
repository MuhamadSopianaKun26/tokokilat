# Log prediksi

Aturan: satu entri per masalah. Bagian **Sebelum perbaikan** harus di-commit *sebelum* commit
perbaikannya. Bagian **Sesudah perbaikan** diisi setelah pengukuran ulang. Jangan menyunting
bagian "sebelum" setelah hasilnya diketahui; bila prediksi meleset, jelaskan di bagian "sesudah".

---

## P-01: [judul singkat masalah]

**Tiket terkait:** TK-....
**Tanggal dan hash commit entri ini:** ....

### Sebelum perbaikan

- **Yang teramati di trace (baseline):** durasi, di track apa, fungsi apa yang dominan di bottom-up.
- **Dugaan mekanisme:** jelaskan memakai istilah event loop (task, microtask, rendering opportunity)
  atau tahap pipeline (JS, Style, Layout, Paint, Composite).
- **Rencana perubahan:** ....
- **Prediksi terukur:** "Setelah perubahan, [metrik] turun dari ... menjadi sekitar ..., karena ...".
  Sertakan juga prediksi efek samping: apa yang mungkin menjadi *lebih buruk*?
- **Alternatif yang dipertimbangkan dan alasan tidak dipilih:** ....

### Sesudah perbaikan

- **Hash commit perbaikan:** ....
- **Hasil ukur (median 3 kali):** ....
- **Prediksi vs kenyataan:** tepat, meleset, atau sebagian? Bila meleset, apa yang salah dari model mental Anda?
- **Efek samping yang muncul:** ....

---

## P-1052: Pesanan ganda saat "Beli sekarang" diklik berulang + UI tidak menandai sedang diproses (S3)

**Tiket terkait:** TK-1052 (berbagi pola akar masalah yang sama dengan TK-1044 pada `beliSekarang`/`tambahKeKeranjang`)
**Tanggal dan hash commit entri ini:** 2026-10-01, (hash diisi saat entri ini di-commit)

### Sebelum perbaikan

- **Yang teramati di trace (baseline):**
  - Pada terminal, output dari hasil melakukan klik 'beliSekarang' secara cepat sebanyak 3 kali adalah 3 pesanan![alt text](../laporan/trace/Sebelum/S3/image.png)
- **Dugaan mekanisme:**
  - Akar masalah pesanan ganda **bukan** API (membantah dugaan Rudi #2), melainkan tidak adanya *guard* selama `await`. `beliSekarang` bersifat `async`, tetapi status "sedang diproses" tidak diumumkan ke UI maupun dipakai menolak klik berikutnya. `await` hanya menjadwalkan sisa fungsi sebagai task/microtask; ia tidak mengunci penangan event klik.
  - `async`/`await` tidak mengeluarkan kerja CPU dari main thread (membantah dugaan Rudi #4). `await` hanya menyerahkan kontrol di titik penyerahan; kerja sinkron sebelumnya (`Lacak.kirim` atas payload 9000 item) tetap memblokir.
  - Hubungan event loop: klik → task (handler) → long task sinkron Lacak → *rendering opportunity* tertunda → pengguna tidak melihat umpan balik → klik lagi → task baru → `fetch` baru → pesanan baru.
- **Rencana perubahan:**
  1. Tambah *guard* `sedangMemproses`; disable tombol "Beli sekarang" (dan "+ Keranjang") segera saat klik, pulihkan setelah `fetch` selesai/gagal. Tampilkan status "Memproses pesanan…". → mencegah pesanan ganda dan memberi *user error protection* + *self-descriptiveness*.
  2. Pangkas payload `Lacak.kirim('begin_checkout', …)`: kirim ringkasan (id produk, jumlah, total, sumber) alih-alih `riwayat` 9000 item utuh. Aturan §5.1 mengizinkan mengubah *isi data* selama setiap event tetap terkirim dengan informasi yang masuk akal. → `JSON.stringify` & hash jauh lebih ringan, long task hilang.
  3. Terapkan pola yang sama pada `tambahKeKeranjang` yang juga mengirim `riwayat` utuh (TK-1044).
- **Prediksi terukur:**
  - Jumlah pesanan dari 3 klik: dari 3 → **1** (guard menolak klik ke-2/3 selama `await`).
  - INP klik "Beli sekarang": dari … ms → **< 200 ms** (payload Lacak jauh lebih kecil).
  - Long task selama interaksi: dari … ms → **tidak ada yang > 100 ms**.
  - Efek samping yang mungkin memburuk: bila guard hanya *disable* tanpa feedback visual, pengguna mengira tombol rusak (gejala persis TK-1044) → wajib disertai label/status. Trade-off: sedikit DOM tambahan; aman jika hanya teks/`opacity` (di compositor).
- **Alternatif yang dipertimbangkan dan alasan tidak dipilih:**
  - *Debounce global klik* (tolak klik berdekatan ≤ N ms): rapuh, bisa menolak klik sah pada produk berbeda; tidak menjelaskan status.
  - *Idempotency key di server*: di luar yurisdiksi (`server.js` tak boleh diubah, §5.1) dan tidak atasi UX "tombol mati".
  - *Pindahkan Lacak ke Web Worker*: ideal tapi §5.2 melarang library/bundler dan vendor tak boleh disentuh; kompleksitas pesan tidak sepadan. Memangkas payload lebih sederhana dan langsung mengenai akar masalah.

### Sesudah perbaikan

- **Hash commit perbaikan:** 19127305b1d79719858d54224b853b73b9024fb4
- **Hasil ukur (median 3 kali):** 1 kali yang dapat dilihat pada [alt text](../laporan/trace/Sesudah/S3/image.png)
- **Prediksi vs kenyataan:** **Sebagian — inti prediksi tepat, dua prediksi lain tidak dapat diverifikasi.**
  - **Tepat:** jumlah pesanan dari 3 klik cepat turun dari **3 → 1**, sesuai target. Bukti: terminal sesudah perbaikan hanya mencatat satu pesanan (`[pesanan] TK-00001 produk #2 (1 total)`). Mekanismenya persis seperti diduga: `beliSekarang` mengunci tombol pada baris pertama, sehingga klik ke-2 dan ke-3 tidak pernah masuk. Memang **bukan** API yang berubah (membantah dugaan Rudi #2), melainkan penangan klik yang tidak lagi dijalankan dua kali.
  - **Tidak terverifikasi:** prediksi "INP klik 'Beli sekarang' < 200 ms" dan "tidak ada long task > 100 ms" **tidak punya angka pembanding**. Rekaman S3 sebelum perbaikan hanya berupa tangkapan layar terminal berisi daftar pesanan, tanpa rekaman panel Performance. Tanpa baseline, kedua metrik itu tidak dapat dinilai. Ini kekurangan pada rancangan pengukuran: S3 direkam semata sebagai bukti cacah pesanan, padahal justru di skenario itulah rantai "long task → tidak ada umpan balik → klik lagi" paling perlu dibuktikan. Untuk menutupnya, rekaman Performance S3 baseline perlu diambil ulang dari commit `d35f90c`.
  - **Meleset (kualitatif):** rencana perbaikan §1 menyebut tombol "+ Keranjang" ikut di-*disable*. Tidak diimplementasikan — alasannya pada poin 2 di bawah.
- **Efek samping yang muncul:**
  1. **Tombol pulih 1500 ms setelah respons selesai**, bukan seketika saat `fetch` tuntas seperti tersirat di rencana §1. Akibatnya produk yang sama tidak dapat dipesan lagi selama ±1,5 dtk. Sudah diuji: satu klik sah setelah jeda itu tetap menghasilkan pesanan berikutnya (1 → 2), jadi tombol tidak terkunci permanen.
  2. **"+ Keranjang" sengaja dibiarkan tidak terkunci** — menyimpang dari rencana §1. Menekan tombol itu berulang adalah cara sah menambah jumlah unit, dan menonaktifkannya akan menghapus perilaku yang dilindungi §5.4. Karena itu yang diperbaiki pada `tambahKeKeranjang` hanya **urutan** (umpan balik tampilan dijalankan sebelum SDK), bukan penolakan klik. Konsekuensinya klik beruntun pada "+ Keranjang" tetap menambah beberapa unit — perilaku lama, memang disengaja.
  3. **Biaya pada kelengkapan data (trade-off yang disadari).** Event `add_to_cart` dan `begin_checkout` tidak lagi memuat larik riwayat 9000+ entri; tim data kini menerima `{ jumlah, terakhir: 5 entri }`. Payload turun dari ~1,4 juta byte menjadi 566 byte dan long task dari `Lacak.kirim` hilang, tetapi konteks historis penuh tidak lagi ikut terkirim. Arsip lengkapnya tetap utuh di `localStorage`, hanya tidak lagi disalin ke telemetri. Diizinkan §5.1, namun tetap merupakan pengurangan informasi bagi tim data.
  4. **Biaya yang belum hilang dan belum terukur.** `tambahKeKeranjang` dan `beliSekarang` masih membaca lalu men-`stringify` seluruh larik riwayat 9000+ entri ke `localStorage` pada setiap klik. Payload ke SDK sudah dipangkas, tetapi biaya serah-terima `localStorage` itu tetap ada dan **tidak terukur** di sini, karena rekaman S3 sesudah pun hanya tangkapan layar terminal. Kandidat perbaikan berikutnya.
  5. **Catatan kerapuhan (belum terbukti, bukan klaim):** penjaga terikat pada elemen tombol, bukan pada produk. `renderProduk()` membangun ulang seluruh kartu sehingga tombol baru selalu dalam keadaan terbuka. Pada alur sekarang ini tidak menimbulkan masalah — kunci 1500 ms memang sudah habis sebelum re-render (~2,3 dtk) selesai — tetapi bila kelak kunci diperpanjang tanpa memindahkan status "sedang memproses" ke tingkat data, celah pesanan ganda akan terbuka kembali.

---

## P-1057: Voucher membekukan halaman; progres tidak bertahap; kolom cari mati selama perhitungan (S4)

**Tiket terkait:** TK-1057
**Tanggal dan hash commit entri ini:** 2026-10-01, (hash diisi saat entri ini di-commit)

### Sebelum perbaikan

- **Yang teramati di trace (baseline):**
  - Skenario S4: klik "Pakai voucher" `KILAT1212`, lalu ketik di kolom cari selama perhitungan berjalan.
  - Flame chart main thread penuh oleh `terapkanVoucher` → loop semua produk → `hitungHargaPromo` (memanggil `simulasiCicilan` **41×** per produk; `simulasiCicilan(harga)` loop tenor 1–24 dengan loop dalam 1–tenor ≈ O(300) per panggilan). Fungsi dominan di bottom-up: `simulasiCicilan` dan `hitungHargaPromo` di `public/js/harga-promo.js`.
  - Meskipun `terapkanVoucher` memakai `await hitungHargaPromo` per produk, **kerja sinkron `simulasiCicilan` tetap di main thread** → deretan long task. Titik `await` hanya memberi batas *microtask* antar produk; bila satu produk terlalu berat, tidak ada *rendering opportunity* → **progress bar tertahan di 0% lalu melompat selesai** (gejala "menghitung 0% terus lalu tiba-tiba selesai").
  - Karena main thread sibuk, event `input` dari kolom cari (`pencarian.js` → `terapkanSaringan`) **tertahan di antrean task** → ketikan tidak tampil → INP pencarian selama S4 sangat tinggi.
  - Angka konkret (isi dari tangkapan layar/alat ukur Anda): INP klik voucher ≈ … ms (diperkirakan > 1000 ms); progres: **tidak bertahap** (0% → selesai); kolom cari: **tidak responsif**.
- **Dugaan mekanisme:**
  - Membantah dugaan Rudi #4 ("voucher sudah `async`, harusnya aman"): `async`/`await` tidak mengeluarkan komputasi sinkron dari main thread. `await` hanya menjadwalkan sisa sebagai *microtask*; `simulasiCicilan` tetap memblokir. Bukti: long task di flame chart berimpit dengan `simulasiCicilan`, bukan hilang.
  - Mekanisme pipeline: tulisan *progress* diubah via DOM, tetapi Style/Layout/Paint tidak sempat berjalan karena main thread tidak pernah idle cukup lama untuk *rendering opportunity* → progres tidak tergambar bertahap.
  - Mekanisme event loop: ketukan keyboard masuk sebagai task `input`; antrean task tidak diproses selama komputasi voucher → ketikan menumpuk → INP meledak.
- **Rencana perubahan:**
  1. **Hitung sekali, pakai banyak:** `simulasiCicilan` per produk hanya bergantung pada `harga`. Precompute tabel cicilan untuk rentang harga diskrit (atau hitung `hitungHargaPromo` per produk tanpa memanggil `simulasiCicilan` 41×). Menghapus redundansi 41× panggilan memangkas komputasi berkali-kali.
  2. **Potong beban per *tick*:** bila tetap perlu loop semua produk, pecah menjadi batch kecil dengan `await` di tiap batch (atau `requestIdleCallback`/`setTimeout(0)`) agar ada *rendering opportunity* → progress benar-benar bertahap dan kolom cari tetap responsif.
  3. Pertahankan aturan bisnis voucher termasuk simulasi cicilan (§5.4) — hanya *cara menghitung & menjadwalkan* yang diubah, bukan rumus.
- **Prediksi terukur:**
  - INP klik voucher: dari … ms → **< 200 ms** (komputasi berkurang + tidak satu long task raksasa).
  - Progres: dari "0% lalu lompat selesai" → **tergambar bertahap** (rendering opportunity antar batch).
  - Kolom cari selama perhitungan: dari "mati" → **responsif** (INP ketik < 200 ms).
  - Long task selama interaksi: dari … ms → **tidak ada yang > 100 ms**.
  - Efek samping yang mungkin memburuk: memecah ke batch memperpanjang *wall-clock* total sedikit (trade-off latensi-vs-responsivitas); precompute tabel memakan sedikit memori tetap (trade-off *resource utilization*).
- **Alternatif yang dipertimbangkan dan alasan tidak dipilih:**
  - *Memindahkan `simulasiCicilan` ke Web Worker*: teknis bersih, tetapi §5.2 melarang library/bundler dan menambah kompleksitas pesan; precompute in-thread lebih sederhana dan cukup.
  - *Caching hasil voucher per harga*: sebagian tercakup oleh precompute tabel; cache murni tanpa mengurangi 41× panggilan tidak mengatasi long task pada harga baru.
  - *Menurunkan ketelitian simulasi (kurangi tenor)*: melanggar §5.4 (aturan bisnis cicilan harus tetap benar). Ditolak.

### Sesudah perbaikan

- **Hash commit perbaikan:** 0e031b5ad626930f68d79bea1001451274694521
- **Hasil ukur (median 3 kali):** 144 ms, yang merupakan hasil rata-rata dari 2 kali percobaan, yang dapat dilihat pada [alt text](../laporan/trace/sesudah/S4/1-sesudah.png) dan [alt text](../laporan/trace/sesudah/S4/2-sesudah.png)
- **Prediksi vs kenyataan:** **Sebagian — prediksi utama tepat, tetapi prediksi "tidak ada long task > 100 ms" meleset, dan yang keliru adalah analisis saya, bukan pengukurannya.**
  - **Tepat (hasil utama):** INP klik "Pakai voucher" turun dari **2880 ms** (median baseline) menjadi **144 ms** — target ≤ 200 ms tercapai, sekitar **20× lebih cepat**.
  - **Tepat, dan sekaligus bukti "progres tergambar bertahap":** INP adalah *input-to-next-paint*, yaitu jarak dari interaksi sampai **paint berikutnya**. Nilai baseline 2880 ms berarti paint pertama baru terjadi 2880 ms setelah klik — memang tidak ada *rendering opportunity* selama fase hitung (membenarkan dugaan bahwa `await` atas fungsi sinkron hanya menghasilkan batas *microtask*). Setelah perbaikan, paint pertama terjadi ≤ 168 ms setelah klik. Jadi progres tidak lagi "0% membeku lalu melompat selesai": pembaruan visual pertama kini mendarat dalam ratusan milidetik. Ini bukti langsung dari metrik, bukan kesan visual.
  - **Tepat:** kolom cari tidak lagi mati. INP gabungan dua interaksi (klik voucher + ketik) tercatat 120 ms dan 168 ms, keduanya di bawah target 200 ms; sebelumnya ketikan tertahan di antrean task selama komputasi berjalan.
  - **MELESET:** prediksi "long task: tidak ada yang > 100 ms" **salah**. Setelah perbaikan masih tersisa **4 long task** dan yang terlama **2356 ms** (baseline median 2813 ms — hanya turun sekitar 16%). Isi long task itu sudah berbeda: di dalamnya terdapat `Layout` 621,6 ms dan `UpdateLayoutTree` 242,6 ms, dan menurut flame chart yang dilampirkan blok tersebut adalah `perbaruiHargaVoucherDiKartu → renderProduk → samakanTinggiJudul → get offsetHeight → Layout` — **membangun ulang 3000 kartu dengan layout sinkron paksa**, bukan lagi komputasi cicilan.
  - **Di mana model mental saya salah:** saya menganggap jalur `terapkanVoucher` hanya punya **satu** sumber beban, yaitu komputasi `simulasiCicilan`. Ternyata ada **dua**, dan rencana perbaikan hanya menargetkan yang pertama. Membuang 41× panggilan per produk dan memecah loop menjadi batch 200 memang berhasil menghapus long task dari **fase hitung** — seluruh batch kini selesai di bawah 50 ms — tetapi `perbaruiHargaVoucherDiKartu()` yang dipanggil di akhir fungsi tetap sinkron dan menyentuh 3000 kartu sekaligus. Saya sempat mencatat kemungkinan ini sebagai "di luar cakupan P-1057", namun **tidak memasukkannya ke dalam prediksi**, sehingga prediksi itu ditulis seolah kedua sumber beban akan hilang bersamaan. Kesalahannya pada perumusan prediksi.
  - **Meleset (bentuk solusi):** prediksi efek samping menyebut "precompute tabel cicilan memakan memori tetap". Yang benar-benar diimplementasikan bukan tabel precompute, melainkan **cache `Map` yang tumbuh malas** — lihat poin 2 di bawah.
- **Efek samping yang muncul:**
  1. **Beku berpindah, bukan hilang.** Karena `perbaruiHargaVoucherDiKartu()` dipanggil **sebelum** `progres.hidden = true`, batang progres berhenti di **100%** selama ±2,3–2,9 dtk sementara 3000 kartu dibangun ulang. Gejala lama "0% membeku" berganti menjadi "100% membeku". Ini tampak di trace sebagai RunTask 2356 ms dengan `Layout` 621,6 ms di dalamnya. Perbaikan lanjutan yang jelas: sembunyikan progres **sebelum** re-render, atau pecah `renderProduk` per batch seperti loop hitung.
  2. **Memori:** `cacheCicilan` adalah `Map` tingkat modul yang **tidak pernah dibersihkan** dan bertahan lintas penerapan voucher. Pertumbuhannya terbatas pada jumlah harga unik (≤ 3000), sehingga aman di sini, tetapi tidak ada batas eksplisit maupun kebijakan pengusiran.
  3. **Wall-clock tidak terbukti memburuk** — trade-off "batch memperpanjang total" yang dikhawatirkan ternyata tidak material. Rentang rekaman sesudah 6,11 dtk vs baseline 6,34–8,12 dtk, tetapi angka ini lemah karena rentang ditentukan kapan perekaman dimulai dan dihentikan, bukan oleh lamanya kerja. Bukti yang lebih kuat: benchmark node menunjukkan 940 ms → 30 ms dingin, sehingga penghematan dari cache jauh melampaui biaya ~15 kali `setTimeout(0)`.
  4. **Penerapan voucher kedua tidak setara bebannya dengan yang pertama.** `keadaan.hargaVoucher.clear()` tetap dijalankan tiap kali, tetapi karena `cacheCicilan` masih hangat, penerapan berikutnya jauh lebih cepat. Menguntungkan pengguna, namun berarti pengukuran ulang harus menyebutkan penerapan ke berapa yang diukur.
  5. **Metodologi pengukuran "sesudah" belum setara baseline.** Pengukuran sesudah baru **2 kali**, bukan median 3 kali seperti diminta template; angka 144 ms adalah rata-rata keduanya. Lebih penting: rekaman `1-sesudah.json` mencakup rentang **2,2 menit** (128 MB) sedangkan baseline 6,3–8,1 dtk, sehingga penghitung di dalamnya (68 long task, 773 frame > 50 ms) **tidak sebanding** dan tidak boleh dipakai. Angka INP 120/168 ms tetap sahih karena INP bersifat per-interaksi, bukan per-rentang rekaman. Untuk laporan akhir, pengukuran sesudah sebaiknya diulang tiga kali dengan rentang rekaman yang disamakan.
