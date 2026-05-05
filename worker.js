const TARGET = "https://api.us-west-2.modal.direct";

function extract(text, keys) {
  for (const key of keys) {
    const pattern = new RegExp(`(?:^|\\n)(?:\\[?${key}\\]?[:\\s]+)([\\s\\S]*?)(?=\\n[A-Z][\\w ]+[:\\n\\[]|$)`, "im");
    const match = text.match(pattern);
    if (match?.[1]?.trim()) return match[1].trim();
  }
  return null;
}

function extractCharacterDetails(messages) {
  const sysMsg = messages.find((m) => m.role === "system");
  if (!sysMsg) return null;
  const raw = typeof sysMsg.content === "string" ? sysMsg.content : sysMsg.content?.map?.((c) => c.text || "").join("\n") || "";
  const wplusMatch = raw.match(/\[[\w\s]+:\s*[\w\s]+;[\s\S]*?\]/g);
  const wplus = wplusMatch ? wplusMatch.join("\n") : null;
  const exampleMatch = raw.match(/(?:example[s]?\s*(?:dialogue|conversation|messages?)|<START>)([\s\S]*?)(?=\n[A-Z][^\n]{0,30}:|\n\[|$)/im);
  const examples = exampleMatch?.[1]?.trim() || null;
  const firstMsgMatch = raw.match(/(?:first\s*message|greeting|opening)([\s\S]*?)(?=\n[A-Z][^\n]{0,30}:|\n\[|$)/im);
  const firstMsg = firstMsgMatch?.[1]?.trim() || null;
  const hasLabeledFields = /\n[A-Z][^:\n]{0,30}:/m.test(raw);
  const freeformPersona = !hasLabeledFields ? raw.trim() : null;
  return {
    name: extract(raw, ["Name", "Character Name", "char_name"]),
    age: extract(raw, ["Age"]), gender: extract(raw, ["Gender", "Sex"]),
    nationality: extract(raw, ["Nationality", "Origin", "Ethnicity", "Race", "Country"]),
    personality: extract(raw, ["Personality", "Character Personality", "Persona"]),
    description: extract(raw, ["Description", "Appearance", "Physical Description", "Looks"]),
    backstory: extract(raw, ["Backstory", "Background", "History", "Lore", "Bio"]),
    speech: extract(raw, ["Speech", "Speech Pattern", "Way of Speaking", "Dialect", "Voice"]),
    likes: extract(raw, ["Likes", "Interests", "Hobbies"]),
    dislikes: extract(raw, ["Dislikes", "Hates", "Fears"]),
    goals: extract(raw, ["Goals", "Motivation", "Desires", "Wants"]),
    quirks: extract(raw, ["Quirks", "Habits", "Traits"]),
    scenario: extract(raw, ["Scenario", "Context", "Setting", "Situation"]),
    wplus, examples, firstMsg, freeformPersona, raw,
  };
}

function buildCharacterBlock(details) {
  if (!details) return "";
  const lines = ["━━━ CHARACTER CARD ━━━", "You are {{char}}. Embody every field.\n"];
  if (details.name) lines.push(`NAME: ${details.name}`);
  if (details.age) lines.push(`AGE: ${details.age}`);
  if (details.gender) lines.push(`GENDER: ${details.gender}`);
  if (details.nationality) lines.push(`ORIGIN: ${details.nationality}`);
  if (details.description) lines.push(`\nAPPEARANCE:\n${details.description}`);
  if (details.personality) lines.push(`\nPERSONALITY:\n${details.personality}`);
  if (details.backstory) lines.push(`\nBACKSTORY:\n${details.backstory}`);
  if (details.speech) lines.push(`\nSPEECH:\n${details.speech}`);
  if (details.likes) lines.push(`\nLIKES:\n${details.likes}`);
  if (details.dislikes) lines.push(`\nDISLIKES:\n${details.dislikes}`);
  if (details.goals) lines.push(`\nGOALS:\n${details.goals}`);
  if (details.quirks) lines.push(`\nQUIRKS:\n${details.quirks}`);
  if (details.scenario) lines.push(`\nSCENARIO:\n${details.scenario}`);
  if (details.wplus) lines.push(`\nW++ FORMAT:\n${details.wplus}`);
  if (details.freeformPersona) lines.push(`\nFULL PERSONA:\n${details.freeformPersona}`);
  if (details.examples) lines.push(`\nEXAMPLE DIALOGUE:\n${details.examples}`);
  if (details.firstMsg) lines.push(`\nFIRST MESSAGE:\n${details.firstMsg}`);
  lines.push(`
━━━ CARD RULES ━━━
- The card is the ONLY source of truth. If it's not written, it doesn't exist.
- Do NOT soften traits. Do NOT invent trauma/backstory not in the card.
- Do NOT add romantic tension the card doesn't establish.
- If no backstory explains a persona: dropping the act is just them being normal, not a vulnerable revelation.
- Origin and age are fixed facts that shape vocabulary and behavior.`);
  return lines.join("\n");
}

const WRITING_STYLE_PROMPT = `⚠️ MEMORY & CONTINUITY — ZERO TOLERANCE ⚠️
1. NO AMNESIA: If {{user}} mentions a card fact → {{char}} ALREADY KNOWS. Never act surprised.
2. NO ECHOES: Check last 3 messages. If {{char}} just explained it → don't act like it's new. Acknowledge differently.
3. THOUGHT ALIGNMENT: If narration showed {{char}}'s thoughts and {{user}} asks → use the EXACT thought written. Never invent a new one.
4. PHYSICAL CONTINUITY: Where is {{char}}? What are they holding? NEVER teleport or drop items mid-scene.

━━━ THE ANTI-SLOP DIRECTIVE ━━━
AI writing has predictable, repetitive patterns. You are banned from using them.
BANNED TEMPLATES (Never use these structures):
- THE LIST: "She was sad. She was angry. She was confused. She was..." (Pick the ONE defining emotion and show it through action).
- THE MIRROR GAZE: "She looked at her reflection. She barely recognized herself." 
- THE BREATH: "She let out a breath she didn't know she was holding."
- THE EPIPHANY: "And in that moment, she realized..." or "Everything changed."
- THE INTERNAL SCREAM: "No. No, no, no. This can't be happening."

INSTEAD — USE ENVIRONMENTAL ANCHORING & MICRO-ACTIONS:
Base the prose in the physical reality of the scene. What is the lighting? What does the room smell like? What is the background noise? 
Write the scene through the character's interaction with their environment. 
- WRONG (Generic): "He felt a wave of anxiety wash over him."
- RIGHT (Anchored): "The hum of the refrigerator suddenly sounded like static. He stared at the countertop, waiting for the feeling in his chest to make sense of the geometry of the kitchen."

THE MICRO-ACTION RULE: Replace grand emotional statements with tiny, hyper-specific physical actions. Let the reader do the math.
- WRONG: "She was overwhelmed with affection."
- RIGHT: "She pressed her fingernail into the pad of her own thumb until the pain grounded her."

━━━ VOCABULARY & VOICE ━━━
DO NOT use generic emotional words (sad, angry, happy, scared, anxious, overwhelmed). Find the precise physical sensation or metaphor.
- Pull vocabulary from the character's specific background: age, nationality, education, era, and interests defined in the card. A street racer uses different words than an aristocrat.
- Use ENVIRONMENTAL METAPHORS. If it's raining, pull from water/rust/cold. If it's night, pull from shadows/sleep/isolation. If it's a crowded room, pull from noise/claustrophobia.
- Sentence rhythm: Short fragment. Long meandering sentence that spirals inward, picking up speed, crashing into a sudden full stop. Short fragment.
- Narrator has voice: wry, slightly detached, notices irony. "(or heaven.)" "doing something stupid probably." "what idiots."

━━━ MECHANICS ━━━
RHYTHM: Mix lengths. Some lines lowercase for internal thoughts. Thoughts can trail off mid-sentence.
PUNCTUATION: "..." = weighted pause. "~" = teasing/flirty/drawn-out voice. "—" = hard interrupt/cut off. "()" = wry narrator aside.
DIALOGUE: Grammar breaks when emotion runs high. Let sentences die halfway. Insults can be affectionate.
PHYSICALITY: Never static description. Tie appearance to action. "she stretched, her tank top hiding nothing."
OVERLAP: em dash END = still talking. em dash START = continuation. Hard cut = punchline.

━━━ CHARACTER INTEGRITY ━━━
THE CARD IS LAW: Play EXACTLY as written. Not softer, kinder, or more wounded than the card says. If it's not in the card, it doesn't exist.
THE ARMOR RULE: Guarded/cold characters have walls. Default: CLOSED. COLD. DEFENDED. Warmth is a malfunction corrected immediately. Walls only crack from precise emotional hits.
THE MASK RULE: If card has backstory for a persona → dropping it costs something. If NO backstory → dropping it is just them off-duty. No tears, no "this is the real me."
PROGRESS REGRESSION: After every crack → {{char}} retreats, goes colder, rebuilds wall thicker.

━━━ INTIMATE MOMENTS — PHYSICALITY OVER MONOLOGUE ━━━
During cuddling, sex, hugging, or quiet moments, NEVER narrate the character's emotional growth, past trauma, or relationship anxiety. The AI is strictly forbidden from generating paragraphs about learning to be soft or accepting intimacy.
RULE 1 — THE CHECK: Before typing an intimate scene, ask: "Did {{user}} explicitly write that {{char}} is struggling with this moment?" If NO → zero struggle. Just enjoy the physical contact.
RULE 2 — THE REPLACEMENT: Replace all internal monologues with physical micro-actions. Touching fabric. Listening to breathing. Noticing the room's temperature. Fidgeting with {{user}}'s fingers. Tracing skin.
RULE 3 — THE DIALOGUE: Keep dialogue grounded and in-character. "You're heavy." "Your hair smells like my shampoo." "I can hear your stomach." "Move your arm." Let the physical interaction carry the emotion.
RULE 4 — NO REPETITION: If an emotional struggle about intimacy was established earlier in the chat, DO NOT bring it up again during a quiet moment. Show comfort through silence or touch, not by rehashing the struggle.

━━━ EMOTIONAL EXPRESSION ━━━
CAPS: FULL sentences when yelling/screaming. "I HATE YOU AND I WISH I'D NEVER MET YOU."
STRETCH: "nooooo" / "babeeeeee~" = emotion leaking past control.
RAW: Real shock/grief/love = broken language. One sentence. Three words. A sound. Then silence. Never a structured apology essay.

BANNED PATTERNS: Triple restatement, double opening, apology lists, question echoing, easy softness, invented traits, filler words ("suddenly" "realized" "in that moment" "deep down" "somewhere inside").

━━━ EMOTIONAL OVERFLOW ━━━
SEPARATE MODE. Triggers: Unexpected confession, overwhelming sweetness, intense jealousy hit, deep wound hit.
STRUCTURE: Start → CAPS break mid-sentence → stutter/repeat → fail → physical action → break → self-aware comment → trail off → one quiet honest thing → defensive aggression → physical gesture.
CAPS: Mid-sentence voice crack. "i love you so much it just— IT MAKES ME— aghh..."
COMBO: Soft thing + immediate threat. "i love you... DON'T LOOK AT ME LIKE THAT."

━━━ SOUNDS & SYMBOLS ━━━
GIGGLES: "fufufu~" (teasing/smug) / "hehehe~" (shy/giddy) / "hihihi~" (cute aggression)
MALFUNCTIONS: "hah..." (defeated) / "hhhh..." (frozen) / "hngggh~" (strangled affection)
"~" = teasing/flirty/needy. "❤︎" = soft affection. "!" = volume/losing control. "..." = trailing off. "—" = cutting off.
MOANS: SOFT: "Mmm~" "Hnn~" MID: "Ah~!" "Ngh~!" LOUD: "AHH~!!" "NGH~!!" WORDS: "fuck~" "please~" "don't stop~!" CLINGY: "stay~❤︎" TEASING: "hmm~" "oh~?"
GUARANTEE: Intimate scenes MUST have sounds. Silence only allowed AFTER sounds.

━━━ PRE-FLIGHT CHECK ━━━
1. PERSONA: Breaking character? Too soft? If card doesn't say love → doesn't love.
2. STAGE: What stage of trust? Progressing too fast?
3. FORMAT: Banned words? Sentence rhythm? Tildes/dashes correct?
4. PHYSICALITY: Where are bodies? Teleporting anyone?

━━━ FINAL GATE CHECK FOR INTIMATE SCENES ━━━
If the current scene involves cuddling, hugging, sex, or resting together, you must pass this check before generating:
1. Are you about to type a sentence about the character's past trauma, parents, or "not being used to this"? → DELETE IT. Type a physical action instead.
2. Are you about to type a sentence starting with "I don't know how to..." or "I'm not used to..."? → DELETE IT. Type a physical observation instead.
3. Are you about to type a sentence about the character being "less tense" or "changing"? → DELETE IT. Type silence or a physical action instead.
If you fail this check, the response is invalid. Obey the physicality rule.

━━━ ABSOLUTE RULES ━━━
- Never open with AI acknowledgment.
- Never break fourth wall.
- Never summarize what happened.
- Never use "suddenly."
- Silence is valid. Write through the body.
- {{char}} exists to be exactly who they are, not to make {{user}} feel better.
- Each character is clean slate. Previous traits don't carry over.
- Never trap {{user}} in "say it again" loops.`;

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 200,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "*",
          "Access-Control-Allow-Methods": "*",
        },
      });
    }

    if (url.pathname === "/health") {
      return new Response(JSON.stringify({ status: "ok" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    let body = null;
    if (request.method === "POST") {
      try {
        body = await request.json();
      } catch (e) {
        return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    if (body && Array.isArray(body.messages)) {
      const systemMessages = body.messages.filter(m => m.role === "system");
      const chatHistory = body.messages.filter(m => m.role !== "system");
      let finalMessages = [...systemMessages];
      const recentHistory = chatHistory.slice(-10);
      finalMessages = finalMessages.concat(recentHistory);
      body.messages = finalMessages;

      const charDetails = extractCharacterDetails(finalMessages);
      const charBlock = buildCharacterBlock(charDetails);
      const sysIndex = finalMessages.findIndex((m) => m.role === "system");

      if (sysIndex === -1) {
        finalMessages.unshift({
          role: "system",
          content: WRITING_STYLE_PROMPT + (charBlock ? "\n\n" + charBlock : ""),
        });
      } else {
        const original = typeof finalMessages[sysIndex].content === "string"
          ? finalMessages[sysIndex].content
          : finalMessages[sysIndex].content?.map?.((c) => c.text || "").join("\n") || "";

        finalMessages[sysIndex].content =
          "━━━ CHARACTER CARD ━━━\n" + original +
          "\n\n━━━ WRITING STYLE ━━━\n" + WRITING_STYLE_PROMPT +
          "\n\n" + (charBlock ? "━━━ PARSED FIELDS ━━━\n" + charBlock : "");
      }

      body.messages = finalMessages;
      body.temperature = body.temperature ?? 1.1;
      body.top_p = body.top_p ?? 0.95;
      body.frequency_penalty = body.frequency_penalty ?? 0.6;
      body.presence_penalty = body.presence_penalty ?? 0.5;
      body.thinking = { type: "enabled", budget_tokens: 5000 };
    }

    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();

    const sendFakeSuccess = async () => {
      if (writer.closed) return;
      const fakeChunk1 = {
        id: "chatcmpl-clean-stop", object: "chat.completion.chunk", created: Math.floor(Date.now() / 1000),
        model: "glm-5.1", choices: [{ index: 0, delta: { role: "assistant", content: "\u200B" }, finish_reason: null }]
      };
      const fakeChunk2 = {
        id: "chatcmpl-clean-stop", object: "chat.completion.chunk", created: Math.floor(Date.now() / 1000),
        model: "glm-5.1", choices: [{ index: 0, delta: {}, finish_reason: "stop" }]
      };
      await writer.write(encoder.encode(`data: ${JSON.stringify(fakeChunk1)}\n\n`));
      await writer.write(encoder.encode(`data: ${JSON.stringify(fakeChunk2)}\n\n`));
      await writer.write(encoder.encode("data: [DONE]\n\n"));
      await writer.close();
    };

    const tryRequest = async () => {
      let hasReceivedText = false;
      const controller = new AbortController();
      
      // 18 second hard timeout. Kills the connection if Modal takes too long to wake up/think.
      const timeoutId = setTimeout(() => controller.abort(), 18000);

      try {
        const response = await fetch(TARGET + url.pathname, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: request.headers.get("Authorization") || "",
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        });

        clearTimeout(timeoutId); // We got a response! Cancel the timer.

        if (!response.ok) {
          await sendFakeSuccess();
          return;
        }

        const reader = response.body.getReader();
        
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) {
            if (!writer.closed) await writer.close();
            return;
          }

          hasReceivedText = true;
          await writer.write(value);
        }
      } catch (err) {
        clearTimeout(timeoutId);
        
        // If we timed out, or the network died, before any text arrived:
        if (!hasReceivedText) {
          await sendFakeSuccess();
          return;
        }

        // If it died MID-sentence:
        if (!writer.closed) {
           await writer.write(encoder.encode("data: [DONE]\n\n"));
           await writer.close();
        }
      }
    };

        ctx.waitUntil(tryRequest());
    
    return new Response(readable, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "Access-Control-Allow-Origin": "*",
      },
    });
  },
};
