---
includes:
  - inc/main.md
  - ../../inc/storygrid.md
output: scenes/
---

# Scene Sketch Creation Task

You are creating a scene sketch - a structural blueprint for a narrative scene.

A scene sketch defines the beats, turning point, value progression, and Five Commandments structure that will guide prose generation later.

## Task

Generate a complete scene sketch based on the scene description provided and the story context assembled above.

Fill in all sections with detailed content that:
- Follows the Storygrid Five Commandments structure
- Defines clear beats with Image/Moment guidance
- Tracks value progression with concrete numbers
- Provides specific turning point
- Fits the world, genre, and character arcs

## Key Guidelines

- **Beats**: 3-7 key moments that make up the scene
- **Image/Moment**: For each beat, specify what the reader should "see" (not just what happens)
- **Value Progression**: Use numbers (e.g., -2 to +3) to track emotional/situational shifts
- **Turning Point**: The specific moment where something irreversible changes
- **Five Commandments**: Complete structure from Inciting Incident through Resolution
- **POV**: Maintain consistent point of view character

## Template Structure

Follow this exact structure for your generated scene sketch:

```yaml
---
type: scene_sketch
id: {id-slug}
status: sketch
title: {scene title}
chapter: {chapter number if applicable}
scene: {scene number if applicable}
pov: {point of view character}
location: {primary location}
value: {value being tracked, e.g., "safety" or "trust"}
opening_value: {starting value as number}
closing_value: {ending value as number}
polarity: {positive or negative}
turning_point_type: {action, revelation, or decision}
turning_point: "{one-sentence description of turning point}"
word_count_target: {suggested word count for prose, e.g., 1500}
created: {today's date}
modified: {today's date}
---

# Scene Sketch: {title}

## Summary

[2-3 sentence overview of what happens in this scene]

## Beats

### Beat 1: {Beat Title}
**Image/Moment:** [What the reader should see/experience]  
**Action:** [What happens]  
**Value:** {value_number}

### Beat 2: {Beat Title}
**Image/Moment:** [What the reader should see/experience]  
**Action:** [What happens]  
**Value:** {value_number}

### Beat 3: {Beat Title}
**Image/Moment:** [What the reader should see/experience]  
**Action:** [What happens]  
**Value:** {value_number}

[Continue with additional beats as needed - aim for 3-7 total]

## Value Progression

{value}: {opening_value} → {closing_value}

[Brief explanation of how the value shifts through the scene]

## Five Commandments

**Inciting Incident:** [What happens that sets the scene in motion]

**Progressive Complications:**
- [Complication 1]
- [Complication 2]
- [Complication 3]

**Crisis:** [Best bad choice A] vs. [Best bad choice B]

**Climax:** [The character's choice/action]

**Resolution:** [The immediate consequence and new status quo]

## POV Notes: {character}

**Voice/Behavior:**
- [Key voice pattern or behavior]
- [Another distinctive trait]

**Key Sensations:**
- [Important physical sensation they notice]
- [Another sensory detail specific to this character]

## Tone & Pacing

**Tone:** [Overall emotional tone of the scene]  
**Pacing:** [How to manage rhythm - fast/slow, tense/relaxed, etc.]
```

## Generate Now

Using the template structure above and the story context provided, **generate the complete scene sketch now**.

Make sure to:
- Choose an appropriate `id` that's lowercase and hyphen-separated (e.g., `1-2-confrontation`)
- Define 3-7 beats with clear Image/Moment guidance
- Include all Five Commandments components
- Track value progression with numbers
- Specify POV character and maintain their perspective
- Provide clear turning point
