
export enum Cell {
    BLANK,
    STAR,
    X,
}

export type PuzzleStep = {
    indices?: number[]
    otherIndices?: number[]
    type?: Cell
    message?: string
}