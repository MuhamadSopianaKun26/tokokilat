# Laporan audit performa dan interaksi TokoKilat

Tim: ....  Anggota: Nauval, Ivan Setiawan, Sopian, Andy (tercatat "Thoriq" di laporan sumber)  Tanggal: 16 Oktober 2026
Panjang maksimal setara 6 halaman (tidak termasuk lampiran gambar).

> **Catatan penyusun (hapus sebelum dikumpulkan).**
> **Peta sumber:** NAUVAL = `LAPORAN-NAUVAL.md` (S1, S2) · IVAN = `LAPORAN-IVAN.md` (S3, S4) · SOPIAN = `LAPORAN-SOPIAN.md` (S5, S6) · ANDY = `LAPORAN-ANDY.md` (S0, Audit AI). Setiap bagian di bawah memuat penanda sumbernya. Bagian `LAPORAN-SOPIAN.md` di luar S5 dan S6 sengaja tidak dipakai.
> **Butir [PERIKSA] yang perlu diputuskan tim:**
> 1. Tombol "+ Keranjang": NAUVAL menulis dikunci 1,5 dtk, IVAN menulis sengaja tidak dikunci (T-08).
> 2. Waktu respons `/api/produk`: NAUVAL ±15 ms, ANDY ±180 ms (bagian 5).
> 3. Ukuran payload analitik: NAUVAL >600 KB → <2 KB, IVAN ±1,4 MB → 566 byte (T-08, bagian 5).
> 4. Median INP baseline S4: 2880 ms (tabel tim) vs 2816 ms (hitungan ulang IVAN dari tangkapan layar).
> 5. Jumlah produk: S0 memakai 1500 (`npm run start:ringan`), S3–S6 memakai 3000; S1–S2 tidak dinyatakan.
> 6. Nilai akhir interval hitung mundur S6: 1000 ms atau 100 ms (T-07).
> 7. Masih kosong: nama tim, spesifikasi laptop, versi Chrome, kontribusi SOPIAN, ringkasan hasil Audit AI, anotasi flame chart S5 dan S6, serta pengukuran sesudah S5 dan S6.

## 1. Ringkasan eksekutif (maks. 150 kata)
*Sumber: gabungan NAUVAL (S1, S2), IVAN (S3, S4), SOPIAN (S5, S6), ANDY (S0).*

Masalah terbesar: di HP Android kelas bawah, halaman TokoKilat sering membeku karena pekerjaan berat berjalan di peramban pengguna, bukan karena server lambat. Mengetik di kolom cari membekukan layar ±3,3 detik, menerapkan voucher ±2,9 detik, dan menggulir katalog sampai ±5,3 detik. Tombol tanpa umpan balik membuat pengguna menekan berulang: tiga klik "Beli sekarang" menghasilkan tiga pesanan. Hasil perbaikan: pencarian kini 0,06 detik, voucher 0,14 detik, tambah keranjang 0,05 detik, dan tiga klik menghasilkan satu pesanan. Halaman yang "meloncat" akibat banner promo turun dari skor 0,474 ke 0,292 (target 0,1, belum tercapai); permintaan gambar turun dari 1.500 ke 811 (belum sebanding dengan yang terlihat). Perbaikan scroll dan baterai sudah diterapkan tetapi belum diukur. Data analitik kini diringkas dan perlu persetujuan tim data.

## 2. Lingkungan pengukuran

Setiap kolom bersumber dari laporan anggota yang memegang skenario tersebut. Sel bertanda "tidak dicantumkan" berarti laporan sumber tidak memuatnya.

| Aspek | S0 (ANDY) | S1–S2 (NAUVAL) | S3–S4 (IVAN) | S5–S6 (SOPIAN) |
|---|---|---|---|---|
| Laptop / OS | macOS | tidak dicantumkan | `....` (belum diisi) | **[ISI]** |
| Chrome | Google Chrome, versi tidak dicantumkan | tidak dicantumkan | `....` (belum diisi), Incognito, tanpa ekstensi, tersambung listrik | **[ISI]** |
| Jumlah produk | 1500 (`npm run start:ringan`) | tidak dicantumkan | 3000 (`npm start`) | 3000 (`npm start`) |
| Perangkat emulasi | 412 × 915, touch, DPR 2,625 | tidak dicantumkan | 412 × 915 | 412 × 915 |
| Throttling CPU | 4× | tidak dicantumkan | 4× | 4× |
| Throttling jaringan | tidak ada | tidak dicantumkan | tidak ada | **[ISI]** |
| Repetisi | 3, dilaporkan median | 3 repetisi untuk pengukuran sesudah | 3 untuk baseline S4; 2 untuk sesudah S4 | 3 per skenario, median |
| Berkas trace | `laporan/trace/S0/sebelum/` dan `.../setelah/` | `laporan/trace-nauval/S1-before/`, `S1-after/`, `S2-before/`, `S2-after/` | `trace/Sebelum/S3`, `trace/Sesudah/S3`, `trace/Sebelum/S4`, `trace/Sesudah/S4` | `laporan/trace/S5/`, `laporan/trace/S6/` |

Protokol sesi (ANDY dan IVAN): buka `http://localhost:3000/?ukur=1`, tunggu tenang, muat ulang sekali, reset alat ukur, baru merekam. Pada S0, rekaman dibiarkan 10 detik tanpa interaksi.

**Penyimpangan dari protokol TUGAS.md bagian 7:**

