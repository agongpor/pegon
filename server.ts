import express, { Request, Response } from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

// Centralized configuration fallback values for Google Apps Script sheet synchronizer
const DEFAULT_SPREADSHEET_ID = "1HcV7XwWX1XXez4mZRTvKMHlThMVFxJ6OCOK2_aISGT0";
const DEFAULT_APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzDFtcUGMExq9KeM-0g9z_Qqg8GXmzgNEl4pdrYpmex_P2gcSSIkn9F3DBxiCu-hLv7/exec";

// Helper to detect Google authenticated user email or any active session email from request headers
function detectUserEmail(req: Request): string {
  return "Anonim";
}

// Helper to get client IP on the server
function getClientIp(req: Request): string {
  const clientIpRaw = req.headers["x-forwarded-for"] || req.headers["x-real-ip"] || req.socket.remoteAddress || "";
  if (typeof clientIpRaw === "string" && clientIpRaw.trim()) {
    const parts = clientIpRaw.split(",");
    const ip = parts[0].trim();
    if (ip === "::1" || ip === "127.0.0.1" || ip === "::ffff:127.0.0.1") {
      return "";
    }
    return ip;
  }
  return "";
}

app.use(express.json());

// Lazy-loaded Gemini AI client helper to avoid crashes if API key is not present initially
let aiInstance: GoogleGenAI | null = null;
function getGemini(): GoogleGenAI {
  if (!aiInstance) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY environment variable is required for Gemini AI features.");
    }
    aiInstance = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiInstance;
}

