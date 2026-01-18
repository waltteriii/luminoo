import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userProfile } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const today = new Date();
    const currentMonth = today.toLocaleString('en-US', { month: 'long' });
    const currentYear = today.getFullYear();

    const systemPrompt = `You are a trend analyst for content creators. Today is ${currentMonth} ${today.getDate()}, ${currentYear}.

Based on the user's profile, generate relevant trending topics and content suggestions they should consider creating content about.

User Profile:
- Creator Type: ${userProfile?.creatorType || 'content creator'}
- Platforms: ${userProfile?.platforms?.join(', ') || 'social media'}
- Niche Keywords: ${userProfile?.nicheKeywords?.join(', ') || 'general'}
- About: ${userProfile?.audienceDescription || 'General audience'}

Consider:
1. Current events and seasonal trends relevant to their niche
2. Platform-specific trends (TikTok sounds, Instagram trends, YouTube topics)
3. Industry news and upcoming releases
4. Evergreen content opportunities
5. Timely opportunities (holidays, awareness days, etc.)

Be specific and actionable. Include why each trend is relevant NOW.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: 'Generate 5-8 trending topics and content suggestions for me right now.' }
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'return_trending_topics',
            description: 'Return a list of trending topics and content suggestions',
            parameters: {
              type: 'object',
              properties: {
                trends: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      title: { type: 'string', description: 'Short catchy title' },
                      description: { type: 'string', description: 'Why this is trending and relevant' },
                      content_ideas: {
                        type: 'array',
                        items: { type: 'string' },
                        description: '2-3 specific content ideas'
                      },
                      platform: { type: 'string', description: 'Best platform for this trend' },
                      urgency: { type: 'string', enum: ['now', 'this_week', 'this_month', 'ongoing'] },
                      energy_level: { type: 'string', enum: ['high', 'medium', 'low', 'recovery'] },
                      category: { type: 'string', enum: ['news', 'seasonal', 'industry', 'viral', 'evergreen'] }
                    },
                    required: ['title', 'description', 'content_ideas', 'platform', 'urgency', 'energy_level', 'category']
                  }
                }
              },
              required: ['trends']
            }
          }
        }],
        tool_choice: { type: 'function', function: { name: 'return_trending_topics' } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limited. Please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits exhausted. Please add credits.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    console.log('AI Response:', JSON.stringify(aiResponse, null, 2));

    const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== 'return_trending_topics') {
      throw new Error('Unexpected AI response format');
    }

    const parsedResult = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(parsedResult), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in get-trending-topics:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