1. **S0 (ANDY):** memakai varian 1500 produk, sedangkan S3–S6 memakai 3000. Angka S0 tidak langsung sebanding dengan skenario lain.
2. **S1–S2 (NAUVAL):** laporan tidak mencantumkan lingkungan pengukuran maupun penyimpangan.
3. **S3 (IVAN):** rekaman sebelum dan sesudah hanya berupa tangkapan layar terminal (jumlah pesanan), tanpa panel Performance. INP dan long task S3 tidak punya baseline.
4. **S4 (IVAN):** pengukuran sesudah baru 2 kali, bukan median 3 kali, sehingga 144 ms adalah rerata. Rekaman `1-sesudah.json` berdurasi 2,2 menit sedangkan baseline 6,3–8,1 detik, jadi hitungan long task dan frame di dalamnya (68 long task, 773 frame > 50 ms) tidak sebanding dan tidak dipakai. Angka INP tetap sahih karena dihitung per interaksi.
5. **S5–S6 (SOPIAN):** angka sesudah perbaikan belum diambil.

## 3. Hasil sebelum dan sesudah

| Skenario | Metrik | Sebelum (median) | Sesudah (median) | Target | Tercapai? | Sumber |
|---|---|---|---|---|---|---|
| S0 | CLS | 0,474 | 0,292 | <= 0,1 | **Belum** | ANDY |
| S0 | Jumlah permintaan gambar dalam 10 dtk pertama | 1500 diinisiasi (147 selesai) | 811 diinisiasi (284 selesai) | sebanding dengan yang terlihat | **Belum** | ANDY |
| S1 | INP | 3.312 ms | 56 ms | <= 200 ms | **Ya** | NAUVAL |
| S1 | Long task terlama | 1.776 ms | 0 ms | <= 100 ms | **Ya** | NAUVAL |
| S2 | INP | 232 ms | 48 ms | <= 200 ms | **Ya** | NAUVAL |
| S2 | Long task terlama (tambahan) | 137 ms | 0 ms | <= 100 ms | **Ya** | NAUVAL |
| S3 | Jumlah pesanan dari 3 klik | 3 | 1 | 1 | **Ya** | IVAN |
| S3 | INP dan long task klik "Beli sekarang" | tidak terukur | tidak terukur | <= 200 ms / <= 100 ms | **Tidak dapat dinilai** | IVAN |
| S4 | INP klik "Pakai voucher" / progres tergambar bertahap? | 2.880 ms ¹ / tidak, 0% membeku lalu melompat | 144 ms ² / ya, paint pertama <= 168 ms | <= 200 ms / bertahap | **Ya** | IVAN |
| S4 | INP ketik di kolom cari selama perhitungan (tambahan) | tertahan selama perhitungan | 120 ms dan 168 ms | <= 200 ms | **Ya** | IVAN |
| S4 | Long task terlama (tambahan) | 2.813 ms | 2.356 ms | <= 100 ms | **Tidak** | IVAN |
| S5 | Frame > 50 ms per 10 dtk | "lebih dari 50" (long task terlama 2.603 ms; INP 5.347 ms) | **[BELUM DIUKUR]** | <= 2 | **Belum terverifikasi** | SOPIAN |
| S6 | Frame > 50 ms per 10 dtk | "puluhan" (long task terakumulasi 1.871 ms) | **[BELUM DIUKUR]** | <= 2 | **Belum terverifikasi** | SOPIAN |

¹ Angka dari tabel hasil tim. Hitungan ulang IVAN dari tiga tangkapan layar baseline memberi 2.816 / 3.072 / 2.800 ms (median 2.816 ms). Pilih satu angka dan pakai konsisten. ² Rerata dua percobaan (120 dan 168 ms), bukan median tiga kali.

Catatan ANDY untuk S0: CLS 0,474 pada ketiga percobaan baseline dan 0,292 pada ketiga percobaan sesudah. Permintaan gambar baseline 1500 (selesai dalam 10 dtk: 136, 191, 147), sesudah 689 / 811 / 897 (selesai: 293, 50, 284).

## 4. Temuan

Diurutkan menurut dampak: seberapa jauh angka sebelum melampaui target dan seberapa besar kerugian bagi pengguna. ID asal (T-xx) merujuk ke laporan individu.

### T-01: Handler scroll membaca geometri ribuan kartu dan menulis style di setiap event (S5)
*Sumber: SOPIAN, T-03 (entri log P-05).*
- **Tiket terkait:** TK-1063.
- **Gejala bagi pengguna:** menggulir katalog terasa patah-patah.
- **Bukti:** `laporan/trace/S5/1-sebelum.png` menunjukkan `periksaGulir()` (`public/js/gulir.js`) mendominasi Main Thread dengan `Recalculate Style` dan `Layout` sinkron berulang. Baseline: long task terlama 2.603 ms, INP 5.347 ms, > 50 frame lebih panjang dari 50 ms. **[SISIPKAN tangkapan layar beranotasi]**
- **Akar masalah dan mekanismenya:** `periksaGulir()` terpasang pada `scroll`, `wheel`, dan `touchmove` tanpa throttling dan dengan `{ passive: false }`. Tiap event mengulang `querySelectorAll('.kartu')`, memanggil `getBoundingClientRect()`, lalu menulis `kartu.style.minHeight` dan kelas. Pola baca-tulis ini memaksa *forced synchronous layout* berulang dalam satu frame. `passive: false` juga menghalangi browser menggulir di compositor sebelum handler selesai.
- **Kualitas yang terdampak (ISO/IEC 25010):** *Time behaviour* (frame drop dan long task), *Resource utilization* (CPU main thread untuk pekerjaan yang bisa diserahkan ke browser), *Operability* (gerakan scroll tidak mengikuti jari).
- **Perbaikan:** `IntersectionObserver` untuk mendeteksi kartu yang masuk viewport, penulisan `minHeight` dihapus, listener `{ passive: true }`, pembaruan visual header lewat `requestAnimationFrame` (commit `d025dd9`).
- **Trade-off:** deteksi visibilitas menjadi asinkron sehingga kemunculan kartu (`.terlihat`) sedikit tertunda; pelacakan impresi dikirim per batch 250 ms. Throttling dengan `requestAnimationFrame` atau lodash ditolak karena loop `getBoundingClientRect()` pada 3000 kartu tetap berjalan tiap frame.
- **Hasil:** **[BELUM DIUKUR]**. Kolom sesudah di log SOPIAN masih placeholder. Klaim "prediksi terbukti akurat" di log belum punya angka, jadi target belum boleh dinyatakan tercapai.

