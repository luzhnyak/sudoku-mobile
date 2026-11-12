import { create } from 'zustand';

import { getRepository } from '../database';
import { dailyDifficulty, dailySeed, generatePuzzle } from '../engine';
import type { Difficulty, Digit, LogicalHint } from '../engine';
import { defaultSettings } from '../game/model';
import type { Game, Settings } from '../game/model';
import {
  createGame, enterDigit, erase, explain, recordExplanation, redo, restart, reveal, undo,
} from '../game/rules';
import { elapsedTime } from '../gameClock/activeTime';

type Feedback = 'hintUnavailable' | 'revealUnavailable' | 'revealFeedback' | null;

type Session = {
  ready: boolean;
  loadFailed: boolean;
  saveFailed: boolean;
  busy: boolean;
  settings: Settings;
  game: Game | null;
  latestActive: Game | null;
  selected: number | null;
  notesMode: boolean;
  hint: LogicalHint | null;
  explainedEliminations: number;
  feedback: Feedback;
  foreground: boolean;
  windowFocused: boolean;
  focused: boolean;
  paused: boolean;
  startedAt: number | null;
  initialize: () => Promise<void>;
  startClassic: (difficulty: Difficulty) => Promise<boolean>;
  openDaily: (date: string) => Promise<boolean>;
  continueGame: () => boolean;
  changeSettings: (patch: Partial<Settings>) => void;
  setForeground: (active: boolean) => void;
  setWindowFocused: (focused: boolean) => void;
  setFocused: (focused: boolean) => void;
  setPaused: (paused: boolean) => void;
  checkpoint: () => void;
  select: (index: number) => void;
  toggleNotes: () => void;
  input: (digit: Digit) => void;
  eraseSelected: () => void;
  undoMove: () => void;
  redoMove: () => void;
  explainMove: () => void;
  revealDigit: () => void;
  restartGame: () => void;
  retryClassic: () => Promise<boolean>;
};

const pendingGames = new Map<string, Game>();
let pendingSettings: Settings | null = null;
let saving: Promise<void> | null = null;

export function flushSaves(): Promise<void> {
  if (saving) return saving;
  if (!pendingGames.size && !pendingSettings) return Promise.resolve();

  saving = (async () => {
    try {
      const repository = await getRepository();
      while (pendingGames.size || pendingSettings) {
        const settings = pendingSettings;
        if (settings) {
          await repository.saveSettings(settings);
          if (pendingSettings === settings) pendingSettings = null;
        }
        for (const [id, game] of [...pendingGames]) {
          await repository.saveGame(game);
          if (pendingGames.get(id) === game) pendingGames.delete(id);
        }
      }
      useSessionStore.setState({ saveFailed: false });
    } catch {
      useSessionStore.setState({ saveFailed: true });
    }
  })().finally(() => { saving = null; });

  return saving;
}

function queueGame(game: Game) {
  pendingGames.set(game.id, game);
  void flushSaves();
}

