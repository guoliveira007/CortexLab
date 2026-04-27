import { renderHook, act } from '@testing-library/react';
import { useGoogleDrive } from '../src/hooks/useGoogleDrive';

// ── Constantes espelhadas do hook (evita importar internals) ─────────────────
const TOKENS_KEY      = 'cortexlab_gdrive_tokens';
const BACKUP_FILE_KEY = 'cortexlab_gdrive_file_id';
const ULTIMO_KEY      = 'cortexlab_gdrive_ultimo';

// ── Token de exemplo que não está expirado ───────────────────────────────────
const tokenValido = {
  access_token:  'access_abc',
  refresh_token: 'refresh_xyz',
  expires_at:    Date.now() + 3_600_000, // expira em 1h
};

// ── Mock global do electronAPI ───────────────────────────────────────────────
const mockElectronAPI = {
  authorize:     vi.fn(),
  exchangeCode:  vi.fn(),
  refreshToken:  vi.fn(),
};

beforeAll(() => {
  Object.defineProperty(window, 'electronAPI', {
    value:      mockElectronAPI,
    writable:   true,
    configurable: true,
  });
});

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  global.fetch = vi.fn();
});

// ────────────────────────────────────────────────────────────────────────────
// conectar()
// ────────────────────────────────────────────────────────────────────────────
describe('conectar()', () => {
  it('salva tokens e seta conectado=true quando OAuth tem sucesso', async () => {
    mockElectronAPI.authorize.mockResolvedValue({ success: true, code: 'auth_code_123' });
    mockElectronAPI.exchangeCode.mockResolvedValue({
      success: true,
      tokens: { access_token: 'abc', refresh_token: 'def', expires_in: 3600 },
    });

    const { result } = renderHook(() => useGoogleDrive());
    expect(result.current.conectado).toBe(false);

    await act(async () => { await result.current.conectar(); });

    expect(result.current.conectado).toBe(true);
    const salvo = JSON.parse(localStorage.getItem(TOKENS_KEY));
    expect(salvo.access_token).toBe('abc');
    expect(salvo.expires_at).toBeGreaterThan(Date.now());
  });

  it('lança erro quando authorize retorna success=false', async () => {
    mockElectronAPI.authorize.mockResolvedValue({ success: false, error: 'Janela fechada' });

    const { result } = renderHook(() => useGoogleDrive());

    await expect(
      act(async () => { await result.current.conectar(); })
    ).rejects.toThrow('Janela fechada');

    expect(result.current.conectado).toBe(false);
    expect(localStorage.getItem(TOKENS_KEY)).toBeNull();
  });

  it('lança erro quando exchangeCode retorna success=false', async () => {
    mockElectronAPI.authorize.mockResolvedValue({ success: true, code: 'code' });
    mockElectronAPI.exchangeCode.mockResolvedValue({ success: false, error: 'Código expirado' });

    const { result } = renderHook(() => useGoogleDrive());

    await expect(
      act(async () => { await result.current.conectar(); })
    ).rejects.toThrow('Código expirado');
  });
});

// ────────────────────────────────────────────────────────────────────────────
// desconectar()
// ────────────────────────────────────────────────────────────────────────────
describe('desconectar()', () => {
  it('limpa localStorage e seta conectado=false', () => {
    localStorage.setItem(TOKENS_KEY,      JSON.stringify(tokenValido));
    localStorage.setItem(BACKUP_FILE_KEY, 'file_id_123');
    localStorage.setItem(ULTIMO_KEY,      '01/01/2025 12:00');

    const { result } = renderHook(() => useGoogleDrive());
    expect(result.current.conectado).toBe(true);

    act(() => { result.current.desconectar(); });

    expect(result.current.conectado).toBe(false);
    expect(result.current.ultimoEnvio).toBe('');
    expect(localStorage.getItem(TOKENS_KEY)).toBeNull();
    expect(localStorage.getItem(BACKUP_FILE_KEY)).toBeNull();
    expect(localStorage.getItem(ULTIMO_KEY)).toBeNull();
  });
});

