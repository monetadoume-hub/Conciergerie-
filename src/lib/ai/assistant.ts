import Anthropic from "@anthropic-ai/sdk";
import type { GuidebookContent } from "@/types/database";

// Sonnet rather than Opus by design: this call answers guest FAQs strictly
// from the property's own digital guide (§21.1) — a narrow, high-volume,
// latency-sensitive task where Opus-tier reasoning buys nothing but cost.
const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5";

const RESPOND_TOOL: Anthropic.Tool = {
  name: "respond_to_guest",
  description:
    "Décide comment traiter la question du locataire : réponse directe, escalade normale, ou escalade urgente.",
  input_schema: {
    type: "object",
    properties: {
      answer: {
        type: ["string", "null"],
        description:
          "Réponse à envoyer telle quelle au locataire, en français, ton chaleureux et concis. Null si escalade.",
      },
      needs_escalation: {
        type: "boolean",
        description: "true si la question dépasse le périmètre de l'assistant (§21.2).",
      },
      urgency: {
        type: "string",
        enum: ["normal", "urgent"],
        description:
          "'urgent' uniquement pour un problème majeur : sécurité, panne critique, sinistre, urgence médicale, comportement suspect, accès impossible au logement.",
      },
      escalation_reason: {
        type: ["string", "null"],
        description: "Motif court de l'escalade, à l'attention de l'agence. Null si pas d'escalade.",
      },
      holding_message: {
        type: ["string", "null"],
        description:
          "Message d'attente à envoyer au locataire en cas d'escalade (jamais d'engagement pris au nom de l'agence). Null si pas d'escalade.",
      },
    },
    required: ["answer", "needs_escalation", "urgency", "escalation_reason", "holding_message"],
    additionalProperties: false,
  },
  strict: true,
};

export interface AssistantDecision {
  answer: string | null;
  needsEscalation: boolean;
  urgency: "normal" | "urgent";
  escalationReason: string | null;
  holdingMessage: string | null;
}

export interface AssistantContext {
  propertyName: string;
  agencyName: string;
  guidebookContent: GuidebookContent;
  conversationHistory: { question: string; answer: string | null }[];
}

function buildSystemPrompt(ctx: AssistantContext): string {
  const guide = ctx.guidebookContent;
  return [
    `Tu es l'assistant de la conciergerie "${ctx.agencyName}" pour le logement "${ctx.propertyName}".`,
    "Tu réponds aux questions du locataire UNIQUEMENT à partir des informations du guide ci-dessous et de l'historique de la conversation.",
    "Tu ne dois jamais inventer une information absente du guide, jamais négocier, jamais promettre un remboursement ou un geste commercial, jamais trancher un litige : dans tous ces cas, escalade.",
    "Escalade en urgence uniquement pour un problème majeur (sécurité, panne critique, sinistre, urgence médicale, comportement suspect, accès impossible au logement).",
    "",
    "--- Guide du logement ---",
    `Accès : ${guide.access || "non renseigné"}`,
    `Wifi : réseau ${guide.wifi_network || "non renseigné"}, mot de passe ${guide.wifi_password || "non renseigné"}`,
    `Équipements : ${guide.equipment || "non renseigné"}`,
    `Autour du logement : ${guide.around || "non renseigné"}`,
    "--- Fin du guide ---",
  ].join("\n");
}

/**
 * Single-call classifier + responder (cahier des charges §21.2): decides in
 * one structured tool call whether to answer directly, escalate normally, or
 * escalate urgently. Forced tool use guarantees a parseable decision instead
 * of free-form text that would need a second parsing pass.
 */
export async function getAssistantDecision(
  question: string,
  ctx: AssistantContext
): Promise<AssistantDecision> {
  const client = new Anthropic();

  const historyText = ctx.conversationHistory
    .map((turn) => `Locataire: ${turn.question}\nAssistant: ${turn.answer ?? "(escaladé à l'agence)"}`)
    .join("\n\n");

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    output_config: { effort: "low" },
    system: buildSystemPrompt(ctx),
    tools: [RESPOND_TOOL],
    tool_choice: { type: "tool", name: "respond_to_guest" },
    messages: [
      {
        role: "user",
        content: historyText
          ? `Historique de la conversation :\n${historyText}\n\nNouvelle question du locataire : ${question}`
          : `Question du locataire : ${question}`,
      },
    ],
  });

  const toolUse = response.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
  );

  if (!toolUse) {
    return {
      answer: null,
      needsEscalation: true,
      urgency: "normal",
      escalationReason: "Réponse de l'assistant illisible, escalade de sécurité par défaut",
      holdingMessage: "Merci pour votre message, nous revenons vers vous rapidement.",
    };
  }

  const input = toolUse.input as {
    answer: string | null;
    needs_escalation: boolean;
    urgency: "normal" | "urgent";
    escalation_reason: string | null;
    holding_message: string | null;
  };

  return {
    answer: input.answer,
    needsEscalation: input.needs_escalation,
    urgency: input.urgency,
    escalationReason: input.escalation_reason,
    holdingMessage: input.holding_message,
  };
}