### T-02: Pencarian real-time memicu render ulang penuh dan layout thrashing di setiap huruf (S1)
*Sumber: NAUVAL, T-01.*
- **Tiket terkait:** TK-1041 (Bu Wulan, Android entry-level).
- **Gejala bagi pengguna:** huruf yang diketik muncul tersendat, antarmuka membeku, perangkat terasa lambat hingga pengguna meninggalkan aplikasi.
- **Bukti:** `laporan/trace-nauval/S1-before/` vs `S1-after/`. Flame chart *Interactions* menunjukkan bar penekanan tombol >3.200 ms. Bottom-Up: `Layout` 47,9% self-time, `samakanTinggiJudul` di `katalog.js` 41,9%, `renderProduk` 79,3%.
- **Akar masalah dan mekanismenya:** *Event loop:* listener `input` pada `#kolom-cari` tanpa debounce, sehingga tiap huruf ("sepatu" = 6 huruf) menjadwalkan macro-task >1.700 ms. Karena *run-to-completion*, Main Thread terkunci dan tidak ada *rendering opportunity*; input delay membengkak >3 detik. *Rendering pipeline:* `renderProduk` mengosongkan DOM (`innerHTML = ''`) dan menyusun ulang ribuan elemen, lalu `samakanTinggiJudul()` mengulang tulis `style.height = 'auto'` → baca `offsetHeight` → tulis `style.height`, yaitu *Forced Synchronous Layout* (layout thrashing).
- **Kualitas yang terdampak (ISO/IEC 25010):** *Performance efficiency* (Time behaviour: INP 3.312 ms; Resource utilization: CPU terblokir 100%). *Interaction capability* (Operability: kolom teks tidak responsif; User engagement turun).
- **Perbaikan:** (1) debounce 150 ms pada listener di `pencarian.js`; (2) kalkulasi JS `samakanTinggiJudul()` dihapus, diganti CSS pada `.kartu-judul` (`-webkit-line-clamp: 2`, `height: 2.7em`); (3) *chunked rendering* di `katalog.js`: 36 produk pertama dulu, sisanya via infinite scroll; (4) `Lacak.kirim('search')` ditunda dengan `setTimeout(..., 0)`.
- **Trade-off:** hasil pencarian terlambat ±150 ms setelah ketikan terakhir, tetapi kolom input tetap responsif. NAUVAL tidak mencatat alternatif yang ditolak.
- **Hasil:** INP 3.312 → 56 ms (−98,3%); long task terlama 1.776 → 0 ms (−100%).

### T-03: Voucher membekukan halaman, progres tidak bertahap, kolom cari mati (S4)
*Sumber: IVAN, T-S4.*
- **Tiket terkait:** TK-1057 (Mas Dimas, kode `KILAT1212`).
- **Gejala bagi pengguna:** layar beku lama, progres berhenti di "menghitung 0%" lalu melompat selesai, scroll dan kolom cari tidak merespons. Pengguna menyimpulkan aplikasi crash.
- **Bukti:** `trace/Sebelum/S4/1-sebelum.png`, `2-sebelum.png`, `3-sebelum.png` (INP median 2.880 ms, long task terlama 2.813 ms). `trace/Sesudah/S4/1-sesudah.png`, `2-sesudah.png` (INP 144 ms; masih 4 long task, terpanjang 2.356 ms, berisi `Layout` 621,6 ms dan `UpdateLayoutTree` 242,6 ms).
- **Akar masalah dan mekanismenya:** `public/js/harga-promo.js`, `terapkanVoucher`, dengan dua sumber beban sinkron. (1) `hitungHargaPromo` memanggil `simulasiCicilan` 41× per produk, 40 di antaranya dibuang; satu panggilan ±O(300) operasi, dikalikan 3000 produk. (2) `perbaruiHargaVoucherDiKartu()` membangun ulang seluruh kartu dan memanggil `samakanTinggiJudul()` yang membaca `offsetHeight` di dalam loop (forced synchronous layout). `await` pada fungsi bertubuh sinkron hanya mengantrekan *microtask*, dan microtask dihabiskan sebelum browser mendapat *rendering opportunity*; itu sebabnya progres tertahan di 0%. Ketikan masuk sebagai task `input` yang menumpuk di belakang satu task raksasa.
- **Kualitas yang terdampak (ISO/IEC 25010):** *Time behaviour* (INP >14× ambang); *Resource utilization* dan *Capacity* (main thread habis total); *Operability* (halaman tidak merespons masukan apa pun); *Self-descriptiveness* (progres 0% menyesatkan); *User engagement* (pengguna mengira aplikasi crash).
- **Perbaikan:** (1) memoisasi `simulasiCicilan` lewat `Map` `cacheCicilan`; (2) membuang 40 panggilan berlebih (cicilan tetap dihitung sekali per produk); (3) `hitungHargaPromo` dijadikan sinkron, `async` dihapus; (4) loop dipecah per `UKURAN_BATCH = 200` dengan `beriNapas()` berbasis `setTimeout(0)` (macrotask), plus satu `beriNapas()` sebelum batch pertama agar 0% sempat tergambar. Rumus cicilan tidak berubah.
- **Trade-off:** Web Worker ditolak (§5.2 melarang library/bundler, kompleksitas pesan); cache tanpa membuang 41× panggilan ditolak (tidak menolong harga yang belum pernah dihitung); memangkas tenor simulasi ditolak (melanggar §5.4). Harga: ±15 kali `setTimeout(0)` menambah wall-clock (tidak material: rekaman sesudah 6,11 dtk vs baseline 6,34–8,12 dtk, bukti yang lemah; benchmark 940 → 30 ms lebih kuat); `cacheCicilan` tidak pernah dibersihkan (terbatas ≤ 3000 harga unik). `perbaruiHargaVoucherDiKartu()` sengaja dibiarkan sinkron.
- **Hasil:** INP 2.880 → 144 ms (~20×, target tercapai); paint pertama <= 168 ms (progres bertahap tercapai); INP ketik di kolom cari 120 / 168 ms. **Gagal:** long task terlama hanya 2.813 → 2.356 ms (target <= 100 ms belum tercapai). INP bersifat *input-to-next-paint*, jadi baseline 2.880 ms membuktikan tidak ada paint selama fase hitung.

