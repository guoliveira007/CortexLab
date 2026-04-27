import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BackupRestaurar from '../src/components/BackupRestaurar';

// ── Mock do db ───────────────────────────────────────────────────────────────
vi.mock('../src/database', () => ({
  db: {
    questoes:       { toArray: vi.fn().mockResolvedValue([]),  count: vi.fn().mockResolvedValue(5),  clear: vi.fn(), add: vi.fn(), put: vi.fn() },
    resultados:     { toArray: vi.fn().mockResolvedValue([]),  count: vi.fn().mockResolvedValue(12), clear: vi.fn(), add: vi.fn(), put: vi.fn() },
    listas:         { toArray: vi.fn().mockResolvedValue([]),  count: vi.fn().mockResolvedValue(2),  clear: vi.fn(), add: vi.fn(), put: vi.fn() },
    simulados:      { toArray: vi.fn().mockResolvedValue([]),  count: vi.fn().mockResolvedValue(0),  clear: vi.fn(), add: vi.fn(), put: vi.fn() },
    metas:          { toArray: vi.fn().mockResolvedValue([]),  count: vi.fn().mockResolvedValue(3),  clear: vi.fn(), add: vi.fn(), put: vi.fn() },
    sessoes:        { toArray: vi.fn().mockResolvedValue([]),  count: vi.fn().mockResolvedValue(0),  clear: vi.fn(), add: vi.fn(), put: vi.fn() },
    planejamento:   { toArray: vi.fn().mockResolvedValue([]),  count: vi.fn().mockResolvedValue(0),  clear: vi.fn(), add: vi.fn(), put: vi.fn() },
    conquistas:     { toArray: vi.fn().mockResolvedValue([]),  count: vi.fn().mockResolvedValue(1),  clear: vi.fn(), add: vi.fn(), put: vi.fn() },
    revisaoEspacada:{ toArray: vi.fn().mockResolvedValue([]),  count: vi.fn().mockResolvedValue(4),  clear: vi.fn(), add: vi.fn(), put: vi.fn() },
  },
}));

// ── Mock do useAutoBackup ─────────────────────────────────────────────────────
vi.mock('../src/hooks/useAutoBackup', () => ({
  useAutoBackup: vi.fn(),
}));

// ── Mock do useGoogleDrive ──────────────────────────────────────────────────
const mockDrive = {
  conectado:         false,
  salvando:          false,
  restaurando:       false,
  ultimoEnvio:       '',
  conectar:          vi.fn(),
  desconectar:       vi.fn(),
  enviarBackup:      vi.fn(),
  enviarComDebounce: vi.fn(),
  restaurarDoDrive:  vi.fn(),
};

vi.mock('../src/hooks/useGoogleDrive', () => ({
  useGoogleDrive: vi.fn(() => ({ ...mockDrive })),
}));

// ── Mock do react-hot-toast (CORRIGIDO: função base também é spy) ───────────
vi.mock('react-hot-toast', () => {
  const baseToast = vi.fn();
  baseToast.success = vi.fn();
  baseToast.error   = vi.fn();

  return {
    toast:    baseToast,
    default:  baseToast,
    __esModule: true,
  };
});

import { useGoogleDrive } from '../src/hooks/useGoogleDrive';
import { toast }           from 'react-hot-toast';

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────
const renderComponent = () => render(<BackupRestaurar />);

/** Cria um File com JSON válido de backup */
const criarArquivoBackup = (overrides = {}) => {
  const dados = {
    _versao: 3,
    _exportadoEm: '2025-01-01T00:00:00.000Z',
    questoes:    [{ id: 1 }],
    resultados:  [],
    ...overrides,
  };
  return new File([JSON.stringify(dados)], 'backup.json', { type: 'application/json' });
};

// ────────────────────────────────────────────────────────────────────────────
beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  useGoogleDrive.mockReturnValue({ ...mockDrive });
});

