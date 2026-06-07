import { CustomMapping, PresetType, WordConversionResult, ConversionStep } from "../types";

// Helper to check if a character is a vowel
function isVowel(char: string): boolean {
  return "aeiouAEIOUéèêÉÈÊ".includes(char);
}

// Intelligent helper to identify "e pepet" (schwa / ə / sound) in Indonesian/Java words.
// E-pepet (e.g. bekas, bekal, besar, teman) is unwritten and should not map to Ya (ي).
// Taling (e.g. bebek, lele, meja) is written and maps to Ya (ي).
function isEPepet(word: string, index: number): boolean {
  const char = word[index];
  if (char === "é" || char === "è") return false; // forced taling (é/è -> not pepet)
  if (char === "ê") return true; // forced pepet (ê -> pepet)
  if (char !== "e" && char !== "é" && char !== "è" && char !== "ê") return false;

  const lower = word.toLowerCase();

  // Handle explicit taling words/roots (e at any position of these words is taling, so isEPepet = false)
  const talingRoots = [
    "bebe", "becek", "beda", "bebas", "besok", "bela", "belek", "begal", "beres", "betet", 
    "desa", "dewan", "depok", "deret", "dehem", 
    "enak", "ecer", "esok", "era", "ember", "emang", "edan", "eja", "elit", "elok", "esoterik",
    "gembel", "geser", "gepeng", "gemes", "gede", 
    "jahe", 
    "kere", "kemah", "kelereng", "keling", 
    "lele", "leher", "lewat", "leles", "lempeng", "lengser", 
    "meja", "merah", "melo", "nene", "nenek", 
    "pesta", "pena", "pelet", "pendek", "tempe", "tempel",
    "rewel", "rem", "resep", "reken", "remedi", "rekening",
    "sate", "setan", "sewa", "seng", "segel", "sendok", "senter", 
    "teh", "tema", "tente", "tante", "teko", "teras"
  ];

  if (talingRoots.some(root => lower.includes(root))) {
    const foundRoot = talingRoots.find(root => lower.includes(root))!;
    const rootIndex = lower.indexOf(foundRoot);
    const indexInRoot = index - rootIndex;
    if (indexInRoot >= 0 && indexInRoot < foundRoot.length) {
      // The 'e' is inside the taling root! So it is taling (isEPepet = false)
      return false;
    }
  }

  // Explicitly check known cases like "bekas" and "bekal"
  if (lower.startsWith("bekas") || lower.startsWith("bekal") || lower === "bekas" || lower === "bekal") {
    return true;
  }

  // Common Indonesian prefixes: be-, me-, se-, ke-, pe-, te-, de-, ge-, ce-, le-
  if (index === 1) {
    const first = lower[0];
    if (["b", "m", "s", "k", "p", "t", "d", "g", "c", "l"].includes(first)) {
      // Exclude known e-taling cases (where e sounds like 'enak' or 'sate')
      const talingWords = ["bebas", "beda", "besok", "bebek", "becek", "bela", "desa", "lele", "leher", "lewat", "meja", "merah", "setan", "sewa", "teh", "tema", "pena", "pesta", "lempeng"];
      if (talingWords.some(tw => lower.startsWith(tw))) {
        return false;
      }
      return true;
    }
  }

  // If 'e' is at index 0 (e.g., "emas", "empat", "enam", "entah")
  if (index === 0 && lower.length > 2) {
    const nonPepetStart = ["ekor", "enak", "ecer", "elok", "esok", "era"];
    if (nonPepetStart.some(w => lower.startsWith(w))) {
      return false;
    }
    return true;
  }

  // Blend/consonant cluster context for e-pepet: e.g., "bencana", "benci", "benda", "bentuk"
  if (index > 0 && index < lower.length - 1) {
    const after = lower.substring(index + 1);
    const next2 = after.substring(0, 2);
    if (["ng", "ny", "mp", "nt", "nd", "nc", "nj", "rk", "rt", "rg", "rp", "lm", "lk", "rd", "rn"].includes(next2)) {
      return true;
    }
  }

  // Default heuristic fallback: if surrounded by consonants
  if (index > 0 && index < lower.length - 1) {
    const prev = lower[index - 1];
    const next = lower[index + 1];
    if (!isVowel(prev) && !isVowel(next)) {
      // Exclude short words that might be e-taling like "gen"
      if (lower.length > 3) {
        return true;
      }
    }
  }

  return false;
}