### T-04: Klik berulang pada "Beli sekarang" menghasilkan pesanan ganda (S3)
*Sumber: IVAN, T-S3.*
- **Tiket terkait:** TK-1052 (Mbak Sari).
- **Gejala bagi pengguna:** tombol tampak tidak bereaksi, pengguna menekan tiga kali, lalu ditagih tiga pesanan dan harus mengajukan refund.
- **Bukti:** log terminal server `trace/Sebelum/S3/image.png` (tiga pesanan dari tiga klik) dan `trace/Sesudah/S3/image.png` (satu pesanan, baris `[pesanan] TK-00001 produk #2 (1 total)`). **Keterbatasan:** S3 hanya direkam sebagai tangkapan layar terminal, tanpa panel Performance.
- **Akar masalah dan mekanismenya:** `public/js/keranjang.js`, `beliSekarang` (`async`). Penyerahan kontrol di `await` tidak mengunci penangan event, sehingga klik ke-2 dan ke-3 masing-masing menjalankan fungsi dari awal, termasuk `fetch('/api/pesanan', { method: 'POST' })`. Cacat kedua: `Lacak.kirim('begin_checkout', …)` berjalan sinkron dengan payload riwayat 9000+ entri; `lacak.min.js` men-`JSON.stringify` lalu melakukan 12 putaran hashing. Main thread tertahan, label tombol tidak sempat berubah, pengguna tidak mendapat tanda apa pun. Akar masalahnya bukan API, melainkan tidak adanya penjaga dan tidak adanya umpan balik.
- **Kualitas yang terdampak (ISO/IEC 25010):** *Time behaviour* (klik pertama memblokir main thread); *User error protection* (tidak ada perlindungan dari klik berulang, berujung kerugian finansial); *Self-descriptiveness* (tidak ada penanda "sedang diproses"); *Operability* (satu-satunya strategi pengguna, menekan lagi, justru merusak). Keduanya harus diperbaiki bersamaan; mengunci tombol tanpa label akan memunculkan gejala "tombolnya rusak".
- **Perbaikan:** di baris pertama `beliSekarang`: `if (tombol.disabled) return;`, `tombol.disabled = true`, `aria-busy="true"`, label `'Memproses…'`. Tombol dibuka lagi di blok `finally` lewat `setTimeout(..., 1500)`. Payload `begin_checkout` dipangkas lewat `ringkasRiwayat()` menjadi `{ jumlah, terakhir: 5 entri }`. Atribut `disabled` membuat klik berikutnya ditolak browser sebelum masuk ke kode kita, dan karena kunci dipasang sebelum `await fetch`, tidak ada jendela balapan.
- **Trade-off:** debounce global klik ditolak (rapuh, bisa menolak klik sah pada produk lain); idempotency key di server ditolak (`server.js` terlarang, §5.1); Web Worker untuk `Lacak` ditolak (§5.2). Harga: tombol pulih 1500 ms setelah respons; payload event turun dari ±1,4 juta byte ke 566 byte (pengurangan informasi bagi tim data, diizinkan §5.1; arsip penuh tetap di `localStorage`). Tombol "+ Keranjang" sengaja tidak dikunci menurut IVAN, karena menekannya berulang adalah cara sah menambah unit (§5.4).
- **Hasil:** pesanan dari tiga klik cepat 3 → 1 (target tercapai). INP dan long task S3 tidak dapat dinilai karena baseline tidak direkam dengan panel Performance.

