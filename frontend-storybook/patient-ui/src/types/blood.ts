export type ABO = 'A' | 'B' | 'AB' | 'O';
export type RhD = '+' | '-';

export interface BloodType {
  abo: ABO;
  rhd: RhD;
}

// Rh System antigens (beyond D)
export interface RhPhenotype {
  D?: boolean;
  C?: boolean;
  E?: boolean;
  c?: boolean;
  e?: boolean;
}

// Kell System
export interface KellPhenotype {
  K?: boolean;
  k?: boolean;
}

// Duffy System
export interface DuffyPhenotype {
  Fya?: boolean;
  Fyb?: boolean;
}

// Kidd System
export interface KiddPhenotype {
  Jka?: boolean;
  Jkb?: boolean;
}

// MNS System
export interface MNSPhenotype {
  M?: boolean;
  N?: boolean;
  S?: boolean;
  s?: boolean;
}

export const DEFAULT_BLOOD_PHENOTYPE: BloodPhenotype = {
  rh: {},
  kell: {},
  duffy: {},
  kidd: {},
  mns: {},
  other: {},
};

export interface BloodPhenotype {
  rh: RhPhenotype;
  kell: KellPhenotype;
  duffy: DuffyPhenotype;
  kidd: KiddPhenotype;
  mns: MNSPhenotype;
  other?: Record<string, boolean>;
}

// Special handling requirements or restrictions
export interface TransfusionRequirements {
  immediateSpinRequired?: boolean;
  salineToAHGRequired?: boolean;
  preWarmRequired?: boolean;
  specialRequirements?: string[];
}

// Overall blood profile
export interface BloodProfile {
  abo: ABO;
  rh: RhD;
  phenotype: BloodPhenotype;
  antibodies: string[];
  restrictions?: string[];
  requirements?: TransfusionRequirements;
}
