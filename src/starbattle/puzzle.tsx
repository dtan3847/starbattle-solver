import { useMemo, useState, useEffect } from "react";
import classNames from 'classnames';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Slider from '@mui/material/Slider';
import Stack from '@mui/material/Stack';
import LoadingButton from '@mui/lab/LoadingButton';

import { Cell, PuzzleStep } from './types'
import {
    applyNextStep,
    getSolutionError,
    getNextStep,
    isSolved,
    getCoords,
    getIndex,
    partitionCells,
    range,
} from './utils'

import './puzzle.css'


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
    onDrag: React.MouseEventHandler<HTMLButtonElement>
}

function StarBattleCell({ value, className, onClick, onDrag }: CellProps): JSX.Element {
    return (
        <button
            className={className}
            onClick={onClick}
            onContextMenu={onClick}
            onMouseDown={onDrag}
            onMouseMove={onDrag}
            onMouseUp={onDrag}
        >
            {value}
        </button>
    )
}

// TODO: store walls as map to avoid having to recreate them when resizing
export default function StarBattlePuzzle(): JSX.Element {
    const [displaySize, setDisplaySize] = useState(5)
    const [starCount, setStarCount] = useState(1)
    const [cells, setCells] = useState(Array(displaySize**2).fill(Cell.BLANK))
    const size = useMemo(() => Math.round(Math.sqrt(cells.length)), [cells])
    const [horizontalWalls, setHorizontalWalls] = useState(Array(size*(size-1)).fill(false))
    const [verticalWalls, setVerticalWalls] = useState(Array(size*(size-1)).fill(false))
    const [resizingCells, setResizingCells] = useState<Cell[] | null>(null)
    const [resizingHorizontalWalls, setResizingHorizontalWalls] = useState<boolean[] | null>(null)
    const [resizingVerticalWalls, setResizingVerticalWalls] = useState<boolean[] | null>(null)
    const [isDragging, setIsDragging] = useState(false)
    const [showNextStep, setShowNextStep] = useState(false)
    const [autoSolving, setAutoSolving] = useState(false)

    const cellsToDisplay = resizingCells || cells
    const horizontalWallsToDisplay = resizingHorizontalWalls || horizontalWalls
    const verticalWallsToDisplay = resizingVerticalWalls || verticalWalls

    const {groups, cellIndexToGroupIndex} = useMemo(() => makeGroups(), [displaySize, horizontalWallsToDisplay, verticalWallsToDisplay])
    const [mode, setMode] = useState(Mode.DRAW)
    const rows = useMemo(() => range(0, displaySize).map(y => getRowIndices(y)), [displaySize])
    const columns = useMemo(() => range(0, displaySize).map(x => getColumnIndices(x)), [displaySize])
    const puzzleData = useMemo(() => { return {cells, size: displaySize, starCount, rows, columns, groups, cellIndexToGroupIndex} },
                               [cells, displaySize, starCount, groups, cellIndexToGroupIndex])
    
    const solverWorker: Worker = useMemo(() => new Worker(new URL("solver.worker.ts", import.meta.url)), [])

    useEffect(() => {
        if (window.Worker) {
            solverWorker.onmessage = (e: MessageEvent<Cell[] | undefined>) => {
                if (e.data) {
                    setCells(e.data)
                }
                setAutoSolving(false)
            }
        }
    }, [solverWorker])

    const cellPartitionResidue: number[] = []
    const groupPartitions: number[][][] = groups.map(group => (
        partitionCells(size, group.filter(index => cells[index] === Cell.BLANK))
    ))
    const rowPartitions: number[][][] = rows.map(group => (
        partitionCells(size, group.filter(index => cells[index] === Cell.BLANK))
    ))
    const columnPartitions: number[][][] = columns.map(group => (
        partitionCells(size, group.filter(index => cells[index] === Cell.BLANK))
    ))
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

    const solutionError = getSolutionErrorIfSolving()
    const nextStep = solutionError.indices ? {} : getNextStepIfNeeded()
    const starBattleMessage = JSON.stringify(solutionError.message || nextStep.message || '').slice(1, -1)
    
    const typeToSymbol = {
        [Cell.BLANK]: "",
        [Cell.STAR]: "★",
        [Cell.X]: "✖",
    }
    const contentCells = cellsToDisplay.map((cell: Cell, i) => {
        const value = mode === Mode.DRAW
            ? (cellIndexToGroupIndex[i] !== undefined ? cellIndexToGroupIndex[i].toString() : 'undefined')
            : typeToSymbol[cell]
        return (
            <StarBattleCell
                key={i}
                value={value}
                className={makeCellClassNames(i, nextStep, solutionError)}
                onClick={makeCellClickHandler(i)}
                onDrag={makeCellDragHandler(i)}
            />
        )
    })
    const sliderBox = mode === Mode.DRAW
        ? (
            <Box id="StarBattle-SliderBox">
                Size
                <Slider
                    valueLabelDisplay="auto"
                    min={5}
                    max={15}
                    value={displaySize}
                    onChange={onSizeChange}
                    onChangeCommitted={onSizeChangeCommitted}
                />
                Star Count
                <Slider
                    onChange={(event, value) => setStarCount(typeof value === "number" ? value : value[value.length - 1])}
                    valueLabelDisplay="auto"
                    min={1}
                    max={3}
                    value={starCount}
                />
            </Box>
        )
        : ''
    return (
        <Stack className="StarBattle-Puzzle" spacing={2} alignItems="center">
            <Button
                variant="outlined"
                onClick={() => setMode((mode + 1) % 2)}
            >
                Mode: {Mode[mode]}
            </Button>
            {sliderBox}
            <div
                className="StarBattle-Grid"
                style={{
                    gridTemplateColumns: `repeat(${displaySize}, auto)`
                }}
            >
                {contentCells}
            </div>
            <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
                <Button variant="contained" onClick={savePuzzleToLocalStorage}>
                    Save Puzzle
                </Button>
                <Button variant="contained" onClick={loadPuzzleFromLocalStorage}>
                    Load Puzzle
                </Button>
                <Button variant="contained" onClick={handleClearClick}>
                    Clear
                </Button>
                {
                    mode === Mode.SOLVE
                    ? (<>
                        <Button variant="contained" onClick={() => setShowNextStep(!showNextStep)}>
                            {showNextStep ? "Hide Next Step" : "Show Next Step"}
                        </Button>
                        <Button variant="contained" onClick={applyNextStepAndSave} disabled={!(showNextStep && nextStep.type)}>
                            Apply Next Step
                        </Button>
                        <LoadingButton variant="contained" onClick={autoSolve} loading={autoSolving}>
                            Auto Solve
                        </LoadingButton>
                    </>)
                    : ''
                }
            </Stack>
            {
                mode === Mode.SOLVE
                ? (<div className="StarBattle-Message">
                        {starBattleMessage}
                    </div>)
                : ' '
            }
        </Stack>
    )

    function getSolutionErrorIfSolving() {
        if (mode !== Mode.SOLVE) return {}
        if (resizingCells !== null) return { message: 'Resizing' }
        return getSolutionError(puzzleData)
    }

    function getNextStepIfNeeded() {
        if (mode !== Mode.SOLVE || !showNextStep) return {}
        if (!isSolvable()) return {  message: 'Unsolvable' }
        if (isSolved(puzzleData)) return {  message: 'Solved' }
        return getNextStep(puzzleData)
    }
    
    function autoSolve() {
        if (window.Worker) {
            setAutoSolving(true)
            solverWorker.postMessage(puzzleData)
        }
    }
    
    /**
     * isSolvable - Returns true if puzzle has no mistakes
     */
    function isSolvable(): boolean {
        // puzzle must be solvable from this position
        // for each cell with star, surrounding cells must have no star
        // each row, column, group must have at most n stars
        //todo
        return true
    }

    function applyNextStepAndSave() {
        const newCells = applyNextStep(cells, nextStep)
        if (newCells) setCells(newCells)
    }

    function setCell(i: number, newValue: Cell) {
        const newCells = cells.slice()
        newCells[i] = newValue
        setCells(newCells)
    }

    function savePuzzleToLocalStorage() {
        const data = JSON.stringify({
            displaySize,
            starCount,
            cells,
            horizontalWalls,
            verticalWalls,
        })
        localStorage.setItem("starbattlePuzzle", data)
    }

    function loadPuzzleFromLocalStorage() {
        const raw = localStorage.getItem("starbattlePuzzle")
        if (raw === null) return
        const data = JSON.parse(raw)
        setDisplaySize(data.displaySize)
        setStarCount(data.starCount)
        setCells(data.cells)
        setHorizontalWalls(data.horizontalWalls)
        setVerticalWalls(data.verticalWalls)
        setShowNextStep(false)
    }

    function handleClearClick() {
        if (mode === Mode.DRAW) {
            setHorizontalWalls(horizontalWalls.slice().fill(false))
            setVerticalWalls(verticalWalls.slice().fill(false))
        } else {
            setCells(Array(size**2).fill(Cell.BLANK))
        }
    }

    function onSizeChange(event: Event, value: number | number[]) {
        const newSize: number = typeof value == "number" ? value : value[value.length - 1]
        setDisplaySize(newSize)
        const newCells: Cell[] = Array(newSize**2).fill(Cell.BLANK).map((_, i) => {
            const {x, y} = getCoords(i, newSize)
            return outOfBounds(x, y, size, size) ? Cell.BLANK : cells[getIndex(x, y, size)]
        })
        const newHorizontalWalls: boolean[] = Array(newSize*(newSize - 1)).fill(false).map((_, i) => {
            const {x, y} = getCoords(i, newSize)
            return outOfBounds(x, y, size, size - 1) ? false : horizontalWalls[getIndex(x, y, size)]
        })
        const newVerticalWalls: boolean[] = Array(newSize*(newSize - 1)).fill(false).map((_, i) => {
            const {x, y} = getCoords(i, newSize - 1)
            return outOfBounds(x, y, size - 1, size) ? false : verticalWalls[getIndex(x, y, size - 1)]
        })
        setResizingCells(newCells)
        setResizingHorizontalWalls(newHorizontalWalls)
        setResizingVerticalWalls(newVerticalWalls)
    }

    function onSizeChangeCommitted(event: Event | React.SyntheticEvent<Element, Event>, value: number | number[]) {
        const newSize = typeof value == "number" ? value : value[value.length - 1]
        if (newSize !== size && resizingCells !== null) {
            setCells(resizingCells!)
            setHorizontalWalls(resizingHorizontalWalls!)
            setVerticalWalls(resizingVerticalWalls!)
        }
        setResizingCells(null)
        setResizingHorizontalWalls(null)
        setResizingVerticalWalls(null)
    }

    // horizontal walls are in size columns, size-1 rows
    function horizontalWallExists(x: number, y: number): boolean  {
        if (x < 0 || x >= displaySize || y < 0 || y >= displaySize - 1) return false
        return horizontalWallsToDisplay[getIndex(x, y, displaySize)]
    }

    // vertical walls are in size-1 columns, size rows
    function verticalWallExists(x: number, y: number): boolean {
        if (x < 0 || x >= displaySize - 1 || y < 0 || y >= displaySize) return false
        return verticalWallsToDisplay[getIndex(x, y, displaySize - 1)]
    }

    function setHorizontalWall(x: number, y: number, newValue: boolean) {
        if (x < 0 || x >= size || y < 0 || y >= size - 1) return
        const i = getIndex(x, y, size)
        console.log("setHorizontalWall i x y", i, x, y)
        const newWalls = horizontalWalls.slice()
        newWalls[i] = newValue
        setHorizontalWalls(newWalls)
    }

    function setVerticalWall(x: number, y: number, newValue: boolean) {
        if (x < 0 || x >= size - 1 || y < 0 || y >= size) return
        const i = getIndex(x, y, size - 1)
        console.log("toggleVerticalWall i x y", i, x, y)
        const newWalls = verticalWalls.slice()
        newWalls[i] = newValue
        setVerticalWalls(newWalls)
    }

    type GroupOut = {
        groups: number[][]
        cellIndexToGroupIndex: number[]
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
        for (let i = 0; i < displaySize**2; i++) {
            // if not in group, create new group and add to it
            if (!indexToGroup.has(i)) {
                const newGroup: number[] = []
                groupsSet.add(newGroup)
                setGroup(i, newGroup)
            }
            // update neighbour (down/right) if no wall:
            const { x, y } = getCoords(i, displaySize)
            if (x < displaySize - 1 && !verticalWallExists(x, y)) {
                updateNeighbour(i, getIndex(x + 1, y, displaySize))
            }
            if (y < displaySize - 1 && !horizontalWallExists(x, y)) {
                updateNeighbour(i, getIndex(x, y + 1, displaySize))
            }
        }
        const groups = Array.from(groupsSet)
        const cellIndexToGroupIndex: number[] = []
        for (let i = 0; i < displaySize**2; i++) {
            cellIndexToGroupIndex[i] = groups.indexOf(indexToGroup.get(i)!)
        }
        for (const group of groups) {
            group.sort((a, b) => a - b)
        }
        return {groups, cellIndexToGroupIndex}
    }

    function makeCellClickHandler(i: number) {
        return (event: React.MouseEvent<HTMLElement>) => {
            if (resizingCells !== null) return
            if (event.target instanceof HTMLElement) {
                setShowNextStep(false)
                event.preventDefault()
                if (mode === Mode.SOLVE) {
                    // left click to cycle symbol forward, right click to cycle back
                    if (event.type === "click") setCell(i, (cells[i] + 1) % 3)
                    else if (event.type === "contextmenu") setCell(i, (cells[i] + 2) % 3)
                    return
                }
            }
        }
    }

    function makeCellDragHandler(i: number) {
        const { x, y } = getCoords(i, size)
        const margin = 10 // px
        return (event: React.MouseEvent<HTMLElement>) => {
            if (resizingCells !== null) return
            if (mode !== Mode.DRAW) return
            if (!(event.target instanceof HTMLElement)) return
            if (event.type === "mouseup") {
                setIsDragging(false)
                return
            }
            if (event.type === "mousedown") {
                setIsDragging(true)
                console.log("mousedown dragging", isDragging)
            } else if (!isDragging) return
            console.log(event)
            event.preventDefault()
            const { clientX, clientY, buttons, target: { offsetLeft, offsetTop, offsetWidth, offsetHeight }} = event
            console.log("i, size, x, clientX, offsetLeft, offsetLeft + offsetWidth, y, clientY, offsetTop, offsetTop + offsetHeight")
            console.log(i, size, "//", x, clientX, offsetLeft, offsetLeft + offsetWidth, "//", y, clientY, offsetTop, offsetTop + offsetHeight)
            const leftClick = buttons === 1
            const closeToLeft = Math.abs(offsetLeft - clientX) < margin
            const closeToTop = Math.abs(offsetTop - clientY) < margin
            const closeToRight = Math.abs(offsetLeft + offsetWidth - clientX) < margin
            const closeToBottom = Math.abs(offsetTop + offsetHeight - clientY) < margin
            // If close to mutliple walls, avoid unwanted changes by not changing anything
            console.log(closeToLeft, closeToTop, closeToRight, closeToBottom)
            if ([closeToLeft, closeToTop, closeToRight, closeToBottom].filter(b => b).length > 1) return
            // set state is async, so for simplicity only change one at a time
            if (closeToLeft) return setVerticalWall(x - 1, y, leftClick)
            if (closeToTop) return setHorizontalWall(x, y - 1, leftClick)
            if (closeToRight) return setVerticalWall(x, y, leftClick)
            if (closeToBottom) return setHorizontalWall(x, y, leftClick)
        }
    }

    function makeCellClassNames(i: number, nextStep: PuzzleStep, solutionError: PuzzleStep) {
        const { x, y } = getCoords(i, displaySize)
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
            'StarBattle-Cell-Indicated-Error': solutionError.indices && solutionError.indices.includes(i),
            'StarBattle-Cell-Partition-1': mode >= Mode.GROUP_PARTITION && cellPartitionResidue[i] === 0,
            'StarBattle-Cell-Partition-2': mode >= Mode.GROUP_PARTITION && cellPartitionResidue[i] === 1,
            'StarBattle-Cell-Partition-3': mode >= Mode.GROUP_PARTITION && cellPartitionResidue[i] === 2,
        })
    }

    function getRowIndices(y: number) {
        return range(y * displaySize, (y + 1) * displaySize)
    }

    function getColumnIndices(x: number) {
        return range(x, displaySize**2, displaySize)
    }
}

function getStarCount(cells: Cell[]) {
    return cells.reduce((sum, current) => current === Cell.STAR ? sum + 1 : sum, 0)
}

function outOfBounds(x: number, y: number, xSize: number, ySize: number): boolean {
    return x < 0 || x >= xSize || y < 0 || y >= ySize
}