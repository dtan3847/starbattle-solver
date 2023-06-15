enum CellType {
    BLANK,
    SPACE,
    STAR
}

class Cell {
    cellType = CellType.BLANK
    neighbours: Cell[] = []
    
    constructor() {}

    public setNeighbours(neighbours: Cell[]) {
        this.neighbours = neighbours
    }
}

export default class StarBattlePuzzle {
    columns: Cell[][] = []
    rows: Cell[][] = []
    groups: Cell[][] = []

    size: number
    starCount: number

    constructor(size: number, starCount: number) {
        this.size = size
        this.starCount = starCount
        for (let x = 0; x < size; x++) {
            const column: Cell[] = []
            this.columns.push(column)
            for (let y = 0; y < size; y++) {
                const cell = new Cell()
                column.push(cell)
            }
        }
        for (let y = 0; y < size; y++) {
            this.rows.push(this.columns.map(column => column[y]))
        }
        for (let x = 0; x < size; x++) {
            for (let y = 0; y < size; y++) {
                this.columns[x][y].setNeighbours(this.getNeighbours(x, y))
            }
        }
    }

    private getCell(x: number, y: number): Cell | undefined {
        if (x < 0 || x >= this.size || y < 0 || y >= this.size) {
            return
        }
        return this.columns[x][y]
    }

    private getNeighbours(x: number, y: number): Cell[] {
        const neighbours: Cell[] = []
        this.addCellIfExists(neighbours, x-1, y-1)
        this.addCellIfExists(neighbours, x-1, y)
        this.addCellIfExists(neighbours, x-1, y+1)
        this.addCellIfExists(neighbours, x, y-1)
        this.addCellIfExists(neighbours, x, y+1)
        this.addCellIfExists(neighbours, x+1, y-1)
        this.addCellIfExists(neighbours, x+1, y)
        this.addCellIfExists(neighbours, x+1, y+1)
        return neighbours
    }

    private addCellIfExists(cells: Cell[], x: number, y: number) {
        const cell = this.getCell(x, y)
        if (cell) {
            cells.push(cell)
        }
    }

    /**
     * isSolvable - Returns true if puzzle has no mistakes
     */
    public isSolvable(): boolean {
        // puzzle must be solvable from this position
        // for each cell with star, surrounding cells must have no star
        // each row, column, group must have at most n stars
        return true
    }

    /**
     * isSolved - Returns true if puzzle is solved
     */
    public isSolved(): boolean {
        // for each cell that have a star, surrounding cells must have no star
        for (let x = 0; x < this.size; x++) {
            for (let y = 0; y < this.size; y++) {
                const cell = this.columns[x][y]
                if (cell.cellType == CellType.STAR) {
                    if (cell.neighbours.find(neighbour => neighbour.cellType == CellType.STAR)) {
                        return false
                    }
                }
            }
        }
        // each row, column, group must have exactly n stars
        for (const row of this.rows) {
            if (this.getStarCount(row) != this.starCount) return false
        }
        for (const column of this.columns) {
            if (this.getStarCount(column) != this.starCount) return false
        }
        for (const group of this.groups) {
            if (this.getStarCount(group) != this.starCount) return false
        }
        return true
    }

    private getStarCount(cells: Cell[]) {
        return cells.reduce((sum, current) => current.cellType == CellType.STAR ? sum + 1 : sum, 0)
    }
}