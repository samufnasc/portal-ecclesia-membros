export interface Member {
  id: string;
  name: string;
  birthday: string; // "DD/MMM" format
  month: string;    // "Janeiro", "Fevereiro", etc.
  day: number;
  departments: string[];
  isLeadership: boolean;
  baptismDate?: string;   // "YYYY-MM-DD"
  marriageDate?: string;  // "YYYY-MM-DD"
  membershipType: 'Batizado' | 'Congregado' | 'Visitante';
}

export type Department = 
  | 'Liderança'
  | 'Obreiros'
  | 'Secretaria'
  | 'EBD'
  | 'Ministério de Louvor'
  | 'Sonoplastia'
  | 'Missão/Assistência Social'
  | 'Mídia'
  | 'Círculo de Oração'
  | 'Mocidade'
  | 'Família';
