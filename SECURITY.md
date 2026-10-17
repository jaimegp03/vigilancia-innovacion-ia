# Seguridad

## No subas secretos

Este repositorio **no contiene ninguna clave**. Nunca incluyas en un commit, issue o PR:

- el archivo `.env` (ya está en `.gitignore`),
- claves de API (Gemini, Anthropic), el token del bot de Telegram,
- el JSON de la cuenta de servicio de Google ni su `private_key`,
- la `N8N_ENCRYPTION_KEY`.

Todas las credenciales se crean dentro de n8n (ver [`docs/instalacion.md`](docs/instalacion.md)).

## Si una clave se filtra

1. Revócala o rótala de inmediato en el servicio correspondiente (Google Cloud, AI Studio, @BotFather, consola de Anthropic).
2. Si llegó a un commit, rotarla es obligatorio: borrar el commit no basta, el historial público puede estar copiado.

## Cómo avisar de una vulnerabilidad

Abre un aviso privado en la pestaña **Security → Report a vulnerability** del repositorio (o contacta con el autor por GitHub). Evita publicar detalles en un issue abierto.
