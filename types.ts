export enum DesignCategory {
  LIGHTING = 'Lighting',
  COLOR_PALETTE = 'Color Palette',
  LAYOUT = 'Layout & Flow',
  TEXTURES = 'Textures & Fabrics',
  DECOR = 'Decor & Styling'
}

export interface DesignAdvice {
  title: string;
  description: string;
  principleSource: string; // e.g., "Inspired by 'The Interior Design Handbook'"
}

export interface GeneratedVisualization {
  imageUrl: string;
  description: string;
}

export type LoadingState = 'idle' | 'cleaning' | 'analyzing' | 'visualizing';

export interface AnalysisResult {
  category: DesignCategory;
  advice: DesignAdvice[];
  visualizations: GeneratedVisualization[];
}