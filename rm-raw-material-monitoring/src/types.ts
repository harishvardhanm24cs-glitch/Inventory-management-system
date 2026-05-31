export type UserRole = 'store' | 'engineer' | 'manager' | 'admin';
export type VisualTheme = 'light' | 'dark' | 'high-contrast';

export interface Material {
    id: string;
    name: string;
    weight: number;
    batch: string;
    location: string;
    scanType?: 'inward' | 'outward';
    remaining?: number;
}

export interface Transaction {
    id: string;
    materialId: string;
    materialName: string;
    weight: number;
    type: 'inward' | 'outward';
    timestamp: Date;
    userRole: UserRole;
}
