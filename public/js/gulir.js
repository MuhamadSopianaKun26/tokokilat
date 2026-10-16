// Perilaku saat halaman digulir: bayangan header, bar progres baca,
// tombol "Ke atas", efek kartu muncul, dan pencatatan impresi produk.

import { $ } from './util.js';

const sudahTercatat = new Set();
let impresiAntrean = [];
let impresiTimer = null;

function kirimImpresiBatch() {
  if (impresiAntrean.length && window.Lacak) {
    window.Lacak.kirim('impression', { produk: impresiAntrean });
    impresiAntrean = [];
  }
}

// Gunakan IntersectionObserver untuk mendeteksi kartu yang masuk viewport
// tanpa memicu Forced Synchronous Layout / Layout Thrashing (S5)
const pengamatKartu = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      const kartu = entry.target;
      if (!kartu.classList.contains('terlihat')) {
        kartu.classList.add('terlihat');
      }
      const id = kartu.dataset.id;
      if (id && !sudahTercatat.has(id)) {
        sudahTercatat.add(id);
        impresiAntrean.push(id);
        if (!impresiTimer) {
          impresiTimer = setTimeout(() => {
            impresiTimer = null;
            kirimImpresiBatch();
          }, 250);
        }
      }
    }
  });
}, {
  rootMargin: '80px 0px 80px 0px',
  threshold: 0
});

export function amatiKartuBaru() {
  document.querySelectorAll('.kartu:not([data-diamati])').forEach((kartu) => {
    kartu.setAttribute('data-diamati', '1');
    pengamatKartu.observe(kartu);
  });
}

let rAFPending = false;

function perbaruiStatusGulir() {
  rAFPending = false;
  const kepala = $('#kepala');
  const bar = $('#bar-gulir');
  const keAtas = $('#ke-atas');

  const y = window.scrollY;
  if (kepala) kepala.classList.toggle('melayang', y > 8);
  if (keAtas) keAtas.hidden = y < 900;

  if (bar) {
    const tinggiDokumen = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.width = (tinggiDokumen > 0 ? (y / tinggiDokumen) * 100 : 0) + '%';
  }
}

export function periksaGulir() {
  amatiKartuBaru();

  if (!rAFPending) {
    rAFPending = true;
    requestAnimationFrame(perbaruiStatusGulir);
  }
}

export function pasangGulir() {
  window.addEventListener('scroll', periksaGulir, { passive: true });
  window.addEventListener('resize', periksaGulir, { passive: true });

  // Cegah "pull to refresh" tak sengaja di Android ketika pengguna di puncak halaman
  let yAwal = 0;
  const utama = $('#utama');
  if (utama) {
    utama.addEventListener('touchstart', (e) => {
      yAwal = e.touches[0].clientY;
    }, { passive: true });

    utama.addEventListener('touchmove', (e) => {
      const menarikKeBawah = e.touches[0].clientY > yAwal;
      if (window.scrollY === 0 && menarikKeBawah && e.cancelable) {
        e.preventDefault();
      }
    }, { passive: false });
  }

  const keAtas = $('#ke-atas');
  if (keAtas) {
    keAtas.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  }

  periksaGulir();
}
