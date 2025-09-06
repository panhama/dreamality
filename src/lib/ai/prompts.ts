

export const planPrompt = (kid: {
  name: string; dream: string; age: number; traits: string[];
}) => `
You are a children's story planner. Create a 6-scene outline starring ${kid.name}, age ${kid.age}, who dreams of being a ${kid.dream}.
Traits: ${kid.traits.join(", ")}.
Each scene should be 1-2 sentences, age-appropriate, positive, and end with a tiny beat that invites the next scene.
Return JSON with: title, moral, scenes[{id, caption, illustration_prompt}].
Ensure illustration_prompt keeps ${kid.name}'s look consistent across scenes (hair, outfit colors, prop).
`;

export const writePrompt = (outlineJson: string, kidName: string, age: number) => `
Write a warm, rhyming short story for a child age ${age}, in 6 short scenes, based on this outline JSON:
${outlineJson}

Constraints:
- Keep ${kidName} as the same character throughout.
- Simple sentences. Uplifting, brave, kind tone.
- Return JSON: { title, moral, scenes: [{ id, text, caption }] } matching the same scene ids.
`;

export const imageSystem = `
You create cohesive children's-book illustrations with soft colors and consistent character identity.
Output one PNG image (no text on image).
`;
