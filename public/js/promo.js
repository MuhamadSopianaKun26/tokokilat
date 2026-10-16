// Elemen kampanye: hitung mundur, teks berjalan, dan banner promo.

import { $, el, tampilkanToast } from './util.js';

// Flash sale berakhir tengah malam nanti (waktu perangkat).
function akhirFlashSale() {
  const t = new Date();
  t.setHours(24, 0, 0, 0);
  return t.getTime();
}

const duaDigit = (n) => String(n).padStart(2, '0');

function pasangHitungMundur() {
  const akhir = akhirFlashSale();
  const awal = Date.now();
  const garis = $('#hm-garis');
  const jam = $('#hm-jam'), menit = $('#hm-menit'), detik = $('#hm-detik'), senti = $('#hm-senti');

  function perbarui() {
    const sisa = Math.max(akhir - Date.now(), 0);
    jam.textContent = duaDigit(Math.floor(sisa / 3600000));
    menit.textContent = duaDigit(Math.floor((sisa % 3600000) / 60000));
    detik.textContent = duaDigit(Math.floor((sisa % 60000) / 1000));
    senti.textContent = '00';

    // Garis menyusut proporsional dengan persentase lebar tanpa memicu forced layout offsetWidth
    const rasio = Math.max(0, Math.min(1, sisa / (akhir - awal + 1)));
    if (garis) garis.style.width = (rasio * 100).toFixed(2) + '%';
  }

  // Pembaruan awal dan interval 1000 ms agar Main Thread benar-benar menganggur saat halaman diam (S6)
  perbarui();
  setInterval(perbarui, 1000);
}

function pasangTeksBerjalan() {
  // Animasi teks berjalan didelegasikan ke CSS @keyframes dengan properti transform (GPU Compositor Thread)
  // guna mengeliminasi eksekusi JavaScript timer 10ms dan tahapan layout/paint di Main Thread saat diam (S6).
}

async function pasangBannerPromo() {
  const respons = await fetch('/api/promo');
  const promo = await respons.json();

  const banner = el('section', 'promo-banner');
  const teks = el('div');
  teks.append(el('h2', '', promo.judul), el('p', '', promo.isi));
  const tombol = el('button', '', promo.tombol);
  tombol.type = 'button';
  tombol.addEventListener('click', () => {
    tampilkanToast('Syarat promo: berlaku 12 Desember, satu voucher per akun, tidak bisa digabung.');
    if (window.Lacak) window.Lacak.kirim('promo_click', { judul: promo.judul });
  });
  banner.append(teks, tombol);

  // Isi slot yang ruangnya sudah dicadangkan, sehingga tinggi layout tidak berubah (mencegah LayoutShift saat banner asinkron muncul).
  const slot = $('#promo-slot');
  if (slot) slot.replaceWith(banner);
  else $('#utama').prepend(banner);
}

export function pasangPromo() {
  pasangHitungMundur();
  pasangTeksBerjalan();
  pasangBannerPromo();
}
