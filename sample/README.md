# File contoh untuk trial

Semua file di folder ini menggunakan data sintetis dan tidak berisi data perusahaan.

- `trial-pengguna-awam.csv`: alur utama Input → Match → Visualize → Export. Kolom `wilayah`, `provinsi`, dan `nilai` sengaja mudah dibaca; baris Bogor bernilai `0` untuk membedakan nol dari data kosong.
- `trial-dua-kolom-kode.csv`: alur cepat dua kolom dengan kode wilayah resmi dan nilai. Ini menguji pencocokan deterministik tanpa ambiguity berbasis nama.
- `contoh-nilai-kota.csv`: sample minimal dua wilayah yang juga dipakai oleh protokol uji pengguna pertama.

Untuk trial manual, mulai dari `trial-pengguna-awam.csv`. Berikan file kepada tester tanpa instruksi UI tambahan, lalu minta tester membuat peta, memastikan wilayah cocok, memilih metode warna, mengisi sumber/periode, dan mengekspor SVG atau PNG.
