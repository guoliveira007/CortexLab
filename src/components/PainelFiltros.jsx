import React, { useState, useRef, useEffect, useMemo, useCallback, memo } from 'react';
import styles from './PainelFiltros.module.css';

const MultiSelectDropdown = memo(({ campo, label, opts, valores, setFiltro }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const fn = e => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);   // deps [] — fn só lê ref.current, não precisa de deps externas

  const count = valores.length;
  const disabled = opts.length === 0;

  const toggleOpt = useCallback((opt) => {
    setFiltro(campo, opt);
  }, [campo, setFiltro]);

  const limpar = useCallback((e) => {
    e.stopPropagation();
    setFiltro(campo, null);
  }, [campo, setFiltro]);

  return (
    <div ref={ref} className={styles.dropdownContainer}>
      <label className={styles.dropdownLabel}>{label}</label>

      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen(o => !o)}
        className={`${styles.dropdownButton} ${count > 0 ? styles.dropdownButtonAtivo : ''}`}
      >
        <span className={styles.dropdownButtonText}>
          {count === 0
            ? (disabled ? 'Sem opções' : 'Todos')
            : count === 1
              ? valores[0]
              : `${count} selecionados`}
        </span>

        <span className={styles.dropdownButtonRight}>
          {count > 0 && (
            <span onClick={limpar} className={styles.countBadge}>
              {count} ✕
            </span>
          )}
          <span className={styles.arrow}>{open ? '▲' : '▼'}</span>
        </span>
      </button>

      {open && (
        <div className={styles.opcoesLista}>
          {count > 0 && (
            <div
              onMouseDown={e => e.preventDefault()}
              onClick={() => setFiltro(campo, null)}
              className={styles.opcaoLimpar}
            >
              ✕ Limpar seleção ({count})
            </div>
          )}

          {opts.map(opt => {
            const checked = valores.includes(opt);
            return (
              <div
                key={opt}
                onMouseDown={e => e.preventDefault()}
                onClick={() => toggleOpt(opt)}
                className={`${styles.opcaoItem} ${checked ? styles.opcaoItemSelecionada : ''}`}
              >
                <span className={`${styles.checkbox} ${checked ? styles.checkboxSelecionado : ''}`}>
                  {checked && (
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                      <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </span>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {opt}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
});
MultiSelectDropdown.displayName = 'MultiSelectDropdown';

const PainelFiltros = ({ filtros, setFiltro, opcoes, resetar, questoesFiltradas }) => {
  const config = useMemo(() => [
    { campo: 'banca',    label: 'Banca',    opts: opcoes.bancas    || [] },
    { campo: 'ano',      label: 'Ano',      opts: opcoes.anos      || [] },
    { campo: 'materia',  label: 'Matéria',  opts: opcoes.materias  || [] },
    { campo: 'conteudo', label: 'Conteúdo', opts: opcoes.conteudos || [] },
    { campo: 'topico',   label: 'Tópico',   opts: opcoes.topicos   || [] },
  ], [opcoes]);

  const chips = useMemo(() => {
    const list = config.flatMap(c =>
      (filtros[c.campo] || []).map(v => ({ campo: c.campo, label: c.label, valor: v }))
    );
    if (filtros.busca) list.push({ campo: 'busca', label: 'Busca', valor: filtros.busca });
    return list;
  }, [config, filtros]);

  return (
    <div className={styles.container}>
      {/* Busca textual */}
      <div className={styles.buscaLinha}>
        <label className={styles.buscaLabel}>🔍 Buscar</label>
        <input
          type="text"
          className={styles.buscaInput}
          placeholder="Trecho do enunciado, comando, alternativa..."
          value={filtros.busca || ''}
          onChange={e => setFiltro('busca', e.target.value)}
        />
      </div>

      {/* Dropdowns multi-seleção */}
      <div className={styles.dropdownGrid}>
        {config.map(({ campo, label, opts }) => (
          <MultiSelectDropdown
            key={campo}
            campo={campo}
            label={label}
            opts={opts}
            valores={filtros[campo] || []}
            setFiltro={setFiltro}
          />
        ))}
      </div>

      {/* Chips dos filtros ativos */}
      {chips.length > 0 && (
        <div className={styles.chipsContainer}>
          <span className={styles.chipsLabel}>Filtros ativos:</span>
          {chips.map((c, i) => (
            <span key={i} className={styles.chip}>
              <span className={styles.chipLabel}>{c.label}:</span>
              {String(c.valor).length > 22 ? String(c.valor).slice(0, 22) + '…' : c.valor}
              <button
                type="button"
                onClick={() => c.campo === 'busca' ? setFiltro('busca', '') : setFiltro(c.campo, c.valor)}
                className={styles.chipRemove}
              >×</button>
            </span>
          ))}
          <button type="button" onClick={resetar} className={styles.limparTudoBtn}>
            Limpar tudo
          </button>
        </div>
      )}

      {/* Contador de questões disponíveis */}
      {questoesFiltradas !== undefined && (
        <div className={styles.contador}>
          📋 <strong className={styles.contadorNumero}>{questoesFiltradas}</strong> questão(ões) disponível(is)
        </div>
      )}
    </div>
  );
};

export default PainelFiltros;