"use client";

import React, { useMemo } from "react";

interface MarkdownViewProps {
  content: string | null | undefined;
  className?: string;
}

// 인라인 마크다운 (굵게, 기울임, 취소선, 인라인코드, 링크 등) 파싱 함수
function renderInline(text: string): React.ReactNode[] {
  if (!text) return [];

  // 인라인 토큰 정규식:
  // 1. `인라인 코드`
  // 2. **볼드** 또는 __볼드__
  // 3. ~~취소선~~
  // 4. *기울임* 또는 _기울임_
  // 5. [링크텍스트](url)
  // 6. https?:// URL
  const pattern =
    /(`[^`\n]+`|\*\*[^*\n]+\*\*|__[^_\n]+__|~~[^~\n]+~~|\*[^*\n]+\*|_[^_\n]+_|\[[^\]\n]+\]\([^)\s]+\)|https?:\/\/[^\s]+)/g;

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const token = match[0];
    const key = `${match.index}-${token.slice(0, 8)}`;

    if (token.startsWith("`") && token.endsWith("`")) {
      parts.push(
        <code
          key={key}
          className="rounded bg-indigo-50 px-1.5 py-0.5 font-mono text-[13px] text-indigo-700 border border-indigo-200/60 font-medium"
        >
          {token.slice(1, -1)}
        </code>
      );
    } else if (
      (token.startsWith("**") && token.endsWith("**")) ||
      (token.startsWith("__") && token.endsWith("__"))
    ) {
      parts.push(
        <strong key={key} className="font-bold text-gray-900">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith("~~") && token.endsWith("~~")) {
      parts.push(
        <del key={key} className="line-through text-gray-400">
          {token.slice(2, -2)}
        </del>
      );
    } else if (
      (token.startsWith("*") && token.endsWith("*")) ||
      (token.startsWith("_") && token.endsWith("_"))
    ) {
      parts.push(
        <em key={key} className="italic text-gray-800 font-medium">
          {token.slice(1, -1)}
        </em>
      );
    } else if (token.startsWith("[") && token.includes("](") && token.endsWith(")")) {
      const closeBracket = token.indexOf("](");
      const label = token.slice(1, closeBracket);
      const url = token.slice(closeBracket + 2, -1);
      parts.push(
        <a
          key={key}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-indigo-600 hover:text-indigo-800 underline underline-offset-2 font-medium break-all"
        >
          {label}
        </a>
      );
    } else if (token.startsWith("http://") || token.startsWith("https://")) {
      parts.push(
        <a
          key={key}
          href={token}
          target="_blank"
          rel="noopener noreferrer"
          className="text-indigo-600 hover:text-indigo-800 underline underline-offset-2 break-all"
        >
          {token}
        </a>
      );
    } else {
      parts.push(token);
    }

    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}

type Block =
  | { type: "code"; lang?: string; code: string }
  | { type: "table"; headers: string[]; rows: string[][] }
  | { type: "h1"; text: string }
  | { type: "h2"; text: string }
  | { type: "h3"; text: string }
  | { type: "h4"; text: string }
  | { type: "hr" }
  | { type: "blockquote"; text: string }
  | { type: "task"; checked: boolean; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }
  | { type: "p"; lines: string[] };

function parseMarkdownBlocks(raw: string): Block[] {
  const lines = raw.split(/\r?\n/);
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const prevI = i;
    const line = lines[i];
    const trimmed = line.trim();

    // 1. 빈 줄인 경우
    if (!trimmed) {
      i++;
      continue;
    }

    // 2. 코드 블록 (```)
    if (trimmed.startsWith("```")) {
      const lang = trimmed.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      if (i < lines.length) i++; // 닫는 ``` 건너뜀
      blocks.push({
        type: "code",
        lang,
        code: codeLines.join("\n"),
      });
      continue;
    }

    // 3. 테이블 (| a | b |)
    if (
      trimmed.startsWith("|") &&
      trimmed.endsWith("|") &&
      i + 1 < lines.length &&
      lines[i + 1].trim().startsWith("|") &&
      /^[|\s\-:]+$/.test(lines[i + 1].trim())
    ) {
      const headers = trimmed
        .split("|")
        .slice(1, -1)
        .map((h) => h.trim());
      i += 2; // header 및 divider 건너뜀
      const rows: string[][] = [];
      while (
        i < lines.length &&
        lines[i].trim().startsWith("|") &&
        lines[i].trim().endsWith("|")
      ) {
        const row = lines[i]
          .trim()
          .split("|")
          .slice(1, -1)
          .map((c) => c.trim());
        rows.push(row);
        i++;
      }
      blocks.push({ type: "table", headers, rows });
      continue;
    }

    // 4. 구분선 (---, ***, ___)
    if (/^(?:[-*_]\s*){3,}$/.test(trimmed)) {
      blocks.push({ type: "hr" });
      i++;
      continue;
    }

    // 5. 제목 (Heading #, ##, ###, ####)
    const hMatch = trimmed.match(/^(#{1,4})\s*(.*)$/);
    if (hMatch) {
      const level = hMatch[1].length;
      const text = hMatch[2].trim();
      if (level === 1) blocks.push({ type: "h1", text });
      else if (level === 2) blocks.push({ type: "h2", text });
      else if (level === 3) blocks.push({ type: "h3", text });
      else blocks.push({ type: "h4", text });
      i++;
      continue;
    }

    // 6. 인용구 (> ...)
    if (trimmed.startsWith(">")) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith(">")) {
        quoteLines.push(lines[i].trim().replace(/^>\s?/, ""));
        i++;
      }
      blocks.push({
        type: "blockquote",
        text: quoteLines.join("\n"),
      });
      continue;
    }

    // 7. 태스크 체크리스트 (완료: - [x], -[x], -[ x], -[x ], - [ x ] / 진행중: - [ ], - [], -[])
    const taskMatch = trimmed.match(/^[-*+]\s*\[\s*([xX]?)\s*\]\s*(.*)$/);
    if (taskMatch) {
      const checked = taskMatch[1].toLowerCase() === "x";
      const text = taskMatch[2].trim();
      blocks.push({ type: "task", checked, text });
      i++;
      continue;
    }

    // 8. 순서 없는 리스트 (- 또는 * 또는 +)
    if (/^[-*+]\s*/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length) {
        const curTrim = lines[i].trim();
        if (curTrim.match(/^[-*+]\s*\[\s*[xX]?\s*\]/)) {
          break;
        }
        const listMatch = curTrim.match(/^[-*+]\s*(.*)$/);
        if (listMatch) {
          items.push(listMatch[1]);
          i++;
        } else if (curTrim.startsWith("  ") && items.length > 0) {
          items[items.length - 1] += "\n" + curTrim;
          i++;
        } else {
          break;
        }
      }
      if (items.length > 0) {
        blocks.push({ type: "ul", items });
        continue;
      }
    }

    // 9. 순서 있는 리스트 (1. 2. 3.)
    if (/^\d+\.\s*/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length) {
        const curTrim = lines[i].trim();
        const numMatch = curTrim.match(/^\d+\.\s*(.*)$/);
        if (numMatch) {
          items.push(numMatch[1]);
          i++;
        } else if (curTrim.startsWith("  ") && items.length > 0) {
          items[items.length - 1] += "\n" + curTrim;
          i++;
        } else {
          break;
        }
      }
      if (items.length > 0) {
        blocks.push({ type: "ol", items });
        continue;
      }
    }

    // 10. 일반 단락 (연속된 일반 텍스트 라인)
    const pLines: string[] = [];
    while (i < lines.length) {
      const cur = lines[i];
      const curTrim = cur.trim();
      if (!curTrim) break; // 빈 줄이면 단락 종료
      if (
        curTrim.startsWith("```") ||
        /^(?:[-*_]\s*){3,}$/.test(curTrim) ||
        curTrim.match(/^(#{1,4})\s*/) ||
        curTrim.startsWith(">") ||
        curTrim.match(/^[-*+]\s*\[[ xX]\]/) ||
        /^[-*+]\s*/.test(curTrim) ||
        /^\d+\.\s*/.test(curTrim) ||
        (curTrim.startsWith("|") && curTrim.endsWith("|"))
      ) {
        break;
      }
      pLines.push(cur);
      i++;
    }

    if (pLines.length > 0) {
      blocks.push({ type: "p", lines: pLines });
    }

    // 11. 무한 루프 방지 절대적 안전장치: 어떤 구문에서도 i가 전진하지 못한 경우 강제 전진
    if (i === prevI) {
      blocks.push({ type: "p", lines: [lines[i]] });
      i++;
    }
  }

  return blocks;
}

