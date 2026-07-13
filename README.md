# Mapnesia — Peta Warna Wilayah Indonesia

Mapnesia adalah aplikasi statis, local-first, untuk mengubah spreadsheet menjadi visual peta kabupaten/kota Indonesia. Produk ini ditujukan bagi pengguna non-GIS: masukkan data, periksa kecocokan wilayah, pilih visualisasi yang dapat dijelaskan, tinjau tabel/peta/legenda, lalu ekspor.

Staging: `https://mapnesia.andrew-sebastian91.workers.dev`. Target workers.dev ini sengaja `noindex`; ini bukan domain produksi atau situs yang diindeks.

## Fitur Batch 2

- Paste, CSV, TSV, dan XLSX lokal melalui satu pipeline import.
- Pemetaan kolom, normalisasi angka Indonesia/internasional, dan batas input browser-side.
- Matching canonical deterministik; nama ambigu, tidak cocok, duplikat, dan baris diabaikan tetap eksplisit.
- Resolve/ignore lokal untuk baris ambigu tanpa mengunggah data.
- Workflow Input → Match → Visualize → Export dan tabel data yang terhubung dengan peta.
- Kategori, interval sama, kuantil, batas manual, dan divergen berpusat; no-data tidak diperlakukan sebagai nol.
- SVG, PNG, PDF raster A4/A3, serta mapping CSV dengan atribusi wajib.
- Project JSON dan autosave lokal untuk warna manual, hasil import, visualisasi, koreksi, dan metadata ekspor.

Tidak ada backend, akun, analytics, external map tiles, runtime AI, atau CDN runtime.

## Cara pakai

1. Buka studio dan pilih **Coba contoh lokal**, paste tabel, atau pilih file.
2. Tekan **Pratinjau Import** dan pastikan pemetaan kolom benar.
3. Selesaikan nama ambigu atau tambahkan provinsi/kode wilayah.
4. Terapkan baris valid, pilih visualisasi, dan periksa peta, tabel, serta legenda.
5. Isi judul, sumber, periode, dan catatan bila perlu.
6. Ekspor SVG, PNG, PDF, atau mapping CSV.

Contoh sintetis tersedia sebagai [CSV](./sample/contoh-nilai-kota.csv) dan [TSV](./sample/contoh-nilai-kota.tsv). Lihat juga halaman preview [Excel to Map](./excel-to-map/) dan panduan di `guides/`.

## Format spreadsheet dan keamanan

Header tidak dikunci. Mapper mengenali kolom wilayah, provinsi, kode, nilai, kategori, sumber, dan periode. Kode resmi diprioritaskan, kemudian nama+provinsi; nama yang ambigu tidak diterapkan otomatis.

XLSX diproses lokal setelah pemeriksaan struktur ZIP. Workbook bermakro, objek tertanam, external link, encryption marker, dan format yang tidak didukung ditolak. Safeguard ini menjaga pemrosesan browser, bukan klaim perlindungan malware atau pemeriksaan forensik dokumen.

## Ekspor dan privasi

SVG paling sesuai untuk PowerPoint/editing; PNG untuk gambar siap pakai; PDF A4/A3 memakai raster lokal; mapping CSV memuat status kecocokan dan meng-escape awalan formula. Cakupan **Seluruh Indonesia** dan **Tampilan peta saat ini** dipilih secara eksplisit.

Data import dan project diproses di browser. Tidak ada unggahan data pengguna atau analytics. Cloudflare dapat memiliki log akses hosting biasa di luar kontrol aplikasi. Baca [PRIVACY.md](./PRIVACY.md) dan [docs arsitektur](./docs/architecture.md).

## Data dan keterbatasan

Geometri produksi mengikuti lineage geoBoundaries/HDX OCHA COD-AB ADM2 tahun 2020 dengan 519 fitur. Ini adalah referensi visual, bukan penetapan batas hukum atau klaim struktur administrasi terbaru. Atribusi wajib dipertahankan.

Lihat [ATTRIBUTION.md](./ATTRIBUTION.md), `data/license-manifest-v1.json`, dan [known limitations](./docs/known-limitations.md). PDF saat ini raster, agregasi beberapa baris untuk satu wilayah tidak dilakukan otomatis, dan project besar dibatasi penyimpanan browser.

## Pengembangan dan quality gate

Gunakan Node.js 24.x.

```text
npm ci
npm run build
npm run verify:batch1
```

`npm run build` hanya menyalin aset produksi yang diizinkan ke `dist/`. Lihat `docs/development.md`, `docs/deployment-guide.md`, dan laporan `docs/batch-2/` untuk detail pengujian dan staging.

## Lisensi

Kode aplikasi berlisensi MIT. Data batas dan library pihak ketiga tetap tunduk pada lisensi serta atribusi sumber masing-masing.
