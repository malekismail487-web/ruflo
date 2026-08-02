<div align="center">

# Ruflo with Built-In Open 3D Engine (O3DE)

**Autonomous AI Swarm Meta-Harness with Native Open 3D Engine (O3DE) Integration**

[![MIT License](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)](https://opensource.org/licenses/MIT)
[![O3DE Engine](https://img.shields.io/badge/Engine-O3DE_2409-orange?style=for-the-badge&logo=c%2B%2B)](https://o3de.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)

</div>

---

## 🌟 Overview

**Ruflo** is an advanced autonomous multi-agent orchestration harness and swarm intelligence framework, now unified with **Open 3D Engine (O3DE)** — an open-source, real-time, multi-platform AAA 3D engine.

With O3DE directly integrated into the codebase:
- Autonomous AI coding swarms possess a real, built-in 3D engine pipeline.
- Scene graphs, procedural levels, PBR materials, skeletal rigs, and cinematic renders can be orchestrated natively via Python/C++ automation and Atom renderer interfaces.
- Eliminates placeholder/mock generators in favor of a true industry-standard 3D engine foundation.

---

## 🏗️ Architecture

```
                                 ┌───────────────────────────────┐
                                 │   Autonomous AI Swarm Coder   │
                                 └───────────────┬───────────────┘
                                                 │
                                 ┌───────────────▼───────────────┐
                                 │   Renderer Abstraction Layer  │
                                 │      (rendererAdapter.ts)     │
                                 └───────┬───────────────┬───────┘
                                         │               │
                     ┌───────────────────▼──┐         ┌──▼───────────────────┐
                     │   O3DE Built-in 3D   │         │   High-Fidelity      │
                     │  Engine & Atom RHI   │         │  3D Exporter / WebGL │
                     └──────────────────────┘         └──────────────────────┘
```

---

## 🚀 Key Features

1. **Native Open 3D Engine (O3DE)**: Real-time multi-platform engine with Atom Renderer, PhysX/EMotion FX physics, and Script Canvas.
2. **Autonomous Swarm Coordination**: Hierarchical, mesh, and adaptive topologies with persistent shared memory.
3. **PBR Material & Lighting**: Dynamic lighting, cascaded shadow maps, volumetric scattering, and displacement.
4. **Automated Asset Pipelines**: Mesh generation, terrain heightmap synthesis, and skeletal animation tracks.

---

## 💻 Quick Start

### 1. Swarm Framework (Node.js)
```bash
npm install
npm run build
npm test
```

### 2. O3DE 3D Engine Registration & Build
```bash
# Register engine
scripts\o3de.bat register --this-engine

# Create or configure project
scripts\o3de.bat create-project --project-path <path_to_project>
```

---

## 📄 License

This repository is licensed under the Apache 2.0 / MIT licenses. See `LICENSE` and O3DE license terms for complete details.
