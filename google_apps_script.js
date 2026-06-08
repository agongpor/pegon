/**
 * Google Apps Script Web App for Aksara Transliteration Sheet Sync.
 * 
 * CARA DEPLOY:
 * 1. Buka Google Sheets baru atau Sheets yang sudah ada.
 * 2. Klik menu "Extensions" -> "Apps Script" (Ekstensi -> Apps Script).
 * 3. Hapus kode default yang ada di dalamnya, lalu tempelkan (paste) seluruh kode di bawah ini.
 * 4. Klik ikon Simpan (Save) atau tekan Ctrl+S.
 * 5. Klik tombol "Deploy" di bagian kanan atas -> pilih "New deployment".
 * 6. Klik ikon gir (pilihan jenis deployment) dan pilih "Web app".
 * 7. Konfigurasikan pengaturannya sebagai berikut:
 *    - Description: "Aksara Sync"
 *    - Execute as: "Me (email Anda)"
 *    - Who has access: "Anyone" (HARUS "Anyone" agar sistem back-end aplikasi dapat menyinkronkan data secara otomatis).
 * 8. Klik "Deploy". Google akan meminta izin akses ("Authorize Access"). Klik tombol tersebut, pilih akun Google Anda, klik "Advanced", lalu pilih "Go to Untitled project (unsafe)" dan klik "Allow".
 * 9. Salin URL Web App yang dihasilkan (URL yang berakhiran /exec).
 * 10. Masukkan URL tersebut ke variabel lingkungan (environment variable) `GOOGLE_APPS_SCRIPT_URL` di pengaturan back-end aplikasi Anda!
 */

function doPost(e) {
  try {
    // Validasi data masukan dari request body
    if (!e || !e.postData || !e.postData.contents) {
      return createJsonResponse({
        success: false,
        error: "Data kosong/tidak valid (No post data provided)"
      });
    }

    // Parsing JSON request payload
    var payload;
    try {
      payload = JSON.parse(e.postData.contents);
    } catch (parseErr) {
      return createJsonResponse({
        success: false,
        error: "Format body harus berupa JSON: " + parseErr.toString()
      });
    }

    var spreadsheetId = payload.spreadsheetId;
    var values = payload.values;

    if (!values || !Array.isArray(values) || values.length === 0) {
      return createJsonResponse({
        success: false,
        error: "Data 'values' berupa array kosong atau tidak valid"
      });
    }

    // Buka Spreadsheet menggunakan ID yang dikirim, jika kosong buka Spreadsheet yang aktif
    var ss;
    if (spreadsheetId) {
      ss = SpreadsheetApp.openById(spreadsheetId);
    } else {
      ss = SpreadsheetApp.getActiveSpreadsheet();
    }

    if (!ss) {
      return createJsonResponse({
        success: false,
        error: "Spreadsheet tidak ditemukan atau tidak memiliki hak akses."
      });
    }

    // Gunakan sheet pertama secara default
    var sheet = ss.getSheets()[0];

    // Jika sheet kosong sama sekali, tambahkan header kolom secara otomatis agar rapi
    if (sheet.getLastRow() === 0) {
      var headerRow = [
        "Waktu Transliterasi",
        "Teks Asal (Latin)",
        "Hasil Aksara (Arab Pegon/Jawi)",
        "Tipe Transliterasi (Pegon/Jawi)",
        "Metode (Manual/AI)",
        "Panjang Karakter",
        "Jumlah Kata",
        "Keterangan/Saran"
      ];
      sheet.appendRow(headerRow);
    }

    // Append baris-baris data dari array values
    for (var i = 0; i < values.length; i++) {
      var rowData = values[i];
      if (Array.isArray(rowData)) {
        sheet.appendRow(rowData);
      }
    }

    return createJsonResponse({
      success: true,
      message: "Sukses menyinkronkan data ke Google Sheets (" + values.length + " baris ditambahkan)",
      spreadsheetUrl: ss.getUrl()
    });

  } catch (error) {
    return createJsonResponse({
      success: false,
      error: "Terjadi kesalahan sistem internal Apps Script: " + error.toString()
    });
  }
}

// Helper untuk membuat JSON response dengan CORS enabled
function createJsonResponse(obj) {
  var jsonString = JSON.stringify(obj);
  return ContentService.createTextOutput(jsonString)
    .setMimeType(ContentService.MimeType.JSON);
}

// Fungsi doGet sebagai endpoint ping uji coba dan deteksi email otomatis
function doGet(e) {
  var activeEmail = "";
  try {
    activeEmail = Session.getActiveUser().getEmail();
  } catch (err) {}
  if (!activeEmail) {
    try {
      activeEmail = Session.getEffectiveUser().getEmail();
    } catch (err) {}
  }
  return createJsonResponse({
    success: true,
    message: "Koneksi Google Apps Script Web App berhasil aktif!",
    ownerEmail: activeEmail
  });
}
