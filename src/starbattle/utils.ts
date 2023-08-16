import { Cell, PuzzleData, PuzzleStep } from './types';

export function getSolutionError(puzzleData: PuzzleData): PuzzleStep {
    const { cells, size, starCount, rows, columns, groups } = puzzleData
    let error = findSimpleError()
    if (error) return error
    // return { message: "Unsolvable" }
    return {}

    function findSimpleError(): PuzzleStep | undefined {
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
        error = processNotEnoughSpacesRule(rows, "row")
        if (error) return error
        error = processNotEnoughSpacesRule(columns, "column")
        if (error) return error
        error = processNotEnoughSpacesRule(groups, "group")
        if (error) return error
    }

    function processTooManyStarsRule(targetGroups: number[][], name: string): PuzzleStep | undefined {
        for (const group of targetGroups) {
            if (getStarCount(group, cells) > starCount) {
                return {
                    indices: group,
                    message: `This ${name} contains too many stars.`
                }
            }
        }
    }

    function processNotEnoughSpacesRule(targetGroups: number[][], name: string): PuzzleStep | undefined {
        for (const group of targetGroups) {
            if (starCount - getStarCount(group, cells) > getCellCount(group, cells, Cell.BLANK)) {
                return {
                    indices: group,
                    message: `This ${name} contains too few blank spaces.`
                }
            }
        }
    }

}

export function findSolution(puzzleData: PuzzleData): Cell[] | undefined  {
    const { cells, size, starCount, rows, columns, groups, cellIndexToGroupIndex } = puzzleData
    let cellsCopy = cells.slice()
    puzzleData.cells = cellsCopy
    const guesses: number[] = []
    const res = findSolutionHelper()
    console.log("After solution helper, res:", res)
    if (res) return res

    function findSolutionHelper(startIndex: number = 0): Cell[] | undefined {
        console.log("In findSolutionHelper", startIndex)
        // Early failure check
        if (pastUnfinishedGroup(startIndex)) return
        // Use logic where possible
        const err = applyNextSteps()
        if (err !== undefined) return
        console.log("After logic")
        // Successful base case
        if (isSolved(puzzleData)) return cellsCopy
        // Otherwise, guess and check
        for (let i = startIndex; i < cellsCopy.length; i++) {
            if (pastUnfinishedGroup(i)) break
            if (cellsCopy[i] !== Cell.BLANK) continue
            // getNextStep should have already marked the following with X, so they shouldn't need to be checked
            if (getNeighbouringIndices(size, i).find(neighbour => cellsCopy[neighbour] === Cell.STAR)) continue
            if (getStarCount(groups[cellIndexToGroupIndex[i]], cellsCopy) === starCount) continue
            const {x, y} = getCoords(i, size)
            if (getStarCount(rows[y], cellsCopy) === starCount) continue
            if (getStarCount(columns[x], cellsCopy) === starCount) continue
            const backup = cellsCopy.slice()
            cellsCopy[i] = Cell.STAR
            guesses.push(i)
            console.log("guesses,", guesses.slice())
            const res = findSolutionHelper(i + 1)
            if (res) {
                return res
            }
            // Guess was wrong
            cellsCopy = backup
            puzzleData.cells = cellsCopy
            cellsCopy[i] = Cell.X
            guesses.pop()
            const err = applyNextSteps()
            if (err !== undefined) return
        }
        // Unsuccessful base case
    }

    function applyNextSteps() {
        while (true) {
            let nextStep = getNextStep(puzzleData)
            const newCells = applyNextStep(cellsCopy, nextStep, true)
            if (!newCells) return
            const error = getSolutionError(puzzleData)
            if (error.message) {
                console.log("Found error", error)
                return error
            }
        }
    }

    function pastUnfinishedGroup(cutoff: number): boolean {
        for (const group of groups) {
            if (getStarCount(group, cellsCopy) === starCount) continue
            if (group[group.length - 1] < cutoff) {
                console.log(`cutoff: ${cutoff} group: ${group}`)
                return true
            }
        }
        return false
    }
}

/**
 * isSolved - Returns true if puzzle is solved
 */
