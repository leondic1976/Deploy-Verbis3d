# ADR 0003: Column-major matrices

Status: accepted

Matrix storage is column-major to match WebGL uniform conventions and avoid transpose work at the
GPU boundary. Transform composition is translation × rotation × scale.
