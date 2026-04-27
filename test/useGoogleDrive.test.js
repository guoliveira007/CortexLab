import { renderHook, act } from '@testing-library/react';
import { useGoogleDrive } from '../src/hooks/useGoogleDrive';

// ── Constantes espelhadas do hook (evita importar internals) ─────────────────
const BACKUP_FILE_KEY = 'cortexlab_gdrive_file_id';
const ULTIMO_KEY      = 'cortexlab_gdrive_ultimo';

// ── Mock global do electronAPI (inclui os métodos do keytar) ─────────────────
const mockElectronAPI = {
  authorize:    vi.fn(),
  exchangeCode: vi.fn(),
  refreshToken: vi.fn(),
  loadToken:    vi.fn().mockResolvedValue({ success: false, token: null }),
  saveToken:    vi.fn().mockResolvedValue({ success: true }),
  deleteToken:  vi.fn().mockResolvedValue({ success: true }),
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
  // Por padrão, usuário não está conectado (sem token no cofre)
  mockElectronAPI.loadToken.mockResolvedValue({ success: false, token: null });
});

// ────────────────────────────────────────────────────────────────────────────
// conectar()
// ────────────────────────────────────────────────────────────────────────────
describe('conectar()', () => {
  it('salva refresh_token no cofre e seta conectado=true', async () => {
    mockElectronAPI.authorize.mockResolvedValue({ success: true, code: 'auth_code_123' });
    mockElectronAPI.exchangeCode.mockResolvedValue({
      success: true,
      tokens: { access_token: 'abc', refresh_token: 'def', expires_in: 3600 },
    });

    const { result } = renderHook(() => useGoogleDrive());
    expect(result.current.conectado).toBe(false);

    await act(async () => { await result.current.conectar(); });

    expect(result.current.conectado).toBe(true);
    // O refresh_token deve ser salvo no keytar
    expect(mockElectronAPI.saveToken).toHaveBeenCalledWith('def');
  });

  it('lança erro quando authorize retorna success=false', async () => {
    mockElectronAPI.authorize.mockResolvedValue({ success: false, error: 'Janela fechada' });

    const { result } = renderHook(() => useGoogleDrive());

    await expect(
      act(async () => { await result.current.conectar(); })
    ).rejects.toThrow('Janela fechada');

    expect(result.current.conectado).toBe(false);
    expect(mockElectronAPI.saveToken).not.toHaveBeenCalled();
  });

  it('lança erro quando exchangeCode retorna success=false', async () => {
    mockElectronAPI.authorize.mockResolvedValue({ success: true, code: 'code' });
    mockElectronAPI.exchangeCode.mockResolvedValue({ success: false, error: 'Código expirado' });

    const { result } = renderHook(() => useGoogleDrive());

    await expect(
      act(async () => { await result.current.conectar(); })
    ).rejects.toThrow('Código expirado');

    expect(mockElectronAPI.saveToken).not.toHaveBeenCalled();
  });
});

// ────────────────────────────────────────────────────────────────────────────
// desconectar()
// ────────────────────────────────────────────────────────────────────────────
describe('desconectar()', () => {
  it('remove token do cofre e limpa localStorage', async () => {
    // Simula usuário conectado: loadToken retorna um refresh_token
    mockElectronAPI.loadToken.mockResolvedValue({ success: true, token: 'refresh_xyz' });

    const { result } = renderHook(() => useGoogleDrive());

    // Aguarda o useEffect que checa a conexão inicial
    await act(async () => { await vi.runAllTimersAsync(); });
    expect(result.current.conectado).toBe(true);

    // Desconecta
    await act(async () => { await result.current.desconectar(); });

    expect(result.current.conectado).toBe(false);
    expect(result.current.ultimoEnvio).toBe('');
    // Deve chamar deleteToken para remover do cofre
    expect(mockElectronAPI.deleteToken).toHaveBeenCalled();
  });
});

