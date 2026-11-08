'use client';

import { Fragment, useEffect, useRef, useState, type ReactNode } from 'react';
import { Bot, MessageCircle, RotateCcw, Send, Sparkles, X, Zap } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { cn } from '@/lib/utils';

interface Atalho { id: string; rotulo: string; pergunta: string }
interface Msg { id: number; autor: 'user' | 'bot'; texto: string; cache?: boolean; erro?: boolean }

function inlineM(texto: string): ReactNode[] {
  return (texto ?? '').split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*\s][^*]*\*)/g).filter(Boolean).map((p: string, i: number) => {
    if (p.startsWith('**') && p.endsWith('**')) return <strong key={i}>{p.slice(2, -2)}</strong>;
    if (p.startsWith('`') && p.endsWith('`')) return <code key={i} className="rounded bg-muted px-1 text-xs">{p.slice(1, -1)}</code>;
    if (p.startsWith('*') && p.endsWith('*') && p.length > 2) return <em key={i}>{p.slice(1, -1)}</em>;
    return <Fragment key={i}>{p}</Fragment>;
  });
}

function splitCells(linha: string): string[] {
  let s = linha.trim();
  if (s.startsWith('|')) s = s.slice(1);
  if (s.endsWith('|')) s = s.slice(0, -1);
  return s.split('|').map((c) => c.trim());
}

function isSeparador(linha: string): boolean {
  return /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(linha);
}

function Markdown({ texto }: { texto: string }) {
  const blocos: ReactNode[] = [];
  let lista: { ordenada: boolean; inicio: number; itens: string[] } | null = null;
  const fechar = () => {
    if (!lista) return;
    const it = lista.itens.map((item: string, i: number) => <li key={i}>{inlineM(item)}</li>);
    blocos.push(lista.ordenada ? <ol key={blocos.length} start={lista.inicio}>{it}</ol> : <ul key={blocos.length}>{it}</ul>);
    lista = null;
  };
  const linhas = (texto ?? '').split('\n');
  for (let idx = 0; idx < linhas.length; idx++) {
    const linhaBruta = linhas[idx];
    const linha = linhaBruta.trimEnd();
    // Tabela markdown: linha de cabeçalho com | seguida de linha separadora ---
    if (linha.trim().includes('|') && idx + 1 < linhas.length && isSeparador(linhas[idx + 1])) {
      fechar();
      const header = splitCells(linha);
      const linhasTabela: string[][] = [];
      let j = idx + 2;
      while (j < linhas.length && linhas[j].trim().includes('|') && !isSeparador(linhas[j])) {
        linhasTabela.push(splitCells(linhas[j]));
        j++;
      }
      blocos.push(
        <div key={blocos.length} className="md-table-wrap">
          <table className="md-table">
            <thead><tr>{header.map((c, i) => <th key={i}>{inlineM(c)}</th>)}</tr></thead>
            <tbody>{linhasTabela.map((row, r) => (
              <tr key={r}>{header.map((_, c) => <td key={c}>{inlineM(row[c] ?? '')}</td>)}</tr>
            ))}</tbody>
          </table>
        </div>
      );
      idx = j - 1;
      continue;
    }
    const ul = linha.match(/^\s*[-*•]\s+(.*)$/);
    const ol = linha.match(/^\s*(\d+)[.)]\s+(.*)$/);
    const h = linha.match(/^#{1,6}\s+(.*)$/);
    if (ul || ol) {
      const ordenada = !!ol;
      if (lista && lista.ordenada !== ordenada) fechar();
      if (!lista) lista = { ordenada, inicio: ol ? Number(ol[1]) : 1, itens: [] };
      lista.itens.push(ul ? ul[1] : ol![2]);
      continue;
    }
    fechar();
    if (!linha.trim()) continue;
    if (h) blocos.push(<h4 key={blocos.length} className="font-semibold">{inlineM(h[1])}</h4>);
    else blocos.push(<p key={blocos.length}>{inlineM(linha)}</p>);
  }
  fechar();
  return <div className="md-content">{blocos}</div>;
}

