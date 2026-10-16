# Audit usulan perbaikan dari AI

Peran Anda di sini adalah **reviewer**. Minta sebuah AI (asisten chat atau coding agent) memperbaiki
minimal dua tiket, sebaiknya di branch terpisah. Uji usulannya dengan protokol pengukuran yang sama.
Temukan minimal **dua** usulan bermasalah. Usulan AI yang bagus juga boleh dicatat, tetapi tidak
menggantikan dua temuan wajib.

Alat AI yang dipakai: Copilot
Branch atau commit tempat usulan diterapkan: Branch Noval

---

## A-01: pencarian terasa lambat atau hang

- **Tiket yang diminta diperbaiki:** TK-1041
- **Prompt yang diberikan (ringkas):** "Identifikasi masalah yang terjadi pada tiket keluhan TK-1041 HANYA berdasarkan source code JANGAN jalankan trace, JANGAN menggunakan chrome devtool, dan JANGAN run server. Setelah teridentifikasi, betulkan code terkait dengan masalah tersebut. Berikan potongan kode yang relevan."
- **Usulan AI (ringkas, sertakan potongan kode yang relevan):**
- - Menyimpan hasil normalisasi tiap produk dalam  WeakMap , sehingga produk tidak dinormalisasi berulang kali.
- - Menggunakan  DocumentFragment  agar kartu ditambahkan ke DOM dalam satu operasi.
- - Menunda dan melakukan debounce pengiriman analitik sampai pengguna berhenti mengetik sejenak.
```
const teksPencarian = new WeakMap();
let pengaturLacak;

function cocok(produk, kunci) {
  let teks = teksPencarian.get(produk);
  if (!teks) {
    teks = normalkan(
      produk.nama + ' ' + produk.merek + ' ' +
      produk.kategori + ' ' + produk.kota
    );
    teksPencarian.set(produk, teks);
  }
  return kunci.split(' ').every((k) => teks.includes(k));
}

const fragmen = document.createDocumentFragment();

for (const produk of daftar) {
  fragmen.append(buatKartu(produk));
}

kisi.append(fragmen);

if (window.Lacak && kunci) {
  const data = { kata: saringan.kata, jumlah: hasil.length };
  clearTimeout(pengaturLacak);
  pengaturLacak = setTimeout(
    () => window.Lacak.kirim('search', data),
    250
  );
}
```
- **Jenis masalah pada usulan:** pilih satu atau lebih
  - [ ] Salah diagnosis (memperbaiki hal yang bukan penyebab)
  - [ ] Tidak lengkap (gejala berkurang tetapi akar masalah masih ada)
  - [ ] Menimbulkan regresi (metrik lain, fitur, aksesibilitas, atau memori memburuk)
  - [ ] Melanggar aturan main (menghapus fitur, mengubah berkas terlarang, dan sebagainya)
  - [ ] Memperbaiki sesuatu yang tidak berpengaruh terukur
- **Bukti:** angka dan tangkapan layar trace sebelum dan sesudah usulan AI diterapkan.
- **Mengapa AI bisa keliru di sini:** informasi apa yang tidak dimilikinya? (petunjuk: AI membaca kode, Anda membaca trace)
- **Perbaikan yang benar menurut tim:** ....

---

## A-01: tombol  + Keranjang  terlihat tidak merespons

- **Tiket yang diminta diperbaiki:** TK-1044
- **Prompt yang diberikan (ringkas):** "Identifikasi masalah yang terjadi pada tiket keluhan TK-1044 HANYA berdasarkan source code JANGAN jalankan trace, JANGAN menggunakan chrome devtool, dan JANGAN run server. Setelah teridentifikasi, betulkan code terkait dengan masalah tersebut. Berikan potongan kode yang relevan."
- **Usulan AI (ringkas, sertakan potongan kode yang relevan):**
- window.Lacak.kirim('add_to_cart', ...) dipanggil sebelum penyimpanan keranjang dan sebelum perubahan visual tombol. Karena SDK berjalan sinkron, pengguna tidak segera melihat tanda bahwa klik sudah diterima. Pengguna dapat mengklik lagi; setiap klik memang menambah jumlah produk karena kode berikut:
```
if (ada) ada.jumlah = Math.min(ada.jumlah + 1, konfig.maksPerProduk);
```
- - Keranjang dan riwayat disimpan lebih dahulu.
- - Lencana, teks tombol, dan toast diperbarui segera.
- - Analitik dijadwalkan setelah handler klik selesai, sehingga tidak menahan umpan balik pengguna
```
simpanKeranjang(keranjang);
simpanRiwayat(riwayat);

perbaruiLencana();
tombol.textContent = 'Ditambahkan ✓';
tombol.classList.add('sudah');
tampilkanToast('Ditambahkan ke keranjang: ' + produk.nama);

if (window.Lacak) {
  const data = { produk, keranjang, riwayat, sumber: konfig.sumber };
  setTimeout(() => window.Lacak.kirim('add_to_cart', data), 0);
}
```
- **Jenis masalah pada usulan:** pilih satu atau lebih
  - [ ] Salah diagnosis (memperbaiki hal yang bukan penyebab)
  - [ ] Tidak lengkap (gejala berkurang tetapi akar masalah masih ada)
  - [ ] Menimbulkan regresi (metrik lain, fitur, aksesibilitas, atau memori memburuk)
  - [ ] Melanggar aturan main (menghapus fitur, mengubah berkas terlarang, dan sebagainya)
  - [ ] Memperbaiki sesuatu yang tidak berpengaruh terukur
- **Bukti:** angka dan tangkapan layar trace sebelum dan sesudah usulan AI diterapkan.
- **Mengapa AI bisa keliru di sini:** informasi apa yang tidak dimilikinya? (petunjuk: AI membaca kode, Anda membaca trace)
- **Perbaikan yang benar menurut tim:** ....

---

## Refleksi (maks. 200 kata)
Untuk jenis pekerjaan apa AI paling membantu di tugas ini, dan di mana Anda harus paling waspada?
