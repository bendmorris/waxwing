import { TempVar } from './temp';

export interface Effect {
    old: TempVar
    new: TempVar,
}
