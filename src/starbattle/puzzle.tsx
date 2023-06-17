import { useMemo, useState } from "react";

enum Cell {
    BLANK,
    SPACE,
    STAR
}

function makeColumnView(cells: Cell[], size: number): Cell[][] {
   const columns = []
    for (let x = 0; x < size; x++) {
        const column: Cell[] = []
        columns.push(column)
        for (let y = 0; y < size; y++) {
            const i = y * size + x
            column.push(cells[i])
        }
    }
    return columns
}

function makeRowView(columns: Cell[][]): Cell[][] {
    const size = columns.length
    const rows = []
    for (let y = 0; y < size; y++) {
        rows.push(columns.map(column => column[y]))
    }
    return rows
}

function makeGroupView(cells: Cell[], walls: boolean[]): Cell[][] {
    //todo
    return []
}


function makeNeighbourView(cells: Cell[], size: number): Cell[][] {
    function addCellTypeIfExists(dest: Cell[], i: number) {
        if (i < 0 || i > size) return
        const cell = cells[i]
        if (!cell) return
        dest.push(cell)
    }
    function getNeighbours(i: number) {
        const neighbours: Cell[] = []
        addCellTypeIfExists(neighbours, i - size - 1)
        addCellTypeIfExists(neighbours, i - size)
        addCellTypeIfExists(neighbours, i - size + 1)
        addCellTypeIfExists(neighbours, i - 1)
        addCellTypeIfExists(neighbours, i + 1)
        addCellTypeIfExists(neighbours, i + size - 1)
        addCellTypeIfExists(neighbours, i + size)
        addCellTypeIfExists(neighbours, i + size + 1)
        return neighbours
    }
    return cells.map((_, i) => getNeighbours(i))
}

type CellProps = {
    value: Cell
}

function StarBattleCell({ value }: CellProps): JSX.Element {
    const typeToSymbol = {
        [Cell.BLANK]: "",
        [Cell.SPACE]: "✖",
        [Cell.STAR]: "★",
    }
    const symbol = typeToSymbol[value]
    return <>{symbol}</>
}

type RowProps = {
    cells: Cell[]
}

function StarBattleRow({ cells }: RowProps): JSX.Element {
    const items = cells.map((_, i) => (
        <StarBattleCell key={i} value={cells[i]} />
    ))
    return <>{items}</>
}

export default function StarBattlePuzzle({ size = 10, starCount = 2 }): JSX.Element {
    const [cells, setCellTypes] = useState(Array(size**2).fill(Cell.STAR))
    const [walls, setWalls] = useState(Array((size-1)**2).fill(false))
    const columns = useMemo(() => makeColumnView(cells, size), [cells, size])
    const rows = useMemo(() => makeRowView(columns), [columns])
    const neighbours = useMemo(() => makeNeighbourView(cells, size), [cells, size])
    const groups = useMemo(() => makeGroupView(cells, walls), [cells, walls])

    function getCellType(x: number, y: number): Cell | undefined {
        if (x < 0 || x >= size || y < 0 || y >= size) {
            return
        }
        return columns[x][y]
    }

    /**
     * isSolvable - Returns true if puzzle has no mistakes
     */
    function isSolvable(): boolean {
        // puzzle must be solvable from this position
        // for each cell with star, surrounding cells must have no star
        // each row, column, group must have at most n stars
        return true
    }

    /**
     * isSolved - Returns true if puzzle is solved
     */
    function isSolved(): boolean {
        // for each cell that have a star, surrounding cells must have no star
        for (let i = 0; i < cells.length; i++) {
            if (cells[i] == Cell.STAR) {
                if (neighbours[i].find(neighbour => neighbour == Cell.STAR)) {
                    return false
                }
            }
        }
        // each row, column, group must have exactly n stars
        for (const row of rows) {
            if (getStarCount(row) != starCount) return false
        }
        for (const column of columns) {
            if (getStarCount(column) != starCount) return false
        }
        for (const group of groups) {
            if (getStarCount(group) != starCount) return false
        }
        return true
    }

    function getStarCount(cells: Cell[]) {
        return cells.reduce((sum, current) => current == Cell.STAR ? sum + 1 : sum, 0)
    }

    const contentRows = rows.map((row, i) => (
        <StarBattleRow key={i}  cells={row} />
    ))
    return <>{contentRows}</>
}