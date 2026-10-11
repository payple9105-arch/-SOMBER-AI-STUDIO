import unittest

from somber_ai.core import SomberAI
from somber_ai.instruction import parse_instruction


class InstructionTests(unittest.TestCase):
    def test_anime_vertical(self) -> None:
        order = parse_instruction("un personaje camina por la azotea, anime, vertical, 8 segundos")
        self.assertEqual(order.mode, "anime")
        self.assertEqual(order.style, "Anime")
        self.assertEqual(order.aspect, "9:16")
        self.assertEqual(order.duration_sec, 8)

    def test_image_to_video(self) -> None:
        order = parse_instruction("anima esta fotografía de una ciudad")
        self.assertEqual(order.mode, "imagen_a_video")
        self.assertTrue(order.needs_source)

    def test_draw_image(self) -> None:
        order = parse_instruction("dibuja un retrato noir")
        self.assertEqual(order.mode, "imagen")
        self.assertEqual(order.style, "Noir")

    def test_edit_beats_anime_wording(self) -> None:
        order = parse_instruction("edita el clip anime y añade subtítulos")
        self.assertEqual(order.mode, "edicion")

    def test_narration(self) -> None:
        order = parse_instruction("narra: la ciudad despierta bajo la lluvia")
        self.assertEqual(order.mode, "audio")

    def test_video_to_video(self) -> None:
        order = parse_instruction("transforma este video a estilo cyberpunk, cuadrado")
        self.assertEqual(order.mode, "video_a_video")
        self.assertEqual(order.aspect, "1:1")
        self.assertEqual(order.style, "Cyberpunk")

    def test_empty(self) -> None:
        with self.assertRaises(ValueError):
            parse_instruction("   ")


class CoreTests(unittest.TestCase):
    def test_plan_does_not_invent_a_file(self) -> None:
        plan = SomberAI().run("una calle bajo la lluvia, horizontal, 5 segundos")
        self.assertEqual(plan["nombre"], "SOMBER AI")
        self.assertEqual(plan["etapa"], 1)
        self.assertIsNone(plan["resultado"])
        self.assertIn("Generador de vídeo", plan["pasos"])
        self.assertFalse(plan["entorno"]["puede_generar"])

    def test_image_animation_warns_without_file(self) -> None:
        plan = SomberAI().run("anima esta ilustración")
        self.assertTrue(plan["avisos"])
        self.assertEqual(plan["estado"], "preparado")


if __name__ == "__main__":
    unittest.main()
