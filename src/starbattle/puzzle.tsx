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
    GROUP_PARTITION,
    ROW_PARTITION,
    COLUMN_PARTITION,
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
    const columnView = useMemo(() => makeColumnView(), [cells, size])
    const rowView = useMemo(() => makeRowView(columnView), [columnView])
    const neighbourView = useMemo(() => makeNeighbourView(), [cells, size])
    const {groups, groupIndices} = useMemo(() => makeGroups(), [size, horizontalWalls, verticalWalls])
    const groupView = useMemo(() => makeGroupView(), [cells, groups])
    const [mode, setMode] = useState(Mode.DRAW)
    const rows = useMemo(() => range(0, size).map(y => getRowIndices(y)), [size])
    const columns = useMemo(() => range(0, size).map(x => getColumnIndices(x)), [size])

    function makeColumnView(): Cell[][] {
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
    
    function makeGroupView(): Cell[][] {
        return groups.map(group => group.map(index => cells[index]))
    }
    
    function makeNeighbourView(): Cell[][] {
        return cells.map((_, i) => getNeighbouringIndices(i).map(index => cells[index]))
    }
    
    function getNeighbouringIndices(i: number): number[] {
        const { x, y } = getCoords(i, size)
        return [
            [x - 1, y - 1],
            [x, y - 1],
            [x + 1, y - 1],
            [x - 1, y],
            [x + 1, y],
            [x - 1, y + 1],
            [x, y + 1],
            [x + 1, y + 1],
        ].filter(([x, y]) => x >= 0 && x < size && y >= 0 && y < size)
        .map(([x, y]) => getIndex(x, y, size))
    }

    function getSharedNeighbour(indices: number[]): number[] {
        let neighbours = getNeighbouringIndices(indices[0])
        for (const i of indices.slice(1)) {
            let otherNeighbours = getNeighbouringIndices(i)
            neighbours = neighbours.filter(index => otherNeighbours.includes(index))
        }
        return neighbours
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
            if (cells[i] === Cell.STAR) {
                if (neighbourView[i].find(neighbour => neighbour === Cell.STAR)) {
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

    const cellPartitionResidue: number[] = []
    const groupPartitions: number[][][] = []
    for (const group of groups) {
        const partitions = partitionCells(group.filter(index => cells[index] === Cell.BLANK))
        groupPartitions.push(partitions)
    }
    const rowPartitions: number[][][] = []
    for (const row of rows) {
        const partitions = partitionCells(row.filter(index => cells[index] === Cell.BLANK))
        rowPartitions.push(partitions)
    }
    const columnPartitions: number[][][] = []
    for (const column of columns) {
        const partitions = partitionCells(column.filter(index => cells[index] === Cell.BLANK))
        columnPartitions.push(partitions)
    }
    if (mode === Mode.GROUP_PARTITION) {
        for (const partitions of groupPartitions) {
            partitions.forEach((partition, i) => {
                partition.forEach(cellIndex => cellPartitionResidue[cellIndex] = i % 3)
            })
        }
    } else if (mode === Mode.ROW_PARTITION) {
        for (const partitions of rowPartitions) {
            partitions.forEach((partition, i) => {
                partition.forEach(cellIndex => cellPartitionResidue[cellIndex] = i % 3)
            })
        }
    } else if (mode === Mode.COLUMN_PARTITION) {
        for (const partitions of columnPartitions) {
            partitions.forEach((partition, i) => {
                partition.forEach(cellIndex => cellPartitionResidue[cellIndex] = i % 3)
            })
        }
    }

    const nextStep = mode === Mode.SOLVE ? getNextStep() : {}

    function makeCellClassNames(i: number, nextStep: PuzzleStep) {
        const { x, y } = getCoords(i, size)
        return classNames({
            'StarBattle-Cell': true,
            'StarBattle-Cell-Border-Left': verticalWallExists(x - 1, y),
            'StarBattle-Cell-Border-Top': horizontalWallExists(x, y - 1),
            'StarBattle-Cell-Border-Right': verticalWallExists(x, y),
            'StarBattle-Cell-Border-Bottom': horizontalWallExists(x, y),
            'StarBattle-Cell-Indicated-X': nextStep.indices && nextStep.indices.includes(i) && nextStep.type == Cell.X,
            'StarBattle-Cell-Indicated-Star': nextStep.indices && nextStep.indices.includes(i) && nextStep.type == Cell.STAR,
            'StarBattle-Cell-Indicated-Secondary': nextStep.otherIndices && nextStep.otherIndices.includes(i)
                                                    && (!nextStep.indices || !nextStep.indices.includes(i)),
            'StarBattle-Cell-Partition-1': mode >= Mode.GROUP_PARTITION && cellPartitionResidue[i] === 0,
            'StarBattle-Cell-Partition-2': mode >= Mode.GROUP_PARTITION && cellPartitionResidue[i] === 1,
            'StarBattle-Cell-Partition-3': mode >= Mode.GROUP_PARTITION && cellPartitionResidue[i] === 2,
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
                value={mode === Mode.DRAW ? groupIndices[i].toString() : typeToSymbol[cell] }
                className={makeCellClassNames(i, nextStep)}
                onClick={makeCellClickHandler(i)}
            />
        )
    })
    return (
        <div className="StarBattle-Puzzle">
            <div onClick={() => setMode((mode + 1) % 5)}>
                Mode: {Mode[mode]}
            </div>
            <div className="StarBattle-Grid">
                {contentCells}
            </div>
            <div className="StarBattle-Message">
                {mode === Mode.SOLVE ? JSON.stringify(nextStep) : ''}
            </div>
        </div>
    )

    type PuzzleStep = {
        indices?: number[]
        otherIndices?: number[]
        type?: Cell
        message?: string
    }
    
    function getNextStep(): PuzzleStep {
        const ret = {}
        // apply each rule
        // return first match
        for (const [i, cell] of cells.entries()) {
            if (cell === Cell.X) continue
            if (cell !== Cell.STAR) continue
            const indices = getNeighbouringIndices(i).filter(index => cells[index] != Cell.X)
            if (indices.length === 0) continue
            return {
                indices,
                type: Cell.X,
                message: `Stars cannot be placed in cells neighbouring a star (including diagonals).`
            }
        }
        let nextStep = processNoStarsLeftRule(groups, "group")
        if (nextStep) return nextStep
        nextStep = processNoStarsLeftRule(rows, "row")
        if (nextStep) return nextStep
        nextStep = processNoStarsLeftRule(columns, "column")
        if (nextStep) return nextStep
        
        for (const [i, cell] of cells.entries()) {
            if (cell === Cell.X) continue
            const group = findNeighbouringGroup(i)
            if (!group) continue
            return {
                indices: [i],
                otherIndices: group,
                type: Cell.X,
                message: `Stars cannot be placed here. Otherwise, no cells can be placed within this group.`
            }
        }
        for (const row of rows) {
            const groupIndex = findSharedGroup(row)
            if (typeof groupIndex !== 'number') continue
            const indices = groups[groupIndex].filter(index => !row.includes(index) && cells[index] != Cell.X)
            if (indices.length === 0) continue
            return {
                indices,
                otherIndices: row,
                type: Cell.X,
                message: `Stars cannot be placed in this group outside this row. Otherwise, there will not be enough stars in the row.`
            }
        }
        for (const column of columns) {
            const groupIndex = findSharedGroup(column)
            if (typeof groupIndex !== 'number') continue
            const indices = groups[groupIndex].filter(index => !column.includes(index) && cells[index] != Cell.X)
            if (indices.length === 0) continue
            return {
                indices,
                otherIndices: column,
                type: Cell.X,
                message: `Stars cannot be placed in this group outside this column. Otherwise, there will not be enough stars in the column.`
            }
        }
        for (const group of groups) {
            const y = findSharedRow(group)
            if (typeof y === "number") {
                const row = getRowIndices(y)
                const indices = row.filter(index => !group.includes(index) && cells[index] != Cell.X)
                if (indices.length === 0) continue
                return {
                    indices,
                    otherIndices: group,
                    type: Cell.X,
                    message: `Stars cannot be placed in this row outside this group. Otherwise, there will not be enough stars left in the row within the group.`
                }
            }
            const x = findSharedColumn(group)
            if (typeof x === "number") {
                const column = getColumnIndices(x)
                const indices = column.filter(index => !group.includes(index) && cells[index] != Cell.X)
                if (indices.length === 0) continue
                return {
                    indices,
                    otherIndices: group,
                    type: Cell.X,
                    message: `Stars cannot be placed in this column outside this group. Otherwise, there will not be enough stars left in the column within the group.`
                }
            }
        }
        nextStep = processBlockRule(groupPartitions, "group")
        if (nextStep) return nextStep
        nextStep = processBlockRule(rowPartitions, "row")
        if (nextStep) return nextStep
        nextStep = processBlockRule(columnPartitions, "column")
        if (nextStep) return nextStep
        return {indices: [], type: Cell.BLANK, message: 'Unknown'}
    }

    function processNoStarsLeftRule(groups: number[][], name: string): PuzzleStep | undefined {
        for (const group of groups) {
            if (getRemainingStarCount(group) === 0) {
                const indices = group.filter(index => cells[index] === Cell.BLANK)
                if (indices.length === 0) continue
                return {
                    indices,
                    type: Cell.X,
                    message: `No more stars can be placed in this ${name}.`
                }
            }
        }
    }

    function processBlockRule(partitionsList: number[][][], name: string): PuzzleStep | undefined {
        for (const [i, partitions] of partitionsList.entries()) {
            const remainingStarCount = getRemainingStarCount(groups[i])
            if (partitions.length !== remainingStarCount) continue
            const multipleLeft = remainingStarCount > 1
            const baseMessage = `There can be at most 1 star in each 2x2 square. When the remaining space 
                within this ${name} is split into blocks at most 2x2 in size, 
                there ${multipleLeft ? 'are' : 'is'} only ${remainingStarCount} square${multipleLeft ? 's' : ''}, 
                which is equal to the number of remaining stars. 
                Therefore, each block must contain a star.`.replaceAll('\n', '')
            for (const partition of partitions) {
                if (partition.length === 1)
                    return {
                        indices: partition,
                        type: Cell.STAR,
                        message: baseMessage + ` This block only has one space, so it must be a star`
                    }
                const indices = getSharedNeighbour(partition).filter(index => cells[index] != Cell.X)
                if (indices.length === 0) continue
                return {
                    indices,
                    otherIndices: partition,
                    type: Cell.X,
                    message: baseMessage + ` If stars are placed here, there will be no place to put a star in this block`
                }
            }
        }
    }

    function findNeighbouringGroup(i: number): number[] | undefined {
        const neighbours = getNeighbouringIndices(i)
        for (let group of groups) {
            group = group.filter(index => cells[index] === Cell.BLANK)
            if (group.length === 0) continue
            if (group.every(index => neighbours.includes(index))) return group
        }
    }

    function findSharedRow(group: number[]) {
        const {y} = getCoords(group[0], size)
        if (group.every(index => cells[index] === Cell.X || getCoords(index, size).y === y)) return y
    }

    function findSharedColumn(group: number[]) {
        const {x} = getCoords(group[0], size)
        if (group.every(index => cells[index] === Cell.X || getCoords(index, size).x === x)) return x
    }

    function getRowIndices(y: number) {
        return range(y * size, (y + 1) * size)
    }

    function getColumnIndices(x: number) {
        return range(x, size**2, size)
    }

    function findSharedGroup(line: number[]) {
        const groupIndex = groupIndices[line[0]]
        if (line.every(index => cells[index] === Cell.X || groupIndices[index] === groupIndex)) return groupIndex
    }

    function getRemainingStarCount(group: number[]) {
        return starCount - group.filter(index => cells[index] === Cell.STAR).length
    }

    // Any 2x2 block can contain at most one star
    function partitionCells(indices: number[]): number[][] {
        const partitions: number[][] = []
        // for each index
        for (const i of indices) {
            // if it fits into existing partitions, add it
            let foundExisting = false
            for (const partition of partitions) {
                if (withinSquare(i, partition)) {
                    partition.push(i)
                    foundExisting = true
                    break
                }
            }
            // if not, make a new partition
            if (!foundExisting) {
                partitions.push([i])
            }
        }
        // todo: guarantee that # of partitions is minimalized
        return partitions
    }

    function withinSquare(i: number, group: number[]) {
        const { x, y } = getCoords(i, size)
        return group.every(index => {
            const {x: otherX, y: otherY} = getCoords(index, size)
            return (Math.abs(x - otherX) <= 1 && Math.abs(y - otherY) <= 1)
        })
    }
}

function getStarCount(cells: Cell[]) {
    return cells.reduce((sum, current) => current === Cell.STAR ? sum + 1 : sum, 0)
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