### T-05: Banner promo yang datang terlambat menggeser tata letak (CLS) (S0)
*Sumber: ANDY, T-01.*
- **Tiket terkait:** TK-1078 (Kak Rara: halaman loncat turun, yang terpencet malah iklan promo).
- **Gejala bagi pengguna:** katalog sudah tampak siap, lalu seluruh antarmuka tiba-tiba turun sehingga sentuhan meleset ke banner. Pengguna menduga ada *dark pattern*.
- **Bukti:** `laporan/trace/S0/sebelum/SS-1.png`, `SS-2.png`, `SS-3.png`; sesudah `laporan/trace/S0/setelah/SS-1.png`. Track Layout Shifts: satu pergeseran besar pada ±4,1 dtk dengan skor 0,474. Main Thread: tepat setelah respons `/api/promo` (±1,8 dtk), `pasangBannerPromo` (`public/js/promo.js`) memicu UpdateLayoutTree → Layout → Paint. Node terdampak: `footer.kaki`, `div.alat-kanan`, `p#ringkasan`, `div#kisi`, terdorong ±236 px pada layar 412×915.
- **Akar masalah dan mekanismenya:** katalog tergambar pada *rendering opportunity* pertama (`/api/produk` ±180 ms). Ketika `/api/promo` tiba, callback berjalan sebagai macro-task baru dan `$('#utama').prepend(banner)` menyisipkan banner tanpa ruang yang dicadangkan. Layout dihitung ulang dan semua elemen di bawahnya turun ±236 px, tanpa input pengguna dalam 500 ms terakhir (`had_recent_input: false`), sehingga tercatat sebagai layout shift.
- **Kualitas yang terdampak (ISO/IEC 25010):** *Time behaviour* (reflow mendadak); *User error protection* (target sentuh berpindah, mis-click); *Operability* (tidak ada stabilitas spasial); *User engagement* (kepercayaan runtuh).
- **Perbaikan (commit `bed84c3`):** `public/index.html` diberi `<div class="promo-slot" id="promo-slot" aria-hidden="true">`; `public/css/toko.css` menetapkan `.promo-slot` setinggi 132 px (236 px pada `max-width: 900px`); `public/js/promo.js` memakai `slot.replaceWith(banner)` sebagai ganti `prepend`. Ruang sudah dicadangkan sebelum data tiba, sehingga pergantian tidak mengubah tinggi total kontainer.
- **Trade-off:** menahan render halaman sampai `/api/promo` selesai ditolak (merusak FCP/LCP, layar kosong ±1,8 dtk); menghapus banner ditolak (melanggar Bagian 5 Poin 4). Harga: kotak kerangka putus-putus tampil ±1,8 dtk, dan teks promo yang lebih panjang dari batas `line-clamp` berisiko terpotong.
- **Hasil:** CLS 0,474 → 0,292 (turun ±38,4%), **belum** mencapai <= 0,1 karena slot kerangka tidak identik dengan banner akhir (padding, garis batas putus-putus 1,5 px, teks multi-baris).

### T-06: Eager loading 1500 gambar produk menjenuhkan antrean jaringan (S0)
*Sumber: ANDY, T-02.*
- **Tiket terkait:** TK-1081 (Pak Hendra: gambar lama muncul, kotak abu-abu, kuota cepat habis).
- **Gejala bagi pengguna:** kartu di layar hanya menampilkan kotak abu-abu selama sangat lama, scroll cepat memperburuk, kuota seluler terkuras.
- **Bukti:** `laporan/trace/S0/sebelum/SS-1.png` s.d. `SS-3.png`. Track Network: 1500 permintaan `/img/p/*.svg` diinisiasi hampir bersamaan pada ±2 dtk pertama; hanya 147 selesai dalam 10 dtk (median dari 136, 191, 147). Tooltip (misalnya `/img/p/6.svg`): *Queueing and connecting* dan *Waiting on main thread* selama 2,07–2,45 dtk. Unduhan latar terus berjalan sampai detik ke-22 s.d. 37.
- **Akar masalah dan mekanismenya:** `public/js/katalog.js` (`buatKartu`, `renderProduk`) membuat 1500 elemen `<img>` dengan `gambar.src` langsung terisi, sehingga browser mendaftarkan semua URL ke antrean fetcher. HTTP/1.1 membatasi ±6 soket TCP per origin, jadi 1.494 permintaan berstatus *stalled*. Gambar 4–6 kartu teratas ikut bersaing mengantre dengan ratusan gambar di bawah layar (*head-of-line blocking*).
- **Kualitas yang terdampak (ISO/IEC 25010):** *Resource utilization* (bandwidth, soket, memori, kuota, baterai); *Capacity* (konkurensi jaringan runtuh); *Time behaviour* (kelengkapan visual lambat); *Inclusivity* (pengguna kuota terbatas); *User engagement* (bounce).
- **Perbaikan (commit `bed84c3`, `buatKartu`):** `width = 480`, `height = 480`, `decoding = 'async'`; 6 kartu pertama `loading = 'eager'` dan `fetchPriority = 'high'`; kartu ke-7 dan seterusnya `loading = 'lazy'`.
- **Trade-off:** pustaka lazy load eksternal ditolak (Bagian 5 Poin 2); mengurangi jumlah produk dari server ditolak (`server.js` terlarang, semua produk harus bisa dicari). Harga: saat scroll sangat cepat, gambar di bawah memerlukan sepersekian detik untuk muncul.
- **Hasil:** permintaan gambar dalam 10 dtk pertama 1500 → 811 (−±46%); gambar selesai 147 → 284; LCP kartu awal 1,38 → 0,60 dtk (percobaan 1). Target "sebanding dengan yang terlihat" **belum** tercapai karena threshold *pre-load* Chromium ±1.250 px dan seluruh 1500 elemen masih ada di DOM tanpa virtualisasi.

