export type PanelId = 'gallery' | 'settings';

export interface PanelConfig {
  id: PanelId;
  icon: string;
  label: string;
}
