export interface ISketchbookTab {
  id: string;
  title: string;
  color: string;
  content: string;
  order: number;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface ICreateSketchbookTab {
  title?: string;
  color?: string;
  content?: string;
}

export interface IUpdateSketchbookTab {
  title?: string;
  color?: string;
  content?: string;
  order?: number;
}
