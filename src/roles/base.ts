import { RoleName } from '../types';

export interface Role {
  name: RoleName;
  run(creep: Creep): void;
}
