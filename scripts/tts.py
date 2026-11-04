"""Gera a narração (TTS) e os tempos de cada palavra para um episódio.

Uso:  python3 scripts/tts.py episodes/telhado/script.json

Saída:
  public/episodes/<id>/<cena>.mp3        áudio de cada cena
  src/episodes/<id>/timeline.json        duração + tempos das palavras (lido pelo Remotion)
"""
import asyncio, json, os, ssl, subprocess, sys

# Em ambientes com proxy corporativo, aponte para o bundle de certificados certo.
_ca = os.environ.get("TTS_CA_BUNDLE")
if _ca:
    import certifi
    certifi.where = lambda: _ca

import edge_tts

FPS = 30
PAD_BEFORE = 0.25  # segundos de respiro antes da fala
PAD_AFTER = 0.55   # segundos de respiro depois da fala


async def synth(text, voice, rate, out_mp3):
    com = edge_tts.Communicate(text, voice, rate=rate, boundary="WordBoundary")
    words = []
    with open(out_mp3, "wb") as f:
        async for ch in com.stream():
            if ch["type"] == "audio":
                f.write(ch["data"])
            elif ch["type"] == "WordBoundary":
                s = ch["offset"] / 1e7
                words.append({"text": ch["text"], "start": round(s, 3),
                              "end": round(s + ch["duration"] / 1e7, 3)})
    return words


def duration(path):
    out = subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                                   "-of", "csv=p=0", path])
    return float(out)


def attach_punctuation(text, words):
    """O TTS devolve palavras sem pontuação; recupera do texto original para a legenda."""
    tokens = text.split()
    if len(tokens) != len(words):
        return words
    for w, t in zip(words, tokens):
        w["text"] = t
    return words


async def main(script_path):
    spec = json.load(open(script_path, encoding="utf-8"))
    ep = spec["id"]
    audio_dir = os.path.join("public", "episodes", ep)
    os.makedirs(audio_dir, exist_ok=True)
    scenes = []
    for sc in spec["scenes"]:
        mp3 = os.path.join(audio_dir, f"{sc['id']}.mp3")
        words = await synth(sc["text"], spec["voice"], spec.get("rate", "+0%"), mp3)
        words = attach_punctuation(sc["text"], words)
        for w in words:
            w["start"] = round(w["start"] + PAD_BEFORE, 3)
            w["end"] = round(w["end"] + PAD_BEFORE, 3)
        total = PAD_BEFORE + duration(mp3) + PAD_AFTER
        scenes.append({
            "id": sc["id"],
            "text": sc["text"],
            "audio": f"episodes/{ep}/{sc['id']}.mp3",
            "audioDelay": PAD_BEFORE,
            "durationInFrames": int(round(total * FPS)),
            "words": words,
        })
        print(f"{sc['id']:<10} {total:5.2f}s  {len(words)} palavras")
    out = {"id": ep, "title": spec["title"], "fps": FPS, "scenes": scenes}
    tl = os.path.join("src", "episodes", ep, "timeline.json")
    os.makedirs(os.path.dirname(tl), exist_ok=True)
    json.dump(out, open(tl, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print("total:", sum(s["durationInFrames"] for s in scenes) / FPS, "s ->", tl)


if __name__ == "__main__":
    asyncio.run(main(sys.argv[1]))
