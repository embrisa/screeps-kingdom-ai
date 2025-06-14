export interface Role {
    name: string;
    run(creep: any): void;
} 