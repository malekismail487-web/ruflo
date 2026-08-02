# Contributing to Ruflo & O3DE

Welcome! This repository houses the Ruflo Autonomous AI Swarm framework integrated with the Open 3D Engine (O3DE) built-in 3D runtime and simulation layer.

## Ruflo Swarm Workflow

1. Open an issue or discussion at [GitHub Issues](https://github.com/malekismail487-web/ruflo/issues)
2. Fork and create a feature branch
3. Run `npm test` to validate
4. Submit a pull request with clear description

### Node / TypeScript Development

- Node.js 20+, npm 9+
- `npm install` then `npm run build`
- See [CLAUDE.md](CLAUDE.md) for agent-driven workflows
- Architecture decisions documented in [docs/adr/](docs/adr/)

## O3DE Engine Workflow

To learn more about contributing to O3DE code, check out the [O3DE Documentation](https://o3de.org/docs/contributing/).

### Making contributions with the Developer Certificate of Origin (DCO)

When contributing engine components, your pull requests require that you have agreed to the DCO: [Developer Certificate of Origin](https://developercertificate.org/). All commits require the `--signoff` (`-s`) flag:

```bash
git commit -s -m "feat: add 3D engine gem integration"
```

## Code of Conduct

Be respectful and review the repository Code of Conduct before participating.