### T-07: Dua timer 10 ms membuat main thread tidak pernah idle (S6)
*Sumber: SOPIAN, T-05 (entri log P-06).*
- **Tiket terkait:** TK-1070.
- **Gejala bagi pengguna:** perangkat cepat panas dan baterai cepat habis meskipun halaman didiamkan.
- **Bukti:** `laporan/trace/S6/1-sebelum.png`: task kuning berulang tiap 10 ms, `public/js/promo.js` memakan mayoritas CPU. Baseline: long task terakumulasi 1.871 ms dan puluhan frame > 50 ms dalam 10 detik tanpa interaksi. **[SISIPKAN anotasi]**
- **Akar masalah dan mekanismenya:** `promo.js` memuat dua `setInterval(..., 10)` (100 kali per detik). `pasangTeksBerjalan()` menulis `teks.style.left`, memicu Layout → Paint → Composite di main thread terus-menerus. `pasangHitungMundur()` membaca `wadah.offsetWidth` (forced reflow) lalu menulis `garis.style.width`. Main thread tidak punya periode idle.
- **Kualitas yang terdampak (ISO/IEC 25010):** *Resource utilization* (CPU dan baterai), *Time behaviour* (task promo mengantre di depan interaksi pengguna).
- **Perbaikan (commit `d025dd9`):** teks berjalan dipindah ke CSS `@keyframes` dengan `transform: translateX(...)` dan `will-change: transform` (diproses compositor); interval hitung mundur dinaikkan ke 1000 ms (sumber menulis "atau 100 ms", **[PERIKSA]** nilai final di kode) dan pembacaan `offsetWidth` di timer dihapus.
- **Trade-off:** angka perseratus detik di hitung mundur berhenti berputar (tetap "00"). `requestAnimationFrame` ditolak karena tetap menjalankan JS di main thread tiap frame.
- **Hasil:** **[BELUM DIUKUR]**. Klaim ">99% idle" di log SOPIAN belum punya bukti ukur.

### T-08: Tombol "+ Keranjang" tanpa umpan balik seketika dan terhambat serialisasi riwayat (S2)
*Sumber: NAUVAL, T-02.*
- **Tiket terkait:** TK-1044 (Pak Anton, Android 3 tahun).
- **Gejala bagi pengguna:** tombol tampak mati, pengguna mengira rusak dan menekan berkali-kali sehingga barang masuk 3 kali.
- **Bukti:** `laporan/trace-nauval/S2-before/` vs `S2-after/`. Track *Interactions* baseline merekam interaksi lambat 216–264 ms. Bottom-Up: hashing `t(s)` di `lacak.min.js` (42,8 ms) dan `localStorage.getItem('tk_riwayat')`.
- **Akar masalah dan mekanismenya:** handler `tambahKeKeranjang` mengeksekusi sinkron: `JSON.parse` riwayat 9.000 objek, hashing 12-pass atas payload >600 KB di `Lacak.kirim`, lalu `localStorage.setItem` string raksasa. Pembaruan tombol (`tombol.textContent = 'Ditambahkan ✓'`) ada di akhir handler, jadi main thread tersandera >140 ms tanpa *rendering opportunity*. Tidak ada guard saat event berlangsung.
- **Kualitas yang terdampak (ISO/IEC 25010):** *Time behaviour* (INP 232 ms melewati 200 ms); *Operability* dan *User error protection* (tanpa umpan balik, pengguna melakukan multi-klik yang merugikan integritas data transaksi).
- **Perbaikan:** (1) umpan balik optimistik di baris pertama handler (teks tombol, gaya hijau, toast) dalam <16 ms; (2) `tombol.disabled = true` selama 1,5 detik; (3) payload `Lacak.kirim` diringkas ke 5 riwayat terbaru sehingga hashing SDK <1 ms; (4) penyimpanan riwayat ke `localStorage` ditunda via `setTimeout(..., 0)`.
- **Trade-off:** tombol tidak bisa diklik selama 1,5 detik saat "Ditambahkan ✓" aktif. **[PERIKSA]** IVAN (T-04) menulis bahwa "+ Keranjang" sengaja tidak dikunci karena menekannya berulang adalah cara sah menambah jumlah unit (§5.4), dan hanya urutan umpan balik yang diperbaiki. Tentukan versi yang benar dari kode, lalu seragamkan.
- **Hasil:** INP 232 → 48 ms (−79,3%); long task terlama 137 → 0 ms (−100%); pesanan ganda dari multi-klik turun menjadi tepat 1.

## 5. Dugaan yang ternyata keliru

Dugaan dari catatan serah terima Rudi, dari tiket, dan dari tim sendiri yang terbantah oleh pengukuran.