export function ChatWidget() {
  const { data: session } = useSession();
  const user = session?.user as any;
  const [aberto, setAberto] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [atalhos, setAtalhos] = useState<Atalho[] | null>(null);
  const conversa = useRef<string | undefined>(undefined);
  const fim = useRef<HTMLDivElement>(null);
  const seq = useRef(0);

  useEffect(() => {
    if (!aberto || atalhos) return;
    fetch('/api/chat/atalhos').then(r => r.json()).then((d: any) => setAtalhos(d ?? [])).catch(() => setAtalhos([]));
  }, [aberto, atalhos]);

  useEffect(() => { fim.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs, enviando]);
  useEffect(() => { setMsgs([]); conversa.current = undefined; setAtalhos(null); }, [user?.id]);

  if (!user) return null;

  const enviar = async (payload: { message?: string; atalho?: string }, exibido: string) => {
    if (enviando) return;
    setMsgs(m => [...m, { id: ++seq.current, autor: 'user', texto: exibido }]);
    setEnviando(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, conversationId: conversa.current }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? 'Erro');
      conversa.current = data?.conversationId;
      setMsgs(m => [...m, { id: ++seq.current, autor: 'bot', texto: data?.resposta ?? '', cache: data?.cache }]);
    } catch (e: any) {
      setMsgs(m => [...m, { id: ++seq.current, autor: 'bot', texto: e?.message ?? 'Não consegui responder. Tente novamente.', erro: true }]);
    } finally { setEnviando(false); }
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const t = texto.trim();
    if (!t) return;
    setTexto('');
    enviar({ message: t.slice(0, 1000) }, t);
  };

  const nova = () => { setMsgs([]); conversa.current = undefined; };

  return (
    <>
      {!aberto && (
        <button onClick={() => setAberto(true)} aria-label="Abrir assistente"
          className="fixed bottom-20 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 lg:bottom-6 lg:right-6">
          <MessageCircle className="h-6 w-6" />
        </button>
      )}
      {aberto && (
        <div className="fixed inset-x-0 bottom-0 z-50 flex h-[85vh] flex-col overflow-hidden rounded-t-2xl border bg-card shadow-2xl sm:inset-x-auto sm:bottom-6 sm:right-6 sm:h-[600px] sm:max-h-[calc(100vh-3rem)] sm:w-[400px] sm:rounded-2xl"
          role="dialog" aria-label="Assistente Canteiro">
          <div className="flex items-center gap-2 border-b bg-primary px-4 py-3 text-primary-foreground">
            <Bot className="h-5 w-5" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold leading-tight">Assistente Canteiro</p>
              <p className="text-xs opacity-90">Respostas com dados reais {user?.role === 'GESTOR' ? 'das obras' : 'das suas obras'}</p>
            </div>
            {msgs.length > 0 && <button onClick={nova} className="rounded p-1 hover:bg-white/15" aria-label="Nova conversa"><RotateCcw className="h-4 w-4" /></button>}
            <button onClick={() => setAberto(false)} className="rounded p-1 hover:bg-white/15" aria-label="Fechar assistente"><X className="h-5 w-5" /></button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto p-3">
            {msgs.length === 0 && (
              <div className="rounded-lg bg-muted/60 p-3 text-sm">
                <p className="font-medium">Olá, {(user?.nome ?? user?.name ?? '').split(' ')[0]}! 👋</p>
                <p className="mt-1 text-muted-foreground">Escolha um atalho abaixo ou faça uma pergunta.</p>
              </div>
            )}
            {msgs.map(m => (
              <div key={m.id} className={cn('flex', m.autor === 'user' ? 'justify-end' : 'justify-start')}>
                <div className={cn('max-w-[88%] rounded-2xl px-3 py-2 text-sm',
                  m.autor === 'user' ? 'rounded-br-sm bg-primary text-primary-foreground'
                    : m.erro ? 'rounded-bl-sm border border-red-300 bg-red-50 text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300'
                    : 'rounded-bl-sm bg-muted')}>
                  {m.autor === 'bot' && !m.erro ? <Markdown texto={m.texto} /> : <p className="whitespace-pre-wrap">{m.texto}</p>}
                  {m.cache && <p className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground"><Zap className="h-3 w-3" /> resposta em cache</p>}
                </div>
              </div>
            ))}
            {enviando && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                Consultando os dados...
              </div>
            )}
            <div ref={fim} />
          </div>

          <div className="border-t p-2">
            <div className="mb-2 flex flex-wrap gap-1.5 pb-1">
              {!atalhos ? <span className="px-1 text-xs text-muted-foreground">Carregando atalhos...</span>
                : atalhos.map(a => (
                  <button key={a.id} disabled={enviando} onClick={() => enviar({ atalho: a.id }, a.pergunta)}
                    className="flex shrink-0 items-center gap-1 rounded-full border bg-card px-2.5 py-1 text-xs hover:bg-accent disabled:opacity-50">
                    <Sparkles className="h-3 w-3 text-primary" />{a.rotulo}
                  </button>
                ))}
            </div>
            <form onSubmit={submit} className="flex gap-2">
              <input value={texto} onChange={e => setTexto(e.target.value)} maxLength={1000} placeholder="Pergunte algo..."
                className="h-10 flex-1 rounded-full border border-input bg-background px-4 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
              <button type="submit" disabled={enviando || !texto.trim()} aria-label="Enviar"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-50">
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
