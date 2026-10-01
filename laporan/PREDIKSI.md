# Log prediksi

Aturan: satu entri per masalah. Bagian **Sebelum perbaikan** harus di-commit *sebelum* commit
perbaikannya. Bagian **Sesudah perbaikan** diisi setelah pengukuran ulang. Jangan menyunting
bagian "sebelum" setelah hasilnya diketahui; bila prediksi meleset, jelaskan di bagian "sesudah".

---

## P-03: Klik Ganda pada Tombol "Beli Sekarang" Menghasilkan Pesanan Berulang (S3)

**Tiket terkait:** TK-1052  
**Tanggal dan hash commit entri ini:** 1 Oktober 2026, commit `57a4aeb`

### Sebelum perbaikan

- **Yang teramati di trace (baseline):** Ketika tombol "Beli sekarang" ditekan 3 kali secepat mungkin (skenario S3), dipicu 3 kali pemanggilan fungsi `beliSekarang()` di `public/js/keranjang.js`. Log terminal server mencatat 3 permintaan `POST /api/pesanan` terpisah, dan lencana pesanan bertambah 3 item untuk 1 kali niat beli.
- **Dugaan mekanisme:** `beliSekarang()` adalah fungsi *asynchronous* yang melakukan `await fetch('/api/pesanan')`. Saat `fetch` menggantung menunggu respons network dari server, Main Thread bebas mengambil dan mengeksekusi event `click` berikutnya dari antrean task karena tombol tidak di-disable (`tombol.disabled = true` tidak ada). Tidak ada proteksi *debouncing* atau *locking* pada tombol. Dari perspektif ISO/IEC 25010 (*User error protection* & *Operability*), aplikasi gagal mencegah kesalahan pengguna dan tidak memberikan umpan balik visual bahwa proses pembuatan pesanan sedang berlangsung.
- **Rencana perubahan:** Menambahkan status *disabled* (`tombol.disabled = true`) dan mengubah teks tombol menjadi indikator loading ("Memproses…") secara *synchronous* segera setelah klik pertama diterima (sebelum `fetch` dipanggil). Tombol baru diperbarui statusnya ("Dipesan ✓") setelah permintaan `fetch` selesai.
- **Prediksi terukur:** Setelah perubahan, 3 klik cepat pada tombol hanya akan menghasilkan **tepat 1 pesanan** di server dan lencana pesanan, serta metrik INP pada S3 tetap <= 200 ms. Efek samping: Pengguna tidak bisa mengeklik kembali tombol tersebut hingga proses *checkout* selesai.
- **Alternatif yang dipertimbangkan dan alasan tidak dipilih:** Menggunakan *debounce* pada event handler. Alasan tidak dipilih: Debounce menunda pengiriman klik awal. Untuk fitur penting seperti flash sale, *instant click locking* (disabled state) langsung memberikan umpan balik visual yang responsif sekaligus mencegah pesanan ganda secara deterministik.

### Sesudah perbaikan

- **Hash commit perbaikan:** ....
- **Hasil ukur (median 3 kali):** ....
- **Prediksi vs kenyataan:** ....
- **Efek samping yang muncul:** ....

---

## P-04: Blocking Main Thread dan UI Freeze pada Kalkulasi Voucher KILAT1212 (S4)

**Tiket terkait:** TK-1057  
**Tanggal dan hash commit entri ini:** 1 Oktober 2026, commit `57a4aeb`

### Sebelum perbaikan

- **Yang teramati di trace (baseline):** Terjadi Long Task raksasa berdurasi > 2000 ms pada Main Thread saat tombol "Pakai voucher" ditekan dengan kode `KILAT1212`. Fungsi `terapkanVoucher()` dan `hitungHargaPromo()` di `public/js/harga-promo.js` mendominasi 95% CPU time di tab Bottom-Up. Teks progress bar melompat langsung dari 0% ke 100% tanpa visualisasi bertahap. Kolom cari terblokir total dan tidak responsif selama kalkulasi.
- **Dugaan mekanisme:** Fungsi `hitungHargaPromo` dideklarasikan `async`, tetapi di dalamnya hanya berisi instruksi JS *synchronous* (termasuk perulangan `simulasiCicilan` 40 kali per produk x 10.000 produk). Melakukan `await` pada Promise yang langsung *resolve* di dalam loop `for` hanya menambahkan item ke Microtask Queue tanpa pernah memberikan *yield* ke Macrotask Queue. Akibatnya, Microtask Queue menguras CPU untuk 10.000+ iterasi tanpa memberi *Rendering Opportunity* bagi browser untuk memutar frame rendering (meng-update UI progress bar `progres-isi.style.width`), serta mengabaikan event input keyboard/scroll pengguna.
- **Rencana perubahan:** Menghapus perulangan `simulasiCicilan` 40x yang redundan di `hitungHargaPromo()`, serta menambahkan mekanisme *yielding* berkala ke Macrotask queue (misalnya dengan `await new Promise(r => setTimeout(r, 0))` atau `requestAnimationFrame` setiap batch N produk) agar Main Thread dapat menggambar UI progress bar secara bertahap dan tetap merespons event pengetikan di kolom cari.
- **Prediksi terukur:** Setelah perubahan, INP pada S4 turun dari > 1000 ms menjadi <= 200 ms, Long Task terpecah menjadi task-task kecil <= 100 ms, progress bar bertambah mulus dari 0% hingga 100%, dan kolom pencarian tetap responsif saat voucher dihitung. Efek samping: Total durasi kalkulasi voucher mungkin sedikit bertambah beberapa milidetik karena overhead jeda timer, namun responsivitas UI terjaga.
- **Alternatif yang dipertimbangkan dan alasan tidak dipilih:** Memindahkan seluruh kalkulasi harga promo ke Web Worker. Alasan tidak dipilih: *Yielding* berkala ke Event Loop sudah cukup untuk memecah Long Task dan memenuhi target INP tanpa menambah kompleksitas arsitektur komunikasi (serialization overhead) antarthread Web Worker.

### Sesudah perbaikan

- **Hash commit perbaikan:** ....
- **Hasil ukur (median 3 kali):** ....
- **Prediksi vs kenyataan:** ....
- **Efek samping yang muncul:** ....

