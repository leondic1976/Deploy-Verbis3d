# ADR 0002: Use WebGL2 first

Status: accepted

WebGL2 provides broad browser availability and explicit GPU resource APIs. Backend-neutral
`Renderer` boundaries are retained so WebGPU can be added later without replacing the scene API.