| Dugaan | Status | Bukti pengukuran | Sumber |
|---|---|---|---|
| **Rudi #1:** loop bersarang O(n²) di `kategori.js` (dengan `querySelectorAll`) adalah biang kerok | **Keliru** | `pasangKaki` < 1 ms, tidak masuk daftar teratas Bottom-Up. Hanya 8 kategori unik, jadi 8 × 8 = 64 iterasi. Dampak optimasi 0 ms. | ANDY (S0) |
| **Rudi #2:** "API produk lambat, minta backend tambah server" (juga Pak Hendra, TK-1081: "internet lancar buat YouTube, pasti servernya") | **Keliru** | S1: `/api/produk` ±15 ms, kelambatan 3.312 ms terjadi di client (NAUVAL). S0: `/api/produk` ±180 ms; main thread terblokir 2.175,7 ms membuat 1500 node, `Layout` 1.234,5 ms (32,6%), 1.494 gambar *stalled* karena batas 6 soket (ANDY). S3: server tidak diubah, pesanan turun 3 → 1 (IVAN). **[PERIKSA]** 15 ms vs 180 ms, keduanya jauh di bawah waktu blokir di client. | NAUVAL (S1), ANDY (S0), IVAN (S3) |
| **Rudi #3:** `urutkanGelembung` adalah bubble sort, ganti quicksort | **Keliru** | NAUVAL: filter dan sort array < 5 ms (< 0,2%), ±95% latensi ada di Layout dan Recalculate Style. ANDY: hanya dipakai di footer untuk 10–15 merek, maksimal ±225 operasi, < 0,05 ms; mengganti ke quicksort tidak mengubah apa pun. | NAUVAL (S1), ANDY (S0) |
| **Rudi #4:** "voucher sudah `async`, jadi aman" | **Keliru** | `await` atas fungsi bertubuh sinkron hanya mengantrekan microtask, yang dihabiskan sebelum rendering opportunity. Hasilnya INP 2.880 ms dan progres tertahan di 0%. Pola sama menyamarkan `Lacak.kirim` sinkron pada TK-1052. | IVAN (S4, S3) |
| **Rudi #5:** "SDK analitik berat tetapi wajib ada dan tidak boleh disentuh" | **Benar sebagian** | SDK memang berat (hashing 12 putaran). Namun §5.1 mengizinkan mengubah cara, waktu, dan isi pemanggilan. NAUVAL (S2): payload >600 KB → <2 KB, hashing <1 ms. IVAN (S3): payload ±1,4 MB → 566 byte, hashing dari ratusan ms ke <1 ms. Vendor tidak disentuh. **[PERIKSA]** ukuran payload tidak seragam. | NAUVAL (S2), IVAN (S3) |
| **Dugaan tim (P-1057):** beban voucher hanya `simulasiCicilan` | **Keliru** | Ada sumber kedua, `perbaruiHargaVoucherDiKartu()` (RunTask 2.356 ms, `Layout` 621,6 ms). Prediksi "tidak ada long task > 100 ms" meleset. | IVAN (S4) |
| **Dugaan tim (P-1057):** solusinya tabel precompute | **Meleset bentuk** | Yang dibangun cache `Map` malas, memori bergantung pada harga unik dan tidak pernah dibersihkan. | IVAN (S4) |
| **Dugaan tim:** prediksi INP < 200 ms dan tanpa long task untuk S3 | **Tidak dapat dinilai** | Baseline S3 tidak punya rekaman Performance. Kekurangan ada pada rancangan pengukuran, bukan pada perbaikan. | IVAN (S3) |
| **Dugaan tim (P-01):** slot 132/236 px menurunkan CLS ke 0,00 (atau <= 0,02) | **Keliru** | CLS median sesudah 0,292 (tiga percobaan 0,292), target <= 0,1 belum tercapai. Elemen banner asli punya padding dinamis, garis batas putus-putus 1,5 px, dan teks multi-baris yang tingginya berbeda puluhan piksel dari slot kosong. | ANDY (S0) |
| **Dugaan tim (P-02):** `loading="lazy"` memangkas permintaan awal menjadi 6–12 | **Keliru** | Median 811 permintaan (689 / 811 / 897). Threshold *pre-load* Chromium ±1.250 px dan 1500 kartu di-append sekaligus tanpa virtualisasi DOM. | ANDY (S0) |
| **S5 dan S6** | Tidak ada dugaan keliru tercatat | SOPIAN tidak mencatat dugaan keliru untuk S5 dan S6. Klaim di log bahwa prediksi "terbukti akurat" belum didukung angka sesudah perbaikan. | SOPIAN (S5, S6) |

## 6. Yang belum beres dan rekomendasi

**Masalah tersisa dan risiko**

1. **Long task S4 2.356 ms (IVAN).** Pada cabang tempat S4 diukur, `samakanTinggiJudul()` membaca `offsetHeight` dalam loop dan `renderProduk()` menambahkan semua kartu sekaligus. Setelah pekerjaan S1 digabung ke `main`, `samakanTinggiJudul()` berupa fungsi kosong (CSS menggantikannya) dan `renderProduk()` hanya mengisi `UKURAN_BATCH = 36` kartu. Maka 2.356 ms kemungkinan tidak lagi berlaku di `main`, tetapi ini **hipotesis dari pembacaan kode, bukan hasil ukur**. Rekaman S4 sesudah harus diambil ulang di `main`. Temuan yang sama berpotensi memengaruhi rekomendasi ANDY di S0 (layout thrashing `samakanTinggiJudul` 1.234 ms saat pemuatan awal, dan 811 permintaan gambar); S0 sebaiknya juga diukur ulang di `main`.
2. **Regresi dari penggabungan, belum diuji (IVAN).** `perbaruiHargaVoucherDiKartu()` memanggil `renderProduk()` yang mengosongkan kisi dan hanya mengisi 36 kartu pertama. Bila pengguna sudah menggulir jauh lalu menerapkan voucher, halaman menciut dan melompat ke atas. Hasil terbaca dari kode; masukkan ke daftar uji regresi.
3. **Banner promo masih menggeser layout (CLS 0,292) dan 811 gambar masih diminta (ANDY).** Rekomendasi: slot kerangka dengan struktur internal identik banner akhir, atau pembungkus rasio tetap dengan `contain: layout size`; serta *DOM virtualization* atau chunked rendering yang hanya memuat 12–18 kartu di sekitar viewport.
4. **S5 dan S6 belum diukur sesudah perbaikan (SOPIAN).** Ambil 3 repetisi dan laporkan median sebelum klaim keberhasilan ditulis.
5. **Pengukuran S3 dan S4 belum setara baseline (IVAN).** S3 perlu rekaman Performance sebelum (dari commit `d35f90c`) dan sesudah. S4 perlu diulang 3 kali dengan rentang rekaman setara baseline.
6. **Biaya `localStorage` atas 9000+ entri belum terukur (IVAN).** `tambahKeKeranjang` dan `beliSekarang` masih membaca dan men-`stringify` seluruh riwayat pada tiap klik.
7. **Guard "Beli sekarang" terikat pada elemen tombol, bukan produk (IVAN).** `renderProduk()` membangun tombol baru yang terbuka. Aman hari ini karena kunci 1500 ms habis sebelum re-render, tetapi memperpanjang kunci tanpa memindahkan status ke tingkat data akan membuka kembali celah pesanan ganda.
8. **`cacheCicilan` tidak berbatas (IVAN).** Aman pada 3000 produk, tetapi perlu batas eksplisit bila katalog bertambah.
9. **Risiko Harbolnas 12.12 (ANDY).** 1500 kartu menghasilkan >15.000 simpul DOM; pada Android RAM 2–3 GB ini memicu *Major Garbage Collection* berulang (terekam 823 ms di trace awal), freeze, panas, dan baterai boros. Selain itu, 811 permintaan gambar di HTTP/1.1 dapat menahan soket untuk permintaan kritis seperti checkout atau verifikasi voucher.
10. **Inkonsistensi data antar laporan:** lihat butir [PERIKSA] di catatan penyusun, terutama perilaku tombol "+ Keranjang".

