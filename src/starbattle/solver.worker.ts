import { findSolution } from "./utils"
import { PuzzleData } from "./types"

self.onmessage = (e: MessageEvent<PuzzleData>) => {
    self.postMessage(findSolution(e.data))
}