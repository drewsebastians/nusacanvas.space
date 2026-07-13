# Batch 2 closure — release candidate

Tanggal: 13 Juli 2026  
Status: **COMPLETE — STAGING VERIFIED**

## Hasil untuk pengguna

Mapnesia kini memberi alur yang dapat dipahami pengguna non-GIS: masukkan data lokal (paste/CSV/TSV/XLSX), cek kecocokan wilayah sebelum diterapkan, pilih visualisasi deterministik, isi sumber dan periode, lalu ekspor SVG/PNG/PDF atau tabel mapping. Contoh yang disediakan memakai `wilayah`, `provinsi`, dan `nilai`, sehingga nama wilayah yang sama tidak diterapkan secara diam-diam.

Nilai kosong tidak diperlakukan sebagai nol: pada visualisasi numerik ia kembali ke gaya peta dasar dan legenda menyatakan “Tidak ada data”. Warna manual tetap dipisahkan dari hasil visualisasi, dan preferensi ekspor serta warna manual tersimpan aman di proyek.

## Bukti release gate

| Gate | Hasil |
| --- | --- |
| Build allowlisted | Lulus, 48 berkas distribusi |
| Data pipeline dan fixture geometri | Lulus, 519 fitur; reproducibility tanpa drift |
| Unit/integration | Lulus, 31 tes |
| Smoke Chromium desktop | Lulus, 13 skenario |
| Smoke matrix inti | Lulus di Chromium desktop, Chromium mobile, Firefox desktop, dan WebKit desktop |
| Trust content dan aksesibilitas | Lulus: 17 halaman trust, 3 trust test, 2 axe test |
| Performance budget | Lulus: initial gzip 611.533 B; geometri 518.479 B; shell JS 81.974 B |
| Security/privacy | Lulus, 8 pemeriksaan |
| Sumber dan lisensi | Lulus, 6 catatan sumber dan 18 aset berlisensi |
| First-user automated flow | Lulus; preview 1.048 ms, peta valid 2.466 ms, ekspor 2.740 ms; error pemblokir 0 |

Hasil terukur tersimpan di `artifacts/batch-1/first-user-flow.json`, `artifacts/batch-1/performance-budget-report.json`, dan `artifacts/batch-2/import-core-benchmark.json`.

## Konten dan batasan

Paket Batch 2 menambahkan halaman Excel-to-map, tujuh panduan pemula, serta CSV/TSV sintetis yang dapat diunduh. Semua halaman konten bersifat statis, ringan, `noindex` pada staging, dan tidak memuat runtime peta. Panduan membedakan sumber angka pengguna dari atribusi batas, menjelaskan CSV vs XLSX, metode kelas, legenda, ekspor PowerPoint, dan cara memperbaiki nama wilayah.

PDF adalah raster dalam pembungkus PDF, bukan editor vektor. XLSX dibatasi dan diperiksa sebagai berkas terstruktur, tetapi bukan pemindai malware. Tidak ada unggahan data, akun, analitik, atau AI di alur pengguna.

## Uji manusia yang masih diperlukan

Tidak ada peserta non-GIS independen yang direkrut pada closure ini. Karena itu pemahaman manusia ditandai **belum diverifikasi**, bukan diasumsikan lulus. Jalankan [protokol uji pengguna pertama](08-first-user-manual-protocol.md) dengan setidaknya satu pengguna awam pada desktop dan ponsel sebelum mengubah staging menjadi produksi.

## Keputusan

Tidak ada P0 atau P1 yang terbuka untuk build ini. Kandidat telah diterbitkan dan diverifikasi di [mapnesia.andrew-sebastian91.workers.dev](https://mapnesia.andrew-sebastian91.workers.dev). **Batch 3 belum dimulai.**
