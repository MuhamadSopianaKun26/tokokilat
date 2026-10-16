// Voucher: menghitung harga promo untuk setiap produk.
// Aturan promo bertingkat + simulasi cicilan ditentukan tim bisnis.

import { $, hargaSetelahDiskon, tampilkanToast } from './util.js';
import { keadaan, perbaruiHargaVoucherDiKartu } from './katalog.js';

const VOUCHER = {
  KILAT1212: { persen: 12, maksPotongan: 120000, minBelanja: 50000 },
  HEMAT50: { persen: 5, maksPotongan: 50000, minBelanja: 0 },
};

// Cicilan 0% sampai 24 bulan: cari tenor dengan angsuran paling ringan yang
// masih memenuhi batas minimal angsuran per bulan dari mitra pembiayaan.
//
// Hasilnya hanya bergantung pada `harga`, dan harga yang sama muncul berkali-kali
// di katalog. Cache ini membuat tiap harga unik dihitung sekali saja.
const cacheCicilan = new Map();

function simulasiCicilan(harga) {
  const tersimpan = cacheCicilan.get(harga);
  if (tersimpan) return tersimpan;

  let terbaik = { tenor: 1, angsuran: harga };
  for (let tenor = 1; tenor <= 24; tenor++) {
    let sisa = harga;
    let angsuran = Math.ceil(harga / tenor / 100) * 100;
    for (let bulan = 1; bulan <= tenor; bulan++) {
      const biayaAdmin = Math.round(sisa * 0.0005 * Math.log2(bulan + 1));
      sisa = sisa - angsuran + biayaAdmin;
      if (sisa < 0) sisa = 0;
    }
    angsuran += Math.ceil(sisa / tenor);
    if (angsuran >= 25000 && angsuran < terbaik.angsuran) terbaik = { tenor, angsuran };
  }
  cacheCicilan.set(harga, terbaik);
  return terbaik;
}

// Perhitungan ini SINKRON. Sebelumnya ditandai `async` dan dipanggil memakai
// `await`, sehingga tampak "tidak memblokir" — padahal `await` atas fungsi yang
// isinya sinkron hanya mengantre microtask, dan microtask selalu dihabiskan
// sebelum browser mendapat rendering opportunity. Jadi tetap memblokir
// (membantah dugaan Rudi #4).
function hitungHargaPromo(produk, aturan) {
  const dasar = hargaSetelahDiskon(produk);
  if (dasar < aturan.minBelanja) return null;
  let potongan = Math.min(Math.round((dasar * aturan.persen) / 100), aturan.maksPotongan);
  if (produk.flashSale) potongan = Math.round(potongan / 2); // flash sale hanya dapat setengah
  const hargaAkhir = Math.max(dasar - potongan, 100);
  // Aturan cicilan tetap dihitung supaya aturan bisnis utuh (§5.4). Dulu ada
  // tambahan `for (i < 40) simulasiCicilan(hargaAkhir + i)` yang hasilnya dibuang
  // tanpa dipakai — 40 dari 41 panggilan per produk terbuang percuma.
  const cicilan = simulasiCicilan(hargaAkhir);
  return { hargaAkhir, cicilan };
}

// Satu batch = sekian produk yang dihitung dalam satu task.
const UKURAN_BATCH = 200;
// Kembalikan kontrol ke event loop lewat setTimeout (MACROtask), bukan lewat
// `await` fungsi sinkron (microtask). Hanya macrotask yang memberi browser
// kesempatan menggambar dan melayani event yang mengantre.
const beriNapas = () => new Promise((lanjut) => setTimeout(lanjut, 0));

async function terapkanVoucher(kode) {
  const aturan = VOUCHER[kode];
  if (!aturan) {
    tampilkanToast('Kode voucher "' + kode + '" tidak dikenal. Coba KILAT1212.');
    return;
  }

  const progres = $('#progres');
  const isi = $('#progres-isi');
  const teks = $('#progres-teks');
  progres.hidden = false;
  isi.style.width = '0%';

  const total = keadaan.semuaProduk.length;
  let selesai = 0;
  keadaan.hargaVoucher.clear();

  // Biarkan progres 0% tergambar lebih dulu. Tanpa jeda ini, task pertama sudah
  // memakan seluruh waktu sampai batch pertama selesai, sehingga pengguna hanya
  // melihat "0%" yang membeku lalu lompat ke selesai.
  await beriNapas();

  for (const produk of keadaan.semuaProduk) {
    const hasil = hitungHargaPromo(produk, aturan);
    if (hasil) keadaan.hargaVoucher.set(produk.id, hasil.hargaAkhir);
    selesai++;
    const persen = Math.round((selesai / total) * 100);
    isi.style.width = persen + '%';
    teks.textContent = 'Menghitung harga promo… ' + persen + '% (' + selesai + ' dari ' + total + ' produk)';
    if (selesai % UKURAN_BATCH === 0) await beriNapas();
  }

  perbaruiHargaVoucherDiKartu();
  progres.hidden = true;
  tampilkanToast('Voucher ' + kode + ' dipakai di ' + keadaan.hargaVoucher.size.toLocaleString('id-ID') + ' produk.');
  if (window.Lacak) window.Lacak.kirim('apply_voucher', { kode, jumlah: keadaan.hargaVoucher.size });
}

export function pasangVoucher() {
  const kolom = $('#kolom-voucher');
  $('#tombol-voucher').addEventListener('click', () => terapkanVoucher(kolom.value.trim().toUpperCase()));
  kolom.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') terapkanVoucher(kolom.value.trim().toUpperCase());
  });
}
