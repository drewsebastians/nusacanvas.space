# Protokol uji pengguna pertama Batch 2

Status hasil manusia: **belum diverifikasi secara independen**. Dokumen ini tidak menggantikan hasil pengujian manusia.

## Peserta dan perangkat

- Satu pengguna yang tidak bekerja sebagai GIS specialist.
- Desktop modern dan, bila tersedia, ponsel layar sempit.
- Berikan file `sample/contoh-nilai-kota.csv`; jangan berikan instruksi UI selain tujuan.

## Tugas

"Buat peta dari file ini, pastikan kedua wilayah cocok, gunakan metode warna yang Anda pahami, tulis sumber dan periode, lalu ekspor SVG atau PNG. Jangan membaca panduan panjang terlebih dahulu."

## Catatan fasilitator

Ukur waktu untuk preview valid pertama, dataset terselesaikan, peta valid pertama, dan ekspor pertama. Catat setiap error yang menghentikan tugas dan setiap pilihan yang tidak dipahami peserta. Target controlled task adalah selesai dalam lima menit.

## Kriteria lulus

- Peserta dapat mencapai alur Input → Match → Visualize → Export.
- Tidak ada nama ambigu yang diterapkan tanpa tindakan peserta.
- Peserta dapat menjelaskan bahwa Tidak ada data bukan nol.
- Sumber/periode dan atribusi boundary terlihat terpisah.
- Ekspor berhasil tanpa data meninggalkan browser.

## Bukti otomatis pendamping

`tests/e2e/smoke.spec.js` menyimpan `artifacts/batch-1/first-user-flow.json` untuk dataset sintetis tiga kolom (`wilayah`, `provinsi`, `nilai`). Kolom provinsi sengaja dipakai agar nama yang berpotensi sama tidak diterapkan secara ambigu. Tes ini mengukur interaksi otomatis, bukan pemahaman manusia.
