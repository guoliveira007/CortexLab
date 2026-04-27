import React, { useState, useRef } from 'react';
import { toast } from 'react-hot-toast';

const StepUpload = ({ onProcessar }) => {
  const [arquivo, setArquivo] = useState(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);
  const apiKey = localStorage.getItem('groq_api_key');

  const handleFile = (f) => {
    if (!f || f.type !== 'application/pdf') { toast.error('Selecione um arquivo PDF.'); return; }
    setArquivo(f);
  };

  const processar = () => {
    if (!arquivo || !apiKey) return;
    const reader = new FileReader();
    reader.onload = () => onProcessar(arquivo.name, reader.result.split(',')[1]);
    reader.readAsDataURL(arquivo);
  };

  return (
    <div style={{ maxWidth: '560px', margin: '0 auto' }}>
      {!apiKey && (
        <div style={{
          background: '#fef2f2', border: '1.5px solid #fecaca',
          borderRadius: 'var(--r-lg)', padding: '14px 18px', marginBottom: '20px',
          fontSize: '13px', color: '#991b1b',
        }}>
          ⚠️ Chave Groq não configurada. Vá em <strong>Configurações</strong> e adicione sua chave antes de continuar.
        </div>
      )}

      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]); }}
        onClick={() => inputRef.current?.click()}
        style={{
          border: `2px dashed ${dragging ? 'var(--brand-500)' : arquivo ? '#10b981' : 'var(--gray-200)'}`,
          borderRadius: 'var(--r-2xl)', padding: '52px 32px', textAlign: 'center',
          cursor: 'pointer',
          background: dragging ? 'rgba(99,102,241,0.04)' : arquivo ? 'rgba(16,185,129,0.04)' : 'var(--gray-50)',
          transition: 'all 0.2s', marginBottom: '20px',
        }}
      >
        <input ref={inputRef} type="file" accept=".pdf" style={{ display: 'none' }}
          onChange={e => handleFile(e.target.files[0])} />
        <div style={{ fontSize: '48px', marginBottom: '14px' }}>{arquivo ? '📄' : '📥'}</div>
        {arquivo ? (
          <>
            <p style={{ fontWeight: 700, fontSize: '16px', color: '#065f46', marginBottom: '4px' }}>{arquivo.name}</p>
            <p style={{ fontSize: '13px', color: '#6ee7b7' }}>{(arquivo.size / 1024).toFixed(0)} KB · clique para trocar</p>
          </>
        ) : (
          <>
            <p style={{ fontWeight: 700, fontSize: '16px', color: 'var(--gray-700)', marginBottom: '6px' }}>
              Arraste o PDF da prova aqui
            </p>
            <p style={{ fontSize: '13px', color: 'var(--gray-400)' }}>ou clique para selecionar</p>
          </>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
        {[
          { icon: '🆓', title: 'Gratuito', desc: 'Usa GroqCloud (Llama 3.3 70B) — sem custo' },
          { icon: '🔍', title: 'OCR incluso', desc: 'PDFs escaneados são lidos via Tesseract automaticamente' },
          { icon: '🖼️', title: 'Sinaliza imagens', desc: 'Questões com figuras ficam marcadas para você adicionar depois' },
          { icon: '✏️', title: 'Revisão completa', desc: 'Edite, corrija e selecione antes de salvar no banco' },
        ].map((c, i) => (
          <div key={i} style={{
            background: 'white', border: '1px solid var(--gray-100)',
            borderRadius: 'var(--r-lg)', padding: '14px',
          }}>
            <span style={{ fontSize: '22px' }}>{c.icon}</span>
            <p style={{ fontWeight: 700, fontSize: '13px', color: 'var(--gray-800)', margin: '6px 0 2px' }}>{c.title}</p>
            <p style={{ fontSize: '12px', color: 'var(--gray-400)', lineHeight: '1.5' }}>{c.desc}</p>
          </div>
        ))}
      </div>

      <button onClick={processar} disabled={!arquivo || !apiKey} className="btn-primary"
        style={{ width: '100%', justifyContent: 'center', padding: '14px', fontSize: '15px', opacity: (!arquivo || !apiKey) ? 0.4 : 1 }}>
        🚀 Extrair Questões com IA
      </button>
    </div>
  );
};

export default StepUpload;