// ────────────────────────────────────────────────────────────────────────────
// enviarBackup()
// ────────────────────────────────────────────────────────────────────────────
describe('enviarBackup()', () => {
  beforeEach(() => {
    // Simula usuário conectado
    mockElectronAPI.loadToken.mockResolvedValue({ success: true, token: 'refresh_xyz' });
    // Access token válido em memória (setado internamente após connect)
    // Como não chamamos connect() explicitamente, precisamos mockar getValidAccessToken
    // que internamente chama loadToken + refreshToken. Vamos configurar refreshToken
    // para renovar o token com sucesso e evitar chamada ao Google.
    mockElectronAPI.refreshToken.mockResolvedValue({
      success: true,
      tokens: { access_token: 'mem_abc', expires_in: 3600 },
    });
    localStorage.setItem(BACKUP_FILE_KEY, 'file_id_existente');
  });

  it('faz upload com sucesso usando token ainda válido', async () => {
    // Como o memTokens é reiniciado a cada teste, o primeiro envio vai precisar
    // renovar o token. Configuramos refreshToken acima para retornar 'mem_abc'.
    global.fetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ id: 'file_id_existente', trashed: false }) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) });

    const { result } = renderHook(() => useGoogleDrive());
    // Aguarda o useEffect de conexão
    await act(async () => { await vi.runAllTimersAsync(); });

    await act(async () => {
      await result.current.enviarBackup('{"questoes":[]}');
    });

    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(global.fetch).toHaveBeenLastCalledWith(
      expect.stringContaining('file_id_existente'),
      expect.objectContaining({ method: 'PATCH' })
    );
    expect(result.current.ultimoEnvio).not.toBe('');
    expect(result.current.salvando).toBe(false);
  });

  it('cria novo arquivo quando o atual não existe mais no Drive', async () => {
    global.fetch
      .mockResolvedValueOnce({ ok: false })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ id: 'novo_file_id' }) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) });

    const { result } = renderHook(() => useGoogleDrive());
    await act(async () => { await vi.runAllTimersAsync(); });

    await act(async () => {
      await result.current.enviarBackup('{}');
    });

    expect(localStorage.getItem(BACKUP_FILE_KEY)).toBe('novo_file_id');
    expect(global.fetch).toHaveBeenCalledTimes(3);
  });

  it('lança erro quando não há refresh_token no cofre', async () => {
    // Sobrescreve: loadToken retorna token nulo (não conectado)
    mockElectronAPI.loadToken.mockResolvedValue({ success: true, token: null });

    const { result } = renderHook(() => useGoogleDrive());
    await act(async () => { await vi.runAllTimersAsync(); });

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
    await act(async () => { await vi.runAllTimersAsync(); });

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
    mockElectronAPI.loadToken.mockResolvedValue({ success: true, token: 'refresh_xyz' });
    mockElectronAPI.refreshToken.mockResolvedValue({
      success: true,
      tokens: { access_token: 'rest_abc', expires_in: 3600 },
    });
    localStorage.setItem(BACKUP_FILE_KEY, 'file_id_backup');
  });

  it('baixa e retorna o JSON do backup', async () => {
    const dadosMock = { questoes: [{ id: 1 }], _versao: 3 };
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(dadosMock),
    });

    const { result } = renderHook(() => useGoogleDrive());
    await act(async () => { await vi.runAllTimersAsync(); });

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
    await act(async () => { await vi.runAllTimersAsync(); });

    await expect(
      act(async () => { await result.current.restaurarDoDrive(); })
    ).rejects.toThrow('Nenhum backup encontrado');
  });

  it('lança erro quando o download falha', async () => {
    global.fetch.mockResolvedValueOnce({ ok: false });

    const { result } = renderHook(() => useGoogleDrive());
    await act(async () => { await vi.runAllTimersAsync(); });

    await expect(
      act(async () => { await result.current.restaurarDoDrive(); })
    ).rejects.toThrow('Erro ao baixar backup');

    expect(result.current.restaurando).toBe(false);
  });
});