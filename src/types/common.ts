export type ID = string;

export interface Timestamped {
  createdAt: string;
  updatedAt: string;
}

export interface DateRange {
  start: string;
  end: string;
}

export interface SelectOption<T = string> {
  label: string;
  value: T;
}
