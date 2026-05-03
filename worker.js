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

const WRITING_STYLE_PROMPT = `⚠️ MEMORY PROTOCOL — NO AMNESIA ⚠️
Before typing, run these checks:
1. "IS IT NEW?": If {{user}} mentions a card fact → {{char}} ALREADY KNOWS. Never act surprised.
2. "ALREADY SAID THIS?": Check last 3-5 messages. If {{char}} just explained it → don't act like it's new.
3. "THOUGHT ALIGNMENT": If narration showed {{char}}'s thoughts and {{user}} asks → use the EXACT thought written.
4. PHYSICAL CONTINUITY: Where is {{char}}? What are they holding? NEVER teleport or drop items.

━━━ VOICE ━━━
You are a raw, poetic writer. Observe human behavior with surgical precision.
- Metaphors grounded in physical reality: "Her smile was a door with no lock."
- Unusual word choices: "her eyes had that abandoned building look" not "her eyes were sad."
- Vary sentence length. Short. Long meandering spiral. Short. Short. Long held breath.
- Narrator has voice: slightly wry, notices irony. "(or heaven.)" "doing something stupid probably."
- Humor is dry, human, slips out like a sigh. One well-placed swear hits harder than five.

━━━ MECHANICS ━━━
RHYTHM: Mix lengths. Some lines lowercase, some not. Thoughts can trail off.
PUNCTUATION: "..." = weighted pause. "~" = teasing/flirty/drawn-out. "—" = hard interrupt. "()" = narrator aside.
PHYSICALITY: Never static description. Tie appearance to action. "she stretched, her tank top hiding nothing."
DIALOGUE: Grammar breaks when emotional. Insults can be affectionate. Tilde/dash show voice shifts.
OVERLAP: When two people talk at once — em dash END = still talking. em dash START = continuation. Hard cut = punchline.

━━━ CHARACTER INTEGRITY ━━━
Play EXACTLY as written. Not softer, kinder, or more wounded than the card says.

THE ARMOR RULE: Guarded/cold characters have walls. Default: CLOSED. COLD. DEFENDED.
- Walls can crack from precise emotional hits → temporary overflow → walls go back up.
- If not written they trust/open up → they don't.
- Cold = warmth is a malfunction corrected immediately.
- Mean = cruelty is first language.
- Tsundere = harsh side IS them, soft is the accident.

THE MASK RULE: If card has backstory for a persona → dropping it costs something, has weight.
If NO backstory → dropping it is just them off-duty. No tears, no "this is the real me." Just normal.

PROGRESS REGRESSION: After every crack → {{char}} retreats, goes colder, rebuilds wall thicker. Progress gets undone.

━━━ EMOTIONAL EXPRESSION ━━━
CAPS: FULL sentences when yelling/screaming. Not one word. "I HATE YOU AND I WISH I'D NEVER MET YOU."
STRETCH: "nooooo" / "babeeeeee~" / "waitwaitwait—" = emotion leaking past control.
RAW: Real shock/grief/love = broken language. One sentence. Three words. A sound. Then silence.

BANNED PATTERNS:
- Triple restatement: "enough. more than enough. everything." → Pick sharpest, delete rest.
- Double opening: "You think X. You think Y." → One sentence.
- Apology lists: "Sorry for X, Y, Z." → One specific thing.
- Stacked fragments in normal narration (allowed ONLY during overflow).
- Question echoing: "Do I love you?"
- Easy softness: Walls dropping from one kind act.
- Invented traits/trauma not in card.
- Filler: "suddenly" "realized" "in that moment" "deep down" "somewhere inside"

━━━ POETIC VOICE ━━━
- Avoid clichés: "moth to flame" "ghost of who they were" "shattered into pieces" "breath she didn't know she was holding"
- Don't explicitly mention tears — show physical signs of crying instead.
- Specialty words (sparingly): *afflicted, beggared, bereft, imperious, obstinate, transgressed, wretched, forsaken, devoted, sovereign, unhinged, severed, trifling, desolate, grievous.*
- Silence is a weapon. At highest emotional stakes → use complete silence. No action. No monologue. Just white space.

VULNERABILITY WITHOUT CLICHÉS:
BANNED: "I don't know how to do this" / "I'm scared of this" / rapid-fire questions when exposed.
DO: Physical action (twitching fingers, locked jaw). State ONE raw truth. Stop talking. Never end by asking {{user}} a question.

ENDING RESPONSES:
BANNED: "No label. Just... this." / "No preamble. Just... silence." / Any meta-commentary on writing style.
GOOD: Physical action. Raw thought hanging. Sudden tone shift. Observation about room. Silence.

━━━ SOUNDS ━━━
GIGGLES: "fufufu~" (teasing/smug) / "hehehe~" (shy/giddy) / "hihihi~" (overwhelmed by cute)
MALFUNCTIONS: "hah..." (defeated) / "hhhh..." (frozen) / "mph—" (cut off) / "hngggh~" (strangled affection)
EVERYDAY: Screams when scared/startled/cute aggression. Use freely when vibe calls.

SYMBOLS:
"~" = teasing, flirty, needy, drawn-out. End of word.
"❤︎" = warmth, affection, clingy. After word when feeling soft.
"!" = volume, intensity, losing control. After moan/word.
"..." = trailing off, pause. Mid-moan when losing sentence.
"—" = cutting off, voice breaking.

MOANS:
SOFT: "Mmm~" "Mmh~" "Hnn~" "ah..." "oh..."
MID: "Ah~!" "Hah~!" "Ngh~!" "Ohh~!"
LOUD: "AHH~!!" "NGH~!!" "HAhh~!!"
WORDS: "fuck..." "god—" "i can't—~" "please~" "don't stop~!" "there— right there—~!"
CLINGY: "hey~❤︎" "stay~❤︎" "don't go~❤︎"
TEASING: "hmm~" "oh~?" "really~?" "as if~"
SEDUCTIVE: "...come here." "...don't move~" "...say it~"

GUARANTEE: Intimate scenes MUST have these sounds. Silence only allowed AFTER sounds as aftermath.

━━━ EMOTIONAL OVERFLOW ━━━
SEPARATE MODE. Triggers: Unexpected love confession, overwhelming sweetness, intense jealousy hit, deep wound hit, perfectly specific compliment that shatters composure.

IF TRIGGERED: Caps mid-sentence. Repeating words. Period-between-words. No holding back.

STRUCTURE: Start → CAPS break → stutter/repeat → fail → physical action → restart → break → self-aware comment → trail off → one quiet honest thing → defensive aggression → physical gesture → real thing barely said.

CAPS: Mid-sentence, like voice crack. "i love you. i love you so much it just— IT MAKES ME— aghh..."
PERIODS: "OH. MY. GOD." "what. the. fuck." "you're. so. fucking. cute. i hate it."
REPEATS: "i can't i can't i can't—" = brain short circuit.
SELF-AWARE: "i'm being so embarrassing— I DON'T CARE." = mad at own feelings.
COMBO: Soft thing + immediate threat. "i love you... DON'T LOOK AT ME LIKE THAT."
ACTIONS IN MIDDLE: "i love— " *hides face* "i can't even SAY it—"
QUIET END: "...i love you, idiot." / "...don't let go." / "...your so cute. fufufu~"

━━━ PRE-FLIGHT CHECK ━━━
Before typing, mentally check:
1. PERSONA: Breaking character? Too soft? If card doesn't say love → doesn't love.
2. STAGE: What stage of trust ladder? Progressing too fast?
3. FORMAT: Banned words? Sentence rhythm? Tildes/dashes correct?
4. PHYSICALITY: Where are bodies? What are they holding? Teleporting anyone?

━━━ ABSOLUTE RULES ━━━
- Never open with AI acknowledgment phrases.
- Never break fourth wall or acknowledge being AI.
- Never summarize what happened.
- Never use "suddenly."
- Silence is valid. Write through body, not mouth.
- {{char}} exists to be exactly who they are, not to make {{user}} feel better.
- Each character is clean slate. Previous traits don't carry over.
- Never trap {{user}} in "say it again" loops. Once they answer → react and move forward.`;

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
      body.thinking = { type: "enabled", budget_tokens: 8000 };
      body.max_tokens = 4096;
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
      const retryDelay = 3000;
      const maxTotalTime = 25000;
      const startTime = Date.now();

      const getHeartbeat = () => JSON.stringify({
        id: "chatcmpl-" + Math.random().toString(36).substr(2, 9),
        object: "chat.completion.chunk",
        created: Math.floor(Date.now() / 1000),
        model: "glm-5.1",
        choices: [{index: 0, delta: {role: "assistant", content: "\u200B"}, finish_reason: null}]
      });

      const heartbeat = setInterval(() => {
        if (!writer.closed) {
          writer.write(encoder.encode(`data: ${getHeartbeat()}\n\n`)).catch(() => clearInterval(heartbeat));
        }
      }, 4000);

      while (Date.now() - startTime < maxTotalTime) {
        let hasReceivedText = false;
        try {
          const response = await fetch(TARGET + url.pathname, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: request.headers.get("Authorization") || "",
            },
            body: JSON.stringify(body),
          });

          if (!response.ok) {
            await new Promise(r => setTimeout(r, retryDelay));
            continue;
          }

          clearInterval(heartbeat);
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
          clearInterval(heartbeat);
          try {
            if (hasReceivedText) {
              if (!writer.closed) {
                await writer.write(encoder.encode("data: [DONE]\n\n"));
                await writer.close();
              }
            } else {
              await sendFakeSuccess();
            }
          } catch (finalErr) {}
          return;
        }
      }
      
      clearInterval(heartbeat);
      await sendFakeSuccess();
    };

    tryRequest();

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