**Rekomendasi untuk tim lain**

- **Backend (ANDY, IVAN):** pagination atau cursor-based pada `/api/produk` (20–40 produk per respons); sertakan metadata dimensi banner pada `/api/promo`; aktifkan HTTP/2 atau HTTP/3 untuk menghapus batas 6 soket. Untuk masalah S3 dan S4, IVAN menyatakan tidak ada yang perlu diubah di `server.js`.
- **Vendor SDK analitik (IVAN, ANDY):** `lacak.min.js` men-`stringify` dan men-hash payload dengan biaya sebanding panjang string, tanpa batas ukuran. Minta batas payload, hashing asinkron atau di Web Worker, atau dispatch saat idle, serta hentikan ekstraksi otomatis seluruh riwayat dari `localStorage`.
- **Tim data (NAUVAL, IVAN):** setujui format baru event analitik yang diringkas (`{ jumlah, terakhir: 5 }`). Arsip lengkap masih ada di `localStorage`.
- **Desain (ANDY, IVAN, SOPIAN):** tetapkan pedoman skeleton dan banner bertinggi tetap; kartu produk maksimal 2 baris judul dengan gambar rasio 1:1; keadaan tombol "Memproses…" dengan kunci *disabled*; gunakan penanda progres tak-tentu (*indeterminate*) bila bilah persentase tidak dijamin bergerak (IVAN); putuskan apakah angka perseratus detik di hitung mundur promo masih diperlukan (SOPIAN).

## 7. Pernyataan penggunaan AI dan pembagian kerja

**Alat AI yang dipakai dan untuk apa**

- **NAUVAL (S1, S2):** AI sebagai rekan diskusi analitis untuk memetakan temuan Flame Chart DevTools ke model *Event Loop* dan *Rendering Pipeline*, serta menyusun strategi perbaikan tanpa melanggar batasan penugasan.
- **IVAN (S3, S4):** Claude Code dalam dua peran: sebagai *junior engineer* yang mengusulkan bentuk perbaikan setelah anggota selesai membaca flame chart dan menulis hipotesis di `laporan/PREDIKSI.md`; dan sebagai objek audit, usulannya diuji dengan protokol pengukuran yang sama dan dibantah di `laporan/AUDIT-AI.md`. Pelajaran: AI membaca kode dengan baik tetapi tidak membaca trace, sehingga setiap usulannya diperlakukan sebagai hipotesis yang harus diukur.
- **SOPIAN (S5, S6):** draf laporan disusun dengan bantuan Claude (Anthropic) dari `PREDIKSI-SOPIAN.md` dan template `LAPORAN.md` (menata isi log, menyusun ringkasan, menandai ketidakkonsistenan). Angka berasal dari log, bukan dibuat AI. **[LENGKAPI]** alat AI lain yang dipakai untuk S5 dan S6, atau tulis "tidak ada".
- **ANDY (S0, Audit AI):** Audit AI memakai Copilot CLI (gpt-5.6-luna: Intelligence); penyusunan laporan memakai Antigravity (Gemini 3.8 flash). **[BELUM ADA DATA]** ringkasan hasil Audit AI: `LAPORAN-ANDY.md` hanya mencatat perannya, sedangkan isinya dirujuk IVAN di `laporan/AUDIT-AI.md`.
- **Penggabungan keempat laporan individu ke berkas ini** dibantu Claude (Anthropic). Isi dan angka diambil dari laporan individu sesuai peta sumber di atas, tanpa mengubah data.

**Kontribusi tiap anggota**

- **Nauval (S1, S2):** mendiagnosis dan merekam baseline trace S1 (TK-1041) dan S2 (TK-1044); menyusun hipotesis dan log prediksi P-01 dan P-02 di `laporan/PREDIKSI.md` sebelum mengubah kode; mengimplementasikan debounce pencarian (`pencarian.js`), eliminasi layout thrashing dan *progressive chunked rendering* (`katalog.js`, `toko.css`), serta *optimistic UI* dan peringkasan payload analitik (`keranjang.js`); mengukur ulang sesudah perbaikan (3 repetisi).
- **Ivan Setiawan (S3, S4):** merekam baseline S3 dan S4; menulis hipotesis P-1052 dan P-1057 di `PREDIKSI.md` sebelum menyentuh kode; mengimplementasikan perbaikan pada `public/js/keranjang.js` (penjaga klik ganda dan pemangkasan payload SDK) dan `public/js/harga-promo.js` (memoisasi `simulasiCicilan`, pembuangan 41× panggilan berlebih, penjadwalan ulang ke macrotask); mengukur ulang; menulis bagian prediksi-vs-kenyataan termasuk dua prediksi yang meleset; melakukan penggabungan akhir cabang ke `main`.
- **Sopian (S5, S6):** **[ISI]** `LAPORAN-SOPIAN.md` tidak mencantumkan kontribusi anggota. Yang tercatat di laporannya: entri P-05 (S5, TK-1063) dan P-06 (S6, TK-1070), dengan perbaikan pada commit `d025dd9`.
- **Andy / Thoriq (S0, Audit AI):** Skenario 0 (TK-1078 dan TK-1081, commit `bed84c3`) dan Audit AI.