// ────────────────────────────────────────────────────────────────────────────
// enviarBackup()
// ────────────────────────────────────────────────────────────────────────────
describe('enviarBackup()', () => {
  beforeEach(() => {
    localStorage.setItem(TOKENS_KEY, JSON.stringify(tokenValido));
    localStorage.setItem(BACKUP_FILE_KEY, 'file_id_existente');
  });

  it('faz upload com sucesso usando token ainda válido', async () => {
    // 1ª chamada: verificar se arquivo existe no Drive
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ id: 'file_id_existente', trashed: false }),
    });
    // 2ª chamada: PATCH com conteúdo
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({}),
    });

    const { result } = renderHook(() => useGoogleDrive());

    await act(async () => {
      await result.current.enviarBackup('{"questoes":[]}');
    });

    expect(global.fetch).toHaveBeenCalledTimes(2);
    // O PATCH deve ir para a URL de upload com o fileId correto
    expect(global.fetch).toHaveBeenLastCalledWith(
      expect.stringContaining('file_id_existente'),
      expect.objectContaining({ method: 'PATCH' })
    );
    expect(result.current.ultimoEnvio).not.toBe('');
    expect(result.current.salvando).toBe(false);
  });

  it('renova token expirado antes de enviar', async () => {
    // Sobrescreve com token expirado
    localStorage.setItem(TOKENS_KEY, JSON.stringify({
      ...tokenValido,
      access_token: 'expirado',
      expires_at: Date.now() - 1000, // já expirou
    }));

    mockElectronAPI.refreshToken.mockResolvedValue({
      success: true,
      tokens: { access_token: 'novo_token', expires_in: 3600 },
    });

    global.fetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ id: 'file_id_existente', trashed: false }) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) });

    const { result } = renderHook(() => useGoogleDrive());

    await act(async () => {
      await result.current.enviarBackup('{}');
    });

    expect(mockElectronAPI.refreshToken).toHaveBeenCalledWith(tokenValido.refresh_token);
    // Token novo deve ter sido salvo
    const tokensSalvos = JSON.parse(localStorage.getItem(TOKENS_KEY));
    expect(tokensSalvos.access_token).toBe('novo_token');
  });

  it('cria novo arquivo quando o atual não existe mais no Drive', async () => {
    // Verificação do arquivo existente retorna 404
    global.fetch
      .mockResolvedValueOnce({ ok: false }) // check retorna 404
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ id: 'novo_file_id' }) }) // POST cria
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) }); // PATCH upload

    const { result } = renderHook(() => useGoogleDrive());

    await act(async () => {
      await result.current.enviarBackup('{}');
    });

    expect(localStorage.getItem(BACKUP_FILE_KEY)).toBe('novo_file_id');
    expect(global.fetch).toHaveBeenCalledTimes(3);
  });

  it('lança erro quando não há tokens salvos', async () => {
    localStorage.removeItem(TOKENS_KEY);

    const { result } = renderHook(() => useGoogleDrive());

    await expect(
      act(async () => { await result.current.enviarBackup('{}'); })
    ).rejects.toThrow('Não conectado');

    expect(result.current.salvando).toBe(false);
  });

  it('lança erro quando o PATCH falha na API', async () => {
    global.fetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ id: 'file_id_existente', trashed: false }) })
      .mockResolvedValueOnce({ ok: false, json: () => Promise.resolve({ error: { message: 'quota exceeded' } }) });

    const { result } = renderHook(() => useGoogleDrive());

    await expect(
      act(async () => { await result.current.enviarBackup('{}'); })
    ).rejects.toThrow('quota exceeded');

    expect(result.current.salvando).toBe(false);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// restaurarDoDrive()
// ────────────────────────────────────────────────────────────────────────────
describe('restaurarDoDrive()', () => {
  beforeEach(() => {
    localStorage.setItem(TOKENS_KEY,      JSON.stringify(tokenValido));
    localStorage.setItem(BACKUP_FILE_KEY, 'file_id_backup');
  });

  it('baixa e retorna o JSON do backup', async () => {
    const dadosMock = { questoes: [{ id: 1 }], _versao: 3 };
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(dadosMock),
    });

    const { result } = renderHook(() => useGoogleDrive());

    let dados;
    await act(async () => {
      dados = await result.current.restaurarDoDrive();
    });

    expect(dados).toEqual(dadosMock);
    expect(result.current.restaurando).toBe(false);
  });

  it('lança erro quando não há fileId salvo', async () => {
    localStorage.removeItem(BACKUP_FILE_KEY);

    const { result } = renderHook(() => useGoogleDrive());

    await expect(
      act(async () => { await result.current.restaurarDoDrive(); })
    ).rejects.toThrow('Nenhum backup encontrado');
  });

  it('lança erro quando o download falha', async () => {
    global.fetch.mockResolvedValueOnce({ ok: false });

    const { result } = renderHook(() => useGoogleDrive());

    await expect(
      act(async () => { await result.current.restaurarDoDrive(); })
    ).rejects.toThrow('Erro ao baixar backup');

    expect(result.current.restaurando).toBe(false);
  });
});
