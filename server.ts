import express, { Request, Response } from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

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
      ? `Anda adalah ahli bahasa linguistik Indonesia dan daerah (Jawa/Sunda) yang menguasai sistem penulisan abjad Arab Pegon dan Arab Melayu (Jawi).
Tugas Anda adalah melakukan transliterasi balik dari teks bertulisan aksara Arab Pegon (atau Jawi) menjadi teks Latin bahasa Indonesia yang tepat, baku, dan natural.
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
      : `Anda adalah ahli bahasa linguistik dan kaligrafi tradisional Indonesia yang menguasai sistem penulisan Arab Melayu (Jawi) dan Arab Pegon Jawa/Sunda.
Tugas Anda adalah melakukan transliterasi teks Latin bahasa Indonesia menjadi tulisan Arab yang sesuai dengan standar pilihan pengguna secara akurat, kontekstual, dan rapi.

PENTING - KETENTUAN KHUSUS AYAT AL-QUR'AN DAN HADITS:
Jika teks input mengandung kutipan ayat Al-Qur'an (baik teks latin ayatnya, terjemahan, ataupun penyebutan surah/ayat seperti 'QS Al Baqarah' atau 'Al-Baqarah:183') atau kutipan lafaz / teks Hadits (seperti 'innama a'malu binniyat' atau 'Hadits pilar islam'):
1. Tuliskan teks Arab yang murni/orisinil dan BAKU, lengkap dengan tanda harakat/syakal secara sempurna (fathah, dammah, kasrah, sukun, shaddah, tanween). JANGAN menggunakan ejaan modifikasi Pegon atau Jawi tanpa harakat jika itu adalah kutipan Al-Qur'an/Hadits.
2. Sertakan sumber rujukan/dalilnya secara lengkap di akhir teks Arab tersebut yang ditulis dalam AKSARA ARAB BAKU (Arab Standar) (misalnya: (البقرة: ١٨٣) atau (رواية البخاري)) agar valid, informatif, dan autentik bagi pembaca. PENTING: JANGAN cantumkan kata "سورة" (surat/surah) di awal nama surah, langsung tulis nama surahnya (contoh: "(البقرة: ١٨٣)" bukan "(سورة البقرة: ١٨٣)").
3. JANGAN menambahkan terjemahan bahasa Indonesia, arti kata, detail tafsir, ataupun makna kandungan ayat/hadits ke dalam bagian "explanation". Bagian explanation hanya diisi penjelasan linguistik teknis transliterasi atau nama rujukan dalil secara singkat ditulis dalam AKSARA ARAB BAKU (Arab Standar) tanpa kata "سورة" atau "surat" di awal surah (misal: "مستخرج من البقرة: ١٨٣").

PILIHAN FORMAT TRANSLITERASI UMUM:
- "jawi" (Arab Melayu): Gunakan kaidah baku Arab Melayu. Perhatikan penggunaan huruf saksi (alif, ya, wawu), penghapusan vokal di suku kata tertutup, huruf k ganda/glottal stop sebagai qaf di akhir kata (seperti 'bapak' -> 'باڤق'), imbuhan terikat (di-, se-, ke-) yang disatukan, serta penulisan kata serapan Arab kustom.
- "pegon" (Arab Pegon Jawa/Sunda): Tulis secara fonetis lengkap menggunakan huruf saksi Pegon tradisional, termasuk menyemir vokal i, u, o, dan e secara jelas.

ATURAN REFERENSI KUSTOM:
Pengguna telah memasukkan aturan referensi kustom di bawah ini. Prioritaskan aturan dan kesepakatan penulisan kata ini jika diberikan, kecuali untuk ayat Al-Qur'an atau Hadits:
${JSON.stringify(customRules || [], null, 2)}

Harap berikan respons sebagai objek JSON dengan format schema berikut:
{
  "translation": "teks arab terjemahan / ayat Al-Qur'an murni lengkap dengan harakat dan sumber dalilnya dalam aksara arab baku",
  "explanation": "penjelasan aturan penulisan yang diterapkan atau sumber rujukan dalil dalam aksara arab baku secara sangat singkat (tanpa terjemahan, tanpa tafsir, dan tanpa arti)"
}`;

    const prompt = isReverse
      ? `Lakukan transliterasi teks Arab Pegon/Jawi berikut kembali menjadi teks alfabet Latin Bahasa Indonesia yang baku.

Teks Arab:
"${text}"`
      : `Lakukan transliterasi teks Latin Indonesia berikut menjadi tulisan Arab berformat "${preset || "pegon"}".

Teks Latin:
"${text}"

Tulis hasilnya dalam bahasa Arab yang rapi dengan arah Right-to-Left (RTL) yang sempurna menggunakan huruf-huruf Arab Jawi/Pegon seperti چ, ڠ, ݢ, ڽ, ڤ.`;

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
              description: isReverse ? "Hasil pembacaan aksara ke teks Latin biasa." : "Hasil transliterasi Arab Melayu / Pegon.",
            },
            explanation: {
              type: Type.STRING,
              description: "Penjelasan linguistik dan detail ejaan yang digunakan.",
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

// API endpoint for Google Sheets synchronization (backend proxy)
app.post("/api/sheets/append", async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: "Authorization header (Bearer token) diperlukan." });
    }

    const { spreadsheetId, values } = req.body;

    if (!spreadsheetId) {
      return res.status(400).json({ error: "ID Spreadsheet (spreadsheetId) diperlukan." });
    }

    if (!values || !Array.isArray(values) || values.length === 0) {
      return res.status(400).json({ error: "Pilih atau susun baris data (values) yang ingin disimpan." });
    }

    const range = "A:H"; // Logs to Columns A to H
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        values: values,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Sheets API backend error response:", errorText);
      return res.status(response.status).json({
        error: "Google Sheets API mengembalikan kesalahan dari server.",
        details: errorText,
      });
    }

    const result = await response.json();
    return res.json(result);
  } catch (error: any) {
    console.error("Backend sheets proxy error:", error);
    return res.status(500).json({
      error: "Gagal menyinkronkan data ke Google Sheets melalui back-end.",
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
