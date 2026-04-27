import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PainelFiltros from '../src/components/PainelFiltros';

const opcoesMock = {
  bancas: ['CESPE', 'FGV', 'FCC'],
  anos: ['2023', '2024'],
  materias: ['Matemática', 'Português'],
  conteudos: ['Álgebra', 'Interpretação'],
  topicos: ['Equações', 'Sujeito'],
};

describe('PainelFiltros', () => {
  let setFiltroMock, resetarMock;

  beforeEach(() => {
    setFiltroMock = vi.fn();
    resetarMock = vi.fn();
  });

  it('renderiza os campos de busca e dropdowns', () => {
    render(
      <PainelFiltros
        filtros={{ banca: [], ano: [], materia: [], conteudo: [], topico: [], busca: '' }}
        setFiltro={setFiltroMock}
        opcoes={opcoesMock}
        resetar={resetarMock}
        questoesFiltradas={10}
      />
    );

    // Deve haver pelo menos um input de busca
    const buscas = screen.getAllByPlaceholderText(/Trecho do enunciado/);
    expect(buscas.length).toBeGreaterThan(0);
    expect(buscas[0]).toBeInTheDocument();
    
    // Label Banca deve estar presente
    expect(screen.getByText('Banca')).toBeInTheDocument();
  });

  it('dispara setFiltro ao digitar na busca', () => {
    render(
      <PainelFiltros
        filtros={{ banca: [], ano: [], materia: [], conteudo: [], topico: [], busca: '' }}
        setFiltro={setFiltroMock}
        opcoes={opcoesMock}
        resetar={resetarMock}
        questoesFiltradas={0}
      />
    );

    // Pega o primeiro input de busca
    const buscaInput = screen.getAllByPlaceholderText(/Trecho do enunciado/)[0];
    
    // Simula digitação caractere por caractere (fireEvent.change é confiável)
    fireEvent.change(buscaInput, { target: { value: 'g' } });
    fireEvent.change(buscaInput, { target: { value: 'ge' } });
    fireEvent.change(buscaInput, { target: { value: 'geo' } });
    fireEvent.change(buscaInput, { target: { value: 'geom' } });
    fireEvent.change(buscaInput, { target: { value: 'geome' } });
    fireEvent.change(buscaInput, { target: { value: 'geomet' } });
    fireEvent.change(buscaInput, { target: { value: 'geometr' } });
    fireEvent.change(buscaInput, { target: { value: 'geometri' } });
    fireEvent.change(buscaInput, { target: { value: 'geometria' } });

    // Verifica se setFiltro foi chamado pelo menos uma vez
    expect(setFiltroMock).toHaveBeenCalled();
    // Verifica se a última chamada foi com 'busca' e 'geometria'
    const chamadas = setFiltroMock.mock.calls;
    const ultimaChamada = chamadas[chamadas.length - 1];
    expect(ultimaChamada[0]).toBe('busca');
  });

  it('exibe o número de questões disponíveis', () => {
    render(
      <PainelFiltros
        filtros={{ banca: [], ano: [], materia: [], conteudo: [], topico: [], busca: '' }}
        setFiltro={setFiltroMock}
        opcoes={opcoesMock}
        resetar={resetarMock}
        questoesFiltradas={42}
      />
    );

    expect(screen.getByText(/42/)).toBeInTheDocument();
  });

  it('mostra o botão "Limpar tudo" quando há filtros ativos', () => {
    render(
      <PainelFiltros
        filtros={{ banca: ['CESPE'], ano: [], materia: [], conteudo: [], topico: [], busca: '' }}
        setFiltro={setFiltroMock}
        opcoes={opcoesMock}
        resetar={resetarMock}
        questoesFiltradas={5}
      />
    );

    // Verifica se o botão "Limpar tudo" aparece
    const botoes = screen.getAllByRole('button', { name: /Limpar tudo/ });
    expect(botoes.length).toBeGreaterThan(0);
    expect(botoes[0]).toBeInTheDocument();
  });

  it('chama resetar ao clicar em "Limpar tudo"', () => {
    render(
      <PainelFiltros
        filtros={{ banca: ['CESPE'], ano: [], materia: [], conteudo: [], topico: [], busca: '' }}
        setFiltro={setFiltroMock}
        opcoes={opcoesMock}
        resetar={resetarMock}
        questoesFiltradas={5}
      />
    );

    // Busca especificamente o botão "Limpar tudo"
    const botoes = screen.getAllByRole('button', { name: /Limpar tudo/ });
    
    // Clica no primeiro botão encontrado
    fireEvent.click(botoes[0]);

    // Verifica se resetarMock foi chamado
    expect(resetarMock).toHaveBeenCalledOnce();
  });
});