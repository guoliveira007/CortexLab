export default function AlternativasMock({ alternativas, resposta, onResponder, feedbackTexto }) {
  return (
    <div data-testid="alternativas-mock">
      {Object.entries(alternativas).map(([letra, texto]) => (
        <button
          key={letra}
          data-testid={`alt-${letra}`}
          onClick={() => onResponder(letra)}
          disabled={!!resposta}
        >
          {letra}) {texto}
        </button>
      ))}
      {feedbackTexto && <span>{feedbackTexto}</span>}
    </div>
  );
}