export default function MarkdownView({ content, className = "" }: MarkdownViewProps) {
  const blocks = useMemo(() => {
    if (!content || !content.trim()) return [];
    return parseMarkdownBlocks(content);
  }, [content]);

  if (!content || !content.trim()) {
    return <span className="text-gray-400 italic">내용이 없습니다.</span>;
  }

  return (
    <div className={`space-y-2.5 text-gray-800 leading-relaxed ${className}`}>
      {blocks.map((block, idx) => {
        switch (block.type) {
          case "h1":
            return (
              <h1
                key={idx}
                className="text-lg sm:text-xl font-bold text-gray-900 border-b border-gray-200 pb-1.5 pt-2"
              >
                {renderInline(block.text)}
              </h1>
            );
          case "h2":
            return (
              <h2
                key={idx}
                className="text-base sm:text-lg font-bold text-gray-900 pt-1.5 pb-0.5"
              >
                {renderInline(block.text)}
              </h2>
            );
          case "h3":
            return (
              <h3
                key={idx}
                className="text-sm sm:text-base font-semibold text-gray-900 pt-1 text-indigo-950 flex items-center gap-1.5"
              >
                <span className="inline-block w-1.5 h-3.5 bg-indigo-500 rounded-sm" />
                <span>{renderInline(block.text)}</span>
              </h3>
            );
          case "h4":
            return (
              <h4
                key={idx}
                className="text-xs sm:text-sm font-semibold text-gray-800 pt-0.5"
              >
                {renderInline(block.text)}
              </h4>
            );
          case "hr":
            return <hr key={idx} className="my-3 border-gray-200" />;
          case "blockquote":
            return (
              <blockquote
                key={idx}
                className="border-l-4 border-indigo-400 bg-indigo-50/50 pl-3.5 py-1.5 rounded-r-lg text-xs sm:text-sm text-gray-700 italic space-y-1"
              >
                {block.text.split("\n").map((line, lIdx) => (
                  <p key={lIdx}>{renderInline(line)}</p>
                ))}
              </blockquote>
            );
          case "code":
            return (
              <div key={idx} className="my-2 rounded-xl overflow-hidden border border-slate-800 bg-slate-900 shadow-xs">
                {block.lang && (
                  <div className="bg-slate-800 px-3 py-1 text-[11px] font-mono text-slate-400 border-b border-slate-700/60">
                    {block.lang}
                  </div>
                )}
                <pre className="p-3 text-xs font-mono text-slate-100 overflow-x-auto leading-relaxed">
                  <code>{block.code}</code>
                </pre>
              </div>
            );
          case "table":
            return (
              <div key={idx} className="my-3 overflow-x-auto rounded-lg border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200 text-xs text-left">
                  <thead className="bg-gray-100 font-semibold text-gray-900">
                    <tr>
                      {block.headers.map((h, hIdx) => (
                        <th key={hIdx} className="px-3 py-2 border-r border-gray-200 last:border-r-0">
                          {renderInline(h)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {block.rows.map((row, rIdx) => (
                      <tr key={rIdx} className="hover:bg-gray-50">
                        {row.map((cell, cIdx) => (
                          <td key={cIdx} className="px-3 py-2 border-r border-gray-100 last:border-r-0 text-gray-700">
                            {renderInline(cell)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          case "task":
            return (
              <div
                key={idx}
                className="flex items-start gap-2 text-xs sm:text-sm py-0.5"
              >
                <span className="mt-0.5 shrink-0 inline-flex items-center">
                  {block.checked ? (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                      완료
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200/80">
                      진행중
                    </span>
                  )}
                </span>
                <span
                  className={`leading-relaxed ${
                    block.checked
                      ? "text-gray-900 font-medium"
                      : "text-gray-700 font-normal"
                  }`}
                >
                  {renderInline(block.text)}
                </span>
              </div>
            );
          case "ul":
            return (
              <ul key={idx} className="space-y-1.5 pl-1 text-xs sm:text-sm">
                {block.items.map((item, itemIdx) => (
                  <li key={itemIdx} className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500" />
                    <span className="flex-1 leading-relaxed">
                      {renderInline(item)}
                    </span>
                  </li>
                ))}
              </ul>
            );
          case "ol":
            return (
              <ol key={idx} className="space-y-1.5 pl-1 text-xs sm:text-sm">
                {block.items.map((item, itemIdx) => (
                  <li key={itemIdx} className="flex items-start gap-2">
                    <span className="shrink-0 font-semibold text-indigo-600 font-mono text-xs w-4">
                      {itemIdx + 1}.
                    </span>
                    <span className="flex-1 leading-relaxed">
                      {renderInline(item)}
                    </span>
                  </li>
                ))}
              </ol>
            );
          case "p":
            return (
              <div key={idx} className="text-xs sm:text-sm leading-relaxed space-y-1 text-gray-800">
                {block.lines.map((line, lIdx) => (
                  <p key={lIdx}>{renderInline(line)}</p>
                ))}
              </div>
            );
          default:
            return null;
        }
      })}
    </div>
  );
}
