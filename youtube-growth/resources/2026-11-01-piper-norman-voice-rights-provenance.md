# PrismBay AI | Piper Norman voice provenance review | 2026-11-01

Sole channel: `UCw2hs85TzIpdKwJtG-BSxzQ` / `@PrismBayAI`. Scope: the `en_US-norman-medium` voice used in the accepted-output Short render. No changes to other videos or voices.

## Primary upstream evidence
- Exact voice model: `en_US-norman-medium`.
- Official upstream model card: https://huggingface.co/rhasspy/piper-voices/blob/main/en/en_US/norman/medium/MODEL_CARD
- Upstream voice repository: https://huggingface.co/rhasspy/piper-voices
- The model card states that training recordings were from LibriVox, labels the dataset **public domain**, and says the Norman voice was **trained from scratch** for 1,200 epochs on about 15.5 hours of recordings. It does not identify a restrictive fine-tuned base model.
- The Hugging Face repository displays an **MIT** repository license. The model card does not separately state an explicit commercial-output license. Do not equate a repository-wide label with an independently verified license for every voice.
- Piper's own voice documentation warns that voice licenses vary and advises reviewing the individual model card: https://tderflinger.github.io/piper-docs/about/voices/

## Release-control decision
Upstream origin and training provenance were independently inspected on 2026-11-01. No non-commercial restriction is identified in the Norman model card. This is an evidence review, **not a legal opinion or independent audit of every LibriVox recording**. A future conflicting upstream rights notice reopens the release gate.

The render manifest now records the exact voice ID, upstream card, dataset description, training provenance, attribution wording and limitation. This closes the previous **missing-source-documentation** gap for the Piper Norman candidate. It does **not** close narration listening, real-device YouTube playback, visual editorial approval or publication approval. The `espeak` fallback remains separately unreviewed.

Suggested production credit: `Narration generated with Piper en_US-norman-medium (LibriVox public-domain recording source per upstream model card).`

## No publication authorization
Existing Metricool posts `412495293` and `412685334` stay `draft=true`, `autoPublish=false`, `privacy=private`. The accepted-output candidate is a separate unpublished review artifact. No new channel, paid services or public post.
