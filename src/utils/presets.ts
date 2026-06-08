import { CustomMapping } from "../types";

export const DEFAULT_PEGON_MAPPINGS: CustomMapping[] = [
  // Digraphs & Javanese sounds
  { id: "p_kh", latin: "kh", arabic: "خ", type: "digraph", isPreset: true },
  { id: "p_sy", latin: "sy", arabic: "ش", type: "digraph", isPreset: true },
  { id: "p_ng", latin: "ng", arabic: "ڠ", type: "digraph", description: "Huruf Nga", isPreset: true },
  { id: "p_ny", latin: "ny", arabic: "ڽ", type: "digraph", description: "Huruf Nya", isPreset: true },
  { id: "p_th", latin: "th", arabic: "ط", type: "digraph", description: "Tho atau T-tebal", isPreset: true },
  { id: "p_dh", latin: "dh", arabic: "ڊ", type: "digraph", description: "Dal bertitik bawah atau D-tebal", isPreset: true },

  // Consonants
  { id: "p_b", latin: "b", arabic: "ب", type: "character", isPreset: true },
  { id: "p_c", latin: "c", arabic: "چ", type: "character", description: "Ca (Jim bertitik 3)", isPreset: true },
  { id: "p_d", latin: "d", arabic: "د", type: "character", isPreset: true },
  { id: "p_f", latin: "f", arabic: "ف", type: "character", isPreset: true },
  { id: "p_g", latin: "g", arabic: "ࢴ", type: "character", description: "Kaf dengan 1 titik di bawah untuk Ga", isPreset: true },
  { id: "p_h", latin: "h", arabic: "ه", type: "character", isPreset: true },
  { id: "p_j", latin: "j", arabic: "ج", type: "character", isPreset: true },
  { id: "p_k", latin: "k", arabic: "ک", type: "character", isPreset: true },
  { id: "p_l", latin: "l", arabic: "ل", type: "character", isPreset: true },
  { id: "p_m", latin: "m", arabic: "م", type: "character", isPreset: true },
  { id: "p_n", latin: "n", arabic: "ن", type: "character", isPreset: true },
  { id: "p_p", latin: "p", arabic: "ڤ", type: "character", description: "Pê (Fa bertitik 3)", isPreset: true },
  { id: "p_q", latin: "q", arabic: "ق", type: "character", isPreset: true },
  { id: "p_r", latin: "r", arabic: "ر", type: "character", isPreset: true },
  { id: "p_s", latin: "s", arabic: "س", type: "character", isPreset: true },
  { id: "p_t", latin: "t", arabic: "ت", type: "character", isPreset: true },
  { id: "p_v", latin: "v", arabic: "ف", type: "character", isPreset: true },
  { id: "p_w", latin: "w", arabic: "و", type: "character", isPreset: true },
  { id: "p_y", latin: "y", arabic: "ي", type: "character", isPreset: true },
  { id: "p_z", latin: "z", arabic: "ز", type: "character", isPreset: true },

  // Vowels
  { id: "p_a", latin: "a", arabic: "ا", type: "character", isPreset: true },
  { id: "p_i", latin: "i", arabic: "ي", type: "character", isPreset: true },
  { id: "p_u", latin: "u", arabic: "و", type: "character", isPreset: true },
  { id: "p_e", latin: "e", arabic: "ي", type: "character", description: "Pegon e taling", isPreset: true },
  { id: "p_o", latin: "o", arabic: "و", type: "character", isPreset: true },

  // Pegon Word References
  { id: "pw_saya", latin: "saya", arabic: "سايا", type: "word", description: "Saya (Pegon menulis alif akhir)", isPreset: true },
  { id: "pw_buku", latin: "buku", arabic: "بوكو", type: "word", description: "Buku", isPreset: true },
  { id: "pw_kita", latin: "kita", arabic: "كيتا", type: "word", description: "Kita (Pegon menulis alif akhir)", isPreset: true },
  { id: "pw_dan", latin: "dan", arabic: "دان", type: "word", isPreset: true },
  { id: "pw_yang", latin: "yang", arabic: "ياڠ", type: "word", isPreset: true },
  { id: "pw_ke", latin: "ke", arabic: "ك", type: "word", description: "Ke", isPreset: true },
  { id: "pw_ini", latin: "ini", arabic: "ايني", type: "word", isPreset: true },
  { id: "pw_itu", latin: "itu", arabic: "ايتو", type: "word", isPreset: true },
  { id: "pw_ada", latin: "ada", arabic: "ادا", type: "word", description: "Ada (Pegon menulis alif)", isPreset: true }
];
