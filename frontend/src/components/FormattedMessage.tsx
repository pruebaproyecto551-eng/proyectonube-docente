import React from 'react';

interface FormattedMessageProps {
  content: string;
  className?: string;
}

/**
 * Parsea y formatea texto de IA eliminando asteriscos crudos (** o *)
 * y convirtiéndolos en negritas elegantes, cursivas, listas con viñetas limpias,
 * listas numeradas coquetas y llamadas de atención visuales.
 */
export function FormattedMessage({ content, className = '' }: FormattedMessageProps) {
  if (!content) return null;

  // Divide el texto en párrafos o líneas
  const lines = content.split('\n');

  // Procesa elementos inline (negritas **, cursivas *, código inline `)
  const renderInline = (text: string): React.ReactNode[] => {
    const parts: React.ReactNode[] = [];
    let remaining = text;
    let keyIdx = 0;

    while (remaining.length > 0) {
      // 1. Bold: **texto** o __texto__
      const boldMatch = remaining.match(/\*\*(.*?)\*\*|__(.*?)__/);
      // 2. Code: `codigo`
      const codeMatch = remaining.match(/`([^`]+)`/);
      // 3. Italic: *texto* (pero no ** ni espacio después de *)
      const italicMatch = remaining.match(/(?<!\*)\*([^*\s][^*]*[^*\s]|[^*\s])\*(?!\*)/);

      // Encontrar el primer match que ocurra en el string
      const matches = [
        boldMatch ? { type: 'bold', index: boldMatch.index!, match: boldMatch, length: boldMatch[0].length, content: boldMatch[1] || boldMatch[2] } : null,
        codeMatch ? { type: 'code', index: codeMatch.index!, match: codeMatch, length: codeMatch[0].length, content: codeMatch[1] } : null,
        italicMatch ? { type: 'italic', index: italicMatch.index!, match: italicMatch, length: italicMatch[0].length, content: italicMatch[1] } : null,
      ].filter(Boolean) as { type: string; index: number; match: RegExpMatchArray; length: number; content: string }[];

      if (matches.length === 0) {
        // No more matches, agregar el resto como texto plano
        parts.push(<span key={keyIdx++}>{remaining}</span>);
        break;
      }

      // Ordenar por el que aparezca primero
      matches.sort((a, b) => a.index - b.index);
      const first = matches[0];

      // Texto antes del match
      if (first.index > 0) {
        parts.push(<span key={keyIdx++}>{remaining.substring(0, first.index)}</span>);
      }

      // Renderizar el elemento estilizado
      if (first.type === 'bold') {
        parts.push(
          <strong
            key={keyIdx++}
            className="font-bold text-slate-950"
          >
            {first.content}
          </strong>
        );
      } else if (first.type === 'italic') {
        parts.push(
          <em key={keyIdx++} className="italic text-slate-700">
            {first.content}
          </em>
        );
      } else if (first.type === 'code') {
        parts.push(
          <code
            key={keyIdx++}
            className="px-1.5 py-0.5 rounded-md bg-slate-100 text-indigo-700 font-mono text-[11px] border border-slate-200 font-semibold"
          >
            {first.content}
          </code>
        );
      }

      remaining = remaining.substring(first.index + first.length);
    }

    return parts;
  };

  const elements: React.ReactNode[] = [];
  let currentList: { type: 'ul' | 'ol'; items: React.ReactNode[] } | null = null;
  let blockKey = 0;

  const flushList = () => {
    if (currentList) {
      if (currentList.type === 'ul') {
        elements.push(
          <ul key={`list-${blockKey++}`} className="space-y-1.5 my-2 pl-1">
            {currentList.items.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2 text-slate-800">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-2 shrink-0" />
                <span className="flex-1 leading-relaxed">{item}</span>
              </li>
            ))}
          </ul>
        );
      } else {
        elements.push(
          <ol key={`list-${blockKey++}`} className="space-y-1.5 my-2 pl-1">
            {currentList.items.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2.5 text-slate-800">
                <span className="w-5 h-5 rounded-lg bg-indigo-100 text-indigo-700 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5 border border-indigo-200">
                  {idx + 1}
                </span>
                <span className="flex-1 leading-relaxed">{item}</span>
              </li>
            ))}
          </ol>
        );
      }
      currentList = null;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    if (!trimmed) {
      flushList();
      continue;
    }

    // 1. Títulos: ### o ## o #
    if (trimmed.startsWith('### ')) {
      flushList();
      elements.push(
        <h4 key={blockKey++} className="font-bold text-slate-900 text-xs sm:text-sm mt-3 mb-1 flex items-center gap-1.5">
          <span className="w-1 h-3.5 bg-indigo-500 rounded-full" />
          <span>{renderInline(trimmed.replace(/^###\s+/, ''))}</span>
        </h4>
      );
      continue;
    }
    if (trimmed.startsWith('## ') || trimmed.startsWith('# ')) {
      flushList();
      elements.push(
        <h3 key={blockKey++} className="font-extrabold text-slate-900 text-sm sm:text-base mt-3 mb-1.5">
          {renderInline(trimmed.replace(/^#+\s+/, ''))}
        </h3>
      );
      continue;
    }

    // 2. Viñetas (Bullet List): * o - o •
    const bulletMatch = trimmed.match(/^[\*\-\•]\s+(.*)$/);
    if (bulletMatch) {
      if (!currentList || currentList.type !== 'ul') {
        flushList();
        currentList = { type: 'ul', items: [] };
      }
      currentList.items.push(renderInline(bulletMatch[1]));
      continue;
    }

    // 3. Listas Numeradas: 1. o 2.
    const numberedMatch = trimmed.match(/^(\d+)[\.\)]\s+(.*)$/);
    if (numberedMatch) {
      if (!currentList || currentList.type !== 'ol') {
        flushList();
        currentList = { type: 'ol', items: [] };
      }
      currentList.items.push(renderInline(numberedMatch[2]));
      continue;
    }

    // 4. Bloques de Cita / Callout: >
    if (trimmed.startsWith('> ')) {
      flushList();
      elements.push(
        <div
          key={blockKey++}
          className="p-3 my-2 bg-indigo-50/70 border-l-4 border-indigo-500 rounded-r-xl text-slate-700 text-xs italic"
        >
          {renderInline(trimmed.replace(/^>\s+/, ''))}
        </div>
      );
      continue;
    }

    // 5. Párrafo Normal
    flushList();
    elements.push(
      <p key={blockKey++} className="leading-relaxed my-1.5 text-slate-800">
        {renderInline(trimmed)}
      </p>
    );
  }

  flushList();

  return <div className={`space-y-1 text-xs font-normal text-slate-800 ${className}`}>{elements}</div>;
}