export function isSolved(puzzleData: PuzzleData): boolean {
    const { cells, size, starCount, rows, columns, groups } = puzzleData
    // for each cell that have a star, surrounding cells must have no star
    for (let i = 0; i < cells.length; i++) {
        if (cells[i] === Cell.STAR) {
            if (getNeighbouringIndices(size, i).find(neighbour => cells[neighbour] === Cell.STAR)) {
                return false
            }
        }
    }
    // each row, column, group must have exactly n stars
    for (const row of rows) {
        if (getStarCount(row, cells) != starCount) return false
    }
    for (const column of columns) {
        if (getStarCount(column, cells) != starCount) return false
    }
    for (const group of groups) {
        if (getStarCount(group, cells) != starCount) return false
    }
    return true
}

function getStarCount(group: number[], cells: Cell[]): number {
    return getCellCount(group, cells, Cell.STAR)
}

function getCellCount(group: number[], cells: Cell[], cellType: Cell): number {
    return group.filter(index => cells[index] === cellType).length
}

export function getNextStep(puzzleData: PuzzleData): PuzzleStep {
    const { cells, size, starCount, rows, columns, groups, cellIndexToGroupIndex } = puzzleData
    // apply each rule and return first match
    // for all groups, rows, columns, return if remainingStars == remainingSpaces
    const confirmedPartitions: number[][] = []
    const neighbours = getAllNeighbouringIndices(size)
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
            message: `A star cannot be placed here. Otherwise, not enough stars can be placed within this group.`
        }
    }
    // For each blank cell, imagine what would happen if it was a star - set neighbours to x, check # of blocks for the groups/columns/rows they are in
    for (const [i, cell] of cells.entries()) {
        if (cell !== Cell.BLANK) continue
        const neighbours = getNeighbouringIndices(size, i).filter(index => cells[index] === Cell.BLANK)
        const groupIndices = new Set(neighbours.map(index => cellIndexToGroupIndex[index]))
        const relevantGroups = Array.from(groupIndices).map(index => groups[index])
        nextStep = processNoCrowdingRule(i, neighbours, relevantGroups, "group")
        if (nextStep) return nextStep
        const rowIndices = new Set(neighbours.map(index => getCoords(index, size).y))
        const relevantRows = Array.from(rowIndices).map(index => rows[index])
        nextStep = processNoCrowdingRule(i, neighbours, relevantRows, "row")
        if (nextStep) return nextStep
        const columnIndices = new Set(neighbours.map(index => getCoords(index, size).x))
        const relevantColumns = Array.from(columnIndices).map(index => columns[index])
        // console.log(i, neighbours, columnIndices, relevantColumns)
        nextStep = processNoCrowdingRule(i, neighbours, relevantColumns, "column")
        if (nextStep) return nextStep
    }
    nextStep = processBlockRule(groups, "group")
    if (nextStep) return nextStep
    nextStep = processBlockRule(rows, "row")
    if (nextStep) return nextStep
    nextStep = processBlockRule(columns, "column")
    if (nextStep) return nextStep
    for (const lineCount of range(1, size)) {
        for (const start of range(0, size - lineCount + 1)) {
            // console.log("lineCount", lineCount, "start", start, "end", size - lineCount + 1)
            nextStep = processGroupsFillLinesRule(rows.slice(start, start + lineCount), "row")
            if (nextStep) return nextStep
            nextStep = processGroupsFillLinesRule(columns.slice(start, start + lineCount), "column")
            if (nextStep) return nextStep
        }
    }
    const twoRowGroups = range(0, size - 2 + 1).map(start => rows.slice(start, start + 2).flat())
    nextStep = processBlockRule(twoRowGroups, "row", 2 * starCount)
    if (nextStep) return nextStep
    const twoColumnGroups = range(0, size - 2 + 1).map(start => columns.slice(start, start + 2).flat())
    nextStep = processBlockRule(twoColumnGroups, "column", 2 * starCount)
    if (nextStep) return nextStep
    nextStep = processConfirmedBlockRule(twoRowGroups, "row", 2 * starCount)
    if (nextStep) return nextStep
    nextStep = processConfirmedBlockRule(twoColumnGroups, "column", 2 * starCount)
    if (nextStep) return nextStep
    nextStep = processConfirmedBlockRule(groups, "group", 2 * starCount)
    if (nextStep) return nextStep
    // nextStep = processCombinedGroupBlockRule()
    // if (nextStep) return nextStep
    return {message: 'Unknown'}

    function starCanBePlaced(i: number) {
        if (cells[i] !== Cell.BLANK) return false
        if (neighbours[i].some(index => cells[index] === Cell.STAR)) return false
        if (getRemainingStarCount(cells, groups[cellIndexToGroupIndex[i]], starCount) === 0) return false
        const { x, y } = getCoords(i, size)
        if (getRemainingStarCount(cells, rows[y], starCount) === 0) return false
        if (getRemainingStarCount(cells, columns[x], starCount) === 0) return false
        return true
    }

    function starsCanBePlaced(indices: number[]) {
        for (const i of indices) {
            if (!starCanBePlaced(i)) return false
            if (neighbours[i].some(index => indices.includes(index))) return false
        }
        return true
    }
    
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

    function processLastSpacesRule(targetGroups: number[][], name: string): PuzzleStep | undefined {
        for (const group of targetGroups) {
            const indices = group.filter(index => cells[index] === Cell.BLANK)
            if (indices.length === 0) continue
            if (!starsCanBePlaced(indices)) continue
            if (getRemainingStarCount(cells, group, starCount) === indices.length)
                return {
                    indices,
                    type: Cell.STAR,
                    message: `The remaining stars in this ${name} can only be placed here.`
                }
        }
    }

    function processNoStarsLeftRule(targetGroups: number[][], name: string): PuzzleStep | undefined {
        for (const group of targetGroups) {
            if (getRemainingStarCount(cells, group, starCount) === 0) {
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
        // console.log("line", lineIndices, "group", groupIndices, groupIndices.map(groupIndex => groups[groupIndex]).flat())
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

    function processNoCrowdingRule(i: number, neighbours: number[], relevantGroups: number[][], name: string): PuzzleStep | undefined {
        for (const group of relevantGroups) {
            const remainingGroup = group.filter(index => cells[index] === Cell.BLANK && !neighbours.includes(index))
            // console.log(i, name, group, remainingGroup)
            const partitions = partitionCells(size, remainingGroup)
            if (partitions.length >= getRemainingStarCount(cells, group, starCount)) continue
            return {
                indices: [i],
                otherIndices: group,
                type: Cell.X,
                message: `A star cannot be placed here. Otherwise the indicated ${name} will not have enough room for stars.`
            }
        }
    }

    function processBlockRule(targets: number[][], name: string, starCountPerTarget: number = starCount): PuzzleStep | undefined {
        for (const target of targets) {
            const blankGroup = target.filter(index => cells[index] === Cell.BLANK)
            const partitions = partitionCells(size, blankGroup)
            const remainingStarCount = getRemainingStarCount(cells, target, starCountPerTarget)
            // console.log("target", target, "parts", partitions, "remainingStarCount", remainingStarCount)
            if (partitions.length !== remainingStarCount) continue
            partitions.forEach(partition => addConfirmedPartition(partition))
            const multipleLeft = remainingStarCount > 1
            const multipleGroup = starCountPerTarget > starCount
            const baseMessage = `There can be at most 1 star in each 2x2 block. When the remaining space 
                within ${multipleGroup ? 'these': 'this'}  ${name}${multipleGroup ? 's' : ''} is split into blocks at most 2x2 in size, 
                there ${multipleLeft ? 'are' : 'is'} only ${remainingStarCount} block${multipleLeft ? 's' : ''}, 
                which is equal to the number of remaining stars. 
                Therefore, each block must contain a star.`.replaceAll('\n', '')
            for (const partition of partitions) {
                if (partition.length === 1) {
                    if (starCanBePlaced(partition[0]))
                        return {
                            indices: partition,
                            otherIndices: target,
                            type: Cell.STAR,
                            message: baseMessage + ` This block only has one space, so it must be a star.`
                        }
                }
                const indices = getSharedNeighbour(partition).filter(index => cells[index] != Cell.X)
                if (indices.length === 0) continue
                return {
                    indices,
                    otherIndices: blankGroup,
                    type: Cell.X,
                    message: baseMessage + ` If stars are placed here, there will be no place to put a star in this block.`
                }
            }
        }
    }

    // The block rule can be applied to multiple groups joined as one.
    // There may be fewer partitions as some may stretch across group borders
    // TODO: too slow; is there a faster way?
    function processCombinedGroupBlockRule(): PuzzleStep | undefined {
        // For each group, find neighbours (with greater index)
        const groupNeighbours = getGroupNeighbours()
        console.log(groupNeighbours)
        // Choose # of groups to combine
        for (let groupCount = 2; groupCount <= groups.length; groupCount++) {
            // For each selection of groups, partition
            console.log("groupCount", groupCount)
            for (const i of range(0, groups.length - groupCount + 1)) {
                const selections = getSelections([[i]], groupCount)
                console.log(i, selections)
                if (selections.length === 0) continue
                const combinedGroups = selections.map(selection => {
                    return selection.map(groupIndex => groups[groupIndex]).flat()
                })
                const nextStep = processBlockRule(combinedGroups, "group", groupCount * starCount)
                if (nextStep) return nextStep
            }

        }

        // gets a combination of neighbouring groups
        // TODO: currently gets all paths, but is there a way to get combinations instead?
        function getSelections(inProgress: number[][], groupCount: number): number[][] {
            if (inProgress.length === 0) return inProgress
            if (inProgress[0].length === groupCount) return inProgress
            const selections: number[][] = []
            for (const selection of inProgress) {
                const candidates = getCandidates(selection)
                if (candidates.length === 0) continue
                for (const candidate of candidates) {
                    selections.push([...selection, candidate])
                }
            }
            return getSelections(selections, groupCount)
        }

        function getCandidates(selection: number[]) {
            return Array.from(new Set(selection.map(index => groupNeighbours[index])
                                               .flat()
                                               .filter(index => !selection.includes(index))))
        }
    }

    function getGroupNeighbours() {
        const blankGroups = groups.map(group => group.filter(i => cells[i] === Cell.BLANK))
        // true if some blank cell in group is next to some blank cell in other
        return blankGroups.map((group1, index1) => {
            return blankGroups.map((group2, index2) => {
                if (index1 >= index2) return -1
                return group1.some(i => group2.some(j => isNeighbour(i, j)))
                    ? index2
                    : -1
            }).filter(val => val !== -1)
        })
    }

    function isNeighbour(i: number, j: number) {
        return getNeighbouringIndices(size, i).includes(j)
    }
    
    function addConfirmedPartition(partitionToAdd: number[]) {
        const subsetIndex = confirmedPartitions.findIndex(partition => {
            return partition.length <= partitionToAdd.length
                && partition.every(index => partitionToAdd.includes(index))
        })
        if (subsetIndex > -1) return
        const supersetIndex = confirmedPartitions.findIndex(partition => {
            return partition.length > partitionToAdd.length
                && partitionToAdd.every(index => partition.includes(index))
        })
        if (supersetIndex > -1) return confirmedPartitions[supersetIndex] = partitionToAdd
        confirmedPartitions.push(partitionToAdd)
    }

    /* When processing the block rule, for example in 2 rows, suppose we find partitions that match the remaining star count.
        These partitions are confirmed to have a star in each. When partitioning 2 columns for example, if we find one of the
        confirmed partitions again with 1 remaining star in the 2 columns, since we know a star has to be in that partition,
        we can exclude the spaces in the 2 columns outside the partition.
     */
    function processConfirmedBlockRule(groups: number[][], name: string, starCountPerGroup: number = starCount): PuzzleStep | undefined {
        for (const group of groups) {
            const remainingStarCount = getRemainingStarCount(cells, group, starCountPerGroup)
            if (remainingStarCount !== 1) continue
            const blankGroup = group.filter(index => cells[index] === Cell.BLANK)
            const match = confirmedPartitions.find(partition => partition.every(index => group.includes(index)))
            if (match === undefined) continue
            const indices = blankGroup.filter(index => !match.includes(index))
            if (indices.length === 0) continue
            const multipleGroup = starCountPerGroup > starCount
            return {
                indices,
                otherIndices: blankGroup,
                type: Cell.X,
                message: `There can be at most 1 star in each 2x2 block. The indicated block is confirmed to have a star 
                            from splitting some columns, rows, or groups into blocks, so we can exclude the spaces within 
                            ${multipleGroup ? 'these': 'this'} ${name}${multipleGroup ? 's' : ''} outside the block .`.replaceAll('\n', '')
            }
        }
    }
}

function getRemainingStarCount(cells: Cell[], group: number[], starCountPerGroup: number) {
    return starCountPerGroup - group.filter(index => cells[index] === Cell.STAR).length
}

export function applyNextStep(cells: Cell[], nextStep: PuzzleStep, inPlace: boolean = false) {
    const newCells = inPlace ? cells : cells.slice()
    const { indices, type } = nextStep
    if (indices === undefined || indices.length === 0 || type === undefined) return
    indices.forEach(index => newCells[index] = type)
    return newCells
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

export function getAllNeighbouringIndices(size: number): Cell[][] {
    return range(0, size**2).map(i => getNeighbouringIndices(size, i))
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
