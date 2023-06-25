import { useMemo, useState } from "react";
import classNames from 'classnames';

import './puzzle.css'

enum Cell {
    BLANK,
    STAR,
    X,
}

enum Mode {
    DRAW,
    SOLVE,
}

function makeColumnView(cells: Cell[], size: number): Cell[][] {
   const columns = []
    for (let x = 0; x < size; x++) {
        const column: Cell[] = []
        columns.push(column)
        for (let y = 0; y < size; y++) {
            const i = getIndex(x, y, size)
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

function makeGroupView(cells: Cell[], groups: number[][]): Cell[][] {
    return groups.map(group => group.map(index => cells[index]))
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
    value: string
    className: string
    onClick: React.MouseEventHandler<HTMLButtonElement>
}

function StarBattleCell({ value, className, onClick }: CellProps): JSX.Element {
    return (
        <button
            className={className}
            onClick={onClick}
            onContextMenu={onClick}
        >
            {value}
        </button>
    )
}

export default function StarBattlePuzzle({ size = 5, starCount = 1 }): JSX.Element {
    const [cells, setCells] = useState(Array(size**2).fill(Cell.BLANK))
    const [horizontalWalls, setHorizontalWalls] = useState(Array(size*(size-1)).fill(false))
    const [verticalWalls, setVerticalWalls] = useState(Array(size*(size-1)).fill(false))
    const columnView = useMemo(() => makeColumnView(cells, size), [cells, size])
    const rowView = useMemo(() => makeRowView(columnView), [columnView])
    const neighbourView = useMemo(() => makeNeighbourView(cells, size), [cells, size])
    const {groups, groupIndices} = useMemo(() => makeGroups(), [size, horizontalWalls, verticalWalls])
    const groupView = useMemo(() => makeGroupView(cells, groups), [cells, groups])
    const [mode, setMode] = useState(Mode.DRAW)
    
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
                if (neighbourView[i].find(neighbour => neighbour == Cell.STAR)) {
                    return false
                }
            }
        }
        // each row, column, group must have exactly n stars
        for (const row of rowView) {
            if (getStarCount(row) != starCount) return false
        }
        for (const column of columnView) {
            if (getStarCount(column) != starCount) return false
        }
        for (const group of groupView) {
            if (getStarCount(group) != starCount) return false
        }
        return true
    }

    function getCell(x: number, y: number): Cell | undefined {
        if (x < 0 || x >= size || y < 0 || y >= size) return
        return columnView[x][y]
    }

    function setCell(i: number, newValue: Cell) {
        const newCells = cells.slice()
        newCells[i] = newValue
        setCells(newCells)
    }

    // horizontal walls are in size columns, size-1 rows
    function horizontalWallExists(x: number, y: number): boolean  {
        if (x < 0 || x >= size || y < 0 || y >= size - 1) return false
        return horizontalWalls[getIndex(x, y, size)]
    }

    function toggleHorizontalWall(x: number, y: number) {
        if (x < 0 || x >= size || y < 0 || y >= size - 1) return
        const i = getIndex(x, y, size)
        const newWalls = horizontalWalls.slice()
        newWalls[i] = !newWalls[i]
        setHorizontalWalls(newWalls)
    }

    // vertical walls are in size-1 columns, size rows
    function verticalWallExists(x: number, y: number): boolean {
        if (x < 0 || x >= size - 1 || y < 0 || y >= size) return false
        return verticalWalls[getIndex(x, y, size - 1)]
    }

    function toggleVerticalWall(x: number, y: number) {
        if (x < 0 || x >= size - 1 || y < 0 || y >= size) return
        const i = getIndex(x, y, size - 1)
        const newWalls = verticalWalls.slice()
        newWalls[i] = !newWalls[i]
        setVerticalWalls(newWalls)
    }

    type GroupOut = {
        groups: number[][]
        groupIndices: number[]
    }
    
    function makeGroups(): GroupOut {
        const groupsSet: Set<number[]> = new Set()
        const indexToGroup: Map<number, number[]> = new Map()
        function setGroup(index: number, group: number[]) {
            group.push(index)
            indexToGroup.set(index, group)
        }
        function updateNeighbour(currIndex: number, neighbourIndex: number) {
            const currGroup = indexToGroup.get(currIndex)!
            if (indexToGroup.has(neighbourIndex)) {
                // if neighbour in a different group, merge groups
                const rightGroup = indexToGroup.get(neighbourIndex)!
                if (currGroup !== rightGroup) {
                    for (const i of rightGroup) {
                        setGroup(i, currGroup)
                    }
                    groupsSet.delete(rightGroup)
                }
            } else {
                // if no group, assign same group
                setGroup(neighbourIndex, currGroup)
            }
        }

        // for each cell
        for (let i = 0; i < cells.length; i++) {
            // if not in group, create new group and add to it
            if (!indexToGroup.has(i)) {
                const newGroup: number[] = []
                groupsSet.add(newGroup)
                setGroup(i, newGroup)
            }
            // update neighbour (down/right) if no wall:
            const { x, y } = getCoords(i, size)
            if (x < size - 1 && !verticalWallExists(x, y)) {
                updateNeighbour(i, getIndex(x + 1, y, size))
            }
            if (y < size - 1 && !horizontalWallExists(x, y)) {
                updateNeighbour(i, getIndex(x, y + 1, size))
            }
        }
        const groups = Array.from(groupsSet)
        const groupIndices: number[] = []
        for (let i = 0; i < cells.length; i++) {
            groupIndices[i] = groups.indexOf(indexToGroup.get(i)!)
        }
        return {groups, groupIndices }
    }

    function makeCellClickHandler(i: number) {
        const { x, y } = getCoords(i, size)
        const margin = 7 // px
        return (event: React.MouseEvent<HTMLElement>) => {
            if (event.target instanceof HTMLElement) {
                event.preventDefault()
                const { clientX, clientY, target: { offsetLeft, offsetTop, offsetWidth, offsetHeight }} = event
                // console.log(x, y, clientX, clientY, offsetLeft, offsetTop, offsetLeft + offsetWidth, offsetTop + offsetHeight)
                if (mode === Mode.SOLVE) {
                    console.log(cells[i], cells[i] + 1, (cells[i] + 1) % 3, cells[i] + 2, (cells[i] + 2) % 3)
                    // left click to cycle symbol forward, right click to cycle back
                    if (event.type === "click") setCell(i, (cells[i] + 1) % 3)
                    else if (event.type === "contextmenu") setCell(i, (cells[i] + 2) % 3)
                    return
                }
                if (mode !== Mode.DRAW) return
                if (Math.abs(offsetLeft - clientX) < margin) toggleVerticalWall(x - 1, y)
                if (Math.abs(offsetTop - clientY) < margin) toggleHorizontalWall(x, y - 1)
                if (Math.abs(offsetLeft + offsetWidth - clientX) < margin) toggleVerticalWall(x, y)
                if (Math.abs(offsetTop + offsetHeight - clientY) < margin) toggleHorizontalWall(x, y)
            }
        }
    }

    const nextStep = mode == Mode.SOLVE ? getNextStep() : { indices: [] }

    function makeCellClassNames(i: number, nextStepIndices: number[]) {
        const { x, y } = getCoords(i, size)
        return classNames({
            'StarBattle-Cell': true,
            'StarBattle-Cell-Border-Left': verticalWallExists(x - 1, y),
            'StarBattle-Cell-Border-Top': horizontalWallExists(x, y - 1),
            'StarBattle-Cell-Border-Right': verticalWallExists(x, y),
            'StarBattle-Cell-Border-Bottom': horizontalWallExists(x, y),
            'StarBattle-Cell-Indicated': nextStepIndices.includes(i)
        })
    }
    
    const typeToSymbol = {
        [Cell.BLANK]: "",
        [Cell.STAR]: "★",
        [Cell.X]: "✖",
    }
    const contentCells = cells.map((cell: Cell, i) => {
        return (
            <StarBattleCell
                key={i}
                value={mode === Mode.SOLVE ? typeToSymbol[cell]: groupIndices[i].toString()}
                className={makeCellClassNames(i, nextStep.indices!)}
                onClick={makeCellClickHandler(i)}
            />
        )
    })
    return (
        <div className="StarBattle-Puzzle">
            <div onClick={() => setMode((mode + 1) % 2)}>
                Mode: {Mode[mode]}
            </div>
            <div className="StarBattle-Grid">
                {contentCells}
            </div>
            <div className="StarBattle-Message">
                {mode == Mode.SOLVE ? JSON.stringify(nextStep) : ''}
            </div>
        </div>
    )

    type PuzzleStep = {
        indices?: number[]
        type?: Cell
        message?: string
    }
    
    // todo
    function getNextStep(): PuzzleStep {
        const ret = {}
        // apply each rule
        // return first match
        for (const group of groups) {
            if (remainingStars(group) == 0) {
                const indices = group.filter(index => cells[index] == Cell.BLANK)
                if (indices.length > 0) 
                    return {
                        indices,
                        type: Cell.X,
                        message: `No more stars can be placed in this group.`
                    }
            }
            const y = findSharedRow(group)
            if (typeof y == "number") {
                const indices = getRowIndices(y).filter(index => !group.includes(index) && cells[index] != Cell.X)
                if (indices.length > 0) 
                    return {
                        indices,
                        type: Cell.X,
                        message: `Stars cannot be placed in this row outside this group. Otherwise, there will not be enough stars left in the row within the group.`
                    }
            }
            const x = findSharedColumn(group)
            if (typeof x == "number") {
                const indices = getColumnIndices(x).filter(index => !group.includes(index) && cells[index] != Cell.X)
                if (indices.length > 0) 
                    return {
                        indices,
                        type: Cell.X,
                        message: `Stars cannot be placed in this column outside this group. Otherwise, there will not be enough stars left in the column within the group.`
                    }
            }
        }
        for (let x = 0; x < size; x++) {
            const column = getColumnIndices(x)
            const groupIndex = findSharedGroup(column)
            if (typeof groupIndex == 'number') {
                const indices = groups[groupIndex].filter(index => !column.includes(index) && cells[index] != Cell.X)
                if (indices.length > 0)
                    return {
                        indices,
                        type: Cell.X,
                        message: `Stars cannot be placed in this group outside this column. Otherwise, there will not be enough stars in the column.`
                    }
            }
        }
        for (let y = 0; y < size; y++) {
            const row = getRowIndices(y)
            const groupIndex = findSharedGroup(row)
            if (typeof groupIndex == 'number') {
                const indices = groups[groupIndex].filter(index => !row.includes(index) && cells[index] != Cell.X)
                if (indices.length > 0)
                    return {
                        indices,
                        type: Cell.X,
                        message: `Stars cannot be placed in this group outside this row. Otherwise, there will not be enough stars in the row.`
                    }
            }
        }
        return {indices: [], type: Cell.BLANK, message: 'Unknown'}
    }
    function findSharedRow(group: number[]) {
        const {y} = getCoords(group[0], size)
        if (group.every(index => cells[index] == Cell.X || getCoords(index, size).y == y)) return y
    }

    function findSharedColumn(group: number[]) {
        const {x} = getCoords(group[0], size)
        if (group.every(index => cells[index] == Cell.X || getCoords(index, size).x == x)) return x
    }

    function getRowIndices(y: number) {
        return range(y * size, (y + 1) * size)
    }

    function getColumnIndices(x: number) {
        return range(x, size**2, size)
    }

    function findSharedGroup(line: number[]) {
        const groupIndex = groupIndices[line[0]]
        if (line.every(index => cells[index] == Cell.X || groupIndices[index] == groupIndex)) return groupIndex
    }

    function remainingStars(group: number[]) {
        return starCount - group.filter(index => cells[index] == Cell.STAR).length
    }
}

function getStarCount(cells: Cell[]) {
    return cells.reduce((sum, current) => current == Cell.STAR ? sum + 1 : sum, 0)
}

// Adapted from https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/from#sequence_generator_range
function range(start: number, stop: number, step: number = 1) {
    return Array.from({ length: (stop - 1 - start) / step + 1 }, (_, i) => start + i * step)
}

function getCoords(i: number, size: number) {
    return {
        x: i % size,
        y: Math.floor(i / size),
    }
}

function getIndex(x: number, y: number, size: number) {
    return y * size + x
}
