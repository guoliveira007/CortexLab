/**
 * Filtra um array de questões por um termo de busca textual.
 * A busca é case‑insensitive e percorre enunciado, comando, explicação e alternativas.
 *
 * @param {Array}   questoes - Array de objetos de questão
 * @param {string}  busca    - Termo de busca (pode ser vazio)
 * @returns {Array} questões que contêm o termo
 */
export const filtrarPorTexto = (questoes, busca) => {
  if (!busca) return questoes;
  const termo = busca.toLowerCase();
  return questoes.filter(q =>
    [q.enunciado, q.comando, q.explicacao, ...Object.values(q.alternativas || {})]
      .join(' ')
      .toLowerCase()
      .includes(termo)
  );
};