// Keranjang belanja, riwayat penelusuran, dan "Beli sekarang".
// Semua disimpan di localStorage supaya tetap ada walau halaman dimuat ulang.

import { $, el, formatRupiah, hargaSetelahDiskon, salinDalam, tampilkanToast } from './util.js';

const KUNCI_KERANJANG = 'tk_keranjang';
const KUNCI_RIWAYAT = 'tk_riwayat';

const KONFIG = { maksPerProduk: 99, mataUang: 'IDR', sumber: 'web-flashsale-1212' };

function bacaKeranjang() {
  return JSON.parse(localStorage.getItem(KUNCI_KERANJANG) || '[]');
}
function simpanKeranjang(isi) {
  localStorage.setItem(KUNCI_KERANJANG, JSON.stringify(isi));
}
function bacaRiwayat() {
  return JSON.parse(localStorage.getItem(KUNCI_RIWAYAT) || '[]');
}
function simpanRiwayat(riwayat) {
  localStorage.setItem(KUNCI_RIWAYAT, JSON.stringify(riwayat));
}

// Ringkasan riwayat untuk SDK analitik.
// `lacak.min.js` men-stringify seluruh payload lalu men-hash-nya 12 putaran
// (fungsi `t`), sehingga biayanya sebanding dengan panjang string. Mengirim
// array riwayat berisi 9000+ entri membuat satu event memblokir main thread.
// Ringkasan ini tetap memberi konteks yang masuk akal bagi tim data.
function ringkasRiwayat(riwayat) {
  return { jumlah: riwayat.length, terakhir: riwayat.slice(-5) };
}

// Riwayat aktivitas dipakai tim rekomendasi ("Karena kamu melihat...").
// Untuk pengembangan, kita isi dengan data contoh pelanggan lama yang aktif
// sejak 2023 supaya kondisinya mirip pengguna sungguhan.
export function siapkanRiwayatContoh(semuaProduk) {
  if (localStorage.getItem(KUNCI_RIWAYAT)) return;
  const riwayat = [];
  const jenis = ['lihat', 'lihat', 'lihat', 'cari', 'keranjang', 'beli'];
  let waktu = Date.parse('2023-01-05T08:00:00+07:00');
  for (let i = 0; i < 9000; i++) {
    const p = semuaProduk[(i * 131) % semuaProduk.length];
    waktu += 1000 * 60 * (7 + (i % 190));
    riwayat.push({ t: waktu, jenis: jenis[i % jenis.length], id: p.id, nama: p.nama, kategori: p.kategori, harga: p.harga });
  }
  simpanRiwayat(riwayat);
}

export function perbaruiLencana() {
  const total = bacaKeranjang().reduce((n, item) => n + item.jumlah, 0);
  $('#lencana-keranjang').textContent = total;
}

function gambarPanel() {
  const daftar = $('#daftar-keranjang');
  const isi = bacaKeranjang();
  daftar.innerHTML = '';
  let total = 0;
  if (isi.length === 0) daftar.append(el('li', '', 'Keranjang masih kosong. Tambahkan produk dari daftar.'));
  for (const item of isi) {
    total += item.harga * item.jumlah;
    const baris = el('li');
    baris.append(el('span', '', item.nama), el('span', 'jumlah', item.jumlah + ' x ' + formatRupiah(item.harga)));
    const hapus = el('button', 'hapus', 'Hapus dari keranjang');
    hapus.type = 'button';
    hapus.addEventListener('click', () => {
      simpanKeranjang(bacaKeranjang().filter((x) => x.id !== item.id));
      perbaruiLencana();
      gambarPanel();
    });
    baris.append(hapus);
    daftar.append(baris);
  }
  $('#total-keranjang').textContent = formatRupiah(total);
}

