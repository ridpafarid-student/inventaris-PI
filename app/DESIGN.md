# Mthree Computer - Sistem Manajemen Inventaris & Servis

## Mission
Create implementation-ready, token-driven UI guidance for Mthree Computer that is optimized for consistency, accessibility, and fast delivery across dashboard web app.

## Brand
- Product/brand: Mthree Computer
- Brand colors: Red (#c8352a) and Black - reflecting company logo identity
- URL: Internal system
- Audience: authenticated users and operators
- Product surface: dashboard web app

## Style Foundations
- Visual style: clean, functional, implementation-oriented
- Main font style: `font.family.primary=Geist`, `font.family.stack=Geist, Arial, Apple Color Emoji, Segoe UI Emoji, Segoe UI Symbol`, `font.size.base=14px`, `font.weight.base=400`, `font.lineHeight.base=24px`
- Typography scale: `font.size.xs=13px`, `font.size.sm=14px`, `font.size.md=16px`
- Color palette (Brand Identity: Red & Black):
  - Text: `color.text.primary=#ededed`, `color.text.secondary=#a1a1a1`
  - Brand Accent: `color.brand.primary=#c8352a` (Red - main brand color), `color.brand.primary-hover=#b02e24`
  - Surfaces: `color.surface.base=#000000` (Black), `color.surface.muted=#0a0a0a`, `color.surface.card=#080808`
  - Borders: `color.border.default=#1f1f1f`, `color.border.muted=#2a2a2a`, `color.border.accent=#c8352a`
  - States: `color.success=#22c55e`, `color.error=#ef4444`, `color.warning=#f59e0b`
- Spacing scale: `space.1=2px`, `space.2=4px`, `space.3=6px`, `space.4=8px`, `space.5=10px`, `space.6=12px`, `space.7=16px`, `space.8=24px`
- Radius/shadow/motion tokens: `radius.xs=4px`, `radius.sm=6px`, `radius.md=40px`, `radius.lg=33554400px` | `shadow.1=rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgb(46, 46, 46) 0px 0px 0px 1px`, `shadow.2=rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgb(0, 0, 0) 0px 0px 0px 2px, rgb(82, 168, 255) 0px 0px 0px 4px`, `shadow.3=rgba(255, 255, 255, 0.145) 0px 0px 0px 1px, rgba(0, 0, 0, 0.16) 0px 1px 2px 0px, rgb(0, 0, 0) 0px 0px 0px 1px` | `motion.duration.instant=150ms`, `motion.duration.fast=200ms`

## Accessibility
- Target: WCAG 2.2 AA
- Keyboard-first interactions required.
- Focus-visible rules required.
- Contrast constraints required.

## Writing Tone
Concise, confident, implementation-focused.

## Rules: Do
- Use semantic tokens, not raw hex values, in component guidance.
- Every component must define states for default, hover, focus-visible, active, disabled, loading, and error.
- Component behavior should specify responsive and edge-case handling.
- Interactive components must document keyboard, pointer, and touch behavior.
- Accessibility acceptance criteria must be testable in implementation.

## Rules: Don't
- Do not allow low-contrast text or hidden focus indicators.
- Do not introduce one-off spacing or typography exceptions.
- Do not use ambiguous labels or non-descriptive actions.
- Do not ship component guidance without explicit state rules.

## Guideline Authoring Workflow
1. Restate design intent in one sentence.
2. Define foundations and semantic tokens.
3. Define component anatomy, variants, interactions, and state behavior.
4. Add accessibility acceptance criteria with pass/fail checks.
5. Add anti-patterns, migration notes, and edge-case handling.
6. End with a QA checklist.

## Required Output Structure
- Context and goals.
- Design tokens and foundations.
- Component-level rules (anatomy, variants, states, responsive behavior).
- Accessibility requirements and testable acceptance criteria.
- Content and tone standards with examples.
- Anti-patterns and prohibited implementations.
- QA checklist.

## Component Rule Expectations
- Include keyboard, pointer, and touch behavior.
- Include spacing and typography token requirements.
- Include long-content, overflow, and empty-state handling.
- Include known page component density: links (52), buttons (38), inputs (9), navigation (3), lists (3), cards (1).

- Extraction diagnostics: Audience and product surface inference confidence is low; verify generated brand context.

## Quality Gates
- Every non-negotiable rule must use "must".
- Every recommendation should use "should".
- Every accessibility rule must be testable in implementation.
- Teams should prefer system consistency over local visual exceptions.
