import { Cell, PuzzleStep } from './types';

export function getSolutionError(cells: Cell[], size: number, starCount: number, rows: number[][], columns: number[][], groups: number[][]): PuzzleStep {
    // for each cell with star, surrounding cells must have no star
    for (const [i, cell] of cells.entries()) {
        if (cell !== Cell.STAR) continue
        const starNeighbour = getNeighbouringIndices(size, i).find(index => cells[index] === Cell.STAR)
        if (starNeighbour === undefined) continue
        return {
            indices: [i, starNeighbour],
            message: "Stars cannot be next to each other.",
        }
    }
    // each row, column, group must have at most n stars
    let error = processTooManyStarsRule(rows, "row")
    if (error) return error
    error = processTooManyStarsRule(columns, "column")
    if (error) return error
    error = processTooManyStarsRule(groups, "group")
    if (error) return error
    return {}

    function processTooManyStarsRule(targetGroups: number[][], name: string): PuzzleStep | undefined {
        for (const group of targetGroups) {
            if (getStarCount(group) > starCount) {
                if (group.filter(index => cells[index] === Cell.BLANK).length === 0) continue
                return {
                    indices: group,
                    message: `This ${name} contains too many stars.`
                }
            }
        }
    }

    function getStarCount(group: number[]): number {
        return group.filter(index => cells[index] === Cell.STAR).length
    }
}

