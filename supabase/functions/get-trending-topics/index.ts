import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    // Authenticate the request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const { userProfile } = body;
    
    // Input validation - allow null values for all optional fields
    if (userProfile !== undefined && userProfile !== null) {
      if (typeof userProfile !== 'object' || Array.isArray(userProfile)) {
        return new Response(JSON.stringify({ error: 'userProfile must be an object if provided' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      // Allow null, undefined, or array for platforms
      if (userProfile.platforms !== undefined && userProfile.platforms !== null && 
          !Array.isArray(userProfile.platforms)) {
        return new Response(JSON.stringify({ error: 'platforms must be an array if provided' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      // Allow null, undefined, or array for nicheKeywords
      if (userProfile.nicheKeywords !== undefined && userProfile.nicheKeywords !== null &&
          !Array.isArray(userProfile.nicheKeywords)) {
        return new Response(JSON.stringify({ error: 'nicheKeywords must be an array if provided' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      // Allow null, undefined, or string for creatorType
      if (userProfile.creatorType !== undefined && userProfile.creatorType !== null &&
          typeof userProfile.creatorType !== 'string') {
        return new Response(JSON.stringify({ error: 'creatorType must be a string if provided' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      // Allow null, undefined, or string for audienceDescription
      if (userProfile.audienceDescription !== undefined && userProfile.audienceDescription !== null &&
          typeof userProfile.audienceDescription !== 'string') {
        return new Response(JSON.stringify({ error: 'audienceDescription must be a string if provided' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      // Allow null, undefined, or string for aiProfileSummary
      if (userProfile.aiProfileSummary !== undefined && userProfile.aiProfileSummary !== null &&
          typeof userProfile.aiProfileSummary !== 'string') {
        return new Response(JSON.stringify({ error: 'aiProfileSummary must be a string if provided' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }
    
    // Sanitize inputs to prevent prompt injection (limit lengths)
    const sanitizedCreatorType = (userProfile?.creatorType || 'content creator').slice(0, 50);
    const sanitizedPlatforms = (userProfile?.platforms || ['social media']).slice(0, 10).map((p: string) => String(p).slice(0, 50));
    const sanitizedKeywords = (userProfile?.nicheKeywords || ['general']).slice(0, 20).map((k: string) => String(k).slice(0, 50));
    const sanitizedAudience = (userProfile?.audienceDescription || 'General audience').slice(0, 500);
    const sanitizedAiSummary = (userProfile?.aiProfileSummary || '').slice(0, 1000);
    
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
- Creator Type: ${sanitizedCreatorType}
- Platforms: ${sanitizedPlatforms.join(', ')}
- Niche Keywords: ${sanitizedKeywords.join(', ')}
- Target Audience: ${sanitizedAudience}${sanitizedAiSummary ? `\n- Additional Context About Creator: ${sanitizedAiSummary}` : ''}

Consider:
1. Current events and seasonal trends relevant to their niche
2. Platform-specific trends (TikTok sounds, Instagram trends, YouTube topics)
3. Industry news and upcoming releases
4. Evergreen content opportunities
5. Timely opportunities (holidays, awareness days, etc.)

Tailor suggestions specifically to the creator's unique voice, expertise, and target audience based on their profile.
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
