export interface Crossword {
  id?: string;
  word: string;
  clue: string;
  visible?: boolean;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt?: FirebaseFirestore.Timestamp;
}