let idSequence = 0;
function classicId() {
  return `classic-${Date.now().toString(36)}-${(idSequence++).toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export const useSessionStore = create<Session>((set, get) => {
  function switchGame(game: Game) {
    set({
      game, selected: null, notesMode: false, hint: null, explainedEliminations: 0, feedback: null, paused: false,
      startedAt: null,
      latestActive: game.status === 'playing' ? game : get().latestActive,
    });
    syncClock();
  }

  function persistClock(keepRunning: boolean) {
    const { game, startedAt } = get();
    if (game === null || startedAt === null) return;

    const now = performance.now();
    const elapsedMs = elapsedTime(game.elapsedMs, startedAt, now);
    const updated = { ...game, elapsedMs, updatedAt: Date.now() };
    set({
      game: updated, startedAt: keepRunning ? now : null,
      latestActive: updated,
    });
    queueGame(updated);
  }

  function syncClock() {
    const { focused, foreground, windowFocused, paused, game, startedAt } = get();
    const shouldRun = focused && foreground && windowFocused && !paused && game?.status === 'playing';
    if (shouldRun && startedAt === null) set({ startedAt: performance.now() });
    if (!shouldRun && startedAt !== null) persistClock(false);
  }

  async function refreshLatest(terminal: Game) {
    try {
      await flushSaves();
      const latest = await (await getRepository()).getLatestActive();
      if (get().game === terminal && latest?.id !== terminal.id) {
        set({ latestActive: latest });
      }
    } catch {
      // The saved game will be available on the next successful database read.
    }
  }

  function mutate(action: (game: Game, now: number) => Game, whilePaused = false) {
    const { game, startedAt, paused, busy, explainedEliminations } = get();
    if (!game || busy || (paused && !whilePaused) || game.status !== 'playing') return false;
    const now = Date.now();
    const clock = performance.now();
    const result = action(game, now);
    if (result === game) return false;

    const updated = {
      ...result,
      elapsedMs: result.elapsedMs < game.elapsedMs || whilePaused
        ? result.elapsedMs
        : elapsedTime(result.elapsedMs, startedAt, clock),
    };
    const active = updated.status === 'playing';
    const boardUnchanged = game.board === updated.board || game.board.every((value, index) => value === updated.board[index]);
    set({
      game: updated,
      latestActive: active ? updated : null,
      hint: null,
      explainedEliminations: !whilePaused && boardUnchanged ? explainedEliminations : 0,
      feedback: null,
      startedAt: active && startedAt !== null ? clock : null,
    });
    queueGame(updated);
    if (!active) void refreshLatest(updated);
    return true;
  }

  async function open(create: () => Promise<Game>): Promise<boolean> {
    if (get().busy) return false;
    set({ busy: true });
    try {
      await flushSaves();
      switchGame(await create());
      return true;
    } finally {
      set({ busy: false });
    }
  }

  async function saveNew(game: Game): Promise<Game> {
    await (await getRepository()).saveGame(game);
    return game;
  }

  return {
    ready: false,
    loadFailed: false,
    saveFailed: false,
    busy: false,
    settings: defaultSettings,
    game: null,
    latestActive: null,
    selected: null,
    notesMode: false,
    hint: null,
    explainedEliminations: 0,
    feedback: null,
    foreground: true,
    windowFocused: true,
    focused: false,
    paused: false,
    startedAt: null,
    async initialize() {
      if (get().ready || get().busy) return;
      set({ busy: true, loadFailed: false });
      try {
        const repository = await getRepository();
        const [settings, latestActive] = await Promise.all([
          repository.getSettings(), repository.getLatestActive(),
        ]);
        set({ ready: true, settings, latestActive });
      } catch {
        set({ loadFailed: true });
      } finally {
        set({ busy: false });
      }
    },
    startClassic(difficulty) {
      return open(async () => {
        const puzzle = await generatePuzzle(difficulty);
        return saveNew(createGame(puzzle, { id: classicId(), now: Date.now() }));
      });
    },
    openDaily(date) {
      return open(async () => {
        const id = `daily-${date}`;
        const inMemory = get().game;
        if (inMemory?.dailyDate === date) return inMemory;
        const pending = pendingGames.get(id);
        if (pending) return pending;

        const repository = await getRepository();
        const saved = await repository.getDaily(date);
        if (saved) return saved;

        const puzzle = await generatePuzzle(dailyDifficulty(date), { seed: dailySeed(date) });
        const created = createGame(puzzle, { id, now: Date.now(), dailyDate: date });
        await repository.saveGame(created);
        return (await repository.getDaily(date)) ?? created;
      });
    },
    continueGame() {
      const { latestActive, busy } = get();
      if (!latestActive || busy) return false;
      switchGame(latestActive);
      return true;
    },
    changeSettings(patch) {
      const settings = { ...get().settings, ...patch };
      set({ settings });
      pendingSettings = settings;
      void flushSaves();
    },
    setForeground(foreground) {
      set({ foreground });
      syncClock();
      if (!foreground) void flushSaves();
    },
    setWindowFocused(windowFocused) {
      set({ windowFocused });
      syncClock();
    },
    setFocused(focused) {
      set({ focused });
      syncClock();
    },
    setPaused(paused) {
      set({ paused, feedback: null, hint: null });
      syncClock();
    },
    checkpoint() {
      const { startedAt, game } = get();
      if (startedAt !== null && game && performance.now() - startedAt >= 2000) {
        persistClock(true);
      }
    },
    select(selected) {
      if (!get().paused) set({ selected, hint: null, feedback: null });
    },
    toggleNotes() {
      set({ notesMode: !get().notesMode, feedback: null });
    },
    input(digit) {
      const { selected, notesMode, settings } = get();
      if (selected !== null) mutate((game, now) => enterDigit(game, selected, digit, notesMode, settings, now));
    },
    eraseSelected() {
      const { selected } = get();
      if (selected !== null) mutate((game, now) => erase(game, selected, now));
    },
    undoMove() {
      mutate(undo);
    },
    redoMove() {
      mutate(redo);
    },
    explainMove() {
      const { game, paused, explainedEliminations } = get();
      if (!game || paused || game.status !== 'playing') return;
      const hint = explain(game, explainedEliminations);
      if (hint && mutate((game, now) => recordExplanation(game, now, explainedEliminations))) {
        set({ hint, feedback: null, explainedEliminations: explainedEliminations + (hint.placement ? 0 : 1) });
      } else {
        set({ hint: null, feedback: 'hintUnavailable' });
      }
    },
    revealDigit() {
      const { selected, settings } = get();
      const changed = mutate((game, now) => reveal(game, selected, settings, now));
      set({ hint: null, feedback: changed ? 'revealFeedback' : 'revealUnavailable' });
    },
    restartGame() {
      if (mutate(restart, true)) {
        set({ selected: null, notesMode: false, paused: false });
        syncClock();
      }
    },
    retryClassic() {
      return open(async () => {
        const { game } = get();
        if (!game || game.type !== 'classic' || game.status !== 'lost') {
          throw new Error('No classic game to restart');
        }
        return saveNew(createGame(game, { id: classicId(), now: Date.now() }));
      });
    },
  };
});