export function tambahKeKeranjang(produk, tombol) {
  const konfig = salinDalam(KONFIG);
  const keranjang = bacaKeranjang();

  const ada = keranjang.find((item) => item.id === produk.id);
  if (ada) ada.jumlah = Math.min(ada.jumlah + 1, konfig.maksPerProduk);
  else keranjang.push({ id: produk.id, nama: produk.nama, harga: hargaSetelahDiskon(produk), jumlah: 1 });

  // Isi keranjang disimpan sinkron — inilah data yang menentukan pesanan,
  // jadi tidak boleh ditunda.
  simpanKeranjang(keranjang);

  // Umpan balik tampilan diberikan SEBELUM kerja berat apa pun, supaya tombol
  // bereaksi seketika (TK-1044).
  perbaruiLencana();
  tombol.textContent = 'Ditambahkan ✓';
  tombol.classList.add('sudah');
  tampilkanToast('Ditambahkan ke keranjang: ' + produk.nama);

  // Tombol "+ Keranjang" sengaja TIDAK dikunci. Menekan berulang adalah cara sah
  // menambah jumlah unit, jadi mengunci tombol akan menghapus perilaku yang
  // dilindungi §5.4.
  //
  // Penulisan riwayat ditunda ke macrotask berikutnya (pola dari perbaikan Nauval
  // untuk TK-1044): satu larik 9000+ entri harus di-parse lalu di-stringify ulang,
  // dan pekerjaan itu tidak perlu menahan paint dari klik ini.
  //
  // Aman tanpa kunci tombol karena `bacaRiwayat()` dipanggil DI DALAM task
  // tertunda, bukan sebelumnya: tiap task membaca keadaan terbaru saat ia
  // berjalan, sehingga dua klik cepat menghasilkan dua penulisan berurutan
  // (9000 → 9001 → 9002) dan tidak ada entri yang saling menimpa.
  setTimeout(() => {
    const riwayat = bacaRiwayat();
    riwayat.push({ t: Date.now(), jenis: 'keranjang', id: produk.id, nama: produk.nama, kategori: produk.kategori, harga: produk.harga });
    simpanRiwayat(riwayat);

    // Payload SDK dipangkas: `lacak.min.js` men-stringify payload lalu men-hash-nya
    // 12 putaran, jadi biayanya sebanding panjang string. Mengirim larik riwayat
    // 9000+ entri membuat satu event memblokir main thread. Ringkasan ini tetap
    // memberi konteks yang masuk akal bagi tim data.
    window.Lacak.kirim('add_to_cart', {
      produk: { id: produk.id, nama: produk.nama, kategori: produk.kategori, harga: produk.harga },
      jumlah: ada ? ada.jumlah : 1,
      totalItem: keranjang.reduce((n, item) => n + item.jumlah, 0),
      riwayat: ringkasRiwayat(riwayat),
      sumber: konfig.sumber,
    });
  }, 0);

  setTimeout(() => {
    tombol.textContent = '+ Keranjang';
    tombol.classList.remove('sudah');
  }, 1500);
}

export async function beliSekarang(produk, tombol) {
  // Penjaga klik ganda (TK-1052). Tombol dikunci SEBELUM kerja apa pun, sehingga
  // klik ke-2 dan ke-3 tidak pernah memulai pemesanan baru. Sebelumnya tidak ada
  // penjaga sama sekali: tiap klik adalah task tersendiri yang menjalankan `fetch`
  // sendiri, jadi tiga klik cepat menghasilkan tiga pesanan.
  if (tombol.disabled) return;
  tombol.disabled = true;
  tombol.setAttribute('aria-busy', 'true');
  const label = tombol.textContent;
  tombol.textContent = 'Memproses…';

  const konfig = salinDalam(KONFIG);
  const riwayat = bacaRiwayat();
  riwayat.push({ t: Date.now(), jenis: 'beli', id: produk.id, nama: produk.nama, kategori: produk.kategori, harga: produk.harga });
  simpanRiwayat(riwayat);

  window.Lacak.kirim('begin_checkout', {
    produk: { id: produk.id, nama: produk.nama, kategori: produk.kategori, harga: produk.harga },
    riwayat: ringkasRiwayat(riwayat),
    sumber: konfig.sumber,
  });

  try {
    const respons = await fetch('/api/pesanan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ produkId: produk.id, nama: produk.nama }),
    });
    const pesanan = await respons.json();

    tombol.textContent = 'Dipesan ✓';
    tampilkanToast('Pesanan ' + pesanan.id + ' dibuat: ' + produk.nama);
    perbaruiLencanaPesanan();
  } catch (galat) {
    tombol.textContent = 'Gagal, coba lagi';
    tampilkanToast('Pesanan gagal dibuat. Periksa koneksi lalu coba lagi.');
    console.error(galat);
  } finally {
    // Tombol wajib dibuka lagi, termasuk ketika gagal: kalau tidak, ia akan
    // terkunci selamanya dan produk itu tidak bisa dipesan lagi.
    setTimeout(() => {
      tombol.disabled = false;
      tombol.removeAttribute('aria-busy');
      tombol.textContent = label;
    }, 1500);
  }
}

export async function perbaruiLencanaPesanan() {
  const respons = await fetch('/api/pesanan');
  const pesanan = await respons.json();
  $('#lencana-pesanan').textContent = pesanan.length;
  return pesanan;
}

export function pasangKeranjang() {
  const panel = $('#panel-keranjang');
  const tombolBuka = $('#tombol-keranjang');
  const buka = (ya) => {
    panel.hidden = !ya;
    tombolBuka.setAttribute('aria-expanded', String(ya));
    if (ya) gambarPanel();
  };
  tombolBuka.addEventListener('click', () => buka(panel.hidden));
  $('#tutup-keranjang').addEventListener('click', () => buka(false));
  $('#kosongkan-keranjang').addEventListener('click', () => {
    simpanKeranjang([]);
    perbaruiLencana();
    gambarPanel();
  });

  $('#tombol-pesanan').addEventListener('click', async () => {
    const pesanan = await perbaruiLencanaPesanan();
    if (pesanan.length === 0) return tampilkanToast('Belum ada pesanan. Tekan "Beli sekarang" pada produk untuk memesan.');
    const terakhir = pesanan.slice(-3).map((p) => p.id + ' (produk #' + p.produkId + ')').join(', ');
    tampilkanToast(pesanan.length + ' pesanan. Terakhir: ' + terakhir);
  });

  perbaruiLencana();
  perbaruiLencanaPesanan();
}
