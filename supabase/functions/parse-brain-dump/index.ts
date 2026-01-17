import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, userProfile } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `You are an AI assistant that analyzes brain dumps from creative professionals. Your job is to:
1. Extract individual tasks, campaigns, or ideas from the text
2. Detect dates and timeframes mentioned
3. Assess the energy level required for each item (high = deep focus work, medium = steady regular work, low = routine/admin, recovery = rest/reflection)
4. Detect urgency (low, normal, high, critical)
5. Note any emotional context or psychological insights
6. Suggest related items that might be connected

User profile context: ${userProfile || 'Creative professional'}

Return structured data using the provided tool.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Please analyze this brain dump and extract actionable items:\n\n${text}` }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "parse_brain_dump",
              description: "Parse a brain dump into structured items with energy levels, dates, and insights",
              parameters: {
                type: "object",
                properties: {
                  items: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        text: { type: "string", description: "The task or idea text" },
                        type: { type: "string", enum: ["task", "campaign", "idea"] },
                        detected_energy: { type: "string", enum: ["high", "medium", "low", "recovery"] },
                        suggested_timeframe: { type: "string", description: "When this should be done, if mentioned" },
                        urgency: { type: "string", enum: ["low", "normal", "high", "critical"] },
                        emotional_note: { type: "string", description: "Any emotional context or psychological insight" },
                        confidence: { type: "number", description: "Confidence in the parsing, 0-1" },
                        related_items: { type: "array", items: { type: "string" }, description: "Related item texts" }
                      },
                      required: ["text", "type", "detected_energy", "urgency", "confidence"]
                    }
                  },
                  summary: { type: "string", description: "Brief summary of the brain dump themes" }
                },
                required: ["items", "summary"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "parse_brain_dump" } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limits exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required, please add funds to your Lovable AI workspace." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    if (toolCall?.function?.arguments) {
      const parsed = JSON.parse(toolCall.function.arguments);
      return new Response(JSON.stringify(parsed), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Failed to parse response" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("parse-brain-dump error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