export function getNextStep(cells: Cell[], size: number, starCount: number, groups: number[][], cellIndexToGroupIndex: number[], rows: number[][], columns: number[][]): PuzzleStep {
    // apply each rule and return first match
    // for all groups, rows, columns, return if remainingStars == remainingSpaces
    let nextStep = processLastSpacesRule(groups, "group")
    if (nextStep) return nextStep
    nextStep = processLastSpacesRule(rows, "row")
    if (nextStep) return nextStep
    nextStep = processLastSpacesRule(columns, "column")
    if (nextStep) return nextStep

    for (const [i, cell] of cells.entries()) {
        if (cell === Cell.X) continue
        if (cell !== Cell.STAR) continue
        const indices = getNeighbouringIndices(size, i).filter(index => cells[index] !== Cell.X)
        if (indices.length === 0) continue
        return {
            indices,
            type: Cell.X,
            message: `Stars cannot be placed in cells neighbouring a star (including diagonals).`
        }
    }

    nextStep = processNoStarsLeftRule(groups, "group")
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
    for (const lineCount of range(1, size)) {
        for (const start of range(0, size - lineCount + 1)) {
            // console.log("lineCount", lineCount, "start", start, "end", size - lineCount + 1)
            nextStep = processGroupsFillLinesRule(rows.slice(start, start + lineCount), "row")
            if (nextStep) return nextStep
            nextStep = processGroupsFillLinesRule(columns.slice(start, start + lineCount), "column")
            if (nextStep) return nextStep
        }
    }
    // For each blank cell, imagine what would happen if it was a star - set neighbours to x, check # of blocks for the groups/columns/rows they are in
    for (const [i, cell] of cells.entries()) {
        if (cell !== Cell.BLANK) continue
        const neighbours = getNeighbouringIndices(size, i)
        const groupIndices = new Set(neighbours.map(index => cellIndexToGroupIndex[index]))
        const relevantGroups = Array.from(groupIndices).map(index => groups[index])
        nextStep = processNoCrowdingRule(i, neighbours, relevantGroups, "group")
        if (nextStep) return nextStep
        const rowIndices = new Set(neighbours.map(index => getCoords(index, size).y))
        const relevantRows = Array.from(rowIndices).map(index => rows[index])
        processNoCrowdingRule(i, neighbours, relevantRows, "row")
        if (nextStep) return nextStep
        const columnIndices = new Set(neighbours.map(index => getCoords(index, size).x))
        const relevantColumns = Array.from(columnIndices).map(index => rows[index])
        processNoCrowdingRule(i, neighbours, relevantColumns, "column")
        if (nextStep) return nextStep
    }
    const groupPartitions: number[][][] = groups.map(group => (
        partitionCells(size, group.filter(index => cells[index] === Cell.BLANK))
    ))
    const rowPartitions: number[][][] = rows.map(group => (
        partitionCells(size, group.filter(index => cells[index] === Cell.BLANK))
    ))
    const columnPartitions: number[][][] = columns.map(group => (
        partitionCells(size, group.filter(index => cells[index] === Cell.BLANK))
    ))
    nextStep = processBlockRule(groups, groupPartitions, "group")
    if (nextStep) return nextStep
    nextStep = processBlockRule(groups, rowPartitions, "row")
    if (nextStep) return nextStep
    nextStep = processBlockRule(groups, columnPartitions, "column")
    if (nextStep) return nextStep
    return {indices: [], type: Cell.BLANK, message: 'Unknown'}
    
    function getSharedNeighbour(indices: number[]): number[] {
        let neighbours = getNeighbouringIndices(size, indices[0])
        for (const i of indices.slice(1)) {
            let otherNeighbours = getNeighbouringIndices(size, i)
            neighbours = neighbours.filter(index => otherNeighbours.includes(index))
        }
        return neighbours
    }

    function findNeighbouringGroup(i: number): number[] | undefined {
        const neighbours = getNeighbouringIndices(size, i)
        for (let group of groups) {
            group = group.filter(index => cells[index] === Cell.BLANK)
            if (group.length === 0) continue
            if (group.every(index => neighbours.includes(index))) return group
        }
    }

    function findSharedRow(group: number[]): number | undefined {
        const {y} = getCoords(group[0], size)
        if (group.every(index => cells[index] === Cell.X || getCoords(index, size).y === y)) return y
    }

    function findSharedColumn(group: number[]): number | undefined {
        const {x} = getCoords(group[0], size)
        if (group.every(index => cells[index] === Cell.X || getCoords(index, size).x === x)) return x
    }

    function findSharedGroups(indices: number[], targetCount: number): number[] | undefined {
        const groups: Set<number> = new Set()
        for (const index of indices) {
            groups.add(cellIndexToGroupIndex[index])
            if (groups.size > targetCount) return
        }
        return Array.from(groups)
    }

    function getRemainingStarCount(group: number[]): number {
        return starCount - group.filter(index => cells[index] === Cell.STAR).length
    }

    function processLastSpacesRule(targetGroups: number[][], name: string): PuzzleStep | undefined {
        for (const group of targetGroups) {
            const indices = group.filter(index => cells[index] === Cell.BLANK)
            if (indices.length === 0) continue
            if (getRemainingStarCount(group) === indices.length)
                return {
                    indices,
                    type: Cell.STAR,
                    message: `The remaining stars in this ${name} can only be placed here.`
                }
        }
    }

    function processNoStarsLeftRule(targetGroups: number[][], name: string): PuzzleStep | undefined {
        for (const group of targetGroups) {
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

    /* For example, if all the cells in 2 adjacent rows are in 2 groups, the stars in those groups
        must be in those rows. The rest of the cells in those groups cannot contain stars.
     */
    function processGroupsFillLinesRule(lines: number[][], name: string): PuzzleStep | undefined {
        const lineIndices = lines.flat().filter(index => cells[index] !== Cell.X)
        const groupIndices = findSharedGroups(lineIndices, lines.length)
        if (typeof groupIndices === 'undefined') return
        console.log("line", lineIndices, "group", groupIndices, groupIndices.map(groupIndex => groups[groupIndex]).flat())
        const indices = groupIndices.map(groupIndex => groups[groupIndex])
            .flat()
            .filter(index => !lineIndices.includes(index) && cells[index] !== Cell.X)
        if (indices.length === 0) return
        const groupsText = lines.length > 1 ? "these groups" : "this group"
        const linesText = lines.length > 1 ? `these ${name}s` : `this ${name}`
        return {
            indices,
            otherIndices: lineIndices,
            type: Cell.X,
            message: `Stars cannot be placed in ${groupsText} outside ${linesText}. Otherwise, there will not be enough stars in ${linesText}.`
        }
    }

    function processBlockRule(groups: number[][], partitionsList: number[][][], name: string): PuzzleStep | undefined {
        for (const [i, partitions] of partitionsList.entries()) {
            const remainingStarCount = getRemainingStarCount(groups[i])
            console.log(name, i, "part. count", partitions.length, "remaining", remainingStarCount, "indices", groups[i])
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
                        message: baseMessage + ` This block only has one space, so it must be a star.`
                    }
                const indices = getSharedNeighbour(partition).filter(index => cells[index] != Cell.X)
                if (indices.length === 0) continue
                return {
                    indices,
                    otherIndices: partition,
                    type: Cell.X,
                    message: baseMessage + ` If stars are placed here, there will be no place to put a star in this block.`
                }
            }
        }
    }

    function processNoCrowdingRule(i: number, neighbours: number[], relevantGroups: number[][], name: string) {
        for (const group of relevantGroups) {
            const remainingGroup = group.filter(index => cells[index] === Cell.BLANK && !neighbours.includes(index))
            const partitions = partitionCells(size, remainingGroup)
            if (partitions.length >= getRemainingStarCount(group)) continue
            return {
                indices: [i],
                otherIndices: group,
                type: Cell.X,
                message: `A star cannot be placed here. Otherwise the indicated ${name} will not have enough room for stars.`
            }
        }
    }
}

    
export function getNeighbouringIndices(size: number, i: number): number[] {
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

export function getCoords(i: number, size: number): { x: number, y: number} {
    return {
        x: i % size,
        y: Math.floor(i / size),
    }
}

export function getIndex(x: number, y: number, size: number): number {
    return y * size + x
}

// Any 2x2 block can contain at most one star
export function partitionCells(size: number, indices: number[]): number[][] {
    const partitions: number[][] = []
    // for each index
    for (const i of indices) {
        // if it fits into existing partitions, add it
        let foundExisting = false
        for (const partition of partitions) {
            if (withinSquare(size, i, partition)) {
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

function withinSquare(size: number, i: number, group: number[]) {
    const { x, y } = getCoords(i, size)
    return group.every(index => {
        const {x: otherX, y: otherY} = getCoords(index, size)
        return (Math.abs(x - otherX) <= 1 && Math.abs(y - otherY) <= 1)
    })
}

// Adapted from https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/from#sequence_generator_range
export function range(start: number, stop: number, step: number = 1): number[] {
    return Array.from({ length: (stop - 1 - start) / step + 1 }, (_, i) => start + i * step)
}
