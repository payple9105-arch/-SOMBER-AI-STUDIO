# SOMBER AI

Núcleo de SOMBER AI STUDIO. Está separado de la página web.

No entrena un modelo de vídeo desde cero. En esta etapa lee una instrucción y deja una orden estructurada. La generación visual se conectará cuando haya GPU y un modelo abierto, por ejemplo CogVideoX.

## Qué hace ahora

1. El procesador de texto distingue texto a vídeo, imagen a vídeo, vídeo a vídeo, imagen, anime, audio y edición.
2. El núcleo arma el recorrido: texto, imagen o vídeo, y resultado.
3. Comprueba si este equipo puede generar. Si no hay GPU, no inventa un archivo.

## Probarlo

```bash
cd somber-ai
python3 -m somber_ai "un personaje camina por la azotea, anime, vertical, 8 segundos"
python3 -m unittest discover -s tests -v
```

La respuesta trae `resultado: null` hasta que exista un entorno compatible. Eso es intencional.
