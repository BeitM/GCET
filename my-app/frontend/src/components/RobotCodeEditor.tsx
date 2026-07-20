import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
  type ReactNode,
  type SyntheticEvent,
} from "react";
import type { ControlMode } from "@/lib/types";

export type RobotCodeCompletion = {
  label: string;
  insertText: string;
  detail: string;
  group: string;
  kind?: "function" | "field";
};

type RobotCodeEditorProps = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  controlMode: ControlMode;
  levelNumber: number;
  completions: RobotCodeCompletion[];
  commandReferenceOpen: boolean;
  onToggleCommandReference: () => void;
};

type Selection = { start: number; end: number };

const INDENT = "    ";
const COMPACT_LINE_HEIGHT = 20;
const EXPANDED_LINE_HEIGHT = 24;

const JAVA_KEYWORDS = new Set([
  "abstract", "assert", "boolean", "break", "byte", "case", "catch", "char", "class", "const",
  "continue", "default", "do", "double", "else", "enum", "extends", "final", "finally", "float",
  "for", "goto", "if", "implements", "import", "instanceof", "int", "interface", "long", "native",
  "new", "package", "private", "protected", "public", "return", "short", "static", "strictfp", "super",
  "switch", "synchronized", "this", "throw", "throws", "transient", "try", "void", "volatile", "while",
]);
const JAVA_CONSTANTS = new Set(["true", "false", "null"]);
const CONTROL_KEYWORDS = new Set(["if", "for", "while", "switch", "catch", "synchronized"]);
const TOKEN_PATTERN = /\/\*[\s\S]*?\*\/|\/\/[^\n]*|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|@[A-Za-z_$][\w$]*|\b(?:\d+(?:\.\d+)?|\.\d+)(?:[eE][+-]?\d+)?[fFdDlL]?\b|[A-Za-z_$][\w$]*|===|!==|==|!=|<=|>=|&&|\|\||\+\+|--|->|[+\-*\/%=&|!<>?:~^]+|[{}()[\].,;]|\s+|./g;

