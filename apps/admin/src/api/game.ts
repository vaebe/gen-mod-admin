import type { GameRecord } from "@/types";
import { request } from "./base";

export function getGames(): Promise<GameRecord[]> {
  return request.get("/games");
}

export function createGame(data: GameRecord): Promise<GameRecord> {
  return request.post("/games", data);
}

export function updateGame(id: string, data: Omit<GameRecord, "id">): Promise<GameRecord> {
  return request.patch(`/games/${encodeURIComponent(id)}`, data);
}

export function deleteGame(id: string): Promise<{ ok: boolean }> {
  return request.delete(`/games/${encodeURIComponent(id)}`);
}