// ────────────────────────────────────────────────────────────────────────────
// Google Drive – estado visual
// ────────────────────────────────────────────────────────────────────────────
describe('Google Drive — UI', () => {
  it('exibe botão "Conectar Google Drive" quando desconectado', async () => {
    renderComponent();
    expect(await screen.findByText(/Conectar Google Drive/i)).toBeInTheDocument();
  });

  it('exibe badge "CONECTADO" e ações de backup quando conectado', async () => {
    useGoogleDrive.mockReturnValue({ ...mockDrive, conectado: true });
    renderComponent();

    expect(await screen.findByText('CONECTADO')).toBeInTheDocument();
    expect(screen.getByText(/Enviar backup agora/i)).toBeInTheDocument();
    expect(screen.getByText(/Restaurar do Drive/i)).toBeInTheDocument();
  });

  it('chama conectar() ao clicar no botão de conexão', async () => {
    const user = userEvent.setup();
    mockDrive.conectar.mockResolvedValue({});
    useGoogleDrive.mockReturnValue({ ...mockDrive });

    renderComponent();
    const btn = await screen.findByText(/Conectar Google Drive/i);
    await user.click(btn);

    expect(mockDrive.conectar).toHaveBeenCalledOnce();
  });

  it('exibe toast de erro quando conectar() lança exceção', async () => {
    const user = userEvent.setup();
    mockDrive.conectar.mockRejectedValue(new Error('Janela fechada pelo usuário'));
    useGoogleDrive.mockReturnValue({ ...mockDrive });

    renderComponent();
    await user.click(await screen.findByText(/Conectar Google Drive/i));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('Janela fechada'))
    );
  });

  it('chama desconectar() ao clicar em "Desconectar Google Drive"', async () => {
    const user = userEvent.setup();
    useGoogleDrive.mockReturnValue({ ...mockDrive, conectado: true });

    renderComponent();
    await user.click(await screen.findByText(/Desconectar Google Drive/i));

    expect(mockDrive.desconectar).toHaveBeenCalledOnce();
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Auto-backup local – toggle
// ────────────────────────────────────────────────────────────────────────────
describe('Auto-backup local — toggle', () => {
  it('salva "true" no localStorage ao ativar', async () => {
    const user = userEvent.setup();
    renderComponent();

    const toggles = await screen.findAllByRole('button', { name: '' });
    await user.click(toggles[0]);

    expect(localStorage.getItem('auto_backup')).toBe('true');
  });

  it('salva "false" no localStorage ao desativar', async () => {
    localStorage.setItem('auto_backup', 'true');
    const user = userEvent.setup();
    renderComponent();

    const toggles = await screen.findAllByRole('button', { name: '' });
    await user.click(toggles[0]);

    expect(localStorage.getItem('auto_backup')).toBe('false');
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Importar arquivo
// ────────────────────────────────────────────────────────────────────────────
describe('Seleção de arquivo de backup', () => {
  it('exibe info do arquivo após selecionar JSON válido', async () => {
    renderComponent();

    const input = document.querySelector('input[type="file"]');
    const file  = criarArquivoBackup();

    await act(async () => {
      fireEvent.change(input, { target: { files: [file] } });
      await new Promise(r => setTimeout(r, 50));
    });

    expect(await screen.findByText('✅ backup.json')).toBeInTheDocument();
    expect(screen.getByText(/1 questões/i)).toBeInTheDocument();
  });

  it('exibe toast de erro para JSON sem _versao', async () => {
    renderComponent();

    const input = document.querySelector('input[type="file"]');
    const arquivoInvalido = new File(['{"questoes":[]}'], 'invalido.json', { type: 'application/json' });

    await act(async () => {
      fireEvent.change(input, { target: { files: [arquivoInvalido] } });
      await new Promise(r => setTimeout(r, 50));
    });

    expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('inválido'));
  });

  it('exibe toast de erro para JSON malformado', async () => {
    renderComponent();

    const input = document.querySelector('input[type="file"]');
    const corrompido = new File(['não é json'], 'corrompido.json', { type: 'application/json' });

    await act(async () => {
      fireEvent.change(input, { target: { files: [corrompido] } });
      await new Promise(r => setTimeout(r, 50));
    });

    expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('inválido'));
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Restaurar do Drive – enviar agora
// ────────────────────────────────────────────────────────────────────────────
describe('"Enviar backup agora"', () => {
  it('chama enviarBackup() e exibe toast de sucesso', async () => {
    const user = userEvent.setup();
    mockDrive.enviarBackup.mockResolvedValue(undefined);
    useGoogleDrive.mockReturnValue({ ...mockDrive, conectado: true });

    renderComponent();

    await user.click(await screen.findByText(/Enviar backup agora/i));

    await waitFor(() => expect(mockDrive.enviarBackup).toHaveBeenCalledOnce());
    expect(toast.success).toHaveBeenCalledWith(expect.stringContaining('Google Drive'));
  });

  it('exibe toast de erro quando enviarBackup() lança exceção', async () => {
    const user = userEvent.setup();
    mockDrive.enviarBackup.mockRejectedValue(new Error('quota exceeded'));
    useGoogleDrive.mockReturnValue({ ...mockDrive, conectado: true });

    renderComponent();

    await user.click(await screen.findByText(/Enviar backup agora/i));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('quota exceeded'))
    );
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Restaurar auto-backup
// ────────────────────────────────────────────────────────────────────────────
describe('"Restaurar backup automático"', () => {
  it('exibe toast de erro quando não há backup salvo', async () => {
    const user = userEvent.setup();
    renderComponent();

    await user.click(await screen.findByText(/Restaurar backup automático/i));

    expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('Nenhum backup automático'));
  });

  it('restaura dados do localStorage quando backup existe', async () => {
    const dadosBackup = {
      _versao: 3,
      questoes: [{ id: 1 }],
      resultados: [],
    };
    localStorage.setItem('cortexlab_autobackup', JSON.stringify(dadosBackup));

    const user = userEvent.setup();
    renderComponent();

    await user.click(await screen.findByText(/Restaurar backup automático/i));

    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith(expect.stringContaining('restaurado'))
    );
  });
});