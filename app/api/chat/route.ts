export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, unauthorized } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { getToolDefinitions, executeTool, getAtalhos } from '@/lib/chat-tools';
import { randomUUID } from 'crypto';

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return unauthorized();
  const body = await req.json();
  const { message: rawMessage, atalho, conversationId: convId } = body ?? {};

  // Resolve atalho (botão de atalho) para a pergunta correspondente
  let message: string | undefined = typeof rawMessage === 'string' ? rawMessage.trim() : undefined;
  if (!message && atalho) {
    const found = getAtalhos(user.role).find((a) => a.id === atalho);
    if (found) message = found.pergunta;
  }
  if (!message) return NextResponse.json({ error: 'message é obrigatório' }, { status: 400 });

  const conversationId = convId || randomUUID();

  // Salvar mensagem do usuário
  await prisma.chatMessage.create({ data: { conversationId, userId: user.id, role: 'user', content: message } });

  // Buscar histórico recente
  const history = await prisma.chatMessage.findMany({
    where: { conversationId },
    orderBy: { createdAt: 'asc' },
    take: 20,
  });

  const systemPrompt = `Você é o assistente de IA do Canteiro, um sistema de gestão de obras.
O usuário logado é ${user.nome} (${user.role === 'GESTOR' ? 'Gestor' : 'Investidor'}).
Você NUNCA inventa dados. Use SEMPRE as ferramentas disponíveis para consultar dados reais do banco.
Responda sempre em português brasileiro, de forma clara e objetiva.
Formate valores monetários em BRL e datas em DD/MM/AAAA.`;

  const messages: any[] = [
    { role: 'system', content: systemPrompt },
    ...history.map((m: any) => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.content })),
  ];

  const tools = getToolDefinitions(user.role);

  try {
    // Primeira chamada com function calling
    const response1 = await fetch('https://apps.abacus.ai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.ABACUSAI_API_KEY}` },
      body: JSON.stringify({ model: 'gpt-5.4-mini', messages, tools, max_tokens: 3000 }),
    });
    if (!response1.ok) {
      const err = await response1.text();
      console.error('Chat API error:', err);
      return NextResponse.json({ error: 'Erro no serviço de IA' }, { status: 502 });
    }
    const data1 = await response1.json();
    const choice = data1?.choices?.[0];
    const usage1 = data1?.usage;

    let resposta: string;

    if (choice?.message?.tool_calls?.length) {
      // Executar as ferramentas
      const toolResults: any[] = [];
      for (const tc of choice.message.tool_calls) {
        let args = {};
        try { args = JSON.parse(tc?.function?.arguments ?? '{}'); } catch {}
        const result = await executeTool(tc?.function?.name ?? '', args, user);
        toolResults.push({ tool_call_id: tc.id, role: 'tool', content: JSON.stringify(result) });
      }

      // Segunda chamada com resultados das ferramentas
      const messages2 = [...messages, choice.message, ...toolResults];
      const response2 = await fetch('https://apps.abacus.ai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.ABACUSAI_API_KEY}` },
        body: JSON.stringify({ model: 'gpt-5.4-mini', messages: messages2, max_tokens: 3000 }),
      });
      const data2 = await response2.json();
      resposta = data2?.choices?.[0]?.message?.content ?? 'Desculpe, não consegui processar a resposta.';
      const usage2 = data2?.usage;

      // Log custo total
      const pt = (usage1?.prompt_tokens ?? 0) + (usage2?.prompt_tokens ?? 0);
      const ct = (usage1?.completion_tokens ?? 0) + (usage2?.completion_tokens ?? 0);
      const cost = (pt * 0.15 + ct * 0.60) / 1_000_000;
      await prisma.aiUsageLog.create({ data: { userId: user.id, tipo: 'CHAT', model: 'gpt-5.4-mini', promptTokens: pt, completionTokens: ct, estimatedCostUsd: cost } }).catch(() => {});
    } else {
      resposta = choice?.message?.content ?? 'Desculpe, não consegui processar a resposta.';
      if (usage1) {
        const cost = ((usage1.prompt_tokens ?? 0) * 0.15 + (usage1.completion_tokens ?? 0) * 0.60) / 1_000_000;
        await prisma.aiUsageLog.create({ data: { userId: user.id, tipo: 'CHAT', model: 'gpt-5.4-mini', promptTokens: usage1.prompt_tokens ?? 0, completionTokens: usage1.completion_tokens ?? 0, estimatedCostUsd: cost } }).catch(() => {});
      }
    }

    // Salvar resposta
    await prisma.chatMessage.create({ data: { conversationId, userId: user.id, role: 'assistant', content: resposta } });

    return NextResponse.json({ conversationId, resposta });
  } catch (e: any) {
    console.error('Chat error:', e);
    return NextResponse.json({ error: 'Erro no serviço de IA' }, { status: 502 });
  }
}
