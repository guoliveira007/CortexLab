import React, { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { db } from '../../database';
import StepUpload from './StepUpload';
import StepProcessando from './StepProcessando';
import StepRevisao from './StepRevisao';
import StepSucesso from './StepSucesso';
import { extrairPDF } from './utils';

const ImportarIA = () => {
  const [passo, setPasso]         = useState('upload');
  const [progresso, setProgresso] = useState(null);
  const [nomeArq, setNomeArq]     = useState('');
  const [questoes, setQuestoes]   = useState([]);
  const [paginasOCR, setPagOCR]   = useState([]);
  const [lotesComErro, setLotesErro] = useState([]);
  const [statsFinal, setFinal]    = useState(null);
  const abortRef = useRef(null);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const cancelar = useCallback(() => {
    abortRef.current?.abort();
    setPasso('upload');
    setProgresso(null);
    toast('Processamento cancelado.', { icon: '✋' });
  }, []);

  const processar = async (nome, base64) => {
    setNomeArq(nome);
    setPasso('processando');
    const apiKey = localStorage.getItem('groq_api_key');

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const { questoes: qs, paginasOCR: ocr, lotesComErro: erros } =
        await extrairPDF(base64, apiKey, setProgresso, controller.signal);

      if (!qs.length) {
        toast.error('Nenhuma questão encontrada. Verifique se o PDF contém questões de múltipla escolha.');
        setPasso('upload');
        return;
      }
      setQuestoes(qs);
      setPagOCR(ocr);
      setLotesErro(erros);
      setPasso('revisao');
      toast.success(`${qs.length} questões extraídas!`);
    } catch (e) {
      if (e.name === 'AbortError') return;
      toast.error(e.message || 'Erro ao processar o PDF.');
      setPasso('upload');
    }
  };

  const importar = async (selecionadas) => {
    try {
      const registros = selecionadas.map(q => ({
        banca:    q.banca    || '',
        ano:      Number(q.ano) || '',
        materia:  q.materia  || '',
        conteudo: q.conteudo || '',
        topico:   q.topico   || '',
        enunciado:        q.enunciado        || '',
        comando:          q.comando          || '',
        alternativas:     q.alternativas     || {},
        gabarito:         q.gabarito         || '',
        explicacao:       q.explicacao       || '',
        tem_imagem:       q.tem_imagem       || false,
        descricao_imagem: q.descricao_imagem || '',
        imagemEnunciado:     null,
        imagensAlternativas: {},
        criadoEm: new Date().toISOString(),
        fonte: 'importar_ia',
      }));
      await db.questoes.bulkAdd(registros);
      const comImg = registros.filter(r => r.tem_imagem).length;
      setFinal({ total: registros.length, comImagem: comImg });
      setPasso('sucesso');
      toast.success(`${registros.length} questões importadas!`);
    } catch (e) {
      toast.error('Erro ao salvar: ' + e.message);
    }
  };

  const reiniciar = () => {
    setPasso('upload'); setQuestoes([]); setPagOCR([]); setFinal(null);
    setProgresso(null); setLotesErro([]);
  };

  const PASSOS = [
    { id: 'upload',      label: '1. Upload',  icon: '📥' },
    { id: 'processando', label: '2. Extração', icon: '🤖' },
    { id: 'revisao',     label: '3. Revisão',  icon: '✏️' },
  ];
  const idxMap = { upload: 0, processando: 1, revisao: 2, sucesso: 3 };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">Importar com IA</h2>
          <p style={{ color: 'var(--gray-500)', fontSize: '14px', marginTop: '2px' }}>
            Envie o PDF da prova — a IA extrai todas as questões, detecta imagens e você revisa antes de salvar. Gratuito via Groq.
          </p>
        </div>
      </div>

      {passo !== 'sucesso' && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          background: 'white', padding: '14px 20px', borderRadius: 'var(--r-xl)',
          boxShadow: 'var(--shadow-sm)', border: '1px solid var(--gray-100)',
          marginBottom: '24px',
        }}>
          {PASSOS.map((p, i) => {
            const ativo = idxMap[passo] >= idxMap[p.id];
            return (
              <React.Fragment key={p.id}>
                {i > 0 && (
                  <div style={{
                    flex: 1, height: '2px',
                    background: ativo ? 'var(--brand-400)' : 'var(--gray-200)',
                    transition: 'background 0.3s',
                  }} />
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                  <span style={{
                    width: '28px', height: '28px', borderRadius: '50%',
                    background: ativo ? 'var(--gradient-brand)' : 'var(--gray-100)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '13px', transition: 'background 0.3s',
                  }}>{p.icon}</span>
                  <span style={{
                    fontSize: '13px', fontWeight: ativo ? 700 : 400,
                    color: ativo ? 'var(--brand-600)' : 'var(--gray-400)',
                  }}>{p.label}</span>
                </div>
              </React.Fragment>
            );
          })}
        </div>
      )}

      <div className="card">
        {passo === 'upload'      && <StepUpload onProcessar={processar} />}
        {passo === 'processando' && (
          <StepProcessando progresso={progresso} nomeArquivo={nomeArq} onCancelar={cancelar} />
        )}
        {passo === 'revisao'     && (
          <StepRevisao
            questoes={questoes} paginasOCR={paginasOCR} lotesComErro={lotesComErro}
            onImportar={importar} onVoltar={reiniciar}
          />
        )}
        {passo === 'sucesso' && statsFinal && (
          <StepSucesso total={statsFinal.total} comImagem={statsFinal.comImagem} onNovo={reiniciar} />
        )}
      </div>
    </div>
  );
};

export default ImportarIA;