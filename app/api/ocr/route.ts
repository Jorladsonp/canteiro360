export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, unauthorized, forbidden } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return unauthorized();
  if (user.role !== 'GESTOR') return forbidden();
  const { imageBase64, mimeType } = await req.json();
  if (!imageBase64) return NextResponse.json({ error: 'Envie imageBase64' }, { status: 400 });

  const prompt = `Você é um assistente de OCR para notas fiscais e comprovantes brasileiros.
Extraia os seguintes campos da imagem em JSON:
{
  "fornecedor": "nome do emissor/fornecedor",
  "valor": 0.00,
  "data": "AAAA-MM-DD",
  "descricao": "descrição curta do gasto",
  "categoria": "MATERIAL|MAO_DE_OBRA|SERVICO|EQUIPAMENTO|TAXAS_LICENCAS|PROJETO|OUTROS",
  "itens": [{"descricao": "", "quantidade": 0, "unidade": "", "precoUnitario": 0}]
}
Se não conseguir extrair algum campo, use null. Responda com JSON puro, sem markdown.`;

  try {
    const response = await fetch('https://apps.abacus.ai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.ABACUSAI_API_KEY}` },
      body: JSON.stringify({
        model: 'gpt-5.4-mini',
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: `data:${mimeType || 'image/jpeg'};base64,${imageBase64}` } },
          ],
        }],
        max_tokens: 2000,
        response_format: { type: 'json_object' },
      }),
    });
    if (!response.ok) {
      const err = await response.text();
      console.error('OCR API error:', err);
      return NextResponse.json({ error: 'Erro no serviço de IA', sugestao: null }, { status: 502 });
    }
    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content ?? '{}';
    const usage = data?.usage;
    // Log de custo de IA
    if (usage) {
      const promptTokens = usage.prompt_tokens ?? 0;
      const completionTokens = usage.completion_tokens ?? 0;
      const cost = (promptTokens * 0.15 + completionTokens * 0.60) / 1_000_000;
      await prisma.aiUsageLog.create({
        data: { userId: user.id, tipo: 'OCR', model: 'gpt-5.4-mini', promptTokens, completionTokens, estimatedCostUsd: cost },
      }).catch(() => {});
    }
    let sugestao;
    try { sugestao = JSON.parse(content); } catch { sugestao = null; }
    return NextResponse.json({ sugestao });
  } catch (e: any) {
    console.error('OCR error:', e);
    return NextResponse.json({ error: 'Serviço de IA indisponível', sugestao: null }, { status: 502 });
  }
}