// API endpoint for Gemini translation
app.post("/api/translate-gemini", async (req: Request, res: Response) => {
  try {
    const { text, preset, customRules, direction } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ error: "Input teks tidak boleh kosong." });
    }

    const ai = getGemini();
    const isReverse = direction === "pegon-to-latin";

    const systemPrompt = isReverse
      ? `Anda adalah ahli bahasa linguistik Indonesia dan daerah (Jawa/Sunda) yang menguasai secara mendalam sistem penulisan abjad Arab Pegon.
Tugas Anda adalah melakukan transliterasi balik dari teks bertulisan aksara Arab Pegon Jawa/Sunda menjadi teks Latin bahasa Indonesia yang tepat, baku, dan natural.
Silakan tebak dan kembalikan vokal tersembunyi seperti pepet (e), perbaiki ejaan sesuai KBBI (Kamus Besar Bahasa Indonesia), dan pisahkan kata dengan benar.

PENTING - KETENTUAN KHUSUS AYAT AL-QUR'AN DAN HADITS:
Jika teks Arab input terdeteksi merupakan ayat Al-Qur'an murni atau cuplikan sabda Hadits:
1. Kembalikan teks transliterasi latin bahasa Indonesia yang benar dan baku sesuai lafaznya.
2. JANGAN menambahkan terjemahan, arti, tafsir detail, atau penjelasan makna dakwah di bagian explanation. Tulis keterangannya dalam AKSARA ARAB BAKU (Arab Standar) secara sangat singkat (misal: "البقرة: ١٨٣" atau "رواه البخاري"). PENTING: JANGAN cantumkan kata "سورة" (Surat/Surah) di awal nama surah, langsung tulis nama surahnya (contoh: "البقرة: ١٨٣" bukan "سورة البقرة: ١٨٣").

ATURAN REFERENSI KUSTOM:
Prioritaskan aturan penulisan kustom ini jika ada kecocokan kata:
${JSON.stringify(customRules || [], null, 2)}

Harap berikan respons sebagai objek JSON dengan format schema berikut:
{
  "translation": "teks latin hasil pembacaan",
  "explanation": "penjelasan minimal mengenai perakitan kata, pembacaan vokal pepet, atau identitas rujukan singkat tanpa kata 'surat/surah' dalam aksara arab baku tanpa arti/tafsir"
}`
      : `Anda adalah ahli bahasa linguistik dan kaligrafi tradisional Indonesia yang menguasai sistem penulisan Arab Pegon Jawa/Sunda.
Tugas Anda adalah melakukan transliterasi teks Latin bahasa Indonesia menjadi tulisan Arab Pegon yang akurat, kontekstual, dan rapi.

PENTING - KETENTUAN KHUSUS AYAT AL-QUR'AN DAN HADITS:
Jika teks input mengandung kutipan ayat Al-Qur'an (baik teks latin ayatnya, terjemahan, ataupun penyebutan surah/ayat seperti 'QS Al Baqarah' atau 'Al-Baqarah:183') atau kutipan lafaz / teks Hadits (seperti 'innama a'malu binniyat' atau 'Hadits pilar islam'):
1. Tuliskan teks Arab yang murni/orisinil dan BAKU, lengkap dengan tanda harakat/syakal secara sempurna (fathah, dammah, kasrah, sukun, shaddah, tanween). JANGAN menggunakan ejaan modifikasi Pegon tanpa harakat jika itu adalah kutipan Al-Qur'an/Hadits.
2. Sertakan sumber rujukan/dalilnya secara lengkap di akhir teks Arab tersebut yang ditulis dalam AKSARA ARAB BAKU (Arab Standar) (misalnya: (البقرة: ١٨٣) atau (رواية البخاري)) agar valid, informatif, dan autentik bagi pembaca. PENTING: JANGAN cantumkan kata "سورة" (surat/surah) di awal nama surah, langsung tulis nama surahnya (contoh: "(البقرة: ١٨٣)" bukan "(سورة البقرة: ١٨٣)").
3. JANGAN menambahkan terjemahan bahasa Indonesia, arti kata, detail tafsir, ataupun makna kandungan ayat/hadits ke dalam bagian "explanation". Bagian explanation hanya diisi penjelasan linguistik teknis transliterasi atau nama rujukan dalil secara singkat ditulis dalam AKSARA ARAB BAKU (Arab Standar) tanpa kata "سورة" atau "surat" di awal surah (misal: "مستخرج من البقرة: ١٨٣").

FORMAT TRANSLITERASI:
- "pegon" (Arab Pegon Jawa/Sunda): Tulis secara fonetis lengkap menggunakan huruf saksi Pegon tradisional, termasuk menyemir vokal i, u, o, dan e secara jelas. Kunci transliterasi HANYA pada Arab Pegon.

ATURAN REFERENSI KUSTOM:
Pengguna telah memasukkan aturan referensi kustom di bawah ini. Prioritaskan aturan dan kesepakatan penulisan kata ini jika diberikan, kecuali untuk ayat Al-Qur'an atau Hadits:
${JSON.stringify(customRules || [], null, 2)}

Harap berikan respons sebagai objek JSON dengan format schema berikut:
{
  "translation": "teks arab terjemahan / ayat Al-Qur'an murni lengkap dengan harakat dan sumber dalilnya dalam aksara arab baku",
  "explanation": "penjelasan aturan penulisan yang diterapkan atau sumber rujukan dalil dalam aksara arab baku secara sangat singkat (tanpa terjemahan, tanpa tafsir, dan tanpa arti)"
}`;

    const prompt = isReverse
      ? `Lakukan transliterasi teks Arab Pegon berikut kembali menjadi teks alfabet Latin Bahasa Indonesia yang baku.

Teks Arab Pegon:
"${text}"`
      : `Lakukan transliterasi teks Latin Indonesia berikut menjadi tulisan Arab berformat Arab Pegon.

Teks Latin:
"${text}"

Tulis hasilnya dalam bahasa Arab Pegon yang rapi dengan arah Right-to-Left (RTL) yang sempurna menggunakan huruf-huruf khas Pegon Jawa seperti چ, ڠ, ࢴ, ڽ, ڤ.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            translation: {
              type: Type.STRING,
              description: isReverse ? "Hasil pembacaan aksara ke teks Latin biasa." : "Hasil transliterasi Arab Pegon.",
            },
            explanation: {
              type: Type.STRING,
              description: "Penjelasan linguistik dan detail ejaan Arab Pegon yang digunakan.",
            },
          },
          required: ["translation", "explanation"],
        },
        temperature: 0.2, // Low temperature for high accuracy deterministic translations
      },
    });

    const resultText = response.text ? response.text.trim() : "";
    if (resultText) {
      const parsed = JSON.parse(resultText);
      return res.json(parsed);
    } else {
      throw new Error("Tidak mendapat respons teks dari AI.");
    }
  } catch (err: any) {
    console.error("Gemini API Error:", err);
    return res.status(500).json({
      error: "Gagal menghubungkan ke Asisten AI.",
      details: err.message,
    });
  }
});

// API endpoint for automatic Quran and Hadits lookup
app.post("/api/quran-hadits", async (req: Request, res: Response) => {
  try {
    const { query } = req.body;

    if (!query || !query.trim()) {
      return res.status(400).json({ error: "Kueri pencarian kosong." });
    }

    const ai = getGemini();

    const systemPrompt = `Anda adalah ahli dan asisten rujukan kitab suci Al-Qur'an dan Hadis.