// Extract punctuation from beginning and end of a word (Latin & Arabic supported)
function stripPunctuation(word: string): { clean: string; prefix: string; suffix: string } {
  const match = word.match(/^([^\w\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]*)([\w\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF'-]*)([^\w\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]*)$/);
  if (match) {
    return {
      prefix: match[1],
      clean: match[2],
      suffix: match[3],
    };
  }
  return { clean: word, prefix: "", suffix: "" };
}

// Kamus kata serapan bahasa Arab yang ditulis sesuai penulisan bahasa Arab asli tanpa harakat
const ARABIC_LOANWORDS: Record<string, string> = {
  "jamaah": "جماعة",
  "jemaah": "جماعة",
  "muslim": "مسلم",
  "muslimin": "مسلمين",
  "muslimah": "مسلمة",
  "islam": "اسلام",
  "salam": "سلام",
  "assalam": "السلام",
  "assalamu": "السلام",
  "alaikum": "عليكم",
  "alaykum": "عليكم",
  "assalamualaikum": "السلام عليكم",
  "assalamu'alaikum": "السلام عليكم",
  "assalamualaykum": "السلام عليكم",
  "assalamu'alaykum": "السلام عليكم",
  "waalaikumsalam": "وعليكم السلام",
  "wa'alaikumsalam": "وعليكم السلام",
  "waalaykumsalam": "وعليكم السلام",
  "wa'alaykumsalam": "وعليكم السلام",
  "wa'alaikumussalam": "وعليكم السلام",
  "waalaikumussalam": "وعليكم السلام",
  "wasalamualaikum": "وعليكم السلام",
  "wasalamu'alaikum": "وعليكم السلام",
  "warahmatullahi": "ورحمة الله",
  "wabarakatuh": "وبركاته",
  "shallallahu": "صلى الله",
  "alaihi": "عليه",
  "wasallam": "وسلم",
  "shallallahu 'alaihi wasallam": "صلى الله عليه وسلم",
  "shallallahu alaihi wasallam": "صلى الله عليه وسلم",
  "shollallahu 'alaihi wasallam": "صلى الله عليه وسلم",
  "shollallahu alaihi wasallam": "صلى الله عليه وسلم",
  "saw": "صلى الله عليه وسلم",
  "sholih": "صالح",
  "shalih": "صالح",
  "sholeh": "صالح",
  "sholihah": "صالحة",
  "shalihah": "صالحة",
  "sholehah": "صالحة",
  "sholat": "صلاة",
  "salat": "صلاة",
  "solat": "صلاة",
  "masjid": "مسجد",
  "musholla": "مصلى",
  "mushola": "مصلى",
  "musala": "مصلى",
  "iman": "ايمان",
  "takwa": "تقوى",
  "taqwa": "تقوى",
  "sunnah": "سنة",
  "hukum": "حكم",
  "kitab": "كتاب",
  "nabi": "نبي",
  "rasul": "رسول",
  "allah": "الله",
  "bismillah": "بسم الله",
  "alhamdulillah": "الحمد لله",
  "subhanallah": "سبحان الله",
  "insyaallah": "إن شاء الله",
  "astagfirullah": "أستغفر الله",
  "astaghfirullah": "أستغفر الله",
  "allahumma": "اللهم",
  "amal": "عمل",
  "ilmu": "علم",
  "ulama": "علماء",
  "ustadz": "أستاذ",
  "ustad": "أستاذ",
  "ustazah": "أستاذة",
  "ustadzah": "أستاذة",
  "sahabat": "صحابة",
  "zakat": "زكاة",
  "haji": "حج",
  "umroh": "عمرة",
  "umrah": "عمرة",
  "halal": "حلال",
  "haram": "حرام",
  "makruh": "مكروه",
  "mubah": "مباح",
  "wajib": "واجب",
  "syirik": "شرك",
  "kufur": "كفر",
  "kafir": "كافر",
  "munafik": "منافق",
  "fasik": "فاسق",
  "fasiq": "فاسق",
  "ikhlas": "إخلاص",
  "sabar": "صبر",
  "syukur": "شكر",
  "taubat": "توبة",
  "tobat": "توبة",
  "maaf": "معاف",
  "doa": "دعاء",
  "dzikir": "ذكر",
  "zikir": "ذكر",
  "pikir": "فكر",
  "fikir": "فكر",
  "syetan": "شيطان",
  "setan": "شيطان",
  "iblis": "ابليس",
  "malaikat": "ملائكة",
  "akhirat": "آخرة",
  "kiamat": "قيامة",
  "dunia": "دنيا",
  "kabar": "خبر",
  "khabar": "خبر",
  "sedekah": "صدقة",
  "shodaqoh": "صدقة",
  "shadaqah": "صدقة",
  "berkah": "بركة",
  "barakah": "بركة",
  "barokah": "بركة",
  "majelis": "مجلس",
  "majlis": "مجلس",
  "khotbah": "خطبة",
  "khutbah": "خطبة",
  "nikah": "نكاح",
  "akhlak": "أخلاق",
  "adab": "أدب",
  "tafsir": "تفسير",
  "hadits": "حديث",
  "hadis": "حديث",
  "fiqih": "فقه",
  "fikih": "فقه",
  "akidah": "عقيدة",
  "aqidah": "عقيدة",
  "tasawuf": "تصوف",
  "kalimat": "كلمة",
  "ayat": "آية",
  "surah": "سورة",
  "ijtihad": "اجتهاد",
  "fatwa": "فتوى",
  "syariat": "شريعة",
  "syariah": "شريعة",
  "tarbiyah": "تربية",
  "dakwah": "دعوة",
  "ijtima": "اجتماع",
  "silaturahmi": "صلة الرحم",
  "silaturahim": "صلة الرحم",
  "fitnah": "فتنة",
  "ghibah": "غيبة",
  "hasad": "حسد",
  "riya": "رياء",
  "riya'": "رياء",
  "takabur": "تكبر",
  "ujub": "عجب",
  "syahadat": "شهادة",
  "syahid": "شهيد",
  "jihad": "جهاد",
  "hijrah": "هجرة",
  "imam": "إمام",
  "makmum": "مأموم",
  "khatib": "خطيب",
  "muadzin": "مؤذن",
  "muazin": "مؤذن",
  "mimbar": "منبر",
  "shaf": "صف",
  "saf": "صف",
  "wudhu": "وضوء",
  "wudu": "وضوء",
  "tayamum": "تيمم"
};

export function transliterateWord(
  rawWord: string,
  preset: PresetType,
  mappings: CustomMapping[]
): WordConversionResult {
  const { clean, prefix, suffix } = stripPunctuation(rawWord);
  if (!clean) {
    return {
      word: rawWord,
      arabic: rawWord,
      steps: [{ original: rawWord, result: rawWord, explanation: "Hanya tanda baca atau spasi." }],
    };
  }

  const steps: ConversionStep[] = [];
  const lowerClean = clean.toLowerCase();

  // 1. Check WORD dictionary first (exact match, case insensitive)
  const wordMaps = mappings.filter((m) => m.type === "word");
  const matchingWordMap = wordMaps.find((m) => m.latin.toLowerCase() === lowerClean);

  if (matchingWordMap) {
    steps.push({
      original: clean,
      result: matchingWordMap.arabic,
      explanation: `Ditemukan kecocokan di Kamus Kata kustom: "${clean}" langsung diterjemahkan menjadi "${matchingWordMap.arabic}".`,
    });
    return {
      word: rawWord,
      arabic: prefix + matchingWordMap.arabic + suffix,
      steps,
    };
  }

  // 1.5 Check if word is an Arabic Loanword
  if (ARABIC_LOANWORDS[lowerClean]) {
    const arabicSpelling = ARABIC_LOANWORDS[lowerClean];
    steps.push({
      original: clean,
      result: arabicSpelling,
      explanation: `Kata "${clean}" terdeteksi sebagai kata serapan Arab asli. Berdasarkan kaidah penulisan, kata ini ditulis sesuai ejaran Arab asli tanpa harakat: "${arabicSpelling}".`,
    });
    return {
      word: rawWord,
      arabic: prefix + arabicSpelling + suffix,
      steps,
    };
  }

  // 2. Rule-Based Transliteration
  let workingWord = lowerClean;
  steps.push({
    original: clean,
    result: workingWord,
    explanation: `Memulai transliterasi fonetik untuk kata: "${clean}".`,
  });

  // Handle Initial Vowel Rule
  // Di Jawi/Pegon, huruf vokal di awal kata harus diawali Alif (ا).
  // Misal: anak -> ا + nak, ibu -> ا + ibu, dsb.
  const firstChar = workingWord[0];
  let startsWithVowel = false;
  if (isVowel(firstChar)) {
    startsWithVowel = true;
    let initialVowelRes = "";
    let explanationVowel = "";

    if (firstChar === "a") {
      initialVowelRes = "ا";
      explanationVowel = `Vokal di awal kata "a" diawali dengan Alif (ا).`;
    } else if (firstChar === "i" || firstChar === "e") {
      initialVowelRes = "اي";
      explanationVowel = `Vokal di awal kata "${firstChar}" diawali Alif + Ya (اي).`;
    } else if (firstChar === "u" || firstChar === "o") {
      initialVowelRes = "او";
      explanationVowel = `Vokal di awal kata "${firstChar}" diawali Alif + Wawu (او).`;
    }

    if (initialVowelRes) {
      workingWord = workingWord.substring(1);
      // We will prepended the Arabic Alif later to our mapped consonants
      steps.push({
        original: firstChar + workingWord,
        result: `[alif-vocal] + ${workingWord}`,
        explanation: explanationVowel,
      });
    }
  }

  // Split mappings into digraphs and characters for scanning
  const digraphMaps = mappings.filter((m) => m.type === "digraph");
  const characterMaps = mappings.filter((m) => m.type === "character");

  // Create lookup maps
  const digraphLookup: Record<string, string> = {};
  digraphMaps.forEach((m) => {
    digraphLookup[m.latin.toLowerCase()] = m.arabic;
  });

  const charLookup: Record<string, string> = {};
  characterMaps.forEach((m) => {
    charLookup[m.latin.toLowerCase()] = m.arabic;
  });

  // Add accents normalization to charLookup
  if (charLookup["e"] !== undefined) {
    charLookup["é"] = charLookup["e"];
    charLookup["è"] = charLookup["e"];
    charLookup["ê"] = ""; // ê is always pepet (unwritten)
  }

  // Special Glottal Stop Rule for K in Jawi & End-of-word Kaf rule in Pegon
  // Di Jawi/Arab Melayu, 'k' di akhir kata sering ditulis dengan Qaf (ق).
  // Di Pegon, 'k' di akhir kata menggunakan huruf Kaf biasa (ك).
  let endsWithKRuleApplied = false;
  let wordWithKPlaceholder = workingWord;
  if (preset === "jawi" && workingWord.endsWith("k") && workingWord.length > 1) {
    endsWithKRuleApplied = true;
    wordWithKPlaceholder = workingWord.slice(0, -1) + "[qaf-akhir]";
    steps.push({
      original: workingWord,
      result: wordWithKPlaceholder,
      explanation: `Aturan Jawi: Huruf 'k' di akhir kata diubah menjadi Qaf (ق) sebagai hamzah/glottal stop.`,
    });
  } else if (preset === "pegon" && workingWord.endsWith("k") && workingWord.length > 1) {
    endsWithKRuleApplied = true;
    wordWithKPlaceholder = workingWord.slice(0, -1) + "[kaf-akhir]";
    steps.push({
      original: workingWord,
      result: wordWithKPlaceholder,
      explanation: `Aturan Pegon: Huruf 'k' di akhir kata menggunakan huruf Kaf (ك).`,
    });
  }

  // Process the characters in segments
  // We scan the words. We do it character by character, matching digraphs first.
  let arabicOutput = "";
  let i = 0;
  const wordToScan = wordWithKPlaceholder;

  while (i < wordToScan.length) {
    // Check if we hit the [qaf-akhir] placeholder
    if (wordToScan.substring(i).startsWith("[qaf-akhir]")) {
      arabicOutput += "ق";
      i += "[qaf-akhir]".length;
      continue;
    }

    // Check if we hit the [kaf-akhir] placeholder
    if (wordToScan.substring(i).startsWith("[kaf-akhir]")) {
      arabicOutput += "ك";
      i += "[kaf-akhir]".length;
      continue;
    }

    // Check if we hit the [alif-vocal] placeholder if any (though we stripped it, just in case)
    if (wordToScan.substring(i).startsWith("[alif-vocal]")) {
      i += "[alif-vocal]".length;
      continue;
    }

    // 1. Try digraph of 2 characters
    if (i < wordToScan.length - 1) {
      const potentialDigraph = wordToScan.substring(i, i + 2);
      if (digraphLookup[potentialDigraph]) {
        const arabicChar = digraphLookup[potentialDigraph];
        arabicOutput += arabicChar;
        steps.push({
          original: potentialDigraph,
          result: arabicChar,
          explanation: `Digraf "${potentialDigraph}" dipetakan ke "${arabicChar}".`,
        });
        i += 2;
        continue;
      }
    }

    // 2. Try single character
    const currentChar = wordToScan[i];
    if (charLookup[currentChar] !== undefined) {
      const arabicChar = charLookup[currentChar];
      
      // Smart Pepet vowel handling: in Jawi & Pegon, 'e' as pepet (e.g. bekas, bekal, emas, kera, teman) is unwritten.
      if ((currentChar === "e" || currentChar === "ê") && isEPepet(wordToScan, i)) {
        steps.push({
          original: currentChar,
          result: "",
          explanation: `Aturan Pepet: Huruf "${currentChar}" dideteksi sebagai pepet (seperti dalam bekas/bekal), sehingga diabaikan dan tidak menggunakan huruf Ya (ي).`,
        });
        i++;
        continue;
      }

      arabicOutput += arabicChar;
      if (arabicChar) {
        steps.push({
          original: currentChar,
          result: arabicChar,
          explanation: `Huruf "${currentChar}" dipetakan ke "${arabicChar}".`,
        });
      } else {
        steps.push({
          original: currentChar,
          result: "",
          explanation: `Huruf "${currentChar}" diabaikan (pepet tidak ditulis).`,
        });
      }
    } else {
      // Non-mapped letter (e.g. numbers, special chars, or unmapped characters)
      arabicOutput += currentChar;
      steps.push({
        original: currentChar,
        result: currentChar,
        explanation: `Karakter "${currentChar}" tidak terpetakan, ditulis apa adanya.`,
      });
    }
    i++;
  }

  // Prepend the initial vowel Alif if required
  if (startsWithVowel) {
    const firstV = lowerClean[0];
    let alifHeader = "ا";
    if (firstV === "i" || firstV === "e") {
      alifHeader = "اي";
    } else if (firstV === "u" || firstV === "o") {
      alifHeader = "او";
    }

    // Let's check if the first character of the output is already Alif (to avoid duplicates or clean it up nicely)
    // Since we stripped the vowel in workingWord, arabicOutput has consonants/other vowels.
    arabicOutput = alifHeader + arabicOutput;
  }

  // Return the full formatted result
  return {
    word: rawWord,
    arabic: prefix + arabicOutput + suffix,
    steps,
  };
}

export function transliterateText(
  text: string,
  preset: PresetType,
  mappings: CustomMapping[]
): { arabicText: string; wordsResult: WordConversionResult[] } {
  if (!text.trim()) {
    return { arabicText: "", wordsResult: [] };
  }

  const lines = text.split("\n");
  const wordsResultList: WordConversionResult[] = [];
  const translatedLines = lines.map((line) => {
    // Handle empty line
    if (!line.trim()) return "";

    // Split words but keep spacing intact
    const wordsWithSpaces = line.split(/(\s+)/);
    const convertedSegments = wordsWithSpaces.map((segment) => {
      if (!segment.trim()) {
        return segment; // Keep trailing spaces
      }
      
      const res = transliterateWord(segment, preset, mappings);
      wordsResultList.push(res);
      return res.arabic;
    });

    return convertedSegments.join("");
  });

  return {
    arabicText: translatedLines.join("\n"),
    wordsResult: wordsResultList,
  };
}

export function transliteratePegonToLatinWord(
  rawWord: string,
  mappings: CustomMapping[]
): WordConversionResult {
  const { clean, prefix, suffix } = stripPunctuation(rawWord);
  if (!clean) {
    return {
      word: rawWord,
      arabic: rawWord,
      steps: [{ original: rawWord, result: rawWord, explanation: "Hanya tanda baca atau spasi." }],
    };
  }

  const steps: ConversionStep[] = [];
  const lowerClean = clean.trim();

  // 1. Check custom WORD dictionary mappings
  const wordMaps = mappings.filter((m) => m.type === "word");
  const matchingWordMap = wordMaps.find((m) => m.arabic === lowerClean);

  if (matchingWordMap) {
    steps.push({
      original: clean,
      result: matchingWordMap.latin,
      explanation: `Ditemukan kecocokan di Kamus Kata kustom: Arab Pegon "${clean}" dipetakan ke Latin "${matchingWordMap.latin}".`,
    });
    return {
      word: rawWord,
      arabic: prefix + matchingWordMap.latin + suffix,
      steps,
    };
  }

  // 1.5 Check if it matches an Arabic Loanword
  const foundLoanwordKey = Object.keys(ARABIC_LOANWORDS).find(
    (key) => ARABIC_LOANWORDS[key] === lowerClean
  );
  if (foundLoanwordKey) {
    steps.push({
      original: clean,
      result: foundLoanwordKey,
      explanation: `Kata "${clean}" terdeteksi sebagai kata serapan Arab asli. Transliterasi balik yang sesuai adalah "${foundLoanwordKey}".`,
    });
    return {
      word: rawWord,
      arabic: prefix + foundLoanwordKey + suffix,
      steps,
    };
  }

  // 2. Rule-Based Transliteration pegon -> latin
  steps.push({
    original: clean,
    result: clean,
    explanation: `Memulai transliterasi fonetis Arab Pegon ke Latin untuk aksara: "${clean}".`,
  });

  const reverseDigraphLookup: Record<string, string> = {
    "خ": "kh",
    "ش": "sy",
    "ڠ": "ng",
    "ڽ": "ny",
    "ۑ": "ny",
    "ط": "th",
    "ڊ": "dh",
    "ص": "sh",
    "ث": "ts",
    "ذ": "dz",
    "غ": "gh"
  };

  const reverseCharLookup: Record<string, string> = {
    "ب": "b",
    "چ": "c",
    "د": "d",
    "ف": "f",
    "ڮ": "g",
    "ݢ": "g",
    "گ": "g",
    "ࢴ": "g",
    "ه": "h",
    "ج": "j",
    "ک": "k",
    "ك": "k",
    "ل": "l",
    "م": "m",
    "ن": "n",
    "ڤ": "p",
    "ق": "k",
    "ر": "r",
    "س": "s",
    "ت": "t",
    "ۏ": "v",
    "و": "w",
    "ي": "y",
    "ز": "z",
    "ع": "'",
    "ح": "h",
    "ض": "dh",
    "ظ": "zh",
    "أ": "a",
    "إ": "i",
    "ؤ": "u",
    "ئ": "i",
    "ء": "'"
  };

  let latinOutput = "";
  let i = 0;
  const wordLen = lowerClean.length;

  while (i < wordLen) {
    const char = lowerClean[i];
    const nextChar = i + 1 < wordLen ? lowerClean[i + 1] : "";
    const nextNextChar = i + 2 < wordLen ? lowerClean[i + 2] : "";

    // Handle initial vowel (starts with Alif 'ا')
    if (i === 0 && char === "ا") {
      if (nextChar === "ي") {
        if (nextNextChar === "ا" || nextNextChar === "ي" || nextNextChar === "و") {
          latinOutput += "a";
          steps.push({ original: "ا", result: "a", explanation: "Alif di awal kata diikuti huruf saksi diurai sebagai vokal 'a'." });
          i += 1;
        } else {
          latinOutput += "i";
          steps.push({ original: "اي", result: "i", explanation: "Alif + Ya di awal kata diurai sebagai vokal 'i'." });
          i += 2;
        }
      } else if (nextChar === "و") {
        if (nextNextChar === "ا" || nextNextChar === "ي" || nextNextChar === "و") {
          latinOutput += "a";
          steps.push({ original: "ا", result: "a", explanation: "Alif di awal kata diikuti huruf saksi diurai sebagai vokal 'a'." });
          i += 1;
        } else {
          latinOutput += "u";
          steps.push({ original: "او", result: "u", explanation: "Alif + Wawu di awal kata diurai sebagai vokal 'u'." });
          i += 2;
        }
      } else {
        latinOutput += "a";
        steps.push({ original: "ا", result: "a", explanation: "Alif di awal kata diurai sebagai vokal 'a'." });
        i += 1;
      }
      continue;
    }

    // Check digraph
    if (reverseDigraphLookup[char]) {
      const latDigraph = reverseDigraphLookup[char];
      latinOutput += latDigraph;
      steps.push({ original: char, result: latDigraph, explanation: `Huruf Pegon "${char}" dibaca sebagai konsonan "${latDigraph}".` });
      i += 1;
      continue;
    }

    // Check single character
    if (reverseCharLookup[char]) {
      const cons = reverseCharLookup[char];

      if (char === "ي") {
        if (nextChar === "ا" || nextChar === "و" || nextChar === "ي") {
          latinOutput += "y";
          steps.push({ original: "ي", result: "y", explanation: "Ya bertindak sebagai konsonan 'y' karena diikuti vokal murni." });
        } else {
          latinOutput += "i";
          steps.push({ original: "ي", result: "i", explanation: "Ya bertindak sebagai vokal murni 'i'." });
        }
        i += 1;
        continue;
      }

      if (char === "و") {
        if (nextChar === "ا" || nextChar === "و" || nextChar === "ي") {
          latinOutput += "w";
          steps.push({ original: "و", result: "w", explanation: "Wawu bertindak sebagai konsonan 'w' karena diikuti vokal murni." });
        } else {
          latinOutput += "u";
          steps.push({ original: "و", result: "u", explanation: "Wawu bertindak sebagai vokal murni 'u'." });
        }
        i += 1;
        continue;
      }

      if (char === "ا") {
        latinOutput += "a";
        steps.push({ original: "ا", result: "a", explanation: "Alif diurai sebagai vokal 'a'." });
        i += 1;
        continue;
      }

      // It is a static consonant sound
      latinOutput += cons;

      // Lookahead helper for following vowel saksi
      if (nextChar === "ا") {
        latinOutput += "a";
        steps.push({ original: char + "ا", result: cons + "a", explanation: `Konsonan "${char}" diiringi huruf saksi Alif dibaca "${cons}a".` });
        i += 2;
      } else if (nextChar === "ي") {
        if (nextNextChar === "ا" || nextNextChar === "و" || nextNextChar === "ي") {
          // Ya acting as y
          steps.push({ original: char, result: cons, explanation: `Konsonan "${char}" dibaca "${cons}".` });
          i += 1;
        } else {
          latinOutput += "i";
          steps.push({ original: char + "ي", result: cons + "i", explanation: `Konsonan "${char}" diiringi huruf saksi Ya dibaca "${cons}i".` });
          i += 2;
        }
      } else if (nextChar === "و") {
        if (nextNextChar === "ا" || nextNextChar === "و" || nextNextChar === "ي") {
          steps.push({ original: char, result: cons, explanation: `Konsonan "${char}" dibaca "${cons}".` });
          i += 1;
        } else {
          latinOutput += "u";
          steps.push({ original: char + "و", result: cons + "u", explanation: `Konsonan "${char}" diiringi huruf saksi Wawu dibaca "${cons}u".` });
          i += 2;
        }
      } else {
        // No vowel follower - insert implicit pepet "e" if followed by another consonant
        if (nextChar && (reverseCharLookup[nextChar] || reverseDigraphLookup[nextChar])) {
          latinOutput += "e";
          steps.push({ original: char, result: cons + "e", explanation: `Konsonan "${char}" tidak diiringi huruf saksi, dideteksi bunyi pepet "e" sehingga diurai "${cons}e".` });
        } else {
          steps.push({ original: char, result: cons, explanation: `Konsonan "${char}" di akhir suku kata dibaca "${cons}".` });
        }
        i += 1;
      }
      continue;
    }

    // Default other character
    latinOutput += char;
    steps.push({ original: char, result: char, explanation: "Ditulis apa adanya." });
    i += 1;
  }

  return {
    word: rawWord,
    arabic: prefix + latinOutput + suffix,
    steps,
  };
}

export function transliteratePegonToLatinText(
  text: string,
  mappings: CustomMapping[]
): { arabicText: string; wordsResult: WordConversionResult[] } {
  if (!text.trim()) {
    return { arabicText: "", wordsResult: [] };
  }

  const lines = text.split("\n");
  const wordsResultList: WordConversionResult[] = [];
  const translatedLines = lines.map((line) => {
    if (!line.trim()) return "";

    const wordsWithSpaces = line.split(/(\s+)/);
    const convertedSegments = wordsWithSpaces.map((segment) => {
      if (!segment.trim()) {
        return segment;
      }
      const res = transliteratePegonToLatinWord(segment, mappings);
      wordsResultList.push(res);
      return res.arabic;
    });

    return convertedSegments.join("");
  });

  return {
    arabicText: translatedLines.join("\n"),
    wordsResult: wordsResultList,
  };
}
