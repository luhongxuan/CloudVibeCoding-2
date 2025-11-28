import { GoogleGenAI, Type } from "@google/genai";
import { CellData, CellType, Coordinate, MazeState } from "../types";

// Initialize Gemini API
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const MAZE_DIMENSION = 21;

export const generateMazeFromPrompt = async (userPrompt: string): Promise<MazeState> => {
  try {
    const modelId = "gemini-2.5-flash"; // Efficient and capable for this task

    const response = await ai.models.generateContent({
      model: modelId,
      contents: userPrompt,
      config: {
        systemInstruction: `You are a maze generator. 
        1. Generate a strictly 21x21 2D integer array representing a maze.
        2. Use 0 for WALL and 1 for PATH (Empty).
        3. The maze MUST be solvable. There must be a valid path from coordinate (1,1) to (19,19).
        4. The borders (x=0, y=0, x=20, y=20) should generally be walls (0), except for start/end areas if needed, but keeping them as walls is safer.
        5. The maze layout should visually reflect the user's prompt if it describes a shape (e.g., 'heart', 'smiley', 'letters').
        6. Return valid JSON only.`,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            grid: {
              type: Type.ARRAY,
              items: {
                type: Type.ARRAY,
                items: { type: Type.INTEGER },
              },
            },
          },
        },
      },
    });

    const jsonText = response.text;
    if (!jsonText) throw new Error("No response from AI");

    const parsed = JSON.parse(jsonText);
    const rawGrid: number[][] = parsed.grid;

    // Validate dimensions
    if (!rawGrid || rawGrid.length !== MAZE_DIMENSION || rawGrid[0].length !== MAZE_DIMENSION) {
      // Fallback or resize logic could go here, but for now we throw
      throw new Error(`AI returned invalid grid dimensions. Expected ${MAZE_DIMENSION}x${MAZE_DIMENSION}`);
    }

    // Convert raw 0/1 grid to MazeState structure
    const cells: CellData[][] = [];
    
    for (let y = 0; y < MAZE_DIMENSION; y++) {
      const row: CellData[] = [];
      for (let x = 0; x < MAZE_DIMENSION; x++) {
        // Force borders to be walls to prevent leaks, except potentially strictly inside
        // But for safety in this app's logic, let's trust the AI mostly but ensure data integrity
        const val = rawGrid[y][x];
        
        row.push({
          x,
          y,
          type: val === 1 ? CellType.EMPTY : CellType.WALL,
          isVisited: false,
          isFrontier: false,
          isPath: false,
          distance: Infinity,
          parent: null,
        });
      }
      cells.push(row);
    }

    // Enforce Start and End
    const start: Coordinate = { x: 1, y: 1 };
    const end: Coordinate = { x: MAZE_DIMENSION - 2, y: MAZE_DIMENSION - 2 };

    cells[start.y][start.x].type = CellType.START;
    cells[end.y][end.x].type = CellType.END;

    return {
      grid: cells,
      width: MAZE_DIMENSION,
      height: MAZE_DIMENSION,
      start,
      end,
    };

  } catch (error) {
    console.error("AI Maze Generation Failed:", error);
    throw error;
  }
};