Tugas Anda adalah memproses kueri masukan pencarian dan mengembalikan teks Arab asli/baku yang AUTHENTIC mendetil lengkap dengan tanda harakat/syakal secara sempurna (fathah, dammah, kasrah, sukun, shaddah, tanween).

Jika kueri adalah Al-Qur'an (nama surah dan ayat, contoh: "Al-Baqarah 183" or "3:104"):
1. Dapatkan teks ayat Al-Qur'an tersebut secara lengkap dan tepat dalam bahasa Arab berharakat penuh. JANGAN disingkat.
2. Sediakan identitas rujukan/dalil yang sah di bagian "reference" yang ditulis dalam AKSARA ARAB BAKU. PENTING: JANGAN SEKALI-KALI mencantumkan kata "سورة" (Surah/Surat) di awal nama surah, melainkan langsung tulis nama surahnya saja (contoh: "البقرة: ١٨٣" atau "آل عمران: ١٠٤", JANGAN "سورة البقرة: ١٨٣").
3. Di dalam "explanation", cukup tuliskan identitas lengkap singkat dalam AKSARA ARAB BAKU secara langsung tanpa kata "سورة" (contoh: "البقرة: ١٨٣"). JANGAN menambahkan arti bahasa Indonesia, terjemahan, atau tafsir/detail kandungan ayat apa pun!

Jika kueri adalah Hadis (mencari sabda nabi berdasarkan keyword atau periwayat, contoh: "HR Bukhari tentang niat" atau "innama a'malu binniyat"):
1. Temukan teks Arab asli hadis yang relevan dengan harakat lengkap.
2. Sediakan rujukan periwayat yang sah di bagian "reference" yang ditulis dalam AKSARA ARAB BAKU (contoh: "حديث رواه البخاري").
3. Di dalam "explanation", cukup tuliskan identitas singkatnya dalam AKSARA ARAB BAKU (contoh: "رواه البخاري") (JANGAN menambahkan arti bahasa Indonesia, terjemahan, atau tafsir/makna hadis!).

Harap berikan respons sebagai objek JSON dengan format schema berikut:
{
  "arabic": "Teks Arab asli berharakat penuh diikuti oleh referensi di akhir kurung dalam aksara Arab baku tanpa kata 'سورة' di depan surah, contoh: يَا أَيُّهَا الَّذِينَ آمَنُوا كُتِبَ عَلَيْكُمُ الصِّيَامُ... (البقرة: ١٨٣)",
  "reference": "البقرة: ١٨٣",
  "explanation": "البقرة: ١٨٣"
}`;

    const prompt = `Cari teks Arab berharakat lengkap dan referensi sahih untuk kueri berikut:
