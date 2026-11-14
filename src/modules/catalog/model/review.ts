export interface OwnReview {
    reviewId: number | null;
    rating: number | null;
    comment: string | null;
    updatedAt: string | null;
}
export interface SaveReview {
    rating: number;
    comment: string;
}
