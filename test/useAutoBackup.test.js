import { renderHook } from '@testing-library/react';
import { useAutoBackup } from '../src/hooks/useAutoBackup';

const BACKUP_KEY        = 'cortexlab_autobackup';
const ULTIMO_BACKUP_KEY = 'cortexlab_ultimo_autobackup';
const DEBOUNCE_MS       = 5000;

let capturedChangeHandler = null;
let mockUnsubscribe;

vi.mock('../src/database', () => {
  const tabelasMock = [
    'questoes','resultados','listas','simulados',
    'metas','sessoes','planejamento','conquistas','revisaoEspacada',
  ];

  const tabelas = Object.fromEntries(
    tabelasMock.map(t => [t, { toArray: vi.fn().mockResolvedValue([]) }])
  );

  return {
    db: {
      ...tabelas,
      on: vi.fn((event, handler) => {
        if (event === 'changes') capturedChangeHandler = handler;
        mockUnsubscribe = vi.fn();
        return mockUnsubscribe;
      }),
    },
  };
});

import { db } from '../src/database';

beforeEach(() => {
  localStorage.clear();
  capturedChangeHandler = null;
  vi.useFakeTimers();
  vi.clearAllMocks();
  const tabelas = ['questoes','resultados','listas','simulados',
    'metas','sessoes','planejamento','conquistas','revisaoEspacada'];
  tabelas.forEach(t => db[t].toArray.mockResolvedValue([]));
  mockUnsubscribe = vi.fn();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useAutoBackup()', () => {
  it('executa backup imediato ao ativar (enabled=true)', async () => {
    renderHook(() => useAutoBackup(true));
    // Avança todas as tarefas pendentes (timers + microtarefas)
    await vi.runAllTimersAsync();

    const backup = JSON.parse(localStorage.getItem(BACKUP_KEY));
    expect(backup._versao).toBe(3);
    expect(backup._exportadoEm).toBeTruthy();
  });

  it('salva timestamp em cortexlab_ultimo_autobackup', async () => {
    renderHook(() => useAutoBackup(true));
    await vi.runAllTimersAsync();
    expect(localStorage.getItem(ULTIMO_BACKUP_KEY)).not.toBeNull();
  });

  it('não executa backup quando enabled=false', async () => {
    renderHook(() => useAutoBackup(false));
    await vi.runAllTimersAsync();
    expect(localStorage.getItem(BACKUP_KEY)).toBeNull();
    expect(db.on).not.toHaveBeenCalled();
  });

  it('registra listener de changes no db ao ativar', async () => {
    renderHook(() => useAutoBackup(true));
    await vi.runAllTimersAsync();
    expect(db.on).toHaveBeenCalledWith('changes', expect.any(Function));
  });

  it('agenda backup com debounce de 5s após alteração no db', async () => {
    renderHook(() => useAutoBackup(true));
    await vi.runAllTimersAsync();

    // Limpa o backup inicial para detectar o debounced
    localStorage.removeItem(BACKUP_KEY);
    localStorage.removeItem(ULTIMO_BACKUP_KEY);

    // Simula uma alteração no Dexie
    capturedChangeHandler();

    // Antes dos 5s nada deve ser salvo
    vi.advanceTimersByTime(DEBOUNCE_MS - 1);
    expect(localStorage.getItem(BACKUP_KEY)).toBeNull();

    // Avança o restante do debounce
    vi.advanceTimersByTime(1);
    // Aguarda a resolução das promessas internas (backup assíncrono)
    await vi.runAllTimersAsync();

    expect(localStorage.getItem(BACKUP_KEY)).not.toBeNull();
  });

  it('reinicia o debounce se changes disparar múltiplas vezes', async () => {
    const spy = vi.spyOn(global, 'clearTimeout');

    renderHook(() => useAutoBackup(true));
    await vi.runAllTimersAsync();

    // Primeira mudança
    capturedChangeHandler();
    vi.advanceTimersByTime(2000);
    // Segunda mudança – o debounce deve reiniciar
    capturedChangeHandler();

    expect(spy).toHaveBeenCalled(); // clearTimeout chamado ao reiniciar
  });

  it('cancela o timer e desregistra listener ao desmontar', async () => {
    const { unmount } = renderHook(() => useAutoBackup(true));
    await vi.runAllTimersAsync();

    capturedChangeHandler();
    vi.advanceTimersByTime(2000); // timer ainda pendente

    unmount();

    // Remove qualquer resquício e avança tempo suficiente
    localStorage.removeItem(BACKUP_KEY);
    vi.advanceTimersByTime(DEBOUNCE_MS);
    await vi.runAllTimersAsync();

    expect(localStorage.getItem(BACKUP_KEY)).toBeNull();
  });

  it('inclui dados reais das tabelas no backup', async () => {
    db.questoes.toArray.mockResolvedValue([{ id: 1, banca: 'CESPE' }]);
    db.resultados.toArray.mockResolvedValue([{ id: 1, acertou: true }]);

    renderHook(() => useAutoBackup(true));
    await vi.runAllTimersAsync();

    const backup = JSON.parse(localStorage.getItem(BACKUP_KEY));
    expect(backup.questoes).toHaveLength(1);
    expect(backup.questoes[0].banca).toBe('CESPE');
    expect(backup.resultados).toHaveLength(1);
  });
});