export interface CustomMapping {
  id: string;
  latin: string;
  arabic: string;
  type: "character" | "digraph" | "word";
  description?: string;
  isPreset?: boolean;
}

export type PresetType = "pegon" | "custom";

export interface TransliteratorConfig {
  preset: PresetType;
  customMappings: CustomMapping[];
}

export interface TranslationItem {
  id: string;
  timestamp: string;
  latin: string;
  arabic: string;
  preset: PresetType;
  notes?: string;
  user?: string;
  location?: string;
  ipAddress?: string;
}

export interface ConversionStep {
  original: string;
  result: string;
  explanation: string;
}

export interface WordConversionResult {
  word: string;
  arabic: string;
  steps: ConversionStep[];
}
