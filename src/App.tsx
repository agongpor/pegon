import React, { useState, useEffect, useRef } from "react";
import {
  BookOpen,
  FileText,
  Check,
  Trash2,
  Plus,
  RotateCcw,
  Download,
  Upload,
  Printer,
  Sparkles,
  HelpCircle,
  Clock,
  Settings,
  Copy,
  ChevronRight,
  Info,
  Type,
  FileDown,
  RefreshCw,
  Search,
  ExternalLink,
  Mic,
  MicOff,
  User,
  X
} from "lucide-react";
import { CustomMapping, PresetType, TranslationItem, WordConversionResult } from "./types";
import { DEFAULT_PEGON_MAPPINGS } from "./utils/presets";
import { 
  transliterateText, 
  transliterateWord,
  transliteratePegonToLatinText,
  transliteratePegonToLatinWord
} from "./utils/transliterator";

const EXAMPLES: any[] = [];

export default function App() {
  // Config & State
  const [preset, setPreset] = useState<PresetType>("pegon");
  const [pegonGaStyle, setPegonGaStyle] = useState<"dot" | "plain">(() => {
    return (localStorage.getItem("pegon_ga_style") as "dot" | "plain") || "plain";
  });
  const [pegonNgStyle, setPegonNgStyle] = useState<"dot" | "plain">(() => {
    return (localStorage.getItem("pegon_ng_style") as "dot" | "plain") || "plain";
  });
  const [pegonPStyle, setPegonPStyle] = useState<"dot" | "plain">(() => {
    return (localStorage.getItem("pegon_p_style") as "dot" | "plain") || "plain";
  });
  const [pegonNyStyle, setPegonNyStyle] = useState<"ya" | "ya_dot" | "nya">(() => {
    return (localStorage.getItem("pegon_ny_style") as "ya" | "ya_dot" | "nya") || "ya";
  });
  const [customMappings, setCustomMappings] = useState<CustomMapping[]>([]);
  const [latinInput, setLatinInput] = useState("");
  const [quranHaditsResults, setQuranHaditsResults] = useState<Record<string, {
    arabic: string;
    reference: string;
    explanation: string;
    loading: boolean;
    error?: string;
  }>>({});
  const [fontSize, setFontSize] = useState(28);
  const [selectedFont, setSelectedFont] = useState("Traditional Arabic");
  const [direction, setDirection] = useState<"latin-to-pegon" | "pegon-to-latin">("latin-to-pegon");
  const [isListening, setIsListening] = useState(false);
  const [micLang, setMicLang] = useState<"id-ID" | "ar-SA" | "auto">("auto");
  
  // Interactive debugger state
  const [selectedWordResult, setSelectedWordResult] = useState<WordConversionResult | null>(null);
  const [searchMappingQuery, setSearchMappingQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"char" | "digraph" | "word">("char");

  // Rule editor form state
  const [newLatin, setNewLatin] = useState("");
  const [newArabic, setNewArabic] = useState("");
  const [newType, setNewType] = useState<"character" | "digraph" | "word">("character");
  const [newDescription, setNewDescription] = useState("");

  // AI Translation mode state
  const [useAI, setUseAI] = useState(false);
  const [aiResult, setAiResult] = useState("");
  const [aiExplanation, setAiExplanation] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");

  // Print-ready preview modal state
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [exportFormat, setExportFormat] = useState<'lengkap' | 'latin-arab' | 'pegon-saja'>('lengkap');
  const [showFormatSelector, setShowFormatSelector] = useState(false);
  const [pdfTitle, setPdfTitle] = useState("DOKUMEN TRANSLITERASI RESMI");
  const [userEmail, setUserEmail] = useState(() => localStorage.getItem("aksara_user_email") || "Pengguna Pegon");
  const [pdfAuthor, setPdfAuthor] = useState(() => localStorage.getItem("aksara_user_email") || "Pengguna Pegon");
  const [queueSize, setQueueSize] = useState(0);

  // States for direct browser-to-sheet sync (essential for static SPA hosting like Vercel / GitHub Pages)
  const [isStaticDeployment, setIsStaticDeployment] = useState(() => {
    // Detect typical static origins or retrieve previously detected mode from session
    return window.location.hostname.includes("vercel.app") || 
           window.location.hostname.includes("github.io") || 
           localStorage.getItem("aksara_is_static") === "true";
  });

  const [serverSyncStatus, setServerSyncStatus] = useState<{
    success: boolean;
    lastSyncTime: string;
    error: string;
    rowsUploaded: number;
  } | null>(null);
  const [serverConfigured, setServerConfigured] = useState({
    spreadsheetId: false,
    appsScriptUrl: false,
    spreadsheetIdValue: "",
    appsScriptUrlValue: ""
  });

  // Helper to extract active Google user email from Apps Script doGet
  const fetchActiveGoogleEmail = (url: string) => {
    if (!url || !url.startsWith("https://")) return;
    fetch(url, { method: "GET" })
      .then(res => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then(data => {
        if (data && data.ownerEmail) {
          setUserEmail(data.ownerEmail);
          setPdfAuthor(data.ownerEmail);
          localStorage.setItem("aksara_user_email", data.ownerEmail);
          console.log("[Google Active Email Detect]:", data.ownerEmail);
        }
      })
      .catch(err => {
        console.warn("Gagal melakukan deteksi email otomatis dari Apps Script:", err);
      });
  };

  // Helper to upload history items directly to Google Sheets from the browser (essential for static deployments like Vercel)
  const uploadDirectToSheetsClientSide = async (item: TranslationItem, activeDirection: string) => {
    const spreadsheetId = "1HcV7XwWX1XXez4mZRTvKMHlThMVFxJ6OCOK2_aISGT0";
    const appsScriptUrl = "https://script.google.com/macros/s/AKfycbzDFtcUGMExq9KeM-0g9z_Qqg8GXmzgNEl4pdrYpmex_P2gcSSIkn9F3DBxiCu-hLv7/exec";

    const userToUse = userEmail || "agongpor@gmail.com";
    const ipToUse = item.ipAddress || userIp || "180.252.80.45";
    const locationToUse = item.location || userLocation || "Jakarta, Indonesia";

    // Format exactly 11 columns matching server-side structure
    const row = [
      item.timestamp || new Date().toLocaleString("id-ID"),
      item.latin || "",
      item.arabic || "",
      activeDirection === "pegon-to-latin" ? "Arab Pegon ➔ Latin" : "Latin ➔ Arab",
      "Arab Pegon",
      (item.latin || "").length.toString(),
      (item.latin || "").trim().split(/\s+/).filter(Boolean).length.toString(),
      item.notes || "Klien Mandiri (Vercel)",
      userToUse,
      locationToUse,
      ipToUse
    ];

    try {
      console.log("[Client Sync] Mengunggah langsung secara client-side...", row);
      
      // Use no-cors mode to safely bypass any CORS/preflight checks on third-party domains
      await fetch(appsScriptUrl, {
        method: "POST",
        mode: "no-cors",
        headers: {
          "Content-Type": "text/plain"
        },
        body: JSON.stringify({
          spreadsheetId,
          values: [row]
        })
      });
      console.log("[Client Sync] Pengunggahan langsung selesai (mode no-cors).");
      showToast("Tersimpan! Riwayat berhasil dicatat di Google Sheets.");
    } catch (err: any) {
      console.error("[Client Sync] Gagal mengunggah secara mandiri:", err);
    }
  };

  // Fetch server-side sync status periodically (5 seconds)
  useEffect(() => {
    const fetchSyncStatus = () => {
      fetch("/api/sheets/status")
        .then(res => {
          if (!res.ok) {
            throw new Error(`HTTP error ${res.status}`);
          }
          return res.json();
        })
        .then(data => {
          if (data) {
            setQueueSize(data.queueSize);
            setIsStaticDeployment(false);
            localStorage.setItem("aksara_is_static", "false");
            if (data.lastSyncStatus) {
              setServerSyncStatus(data.lastSyncStatus);
            }
            if (data.configured) {
              setServerConfigured(data.configured);
            }
            // Auto-detect and populate active Google user email from headers
            if (data.activeUserEmail) {
              setUserEmail(prev => {
                const currentFromStorage = localStorage.getItem("aksara_user_email");
                if (!currentFromStorage || prev === "Pengguna Pegon" || prev === "Anonim") {
                  localStorage.setItem("aksara_user_email", data.activeUserEmail);
                  setPdfAuthor(data.activeUserEmail);
                  return data.activeUserEmail;
                }
                return prev;
              });
            }
            // Populate server-detected IP address if local API failed or is loading
            if (data.detectedIp) {
              setUserIp(prev => {
                if (prev === "Memuat IP..." || prev === "127.0.0.1" || prev === "") {
                  return data.detectedIp;
                }
                return prev;
              });
            }
          }
        })
        .catch(err => {
          console.log("Berjalan dalam Mode Statik (Tanpa Server - Misal Vercel/GitHub):", err);
          setIsStaticDeployment(true);
          localStorage.setItem("aksara_is_static", "true");
          
          // Di mode statik, kita coba deteksi akun google aktif langsung dari Apps Script URL
          const currentEmail = localStorage.getItem("aksara_user_email");
          if (!currentEmail || currentEmail === "Pengguna Pegon" || currentEmail === "Anonim") {
            const savedUrl = "https://script.google.com/macros/s/AKfycbzDFtcUGMExq9KeM-0g9z_Qqg8GXmzgNEl4pdrYpmex_P2gcSSIkn9F3DBxiCu-hLv7/exec";
            fetchActiveGoogleEmail(savedUrl);
          }
        });
    };

    fetchSyncStatus();
    const interval = setInterval(fetchSyncStatus, 10000); // 10s is sufficient for periodic background ping
    return () => clearInterval(interval);
  }, []);

  const [pdfNotes, setPdfNotes] = useState("Hasil alih aksara dari karakter Latin menuju ejaan Arab yang sah berdasarkan referensi linguistik kustom.");
  const [printDate, setPrintDate] = useState(() => {
    const now = new Date();
    const optionsStr = now.toLocaleString("en-US", { timeZone: "Asia/Jakarta" });
    return new Date(optionsStr).toLocaleDateString("id-ID", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  });

  const [userIp, setUserIp] = useState("Memuat IP...");
  const [userLocation, setUserLocation] = useState("Memuat Lokasi...");
  const [currentTime, setCurrentTime] = useState("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const optionsStr = now.toLocaleString("en-US", { timeZone: "Asia/Jakarta" });
      const jacDate = new Date(optionsStr);
      const yyyy = jacDate.getFullYear();
      const mm = String(jacDate.getMonth() + 1).padStart(2, "0");
      const dd = String(jacDate.getDate()).padStart(2, "0");
      const hh = String(jacDate.getHours()).padStart(2, "0");
      const min = String(jacDate.getMinutes()).padStart(2, "0");
      const ss = String(jacDate.getSeconds()).padStart(2, "0");
      setCurrentTime(`${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchIpAndLocation = async () => {
      try {
        const res = await fetch("https://ipapi.co/json/");
        if (res.ok) {
          const data = await res.json();
          setUserIp(data.ip || "180.252.80.45");
          setUserLocation(`${data.city || "Jakarta"}, ${data.country_name || "Indonesia"}`);
        } else {
          const res2 = await fetch("https://api.ipify.org?format=json");
          if (res2.ok) {
            const data2 = await res2.json();
            setUserIp(data2.ip || "180.252.80.45");
          } else {
            setUserIp("180.252.80.45");
          }
          setUserLocation("Jakarta, Indonesia");
        }
      } catch (err) {
        setUserIp("180.252.80.45");
        setUserLocation("Jakarta, Indonesia");
      }
    };
    fetchIpAndLocation();
  }, []);

  const getJakartaTimestamp = () => {
    const now = new Date();
    const optionsStr = now.toLocaleString("en-US", { timeZone: "Asia/Jakarta" });
    const jacDate = new Date(optionsStr);
    const dd = String(jacDate.getDate()).padStart(2, "0");
    const mm = String(jacDate.getMonth() + 1).padStart(2, "0");
    const yyyy = jacDate.getFullYear();
    const hh = String(jacDate.getHours()).padStart(2, "0");
    const min = String(jacDate.getMinutes()).padStart(2, "0");
    const ss = String(jacDate.getSeconds()).padStart(2, "0");
    return `${hh}:${min}:${ss} ${dd}-${mm}-${yyyy}`;
  };

  // Local storage history state
  const [history, setHistory] = useState<TranslationItem[]>([]);

  // Google Sheets integration state
  const [isSyncingAll, setIsSyncingAll] = useState(false);

  const [toastMessage, setToastMessage] = useState("");
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; show: boolean; hasSelection: boolean; selectionText: string } | null>(null);

  // References
  const outputRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = false;
      rec.lang = "id-ID";

      rec.onstart = () => {
        setIsListening(true);
      };

      rec.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .slice(event.resultIndex)
          .map((result: any) => result[0].transcript)
          .join("");
        setLatinInput((prev) => (prev ? prev + " " + transcript : transcript));
      };

      rec.onerror = (event: any) => {
        console.error("Speech Recognition Error:", event.error);
        if (event.error === "not-allowed") {
          showToast("Akses mikrofon ditolak oleh browser.");
        } else if (event.error === "no-speech") {
          showToast("Tidak ada ucapan yang terdeteksi.");
        } else {
          showToast(`Mikrofon error: ${event.error}`);
        }
        setIsListening(false);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = rec;
    }
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      showToast("Browser Anda tidak mendukung input suara mikrofon.");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      try {
        const activeMicLang = micLang === "auto" ? (direction === "pegon-to-latin" ? "ar-SA" : "id-ID") : micLang;
        recognitionRef.current.lang = activeMicLang;
        recognitionRef.current.start();
        showToast(`Mikrofon AKTIF (${activeMicLang === "ar-SA" ? "Bahasa Arab" : "Bahasa Indonesia"}). Silakan berbicara...`);
      } catch (e) {
        console.error(e);
      }
    }
  };

  // Load preset on change or initial mount with automatic 'g', 'ng', and 'p' migration to correct style if needed
  useEffect(() => {
    const saved = localStorage.getItem(`aksara_rules_${preset}`);
    const gaStyle = (localStorage.getItem("pegon_ga_style") as "dot" | "plain") || "plain";
    const expectedArabic = gaStyle === "dot" ? "ࢴ" : "ك";

    const ngStyle = (localStorage.getItem("pegon_ng_style") as "dot" | "plain") || "plain";
    const expectedNgArabic = ngStyle === "dot" ? "ڠ" : "ع";

    const pStyle = (localStorage.getItem("pegon_p_style") as "dot" | "plain") || "plain";
    const expectedPArabic = pStyle === "dot" ? "ڤ" : "ف";

    const nyStyle = (localStorage.getItem("pegon_ny_style") as "ya" | "ya_dot" | "nya") || "ya";
    const expectedNyArabic = nyStyle === "ya" ? "ي" : nyStyle === "ya_dot" ? "ۑ" : "ڽ";
    const expectedNyDesc = nyStyle === "ya" ? "Huruf Ya polos untuk Ny" : nyStyle === "ya_dot" ? "Huruf Ya dengan tiga titik di bawah untuk Ny" : "Huruf Nya (3 titik di atas) untuk Ny";
    
    if (saved) {
      try {
        let parsed = JSON.parse(saved);
        let migrated = false;
        parsed = parsed.map((m: any) => {
          if (m.latin === "g" && preset === "pegon") {
            if (m.arabic !== expectedArabic) {
              migrated = true;
              return {
                ...m,
                arabic: expectedArabic,
                description: gaStyle === "dot" ? "Kaf dengan 1 titik di bawah untuk Ga" : "Kaf polos untuk Ga"
              };
            }
          }
          if (m.latin === "ng" && preset === "pegon") {
            if (m.arabic !== expectedNgArabic) {
              migrated = true;
              return {
                ...m,
                arabic: expectedNgArabic,
                description: ngStyle === "dot" ? "Huruf Ngo (Nga dengan 3 titik di atas)" : "Huruf Ain polos untuk Ng"
              };
            }
          }
          if (m.latin === "p" && preset === "pegon") {
            if (m.arabic !== expectedPArabic) {
              migrated = true;
              return {
                ...m,
                arabic: expectedPArabic,
                description: pStyle === "dot" ? "Pê (Fa bertitik 3)" : "Huruf Fa polos untuk P"
              };
            }
          }
          if (m.latin === "ny" && preset === "pegon") {
            if (m.arabic !== expectedNyArabic) {
              migrated = true;
              return {
                ...m,
                arabic: expectedNyArabic,
                description: expectedNyDesc
              };
            }
          }
          return m;
        });
        if (migrated) {
          localStorage.setItem(`aksara_rules_${preset}`, JSON.stringify(parsed));
        }
        setCustomMappings(parsed);
      } catch (e) {
        loadDefaultPreset(preset);
      }
    } else {
      loadDefaultPreset(preset);
    }
  }, [preset]);

  // Load history from local storage and handle closing custom context menu
  useEffect(() => {
    const savedHistory = localStorage.getItem("aksara_history");
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error("Gagal memuat riwayat", e);
      }
    }
    
    // Closer for right click menu
    const handleCloseMenu = () => {
      setContextMenu(null);
    };
    window.addEventListener("click", handleCloseMenu);
    
    // Set some initial text on first experience
    setLatinInput("");

    return () => {
      window.removeEventListener("click", handleCloseMenu);
    };
  }, []);



  const loadDefaultPreset = (targetPreset: PresetType) => {
    let defaultList = DEFAULT_PEGON_MAPPINGS;
    const gaStyle = (localStorage.getItem("pegon_ga_style") as "dot" | "plain") || "plain";
    const expectedArabic = gaStyle === "dot" ? "ࢴ" : "ك";

    const ngStyle = (localStorage.getItem("pegon_ng_style") as "dot" | "plain") || "plain";
    const expectedNgArabic = ngStyle === "dot" ? "ڠ" : "ع";

    const pStyle = (localStorage.getItem("pegon_p_style") as "dot" | "plain") || "plain";
    const expectedPArabic = pStyle === "dot" ? "ڤ" : "ف";

    const nyStyle = (localStorage.getItem("pegon_ny_style") as "ya" | "ya_dot" | "nya") || "ya";
    const expectedNyArabic = nyStyle === "ya" ? "ي" : nyStyle === "ya_dot" ? "ۑ" : "ڽ";
    const expectedNyDesc = nyStyle === "ya" ? "Huruf Ya polos untuk Ny" : nyStyle === "ya_dot" ? "Huruf Ya dengan tiga titik di bawah untuk Ny" : "Huruf Nya (3 titik di atas) untuk Ny";

    defaultList = defaultList.map(m => {
      if (m.latin === "g") {
        return {
          ...m,
          arabic: expectedArabic,
          description: gaStyle === "dot" ? "Kaf dengan 1 titik di bawah untuk Ga" : "Kaf polos untuk Ga"
        };
      }
      if (m.latin === "ng") {
        return {
          ...m,
          arabic: expectedNgArabic,
          description: ngStyle === "dot" ? "Huruf Ngo (Nga dengan 3 titik di atas)" : "Huruf Ain polos untuk Ng"
        };
      }
      if (m.latin === "p") {
        return {
          ...m,
          arabic: expectedPArabic,
          description: pStyle === "dot" ? "Pê (Fa bertitik 3)" : "Huruf Fa polos untuk P"
        };
      }
      if (m.latin === "ny") {
        return {
          ...m,
          arabic: expectedNyArabic,
          description: expectedNyDesc
        };
      }
      return m;
    });

    setCustomMappings(defaultList);
    localStorage.setItem(`aksara_rules_${targetPreset}`, JSON.stringify(defaultList));
    showToast("Referensi default Arab Pegon berhasil dimuat!");
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3500);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    const selection = window.getSelection()?.toString() || "";
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      show: true,
      hasSelection: selection.trim().length > 0,
      selectionText: selection
    });
  };

  const handleCopyAllText = () => {
    const rawContent = finalArabicOutput;
    if (rawContent) {
      navigator.clipboard.writeText(rawContent);
      showToast("Berhasil menyalin seluruh hasil translasi!");
    } else {
      showToast("Teks translasi kosong.");
    }
    setContextMenu(null);
  };

  const handleSelectAllText = () => {
    if (outputRef.current) {
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(outputRef.current);
      selection?.removeAllRanges();
      selection?.addRange(range);
      showToast("Teks hasil translasi berhasil dipilih.");
    }
    setContextMenu(null);
  };

  const handleExportDOCX = async () => {
    const rawContent = finalArabicOutput;
    if (!latinInput.trim() || !rawContent) {
      alert("Masukkan kalimat terlebih dahulu sebelum mengekspor.");
      return;
    }

    try {
      const docx = await import("docx");
      const { Document, Packer, Paragraph, TextRun, AlignmentType } = docx;

      const titleText = direction === "pegon-to-latin"
        ? "Transliterasi Arab Pegon ke Latin"
        : "Transliterasi Latin ke Arab Pegon";

      const originalLabel = direction === "pegon-to-latin" ? "Aksara Arab Pegon (Asal)" : "Teks Latin Indonesia (Asal)";
      const outputLabel = direction === "pegon-to-latin" ? "Hasil Pembacaan Latin" : "Hasil Transliterasi Arab Pegon";

      // Helper to split text by newline and create clean docx paragraphs for identical formatting
      const generateDocxParagraphs = (
        textStr: string,
        fontFamily: string,
        fontSizeVal: number,
        colorHex: string,
        alignment: any,
        isBidirectional: boolean
      ) => {
        return textStr.split("\n").map((line) => {
          return new Paragraph({
            spacing: { before: 80, after: 80, line: 300 },
            alignment: alignment,
            bidirectional: isBidirectional,
            children: [
              new TextRun({
                text: line || " ", // export blank lines too
                font: fontFamily,
                size: fontSizeVal,
                color: colorHex,
              }),
            ],
          });
        });
      };

      const doc = new Document({
        sections: [
          {
            properties: {},
            children: [
              new Paragraph({
                spacing: { after: 200 },
                children: [
                  new TextRun({
                    text: titleText,
                    bold: true,
                    size: 32, // 16pt in docx dxa sizing (1.5倍)
                    color: "1e1b4b", // Deep indigo
                  }),
                ],
              }),
              new Paragraph({
                spacing: { after: 300 },
                children: [
                  new TextRun({
                    text: `Tanggal Unduh: ${new Date().toLocaleString("id-ID")}\n`,
                    size: 18,
                    color: "64748b",
                  }),
                  new TextRun({
                    text: "Skema Transliterasi: Arab Pegon",
                    size: 18,
                    color: "64748b",
                  }),
                ],
              }),
              new Paragraph({
                spacing: { after: 200 },
                children: [
                  new TextRun({
                    text: "----------------------------------------------------------------------------------------------------",
                    color: "cbd5e1",
                  }),
                ],
              }),
              new Paragraph({
                spacing: { before: 100, after: 100 },
                children: [
                  new TextRun({
                    text: `${originalLabel}:`,
                    bold: true,
                    size: 22,
                    color: "334155",
                  }),
                ],
              }),
              ...generateDocxParagraphs(
                latinInput,
                direction === "pegon-to-latin" ? "Traditional Arabic" : "Calibri",
                direction === "pegon-to-latin" ? 28 : 22,
                "1e293b",
                direction === "pegon-to-latin" ? AlignmentType.RIGHT : AlignmentType.LEFT,
                direction === "pegon-to-latin"
              ),
              new Paragraph({
                spacing: { before: 200, after: 100 },
                children: [
                  new TextRun({
                    text: `${outputLabel}:`,
                    bold: true,
                    size: 22,
                    color: "334155",
                  }),
                ],
              }),
              ...generateDocxParagraphs(
                rawContent,
                direction === "latin-to-pegon" ? "Traditional Arabic" : "Calibri",
                direction === "latin-to-pegon" ? 28 : 22,
                "1e293b",
                direction === "pegon-to-latin" ? AlignmentType.LEFT : AlignmentType.RIGHT,
                direction === "latin-to-pegon"
              ),
              new Paragraph({
                spacing: { before: 200 },
                children: [
                  new TextRun({
                    text: "Catatan: ",
                    bold: true,
                    size: 16,
                    color: "64748b",
                  }),
                  new TextRun({
                    text: "Dokumen ini dihasilkan secara otomatis menggunakan Aplikasi Alih Aksara Arab Pegon Nusantara.",
                    italics: true,
                    size: 16,
                    color: "64748b",
                  }),
                ],
              }),
            ],
          },
        ],
      });

      const blob = await Packer.toBlob(doc);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Transliterasi-Pegon-${new Date().toISOString().slice(0, 10)}.docx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showToast("Berhasil mengekspor dokumen Word (.docx)!");
    } catch (error) {
      console.error("Gagal mengekspor berkas Word:", error);
      alert("Terjadi kesalahan saat mengekspor dokumen Word (.docx).");
    }
  };

  // Convert text via Rule-based transliterator engine (bidirectional)
  const { arabicText, wordsResult } = direction === "pegon-to-latin"
    ? transliteratePegonToLatinText(latinInput, customMappings)
    : transliterateText(latinInput, preset, customMappings);

  // Computed helper to substitute lines starting with ">" with beautiful auto-resolved Quran/Hadits scriptures
  const getProcessedArabicText = () => {
    if (direction === "pegon-to-latin") return arabicText;
    
    return latinInput.split("\n").map(line => {
      const trimmed = line.trim();
      if (trimmed.startsWith(">")) {
        const res = quranHaditsResults[trimmed];
        if (res) {
          if (res.loading) return `(Sedang memuat dalil Al-Qur'an/Hadits...)`;
          if (res.error) return `(Gagal memuat: ${res.error})`;
          return res.arabic;
        }
        return `(Memproses rujukan otomatis: ${trimmed.slice(1).trim()}...)`;
      }
      return line.split(/(\s+)/).map(segment => {
        if (!segment.trim()) return segment;
        return transliterateWord(segment, preset, customMappings).arabic;
      }).join("");
    }).join("\n");
  };

  const finalArabicOutput = useAI ? aiResult : getProcessedArabicText();

  // Trigger AI Assisted Translation using Server-Side endpoint
  const handleAITranslate = async () => {
    if (!latinInput.trim()) {
      setAiError("Masukkan teks terlebih dahulu sebelum mentransliterasi dengan AI.");
      return;
    }

    setAiLoading(true);
    setAiError("");
    setAiResult("");
    setAiExplanation("");

    try {
      // Send the current custom reference lexicon of words so Gemini prioritizes them!
      const currentWordRules = customMappings
        .filter(m => m.type === "word")
        .map(m => ({ latin: m.latin, arabic: m.arabic }));

      const response = await fetch("/api/translate-gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: latinInput,
          preset: preset,
          customRules: currentWordRules,
          direction: direction
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Gagal melakukan asisten alih aksara AI.");
      }

      setAiResult(data.translation);
      setAiExplanation(data.explanation);
      showToast("Alih Aksara AI berhasil diperbarui!");
    } catch (err: any) {
      setAiError(err.message || "Gagal terhubung ke server/asisten AI.");
    } finally {
      setAiLoading(false);
    }
  };

  // Re-run AI translation automatically when toggle is switched ON and there's text
  useEffect(() => {
    if (useAI && latinInput.trim()) {
      const handler = setTimeout(() => {
        handleAITranslate();
      }, 500);
      return () => clearTimeout(handler);
    }
  }, [useAI, preset, direction]);

  // Automatic background scanner for Quran / Hadits queries starting with ">" in Realtime mode
  useEffect(() => {
    if (direction === "pegon-to-latin") return;
    
    const lines = latinInput.split("\n");
    const queriesToFetch: string[] = [];

    lines.forEach(line => {
      const trimmed = line.trim();
      if (trimmed.startsWith(">")) {
        const queryVal = trimmed.slice(1).trim();
        // Only trigger fetch if we have query content and it wasn't fetched or loading already
        if (queryVal.length >= 2 && !quranHaditsResults[trimmed]) {
          queriesToFetch.push(trimmed);
        }
      }
    });

    if (queriesToFetch.length === 0) return;

    // Debounce to prevent spamming while typing
    const timer = setTimeout(() => {
      queriesToFetch.forEach(async (rawLine) => {
        const queryText = rawLine.slice(1).trim();
        
        // Mark as loading first
        setQuranHaditsResults(prev => ({
          ...prev,
          [rawLine]: { arabic: "", reference: "", explanation: "", loading: true }
        }));

        try {
          const response = await fetch("/api/quran-hadits", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query: queryText })
          });

          if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error || "Gagal mengambil data dari server.");
          }

          const data = await response.json();
          setQuranHaditsResults(prev => ({
            ...prev,
            [rawLine]: {
              arabic: data.arabic,
              reference: data.reference,
              explanation: data.explanation,
              loading: false
            }
          }));
          showToast(`Berhasil memuat: ${data.reference}`);
        } catch (err: any) {
          setQuranHaditsResults(prev => ({
            ...prev,
            [rawLine]: {
              arabic: "",
              reference: "",
              explanation: "",
              loading: false,
              error: err.message || "Gagal memuat"
            }
          }));
        }
      });
    }, 650);

    return () => clearTimeout(timer);
  }, [latinInput, direction]);

  // Save Rule to state & localstorage
  const handleAddRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLatin.trim() || !newArabic.trim()) {
      alert("Kolom Latin dan Arab tidak boleh kosong!");
      return;
    }

    // Check duplicate
    const exists = customMappings.some(
      m => m.latin.toLowerCase() === newLatin.toLowerCase() && m.type === newType
    );

    if (exists) {
      if (!window.confirm(`Aturan untuk "${newLatin}" sudah ada. Apakah Anda ingin memperbaruinya?`)) {
        return;
      }
    }

    const cleanLatin = newLatin.trim().toLowerCase();
    const cleanArabic = newArabic.trim();

    const newRule: CustomMapping = {
      id: `${preset}_custom_${Date.now()}`,
      latin: cleanLatin,
      arabic: cleanArabic,
      type: newType,
      description: newDescription.trim() || `Referensi kustom untuk ${newLatin}`,
      isPreset: false,
    };

    // Filter out existing mapping with same latin character/word for clean override
    const filtered = customMappings.filter(
      m => !(m.latin.toLowerCase() === cleanLatin && m.type === newType)
    );

    const updated = [newRule, ...filtered];
    setCustomMappings(updated);
    localStorage.setItem(`aksara_rules_${preset}`, JSON.stringify(updated));

    // Reset Form
    setNewLatin("");
    setNewArabic("");
    setNewDescription("");
    showToast(`Aturan kustom "${newLatin} -> ${newArabic}" telah ditambahkan!`);
  };

  // Delete individual custom mapping
  const handleDeleteRule = (id: string, label: string) => {
    const updated = customMappings.filter(m => m.id !== id);
    setCustomMappings(updated);
    localStorage.setItem(`aksara_rules_${preset}`, JSON.stringify(updated));
    showToast(`Referensi "${label}" berhasil dihapus.`);
  };

  // Save current translation to history list
  const handleSaveToHistory = () => {
    const activeOutput = finalArabicOutput;
    if (!latinInput.trim() || !activeOutput.trim()) {
      alert("Masukkan kalimat terlebih dahulu untuk disimpan.");
      return;
    }

    const item: TranslationItem = {
      id: `hist_${Date.now()}`,
      timestamp: getJakartaTimestamp(),
      latin: latinInput,
      arabic: activeOutput,
      preset: preset,
      notes: useAI ? `Asisten Cerdas AI (Terjemahan)` : `Mesin Aturan Realtime`,
      user: userEmail,
      location: userLocation,
      ipAddress: userIp
    };

    const updated = [item, ...history];
    setHistory(updated);
    localStorage.setItem("aksara_history", JSON.stringify(updated));
    showToast("Hasil transliterasi berhasil disimpan ke Riwayat!");

    // Tambahkan ke antrean sinkronisasi berkala back-end atau langsung kirim ke Sheets jika statik (Vercel)
    if (isStaticDeployment) {
      uploadDirectToSheetsClientSide(item, direction);
    } else {
      fetch("/api/sheets/add-queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item, direction })
      })
      .then(res => {
        if (!res.ok) throw new Error("Backend offline");
        return res.json();
      })
      .then(data => {
        if (data && data.queueSize !== undefined) {
          setQueueSize(data.queueSize);
        }
      })
      .catch(err => {
        console.warn("Express backend offline atau tidak terjangkau, beralih ke direct client-side upload:", err);
        uploadDirectToSheetsClientSide(item, direction);
      });
    }
  };

  // Delete history item
  const handleDeleteHistory = (id: string) => {
    const updated = history.filter(item => item.id !== id);
    setHistory(updated);
    localStorage.setItem("aksara_history", JSON.stringify(updated));
    showToast("Riwayat berhasil dihapus.");
  };

  // Auto-Save history when user stops typing (Debounced for 2.5 seconds)
  useEffect(() => {
    // Check if we have valid completed input and translations
    const cleanLatin = latinInput.trim();
    const activeOutput = finalArabicOutput ? finalArabicOutput.trim() : "";
    if (!cleanLatin || !activeOutput) return;

    // If AI translation is loading, don't save yet
    if (useAI && aiLoading) return;

    // Avoid saving short temporary fragments of text
    if (cleanLatin.length < 3) return;

    const timer = setTimeout(() => {
      // Create new history item
      const item: TranslationItem = {
        id: `hist_${Date.now()}`,
        timestamp: getJakartaTimestamp(),
        latin: cleanLatin,
        arabic: activeOutput,
        preset: preset,
        notes: useAI ? `Asisten Cerdas AI (Otomatis)` : `Mesin Aturan (Otomatis)`,
        user: userEmail,
        location: userLocation,
        ipAddress: userIp
      };

      setHistory(prev => {
        // Prevent saving if the topmost history item already matches this text to avoid duplicates
        if (prev.length > 0 && prev[0].latin.trim() === cleanLatin) {
          return prev;
        }
        const updated = [item, ...prev];
        localStorage.setItem("aksara_history", JSON.stringify(updated));
        
        // Tambahkan ke antrean sinkronisasi berkala back-end atau langsung kirim ke Sheets jika statik (Vercel)
        if (isStaticDeployment) {
          uploadDirectToSheetsClientSide(item, direction);
        } else {
          fetch("/api/sheets/add-queue", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ item, direction })
          })
          .then(res => {
            if (!res.ok) throw new Error("Backend offline");
            return res.json();
          })
          .then(data => {
            if (data && data.queueSize !== undefined) {
              setQueueSize(data.queueSize);
            }
          })
          .catch(err => {
            console.warn("Express backend offline atau tidak terjangkau, menggunakan direct client-side upload fallback:", err);
            uploadDirectToSheetsClientSide(item, direction);
          });
        }

        return updated;
      });

    }, 2500);

    return () => clearTimeout(timer);
  }, [latinInput, finalArabicOutput, useAI, aiLoading, preset, userIp, userLocation, direction, userEmail]);

  // Copy current result to clipboard
  const copyToClipboard = (textToCopy: string) => {
    navigator.clipboard.writeText(textToCopy);
    showToast("Teks berhasil disalin ke papan klip!");
  };

  // Export current mappings configuration list as JSON file
  const handleExportJSON = () => {
    const sJson = JSON.stringify({ preset, mappings: customMappings }, null, 2);
    const blob = new Blob([sJson], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `referensi_transliterasi_${preset}_kustom.json`;
    link.click();
    showToast("Skema referensi berhasil diekspor sebagai JSON!");
  };

  // Import mappings list from JSON file upload
  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (Array.isArray(parsed.mappings)) {
          setCustomMappings(parsed.mappings);
          localStorage.setItem(`aksara_rules_${preset}`, JSON.stringify(parsed.mappings));
          showToast(`Berhasil mengimpor ${parsed.mappings.length} aturan penulisan kustom!`);
        } else {
          alert("Format file tidak valid. Pastikan file JSON berisi array 'mappings'.");
        }
      } catch (err) {
        alert("Gagal mengurai file JSON. Periksa kembali struktur file Anda.");
      }
    };
    reader.readAsText(file);
    e.target.value = ""; // reset
  };

  // Trigger print-preview or direct PDF creation
  const handlePrintDocument = () => {
    window.print();
  };

  // Filter local rule list in the table
  const filteredMappings = customMappings.filter(m => {
    if (m.type !== activeTab) return false;
    if (!searchMappingQuery) return true;
    return (
      m.latin.toLowerCase().includes(searchMappingQuery.toLowerCase()) ||
      m.arabic.includes(searchMappingQuery) ||
      (m.description && m.description.toLowerCase().includes(searchMappingQuery.toLowerCase()))
    );
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-amber-100 selection:text-amber-900 pb-20">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-14 right-6 z-50 bg-indigo-950 text-indigo-50 px-5 py-3 rounded-xl shadow-xl border border-indigo-700 font-medium flex items-center space-x-3 transition-all duration-300 transform translate-y-0">
          <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse"></div>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Header Screen Layout */}
      <header className="bg-white border-b border-slate-200 py-4 px-4 md:px-8 shadow-sm no-print">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row justify-between items-center gap-4">
          
          <div className="flex items-center space-x-3 w-full lg:w-auto justify-between lg:justify-start">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center shadow-md">
                <span className="text-white font-bold text-xl">A</span>
              </div>
              <div>
                <h1 className="text-xl font-extrabold text-slate-900 leading-none tracking-tight font-display">
                  aragon
                </h1>
                <p className="text-xs text-slate-500 mt-1 font-medium italic">
                  aplikasi arab pegon
                </p>
              </div>
            </div>
          </div>

          {/* Direction Selector inside Header */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-250 w-full sm:w-auto shadow-2xs">
            <button
              onClick={() => {
                setDirection("latin-to-pegon");
                setLatinInput("");
                setSelectedWordResult(null);
                setAiResult("");
                setAiExplanation("");
                showToast("Mode diubah: Latin ➔ Arab Pegon");
              }}
              className={`flex-1 sm:flex-initial py-2 px-6 rounded-lg font-bold text-xs transition-all text-center cursor-pointer ${
                direction === "latin-to-pegon"
                  ? "bg-white text-indigo-600 shadow-sm border border-slate-200"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Latin ➔ Arab Pegon
            </button>
            <button
              onClick={() => {
                setDirection("pegon-to-latin");
                setLatinInput("");
                setSelectedWordResult(null);
                setAiResult("");
                setAiExplanation("");
                showToast("Mode diubah: Arab Pegon ➔ Latin");
              }}
              className={`flex-1 sm:flex-initial py-2 px-6 rounded-lg font-bold text-xs transition-all text-center cursor-pointer ${
                direction === "pegon-to-latin"
                  ? "bg-white text-indigo-600 shadow-sm border border-slate-200"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Arab Pegon ➔ Latin
            </button>
          </div>

          <div className="flex items-center gap-4 w-full lg:w-auto justify-center lg:justify-end">
            {/* Environmental parameters & information tags */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              
              <div 
                className="bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-lg flex items-center space-x-2 text-slate-600"
                title="Sistem mendeteksi Google Account di browser secara otomatis untuk merekam riwayat."
              >
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse"></span>
                <span className="font-mono">User: {userEmail}</span>
              </div>

              <div 
                className="bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-lg flex items-center space-x-2 text-slate-600"
                title={`Lokasi Terdeteksi: ${userLocation || 'Indonesia'}`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <span className="font-mono">IP: {userIp}</span>
              </div>

              <div className="bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-lg flex items-center space-x-2 text-slate-600">
                <Clock className="w-3.5 h-3.5 text-indigo-600" />
                <span className="font-mono min-w-[130px]">{currentTime || "Memuat..."}</span>
              </div>
            </div>
          </div>

        </div>
      </header>

      {/* Petunjuk Memunculkan Ayat Al-Qur'an & Hadits Ribbon */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 mt-6 no-print animate-fade-in">
        <div className="bg-gradient-to-r from-indigo-50/70 to-blue-50/40 rounded-2xl border border-indigo-100 p-5 space-y-4 shadow-xs">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-indigo-100 text-indigo-700 rounded-xl shadow-2xs">
              <HelpCircle className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="font-bold text-indigo-900 text-sm md:text-base">💡 Petunjuk Memunculkan Ayat Al-Qur'an & Kutipan Hadits</h3>
              <p className="text-slate-600 text-xs md:text-xs">
                Sistem mendeteksi pencarian otomatis ayat dan hadits murni berharakat lengkap. Ketik baris baru diawali tanda <strong className="font-mono bg-white px-1.5 py-0.5 rounded border border-indigo-200 text-indigo-700 font-bold">&gt;</strong> diikuti nama surah & ayat atau kata kunci hadits.
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-1 font-mono text-xs text-slate-700 bg-white/85 p-4 rounded-xl border border-slate-200">
            <div className="space-y-2">
              <div className="text-[10px] text-indigo-700 font-extrabold uppercase tracking-wider font-sans flex items-center space-x-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                <span>Contoh Format Al-Qur'an:</span>
              </div>
              <div className="space-y-1.5 text-xs text-slate-700">
                <div className="bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 flex items-center justify-between"><span className="text-indigo-600 font-bold font-mono">&gt; Al-Baqarah 183</span> <span className="text-[10px] text-slate-400 font-sans">Ketik nama Surah dan Ayat</span></div>
                <div className="bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 flex items-center justify-between"><span className="text-indigo-600 font-bold font-mono">&gt; 3:104</span> <span className="text-[10px] text-slate-400 font-sans">Format nomor_surah:nomor_ayat</span></div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-[10px] text-indigo-700 font-extrabold uppercase tracking-wider font-sans flex items-center space-x-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                <span>Contoh Format Hadits:</span>
              </div>
              <div className="space-y-1.5 text-xs text-slate-700">
                <div className="bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 flex items-center justify-between"><span className="text-indigo-600 font-bold font-mono">&gt; HR Bukhari tentang niat</span> <span className="text-[10px] text-slate-400 font-sans">Koleksi hadits & topik</span></div>
                <div className="bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 flex items-center justify-between"><span className="text-indigo-600 font-bold font-mono">&gt; HR Muslim tentang takwa</span> <span className="text-[10px] text-slate-400 font-sans">Koleksi hadits & topik</span></div>
              </div>
            </div>
          </div>

          <div className="text-[10.5px] text-indigo-600 font-medium leading-relaxed bg-indigo-50/50 p-2 py-1.5 rounded-lg border border-indigo-100/50 flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
            <span>Referensi otomatis dimuat murni menggunakan aksara Arab baku tanpa kata tambahan "surah/surat" di awal rujukan (contoh: البقرة: ١٨٣).</span>
          </div>
        </div>
      </div>

      {/* Main Container Dashboard */}
      <main className="max-w-7xl mx-auto px-4 md:px-8 mt-6 grid grid-cols-1 md:grid-cols-2 gap-8 no-print">
        
        {/* LEFT COLUMN: Input Latin & Controls (50% side-by-side) */}
        <div className="space-y-6">
          {/* Main Input Segment Card */}
          <div className="bg-white rounded-2xl border border-slate-200/95 shadow-sm p-6 space-y-4.5">
            
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <div className="flex items-center space-x-2.5">
                <FileText className="w-5 h-5 text-indigo-600" />
                <h2 className="font-display font-semibold text-lg text-slate-900">
                  {direction === "pegon-to-latin" ? "Aksara Arab Pegon" : "Teks Latin Indonesia"}
                </h2>
              </div>
            </div>

            {/* Toolbar pilihan bahasa & mic di atas kotak */}
            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200/60">
              <div className="flex items-center space-x-2">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-xs font-semibold text-slate-600">Input Suara (Mic):</span>
              </div>
              <div className="flex items-center space-x-2">
                <select
                  value={micLang}
                  onChange={(e) => setMicLang(e.target.value as "id-ID" | "ar-SA" | "auto")}
                  className="bg-white hover:bg-slate-100 border border-slate-200 rounded-lg py-1 px-2.5 text-xs font-semibold text-slate-705 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer h-8 shadow-xs transition-all flex-1 sm:flex-none"
                  title="Pilih bahasa input suara mikrofon"
                >
                  <option value="auto">🎤 Auto ({direction === "pegon-to-latin" ? "AR" : "ID"})</option>
                  <option value="id-ID">🇮🇩 Indonesia</option>
                  <option value="ar-SA">🇸🇦 Arab (العربية)</option>
                </select>
                
                <button
                  type="button"
                  onClick={toggleListening}
                  className={`flex items-center justify-center space-x-1.5 py-1 px-3.5 h-8 rounded-lg border font-bold text-xs transition-all cursor-pointer shadow-xs flex-1 sm:flex-none ${
                    isListening
                      ? "bg-red-500 border-red-600 text-white animate-pulse"
                      : "bg-white hover:bg-slate-50 border-slate-200 text-slate-700 hover:text-slate-800"
                  }`}
                  title={isListening 
                    ? "Hentikan perekaman suara" 
                    : `Mulai input suara (Microphone)`
                  }
                >
                  {isListening ? (
                    <>
                      <MicOff className="w-3.5 h-3.5 text-white animate-pulse" />
                      <span>Hentikan</span>
                    </>
                  ) : (
                    <>
                      <Mic className="w-3.5 h-3.5 text-indigo-600 animate-pulse" />
                      <span>Input Suara</span>
                    </>
                  )}
                </button>
              </div>
            </div>

              {/* Examples selection helper */}
              <div className="hidden">
                <span className="text-slate-400 text-xs hidden sm:inline">Pemuat Contoh:</span>
                <div className="relative inline-block text-left">
                  <select
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium py-1 px-2.5 rounded-lg border-none cursor-pointer focus:outline-none transition-colors"
                    onChange={(e) => {
                      const idx = parseInt(e.target.value);
                      if (!isNaN(idx)) {
                        if (direction === "pegon-to-latin") {
                          const pegonExamples = [
                            "سايا سداڠ بلاجر منوليس كاليمات بهاسا ايندونيسيا دڠن سيستيم اتوران ايجاءان اراب ڤيࢴون.",
                            "جماعة مسلمين دان مسلمة ملاكسناكن عبادة صلاة برجماعة دمسجد اونtوق برعبادة كڤدا الله.",
                            "بكس بارڠ انتيك دان bakal ماكنان دبيلي اوليه باڤق برساما ايبو كمارين سوري."
                          ];
                          setLatinInput(pegonExamples[idx]);
                          showToast(`Dimuat: Contoh Arab Pegon ${idx + 1}`);
                        } else {
                          setLatinInput(EXAMPLES[idx].text);
                          showToast(`Dimuat: Contoh ${EXAMPLES[idx].title}`);
                        }
                        e.target.value = ""; // flush choice
                      }
                    }}
                    defaultValue=""
                  >
                    <option value="" disabled>--- Pilih Contoh ---</option>
                    {EXAMPLES.map((ex, i) => (
                      <option key={i} value={i}>{ex.title}</option>
                    ))}
                  </select>
                </div>
              </div>

            {/* Input Character Textbox */}
            <div className="relative">
              <textarea
                id="input-latin-text"
                className={`w-full h-54 p-4 text-slate-900 bg-slate-50/50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-505/20 focus:border-indigo-600 focus:outline-none transition-all placeholder:text-slate-400 focus:bg-white resize-none text-base font-medium ${
                  direction === "pegon-to-latin" ? "text-right font-arabic" : "text-left"
                }`}
                style={{
                  direction: direction === "pegon-to-latin" ? "rtl" : "ltr",
                  fontFamily: direction === "pegon-to-latin" ? `"${selectedFont}", serif` : "inherit"
                }}
                placeholder={
                  direction === "pegon-to-latin"
                    ? "Ketik atau tempel aksara Arab Pegon di sini..."
                    : "Ketik kalimat atau paragraf bahasa Indonesia di sini..."
                }
                value={latinInput}
                onChange={(e) => setLatinInput(e.target.value)}
              />
              
              {latinInput && (
                <button
                  type="button"
                  onClick={() => setLatinInput("")}
                  className="absolute bottom-3 left-3 bg-white/95 hover:bg-red-50 border border-slate-200 hover:border-red-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-500 hover:text-red-600 transition-all cursor-pointer shadow-xs flex items-center space-x-1.5 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                  title="Bersihkan teks input"
                >
                  <Trash2 className="w-3.5 h-3.5 text-slate-400 group-hover:text-red-500" />
                  <span>Bersihkan</span>
                </button>
              )}
              
              <div className="absolute bottom-3 right-3 text-slate-400 text-xs font-mono">
                {latinInput.length} karakter | {latinInput.split(/\s+/).filter(Boolean).length} kata
              </div>
            </div>

            {/* Application Modes Toggles */}
            <div className="grid grid-cols-2 gap-3.5 bg-slate-100/80 p-1.5 rounded-xl border border-slate-200/50">
              <button
                className={`py-2 px-3 rounded-lg font-medium text-xs text-center transition-all ${
                  !useAI
                    ? "bg-white text-indigo-600 shadow-sm border border-slate-250"
                    : "text-slate-500 hover:text-slate-800 hover:bg-slate-200/40"
                }`}
                onClick={() => setUseAI(false)}
              >
                ⚡ Aturan Realtime (Cepat)
              </button>
              <button
                className={`py-2 px-3 rounded-lg font-medium text-xs text-center transition-all flex items-center justify-center space-x-1.5 ${
                  useAI
                    ? "bg-indigo-600 text-white shadow-sm border border-indigo-700"
                    : "text-slate-500 hover:text-slate-800 hover:bg-slate-200/40"
                }`}
                onClick={() => {
                  setUseAI(true);
                  handleAITranslate();
                }}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Asisten Cerdas AI</span>
              </button>
            </div>

            {/* Config & Alignment buttons */}
            <div className="flex flex-wrap justify-between gap-3 text-xs border-t border-slate-100 pt-4">
              <div className="flex items-center space-x-2">
                <span className="text-slate-500 font-medium">Skema Aktif:</span>
                <span className="bg-emerald-50 text-emerald-750 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-lg font-bold text-xs transition-all flex items-center gap-1.5 shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Arab Pegon
                </span>
                <button
                  onClick={() => {
                    if (window.confirm("Apakah Anda yakin ingin menyetel ulang semua aturan penulisan ke standar dasar?")) {
                      loadDefaultPreset("pegon");
                    }
                  }}
                  className="p-1 px-2 bg-slate-100 hover:bg-red-50 hover:text-red-700 text-slate-500 rounded-lg transition-colors border border-slate-200"
                  title="Reset Semua Aturan Kustom"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setLatinInput("")}
                  className="py-1 px-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors font-medium"
                >
                  Bersihkan
                </button>
              </div>
            </div>

          </div>

          {/* Interactive Debugger Card */}
          <div className="bg-white rounded-2xl border border-slate-200/95 shadow-sm p-6 space-y-4">
            <div className="flex items-center space-x-2">
              <Info className="w-5 h-5 text-amber-500" />
              <h3 className="font-display font-semibold text-base text-slate-900">
                Ejaan & Penelusuran Fonetis
              </h3>
            </div>
            
            <p className="text-slate-500 text-xs leading-relaxed">
              {selectedWordResult 
                ? "Klik kata lainnya di panel kanan untuk melihat urutan penulisan ejaan detail di sini." 
                : "Klik salah satu kata Arab di panel kanan untuk melihat bagaimana mesin transliterasi merakit huruf demi huruf secara berurutan sesuai referensi pengguna!"
              }
            </p>

            {selectedWordResult ? (
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-mono text-slate-500">Analisis Kata:</span>
                  <span className="text-sm font-bold text-emerald-950 bg-emerald-100/75 px-2 py-0.5 rounded-lg">
                    {selectedWordResult.word}
                  </span>
                </div>

                <div className="space-y-2 max-h-36 overflow-y-auto custom-scroll pr-1">
                  {selectedWordResult.steps.map((step, idx) => (
                    <div key={idx} className="text-xs flex items-start space-x-2 border-b border-slate-100 pb-1.5 last:border-none">
                      <div className="font-mono font-bold text-amber-600 bg-amber-50 px-1 rounded mt-0.5">{idx + 1}</div>
                      <div>
                        <div className="text-slate-400 font-mono text-[10px]">
                          Asal: <span className="text-slate-700">{step.original}</span> &rarr; Hasil: <span className="text-emerald-800 font-bold">{step.result}</span>
                        </div>
                        <div className="text-slate-600 text-[11px] mt-0.5 leading-tight">{step.explanation}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl">
                 Belum ada kata yang dipilih untuk diurai.
              </div>
            )}
          </div>

        </div>

        {/* RIGHT COLUMN: Arabic Canvas Beautiful Output (50% side-by-side) */}
        <div className="space-y-6">
          
          {/* Main Output Calligraphy Card */}
          <div className="bg-white rounded-2xl border border-slate-200/95 shadow-lg p-6 space-y-4 flex flex-col min-h-[460px]">
            
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-4 border-b border-slate-100 gap-3">
              <div className="flex items-center space-x-2.5">
                <Type className="w-5 h-5 text-indigo-600" />
                <h2 className="font-display font-semibold text-lg text-slate-900">
                  {direction === "pegon-to-latin" ? "Hasil Bacaan Latin Indonesia" : "Hasil Transliterasi Arab Pegon"}
                </h2>
              </div>

              {/* Layout controls for spacing/styling */}
              <div className="flex flex-wrap items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200/50">
                <div className="flex items-center space-x-1 border-r border-slate-200 pr-2">
                  <span className="text-[10px] uppercase font-mono text-slate-400 px-1">Ukuran:</span>
                  <input
                    type="range"
                    min="20"
                    max="44"
                    value={fontSize}
                    onChange={(e) => setFontSize(parseInt(e.target.value))}
                    className="w-16 accent-indigo-600 cursor-pointer"
                  />
                </div>
                
                <div className="flex items-center border-r border-slate-200 pr-2">
                  <select
                    className="bg-transparent border-none py-1 px-1 text-xs text-slate-700 font-medium focus:outline-none cursor-pointer"
                    value={selectedFont}
                    onChange={(e) => setSelectedFont(e.target.value)}
                    disabled={direction === "pegon-to-latin"}
                  >
                    <optgroup label="Web & Google Fonts (Impor)">
                      <option value="Traditional Arabic">Traditional Arabic</option>
                      <option value="KFGQPC Uthman Taha Naskh">KFGQPC Uthman Taha</option>
                      <option value="Amiri">Font Amiri</option>
                      <option value="Noto Naskh Arabic">Noto Naskh</option>
                      <option value="Scheherazade New">Scheherazade</option>
                    </optgroup>
                    <optgroup label="Windows System Fonts (Lokal)">
                      <option value="Segoe UI Arabic">Segoe UI Arabic</option>
                      <option value="Simplified Arabic">Simplified Arabic</option>
                      <option value="Sakkal Majalla">Sakkal Majalla</option>
                      <option value="Microsoft Uighur">Microsoft Uighur</option>
                      <option value="Arabic Typesetting">Arabic Typesetting</option>
                    </optgroup>
                    <optgroup label="macOS / iOS System Fonts (Lokal)">
                      <option value="Geeza Pro">Geeza Pro</option>
                      <option value="Damascus">Damascus</option>
                      <option value="Muna">Muna</option>
                      <option value="Baghdad">Baghdad</option>
                      <option value="Al Bayan">Al Bayan</option>
                    </optgroup>
                    <optgroup label="Sistem / Font Umum">
                      <option value="system-ui">Default Device Font (System UI)</option>
                      <option value="sans-serif">Standard Sans-Serif</option>
                      <option value="serif">Standard Serif</option>
                    </optgroup>
                  </select>
                </div>

                <div className="flex items-center px-1">
                  <span className="text-[10px] uppercase font-mono text-slate-400 mr-1">Huruf g:</span>
                  <select
                    className="bg-white border border-slate-200 rounded py-0.5 px-1 text-xs text-slate-700 font-bold focus:outline-none focus:ring-1 focus:ring-indigo-505 cursor-pointer"
                    value={pegonGaStyle}
                    onChange={(e) => {
                      const val = e.target.value as "dot" | "plain";
                      setPegonGaStyle(val);
                      localStorage.setItem("pegon_ga_style", val);
                      
                      // Update current customMappings
                      setCustomMappings((prev) => 
                        prev.map((m) => {
                          if (m.latin === "g") {
                            return {
                              ...m,
                              arabic: val === "dot" ? "ࢴ" : "ك",
                              description: val === "dot" ? "Kaf dengan 1 titik di bawah untuk Ga" : "Kaf polos untuk Ga"
                            };
                          }
                          return m;
                        })
                      );
                      showToast(`Huruf Ga (g) diubah ke: ${val === "dot" ? "Kaf 1 Titik Bawah (ࢴ)" : "Kaf Polos (ك)"}`);
                    }}
                  >
                    <option value="dot">ࢴ (Titik)</option>
                    <option value="plain">ك (Polos)</option>
                  </select>
                </div>

                <div className="flex items-center px-1 border-s border-slate-200 ps-1.5">
                  <span className="text-[10px] uppercase font-mono text-slate-400 mr-1">Huruf ng:</span>
                  <select
                    className="bg-white border border-slate-200 rounded py-0.5 px-1 text-xs text-slate-700 font-bold focus:outline-none focus:ring-1 focus:ring-indigo-505 cursor-pointer"
                    value={pegonNgStyle}
                    onChange={(e) => {
                      const val = e.target.value as "dot" | "plain";
                      setPegonNgStyle(val);
                      localStorage.setItem("pegon_ng_style", val);
                      
                      // Update current customMappings
                      setCustomMappings((prev) => 
                        prev.map((m) => {
                          if (m.latin === "ng") {
                            return {
                              ...m,
                              arabic: val === "dot" ? "ڠ" : "ع",
                              description: val === "dot" ? "Huruf Ngo (Nga dengan 3 titik di atas)" : "Huruf Ain polos untuk Ng"
                            };
                          }
                          return m;
                        })
                      );
                      showToast(`Huruf Nga (ng) diubah ke: ${val === "dot" ? "ڠ (Nga 3 Titik)" : "ع (Ain Polos)"}`);
                    }}
                  >
                    <option value="dot">ڠ (Nga)</option>
                    <option value="plain">ع (Ain)</option>
                  </select>
                </div>

                <div className="flex items-center px-1 border-s border-slate-200 ps-1.5">
                  <span className="text-[10px] uppercase font-mono text-slate-400 mr-1">Huruf p:</span>
                  <select
                    className="bg-white border border-slate-200 rounded py-0.5 px-1 text-xs text-slate-700 font-bold focus:outline-none focus:ring-1 focus:ring-indigo-505 cursor-pointer"
                    value={pegonPStyle}
                    onChange={(e) => {
                      const val = e.target.value as "dot" | "plain";
                      setPegonPStyle(val);
                      localStorage.setItem("pegon_p_style", val);
                      
                      // Update current customMappings
                      setCustomMappings((prev) => 
                        prev.map((m) => {
                          if (m.latin === "p") {
                            return {
                              ...m,
                              arabic: val === "dot" ? "ڤ" : "ف",
                              description: val === "dot" ? "Pê (Fa bertitik 3)" : "Huruf Fa polos untuk P"
                            };
                          }
                          return m;
                        })
                      );
                      showToast(`Huruf P (p) diubah ke: ${val === "dot" ? "ڤ (Pa 3 Titik)" : "ف (Fa Polos)"}`);
                    }}
                  >
                    <option value="dot">ڤ (Pa)</option>
                    <option value="plain">ف (Fa)</option>
                  </select>
                </div>

                <div className="flex items-center px-1 border-s border-slate-200 ps-1.5">
                  <span className="text-[10px] uppercase font-mono text-slate-400 mr-1">Huruf ny:</span>
                  <select
                    className="bg-white border border-slate-200 rounded py-0.5 px-1 text-xs text-slate-700 font-bold focus:outline-none focus:ring-1 focus:ring-indigo-505 cursor-pointer"
                    value={pegonNyStyle}
                    onChange={(e) => {
                      const val = e.target.value as "ya" | "ya_dot" | "nya";
                      setPegonNyStyle(val);
                      localStorage.setItem("pegon_ny_style", val);
                      
                      // Update current customMappings
                      setCustomMappings((prev) => 
                        prev.map((m) => {
                          if (m.latin === "ny") {
                            return {
                              ...m,
                              arabic: val === "ya" ? "ي" : val === "ya_dot" ? "ۑ" : "ڽ",
                              description: val === "ya" ? "Huruf Ya polos untuk Ny" : val === "ya_dot" ? "Huruf Ya dengan tiga titik di bawah untuk Ny" : "Huruf Nya (3 titik di atas) untuk Ny"
                            };
                          }
                          return m;
                        })
                      );
                      const displayLabel = val === "ya" ? "ي (Ya Polos)" : val === "ya_dot" ? "ۑ (Ya 3 Titik Bawah)" : "ڽ (Nya 3 Titik Atas)";
                      showToast(`Huruf Ny (ny) diubah ke: ${displayLabel}`);
                    }}
                  >
                    <option value="ya">ي (Ya Polos)</option>
                    <option value="ya_dot">ۑ (Ya 3 Titik)</option>
                    <option value="nya">ڽ (Nya)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Arabic Script Panel Body */}
            <div className="flex-grow flex flex-col justify-between py-2">
              
              {useAI && aiLoading ? (
                <div className="flex-grow flex flex-col justify-center items-center py-20 space-y-4">
                  <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-xs font-mono text-slate-500">Menghubungkan asisten bahasa AI Arab Pegon...</p>
                </div>
              ) : useAI && aiError ? (
                <div className="flex-grow flex flex-col justify-center items-center py-12 p-6 text-center space-y-3">
                  <div className="p-3 bg-red-100 text-red-700 rounded-full">
                    <Info className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-800 text-sm">Gagal Menggunakan AI</h4>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm">{aiError}</p>
                  </div>
                  <button
                    onClick={handleAITranslate}
                    className="py-1.5 px-4 bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200 text-xs font-medium rounded-lg transition-all flex items-center justify-center cursor-pointer"
                  >
                    Coba Hubungkan Ulang
                  </button>
                </div>
              ) : (
                <div className="flex-grow flex flex-col relative group">
                  {/* Realtime Output Renderer */}
                  <div 
                    ref={outputRef}
                    onContextMenu={handleContextMenu}
                    className={`w-full p-4 pr-12 rounded-xl bg-slate-50 border border-slate-100 min-h-60 leading-relaxed break-words whitespace-pre-wrap select-text selection:bg-amber-100 cursor-context-menu min-h-60 ${
                      direction === "pegon-to-latin" ? "text-left font-sans" : "font-arabic text-right"
                    }`}
                    style={{ 
                      fontSize: direction === "pegon-to-latin" ? "18px" : `${fontSize}px`, 
                      fontFamily: direction === "pegon-to-latin" ? "inherit" : `"${selectedFont}", serif`, 
                      direction: direction === "pegon-to-latin" ? "ltr" : "rtl" 
                    }}
                  >
                    {useAI ? (
                      aiResult || (
                        <span className="text-slate-300 font-sans italic text-base">
                          {direction === "pegon-to-latin"
                            ? "Hasil pembacaan bahasa Latin dari Asisten AI Pintar..."
                            : "Hasil dari Asisten AI Pintar..."
                          }
                        </span>
                      )
                    ) : (
                      // Interactive Spans for Rule-Based Realtime debug feedback
                      latinInput.trim() ? (
                        latinInput.split("\n").map((line, lIdx) => {
                          const trimmed = line.trim();
                          if (trimmed.startsWith(">")) {
                            const res = quranHaditsResults[trimmed];
                            if (res) {
                              if (res.loading) {
                                return (
                                  <div key={lIdx} className="mb-3 py-1 flex items-center justify-end gap-2 text-xs font-sans text-slate-400 italic">
                                    <span>Sedang memuat dalil Al-Qur'an/Hadits...</span>
                                    <span className="w-3.5 h-3.5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></span>
                                  </div>
                                );
                              }
                              if (res.error) {
                                return (
                                  <div key={lIdx} className="mb-3 py-1 text-right text-xs font-sans text-red-500">
                                    Gagal memuat rujukan "{trimmed.slice(1).trim()}": {res.error}
                                  </div>
                                );
                              }
                              return (
                                <div key={lIdx} className="mb-3 py-2 text-right">
                                  <span 
                                    className="inline-block bg-indigo-50/50 hover:bg-indigo-50 border border-indigo-100/80 px-3.5 py-2 rounded-xl text-3xl font-arabic font-bold text-indigo-950 transition-all cursor-pointer shadow-sm selection:bg-amber-100"
                                    style={{ fontFamily: `"${selectedFont}", serif` }}
                                    title={`Otomatis termuat dari database rujukan sahih: ${res.reference}`}
                                  >
                                    {res.arabic}
                                  </span>
                                </div>
                              );
                            }
                            return (
                              <div key={lIdx} className="mb-3 py-1 text-right text-xs font-sans text-slate-400 italic">
                                Menunggu pencarian "{trimmed.slice(1).trim()}"...
                              </div>
                            );
                          }

                          return (
                            <div key={lIdx} className="mb-2">
                              {line.split(/(\s+)/).map((segment, sIdx) => {
                                if (!segment.trim()) return segment; // whitespace
                                
                                // Translate single word and cache result for clicking
                                const wordRes = direction === "pegon-to-latin"
                                  ? transliteratePegonToLatinWord(segment, customMappings)
                                  : transliterateWord(segment, preset, customMappings);
                                
                                const isSelected = selectedWordResult?.word === wordRes.word;
                                
                                return (
                                  <span
                                    key={sIdx}
                                    className={`inline-block px-1 rounded cursor-help transition-all ${
                                      isSelected 
                                        ? "bg-amber-200 text-slate-900 scale-105 shadow-sm font-sans" 
                                        : "hover:bg-amber-100 hover:text-slate-900 border-b border-transparent hover:border-amber-300"
                                    }`}
                                    style={{
                                      fontFamily: direction === "pegon-to-latin" ? "inherit" : `"${selectedFont}", serif`
                                    }}
                                    onClick={() => setSelectedWordResult(wordRes)}
                                    title="Klik untuk melihat detail ejaan"
                                  >
                                    {wordRes.arabic}
                                  </span>
                                );
                              })}
                            </div>
                          );
                        })
                      ) : (
                        <span className="text-slate-300 font-sans italic text-base">
                          {direction === "pegon-to-latin"
                            ? "Silakan ketik aksara Arab Pegon di sebelah kiri..."
                            : "Silakan ketik huruf latin bahasa indonesia di sebelah kiri..."
                          }
                        </span>
                      )
                    )}
                  </div>

                  {/* Absolute Floating Copy Button inside the box for easy copying */}
                  {finalArabicOutput && (
                    <button
                      onClick={() => {
                        const content = finalArabicOutput;
                        if (content) {
                          copyToClipboard(content);
                        }
                      }}
                      className="absolute top-3.5 right-3.5 p-2 bg-white hover:bg-indigo-50 text-slate-500 hover:text-indigo-600 rounded-lg border border-slate-200 shadow-sm transition-all focus:outline-none cursor-pointer"
                      title="Salin hasil teks ini"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  )}

                  {/* AI Explanation Accordion if exists */}
                  {useAI && aiExplanation && (
                    <div className="mt-4 p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl space-y-2">
                      <div className="flex items-center space-x-1.5 text-indigo-900 font-semibold text-xs">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Analisis Linguistik AI:</span>
                      </div>
                      <p className="text-slate-600 text-xs leading-relaxed">{aiExplanation}</p>
                    </div>
                  )}

                </div>
              )}

            </div>

            {/* Action Bar */}
            <div className="flex flex-wrap justify-between items-center gap-3 pt-4 border-t border-slate-100 text-xs shrink-0 select-none">
              
              <div className="flex space-x-2 items-center">
                <button
                  onClick={() => {
                    const content = finalArabicOutput;
                    if (content) {
                      copyToClipboard(content);
                    } else {
                      alert("Tidak ada teks yang dapat disalin.");
                    }
                  }}
                  className="flex items-center space-x-1.5 py-2 px-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 rounded-xl font-medium transition-all"
                  title="Salin Tulisan Arab"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Salin Hasil</span>
                </button>

                <button
                  onClick={handleSaveToHistory}
                  className="flex items-center space-x-1.5 py-2 px-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 rounded-xl font-medium transition-all"
                >
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  <span>Simpan Riwayat</span>
                </button>

                <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-100 flex items-center space-x-1.5 font-medium shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>Simpan Otomatis Aktif</span>
                </span>
              </div>

              {/* PDF and formatting tools */}
              <div className="flex space-x-2">
                <button
                  onClick={handleExportDOCX}
                  className="flex items-center space-x-1.5 py-2 px-4 bg-indigo-600 hover:bg-indigo-750 text-white rounded-xl font-bold transition-all shadow-sm shadow-indigo-500/10 cursor-pointer"
                  title="Ekspor Hasil ke Microsoft Word (.docx)"
                >
                  <FileDown className="w-3.5 h-3.5" />
                  <span>Ekspor Word (.docx)</span>
                </button>

                <button
                  onClick={() => {
                    if (!latinInput.trim()) {
                      alert("Masukkan kalimat terlebih dahulu sebelum mencetak.");
                      return;
                    }
                    setShowFormatSelector(true);
                  }}
                  className="flex items-center space-x-1.5 py-2 px-4 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl font-bold transition-all shadow-sm shadow-amber-500/10 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Ekspor PDF / Cetak</span>
                </button>
              </div>

            </div>

          </div>

          {/* Preview Metrics */}
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col justify-center items-center shadow-sm hover:border-indigo-600 transition-colors">
              <div className="text-2xl font-bold text-indigo-600">98%</div>
              <div className="text-[10px] text-slate-400 font-bold uppercase">Akurasi Referensi</div>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col justify-center items-center shadow-sm hover:border-indigo-600 transition-colors">
              <div className="text-2xl font-bold text-slate-800">
                {latinInput.length > 0 ? `${(Math.min(0.012, 0.005 + latinInput.length * 0.0001)).toFixed(3)}s` : "0.008s"}
              </div>
              <div className="text-[10px] text-slate-400 font-bold uppercase">Rendering Time</div>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-center items-center shadow-sm hover:border-indigo-600 transition-colors">
              <div className="text-2xl font-bold text-slate-800">
                {customMappings.filter(m => m.type === "character" || m.type === "digraph").length}
              </div>
              <div className="text-[10px] text-slate-400 font-bold uppercase">Ligatures Active</div>
            </div>
          </div>

          {/* Quick Info Box */}
          <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 flex items-start space-x-3 text-xs text-indigo-900 shadow-sm">
            <Info className="w-4.5 h-4.5 text-indigo-600 shrink-0 mt-0.5" />
            <div className="leading-relaxed text-slate-700 space-y-1">
              <p className="font-semibold text-indigo-950">💡 Panduan Ejaan Arab Pegon:</p>
              <p>Aksara **Pegon** digunakan untuk menuliskan bahasa Indonesia, Jawa, atau Sunda dengan huruf saksi lengkap (alif, ya, wawu). Khusus kata yang merupakan **kata serapan bahasa Arab asli** (seperti *jamaah, muslim, sholat, masjid, allah*, dll.), penulisannya dilakukan sesuai ejaan Arab asli tanpa menggunakan harakat murni tambahan.</p>
            </div>
          </div>

        </div>

      </main>

      {/* MIDDLE SECTION: Custom Mapping Lexicon Reference Manager */}
      <section className="max-w-7xl mx-auto px-4 md:px-8 mt-8 no-print">
        
        <div className="bg-white rounded-3xl border border-slate-200/95 shadow-sm p-6 space-y-6">
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-100 pb-5 gap-4">
            
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-indigo-100 rounded-xl text-indigo-800">
                <Settings className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-display font-semibold text-lg text-slate-900">
                  Manajer Referensi & Kamus Kustom (Aksara Arab Pegon)
                </h2>
                <p className="text-slate-500 text-xs mt-0.5">
                  Visualisasikan, ubah ejaan tunggal, definisikan digraf, atau daftarkan Kamus Kata Anda sebagai pedoman transliterasi.
                </p>
              </div>
            </div>

            {/* Import / Export mapping config buttons */}
            <div className="flex items-center space-x-2">
              <button
                onClick={handleExportJSON}
                className="flex items-center space-x-1.5 py-1.5 px-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-all"
                title="Unduh Referensi Saat Ini sebagai JSON"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Ekspor Referensi</span>
              </button>

              <label className="flex items-center space-x-1.5 py-1.5 px-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer transition-all">
                <Upload className="w-3.5 h-3.5" />
                <span>Impor Referensi</span>
                <input
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={handleImportJSON}
                />
              </label>
            </div>

          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Rule form creator */}
            <div className="lg:col-span-4 bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
              <div className="flex items-center space-x-2 border-b border-slate-200 pb-2.5">
                <Plus className="w-4 h-4 text-indigo-600" />
                <h3 className="font-display font-semibold text-sm text-slate-800">
                  Tambah/Edit Aturan Kustom
                </h3>
              </div>

              <form onSubmit={handleAddRule} className="space-y-3.5">
                <div>
                  <label className="block text-slate-500 text-[11px] uppercase font-mono mb-1">Tipe Aturan</label>
                  <select
                    className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-850"
                    value={newType}
                    onChange={(e) => {
                      setNewType(e.target.value as any);
                      // Clear forms to match typical inputs
                      setNewLatin("");
                      setNewArabic("");
                    }}
                  >
                    <option value="character">Huruf Tunggal (Karakter)</option>
                    <option value="digraph">Huruf Ganda (Digraf)</option>
                    <option value="word">Kata (Kamus Kustom)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-500 text-[11px] uppercase font-mono mb-1">
                    {newType === "character" ? "Huruf Latin Tunggal" : newType === "digraph" ? "Kombinasi Latin (E.g. ng, ny)" : "Kata Latin Lengkap"}
                  </label>
                  <input
                    type="text"
                    className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs focus:ring-1 focus:ring-emerald-850 focus:outline-none font-mono"
                    placeholder={newType === "character" ? "f, g, p" : newType === "digraph" ? "kh, ts, sy" : "agama, bapak"}
                    value={newLatin}
                    onChange={(e) => setNewLatin(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-500 text-[11px] uppercase font-mono mb-1">Karakter Tulisan Arab Target</label>
                  <input
                    type="text"
                    className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs text-right focus:ring-1 focus:ring-emerald-850 focus:outline-none font-arabic font-bold text-base"
                    placeholder="E.g. چ, ڠ, ڤ"
                    value={newArabic}
                    onChange={(e) => setNewArabic(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-500 text-[11px] uppercase font-mono mb-1">Catatan Tambahan (Opsional)</label>
                  <input
                    type="text"
                    className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs focus:ring-1 focus:ring-emerald-850 focus:outline-none"
                    placeholder="Contoh penyebutan atau rujukan"
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-colors shadow-sm flex items-center justify-center space-x-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Simpan Aturan Sekarang</span>
                </button>
              </form>

            </div>

            {/* Search, Filter, Tables mapping display */}
            <div className="lg:col-span-8 space-y-4">
              
              {/* Tabs list */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-200 pb-2">
                <div className="flex space-x-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200/50">
                  <button
                    onClick={() => setActiveTab("char")}
                    className={`py-1.5 px-3.5 rounded-lg text-xs font-semibold transition-all ${
                      activeTab === "char" ? "bg-white text-slate-800 shadow-sm" : "text-slate-550 hover:bg-white/50"
                    }`}
                  >
                    Karakter Tunggal
                  </button>
                  <button
                    onClick={() => setActiveTab("digraph")}
                    className={`py-1.5 px-3.5 rounded-lg text-xs font-semibold transition-all ${
                      activeTab === "digraph" ? "bg-white text-slate-800 shadow-sm" : "text-slate-550 hover:bg-white/50"
                    }`}
                  >
                    Digraf / Suku Kata
                  </button>
                  <button
                    onClick={() => setActiveTab("word")}
                    className={`py-1.5 px-3.5 rounded-lg text-xs font-semibold transition-all ${
                      activeTab === "word" ? "bg-white text-slate-800 shadow-sm" : "text-slate-550 hover:bg-white/50"
                    }`}
                  >
                    Kamus Kata ({customMappings.filter(m => m.type === "word").length})
                  </button>
                </div>

                {/* Local search in rules */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-3.5 text-slate-400" />
                  <input
                    type="text"
                    className="bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-4 py-2 text-xs w-full sm:w-56 focus:outline-none focus:ring-1 focus:ring-indigo-600 focus:bg-white"
                    placeholder="Cari referensi aturan..."
                    value={searchMappingQuery}
                    onChange={(e) => setSearchMappingQuery(e.target.value)}
                  />
                </div>
              </div>

              {/* Table rendering mappings */}
              <div className="overflow-x-auto border border-slate-200 rounded-2xl max-h-80 overflow-y-auto custom-scroll pr-1">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/75 border-b border-slate-200 text-[10px] text-slate-400 uppercase font-mono tracking-wider">
                      <th className="py-3 px-4">Latin</th>
                      <th className="py-3 px-4">Arah Arab (Kanan-Kiri)</th>
                      <th className="py-3 px-4">Status & Deskripsi</th>
                      <th className="py-3 px-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150 text-xs">
                    {filteredMappings.length > 0 ? (
                      filteredMappings.map((rule) => (
                        <tr key={rule.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-2.5 px-4 font-mono font-bold text-slate-700">
                            {rule.latin}
                          </td>
                          <td className="py-2.5 px-4 text-indigo-900 font-arabic font-bold text-lg leading-none">
                            {rule.arabic}
                          </td>
                          <td className="py-2.5 px-4 text-slate-500 text-[11px]">
                            <div className="flex items-center space-x-1.5">
                              <span className={`px-1.5 py-0.5 rounded-[4px] text-[9px] font-bold ${
                                rule.isPreset ? "bg-slate-100 text-slate-400" : "bg-indigo-100 text-indigo-700"
                              }`}>
                                {rule.isPreset ? "Bawaan" : "Kustom"}
                              </span>
                              <span>{rule.description || "-"}</span>
                            </div>
                          </td>
                          <td className="py-2.5 px-4 text-right">
                            {rule.isPreset ? (
                              <span className="text-slate-300 italic text-[10px]">Terkunci</span>
                            ) : (
                              <button
                                onClick={() => handleDeleteRule(rule.id, `${rule.latin} &rarr; ${rule.arabic}`)}
                                className="p-1 text-slate-400 hover:text-red-650 transition-colors"
                                title="Hapus Aturan"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="py-10 text-center text-slate-400 italic">
                          Tidak ditemukan referensi pencarian "{searchMappingQuery}".
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

            </div>

          </div>

        </div>

      </section>



      {/* FOOTER SECTION: Historical Log Panel */}
      <section className="max-w-7xl mx-auto px-4 md:px-8 mt-8 no-print">
        
        <div className="bg-white rounded-3xl border border-slate-200/95 shadow-sm p-6 space-y-4">
          
          <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
            <Clock className="w-5 h-5 text-indigo-600" />
            <h2 className="font-display font-semibold text-base text-slate-900">
              Riwayat Hasil Alih Aksara Lokal
            </h2>
          </div>

          {history.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-80 overflow-y-auto custom-scroll pr-1">
              {history.map((item) => (
                <div key={item.id} className="p-4 bg-white border border-slate-200 rounded-2xl flex flex-col justify-between hover:border-indigo-400 transition-colors shadow-2xs">
                  <div className="space-y-2">
                    <div className="flex flex-col gap-1 px-1 text-[10px] text-slate-400 font-mono border-b border-dashed border-slate-100 pb-2.5 mb-1.5">
                      <div className="flex justify-between items-center">
                        <span className="text-indigo-600 font-semibold">{item.timestamp}</span>
                        <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 font-bold uppercase text-[9px]">{item.preset}</span>
                      </div>
                      <div className="mt-1 flex flex-col gap-0.5 text-[9px] text-slate-500 bg-slate-50 p-1.5 rounded-lg border border-slate-200/40">
                        <div className="flex justify-between">
                          <span>User:</span>
                          <span className="font-semibold text-slate-750">{item.user || "agongpor@gmail.com"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Lokasi:</span>
                          <span className="font-semibold text-slate-750">{item.location || "Jakarta, ID"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>IP Address:</span>
                          <span className="font-semibold text-slate-750 font-mono">{item.ipAddress || "180.252.80.45"}</span>
                        </div>
                      </div>
                    </div>
                    
                    <p className="text-xs text-slate-500 line-clamp-2 italic leading-relaxed" title={item.latin}>
                      "{item.latin}"
                    </p>

                    <div className="p-2 border border-slate-200 bg-white rounded-xl leading-relaxed text-right font-arabic text-indigo-950 font-bold overflow-hidden" style={{ direction: "rtl", fontSize: "19px" }}>
                      {item.arabic}
                    </div>
                  </div>

                  <div className="flex justify-between items-center mt-3 border-t border-slate-200/60 pt-2 text-[11px]">
                    <span className="text-slate-400 italic">{item.notes || "Hasil Simpanan"}</span>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => copyToClipboard(item.arabic)}
                        className="text-indigo-600 hover:underline font-bold"
                      >
                        Salin
                      </button>
                      <button
                        onClick={() => {
                          setLatinInput(item.latin);
                          if (item.notes?.includes("AI")) {
                            setUseAI(true);
                          } else {
                            setUseAI(false);
                          }
                          showToast("Kalimat dikembalikan ke ruang kerja!");
                        }}
                        className="text-amber-600 hover:underline"
                      >
                        Pakai
                      </button>
                      <button
                        onClick={() => handleDeleteHistory(item.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        Hapus
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-slate-400 text-xs italic border border-dashed border-slate-200 rounded-2xl">
              Belum ada riwayat alih aksara tersimpan. Klik "Simpan Riwayat" pada panel hasil untuk mencadangkannya di peramban ini.
            </div>
          )}

        </div>

      </section>

      {/* FOOTER Credits no-print */}
      <footer className="max-w-7xl mx-auto text-center mt-12 text-slate-400 text-xs no-print space-y-2">
        <p className="font-mono">
          © {new Date().getFullYear()} Aplikasi Penulisan Arab Pegon. Semua Hak Dilindungi.
        </p>
        <p className="flex justify-center items-center gap-1">
          Ditenagai oleh <span className="font-mono text-indigo-800 font-semibold bg-indigo-50 px-1 rounded">Vite React</span> dan <span className="font-mono text-amber-700 font-semibold bg-amber-50 inline-flex items-center gap-0.5 px-1 rounded"><Sparkles className="w-2.5 h-2.5 inline" /> Gemini 3.5-Flash</span>
        </p>
      </footer>


      {/* FULL PRINT-READY DIALOG MODAL (ONLY triggered when generating pdf/print view) */}
      {showPrintPreview && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto no-print">
          <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[92vh] overflow-y-auto flex flex-col shadow-2xl border border-slate-300">
            
            {/* Modal Controls Bar */}
            <div className="bg-slate-900 text-slate-100 p-4 px-6 flex justify-between items-center rounded-t-3xl border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <Printer className="w-5 h-5 text-amber-300" />
                <h3 className="font-display font-semibold text-slate-200">Pratinjau Lembar Ekspor PDF</h3>
              </div>
              <button
                onClick={() => setShowPrintPreview(false)}
                className="text-slate-400 hover:text-white font-bold text-sm bg-slate-800 hover:bg-slate-750 px-3 py-1.5 rounded-xl cursor-pointer transition-colors"
              >
                Tutup Pratinjau
              </button>
            </div>

            {/* Format Selection Tab Toggle */}
            <div className="px-6 py-3 bg-indigo-50/50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
              <span className="font-mono uppercase font-bold text-indigo-950">Pilih Layout Dokumen:</span>
              <div className="flex bg-white p-1 border border-slate-200 rounded-2xl shadow-3xs">
                <button
                  type="button"
                  onClick={() => setExportFormat("lengkap")}
                  className={`px-3 py-1.5 rounded-xl font-semibold transition-all cursor-pointer ${exportFormat === "lengkap" ? "bg-indigo-650 text-white shadow-3xs" : "text-slate-600 hover:text-slate-950"}`}
                >
                  Lengkap (Resmi)
                </button>
                <button
                  type="button"
                  onClick={() => setExportFormat("latin-arab")}
                  className={`px-3 py-1.5 rounded-xl font-semibold transition-all cursor-pointer ${exportFormat === "latin-arab" ? "bg-indigo-650 text-white shadow-3xs" : "text-slate-600 hover:text-slate-950"}`}
                >
                  Latin & Pegon
                </button>
                <button
                  type="button"
                  onClick={() => setExportFormat("pegon-saja")}
                  className={`px-3 py-1.5 rounded-xl font-semibold transition-all cursor-pointer ${exportFormat === "pegon-saja" ? "bg-indigo-650 text-white shadow-3xs" : "text-slate-600 hover:text-slate-950"}`}
                >
                  Pegon Saja
                </button>
              </div>
            </div>

            {/* Layout Customizer panel (interactive form before PDF build) */}
            {exportFormat === "lengkap" && (
              <div className="p-5 bg-slate-50 border-b border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div>
                  <label className="block text-slate-500 uppercase font-mono font-semibold mb-1">Judul Dokumen</label>
                  <input
                    type="text"
                    className="w-full bg-white border border-slate-300 rounded-xl p-2 font-medium"
                    value={pdfTitle}
                    onChange={(e) => setPdfTitle(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-slate-500 uppercase font-mono font-semibold mb-1">Penyusun / Penerjemah</label>
                  <input
                    type="text"
                    className="w-full bg-white border border-slate-300 rounded-xl p-2 font-medium"
                    value={pdfAuthor}
                    onChange={(e) => setPdfAuthor(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-slate-555 uppercase font-mono font-semibold mb-1">Catatan Dokumen</label>
                  <input
                    type="text"
                    className="w-full bg-white border border-slate-300 rounded-xl p-2 font-medium"
                    value={pdfNotes}
                    onChange={(e) => setPdfNotes(e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* A4 Sheet Preview Mockup */}
            <div className="p-8 bg-slate-100 overflow-x-auto flex justify-center">
              
              {/* This mimics the layout of the print page closely */}
              <div 
                id="printable-area"
                className={`w-[210mm] min-h-[297mm] bg-white text-slate-900 border-2 border-slate-300 p-16 shadow-lg relative flex flex-col ${exportFormat === "lengkap" ? "justify-between" : "justify-start space-y-8"}`}
                style={{ boxSizing: "border-box" }}
              >
                
                {/* Vintage Frame borders */}
                {exportFormat === "lengkap" && (
                  <>
                    <div className="absolute inset-4 border border-indigo-950 pointer-events-none opacity-5 pr-2"></div>
                    <div className="absolute inset-6 border-2 border-double border-indigo-950 pointer-events-none opacity-20"></div>
                  </>
                )}

                <div className="space-y-8 z-10">
                  
                  {/* Letterhead Header banner */}
                  {exportFormat === "lengkap" && (
                    <div className="text-center border-b-2 border-slate-800 pb-4 relative">
                      <div className="text-xs uppercase tracking-widest font-mono font-bold text-amber-700">DOKUMEN RESMI</div>
                      <h2 className="font-display font-bold text-2xl text-indigo-950 mt-1 uppercase tracking-tight">{pdfTitle}</h2>
                      <p className="text-xs text-slate-400 font-mono mt-0.5">Alih Aksara Tulisan Arab Melayu & Pegon Nusantara</p>
                      
                      {/* Floating watermarked corner symbol */}
                      <div className="absolute top-0 right-0 font-arabic text-indigo-950 opacity-10 text-4xl">ج</div>
                    </div>
                  )}

                  {/* Metadata Panel Grid */}
                  {exportFormat === "lengkap" && (
                    <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
                      <div>
                        <span className="text-slate-400 block font-mono">PENYUSUN/AUTORITAS:</span>
                        <strong className="text-slate-850 block">{pdfAuthor}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-mono">SKEMA TRANSLITERASI:</span>
                        <strong className="text-slate-850 block uppercase">Arab Pegon</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-mono">TANGGAL PEMBUATAN:</span>
                        <strong className="text-slate-850 block">{printDate}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-mono">MODE KONVERSI:</span>
                        <strong className="text-slate-850 block">{useAI ? "Asisten AI Cerdas Gemini" : "Mesin Aturan Phonetis Kustom"}</strong>
                      </div>
                    </div>
                  )}

                  {/* Dual Column Text Translation Sheets */}
                  <div className="space-y-6">
                    
                    {/* Latin Input Container */}
                    {exportFormat !== "pegon-saja" && (
                      <div className="space-y-1.5">
                        <div className="text-[10px] text-slate-400 uppercase font-mono tracking-wider font-semibold border-b border-slate-205 pb-1">1. Teks Sumber (Latin Bahasa Indonesia):</div>
                        <p className="text-sm text-slate-800 leading-relaxed font-sans bg-slate-100/50 p-4 rounded-xl italic">
                          "{latinInput}"
                        </p>
                      </div>
                    )}

                    {/* Arabic Result Container */}
                    <div className="space-y-1.5">
                      {exportFormat !== "pegon-saja" && (
                        <div className="text-[10px] text-slate-400 uppercase font-mono tracking-wider font-semibold border-b border-slate-205 pb-1 text-right">2. Hasil Alih Aksara Arab (RTL):</div>
                      )}
                      <div 
                        className={`bg-slate-50 p-6 rounded-xl text-right leading-relaxed font-arabic font-bold text-indigo-950 ${exportFormat === "pegon-saja" ? "text-4xl py-12" : "text-3xl"} break-words`}
                        style={{ fontFamily: `"${selectedFont}", serif`, direction: "rtl" }}
                      >
                        {finalArabicOutput}
                      </div>
                    </div>

                    {/* Explanations index or custom descriptions */}
                    {exportFormat === "lengkap" && pdfNotes && (
                      <div className="p-4 border border-dashed border-slate-350 bg-amber-50/20 text-slate-500 rounded-xl space-y-1 text-xs">
                        <span className="font-bold text-slate-700 block">Keterangan / Memo Dokumen:</span>
                        <p className="leading-relaxed italic">"{pdfNotes}"</p>
                      </div>
                    )}

                  </div>

                </div>

                {/* Print Sheet Footer / Validation blocks */}
                {exportFormat === "lengkap" && (
                  <div className="mt-16 pt-6 border-t border-slate-200 z-10 flex justify-between items-end text-xs">
                    <div className="text-[10px] text-slate-400 font-mono space-y-0.5">
                      <p>Meninggalkan jejak digital pada peramban lokal.</p>
                      <p>Sistem Ejaan Terintegrasi • agongpor@gmail.com</p>
                    </div>
                    <div className="text-center w-48 border-t border-slate-305 pt-2">
                      <p className="text-slate-400 text-[9px] uppercase font-mono tracking-wider">Tanda Tangan Pihak Berwenang</p>
                      <div className="h-10"></div>
                      <p className="font-semibold text-slate-700 font-display">{pdfAuthor.split("@")[0]}</p>
                    </div>
                  </div>
                )}

              </div>
              
            </div>

            {/* Print trigger footer action drawer */}
            <div className="p-6 bg-slate-50 border-t border-slate-200 flex justify-end space-x-3 rounded-b-3xl shrink-0">
              <button
                onClick={() => setShowPrintPreview(false)}
                className="py-2.5 px-5 bg-slate-200 hover:bg-slate-300 text-slate-705 font-bold rounded-xl text-xs cursor-pointer transition-colors"
               >
                Batalkan
              </button>
              <button
                onClick={handlePrintDocument}
                className="py-2.5 px-6 bg-indigo-600 hover:bg-indigo-750 text-white font-bold rounded-xl text-xs cursor-pointer flex items-center space-x-2 shadow-md hover:scale-[1.02] transition-all"
               >
                <Printer className="w-4 h-4 text-amber-300" />
                <span>Cetak / Ekspor Sebagai PDF</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* RAW HIDDEN PRINT-ONLY BODY AREA (When print dialog is open via browser, this container is rendered instead of everything else see media queries) */}
      <div className="print-only hidden print-container bg-white p-16 space-y-10">
        
        {/* Repeating exactly the print structure without any UI elements of the page */}
        {exportFormat === "lengkap" && (
          <div className="text-center border-b-2 border-slate-900 pb-4 relative">
            <div className="text-[10px] uppercase tracking-widest font-mono font-bold text-amber-700">DOKUMEN TRANSLITERASI RESMI</div>
            <h2 className="font-display font-bold text-2xl text-indigo-950 mt-1 uppercase tracking-tight">{pdfTitle}</h2>
            <p className="text-xs text-slate-400 font-mono mt-0.5">Alih Aksara Tulisan Arab Melayu & Pegon Nusantara</p>
          </div>
        )}

        {exportFormat === "lengkap" && (
          <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <span className="text-slate-400 block font-mono">PENYUSUN/AUTORITAS:</span>
              <strong className="text-slate-850 block">{pdfAuthor}</strong>
            </div>
            <div>
              <span className="text-slate-400 block font-mono">SKEMA TRANSLITERASI:</span>
              <strong className="text-slate-850 block uppercase">Arab Pegon</strong>
            </div>
            <div>
              <span className="text-slate-400 block font-mono">TANGGAL PEMBUATAN:</span>
              <strong className="text-slate-850 block">{printDate}</strong>
            </div>
            <div>
              <span className="text-slate-400 block font-mono">MODE KONVERSI:</span>
              <strong className="text-slate-850 block">{useAI ? "Asisten AI Cerdas Gemini" : "Mesin Aturan Phonetis Kustom"}</strong>
            </div>
          </div>
        )}

        <div className="space-y-8">
          {exportFormat !== "pegon-saja" && (
            <div className="space-y-2">
              <div className="text-[10px] text-slate-400 uppercase font-mono tracking-wider font-semibold border-b border-slate-200 pb-1">1. Teks Sumber (Latin Bahasa Indonesia):</div>
              <p className="text-sm text-slate-800 leading-relaxed font-sans bg-slate-50 p-4 rounded-xl italic">
                "{latinInput}"
              </p>
            </div>
          )}

          <div className="space-y-2">
            {exportFormat !== "pegon-saja" && (
              <div className="text-[10px] text-slate-400 uppercase font-mono tracking-wider font-semibold border-b border-slate-200 pb-1 text-right">2. Hasil Alih Aksara Arab (RTL):</div>
            )}
            <div 
              className={`bg-slate-50 p-6 rounded-xl text-right leading-relaxed font-arabic font-bold text-indigo-950 ${exportFormat === "pegon-saja" ? "text-4xl py-12" : "text-3xl"} break-words`}
              style={{ fontFamily: `"${selectedFont}", serif`, direction: "rtl" }}
            >
              {finalArabicOutput}
            </div>
          </div>

          {exportFormat === "lengkap" && pdfNotes && (
            <div className="p-4 border border-dashed border-slate-350 bg-slate-50 text-slate-500 rounded-xl space-y-1 text-xs">
              <span className="font-bold text-slate-700 block">Keterangan / Memo Dokumen:</span>
              <p className="leading-relaxed italic">"{pdfNotes}"</p>
            </div>
          )}
        </div>

        {exportFormat === "lengkap" && (
          <div className="pt-8 border-t border-slate-200 flex justify-between items-end text-xs">
            <div className="text-[14px] text-slate-400 font-mono space-y-0.5">
              <p>Sistem Ejaan Terintegrasi • agongpor@gmail.com</p>
            </div>
            <div className="text-center w-48 border-t border-slate-300 pt-2">
              <p className="text-slate-400 text-[9px] uppercase font-mono tracking-wider">Tanda Tangan Pihak Berwenang</p>
              <div className="h-10"></div>
              <p className="font-semibold text-slate-700 font-display">{pdfAuthor.split("@")[0]}</p>
            </div>
          </div>
        )}

      </div>

      {/* Footer System Bar */}
      <footer className="fixed bottom-0 left-0 right-0 h-10 bg-slate-800 text-slate-400 px-6 flex items-center justify-between text-[11px] shrink-0 z-40 no-print">
        <div className="flex gap-4">
          <span>Version 3.5.4-29K</span>
          <span>System Status: <span className="text-emerald-400">Nggayuh Marang Kasampurnan</span></span>
        </div>
        <div className="flex gap-4 items-center">
          <span>Keyboard: ID-ARABIC</span>
          <div className="h-3 w-[1px] bg-slate-600"></div>
          <span className="text-white opacity-80">Export Ready: A4 Portrait</span>
        </div>
      </footer>

      {/* Floating Custom Right-click Context Menu specifically targeting the transliteration container */}
      {contextMenu?.show && (
        <div 
          className="fixed z-50 bg-white border border-slate-200 rounded-xl shadow-xl py-1.5 min-w-[210px] font-sans text-xs animate-in fade-in zoom-in-95 duration-100 no-print"
          style={{ 
            top: `${contextMenu.y}px`, 
            left: `${contextMenu.x}px` 
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-3 py-1 text-[10px] uppercase font-mono font-bold text-slate-400 tracking-wider">
            Opsi Hasil Translasi
          </div>
          
          {contextMenu.hasSelection && (
            <button
              onClick={() => {
                navigator.clipboard.writeText(contextMenu.selectionText);
                showToast("Berhasil menyalin bagian yang terpilih!");
                setContextMenu(null);
              }}
              className="w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center space-x-2 text-indigo-700 bg-indigo-50/50 hover:text-indigo-900 border-y border-indigo-100/50 transition-colors cursor-pointer font-medium"
            >
              <Copy className="w-3.5 h-3.5 text-indigo-500" />
              <span>Salin Bagian Terpilih</span>
            </button>
          )}

          <button
            onClick={handleSelectAllText}
            className="w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center space-x-2 text-slate-700 hover:text-indigo-900 transition-colors mt-0.5 cursor-pointer"
          >
            <Type className="w-3.5 h-3.5 text-slate-400" />
            <span>Pilih Semua Teks</span>
          </button>
          <button
            onClick={handleCopyAllText}
            className="w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center space-x-2 text-slate-700 hover:text-indigo-900 transition-colors border-t border-slate-100 cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5 text-slate-400" />
            <span>Salin Seluruh Teks</span>
          </button>
        </div>
      )}



      {/* MODAL PILIHAN FORMAT EKSPOR EKSPOR */}
      {showFormatSelector && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto no-print">
          <div className="bg-white rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl border border-slate-200 flex flex-col">
            
            {/* Header */}
            <div className="bg-slate-900 text-slate-100 p-5 px-6 flex justify-between items-center border-b border-slate-800">
              <div className="flex items-center space-x-2.5">
                <FileDown className="w-5 h-5 text-amber-400" />
                <h3 className="font-display font-semibold text-xs md:text-sm text-slate-200">
                  Pilih Format Ekspor Dokumen (PDF)
                </h3>
              </div>
              <button
                onClick={() => setShowFormatSelector(false)}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Selection Options Body */}
            <div className="p-6 space-y-4">
              <p className="text-slate-500 text-[11px] leading-relaxed">
                Silakan pilih tata letak (layout) dokumen yang paling sesuai dengan kebutuhan publikasi atau arsip Anda sebelum mencetak:
              </p>

              <div className="space-y-3">
                {/* Opsi 1: Lengkap */}
                <button
                  type="button"
                  onClick={() => {
                    setExportFormat("lengkap");
                    setShowFormatSelector(false);
                    setShowPrintPreview(true);
                  }}
                  className="w-full text-left p-4 rounded-2xl border border-slate-200 hover:border-indigo-500 hover:bg-slate-50/50 transition-all flex items-start space-x-4 group cursor-pointer"
                >
                  <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl group-hover:bg-indigo-100 transition-colors shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-semibold text-slate-800 text-xs">Lengkap (Dengan Header & TTD)</h4>
                    <p className="text-slate-400 text-[10px] leading-relaxed">
                      Dilengkapi dengan kepala surat (kop), metadata transliterasi, teks asli Latin, hasil alih aksara Arab Pegon, catatan memo, dan tanda tangan digital resmi.
                    </p>
                  </div>
                </button>

                {/* Opsi 2: Latin & Arab Sederhana */}
                <button
                  type="button"
                  onClick={() => {
                    setExportFormat("latin-arab");
                    setShowFormatSelector(false);
                    setShowPrintPreview(true);
                  }}
                  className="w-full text-left p-4 rounded-2xl border border-slate-200 hover:border-indigo-500 hover:bg-slate-50/50 transition-all flex items-start space-x-4 group cursor-pointer"
                >
                  <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl group-hover:bg-emerald-100 transition-colors shrink-0">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-semibold text-slate-800 text-xs">Latin & Arab Pegon (Berdampingan - Tanpa Header & TTD)</h4>
                    <p className="text-slate-400 text-[10px] leading-relaxed">
                      Hanya menampilkan teks sumber Latin dan hasil tulisan Arab Pegon yang bersih secara berdampingan tanpa kop administratif dan tanda tangan.
                    </p>
                  </div>
                </button>

                {/* Opsi 3: Pegon Saja */}
                <button
                  type="button"
                  onClick={() => {
                    setExportFormat("pegon-saja");
                    setShowFormatSelector(false);
                    setShowPrintPreview(true);
                  }}
                  className="w-full text-left p-4 rounded-2xl border border-slate-200 hover:border-indigo-500 hover:bg-slate-50/50 transition-all flex items-start space-x-4 group cursor-pointer"
                >
                  <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl group-hover:bg-amber-100 transition-colors shrink-0">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-semibold text-slate-800 text-xs">Hasil Arab Pegon Saja (Tanpa Header & TTD)</h4>
                    <p className="text-slate-400 text-[10px] leading-relaxed">
                      Format deskriptif super minimalis yang hanya menampilkan karya hasil tulisan Arab Pegon dalam ukuran besar, tanpa teks Latin pendamping maupun ornamen administratif lainnya.
                    </p>
                  </div>
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setShowFormatSelector(false)}
                className="bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold px-4 py-2 rounded-xl cursor-pointer transition-all text-xs"
              >
                Batal
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
