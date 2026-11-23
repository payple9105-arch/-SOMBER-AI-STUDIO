import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from prompting import (  # noqa: E402
    build_generation_prompt,
    clean_chat_messages,
    fal_app_root,
    local_enhance,
)


class PromptingTests(unittest.TestCase):
    def test_local_enhance_adds_style(self) -> None:
        out = local_enhance("una chica samurái bajo la lluvia", "anime", "Shonen épico")
        self.assertIn("samurái", out)
        self.assertIn("shonen", out.lower())

    def test_local_enhance_anime_default(self) -> None:
        self.assertIn("anime", local_enhance("un dragón", "anime").lower())

    def test_build_prompt_anime_image(self) -> None:
        out = build_generation_prompt("un gato guerrero", "Noir urbano", "anime_image")
        self.assertIn("anime", out.lower())

    def test_build_prompt_no_style(self) -> None:
        self.assertEqual(build_generation_prompt("un bosque", None, "video"), "un bosque")

    def test_fal_root(self) -> None:
        self.assertEqual(fal_app_root("fal-ai/pixverse/v5.5/text-to-video"), "fal-ai/pixverse")
        self.assertEqual(fal_app_root("fal-ai/flux/schnell"), "fal-ai/flux")

    def test_clean_chat(self) -> None:
        msgs = [
            {"role": "assistant", "content": "hola"},
            {"role": "user", "content": "a"},
            {"role": "user", "content": "b"},
            {"role": "assistant", "content": ""},
        ]
        self.assertEqual(clean_chat_messages(msgs), [{"role": "user", "content": "a\n\nb"}])


if __name__ == "__main__":
    unittest.main()