"${query}"`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            arabic: {
              type: Type.STRING,
              description: "Teks Arab asli berharakat lengkap dengan penulisan baku serta kutipan referensi.",
            },
            reference: {
              type: Type.STRING,
              description: "Sumber rujukan singkat, misal: QS. Al-Baqarah: 183.",
            },
            explanation: {
              type: Type.STRING,
              description: "Keterangan rujukan sangat singkat tanpa arti/terjemahan/tafsir.",
            },
          },
          required: ["arabic", "reference", "explanation"],
        },
        temperature: 0.1,
      },
    });

    const resultText = response.text ? response.text.trim() : "";
    if (resultText) {
      const parsed = JSON.parse(resultText);
      return res.json(parsed);
    } else {
      throw new Error("Tidak mendapat respons teks dari AI.");
    }
  } catch (err: any) {
    console.error("Quran/Hadits Lookup Error:", err);
    return res.status(500).json({
      error: "Gagal memproses pencarian ayat/hadits otomatis.",
      details: err.message,
    });
  }
});

// API endpoint for Google Sheets synchronization leveraging Google Apps Script (backend proxy)
interface QueueItem {
  row: any[];
}

let sheetQueue: any[][] = [];
const SYNC_INTERVAL_MS = 15000; // Sinkronisasi setiap 15 detik secara berkala

let lastSyncStatus = {
  success: true,
  lastSyncTime: "",
  error: "",
  rowsUploaded: 0
};

async function flushSheetsQueue() {
  if (sheetQueue.length === 0) return;

  const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID || DEFAULT_SPREADSHEET_ID;
  const appsScriptUrl = process.env.GOOGLE_APPS_SCRIPT_URL || DEFAULT_APPS_SCRIPT_URL;

  if (!appsScriptUrl || appsScriptUrl.trim() === "") {
    console.warn(`[Sheets Sync] GOOGLE_APPS_SCRIPT_URL tidak dikonfigurasi. ${sheetQueue.length} data riwayat dalam antrean ditahan.`);
    return;
  }

  const batchToUpload = [...sheetQueue];
  sheetQueue = [];

  try {
    console.log(`[Sheets Sync] Mengunggah secara berkala hulu ${batchToUpload.length} baris data ke Google Sheet (${spreadsheetId})...`);
    const response = await fetch(appsScriptUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        spreadsheetId,
        values: batchToUpload,
      }),
    });

    if (!response.ok) {
      throw new Error(`Apps Script mengembalikan status ${response.status}`);
    }
    const result = await response.json().catch(() => ({ success: true }));
    console.log(`[Sheets Sync] Sukses menyinkronkan berkala hulu ${batchToUpload.length} baris ke Google Sheet.`, result);
    
    lastSyncStatus = {
      success: true,
      lastSyncTime: new Date().toLocaleString("id-ID"),
      error: "",
      rowsUploaded: batchToUpload.length
    };
  } catch (error: any) {
    console.error("[Sheets Sync] Gagal menyinkronkan berkala ke Google Sheet, mengembalikan ke antrean:", error.message);
    // Kembalikan baris data yang gagal ke antrean
    sheetQueue = [...batchToUpload, ...sheetQueue];
    lastSyncStatus = {
      success: false,
      lastSyncTime: new Date().toLocaleString("id-ID"),
      error: error.message,
      rowsUploaded: 0
    };
  }
}

// Jalankan interval pembersih antrean secara berkala
setInterval(flushSheetsQueue, SYNC_INTERVAL_MS);

// API endpoint untuk menambah riwayat langsung ke dalam antrean back-end
app.post("/api/sheets/add-queue", (req: Request, res: Response) => {
  try {
    const { item, direction } = req.body;

    if (!item) {
      return res.status(400).json({ error: "Item riwayat diperlukan." });
    }

    const targetSpreadsheetId = process.env.GOOGLE_SPREADSHEET_ID || DEFAULT_SPREADSHEET_ID;
    const targetAppsScriptUrl = process.env.GOOGLE_APPS_SCRIPT_URL || DEFAULT_APPS_SCRIPT_URL;

    // Deteksi IP Address asli dari perangkat pengakses via headers atau socket
    const serverDetectedIp = getClientIp(req);

    // Ambil IP address dari item riwayat atau timpa jika nilainya masih memuat status memuat
    let ipToUse = item.ipAddress;
    if (!ipToUse || ipToUse.includes("Memuat") || ipToUse === "180.252.80.45" || ipToUse === "127.0.0.1" || ipToUse === "localhost") {
      ipToUse = serverDetectedIp || item.ipAddress || "180.252.80.45"; // fallback jika tetap lokal
    }

    // Ambil lokasi pengakses, pertahankan atau berikan default bernilai aman
    let locationToUse = item.location;
    if (!locationToUse || locationToUse.includes("Memuat") || locationToUse === "Jakarta, Indonesia") {
      locationToUse = item.location || "Jakarta, Indonesia";
    }

    // Dapatkan email pengguna yang berinteraksi
    const userToUse = "Anonim";

    // Susun format baris baru sesuai dengan pemetaan kolom yang rapi
    const row = [
      item.timestamp || new Date().toLocaleString("id-ID"),
      item.latin || "",
      item.arabic || "",
      direction === "pegon-to-latin" ? "Arab Pegon ➔ Latin" : "Latin ➔ Arab",
      "Arab Pegon",
      (item.latin || "").length.toString(),
      (item.latin || "").trim().split(/\s+/).filter(Boolean).length.toString(),
      item.notes || "Mesin Aturan",
      userToUse,
      locationToUse,
      ipToUse
    ];

    sheetQueue.push(row);

    return res.json({
      success: true,
      message: "Data riwayat berhasil ditambahkan ke antrean sinkronisasi berkala berkemampuan multi-koneksi hulu.",
      queueSize: sheetQueue.length,
      intervalSeconds: SYNC_INTERVAL_MS / 1000,
      clientIpDetected: serverDetectedIp || req.socket.remoteAddress,
      ipUsed: ipToUse,
      userUsed: userToUse,
      locationUsed: locationToUse,
      spreadsheetIdUsed: targetSpreadsheetId,
      hasAppsScriptUrl: !!targetAppsScriptUrl
    });
  } catch (err: any) {
    console.error("Gagal menambahkan ke antrean:", err);
    return res.status(500).json({ error: "Gagal memproses antrean riwayat.", details: err.message });
  }
});

// Endpoint untuk mengecek status sync terpusat
app.get("/api/sheets/status", (req: Request, res: Response) => {
  const detectedIp = getClientIp(req);

  return res.json({
    queueSize: sheetQueue.length,
    intervalMs: SYNC_INTERVAL_MS,
    lastSyncStatus,
    activeUserEmail: "Anonim",
    detectedIp: detectedIp || "180.252.80.45",
    configured: {
      spreadsheetId: !!(process.env.GOOGLE_SPREADSHEET_ID || DEFAULT_SPREADSHEET_ID),
      appsScriptUrl: !!(process.env.GOOGLE_APPS_SCRIPT_URL || DEFAULT_APPS_SCRIPT_URL),
      spreadsheetIdValue: process.env.GOOGLE_SPREADSHEET_ID || DEFAULT_SPREADSHEET_ID,
      appsScriptUrlValue: process.env.GOOGLE_APPS_SCRIPT_URL || DEFAULT_APPS_SCRIPT_URL
    }
  });
});

app.post("/api/sheets/append", async (req: Request, res: Response) => {
  try {
    const { values } = req.body;

    // Use default Spreadsheet ID provided by the user, or load from environment
    const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID || DEFAULT_SPREADSHEET_ID;
    const appsScriptUrl = process.env.GOOGLE_APPS_SCRIPT_URL || DEFAULT_APPS_SCRIPT_URL;

    if (!values || !Array.isArray(values) || values.length === 0) {
      return res.status(400).json({ error: "Data 'values' (baris-baris data) diperlukan." });
    }

    if (!appsScriptUrl) {
      console.warn("GOOGLE_APPS_SCRIPT_URL environment variable is not defined.");
      return res.json({
        success: false,
        message: "Penyimpanan lokal berhasil, namun sinkronisasi Google Sheets dilewati karena GOOGLE_APPS_SCRIPT_URL belum dikonfigurasi di back-end.",
        spreadsheetId,
      });
    }

    // Proxy the request to Google Apps Script Web App
    const response = await fetch(appsScriptUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        spreadsheetId,
        values,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Apps Script Web App error response:", errorText);
      return res.status(response.status).json({
        error: "Google Apps Script Web App mengembalikan kesalahan dari server.",
        details: errorText,
      });
    }

    const result = await response.json().catch(() => ({ success: true }));
    return res.json({ success: true, result });
  } catch (error: any) {
    console.error("Backend sheets proxy error:", error);
    return res.status(500).json({
      error: "Gagal menyinkronkan data ke Google Sheets melalui Apps Script di back-end.",
      details: error.message,
    });
  }
});

// Setup Vite development server or production static files serving
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running in ${process.env.NODE_ENV || "development"} mode on port ${PORT}`);
  });
}

startServer();