function getCompletionPrefix(value: string, caret: number) {
  const beforeCaret = value.slice(0, caret);
  return beforeCaret.match(/[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*\.?$/)?.[0] ?? "";
}

function highlightCode(value: string, commandNames: Set<string>): ReactNode[] {
  const tokens = Array.from(value.matchAll(TOKEN_PATTERN), (match) => match[0]);
  const significant = (index: number, direction: 1 | -1) => {
    for (let cursor = index + direction; cursor >= 0 && cursor < tokens.length; cursor += direction) {
      if (!/^\s+$/.test(tokens[cursor])) return tokens[cursor];
    }
    return "";
  };

  return tokens.map((token, index) => {
    let className = "syntax-plain";
    if (token.startsWith("//") || token.startsWith("/*")) className = "syntax-comment";
    else if (token.startsWith("\"") || token.startsWith("'")) className = "syntax-string";
    else if (token.startsWith("@")) className = "syntax-annotation";
    else if (/^(?:\d|\.\d)/.test(token)) className = "syntax-number";
    else if (JAVA_KEYWORDS.has(token)) className = "syntax-keyword";
    else if (JAVA_CONSTANTS.has(token)) className = "syntax-constant";
    else if (/^[A-Za-z_$]/.test(token)) {
      const previous = significant(index, -1);
      const next = significant(index, 1);
      const qualifiedName = previous === "." ? `${significant(index - 1, -1)}.${token}` : token;
      if (["class", "extends", "implements", "new", "instanceof"].includes(previous) || /^[A-Z]/.test(token)) {
        className = "syntax-class";
      } else if (next === "(" && !CONTROL_KEYWORDS.has(token)) {
        className = commandNames.has(token) || commandNames.has(qualifiedName) ? "syntax-function-known" : "syntax-function";
      } else if (previous === ".") {
        className = "syntax-property";
      } else {
        className = "syntax-variable";
      }
    } else if (/^[+\-*\/%=&|!<>?:~^]/.test(token)) className = "syntax-operator";
    else if (/^[{}()[\].,;]$/.test(token)) className = "syntax-punctuation";

    return <span className={className} key={`${index}-${token}`}>{token}</span>;
  });
}

function getLineAndColumn(value: string, caret: number) {
  const beforeCaret = value.slice(0, caret);
  const lines = beforeCaret.split("\n");
  return { line: lines.length, column: lines.at(-1)?.length ?? 0 };
}

function getSearchMatches(value: string, query: string) {
  if (!query) return [] as Selection[];
  const matches: Selection[] = [];
  const haystack = value.toLocaleLowerCase();
  const needle = query.toLocaleLowerCase();
  let start = 0;
  while (start <= haystack.length - needle.length) {
    const index = haystack.indexOf(needle, start);
    if (index < 0) break;
    matches.push({ start: index, end: index + query.length });
    start = index + Math.max(1, query.length);
  }
  return matches;
}

export function RobotCodeEditor({
  id,
  value,
  onChange,
  controlMode,
  levelNumber,
  completions,
  commandReferenceOpen,
  onToggleCommandReference,
}: RobotCodeEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const findInputRef = useRef<HTMLInputElement>(null);
  const editorViewportRef = useRef<HTMLDivElement>(null);
  const [selection, setSelection] = useState<Selection>({ start: 0, end: 0 });
  const [scroll, setScroll] = useState({ top: 0, left: 0 });
  const [focused, setFocused] = useState(false);
  const [forceSuggestions, setForceSuggestions] = useState(false);
  const [suggestionsDismissed, setSuggestionsDismissed] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState(0);
  const [findOpen, setFindOpen] = useState(false);
  const [findQuery, setFindQuery] = useState("");
  const [findIndex, setFindIndex] = useState(0);
  const [viewportSize, setViewportSize] = useState({ width: 260, height: 260 });
  const [expanded, setExpanded] = useState(false);

  const prefix = getCompletionPrefix(value, selection.start);
  const commandNames = useMemo(() => new Set(completions.flatMap((completion) => {
    const name = completion.label.slice(0, completion.label.indexOf("(") < 0 ? undefined : completion.label.indexOf("("));
    const pieces = name.split(".");
    return [name, pieces.at(-1) ?? name];
  })), [completions]);
  const highlightedCode = useMemo(() => highlightCode(value, commandNames), [commandNames, value]);
  const suggestions = useMemo(() => {
    if (!focused || suggestionsDismissed || (!forceSuggestions && prefix.length === 0)) return [];
    const query = prefix.toLocaleLowerCase();
    return completions
      .filter((completion) => {
        const label = completion.label.toLocaleLowerCase();
        return forceSuggestions && !query ? true : label.startsWith(query) || label.includes(query);
      })
      .sort((left, right) => {
        const leftStarts = left.label.toLocaleLowerCase().startsWith(query) ? 0 : 1;
        const rightStarts = right.label.toLocaleLowerCase().startsWith(query) ? 0 : 1;
        return leftStarts - rightStarts || left.label.localeCompare(right.label);
      })
      .slice(0, 8);
  }, [completions, focused, forceSuggestions, prefix, suggestionsDismissed]);
  const findMatches = useMemo(() => getSearchMatches(value, findQuery), [findQuery, value]);
  const resolvedActiveSuggestion = Math.min(activeSuggestion, Math.max(0, suggestions.length - 1));
  const resolvedFindIndex = Math.min(findIndex, Math.max(0, findMatches.length - 1));
  const cursorPosition = getLineAndColumn(value, selection.start);
  const lineCount = Math.max(1, value.split("\n").length);
  const currentLine = value.slice(0, selection.start).split("\n").at(-1) ?? "";
  const displayColumn = currentLine.replace(/\t/g, INDENT).length;
  const editorLineHeight = expanded ? EXPANDED_LINE_HEIGHT : COMPACT_LINE_HEIGHT;
  const editorCharacterWidth = expanded ? 8.4 : 7.2;
  const editorPadding = expanded ? 20 : 14;
  const desiredMenuTop = editorPadding + (cursorPosition.line - 1) * editorLineHeight - scroll.top + editorLineHeight + 3;
  const completionTop = desiredMenuTop + 190 > viewportSize.height
    ? Math.max(8, desiredMenuTop - 220)
    : desiredMenuTop;
  const completionLeft = Math.max(8, Math.min(
    editorPadding + displayColumn * editorCharacterWidth - scroll.left,
    Math.max(8, viewportSize.width - 250),
  ));
  const fileName = controlMode === "teleop"
    ? "TeleOpBindings.java"
    : levelNumber === 3 ? "RoboLabAuto.java" : "RobotCommands.java";

  useEffect(() => {
    const viewport = editorViewportRef.current;
    if (!viewport) return;
    const observer = new ResizeObserver(([entry]) => {
      setViewportSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(viewport);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!expanded) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [expanded]);

  const restoreSelection = (start: number, end = start) => {
    window.requestAnimationFrame(() => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      textarea.focus();
      textarea.setSelectionRange(start, end);
      setSelection({ start, end });
    });
  };

  const applyEdit = (nextValue: string, start: number, end = start) => {
    onChange(nextValue);
    setForceSuggestions(false);
    restoreSelection(start, end);
  };

  const updateSelection = (event: SyntheticEvent<HTMLTextAreaElement>) => {
    const nextSelection = { start: event.currentTarget.selectionStart, end: event.currentTarget.selectionEnd };
    if (nextSelection.start !== selection.start || nextSelection.end !== selection.end) {
      setSuggestionsDismissed(false);
    }
    setSelection(nextSelection);
    setActiveSuggestion(0);
  };

  const acceptSuggestion = (completion: RobotCodeCompletion) => {
    const wordStart = selection.start - prefix.length;
    const nextValue = `${value.slice(0, wordStart)}${completion.insertText}${value.slice(selection.end)}`;
    const openParenthesis = completion.insertText.indexOf("(");
    const closeParenthesis = completion.insertText.lastIndexOf(")");
    if (completion.kind !== "field" && openParenthesis >= 0 && closeParenthesis > openParenthesis) {
      const argumentStart = wordStart + openParenthesis + 1;
      const argumentEnd = wordStart + closeParenthesis;
      applyEdit(nextValue, argumentStart, argumentEnd);
    } else {
      applyEdit(nextValue, wordStart + completion.insertText.length);
    }
  };

  const indentSelection = (outdent: boolean) => {
    const lineStart = value.lastIndexOf("\n", Math.max(0, selection.start - 1)) + 1;
    const nextNewline = value.indexOf("\n", selection.end);
    const lineEnd = nextNewline < 0 ? value.length : nextNewline;
    const block = value.slice(lineStart, lineEnd);
    const lines = block.split("\n");
    let removedBeforeStart = 0;
    let totalDelta = 0;
    const nextLines = lines.map((line, index) => {
      if (!outdent) {
        totalDelta += INDENT.length;
        return `${INDENT}${line}`;
      }
      const removable = line.match(/^ {1,4}|^\t/)?.[0].length ?? 0;
      if (index === 0) removedBeforeStart = Math.min(removable, selection.start - lineStart);
      totalDelta -= removable;
      return line.slice(removable);
    });
    const nextValue = `${value.slice(0, lineStart)}${nextLines.join("\n")}${value.slice(lineEnd)}`;
    const nextStart = outdent ? selection.start - removedBeforeStart : selection.start + INDENT.length;
    const nextEnd = Math.max(nextStart, selection.end + totalDelta);
    applyEdit(nextValue, nextStart, nextEnd);
  };

  const toggleLineComment = () => {
    const lineStart = value.lastIndexOf("\n", Math.max(0, selection.start - 1)) + 1;
    const nextNewline = value.indexOf("\n", selection.end);
    const lineEnd = nextNewline < 0 ? value.length : nextNewline;
    const lines = value.slice(lineStart, lineEnd).split("\n");
    const nonEmptyLines = lines.filter((line) => line.trim().length > 0);
    const shouldUncomment = nonEmptyLines.length > 0 && nonEmptyLines.every((line) => /^\s*\/\//.test(line));
    let firstDelta = 0;
    let totalDelta = 0;
    const nextLines = lines.map((line, index) => {
      if (!line.trim()) return line;
      if (shouldUncomment) {
        const next = line.replace(/^(\s*)\/\/ ?/, "$1");
        const delta = next.length - line.length;
        if (index === 0) firstDelta = delta;
        totalDelta += delta;
        return next;
      }
      const next = line.replace(/^(\s*)/, "$1// ");
      if (index === 0) firstDelta = 3;
      totalDelta += 3;
      return next;
    });
    const nextValue = `${value.slice(0, lineStart)}${nextLines.join("\n")}${value.slice(lineEnd)}`;
    applyEdit(nextValue, Math.max(lineStart, selection.start + firstDelta), Math.max(lineStart, selection.end + totalDelta));
  };

  const openFind = () => {
    setFindOpen(true);
    window.requestAnimationFrame(() => {
      findInputRef.current?.focus();
      findInputRef.current?.select();
    });
  };

  const closeFind = () => {
    setFindOpen(false);
    restoreSelection(selection.start, selection.end);
  };

  const toggleExpanded = () => {
    setExpanded((current) => !current);
    restoreSelection(selection.start, selection.end);
  };

  const goToFindMatch = (direction: 1 | -1) => {
    if (findMatches.length === 0) return;
    const nextIndex = (resolvedFindIndex + direction + findMatches.length) % findMatches.length;
    setFindIndex(nextIndex);
    const match = findMatches[nextIndex];
    restoreSelection(match.start, match.end);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    const modifier = event.metaKey || event.ctrlKey;
    if (modifier && event.key === " ") {
      event.preventDefault();
      setSuggestionsDismissed(false);
      setForceSuggestions(true);
      return;
    }
    if (modifier && event.key.toLocaleLowerCase() === "f") {
      event.preventDefault();
      openFind();
      return;
    }
    if (modifier && event.key === "/") {
      event.preventDefault();
      toggleLineComment();
      return;
    }
    if (event.key === "Escape" && suggestions.length > 0) {
      event.preventDefault();
      setForceSuggestions(false);
      setSuggestionsDismissed(true);
      return;
    }
    if (event.key === "Escape" && expanded) {
      event.preventDefault();
      setExpanded(false);
      restoreSelection(selection.start, selection.end);
      return;
    }
    if (suggestions.length > 0 && event.key === "ArrowDown") {
      event.preventDefault();
      setActiveSuggestion((current) => (current + 1) % suggestions.length);
      return;
    }
    if (suggestions.length > 0 && event.key === "ArrowUp") {
      event.preventDefault();
      setActiveSuggestion((current) => (current - 1 + suggestions.length) % suggestions.length);
      return;
    }
    if (suggestions.length > 0 && (event.key === "Enter" || event.key === "Tab")) {
      event.preventDefault();
      acceptSuggestion(suggestions[resolvedActiveSuggestion] ?? suggestions[0]);
      return;
    }
    if (event.key === "Tab") {
      event.preventDefault();
      if (selection.start !== selection.end || event.shiftKey) {
        indentSelection(event.shiftKey);
      } else {
        const column = getLineAndColumn(value, selection.start).column;
        const spaces = INDENT.length - (column % INDENT.length);
        applyEdit(`${value.slice(0, selection.start)}${" ".repeat(spaces)}${value.slice(selection.end)}`, selection.start + spaces);
      }
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      const before = value.slice(0, selection.start);
      const after = value.slice(selection.end);
      const currentIndent = before.slice(before.lastIndexOf("\n") + 1).match(/^\s*/)?.[0] ?? "";
      const opensBlock = /[{([]\s*$/.test(before);
      const closesBlock = /^\s*[})\]]/.test(after);
      const nextIndent = `${currentIndent}${opensBlock ? INDENT : ""}`;
      if (opensBlock && closesBlock) {
        const insertion = `\n${nextIndent}\n${currentIndent}`;
        applyEdit(`${before}${insertion}${after}`, before.length + 1 + nextIndent.length);
      } else {
        const insertion = `\n${nextIndent}`;
        applyEdit(`${before}${insertion}${after}`, before.length + insertion.length);
      }
      return;
    }

    const pairs: Record<string, string> = { "(": ")", "[": "]", "{": "}", "\"": "\"", "'": "'" };
    const closingCharacters = new Set(Object.values(pairs));
    if (pairs[event.key] && !modifier) {
      event.preventDefault();
      const selected = value.slice(selection.start, selection.end);
      const insertion = `${event.key}${selected}${pairs[event.key]}`;
      const nextValue = `${value.slice(0, selection.start)}${insertion}${value.slice(selection.end)}`;
      const nextStart = selection.start + 1;
      applyEdit(nextValue, nextStart, selected ? nextStart + selected.length : nextStart);
      return;
    }
    if (closingCharacters.has(event.key) && selection.start === selection.end && value[selection.start] === event.key) {
      event.preventDefault();
      restoreSelection(selection.start + 1);
    }
  };

  const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    onChange(event.target.value);
    setSelection({ start: event.target.selectionStart, end: event.target.selectionEnd });
    setActiveSuggestion(0);
    setSuggestionsDismissed(false);
    setForceSuggestions(false);
  };

  return (
    <>
    {expanded && <button type="button" className="ide-modal-backdrop" onClick={toggleExpanded} aria-label="Close expanded code editor" />}
    <div
      className={`robot-code-ide${expanded ? " is-expanded" : ""}`}
      role={expanded ? "dialog" : undefined}
      aria-modal={expanded ? true : undefined}
      aria-label={expanded ? "Expanded robot code editor" : undefined}
    >
      <div className="ide-titlebar">
        <div className="ide-window-controls" aria-hidden="true"><i /><i /><i /></div>
        <div className="ide-file-tab"><span className="ide-java-icon">J</span><strong>{fileName}</strong><i /></div>
        <div className="ide-title-actions">
          <button type="button" onClick={openFind} title="Find in file (Ctrl/Command + F)">Find</button>
          <button
            type="button"
            className={commandReferenceOpen ? "active" : ""}
            onClick={onToggleCommandReference}
            aria-pressed={commandReferenceOpen}
          >Commands</button>
          <button
            type="button"
            className="ide-expand-button"
            onClick={toggleExpanded}
            aria-label={expanded ? "Collapse code editor" : "Expand code editor"}
            title={expanded ? "Return editor to sidebar" : "Expand editor"}
          ><span aria-hidden="true">{expanded ? "↙" : "↗"}</span>{expanded ? "Collapse" : "Expand"}</button>
        </div>
      </div>
      {findOpen && <div className="ide-findbar">
        <input
          ref={findInputRef}
          aria-label="Find in robot code"
          value={findQuery}
          onChange={(event) => {
            setFindQuery(event.target.value);
            setFindIndex(0);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              goToFindMatch(event.shiftKey ? -1 : 1);
            }
            if (event.key === "Escape") closeFind();
          }}
          placeholder="Find"
        />
        <span>{findMatches.length ? `${resolvedFindIndex + 1} / ${findMatches.length}` : "No results"}</span>
        <button type="button" onClick={() => goToFindMatch(-1)} disabled={!findMatches.length} aria-label="Previous result">↑</button>
        <button type="button" onClick={() => goToFindMatch(1)} disabled={!findMatches.length} aria-label="Next result">↓</button>
        <button type="button" onClick={closeFind} aria-label="Close find">×</button>
      </div>}
      <div className="ide-editor-body">
        <div className="ide-line-numbers" aria-hidden="true">
          <div style={{ transform: `translateY(${-scroll.top}px)` }}>
            {Array.from({ length: lineCount }, (_, index) => <span key={index}>{index + 1}</span>)}
          </div>
        </div>
        <div className="ide-editor-viewport" ref={editorViewportRef}>
          <pre
            className="ide-highlight-layer"
            aria-hidden="true"
            style={{ transform: `translate(${-scroll.left}px, ${-scroll.top}px)` }}
          ><code>{highlightedCode}</code>{value.endsWith("\n") ? "\n" : null}</pre>
          <textarea
            ref={textareaRef}
            id={id}
            className="robot-code-textarea"
            aria-label="Robot code editor"
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onClick={updateSelection}
            onKeyUp={updateSelection}
            onSelect={updateSelection}
            onFocus={() => setFocused(true)}
            onBlur={() => window.setTimeout(() => setFocused(false), 100)}
            onScroll={(event) => setScroll({ top: event.currentTarget.scrollTop, left: event.currentTarget.scrollLeft })}
            wrap="off"
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
          />
          {suggestions.length > 0 && <div
            className="ide-completion-menu"
            role="listbox"
            aria-label="Code suggestions"
            style={{ top: completionTop, left: completionLeft }}
          >
            <div className="ide-completion-head"><span>RoboLab suggestions</span><kbd>Ctrl Space</kbd></div>
            {suggestions.map((completion, index) => <button
              type="button"
              role="option"
              aria-selected={index === resolvedActiveSuggestion}
              className={index === resolvedActiveSuggestion ? "active" : ""}
              key={`${completion.group}-${completion.label}`}
              onMouseDown={(event) => {
                event.preventDefault();
                acceptSuggestion(completion);
              }}
              onMouseEnter={() => setActiveSuggestion(index)}
            >
              <i>{completion.kind === "field" ? "F" : "ƒ"}</i>
              <span><strong>{completion.label}</strong><small>{completion.detail}</small></span>
              <b>{completion.group}</b>
            </button>)}
          </div>}
        </div>
      </div>
      <div className="ide-statusbar">
        <span className="ide-ready"><i /> Editing</span>
        <span>Ln {cursorPosition.line}, Col {cursorPosition.column + 1}</span>
        <span>Spaces: 4</span>
        <span>{controlMode === "teleop" ? "TeleOp bindings" : `Level ${levelNumber}`}</span>
        <span>Java · RoboLab subset</span>
      </div>
    </div>
    </>
  );
}
