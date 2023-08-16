
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

export type PuzzleData = {
    cells: Cell[]
    size: number
    starCount: number
    rows: number[][]
    columns: number[][]
    groups: number[][]
    cellIndexToGroupIndex: number[]
}